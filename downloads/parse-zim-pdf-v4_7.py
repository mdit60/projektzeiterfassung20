#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ZIM PDF zu JSON Konverter
VERSION: 4.7 - 23.01.2026

UNTERSTUETZT:
- Durchfuehrbarkeitsstudien (DS) mit technisch/nicht-technisch
- Standard-ZIM (Einzelprojekt, Kooperation, Netzwerk)
- Beide Projekttraeger: VDI/VDE und EuroNorm

NEU IN 4.7:
- KORRIGIERT: EuroNorm kann auch Einzelprojekte sein (nicht nur DS)
- Formular-Typ wird aus dem Dokument gelesen, nicht von Quelle abgeleitet
- EuroNorm-Versionsmuster: "Richtlinie: 2020  Version: 1.42  Stand: 09.10.2024"
- VDI/VDE-Versionsmuster: "Version 12  Stand: 16.08.2022"
- XML-Rauschen wird gefiltert

TAG-STRUKTUR:
DS (EuroNorm): Arbeitspaket_Nr, Arbeitspaket, von, bis, MA_Nr, pm
Standard-ZIM (VDI/VDE): lfd, ap, von, bis, ma_nr, pm
Standard-ZIM (EuroNorm EP): Noch zu ermitteln - evtl. gleich wie DS?
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


def parse_ma_nr(ma_str: str) -> int:
    if not ma_str:
        return None
    try:
        return int(float(ma_str.replace(',', '.')))
    except:
        return None


def detect_formular_version(xfa_text: str) -> dict:
    """
    Erkennt Formular-Quelle, Version und Stand.
    
    WICHTIG: Formular-Typ (Einzelprojekt, DS, etc.) wird SEPARAT erkannt,
    nicht von der Quelle abgeleitet!
    
    Bekannte Quellen:
    - VDI/VDE Innovation + Technik GmbH
    - EuroNorm GmbH
    
    Versionsmuster:
    - VDI/VDE: "Version 12  Stand: 16.08.2022"
    - EuroNorm: "Richtlinie: 2020  Version: 1.42  Stand: 09.10.2024"
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
    
    # === SCHRITT 1: Quelle erkennen (VDI/VDE oder EuroNorm) ===
    if re.search(r'VDI[/\\]?VDE', xfa_text, re.IGNORECASE):
        result['quelle'] = 'VDI/VDE'
        result['projekttraeger'] = 'VDI/VDE Innovation + Technik GmbH'
    
    if re.search(r'Euro\s*Norm', xfa_text, re.IGNORECASE):
        result['quelle'] = 'EuroNorm'
        result['projekttraeger'] = 'EuroNorm GmbH'
    
    # === SCHRITT 2: Formular-Typ aus dem Dokument lesen ===
    # WICHTIG: Nicht von der Quelle ableiten!
    
    # Suche nach expliziten Typ-Markern im Formular
    # "Einzelprojekt" im Header/Titel
    if re.search(r'Einzelprojekt|F.rdermodul\s+Einzelprojekt', xfa_text, re.IGNORECASE):
        result['formular_typ'] = 'Einzelprojekt'
    
    # "Kooperationsprojekt" im Header/Titel
    elif re.search(r'Kooperationsprojekt|F.rdermodul\s+Kooperation', xfa_text, re.IGNORECASE):
        result['formular_typ'] = 'Kooperation'
    
    # "Netzwerk" im Header/Titel
    elif re.search(r'Netzwerkprojekt|F.rdermodul\s+Netzwerk|Innovationsnetzwerk', xfa_text, re.IGNORECASE):
        result['formular_typ'] = 'Netzwerk'
    
    # Durchfuehrbarkeitsstudie - spezifische Marker
    elif re.search(r'Durchf.hrbarkeitsstudie|Antrag_DS|<thema>', xfa_text, re.IGNORECASE):
        result['formular_typ'] = 'Durchfuehrbarkeitsstudie'
    
    # Fallback basierend auf Tag-Struktur
    elif 'Antrag_DS' in xfa_text:
        result['formular_typ'] = 'Durchfuehrbarkeitsstudie'
    elif 'cg_VMS_' in xfa_text:
        # Standard-ZIM ohne spezifischen Typ - Default Einzelprojekt
        result['formular_typ'] = 'Einzelprojekt'
    
    # === SCHRITT 3: Version und Stand extrahieren ===
    
    # EuroNorm-Muster: "Richtlinie: 2020    Version: 1.42    Stand: 09.10.2024"
    euronorm_match = re.search(
        r'Richtlinie[:\s]*(\d{4})\s+Version[:\s]*(\d+(?:\.\d+)?)\s+Stand[:\s]*(\d{1,2}\.\d{1,2}\.\d{4})',
        xfa_text
    )
    if euronorm_match:
        result['richtlinie'] = euronorm_match.group(1)
        result['version'] = f"Version {euronorm_match.group(2)}"
        result['stand'] = euronorm_match.group(3)
        result['raw_version_info'] = [euronorm_match.group(0)]
    
    # Alternative EuroNorm-Muster (flexibler)
    if not result['version']:
        euronorm_alt = re.search(
            r'Richtlinie[:\s]*(\d{4})',
            xfa_text
        )
        if euronorm_alt:
            result['richtlinie'] = euronorm_alt.group(1)
    
    # VDI/VDE-Muster: "Version 12" oder "Version 12 Stand: 16.08.2022"
    if not result['version']:
        vdi_match = re.search(
            r'Version[:\s]*(\d+(?:\.\d+)?)\s*(?:Stand[:\s]*(\d{1,2}\.\d{1,2}\.\d{4}))?',
            xfa_text
        )
        if vdi_match:
            ver = vdi_match.group(1)
            # Filter: Ignoriere "1.0" (XML-Header)
            if ver != '1.0':
                result['version'] = f"Version {ver}"
                if vdi_match.group(2):
                    result['stand'] = vdi_match.group(2)
    
    # Stand separat suchen falls noch nicht gefunden
    if not result['stand']:
        stand_match = re.search(
            r'Stand[:\s]*(\d{1,2}\.\d{1,2}\.\d{4})',
            xfa_text
        )
        if stand_match:
            result['stand'] = stand_match.group(1)
    
    # === SCHRITT 4: Raw Info sammeln (ohne XML-Rauschen) ===
    raw_patterns = [
        r'(Richtlinie[:\s]*\d{4}[^<\n]{0,60})',
        r'(Version[:\s]*\d+\.\d+[^<\n]{0,40})',
        r'(Stand[:\s]*\d{1,2}\.\d{1,2}\.\d{4})',
    ]
    raw_matches = []
    for pattern in raw_patterns:
        matches = re.findall(pattern, xfa_text)
        for m in matches:
            m = m.strip()
            # Filter XML-Rauschen
            if m and len(m) > 5 and 'encoding=' not in m and 'UTF-8' not in m:
                if m not in raw_matches:
                    raw_matches.append(m)
    
    if raw_matches and not result['raw_version_info']:
        result['raw_version_info'] = raw_matches[:3]
    
    return result


def detect_format(xfa_text: str) -> str:
    """
    Erkennt das technische Format (Tag-Struktur) des PDFs.
    
    WICHTIG: Dies ist NICHT der Formular-Typ (Einzelprojekt vs DS),
    sondern die Tag-Struktur fuer das Parsing!
    
    - 'durchfuehrbarkeitsstudie': Tags wie Arbeitspaket_Nr, Arbeitspaket, MA_Nr
    - 'standard_zim': Tags wie lfd, ap, ma_nr
    """
    # Durchfuehrbarkeitsstudie-Tags
    if 'Antrag_DS' in xfa_text or '<thema>' in xfa_text:
        return 'durchfuehrbarkeitsstudie'
    
    # Standard-ZIM-Tags (VDI/VDE)
    if 'cg_VMS_' in xfa_text or 'cg_case_' in xfa_text:
        return 'standard_zim'
    
    # EuroNorm Einzelprojekt - pruefe auf spezifische Tags
    # Hat Arbeitspaket_Nr Tags aber KEIN Antrag_DS
    if re.search(r'<Arbeitspaket_Nr[^>]*>', xfa_text) and 'Antrag_DS' not in xfa_text:
        # Koennte EuroNorm EP sein - nutze DS-Parser (gleiche Tag-Struktur)
        return 'euronorm_einzelprojekt'
    
    # Fallback: Pruefe auf Arbeitspaket-Tags
    if re.search(r'<Arbeitspaket_Nr[^>]*>', xfa_text):
        return 'durchfuehrbarkeitsstudie'
    
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


def parse_durchfuehrbarkeitsstudie(xfa_text: str, is_einzelprojekt: bool = False) -> dict:
    """
    Parser fuer Durchfuehrbarkeitsstudien UND EuroNorm Einzelprojekte.
    Beide nutzen die gleiche Tag-Struktur!
    """
    text = xfa_text
    
    projekt = {
        'name': extract_value(r'<thema[^>]*>([^<]+)', text) or 
                extract_value(r'<Kurzbezeichnung[^>]*>([^<]+)', text) or
                extract_value(r'<cg_VMS_VB_Projekt[^>]*>([^<]+)', text),
        'kurzname': '',
        'fkz': extract_value(r'<Foerderkennzeichen[^>]*>([^<]+)', text) or
               extract_value(r'<FKZ[^>]*>([^<]+)', text),
        'start': extract_value(r'<Laufzeit_von[^>]*>([^<]+)', text) or
                 extract_value(r'<von_laufzeit[^>]*>([^<]+)', text),
        'ende': extract_value(r'<Laufzeit_bis[^>]*>([^<]+)', text) or
                extract_value(r'<bis_laufzeit[^>]*>([^<]+)', text),
        'foerderquote': extract_float(r'<Foerdersatz[^>]*>([^<]+)', text) or 
                        extract_float(r'<foerderquote[^>]*>([^<]+)', text) or
                        (50.0 if not is_einzelprojekt else 0.0),
        'gesamtkosten': extract_float(r'<Gesamtkosten[^>]*>([^<]+)', text) or
                        extract_float(r'<ges_kosten[^>]*>([^<]+)', text),
        'zuwendung': extract_float(r'<Zuwendung[^>]*>([^<]+)', text) or
                     extract_float(r'<zuwendung_beantragt[^>]*>([^<]+)', text),
        'gesamt_pm': 0.0,
        'gesamt_pk': extract_float(r'<sum_ges_pk[^>]*>([^<]+)', text) or 
                     extract_float(r'<ges_pk[^>]*>([^<]+)', text),
        'laufzeit_monate': 0
    }
    
    kurzfass = extract_value(r'<kurzfass[^>]*>([^<]+)', text) or \
               extract_value(r'<Kurzfassung[^>]*>([^<]+)', text)
    if kurzfass:
        projekt['kurzname'] = kurzfass[:100] + '...' if len(kurzfass) > 100 else kurzfass
    
    # Laufzeit berechnen
    if projekt['start'] and projekt['ende']:
        try:
            start_str = projekt['start']
            end_str = projekt['ende']
            # Format: DD.MM.YYYY
            if '.' in start_str:
                parts_s = start_str.split('.')
                parts_e = end_str.split('.')
                sy, sm = int(parts_s[2]), int(parts_s[1])
                ey, em = int(parts_e[2]), int(parts_e[1])
                projekt['laufzeit_monate'] = (ey - sy) * 12 + (em - sm) + 1
        except:
            pass
    
    antragsteller = {
        'firma': extract_value(r'<Firma[^>]*>([^<]+)', text) or
                 extract_value(r'<firma[^>]*>([^<]+)', text) or
                 extract_value(r'<Unternehmen[^>]*>([^<]+)', text),
        'rechtsform': extract_value(r'<Rechtsform[^>]*>([^<]+)', text),
        'strasse': extract_value(r'<str[^>]*>([^<]+)', text) or
                   extract_value(r'<Strasse[^>]*>([^<]+)', text),
        'plz': extract_value(r'<plz[^>]*>([^<]+)', text) or
               extract_value(r'<PLZ[^>]*>([^<]+)', text),
        'ort': extract_value(r'<ort[^>]*>([^<]+)', text) or 
               extract_value(r'<Ort[^>]*>([^<]+)', text) or
               extract_value(r'<pfach_ort[^>]*>([^<]+)', text),
        'bundesland': extract_value(r'<ddl_land[^>]*>([^<]+)', text) or
                      extract_value(r'<Bundesland[^>]*>([^<]+)', text),
        'website': extract_value(r'<www[^>]*>([^<]+)', text) or
                   extract_value(r'<Website[^>]*>([^<]+)', text),
        'ansprechpartner_name': extract_value(r'<AP_Name[^>]*>([^<]+)', text) or
                                extract_value(r'<Ansprechpartner[^>]*>([^<]+)', text),
        'ansprechpartner_funktion': extract_value(r'<AP_Funktion[^>]*>([^<]+)', text),
        'ansprechpartner_telefon': extract_value(r'<tel_ap[^>]*>([^<]+)', text) or 
                                   extract_value(r'<tel_gf[^>]*>([^<]+)', text) or
                                   extract_value(r'<AP_Telefon[^>]*>([^<]+)', text),
        'ansprechpartner_email': extract_value(r'<mail_ap[^>]*>([^<]+)', text) or 
                                 extract_value(r'<mail_gf[^>]*>([^<]+)', text) or
                                 extract_value(r'<AP_Email[^>]*>([^<]+)', text),
    }
    
    # Firma aus Website oder Email ableiten falls leer
    if not antragsteller['firma']:
        if antragsteller['website']:
            domain = antragsteller['website'].replace('www.', '').split('.')[0]
            antragsteller['firma'] = domain.capitalize() + ' GmbH'
        elif antragsteller['ansprechpartner_email']:
            domain = antragsteller['ansprechpartner_email'].split('@')[-1].split('.')[0]
            antragsteller['firma'] = domain.capitalize() + ' GmbH'
    
    # NICHT-TECHNISCHE APs (oder alle APs bei Einzelprojekt)
    ap_dict_a = process_ap_table(
        ap_nrs=extract_all_values_flexible('Arbeitspaket_Nr', text),
        ap_names=extract_all_values_flexible('Arbeitspaket', text),
        ap_pms=extract_all_values_flexible('pm', text),
        ap_von=extract_all_values_flexible('von', text),
        ap_bis=extract_all_values_flexible('bis', text),
        ap_ma_nrs=extract_all_values_flexible('MA_Nr', text),
        is_technical=False,
        label="NICHT-TECHNISCHE APs (Tabelle A)" if not is_einzelprojekt else "ARBEITSPAKETE"
    )
    
    # TECHNISCHE APs (nur bei DS, nicht bei Einzelprojekt)
    ap_dict_b = {}
    if not is_einzelprojekt:
        ap_dict_b = process_ap_table(
            ap_nrs=extract_all_values_flexible('Arbeitspaket_Nr_techn', text),
            ap_names=extract_all_values_flexible('Arbeitspaket_techn', text),
            ap_pms=extract_all_values_flexible('pm_techn', text),
            ap_von=extract_all_values_flexible('RealisierungVON', text),
            ap_bis=extract_all_values_flexible('RealisierungBIS', text),
            ap_ma_nrs=extract_all_values_flexible('MA_Nr_techn', text),
            is_technical=True,
            label="TECHNISCHE APs (Tabelle B)"
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
    
    format_name = 'einzelprojekt_euronorm' if is_einzelprojekt else 'durchfuehrbarkeitsstudie'
    
    return {
        'projekt': projekt,
        'antragsteller': antragsteller,
        'mitarbeiter': [],
        'arbeitspakete': arbeitspakete,
        'format': format_name
    }


def parse_standard_zim(xfa_text: str) -> dict:
    """Parser fuer Standard-ZIM (VDI/VDE: Einzelprojekt, Kooperation, Netzwerk)"""
    text = xfa_text
    
    projekt = {
        'name': extract_value(r'<cg_VMS_VB_Projekt[^>]*>([^<]+)', text),
        'kurzname': extract_value(r'<cg_VMS_VB_KurzName[^>]*>([^<]+)', text),
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
        label="ARBEITSPAKETE (Anlage 5)"
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
    
    return {
        'projekt': projekt,
        'antragsteller': antragsteller,
        'mitarbeiter': [],
        'arbeitspakete': arbeitspakete,
        'format': 'standard_zim'
    }


def parse_zim_pdf(pdf_path: str) -> dict:
    print(f"\n{'='*60}")
    print(f"ZIM PDF Parser v4.7")
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
    elif pdf_format == 'euronorm_einzelprojekt':
        # EuroNorm Einzelprojekt: Gleiche Tags wie DS, aber kein technischer Teil
        result = parse_durchfuehrbarkeitsstudie(xfa_text, is_einzelprojekt=True)
    elif pdf_format == 'durchfuehrbarkeitsstudie':
        result = parse_durchfuehrbarkeitsstudie(xfa_text, is_einzelprojekt=False)
    else:
        # Fallback
        result = parse_durchfuehrbarkeitsstudie(xfa_text)
        if not result['projekt']['name'] and not result['arbeitspakete']:
            result = parse_standard_zim(xfa_text)
    
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
        print("Verwendung: python3 parse-zim-pdf-v4.7.py <pfad-zur-pdf>")
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
            print(f"  {fi['version'] or ''} {('Stand: ' + fi['stand']) if fi['stand'] else ''}")
        
        print(f"\nStatistik:")
        print(f"  - Arbeitspakete gesamt: {data['statistik']['anzahl_arbeitspakete']}")
        print(f"  - Davon echte APs (mit PM): {data['statistik']['anzahl_echte_aps']}")
        print(f"  - Davon Ueberschriften: {data['statistik']['anzahl_ueberschriften']}")
        if data['format_erkannt'] == 'durchfuehrbarkeitsstudie':
            print(f"  - Technische APs (B): {data['statistik']['anzahl_technisch']}")
            print(f"  - Nicht-technische APs (A): {data['statistik']['anzahl_nicht_technisch']}")
        print(f"  - Gesamt PM: {data['statistik']['gesamt_pm']}")
        
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
