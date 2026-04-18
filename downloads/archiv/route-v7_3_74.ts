// src/app/api/parse-zim/route.ts
// ============================================================================
// PZE V7 - ZIM PDF Parser (mit pdf-parse)
// ============================================================================
// Version: 7.3.64
// Datum: 22. Januar 2026
//
// UnterstÃ¼tzt:
// - ZIM Einzelprojekt-AntrÃ¤ge
// - ZIM Kooperationsprojekt-AntrÃ¤ge  
// - ZIM DurchfÃ¼hrbarkeitsstudien (Antrag_DS)
//
// Verwendet pdf-parse fÃ¼r robuste PDF-Extraktion
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
// @ts-ignore
import pdf from 'pdf-parse'

// ============================================================================
// TYPES
// ============================================================================

interface ZimProjekt {
  name: string
  kurzname: string
  fkz: string
  start: string
  ende: string
  foerderquote: number
  gesamtkosten: number
  zuwendung: number
  gesamt_pm: number
  gesamt_pk: number
  laufzeit_monate: number
}

interface ZimAntragsteller {
  firma: string
  rechtsform: string
  strasse: string
  plz: string
  ort: string
  bundesland: string
  website: string
  ansprechpartner_name: string
  ansprechpartner_funktion: string
  ansprechpartner_telefon: string
  ansprechpartner_email: string
}

interface ZimArbeitspaket {
  ap_nummer: number
  ap_sub_nummer: number | null
  ap_code: string
  name: string
  start_monat: number | null
  ende_monat: number | null
  gesamt_pm: number
  mitarbeiter_zuordnungen: Array<{
    ma_nr: number
    pm: number
  }>
}

// ============================================================================
// HELPER: XFA-Daten aus PDF-Buffer extrahieren
// ============================================================================

async function extractXfaData(buffer: Buffer): Promise<string> {
  // Methode 1: Suche nach XFA-Streams direkt im Buffer
  const pdfString = buffer.toString('binary')
  
  // Suche nach dem datasets-Stream (enthÃ¤lt die Formulardaten)
  // XFA-Daten sind zwischen <xfa:datasets und </xfa:datasets>
  
  // Versuche zlib-komprimierte Streams zu finden und zu dekomprimieren
  const zlib = require('zlib')
  let allDecompressed = ''
  
  // Finde alle stream...endstream BlÃ¶cke
  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g
  let match
  
  while ((match = streamRegex.exec(pdfString)) !== null) {
    const streamContent = match[1]
    const streamBuffer = Buffer.from(streamContent, 'binary')
    
    try {
      // Versuche FlateDecode (zlib) Dekomprimierung
      const decompressed = zlib.inflateSync(streamBuffer)
      const text = decompressed.toString('utf-8')
      
      // PrÃ¼fe ob es relevante XFA/XML-Daten enthÃ¤lt
      if (text.includes('<xfa:') || text.includes('Antrag') || 
          text.includes('thema>') || text.includes('cg_VMS') ||
          text.includes('Arbeitspaket') || text.includes('kurzfass')) {
        allDecompressed += text + '\n'
      }
    } catch (e) {
      // Stream ist nicht zlib-komprimiert oder hat anderes Format
      // PrÃ¼fe ob es unkomprimierte XML-Daten sind
      if (streamContent.includes('<xfa:') || streamContent.includes('Antrag')) {
        allDecompressed += streamContent + '\n'
      }
    }
  }
  
  return allDecompressed
}

// ============================================================================
// HELPER: Wert aus XML extrahieren
// ============================================================================

function extractValue(text: string, ...patterns: (RegExp | string)[]): string {
  for (const pattern of patterns) {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern
    const match = regex.exec(text)
    if (match && match[1]) {
      return match[1].trim()
    }
  }
  return ''
}

function extractFloat(text: string, ...patterns: (RegExp | string)[]): number {
  const value = extractValue(text, ...patterns)
  if (!value) return 0
  
  let cleaned = value
  // Deutsche Zahlenformat-Konvertierung
  if (cleaned.includes(',') && cleaned.includes('.')) {
    if (cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')) {
      cleaned = cleaned.replace(/\./g, '').replace(',', '.')
    } else {
      cleaned = cleaned.replace(/,/g, '')
    }
  } else if (cleaned.includes(',')) {
    cleaned = cleaned.replace(',', '.')
  }
  
  return parseFloat(cleaned) || 0
}

function extractAllMatches(text: string, pattern: RegExp): string[] {
  const results: string[] = []
  let match
  const regex = new RegExp(pattern.source, 'g')
  while ((match = regex.exec(text)) !== null) {
    if (match[1]) results.push(match[1].trim())
  }
  return results
}

// ============================================================================
// HELPER: Deutsches Datum (TT.MM.JJJJ) in ISO-Format (JJJJ-MM-TT) konvertieren
// ============================================================================

function convertGermanDate(dateStr: string): string {
  if (!dateStr) return ''
  
  // Bereits im ISO-Format?
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr
  }
  
  // Deutsches Format: TT.MM.JJJJ oder T.M.JJJJ
  const germanMatch = dateStr.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
  if (germanMatch) {
    const day = germanMatch[1].padStart(2, '0')
    const month = germanMatch[2].padStart(2, '0')
    const year = germanMatch[3]
    return `${year}-${month}-${day}`
  }
  
  // Alternatives Format: TT.MM.JJ
  const shortYearMatch = dateStr.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2})$/)
  if (shortYearMatch) {
    const day = shortYearMatch[1].padStart(2, '0')
    const month = shortYearMatch[2].padStart(2, '0')
    const year = parseInt(shortYearMatch[3]) > 50 ? `19${shortYearMatch[3]}` : `20${shortYearMatch[3]}`
    return `${year}-${month}-${day}`
  }
  
  console.warn('Unbekanntes Datumsformat:', dateStr)
  return dateStr // Originalwert zurueckgeben wenn nicht erkannt
}

// ============================================================================
// PARSER: DurchfÃ¼hrbarkeitsstudie + Standard ZIM
// ============================================================================

function parseZimData(text: string): any {
  // ZeilenumbrÃ¼che normalisieren
  const normalized = text.replace(/\n>/g, '>').replace(/>\n/g, '>').replace(/\r/g, '')
  
  console.log('Text-LÃ¤nge fÃ¼r Parsing:', normalized.length)
  
  // Format erkennen
  const isDurchfuehrbarkeitsstudie = normalized.includes('Antrag_DS') || 
                                      normalized.includes('<thema>') ||
                                      normalized.includes('DurchfÃ¼hrbarkeitsstudie')
  const isStandardZim = normalized.includes('cg_VMS_') || normalized.includes('cg_case_')
  
  console.log('Format erkannt - DS:', isDurchfuehrbarkeitsstudie, 'Standard:', isStandardZim)
  
  // Projekt-Daten extrahieren
  let projekt: ZimProjekt = {
    name: '',
    kurzname: '',
    fkz: '',
    start: '',
    ende: '',
    foerderquote: 0,
    gesamtkosten: 0,
    zuwendung: 0,
    gesamt_pm: 0,
    gesamt_pk: 0,
    laufzeit_monate: 0,
  }
  
  if (isDurchfuehrbarkeitsstudie) {
    projekt.name = extractValue(normalized, /<thema>([^<]+)</)
    // NICHT kurzfass verwenden - das ist die Projektbeschreibung!
    // Kurzname aus Projekttitel extrahieren (Teil vor dem Doppelpunkt)
    if (projekt.name && projekt.name.includes(':')) {
      projekt.kurzname = projekt.name.split(':')[0].trim()
    } else if (projekt.name && projekt.name.includes(' - ')) {
      projekt.kurzname = projekt.name.split(' - ')[0].trim()
    }
    projekt.foerderquote = 50 // DS hat feste 50%
    
    // Laufzeit fuer DS-Format
    const rawStartDS = extractValue(normalized, /<start>([^<]+)</)
    const rawEndeDS = extractValue(normalized, /<ende>([^<]+)</)
    projekt.start = convertGermanDate(rawStartDS)
    projekt.ende = convertGermanDate(rawEndeDS)
  }
  
  if (isStandardZim || !projekt.name) {
    projekt.name = projekt.name || extractValue(normalized, 
      /<cg_VMS_VB_Projekt>([^<]+)</,
      /<Projekt>([^<]+)</,
      /<projektname>([^<]+)</i
    )
    projekt.kurzname = projekt.kurzname || extractValue(normalized,
      /<cg_VMS_VB_KurzName>([^<]+)</,
      /<KurzName>([^<]+)</,
      /<kurzname>([^<]+)</i
    )
    projekt.fkz = extractValue(normalized,
      /<cg_case_KENN_2>([^<]+)</,
      /<FKZ>([^<]+)</,
      /<fkz>([^<]+)</i
    )
    // Datumsfelder extrahieren und deutsches Format konvertieren
    const rawStart = extractValue(normalized,
      /<cg_VMS_VB_Beginn>([^<]+)</,
      /<Beginn>([^<]+)</,
      /<start>([^<]+)</i
    )
    projekt.start = convertGermanDate(rawStart)
    
    const rawEnde = extractValue(normalized,
      /<cg_VMS_VB_Ende>([^<]+)</,
      /<Ende>([^<]+)</,
      /<ende>([^<]+)</i
    )
    projekt.ende = convertGermanDate(rawEnde)
    
    projekt.foerderquote = projekt.foerderquote || extractFloat(normalized,
      /<cg_VMS_AD_F[oÃ¶]rderquote>([^<]+)</,
      /<Foerderquote>([^<]+)</
    )
    projekt.gesamtkosten = extractFloat(normalized,
      /<cg_VMS_HB_A_Kosten>([^<]+)</,
      /<Gesamtkosten>([^<]+)</
    )
    projekt.zuwendung = extractFloat(normalized,
      /<cg_VMS_HB_A_ZuwendungFQ>([^<]+)</,
      /<Zuwendung>([^<]+)</
    )
    projekt.gesamt_pm = extractFloat(normalized,
      /<sum_ges_pm>([^<]+)</,
      /<gesamt_pm>([^<]+)</
    )
    projekt.gesamt_pk = extractFloat(normalized,
      /<sum_ges_pk>([^<]+)</,
      /<gesamt_pk>([^<]+)</
    )
  }
  
  // Antragsteller
  const antragsteller: ZimAntragsteller = {
    firma: extractValue(normalized,
      /<firma>([^<]+)</i,
      /<Firma>([^<]+)</,
      /<cg_VMS_VB_Firma>([^<]+)</
    ),
    rechtsform: extractValue(normalized, /<Rechtsform>([^<]+)</),
    strasse: extractValue(normalized, /<str>([^<]+)</, /<Strasse>([^<]+)</),
    plz: extractValue(normalized, /<plz>([^<]+)</, /<PLZ>([^<]+)</),
    ort: extractValue(normalized, /<ort>([^<]+)</, /<Ort>([^<]+)</, /<pfach_ort>([^<]+)</),
    bundesland: extractValue(normalized, /<ddl_land>([^<]+)</, /<Bundesland>([^<]+)</),
    website: extractValue(normalized, /<www>([^<]+)</, /<Website>([^<]+)</),
    ansprechpartner_name: extractValue(normalized, /<name_ap>([^<]+)</, /<AnsprechpartnerName>([^<]+)</),
    ansprechpartner_funktion: extractValue(normalized, /<funktion_ap>([^<]+)</),
    ansprechpartner_telefon: extractValue(normalized, /<tel_ap>([^<]+)</, /<tel_gf>([^<]+)</),
    ansprechpartner_email: extractValue(normalized, /<mail_ap>([^<]+)</, /<mail_gf>([^<]+)</),
  }
  
  // Firma aus Website oder Email ableiten falls nicht gefunden
  if (!antragsteller.firma && antragsteller.website) {
    const domain = antragsteller.website.replace(/^www\./, '').split('.')[0]
    antragsteller.firma = domain.charAt(0).toUpperCase() + domain.slice(1) + ' GmbH'
  }
  if (!antragsteller.firma && antragsteller.ansprechpartner_email) {
    const domain = antragsteller.ansprechpartner_email.split('@')[1]?.split('.')[0]
    if (domain) {
      antragsteller.firma = domain.charAt(0).toUpperCase() + domain.slice(1) + ' GmbH'
    }
  }
  
  // Arbeitspakete extrahieren
  const arbeitspakete: ZimArbeitspaket[] = []
  
  // Muster 1: DurchfÃ¼hrbarkeitsstudie Format
  const apNrList = extractAllMatches(normalized, /<Arbeitspaket_Nr>([^<]+)</)
  const apNameList = extractAllMatches(normalized, /<Arbeitspaket>([^<]+)</)
  const apPmList = extractAllMatches(normalized, /<pm>([^<]+)</)
  
  console.log('APs gefunden (Muster 1):', apNrList.length, apNameList.length, apPmList.length)
  
  for (let i = 0; i < Math.max(apNrList.length, apNameList.length); i++) {
    const apNrStr = apNrList[i] || String(i + 1)
    const apName = apNameList[i] || ''
    const pmStr = apPmList[i] || '0'
    
    if (apName && apName.length > 2) {
      let ap_nummer = 0
      let ap_sub_nummer: number | null = null
      
      if (apNrStr.includes('.')) {
        const parts = apNrStr.split('.')
        ap_nummer = parseInt(parts[0]) || 0
        ap_sub_nummer = parseInt(parts[1]) || null
      } else {
        ap_nummer = parseInt(apNrStr) || (i + 1)
      }
      
      const pm = parseFloat(pmStr.replace(',', '.')) || 0
      
      arbeitspakete.push({
        ap_nummer,
        ap_sub_nummer,
        ap_code: `AP${apNrStr}`,
        name: apName,
        start_monat: null,
        ende_monat: null,
        gesamt_pm: pm,
        mitarbeiter_zuordnungen: []
      })
      
      projekt.gesamt_pm += pm
    }
  }
  
  // Muster 2: Technische APs (DS-Format)
  const apNrTechList = extractAllMatches(normalized, /<Arbeitspaket_Nr_techn>([^<]+)</)
  const apNameTechList = extractAllMatches(normalized, /<Arbeitspaket_techn>([^<]+)</)
  const apPmTechList = extractAllMatches(normalized, /<pm_techn>([^<]+)</)
  
  console.log('Techn. APs gefunden:', apNrTechList.length, apNameTechList.length)
  
  for (let i = 0; i < Math.max(apNrTechList.length, apNameTechList.length); i++) {
    const apNrStr = apNrTechList[i] || ''
    const apName = apNameTechList[i] || ''
    const pmStr = apPmTechList[i] || '0'
    
    if (apName && apName.length > 2 && apNrStr) {
      let ap_nummer = 0
      let ap_sub_nummer: number | null = null
      
      const cleanNr = apNrStr.replace(/\.$/, '') // Trailing dot entfernen
      if (cleanNr.includes('.')) {
        const parts = cleanNr.split('.')
        ap_nummer = parseInt(parts[0]) || 0
        ap_sub_nummer = parseInt(parts[1]) || null
      } else {
        ap_nummer = parseInt(cleanNr) || 0
      }
      
      // PrÃ¼fe ob AP schon existiert
      const exists = arbeitspakete.some(ap => 
        ap.ap_nummer === ap_nummer && ap.ap_sub_nummer === ap_sub_nummer
      )
      
      if (!exists && ap_nummer > 0) {
        const pm = parseFloat(pmStr.replace(',', '.')) || 0
        
        arbeitspakete.push({
          ap_nummer,
          ap_sub_nummer,
          ap_code: `AP${cleanNr}`,
          name: apName,
          start_monat: null,
          ende_monat: null,
          gesamt_pm: pm,
          mitarbeiter_zuordnungen: []
        })
        
        projekt.gesamt_pm += pm
      }
    }
  }
  
  // Muster 3: Standard ZIM Format (ap_xxx)
  const apMatches = normalized.matchAll(/<ap[_]?(\d+)[_]?name>([^<]+)</gi)
  for (const match of apMatches) {
    const apNr = parseInt(match[1]) || 0
    const apName = match[2]
    
    if (apName && !arbeitspakete.some(ap => ap.ap_nummer === apNr)) {
      arbeitspakete.push({
        ap_nummer: apNr,
        ap_sub_nummer: null,
        ap_code: `AP${apNr}`,
        name: apName,
        start_monat: null,
        ende_monat: null,
        gesamt_pm: 0,
        mitarbeiter_zuordnungen: []
      })
    }
  }
  
  // Sortieren
  arbeitspakete.sort((a, b) => {
    if (a.ap_nummer !== b.ap_nummer) return a.ap_nummer - b.ap_nummer
    return (a.ap_sub_nummer || 0) - (b.ap_sub_nummer || 0)
  })
  
  console.log('Gesamt APs:', arbeitspakete.length)
  
  return {
    projekt,
    antragsteller,
    arbeitspakete,
    mitarbeiter: [],
    format: isDurchfuehrbarkeitsstudie ? 'durchfuehrbarkeitsstudie' : 
            isStandardZim ? 'standard_zim' : 'unbekannt'
  }
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'Keine Datei hochgeladen' },
        { status: 400 }
      )
    }

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json(
        { success: false, error: 'Datei muss eine PDF sein' },
        { status: 400 }
      )
    }

    console.log('=== ZIM Parser v7.3.64 ===')
    console.log('Datei:', file.name, 'GrÃ¶ÃŸe:', file.size)

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // XFA-Daten extrahieren
    console.log('Extrahiere XFA-Daten...')
    const xfaText = await extractXfaData(buffer)
    
    console.log('Extrahierte XFA-Daten:', xfaText.length, 'Zeichen')
    
    if (!xfaText || xfaText.length < 100) {
      // Debug: Zeige was im PDF ist
      console.log('Keine XFA-Daten gefunden. PDF-Analyse:')
      const pdfString = buffer.toString('binary')
      console.log('PDF enthÃ¤lt "xfa:":', pdfString.includes('xfa:'))
      console.log('PDF enthÃ¤lt "Antrag":', pdfString.includes('Antrag'))
      console.log('PDF enthÃ¤lt "stream":', (pdfString.match(/stream/g) || []).length, 'Streams')
      
      return NextResponse.json(
        { success: false, error: 'Keine XFA-Formulardaten gefunden. Ist dies ein ausgefuellter ZIM-Antrag?' },
        { status: 400 }
      )
    }
    
    // Parsen
    console.log('Parse Daten...')
    const result = parseZimData(xfaText)
    
    const { projekt, antragsteller, arbeitspakete, mitarbeiter, format } = result
    
    // Validierung
    if (!projekt.name && !projekt.kurzname && !antragsteller.firma) {
      console.log('Keine Projektdaten gefunden')
      console.log('Projekt:', JSON.stringify(projekt))
      console.log('Antragsteller:', JSON.stringify(antragsteller))
      
      return NextResponse.json(
        { success: false, error: 'Konnte keine Projektdaten extrahieren. Bitte pruefen Sie das PDF-Format.' },
        { status: 400 }
      )
    }

    console.log('Erfolgreich geparst!')
    console.log('Projekt:', projekt.name || projekt.kurzname)
    console.log('APs:', arbeitspakete.length)

    // Response
    return NextResponse.json({
      success: true,
      projekt,
      antragsteller,
      budget: {
        gesamtkosten: projekt.gesamtkosten,
        personalkosten: projekt.gesamt_pk,
        foerderquote: projekt.foerderquote,
        foerdersumme: projekt.zuwendung,
        gesamt_pm: projekt.gesamt_pm,
        laufzeit_monate: projekt.laufzeit_monate,
      },
      mitarbeiter,
      arbeitspakete,
      parse_datum: new Date().toISOString(),
      quell_datei: file.name,
      format_erkannt: format,
      statistik: {
        anzahl_mitarbeiter: mitarbeiter.length,
        anzahl_arbeitspakete: arbeitspakete.length,
        gesamt_pm: projekt.gesamt_pm,
        gesamt_pk: projekt.gesamt_pk,
        laufzeit_monate: projekt.laufzeit_monate,
      }
    })

  } catch (error) {
    console.error('Parse error:', error)
    return NextResponse.json(
      { success: false, error: `Parsing fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}` },
      { status: 500 }
    )
  }
}
