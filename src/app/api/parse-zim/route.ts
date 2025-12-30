// src/app/api/parse-zim/route.ts
// Next.js API Route für ZIM PDF Parsing
// VERSION: v7.0.2 - Erweitert um Arbeitspakete
// DATUM: 30. Dezember 2024

import { NextRequest, NextResponse } from 'next/server'

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
  ap_nummer: number           // 1, 2, 3, ...
  ap_code: string             // "AP1", "1" etc.
  name: string                // Bezeichnung des AP
  start_monat: number | null  // Projektmonat Start (1-36)
  ende_monat: number | null   // Projektmonat Ende (1-36)
  gesamt_pm: number           // Summe PM für dieses AP
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

    // PDF-Inhalt als Text extrahieren
    const pdfText = buffer.toString('latin1')

    // XFA-Daten suchen
    if (!pdfText.includes('xfa:data') && !pdfText.includes('datasets')) {
      return NextResponse.json(
        { success: false, error: 'Keine XFA-Daten gefunden. Ist dies ein ausgefüllter ZIM-Antrag?' },
        { status: 400 }
      )
    }

    // ============================================
    // HELPER FUNCTIONS
    // ============================================

    const extractValue = (pattern: RegExp, text: string): string => {
      const match = text.match(pattern)
      return match ? match[1].trim() : ''
    }

    const extractFloat = (pattern: RegExp, text: string): number => {
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

    const extractInt = (pattern: RegExp, text: string): number => {
      const value = extractValue(pattern, text)
      return parseInt(value) || 0
    }

    // Laufzeit in Monaten berechnen
    const calculateDurationMonths = (startStr: string, endStr: string): number => {
      if (!startStr || !endStr) return 0
      try {
        // Format: DD.MM.YYYY
        const [startDay, startMonth, startYear] = startStr.split('.').map(Number)
        const [endDay, endMonth, endYear] = endStr.split('.').map(Number)
        
        const start = new Date(startYear, startMonth - 1, startDay)
        const end = new Date(endYear, endMonth - 1, endDay)
        
        const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1
        return Math.max(0, months)
      } catch {
        return 0
      }
    }

    // ============================================
    // PROJEKTDATEN
    // ============================================

    const startDatum = extractValue(/<cg_VMS_VB_Beginn>([^<]+)/, pdfText)
    const endeDatum = extractValue(/<cg_VMS_VB_Ende>([^<]+)/, pdfText)

    const projekt: ZimProjekt = {
      name: extractValue(/<cg_VMS_VB_Projekt>([^<]+)/, pdfText),
      kurzname: extractValue(/<cg_VMS_VB_KurzName>([^<]+)/, pdfText),
      fkz: extractValue(/<cg_case_KENN_2>([^<]+)/, pdfText),
      start: startDatum,
      ende: endeDatum,
      foerderquote: extractFloat(/<cg_VMS_AD_Förderquote>([^<]+)/, pdfText),
      gesamtkosten: extractFloat(/<cg_VMS_HB_A_Kosten>([^<]+)/, pdfText),
      zuwendung: extractFloat(/<cg_VMS_HB_A_ZuwendungFQ>([^<]+)/, pdfText),
      gesamt_pm: extractFloat(/<sum_ges_pm>([^<]+)/, pdfText),
      gesamt_pk: extractFloat(/<sum_ges_pk>([^<]+)/, pdfText),
      laufzeit_monate: calculateDurationMonths(startDatum, endeDatum),
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
      bundesland: extractValue(/<Bundeslan_Ast>([^<]+)/, pdfText),
      website: extractValue(/<website_Ast>([^<]+)/, pdfText),
      ansprechpartner_name: `${extractValue(/<Seite2_VornameVB>([^<]+)/, pdfText)} ${extractValue(/<Seite2_NameVB>([^<]+)/, pdfText)}`.trim(),
      ansprechpartner_funktion: extractValue(/<Seite2_FunktionVB>([^<]+)/, pdfText),
      ansprechpartner_telefon: extractValue(/<Seite2_TelefonVB>([^<]+)/, pdfText),
      ansprechpartner_email: extractValue(/<Seite2_MailVB>([^<]+)/, pdfText),
    }

    // ============================================
    // BUDGET
    // ============================================

    const budget: ZimBudget = {
      gesamtkosten: projekt.gesamtkosten,
      personalkosten: projekt.gesamt_pk,
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
    // MITARBEITER (Anlage 6.1 + 6.2)
    // ============================================

    const mitarbeiter: ZimMitarbeiter[] = []

    // Anlage 6.2 Lookup erstellen (PM-Summen pro MA)
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
        const jahreRegex = /<cg_file_262_sub_UnterZeile\d+><cg_VMS_PK_iJahrZahl>(\d{4})<\/cg_VMS_PK_iJahrZahl><cg_VMS_PK_fPersMonat>([^<]+)<\/cg_VMS_PK_fPersMonat>/g
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

    // Nach MA-Nr sortieren
    mitarbeiter.sort((a, b) => a.ma_nr - b.ma_nr)

    // ============================================
    // ARBEITSPAKETE (Anlage 5)
    // ============================================

    const arbeitspakete: ZimArbeitspaket[] = []
    
    // Temporäre Struktur zum Gruppieren
    const apTempMap: Map<string, {
      ap_nummer: number
      ap_code: string
      name: string
      start_monat: number | null
      ende_monat: number | null
      zuordnungen: Array<{ ma_nr: number; pm: number }>
    }> = new Map()

    // Regex für Arbeitsplan-Zeilen (Anlage 5)
    // Format: <Zeile2><lfd>1</lfd><ap>Arbeitspaket 1</ap><von>1</von><bis>12</bis><ma_nr>1</ma_nr><pm>3,5</pm></Zeile2>
    const apRegex = /<Zeile2><lfd>([^<]*)<\/lfd><ap>([^<]*)<\/ap><von>([^<]*)<\/von><bis>([^<]*)<\/bis><ma_nr>([^<]*)<\/ma_nr><pm>([^<]*)<\/pm><\/Zeile2>/g
    
    let currentApNr = ''
    let currentApName = ''
    let apMatch

    while ((apMatch = apRegex.exec(pdfText)) !== null) {
      const [, lfd, ap, von, bis, ma_nr, pm] = apMatch
      
      // Neues Arbeitspaket wenn lfd und ap gefüllt
      if (lfd && ap) {
        currentApNr = lfd.trim()
        currentApName = ap.trim()
      }

      // MA-Zuordnung wenn ma_nr und pm vorhanden
      if (ma_nr && pm && currentApNr) {
        const apKey = currentApNr

        if (!apTempMap.has(apKey)) {
          apTempMap.set(apKey, {
            ap_nummer: parseInt(currentApNr) || apTempMap.size + 1,
            ap_code: `AP${currentApNr}`,
            name: currentApName,
            start_monat: von ? parseInt(von) : null,
            ende_monat: bis ? parseInt(bis) : null,
            zuordnungen: []
          })
        }

        const apData = apTempMap.get(apKey)!
        
        // PM-Wert parsen (deutsches Format)
        let pmValue = pm.replace(',', '.')
        const pmNumber = parseFloat(pmValue) || 0

        if (pmNumber > 0) {
          apData.zuordnungen.push({
            ma_nr: parseInt(ma_nr) || 0,
            pm: pmNumber
          })
        }

        // Start/Ende aktualisieren wenn in dieser Zeile vorhanden
        if (von && parseInt(von) > 0) {
          const vonInt = parseInt(von)
          if (!apData.start_monat || vonInt < apData.start_monat) {
            apData.start_monat = vonInt
          }
        }
        if (bis && parseInt(bis) > 0) {
          const bisInt = parseInt(bis)
          if (!apData.ende_monat || bisInt > apData.ende_monat) {
            apData.ende_monat = bisInt
          }
        }
      }
    }

    // Alternative Parsing-Methode falls erste nichts findet
    if (apTempMap.size === 0) {
      // Versuche alternatives Format
      const altApRegex = /<ap_(\d+)_name>([^<]+)<\/ap_\d+_name>/g
      let altMatch
      while ((altMatch = altApRegex.exec(pdfText)) !== null) {
        const [, nr, name] = altMatch
        apTempMap.set(nr, {
          ap_nummer: parseInt(nr),
          ap_code: `AP${nr}`,
          name: name.trim(),
          start_monat: null,
          ende_monat: null,
          zuordnungen: []
        })
      }
    }

    // Map zu Array konvertieren und PM summieren
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

    // Nach AP-Nummer sortieren
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
        // Statistik
        statistik: {
          anzahl_mitarbeiter: mitarbeiter.length,
          anzahl_arbeitspakete: arbeitspakete.length,
          gesamt_pm: projekt.gesamt_pm,
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
