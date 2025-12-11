// src/app/api/export/fzul/route.ts
// VERSION: v2.2 - Zeitzonen-Bug behoben
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';

// xlsx-populate muss installiert werden: pnpm add xlsx-populate
// @ts-ignore - xlsx-populate hat keine TypeScript-Definitionen
import XlsxPopulate from 'xlsx-populate';

// Deutsche Feiertage berechnen
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

const getGermanHolidays = (year: number): Set<string> => {
  const holidays = new Set<string>();
  
  // Feste Feiertage (bundesweit)
  holidays.add(`${year}-01-01`);  // Neujahr
  holidays.add(`${year}-05-01`);  // Tag der Arbeit
  holidays.add(`${year}-10-03`);  // Tag der Deutschen Einheit
  holidays.add(`${year}-12-25`);  // 1. Weihnachtstag
  holidays.add(`${year}-12-26`);  // 2. Weihnachtstag
  
  // NRW-spezifische Feiertage
  holidays.add(`${year}-11-01`);  // Allerheiligen (NRW, BW, BY, RP, SL)
  
  // Bewegliche Feiertage
  const easter = getEasterSunday(year);
  
  // WICHTIG: Lokale Formatierung statt toISOString() (Zeitzonen-Problem!)
  const addDays = (date: Date, days: number): string => {
    const result = new Date(date);
    result.setDate(date.getDate() + days);
    const y = result.getFullYear();
    const m = String(result.getMonth() + 1).padStart(2, '0');
    const d = String(result.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };
  
  holidays.add(addDays(easter, -2));   // Karfreitag
  holidays.add(addDays(easter, 1));    // Ostermontag
  holidays.add(addDays(easter, 39));   // Christi Himmelfahrt
  holidays.add(addDays(easter, 50));   // Pfingstmontag
  holidays.add(addDays(easter, 60));   // Fronleichnam (NRW, BW, BY, HE, RP, SL)
  
  return holidays;
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { empName, year, dayData, settings, holidays: clientHolidays } = body;
    
    const maxDaily = settings.weekly_hours / 5;
    
    // NEU v2.1: Feiertage vom Client verwenden (aus DB geladen), Fallback auf lokale Berechnung
    let holidays: Set<string>;
    if (clientHolidays && Array.isArray(clientHolidays) && clientHolidays.length > 0) {
      holidays = new Set(clientHolidays);
      console.log('[API] Feiertage vom Client:', holidays.size);
    } else {
      holidays = getGermanHolidays(year);
      console.log('[API] Feiertage lokal berechnet:', holidays.size);
    }
    
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
    sheet.cell('B6').value(lastName);
    sheet.cell('M6').value(firstName);
    sheet.cell('AD3').value(year);
    
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