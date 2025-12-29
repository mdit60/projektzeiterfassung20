#!/usr/bin/env python3
"""
ZIM-PDF-Parser für Förderanträge
================================
Extrahiert Projektdaten, Mitarbeiter und Personalkosten aus ZIM XFA-PDFs.

Verwendung:
    python scripts/zim-pdf-parser.py <pfad-zur-pdf> [--output json|csv]

Beispiel:
    python scripts/zim-pdf-parser.py ~/Downloads/ZIM_Antrag.pdf --output json

Ausgabe:
    - Projekt-Stammdaten
    - Antragsteller (Firma)
    - Mitarbeiter mit Qualifikation und Stundensatz
    - Personenmonate pro Jahr
    - Arbeitspakete
"""

import sys
import json
import re
import argparse
from pathlib import Path
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict
from datetime import datetime

try:
    from pypdf import PdfReader
except ImportError:
    print("Fehler: pypdf nicht installiert. Bitte ausführen:")
    print("  pip install pypdf")
    sys.exit(1)


# ============================================================================
# DATENKLASSEN
# ============================================================================

@dataclass
class Projekt:
    name: str
    kurzname: str
    fkz: str
    start: str
    ende: str
    foerderquote: float
    gesamtkosten: float
    zuwendung: float
    gesamt_pm: float
    gesamt_pk: float


@dataclass
class Antragsteller:
    firma: str
    rechtsform: str
    strasse: str
    plz: str
    ort: str
    bundesland: str
    website: str
    ansprechpartner_name: str
    ansprechpartner_funktion: str
    ansprechpartner_telefon: str
    ansprechpartner_email: str


@dataclass
class Mitarbeiter:
    ma_nr: int
    nachname: str
    vorname: str
    qualifikation: str
    qualifikation_gruppe: int  # 1-4
    geburtsdatum: str
    funktion: str
    angestellt_seit: str
    jahresbrutto: float
    stundensatz: float
    wochenstunden: float
    teilzeitfaktor: float
    pm_gesamt: float
    kosten_gesamt: float
    pm_pro_jahr: Dict[int, float]  # {2023: 5.5, 2024: 6.0}


@dataclass
class Arbeitspaket:
    ap_nr: str
    beschreibung: str
    von: str
    bis: str
    ma_nr: int
    pm: float


@dataclass
class ZimAntrag:
    projekt: Projekt
    antragsteller: Antragsteller
    mitarbeiter: List[Mitarbeiter]
    arbeitspakete: List[Arbeitspaket]
    parse_datum: str
    quell_datei: str


# ============================================================================
# PARSER-FUNKTIONEN
# ============================================================================

def extract_xfa_data(pdf_path: str) -> Optional[str]:
    """Extrahiert XFA-Daten aus einem PDF."""
    try:
        reader = PdfReader(pdf_path)
        
        if '/AcroForm' not in reader.trailer['/Root']:
            return None
        
        acroform = reader.trailer['/Root']['/AcroForm']
        
        if '/XFA' not in acroform:
            return None
        
        xfa = acroform['/XFA']
        
        # XFA ist ein Array mit verschiedenen Teilen
        # Teil 9 (Index 9) enthält typischerweise die Datasets
        if hasattr(xfa, '__iter__') and len(xfa) > 9:
            for i, item in enumerate(xfa):
                if hasattr(item, 'get_data'):
                    data = item.get_data().decode('utf-8', errors='ignore')
                    if 'xfa:data' in data or 'datasets' in data:
                        return data.replace('\n', '')
        
        return None
    
    except Exception as e:
        print(f"Fehler beim Lesen der PDF: {e}", file=sys.stderr)
        return None


def extract_value(pattern: str, data: str, default: str = '') -> str:
    """Extrahiert einen Wert mit Regex."""
    match = re.search(pattern, data)
    return match.group(1).strip() if match else default


def extract_float(pattern: str, data: str, default: float = 0.0) -> float:
    """Extrahiert einen Float-Wert."""
    value = extract_value(pattern, data, str(default))
    try:
        # Entferne Whitespace
        value = value.strip()
        
        # Deutsche Zahlenformate: 1.234,56 -> 1234.56
        # Englische Zahlenformate: 1,234.56 -> 1234.56
        # XFA-Format: 209056.00000000 -> 209056.0
        
        if ',' in value and '.' in value:
            # Beide vorhanden: letztes Zeichen bestimmt Dezimaltrenner
            if value.rfind(',') > value.rfind('.'):
                # Deutsches Format: 1.234,56
                value = value.replace('.', '').replace(',', '.')
            else:
                # Englisches Format: 1,234.56
                value = value.replace(',', '')
        elif ',' in value:
            # Nur Komma: Dezimaltrenner (deutsches Format ohne Tausender)
            value = value.replace(',', '.')
        # Nur Punkt oder keine Trenner: direkt parsen
        
        return float(value)
    except ValueError:
        return default


def parse_projekt(data: str) -> Projekt:
    """Parst Projektdaten."""
    return Projekt(
        name=extract_value(r'<cg_VMS_VB_Projekt>([^<]+)', data),
        kurzname=extract_value(r'<cg_VMS_VB_KurzName>([^<]+)', data),
        fkz=extract_value(r'<cg_case_KENN_2>([^<]+)', data),
        start=extract_value(r'<cg_VMS_VB_Beginn>([^<]+)', data),
        ende=extract_value(r'<cg_VMS_VB_Ende>([^<]+)', data),
        foerderquote=extract_float(r'<cg_VMS_AD_Förderquote>([^<]+)', data),
        gesamtkosten=extract_float(r'<cg_VMS_HB_A_Kosten>([^<]+)', data),
        zuwendung=extract_float(r'<cg_VMS_HB_A_ZuwendungFQ>([^<]+)', data),
        gesamt_pm=extract_float(r'<sum_ges_pm>([^<]+)', data),
        gesamt_pk=extract_float(r'<sum_ges_pk>([^<]+)', data),
    )


def parse_antragsteller(data: str) -> Antragsteller:
    """Parst Antragsteller-Daten."""
    return Antragsteller(
        firma=extract_value(r'<Seite2_AST>([^<]+)', data),
        rechtsform=extract_value(r'<cg_VMS_AD_Rechtsform>([^<]+)', data),
        strasse=extract_value(r'<Strasse_Ast>([^<]+)', data),
        plz=extract_value(r'<PLZ_Ast>([^<]+)', data),
        ort=extract_value(r'<Ort_Ast>([^<]+)', data),
        bundesland=extract_value(r'<Bundeslan_Ast>([^<]+)', data),
        website=extract_value(r'<website_Ast>([^<]+)', data),
        ansprechpartner_name=f"{extract_value(r'<Seite2_VornameVB>([^<]+)', data)} {extract_value(r'<Seite2_NameVB>([^<]+)', data)}".strip(),
        ansprechpartner_funktion=extract_value(r'<Seite2_FunktionVB>([^<]+)', data),
        ansprechpartner_telefon=extract_value(r'<Seite2_TelefonVB>([^<]+)', data),
        ansprechpartner_email=extract_value(r'<Seite2_MailVB>([^<]+)', data),
    )


def parse_mitarbeiter(data: str) -> List[Mitarbeiter]:
    """Parst Mitarbeiter aus Anlage 6.1 und 6.2."""
    mitarbeiter = []
    
    # Anlage 6.1: Mitarbeiter-Details aus Teilform_page13
    ma_blocks = re.findall(r'<Teilform_page13>(.*?)</Teilform_page13>', data, re.DOTALL)
    
    # Anlage 6.2: PM und Kosten pro MA
    a62_blocks = re.findall(r'<cg_file_262_Zeile1_Anlage62>(.*?)</cg_file_262_Zeile1_Anlage62>', data, re.DOTALL)
    
    # Erstelle Lookup für 6.2 Daten
    a62_lookup = {}
    for block in a62_blocks:
        ma_id = extract_value(r'<cg_VMS_PK_DdsId_261>([^<]+)', block)
        if ma_id:
            a62_lookup[ma_id] = {
                'qual_gruppe': int(extract_value(r'<cg_VMS_PK_aQualGruppe>([^<]+)', block, '4')),
                'sum_pm': extract_float(r'<sum_pm>([^<]+)', block),
                'sum_pk': extract_float(r'<sum_pk>([^<]+)', block),
                'pm_pro_jahr': {}
            }
            # PM pro Jahr
            jahre = re.findall(
                r'<cg_file_262_sub_UnterZeile\d+><cg_VMS_PK_iJahrZahl>(\d{4})</cg_VMS_PK_iJahrZahl><cg_VMS_PK_fPersMonat>([^<]+)</cg_VMS_PK_fPersMonat>',
                block
            )
            for jahr, pm in jahre:
                jahr_int = int(jahr)
                pm_float = float(pm) if pm else 0.0
                if jahr_int in a62_lookup[ma_id]['pm_pro_jahr']:
                    a62_lookup[ma_id]['pm_pro_jahr'][jahr_int] += pm_float
                else:
                    a62_lookup[ma_id]['pm_pro_jahr'][jahr_int] = pm_float
    
    # Verarbeite 6.1 Blöcke
    for block in ma_blocks:
        ma_id = extract_value(r'<cg_DdsId_261>([^<]+)', block)
        if not ma_id:
            continue
        
        a62_data = a62_lookup.get(ma_id, {
            'qual_gruppe': 4,
            'sum_pm': 0.0,
            'sum_pk': 0.0,
            'pm_pro_jahr': {}
        })
        
        ma = Mitarbeiter(
            ma_nr=int(ma_id),
            nachname=extract_value(r'<cg_VMS_PM_aNachname>([^<]+)', block),
            vorname=extract_value(r'<cg_VMS_PM_aVorname>([^<]+)', block),
            qualifikation=extract_value(r'<cg_VMS_PM_aQualFachAusb>([^<]+)', block),
            qualifikation_gruppe=a62_data['qual_gruppe'],
            geburtsdatum=extract_value(r'<cg_VMS_PM_dGeburtsdatum>([^<]+)', block),
            funktion=extract_value(r'<cg_VMS_PM_aFunktion>([^<]+)', block),
            angestellt_seit=extract_value(r'<cg_VMS_PM_dAngestSeit>([^<]+)', block),
            jahresbrutto=extract_float(r'<Jahresbrutto>([^<]+)', block),
            stundensatz=extract_float(r'<std_satz>([^<]+)', block),
            wochenstunden=extract_float(r'<cg_VMS_PM_fWochArbeitsz>([^<]+)', block),
            teilzeitfaktor=extract_float(r'<cg_VMS_PM_fTeilzFaktor>([^<]+)', block, 1.0),
            pm_gesamt=a62_data['sum_pm'],
            kosten_gesamt=a62_data['sum_pk'],
            pm_pro_jahr=a62_data['pm_pro_jahr'],
        )
        mitarbeiter.append(ma)
    
    return sorted(mitarbeiter, key=lambda m: m.ma_nr)


def parse_arbeitspakete(data: str) -> List[Arbeitspaket]:
    """Parst Arbeitspakete aus Anlage 5."""
    pakete = []
    
    matches = re.findall(
        r'<Zeile2><lfd>([^<]*)</lfd><ap>([^<]*)</ap><von>([^<]*)</von><bis>([^<]*)</bis><ma_nr>([^<]*)</ma_nr><pm>([^<]*)</pm></Zeile2>',
        data
    )
    
    current_beschreibung = ''
    for lfd, ap, von, bis, ma_nr, pm in matches:
        if ap:
            current_beschreibung = ap
        
        if ma_nr and pm:
            pakete.append(Arbeitspaket(
                ap_nr=lfd,
                beschreibung=current_beschreibung,
                von=von,
                bis=bis,
                ma_nr=int(ma_nr) if ma_nr else 0,
                pm=float(pm) if pm else 0.0,
            ))
    
    return pakete


def parse_zim_pdf(pdf_path: str) -> Optional[ZimAntrag]:
    """Hauptfunktion: Parst eine ZIM-PDF komplett."""
    data = extract_xfa_data(pdf_path)
    
    if not data:
        print(f"Fehler: Konnte keine XFA-Daten aus {pdf_path} extrahieren.", file=sys.stderr)
        print("Ist dies eine gültige ZIM-Antrags-PDF?", file=sys.stderr)
        return None
    
    return ZimAntrag(
        projekt=parse_projekt(data),
        antragsteller=parse_antragsteller(data),
        mitarbeiter=parse_mitarbeiter(data),
        arbeitspakete=parse_arbeitspakete(data),
        parse_datum=datetime.now().isoformat(),
        quell_datei=Path(pdf_path).name,
    )


# ============================================================================
# AUSGABE-FUNKTIONEN
# ============================================================================

def to_json(antrag: ZimAntrag) -> str:
    """Konvertiert zu JSON."""
    return json.dumps(asdict(antrag), indent=2, ensure_ascii=False)


def print_summary(antrag: ZimAntrag) -> None:
    """Gibt eine lesbare Zusammenfassung aus."""
    p = antrag.projekt
    a = antrag.antragsteller
    
    print("=" * 70)
    print("📋 ZIM-ANTRAG - EXTRAHIERTE DATEN")
    print("=" * 70)
    
    print(f"\n📁 PROJEKT")
    print(f"   Name: {p.name}")
    print(f"   Kurzname: {p.kurzname}")
    print(f"   FKZ: {p.fkz}")
    print(f"   Laufzeit: {p.start} bis {p.ende}")
    print(f"   Förderquote: {p.foerderquote}%")
    print(f"   Gesamtkosten: {p.gesamtkosten:,.2f} EUR")
    print(f"   Zuwendung: {p.zuwendung:,.2f} EUR")
    print(f"   Gesamt-PM: {p.gesamt_pm:.1f}")
    
    print(f"\n🏢 ANTRAGSTELLER")
    print(f"   Firma: {a.firma} ({a.rechtsform})")
    print(f"   Adresse: {a.strasse}, {a.plz} {a.ort}")
    print(f"   Bundesland: {a.bundesland}")
    print(f"   Ansprechpartner: {a.ansprechpartner_name} ({a.ansprechpartner_funktion})")
    print(f"   E-Mail: {a.ansprechpartner_email}")
    
    print(f"\n👥 MITARBEITER ({len(antrag.mitarbeiter)})")
    qual_namen = {1: 'HS', 2: 'FH/Tech', 3: 'Fach', 4: 'Sonst'}
    for ma in antrag.mitarbeiter:
        print(f"   MA {ma.ma_nr}: {ma.vorname} {ma.nachname}")
        print(f"          Qual: Grp {ma.qualifikation_gruppe} ({qual_namen.get(ma.qualifikation_gruppe, '?')})")
        print(f"          Stundensatz: {ma.stundensatz:.2f} EUR")
        print(f"          PM: {ma.pm_gesamt:.1f} | Kosten: {ma.kosten_gesamt:,.0f} EUR")
    
    print(f"\n📦 ARBEITSPAKETE ({len(antrag.arbeitspakete)} Zuordnungen)")
    shown_aps = set()
    for ap in antrag.arbeitspakete[:10]:
        if ap.ap_nr not in shown_aps:
            print(f"   AP {ap.ap_nr}: {ap.beschreibung[:50]}...")
            shown_aps.add(ap.ap_nr)
    if len(antrag.arbeitspakete) > 10:
        print(f"   ... und {len(antrag.arbeitspakete) - 10} weitere")
    
    print("\n" + "=" * 70)


# ============================================================================
# MAIN
# ============================================================================

def main():
    parser = argparse.ArgumentParser(
        description='ZIM-PDF-Parser - Extrahiert Daten aus ZIM-Förderanträgen'
    )
    parser.add_argument('pdf_path', help='Pfad zur ZIM-PDF-Datei')
    parser.add_argument(
        '--output', '-o',
        choices=['json', 'summary'],
        default='summary',
        help='Ausgabeformat (default: summary)'
    )
    parser.add_argument(
        '--save', '-s',
        help='Speichert JSON in angegebene Datei'
    )
    
    args = parser.parse_args()
    
    if not Path(args.pdf_path).exists():
        print(f"Fehler: Datei nicht gefunden: {args.pdf_path}", file=sys.stderr)
        sys.exit(1)
    
    antrag = parse_zim_pdf(args.pdf_path)
    
    if not antrag:
        sys.exit(1)
    
    if args.output == 'json':
        print(to_json(antrag))
    else:
        print_summary(antrag)
    
    if args.save:
        with open(args.save, 'w', encoding='utf-8') as f:
            f.write(to_json(antrag))
        print(f"\n✅ JSON gespeichert: {args.save}")


if __name__ == '__main__':
    main()
