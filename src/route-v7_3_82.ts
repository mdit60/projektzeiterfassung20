// src/app/api/parse-zim/route.ts
// ============================================================================
// PZE V7 - ZIM PDF Parser API
// ============================================================================
// Version: 7.3.82
// Datum: 23. Januar 2026
//
// Diese Route ruft den Python-Parser als Subprocess auf, da:
// - Python pypdf XFA-Formulare zuverlaessig extrahieren kann
// - Python mit verschluesselten PDFs umgehen kann
// - Die Parser-Logik bereits in Python implementiert und getestet ist
//
// Fuer lokale Entwicklung: Python + pypdf muessen installiert sein
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import { writeFile, unlink } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomUUID } from 'crypto'

// ============================================================================
// PYTHON PARSER CODE (eingebettet)
// ============================================================================

const PYTHON_PARSER = `#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import sys
import json
import re
from pypdf import PdfReader

def extract_value(pattern, text):
    match = re.search(pattern, text)
    return match.group(1).strip() if match else ''

def extract_float(pattern, text):
    val = extract_value(pattern, text)
    if not val:
        return 0.0
    try:
        return float(val.replace(',', '.').replace(' ', ''))
    except:
        return 0.0

def extract_all_values(tag_name, text):
    pattern = f'<{tag_name}[^>]*>([^<]*)</{tag_name}'
    matches = re.findall(pattern, text, re.IGNORECASE | re.DOTALL)
    return [m.strip() for m in matches]

def parse_date(date_str):
    if not date_str:
        return None
    match = re.match(r'(\\d{1,2})\\.(\\d{1,2})\\.(\\d{4})', date_str)
    if match:
        d, m, y = match.groups()
        return f"{y}-{m.zfill(2)}-{d.zfill(2)}"
    return date_str if re.match(r'\\d{4}-\\d{2}-\\d{2}', date_str) else None

def parse_pm(pm_str):
    if not pm_str or pm_str == '-':
        return 0.0
    try:
        return float(pm_str.replace(',', '.'))
    except:
        return 0.0

def detect_format(text):
    if 'cg_VMS_VB_Projekt' in text or 'cg_VMS_firma' in text:
        return 'standard_zim'
    if 'Arbeitspaket_Nr_techn' in text and 'Arbeitspaket_Nr' in text:
        return 'durchfuehrbarkeitsstudie_legacy'
    if 'Arbeitspaket_Nr' in text and 'cg_VMS' not in text:
        return 'legacy_euronorm'
    if '<lfd>' in text and '<ap>' in text:
        return 'standard_zim'
    return 'unknown'

def detect_formular_info(text):
    quelle = 'Unbekannt'
    formular_typ = 'Unbekannt'
    version = ''
    stand = ''
    projekttraeger = ''
    
    if 'VDI/VDE' in text or 'VDI Technologiezentrum' in text:
        quelle = 'VDI/VDE'
        projekttraeger = 'VDI/VDE Innovation + Technik GmbH'
    elif 'EuroNorm' in text:
        quelle = 'EuroNorm'
        projekttraeger = 'EuroNorm GmbH (Legacy)'
    elif 'AiF Projekt' in text:
        quelle = 'AiF'
        projekttraeger = 'AiF Projekt GmbH'
    
    has_antrag_ds = 'Antrag_DS' in text
    has_fue_einzel = bool(re.search(r'FuE-Einzelprojekt', text))
    has_fue_koop = bool(re.search(r'FuE-Kooperationsprojekt', text))
    
    if has_antrag_ds or 'Durchfuehrbarkeitsstudie' in text or 'Durchführbarkeitsstudie' in text:
        formular_typ = 'Durchfuehrbarkeitsstudie'
    elif has_fue_einzel and not has_fue_koop:
        formular_typ = 'Einzelprojekt'
    elif has_fue_einzel and has_fue_koop:
        formular_typ = 'Kooperation (aus Netzwerk)'
    elif has_fue_koop:
        formular_typ = 'Kooperation'
    elif quelle == 'EuroNorm':
        if 'Arbeitspaket_Nr_techn' in text:
            formular_typ = 'Durchfuehrbarkeitsstudie'
        else:
            formular_typ = 'Einzelprojekt (EuroNorm)'
    
    version_match = re.search(r'Version:\\s*(\\d+\\.\\d+)\\s*Stand:\\s*(\\d{2}\\.\\d{2}\\.\\d{4})', text)
    if version_match:
        version = version_match.group(1)
        stand = version_match.group(2)
    
    return {
        'quelle': quelle,
        'formular_typ': formular_typ,
        'version': version,
        'stand': stand,
        'projekttraeger': projekttraeger
    }

def process_ap_table(nrs, names, pms, ma_nrs, von_list, bis_list, is_technical):
    ap_dict = {}
    ap_names = {}
    
    for i, nr in enumerate(nrs):
        nr = nr.strip()
        if not nr:
            continue
        name = names[i].strip() if i < len(names) else ''
        if nr and name and nr not in ap_names:
            ap_names[nr] = name
    
    for i, nr in enumerate(nrs):
        nr = nr.strip()
        if not nr:
            continue
        
        name = ap_names.get(nr, '')
        pm_str = pms[i] if i < len(pms) else ''
        ma_str = ma_nrs[i] if i < len(ma_nrs) else ''
        von = von_list[i] if i < len(von_list) else ''
        bis = bis_list[i] if i < len(bis_list) else ''
        
        pm = parse_pm(pm_str)
        ma_nr = int(float(ma_str)) if ma_str and ma_str.replace('.', '').replace(',', '').isdigit() else 0
        
        nr_parts = nr.split('.')
        ap_number = int(nr_parts[0]) if nr_parts[0].isdigit() else 0
        ap_sub = int(nr_parts[1]) if len(nr_parts) > 1 and nr_parts[1].isdigit() else None
        
        key = nr
        
        if key not in ap_dict:
            is_header = pm == 0 and not ma_str
            ap_dict[key] = {
                'ap_number': ap_number,
                'ap_sub_number': ap_sub,
                'ap_code': f'AP{nr}',
                'name': name,
                'start_date': parse_date(von),
                'end_date': parse_date(bis),
                'total_person_months': None if is_header else pm,
                'is_technical': is_technical,
                'mitarbeiter_zuordnungen': []
            }
            if ma_nr > 0:
                ap_dict[key]['mitarbeiter_zuordnungen'].append({'ma_nr': ma_nr, 'pm': pm})
        else:
            if ma_nr > 0 and pm > 0:
                ap_dict[key]['mitarbeiter_zuordnungen'].append({'ma_nr': ma_nr, 'pm': pm})
                if ap_dict[key]['total_person_months'] is not None:
                    ap_dict[key]['total_person_months'] += pm
                else:
                    ap_dict[key]['total_person_months'] = pm
            if not ap_dict[key]['start_date'] and von:
                ap_dict[key]['start_date'] = parse_date(von)
            if not ap_dict[key]['end_date'] and bis:
                ap_dict[key]['end_date'] = parse_date(bis)
    
    return ap_dict

def parse_standard_zim(text):
    projekt = {
        'name': extract_value(r'<cg_VMS_VB_Projekt[^>]*>([^<]+)', text) or extract_value(r'<thema[^>]*>([^<]+)', text),
        'kurzname': extract_value(r'<cg_VMS_VB_KurzName[^>]*>([^<]+)', text),
        'fkz': extract_value(r'<cg_VMS_AD_FKZ[^>]*>([^<]+)', text),
        'start': extract_value(r'<cg_VMS_LZ_von[^>]*>([^<]+)', text),
        'ende': extract_value(r'<cg_VMS_LZ_bis[^>]*>([^<]+)', text),
        'foerderquote': extract_float(r'<cg_VMS_AD_FS[^>]*>([^<]+)', text) or 50,
        'gesamtkosten': extract_float(r'<cg_VMS_GK_Ges[^>]*>([^<]+)', text),
        'zuwendung': extract_float(r'<cg_VMS_ZW_Ges[^>]*>([^<]+)', text),
        'gesamt_pm': 0,
        'gesamt_pk': extract_float(r'<cg_VMS_PK_Ges[^>]*>([^<]+)', text),
        'laufzeit_monate': 0
    }
    
    antragsteller = {
        'firma': extract_value(r'<cg_VMS_firma[^>]*>([^<]+)', text) or extract_value(r'<Firma[^>]*>([^<]+)', text),
        'rechtsform': extract_value(r'<cg_VMS_rechtsform[^>]*>([^<]+)', text),
        'strasse': extract_value(r'<cg_VMS_str[^>]*>([^<]+)', text),
        'plz': extract_value(r'<cg_VMS_plz[^>]*>([^<]+)', text),
        'ort': extract_value(r'<cg_VMS_ort[^>]*>([^<]+)', text),
        'bundesland': extract_value(r'<cg_VMS_land[^>]*>([^<]+)', text),
        'website': extract_value(r'<cg_VMS_www[^>]*>([^<]+)', text),
        'ansprechpartner_name': extract_value(r'<cg_VMS_AP_name[^>]*>([^<]+)', text),
        'ansprechpartner_funktion': extract_value(r'<cg_VMS_AP_funktion[^>]*>([^<]+)', text),
        'ansprechpartner_telefon': extract_value(r'<cg_VMS_AP_tel[^>]*>([^<]+)', text),
        'ansprechpartner_email': extract_value(r'<cg_VMS_AP_mail[^>]*>([^<]+)', text)
    }
    
    ap_dict = process_ap_table(
        extract_all_values('lfd', text),
        extract_all_values('ap', text),
        extract_all_values('pm', text),
        extract_all_values('ma_nr', text),
        extract_all_values('von', text),
        extract_all_values('bis', text),
        False
    )
    
    arbeitspakete = sorted(ap_dict.values(), key=lambda x: (x['ap_number'], x['ap_sub_number'] or 0))
    projekt['gesamt_pm'] = sum(ap['total_person_months'] or 0 for ap in arbeitspakete)
    
    mitarbeiter = []
    nachnamen = extract_all_values('cg_VMS_PM_aNachname', text)
    vornamen = extract_all_values('cg_VMS_PM_aVorname', text)
    qual_gruppen = extract_all_values('cg_VMS_PK_aQualGruppe', text)
    
    for i in range(max(len(nachnamen), len(vornamen))):
        nachname = nachnamen[i] if i < len(nachnamen) else ''
        vorname = vornamen[i] if i < len(vornamen) else ''
        qual = qual_gruppen[i] if i < len(qual_gruppen) else ''
        if nachname or vorname:
            mitarbeiter.append({
                'ma_nr': i + 1,
                'nachname': nachname,
                'vorname': vorname,
                'display_name': f"{nachname}, {vorname}" if nachname and vorname else (nachname or vorname),
                'qualifikation': qual
            })
    
    return {
        'projekt': projekt,
        'antragsteller': antragsteller,
        'mitarbeiter': mitarbeiter,
        'arbeitspakete': arbeitspakete,
        'format': 'standard_zim'
    }

def parse_legacy_euronorm(text, has_technical):
    projekt = {
        'name': extract_value(r'<thema[^>]*>([^<]+)', text) or extract_value(r'<Kurzbezeichnung[^>]*>([^<]+)', text),
        'kurzname': extract_value(r'<kurzfass[^>]*>([^<]+)', text),
        'fkz': extract_value(r'<Foerderkennzeichen[^>]*>([^<]+)', text),
        'start': extract_value(r'<Laufzeit_von[^>]*>([^<]+)', text),
        'ende': extract_value(r'<Laufzeit_bis[^>]*>([^<]+)', text),
        'foerderquote': extract_float(r'<Foerdersatz[^>]*>([^<]+)', text) or 50,
        'gesamtkosten': extract_float(r'<Gesamtkosten[^>]*>([^<]+)', text),
        'zuwendung': extract_float(r'<Zuwendung[^>]*>([^<]+)', text),
        'gesamt_pm': 0,
        'gesamt_pk': extract_float(r'<sum_ges_pk[^>]*>([^<]+)', text),
        'laufzeit_monate': 0
    }
    
    antragsteller = {
        'firma': extract_value(r'<Firma[^>]*>([^<]+)', text) or extract_value(r'<firma[^>]*>([^<]+)', text),
        'rechtsform': extract_value(r'<Rechtsform[^>]*>([^<]+)', text),
        'strasse': extract_value(r'<str[^>]*>([^<]+)', text),
        'plz': extract_value(r'<plz[^>]*>([^<]+)', text),
        'ort': extract_value(r'<ort[^>]*>([^<]+)', text),
        'bundesland': extract_value(r'<ddl_land[^>]*>([^<]+)', text),
        'website': extract_value(r'<www[^>]*>([^<]+)', text),
        'ansprechpartner_name': '',
        'ansprechpartner_funktion': '',
        'ansprechpartner_telefon': extract_value(r'<tel_ap[^>]*>([^<]+)', text),
        'ansprechpartner_email': extract_value(r'<mail_ap[^>]*>([^<]+)', text)
    }
    
    if not antragsteller['firma'] and antragsteller['website']:
        domain = antragsteller['website'].replace('www.', '').split('.')[0]
        antragsteller['firma'] = domain.capitalize() + ' GmbH'
    
    ap_dict_a = process_ap_table(
        extract_all_values('Arbeitspaket_Nr', text),
        extract_all_values('Arbeitspaket', text),
        extract_all_values('pm', text),
        extract_all_values('MA_Nr', text),
        extract_all_values('von', text),
        extract_all_values('bis', text),
        False
    )
    
    ap_dict_b = {}
    if has_technical:
        ap_dict_b = process_ap_table(
            extract_all_values('Arbeitspaket_Nr_techn', text),
            extract_all_values('Arbeitspaket_techn', text),
            extract_all_values('pm_techn', text),
            extract_all_values('MA_Nr_techn', text),
            extract_all_values('RealisierungVON', text),
            extract_all_values('RealisierungBIS', text),
            True
        )
    
    all_aps = {**ap_dict_a, **ap_dict_b}
    arbeitspakete = sorted(all_aps.values(), key=lambda x: (x['ap_number'], x['ap_sub_number'] or 0))
    projekt['gesamt_pm'] = sum(ap['total_person_months'] or 0 for ap in arbeitspakete)
    
    return {
        'projekt': projekt,
        'antragsteller': antragsteller,
        'mitarbeiter': [],
        'arbeitspakete': arbeitspakete,
        'format': 'durchfuehrbarkeitsstudie_legacy' if has_technical else 'legacy_euronorm'
    }

def main():
    if len(sys.argv) < 2:
        print(json.dumps({'success': False, 'error': 'Keine PDF-Datei angegeben'}))
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    
    try:
        reader = PdfReader(pdf_path)
        root = reader.trailer['/Root'].get_object()
        
        if '/AcroForm' not in root:
            print(json.dumps({'success': False, 'error': 'Keine Formulardaten gefunden'}))
            sys.exit(1)
        
        acro = root['/AcroForm'].get_object()
        
        if '/XFA' not in acro:
            print(json.dumps({'success': False, 'error': 'Keine XFA-Formulardaten gefunden. Ist dies ein ausgefuellter ZIM-Antrag?'}))
            sys.exit(1)
        
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
        
        if len(xfa_text) < 500:
            print(json.dumps({'success': False, 'error': 'Keine XFA-Formulardaten gefunden. Ist dies ein ausgefuellter ZIM-Antrag?'}))
            sys.exit(1)
        
        formular_info = detect_formular_info(xfa_text)
        format_type = detect_format(xfa_text)
        
        if format_type == 'standard_zim':
            result = parse_standard_zim(xfa_text)
        elif format_type == 'durchfuehrbarkeitsstudie_legacy':
            result = parse_legacy_euronorm(xfa_text, True)
        elif format_type == 'legacy_euronorm':
            result = parse_legacy_euronorm(xfa_text, False)
        else:
            result = parse_standard_zim(xfa_text)
        
        result['formular_info'] = formular_info
        result['format_erkannt'] = format_type
        
        result['statistik'] = {
            'anzahl_arbeitspakete': len(result['arbeitspakete']),
            'anzahl_echte_aps': len([ap for ap in result['arbeitspakete'] if ap['total_person_months'] is not None]),
            'anzahl_ueberschriften': len([ap for ap in result['arbeitspakete'] if ap['total_person_months'] is None]),
            'anzahl_technisch': len([ap for ap in result['arbeitspakete'] if ap['is_technical']]),
            'anzahl_nicht_technisch': len([ap for ap in result['arbeitspakete'] if not ap['is_technical'] and ap['total_person_months'] is not None]),
            'gesamt_pm': result['projekt']['gesamt_pm'],
            'anzahl_mitarbeiter': len(result['mitarbeiter'])
        }
        
        print(json.dumps({'success': True, 'data': result}))
        
    except Exception as e:
        print(json.dumps({'success': False, 'error': str(e)}))
        sys.exit(1)

if __name__ == '__main__':
    main()
`

// ============================================================================
// API HANDLER
// ============================================================================

async function runPythonParser(pdfPath: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const scriptPath = join(tmpdir(), `zim-parser-${randomUUID()}.py`)
    
    writeFile(scriptPath, PYTHON_PARSER)
      .then(() => {
        const python = spawn('python3', [scriptPath, pdfPath])
        
        let stdout = ''
        let stderr = ''
        
        python.stdout.on('data', (data) => {
          stdout += data.toString()
        })
        
        python.stderr.on('data', (data) => {
          stderr += data.toString()
        })
        
        python.on('close', async (code) => {
          try {
            await unlink(scriptPath)
          } catch {}
          
          if (code !== 0) {
            console.error('[Python] stderr:', stderr)
            reject(new Error(stderr || 'Python-Parser fehlgeschlagen'))
            return
          }
          
          try {
            const result = JSON.parse(stdout)
            resolve(result)
          } catch (e) {
            reject(new Error('Ungueltige JSON-Ausgabe vom Parser'))
          }
        })
        
        python.on('error', (err) => {
          reject(new Error(`Python konnte nicht gestartet werden: ${err.message}`))
        })
      })
      .catch(reject)
  })
}

export async function POST(request: NextRequest) {
  let tempPdfPath: string | null = null
  
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'Keine Datei hochgeladen' },
        { status: 400 }
      )
    }
    
    console.log(`[API] Datei erhalten: ${file.name}, Groesse: ${file.size}`)
    
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    tempPdfPath = join(tmpdir(), `zim-upload-${randomUUID()}.pdf`)
    await writeFile(tempPdfPath, buffer)
    
    const result = await runPythonParser(tempPdfPath)
    
    if (!result.success) {
      return NextResponse.json(result, { status: 400 })
    }
    
    console.log(`[API] Erfolgreich geparst: ${result.data?.projekt?.name || 'Unbenannt'}`)
    
    return NextResponse.json(result)
    
  } catch (error: any) {
    console.error('[API] Fehler:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Unbekannter Fehler beim Parsen' },
      { status: 500 }
    )
  } finally {
    if (tempPdfPath) {
      try {
        await unlink(tempPdfPath)
      } catch {}
    }
  }
}

export async function GET() {
  return NextResponse.json({
    name: 'ZIM PDF Parser API',
    version: '7.3.82',
    engine: 'Python + pypdf',
    supported_formats: [
      'VDI/VDE Einzelprojekt (2025)',
      'VDI/VDE Kooperation aus Netzwerk (2025)',  
      'VDI/VDE Durchfuehrbarkeitsstudie (2025)',
      'VDI/VDE Netzwerk Phase 1+2 (2025)',
      'AiF Kooperation',
      'EuroNorm Einzelprojekt (Legacy)',
      'EuroNorm Durchfuehrbarkeitsstudie (Legacy)'
    ]
  })
}
