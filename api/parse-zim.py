# api/parse-zim.py
# Vercel Serverless Function (Python Runtime)
# Parst ZIM-Förderanträge (XFA-PDF) und gibt JSON zurück

import json
import re
import io
from datetime import datetime
from typing import Dict, List, Any, Optional
from urllib.parse import parse_qs

# pypdf für XFA-Extraktion
from pypdf import PdfReader


# ============================================================================
# PARSER-FUNKTIONEN
# ============================================================================

def extract_xfa_data(pdf_bytes: bytes) -> Optional[str]:
    """Extrahiert XFA-Daten aus PDF-Bytes."""
    try:
        reader = PdfReader(io.BytesIO(pdf_bytes))
        
        if '/AcroForm' not in reader.trailer['/Root']:
            return None
        
        acroform = reader.trailer['/Root']['/AcroForm']
        
        if '/XFA' not in acroform:
            return None
        
        xfa = acroform['/XFA']
        
        if hasattr(xfa, '__iter__') and len(xfa) > 9:
            for i, item in enumerate(xfa):
                if hasattr(item, 'get_data'):
                    data = item.get_data().decode('utf-8', errors='ignore')
                    if 'xfa:data' in data or 'datasets' in data:
                        return data.replace('\n', '')
        
        return None
    
    except Exception as e:
        print(f"Fehler beim Lesen der PDF: {e}")
        return None


def extract_value(pattern: str, data: str, default: str = '') -> str:
    """Extrahiert einen Wert mit Regex."""
    match = re.search(pattern, data)
    return match.group(1).strip() if match else default


def extract_float(pattern: str, data: str, default: float = 0.0) -> float:
    """Extrahiert einen Float-Wert."""
    value = extract_value(pattern, data, str(default))
    try:
        value = value.strip()
        
        if ',' in value and '.' in value:
            if value.rfind(',') > value.rfind('.'):
                value = value.replace('.', '').replace(',', '.')
            else:
                value = value.replace(',', '')
        elif ',' in value:
            value = value.replace(',', '.')
        
        return float(value)
    except ValueError:
        return default


def parse_projekt(data: str) -> Dict[str, Any]:
    """Parst Projektdaten."""
    return {
        'name': extract_value(r'<cg_VMS_VB_Projekt>([^<]+)', data),
        'kurzname': extract_value(r'<cg_VMS_VB_KurzName>([^<]+)', data),
        'fkz': extract_value(r'<cg_case_KENN_2>([^<]+)', data),
        'start': extract_value(r'<cg_VMS_VB_Beginn>([^<]+)', data),
        'ende': extract_value(r'<cg_VMS_VB_Ende>([^<]+)', data),
        'foerderquote': extract_float(r'<cg_VMS_AD_Förderquote>([^<]+)', data),
        'gesamtkosten': extract_float(r'<cg_VMS_HB_A_Kosten>([^<]+)', data),
        'zuwendung': extract_float(r'<cg_VMS_HB_A_ZuwendungFQ>([^<]+)', data),
        'gesamt_pm': extract_float(r'<sum_ges_pm>([^<]+)', data),
        'gesamt_pk': extract_float(r'<sum_ges_pk>([^<]+)', data),
    }


def parse_antragsteller(data: str) -> Dict[str, Any]:
    """Parst Antragsteller-Daten."""
    return {
        'firma': extract_value(r'<Seite2_AST>([^<]+)', data),
        'rechtsform': extract_value(r'<cg_VMS_AD_Rechtsform>([^<]+)', data),
        'strasse': extract_value(r'<Strasse_Ast>([^<]+)', data),
        'plz': extract_value(r'<PLZ_Ast>([^<]+)', data),
        'ort': extract_value(r'<Ort_Ast>([^<]+)', data),
        'bundesland': extract_value(r'<Bundeslan_Ast>([^<]+)', data),
        'website': extract_value(r'<website_Ast>([^<]+)', data),
        'ansprechpartner_name': f"{extract_value(r'<Seite2_VornameVB>([^<]+)', data)} {extract_value(r'<Seite2_NameVB>([^<]+)', data)}".strip(),
        'ansprechpartner_funktion': extract_value(r'<Seite2_FunktionVB>([^<]+)', data),
        'ansprechpartner_telefon': extract_value(r'<Seite2_TelefonVB>([^<]+)', data),
        'ansprechpartner_email': extract_value(r'<Seite2_MailVB>([^<]+)', data),
    }


def parse_mitarbeiter(data: str) -> List[Dict[str, Any]]:
    """Parst Mitarbeiter aus Anlage 6.1 und 6.2."""
    mitarbeiter = []
    
    ma_blocks = re.findall(r'<Teilform_page13>(.*?)</Teilform_page13>', data, re.DOTALL)
    a62_blocks = re.findall(r'<cg_file_262_Zeile1_Anlage62>(.*?)</cg_file_262_Zeile1_Anlage62>', data, re.DOTALL)
    
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
        
        ma = {
            'ma_nr': int(ma_id),
            'nachname': extract_value(r'<cg_VMS_PM_aNachname>([^<]+)', block),
            'vorname': extract_value(r'<cg_VMS_PM_aVorname>([^<]+)', block),
            'qualifikation': extract_value(r'<cg_VMS_PM_aQualFachAusb>([^<]+)', block),
            'qualifikation_gruppe': a62_data['qual_gruppe'],
            'geburtsdatum': extract_value(r'<cg_VMS_PM_dGeburtsdatum>([^<]+)', block),
            'funktion': extract_value(r'<cg_VMS_PM_aFunktion>([^<]+)', block),
            'angestellt_seit': extract_value(r'<cg_VMS_PM_dAngestSeit>([^<]+)', block),
            'jahresbrutto': extract_float(r'<Jahresbrutto>([^<]+)', block),
            'stundensatz': extract_float(r'<std_satz>([^<]+)', block),
            'wochenstunden': extract_float(r'<cg_VMS_PM_fWochArbeitsz>([^<]+)', block),
            'teilzeitfaktor': extract_float(r'<cg_VMS_PM_fTeilzFaktor>([^<]+)', block, 1.0),
            'pm_gesamt': a62_data['sum_pm'],
            'kosten_gesamt': a62_data['sum_pk'],
            'pm_pro_jahr': a62_data['pm_pro_jahr'],
        }
        mitarbeiter.append(ma)
    
    return sorted(mitarbeiter, key=lambda m: m['ma_nr'])


def parse_arbeitspakete(data: str) -> List[Dict[str, Any]]:
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
            pakete.append({
                'ap_nr': lfd,
                'beschreibung': current_beschreibung,
                'von': von,
                'bis': bis,
                'ma_nr': int(ma_nr) if ma_nr else 0,
                'pm': float(pm) if pm else 0.0,
            })
    
    return pakete


def parse_zim_pdf(pdf_bytes: bytes, filename: str) -> Dict[str, Any]:
    """Hauptfunktion: Parst eine ZIM-PDF komplett."""
    data = extract_xfa_data(pdf_bytes)
    
    if not data:
        return {
            'success': False,
            'error': 'Konnte keine XFA-Daten extrahieren. Ist dies eine gültige ZIM-Antrags-PDF?'
        }
    
    return {
        'success': True,
        'data': {
            'projekt': parse_projekt(data),
            'antragsteller': parse_antragsteller(data),
            'mitarbeiter': parse_mitarbeiter(data),
            'arbeitspakete': parse_arbeitspakete(data),
            'parse_datum': datetime.now().isoformat(),
            'quell_datei': filename,
        }
    }


# ============================================================================
# MULTIPART PARSER (für File Upload)
# ============================================================================

def parse_multipart(body: bytes, boundary: str) -> Dict[str, Any]:
    """Parst multipart/form-data."""
    parts = body.split(f'--{boundary}'.encode())
    files = {}
    
    for part in parts:
        if not part or part == b'--\r\n' or part == b'--':
            continue
        
        try:
            # Header und Content trennen
            if b'\r\n\r\n' in part:
                header_section, content = part.split(b'\r\n\r\n', 1)
            else:
                continue
            
            headers = header_section.decode('utf-8', errors='ignore')
            
            # Filename extrahieren
            filename_match = re.search(r'filename="([^"]+)"', headers)
            name_match = re.search(r'name="([^"]+)"', headers)
            
            if filename_match and name_match:
                # Trailing \r\n entfernen
                if content.endswith(b'\r\n'):
                    content = content[:-2]
                
                files[name_match.group(1)] = {
                    'filename': filename_match.group(1),
                    'content': content
                }
        except Exception as e:
            print(f"Part parsing error: {e}")
            continue
    
    return files


# ============================================================================
# VERCEL HANDLER
# ============================================================================

def handler(request):
    """Vercel Serverless Function Handler."""
    from http.server import BaseHTTPRequestHandler
    
    # CORS Headers
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json; charset=utf-8'
    }
    
    # OPTIONS (CORS Preflight)
    if request.method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': headers,
            'body': ''
        }
    
    # Nur POST erlauben
    if request.method != 'POST':
        return {
            'statusCode': 405,
            'headers': headers,
            'body': json.dumps({'success': False, 'error': 'Method not allowed. Use POST.'})
        }
    
    try:
        # Content-Type prüfen
        content_type = request.headers.get('content-type', '')
        
        if 'multipart/form-data' not in content_type:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'success': False, 'error': 'Content-Type must be multipart/form-data'})
            }
        
        # Boundary extrahieren
        boundary_match = re.search(r'boundary=([^;]+)', content_type)
        if not boundary_match:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'success': False, 'error': 'No boundary found in Content-Type'})
            }
        
        boundary = boundary_match.group(1).strip()
        
        # Body lesen
        body = request.body if isinstance(request.body, bytes) else request.body.encode()
        
        # Multipart parsen
        files = parse_multipart(body, boundary)
        
        if 'file' not in files:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'success': False, 'error': 'No file uploaded. Field name must be "file".'})
            }
        
        file_data = files['file']
        filename = file_data['filename']
        pdf_bytes = file_data['content']
        
        if not filename.lower().endswith('.pdf'):
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'success': False, 'error': 'File must be a PDF.'})
            }
        
        if len(pdf_bytes) == 0:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'success': False, 'error': 'Empty file uploaded.'})
            }
        
        if len(pdf_bytes) > 10 * 1024 * 1024:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'success': False, 'error': 'File too large. Maximum 10 MB.'})
            }
        
        # PDF parsen
        result = parse_zim_pdf(pdf_bytes, filename)
        
        return {
            'statusCode': 200 if result['success'] else 400,
            'headers': headers,
            'body': json.dumps(result, ensure_ascii=False)
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'success': False, 'error': f'Server error: {str(e)}'})
        }
