// src/app/api/parse-zim/route.ts
// ============================================================================
// PZE V7 - ZIM PDF Parser (XFA-basiert)
// ============================================================================
// Version: 7.3.63
// Datum: 22. Januar 2026
//
// Unterstützt:
// - ZIM Einzelprojekt-Anträge
// - ZIM Kooperationsprojekt-Anträge  
// - ZIM Durchführbarkeitsstudien (Antrag_DS)
//
// Funktionsweise:
// 1. PDF hochladen
// 2. XFA-Streams extrahieren (mit zlib Dekomprimierung)
// 3. datasets-Stream finden und parsen
// 4. Daten in strukturiertes JSON umwandeln
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { inflateSync } from 'zlib'

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

interface ZimMitarbeiter {
  ma_nr: number
  nachname: string
  vorname: string
  qualifikation: string
  qualifikation_gruppe: number
  geburtsdatum: string
  funktion: string
  angestellt_seit: string
  jahresbrutto: number
  stundensatz: number
  wochenstunden: number
  teilzeitfaktor: number
  pm_gesamt: number
  kosten_gesamt: number
  pm_pro_jahr: Record<number, number>
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

interface ZimBudget {
  gesamtkosten: number
  personalkosten: number
  foerderquote: number
  foerdersumme: number
  laufzeit_monate: number
  gesamt_pm: number
}

// ============================================================================
// HELPER: XFA aus PDF extrahieren
// ============================================================================

function extractXfaStreams(buffer: Buffer): Map<string, string> {
  const streams = new Map<string, string>()
  const pdfString = buffer.toString('binary')
  
  // Finde alle komprimierten Streams
  const streamRegex = /stream[\r\n]+/g
  let match
  const streamPositions: number[] = []
  
  while ((match = streamRegex.exec(pdfString)) !== null) {
    streamPositions.push(match.index + match[0].length)
  }
  
  let streamIndex = 0
  for (const startPos of streamPositions) {
    // Finde Ende des Streams
    const endMatch = pdfString.slice(startPos).match(/[\r\n]+endstream/)
    if (!endMatch) continue
    
    const endPos = startPos + endMatch.index!
    const streamData = buffer.slice(startPos, endPos)
    
    // Versuche zu dekomprimieren
    try {
      const decompressed = inflateSync(streamData)
      const text = decompressed.toString('utf-8')
      
      // Prüfe ob es XFA-Daten sind
      if (text.includes('xfa:') || text.includes('<xfa:') || 
          text.includes('datasets') || text.includes('Antrag')) {
        streams.set(`stream_${streamIndex}`, text)
        
        // Speziell: datasets stream identifizieren
        if (text.includes('<xfa:datasets') || text.includes('<xfa:data')) {
          streams.set('datasets', text)
        }
      }
      
      streamIndex++
    } catch (e) {
      // Nicht komprimiert oder anderes Format - ignorieren
    }
  }
  
  return streams
}

// ============================================================================
// HELPER: Wert aus XML extrahieren
// ============================================================================

function extractValue(pattern: RegExp | string, text: string): string {
  if (typeof pattern === 'string') {
    pattern = new RegExp(pattern)
  }
  const match = pattern.exec(text)
  return match ? match[1].trim() : ''
}

function extractFloat(pattern: RegExp | string, text: string): number {
  const value = extractValue(pattern, text)
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

function extractAllValues(tagName: string, text: string): string[] {
  const regex = new RegExp(`<${tagName}>([^<]*)</${tagName}>`, 'g')
  const values: string[] = []
  let match
  while ((match = regex.exec(text)) !== null) {
    values.push(match[1].trim())
  }
  return values
}

// ============================================================================
// PARSER: Standard ZIM Format (cg_VMS_*)
// ============================================================================

function parseStandardZim(text: string): any {
  const projekt: ZimProjekt = {
    name: extractValue(/<cg_VMS_VB_Projekt>([^<]+)/, text),
    kurzname: extractValue(/<cg_VMS_VB_KurzName>([^<]+)/, text),
    fkz: extractValue(/<cg_case_KENN_2>([^<]+)/, text),
    start: extractValue(/<cg_VMS_VB_Beginn>([^<]+)/, text),
    ende: extractValue(/<cg_VMS_VB_Ende>([^<]+)/, text),
    foerderquote: extractFloat(/<cg_VMS_AD_F[oö]rderquote>([^<]+)/, text),
    gesamtkosten: extractFloat(/<cg_VMS_HB_A_Kosten>([^<]+)/, text),
    zuwendung: extractFloat(/<cg_VMS_HB_A_ZuwendungFQ>([^<]+)/, text),
    gesamt_pm: extractFloat(/<sum_ges_pm>([^<]+)/, text),
    gesamt_pk: extractFloat(/<sum_ges_pk>([^<]+)/, text),
    laufzeit_monate: 0,
  }
  
  return { projekt, format: 'standard' }
}

// ============================================================================
// PARSER: Durchführbarkeitsstudie Format (Antrag_DS)
// ============================================================================

function parseDurchfuehrbarkeitsstudie(text: string): any {
  // Zeilenumbrüche normalisieren
  const normalized = text.replace(/\n>/g, '>').replace(/>\n/g, '>')
  
  // Projekt-Daten
  const projekt: ZimProjekt = {
    name: extractValue(/<thema>([^<]+)/, normalized),
    kurzname: extractValue(/<kurzfass>([^<]{0,100})/, normalized), // Erste 100 Zeichen
    fkz: '', // Wird erst nach Bewilligung vergeben
    start: '',
    ende: '',
    foerderquote: 50, // DS hat feste 50%
    gesamtkosten: 0,
    zuwendung: 0,
    gesamt_pm: 0,
    gesamt_pk: 0,
    laufzeit_monate: 0,
  }
  
  // Antragsteller
  const antragsteller: ZimAntragsteller = {
    firma: '', // Muss aus Kontext ermittelt werden
    rechtsform: extractValue(/<Rechtsform>([^<]+)/, normalized),
    strasse: extractValue(/<str>([^<]+)/, normalized),
    plz: extractValue(/<plz>([^<]+)/, normalized),
    ort: extractValue(/<ort>([^<]+)/, normalized) || extractValue(/<pfach_ort>([^<]+)/, normalized),
    bundesland: extractValue(/<ddl_land>([^<]+)/, normalized),
    website: extractValue(/<www>([^<]+)/, normalized),
    ansprechpartner_name: '',
    ansprechpartner_funktion: '',
    ansprechpartner_telefon: extractValue(/<tel_ap>([^<]+)/, normalized) || extractValue(/<tel_gf>([^<]+)/, normalized),
    ansprechpartner_email: extractValue(/<mail_ap>([^<]+)/, normalized) || extractValue(/<mail_gf>([^<]+)/, normalized),
  }
  
  // Firma aus Email oder Website extrahieren
  if (antragsteller.website) {
    const domain = antragsteller.website.replace(/^www\./, '').split('.')[0]
    antragsteller.firma = domain.charAt(0).toUpperCase() + domain.slice(1) + ' GmbH'
  }
  
  // Arbeitspakete extrahieren
  const arbeitspakete: ZimArbeitspaket[] = []
  
  // Nicht-technische APs
  const apNrMatches = extractAllValues('Arbeitspaket_Nr', normalized)
  const apNameMatches = extractAllValues('Arbeitspaket', normalized)
  const apPmMatches = extractAllValues('pm', normalized)
  
  for (let i = 0; i < Math.min(apNrMatches.length, apNameMatches.length); i++) {
    const apNrStr = apNrMatches[i]
    const apName = apNameMatches[i]
    const pm = parseFloat(apPmMatches[i]?.replace(',', '.') || '0')
    
    if (apName && apName.length > 2) {
      // Parse AP-Nummer (z.B. "2.1" -> ap_nummer=2, ap_sub_nummer=1)
      let ap_nummer = 0
      let ap_sub_nummer: number | null = null
      
      if (apNrStr.includes('.')) {
        const parts = apNrStr.split('.')
        ap_nummer = parseInt(parts[0]) || 0
        ap_sub_nummer = parseInt(parts[1]) || null
      } else {
        ap_nummer = parseInt(apNrStr) || i + 1
      }
      
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
  
  // Technische APs
  const apNrTechMatches = extractAllValues('Arbeitspaket_Nr_techn', normalized)
  const apNameTechMatches = extractAllValues('Arbeitspaket_techn', normalized)
  const apPmTechMatches = extractAllValues('pm_techn', normalized)
  
  for (let i = 0; i < Math.min(apNrTechMatches.length, apNameTechMatches.length); i++) {
    const apNrStr = apNrTechMatches[i]
    const apName = apNameTechMatches[i]
    const pm = parseFloat(apPmTechMatches[i]?.replace(',', '.') || '0')
    
    if (apName && apName.length > 2) {
      let ap_nummer = 0
      let ap_sub_nummer: number | null = null
      
      const cleanNr = apNrStr.replace('.', '')
      if (apNrStr.includes('.')) {
        const parts = apNrStr.split('.')
        ap_nummer = parseInt(parts[0]) || 0
        ap_sub_nummer = parseInt(parts[1]) || null
      } else {
        ap_nummer = parseInt(cleanNr) || 0
      }
      
      // Prüfe ob AP bereits existiert
      const existing = arbeitspakete.find(ap => 
        ap.ap_nummer === ap_nummer && ap.ap_sub_nummer === ap_sub_nummer
      )
      
      if (!existing) {
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
  }
  
  // Sortieren
  arbeitspakete.sort((a, b) => {
    if (a.ap_nummer !== b.ap_nummer) return a.ap_nummer - b.ap_nummer
    return (a.ap_sub_nummer || 0) - (b.ap_sub_nummer || 0)
  })
  
  return {
    projekt,
    antragsteller,
    arbeitspakete,
    mitarbeiter: [], // DS hat normalerweise keine detaillierten MA-Daten
    format: 'durchfuehrbarkeitsstudie'
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

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    console.log('Extrahiere XFA-Streams...')
    const streams = extractXfaStreams(buffer)
    console.log(`Gefunden: ${streams.size} Streams`)
    
    // Datasets stream finden
    let datasetsText = streams.get('datasets') || ''
    
    // Fallback: Alle Streams durchsuchen
    if (!datasetsText) {
      for (const [key, text] of streams) {
        if (text.includes('<xfa:data') || text.includes('Antrag_DS') || text.includes('cg_VMS')) {
          datasetsText = text
          break
        }
      }
    }
    
    if (!datasetsText || datasetsText.length < 100) {
      return NextResponse.json(
        { success: false, error: 'Keine XFA-Formulardaten gefunden. Ist dies ein ausgefuellter ZIM-Antrag?' },
        { status: 400 }
      )
    }
    
    console.log(`Datasets: ${datasetsText.length} Zeichen`)
    
    // Format erkennen und parsen
    let result: any
    
    if (datasetsText.includes('Antrag_DS') || datasetsText.includes('<thema>')) {
      console.log('Format: Durchführbarkeitsstudie')
      result = parseDurchfuehrbarkeitsstudie(datasetsText)
    } else if (datasetsText.includes('cg_VMS_') || datasetsText.includes('cg_case_')) {
      console.log('Format: Standard ZIM')
      result = parseStandardZim(datasetsText)
    } else {
      // Generischer Parser
      console.log('Format: Unbekannt - versuche generischen Parser')
      result = parseDurchfuehrbarkeitsstudie(datasetsText)
    }
    
    const { projekt, antragsteller, arbeitspakete, mitarbeiter, format } = result
    
    // Validierung
    if (!projekt.name && !projekt.kurzname && (!antragsteller || !antragsteller.firma)) {
      return NextResponse.json(
        { success: false, error: 'Konnte keine Projektdaten extrahieren. Bitte pruefen Sie das PDF-Format.' },
        { status: 400 }
      )
    }

    // Response
    return NextResponse.json({
      success: true,
      projekt,
      antragsteller: antragsteller || {},
      budget: {
        gesamtkosten: projekt.gesamtkosten,
        personalkosten: projekt.gesamt_pk,
        foerderquote: projekt.foerderquote,
        foerdersumme: projekt.zuwendung,
        gesamt_pm: projekt.gesamt_pm,
        laufzeit_monate: projekt.laufzeit_monate,
      },
      mitarbeiter: mitarbeiter || [],
      arbeitspakete: arbeitspakete || [],
      parse_datum: new Date().toISOString(),
      quell_datei: file.name,
      format_erkannt: format,
      statistik: {
        anzahl_mitarbeiter: mitarbeiter?.length || 0,
        anzahl_arbeitspakete: arbeitspakete?.length || 0,
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
