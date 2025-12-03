// app/api/payment-requests/export/route.ts
// PDF-Export für Zahlungsanforderungen (ZIM-Format)
// Generiert: Anlage 1a (Personenstunden) + Anlage 1b (Personalkosten)

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont } from 'pdf-lib'

// ============================================================
// FARBEN
// ============================================================
const BLACK = rgb(0, 0, 0)
const DARK_GRAY = rgb(0.3, 0.3, 0.3)
const LIGHT_GRAY = rgb(0.92, 0.92, 0.92)
const HEADER_BLUE = rgb(0.85, 0.92, 0.97)
const TABLE_HEADER = rgb(0.78, 0.85, 0.92)
const ACCENT_BLUE = rgb(0.7, 0.82, 0.9)

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function formatCurrency(num: number): string {
  return num.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatNumber(num: number): string {
  if (num === 0) return '0,00'
  return num.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('de-DE')
}

function getMonthName(month: number): string {
  const names = ['', 'Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']
  return names[month] || ''
}

function getMonthsInRange(startDate: string, endDate: string): { year: number; month: number; label: string }[] {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const months: { year: number; month: number; label: string }[] = []
  
  const current = new Date(start.getFullYear(), start.getMonth(), 1)
  while (current <= end) {
    months.push({
      year: current.getFullYear(),
      month: current.getMonth() + 1,
      label: `${getMonthName(current.getMonth() + 1)} ${String(current.getFullYear()).slice(2)}`
    })
    current.setMonth(current.getMonth() + 1)
  }
  
  return months
}

// Zeichnet zentrierten Text
function drawCenteredText(
  page: PDFPage, 
  text: string, 
  x: number, 
  y: number, 
  width: number, 
  font: PDFFont, 
  size: number,
  color = BLACK
) {
  const textWidth = font.widthOfTextAtSize(text, size)
  page.drawText(text, {
    x: x + (width - textWidth) / 2,
    y,
    size,
    font,
    color,
  })
}

// Zeichnet rechtsbündigen Text
function drawRightText(
  page: PDFPage, 
  text: string, 
  x: number, 
  y: number, 
  width: number, 
  font: PDFFont, 
  size: number,
  color = BLACK
) {
  const textWidth = font.widthOfTextAtSize(text, size)
  page.drawText(text, {
    x: x + width - textWidth - 4,
    y,
    size,
    font,
    color,
  })
}

// ============================================================
// MAIN EXPORT FUNCTION
// ============================================================

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }
    
    // User-Profil und Rolle prüfen
    const { data: currentUserProfile } = await supabase
      .from('user_profiles')
      .select('id, company_id, role')
      .eq('user_id', user.id)
      .single()
    
    if (!currentUserProfile) {
      return NextResponse.json({ error: 'Benutzerprofil nicht gefunden' }, { status: 404 })
    }
    
    // Nur Company Admins dürfen Zahlungsanforderungen exportieren
    if (currentUserProfile.role !== 'company_admin') {
      return NextResponse.json({ 
        error: 'Keine Berechtigung. Nur Firmen-Administratoren können Zahlungsanforderungen exportieren.' 
      }, { status: 403 })
    }
    
    const body = await request.json()
    const { paymentRequestId, projectId, periodStart, periodEnd } = body
    
    let calculationData: any
    let project: any
    let company: any
    
    if (paymentRequestId) {
      // Gespeicherte ZA laden
      const { data: paymentRequest, error: prError } = await supabase
        .from('payment_requests')
        .select(`
          *,
          payment_request_items (*),
          projects (*)
        `)
        .eq('id', paymentRequestId)
        .single()
      
      if (prError || !paymentRequest) {
        return NextResponse.json({ error: 'Zahlungsanforderung nicht gefunden' }, { status: 404 })
      }
      
      project = paymentRequest.projects
      calculationData = {
        items: paymentRequest.payment_request_items,
        summary: {
          total_hours: paymentRequest.personnel_hours,
          personnel_costs: paymentRequest.personnel_costs,
          overhead_costs: paymentRequest.overhead_costs,
          total_eligible_costs: paymentRequest.total_eligible_costs,
          requested_amount: paymentRequest.requested_amount,
        },
        periodStart: paymentRequest.period_start,
        periodEnd: paymentRequest.period_end,
        requestNumber: paymentRequest.request_number,
      }
      
    } else if (projectId && periodStart && periodEnd) {
      // Live berechnen
      const { data: proj } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single()
      
      if (!proj) {
        return NextResponse.json({ error: 'Projekt nicht gefunden' }, { status: 404 })
      }
      
      // Prüfen ob Projekt zur Firma des Users gehört
      if (proj.company_id !== currentUserProfile.company_id) {
        return NextResponse.json({ 
          error: 'Keine Berechtigung für dieses Projekt' 
        }, { status: 403 })
      }
      
      project = proj
      
      calculationData = await calculatePaymentRequestData(
        supabase, projectId, periodStart, periodEnd, 
        project.funding_rate || 50, project.overhead_rate || 0,
        currentUserProfile.company_id  // NEU: Company ID übergeben
      )
      calculationData.periodStart = periodStart
      calculationData.periodEnd = periodEnd
      calculationData.requestNumber = 'Entwurf'
      
    } else {
      return NextResponse.json({ 
        error: 'Entweder paymentRequestId oder projectId + periodStart + periodEnd erforderlich' 
      }, { status: 400 })
    }
    
    // Firmendaten laden
    const { data: companyData } = await supabase
      .from('companies')
      .select('*')
      .eq('id', project.company_id)
      .single()
    company = companyData
    
    // PDF erstellen
    const pdfDoc = await PDFDocument.create()
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    
    const months = getMonthsInRange(calculationData.periodStart, calculationData.periodEnd)
    
    // Seite 1: Anlage 1a - Personenstunden
    await createAnlage1a(pdfDoc, helvetica, helveticaBold, {
      company,
      project,
      calculation: calculationData,
      months,
    })
    
    // Seite 2: Anlage 1b - Personalkosten
    await createAnlage1b(pdfDoc, helvetica, helveticaBold, {
      company,
      project,
      calculation: calculationData,
    })
    
    // PDF finalisieren
    const pdfBytes = await pdfDoc.save()
    
    const filename = `ZA_${project.funding_reference || 'Entwurf'}_${calculationData.requestNumber}.pdf`
    
    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
    
  } catch (error) {
    console.error('Fehler beim PDF-Export:', error)
    return NextResponse.json(
      { error: 'Interner Serverfehler', details: error instanceof Error ? error.message : 'Unbekannt' },
      { status: 500 }
    )
  }
}

// ============================================================
// ANLAGE 1a - Abrechnung der förderbaren Personenstunden
// ============================================================

async function createAnlage1a(
  pdfDoc: PDFDocument,
  helvetica: PDFFont,
  helveticaBold: PDFFont,
  data: {
    company: any
    project: any
    calculation: any
    months: { year: number; month: number; label: string }[]
  }
) {
  const { company, project, calculation, months } = data
  
  // A4 Querformat für bessere Monatsdarstellung
  const page = pdfDoc.addPage([841.89, 595.28])
  const { width, height } = page.getSize()
  
  const margin = 35
  let y = height - margin
  
  // ============================================
  // HEADER
  // ============================================
  
  // Titel-Box
  page.drawRectangle({
    x: margin, y: y - 35, width: 200, height: 35,
    color: HEADER_BLUE, borderColor: BLACK, borderWidth: 1,
  })
  page.drawText('Anlage 1a', {
    x: margin + 10, y: y - 15, size: 14, font: helveticaBold,
  })
  page.drawText('zur Zahlungsanforderung', {
    x: margin + 10, y: y - 30, size: 9, font: helvetica,
  })
  
  // Haupttitel
  page.drawText('Abrechnung der förderbaren Personenstunden', {
    x: margin + 220, y: y - 22, size: 14, font: helveticaBold,
  })
  
  y -= 50
  
  // ============================================
  // INFO-BOX
  // ============================================
  const boxHeight = 55
  page.drawRectangle({
    x: margin, y: y - boxHeight, width: width - 2 * margin, height: boxHeight,
    borderColor: BLACK, borderWidth: 0.5,
  })
  
  const col1X = margin + 10
  const col2X = margin + 200
  const col3X = width / 2 + 30
  const col4X = width / 2 + 200
  
  // Zeile 1
  page.drawText('Förderkennzeichen:', { x: col1X, y: y - 15, size: 8, font: helvetica, color: DARK_GRAY })
  page.drawText(project.funding_reference || '-', { x: col2X, y: y - 15, size: 10, font: helveticaBold })
  
  page.drawText('Nr. der Zahlungsanforderung:', { x: col3X, y: y - 15, size: 8, font: helvetica, color: DARK_GRAY })
  page.drawText(String(calculation.requestNumber || '-'), { x: col4X, y: y - 15, size: 10, font: helveticaBold })
  
  // Zeile 2
  page.drawText('Abrechnungszeitraum:', { x: col1X, y: y - 32, size: 8, font: helvetica, color: DARK_GRAY })
  page.drawText(`${formatDate(calculation.periodStart)} - ${formatDate(calculation.periodEnd)}`, { 
    x: col2X, y: y - 32, size: 10, font: helveticaBold 
  })
  
  page.drawText('Zuwendungsempfänger:', { x: col3X, y: y - 32, size: 8, font: helvetica, color: DARK_GRAY })
  page.drawText(company?.name || '-', { x: col4X, y: y - 32, size: 10, font: helveticaBold })
  
  // Zeile 3: Vorhabenthema
  page.drawText('Vorhabenthema:', { x: col1X, y: y - 49, size: 8, font: helvetica, color: DARK_GRAY })
  page.drawText(project.name || '-', { x: col2X, y: y - 49, size: 9, font: helvetica })
  
  y -= boxHeight + 15
  
  // ============================================
  // TABELLE
  // ============================================
  
  const items = calculation.items || []
  
  // Spaltenbreiten dynamisch berechnen
  const colNr = 28
  const colName = 140
  const colSum = 55
  const availableWidth = width - 2 * margin - colNr - colName - colSum
  const colMonth = Math.min(55, availableWidth / Math.max(months.length, 1))
  
  const tableWidth = colNr + colName + (months.length * colMonth) + colSum
  const tableX = margin
  
  const rowHeight = 18
  const headerHeight = 32
  
  // ============================================
  // HEADER ZEILE
  // ============================================
  let x = tableX
  
  // lfd. Nr.
  page.drawRectangle({
    x, y: y - headerHeight, width: colNr, height: headerHeight,
    color: TABLE_HEADER, borderColor: BLACK, borderWidth: 0.5,
  })
  drawCenteredText(page, 'lfd.', x, y - 12, colNr, helveticaBold, 7)
  drawCenteredText(page, 'Nr.', x, y - 22, colNr, helveticaBold, 7)
  x += colNr
  
  // Mitarbeiter
  page.drawRectangle({
    x, y: y - headerHeight, width: colName, height: headerHeight,
    color: TABLE_HEADER, borderColor: BLACK, borderWidth: 0.5,
  })
  drawCenteredText(page, 'Mitarbeiter(in)', x, y - 18, colName, helveticaBold, 9)
  x += colName
  
  // Monatsspalten
  for (const month of months) {
    page.drawRectangle({
      x, y: y - headerHeight, width: colMonth, height: headerHeight,
      color: TABLE_HEADER, borderColor: BLACK, borderWidth: 0.5,
    })
    drawCenteredText(page, month.label, x, y - 18, colMonth, helveticaBold, 7)
    x += colMonth
  }
  
  // Summe
  page.drawRectangle({
    x, y: y - headerHeight, width: colSum, height: headerHeight,
    color: TABLE_HEADER, borderColor: BLACK, borderWidth: 0.5,
  })
  drawCenteredText(page, 'Summe', x, y - 12, colSum, helveticaBold, 8)
  drawCenteredText(page, 'Stunden', x, y - 22, colSum, helveticaBold, 8)
  
  y -= headerHeight
  
  // ============================================
  // DATENZEILEN
  // ============================================
  let totalByMonth: Record<string, number> = {}
  let grandTotal = 0
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    x = tableX
    
    // Alternierende Zeilenfarbe
    const rowColor = i % 2 === 0 ? undefined : rgb(0.97, 0.97, 0.97)
    
    // lfd. Nr.
    page.drawRectangle({
      x, y: y - rowHeight, width: colNr, height: rowHeight,
      color: rowColor, borderColor: BLACK, borderWidth: 0.5,
    })
    drawCenteredText(page, String(i + 1), x, y - rowHeight + 5, colNr, helvetica, 8)
    x += colNr
    
    // Name
    page.drawRectangle({
      x, y: y - rowHeight, width: colName, height: rowHeight,
      color: rowColor, borderColor: BLACK, borderWidth: 0.5,
    })
    page.drawText(item.employee_name || '-', {
      x: x + 4, y: y - rowHeight + 5, size: 8, font: helvetica,
    })
    x += colName
    
    // Stunden pro Monat
    const hoursByMonth = item.hours_by_month || {}
    let rowSum = 0
    
    for (const month of months) {
      const key = `${month.year}-${String(month.month).padStart(2, '0')}`
      const hours = hoursByMonth[key] || 0
      rowSum += hours
      totalByMonth[key] = (totalByMonth[key] || 0) + hours
      
      page.drawRectangle({
        x, y: y - rowHeight, width: colMonth, height: rowHeight,
        color: rowColor, borderColor: BLACK, borderWidth: 0.5,
      })
      if (hours > 0) {
        drawRightText(page, formatNumber(hours), x, y - rowHeight + 5, colMonth, helvetica, 8)
      }
      x += colMonth
    }
    
    grandTotal += rowSum
    
    // Summe
    page.drawRectangle({
      x, y: y - rowHeight, width: colSum, height: rowHeight,
      color: rowColor, borderColor: BLACK, borderWidth: 0.5,
    })
    drawRightText(page, formatNumber(rowSum), x, y - rowHeight + 5, colSum, helveticaBold, 8)
    
    y -= rowHeight
  }
  
  // Leerzeilen falls weniger als 8 Mitarbeiter
  const minRows = 8
  for (let i = items.length; i < minRows; i++) {
    x = tableX
    const rowColor = i % 2 === 0 ? undefined : rgb(0.97, 0.97, 0.97)
    
    page.drawRectangle({ x, y: y - rowHeight, width: colNr, height: rowHeight, color: rowColor, borderColor: BLACK, borderWidth: 0.5 })
    drawCenteredText(page, String(i + 1), x, y - rowHeight + 5, colNr, helvetica, 8)
    x += colNr
    
    page.drawRectangle({ x, y: y - rowHeight, width: colName, height: rowHeight, color: rowColor, borderColor: BLACK, borderWidth: 0.5 })
    x += colName
    
    for (const month of months) {
      page.drawRectangle({ x, y: y - rowHeight, width: colMonth, height: rowHeight, color: rowColor, borderColor: BLACK, borderWidth: 0.5 })
      x += colMonth
    }
    
    page.drawRectangle({ x, y: y - rowHeight, width: colSum, height: rowHeight, color: rowColor, borderColor: BLACK, borderWidth: 0.5 })
    
    y -= rowHeight
  }
  
  // ============================================
  // SUMMENZEILE
  // ============================================
  x = tableX
  
  page.drawRectangle({
    x, y: y - rowHeight, width: colNr + colName, height: rowHeight,
    color: ACCENT_BLUE, borderColor: BLACK, borderWidth: 0.5,
  })
  page.drawText('Summe Personenstunden', {
    x: x + colNr + 4, y: y - rowHeight + 5, size: 9, font: helveticaBold,
  })
  x += colNr + colName
  
  for (const month of months) {
    const key = `${month.year}-${String(month.month).padStart(2, '0')}`
    const monthSum = totalByMonth[key] || 0
    
    page.drawRectangle({
      x, y: y - rowHeight, width: colMonth, height: rowHeight,
      color: ACCENT_BLUE, borderColor: BLACK, borderWidth: 0.5,
    })
    drawRightText(page, formatNumber(monthSum), x, y - rowHeight + 5, colMonth, helveticaBold, 8)
    x += colMonth
  }
  
  page.drawRectangle({
    x, y: y - rowHeight, width: colSum, height: rowHeight,
    color: ACCENT_BLUE, borderColor: BLACK, borderWidth: 0.5,
  })
  drawRightText(page, formatNumber(grandTotal), x, y - rowHeight + 5, colSum, helveticaBold, 9)
  
  y -= rowHeight + 25
  
  // ============================================
  // FUSSNOTE
  // ============================================
  page.drawText(
    'Die Stunden sind aus den monatlichen Stundennachweisen (Einzelstundennachweis gemäß Anlage 6.2 zum Zuwendungsbescheid) zu übernehmen.',
    { x: margin, y, size: 7, font: helvetica, color: DARK_GRAY }
  )
  
  y -= 35
  
  // ============================================
  // UNTERSCHRIFTEN
  // ============================================
  const signWidth = 200
  
  page.drawLine({
    start: { x: margin, y },
    end: { x: margin + signWidth, y },
    thickness: 0.5,
  })
  page.drawText('Ort, Datum', { x: margin, y: y - 12, size: 7, font: helvetica, color: DARK_GRAY })
  
  page.drawLine({
    start: { x: width - margin - signWidth, y },
    end: { x: width - margin, y },
    thickness: 0.5,
  })
  page.drawText('Unterschrift (Geschäftsführer/Projektleiter)', { 
    x: width - margin - signWidth, y: y - 12, size: 7, font: helvetica, color: DARK_GRAY 
  })
}

// ============================================================
// ANLAGE 1b - Abrechnung der zuwendungsfähigen Personalkosten
// ============================================================

async function createAnlage1b(
  pdfDoc: PDFDocument,
  helvetica: PDFFont,
  helveticaBold: PDFFont,
  data: {
    company: any
    project: any
    calculation: any
  }
) {
  const { company, project, calculation } = data
  
  const page = pdfDoc.addPage([595.28, 841.89]) // A4 Hochformat
  const { width, height } = page.getSize()
  
  const margin = 40
  let y = height - margin
  
  // ============================================
  // HEADER
  // ============================================
  
  // Titel-Box links
  page.drawRectangle({
    x: margin, y: y - 35, width: 160, height: 35,
    color: HEADER_BLUE, borderColor: BLACK, borderWidth: 1,
  })
  page.drawText('Anlage 1b', {
    x: margin + 8, y: y - 14, size: 13, font: helveticaBold,
  })
  page.drawText('zur Zahlungsanforderung', {
    x: margin + 8, y: y - 28, size: 8, font: helvetica,
  })
  
  // Haupttitel rechts - mehrzeilig damit er passt
  page.drawText('Abrechnung der', {
    x: margin + 175, y: y - 10, size: 11, font: helveticaBold,
  })
  page.drawText('zuwendungsfähigen Personalkosten', {
    x: margin + 175, y: y - 24, size: 11, font: helveticaBold,
  })
  
  y -= 50
  
  // ============================================
  // INFO-BOX
  // ============================================
  const boxHeight = 55
  page.drawRectangle({
    x: margin, y: y - boxHeight, width: width - 2 * margin, height: boxHeight,
    borderColor: BLACK, borderWidth: 0.5,
  })
  
  const col1X = margin + 10
  const col2X = margin + 120
  const col3X = width / 2 + 10
  const col4X = width / 2 + 140
  
  // Zeile 1
  page.drawText('Förderkennzeichen:', { x: col1X, y: y - 15, size: 8, font: helvetica, color: DARK_GRAY })
  page.drawText(project.funding_reference || '-', { x: col2X, y: y - 15, size: 10, font: helveticaBold })
  
  page.drawText('ZA-Nr.:', { x: col3X, y: y - 15, size: 8, font: helvetica, color: DARK_GRAY })
  page.drawText(String(calculation.requestNumber || '-'), { x: col4X, y: y - 15, size: 10, font: helveticaBold })
  
  // Zeile 2
  page.drawText('Zeitraum:', { x: col1X, y: y - 32, size: 8, font: helvetica, color: DARK_GRAY })
  page.drawText(`${formatDate(calculation.periodStart)} - ${formatDate(calculation.periodEnd)}`, { 
    x: col2X, y: y - 32, size: 10, font: helveticaBold 
  })
  
  page.drawText('Firma:', { x: col3X, y: y - 32, size: 8, font: helvetica, color: DARK_GRAY })
  page.drawText(company?.name || '-', { x: col4X, y: y - 32, size: 9, font: helveticaBold })
  
  // Zeile 3
  page.drawText('Vorhaben:', { x: col1X, y: y - 49, size: 8, font: helvetica, color: DARK_GRAY })
  const projectNameShort = (project.name || '-').length > 60 
    ? (project.name || '-').substring(0, 57) + '...' 
    : (project.name || '-')
  page.drawText(projectNameShort, { x: col2X, y: y - 49, size: 8, font: helvetica })
  
  y -= boxHeight + 15
  
  // ============================================
  // TABELLE
  // ============================================
  
  const items = calculation.items || []
  
  const colNr = 30
  const colName = 150
  const colQual = 50
  const colHours = 70
  const colRate = 65
  const colCosts = 85
  
  const tableWidth = colNr + colName + colQual + colHours + colRate + colCosts
  const tableX = (width - tableWidth) / 2
  
  const rowHeight = 20
  const headerHeight = 38
  
  // ============================================
  // HEADER
  // ============================================
  let x = tableX
  
  page.drawRectangle({
    x, y: y - headerHeight, width: colNr, height: headerHeight,
    color: TABLE_HEADER, borderColor: BLACK, borderWidth: 0.5,
  })
  drawCenteredText(page, 'lfd.', x, y - 14, colNr, helveticaBold, 7)
  drawCenteredText(page, 'Nr.', x, y - 25, colNr, helveticaBold, 7)
  x += colNr
  
  page.drawRectangle({
    x, y: y - headerHeight, width: colName, height: headerHeight,
    color: TABLE_HEADER, borderColor: BLACK, borderWidth: 0.5,
  })
  drawCenteredText(page, 'Mitarbeiter(in)', x, y - 20, colName, helveticaBold, 9)
  x += colName
  
  page.drawRectangle({
    x, y: y - headerHeight, width: colQual, height: headerHeight,
    color: TABLE_HEADER, borderColor: BLACK, borderWidth: 0.5,
  })
  drawCenteredText(page, 'Quali-', x, y - 14, colQual, helveticaBold, 7)
  drawCenteredText(page, 'gruppe', x, y - 25, colQual, helveticaBold, 7)
  x += colQual
  
  page.drawRectangle({
    x, y: y - headerHeight, width: colHours, height: headerHeight,
    color: TABLE_HEADER, borderColor: BLACK, borderWidth: 0.5,
  })
  drawCenteredText(page, 'Summe', x, y - 10, colHours, helveticaBold, 7)
  drawCenteredText(page, 'förderbare', x, y - 20, colHours, helveticaBold, 7)
  drawCenteredText(page, 'Stunden', x, y - 30, colHours, helveticaBold, 7)
  x += colHours
  
  page.drawRectangle({
    x, y: y - headerHeight, width: colRate, height: headerHeight,
    color: TABLE_HEADER, borderColor: BLACK, borderWidth: 0.5,
  })
  drawCenteredText(page, 'Stunden-', x, y - 14, colRate, helveticaBold, 7)
  drawCenteredText(page, 'satz (€)', x, y - 25, colRate, helveticaBold, 7)
  x += colRate
  
  page.drawRectangle({
    x, y: y - headerHeight, width: colCosts, height: headerHeight,
    color: TABLE_HEADER, borderColor: BLACK, borderWidth: 0.5,
  })
  drawCenteredText(page, 'Personal-', x, y - 14, colCosts, helveticaBold, 7)
  drawCenteredText(page, 'kosten (€)', x, y - 25, colCosts, helveticaBold, 7)
  
  y -= headerHeight
  
  // ============================================
  // DATENZEILEN
  // ============================================
  let totalHours = 0
  let totalCosts = 0
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    x = tableX
    
    const hours = item.total_hours || 0
    const rate = item.hourly_rate || 0
    const costs = item.total_costs || (hours * rate)
    
    totalHours += hours
    totalCosts += costs
    
    const rowColor = i % 2 === 0 ? undefined : rgb(0.97, 0.97, 0.97)
    
    // lfd. Nr.
    page.drawRectangle({
      x, y: y - rowHeight, width: colNr, height: rowHeight,
      color: rowColor, borderColor: BLACK, borderWidth: 0.5,
    })
    drawCenteredText(page, String(i + 1), x, y - rowHeight + 6, colNr, helvetica, 8)
    x += colNr
    
    // Name
    page.drawRectangle({
      x, y: y - rowHeight, width: colName, height: rowHeight,
      color: rowColor, borderColor: BLACK, borderWidth: 0.5,
    })
    page.drawText(item.employee_name || '-', {
      x: x + 4, y: y - rowHeight + 6, size: 8, font: helvetica,
    })
    x += colName
    
    // Qualifikationsgruppe
    page.drawRectangle({
      x, y: y - rowHeight, width: colQual, height: rowHeight,
      color: rowColor, borderColor: BLACK, borderWidth: 0.5,
    })
    drawCenteredText(page, item.qualification_group || '-', x, y - rowHeight + 6, colQual, helvetica, 8)
    x += colQual
    
    // Stunden
    page.drawRectangle({
      x, y: y - rowHeight, width: colHours, height: rowHeight,
      color: rowColor, borderColor: BLACK, borderWidth: 0.5,
    })
    drawRightText(page, formatNumber(hours), x, y - rowHeight + 6, colHours, helvetica, 8)
    x += colHours
    
    // Stundensatz
    page.drawRectangle({
      x, y: y - rowHeight, width: colRate, height: rowHeight,
      color: rowColor, borderColor: BLACK, borderWidth: 0.5,
    })
    drawRightText(page, formatNumber(rate), x, y - rowHeight + 6, colRate, helvetica, 8)
    x += colRate
    
    // Personalkosten
    page.drawRectangle({
      x, y: y - rowHeight, width: colCosts, height: rowHeight,
      color: rowColor, borderColor: BLACK, borderWidth: 0.5,
    })
    drawRightText(page, formatCurrency(costs), x, y - rowHeight + 6, colCosts, helvetica, 8)
    
    y -= rowHeight
  }
  
  // Leerzeilen
  const minRows = 12
  for (let i = items.length; i < minRows; i++) {
    x = tableX
    const rowColor = i % 2 === 0 ? undefined : rgb(0.97, 0.97, 0.97)
    
    page.drawRectangle({ x, y: y - rowHeight, width: colNr, height: rowHeight, color: rowColor, borderColor: BLACK, borderWidth: 0.5 })
    drawCenteredText(page, String(i + 1), x, y - rowHeight + 6, colNr, helvetica, 8)
    x += colNr
    page.drawRectangle({ x, y: y - rowHeight, width: colName, height: rowHeight, color: rowColor, borderColor: BLACK, borderWidth: 0.5 })
    x += colName
    page.drawRectangle({ x, y: y - rowHeight, width: colQual, height: rowHeight, color: rowColor, borderColor: BLACK, borderWidth: 0.5 })
    x += colQual
    page.drawRectangle({ x, y: y - rowHeight, width: colHours, height: rowHeight, color: rowColor, borderColor: BLACK, borderWidth: 0.5 })
    x += colHours
    page.drawRectangle({ x, y: y - rowHeight, width: colRate, height: rowHeight, color: rowColor, borderColor: BLACK, borderWidth: 0.5 })
    x += colRate
    page.drawRectangle({ x, y: y - rowHeight, width: colCosts, height: rowHeight, color: rowColor, borderColor: BLACK, borderWidth: 0.5 })
    
    y -= rowHeight
  }
  
  // ============================================
  // SUMMENZEILE PERSONALKOSTEN
  // ============================================
  x = tableX
  
  page.drawRectangle({
    x, y: y - rowHeight, width: colNr + colName + colQual, height: rowHeight,
    color: ACCENT_BLUE, borderColor: BLACK, borderWidth: 0.5,
  })
  page.drawText('Summe Personalkosten', {
    x: x + colNr + 4, y: y - rowHeight + 6, size: 9, font: helveticaBold,
  })
  x += colNr + colName + colQual
  
  page.drawRectangle({
    x, y: y - rowHeight, width: colHours, height: rowHeight,
    color: ACCENT_BLUE, borderColor: BLACK, borderWidth: 0.5,
  })
  drawRightText(page, formatNumber(totalHours), x, y - rowHeight + 6, colHours, helveticaBold, 8)
  x += colHours
  
  page.drawRectangle({
    x, y: y - rowHeight, width: colRate, height: rowHeight,
    color: ACCENT_BLUE, borderColor: BLACK, borderWidth: 0.5,
  })
  x += colRate
  
  page.drawRectangle({
    x, y: y - rowHeight, width: colCosts, height: rowHeight,
    color: ACCENT_BLUE, borderColor: BLACK, borderWidth: 0.5,
  })
  drawRightText(page, formatCurrency(totalCosts), x, y - rowHeight + 6, colCosts, helveticaBold, 9)
  
  y -= rowHeight + 15
  
  // ============================================
  // ZUSAMMENFASSUNG
  // ============================================
  const summaryX = tableX + colNr + colName + colQual
  const summaryWidth = colHours + colRate + colCosts
  const summaryRowHeight = 22
  
  // Übrige Kosten (Zuschlag)
  const overheadRate = project.overhead_rate || 0
  const overheadCosts = calculation.summary?.overhead_costs || (totalCosts * overheadRate / 100)
  
  page.drawRectangle({
    x: summaryX, y: y - summaryRowHeight, width: summaryWidth, height: summaryRowHeight,
    borderColor: BLACK, borderWidth: 0.5,
  })
  page.drawText(`+ Zuschlag übrige Kosten (${formatNumber(overheadRate)} %)`, {
    x: summaryX + 5, y: y - summaryRowHeight + 7, size: 8, font: helvetica,
  })
  drawRightText(page, formatCurrency(overheadCosts), summaryX, y - summaryRowHeight + 7, summaryWidth, helvetica, 9)
  
  y -= summaryRowHeight
  
  // Gesamtkosten
  const totalEligible = calculation.summary?.total_eligible_costs || (totalCosts + overheadCosts)
  
  page.drawRectangle({
    x: summaryX, y: y - summaryRowHeight, width: summaryWidth, height: summaryRowHeight,
    color: LIGHT_GRAY, borderColor: BLACK, borderWidth: 0.5,
  })
  page.drawText('= Zuwendungsfähige Gesamtkosten', {
    x: summaryX + 5, y: y - summaryRowHeight + 7, size: 8, font: helveticaBold,
  })
  drawRightText(page, formatCurrency(totalEligible), summaryX, y - summaryRowHeight + 7, summaryWidth, helveticaBold, 9)
  
  y -= summaryRowHeight + 8
  
  // Fördersatz
  const fundingRate = project.funding_rate || 50
  
  page.drawText(`Fördersatz:  ${formatNumber(fundingRate)} %`, {
    x: summaryX + 5, y: y - 5, size: 9, font: helvetica,
  })
  
  y -= 18
  
  // ============================================
  // ANGEFORDERTE ZUWENDUNG (Highlight-Box)
  // ============================================
  const requestedAmount = calculation.summary?.requested_amount || (totalEligible * fundingRate / 100)
  
  page.drawRectangle({
    x: summaryX, y: y - summaryRowHeight - 3, width: summaryWidth, height: summaryRowHeight + 3,
    color: HEADER_BLUE, borderColor: BLACK, borderWidth: 1.5,
  })
  page.drawText('Angeforderte Zuwendung', {
    x: summaryX + 5, y: y - summaryRowHeight + 4, size: 10, font: helveticaBold,
  })
  drawRightText(page, formatCurrency(requestedAmount) + ' €', summaryX, y - summaryRowHeight + 4, summaryWidth, helveticaBold, 11)
  
  y -= summaryRowHeight + 35
  
  // ============================================
  // UNTERSCHRIFTEN
  // ============================================
  const signWidth = 180
  
  page.drawLine({
    start: { x: margin, y },
    end: { x: margin + signWidth, y },
    thickness: 0.5,
  })
  page.drawText('Ort, Datum', { x: margin, y: y - 12, size: 7, font: helvetica, color: DARK_GRAY })
  
  page.drawLine({
    start: { x: width - margin - signWidth, y },
    end: { x: width - margin, y },
    thickness: 0.5,
  })
  page.drawText('Unterschrift (Geschäftsführer/Projektleiter)', { 
    x: width - margin - signWidth, y: y - 12, size: 7, font: helvetica, color: DARK_GRAY 
  })
}

// ============================================================
// BERECHNUNG - Alle Mitarbeiter der Firma
// ============================================================

async function calculatePaymentRequestData(
  supabase: any,
  projectId: string,
  periodStart: string,
  periodEnd: string,
  fundingRate: number,
  overheadRate: number,
  companyId: string  // NEU: Company ID um alle MA zu laden
) {
  // WICHTIG: Zuerst alle Mitarbeiter der Firma laden
  const { data: companyEmployees } = await supabase
    .from('user_profiles')
    .select('id, first_name, last_name, qualification_group')
    .eq('company_id', companyId)
    .eq('is_active', true)
  
  if (!companyEmployees || companyEmployees.length === 0) {
    return {
      items: [],
      summary: {
        total_hours: 0,
        personnel_costs: 0,
        overhead_costs: 0,
        total_eligible_costs: 0,
        requested_amount: 0,
      }
    }
  }
  
  const employeeIds = companyEmployees.map((e: any) => e.id)
  
  // time_entries für ALLE Mitarbeiter der Firma laden
  const { data: timeEntries } = await supabase
    .from('time_entries')
    .select('user_profile_id, entry_date, hours')
    .eq('project_id', projectId)
    .eq('category', 'project_work')
    .gte('entry_date', periodStart)
    .lte('entry_date', periodEnd)
    .in('user_profile_id', employeeIds)
  
  // Gruppieren nach MA und Monat
  const employeeHours: Map<string, Record<string, number>> = new Map()
  
  for (const entry of timeEntries || []) {
    const month = entry.entry_date.substring(0, 7)
    
    if (!employeeHours.has(entry.user_profile_id)) {
      employeeHours.set(entry.user_profile_id, {})
    }
    
    const hours = employeeHours.get(entry.user_profile_id)!
    hours[month] = (hours[month] || 0) + entry.hours
  }
  
  // Alle Mitarbeiter mit Stunden > 0 ermitteln
  const employeesWithHours = Array.from(employeeHours.keys())
  
  if (employeesWithHours.length === 0) {
    return {
      items: [],
      summary: {
        total_hours: 0,
        personnel_costs: 0,
        overhead_costs: 0,
        total_eligible_costs: 0,
        requested_amount: 0,
      }
    }
  }
  
  // Employee-Map für schnellen Zugriff
  const employeeMap = new Map()
  for (const emp of companyEmployees) {
    employeeMap.set(emp.id, emp)
  }
  
  // Stundensätze laden - für alle relevanten Jahre im Zeitraum
  const startYear = parseInt(periodStart.substring(0, 4))
  const endYear = parseInt(periodEnd.substring(0, 4))
  const years: number[] = []
  for (let y = startYear; y <= endYear; y++) {
    years.push(y)
  }
  
  const { data: salaries } = await supabase
    .from('salary_components')
    .select('user_profile_id, hourly_rate, year')
    .in('user_profile_id', employeesWithHours)
    .in('year', years)
  
  // Stundensatz-Map: user_id -> year -> rate
  const salaryMap = new Map<string, Map<number, number>>()
  for (const sal of salaries || []) {
    if (!salaryMap.has(sal.user_profile_id)) {
      salaryMap.set(sal.user_profile_id, new Map())
    }
    salaryMap.get(sal.user_profile_id)!.set(sal.year, sal.hourly_rate)
  }
  
  // Durchschnittlichen Stundensatz für den Zeitraum berechnen
  const getAverageHourlyRate = (userId: string): number => {
    const userSalaries = salaryMap.get(userId)
    if (!userSalaries || userSalaries.size === 0) return 0
    
    // Wenn nur ein Jahr, nimm den Satz
    if (years.length === 1) {
      return userSalaries.get(years[0]) || 0
    }
    
    // Sonst Durchschnitt (vereinfacht - könnte gewichtet werden)
    let total = 0
    let count = 0
    for (const year of years) {
      const rate = userSalaries.get(year)
      if (rate) {
        total += rate
        count++
      }
    }
    return count > 0 ? total / count : 0
  }
  
  // Items erstellen
  const items = []
  let totalHours = 0
  let totalCosts = 0
  
  for (const [employeeId, hoursByMonth] of employeeHours) {
    const employee = employeeMap.get(employeeId)
    if (!employee) continue
    
    const empTotalHours = Object.values(hoursByMonth).reduce((a: number, b: number) => a + b, 0)
    const hourlyRate = getAverageHourlyRate(employeeId)
    const empTotalCosts = empTotalHours * hourlyRate
    
    items.push({
      user_profile_id: employeeId,
      employee_name: `${employee.last_name}, ${employee.first_name}`,
      qualification_group: employee.qualification_group || '',
      hours_by_month: hoursByMonth,
      total_hours: empTotalHours,
      hourly_rate: hourlyRate,
      total_costs: empTotalCosts,
    })
    
    totalHours += empTotalHours
    totalCosts += empTotalCosts
  }
  
  items.sort((a, b) => a.employee_name.localeCompare(b.employee_name))
  
  const overheadCosts = totalCosts * (overheadRate / 100)
  const totalEligibleCosts = totalCosts + overheadCosts
  const requestedAmount = totalEligibleCosts * (fundingRate / 100)
  
  return {
    items,
    summary: {
      total_hours: Math.round(totalHours * 100) / 100,
      personnel_costs: Math.round(totalCosts * 100) / 100,
      overhead_costs: Math.round(overheadCosts * 100) / 100,
      total_eligible_costs: Math.round(totalEligibleCosts * 100) / 100,
      requested_amount: Math.round(requestedAmount * 100) / 100,
    }
  }
}