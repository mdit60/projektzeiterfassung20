// app/api/reports/fzul-stundennachweis/route.ts
// API Route fÃ¼r BMF FZul Stundennachweis Export (JÃ¤hrlich) - pdf-lib Version
// Pure Node.js - keine externen Font-Dateien nÃ¶tig

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

// Konstanten
const WEEKDAYS_DE = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
const MONTHS_DE = ['Jan', 'Feb', 'MÃ¤r', 'Apr', 'Mai', 'Jun',
                   'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']

// Farben (RGB 0-1)
const HEADER_GRAY = rgb(0.85, 0.85, 0.85)
const LIGHT_GRAY = rgb(0.92, 0.92, 0.92)
const LIGHT_GREEN = rgb(0.78, 0.94, 0.81)
const RED = rgb(1, 0, 0)
const BLACK = rgb(0, 0, 0)
const DARK_GRAY = rgb(0.4, 0.4, 0.4)

function getGermanHolidays(year: number, stateCode: string): Map<string, string> {
  const holidays = new Map<string, string>()
  
  const dateStr = (y: number, m: number, d: number) => 
    `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  
  // FESTE FEIERTAGE (bundesweit)
  holidays.set(dateStr(year, 1, 1), 'Neuj.')
  holidays.set(dateStr(year, 5, 1), 'TdA')
  holidays.set(dateStr(year, 10, 3), 'TDE')
  holidays.set(dateStr(year, 12, 25), '1.WT')
  holidays.set(dateStr(year, 12, 26), '2.WT')
  
  // HEILIGE DREI KÃ–NIGE (6. Januar) - BW, BY, ST
  if (['BW', 'BY', 'ST'].includes(stateCode)) {
    holidays.set(dateStr(year, 1, 6), 'Hl.3K.')
  }
  
  // INTERNATIONALER FRAUENTAG (8. MÃ¤rz) - BE, MV
  if (['BE', 'MV'].includes(stateCode)) {
    holidays.set(dateStr(year, 3, 8), 'Frau.')
  }
  
  // Ostersonntag berechnen (Gauss-Algorithmus)
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  const easter = new Date(year, month - 1, day)
  
  const addDays = (d: Date, days: number) => {
    const result = new Date(d)
    result.setDate(result.getDate() + days)
    return dateStr(result.getFullYear(), result.getMonth() + 1, result.getDate())
  }
  
  // BEWEGLICHE FEIERTAGE (bundesweit)
  holidays.set(addDays(easter, -2), 'Karfr.')
  holidays.set(addDays(easter, 0), 'OS')
  holidays.set(addDays(easter, 1), 'OM')
  holidays.set(addDays(easter, 39), 'Chr.Hi')
  holidays.set(addDays(easter, 49), 'PM')
  holidays.set(addDays(easter, 50), 'PfM')
  
  // FRONLEICHNAM - BW, BY, HE, NW, RP, SL, SN, TH
  if (['BW', 'BY', 'HE', 'NW', 'RP', 'SL', 'SN', 'TH'].includes(stateCode)) {
    holidays.set(addDays(easter, 60), 'Fronl.')
  }
  
  // MARIÃ„ HIMMELFAHRT (15. August) - SL, BY
  if (['SL', 'BY'].includes(stateCode)) {
    holidays.set(dateStr(year, 8, 15), 'Mar.Hi')
  }
  
  // WELTKINDERTAG (20. September) - TH
  if (stateCode === 'TH') {
    holidays.set(dateStr(year, 9, 20), 'WKT')
  }
  
  // REFORMATIONSTAG (31. Oktober) - BB, HB, HH, MV, NI, SN, ST, SH, TH
  if (['BB', 'HB', 'HH', 'MV', 'NI', 'SN', 'ST', 'SH', 'TH'].includes(stateCode)) {
    holidays.set(dateStr(year, 10, 31), 'Ref.')
  }
  
  // ALLERHEILIGEN (1. November) - BW, BY, NW, RP, SL
  if (['BW', 'BY', 'NW', 'RP', 'SL'].includes(stateCode)) {
    holidays.set(dateStr(year, 11, 1), 'Allerh.')
  }
  
  // BUSS- UND BETTAG - SN
  if (stateCode === 'SN') {
    const nov23 = new Date(year, 10, 23)
    let daysSinceWed = (nov23.getDay() - 3 + 7) % 7
    if (daysSinceWed === 0) daysSinceWed = 7
    const bussBettag = new Date(year, 10, 23 - daysSinceWed)
    holidays.set(dateStr(bussBettag.getFullYear(), bussBettag.getMonth() + 1, bussBettag.getDate()), 'BuB')
  }
  
  return holidays
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

function getBundeslandName(stateCode: string): string {
  const map: Record<string, string> = {
    'BW': 'Baden-WÃ¼rttemberg', 'BY': 'Bayern', 'BE': 'Berlin', 'BB': 'Brandenburg',
    'HB': 'Bremen', 'HH': 'Hamburg', 'HE': 'Hessen', 'MV': 'Mecklenburg-Vorpommern',
    'NI': 'Niedersachsen', 'NW': 'Nordrhein-Westfalen', 'RP': 'Rheinland-Pfalz',
    'SL': 'Saarland', 'SN': 'Sachsen', 'ST': 'Sachsen-Anhalt', 'SH': 'Schleswig-Holstein',
    'TH': 'ThÃ¼ringen'
  }
  return map[stateCode] || stateCode
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }
    
    const body = await request.json()
    const {
      userId,
      projectId,
      year,
      kurzbezeichnungVorhaben,
      vorhabenId,
      kurzbezeichnungFueTaetigkeit,
      monateFue = 12
    } = body
    
    if (!userId || !year) {
      return NextResponse.json({ error: 'userId und year sind erforderlich' }, { status: 400 })
    }
    
    // Mitarbeiter-Daten laden
    const { data: userProfile, error: userError } = await supabase
      .from('user_profiles')
      .select(`*, companies (name, state_code)`)
      .eq('id', userId)
      .single()
    
    if (userError || !userProfile) {
      return NextResponse.json({ error: 'Mitarbeiter nicht gefunden' }, { status: 404 })
    }
    
    // ZeiteintrÃ¤ge fÃ¼r das Jahr laden
    const { data: timeEntries, error: timeError } = await supabase
      .from('time_entries')
      .select('*')
      .eq('user_profile_id', userId)
      .eq('year', year)
      .order('entry_date')
    
    if (timeError) {
      return NextResponse.json({ error: 'Fehler beim Laden der ZeiteintrÃ¤ge' }, { status: 500 })
    }
    
    // Filter auf Projekt wenn angegeben
    const filteredEntries = projectId 
      ? timeEntries?.filter(e => e.project_id === projectId && e.category === 'project_work')
      : timeEntries?.filter(e => e.category === 'project_work')
    
    // TÃ¤gliche Stunden berechnen
    const dailyHours: Record<string, number> = {}
    filteredEntries?.forEach(entry => {
      const dateStr = entry.entry_date
      dailyHours[dateStr] = (dailyHours[dateStr] || 0) + (Number(entry.hours) || 0)
    })
    
    // Monatliche Stunden berechnen
    const monthlyHours: Record<number, number> = {}
    for (let m = 1; m <= 12; m++) monthlyHours[m] = 0
    
    filteredEntries?.forEach(entry => {
      const month = new Date(entry.entry_date).getMonth() + 1
      monthlyHours[month] += Number(entry.hours) || 0
    })
    
    // Urlaubs- und Krankheitstage zÃ¤hlen
    let urlaubstage = 0
    let krankheitstage = 0
    
    timeEntries?.forEach(entry => {
      if (entry.category === 'vacation') urlaubstage += (Number(entry.hours) || 0) / 8
      else if (entry.category === 'sick_leave') krankheitstage += (Number(entry.hours) || 0) / 8
    })
    
    const stateCode = (userProfile.companies?.state_code || 'DE').replace('DE-', '')
    const woechentlicheArbeitszeit = userProfile.weekly_hours || 40
    const holidays = getGermanHolidays(year, stateCode)
    
    // PDF erstellen mit pdf-lib
    const pdfDoc = await PDFDocument.create()
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    const helveticaOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique)
    
    // Seite 1: Kalender (A4 Querformat)
    const page1 = pdfDoc.addPage([841.89, 595.28]) // A4 landscape
    const { width, height } = page1.getSize()
    
    // MaÃŸe
    const margin = 20
    const colMonth = 32  // Noch schmaler, "Monat" passt gerade rein
    const colDay = 21
    const colSum = 30
    const colSign = 83  // Noch breiter fÃ¼r MA/PM Unterschriften
    const rowHeight = 15  // HÃ¶her fÃ¼r bessere Lesbarkeit
    const fontSize = 6
    const fontSizeSmall = 5
    
    // Tabelle zentrieren
    const tableWidth = colMonth + (31 * colDay) + colSum + colSign  // 32 + 651 + 30 + 83 = 796
    const tableStartX = (width - tableWidth) / 2  // Zentriert
    
    let y = height - margin
    
    // ==========================================
    // HEADER - größer und mit mehr Abstand
    // ==========================================
    page1.drawRectangle({
      x: margin,
      y: y - 22,
      width: width - 2 * margin,
      height: 22,
      color: HEADER_GRAY,
    })
    
    page1.drawText('Stundenaufzeichnung für FuE-Tätigkeiten in einem FuE-Vorhaben', {
      x: margin + 5,
      y: y - 16,
      size: 12,
      font: helveticaBold,
      color: BLACK,
    })
    
    y -= 38
    
    // ==========================================
    // VORHABEN-INFO - größere Schrift und mehr Abstand
    // ==========================================
    const labelSize = 9
    const valueSize = 9
    const fieldHeight = 16
    
    page1.drawText('Kurzbezeichnung des FuE-Vorhabens:', { x: margin, y, size: labelSize, font: helvetica })
    page1.drawRectangle({ x: 210, y: y - 4, width: 220, height: fieldHeight, borderColor: BLACK, borderWidth: 0.5 })
    page1.drawText(kurzbezeichnungVorhaben || '', { x: 215, y: y, size: valueSize, font: helvetica })
    
    page1.drawText('Wirtschaftsjahr:', { x: 480, y, size: labelSize, font: helvetica })
    page1.drawRectangle({ x: 560, y: y - 4, width: 70, height: fieldHeight, borderColor: BLACK, borderWidth: 0.5 })
    page1.drawText(String(year), { x: 575, y: y, size: 12, font: helveticaBold })
    
    y -= 24
    page1.drawText('Vorhaben-ID des FuE-Vorhabens:', { x: margin, y, size: labelSize, font: helvetica })
    page1.drawRectangle({ x: 210, y: y - 4, width: 220, height: fieldHeight, borderColor: BLACK, borderWidth: 0.5 })
    page1.drawText(vorhabenId || '', { x: 215, y: y, size: valueSize, font: helvetica })
    
    page1.drawText('Bundesland:', { x: 480, y, size: labelSize, font: helvetica })
    page1.drawRectangle({ x: 560, y: y - 4, width: 180, height: fieldHeight, borderColor: BLACK, borderWidth: 0.5 })
    page1.drawText(getBundeslandName(stateCode), { x: 565, y: y, size: valueSize, font: helvetica })
    
    y -= 28
    page1.drawText('Angaben zum im FuE-Vorhaben unmittelbar mit FuE-Aktivitäten beschäftigten Arbeitnehmer:', {
      x: margin, y, size: 8, font: helvetica
    })
    
    y -= 20
    page1.drawText('Name:', { x: margin, y, size: labelSize, font: helvetica })
    page1.drawRectangle({ x: 55, y: y - 4, width: 100, height: fieldHeight, borderColor: BLACK, borderWidth: 0.5 })
    page1.drawText(userProfile.last_name || '', { x: 60, y: y, size: valueSize, font: helvetica })
    
    page1.drawText('Vorname:', { x: 170, y, size: labelSize, font: helvetica })
    page1.drawRectangle({ x: 220, y: y - 4, width: 100, height: fieldHeight, borderColor: BLACK, borderWidth: 0.5 })
    page1.drawText(userProfile.first_name || '', { x: 225, y: y, size: valueSize, font: helvetica })
    
    page1.drawText('Kurzbezeichnung der FuE-Tätigkeit:', { x: 340, y, size: labelSize, font: helvetica })
    page1.drawRectangle({ x: 500, y: y - 4, width: 240, height: fieldHeight, borderColor: BLACK, borderWidth: 0.5 })
    page1.drawText(kurzbezeichnungFueTaetigkeit || userProfile.position || '', { x: 505, y: y, size: valueSize, font: helvetica })
    
    y -= 28
    
    // ==========================================
    // KALENDER-TABELLE
    // ==========================================
    const tableStartY = y
    
    // Header Zeile 1: Monat + Dokumentation + insg. + BestÃ¤tigung
    page1.drawRectangle({ x: tableStartX, y: y - rowHeight * 3, width: colMonth, height: rowHeight * 3, color: HEADER_GRAY, borderColor: BLACK, borderWidth: 0.5 })
    const monatHeaderWidth = helveticaBold.widthOfTextAtSize('Monat', fontSize)
    // "Monat" vertikal in der Mitte der 3 Zeilen
    page1.drawText('Monat', { x: tableStartX + (colMonth - monatHeaderWidth) / 2, y: y - rowHeight * 1.5 - (fontSize / 2), size: fontSize, font: helveticaBold })
    
    let x = tableStartX + colMonth
    const daysWidth = colDay * 31
    page1.drawRectangle({ x, y: y - rowHeight * 3, width: daysWidth, height: rowHeight * 3, color: HEADER_GRAY, borderColor: BLACK, borderWidth: 0.5 })
    // Erste Zeile vertikal zentriert
    page1.drawText('Dokumentation der Arbeitsstunden fÃ¼r FuE-TÃ¤tigkeiten im FuE-Vorhaben', { x: x + 5, y: y - rowHeight + (rowHeight - fontSize) / 2, size: fontSize, font: helveticaBold })
    // Zweite Zeile vertikal zentriert
    page1.drawText('je Arbeitstag', { x: x + 5, y: y - rowHeight * 2 + (rowHeight - fontSize) / 2, size: fontSize, font: helvetica })
    
    // Tag-Nummern - vertikal zentriert in dritter Zeile
    for (let d = 1; d <= 31; d++) {
      const cellX = x + (d - 1) * colDay
      page1.drawLine({ start: { x: cellX, y: y - rowHeight * 2 }, end: { x: cellX, y: y - rowHeight * 3 }, thickness: 0.5 })
      page1.drawText(String(d), { x: cellX + colDay / 2 - 3, y: y - rowHeight * 3 + (rowHeight - fontSizeSmall) / 2, size: fontSizeSmall, font: helveticaBold })
    }
    
    x = tableStartX + colMonth + daysWidth
    page1.drawRectangle({ x, y: y - rowHeight * 3, width: colSum, height: rowHeight * 3, color: HEADER_GRAY, borderColor: BLACK, borderWidth: 0.5 })
    // "insg." vertikal in der Mitte der 3 Zeilen
    const insgWidth = helveticaBold.widthOfTextAtSize('insg.', fontSize)
    page1.drawText('insg.', { x: x + (colSum - insgWidth) / 2, y: y - rowHeight * 1.5 - (fontSize / 2), size: fontSize, font: helveticaBold })
    
    x += colSum
    page1.drawRectangle({ x, y: y - rowHeight * 3, width: colSign, height: rowHeight * 3, color: HEADER_GRAY, borderColor: BLACK, borderWidth: 0.5 })
    // "BestÃ¤tigung" in erster Zeile zentriert
    const bestWidth = helveticaBold.widthOfTextAtSize('BestÃ¤tigung', fontSizeSmall)
    page1.drawText('BestÃ¤tigung', { x: x + (colSign - bestWidth) / 2, y: y - rowHeight + (rowHeight - fontSizeSmall) / 2, size: fontSizeSmall, font: helveticaBold })
    // Legende vertikal zentriert in zweiter und dritter Zeile
    page1.drawText('MA = Mitarbeiter', { x: x + 3, y: y - rowHeight * 2 + (rowHeight - 4) / 2, size: 4, font: helvetica, color: DARK_GRAY })
    page1.drawText('PM = Projektmgr.', { x: x + 3, y: y - rowHeight * 3 + (rowHeight - 4) / 2, size: 4, font: helvetica, color: DARK_GRAY })
    
    y -= rowHeight * 3
    
    // Monatszeilen
    for (let monthIdx = 0; monthIdx < 12; monthIdx++) {
      const monthNum = monthIdx + 1
      const days = daysInMonth(year, monthNum)
      
      // Monat-Zelle (Ã¼ber 2 Zeilen), Text zentriert
      page1.drawRectangle({ x: tableStartX, y: y - rowHeight * 2, width: colMonth, height: rowHeight * 2, color: HEADER_GRAY, borderColor: BLACK, borderWidth: 0.5 })
      const monthText = MONTHS_DE[monthIdx]
      const monthTextWidth = helvetica.widthOfTextAtSize(monthText, fontSize)
      // Vertikal zentriert in 2-Zeilen-HÃ¶he
      page1.drawText(monthText, { x: tableStartX + (colMonth - monthTextWidth) / 2, y: y - rowHeight - (fontSize / 2), size: fontSize, font: helvetica })
      
      // Tages-Zellen
      x = tableStartX + colMonth
      for (let d = 1; d <= 31; d++) {
        const cellX = x + (d - 1) * colDay
        const dateStr = `${year}-${String(monthNum).padStart(2, '0')}-${String(d).padStart(2, '0')}`
        const date = new Date(year, monthNum - 1, d)
        const isWeekend = d <= days && (date.getDay() === 0 || date.getDay() === 6)
        const isHoliday = holidays.has(dateStr)
        const holidayName = holidays.get(dateStr)
        
        // Hintergrundfarbe
        let bgColor = undefined
        if (d <= days && (isWeekend || isHoliday)) {
          bgColor = LIGHT_GRAY
        }
        
        // Zeile 1: Wochentag
        page1.drawRectangle({ 
          x: cellX, y: y - rowHeight, width: colDay, height: rowHeight, 
          color: bgColor, borderColor: BLACK, borderWidth: 0.3 
        })
        
        // Zeile 2: Stunden
        page1.drawRectangle({ 
          x: cellX, y: y - rowHeight * 2, width: colDay, height: rowHeight, 
          color: bgColor, borderColor: BLACK, borderWidth: 0.3 
        })
        
        if (d <= days) {
          // Wochentag oder Feiertag - vertikal zentriert
          // Sonntag (getDay() === 0) und Feiertage in Rot, Samstag in Grau
          const isSunday = date.getDay() === 0
          const isSaturday = date.getDay() === 6
          const textColor = (isHoliday || isSunday) ? RED : (isSaturday ? DARK_GRAY : BLACK)
          const font = (isHoliday || isWeekend) ? helveticaOblique : helvetica
          const dayText = isHoliday ? holidayName! : WEEKDAYS_DE[date.getDay() === 0 ? 6 : date.getDay() - 1]
          
          // Horizontal und vertikal zentriert
          const dayTextDisplay = dayText.substring(0, 5)
          const dayTextWidth = font.widthOfTextAtSize(dayTextDisplay, fontSizeSmall)
          page1.drawText(dayTextDisplay, { 
            x: cellX + (colDay - dayTextWidth) / 2, y: y - rowHeight + (rowHeight - fontSizeSmall) / 2, size: fontSizeSmall, font, color: textColor 
          })
          
          // Stunden - horizontal und vertikal zentriert
          const hours = dailyHours[dateStr] || 0
          if (hours > 0) {
            const hourText = hours === Math.floor(hours) ? String(hours) : hours.toFixed(1)
            const hourTextWidth = helvetica.widthOfTextAtSize(hourText, fontSize)
            page1.drawText(hourText, { x: cellX + (colDay - hourTextWidth) / 2, y: y - rowHeight * 2 + (rowHeight - fontSize) / 2, size: fontSize, font: helvetica })
          }
        }
      }
      
      // insg. (Ã¼ber 2 Zeilen) - vertikal zentriert
      x = tableStartX + colMonth + daysWidth
      page1.drawRectangle({ x, y: y - rowHeight * 2, width: colSum, height: rowHeight * 2, borderColor: BLACK, borderWidth: 0.5 })
      const sumText = String(Math.round(monthlyHours[monthNum] || 0))
      const sumTextWidth = helvetica.widthOfTextAtSize(sumText, fontSize)
      page1.drawText(sumText, { x: x + (colSum - sumTextWidth) / 2, y: y - rowHeight - (fontSize / 2), size: fontSize, font: helvetica })
      
      // BestÃ¤tigung (Ã¼ber 2 Zeilen) mit MA und PM - vertikal zentriert in jeder HÃ¤lfte
      x += colSum
      page1.drawRectangle({ x, y: y - rowHeight * 2, width: colSign, height: rowHeight * 2, borderColor: BLACK, borderWidth: 0.5 })
      // Horizontale Trennlinie in der Mitte
      page1.drawLine({ start: { x: x, y: y - rowHeight }, end: { x: x + colSign, y: y - rowHeight }, thickness: 0.3, color: DARK_GRAY })
      // MA oben - vertikal zentriert in oberer HÃ¤lfte
      page1.drawText('MA:', { x: x + 3, y: y - rowHeight + (rowHeight - 5) / 2, size: 5, font: helvetica, color: DARK_GRAY })
      // PM unten - vertikal zentriert in unterer HÃ¤lfte
      page1.drawText('PM:', { x: x + 3, y: y - rowHeight * 2 + (rowHeight - 5) / 2, size: 5, font: helvetica, color: DARK_GRAY })
      
      y -= rowHeight * 2
    }
    
    // Summenzeile
    const totalHours = Object.values(monthlyHours).reduce((sum, h) => sum + h, 0)
    page1.drawRectangle({ x: tableStartX, y: y - rowHeight, width: colMonth + daysWidth, height: rowHeight, color: HEADER_GRAY, borderColor: BLACK, borderWidth: 0.5 })
    page1.drawText('Summe der Arbeitsstunden fÃ¼r FuE-TÃ¤tigkeiten im FuE-Vorhaben:', { 
      x: tableStartX + colMonth + daysWidth - 220, y: y - rowHeight + (rowHeight - fontSize) / 2, size: fontSize, font: helveticaBold 
    })
    
    x = tableStartX + colMonth + daysWidth
    page1.drawRectangle({ x, y: y - rowHeight, width: colSum, height: rowHeight, color: HEADER_GRAY, borderColor: BLACK, borderWidth: 0.5 })
    const totalText = String(Math.round(totalHours))
    const totalTextWidth = helveticaBold.widthOfTextAtSize(totalText, fontSize)
    page1.drawText(totalText, { x: x + (colSum - totalTextWidth) / 2, y: y - rowHeight + (rowHeight - fontSize) / 2, size: fontSize, font: helveticaBold })
    
    x += colSum
    page1.drawRectangle({ x, y: y - rowHeight, width: colSign, height: rowHeight, color: HEADER_GRAY, borderColor: BLACK, borderWidth: 0.5 })
    
    // ==========================================
    // SEITE 2: Berechnungen
    // ==========================================
    const page2 = pdfDoc.addPage([841.89, 595.28])
    y = height - margin
    
    // Header Seite 2
    page2.drawText(`FuE-Stundennachweis ${userProfile.first_name} ${userProfile.last_name} - ${kurzbezeichnungVorhaben || 'FuE-Vorhaben'} - ${year}`, {
      x: margin, y, size: 9, font: helveticaBold
    })
    
    y -= 30
    
    // 1. Ermittlung Jahresarbeitszeit
    page2.drawText('1. Ermittlung der maÃŸgeblichen vereinbarten Jahresarbeitszeit', { x: margin, y, size: 8, font: helveticaBold })
    page2.drawLine({ start: { x: margin, y: y - 3 }, end: { x: 320, y: y - 3 }, thickness: 0.5 })
    
    y -= 20
    page2.drawText('wÃ¶chentliche Arbeitszeit:', { x: margin, y, size: 7, font: helvetica })
    page2.drawRectangle({ x: 130, y: y - 3, width: 40, height: 12, borderColor: BLACK, borderWidth: 0.5 })
    page2.drawText(String(woechentlicheArbeitszeit), { x: 140, y, size: 7, font: helvetica })
    page2.drawText('Stunden', { x: 175, y, size: 7, font: helvetica })
    
    page2.drawText('Jahresarbeitsstunden (wÃ¶chentliche Arbeitszeit x 52 Wochen)', { x: 280, y, size: 7, font: helvetica })
    page2.drawRectangle({ x: 530, y: y - 3, width: 50, height: 12, borderColor: BLACK, borderWidth: 0.5 })
    page2.drawText(String(woechentlicheArbeitszeit * 52), { x: 540, y, size: 7, font: helvetica })
    page2.drawText('Stunden', { x: 585, y, size: 7, font: helvetica })
    
    // AbzÃ¼ge
    const urlaubstageRound = Math.round(urlaubstage) || 30
    const krankheitstageRound = Math.round(krankheitstage) || 0
    const feiertage = 8
    
    const abzuege = [
      ['Arbeitsvertraglich vereinbarter Urlaubsanspruch', urlaubstageRound],
      ['Krankheitstage', krankheitstageRound],
      ['Sonderurlaub', 0],
      ['Gesetzliche Feiertage', feiertage],
      ['Kurzarbeit, Erziehungsurlaub u. Ã¤.', 0]
    ]
    
    y -= 18
    page2.drawText('Abzgl.', { x: 50, y, size: 7, font: helvetica })
    
    for (const [label, tage] of abzuege) {
      page2.drawText(String(label), { x: 90, y, size: 7, font: helvetica })
      page2.drawRectangle({ x: 280, y: y - 3, width: 30, height: 12, borderColor: BLACK, borderWidth: 0.5 })
      page2.drawText(String(tage), { x: 290, y, size: 7, font: helvetica })
      page2.drawText('Tage x', { x: 315, y, size: 7, font: helvetica })
      page2.drawText('8', { x: 350, y, size: 7, font: helvetica })
      page2.drawText('Stunden =', { x: 365, y, size: 7, font: helvetica })
      page2.drawRectangle({ x: 415, y: y - 3, width: 40, height: 12, borderColor: BLACK, borderWidth: 0.5 })
      page2.drawText(String(Number(tage) * 8), { x: 425, y, size: 7, font: helvetica })
      page2.drawText('Stunden', { x: 460, y, size: 7, font: helvetica })
      y -= 14
    }
    
    y -= 5
    const massgeblich = woechentlicheArbeitszeit * 52 - urlaubstageRound * 8 - krankheitstageRound * 8 - feiertage * 8
    const kuerzung = monateFue < 12 ? Math.round((12 - monateFue) / 12 * massgeblich) : 0
    
    page2.drawText('MaÃŸgebliche vereinbarte Jahresarbeitszeit', { x: margin, y, size: 7, font: helveticaBold })
    page2.drawRectangle({ x: 280, y: y - 3, width: 50, height: 12, borderColor: BLACK, borderWidth: 0.5 })
    page2.drawText(String(massgeblich), { x: 290, y, size: 7, font: helvetica })
    page2.drawText('Stunden', { x: 335, y, size: 7, font: helvetica })
    
    y -= 16
    page2.drawText('Ggf. KÃ¼rzung auf Grund unterjÃ¤hrigem Beginn/Ende der FuE-TÃ¤tigkeit', { x: margin, y, size: 7, font: helveticaOblique })
    page2.drawRectangle({ x: 350, y: y - 3, width: 50, height: 12, borderColor: BLACK, borderWidth: 0.5 })
    page2.drawText(String(kuerzung), { x: 360, y, size: 7, font: helvetica })
    page2.drawText('Stunden', { x: 405, y, size: 7, font: helvetica })
    
    // 2. Ermittlung
    y -= 30
    page2.drawText('2. Ermittlung des Anteils der Arbeitszeit fÃ¼r FuE-TÃ¤tigkeiten im FuE-Vorhaben', { x: margin, y, size: 8, font: helveticaBold })
    page2.drawLine({ start: { x: margin, y: y - 3 }, end: { x: 400, y: y - 3 }, thickness: 0.5 })
    
    y -= 20
    const massgeblichGekuerzt = massgeblich - kuerzung
    const anteil = massgeblichGekuerzt > 0 ? totalHours / massgeblichGekuerzt : 0
    
    page2.drawText('Summe der Arbeitsstunden fÃ¼r FuE-TÃ¤tigkeiten', { x: margin, y, size: 7, font: helvetica })
    page2.drawRectangle({ x: 250, y: y - 3, width: 50, height: 12, borderColor: BLACK, borderWidth: 0.5 })
    page2.drawText(String(Math.round(totalHours)), { x: 260, y, size: 7, font: helvetica })
    page2.drawText('Stunden', { x: 305, y, size: 7, font: helvetica })
    
    y -= 16
    page2.drawText('/ MaÃŸgebliche vereinbarte Jahresarbeitszeit (ggf. gekÃ¼rzt)', { x: margin, y, size: 7, font: helvetica })
    page2.drawRectangle({ x: 250, y: y - 3, width: 50, height: 12, borderColor: BLACK, borderWidth: 0.5 })
    page2.drawText(String(massgeblichGekuerzt), { x: 260, y, size: 7, font: helvetica })
    page2.drawText('Stunden', { x: 305, y, size: 7, font: helvetica })
    
    y -= 16
    page2.drawText('= Anteil der Arbeitszeit fÃ¼r FuE-TÃ¤tigkeiten im FuE-Vorhaben', { x: margin, y, size: 7, font: helvetica })
    page2.drawRectangle({ x: 250, y: y - 3, width: 50, height: 14, color: LIGHT_GREEN, borderColor: BLACK, borderWidth: 1 })
    page2.drawText(`${(anteil * 100).toFixed(2)}%`, { x: 255, y, size: 8, font: helveticaBold })
    
    // ZusÃ¤tzlich bei Eigenforschung
    y -= 30
    page2.drawText('ZusÃ¤tzlich bei Eigenforschung', { x: margin, y, size: 8, font: helveticaBold })
    page2.drawLine({ start: { x: margin, y: y - 3 }, end: { x: 180, y: y - 3 }, thickness: 0.5 })
    
    y -= 20
    page2.drawText('fÃ¶rderfÃ¤hige Arbeitsstunden im begÃ¼nstigten FuE-Vorhaben insgesamt', { x: margin, y, size: 7, font: helvetica })
    page2.drawRectangle({ x: 300, y: y - 3, width: 50, height: 12, borderColor: BLACK, borderWidth: 0.5 })
    page2.drawText(String(Math.round(totalHours)), { x: 310, y, size: 7, font: helvetica })
    page2.drawText('Stunden', { x: 355, y, size: 7, font: helvetica })
    
    y -= 16
    const hoechstgrenze = (monateFue / 12) * 2080
    page2.drawText('HÃ¶chstgrenze: x/12 x 2.080 Stunden', { x: margin, y, size: 7, font: helvetica })
    page2.drawRectangle({ x: 300, y: y - 3, width: 50, height: 12, borderColor: BLACK, borderWidth: 0.5 })
    page2.drawText(hoechstgrenze.toFixed(2), { x: 305, y, size: 7, font: helvetica })
    page2.drawText('Stunden', { x: 355, y, size: 7, font: helvetica })
    
    // Unterschriften
    y -= 50
    page2.drawText('Gesehen und bestÃ¤tigt:', { x: width / 2 - 60, y, size: 8, font: helveticaBold })
    
    y -= 40
    page2.drawLine({ start: { x: 100, y }, end: { x: 300, y }, thickness: 0.5 })
    page2.drawLine({ start: { x: 500, y }, end: { x: 700, y }, thickness: 0.5 })
    
    y -= 12
    page2.drawText('Datum, Unterschrift (Arbeitnehmer)', { x: 130, y, size: 6, font: helvetica })
    page2.drawText('Datum, Unterschrift (Projektverantwortlicher)', { x: 520, y, size: 6, font: helvetica })
    
    // PDF finalisieren
    const pdfBytes = await pdfDoc.save()
    
    const filename = `FZul_Stundennachweis_${userProfile.last_name}_${year}.pdf`
    
    // Uint8Array zu Buffer fÃ¼r NextResponse
    const buffer = Buffer.from(pdfBytes)
    
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
    
  } catch (error) {
    console.error('Fehler beim Erstellen des FZul-Stundennachweises:', error)
    return NextResponse.json(
      { error: 'Interner Serverfehler', details: error instanceof Error ? error.message : 'Unbekannter Fehler' },
      { status: 500 }
    )
  }
}