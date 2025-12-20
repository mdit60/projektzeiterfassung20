// src/app/api/export/fzul/route.ts
// VERSION: v2.3 - Header-Felder (Vorhaben, FKZ, Tätigkeit) werden in Excel geschrieben
// ÄNDERUNGEN v2.3:
// - NEU: projectTitle, projectFkz, positionTitle aus Request lesen
// - NEU: Diese Felder in die entsprechenden Excel-Zellen schreiben
// ÄNDERUNGEN v2.2:
// - Bundesland-Name wird in Excel-Zelle geschrieben (nicht nur für Feiertage)
// - stateCode aus Request für korrekte Feiertage UND Anzeige

import { NextRequest, NextResponse } from 'next/server';
import path from 'path';

// xlsx-populate muss installiert werden: pnpm add xlsx-populate
// @ts-ignore - xlsx-populate hat keine TypeScript-Definitionen
import XlsxPopulate from 'xlsx-populate';

// Deutsche Feiertage berechnen - MIT BUNDESLAND
const getEasterSunday = (year: number): Date => {
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
};

// NEU v2.1: Dynamische Feiertagsberechnung nach Bundesland
const getGermanHolidays = (year: number, stateCode: string = 'DE-NW'): Set<string> => {
  const holidays = new Set<string>();
  const easter = getEasterSunday(year);
  
  const formatDate = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  
  const addDays = (d: Date, days: number): string => {
    const r = new Date(d);
    r.setDate(d.getDate() + days);
    return formatDate(r);
  };
  
  // Bundesweite Feiertage
  holidays.add(`${year}-01-01`);        // Neujahr
  holidays.add(addDays(easter, -2));    // Karfreitag
  holidays.add(addDays(easter, 1));     // Ostermontag
  holidays.add(`${year}-05-01`);        // Tag der Arbeit
  holidays.add(addDays(easter, 39));    // Christi Himmelfahrt
  holidays.add(addDays(easter, 50));    // Pfingstmontag
  holidays.add(`${year}-10-03`);        // Tag der Deutschen Einheit
  holidays.add(`${year}-12-25`);        // 1. Weihnachtstag
  holidays.add(`${year}-12-26`);        // 2. Weihnachtstag
  
  // Landesspezifische Feiertage
  const state = stateCode || 'DE-NW';
  
  // Heilige Drei Könige (6. Januar): BW, BY, ST
  if (['DE-BW', 'DE-BY', 'DE-ST'].includes(state)) {
    holidays.add(`${year}-01-06`);
  }
  
  // Internationaler Frauentag (8. März): BE, MV
  if (['DE-BE', 'DE-MV'].includes(state)) {
    holidays.add(`${year}-03-08`);
  }
  
  // Fronleichnam (60 Tage nach Ostern): BW, BY, HE, NW, RP, SL
  if (['DE-BW', 'DE-BY', 'DE-HE', 'DE-NW', 'DE-RP', 'DE-SL'].includes(state)) {
    holidays.add(addDays(easter, 60));
  }
  
  // Mariä Himmelfahrt (15. August): SL (und BY nur in kath. Gemeinden)
  if (['DE-SL'].includes(state)) {
    holidays.add(`${year}-08-15`);
  }
  
  // Weltkindertag (20. September): TH
  if (['DE-TH'].includes(state)) {
    holidays.add(`${year}-09-20`);
  }
  
  // Reformationstag (31. Oktober): BB, HB, HH, MV, NI, SN, ST, SH, TH
  if (['DE-BB', 'DE-HB', 'DE-HH', 'DE-MV', 'DE-NI', 'DE-SN', 'DE-ST', 'DE-SH', 'DE-TH'].includes(state)) {
    holidays.add(`${year}-10-31`);
  }
  
  // Allerheiligen (1. November): BW, BY, NW, RP, SL
  if (['DE-BW', 'DE-BY', 'DE-NW', 'DE-RP', 'DE-SL'].includes(state)) {
    holidays.add(`${year}-11-01`);
  }
  
  // Buß- und Bettag (Mittwoch vor dem 23. November): SN
  if (['DE-SN'].includes(state)) {
    const nov23 = new Date(year, 10, 23);
    const dayOfWeek = nov23.getDay();
    const daysBack = (dayOfWeek + 7 - 3) % 7;
    const bussUndBettag = new Date(nov23);
    bussUndBettag.setDate(nov23.getDate() - (daysBack === 0 ? 7 : daysBack));
    holidays.add(formatDate(bussUndBettag));
  }
  
  return holidays;
};

// NEU v2.2: Bundesland-Namen für Excel-Ausgabe
const BUNDESLAND_NAMEN: Record<string, string> = {
  'DE-BW': 'Baden-Württemberg',
  'DE-BY': 'Bayern',
  'DE-BE': 'Berlin',
  'DE-BB': 'Brandenburg',
  'DE-HB': 'Bremen',
  'DE-HH': 'Hamburg',
  'DE-HE': 'Hessen',
  'DE-MV': 'Mecklenburg-Vorpommern',
  'DE-NI': 'Niedersachsen',
  'DE-NW': 'Nordrhein-Westfalen',
  'DE-RP': 'Rheinland-Pfalz',
  'DE-SL': 'Saarland',
  'DE-SN': 'Sachsen',
  'DE-ST': 'Sachsen-Anhalt',
  'DE-SH': 'Schleswig-Holstein',
  'DE-TH': 'Thüringen'
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // NEU v2.3: Header-Felder aus Request lesen
    const { empName, year, dayData, settings, stateCode, projectTitle, projectFkz, positionTitle } = body;
    
    // NEU v2.1: Bundesland aus Request verwenden (Fallback: NRW)
    const effectiveStateCode = stateCode || 'DE-NW';
    console.log('[API] Excel-Export für Bundesland:', effectiveStateCode);
    console.log('[API] Header-Felder:', { projectTitle, projectFkz, positionTitle });
    
    const maxDaily = settings.weekly_hours / 5;
    const holidays = getGermanHolidays(year, effectiveStateCode);
    
    // Name splitten
    const nameParts = empName.split(',').map((p: string) => p.trim());
    const lastName = nameParts[0] || empName;
    const firstName = nameParts[1] || '';
    
    // Vorlage laden
    const templatePath = path.join(process.cwd(), 'public', 'templates', 'FZul_Vorlage.xlsx');
    
    let workbook;
    try {
      workbook = await XlsxPopulate.fromFileAsync(templatePath);
      console.log('[API] FZul-Vorlage geladen');
    } catch (e) {
      console.error('[API] Vorlage nicht gefunden:', templatePath);
      return NextResponse.json({ error: 'Vorlage nicht gefunden' }, { status: 404 });
    }
    
    const sheet = workbook.sheet(0);
    
    // === KOPFDATEN EINTRAGEN ===
    
    // NEU v2.3: Header-Felder in Excel schreiben
    // Kurzbezeichnung des FuE-Vorhabens (Zeile 2)
    if (projectTitle) {
      sheet.cell('I3').value(projectTitle);
      console.log('[API] Kurzbezeichnung geschrieben:', projectTitle);
    }
    
    // Vorhaben-ID des FuE-Vorhabens (Zeile 3)
    if (projectFkz) {
      sheet.cell('I4').value(projectFkz);
      console.log('[API] Vorhaben-ID geschrieben:', projectFkz);
    }
    
    // Mitarbeiter-Name
    sheet.cell('B6').value(lastName);
    sheet.cell('M6').value(firstName);
    
    // NEU v2.3: FuE-Tätigkeit (Zeile 6, nach Vorname)
    if (positionTitle) {
      sheet.cell('AD6').value(positionTitle);
      console.log('[API] FuE-Tätigkeit geschrieben:', positionTitle);
    }
    
    // Jahr
    sheet.cell('AD3').value(year);
    
    // NEU v2.2: Bundesland in Excel schreiben
    const bundeslandName = BUNDESLAND_NAMEN[effectiveStateCode] || effectiveStateCode.replace('DE-', '');
    sheet.cell('AD4').value(bundeslandName);
    console.log('[API] Bundesland geschrieben:', bundeslandName, 'in Zelle AD4');
    
    // === ZUERST ALLE STUNDEN-ZELLEN LEEREN ===
    for (let m = 1; m <= 12; m++) {
      const dataRow = 11 + (m - 1) * 2;
      for (let d = 1; d <= 31; d++) {
        const col = d + 1;
        sheet.cell(dataRow, col).value(null);
      }
    }
    
    // === STUNDEN EINTRAGEN ===
    const getDaysInMonth = (y: number, m: number) => new Date(y, m, 0).getDate();
    
    for (let m = 1; m <= 12; m++) {
      const dataRow = 11 + (m - 1) * 2;
      const daysInMonth = getDaysInMonth(year, m);
      
      for (let d = 1; d <= daysInMonth; d++) {
        const col = d + 1;
        
        const date = new Date(year, m - 1, d);
        const dow = date.getDay();
        const isWeekend = dow === 0 || dow === 6;
        const dateStr = `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const isHoliday = holidays.has(dateStr);
        const dayInfo = dayData?.[m]?.[d];
        
        // Keine Stunden für Wochenenden, Feiertage oder Abwesenheiten
        if (!isWeekend && !isHoliday && !dayInfo?.absence) {
          const bookedHours = dayInfo?.hours || 0;
          const freeHours = maxDaily - bookedHours;
          if (freeHours > 0) {
            sheet.cell(dataRow, col).value(freeHours);
          }
        }
      }
    }
    
    // KEINE Summen überschreiben - die Formeln in der Vorlage berechnen das!
    
    // === UNTERER BEREICH ===
    const urlaubsStunden = settings.annual_leave_days * maxDaily;
    
    sheet.cell('C38').value(settings.weekly_hours);
    sheet.cell('F39').value(settings.annual_leave_days);
    sheet.cell('J39').value(urlaubsStunden);
    
    // Buffer erstellen
    const buffer = await workbook.outputAsync();
    
    // Response
    const fileName = `FZul_${lastName}_${firstName || 'X'}_${year}.xlsx`;
    
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
      },
    });
    
  } catch (error) {
    console.error('[API] Export-Fehler:', error);
    return NextResponse.json({ error: 'Export fehlgeschlagen: ' + (error as Error).message }, { status: 500 });
  }
}