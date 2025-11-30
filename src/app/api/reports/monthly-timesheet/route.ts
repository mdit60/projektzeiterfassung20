// app/api/reports/monthly-timesheet/route.ts
// API Route für monatlichen ZIM Stundennachweis - pdf-lib Version
// Basierend auf Excel-Vorlage für Förderprojekte

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

// Farben (RGB 0-1) - Pastellblau-Schema
const HEADER_BLUE = rgb(0.85, 0.92, 0.97)
const ACCENT_BLUE = rgb(0.75, 0.88, 0.95)
const BLACK = rgb(0, 0, 0)
const DARK_GRAY = rgb(0.3, 0.3, 0.3)
const WEEKEND_GRAY = rgb(0.9, 0.9, 0.9)
const HOLIDAY_GRAY = rgb(0.85, 0.85, 0.85)  // Etwas dunkler als Wochenende

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

function formatNumber(num: number): string {
  if (num === 0) return ''
  if (Number.isInteger(num)) return String(num)
  return num.toFixed(2).replace('.', ',')
}

function formatNumberOrZero(num: number): string {
  if (num === 0) return '0,00'
  if (Number.isInteger(num)) return String(num) + ',00'
  return num.toFixed(2).replace('.', ',')
}

function isWeekend(year: number, month: number, day: number): boolean {
  const weekday = new Date(year, month - 1, day).getDay()
  return weekday === 0 || weekday === 6
}

// Letzter Arbeitstag des Monats
function getLastWorkday(year: number, month: number): number {
  let day = daysInMonth(year, month)
  while (day > 0) {
    if (!isWeekend(year, month, day)) return day
    day--
  }
  return daysInMonth(year, month)
}

// Zeichnet diagonale Schraffur für Feiertage
function drawHolidayPattern(page: any, x: number, y: number, width: number, height: number) {
  const stripeSpacing = 4  // Abstand zwischen Streifen
  const stripeColor = rgb(0.7, 0.7, 0.7)  // Dunkleres Grau für Streifen
  
  // Hintergrund hellgrau
  page.drawRectangle({
    x, y, width, height,
    color: HOLIDAY_GRAY,
  })
  
  // Diagonale Linien von links-unten nach rechts-oben
  for (let offset = -height; offset < width + height; offset += stripeSpacing) {
    const x1 = Math.max(x, x + offset)
    const y1 = Math.min(y + height, y + height - (offset < 0 ? -offset : 0))
    const x2 = Math.min(x + width, x + offset + height)
    const y2 = Math.max(y, y + height - (offset + height < width ? height : width - offset))
    
    if (x1 < x + width && x2 > x) {
      page.drawLine({
        start: { x: x1, y: y1 },
        end: { x: x2, y: y2 },
        thickness: 0.5,
        color: stripeColor,
      })
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }
    
    const body = await request.json()
    const { userId, projectId, year, month } = body
    
    if (!userId || !projectId || !year || !month) {
      return NextResponse.json({ 
        error: 'userId, projectId, year und month sind erforderlich' 
      }, { status: 400 })
    }
    
    // Daten laden
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select(`*, companies (name, state_code)`)
      .eq('id', userId)
      .single()
    
    if (!userProfile) {
      return NextResponse.json({ error: 'Mitarbeiter nicht gefunden' }, { status: 404 })
    }
    
    const { data: project } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single()
    
    if (!project) {
      return NextResponse.json({ error: 'Projekt nicht gefunden' }, { status: 404 })
    }
    
    // Arbeitspakete des Projekts laden
    const { data: workPackages } = await supabase
      .from('work_packages')
      .select('*')
      .eq('project_id', projectId)
      .order('code')
    
    // Map für schnellen AP-Namen Lookup über code
    // WICHTIG: Das Feld heißt "description" nicht "name"!
    const apNameMap: Record<string, string> = {}
    if (workPackages) {
      for (const wp of workPackages) {
        apNameMap[wp.code] = wp.description  // description ist die Kurzbezeichnung!
      }
    }
    
    const firstDay = `${year}-${String(month).padStart(2, '0')}-01`
    const lastDay = `${year}-${String(month).padStart(2, '0')}-${daysInMonth(year, month)}`
    
    const { data: timeEntries } = await supabase
      .from('time_entries')
      .select('*')
      .eq('user_profile_id', userId)
      .gte('entry_date', firstDay)
      .lte('entry_date', lastDay)
      .order('entry_date')
    
    // Feiertage aus public_holidays laden (werden NICHT in time_entries gespeichert!)
    // Wichtig: Spalte heißt "holiday_date", nicht "date"
    // state_code kann NULL sein (bundesweit) oder spezifisch (z.B. 'DE-BY')
    const companyStateCode = userProfile.companies?.state_code || null
    
    const { data: holidays } = await supabase
      .from('public_holidays')
      .select('*')
      .gte('holiday_date', firstDay)
      .lte('holiday_date', lastDay)
    
    // Feiertage filtern: bundesweite (state_code = NULL/undefined/leer) + landesspezifische
    const applicableHolidays = holidays?.filter(h => {
      const isNationwide = h.state_code === null || h.state_code === undefined || h.state_code === ''
      const isForState = h.state_code === companyStateCode
      return isNationwide || isForState
    }) || []
    
    // Feiertage als Map: Tag -> 8 Stunden (nur an Werktagen)
    const publicHolidayFromDB: Record<number, number> = {}
    for (const h of applicableHolidays) {
      const day = parseInt(h.holiday_date.split('-')[2])
      if (!isWeekend(year, month, day)) {
        publicHolidayFromDB[day] = 8
      }
    }
    
    // Daten aggregieren aus time_entries
    // WICHTIG: Feiertage werden NICHT überschrieben! 
    // Feiertage sind gesetzlich geschützt und gelten IMMER.
    const projectWorkByAPAndDay: Record<string, Record<number, number>> = {}
    const vacationByDay: Record<number, number> = {}
    const sickLeaveByDay: Record<number, number> = {}
    // Feiertage kommen aus der public_holidays Tabelle
    const publicHolidayByDay: Record<number, number> = { ...publicHolidayFromDB }
    
    if (timeEntries) {
      for (const entry of timeEntries) {
        const day = parseInt(entry.entry_date.split('-')[2])
        const hours = Number(entry.hours) || 0
        
        // An Feiertagen werden keine Arbeitsstunden gezählt (Förder-Richtlinie)
        if (publicHolidayByDay[day]) {
          continue  // Feiertag - keine weiteren Einträge für diesen Tag
        }
        
        if (entry.category === 'project_work' && entry.project_id === projectId) {
          const apCode = entry.work_package_code || 'OHNE_AP'
          if (!projectWorkByAPAndDay[apCode]) {
            projectWorkByAPAndDay[apCode] = {}
          }
          projectWorkByAPAndDay[apCode][day] = (projectWorkByAPAndDay[apCode][day] || 0) + hours
        } else if (entry.category === 'vacation') {
          vacationByDay[day] = (vacationByDay[day] || 0) + hours
        } else if (entry.category === 'sick_leave') {
          sickLeaveByDay[day] = (sickLeaveByDay[day] || 0) + hours
        }
      }
    }
    
    // ==========================================
    // PDF ERSTELLEN
    // ==========================================
    const pdfDoc = await PDFDocument.create()
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    
    const page = pdfDoc.addPage([841.89, 595.28]) // A4 Querformat
    const { width, height } = page.getSize()
    
    const margin = 15
    const days = daysInMonth(year, month)
    
    // Spaltenbreiten
    const colAPNr = 40
    const colBez = 165
    const colDay = 19
    const colSum = 42
    
    const tableWidth = colAPNr + colBez + (days * colDay) + colSum
    const tableStartX = (width - tableWidth) / 2
    
    let y = height - margin
    
    // ==========================================
    // HEADER-BEREICH
    // ==========================================
    const headerHeight = 60
    const totalHeaderWidth = width - 2 * margin
    const leftBoxWidth = totalHeaderWidth * 0.42  // Schmaler für mehr Platz rechts
    const rightBoxWidth = totalHeaderWidth * 0.58  // Breiter für Hinweistext in einer Zeile
    const rightBoxX = margin + leftBoxWidth
    
    // Linke Box: Zuwendungsempfänger
    page.drawRectangle({
      x: margin, y: y - headerHeight, width: leftBoxWidth, height: headerHeight,
      borderColor: BLACK, borderWidth: 0.5,
    })
    page.drawText('Zuwendungsempfänger (Firmenstempel)', {
      x: margin + 5, y: y - 15, size: 7, font: helvetica, color: DARK_GRAY,
    })
    page.drawText(userProfile.companies?.name || '', {
      x: margin + 10, y: y - 35, size: 11, font: helveticaBold,
    })
    
    // Rechte Box oben: Förderkennzeichen
    page.drawRectangle({
      x: rightBoxX, y: y - 20, width: rightBoxWidth, height: 20,
      color: HEADER_BLUE, borderColor: BLACK, borderWidth: 0.5,
    })
    page.drawText('Förderkennzeichen:', {
      x: rightBoxX + 5, y: y - 14, size: 8, font: helvetica,
    })
    page.drawText(project.funding_reference || '', {
      x: rightBoxX + 90, y: y - 14, size: 10, font: helveticaBold,
    })
    
    // Rechte Box unten: Titel + Hinweis (EINE Zeile!)
    page.drawRectangle({
      x: rightBoxX, y: y - headerHeight, width: rightBoxWidth, height: headerHeight - 20,
      borderColor: BLACK, borderWidth: 0.5,
    })
    page.drawText('Stundennachweis', {
      x: rightBoxX + rightBoxWidth / 2 - 40, y: y - 38, size: 14, font: helveticaBold,
    })
    // Hinweistext in EINER Zeile (kleinere Schrift damit es passt)
    page.drawText('Der Stundennachweis verbleibt beim Zuwendungsempfänger und ist nur nach Aufforderung vorzulegen.', {
      x: rightBoxX + 5, y: y - 54, size: 5, font: helvetica, color: DARK_GRAY,
    })
    
    y -= headerHeight + 5
    
    // Vorhabenthema
    page.drawRectangle({
      x: margin, y: y - 25, width: width - 2 * margin, height: 25,
      borderColor: BLACK, borderWidth: 0.5,
    })
    page.drawText('Vorhabenthema', {
      x: margin + 5, y: y - 10, size: 7, font: helvetica, color: DARK_GRAY,
    })
    page.drawText(project.name || '', {
      x: margin + 5, y: y - 21, size: 10, font: helveticaBold,
    })
    
    y -= 30
    
    // Monat und Mitarbeiter
    const monthBoxWidth = 120
    page.drawRectangle({
      x: margin, y: y - 25, width: monthBoxWidth, height: 25,
      borderColor: BLACK, borderWidth: 0.5,
    })
    page.drawText('Monat', {
      x: margin + 5, y: y - 10, size: 7, font: helvetica, color: DARK_GRAY,
    })
    page.drawText(`${String(month).padStart(2, '0')} / ${year}`, {
      x: margin + 5, y: y - 21, size: 10, font: helveticaBold,
    })
    
    page.drawRectangle({
      x: margin + monthBoxWidth, y: y - 25, width: width - 2 * margin - monthBoxWidth, height: 25,
      borderColor: BLACK, borderWidth: 0.5,
    })
    page.drawText('Mitarbeiter(in): [Name, Vorname]', {
      x: margin + monthBoxWidth + 5, y: y - 10, size: 7, font: helvetica, color: DARK_GRAY,
    })
    page.drawText(`${userProfile.last_name} ${userProfile.first_name}`, {
      x: margin + monthBoxWidth + 5, y: y - 21, size: 10, font: helveticaBold,
    })
    
    y -= 30
    
    // Hinweistext
    page.drawText(
      'Die zu Lasten des Vorhabens abzurechnenden Personalstunden sind täglich eigenhändig von der betreffenden Person zu erfassen.',
      { x: margin, y: y - 8, size: 6, font: helvetica, color: DARK_GRAY }
    )
    page.drawText(
      'Nur die produktiven, für das Vorhaben geleisteten Stunden sind zuwendungsfähig.',
      { x: margin, y: y - 16, size: 6, font: helvetica, color: DARK_GRAY }
    )
    
    y -= 25
    
    // ==========================================
    // TABELLE
    // ==========================================
    const rowHeight = 14
    const apRowHeight = 28
    const fontSize = 6
    const fontSizeSmall = 5.5
    
    // HEADER ZEILE 1: "Arbeitszeiten in Stunden je Kalendertag:" + Tage
    let x = tableStartX
    
    page.drawRectangle({
      x, y: y - rowHeight, width: colAPNr + colBez, height: rowHeight,
      color: HEADER_BLUE, borderColor: BLACK, borderWidth: 0.5,
    })
    page.drawText('Arbeitszeiten in Stunden je Kalendertag:', {
      x: x + 5, y: y - rowHeight + 5, size: 7, font: helveticaBold,
    })
    
    x += colAPNr + colBez
    
    for (let d = 1; d <= days; d++) {
      const isWE = isWeekend(year, month, d)
      const isHoliday = publicHolidayFromDB[d] !== undefined
      
      if (isHoliday && !isWE) {
        // Feiertag: Schraffur zeichnen
        drawHolidayPattern(page, x, y - rowHeight, colDay, rowHeight)
        page.drawRectangle({
          x, y: y - rowHeight, width: colDay, height: rowHeight,
          borderColor: BLACK, borderWidth: 0.5,
        })
      } else {
        page.drawRectangle({
          x, y: y - rowHeight, width: colDay, height: rowHeight,
          color: isWE ? WEEKEND_GRAY : HEADER_BLUE, borderColor: BLACK, borderWidth: 0.5,
        })
      }
      const dayText = String(d).padStart(2, '0')
      const textWidth = helveticaBold.widthOfTextAtSize(dayText, fontSize)
      page.drawText(dayText, {
        x: x + (colDay - textWidth) / 2,
        y: y - rowHeight + 5,
        size: fontSize, font: helveticaBold,
      })
      x += colDay
    }
    
    page.drawRectangle({
      x, y: y - rowHeight, width: colSum, height: rowHeight,
      color: HEADER_BLUE, borderColor: BLACK, borderWidth: 0.5,
    })
    const sumText = 'Summe'
    const sumWidth = helveticaBold.widthOfTextAtSize(sumText, fontSizeSmall)
    page.drawText(sumText, {
      x: x + (colSum - sumWidth) / 2,
      y: y - rowHeight + 5,
      size: fontSizeSmall, font: helveticaBold,
    })
    
    y -= rowHeight
    
    // HEADER ZEILE 2: AP | förderbare Projektarbeiten | Monat
    x = tableStartX
    
    page.drawRectangle({
      x, y: y - rowHeight, width: colAPNr, height: rowHeight,
      color: HEADER_BLUE, borderColor: BLACK, borderWidth: 0.5,
    })
    page.drawText('AP', {
      x: x + 5, y: y - rowHeight + 5, size: fontSize, font: helveticaBold,
    })
    
    x += colAPNr
    
    page.drawRectangle({
      x, y: y - rowHeight, width: colBez, height: rowHeight,
      color: HEADER_BLUE, borderColor: BLACK, borderWidth: 0.5,
    })
    page.drawText('förderbare Projektarbeiten (1)', {
      x: x + 5, y: y - rowHeight + 5, size: fontSize, font: helveticaBold,
    })
    
    x += colBez
    
    for (let d = 1; d <= days; d++) {
      const isWE = isWeekend(year, month, d)
      const isHoliday = publicHolidayFromDB[d] !== undefined
      
      if (isHoliday && !isWE) {
        drawHolidayPattern(page, x, y - rowHeight, colDay, rowHeight)
        page.drawRectangle({
          x, y: y - rowHeight, width: colDay, height: rowHeight,
          borderColor: BLACK, borderWidth: 0.5,
        })
      } else {
        page.drawRectangle({
          x, y: y - rowHeight, width: colDay, height: rowHeight,
          color: isWE ? WEEKEND_GRAY : HEADER_BLUE, borderColor: BLACK, borderWidth: 0.5,
        })
      }
      x += colDay
    }
    
    page.drawRectangle({
      x, y: y - rowHeight, width: colSum, height: rowHeight,
      color: HEADER_BLUE, borderColor: BLACK, borderWidth: 0.5,
    })
    const monatText = 'Monat'
    const monatWidth = helveticaBold.widthOfTextAtSize(monatText, fontSizeSmall)
    page.drawText(monatText, {
      x: x + (colSum - monatWidth) / 2,
      y: y - rowHeight + 5,
      size: fontSizeSmall, font: helveticaBold,
    })
    
    y -= rowHeight
    
    // HEADER ZEILE 3: Nr. | Kurzbezeichnung des Arbeitspakets
    x = tableStartX
    
    page.drawRectangle({
      x, y: y - rowHeight, width: colAPNr, height: rowHeight,
      borderColor: BLACK, borderWidth: 0.5,
    })
    page.drawText('Nr.', {
      x: x + 5, y: y - rowHeight + 5, size: fontSize, font: helvetica,
    })
    
    x += colAPNr
    
    page.drawRectangle({
      x, y: y - rowHeight, width: colBez, height: rowHeight,
      borderColor: BLACK, borderWidth: 0.5,
    })
    page.drawText('Kurzbezeichnung des Arbeitspakets', {
      x: x + 5, y: y - rowHeight + 5, size: fontSize, font: helvetica,
    })
    
    x += colBez
    
    for (let d = 1; d <= days; d++) {
      const isWE = isWeekend(year, month, d)
      const isHoliday = publicHolidayFromDB[d] !== undefined
      
      if (isHoliday && !isWE) {
        drawHolidayPattern(page, x, y - rowHeight, colDay, rowHeight)
        page.drawRectangle({
          x, y: y - rowHeight, width: colDay, height: rowHeight,
          borderColor: BLACK, borderWidth: 0.5,
        })
      } else {
        page.drawRectangle({
          x, y: y - rowHeight, width: colDay, height: rowHeight,
          color: isWE ? WEEKEND_GRAY : undefined, borderColor: BLACK, borderWidth: 0.5,
        })
      }
      x += colDay
    }
    
    page.drawRectangle({
      x, y: y - rowHeight, width: colSum, height: rowHeight,
      borderColor: BLACK, borderWidth: 0.5,
    })
    
    y -= rowHeight
    
    // ==========================================
    // AP-ZEILEN (max. 6 Zeilen)
    // ==========================================
    const maxAPRows = 6
    let totalBillableByDay: Record<number, number> = {}
    let totalBillable = 0
    
    // Arbeitspakete die im Monat verwendet wurden
    const usedAPCodes = Object.keys(projectWorkByAPAndDay)
    
    for (let i = 0; i < maxAPRows; i++) {
      const apCode = usedAPCodes[i] || ''
      // AP-Name aus dem Lookup holen
      const apName = apCode && apCode !== 'OHNE_AP' ? (apNameMap[apCode] || '') : ''
      const hoursData = apCode ? projectWorkByAPAndDay[apCode] || {} : {}
      
      x = tableStartX
      
      // AP Nr. - ZENTRIERT
      page.drawRectangle({
        x, y: y - apRowHeight, width: colAPNr, height: apRowHeight,
        borderColor: BLACK, borderWidth: 0.5,
      })
      if (apCode && apCode !== 'OHNE_AP') {
        const apCodeText = apCode.substring(0, 8)
        const apCodeWidth = helvetica.widthOfTextAtSize(apCodeText, fontSize)
        page.drawText(apCodeText, {
          x: x + (colAPNr - apCodeWidth) / 2,  // Horizontal zentriert
          y: y - apRowHeight / 2 - 2,           // Vertikal zentriert
          size: fontSize, font: helvetica,
        })
      }
      
      x += colAPNr
      
      // Bezeichnung (mit Textumbruch)
      page.drawRectangle({
        x, y: y - apRowHeight, width: colBez, height: apRowHeight,
        borderColor: BLACK, borderWidth: 0.5,
      })
      if (apName) {
        const maxTextWidth = colBez - 6
        const words = apName.split(' ')
        let lines: string[] = []
        let currentLine = ''
        
        for (const word of words) {
          const testLine = currentLine ? `${currentLine} ${word}` : word
          const testWidth = helvetica.widthOfTextAtSize(testLine, fontSize)
          if (testWidth > maxTextWidth && currentLine) {
            lines.push(currentLine)
            currentLine = word
          } else {
            currentLine = testLine
          }
        }
        if (currentLine) lines.push(currentLine)
        
        lines = lines.slice(0, 3)
        const lineHeight = 7
        const startY = y - apRowHeight / 2 + (lines.length - 1) * lineHeight / 2
        
        lines.forEach((line, idx) => {
          page.drawText(line, {
            x: x + 3,
            y: startY - idx * lineHeight,
            size: fontSize, font: helvetica,
          })
        })
      }
      
      x += colBez
      
      // Tages-Spalten
      let rowSum = 0
      for (let d = 1; d <= days; d++) {
        const isWE = isWeekend(year, month, d)
        const isHoliday = publicHolidayFromDB[d] !== undefined
        const hours = hoursData[d] || 0
        rowSum += hours
        
        if (hours > 0) {
          totalBillableByDay[d] = (totalBillableByDay[d] || 0) + hours
        }
        
        if (isHoliday && !isWE) {
          drawHolidayPattern(page, x, y - apRowHeight, colDay, apRowHeight)
          page.drawRectangle({
            x, y: y - apRowHeight, width: colDay, height: apRowHeight,
            borderColor: BLACK, borderWidth: 0.5,
          })
        } else {
          page.drawRectangle({
            x, y: y - apRowHeight, width: colDay, height: apRowHeight,
            color: isWE ? WEEKEND_GRAY : undefined, borderColor: BLACK, borderWidth: 0.5,
          })
        }
        
        if (hours > 0) {
          const hoursText = formatNumber(hours)
          const textWidth = helvetica.widthOfTextAtSize(hoursText, fontSizeSmall)
          page.drawText(hoursText, {
            x: x + (colDay - textWidth) / 2,
            y: y - apRowHeight / 2 - 2,
            size: fontSizeSmall, font: helvetica,
          })
        }
        
        x += colDay
      }
      
      totalBillable += rowSum
      
      // Summe
      page.drawRectangle({
        x, y: y - apRowHeight, width: colSum, height: apRowHeight,
        borderColor: BLACK, borderWidth: 0.5,
      })
      const sumVal = formatNumberOrZero(rowSum)
      const sumValWidth = helvetica.widthOfTextAtSize(sumVal, fontSize)
      page.drawText(sumVal, {
        x: x + (colSum - sumValWidth) / 2,
        y: y - apRowHeight / 2 - 2,
        size: fontSize, font: helvetica,
      })
      
      y -= apRowHeight
    }
    
    // ==========================================
    // SUMMENZEILE
    // ==========================================
    x = tableStartX
    
    page.drawRectangle({
      x, y: y - rowHeight, width: colAPNr + colBez, height: rowHeight,
      color: ACCENT_BLUE, borderColor: BLACK, borderWidth: 0.5,
    })
    page.drawText('Summe der förderbaren Stunden (2)', {
      x: x + 5, y: y - rowHeight + 5, size: fontSize, font: helveticaBold,
    })
    
    x += colAPNr + colBez
    
    for (let d = 1; d <= days; d++) {
      const isWE = isWeekend(year, month, d)
      const isHoliday = publicHolidayFromDB[d] !== undefined
      const daySum = totalBillableByDay[d] || 0
      
      if (isHoliday && !isWE) {
        drawHolidayPattern(page, x, y - rowHeight, colDay, rowHeight)
        page.drawRectangle({
          x, y: y - rowHeight, width: colDay, height: rowHeight,
          borderColor: BLACK, borderWidth: 0.5,
        })
      } else {
        page.drawRectangle({
          x, y: y - rowHeight, width: colDay, height: rowHeight,
          color: isWE ? WEEKEND_GRAY : ACCENT_BLUE, borderColor: BLACK, borderWidth: 0.5,
        })
      }
      
      const daySumText = formatNumberOrZero(daySum)
      const textWidth = helveticaBold.widthOfTextAtSize(daySumText, fontSizeSmall)
      page.drawText(daySumText, {
        x: x + (colDay - textWidth) / 2,
        y: y - rowHeight + 5,
        size: fontSizeSmall, font: helveticaBold,
      })
      
      x += colDay
    }
    
    page.drawRectangle({
      x, y: y - rowHeight, width: colSum, height: rowHeight,
      color: ACCENT_BLUE, borderColor: BLACK, borderWidth: 0.5,
    })
    const totalText = formatNumberOrZero(totalBillable)
    const totalWidth = helveticaBold.widthOfTextAtSize(totalText, fontSize)
    page.drawText(totalText, {
      x: x + (colSum - totalWidth) / 2,
      y: y - rowHeight + 5,
      size: fontSize, font: helveticaBold,
    })
    
    y -= rowHeight
    
    // ==========================================
    // Nicht zuschussfähige Arbeiten (OHNE "2.")
    // ==========================================
    x = tableStartX
    
    page.drawRectangle({
      x, y: y - rowHeight, width: colAPNr + colBez, height: rowHeight,
      borderColor: BLACK, borderWidth: 0.5,
    })
    page.drawText('Nicht zuschussfähige Arbeiten', {
      x: x + colAPNr + 5, y: y - rowHeight + 5, size: fontSize, font: helvetica,
    })
    
    x += colAPNr + colBez
    
    for (let d = 1; d <= days; d++) {
      const isWE = isWeekend(year, month, d)
      const isHoliday = publicHolidayFromDB[d] !== undefined
      
      if (isHoliday && !isWE) {
        drawHolidayPattern(page, x, y - rowHeight, colDay, rowHeight)
        page.drawRectangle({
          x, y: y - rowHeight, width: colDay, height: rowHeight,
          borderColor: BLACK, borderWidth: 0.5,
        })
      } else {
        page.drawRectangle({
          x, y: y - rowHeight, width: colDay, height: rowHeight,
          color: isWE ? WEEKEND_GRAY : undefined, borderColor: BLACK, borderWidth: 0.5,
        })
      }
      x += colDay
    }
    
    page.drawRectangle({
      x, y: y - rowHeight, width: colSum, height: rowHeight,
      borderColor: BLACK, borderWidth: 0.5,
    })
    const zeroText = '0,00'
    const zeroWidth = helvetica.widthOfTextAtSize(zeroText, fontSize)
    page.drawText(zeroText, {
      x: x + (colSum - zeroWidth) / 2,
      y: y - rowHeight + 5,
      size: fontSize, font: helvetica,
    })
    
    y -= rowHeight
    
    // ==========================================
    // URLAUB (OHNE Nummerierung)
    // ==========================================
    x = tableStartX
    
    page.drawRectangle({
      x, y: y - rowHeight, width: colAPNr + colBez, height: rowHeight,
      borderColor: BLACK, borderWidth: 0.5,
    })
    page.drawText('Urlaub (nur bezahlten Urlaub aufführen)', {
      x: x + colAPNr + 5, y: y - rowHeight + 5, size: fontSize, font: helvetica,
    })
    
    x += colAPNr + colBez
    
    let totalVacation = 0
    for (let d = 1; d <= days; d++) {
      const isWE = isWeekend(year, month, d)
      const isHoliday = publicHolidayFromDB[d] !== undefined
      const hours = vacationByDay[d] || 0
      totalVacation += hours
      
      if (isHoliday && !isWE) {
        drawHolidayPattern(page, x, y - rowHeight, colDay, rowHeight)
        page.drawRectangle({
          x, y: y - rowHeight, width: colDay, height: rowHeight,
          borderColor: BLACK, borderWidth: 0.5,
        })
      } else {
        page.drawRectangle({
          x, y: y - rowHeight, width: colDay, height: rowHeight,
          color: isWE ? WEEKEND_GRAY : undefined, borderColor: BLACK, borderWidth: 0.5,
        })
      }
      
      if (hours > 0) {
        const hoursText = formatNumber(hours)
        const textWidth = helvetica.widthOfTextAtSize(hoursText, fontSizeSmall)
        page.drawText(hoursText, {
          x: x + (colDay - textWidth) / 2,
          y: y - rowHeight + 5,
          size: fontSizeSmall, font: helvetica,
        })
      }
      
      x += colDay
    }
    
    page.drawRectangle({
      x, y: y - rowHeight, width: colSum, height: rowHeight,
      borderColor: BLACK, borderWidth: 0.5,
    })
    const vacText = formatNumberOrZero(totalVacation)
    const vacWidth = helvetica.widthOfTextAtSize(vacText, fontSize)
    page.drawText(vacText, {
      x: x + (colSum - vacWidth) / 2,
      y: y - rowHeight + 5,
      size: fontSize, font: helvetica,
    })
    
    y -= rowHeight
    
    // ==========================================
    // Krankheit (OHNE "3.")
    // ==========================================
    x = tableStartX
    
    page.drawRectangle({
      x, y: y - rowHeight, width: colAPNr + colBez, height: rowHeight,
      borderColor: BLACK, borderWidth: 0.5,
    })
    page.drawText('Krankheit (nur bei Lohn- und Gehaltsfortzahlung)', {
      x: x + colAPNr + 5, y: y - rowHeight + 5, size: fontSize, font: helvetica,
    })
    
    x += colAPNr + colBez
    
    let totalSick = 0
    for (let d = 1; d <= days; d++) {
      const isWE = isWeekend(year, month, d)
      const isHoliday = publicHolidayFromDB[d] !== undefined
      const hours = sickLeaveByDay[d] || 0
      totalSick += hours
      
      if (isHoliday && !isWE) {
        drawHolidayPattern(page, x, y - rowHeight, colDay, rowHeight)
        page.drawRectangle({
          x, y: y - rowHeight, width: colDay, height: rowHeight,
          borderColor: BLACK, borderWidth: 0.5,
        })
      } else {
        page.drawRectangle({
          x, y: y - rowHeight, width: colDay, height: rowHeight,
          color: isWE ? WEEKEND_GRAY : undefined, borderColor: BLACK, borderWidth: 0.5,
        })
      }
      
      if (hours > 0) {
        const hoursText = formatNumber(hours)
        const textWidth = helvetica.widthOfTextAtSize(hoursText, fontSizeSmall)
        page.drawText(hoursText, {
          x: x + (colDay - textWidth) / 2,
          y: y - rowHeight + 5,
          size: fontSizeSmall, font: helvetica,
        })
      }
      
      x += colDay
    }
    
    page.drawRectangle({
      x, y: y - rowHeight, width: colSum, height: rowHeight,
      borderColor: BLACK, borderWidth: 0.5,
    })
    const sickText = formatNumberOrZero(totalSick)
    const sickWidth = helvetica.widthOfTextAtSize(sickText, fontSize)
    page.drawText(sickText, {
      x: x + (colSum - sickWidth) / 2,
      y: y - rowHeight + 5,
      size: fontSize, font: helvetica,
    })
    
    y -= rowHeight
    
    // ==========================================
    // Sonstige bezahlte Ausfallzeiten (Feiertage) - category = 'public_holiday'
    // ==========================================
    x = tableStartX
    
    page.drawRectangle({
      x, y: y - rowHeight, width: colAPNr + colBez, height: rowHeight,
      borderColor: BLACK, borderWidth: 0.5,
    })
    page.drawText('Sonstige bezahlte Ausfallzeiten (z.B. Feiertage)', {
      x: x + colAPNr + 5, y: y - rowHeight + 5, size: fontSize, font: helvetica,
    })
    
    x += colAPNr + colBez
    
    let totalPublicHoliday = 0
    for (let d = 1; d <= days; d++) {
      const isWE = isWeekend(year, month, d)
      const isHoliday = publicHolidayFromDB[d] !== undefined
      const hours = publicHolidayByDay[d] || 0
      totalPublicHoliday += hours
      
      if (isHoliday && !isWE) {
        drawHolidayPattern(page, x, y - rowHeight, colDay, rowHeight)
        page.drawRectangle({
          x, y: y - rowHeight, width: colDay, height: rowHeight,
          borderColor: BLACK, borderWidth: 0.5,
        })
      } else {
        page.drawRectangle({
          x, y: y - rowHeight, width: colDay, height: rowHeight,
          color: isWE ? WEEKEND_GRAY : undefined, borderColor: BLACK, borderWidth: 0.5,
        })
      }
      
      if (hours > 0) {
        const hoursText = formatNumber(hours)
        const textWidth = helvetica.widthOfTextAtSize(hoursText, fontSizeSmall)
        page.drawText(hoursText, {
          x: x + (colDay - textWidth) / 2,
          y: y - rowHeight + 5,
          size: fontSizeSmall, font: helvetica,
        })
      }
      
      x += colDay
    }
    
    page.drawRectangle({
      x, y: y - rowHeight, width: colSum, height: rowHeight,
      borderColor: BLACK, borderWidth: 0.5,
    })
    const holText = formatNumberOrZero(totalPublicHoliday)
    const holWidth = helvetica.widthOfTextAtSize(holText, fontSize)
    page.drawText(holText, {
      x: x + (colSum - holWidth) / 2,
      y: y - rowHeight + 5,
      size: fontSize, font: helvetica,
    })
    
    y -= rowHeight + 10
    
    // ==========================================
    // FUßNOTEN
    // ==========================================
    page.drawText(
      '(1) Die geleisteten Projektbearbeitungsstunden sind für den gesamten Bewilligungszeitraum eigenhändig und zeitnah, d.h. mindestens',
      { x: margin, y: y - 8, size: 5, font: helvetica, color: DARK_GRAY }
    )
    page.drawText(
      '     innerhalb einer Woche zu erfassen. Die Angaben sind subventionserheblich im Sinne des § 264 Strafgesetzbuch.',
      { x: margin, y: y - 15, size: 5, font: helvetica, color: DARK_GRAY }
    )
    
    y -= 22
    
    page.drawText(
      '(2) Förderbar pro Monat sind die tatsächlich für das Projekt geleisteten Stunden, jedoch nicht mehr als arbeitsvertraglich, betrieblich',
      { x: margin, y: y - 8, size: 5, font: helvetica, color: DARK_GRAY }
    )
    page.drawText(
      '     oder tariflich vereinbart, maximal in Höhe von 52 (Wochen) / 12 (Monate) x Wochenarbeitszeit. Überstunden sind nicht förderbar.',
      { x: margin, y: y - 15, size: 5, font: helvetica, color: DARK_GRAY }
    )
    
    y -= 30
    
    // ==========================================
    // UNTERSCHRIFTEN
    // ==========================================
    const signatureWidth = (width - 2 * margin - 40) / 2
    
    const lastWorkday = getLastWorkday(year, month)
    const dateStr = `${String(lastWorkday).padStart(2, '0')}.${String(month).padStart(2, '0')}.${String(year).slice(2)}`
    
    page.drawText(dateStr, {
      x: margin, y: y - 8, size: 8, font: helvetica,
    })
    
    page.drawLine({
      start: { x: margin, y: y - 20 },
      end: { x: margin + signatureWidth, y: y - 20 },
      thickness: 0.5,
    })
    page.drawText('Datum / Unterschrift des Mitarbeiters', {
      x: margin, y: y - 30, size: 6, font: helvetica,
    })
    
    page.drawText(dateStr, {
      x: width - margin - signatureWidth, y: y - 8, size: 8, font: helvetica,
    })
    
    page.drawLine({
      start: { x: width - margin - signatureWidth, y: y - 20 },
      end: { x: width - margin, y: y - 20 },
      thickness: 0.5,
    })
    page.drawText('Datum / Unterschrift Geschäftsführer bzw. FuE-Verantwortlicher', {
      x: width - margin - signatureWidth, y: y - 30, size: 6, font: helvetica,
    })
    page.drawText('(in öffentlichen Forschungseinrichtungen)', {
      x: width - margin - signatureWidth, y: y - 38, size: 5, font: helvetica, color: DARK_GRAY,
    })
    
    // ==========================================
    // PDF FINALISIEREN
    // ==========================================
    const pdfBytes = await pdfDoc.save()
    
    const filename = `Stundennachweis_${userProfile.last_name}_${year}-${String(month).padStart(2, '0')}.pdf`
    
    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
    
  } catch (error) {
    console.error('Fehler beim Erstellen des monatlichen Stundennachweises:', error)
    return NextResponse.json(
      { error: 'Interner Serverfehler', details: error instanceof Error ? error.message : 'Unbekannter Fehler' },
      { status: 500 }
    )
  }
}