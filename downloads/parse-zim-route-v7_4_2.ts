// src/app/api/parse-zim/route.ts
// Next.js API Route fuer ZIM PDF Parsing
// ============================================================================
// VERSION: v7.4.2 - DS-Support (Durchfuehrbarkeitsstudie: pm + pm2 Spalten)
// DATUM: 26. Februar 2026
//
// AENDERUNGEN v7.4.2:
//   - DS-Erkennung: Antrag_DS Marker im XFA-Text
//   - Dual-PM: pm (technisch) + pm2 (nicht-technisch) pro Zeile
//   - is_technical Flag pro Arbeitspaket
//   - Sub-AP Support: AP2.1, AP2.2 etc. korrekt als eigene APs
//   - funding_format: Automatisch ZIM_DS bei DS-Erkennung
//   - Index-basiertes Name-Mapping (Namen < lfd-Eintraege)
//   - Robuste Tag-Extraktion mit extractAllValues()
//
// BASIERT AUF: v7.0.4 (Standard-ZIM) + Python Parser v4.10 (DS-Logik)
// ============================================================================

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
  ap_sub_nummer: number | null
  ap_code: string
  name: string
  start_monat: number | null
  start_date: string | null
  ende_monat: number | null
  end_date: string | null
  gesamt_pm: number
  is_technical: boolean
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
  let allText = ''
  
  const streamRegex = /stream[\r\n]+/g
  
  let match
  const streamPositions: number[] = []
  
  while ((match = streamRegex.exec(buffer.toString('binary'))) !== null) {
    streamPositions.push(match.index + match[0].length)
  }
  
  for (const startPos of streamPositions) {
    const searchBuffer = buffer.slice(startPos, Math.min(startPos + 1000000, buffer.length))
    const endMatch = searchBuffer.toString('binary').indexOf('endstream')
    
    if (endMatch === -1) continue
    
    const streamData = buffer.slice(startPos, startPos + endMatch)
    
    try {
      const decompressed = inflateSync(streamData)
      const text = decompressed.toString('utf-8')
      
      if (text.includes('<xfa:') || text.includes('cg_VMS_') || text.includes('datasets')) {
        allText += text + '\n'
      }
    } catch {
      // Stream war nicht komprimiert oder anderes Format
    }
  }
  
  if (!allText) {
    allText = buffer.toString('latin1')
  }
  
  // Normalisiere Zeilenumbrueche in Tags
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
// HELPER: Alle Werte eines Tags extrahieren
// ============================================

function extractAllValues(tag: string, text: string): string[] {
  // Matches: <tag>value</tag> und <tag/>  (leer)
  // Sortiert nach Position im Text
  const results: Array<{ pos: number; value: string }> = []
  
  // Tags mit Wert: <tag>inhalt</tag> oder <tag\n>inhalt</tag>
  const valueRegex = new RegExp(`<${tag}[\\s\\n]*>([^<]*)</${tag}`, 'gi')
  let m
  while ((m = valueRegex.exec(text)) !== null) {
    results.push({ pos: m.index, value: (m[1] || '').trim() })
  }
  
  // Leere Self-Closing Tags: <tag/>
  const emptyRegex = new RegExp(`<${tag}[\\s\\n]*/>`, 'gi')
  while ((m = emptyRegex.exec(text)) !== null) {
    results.push({ pos: m.index, value: '' })
  }
  
  // Nach Position sortieren (wichtig fuer korrekte Zuordnung)
  results.sort((a, b) => a.pos - b.pos)
  
  return results.map(r => r.value)
}

// ============================================
// HELPER: AP-Nummer parsen (inkl. Sub-APs)
// ============================================

function parseApNumber(raw: string): { apNumber: number; apSubNumber: number | null } {
  const trimmed = (raw || '').trim()
  if (!trimmed) return { apNumber: 0, apSubNumber: null }
  
  // Format "2.1" -> apNumber=2, apSubNumber=1
  const dotMatch = trimmed.match(/^(\d+)\.(\d+)$/)
  if (dotMatch) {
    return {
      apNumber: parseInt(dotMatch[1]),
      apSubNumber: parseInt(dotMatch[2])
    }
  }
  
  // Format "2" -> apNumber=2, apSubNumber=null
  const intMatch = trimmed.match(/^(\d+)$/)
  if (intMatch) {
    return { apNumber: parseInt(intMatch[1]), apSubNumber: null }
  }
  
  return { apNumber: 0, apSubNumber: null }
}

function generateApCode(apNumber: number, apSubNumber: number | null): string {
  if (apSubNumber !== null) {
    return `AP${apNumber}.${apSubNumber}`
  }
  return `AP${apNumber}`
}

// ============================================
// HELPER: PM-Wert parsen
// ============================================

function parsePm(raw: string): number {
  if (!raw || !raw.trim()) return 0
  const cleaned = raw.trim().replace(',', '.')
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
    
    const hasXfa = pdfText.includes('xfa:data') || pdfText.includes('xfa:datasets')
    const hasCgVms = pdfText.includes('cg_VMS_')
    const hasSeite = pdfText.includes('Seite2_AST') || pdfText.includes('Seite2_')
    
    console.log(`XFA: ${hasXfa}, cg_VMS: ${hasCgVms}, Seite: ${hasSeite}`)
    
    if (!hasXfa && !hasCgVms && !hasSeite) {
      return NextResponse.json(
        { success: false, error: 'Keine XFA-Daten gefunden. Ist dies ein ausgefuellter ZIM-Antrag?' },
        { status: 400 }
      )
    }

    // ============================================
    // DS-ERKENNUNG (v7.4.2)
    // ============================================
    
    const isDS = pdfText.includes('Antrag_DS')
    const hasPm2Tag = /<pm2[\s\n]*>/.test(pdfText) || /<pm2[\s\n]*\/>/.test(pdfText)
    const isDualPm = isDS && hasPm2Tag
    
    console.log(`DS-Erkennung: isDS=${isDS}, hasPm2=${hasPm2Tag}, isDualPm=${isDualPm}`)

    // ============================================
    // PROJEKTDATEN
    // ============================================

    const projekt: ZimProjekt = {
      name: extractValue(/<cg_VMS_VB_Projekt>([^<]+)/, pdfText),
      kurzname: extractValue(/<cg_VMS_VB_KurzName>([^<]+)/, pdfText) ||
                extractValue(/<Kurzbezeichnung>([^<]+)/, pdfText),
      fkz: extractValue(/<cg_case_KENN_2>([^<]+)/, pdfText),
      start: extractValue(/<cg_VMS_VB_Beginn>([^<]+)/, pdfText),
      ende: extractValue(/<cg_VMS_VB_Ende>([^<]+)/, pdfText),
      foerderquote: extractFloat(/<cg_VMS_AD_F[^>]*rderquote>([^<]+)/, pdfText),
      gesamtkosten: extractFloat(/<cg_VMS_HB_A_Kosten>([^<]+)/, pdfText),
      zuwendung: extractFloat(/<cg_VMS_HB_A_ZuwendungFQ>([^<]+)/, pdfText),
      gesamt_pm: extractFloat(/<sum_ges_pm>([^<]+)/, pdfText),
      gesamt_pk: extractFloat(/<sum_ges_pk>([^<]+)/, pdfText),
      laufzeit_monate: 0,
    }

    // Kurzname ableiten falls leer
    if (!projekt.kurzname && projekt.name) {
      if (projekt.name.includes(':')) {
        projekt.kurzname = projekt.name.split(':')[0].trim()
      } else {
        projekt.kurzname = projekt.name.substring(0, 30).trim()
      }
    }

    // Laufzeit berechnen
    if (projekt.start && projekt.ende) {
      try {
        const parseDate = (str: string): Date | null => {
          if (str.match(/^\d{4}-\d{2}-\d{2}$/)) {
            return new Date(str)
          }
          const m = str.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
          if (m) {
            return new Date(parseInt(m[3]), parseInt(m[2]) - 1, parseInt(m[1]))
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
      firma: extractValue(/<Seite2_AST>([^<]+)/, pdfText) ||
             extractValue(/<cg_VMS_firma>([^<]+)/, pdfText),
      rechtsform: extractValue(/<cg_VMS_AD_Rechtsform>([^<]+)/, pdfText) ||
                  extractValue(/<cg_VMS_rechtsform>([^<]+)/, pdfText),
      strasse: extractValue(/<Strasse_Ast>([^<]+)/, pdfText) ||
               extractValue(/<cg_VMS_str>([^<]+)/, pdfText),
      plz: extractValue(/<PLZ_Ast>([^<]+)/, pdfText) ||
           extractValue(/<cg_VMS_plz>([^<]+)/, pdfText),
      ort: extractValue(/<Ort_Ast>([^<]+)/, pdfText) ||
           extractValue(/<cg_VMS_ort>([^<]+)/, pdfText),
      bundesland: extractValue(/<cg_VMS_AD_Bundesland>([^<]+)/, pdfText) ||
                  extractValue(/<Bundeslan_Ast>([^<]+)/, pdfText) ||
                  extractValue(/<cg_VMS_bundesland>([^<]+)/, pdfText),
      website: extractValue(/<website_Ast>([^<]+)/, pdfText) ||
               extractValue(/<cg_VMS_www>([^<]+)/, pdfText),
      ansprechpartner_name: `${extractValue(/<Seite2_VornameVB>([^<]+)/, pdfText)} ${extractValue(/<Seite2_NameVB>([^<]+)/, pdfText)}`.trim() ||
                            extractValue(/<Seite4_NameBefugter>([^<]+)/, pdfText) ||
                            extractValue(/<cg_VMS_AP_name>([^<]+)/, pdfText),
      ansprechpartner_funktion: extractValue(/<Seite2_FunktionVB>([^<]+)/, pdfText) ||
                                extractValue(/<cg_VMS_AP_funktion>([^<]+)/, pdfText),
      ansprechpartner_telefon: extractValue(/<Seite2_TelefonVB>([^<]+)/, pdfText) ||
                               extractValue(/<cg_VMS_AP_tel>([^<]+)/, pdfText),
      ansprechpartner_email: extractValue(/<Seite2_MailVB>([^<]+)/, pdfText) ||
                             extractValue(/<cg_VMS_AP_mail>([^<]+)/, pdfText),
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
    // ARBEITSPAKETE (v7.4.2 - mit DS-Support)
    // ============================================

    const arbeitspakete: ZimArbeitspaket[] = []

    // Alle Tag-Werte extrahieren
    const lfdValues = extractAllValues('lfd', pdfText)
    const apNames = extractAllValues('ap', pdfText)
    const pmValues = extractAllValues('pm', pdfText)
    const pm2Values = isDualPm ? extractAllValues('pm2', pdfText) : []
    const maNrValues = extractAllValues('ma_nr', pdfText)
    const vonValues = extractAllValues('von', pdfText)
    const bisValues = extractAllValues('bis', pdfText)
    
    console.log(`AP-Tags: ${lfdValues.length} lfd, ${apNames.length} ap, ${pmValues.length} pm, ${pm2Values.length} pm2, ${maNrValues.length} ma_nr`)
    
    // Die Anzahl der Detail-Zeilen = Anzahl ma_nr Werte
    // (lfd und pm koennen mehr Eintraege haben wegen Summen-Zeilen)
    const numDetailRows = maNrValues.length
    
    // --- Schritt 1: AP-Nummern zu Namen zuordnen ---
    // Bei DS: es gibt weniger ap-Namen als lfd-Werte (21 Namen vs 38 lfd)
    // Index-basiertes Mapping: nur die ersten numDetailRows lfd-Werte verwenden
    
    const nummerZuName: Map<string, string> = new Map()
    let nameIdx = 0
    
    for (let i = 0; i < Math.min(lfdValues.length, numDetailRows); i++) {
      const nr = lfdValues[i].trim()
      if (!nr) continue
      
      if (!nummerZuName.has(nr) && nameIdx < apNames.length) {
        const name = (apNames[nameIdx] || '').trim()
        if (name && name.length >= 2) {
          nummerZuName.set(nr, name)
        }
        nameIdx++
      }
    }
    
    console.log(`AP-Namen: ${nummerZuName.size} zugeordnet`)

    // --- Schritt 2: Zeilen verarbeiten ---
    // Verwende nur die Detail-Zeilen (erste numDetailRows Eintraege)
    
    const apTempMap: Map<string, {
      apNumber: number
      apSubNumber: number | null
      apCode: string
      name: string
      startDate: string | null
      endDate: string | null
      isTechnical: boolean
      zuordnungen: Array<{ ma_nr: number; pm: number }>
    }> = new Map()

    for (let i = 0; i < numDetailRows; i++) {
      const lfdRaw = i < lfdValues.length ? lfdValues[i] : ''
      const { apNumber, apSubNumber } = parseApNumber(lfdRaw)
      
      if (apNumber === 0) continue
      
      const apCode = generateApCode(apNumber, apSubNumber)
      const maNrRaw = maNrValues[i] || ''
      const maNr = parseInt(maNrRaw) || 0
      const hasMaNr = maNr > 0
      
      // PM-Wert bestimmen (inkl. DS Dual-PM)
      const pmRaw = i < pmValues.length ? pmValues[i] : ''
      const pm2Raw = isDualPm && i < pm2Values.length ? pm2Values[i] : ''
      
      let rowPm = 0
      let rowIsTechnical = false
      
      if (isDualPm) {
        // DS: pm = technisch, pm2 = nicht-technisch
        const pmVal = parsePm(pmRaw)
        const pm2Val = parsePm(pm2Raw)
        
        if (pmVal > 0 && pm2Val === 0) {
          rowIsTechnical = true
          rowPm = pmVal
        } else if (pm2Val > 0 && pmVal === 0) {
          rowIsTechnical = false
          rowPm = pm2Val
        } else if (pmVal > 0 && pm2Val > 0) {
          // Beide Spalten gefuellt - technisch bevorzugen
          rowIsTechnical = true
          rowPm = pmVal + pm2Val
        } else {
          // Beide leer - Ueberschriftszeile
          rowIsTechnical = false
          rowPm = 0
        }
      } else {
        // Standard-ZIM: nur pm, default nicht-technisch (wird bei Einzelprojekt nicht unterschieden)
        rowPm = parsePm(pmRaw)
        rowIsTechnical = false
      }
      
      const von = vonValues[i] || null
      const bis = bisValues[i] || null
      const name = nummerZuName.get(lfdRaw.trim()) || ''

      // Keine MA-Nr = Ueberschriftszeile (z.B. AP2 als Header fuer AP2.1, AP2.2)
      if (!hasMaNr) {
        if (!apTempMap.has(apCode) && name) {
          apTempMap.set(apCode, {
            apNumber,
            apSubNumber,
            apCode,
            name,
            startDate: null,
            endDate: null,
            isTechnical: rowIsTechnical,
            zuordnungen: []
          })
        }
        continue
      }

      // MIT MA-Nr = echtes AP oder weitere Zuordnung
      if (!apTempMap.has(apCode)) {
        if (!name) continue  // Kein Name gefunden, ueberspringen
        
        apTempMap.set(apCode, {
          apNumber,
          apSubNumber,
          apCode,
          name,
          startDate: von,
          endDate: bis,
          isTechnical: rowIsTechnical,
          zuordnungen: rowPm > 0 ? [{ ma_nr: maNr, pm: rowPm }] : []
        })
      } else {
        // AP existiert schon - Mitarbeiter-Zuordnung hinzufuegen
        const existing = apTempMap.get(apCode)!
        if (rowPm > 0) {
          existing.zuordnungen.push({ ma_nr: maNr, pm: rowPm })
        }
        if (!existing.startDate && von) existing.startDate = von
        if (!existing.endDate && bis) existing.endDate = bis
      }
    }

    // --- Schritt 3: Ergebnis zusammenbauen ---
    for (const [, apData] of apTempMap) {
      const gesamtPm = apData.zuordnungen.reduce((sum, z) => sum + z.pm, 0)
      
      // Start/Ende als Monat berechnen (fuer Rueckwaertskompatibilitaet)
      let startMonat: number | null = null
      let endeMonat: number | null = null
      if (apData.startDate && projekt.start) {
        try {
          const projStart = new Date(projekt.start.includes('.') ? 
            projekt.start.split('.').reverse().join('-') : projekt.start)
          const apStart = new Date(apData.startDate.includes('.') ?
            apData.startDate.split('.').reverse().join('-') : apData.startDate)
          startMonat = (apStart.getFullYear() - projStart.getFullYear()) * 12 +
                       (apStart.getMonth() - projStart.getMonth()) + 1
        } catch { /* ignore */ }
      }
      if (apData.endDate && projekt.start) {
        try {
          const projStart = new Date(projekt.start.includes('.') ?
            projekt.start.split('.').reverse().join('-') : projekt.start)
          const apEnd = new Date(apData.endDate.includes('.') ?
            apData.endDate.split('.').reverse().join('-') : apData.endDate)
          endeMonat = (apEnd.getFullYear() - projStart.getFullYear()) * 12 +
                      (apEnd.getMonth() - projStart.getMonth()) + 1
        } catch { /* ignore */ }
      }
      
      arbeitspakete.push({
        ap_nummer: apData.apNumber,
        ap_sub_nummer: apData.apSubNumber,
        ap_code: apData.apCode,
        name: apData.name,
        start_monat: startMonat,
        start_date: apData.startDate,
        ende_monat: endeMonat,
        end_date: apData.endDate,
        gesamt_pm: Math.round(gesamtPm * 100) / 100,
        is_technical: apData.isTechnical,
        mitarbeiter_zuordnungen: apData.zuordnungen
      })
    }

    // Sortieren: erst ap_nummer, dann ap_sub_nummer
    arbeitspakete.sort((a, b) => {
      if (a.ap_nummer !== b.ap_nummer) return a.ap_nummer - b.ap_nummer
      return (a.ap_sub_nummer || 0) - (b.ap_sub_nummer || 0)
    })

    // Gesamt-PM aus APs berechnen falls nicht aus PDF vorhanden
    if (!projekt.gesamt_pm) {
      projekt.gesamt_pm = arbeitspakete.reduce((sum, ap) => sum + ap.gesamt_pm, 0)
    }

    // ============================================
    // VALIDIERUNG
    // ============================================

    if (!projekt.kurzname && !projekt.name && !antragsteller.firma) {
      return NextResponse.json(
        { success: false, error: 'Konnte keine Projektdaten extrahieren. Ist dies ein ausgefuellter ZIM-Antrag?' },
        { status: 400 }
      )
    }

    // ============================================
    // FUNDING FORMAT BESTIMMEN (v7.4.2)
    // ============================================
    
    let fundingFormat = 'ZIM'
    if (isDS) {
      fundingFormat = 'ZIM_DS'
    }
    // TODO: Kooperation/Netzwerk Erkennung ergaenzen

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
        funding_format: fundingFormat,
        is_ds: isDS,
        parse_datum: new Date().toISOString(),
        quell_datei: file.name,
        statistik: {
          anzahl_mitarbeiter: mitarbeiter.length,
          anzahl_arbeitspakete: arbeitspakete.length,
          gesamt_pm: projekt.gesamt_pm || mitarbeiter.reduce((sum, m) => sum + m.pm_gesamt, 0),
          gesamt_pk: projekt.gesamt_pk,
          laufzeit_monate: projekt.laufzeit_monate,
          aps_technisch: arbeitspakete.filter(ap => ap.is_technical && ap.gesamt_pm > 0).length,
          aps_nicht_technisch: arbeitspakete.filter(ap => !ap.is_technical && ap.gesamt_pm > 0).length,
          pm_technisch: Math.round(arbeitspakete.filter(ap => ap.is_technical).reduce((s, ap) => s + ap.gesamt_pm, 0) * 100) / 100,
          pm_nicht_technisch: Math.round(arbeitspakete.filter(ap => !ap.is_technical).reduce((s, ap) => s + ap.gesamt_pm, 0) * 100) / 100,
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
