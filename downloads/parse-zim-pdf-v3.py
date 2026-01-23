#!/usr/bin/env python3
"""
ZIM PDF zu JSON Konverter
Extrahiert XFA-Formulardaten aus ZIM-Foerderantraegen

VERSION: 3.0 - 22.01.2026
FEATURES:
- Unterstuetzt Standard-ZIM-Antraege (Einzelprojekt, Kooperation)
- Unterstuetzt Durchfuehrbarkeitsstudien (Antrag_DS)
- UTF-8 Encoding korrekt
- AP-Nummern wie "1.1", "1.2" werden unterstuetzt

Verwendung:
    python3 parse-zim-pdf-v3.py <pfad-zur-pdf>
    
Ausgabe:
    Erstellt eine JSON-Datei im gleichen Verzeichnis
    
Voraussetzung:
    pip3 install pypdf
"""

import sys
import json
import re
from pathlib import Path

try:
    from pypdf import PdfReader
except ImportError:
    print("Fehler: pypdf nicht installiert!")
    print("Bitte installieren mit: pip3 install pypdf")
    sys.exit(1)


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


def detect_format(xfa_text: str) -> str:
    """Erkennt das PDF-Format"""
    if 'Antrag_DS' in xfa_text or '<thema>' in xfa_text:
        return 'durchfuehrbarkeitsstudie'
    elif 'cg_VMS_' in xfa_text or 'cg_case_' in xfa_text:
        return 'standard_zim'
    else:
        return 'unbekannt'


def parse_standard_zim(xfa_text: str) -> dict:
    """Parser fuer Standard-ZIM-Antraege"""
    
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
    
    # Mitarbeiter aus Anlage 6.1
    mitarbeiter = []
    # TODO: Standard-ZIM Mitarbeiter-Parsing
    
    # Arbeitspakete
    arbeitspakete = []
    # TODO: Standard-ZIM AP-Parsing
    
    return {
        'projekt': projekt,
        'antragsteller': antragsteller,
        'mitarbeiter': mitarbeiter,
        'arbeitspakete': arbeitspakete,
        'format': 'standard_zim'
    }


def parse_durchfuehrbarkeitsstudie(xfa_text: str) -> dict:
    """Parser fuer Durchfuehrbarkeitsstudien (Antrag_DS)"""
    
    # Zeilenumbrueche normalisieren
    text = xfa_text.replace('\n>', '>').replace('>\n', '>')
    
    # Projekt
    projekt = {
        'name': extract_value(r'<thema>([^<]+)', text),
        'kurzname': '',  # DS hat kein separates Kurzname-Feld
        'fkz': '',  # Wird erst nach Bewilligung vergeben
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
    
    # Kurzfassung als Kurzname (erste 100 Zeichen)
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
    
    # Arbeitspakete - Nicht-technische APs
    arbeitspakete = []
    
    ap_nrs = extract_all_values('Arbeitspaket_Nr', text)
    ap_names = extract_all_values('Arbeitspaket', text)
    ap_pms = extract_all_values('pm', text)
    
    print(f"  Nicht-techn. APs: {len(ap_nrs)} Nr, {len(ap_names)} Namen, {len(ap_pms)} PM")
    
    for i in range(max(len(ap_nrs), len(ap_names))):
        ap_nr_str = ap_nrs[i] if i < len(ap_nrs) else str(i + 1)
        ap_name = ap_names[i] if i < len(ap_names) else ''
        pm_str = ap_pms[i] if i < len(ap_pms) else '0'
        
        if ap_name and len(ap_name) > 2:
            # Parse AP-Nummer
            ap_nummer = 0
            ap_sub = None
            
            if '.' in ap_nr_str:
                parts = ap_nr_str.split('.')
                ap_nummer = int(parts[0]) if parts[0].isdigit() else 0
                ap_sub = int(parts[1]) if len(parts) > 1 and parts[1].isdigit() else None
            else:
                ap_nummer = int(ap_nr_str) if ap_nr_str.isdigit() else (i + 1)
            
            pm = 0.0
            try:
                pm = float(pm_str.replace(',', '.'))
            except:
                pass
            
            arbeitspakete.append({
                'ap_nummer': ap_nummer,
                'ap_sub_nummer': ap_sub,
                'ap_code': f'AP{ap_nr_str}',
                'name': ap_name,
                'start_monat': None,
                'ende_monat': None,
                'gesamt_pm': pm,
                'mitarbeiter_zuordnungen': []
            })
            
            projekt['gesamt_pm'] += pm
    
    # Arbeitspakete - Technische APs
    ap_nrs_tech = extract_all_values('Arbeitspaket_Nr_techn', text)
    ap_names_tech = extract_all_values('Arbeitspaket_techn', text)
    ap_pms_tech = extract_all_values('pm_techn', text)
    
    print(f"  Technische APs: {len(ap_nrs_tech)} Nr, {len(ap_names_tech)} Namen, {len(ap_pms_tech)} PM")
    
    for i in range(max(len(ap_nrs_tech), len(ap_names_tech))):
        ap_nr_str = ap_nrs_tech[i] if i < len(ap_nrs_tech) else ''
        ap_name = ap_names_tech[i] if i < len(ap_names_tech) else ''
        pm_str = ap_pms_tech[i] if i < len(ap_pms_tech) else '0'
        
        if ap_name and len(ap_name) > 2 and ap_nr_str:
            # Parse AP-Nummer
            clean_nr = ap_nr_str.rstrip('.')
            ap_nummer = 0
            ap_sub = None
            
            if '.' in clean_nr:
                parts = clean_nr.split('.')
                ap_nummer = int(parts[0]) if parts[0].isdigit() else 0
                ap_sub = int(parts[1]) if len(parts) > 1 and parts[1].isdigit() else None
            else:
                ap_nummer = int(clean_nr) if clean_nr.isdigit() else 0
            
            # Pruefe ob AP schon existiert
            exists = any(
                ap['ap_nummer'] == ap_nummer and ap.get('ap_sub_nummer') == ap_sub 
                for ap in arbeitspakete
            )
            
            if not exists and ap_nummer > 0:
                pm = 0.0
                try:
                    pm = float(pm_str.replace(',', '.'))
                except:
                    pass
                
                arbeitspakete.append({
                    'ap_nummer': ap_nummer,
                    'ap_sub_nummer': ap_sub,
                    'ap_code': f'AP{clean_nr}',
                    'name': ap_name,
                    'start_monat': None,
                    'ende_monat': None,
                    'gesamt_pm': pm,
                    'mitarbeiter_zuordnungen': []
                })
                
                projekt['gesamt_pm'] += pm
    
    # Sortieren
    arbeitspakete.sort(key=lambda ap: (ap['ap_nummer'], ap.get('ap_sub_nummer') or 0))
    
    # DS hat normalerweise keine detaillierten Mitarbeiter-Daten
    mitarbeiter = []
    
    return {
        'projekt': projekt,
        'antragsteller': antragsteller,
        'mitarbeiter': mitarbeiter,
        'arbeitspakete': arbeitspakete,
        'format': 'durchfuehrbarkeitsstudie'
    }


def parse_zim_pdf(pdf_path: str) -> dict:
    """Hauptfunktion: Extrahiert alle Daten aus einem ZIM-PDF"""
    
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
        # Versuche beide Parser
        print("Unbekanntes Format - versuche DS-Parser...")
        result = parse_durchfuehrbarkeitsstudie(xfa_text)
        if not result['projekt']['name'] and not result['arbeitspakete']:
            print("DS-Parser fehlgeschlagen - versuche Standard-Parser...")
            result = parse_standard_zim(xfa_text)
    
    # Budget berechnen
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
    statistik = {
        'anzahl_mitarbeiter': len(result['mitarbeiter']),
        'anzahl_arbeitspakete': len(result['arbeitspakete']),
        'anzahl_ap_zuordnungen': sum(
            len(ap.get('mitarbeiter_zuordnungen', [])) 
            for ap in result['arbeitspakete']
        ),
        'gesamt_pm': result['projekt']['gesamt_pm'],
        'gesamt_pk': result['projekt']['gesamt_pk'],
        'laufzeit_monate': result['projekt']['laufzeit_monate'],
    }
    
    from datetime import datetime
    
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


def main():
    if len(sys.argv) < 2:
        print("Verwendung: python3 parse-zim-pdf-v3.py <pfad-zur-pdf>")
        print("Beispiel:   python3 parse-zim-pdf-v3.py ~/Downloads/ZIM-Antrag.pdf")
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
        
        print(f"\n✅ Erfolgreich!")
        print(f"   JSON gespeichert: {json_path}")
        print(f"\n   Projekt: {data['projekt']['name'][:80]}..." if data['projekt']['name'] else "   Projekt: (kein Name)")
        print(f"   Firma: {data['antragsteller']['firma']}")
        print(f"\n   Statistik:")
        print(f"   - Mitarbeiter: {data['statistik']['anzahl_mitarbeiter']}")
        print(f"   - Arbeitspakete: {data['statistik']['anzahl_arbeitspakete']}")
        print(f"   - Gesamt PM: {data['statistik']['gesamt_pm']}")
        print(f"   - Format: {data['format_erkannt']}")
        
        if data['arbeitspakete']:
            print(f"\n   Arbeitspakete:")
            for ap in data['arbeitspakete'][:10]:
                print(f"   - {ap['ap_code']}: {ap['name'][:50]}... ({ap['gesamt_pm']} PM)")
        
        print(f"\n   Du kannst diese Datei jetzt in V7 Import ueber 'JSON laden' hochladen.")
        
    except Exception as e:
        print(f"\n❌ Fehler: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()
