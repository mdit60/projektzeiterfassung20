// src/app/api/export/fzul/route.ts
// VERSION: v2.5 - Unterer Teil der BSFZ-Vorlage korrekt befuellt (A-069)
// Datum: 11. September 2026 (Session 83)
// Basis: deployter Stand v2.3 aus src (die Archivkopie v2.4 mit fzulData wurde nie
//        deployt und ist NICHT Grundlage dieser Version).
// AENDERUNGEN v2.5:
// - FIX: Wochenarbeitszeit nach E38 und vertraglicher Urlaubsanspruch nach O39 - die
//   Eingabezellen, mit denen die Formeln der Vorlage rechnen. Bis v2.3 wurde nach
//   C38 / F39 / J39 geschrieben; diese Zellen liegen in verbundenen Beschriftungsfeldern
//   und werden nicht gelesen. E38 und O39 behielten dadurch immer die Vorgabewerte
//   der Vorlage (40 h / 30 Tage).
// - NEU: optionale Felder sickDays -> O40 (Krankheitstage), specialLeaveDays -> O41
//   (Sonderurlaub), parentalLeaveDays -> O43 (Kurzarbeit, Erziehungsurlaub u. ae.).
//   Erwartet werden ARBEITSTAGE (Mo-Fr, ohne Feiertage); die Stunden je Zeile
//   (AA40..AA43) und die Feiertage (O42) berechnet die Vorlage selbst.
//   Fehlen die Felder, bleiben die Zeilen 0 (rueckwaertskompatibel).
// - Datei ASCII-konform (Umlaute in Laufzeit-Strings als \u-Escapes).
// VERSION: v2.3 - Header-Felder (Vorhaben, FKZ, Taetigkeit) werden in Excel geschrieben
// AENDERUNGEN v2.3:
// - NEU: projectTitle, projectFkz, positionTitle aus Request lesen
// - NEU: Diese Felder in die entsprechenden Excel-Zellen schreiben
// AENDERUNGEN v2.2:
// - Bundesland-Name wird in Excel-Zelle geschrieben (nicht nur fuer Feiertage)
// - stateCode aus Request fuer korrekte Feiertage UND Anzeige

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
  
  // Heilige Drei Koenige (6. Januar): BW, BY, ST
  if (['DE-BW', 'DE-BY', 'DE-ST'].includes(state)) {
    holidays.add(`${year}-01-06`);
  }
  
  // Internationaler Frauentag (8. Maerz): BE, MV
  if (['DE-BE', 'DE-MV'].includes(state)) {
    holidays.add(`${year}-03-08`);
  }
  
  // Fronleichnam (60 Tage nach Ostern): BW, BY, HE, NW, RP, SL
  if (['DE-BW', 'DE-BY', 'DE-HE', 'DE-NW', 'DE-RP', 'DE-SL'].includes(state)) {
    holidays.add(addDays(easter, 60));
  }
  
  // Mariae Himmelfahrt (15. August): SL (und BY nur in kath. Gemeinden)
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
  
  // Buss- und Bettag (Mittwoch vor dem 23. November): SN
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

// NEU v2.2: Bundesland-Namen fuer Excel-Ausgabe
const BUNDESLAND_NAMEN: Record<string, string> = {
  'DE-BW': 'Baden-W\u00fcrttemberg',
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
  'DE-TH': 'Th\u00fcringen'
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // NEU v2.3: Header-Felder aus Request lesen
    const { empName, year, dayData, settings, stateCode, projectTitle, projectFkz, positionTitle } = body;
    // NEU v2.5: Abwesenheits-Arbeitstage fuer den unteren Teil der Vorlage (optional)
    const { sickDays, specialLeaveDays, parentalLeaveDays } = body;
    
    // NEU v2.1: Bundesland aus Request verwenden (Fallback: NRW)
    const effectiveStateCode = stateCode || 'DE-NW';
    console.log('[API] Excel-Export f\u00fcr Bundesland:', effectiveStateCode);
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
    
    // NEU v2.3: FuE-Taetigkeit (Zeile 6, nach Vorname)
    if (positionTitle) {
      sheet.cell('AD6').value(positionTitle);
      console.log('[API] FuE-T\u00e4tigkeit geschrieben:', positionTitle);
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
        
        // Keine Stunden fuer Wochenenden, Feiertage oder Abwesenheiten
        if (!isWeekend && !isHoliday && !dayInfo?.absence) {
          const bookedHours = dayInfo?.hours || 0;
          const freeHours = maxDaily - bookedHours;
          if (freeHours > 0) {
            sheet.cell(dataRow, col).value(freeHours);
          }
        }
      }
    }
    
    // KEINE Summen ueberschreiben - die Formeln in der Vorlage berechnen das!
    
    // === UNTERER BEREICH: 1. Ermittlung der massgeblichen Jahresarbeitszeit ===
    // v2.5: Eingabezellen der Vorlage sind E38 (Wochenarbeitszeit) und O39..O43 (Tage).
    // Die Stunden je Zeile (AA39..AA43 = Tage x E38/5), die Feiertage (O42) und die
    // massgebliche Jahresarbeitszeit (AA44) berechnen die Formeln der Vorlage.
    const tageWert = (v: unknown): number => {
      const n = Number(v);
      return Number.isFinite(n) && n > 0 ? n : 0;
    };
    sheet.cell('E38').value(settings.weekly_hours);
    sheet.cell('O39').value(tageWert(settings.annual_leave_days));
    sheet.cell('O40').value(tageWert(sickDays));
    sheet.cell('O41').value(tageWert(specialLeaveDays));
    sheet.cell('O43').value(tageWert(parentalLeaveDays));
    console.log('[API] Jahresarbeitszeit-Eingaben:', {
      wochenstunden: settings.weekly_hours,
      urlaubstage: tageWert(settings.annual_leave_days),
      krankheitstage: tageWert(sickDays),
      sonderurlaubstage: tageWert(specialLeaveDays),
      elternzeittage: tageWert(parentalLeaveDays),
    });
    
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