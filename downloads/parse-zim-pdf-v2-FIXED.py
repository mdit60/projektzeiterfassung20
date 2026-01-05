#!/usr/bin/env python3
"""
ZIM PDF zu JSON Konverter
Extrahiert XFA-Formulardaten aus ZIM-Förderanträgen

VERSION: 2.0 - 05.01.2026
FIXES:
- Alle MA-Zuordnungen pro AP werden erfasst (nicht nur erste Zeile)
- UTF-8 Encoding korrekt
- AP-Nummern wie "1.1", "1.2" werden unterstützt

Verwendung:
    python3 parse-zim-pdf.py <pfad-zur-pdf>
    
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
    match = re.search(pattern, text)
    return match.group(1).strip() if match else ''


def extract_float(pattern: str, text: str) -> float:
    """Extrahiert eine Zahl mit Regex"""
    value = extract_value(pattern, text)
    return parse_float_value(value)


def parse_float_value(value: str) -> float:
    """Parst einen String zu Float (mit deutschem Zahlenformat)"""
    if not value:
        return 0.0
    # Deutsche Zahlenformat-Konvertierung
    cleaned = value.strip()
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


def parse_ap_nummer(lfd: str) -> tuple:
    """
    Parst AP-Nummern wie "1", "1.1", "2", "2.1" etc.
    Gibt (haupt_nr, unter_nr) zurück, z.B. (1, 1) für "1.1"
    """
    if not lfd:
        return (0, 0)
    
    lfd = lfd.strip()
    
    # Format "1.1" oder "1.2"
    if '.' in lfd:
        parts = lfd.split('.')
        try:
            return (int(parts[0]), int(parts[1]) if len(parts) > 1 else 0)
        except:
            return (0, 0)
    
    # Einfache Nummer "1", "2", etc.
    try:
        return (int(lfd), 0)
    except:
        return (0, 0)


def parse_zim_pdf(pdf_path: str) -> dict:
    """Extrahiert alle Daten aus einem ZIM-PDF"""
    
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
    
    # Zeilenumbrüche in Tags normalisieren
    xfa_text = xfa_text.replace('\n>', '>')
    xfa_text = re.sub(r'<([^>]+)\n', r'<\1', xfa_text)
    
    # === PROJEKTDATEN ===
    projekt = {
        'name': extract_value(r'<cg_VMS_VB_Projekt>([^<]+)', xfa_text),
        'kurzname': extract_value(r'<cg_VMS_VB_KurzName>([^<]+)', xfa_text),
        'fkz': extract_value(r'<cg_case_KENN_2>([^<]+)', xfa_text),
        'start': extract_value(r'<cg_VMS_VB_Beginn>([^<]+)', xfa_text),
        'ende': extract_value(r'<cg_VMS_VB_Ende>([^<]+)', xfa_text),
        'foerderquote': extract_float(r'<cg_VMS_AD_Förderquote>([^<]+)', xfa_text) or 
                        extract_float(r'<cg_VMS_AD_F.rderquote>([^<]+)', xfa_text),
        'gesamtkosten': extract_float(r'<cg_VMS_HB_A_Kosten>([^<]+)', xfa_text),
        'zuwendung': extract_float(r'<cg_VMS_HB_A_ZuwendungFQ>([^<]+)', xfa_text),
        'gesamt_pm': extract_float(r'<sum_ges_pm>([^<]+)', xfa_text),
        'gesamt_pk': extract_float(r'<sum_ges_pk>([^<]+)', xfa_text),
        'laufzeit_monate': 0
    }
    
    # Laufzeit berechnen
    if projekt['start'] and projekt['ende']:
        try:
            # ISO-Format: YYYY-MM-DD
            if '-' in projekt['start']:
                start_parts = projekt['start'].split('-')
                end_parts = projekt['ende'].split('-')
                start_year, start_month = int(start_parts[0]), int(start_parts[1])
                end_year, end_month = int(end_parts[0]), int(end_parts[1])
            else:
                # Deutsches Format: DD.MM.YYYY
                start_parts = projekt['start'].split('.')
                end_parts = projekt['ende'].split('.')
                start_year, start_month = int(start_parts[2]), int(start_parts[1])
                end_year, end_month = int(end_parts[2]), int(end_parts[1])
            
            projekt['laufzeit_monate'] = (end_year - start_year) * 12 + (end_month - start_month) + 1
        except:
            pass
    
    print(f"Projekt: {projekt['kurzname']} ({projekt['fkz']})")
    
    # === ANTRAGSTELLER ===
    antragsteller = {
        'firma': extract_value(r'<Seite2_AST>([^<]+)', xfa_text),
        'rechtsform': extract_value(r'<cg_VMS_AD_Rechtsform>([^<]+)', xfa_text),
        'strasse': extract_value(r'<Strasse_Ast>([^<]+)', xfa_text),
        'plz': extract_value(r'<PLZ_Ast>([^<]+)', xfa_text),
        'ort': extract_value(r'<Ort_Ast>([^<]+)', xfa_text),
        'bundesland': extract_value(r'<cg_VMS_AD_Bundesland>([^<]+)', xfa_text) or
                      extract_value(r'<Bundeslan_Ast>([^<]+)', xfa_text),
        'website': extract_value(r'<website_Ast>([^<]+)', xfa_text),
        'ansprechpartner_name': f"{extract_value(r'<Seite2_VornameVB>([^<]+)', xfa_text)} {extract_value(r'<Seite2_NameVB>([^<]+)', xfa_text)}".strip() or
                                extract_value(r'<Seite4_NameBefugter>([^<]+)', xfa_text),
        'ansprechpartner_funktion': extract_value(r'<Seite2_FunktionVB>([^<]+)', xfa_text),
        'ansprechpartner_telefon': extract_value(r'<Seite2_TelefonVB>([^<]+)', xfa_text),
        'ansprechpartner_email': extract_value(r'<Seite2_MailVB>([^<]+)', xfa_text),
    }
    
    print(f"Antragsteller: {antragsteller['firma']}")
    
    # === BUDGET ===
    budget = {
        'gesamtkosten': projekt['gesamtkosten'],
        'personalkosten': projekt['gesamt_pk'] or extract_float(r'<cg_VMS_HB_A_Jahr1Kost01>([^<]+)', xfa_text),
        'materialkosten': extract_float(r'<cg_VMS_HB_A_Material>([^<]+)', xfa_text) or
                          extract_float(r'<cg_VMS_HB_A_Jahr1Kost02>([^<]+)', xfa_text),
        'fremdleistungen': extract_float(r'<cg_VMS_HB_A_Fremdleist>([^<]+)', xfa_text),
        'gemeinkosten': extract_float(r'<cg_VMS_HB_A_Gemein>([^<]+)', xfa_text),
        'foerderquote': projekt['foerderquote'],
        'foerdersumme': projekt['zuwendung'],
        'eigenanteil': projekt['gesamtkosten'] - projekt['zuwendung'],
        'laufzeit_monate': projekt['laufzeit_monate'],
        'gesamt_pm': projekt['gesamt_pm'],
    }
    
    # === MITARBEITER ===
    mitarbeiter = []
    
    # Anlage 6.2 Lookup (PM-Summen)
    a62_lookup = {}
    a62_blocks = re.findall(r'<cg_file_262_Zeile1_Anlage62>(.*?)</cg_file_262_Zeile1_Anlage62>', xfa_text, re.DOTALL)
    for block in a62_blocks:
        ma_id = extract_value(r'<cg_VMS_PK_DdsId_261>([^<]+)', block)
        if ma_id:
            pm_pro_jahr = {}
            for jahr_match in re.finditer(r'<cg_VMS_PK_iJahrZahl>(\d{4})</cg_VMS_PK_iJahrZahl>.*?<cg_VMS_PK_fPersMonat>([^<]+)</cg_VMS_PK_fPersMonat>', block, re.DOTALL):
                jahr = int(jahr_match.group(1))
                pm_str = jahr_match.group(2).strip()
                pm = parse_float_value(pm_str)
                pm_pro_jahr[jahr] = pm_pro_jahr.get(jahr, 0) + pm
            
            a62_lookup[ma_id] = {
                'qual_gruppe': int(extract_value(r'<cg_VMS_PK_aQualGruppe>([^<]+)', block) or '4'),
                'sum_pm': extract_float(r'<sum_pm>([^<]+)', block),
                'sum_pk': extract_float(r'<sum_pk>([^<]+)', block),
                'pm_pro_jahr': pm_pro_jahr
            }
    
    # Mitarbeiter aus Anlage 6.1
    ma_patterns = [
        r'<cg_file_261_a71>(.*?)</cg_file_261_a71>',
        r'<Teilform_page13>(.*?)</Teilform_page13>',
    ]
    
    found_ma_ids = set()
    for pattern in ma_patterns:
        for block in re.findall(pattern, xfa_text, re.DOTALL):
            ma_id = extract_value(r'<cg_DdsId_261>([^<]+)', block)
            if not ma_id or ma_id in found_ma_ids:
                continue
            
            nachname = extract_value(r'<cg_VMS_PM_aNachname>([^<]+)', block)
            vorname = extract_value(r'<cg_VMS_PM_aVorname>([^<]+)', block)
            
            if not nachname and not vorname:
                continue
            
            found_ma_ids.add(ma_id)
            a62_data = a62_lookup.get(ma_id, {'qual_gruppe': 4, 'sum_pm': 0, 'sum_pk': 0, 'pm_pro_jahr': {}})
            
            mitarbeiter.append({
                'ma_nr': int(ma_id) if ma_id.isdigit() else len(mitarbeiter) + 1,
                'nachname': nachname,
                'vorname': vorname,
                'qualifikation': extract_value(r'<cg_VMS_PM_aQualFachAusb>([^<]+)', block),
                'qualifikation_gruppe': a62_data['qual_gruppe'],
                'geburtsdatum': extract_value(r'<cg_VMS_PM_dGeburtsdatum>([^<]+)', block),
                'funktion': extract_value(r'<cg_VMS_PM_aFunktion>([^<]+)', block),
                'angestellt_seit': extract_value(r'<cg_VMS_PM_dAngestSeit>([^<]+)', block),
                'jahresbrutto': extract_float(r'<Jahresbrutto>([^<]+)', block) or
                                extract_float(r'<cg_VMS_PM_iJahresbrutto>([^<]+)', block),
                'stundensatz': extract_float(r'<std_satz>([^<]+)', block),
                'wochenstunden': extract_float(r'<cg_VMS_PM_fWochArbeitsz>([^<]+)', block),
                'teilzeitfaktor': extract_float(r'<cg_VMS_PM_fTeilzFaktor>([^<]+)', block) or 1.0,
                'pm_gesamt': a62_data['sum_pm'],
                'kosten_gesamt': a62_data['sum_pk'],
                'pm_pro_jahr': a62_data['pm_pro_jahr'],
            })
    
    mitarbeiter.sort(key=lambda x: x['ma_nr'])
    print(f"Mitarbeiter: {len(mitarbeiter)} gefunden")
    
    # === ARBEITSPAKETE === (KORRIGIERTE LOGIK!)
    arbeitspakete = []
    ap_temp = {}  # Key = AP-Code (z.B. "1.1"), Value = AP-Daten
    
    current_ap_code = None
    current_ap_name = None
    current_ap_von = None
    current_ap_bis = None
    
    # Arbeitsplan-Zeilen - ALLE Zeilen durchgehen
    for ap_match in re.finditer(
        r'<Zeile2>\s*<lfd>([^<]*)</lfd>\s*<ap>([^<]*)</ap>\s*<von>([^<]*)</von>\s*<bis>([^<]*)</bis>\s*<ma_nr>([^<]*)</ma_nr>\s*<pm>([^<]*)</pm>\s*</Zeile2>', 
        xfa_text
    ):
        lfd, ap, von, bis, ma_nr, pm = ap_match.groups()
        
        lfd = lfd.strip() if lfd else ''
        ap = ap.strip() if ap else ''
        von = von.strip() if von else ''
        bis = bis.strip() if bis else ''
        ma_nr = ma_nr.strip() if ma_nr else ''
        pm = pm.strip() if pm else ''
        
        # Debug
        # print(f"  Zeile: lfd={lfd}, ap={ap[:30] if ap else '-'}..., ma_nr={ma_nr}, pm={pm}")
        
        # Wenn neue AP-Nummer mit Name -> neues AP
        if lfd and ap:
            current_ap_code = lfd
            current_ap_name = ap
            current_ap_von = von
            current_ap_bis = bis
            
            if current_ap_code not in ap_temp:
                haupt_nr, unter_nr = parse_ap_nummer(current_ap_code)
                ap_temp[current_ap_code] = {
                    'ap_nummer': haupt_nr,
                    'ap_unter_nummer': unter_nr,
                    'ap_code': f'AP{current_ap_code}',
                    'name': current_ap_name,
                    'start_monat': int(current_ap_von) if current_ap_von and current_ap_von.isdigit() else None,
                    'ende_monat': int(current_ap_bis) if current_ap_bis and current_ap_bis.isdigit() else None,
                    'zuordnungen': []
                }
        
        # MA-Zuordnung hinzufügen (IMMER wenn ma_nr und pm vorhanden)
        if current_ap_code and ma_nr and pm:
            pm_val = extract_float(r'.*', pm)
            ma_nr_int = int(ma_nr) if ma_nr.isdigit() else 0
            
            if pm_val > 0 and ma_nr_int > 0:
                ap_temp[current_ap_code]['zuordnungen'].append({
                    'ma_nr': ma_nr_int,
                    'pm': pm_val
                })
    
    # Fallback: Alternative XML-Struktur
    if not ap_temp:
        print("  Versuche alternatives AP-Format...")
        current_ap_code = None
        
        for ap_match in re.finditer(
            r'<lfd>([^<]*)</lfd>.*?<ap>([^<]*)</ap>.*?<von>([^<]*)</von>.*?<bis>([^<]*)</bis>.*?<ma_nr>([^<]*)</ma_nr>.*?<pm>([^<]*)</pm>', 
            xfa_text, re.DOTALL
        ):
            lfd, ap, von, bis, ma_nr, pm = ap_match.groups()
            
            lfd = lfd.strip() if lfd else ''
            ap = ap.strip() if ap else ''
            ma_nr = ma_nr.strip() if ma_nr else ''
            pm = pm.strip() if pm else ''
            
            if lfd and ap:
                current_ap_code = lfd
                if current_ap_code not in ap_temp:
                    haupt_nr, unter_nr = parse_ap_nummer(current_ap_code)
                    ap_temp[current_ap_code] = {
                        'ap_nummer': haupt_nr,
                        'ap_unter_nummer': unter_nr,
                        'ap_code': f'AP{current_ap_code}',
                        'name': ap,
                        'start_monat': int(von) if von and von.isdigit() else None,
                        'ende_monat': int(bis) if bis and bis.isdigit() else None,
                        'zuordnungen': []
                    }
            
            if current_ap_code and ma_nr and pm:
                pm_val = extract_float(r'.*', pm)
                ma_nr_int = int(ma_nr) if ma_nr.isdigit() else 0
                if pm_val > 0 and ma_nr_int > 0:
                    ap_temp[current_ap_code]['zuordnungen'].append({
                        'ma_nr': ma_nr_int,
                        'pm': pm_val
                    })
    
    # AP-Liste erstellen, sortiert nach Nummer
    def sort_key(code):
        haupt, unter = parse_ap_nummer(code)
        return (haupt, unter)
    
    for ap_code in sorted(ap_temp.keys(), key=sort_key):
        ap_data = ap_temp[ap_code]
        gesamt_pm = sum(z['pm'] for z in ap_data['zuordnungen'])
        
        arbeitspakete.append({
            'ap_nummer': ap_data['ap_nummer'],
            'ap_code': ap_data['ap_code'],
            'name': ap_data['name'],
            'start_monat': ap_data['start_monat'],
            'ende_monat': ap_data['ende_monat'],
            'gesamt_pm': round(gesamt_pm, 2),
            'mitarbeiter_zuordnungen': ap_data['zuordnungen']
        })
    
    # Statistik
    total_zuordnungen = sum(len(ap['mitarbeiter_zuordnungen']) for ap in arbeitspakete)
    print(f"Arbeitspakete: {len(arbeitspakete)} gefunden mit {total_zuordnungen} MA-Zuordnungen")
    
    # === ERGEBNIS ===
    from datetime import datetime
    
    return {
        'projekt': projekt,
        'antragsteller': antragsteller,
        'budget': budget,
        'mitarbeiter': mitarbeiter,
        'arbeitspakete': arbeitspakete,
        'parse_datum': datetime.now().isoformat(),
        'quell_datei': Path(pdf_path).name,
        'statistik': {
            'anzahl_mitarbeiter': len(mitarbeiter),
            'anzahl_arbeitspakete': len(arbeitspakete),
            'anzahl_ap_zuordnungen': total_zuordnungen,
            'gesamt_pm': projekt['gesamt_pm'] or sum(m['pm_gesamt'] for m in mitarbeiter),
            'gesamt_pk': projekt['gesamt_pk'],
            'laufzeit_monate': projekt['laufzeit_monate'],
        }
    }


def main():
    if len(sys.argv) < 2:
        print("Verwendung: python3 parse-zim-pdf.py <pfad-zur-pdf>")
        print("Beispiel:   python3 parse-zim-pdf.py ~/Downloads/ZIM-Antrag.pdf")
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
        print(f"\n   Statistik:")
        print(f"   - Mitarbeiter: {data['statistik']['anzahl_mitarbeiter']}")
        print(f"   - Arbeitspakete: {data['statistik']['anzahl_arbeitspakete']}")
        print(f"   - AP-Zuordnungen: {data['statistik']['anzahl_ap_zuordnungen']}")
        print(f"   - Gesamt PM: {data['statistik']['gesamt_pm']}")
        print(f"\n   Du kannst diese Datei jetzt in V7 Import über 'JSON laden' hochladen.")
        
    except Exception as e:
        print(f"\n❌ Fehler: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()
