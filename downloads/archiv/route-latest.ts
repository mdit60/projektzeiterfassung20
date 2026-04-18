// src/app/api/parse-zim/route.ts
// Next.js API Route für ZIM PDF Parsing
// VERSION: v7.0.4 - Mit zlib-Dekomprimierung für XFA-Streams
// DATUM: 30. Dezember 2024

import { NextRequest, NextResponse } from 'next/server'
import { inflateSync } from 'zlib'

// ============================================
// TYPES
// ============================================

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
  materialkosten: number
  fremdleistungen: number
  gemeinkosten: number
  foerderquote: number
  foerdersumme: number
  eigenanteil: number
  laufzeit_monate: number
  gesamt_pm: number
}

// ============================================
// HELPER: Komprimierte PDF-Streams extrahieren
// ============================================

function extractXfaFromPdf(buffer: Buffer): string {
  const pdfBytes = buffer
  let allText = ''
  
  // Schritt 1: Finde alle FlateDecode Streams
  // PDF-Stream-Format: stream\r\n...daten...\r\nendstream
  const streamRegex = /stream[\r\n]+/g
  const endstreamRegex = /[\r\n]+endstream/g
  
  let match
  const streamPositions: number[] = []
  
  // Finde alle "stream" Marker
  while ((match = streamRegex.exec(buffer.toString('binary'))) !== null) {
    streamPositions.push(match.index + match[0].length)
  }
  
  // Für jede Stream-Position, versuche zu dekomprimieren
  for (const startPos of streamPositions) {
    // Suche das Ende des Streams
    const searchBuffer = buffer.slice(startPos, Math.min(startPos + 1000000, buffer.length))
    const endMatch = searchBuffer.toString('binary').indexOf('endstream')
    
    if (endMatch === -1) continue
    
    // Extrahiere die Stream-Daten
    const streamData = buffer.slice(startPos, startPos + endMatch)
    
    // Versuche zu dekomprimieren (FlateDecode = zlib)
    try {
      const decompressed = inflateSync(streamData)
      const text = decompressed.toString('utf-8')
      
      // Prüfe ob es XFA-Daten sind
      if (text.includes('<xfa:') || text.includes('cg_VMS_') || text.includes('datasets')) {
        allText += text + '\n'
      }
    } catch {
      // Stream war nicht komprimiert oder anderes Format - ignorieren
    }
  }
  
  // Schritt 2: Falls keine dekomprimierten XFA-Daten, versuche Rohtext
  if (!allText) {
    allText = buffer.toString('latin1')
  }
  
  // Normalisiere Zeilenumbrüche in Tags
  allText = allText.replace(/<([^>]+)\n>/g, '<$1>')
  
  return allText
}

// ============================================
// HELPER: Wert aus XFA extrahieren
// ============================================

function extractValue(pattern: RegExp, text: string): string {
  const match = text.match(pattern)
  return match ? match[1].trim() : ''
}

function extractFloat(pattern: RegExp, text: string): number {
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

// ============================================
// MAIN HANDLER
// ============================================

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

    // XFA-Daten aus PDF extrahieren (mit Dekomprimierung)
    console.log('Extrahiere XFA-Daten...')
    const pdfText = extractXfaFromPdf(buffer)
    console.log(`Extrahierter Text: ${pdfText.length} Zeichen`)
    
    // Debug: Prüfe ob wichtige Marker vorhanden
    const hasXfa = pdfText.includes('xfa:data') || pdfText.includes('xfa:datasets')
    const hasCgVms = pdfText.includes('cg_VMS_')
    const hasSeite = pdfText.includes('Seite2_AST') || pdfText.includes('Seite2_')
    
    console.log(`XFA: ${hasXfa}, cg_VMS: ${hasCgVms}, Seite: ${hasSeite}`)
    
    if (!hasXfa && !hasCgVms && !hasSeite) {
      return NextResponse.json(
        { success: false, error: 'Keine XFA-Daten gefunden. Ist dies ein ausgefüllter ZIM-Antrag?' },
        { status: 400 }
      )
    }

    // ============================================
    // PROJEKTDATEN
    // ============================================

    const projekt: ZimProjekt = {
      name: extractValue(/<cg_VMS_VB_Projekt>([^<]+)/, pdfText),
      kurzname: extractValue(/<cg_VMS_VB_KurzName>([^<]+)/, pdfText),
      fkz: extractValue(/<cg_case_KENN_2>([^<]+)/, pdfText),
      start: extractValue(/<cg_VMS_VB_Beginn>([^<]+)/, pdfText),
      ende: extractValue(/<cg_VMS_VB_Ende>([^<]+)/, pdfText),
      foerderquote: extractFloat(/<cg_VMS_AD_Förderquote>([^<]+)/, pdfText) || 
                    extractFloat(/<cg_VMS_AD_F.rderquote>([^<]+)/, pdfText),
      gesamtkosten: extractFloat(/<cg_VMS_HB_A_Kosten>([^<]+)/, pdfText),
      zuwendung: extractFloat(/<cg_VMS_HB_A_ZuwendungFQ>([^<]+)/, pdfText),
      gesamt_pm: extractFloat(/<sum_ges_pm>([^<]+)/, pdfText),
      gesamt_pk: extractFloat(/<sum_ges_pk>([^<]+)/, pdfText),
      laufzeit_monate: 0,
    }

    // Laufzeit berechnen
    if (projekt.start && projekt.ende) {
      try {
        const parseDate = (str: string): Date | null => {
          if (str.match(/^\d{4}-\d{2}-\d{2}$/)) {
            return new Date(str)
          }
          const match = str.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
          if (match) {
            return new Date(parseInt(match[3]), parseInt(match[2]) - 1, parseInt(match[1]))
          }
          return null
        }
        
        const startDate = parseDate(projekt.start)
        const endDate = parseDate(projekt.ende)
        
        if (startDate && endDate) {
          const months = (endDate.getFullYear() - startDate.getFullYear()) * 12 + 
                         (endDate.getMonth() - startDate.getMonth()) + 1
          projekt.laufzeit_monate = Math.max(0, months)
        }
      } catch {
        projekt.laufzeit_monate = 0
      }
    }

    // ============================================
    // ANTRAGSTELLER
    // ============================================

    const antragsteller: ZimAntragsteller = {
      firma: extractValue(/<Seite2_AST>([^<]+)/, pdfText),
      rechtsform: extractValue(/<cg_VMS_AD_Rechtsform>([^<]+)/, pdfText),
      strasse: extractValue(/<Strasse_Ast>([^<]+)/, pdfText),
      plz: extractValue(/<PLZ_Ast>([^<]+)/, pdfText),
      ort: extractValue(/<Ort_Ast>([^<]+)/, pdfText),
      bundesland: extractValue(/<cg_VMS_AD_Bundesland>([^<]+)/, pdfText) ||
                  extractValue(/<Bundeslan_Ast>([^<]+)/, pdfText),
      website: extractValue(/<website_Ast>([^<]+)/, pdfText),
      ansprechpartner_name: `${extractValue(/<Seite2_VornameVB>([^<]+)/, pdfText)} ${extractValue(/<Seite2_NameVB>([^<]+)/, pdfText)}`.trim() ||
                            extractValue(/<Seite4_NameBefugter>([^<]+)/, pdfText),
      ansprechpartner_funktion: extractValue(/<Seite2_FunktionVB>([^<]+)/, pdfText),
      ansprechpartner_telefon: extractValue(/<Seite2_TelefonVB>([^<]+)/, pdfText),
      ansprechpartner_email: extractValue(/<Seite2_MailVB>([^<]+)/, pdfText),
    }

    // ============================================
    // BUDGET
    // ============================================

    const budget: ZimBudget = {
      gesamtkosten: projekt.gesamtkosten,
      personalkosten: projekt.gesamt_pk || extractFloat(/<cg_VMS_HB_A_Jahr1Kost01>([^<]+)/, pdfText),
      materialkosten: extractFloat(/<cg_VMS_HB_A_Material>([^<]+)/, pdfText),
      fremdleistungen: extractFloat(/<cg_VMS_HB_A_Fremdleist>([^<]+)/, pdfText),
      gemeinkosten: extractFloat(/<cg_VMS_HB_A_Gemein>([^<]+)/, pdfText),
      foerderquote: projekt.foerderquote,
      foerdersumme: projekt.zuwendung,
      eigenanteil: projekt.gesamtkosten - projekt.zuwendung,
      laufzeit_monate: projekt.laufzeit_monate,
      gesamt_pm: projekt.gesamt_pm,
    }

    // ============================================
    // MITARBEITER (Anlage 6.1)
    // ============================================

    const mitarbeiter: ZimMitarbeiter[] = []

    // Anlage 6.2 Lookup erstellen
    const a62Lookup: Record<string, { 
      qual_gruppe: number
      sum_pm: number
      sum_pk: number
      pm_pro_jahr: Record<number, number> 
    }> = {}

    const a62Regex = /<cg_file_262_Zeile1_Anlage62>([\s\S]*?)<\/cg_file_262_Zeile1_Anlage62>/g
    let a62Match
    while ((a62Match = a62Regex.exec(pdfText)) !== null) {
      const block = a62Match[1]
      const maId = extractValue(/<cg_VMS_PK_DdsId_261>([^<]+)/, block)
      if (maId) {
        const pmProJahr: Record<number, number> = {}
        const jahreRegex = /<cg_VMS_PK_iJahrZahl>(\d{4})<\/cg_VMS_PK_iJahrZahl>[\s\S]*?<cg_VMS_PK_fPersMonat>([^<]+)<\/cg_VMS_PK_fPersMonat>/g
        let jm
        while ((jm = jahreRegex.exec(block)) !== null) {
          const jahr = parseInt(jm[1])
          const pm = parseFloat(jm[2].replace(',', '.')) || 0
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

    // Mitarbeiter extrahieren - verschiedene Patterns
    const maPatterns = [
      /<cg_file_261_a71>([\s\S]*?)<\/cg_file_261_a71>/g,
      /<Teilform_page13>([\s\S]*?)<\/Teilform_page13>/g,
    ]

    for (const pattern of maPatterns) {
      let maMatch
      while ((maMatch = pattern.exec(pdfText)) !== null) {
        const block = maMatch[1]
        const maId = extractValue(/<cg_DdsId_261>([^<]+)/, block)
        
        if (!maId || mitarbeiter.some(m => m.ma_nr === parseInt(maId))) continue

        const a62Data = a62Lookup[maId] || { qual_gruppe: 4, sum_pm: 0, sum_pk: 0, pm_pro_jahr: {} }

        const nachname = extractValue(/<cg_VMS_PM_aNachname>([^<]+)/, block)
        const vorname = extractValue(/<cg_VMS_PM_aVorname>([^<]+)/, block)
        
        if (!nachname && !vorname) continue

        mitarbeiter.push({
          ma_nr: parseInt(maId) || mitarbeiter.length + 1,
          nachname,
          vorname,
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
      
      if (mitarbeiter.length > 0) break
    }

    mitarbeiter.sort((a, b) => a.ma_nr - b.ma_nr)

    // ============================================
    // ARBEITSPAKETE (Anlage 5)
    // ============================================

    const arbeitspakete: ZimArbeitspaket[] = []
    const apTempMap: Map<number, {
      ap_nummer: number
      ap_code: string
      name: string
      start_monat: number | null
      ende_monat: number | null
      zuordnungen: Array<{ ma_nr: number; pm: number }>
    }> = new Map()

    // Arbeitsplan-Zeilen
    const apRegex = /<Zeile2><lfd>([^<]*)<\/lfd><ap>([^<]*)<\/ap><von>([^<]*)<\/von><bis>([^<]*)<\/bis><ma_nr>([^<]*)<\/ma_nr><pm>([^<]*)<\/pm><\/Zeile2>/g
    
    let currentApNr = 0
    let currentApName = ''
    let apMatch

    while ((apMatch = apRegex.exec(pdfText)) !== null) {
      const [, lfd, ap, von, bis, ma_nr, pm] = apMatch
      
      if (lfd && ap) {
        currentApNr = parseInt(lfd) || currentApNr + 1
        currentApName = ap.trim()
      }

      if (ma_nr && pm && currentApNr > 0) {
        if (!apTempMap.has(currentApNr)) {
          apTempMap.set(currentApNr, {
            ap_nummer: currentApNr,
            ap_code: `AP${currentApNr}`,
            name: currentApName,
            start_monat: von ? parseInt(von) : null,
            ende_monat: bis ? parseInt(bis) : null,
            zuordnungen: []
          })
        }

        const apData = apTempMap.get(currentApNr)!
        const pmNumber = parseFloat(pm.replace(',', '.')) || 0

        if (pmNumber > 0) {
          apData.zuordnungen.push({
            ma_nr: parseInt(ma_nr) || 0,
            pm: pmNumber
          })
        }
      }
    }

    // Fallback: AP-Namen direkt
    if (apTempMap.size === 0) {
      const apNameRegex = /<ap>([^<]+)</g
      let apNameMatch
      let apCounter = 0
      
      while ((apNameMatch = apNameRegex.exec(pdfText)) !== null) {
        apCounter++
        const apName = apNameMatch[1].trim()
        if ([...apTempMap.values()].some(ap => ap.name === apName)) continue
        
        apTempMap.set(apCounter, {
          ap_nummer: apCounter,
          ap_code: `AP${apCounter}`,
          name: apName,
          start_monat: null,
          ende_monat: null,
          zuordnungen: []
        })
      }
    }

    for (const [, apData] of apTempMap) {
      const gesamtPm = apData.zuordnungen.reduce((sum, z) => sum + z.pm, 0)
      arbeitspakete.push({
        ap_nummer: apData.ap_nummer,
        ap_code: apData.ap_code,
        name: apData.name,
        start_monat: apData.start_monat,
        ende_monat: apData.ende_monat,
        gesamt_pm: Math.round(gesamtPm * 100) / 100,
        mitarbeiter_zuordnungen: apData.zuordnungen
      })
    }

    arbeitspakete.sort((a, b) => a.ap_nummer - b.ap_nummer)

    // ============================================
    // VALIDIERUNG
    // ============================================

    if (!projekt.kurzname && !projekt.name && !antragsteller.firma) {
      return NextResponse.json(
        { success: false, error: 'Konnte keine Projektdaten extrahieren. Ist dies ein ausgefüllter ZIM-Antrag?' },
        { status: 400 }
      )
    }

    // ============================================
    // RESPONSE
    // ============================================

    return NextResponse.json({
      success: true,
      data: {
        projekt,
        antragsteller,
        budget,
        mitarbeiter,
        arbeitspakete,
        parse_datum: new Date().toISOString(),
        quell_datei: file.name,
        statistik: {
          anzahl_mitarbeiter: mitarbeiter.length,
          anzahl_arbeitspakete: arbeitspakete.length,
          gesamt_pm: projekt.gesamt_pm || mitarbeiter.reduce((sum, m) => sum + m.pm_gesamt, 0),
          gesamt_pk: projekt.gesamt_pk,
          laufzeit_monate: projekt.laufzeit_monate,
        }
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
