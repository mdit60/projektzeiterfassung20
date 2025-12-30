// src/app/api/parse-zim/route.ts
// Next.js API Route für ZIM PDF Parsing
// Hinweis: Diese Route nutzt einen externen Python-Service oder 
// wir implementieren den Parser direkt in TypeScript

import { NextRequest, NextResponse } from 'next/server'

// XFA-Daten aus PDF extrahieren (vereinfachte Version)
// Volle XFA-Unterstützung erfordert spezielle Libraries

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

    // Einfache Regex-Extraktion (wie in Python)
    const extractValue = (pattern: RegExp, text: string): string => {
      const match = text.match(pattern)
      return match ? match[1].trim() : ''
    }

    const extractFloat = (pattern: RegExp, text: string): number => {
      const value = extractValue(pattern, text)
      if (!value) return 0
      // Deutsche/Englische Zahlenformate
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
      name: extractValue(/<cg_VMS_VB_Projekt>([^<]+)/s, pdfText),
      kurzname: extractValue(/<cg_VMS_VB_KurzName>([^<]+)/s, pdfText),
      fkz: extractValue(/<cg_case_KENN_2>([^<]+)/s, pdfText),
      start: extractValue(/<cg_VMS_VB_Beginn>([^<]+)/s, pdfText),
      ende: extractValue(/<cg_VMS_VB_Ende>([^<]+)/s, pdfText),
      foerderquote: extractFloat(/<cg_VMS_AD_Förderquote>([^<]+)/s, pdfText),
      gesamtkosten: extractFloat(/<cg_VMS_HB_A_Kosten>([^<]+)/s, pdfText),
      zuwendung: extractFloat(/<cg_VMS_HB_A_ZuwendungFQ>([^<]+)/s, pdfText),
      gesamt_pm: extractFloat(/<sum_ges_pm>([^<]+)/s, pdfText),
      gesamt_pk: extractFloat(/<sum_ges_pk>([^<]+)/s, pdfText),
    }

    // Antragsteller
    const antragsteller = {
      firma: extractValue(/<Seite2_AST>([^<]+)/s, pdfText),
      rechtsform: extractValue(/<cg_VMS_AD_Rechtsform>([^<]+)/s, pdfText),
      strasse: extractValue(/<Strasse_Ast>([^<]+)/s, pdfText),
      plz: extractValue(/<PLZ_Ast>([^<]+)/s, pdfText),
      ort: extractValue(/<Ort_Ast>([^<]+)/s, pdfText),
      bundesland: extractValue(/<Bundeslan_Ast>([^<]+)/s, pdfText),
      website: extractValue(/<website_Ast>([^<]+)/s, pdfText),
      ansprechpartner_name: `${extractValue(/<Seite2_VornameVB>([^<]+)/s, pdfText)} ${extractValue(/<Seite2_NameVB>([^<]+)/s, pdfText)}`.trim(),
      ansprechpartner_funktion: extractValue(/<Seite2_FunktionVB>([^<]+)/s, pdfText),
      ansprechpartner_telefon: extractValue(/<Seite2_TelefonVB>([^<]+)/s, pdfText),
      ansprechpartner_email: extractValue(/<Seite2_MailVB>([^<]+)/s, pdfText),
    }

    // Mitarbeiter aus Anlage 6.1
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

    // Anlage 6.2 Lookup erstellen
    const a62Lookup: Record<string, { qual_gruppe: number; sum_pm: number; sum_pk: number; pm_pro_jahr: Record<number, number> }> = {}
    const a62Matches = pdfText.matchAll(/<cg_file_262_Zeile1_Anlage62>([\s\S]*?)<\/cg_file_262_Zeile1_Anlage62>/g)
    for (const match of a62Matches) {
      const block = match[1]
      const maId = extractValue(/<cg_VMS_PK_DdsId_261>([^<]+)/s, block)
      if (maId) {
        const pmProJahr: Record<number, number> = {}
        const jahreMatches = block.matchAll(/<cg_file_262_sub_UnterZeile\d+><cg_VMS_PK_iJahrZahl>(\d{4})<\/cg_VMS_PK_iJahrZahl><cg_VMS_PK_fPersMonat>([^<]+)<\/cg_VMS_PK_fPersMonat>/g)
        for (const jm of jahreMatches) {
          const jahr = parseInt(jm[1])
          const pm = parseFloat(jm[2]) || 0
          pmProJahr[jahr] = (pmProJahr[jahr] || 0) + pm
        }
        a62Lookup[maId] = {
          qual_gruppe: parseInt(extractValue(/<cg_VMS_PK_aQualGruppe>([^<]+)/s, block)) || 4,
          sum_pm: extractFloat(/<sum_pm>([^<]+)/s, block),
          sum_pk: extractFloat(/<sum_pk>([^<]+)/s, block),
          pm_pro_jahr: pmProJahr
        }
      }
    }

    // Anlage 6.1 Mitarbeiter
    const maMatches = pdfText.matchAll(/<Teilform_page13>([\s\S]*?)<\/Teilform_page13>/g)
    for (const match of maMatches) {
      const block = match[1]
      const maId = extractValue(/<cg_DdsId_261>([^<]+)/s, block)
      if (!maId) continue

      const a62Data = a62Lookup[maId] || { qual_gruppe: 4, sum_pm: 0, sum_pk: 0, pm_pro_jahr: {} }

      mitarbeiter.push({
        ma_nr: parseInt(maId),
        nachname: extractValue(/<cg_VMS_PM_aNachname>([^<]+)/s, block),
        vorname: extractValue(/<cg_VMS_PM_aVorname>([^<]+)/s, block),
        qualifikation: extractValue(/<cg_VMS_PM_aQualFachAusb>([^<]+)/s, block),
        qualifikation_gruppe: a62Data.qual_gruppe,
        geburtsdatum: extractValue(/<cg_VMS_PM_dGeburtsdatum>([^<]+)/s, block),
        funktion: extractValue(/<cg_VMS_PM_aFunktion>([^<]+)/s, block),
        angestellt_seit: extractValue(/<cg_VMS_PM_dAngestSeit>([^<]+)/s, block),
        jahresbrutto: extractFloat(/<Jahresbrutto>([^<]+)/s, block),
        stundensatz: extractFloat(/<std_satz>([^<]+)/s, block),
        wochenstunden: extractFloat(/<cg_VMS_PM_fWochArbeitsz>([^<]+)/s, block),
        teilzeitfaktor: extractFloat(/<cg_VMS_PM_fTeilzFaktor>([^<]+)/s, block) || 1.0,
        pm_gesamt: a62Data.sum_pm,
        kosten_gesamt: a62Data.sum_pk,
        pm_pro_jahr: a62Data.pm_pro_jahr,
      })
    }

    // Nach MA-Nr sortieren
    mitarbeiter.sort((a, b) => a.ma_nr - b.ma_nr)

    // Arbeitspakete aus Anlage 5
    const arbeitspakete: Array<{
      ap_nr: string
      beschreibung: string
      von: string
      bis: string
      ma_nr: number
      pm: number
    }> = []

    const apMatches = pdfText.matchAll(/<Zeile2><lfd>([^<]*)<\/lfd><ap>([^<]*)<\/ap><von>([^<]*)<\/von><bis>([^<]*)<\/bis><ma_nr>([^<]*)<\/ma_nr><pm>([^<]*)<\/pm><\/Zeile2>/g)
    let currentBeschreibung = ''
    for (const match of apMatches) {
      const [, lfd, ap, von, bis, ma_nr, pm] = match
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
      return NextResponse.json(
        { success: false, error: 'Konnte keine Projektdaten extrahieren. Ist dies ein ausgefüllter ZIM-Antrag?' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        projekt,
        antragsteller,
        mitarbeiter,
        arbeitspakete,
        parse_datum: new Date().toISOString(),
        quell_datei: file.name,
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
