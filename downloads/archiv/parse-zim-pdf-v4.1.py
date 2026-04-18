#!/usr/bin/env python3
"""
ZIM PDF zu JSON Konverter
Extrahiert XFA-Formulardaten aus ZIM-Foerderantraegen

VERSION: 4.1 - 23.01.2026

FEATURES:
- 4 Hierarchie-Ebenen fuer APs (AP1.2.3.4)
- is_technical Flag fuer Durchfuehrbarkeitsstudien
- start_date / end_date Extraktion
- Ueberschriften-APs erkennen (keine PM, keine MA)
- Mitarbeiter-Zuordnungen pro AP (mehrere Zeilen = mehrere MA)
- PM werden pro AP summiert

AENDERUNGEN v4.1:
- Zeilen mit gleichem AP aber ohne Titel = weitere MA-Zuordnung
- PM werden summiert pro AP
- Ueberschriften haben PM=NULL (nicht 0)
- MA-Nummer wird extrahiert

Verwendung:
    python3 parse-zim-pdf-v4.py <pfad-zur-pdf>
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
    print("Bitte installieren mit: pip3 install pypdf")
    sys.exit(1)


# ============================================================================
# HELPER FUNKTIONEN
# ============================================================================

def extract_value(pattern: str, text: str) -> str:
    """Extrahiert einen Wert mit Regex"""
    match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
    return match.group(1).strip() if match else ''


def extract_float(pattern: str, text: str) -> float:
    """Extrahiert eine Zahl mit Regex"""
    value = extract_value(pattern, text)
    if not value:
        return 0.0
    cleaned = value
    if ',' in cleaned and '.' in cleaned:
        if cleaned.rfind(',') > cleaned.rfind('.'):
            cleaned = cleaned.replace('.', '').replace(',', '.')
        else:
            cleaned = cleaned.replace(',', '')
    elif ',' in cleaned:
        cleaned = cleaned.replace(',', '.')
    try:
        return float(cleaned)
    except:
        return 0.0


def extract_all_values(tag_name: str, text: str) -> list:
    """Extrahiert alle Werte eines Tags"""
    pattern = f'<{tag_name}>([^<]*)</{tag_name}>'
    matches = re.findall(pattern, text, re.IGNORECASE | re.DOTALL)
    return [m.strip() for m in matches]


def parse_ap_number(ap_nr_str: str) -> dict:
    """
    Parst eine AP-Nummer in ihre Komponenten
    """
    result = {
        'ap_number': 0,
        'ap_sub_number': None,
        'ap_sub_sub_number': None,
        'ap_level_4': None
    }
    
    if not ap_nr_str:
        return result
    
    clean_nr = ap_nr_str.strip().rstrip('.')
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
    except (ValueError, IndexError):
        pass
    
    return result


def generate_ap_code(ap_data: dict) -> str:
    """Generiert AP-Code aus den Nummern-Komponenten"""
    code = f"AP{ap_data['ap_number']}"
    if ap_data['ap_sub_number'] is not None:
        code += f".{ap_data['ap_sub_number']}"
    if ap_data['ap_sub_sub_number'] is not None:
        code += f".{ap_data['ap_sub_sub_number']}"
    if ap_data['ap_level_4'] is not None:
        code += f".{ap_data['ap_level_4']}"
    return code


def ap_key(ap_nums: dict) -> tuple:
    """Erzeugt einen eindeutigen Key fuer ein AP"""
    return (
        ap_nums['ap_number'],
        ap_nums['ap_sub_number'],
        ap_nums['ap_sub_sub_number'],
        ap_nums['ap_level_4']
    )


def parse_german_date(date_str: str) -> str:
    """Konvertiert deutsches Datum zu ISO-Format"""
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
    """Parst PM-Wert, gibt 0.0 bei leerem String"""
    if not pm_str or pm_str == '-':
        return 0.0
    try:
        return float(pm_str.replace(',', '.'))
    except:
        return 0.0


def detect_format(xfa_text: str) -> str:
    """Erkennt das PDF-Format"""
    if 'Antrag_DS' in xfa_text or '<thema>' in xfa_text:
        return 'durchfuehrbarkeitsstudie'
    elif 'cg_VMS_' in xfa_text or 'cg_case_' in xfa_text:
        return 'standard_zim'
    else:
        return 'unbekannt'


# ============================================================================
# DURCHFUEHRBARKEITSSTUDIE PARSER
# ============================================================================

def parse_durchfuehrbarkeitsstudie(xfa_text: str) -> dict:
    """Parser fuer Durchfuehrbarkeitsstudien (Antrag_DS)"""
    
    text = xfa_text.replace('\n>', '>').replace('>\n', '>')
    
    # Projekt
    projekt = {
        'name': extract_value(r'<thema>([^<]+)', text),
        'kurzname': '',
        'fkz': '',
        'start': '',
        'ende': '',
        'foerderquote': 50.0,
        'gesamtkosten': 0.0,
        'zuwendung': 0.0,
        'gesamt_pm': 0.0,
        'gesamt_pk': extract_float(r'<sum_ges_pk>([^<]+)', text) or 
                     extract_float(r'<ges_pk>([^<]+)', text),
        'laufzeit_monate': 0
    }
    
    kurzfass = extract_value(r'<kurzfass>([^<]+)', text)
    if kurzfass:
        projekt['kurzname'] = kurzfass[:100] + '...' if len(kurzfass) > 100 else kurzfass
    
    # Antragsteller
    antragsteller = {
        'firma': '',
        'rechtsform': extract_value(r'<Rechtsform>([^<]+)', text),
        'strasse': extract_value(r'<str>([^<]+)', text),
        'plz': extract_value(r'<plz>([^<]+)', text),
        'ort': extract_value(r'<ort>([^<]+)', text) or extract_value(r'<pfach_ort>([^<]+)', text),
        'bundesland': extract_value(r'<ddl_land>([^<]+)', text),
        'website': extract_value(r'<www>([^<]+)', text),
        'ansprechpartner_name': '',
        'ansprechpartner_funktion': '',
        'ansprechpartner_telefon': extract_value(r'<tel_ap>([^<]+)', text) or 
                                   extract_value(r'<tel_gf>([^<]+)', text),
        'ansprechpartner_email': extract_value(r'<mail_ap>([^<]+)', text) or 
                                 extract_value(r'<mail_gf>([^<]+)', text),
    }
    
    if antragsteller['website']:
        domain = antragsteller['website'].replace('www.', '').split('.')[0]
        antragsteller['firma'] = domain.capitalize() + ' GmbH'
    elif antragsteller['ansprechpartner_email']:
        domain = antragsteller['ansprechpartner_email'].split('@')[-1].split('.')[0]
        antragsteller['firma'] = domain.capitalize() + ' GmbH'
    
    # Dictionary fuer APs (key = ap_key tuple)
    ap_dict = {}
    
    # ========================================
    # A) NICHT-TECHNISCHE Arbeitspakete
    # ========================================
    print("\n  Parsing NICHT-TECHNISCHE APs (Tabelle A)...")
    
    ap_nrs = extract_all_values('Arbeitspaket_Nr', text)
    ap_names = extract_all_values('Arbeitspaket', text)
    ap_pms = extract_all_values('pm', text)
    ap_von = extract_all_values('von', text)
    ap_bis = extract_all_values('bis', text)
    ap_ma_nrs = extract_all_values('MA_Nr', text)  # Mitarbeiter-Nummer
    
    print(f"    Gefunden: {len(ap_nrs)} Nr, {len(ap_names)} Namen, {len(ap_pms)} PM, {len(ap_ma_nrs)} MA-Nr")
    
    # Verarbeite alle Zeilen
    current_ap_key = None
    current_ap_name = None
    
    for i in range(len(ap_nrs)):
        ap_nr_str = ap_nrs[i] if i < len(ap_nrs) else ''
        ap_name = ap_names[i] if i < len(ap_names) else ''
        pm_str = ap_pms[i] if i < len(ap_pms) else ''
        von_str = ap_von[i] if i < len(ap_von) else ''
        bis_str = ap_bis[i] if i < len(ap_bis) else ''
        ma_nr_str = ap_ma_nrs[i] if i < len(ap_ma_nrs) else ''
        
        # AP-Nummer parsen
        ap_nums = parse_ap_number(ap_nr_str)
        if ap_nums['ap_number'] == 0:
            continue
        
        key = ap_key(ap_nums)
        pm = parse_pm(pm_str)
        ma_nr = int(ma_nr_str) if ma_nr_str.isdigit() else None
        start_date = parse_german_date(von_str)
        end_date = parse_german_date(bis_str)
        
        # Hat diese Zeile einen Namen?
        has_name = ap_name and len(ap_name) >= 3
        
        if has_name:
            # Neue AP-Definition oder Update mit Namen
            current_ap_key = key
            current_ap_name = ap_name
            
            if key not in ap_dict:
                # Neues AP anlegen
                # Pruefe ob Ueberschrift: kein PM, kein MA, kein Datum
                is_header = (pm == 0 and ma_nr is None and not start_date and not end_date)
                
                ap_dict[key] = {
                    'ap_number': ap_nums['ap_number'],
                    'ap_sub_number': ap_nums['ap_sub_number'],
                    'ap_sub_sub_number': ap_nums['ap_sub_sub_number'],
                    'ap_level_4': ap_nums['ap_level_4'],
                    'ap_code': generate_ap_code(ap_nums),
                    'name': ap_name,
                    'start_date': start_date,
                    'end_date': end_date,
                    'total_person_months': None if is_header else pm,
                    'is_technical': False,
                    'mitarbeiter_zuordnungen': []
                }
                
                if not is_header and ma_nr:
                    ap_dict[key]['mitarbeiter_zuordnungen'].append({
                        'ma_nr': ma_nr,
                        'pm': pm
                    })
                
                status = "HEADER" if is_header else f"ADD (PM={pm})"
                print(f"    [{i}] {ap_nr_str}: {ap_name[:35]}... -> {status}")
            else:
                # AP existiert schon, PM addieren
                if pm > 0:
                    if ap_dict[key]['total_person_months'] is None:
                        ap_dict[key]['total_person_months'] = pm
                    else:
                        ap_dict[key]['total_person_months'] += pm
                    
                    if ma_nr:
                        ap_dict[key]['mitarbeiter_zuordnungen'].append({
                            'ma_nr': ma_nr,
                            'pm': pm
                        })
                    print(f"    [{i}] {ap_nr_str}: +{pm} PM (MA {ma_nr})")
        else:
            # Zeile ohne Namen = weitere MA-Zuordnung zum aktuellen AP
            if key in ap_dict and pm > 0:
                if ap_dict[key]['total_person_months'] is None:
                    ap_dict[key]['total_person_months'] = pm
                else:
                    ap_dict[key]['total_person_months'] += pm
                
                if ma_nr:
                    ap_dict[key]['mitarbeiter_zuordnungen'].append({
                        'ma_nr': ma_nr,
                        'pm': pm
                    })
                print(f"    [{i}] {ap_nr_str}: +{pm} PM (MA {ma_nr}) -> Zuordnung")
            elif pm > 0:
                print(f"    [{i}] {ap_nr_str}: SKIP - kein AP gefunden fuer Zuordnung")
    
    # ========================================
    # B) TECHNISCHE Arbeitspakete
    # ========================================
    print("\n  Parsing TECHNISCHE APs (Tabelle B)...")
    
    ap_nrs_tech = extract_all_values('Arbeitspaket_Nr_techn', text)
    ap_names_tech = extract_all_values('Arbeitspaket_techn', text)
    ap_pms_tech = extract_all_values('pm_techn', text)
    ap_von_tech = extract_all_values('von_techn', text)
    ap_bis_tech = extract_all_values('bis_techn', text)
    ap_ma_nrs_tech = extract_all_values('MA_Nr_techn', text)
    
    print(f"    Gefunden: {len(ap_nrs_tech)} Nr, {len(ap_names_tech)} Namen, {len(ap_pms_tech)} PM, {len(ap_ma_nrs_tech)} MA-Nr")
    
    for i in range(len(ap_nrs_tech)):
        ap_nr_str = ap_nrs_tech[i] if i < len(ap_nrs_tech) else ''
        ap_name = ap_names_tech[i] if i < len(ap_names_tech) else ''
        pm_str = ap_pms_tech[i] if i < len(ap_pms_tech) else ''
        von_str = ap_von_tech[i] if i < len(ap_von_tech) else ''
        bis_str = ap_bis_tech[i] if i < len(ap_bis_tech) else ''
        ma_nr_str = ap_ma_nrs_tech[i] if i < len(ap_ma_nrs_tech) else ''
        
        ap_nums = parse_ap_number(ap_nr_str)
        if ap_nums['ap_number'] == 0:
            continue
        
        key = ap_key(ap_nums)
        pm = parse_pm(pm_str)
        ma_nr = int(ma_nr_str) if ma_nr_str.isdigit() else None
        start_date = parse_german_date(von_str)
        end_date = parse_german_date(bis_str)
        
        has_name = ap_name and len(ap_name) >= 3
        
        if has_name:
            current_ap_key = key
            current_ap_name = ap_name
            
            if key not in ap_dict:
                # Pruefe ob Ueberschrift
                is_header = (pm == 0 and ma_nr is None and not start_date and not end_date)
                
                ap_dict[key] = {
                    'ap_number': ap_nums['ap_number'],
                    'ap_sub_number': ap_nums['ap_sub_number'],
                    'ap_sub_sub_number': ap_nums['ap_sub_sub_number'],
                    'ap_level_4': ap_nums['ap_level_4'],
                    'ap_code': generate_ap_code(ap_nums),
                    'name': ap_name,
                    'start_date': start_date,
                    'end_date': end_date,
                    'total_person_months': None if is_header else pm,
                    'is_technical': True,  # TECHNISCH!
                    'mitarbeiter_zuordnungen': []
                }
                
                if not is_header and ma_nr:
                    ap_dict[key]['mitarbeiter_zuordnungen'].append({
                        'ma_nr': ma_nr,
                        'pm': pm
                    })
                
                status = "HEADER" if is_header else f"ADD (PM={pm})"
                print(f"    [{i}] {ap_nr_str}: {ap_name[:35]}... -> {status} [TECH]")
            else:
                if pm > 0:
                    if ap_dict[key]['total_person_months'] is None:
                        ap_dict[key]['total_person_months'] = pm
                    else:
                        ap_dict[key]['total_person_months'] += pm
                    
                    if ma_nr:
                        ap_dict[key]['mitarbeiter_zuordnungen'].append({
                            'ma_nr': ma_nr,
                            'pm': pm
                        })
                    print(f"    [{i}] {ap_nr_str}: +{pm} PM (MA {ma_nr}) [TECH]")
        else:
            # Zeile ohne Namen = MA-Zuordnung
            if key in ap_dict and pm > 0:
                if ap_dict[key]['total_person_months'] is None:
                    ap_dict[key]['total_person_months'] = pm
                else:
                    ap_dict[key]['total_person_months'] += pm
                
                if ma_nr:
                    ap_dict[key]['mitarbeiter_zuordnungen'].append({
                        'ma_nr': ma_nr,
                        'pm': pm
                    })
                print(f"    [{i}] {ap_nr_str}: +{pm} PM (MA {ma_nr}) -> Zuordnung [TECH]")
            elif pm > 0:
                print(f"    [{i}] {ap_nr_str}: SKIP - kein AP gefunden fuer Zuordnung")
    
    # Dictionary zu Liste konvertieren und sortieren
    arbeitspakete = list(ap_dict.values())
    arbeitspakete.sort(key=lambda ap: (
        ap['ap_number'], 
        ap['ap_sub_number'] or 0,
        ap['ap_sub_sub_number'] or 0,
        ap['ap_level_4'] or 0
    ))
    
    # Gesamt-PM berechnen (nur echte APs, nicht Ueberschriften)
    for ap in arbeitspakete:
        if ap['total_person_months'] and ap['total_person_months'] > 0:
            projekt['gesamt_pm'] += ap['total_person_months']
    
    mitarbeiter = []
    
    return {
        'projekt': projekt,
        'antragsteller': antragsteller,
        'mitarbeiter': mitarbeiter,
        'arbeitspakete': arbeitspakete,
        'format': 'durchfuehrbarkeitsstudie'
    }


# ============================================================================
# STANDARD ZIM PARSER (Platzhalter)
# ============================================================================

def parse_standard_zim(xfa_text: str) -> dict:
    """Parser fuer Standard-ZIM-Antraege"""
    
    projekt = {
        'name': extract_value(r'<cg_VMS_VB_Projekt>([^<]+)', xfa_text),
        'kurzname': extract_value(r'<cg_VMS_VB_KurzName>([^<]+)', xfa_text),
        'fkz': extract_value(r'<cg_case_KENN_2>([^<]+)', xfa_text),
        'start': extract_value(r'<cg_VMS_VB_Beginn>([^<]+)', xfa_text),
        'ende': extract_value(r'<cg_VMS_VB_Ende>([^<]+)', xfa_text),
        'foerderquote': extract_float(r'<cg_VMS_AD_F[oö]rderquote>([^<]+)', xfa_text),
        'gesamtkosten': extract_float(r'<cg_VMS_HB_A_Kosten>([^<]+)', xfa_text),
        'zuwendung': extract_float(r'<cg_VMS_HB_A_ZuwendungFQ>([^<]+)', xfa_text),
        'gesamt_pm': extract_float(r'<sum_ges_pm>([^<]+)', xfa_text),
        'gesamt_pk': extract_float(r'<sum_ges_pk>([^<]+)', xfa_text),
        'laufzeit_monate': 0
    }
    
    if projekt['start'] and projekt['ende']:
        try:
            if '-' in projekt['start']:
                start_parts = projekt['start'].split('-')
                end_parts = projekt['ende'].split('-')
                start_year, start_month = int(start_parts[0]), int(start_parts[1])
                end_year, end_month = int(end_parts[0]), int(end_parts[1])
            else:
                start_parts = projekt['start'].split('.')
                end_parts = projekt['ende'].split('.')
                start_year, start_month = int(start_parts[2]), int(start_parts[1])
                end_year, end_month = int(end_parts[2]), int(end_parts[1])
            projekt['laufzeit_monate'] = (end_year - start_year) * 12 + (end_month - start_month) + 1
        except:
            pass
    
    antragsteller = {
        'firma': extract_value(r'<cg_VMS_firma>([^<]+)', xfa_text),
        'rechtsform': extract_value(r'<cg_VMS_rechtsform>([^<]+)', xfa_text),
        'strasse': extract_value(r'<cg_VMS_str>([^<]+)', xfa_text),
        'plz': extract_value(r'<cg_VMS_plz>([^<]+)', xfa_text),
        'ort': extract_value(r'<cg_VMS_ort>([^<]+)', xfa_text),
        'bundesland': extract_value(r'<cg_VMS_bundesland>([^<]+)', xfa_text),
        'website': extract_value(r'<cg_VMS_www>([^<]+)', xfa_text),
        'ansprechpartner_name': extract_value(r'<cg_VMS_AP_name>([^<]+)', xfa_text),
        'ansprechpartner_funktion': extract_value(r'<cg_VMS_AP_funktion>([^<]+)', xfa_text),
        'ansprechpartner_telefon': extract_value(r'<cg_VMS_AP_tel>([^<]+)', xfa_text),
        'ansprechpartner_email': extract_value(r'<cg_VMS_AP_mail>([^<]+)', xfa_text),
    }
    
    print("\n  Parsing Standard-ZIM APs...")
    print("  (Standard-ZIM Parser noch nicht vollstaendig implementiert)")
    
    return {
        'projekt': projekt,
        'antragsteller': antragsteller,
        'mitarbeiter': [],
        'arbeitspakete': [],
        'format': 'standard_zim'
    }


# ============================================================================
# HAUPTFUNKTION
# ============================================================================

def parse_zim_pdf(pdf_path: str) -> dict:
    """Hauptfunktion"""
    
    print(f"\n{'='*60}")
    print(f"ZIM PDF Parser v4.1")
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
    
    pdf_format = detect_format(xfa_text)
    print(f"Format erkannt: {pdf_format}")
    
    if pdf_format == 'durchfuehrbarkeitsstudie':
        result = parse_durchfuehrbarkeitsstudie(xfa_text)
    elif pdf_format == 'standard_zim':
        result = parse_standard_zim(xfa_text)
    else:
        print("Unbekanntes Format - versuche DS-Parser...")
        result = parse_durchfuehrbarkeitsstudie(xfa_text)
        if not result['projekt']['name'] and not result['arbeitspakete']:
            result = parse_standard_zim(xfa_text)
    
    # Statistik
    aps_mit_pm = [ap for ap in result['arbeitspakete'] if ap.get('total_person_months') and ap['total_person_months'] > 0]
    aps_ueberschriften = [ap for ap in result['arbeitspakete'] if not ap.get('total_person_months')]
    aps_technisch = [ap for ap in aps_mit_pm if ap.get('is_technical') == True]
    aps_nicht_technisch = [ap for ap in aps_mit_pm if ap.get('is_technical') == False]
    
    statistik = {
        'anzahl_mitarbeiter': len(result['mitarbeiter']),
        'anzahl_arbeitspakete': len(result['arbeitspakete']),
        'anzahl_echte_aps': len(aps_mit_pm),
        'anzahl_ueberschriften': len(aps_ueberschriften),
        'anzahl_technisch': len(aps_technisch),
        'anzahl_nicht_technisch': len(aps_nicht_technisch),
        'gesamt_pm': result['projekt']['gesamt_pm'],
        'gesamt_pk': result['projekt']['gesamt_pk'],
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
        'parse_datum': datetime.now().isoformat(),
        'quell_datei': Path(pdf_path).name,
        'format_erkannt': result['format'],
        'statistik': statistik
    }


def main():
    if len(sys.argv) < 2:
        print("Verwendung: python3 parse-zim-pdf-v4.py <pfad-zur-pdf>")
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
                pm_str = f"{pm:.1f}" if pm else "---"
                tech = " [TECH]" if ap.get('is_technical') else ""
                header = " (Ueberschrift)" if pm is None else ""
                ma_count = len(ap.get('mitarbeiter_zuordnungen', []))
                ma_str = f" ({ma_count} MA)" if ma_count > 0 else ""
                dates = ""
                if ap.get('start_date') or ap.get('end_date'):
                    dates = f" [{ap.get('start_date', '?')} - {ap.get('end_date', '?')}]"
                print(f"  {ap['ap_code']:10} {ap['name'][:40]:40} {pm_str:>5} PM{tech}{header}{ma_str}{dates}")
        
        print(f"\nDu kannst diese JSON-Datei jetzt in PZE V7 importieren.")
        
    except Exception as e:
        print(f"\nFehler: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()
