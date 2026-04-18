from http.server import BaseHTTPRequestHandler
import json
import re
import io
from datetime import datetime

from pypdf import PdfReader


def extract_xfa_data(pdf_bytes):
    """Extrahiert XFA-Daten aus PDF-Bytes."""
    try:
        # Versuche mit leerem Passwort (für Owner-geschützte PDFs)
        reader = PdfReader(io.BytesIO(pdf_bytes), password="")
        
        if '/AcroForm' not in reader.trailer['/Root']:
            return None, "Kein AcroForm gefunden"
        
        acroform = reader.trailer['/Root']['/AcroForm']
        
        if '/XFA' not in acroform:
            return None, f"Kein XFA in AcroForm"
        
        xfa = acroform['/XFA']
        xfa_data = ""
        
        if hasattr(xfa, '__iter__') and not isinstance(xfa, bytes):
            for i, item in enumerate(xfa):
                if hasattr(item, 'get_data'):
                    try:
                        data = item.get_data().decode('utf-8', errors='ignore')
                        if 'xfa:data' in data or 'datasets' in data or '<cg_' in data:
                            xfa_data += data
                    except:
                        pass
                elif hasattr(item, 'get_object'):
                    obj = item.get_object()
                    if hasattr(obj, 'get_data'):
                        try:
                            data = obj.get_data().decode('utf-8', errors='ignore')
                            if 'xfa:data' in data or 'datasets' in data or '<cg_' in data:
                                xfa_data += data
                        except:
                            pass
        
        if xfa_data:
            return xfa_data.replace('\n', ''), None
        
        return None, f"XFA gefunden aber keine Daten extrahiert"
    
    except Exception as e:
        return None, f"Exception: {str(e)}"


def extract_value(pattern, data, default=''):
    match = re.search(pattern, data)
    return match.group(1).strip() if match else default


def extract_float(pattern, data, default=0.0):
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


def parse_projekt(data):
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


def parse_antragsteller(data):
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


def parse_mitarbeiter(data):
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


def parse_arbeitspakete(data):
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


def parse_zim_pdf(pdf_bytes, filename):
    data, debug_info = extract_xfa_data(pdf_bytes)
    
    if not data:
        return {
            'success': False,
            'error': f'Konnte keine XFA-Daten extrahieren. {debug_info}',
            'debug': {
                'pdf_size': len(pdf_bytes),
                'filename': filename,
                'info': debug_info
            }
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


def parse_multipart(body, boundary):
    parts = body.split(f'--{boundary}'.encode())
    files = {}
    
    for part in parts:
        if not part or part == b'--\r\n' or part == b'--':
            continue
        
        try:
            if b'\r\n\r\n' in part:
                header_section, content = part.split(b'\r\n\r\n', 1)
            else:
                continue
            
            headers = header_section.decode('utf-8', errors='ignore')
            
            filename_match = re.search(r'filename="([^"]+)"', headers)
            name_match = re.search(r'name="([^"]+)"', headers)
            
            if filename_match and name_match:
                if content.endswith(b'\r\n'):
                    content = content[:-2]
                
                files[name_match.group(1)] = {
                    'filename': filename_match.group(1),
                    'content': content
                }
        except:
            continue
    
    return files


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            content_type = self.headers.get('Content-Type', '')
            content_length = int(self.headers.get('Content-Length', 0))
            
            if 'multipart/form-data' not in content_type:
                self._send_json(400, {'success': False, 'error': 'Content-Type must be multipart/form-data'})
                return
            
            boundary_match = re.search(r'boundary=([^;]+)', content_type)
            if not boundary_match:
                self._send_json(400, {'success': False, 'error': 'No boundary found'})
                return
            
            boundary = boundary_match.group(1).strip()
            body = self.rfile.read(content_length)
            files = parse_multipart(body, boundary)
            
            if 'file' not in files:
                self._send_json(400, {'success': False, 'error': 'No file uploaded'})
                return
            
            file_data = files['file']
            filename = file_data['filename']
            pdf_bytes = file_data['content']
            
            if not filename.lower().endswith('.pdf'):
                self._send_json(400, {'success': False, 'error': 'File must be a PDF'})
                return
            
            result = parse_zim_pdf(pdf_bytes, filename)
            self._send_json(200 if result['success'] else 400, result)
            
        except Exception as e:
            self._send_json(500, {'success': False, 'error': f'Server error: {str(e)}'})
    
    def do_OPTIONS(self):
        self.send_response(200)
        self._send_cors_headers()
        self.send_header('Content-Length', '0')
        self.end_headers()
    
    def _send_json(self, status, data):
        self.send_response(status)
        self._send_cors_headers()
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode('utf-8'))
    
    def _send_cors_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
