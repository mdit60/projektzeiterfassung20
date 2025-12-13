// src/app/api/fzul/pdf/route.ts
// VERSION: v2.1 - Unterjähriger Faktor wird IMMER angezeigt
// WICHTIG: Diese Datei ersetzt die alte route.ts komplett!

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

// ============================================
// INTERFACES - angepasst für FzulTimesheet
// ============================================

interface FzulDayData {
  available: number;
  projects: Record<string, { hours: number; name: string; fkz?: string }>;
  total_used: number;
  free: number;
  type: 'workday' | 'weekend' | 'holiday' | 'leave' | 'sick' | 'other';
  holiday_name?: string;
  note?: string;
  edited?: boolean;
}

interface YearlyCalculation {
  weekly_hours: number;
  vacation_days_contract: number;
  sick_days: number;
  special_leave_days: number;
  holiday_count: number;
  short_time_days: number;
  yearly_factor: number;
}

interface FzulTimesheetData {
  employee_name: string;
  year: number;
  daily_data: Record<string, FzulDayData>;
  monthly_summaries: Record<string, { available: number; used: number; free: number; leave: number; sick: number }>;
  yearly_calculation: YearlyCalculation;
  project_title?: string;
  project_fkz?: string;
  position_title?: string;
}

interface PdfRequest {
  companyId: string;
  timesheet: FzulTimesheetData;
  federalState?: string;
}

// ============================================
// KONSTANTEN
// ============================================

const FEDERAL_STATES: Record<string, string> = {
  'DE-BW': 'Baden-Württemberg', 'DE-BY': 'Bayern', 'DE-BE': 'Berlin',
  'DE-BB': 'Brandenburg', 'DE-HB': 'Bremen', 'DE-HH': 'Hamburg',
  'DE-HE': 'Hessen', 'DE-MV': 'Mecklenburg-Vorpommern', 'DE-NI': 'Niedersachsen',
  'DE-NW': 'Nordrhein-Westfalen', 'DE-RP': 'Rheinland-Pfalz', 'DE-SL': 'Saarland',
  'DE-SN': 'Sachsen', 'DE-ST': 'Sachsen-Anhalt', 'DE-SH': 'Schleswig-Holstein',
  'DE-TH': 'Thüringen',
  'BW': 'Baden-Württemberg', 'BY': 'Bayern', 'BE': 'Berlin',
  'BB': 'Brandenburg', 'HB': 'Bremen', 'HH': 'Hamburg',
  'HE': 'Hessen', 'MV': 'Mecklenburg-Vorpommern', 'NI': 'Niedersachsen',
  'NW': 'Nordrhein-Westfalen', 'RP': 'Rheinland-Pfalz', 'SL': 'Saarland',
  'SN': 'Sachsen', 'ST': 'Sachsen-Anhalt', 'SH': 'Schleswig-Holstein',
  'TH': 'Thüringen'
};

const MONTH_NAMES = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

const DAY_NAMES = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

// ============================================
// FEIERTAGS-BERECHNUNG
// ============================================

function getEasterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function getGermanHolidaysWithNames(year: number, stateCode: string): Map<string, string> {
  const holidays = new Map<string, string>();
  const easter = getEasterSunday(year);
  const normalizedState = stateCode.replace('DE-', '');
  
  const formatDate = (d: Date): string => {
    const y = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const da = String(d.getDate()).padStart(2, '0');
    return `${y}-${mo}-${da}`;
  };
  
  const addDays = (d: Date, days: number): Date => {
    const r = new Date(d);
    r.setDate(d.getDate() + days);
    return r;
  };
  
  // Bundesweite feste Feiertage
  holidays.set(`${year}-01-01`, 'Neuj.');
  holidays.set(`${year}-05-01`, 'TdA');
  holidays.set(`${year}-10-03`, 'TDE');
  holidays.set(`${year}-12-25`, '1.WT');
  holidays.set(`${year}-12-26`, '2.WT');
  
  // Bundesweite bewegliche Feiertage
  holidays.set(formatDate(addDays(easter, -2)), 'Karfr.');
  holidays.set(formatDate(easter), 'OS');
  holidays.set(formatDate(addDays(easter, 1)), 'OM');
  holidays.set(formatDate(addDays(easter, 39)), 'Chr.Hi');
  holidays.set(formatDate(addDays(easter, 49)), 'PS');
  holidays.set(formatDate(addDays(easter, 50)), 'PfM');
  
  // Landesspezifische Feiertage
  if (['BW', 'BY', 'ST'].includes(normalizedState)) {
    holidays.set(`${year}-01-06`, 'Hl.3K.');
  }
  if (['BE', 'MV'].includes(normalizedState)) {
    holidays.set(`${year}-03-08`, 'Frau.');
  }
  if (['BW', 'BY', 'HE', 'NW', 'RP', 'SL'].includes(normalizedState)) {
    holidays.set(formatDate(addDays(easter, 60)), 'Fronl.');
  }
  if (['SL', 'BY'].includes(normalizedState)) {
    holidays.set(`${year}-08-15`, 'Mar.Hi');
  }
  if (['TH'].includes(normalizedState)) {
    holidays.set(`${year}-09-20`, 'WKT');
  }
  if (['BB', 'HB', 'HH', 'MV', 'NI', 'SN', 'ST', 'SH', 'TH'].includes(normalizedState)) {
    holidays.set(`${year}-10-31`, 'Ref.');
  }
  if (['BW', 'BY', 'NW', 'RP', 'SL'].includes(normalizedState)) {
    holidays.set(`${year}-11-01`, 'Allerh.');
  }
  if (['SN'].includes(normalizedState)) {
    const nov23 = new Date(year, 10, 23);
    const dayOfWeek = nov23.getDay();
    const daysBack = (dayOfWeek + 7 - 3) % 7;
    const bussUndBettag = new Date(nov23);
    bussUndBettag.setDate(nov23.getDate() - (daysBack === 0 ? 7 : daysBack));
    holidays.set(formatDate(bussUndBettag), 'B&B');
  }
  
  return holidays;
}

// ============================================
// PDF-GENERIERUNG - 1:1 wie BMF-Formular
// ============================================

async function generateFzulPdf(data: PdfRequest): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  // A4 Querformat
  const pageWidth = 842;
  const pageHeight = 595;
  
  const ts = data.timesheet;
  const stateCode = data.federalState || 'DE-NW';
  const year = ts.year;
  const yc = ts.yearly_calculation;
  
  // Feiertage für dieses Jahr
  const holidays = getGermanHolidaysWithNames(year, stateCode);
  
  // ============================================
  // SEITE 1: Kalender (Stundennachweis)
  // ============================================
  const page1 = pdfDoc.addPage([pageWidth, pageHeight]);
  
  // Gelber Header-Balken
  page1.drawRectangle({
    x: 20, y: pageHeight - 55, width: pageWidth - 40, height: 35,
    color: rgb(1, 0.92, 0.7),
    borderColor: rgb(0.8, 0.7, 0.4), borderWidth: 1,
  });
  
  page1.drawText('Steuerliche Förderung von Forschung und Entwicklung (FuE) –', {
    x: 25, y: pageHeight - 35, size: 10, font: helveticaBold,
  });
  page1.drawText('Stundenaufzeichnung für FuE-Tätigkeiten in einem begünstigten FuE-Vorhaben', {
    x: 25, y: pageHeight - 48, size: 10, font: helveticaBold,
  });
  
  // Projekt-Info Box
  const projBoxY = pageHeight - 100;
  page1.drawRectangle({
    x: 20, y: projBoxY, width: pageWidth - 40, height: 40,
    borderColor: rgb(0.6, 0.6, 0.6), borderWidth: 0.5,
  });
  
  // Zeile 1: Kurzbezeichnung + Wirtschaftsjahr
  page1.drawText('Kurzbezeichnung des FuE-Vorhabens:', {
    x: 25, y: projBoxY + 25, size: 7, font: helvetica,
  });
  
  // Projektname umbrechen wenn zu lang
  const projectTitle = ts.project_title || '-';
  const maxTitleWidth = 450;
  let displayTitle = projectTitle;
  if (helvetica.widthOfTextAtSize(projectTitle, 8) > maxTitleWidth) {
    while (helvetica.widthOfTextAtSize(displayTitle + '...', 8) > maxTitleWidth && displayTitle.length > 10) {
      displayTitle = displayTitle.slice(0, -1);
    }
    displayTitle += '...';
  }
  page1.drawText(displayTitle, {
    x: 150, y: projBoxY + 25, size: 8, font: helveticaBold,
  });
  
  page1.drawText('Wirtschaftsjahr:', {
    x: pageWidth - 120, y: projBoxY + 25, size: 7, font: helvetica,
  });
  page1.drawText(String(year), {
    x: pageWidth - 50, y: projBoxY + 25, size: 10, font: helveticaBold,
  });
  
  // Zeile 2: Vorhaben-ID + Bundesland
  page1.drawText('Vorhaben-ID des FuE-Vorhabens:', {
    x: 25, y: projBoxY + 8, size: 7, font: helvetica,
  });
  page1.drawText(ts.project_fkz || '-', {
    x: 150, y: projBoxY + 8, size: 8, font: helveticaBold,
  });
  
  page1.drawText('Bundesland:', {
    x: pageWidth - 120, y: projBoxY + 8, size: 7, font: helvetica,
  });
  page1.drawText(FEDERAL_STATES[stateCode] || stateCode, {
    x: pageWidth - 50, y: projBoxY + 8, size: 6, font: helvetica,
  });
  
  // Mitarbeiter-Box
  const empBoxY = projBoxY - 25;
  page1.drawRectangle({
    x: 20, y: empBoxY, width: pageWidth - 40, height: 20,
    color: rgb(0.97, 0.97, 0.97),
    borderColor: rgb(0.6, 0.6, 0.6), borderWidth: 0.5,
  });
  
  const nameParts = ts.employee_name.split(',');
  const nachname = nameParts[0]?.trim() || ts.employee_name;
  const vorname = nameParts[1]?.trim() || '';
  
  page1.drawText('Name:', { x: 25, y: empBoxY + 6, size: 7, font: helvetica });
  page1.drawText(nachname, { x: 55, y: empBoxY + 6, size: 9, font: helveticaBold });
  
  page1.drawText('Vorname:', { x: 180, y: empBoxY + 6, size: 7, font: helvetica });
  page1.drawText(vorname, { x: 220, y: empBoxY + 6, size: 9, font: helveticaBold });
  
  page1.drawText('Kurzbezeichnung der FuE-Tätigkeit:', { x: 400, y: empBoxY + 6, size: 7, font: helvetica });
  page1.drawText(ts.position_title || 'Entwickler', { x: 550, y: empBoxY + 6, size: 8, font: helvetica });
  
  // Kalender-Header
  const calHeaderY = empBoxY - 18;
  page1.drawRectangle({
    x: 20, y: calHeaderY, width: pageWidth - 40, height: 14,
    color: rgb(1, 0.92, 0.7),
  });
  page1.drawText('Dokumentation der Arbeitsstunden für FuE-Tätigkeiten im FuE-Vorhaben je Arbeitstag', {
    x: 25, y: calHeaderY + 3, size: 8, font: helveticaBold,
  });
  
  // Kalender-Tabelle
  const tableStartY = calHeaderY - 2;
  const rowHeight = 14;
  const colWidths = { month: 45, day: 18.5, sum: 28, confirm: 55 };
  
  // Spaltenüberschriften
  const headerY = tableStartY - rowHeight;
  page1.drawRectangle({
    x: 20, y: headerY, width: pageWidth - 40, height: rowHeight,
    color: rgb(0.95, 0.93, 0.85),
  });
  
  page1.drawText('Monat', { x: 23, y: headerY + 4, size: 6, font: helveticaBold });
  
  for (let d = 1; d <= 31; d++) {
    const xPos = 20 + colWidths.month + (d - 1) * colWidths.day;
    page1.drawText(String(d), {
      x: xPos + (d < 10 ? 7 : 4), y: headerY + 4, size: 6, font: helveticaBold,
    });
    page1.drawLine({
      start: { x: xPos, y: headerY }, end: { x: xPos, y: headerY + rowHeight },
      thickness: 0.3, color: rgb(0.7, 0.7, 0.7),
    });
  }
  
  const sumX = 20 + colWidths.month + 31 * colWidths.day;
  page1.drawText('insg.', { x: sumX + 3, y: headerY + 4, size: 6, font: helveticaBold });
  page1.drawText('Bestätigung', { x: sumX + colWidths.sum + 3, y: headerY + 4, size: 5, font: helveticaBold });
  
  page1.drawLine({
    start: { x: 20, y: headerY }, end: { x: pageWidth - 20, y: headerY },
    thickness: 0.5, color: rgb(0.5, 0.5, 0.5),
  });
  
  // Monatszeilen
  let totalFreeHours = 0;
  
  for (let m = 1; m <= 12; m++) {
    const monthNum = String(m).padStart(2, '0');
    const yPos = headerY - (m * rowHeight);
    const daysInMonth = new Date(year, m, 0).getDate();
    
    if (m % 2 === 0) {
      page1.drawRectangle({
        x: 20, y: yPos, width: pageWidth - 40, height: rowHeight,
        color: rgb(0.98, 0.98, 0.98),
      });
    }
    
    page1.drawText(MONTH_NAMES[m - 1].substring(0, 3), {
      x: 23, y: yPos + 4, size: 7, font: helvetica,
    });
    
    let monthFreeHours = 0;
    
    for (let d = 1; d <= 31; d++) {
      const xPos = 20 + colWidths.month + (d - 1) * colWidths.day;
      const dayStr = String(d).padStart(2, '0');
      const dateStr = `${year}-${monthNum}-${dayStr}`;
      
      page1.drawLine({
        start: { x: xPos, y: yPos }, end: { x: xPos, y: yPos + rowHeight },
        thickness: 0.2, color: rgb(0.8, 0.8, 0.8),
      });
      
      if (d > daysInMonth) {
        page1.drawRectangle({
          x: xPos, y: yPos, width: colWidths.day, height: rowHeight,
          color: rgb(0.9, 0.9, 0.9),
        });
        continue;
      }
      
      const dayData = ts.daily_data[dateStr];
      const date = new Date(year, m - 1, d);
      const dayOfWeek = date.getDay();
      
      let cellText = '';
      let textColor = rgb(0, 0, 0);
      let bgColor: { r: number; g: number; b: number } | null = null;
      let fontSize = 6;
      
      if (dayData) {
        switch (dayData.type) {
          case 'weekend':
            cellText = DAY_NAMES[dayOfWeek];
            textColor = dayOfWeek === 0 ? rgb(0.7, 0.2, 0.2) : rgb(0.5, 0.5, 0.5);
            bgColor = { r: 0.85, g: 0.85, b: 0.85 };
            break;
          case 'holiday':
            cellText = holidays.get(dateStr) || dayData.holiday_name || 'Fei';
            textColor = rgb(0.1, 0.3, 0.7);
            bgColor = { r: 0.85, g: 0.9, b: 1 };
            fontSize = cellText.length > 4 ? 4 : cellText.length > 2 ? 5 : 6;
            break;
          case 'leave':
            cellText = 'U';
            textColor = rgb(0.1, 0.4, 0.7);
            bgColor = { r: 0.9, g: 0.95, b: 1 };
            break;
          case 'sick':
            cellText = 'K';
            textColor = rgb(0.6, 0.4, 0);
            bgColor = { r: 1, g: 0.95, b: 0.85 };
            break;
          case 'other':
            cellText = 'S';
            textColor = rgb(0.4, 0.4, 0.4);
            bgColor = { r: 0.92, g: 0.92, b: 0.92 };
            break;
          case 'workday':
            if (dayData.free > 0) {
              const freeRounded = Math.round(dayData.free * 100) / 100;
              cellText = freeRounded % 1 === 0 ? String(freeRounded) : freeRounded.toFixed(1);
              monthFreeHours += dayData.free;
            }
            break;
        }
      }
      
      if (bgColor) {
        page1.drawRectangle({
          x: xPos, y: yPos, width: colWidths.day, height: rowHeight,
          color: rgb(bgColor.r, bgColor.g, bgColor.b),
        });
      }
      
      if (cellText) {
        page1.drawText(cellText, {
          x: xPos + 2, y: yPos + 4, size: fontSize, font: helvetica, color: textColor,
        });
      }
    }
    
    totalFreeHours += monthFreeHours;
    
    page1.drawRectangle({
      x: sumX, y: yPos, width: colWidths.sum, height: rowHeight,
      color: rgb(0.92, 0.97, 0.92),
    });
    
    if (monthFreeHours > 0) {
      const sumText = monthFreeHours % 1 === 0 ? String(monthFreeHours) : monthFreeHours.toFixed(1);
      page1.drawText(sumText, {
        x: sumX + 2, y: yPos + 4, size: 6, font: helveticaBold,
      });
    }
    
    page1.drawRectangle({
      x: sumX + colWidths.sum, y: yPos, width: colWidths.confirm, height: rowHeight,
      borderColor: rgb(0.8, 0.8, 0.8), borderWidth: 0.3,
    });
    page1.drawText('Unterschrift', {
      x: sumX + colWidths.sum + 2, y: yPos + 4, size: 5, font: helvetica, color: rgb(0.6, 0.6, 0.6),
    });
    
    page1.drawLine({
      start: { x: 20, y: yPos }, end: { x: pageWidth - 20, y: yPos },
      thickness: 0.3, color: rgb(0.7, 0.7, 0.7),
    });
  }
  
  // Summenzeile
  const sumRowY = headerY - (13 * rowHeight);
  page1.drawRectangle({
    x: 20, y: sumRowY, width: pageWidth - 40, height: rowHeight + 2,
    color: rgb(1, 0.92, 0.7),
    borderColor: rgb(0.7, 0.6, 0.3), borderWidth: 1,
  });
  
  page1.drawText('Summe der Arbeitsstunden für FuE-Tätigkeiten im FuE-Vorhaben:', {
    x: 25, y: sumRowY + 5, size: 8, font: helveticaBold,
  });
  
  page1.drawRectangle({
    x: sumX, y: sumRowY, width: colWidths.sum, height: rowHeight + 2,
    color: rgb(0.85, 0.95, 0.85),
    borderColor: rgb(0, 0.5, 0), borderWidth: 1,
  });
  
  const totalText = totalFreeHours.toFixed(2).replace('.', ',');
  page1.drawText(totalText, {
    x: sumX + 2, y: sumRowY + 5, size: 8, font: helveticaBold, color: rgb(0, 0.4, 0),
  });
  
  // ============================================
  // SEITE 2: Ermittlung Jahresarbeitszeit
  // ============================================
  const page2 = pdfDoc.addPage([pageWidth, pageHeight]);
  
  // Header
  page2.drawRectangle({
    x: 20, y: pageHeight - 55, width: pageWidth - 40, height: 35,
    color: rgb(1, 0.92, 0.7),
    borderColor: rgb(0.8, 0.7, 0.4), borderWidth: 1,
  });
  
  page2.drawText('Steuerliche Förderung von Forschung und Entwicklung (FuE) –', {
    x: 25, y: pageHeight - 35, size: 10, font: helveticaBold,
  });
  page2.drawText('Ermittlung der Jahresarbeitszeit und des FuE-Anteils', {
    x: 25, y: pageHeight - 48, size: 10, font: helveticaBold,
  });
  
  // Mitarbeiter + Jahr
  page2.drawText(`Mitarbeiter: ${ts.employee_name}`, {
    x: 25, y: pageHeight - 75, size: 10, font: helveticaBold,
  });
  page2.drawText(`Wirtschaftsjahr: ${year}`, {
    x: 400, y: pageHeight - 75, size: 10, font: helveticaBold,
  });
  
  // Block 1: Ermittlung der Jahresarbeitszeit
  const block1Y = pageHeight - 120;
  page2.drawRectangle({
    x: 20, y: block1Y - 240, width: 500, height: 255,
    borderColor: rgb(0.6, 0.6, 0.6), borderWidth: 1,
  });
  
  page2.drawRectangle({
    x: 20, y: block1Y, width: 500, height: 18,
    color: rgb(1, 0.92, 0.7),
  });
  page2.drawText('1. Ermittlung der maßgeblichen vereinbarten Jahresarbeitszeit', {
    x: 25, y: block1Y + 4, size: 9, font: helveticaBold,
  });
  
  // Berechnungswerte
  const dailyHours = yc.weekly_hours / 5;
  const yearlyHours = yc.weekly_hours * 52;
  
  const deductions = [
    { label: 'Arbeitsvertraglich vereinbarter Urlaubsanspruch', days: yc.vacation_days_contract },
    { label: 'Krankheitstage', days: yc.sick_days },
    { label: 'Sonderurlaub', days: yc.special_leave_days },
    { label: 'Gesetzliche Feiertage', days: yc.holiday_count },
    { label: 'Kurzarbeit, Erziehungsurlaub u. ä.', days: yc.short_time_days },
  ];
  
  let totalDeductionHours = 0;
  deductions.forEach(d => { totalDeductionHours += d.days * dailyHours; });
  
  const availableHours = yearlyHours - totalDeductionHours;
  const adjustedHours = availableHours * yc.yearly_factor;
  
  let lineY = block1Y - 25;
  const lineHeight = 22;
  
  // Wöchentliche Arbeitszeit
  page2.drawText('wöchentliche Arbeitszeit:', { x: 30, y: lineY, size: 9, font: helvetica });
  page2.drawText(`${yc.weekly_hours}`, { x: 350, y: lineY, size: 9, font: helveticaBold });
  page2.drawText('Stunden', { x: 400, y: lineY, size: 9, font: helvetica });
  
  lineY -= lineHeight;
  page2.drawText('Jahresarbeitsstunden (wöchentl. × 52):', { x: 30, y: lineY, size: 9, font: helvetica });
  page2.drawText(`${yearlyHours}`, { x: 350, y: lineY, size: 9, font: helveticaBold });
  page2.drawText('Stunden', { x: 400, y: lineY, size: 9, font: helvetica });
  
  lineY -= 15;
  page2.drawText('Abzüglich:', { x: 30, y: lineY, size: 8, font: helvetica, color: rgb(0.4, 0.4, 0.4) });
  
  // Abzüge
  for (const ded of deductions) {
    lineY -= lineHeight;
    const dedHours = ded.days * dailyHours;
    page2.drawText(`–  ${ded.label}`, { x: 40, y: lineY, size: 9, font: helvetica });
    page2.drawText(`${ded.days} Tage × ${dailyHours.toFixed(1)}h =`, { x: 280, y: lineY, size: 8, font: helvetica });
    page2.drawText(`–${Math.round(dedHours)}`, { x: 370, y: lineY, size: 9, font: helvetica, color: rgb(0.6, 0, 0) });
    page2.drawText('Stunden', { x: 400, y: lineY, size: 9, font: helvetica });
  }
  
  // Trennlinie
  lineY -= 10;
  page2.drawLine({
    start: { x: 30, y: lineY }, end: { x: 480, y: lineY },
    thickness: 1, color: rgb(0, 0, 0),
  });
  
  // Verfügbare Jahresarbeitszeit
  lineY -= 18;
  page2.drawRectangle({
    x: 25, y: lineY - 5, width: 480, height: 22,
    color: rgb(0.95, 0.98, 0.95),
  });
  page2.drawText('= Maßgebliche vereinbarte Jahresarbeitszeit:', { x: 30, y: lineY, size: 9, font: helveticaBold });
  page2.drawText(`${Math.round(availableHours)}`, { x: 350, y: lineY, size: 10, font: helveticaBold, color: rgb(0, 0.4, 0) });
  page2.drawText('Stunden', { x: 400, y: lineY, size: 9, font: helveticaBold });
  
  // NEU v2.1: Unterjähriger Faktor wird IMMER angezeigt
  lineY -= lineHeight;
  const factorText = yc.yearly_factor < 1 
    ? `Ggf. Kürzung bei unterjährigem Beginn/Ende (Faktor ${yc.yearly_factor.toFixed(3)}):`
    : `Ggf. Kürzung bei unterjährigem Beginn/Ende (×/12):`;
  const factorColor = yc.yearly_factor < 1 ? rgb(0, 0, 0) : rgb(0.5, 0.5, 0.5);
  
  page2.drawText(factorText, { x: 40, y: lineY, size: 8, font: helvetica, color: factorColor });
  page2.drawText(`${yc.yearly_factor.toFixed(3)}`, { x: 350, y: lineY, size: 9, font: helvetica });
  page2.drawText(`= ${Math.round(adjustedHours)} Stunden`, { x: 400, y: lineY, size: 8, font: helvetica, color: factorColor });
  
  // Block 2: FuE-Anteil
  const block2Y = block1Y - 280;
  page2.drawRectangle({
    x: 20, y: block2Y - 80, width: 500, height: 95,
    borderColor: rgb(0.6, 0.6, 0.6), borderWidth: 1,
  });
  
  page2.drawRectangle({
    x: 20, y: block2Y, width: 500, height: 18,
    color: rgb(1, 0.92, 0.7),
  });
  page2.drawText('2. Ermittlung des Anteils der Arbeitszeit für FuE-Tätigkeiten im FuE-Vorhaben', {
    x: 25, y: block2Y + 4, size: 9, font: helveticaBold,
  });
  
  lineY = block2Y - 25;
  page2.drawText('Summe der Arbeitsstunden für FuE-Tätigkeiten (aus Kalender):', { x: 30, y: lineY, size: 9, font: helvetica });
  page2.drawText(totalText, { x: 350, y: lineY, size: 10, font: helveticaBold, color: rgb(0, 0.4, 0) });
  page2.drawText('Stunden', { x: 400, y: lineY, size: 9, font: helvetica });
  
  lineY -= lineHeight;
  const effectiveHours = yc.yearly_factor < 1 ? adjustedHours : availableHours;
  page2.drawText('÷ Maßgebliche vereinbarte Jahresarbeitszeit:', { x: 30, y: lineY, size: 9, font: helvetica });
  page2.drawText(`${Math.round(effectiveHours)}`, { x: 350, y: lineY, size: 9, font: helvetica });
  page2.drawText('Stunden', { x: 400, y: lineY, size: 9, font: helvetica });
  
  // Trennlinie
  lineY -= 10;
  page2.drawLine({
    start: { x: 30, y: lineY }, end: { x: 480, y: lineY },
    thickness: 1, color: rgb(0, 0, 0),
  });
  
  // FuE-Anteil
  lineY -= 20;
  const fuePercentage = effectiveHours > 0 ? (totalFreeHours / effectiveHours) : 0;
  page2.drawRectangle({
    x: 25, y: lineY - 5, width: 480, height: 22,
    color: rgb(0.9, 1, 0.9),
    borderColor: rgb(0, 0.5, 0), borderWidth: 1,
  });
  page2.drawText('= Anteil der Arbeitszeit für FuE-Tätigkeiten im FuE-Vorhaben:', { x: 30, y: lineY, size: 9, font: helveticaBold });
  page2.drawText(fuePercentage.toFixed(2), { x: 350, y: lineY, size: 12, font: helveticaBold, color: rgb(0, 0.4, 0) });
  page2.drawText(`(${(fuePercentage * 100).toFixed(1)}%)`, { x: 400, y: lineY, size: 9, font: helvetica, color: rgb(0.4, 0.4, 0.4) });
  
  // Unterschriften
  const sigY = block2Y - 150;
  
  page2.drawText('Unterschrift Mitarbeiter:', { x: 30, y: sigY, size: 9, font: helvetica });
  page2.drawLine({
    start: { x: 150, y: sigY - 2 }, end: { x: 320, y: sigY - 2 },
    thickness: 0.5, color: rgb(0, 0, 0),
  });
  page2.drawText('Datum:', { x: 340, y: sigY, size: 9, font: helvetica });
  page2.drawLine({
    start: { x: 380, y: sigY - 2 }, end: { x: 480, y: sigY - 2 },
    thickness: 0.5, color: rgb(0, 0, 0),
  });
  
  page2.drawText('Unterschrift Projektleiter:', { x: 30, y: sigY - 35, size: 9, font: helvetica });
  page2.drawLine({
    start: { x: 150, y: sigY - 37 }, end: { x: 320, y: sigY - 37 },
    thickness: 0.5, color: rgb(0, 0, 0),
  });
  page2.drawText('Datum:', { x: 340, y: sigY - 35, size: 9, font: helvetica });
  page2.drawLine({
    start: { x: 380, y: sigY - 37 }, end: { x: 480, y: sigY - 37 },
    thickness: 0.5, color: rgb(0, 0, 0),
  });
  
  // Footer
  const footerText = `Erstellt am: ${new Date().toLocaleDateString('de-DE')} | ${ts.employee_name} | ${ts.project_title || '-'}`;
  page2.drawText(footerText, {
    x: 25, y: 25, size: 7, font: helvetica, color: rgb(0.5, 0.5, 0.5),
  });
  
  return await pdfDoc.save();
}

// ============================================
// API HANDLER
// ============================================

export async function POST(request: NextRequest) {
  try {
    const body: PdfRequest = await request.json();
    
    // Validierung
    if (!body.timesheet) {
      return NextResponse.json({ error: 'Timesheet-Daten fehlen' }, { status: 400 });
    }
    
    const ts = body.timesheet;
    if (!ts.employee_name || !ts.year || !ts.daily_data || !ts.yearly_calculation) {
      return NextResponse.json({ error: 'Unvollständige Timesheet-Daten' }, { status: 400 });
    }
    
    console.log('[PDF] Generiere PDF für:', ts.employee_name, ts.year);
    
    // PDF generieren
    const pdfBytes = await generateFzulPdf(body);
    const pdfBuffer = Buffer.from(pdfBytes);
    
    // Dateiname
    const cleanName = ts.employee_name.replace(/[,\s]+/g, '_').replace(/_+/g, '_');
    const filename = `FZul_${cleanName}_${ts.year}.pdf`;
    
    console.log('[PDF] Generiert:', filename, pdfBuffer.length, 'bytes');
    
    // In Datenbank speichern (optional)
    if (body.companyId) {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        const pdfBase64 = pdfBuffer.toString('base64');
        
        // Upsert: Update wenn existiert, sonst Insert
        const { data: existing } = await supabase
          .from('fzul_pdf_archive')
          .select('id')
          .eq('company_id', body.companyId)
          .eq('employee_name', ts.employee_name)
          .eq('year', ts.year)
          .single();
        
        if (existing) {
          await supabase
            .from('fzul_pdf_archive')
            .update({
              pdf_data: pdfBase64,
              filename,
              file_size: pdfBuffer.length,
              project_short_name: ts.project_title,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id);
          console.log('[PDF] Aktualisiert in DB:', existing.id);
        } else {
          const { data: inserted } = await supabase
            .from('fzul_pdf_archive')
            .insert({
              company_id: body.companyId,
              filename,
              file_size: pdfBuffer.length,
              pdf_data: pdfBase64,
              employee_name: ts.employee_name,
              year: ts.year,
              project_short_name: ts.project_title,
            })
            .select('id')
            .single();
          console.log('[PDF] Gespeichert in DB:', inserted?.id);
        }
      } catch (dbError) {
        console.error('[PDF] DB-Fehler (ignoriert):', dbError);
        // Weiter machen - PDF wurde trotzdem generiert
      }
    }
    
    // PDF zurückgeben
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(pdfBuffer.length),
      },
    });
    
  } catch (error) {
    console.error('[PDF] Fehler:', error);
    return NextResponse.json(
      { error: 'Fehler bei der PDF-Generierung', details: String(error) },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pdfId = searchParams.get('id');
    
    if (!pdfId) {
      return NextResponse.json({ error: 'PDF-ID erforderlich' }, { status: 400 });
    }
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data: pdf, error } = await supabase
      .from('fzul_pdf_archive')
      .select('pdf_data, filename')
      .eq('id', pdfId)
      .single();
    
    if (error || !pdf || !pdf.pdf_data) {
      return NextResponse.json({ error: 'PDF nicht gefunden' }, { status: 404 });
    }
    
    const pdfBuffer = Buffer.from(pdf.pdf_data, 'base64');
    
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${pdf.filename}"`,
        'Content-Length': String(pdfBuffer.length),
      },
    });
    
  } catch (error) {
    console.error('[PDF] Download-Fehler:', error);
    return NextResponse.json({ error: 'Fehler beim PDF-Download' }, { status: 500 });
  }
}