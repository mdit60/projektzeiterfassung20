// src/app/api/parse-zim/route.ts
// ============================================================================
// PZE V7 - ZIM PDF Parser API
// ============================================================================
// Version: 7.3.82
// Datum: 23. Januar 2026
//
// Diese Route ruft den externen Python-Parser (parse-zim-pdf-v4_8.py) auf.
// Der Parser muss unter src/lib/parse-zim-pdf-v4_8.py liegen.
//
// Fuer lokale Entwicklung: Python + pypdf muessen installiert sein
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import { writeFile, unlink, readFile } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomUUID } from 'crypto'
import { existsSync } from 'fs'

// ============================================================================
// PARSER PFADE
// ============================================================================

// Mögliche Pfade zum Python-Parser
const PARSER_PATHS = [
  join(process.cwd(), 'src', 'lib', 'parse-zim-pdf-v4_9.py'),
  join(process.cwd(), 'src', 'lib', 'parse-zim-pdf-v4_8.py'),
  join(process.cwd(), 'parse-zim-pdf-v4_9.py'),
  join(process.cwd(), 'parse-zim-pdf-v4_8.py'),
  join(process.cwd(), 'src', 'lib', 'zim-parser.py'),
]

function findParserPath(): string | null {
  for (const path of PARSER_PATHS) {
    if (existsSync(path)) {
      return path
    }
  }
  return null
}

// ============================================================================
// API HANDLER
// ============================================================================

async function runPythonParser(parserPath: string, pdfPath: string): Promise<any> {
  return new Promise((resolve, reject) => {
    // Rufe Python-Parser auf und sage ihm, dass er JSON nach stdout ausgeben soll
    const python = spawn('python3', [parserPath, pdfPath, '--json'])
    
    let stdout = ''
    let stderr = ''
    
    python.stdout.on('data', (data) => {
      stdout += data.toString()
    })
    
    python.stderr.on('data', (data) => {
      stderr += data.toString()
    })
    
    python.on('close', async (code) => {
      if (code !== 0 && !stdout.includes('"success"')) {
        console.error('[Python] stderr:', stderr)
        console.error('[Python] stdout:', stdout)
        reject(new Error(stderr || 'Python-Parser fehlgeschlagen'))
        return
      }
      
      // Suche nach JSON-Output (beginnt mit { und endet mit })
      const jsonStart = stdout.indexOf('{')
      const jsonEnd = stdout.lastIndexOf('}')
      
      if (jsonStart === -1 || jsonEnd === -1) {
        // Kein JSON gefunden, versuche die generierte JSON-Datei zu lesen
        const jsonPath = pdfPath.replace('.pdf', '.json')
        try {
          const jsonContent = await readFile(jsonPath, 'utf-8')
          const result = JSON.parse(jsonContent)
          // Lösche die JSON-Datei
          await unlink(jsonPath).catch(() => {})
          resolve({ success: true, data: result })
        } catch (e) {
          reject(new Error('Konnte Parser-Ausgabe nicht lesen'))
        }
        return
      }
      
      try {
        const jsonStr = stdout.substring(jsonStart, jsonEnd + 1)
        const result = JSON.parse(jsonStr)
        resolve(result)
      } catch (e) {
        // Fallback: Versuche JSON-Datei zu lesen
        const jsonPath = pdfPath.replace('.pdf', '.json')
        try {
          const jsonContent = await readFile(jsonPath, 'utf-8')
          const result = JSON.parse(jsonContent)
          await unlink(jsonPath).catch(() => {})
          resolve({ success: true, data: result })
        } catch (e2) {
          reject(new Error('Ungueltige JSON-Ausgabe vom Parser'))
        }
      }
    })
    
    python.on('error', (err) => {
      reject(new Error(`Python konnte nicht gestartet werden: ${err.message}`))
    })
  })
}

export async function POST(request: NextRequest) {
  let tempPdfPath: string | null = null
  
  try {
    // Finde Parser
    const parserPath = findParserPath()
    if (!parserPath) {
      console.error('[API] Parser nicht gefunden. Gepruefte Pfade:', PARSER_PATHS)
      return NextResponse.json(
        { success: false, error: 'Parser nicht gefunden. Bitte parse-zim-pdf-v4_8.py in src/lib/ ablegen.' },
        { status: 500 }
      )
    }
    
    console.log(`[API] Parser gefunden: ${parserPath}`)
    
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'Keine Datei hochgeladen' },
        { status: 400 }
      )
    }
    
    console.log(`[API] Datei erhalten: ${file.name}, Groesse: ${file.size}`)
    
    // PDF in temp Datei speichern
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    tempPdfPath = join(tmpdir(), `zim-upload-${randomUUID()}.pdf`)
    await writeFile(tempPdfPath, buffer)
    
    // Python-Parser aufrufen
    const result = await runPythonParser(parserPath, tempPdfPath)
    
    // Der Parser gibt die Daten direkt zurück (nicht in einem { success, data } wrapper)
    // Prüfe ob wir gültige Daten haben
    const data = result.data || result  // result.data falls von Datei gelesen, sonst result direkt
    
    if (!data || !data.projekt) {
      return NextResponse.json(
        { success: false, error: 'Parser hat keine gültigen Daten zurückgegeben' },
        { status: 400 }
      )
    }
    
    console.log(`[API] Erfolgreich geparst: ${data.projekt?.name || 'Unbenannt'}`)
    
    // Transformiere das Parser-Format in das Frontend-Format
    // Das Frontend erwartet: { projekt: {...}, arbeitspakete: [...], ... }
    return NextResponse.json({
      projekt: {
        name: data.projekt?.name || data.projekt?.thema || '',
        kurzname: data.projekt?.kurzname || data.projekt?.kurzfass || '',
        fkz: data.projekt?.fkz || data.projekt?.foerderkennzeichen || '',
        start: data.projekt?.start || data.projekt?.laufzeit_von || '',
        ende: data.projekt?.ende || data.projekt?.laufzeit_bis || '',
        foerderquote: data.projekt?.foerderquote || 50,
        gesamtkosten: data.projekt?.gesamtkosten || 0,
        zuwendung: data.projekt?.zuwendung || 0,
        gesamt_pm: data.projekt?.gesamt_pm || data.statistik?.gesamt_pm || 0,
        gesamt_pk: data.projekt?.gesamt_pk || 0,
        laufzeit_monate: data.projekt?.laufzeit_monate || 0
      },
      antragsteller: {
        firma: data.antragsteller?.firma || data.antragsteller?.name || '',
        rechtsform: data.antragsteller?.rechtsform || '',
        strasse: data.antragsteller?.strasse || data.antragsteller?.str || '',
        plz: data.antragsteller?.plz || '',
        ort: data.antragsteller?.ort || '',
        bundesland: data.antragsteller?.bundesland || data.antragsteller?.ddl_land || '',
        website: data.antragsteller?.website || data.antragsteller?.www || '',
        ansprechpartner_name: data.antragsteller?.ansprechpartner_name || '',
        ansprechpartner_funktion: data.antragsteller?.ansprechpartner_funktion || '',
        ansprechpartner_telefon: data.antragsteller?.ansprechpartner_telefon || data.antragsteller?.tel_ap || '',
        ansprechpartner_email: data.antragsteller?.ansprechpartner_email || data.antragsteller?.mail_ap || ''
      },
      mitarbeiter: (data.mitarbeiter || []).map((ma: any) => ({
        ma_nr: ma.ma_nr || 0,
        nachname: ma.nachname || '',
        vorname: ma.vorname || '',
        qualifikation: ma.qualifikation || '',
        stundensatz: ma.stundensatz || 0,
        wochenstunden: ma.wochenstunden || ma.weekly_hours || 40,
        pm_gesamt: ma.pm_gesamt || 0
      })),
      arbeitspakete: (data.arbeitspakete || []).map((ap: any) => ({
        ap_nummer: ap.ap_number || ap.ap_nr || 0,
        ap_code: ap.ap_code || `AP${ap.ap_number || ap.ap_nr}`,
        name: ap.name || ap.bezeichnung || '',
        start_monat: ap.start_monat || null,
        ende_monat: ap.ende_monat || null,
        gesamt_pm: ap.total_person_months ?? ap.gesamt_pm ?? 0,
        mitarbeiter_zuordnungen: (ap.mitarbeiter_zuordnungen || ap.zuordnungen || []).map((z: any) => ({
          ma_nr: z.ma_nr || 0,
          pm: z.pm || 0
        }))
      })),
      formular_info: data.formular_info || {},
      format_erkannt: data.format_erkannt || data.format || 'unknown',
      statistik: data.statistik || {
        anzahl_arbeitspakete: (data.arbeitspakete || []).length,
        gesamt_pm: data.projekt?.gesamt_pm || 0,
        anzahl_mitarbeiter: (data.mitarbeiter || []).length
      }
    })
    
  } catch (error: any) {
    console.error('[API] Fehler:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Unbekannter Fehler beim Parsen' },
      { status: 500 }
    )
  } finally {
    // Cleanup temp PDF
    if (tempPdfPath) {
      try {
        await unlink(tempPdfPath)
      } catch {}
    }
  }
}

export async function GET() {
  const parserPath = findParserPath()
  
  return NextResponse.json({
    name: 'ZIM PDF Parser API',
    version: '7.3.82',
    engine: 'Python + pypdf (extern)',
    parser_found: parserPath !== null,
    parser_path: parserPath,
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
