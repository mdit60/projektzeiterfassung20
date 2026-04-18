#!/usr/bin/env python3
"""
ZIM PDF zu JSON Konverter
Extrahiert XFA-Formulardaten aus ZIM-Foerderantraegen

VERSION: 4.0 - 23.01.2026

FEATURES:
- 4 Hierarchie-Ebenen fuer APs (AP1.2.3.4)
- is_technical Flag fuer Durchfuehrbarkeitsstudien
- start_date / end_date Extraktion
- Ueberschriften-APs erkennen (PM = 0 oder NULL)
- Unterstuetzt Standard-ZIM (EP, Kooperation) und DS

AENDERUNGEN v4.0:
- ap_sub_sub_number (Ebene 3)
- ap_level_4 (Ebene 4 - Reserve)
- is_technical: true fuer technische APs (nur DS)
- start_date, end_date aus 'von'/'bis' Feldern
- Besseres Debugging

Verwendung:
    python3 parse-zim-pdf-v4.py <pfad-zur-pdf>
    
Ausgabe:
    Erstellt eine JSON-Datei im gleichen Verzeichnis
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
    # Deutsche Zahlenformat-Konvertierung
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
    return [m.strip() for m in matches if m.strip()]


def parse_ap_number(ap_nr_str: str) -> dict:
    """
    Parst eine AP-Nummer in ihre Komponenten
    
    Beispiele:
    "1"       -> {ap_number: 1, ap_sub_number: None, ap_sub_sub_number: None, ap_level_4: None}
    "1.2"     -> {ap_number: 1, ap_sub_number: 2, ap_sub_sub_number: None, ap_level_4: None}
    "1.2.3"   -> {ap_number: 1, ap_sub_number: 2, ap_sub_sub_number: 3, ap_level_4: None}
    "1.2.3.4" -> {ap_number: 1, ap_sub_number: 2, ap_sub_sub_number: 3, ap_level_4: 4}
    """
    result = {
        'ap_number': 0,
        'ap_sub_number': None,
        'ap_sub_sub_number': None,
        'ap_level_4': None
    }
    
    if not ap_nr_str:
        return result
    
    # Bereinigen: Punkte am Ende entfernen, Leerzeichen trimmen
    clean_nr = ap_nr_str.strip().rstrip('.')
    
    # Nach Punkten splitten
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


def parse_german_date(date_str: str) -> str:
    """
    Konvertiert deutsches Datum zu ISO-Format
    
    Beispiele:
    "01.05.2023" -> "2023-05-01"
    "2023-05-01" -> "2023-05-01" (bereits ISO)
    """
    if not date_str:
        return None
    
    date_str = date_str.strip()
    
    # Bereits ISO-Format?
    if re.match(r'^\d{4}-\d{2}-\d{2}$', date_str):
        return date_str
    
    # Deutsches Format DD.MM.YYYY
    match = re.match(r'^(\d{1,2})\.(\d{1,2})\.(\d{4})$', date_str)
    if match:
        day, month, year = match.groups()
        return f"{year}-{month.zfill(2)}-{day.zfill(2)}"
    
    return None


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
    
    # Zeilenumbrueche normalisieren
    text = xfa_text.replace('\n>', '>').replace('>\n', '>')
    
    # Projekt
    projekt = {
        'name': extract_value(r'<thema>([^<]+)', text),
        'kurzname': '',
        'fkz': '',
        'start': '',
        'ende': '',
        'foerderquote': 50.0,  # DS hat feste 50%
        'gesamtkosten': 0.0,
        'zuwendung': 0.0,
        'gesamt_pm': 0.0,
        'gesamt_pk': extract_float(r'<sum_ges_pk>([^<]+)', text) or 
                     extract_float(r'<ges_pk>([^<]+)', text),
        'laufzeit_monate': 0
    }
    
    # Kurzfassung als Kurzname
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
    
    # Firma aus Website oder Email ableiten
    if antragsteller['website']:
        domain = antragsteller['website'].replace('www.', '').split('.')[0]
        antragsteller['firma'] = domain.capitalize() + ' GmbH'
    elif antragsteller['ansprechpartner_email']:
        domain = antragsteller['ansprechpartner_email'].split('@')[-1].split('.')[0]
        antragsteller['firma'] = domain.capitalize() + ' GmbH'
    
    arbeitspakete = []
    
    # ========================================
    # A) NICHT-TECHNISCHE Arbeitspakete
    # ========================================
    print("\n  Parsing NICHT-TECHNISCHE APs (Tabelle A)...")
    
    ap_nrs = extract_all_values('Arbeitspaket_Nr', text)
    ap_names = extract_all_values('Arbeitspaket', text)
    ap_pms = extract_all_values('pm', text)
    ap_von = extract_all_values('von', text)
    ap_bis = extract_all_values('bis', text)
    
    print(f"    Gefunden: {len(ap_nrs)} Nr, {len(ap_names)} Namen, {len(ap_pms)} PM, {len(ap_von)} von, {len(ap_bis)} bis")
    
    # Debug: Zeige was gefunden wurde
    for i in range(max(len(ap_nrs), len(ap_names), 5)):
        nr = ap_nrs[i] if i < len(ap_nrs) else '-'
        name = ap_names[i][:40] if i < len(ap_names) else '-'
        pm = ap_pms[i] if i < len(ap_pms) else '-'
        von = ap_von[i] if i < len(ap_von) else '-'
        bis = ap_bis[i] if i < len(ap_bis) else '-'
        print(f"    [{i}] Nr={nr}, Name={name}..., PM={pm}, von={von}, bis={bis}")
    
    for i in range(max(len(ap_nrs), len(ap_names))):
        ap_nr_str = ap_nrs[i] if i < len(ap_nrs) else str(i + 1)
        ap_name = ap_names[i] if i < len(ap_names) else ''
        pm_str = ap_pms[i] if i < len(ap_pms) else '0'
        von_str = ap_von[i] if i < len(ap_von) else ''
        bis_str = ap_bis[i] if i < len(ap_bis) else ''
        
        # Mindestens 3 Zeichen fuer gueltigen Namen
        if not ap_name or len(ap_name) < 3:
            print(f"    SKIP [{i}]: Name zu kurz oder leer")
            continue
        
        # AP-Nummer parsen (bis zu 4 Ebenen)
        ap_nums = parse_ap_number(ap_nr_str)
        
        if ap_nums['ap_number'] == 0:
            print(f"    SKIP [{i}]: AP-Nummer ungueltig: {ap_nr_str}")
            continue
        
        # PM parsen
        pm = 0.0
        try:
            pm = float(pm_str.replace(',', '.'))
        except:
            pass
        
        # Datum parsen
        start_date = parse_german_date(von_str)
        end_date = parse_german_date(bis_str)
        
        # Duplikat-Check
        exists = any(
            ap['ap_number'] == ap_nums['ap_number'] and 
            ap['ap_sub_number'] == ap_nums['ap_sub_number'] and
            ap['ap_sub_sub_number'] == ap_nums['ap_sub_sub_number'] and
            ap['ap_level_4'] == ap_nums['ap_level_4']
            for ap in arbeitspakete
        )
        
        if exists:
            print(f"    SKIP [{i}]: Duplikat {ap_nr_str}")
            continue
        
        ap_code = generate_ap_code(ap_nums)
        
        arbeitspakete.append({
            'ap_number': ap_nums['ap_number'],
            'ap_sub_number': ap_nums['ap_sub_number'],
            'ap_sub_sub_number': ap_nums['ap_sub_sub_number'],
            'ap_level_4': ap_nums['ap_level_4'],
            'ap_code': ap_code,
            'name': ap_name,
            'start_date': start_date,
            'end_date': end_date,
            'total_person_months': pm if pm > 0 else None,
            'is_technical': False,  # Nicht-technisch = A
            'mitarbeiter_zuordnungen': []
        })
        
        print(f"    ADD: {ap_code} - {ap_name[:30]}... (PM={pm}, tech=False)")
        
        if pm > 0:
            projekt['gesamt_pm'] += pm
    
    # ========================================
    # B) TECHNISCHE Arbeitspakete
    # ========================================
    print("\n  Parsing TECHNISCHE APs (Tabelle B)...")
    
    ap_nrs_tech = extract_all_values('Arbeitspaket_Nr_techn', text)
    ap_names_tech = extract_all_values('Arbeitspaket_techn', text)
    ap_pms_tech = extract_all_values('pm_techn', text)
    ap_von_tech = extract_all_values('von_techn', text)
    ap_bis_tech = extract_all_values('bis_techn', text)
    
    print(f"    Gefunden: {len(ap_nrs_tech)} Nr, {len(ap_names_tech)} Namen, {len(ap_pms_tech)} PM")
    
    # Debug
    for i in range(max(len(ap_nrs_tech), len(ap_names_tech), 5)):
        nr = ap_nrs_tech[i] if i < len(ap_nrs_tech) else '-'
        name = ap_names_tech[i][:40] if i < len(ap_names_tech) else '-'
        pm = ap_pms_tech[i] if i < len(ap_pms_tech) else '-'
        print(f"    [{i}] Nr={nr}, Name={name}..., PM={pm}")
    
    for i in range(max(len(ap_nrs_tech), len(ap_names_tech))):
        ap_nr_str = ap_nrs_tech[i] if i < len(ap_nrs_tech) else ''
        ap_name = ap_names_tech[i] if i < len(ap_names_tech) else ''
        pm_str = ap_pms_tech[i] if i < len(ap_pms_tech) else '0'
        von_str = ap_von_tech[i] if i < len(ap_von_tech) else ''
        bis_str = ap_bis_tech[i] if i < len(ap_bis_tech) else ''
        
        if not ap_name or len(ap_name) < 3:
            print(f"    SKIP [{i}]: Name zu kurz oder leer")
            continue
        
        if not ap_nr_str:
            print(f"    SKIP [{i}]: Keine AP-Nummer")
            continue
        
        ap_nums = parse_ap_number(ap_nr_str)
        
        if ap_nums['ap_number'] == 0:
            print(f"    SKIP [{i}]: AP-Nummer ungueltig: {ap_nr_str}")
            continue
        
        pm = 0.0
        try:
            pm = float(pm_str.replace(',', '.'))
        except:
            pass
        
        start_date = parse_german_date(von_str)
        end_date = parse_german_date(bis_str)
        
        # Duplikat-Check
        exists = any(
            ap['ap_number'] == ap_nums['ap_number'] and 
            ap['ap_sub_number'] == ap_nums['ap_sub_number'] and
            ap['ap_sub_sub_number'] == ap_nums['ap_sub_sub_number'] and
            ap['ap_level_4'] == ap_nums['ap_level_4']
            for ap in arbeitspakete
        )
        
        if exists:
            print(f"    SKIP [{i}]: Duplikat {ap_nr_str}")
            continue
        
        ap_code = generate_ap_code(ap_nums)
        
        arbeitspakete.append({
            'ap_number': ap_nums['ap_number'],
            'ap_sub_number': ap_nums['ap_sub_number'],
            'ap_sub_sub_number': ap_nums['ap_sub_sub_number'],
            'ap_level_4': ap_nums['ap_level_4'],
            'ap_code': ap_code,
            'name': ap_name,
            'start_date': start_date,
            'end_date': end_date,
            'total_person_months': pm if pm > 0 else None,
            'is_technical': True,  # Technisch = B
            'mitarbeiter_zuordnungen': []
        })
        
        print(f"    ADD: {ap_code} - {ap_name[:30]}... (PM={pm}, tech=True)")
        
        if pm > 0:
            projekt['gesamt_pm'] += pm
    
    # Sortieren nach Hierarchie
    arbeitspakete.sort(key=lambda ap: (
        ap['ap_number'], 
        ap['ap_sub_number'] or 0,
        ap['ap_sub_sub_number'] or 0,
        ap['ap_level_4'] or 0
    ))
    
    # Mitarbeiter (DS hat meist keine detaillierten MA-Daten)
    mitarbeiter = []
    
    return {
        'projekt': projekt,
        'antragsteller': antragsteller,
        'mitarbeiter': mitarbeiter,
        'arbeitspakete': arbeitspakete,
        'format': 'durchfuehrbarkeitsstudie'
    }


# ============================================================================
# STANDARD ZIM PARSER
# ============================================================================

def parse_standard_zim(xfa_text: str) -> dict:
    """Parser fuer Standard-ZIM-Antraege (EP, Kooperation)"""
    
    # Projekt
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
    
    # Laufzeit berechnen
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
    
    # Antragsteller
    antragsteller = {
        'firma': extract_value(r'<Seite2_AST[^>]*>.*?<cg_VMS_firma>([^<]+)', xfa_text) or
                 extract_value(r'<cg_VMS_firma>([^<]+)', xfa_text),
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
    
    arbeitspakete = []
    
    # Standard-ZIM APs parsen
    # TODO: Implementierung basierend auf tatsaechlicher XML-Struktur
    # Standard-ZIM hat KEINE Technisch/Nicht-technisch Unterscheidung!
    
    print("\n  Parsing Standard-ZIM APs...")
    print("  (Standard-ZIM Parser noch nicht vollstaendig implementiert)")
    
    mitarbeiter = []
    
    return {
        'projekt': projekt,
        'antragsteller': antragsteller,
        'mitarbeiter': mitarbeiter,
        'arbeitspakete': arbeitspakete,
        'format': 'standard_zim'
    }


# ============================================================================
# HAUPTFUNKTION
# ============================================================================

def parse_zim_pdf(pdf_path: str) -> dict:
    """Hauptfunktion: Extrahiert alle Daten aus einem ZIM-PDF"""
    
    print(f"\n{'='*60}")
    print(f"ZIM PDF Parser v4.0")
    print(f"{'='*60}")
    print(f"Lade PDF: {pdf_path}")
    
    reader = PdfReader(pdf_path)
    
    # XFA-Daten extrahieren
    root = reader.trailer['/Root'].get_object()
    
    if '/AcroForm' not in root:
        raise ValueError("Keine Formulardaten gefunden (kein AcroForm)")
    
    acro = root['/AcroForm'].get_object()
    
    if '/XFA' not in acro:
        raise ValueError("Keine XFA-Daten gefunden")
    
    xfa = acro['/XFA']
    
    # XFA ist ein Array mit Namen und Streams
    xfa_text = ""
    for i, item in enumerate(xfa):
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
    
    # Format erkennen
    pdf_format = detect_format(xfa_text)
    print(f"Format erkannt: {pdf_format}")
    
    # Entsprechenden Parser aufrufen
    if pdf_format == 'durchfuehrbarkeitsstudie':
        result = parse_durchfuehrbarkeitsstudie(xfa_text)
    elif pdf_format == 'standard_zim':
        result = parse_standard_zim(xfa_text)
    else:
        print("Unbekanntes Format - versuche DS-Parser...")
        result = parse_durchfuehrbarkeitsstudie(xfa_text)
        if not result['projekt']['name'] and not result['arbeitspakete']:
            print("DS-Parser fehlgeschlagen - versuche Standard-Parser...")
            result = parse_standard_zim(xfa_text)
    
    # Budget
    budget = {
        'gesamtkosten': result['projekt']['gesamtkosten'],
        'personalkosten': result['projekt']['gesamt_pk'],
        'materialkosten': 0.0,
        'fremdleistungen': 0.0,
        'gemeinkosten': 0.0,
        'foerderquote': result['projekt']['foerderquote'],
        'foerdersumme': result['projekt']['zuwendung'],
        'eigenanteil': 0.0,
        'laufzeit_monate': result['projekt']['laufzeit_monate'],
        'gesamt_pm': result['projekt']['gesamt_pm']
    }
    
    # Statistik
    aps_mit_pm = [ap for ap in result['arbeitspakete'] if ap.get('total_person_months') and ap['total_person_months'] > 0]
    aps_ueberschriften = [ap for ap in result['arbeitspakete'] if not ap.get('total_person_months') or ap['total_person_months'] == 0]
    aps_technisch = [ap for ap in result['arbeitspakete'] if ap.get('is_technical') == True]
    aps_nicht_technisch = [ap for ap in result['arbeitspakete'] if ap.get('is_technical') == False]
    
    statistik = {
        'anzahl_mitarbeiter': len(result['mitarbeiter']),
        'anzahl_arbeitspakete': len(result['arbeitspakete']),
        'anzahl_echte_aps': len(aps_mit_pm),
        'anzahl_ueberschriften': len(aps_ueberschriften),
        'anzahl_technisch': len(aps_technisch),
        'anzahl_nicht_technisch': len(aps_nicht_technisch),
        'anzahl_ap_zuordnungen': sum(
            len(ap.get('mitarbeiter_zuordnungen', [])) 
            for ap in result['arbeitspakete']
        ),
        'gesamt_pm': result['projekt']['gesamt_pm'],
        'gesamt_pk': result['projekt']['gesamt_pk'],
        'laufzeit_monate': result['projekt']['laufzeit_monate'],
    }
    
    return {
        'projekt': result['projekt'],
        'antragsteller': result['antragsteller'],
        'budget': budget,
        'mitarbeiter': result['mitarbeiter'],
        'arbeitspakete': result['arbeitspakete'],
        'parse_datum': datetime.now().isoformat(),
        'quell_datei': Path(pdf_path).name,
        'format_erkannt': result['format'],
        'statistik': statistik
    }


# ============================================================================
# MAIN
# ============================================================================

def main():
    if len(sys.argv) < 2:
        print("Verwendung: python3 parse-zim-pdf-v4.py <pfad-zur-pdf>")
        print("Beispiel:   python3 parse-zim-pdf-v4.py ~/Downloads/ZIM-Antrag.pdf")
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    
    if not Path(pdf_path).exists():
        print(f"Fehler: Datei nicht gefunden: {pdf_path}")
        sys.exit(1)
    
    try:
        data = parse_zim_pdf(pdf_path)
        
        # JSON speichern
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
        print(f"  - Mitarbeiter: {data['statistik']['anzahl_mitarbeiter']}")
        
        if data['arbeitspakete']:
            print(f"\nArbeitspakete:")
            for ap in data['arbeitspakete']:
                pm = ap.get('total_person_months') or 0
                tech = " [TECH]" if ap.get('is_technical') else ""
                ueberschrift = " (Ueberschrift)" if pm == 0 or pm is None else ""
                dates = ""
                if ap.get('start_date') or ap.get('end_date'):
                    dates = f" [{ap.get('start_date', '?')} - {ap.get('end_date', '?')}]"
                print(f"  {ap['ap_code']:10} {ap['name'][:45]:45} {pm:5.1f} PM{tech}{ueberschrift}{dates}")
        
        print(f"\nDu kannst diese JSON-Datei jetzt in PZE V7 importieren.")
        
    except Exception as e:
        print(f"\nFehler: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()
