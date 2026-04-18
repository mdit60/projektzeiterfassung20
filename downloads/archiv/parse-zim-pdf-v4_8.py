#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ZIM PDF zu JSON Konverter
VERSION: 4.8 - 23.01.2026

UNTERSTUETZT:
- Einzelprojekte (VDI/VDE, EuroNorm)
- Kooperationsprojekte (aus Netzwerk)
- Innovationsnetzwerke (Phase 1, Phase 2)
- Durchfuehrbarkeitsstudien
- Beide Projekttraeger: VDI/VDE-IT und EuroNorm (Legacy)

NEU IN 4.8:
- VERBESSERTE Formular-Typ-Erkennung basierend auf Header-Struktur
- Unterscheidung: Einzelprojekt vs. Kooperation vs. Netzwerk vs. DS
- EU-Richtlinie 2013/34 wird ignoriert (nur ZIM-Richtlinie zaehlt)
- Vorbereitet fuer zukuenftige Online-Antraege

TAG-STRUKTUR (alle neuen VDI/VDE 2025+):
- AP: lfd, ap, von, bis, ma_nr, pm
- Projekt: cg_VMS_VB_Projekt
- DS-Marker: Antrag_DS

LEGACY (EuroNorm):
- AP: Arbeitspaket_Nr, Arbeitspaket, von, bis, MA_Nr, pm
"""

import sys
import json
import re
from pathlib import Path
from datetime import datetime

try:
    from pypdf import PdfReader
except ImportError:
    print("Fehler: pypdf nicht installiert!")
    sys.exit(1)


def extract_value(pattern: str, text: str) -> str:
    match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
    return match.group(1).strip() if match else ''


def extract_float(pattern: str, text: str) -> float:
    value = extract_value(pattern, text)
    if not value:
        return 0.0
    cleaned = value.replace(',', '.')
    try:
        return float(cleaned)
    except:
        return 0.0


def extract_all_values_flexible(tag_name: str, text: str) -> list:
    """Extrahiert Werte mit flexiblem Tag-Matching"""
    pattern_with_value = f'<{tag_name}[\\s\\n]*>([^<]+)</{tag_name}'
    pattern_empty = f'<{tag_name}[\\s\\n]*/>'
    
    results = []
    for match in re.finditer(pattern_with_value, text, re.IGNORECASE | re.DOTALL):
        results.append((match.start(), match.group(1).strip()))
    for match in re.finditer(pattern_empty, text, re.IGNORECASE | re.DOTALL):
        results.append((match.start(), ''))
    
    results.sort(key=lambda x: x[0])
    return [r[1] for r in results]


def normalize_ap_nr(ap_nr_str: str) -> str:
    if not ap_nr_str:
        return ''
    return ap_nr_str.strip().rstrip('.')


def parse_ap_number(ap_nr_str: str) -> dict:
    result = {
        'ap_number': 0,
        'ap_sub_number': None,
        'ap_sub_sub_number': None,
        'ap_level_4': None
    }
    
    clean_nr = normalize_ap_nr(ap_nr_str)
    if not clean_nr:
        return result
    
    parts = clean_nr.split('.')
    
    try:
        if len(parts) >= 1 and parts[0].isdigit():
            result['ap_number'] = int(parts[0])
        if len(parts) >= 2 and parts[1].isdigit():
            result['ap_sub_number'] = int(parts[1])
        if len(parts) >= 3 and parts[2].isdigit():
            result['ap_sub_sub_number'] = int(parts[2])
        if len(parts) >= 4 and parts[3].isdigit():
            result['ap_level_4'] = int(parts[3])
    except:
        pass
    
    return result


def generate_ap_code(ap_data: dict) -> str:
    code = f"AP{ap_data['ap_number']}"
    if ap_data['ap_sub_number'] is not None:
        code += f".{ap_data['ap_sub_number']}"
    if ap_data['ap_sub_sub_number'] is not None:
        code += f".{ap_data['ap_sub_sub_number']}"
    if ap_data['ap_level_4'] is not None:
        code += f".{ap_data['ap_level_4']}"
    return code


def ap_key(ap_nums: dict) -> tuple:
    return (
        ap_nums['ap_number'],
        ap_nums['ap_sub_number'],
        ap_nums['ap_sub_sub_number'],
        ap_nums['ap_level_4']
    )


def parse_german_date(date_str: str) -> str:
    if not date_str:
        return None
    date_str = date_str.strip()
    if re.match(r'^\d{4}-\d{2}-\d{2}$', date_str):
        return date_str
    match = re.match(r'^(\d{1,2})\.(\d{1,2})\.(\d{4})$', date_str)
    if match:
        day, month, year = match.groups()
        return f"{year}-{month.zfill(2)}-{day.zfill(2)}"
    return None


def parse_pm(pm_str: str) -> float:
    if not pm_str or pm_str == '-':
        return 0.0
    try:
        return float(pm_str.replace(',', '.'))
    except:
        return 0.0


def extract_mitarbeiter_liste(xfa_text: str, format_type: str) -> list:
    """
    Extrahiert Mitarbeiter aus Anlage 6.1/6.2.
    
    VDI/VDE Tags:
    - cg_VMS_PM_aNachname, cg_VMS_PM_aVorname (Anlage 6.1)
    - cg_VMS_PK_aQualGruppe (Qualifikation A/B/C)
    
    EuroNorm Tags:
    - name, vorname oder aehnlich
    
    Returns: Liste von Mitarbeitern mit ma_nr, name, qualifikation
    """
    mitarbeiter = []
    
    if format_type == 'standard_zim':
        # VDI/VDE Format
        nachnamen = extract_all_values_flexible('cg_VMS_PM_aNachname', xfa_text)
        vornamen = extract_all_values_flexible('cg_VMS_PM_aVorname', xfa_text)
        qual_gruppen = extract_all_values_flexible('cg_VMS_PK_aQualGruppe', xfa_text)
        
        # Nur nicht-leere Eintraege
        for i in range(max(len(nachnamen), len(vornamen))):
            nachname = nachnamen[i] if i < len(nachnamen) else ''
            vorname = vornamen[i] if i < len(vornamen) else ''
            qual = qual_gruppen[i] if i < len(qual_gruppen) else ''
            
            if nachname or vorname:
                mitarbeiter.append({
                    'ma_nr': i + 1,  # 1-basiert
                    'nachname': nachname,
                    'vorname': vorname,
                    'display_name': f"{nachname}, {vorname}" if nachname and vorname else (nachname or vorname),
                    'qualifikation': qual
                })
    
    else:
        # EuroNorm Legacy - versuche verschiedene Tag-Varianten
        # Anlage 6.1 hat oft: Name, Vorname als separate Felder
        nachnamen = extract_all_values_flexible('Name', xfa_text)
        vornamen = extract_all_values_flexible('Vorname', xfa_text)
        
        # Filtere nach plausiblen Namen (nicht zu kurz, keine Formulartexte)
        for i in range(min(len(nachnamen), len(vornamen))):
            nachname = nachnamen[i] if i < len(nachnamen) else ''
            vorname = vornamen[i] if i < len(vornamen) else ''
            
            # Plausibilitaetspruefung
            if nachname and vorname and len(nachname) >= 2 and len(vorname) >= 2:
                # Ignoriere offensichtliche Nicht-Namen
                if nachname.lower() not in ['name', 'nachname', 'firma'] and \
                   vorname.lower() not in ['vorname', 'name']:
                    mitarbeiter.append({
                        'ma_nr': len(mitarbeiter) + 1,
                        'nachname': nachname,
                        'vorname': vorname,
                        'display_name': f"{nachname}, {vorname}",
                        'qualifikation': ''
                    })
    
    if mitarbeiter:
        print(f"\n  MITARBEITER aus Anlage 6:")
        for ma in mitarbeiter:
            print(f"    MA {ma['ma_nr']}: {ma['display_name']} (Qual: {ma['qualifikation'] or '-'})")
    
    return mitarbeiter


def parse_ma_nr(ma_str: str) -> int:
    if not ma_str:
        return None
    try:
        return int(float(ma_str.replace(',', '.')))
    except:
        return None


def detect_formular_version(xfa_text: str) -> dict:
    """
    Erkennt Formular-Quelle, Typ, Version und Stand.
    
    WICHTIG: Formular-Typ wird aus spezifischen Header-Markern erkannt,
    nicht aus beliebigem Text im Dokument!
    
    Typ-Hierarchie (spezifisch -> allgemein):
    1. Durchfuehrbarkeitsstudie: "Antrag_DS" Marker ODER "Durchfuehrbarkeitsstudie" im Titel
    2. Netzwerk Phase 2: "Phase 2" im Dateinamen/Titel
    3. Netzwerk Phase 1: "Phase 1" oder "Netzwerkmanagement" im Titel
    4. Kooperation aus Netzwerk: "Kooperationsprojekt" UND "Netzwerk" im Kontext
    5. Kooperation: "Kooperationsprojekt" ohne Netzwerk
    6. Einzelprojekt: "Einzelprojekt" oder Default
    """
    result = {
        'quelle': 'unbekannt',
        'formular_typ': None,
        'version': None,
        'stand': None,
        'richtlinie': None,
        'projekttraeger': None,
        'raw_version_info': None
    }
    
    # === SCHRITT 1: Projekttraeger erkennen ===
    if re.search(r'VDI[/\\]?VDE', xfa_text, re.IGNORECASE):
        result['quelle'] = 'VDI/VDE'
        result['projekttraeger'] = 'VDI/VDE Innovation + Technik GmbH'
    
    if re.search(r'Euro\s*Norm', xfa_text, re.IGNORECASE):
        result['quelle'] = 'EuroNorm'
        result['projekttraeger'] = 'EuroNorm GmbH (Legacy)'
    
    if re.search(r'AiF\s*Projekt', xfa_text, re.IGNORECASE):
        result['quelle'] = 'AiF'
        result['projekttraeger'] = 'AiF Projekt GmbH'
    
    # === SCHRITT 2: Formular-Typ erkennen ===
    # Basierend auf eindeutigen Markern in den Formularen:
    # - FuE-Einzelprojekt: Nur bei Einzelprojekten
    # - FuE-Kooperationsprojekt: Bei Kooperationen
    # - Antrag_DS: Nur bei Durchfuehrbarkeitsstudien
    # - Phase 1/2: Bei Netzwerk-Antraegen
    
    has_fue_einzelprojekt = bool(re.search(r'FuE-Einzelprojekt', xfa_text))
    has_fue_kooperation = bool(re.search(r'FuE-Kooperationsprojekt', xfa_text))
    has_antrag_ds = 'Antrag_DS' in xfa_text
    has_phase1 = bool(re.search(r'Phase\s*1', xfa_text))
    has_phase2 = bool(re.search(r'Phase\s*2', xfa_text))
    has_netzwerkmanagement = bool(re.search(r'Netzwerkmanagement', xfa_text))
    
    # 2a. Durchfuehrbarkeitsstudie - eindeutiger Marker "Antrag_DS"
    if has_antrag_ds:
        result['formular_typ'] = 'Durchfuehrbarkeitsstudie'
    
    # 2b. Einzelprojekt - hat FuE-Einzelprojekt aber NICHT FuE-Kooperationsprojekt
    elif has_fue_einzelprojekt and not has_fue_kooperation:
        result['formular_typ'] = 'Einzelprojekt'
    
    # 2c. Kooperation aus Netzwerk - hat BEIDE FuE-Marker
    elif has_fue_einzelprojekt and has_fue_kooperation:
        result['formular_typ'] = 'Kooperation (aus Netzwerk)'
    
    # 2d. Kooperation standalone (AiF) - nur FuE-Kooperationsprojekt
    elif has_fue_kooperation and not has_fue_einzelprojekt:
        result['formular_typ'] = 'Kooperation'
    
    # 2e. Netzwerk Phase 1+2 kombiniert - hat beide Phase-Marker
    elif has_phase1 and has_phase2 and has_netzwerkmanagement:
        result['formular_typ'] = 'Netzwerk (Phase 1+2)'
    
    # 2f. Netzwerk Phase 2 - nur Phase 2 (oder beides ohne Management)
    elif has_phase2:
        result['formular_typ'] = 'Netzwerk-Umsetzung (Phase 2)'
    
    # 2g. Netzwerk Phase 1 - nur Phase 1
    elif has_phase1:
        result['formular_typ'] = 'Netzwerk-Management (Phase 1)'
    
    # 2h. Fallback: Pruefe auf weitere Hinweise
    elif 'cg_VMS_' in xfa_text:
        if re.search(r'Einzelprojekt', xfa_text, re.IGNORECASE):
            result['formular_typ'] = 'Einzelprojekt'
        elif re.search(r'Kooperation', xfa_text, re.IGNORECASE):
            result['formular_typ'] = 'Kooperation'
        elif re.search(r'Netzwerk', xfa_text, re.IGNORECASE):
            result['formular_typ'] = 'Netzwerk'
        else:
            result['formular_typ'] = 'Standard-ZIM'
    
    # 2i. Legacy EuroNorm
    elif result['quelle'] == 'EuroNorm':
        if re.search(r'Einzelprojekt', xfa_text, re.IGNORECASE):
            result['formular_typ'] = 'Einzelprojekt (EuroNorm)'
        else:
            result['formular_typ'] = 'EuroNorm (Typ unbekannt)'
    
    # === SCHRITT 3: Version und Stand extrahieren ===
    
    # Muster 1: VDI/VDE aktuell "Version: 13.11 Stand: 18.12.2025"
    version_match = re.search(
        r'Version[:\s]*(\d+\.\d+)\s+Stand[:\s]*(\d{1,2}\.\d{1,2}\.\d{4})',
        xfa_text
    )
    if version_match:
        result['version'] = version_match.group(1)
        result['stand'] = version_match.group(2)
    
    # Muster 2: EuroNorm "Richtlinie: 2020  Version: 1.42  Stand: 09.10.2024"
    # WICHTIG: Nur ZIM-Richtlinie (2015, 2020, 2024), NICHT EU-Richtlinie 2013/34!
    if not result['version']:
        euronorm_match = re.search(
            r'Richtlinie[:\s]*(20(?:15|20|24|25))\s+Version[:\s]*(\d+(?:\.\d+)?)\s+Stand[:\s]*(\d{1,2}\.\d{1,2}\.\d{4})',
            xfa_text
        )
        if euronorm_match:
            result['richtlinie'] = euronorm_match.group(1)
            result['version'] = euronorm_match.group(2)
            result['stand'] = euronorm_match.group(3)
    
    # Muster 3: Nur Richtlinie (ZIM-Richtlinie, nicht EU!)
    if not result['richtlinie']:
        # Suche nach "Richtlinie: 2024" aber NICHT "Richtlinie 2013/34/EU"
        richtlinie_match = re.search(
            r'Richtlinie[:\s]*(20(?:15|20|24|25))(?!\s*/)',  # Negative lookahead fuer "/"
            xfa_text
        )
        if richtlinie_match:
            result['richtlinie'] = richtlinie_match.group(1)
    
    # === SCHRITT 4: Raw Info sammeln (ohne Rauschen) ===
    raw_matches = []
    
    # Version/Stand Zeile
    version_line = re.search(r'(Version[:\s]*\d+\.\d+\s+Stand[:\s]*\d{1,2}\.\d{1,2}\.\d{4})', xfa_text)
    if version_line:
        raw_matches.append(version_line.group(1))
    
    # Richtlinie (nur ZIM, nicht EU)
    richtlinie_line = re.search(r'(Richtlinie[:\s]*20(?:15|20|24|25)[^/][^\n<]{0,50})', xfa_text)
    if richtlinie_line:
        raw_matches.append(richtlinie_line.group(1).strip())
    
    if raw_matches:
        result['raw_version_info'] = raw_matches
    
    return result


def detect_format(xfa_text: str) -> str:
    """
    Erkennt das technische Format (Tag-Struktur) des PDFs.
    
    Formate:
    - 'standard_zim': Tags lfd, ap, ma_nr, pm (VDI/VDE 2025+)
    - 'legacy_euronorm': Tags Arbeitspaket_Nr, Arbeitspaket, MA_Nr, pm
    - 'durchfuehrbarkeitsstudie_legacy': Alte DS mit technisch/nicht-technisch Trennung
    """
    # VDI/VDE Standard (2025+) - hat cg_VMS_ Tags
    if 'cg_VMS_' in xfa_text or 'cg_case_' in xfa_text:
        return 'standard_zim'
    
    # Legacy EuroNorm - hat Arbeitspaket_Nr aber kein cg_VMS_
    if re.search(r'<Arbeitspaket_Nr[^>]*>', xfa_text) and 'cg_VMS_' not in xfa_text:
        # Pruefe auf technisch/nicht-technisch Trennung (alte DS)
        if re.search(r'<Arbeitspaket_Nr_techn[^>]*>', xfa_text):
            return 'durchfuehrbarkeitsstudie_legacy'
        return 'legacy_euronorm'
    
    # Fallback
    if re.search(r'<lfd[^>]*>', xfa_text):
        return 'standard_zim'
    
    return 'unbekannt'


def process_ap_table(ap_nrs: list, ap_names: list, ap_pms: list, 
                      ap_von: list, ap_bis: list, ap_ma_nrs: list,
                      is_technical: bool, label: str) -> dict:
    """Verarbeitet AP-Tabelle - gemeinsame Logik fuer alle Formate"""
    
    print(f"\n  Parsing {label}...")
    print(f"    Rohdaten: {len(ap_nrs)} Nr, {len(ap_names)} Namen, {len(ap_pms)} PM, {len(ap_ma_nrs)} MA-Nr")
    
    if len(ap_ma_nrs) > 0:
        print(f"    MA-Nr Werte (erste 12): {ap_ma_nrs[:12]}")
    
    ap_dict = {}
    
    # ERSTER DURCHLAUF: Namen zu Nummern zuordnen
    print(f"    --- Erster Durchlauf: Namen sammeln ---")
    nummer_zu_name = {}
    name_idx = 0
    
    for nr_raw in ap_nrs:
        nr = normalize_ap_nr(nr_raw)
        if not nr:
            continue
        if nr not in nummer_zu_name and name_idx < len(ap_names):
            name = ap_names[name_idx]
            if name and len(name) >= 3:
                nummer_zu_name[nr] = name
                print(f"      {nr} -> '{name[:45]}...'")
            name_idx += 1
    
    # ZWEITER DURCHLAUF: Zeilen verarbeiten
    print(f"    --- Zweiter Durchlauf: Zeilen verarbeiten ---")
    
    for i in range(len(ap_nrs)):
        nr_raw = ap_nrs[i] if i < len(ap_nrs) else ''
        nr = normalize_ap_nr(nr_raw)
        if not nr:
            continue
        
        ap_nums = parse_ap_number(nr)
        if ap_nums['ap_number'] == 0:
            continue
        
        key = ap_key(ap_nums)
        
        ma_nr_raw = ap_ma_nrs[i] if i < len(ap_ma_nrs) else ''
        ma_nr = parse_ma_nr(ma_nr_raw)
        has_ma_nr = ma_nr is not None
        
        pm = parse_pm(ap_pms[i]) if i < len(ap_pms) else 0.0
        von = parse_german_date(ap_von[i]) if i < len(ap_von) else None
        bis = parse_german_date(ap_bis[i]) if i < len(ap_bis) else None
        
        name = nummer_zu_name.get(nr, '')
        
        # KEINE MA-Nr = Ueberschrift
        if not has_ma_nr:
            if key not in ap_dict and name:
                ap_dict[key] = {
                    'ap_number': ap_nums['ap_number'],
                    'ap_sub_number': ap_nums['ap_sub_number'],
                    'ap_sub_sub_number': ap_nums['ap_sub_sub_number'],
                    'ap_level_4': ap_nums['ap_level_4'],
                    'ap_code': generate_ap_code(ap_nums),
                    'name': name,
                    'start_date': None,
                    'end_date': None,
                    'total_person_months': None,
                    'is_technical': is_technical,
                    'mitarbeiter_zuordnungen': []
                }
                tech_label = " [TECH]" if is_technical else ""
                print(f"      [{i}] {nr}: {name[:35]}... -> UEBERSCHRIFT{tech_label}")
            continue
        
        # MIT MA-Nr = Echtes AP oder Zuordnung
        if key not in ap_dict:
            if not name:
                print(f"      [{i}] {nr}: SKIP - kein Name")
                continue
            
            ap_dict[key] = {
                'ap_number': ap_nums['ap_number'],
                'ap_sub_number': ap_nums['ap_sub_number'],
                'ap_sub_sub_number': ap_nums['ap_sub_sub_number'],
                'ap_level_4': ap_nums['ap_level_4'],
                'ap_code': generate_ap_code(ap_nums),
                'name': name,
                'start_date': von,
                'end_date': bis,
                'total_person_months': pm,
                'is_technical': is_technical,
                'mitarbeiter_zuordnungen': [{
                    'ma_nr': ma_nr,
                    'pm': pm
                }]
            }
            tech_label = " [TECH]" if is_technical else ""
            print(f"      [{i}] {nr}: {name[:35]}... -> NEW ({pm} PM, MA={ma_nr}){tech_label}")
        else:
            if ap_dict[key]['total_person_months'] is None:
                ap_dict[key]['total_person_months'] = pm
            else:
                ap_dict[key]['total_person_months'] += pm
            
            ap_dict[key]['mitarbeiter_zuordnungen'].append({
                'ma_nr': ma_nr,
                'pm': pm
            })
            
            if not ap_dict[key]['start_date'] and von:
                ap_dict[key]['start_date'] = von
            if not ap_dict[key]['end_date'] and bis:
                ap_dict[key]['end_date'] = bis
            
            print(f"      [{i}] {nr}: +{pm} PM (MA={ma_nr})")
    
    return ap_dict


def parse_legacy_euronorm(xfa_text: str, has_technical: bool = False) -> dict:
    """
    Parser fuer Legacy EuroNorm Formulare (vor 2025).
    Tags: Arbeitspaket_Nr, Arbeitspaket, MA_Nr, pm
    """
    text = xfa_text
    
    projekt = {
        'name': extract_value(r'<thema[^>]*>([^<]+)', text) or 
                extract_value(r'<Kurzbezeichnung[^>]*>([^<]+)', text),
        'kurzname': '',
        'fkz': extract_value(r'<Foerderkennzeichen[^>]*>([^<]+)', text),
        'start': extract_value(r'<Laufzeit_von[^>]*>([^<]+)', text),
        'ende': extract_value(r'<Laufzeit_bis[^>]*>([^<]+)', text),
        'foerderquote': extract_float(r'<Foerdersatz[^>]*>([^<]+)', text) or 50.0,
        'gesamtkosten': extract_float(r'<Gesamtkosten[^>]*>([^<]+)', text),
        'zuwendung': extract_float(r'<Zuwendung[^>]*>([^<]+)', text),
        'gesamt_pm': 0.0,
        'gesamt_pk': extract_float(r'<sum_ges_pk[^>]*>([^<]+)', text),
        'laufzeit_monate': 0
    }
    
    kurzfass = extract_value(r'<kurzfass[^>]*>([^<]+)', text)
    if kurzfass:
        projekt['kurzname'] = kurzfass[:100] + '...' if len(kurzfass) > 100 else kurzfass
    
    antragsteller = {
        'firma': extract_value(r'<Firma[^>]*>([^<]+)', text) or
                 extract_value(r'<firma[^>]*>([^<]+)', text),
        'rechtsform': extract_value(r'<Rechtsform[^>]*>([^<]+)', text),
        'strasse': extract_value(r'<str[^>]*>([^<]+)', text),
        'plz': extract_value(r'<plz[^>]*>([^<]+)', text),
        'ort': extract_value(r'<ort[^>]*>([^<]+)', text),
        'bundesland': extract_value(r'<ddl_land[^>]*>([^<]+)', text),
        'website': extract_value(r'<www[^>]*>([^<]+)', text),
        'ansprechpartner_name': '',
        'ansprechpartner_funktion': '',
        'ansprechpartner_telefon': extract_value(r'<tel_ap[^>]*>([^<]+)', text),
        'ansprechpartner_email': extract_value(r'<mail_ap[^>]*>([^<]+)', text),
    }
    
    # Firma aus Domain ableiten falls leer
    if not antragsteller['firma']:
        if antragsteller['website']:
            domain = antragsteller['website'].replace('www.', '').split('.')[0]
            antragsteller['firma'] = domain.capitalize() + ' GmbH'
        elif antragsteller['ansprechpartner_email']:
            domain = antragsteller['ansprechpartner_email'].split('@')[-1].split('.')[0]
            antragsteller['firma'] = domain.capitalize() + ' GmbH'
    
    # Nicht-technische APs
    ap_dict_a = process_ap_table(
        ap_nrs=extract_all_values_flexible('Arbeitspaket_Nr', text),
        ap_names=extract_all_values_flexible('Arbeitspaket', text),
        ap_pms=extract_all_values_flexible('pm', text),
        ap_von=extract_all_values_flexible('von', text),
        ap_bis=extract_all_values_flexible('bis', text),
        ap_ma_nrs=extract_all_values_flexible('MA_Nr', text),
        is_technical=False,
        label="ARBEITSPAKETE" if not has_technical else "NICHT-TECHNISCHE APs (A)"
    )
    
    # Technische APs (nur bei alter DS)
    ap_dict_b = {}
    if has_technical:
        ap_dict_b = process_ap_table(
            ap_nrs=extract_all_values_flexible('Arbeitspaket_Nr_techn', text),
            ap_names=extract_all_values_flexible('Arbeitspaket_techn', text),
            ap_pms=extract_all_values_flexible('pm_techn', text),
            ap_von=extract_all_values_flexible('RealisierungVON', text),
            ap_bis=extract_all_values_flexible('RealisierungBIS', text),
            ap_ma_nrs=extract_all_values_flexible('MA_Nr_techn', text),
            is_technical=True,
            label="TECHNISCHE APs (B)"
        )
    
    ap_dict = {**ap_dict_a, **ap_dict_b}
    
    arbeitspakete = list(ap_dict.values())
    arbeitspakete.sort(key=lambda ap: (
        ap['ap_number'], 
        ap['ap_sub_number'] or 0,
        ap['ap_sub_sub_number'] or 0,
        ap['ap_level_4'] or 0
    ))
    
    for ap in arbeitspakete:
        if ap['total_person_months'] and ap['total_person_months'] > 0:
            projekt['gesamt_pm'] += ap['total_person_months']
    
    # Mitarbeiter aus Anlage 6 extrahieren
    mitarbeiter = extract_mitarbeiter_liste(text, 'legacy_euronorm')
    
    return {
        'projekt': projekt,
        'antragsteller': antragsteller,
        'mitarbeiter': mitarbeiter,
        'arbeitspakete': arbeitspakete,
        'format': 'legacy_euronorm'
    }


def parse_standard_zim(xfa_text: str) -> dict:
    """
    Parser fuer Standard-ZIM (VDI/VDE 2025+).
    Tags: lfd, ap, ma_nr, pm, von, bis
    Gilt fuer: Einzelprojekt, Kooperation, Netzwerk, DS
    """
    text = xfa_text
    
    projekt = {
        'name': extract_value(r'<cg_VMS_VB_Projekt[^>]*>([^<]+)', text),
        'kurzname': extract_value(r'<cg_VMS_VB_KurzName[^>]*>([^<]+)', text) or
                    extract_value(r'<Kurzbezeichnung[^>]*>([^<]+)', text),
        'fkz': extract_value(r'<cg_case_KENN_2[^>]*>([^<]+)', text),
        'start': extract_value(r'<cg_VMS_VB_Beginn[^>]*>([^<]+)', text),
        'ende': extract_value(r'<cg_VMS_VB_Ende[^>]*>([^<]+)', text),
        'foerderquote': extract_float(r'<cg_VMS_AD_Foerderquote[^>]*>([^<]+)', text),
        'gesamtkosten': extract_float(r'<cg_VMS_HB_A_Kosten[^>]*>([^<]+)', text),
        'zuwendung': extract_float(r'<cg_VMS_HB_A_ZuwendungFQ[^>]*>([^<]+)', text),
        'gesamt_pm': 0.0,
        'gesamt_pk': extract_float(r'<sum_ges_pk[^>]*>([^<]+)', text),
        'laufzeit_monate': 0
    }
    
    # Laufzeit berechnen
    if projekt['start'] and projekt['ende']:
        try:
            start_date = projekt['start']
            end_date = projekt['ende']
            if '-' in start_date:
                sy, sm = int(start_date.split('-')[0]), int(start_date.split('-')[1])
                ey, em = int(end_date.split('-')[0]), int(end_date.split('-')[1])
            else:
                parts_s = start_date.split('.')
                parts_e = end_date.split('.')
                sy, sm = int(parts_s[2]), int(parts_s[1])
                ey, em = int(parts_e[2]), int(parts_e[1])
            projekt['laufzeit_monate'] = (ey - sy) * 12 + (em - sm) + 1
        except:
            pass
    
    antragsteller = {
        'firma': extract_value(r'<cg_VMS_firma[^>]*>([^<]+)', text),
        'rechtsform': extract_value(r'<cg_VMS_rechtsform[^>]*>([^<]+)', text),
        'strasse': extract_value(r'<cg_VMS_str[^>]*>([^<]+)', text),
        'plz': extract_value(r'<cg_VMS_plz[^>]*>([^<]+)', text),
        'ort': extract_value(r'<cg_VMS_ort[^>]*>([^<]+)', text),
        'bundesland': extract_value(r'<cg_VMS_bundesland[^>]*>([^<]+)', text),
        'website': extract_value(r'<cg_VMS_www[^>]*>([^<]+)', text),
        'ansprechpartner_name': extract_value(r'<cg_VMS_AP_name[^>]*>([^<]+)', text),
        'ansprechpartner_funktion': extract_value(r'<cg_VMS_AP_funktion[^>]*>([^<]+)', text),
        'ansprechpartner_telefon': extract_value(r'<cg_VMS_AP_tel[^>]*>([^<]+)', text),
        'ansprechpartner_email': extract_value(r'<cg_VMS_AP_mail[^>]*>([^<]+)', text),
    }
    
    # Standard-ZIM: Tags sind lfd, ap, von, bis, ma_nr, pm
    ap_dict = process_ap_table(
        ap_nrs=extract_all_values_flexible('lfd', text),
        ap_names=extract_all_values_flexible('ap', text),
        ap_pms=extract_all_values_flexible('pm', text),
        ap_von=extract_all_values_flexible('von', text),
        ap_bis=extract_all_values_flexible('bis', text),
        ap_ma_nrs=extract_all_values_flexible('ma_nr', text),
        is_technical=False,
        label="ARBEITSPAKETE"
    )
    
    arbeitspakete = list(ap_dict.values())
    arbeitspakete.sort(key=lambda ap: (
        ap['ap_number'], 
        ap['ap_sub_number'] or 0,
        ap['ap_sub_sub_number'] or 0,
        ap['ap_level_4'] or 0
    ))
    
    for ap in arbeitspakete:
        if ap['total_person_months'] and ap['total_person_months'] > 0:
            projekt['gesamt_pm'] += ap['total_person_months']
    
    # Mitarbeiter aus Anlage 6.1/6.2 extrahieren
    mitarbeiter = extract_mitarbeiter_liste(text, 'standard_zim')
    
    return {
        'projekt': projekt,
        'antragsteller': antragsteller,
        'mitarbeiter': mitarbeiter,
        'arbeitspakete': arbeitspakete,
        'format': 'standard_zim'
    }


def parse_zim_pdf(pdf_path: str) -> dict:
    print(f"\n{'='*60}")
    print(f"ZIM PDF Parser v4.8")
    print(f"{'='*60}")
    print(f"Lade PDF: {pdf_path}")
    
    reader = PdfReader(pdf_path)
    root = reader.trailer['/Root'].get_object()
    
    if '/AcroForm' not in root:
        raise ValueError("Keine Formulardaten gefunden")
    
    acro = root['/AcroForm'].get_object()
    if '/XFA' not in acro:
        raise ValueError("Keine XFA-Daten gefunden")
    
    xfa = acro['/XFA']
    xfa_text = ""
    for item in xfa:
        if hasattr(item, 'get_object'):
            try:
                obj = item.get_object()
                if hasattr(obj, 'get_data'):
                    data = obj.get_data().decode('utf-8', errors='ignore')
                    xfa_text += data
            except:
                pass
    
    if not xfa_text:
        raise ValueError("Konnte XFA-Daten nicht extrahieren")
    
    print(f"XFA-Daten extrahiert: {len(xfa_text)} Zeichen")
    
    # Formular-Version erkennen
    formular_info = detect_formular_version(xfa_text)
    print(f"\nFormular-Info:")
    print(f"  Quelle: {formular_info['quelle']}")
    print(f"  Typ: {formular_info['formular_typ']}")
    if formular_info['richtlinie']:
        print(f"  Richtlinie: {formular_info['richtlinie']}")
    print(f"  Version: {formular_info['version'] or '(nicht erkannt)'}")
    print(f"  Stand: {formular_info['stand'] or '(nicht erkannt)'}")
    print(f"  Projekttraeger: {formular_info['projekttraeger'] or '(nicht erkannt)'}")
    if formular_info['raw_version_info']:
        print(f"  Raw Info: {formular_info['raw_version_info']}")
    
    # Technisches Format erkennen
    pdf_format = detect_format(xfa_text)
    print(f"\nTechnisches Format: {pdf_format}")
    
    # Parser auswaehlen
    if pdf_format == 'standard_zim':
        result = parse_standard_zim(xfa_text)
    elif pdf_format == 'durchfuehrbarkeitsstudie_legacy':
        result = parse_legacy_euronorm(xfa_text, has_technical=True)
    elif pdf_format == 'legacy_euronorm':
        result = parse_legacy_euronorm(xfa_text, has_technical=False)
    else:
        # Fallback: Versuche Standard-ZIM
        result = parse_standard_zim(xfa_text)
        if not result['projekt']['name'] and not result['arbeitspakete']:
            result = parse_legacy_euronorm(xfa_text)
    
    # Statistik
    aps_mit_pm = [ap for ap in result['arbeitspakete'] if ap.get('total_person_months') and ap['total_person_months'] > 0]
    aps_ueberschriften = [ap for ap in result['arbeitspakete'] if ap.get('total_person_months') is None]
    aps_technisch = [ap for ap in aps_mit_pm if ap.get('is_technical') == True]
    aps_nicht_technisch = [ap for ap in aps_mit_pm if ap.get('is_technical') == False]
    
    statistik = {
        'anzahl_arbeitspakete': len(result['arbeitspakete']),
        'anzahl_echte_aps': len(aps_mit_pm),
        'anzahl_ueberschriften': len(aps_ueberschriften),
        'anzahl_technisch': len(aps_technisch),
        'anzahl_nicht_technisch': len(aps_nicht_technisch),
        'gesamt_pm': result['projekt']['gesamt_pm'],
    }
    
    return {
        'projekt': result['projekt'],
        'antragsteller': result['antragsteller'],
        'budget': {
            'gesamtkosten': result['projekt']['gesamtkosten'],
            'personalkosten': result['projekt']['gesamt_pk'],
            'foerderquote': result['projekt']['foerderquote'],
            'gesamt_pm': result['projekt']['gesamt_pm']
        },
        'mitarbeiter': result['mitarbeiter'],
        'arbeitspakete': result['arbeitspakete'],
        'formular_info': formular_info,
        'parse_datum': datetime.now().isoformat(),
        'quell_datei': Path(pdf_path).name,
        'format_erkannt': result['format'],
        'statistik': statistik
    }


def main():
    if len(sys.argv) < 2:
        print("Verwendung: python3 parse-zim-pdf-v4.8.py <pfad-zur-pdf>")
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    
    if not Path(pdf_path).exists():
        print(f"Fehler: Datei nicht gefunden: {pdf_path}")
        sys.exit(1)
    
    try:
        data = parse_zim_pdf(pdf_path)
        
        json_path = Path(pdf_path).with_suffix('.json')
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        print(f"\n{'='*60}")
        print(f"ERGEBNIS")
        print(f"{'='*60}")
        print(f"JSON gespeichert: {json_path}")
        print(f"\nProjekt: {data['projekt']['name'][:70]}..." if data['projekt']['name'] else "Projekt: (kein Name)")
        print(f"Firma: {data['antragsteller']['firma']}")
        print(f"Format: {data['format_erkannt']}")
        
        # Formular-Info ausgeben
        fi = data['formular_info']
        print(f"\nFormular:")
        print(f"  {fi['quelle']} - {fi['formular_typ']}")
        if fi['richtlinie']:
            print(f"  Richtlinie: {fi['richtlinie']}")
        if fi['version'] or fi['stand']:
            print(f"  {('Version ' + fi['version']) if fi['version'] else ''} {('Stand: ' + fi['stand']) if fi['stand'] else ''}")
        
        print(f"\nStatistik:")
        print(f"  - Arbeitspakete gesamt: {data['statistik']['anzahl_arbeitspakete']}")
        print(f"  - Davon echte APs (mit PM): {data['statistik']['anzahl_echte_aps']}")
        print(f"  - Davon Ueberschriften: {data['statistik']['anzahl_ueberschriften']}")
        if data['statistik']['anzahl_technisch'] > 0:
            print(f"  - Technische APs (B): {data['statistik']['anzahl_technisch']}")
            print(f"  - Nicht-technische APs (A): {data['statistik']['anzahl_nicht_technisch']}")
        print(f"  - Gesamt PM: {data['statistik']['gesamt_pm']}")
        print(f"  - Mitarbeiter: {len(data.get('mitarbeiter', []))}")
        
        # Mitarbeiter ausgeben
        if data.get('mitarbeiter'):
            print(f"\nMitarbeiter (aus Anlage 6):")
            for ma in data['mitarbeiter']:
                qual = f" [{ma.get('qualifikation', '')}]" if ma.get('qualifikation') else ""
                print(f"  {ma['ma_nr']:3}. {ma['display_name']}{qual}")
        
        if data['arbeitspakete']:
            print(f"\nArbeitspakete:")
            for ap in data['arbeitspakete']:
                pm = ap.get('total_person_months')
                if pm is None:
                    pm_str = " ---"
                    header = " (UEBERSCHRIFT)"
                else:
                    pm_str = f"{pm:5.1f}"
                    header = ""
                tech = " [TECH]" if ap.get('is_technical') else ""
                ma_count = len(ap.get('mitarbeiter_zuordnungen', []))
                ma_str = f" ({ma_count} MA)" if ma_count > 0 else ""
                dates = ""
                if ap.get('start_date'):
                    dates = f" [{ap.get('start_date')} - {ap.get('end_date', '?')}]"
                print(f"  {ap['ap_code']:10} {ap['name'][:38]:38} {pm_str} PM{tech}{header}{ma_str}{dates}")
        
        print(f"\nDu kannst diese JSON-Datei jetzt in PZE V7 importieren.")
        
    except Exception as e:
        print(f"\nFehler: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()
