// src/app/api/parse-zim/route.ts
// Next.js API Route für ZIM PDF Parsing mit XFA-Extraktion

import { NextRequest, NextResponse } from 'next/server'
import { inflateSync } from 'zlib'

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

    // XFA-Daten aus PDF extrahieren
    const xfaData = extractXfaFromPdf(buffer)
    
    if (!xfaData) {
      return NextResponse.json(
        { success: false, error: 'Keine XFA-Daten gefunden. Ist dies ein ausgefüllter ZIM-Antrag?' },
        { status: 400 }
      )
    }

    // Daten parsen
    const result = parseZimData(xfaData, file.name)
    
    return NextResponse.json(result)

  } catch (error) {
    console.error('Parse error:', error)
    return NextResponse.json(
      { success: false, error: `Parsing fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}` },
      { status: 500 }
    )
  }
}

/**
 * Extrahiert XFA-Daten aus einem PDF-Buffer
 */
function extractXfaFromPdf(buffer: Buffer): string | null {
  const pdfString = buffer.toString('binary')
  
  // Suche nach komprimierten Streams und dekomprimiere sie
  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g
  let allText = ''
  let match
  
  while ((match = streamRegex.exec(pdfString)) !== null) {
    const streamData = match[1]
    
    try {
      // Versuche FlateDecode (zlib) Dekompression
      const binaryData = Buffer.from(streamData, 'binary')
      const decompressed = inflateSync(binaryData)
      const text = decompressed.toString('utf-8')
      
      // Prüfe ob es XFA-Daten sind
      if (text.includes('xfa:data') || text.includes('xfa:datasets') || 
          text.includes('<cg_VMS_') || text.includes('<Seite2_')) {
        allText += text
      }
    } catch {
      // Stream war nicht komprimiert oder anderes Format
      // Versuche direkt zu lesen
      if (streamData.includes('xfa:data') || streamData.includes('<cg_VMS_')) {
        allText += streamData
      }
    }
  }
  
  // Auch unkomprimierte Bereiche durchsuchen
  if (pdfString.includes('<xfa:data') || pdfString.includes('<cg_VMS_')) {
    // XFA-Daten könnten auch unkomprimiert sein
    const xfaMatch = pdfString.match(/<xfa:data[^>]*>([\s\S]*?)<\/xfa:data>/i)
    if (xfaMatch) {
      allText += xfaMatch[1]
    }
    
    // Oder als datasets
    const datasetsMatch = pdfString.match(/<xfa:datasets[^>]*>([\s\S]*?)<\/xfa:datasets>/i)
    if (datasetsMatch) {
      allText += datasetsMatch[1]
    }
  }
  
  if (!allText || allText.length < 100) {
    return null
  }
  
  return allText
}

/**
 * Parst die extrahierten ZIM-Daten
 */
function parseZimData(pdfText: string, filename: string) {
  const extractValue = (pattern: RegExp, text: string): string => {
    const match = text.match(pattern)
    return match ? match[1].trim() : ''
  }

  const extractFloat = (pattern: RegExp, text: string): number => {
    const value = extractValue(pattern, text)
    if (!value) return 0
    let cleaned = value
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

  // Projektdaten
  const projekt = {
    name: extractValue(/<cg_VMS_VB_Projekt>([^<]+)/, pdfText),
    kurzname: extractValue(/<cg_VMS_VB_KurzName>([^<]+)/, pdfText),
    fkz: extractValue(/<cg_case_KENN_2>([^<]+)/, pdfText),
    start: extractValue(/<cg_VMS_VB_Beginn>([^<]+)/, pdfText),
    ende: extractValue(/<cg_VMS_VB_Ende>([^<]+)/, pdfText),
    foerderquote: extractFloat(/<cg_VMS_AD_Förderquote>([^<]+)/, pdfText),
    gesamtkosten: extractFloat(/<cg_VMS_HB_A_Kosten>([^<]+)/, pdfText),
    zuwendung: extractFloat(/<cg_VMS_HB_A_ZuwendungFQ>([^<]+)/, pdfText),
    gesamt_pm: extractFloat(/<sum_ges_pm>([^<]+)/, pdfText),
    gesamt_pk: extractFloat(/<sum_ges_pk>([^<]+)/, pdfText),
  }

  // Antragsteller
  const antragsteller = {
    firma: extractValue(/<Seite2_AST>([^<]+)/, pdfText),
    rechtsform: extractValue(/<cg_VMS_AD_Rechtsform>([^<]+)/, pdfText),
    strasse: extractValue(/<Strasse_Ast>([^<]+)/, pdfText),
    plz: extractValue(/<PLZ_Ast>([^<]+)/, pdfText),
    ort: extractValue(/<Ort_Ast>([^<]+)/, pdfText),
    bundesland: extractValue(/<Bundeslan_Ast>([^<]+)/, pdfText),
    website: extractValue(/<website_Ast>([^<]+)/, pdfText),
    ansprechpartner_name: `${extractValue(/<Seite2_VornameVB>([^<]+)/, pdfText)} ${extractValue(/<Seite2_NameVB>([^<]+)/, pdfText)}`.trim(),
    ansprechpartner_funktion: extractValue(/<Seite2_FunktionVB>([^<]+)/, pdfText),
    ansprechpartner_telefon: extractValue(/<Seite2_TelefonVB>([^<]+)/, pdfText),
    ansprechpartner_email: extractValue(/<Seite2_MailVB>([^<]+)/, pdfText),
  }

  // Mitarbeiter
  const mitarbeiter: Array<{
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
  }> = []

  // Anlage 6.2 Lookup
  const a62Lookup: Record<string, { qual_gruppe: number; sum_pm: number; sum_pk: number; pm_pro_jahr: Record<number, number> }> = {}
  const a62Regex = /<cg_file_262_Zeile1_Anlage62>([\s\S]*?)<\/cg_file_262_Zeile1_Anlage62>/g
  let a62Match
  while ((a62Match = a62Regex.exec(pdfText)) !== null) {
    const block = a62Match[1]
    const maId = extractValue(/<cg_VMS_PK_DdsId_261>([^<]+)/, block)
    if (maId) {
      const pmProJahr: Record<number, number> = {}
      const jahreRegex = /<cg_file_262_sub_UnterZeile\d+><cg_VMS_PK_iJahrZahl>(\d{4})<\/cg_VMS_PK_iJahrZahl><cg_VMS_PK_fPersMonat>([^<]+)<\/cg_VMS_PK_fPersMonat>/g
      let jm
      while ((jm = jahreRegex.exec(block)) !== null) {
        const jahr = parseInt(jm[1])
        const pm = parseFloat(jm[2]) || 0
        pmProJahr[jahr] = (pmProJahr[jahr] || 0) + pm
      }
      a62Lookup[maId] = {
        qual_gruppe: parseInt(extractValue(/<cg_VMS_PK_aQualGruppe>([^<]+)/, block)) || 4,
        sum_pm: extractFloat(/<sum_pm>([^<]+)/, block),
        sum_pk: extractFloat(/<sum_pk>([^<]+)/, block),
        pm_pro_jahr: pmProJahr
      }
    }
  }

  // Anlage 6.1 Mitarbeiter
  const maRegex = /<Teilform_page13>([\s\S]*?)<\/Teilform_page13>/g
  let maMatch
  while ((maMatch = maRegex.exec(pdfText)) !== null) {
    const block = maMatch[1]
    const maId = extractValue(/<cg_DdsId_261>([^<]+)/, block)
    if (!maId) continue

    const a62Data = a62Lookup[maId] || { qual_gruppe: 4, sum_pm: 0, sum_pk: 0, pm_pro_jahr: {} }

    mitarbeiter.push({
      ma_nr: parseInt(maId),
      nachname: extractValue(/<cg_VMS_PM_aNachname>([^<]+)/, block),
      vorname: extractValue(/<cg_VMS_PM_aVorname>([^<]+)/, block),
      qualifikation: extractValue(/<cg_VMS_PM_aQualFachAusb>([^<]+)/, block),
      qualifikation_gruppe: a62Data.qual_gruppe,
      geburtsdatum: extractValue(/<cg_VMS_PM_dGeburtsdatum>([^<]+)/, block),
      funktion: extractValue(/<cg_VMS_PM_aFunktion>([^<]+)/, block),
      angestellt_seit: extractValue(/<cg_VMS_PM_dAngestSeit>([^<]+)/, block),
      jahresbrutto: extractFloat(/<Jahresbrutto>([^<]+)/, block),
      stundensatz: extractFloat(/<std_satz>([^<]+)/, block),
      wochenstunden: extractFloat(/<cg_VMS_PM_fWochArbeitsz>([^<]+)/, block),
      teilzeitfaktor: extractFloat(/<cg_VMS_PM_fTeilzFaktor>([^<]+)/, block) || 1.0,
      pm_gesamt: a62Data.sum_pm,
      kosten_gesamt: a62Data.sum_pk,
      pm_pro_jahr: a62Data.pm_pro_jahr,
    })
  }

  mitarbeiter.sort((a, b) => a.ma_nr - b.ma_nr)

  // Arbeitspakete
  const arbeitspakete: Array<{
    ap_nr: string
    beschreibung: string
    von: string
    bis: string
    ma_nr: number
    pm: number
  }> = []

  const apRegex = /<Zeile2><lfd>([^<]*)<\/lfd><ap>([^<]*)<\/ap><von>([^<]*)<\/von><bis>([^<]*)<\/bis><ma_nr>([^<]*)<\/ma_nr><pm>([^<]*)<\/pm><\/Zeile2>/g
  let currentBeschreibung = ''
  let apMatch
  while ((apMatch = apRegex.exec(pdfText)) !== null) {
    const [, lfd, ap, von, bis, ma_nr, pm] = apMatch
    if (ap) currentBeschreibung = ap
    if (ma_nr && pm) {
      arbeitspakete.push({
        ap_nr: lfd,
        beschreibung: currentBeschreibung,
        von,
        bis,
        ma_nr: parseInt(ma_nr) || 0,
        pm: parseFloat(pm) || 0,
      })
    }
  }

  // Validierung
  if (!projekt.kurzname && !projekt.name && !antragsteller.firma) {
    return {
      success: false,
      error: 'Konnte keine Projektdaten extrahieren. Ist dies ein ausgefüllter ZIM-Antrag?'
    }
  }

  return {
    success: true,
    data: {
      projekt,
      antragsteller,
      mitarbeiter,
      arbeitspakete,
      parse_datum: new Date().toISOString(),
      quell_datei: filename,
    }
  }
}
