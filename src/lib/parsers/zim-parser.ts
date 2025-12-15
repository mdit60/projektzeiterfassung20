// src/lib/parsers/zim-parser.ts
// VERSION: 1.1 - ZIM Excel Parser mit korrekter Projektjahr-Aufteilung
// WICHTIG: Diese Datei ist SEPARAT vom BMBF-Parser und aendert nichts am bestehenden Code!

import * as XLSX from 'xlsx';

// ============================================================================
// TYPEN
// ============================================================================

export interface ZimProjectData {
  name: string;
  fkz: string;
  company: string;
  startDate: Date;
  endDate: Date;
  startYear: number;  // Kalenderjahr fuer J1 (z.B. 2020)
  fundingType: 'ZIM';
}

export interface DailyEntry {
  day: number;        // 1-31
  hours: number;      // Arbeitsstunden
  absence?: 'U' | 'K' | 'KA' | 'SO';  // Urlaub, Krank, Kurzarbeit, Sonstiges
}

export interface MonthData {
  month: number;           // 1-12
  calendarYear: number;    // 2020, 2021, 2022...
  projectYear: number;     // 1, 2, 3...
  dailyData: DailyEntry[];
  totalHours: number;
  billableHours: number;
}

export interface ZimEmployee {
  name: string;
  months: MonthData[];
}

export interface ZimParseResult {
  success: boolean;
  project?: ZimProjectData;
  employees?: ZimEmployee[];
  errors: string[];
  warnings: string[];
}

// ============================================================================
// HILFSFUNKTIONEN
// ============================================================================

/**
 * Konvertiert Excel-Datum zu JavaScript Date
 */
function excelDateToDate(excelDate: number | Date | string): Date | null {
  if (!excelDate) return null;
  
  if (excelDate instanceof Date) {
    return excelDate;
  }
  
  if (typeof excelDate === 'number') {
    // Excel Seriennummer: Tage seit 1.1.1900
    const date = new Date((excelDate - 25569) * 86400 * 1000);
    return date;
  }
  
  if (typeof excelDate === 'string') {
    // Versuche Datum zu parsen (z.B. "01.04.20" oder "2020-04-01")
    const parsed = new Date(excelDate);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
    
    // Deutsches Format DD.MM.YY oder DD.MM.YYYY
    const match = excelDate.match(/(\d{1,2})\.(\d{1,2})\.(\d{2,4})/);
    if (match) {
      let year = parseInt(match[3]);
      if (year < 100) year += 2000;
      return new Date(year, parseInt(match[2]) - 1, parseInt(match[1]));
    }
  }
  
  return null;
}

/**
 * Liest Zellwert sicher aus
 */
function getCellValue(sheet: XLSX.WorkSheet, cell: string): any {
  const cellObj = sheet[cell];
  return cellObj ? cellObj.v : null;
}

/**
 * Sucht nach einer Zeile die einen bestimmten Text enthaelt
 */
function findRowByText(sheet: XLSX.WorkSheet, searchText: string, startRow: number, endRow: number, column: string = 'C'): number | null {
  for (let row = startRow; row <= endRow; row++) {
    const value = getCellValue(sheet, `${column}${row}`);
    if (value && String(value).toLowerCase().includes(searchText.toLowerCase())) {
      return row;
    }
  }
  return null;
}

/**
 * Prueft ob ein Sheet-Name ein MA-Sheet ist (Pattern: "[Name] J[1-9]")
 */
function isEmployeeSheet(sheetName: string): boolean {
  // Blacklist: Technische Sheets die zufaellig das Pattern matchen
  const blacklist = [
    'Ermittl.-Stunden',
    'Auswertung',
    'MA1', 'MA2', 'MA3', 'MA4', 'MA5',  // Platzhalter
  ];
  
  for (const bl of blacklist) {
    if (sheetName.startsWith(bl)) {
      return false;
    }
  }
  
  // Pattern: "[Name] J[1-9]"
  return /^.+\s+J[1-9]$/.test(sheetName);
}

/**
 * Extrahiert Nachname und Projektjahr aus Sheet-Name
 */
function parseSheetName(sheetName: string): { name: string; projectYear: number } | null {
  const match = sheetName.match(/^(.+)\s+J(\d)$/);
  if (!match) return null;
  
  return {
    name: match[1].trim(),
    projectYear: parseInt(match[2])
  };
}

// ============================================================================
// HAUPTFUNKTIONEN
// ============================================================================

/**
 * Erkennt automatisch ob eine Excel-Datei ZIM-Format hat
 */
export function detectZimFormat(workbook: XLSX.WorkBook): boolean {
  const sheetNames = workbook.SheetNames;
  
  // ZIM-Indikatoren:
  // 1. Hat "Nav" Sheet
  // 2. Hat Sheets mit Pattern "[Name] J[1-9]"
  // 3. FKZ beginnt mit "16KN" oder "KF"
  
  if (!sheetNames.includes('Nav')) {
    return false;
  }
  
  const navSheet = workbook.Sheets['Nav'];
  const fkz = getCellValue(navSheet, 'C6');
  
  if (fkz && (String(fkz).startsWith('16KN') || String(fkz).startsWith('KF'))) {
    return true;
  }
  
  // Auch ohne passende FKZ: Wenn MA-Sheets vorhanden sind
  const hasEmployeeSheets = sheetNames.some(name => isEmployeeSheet(name));
  if (hasEmployeeSheets && sheetNames.includes('Nav')) {
    return true;
  }
  
  return false;
}

/**
 * Liest Projektdaten aus dem Nav-Sheet
 */
export function parseNavSheet(workbook: XLSX.WorkBook): ZimProjectData | null {
  const navSheet = workbook.Sheets['Nav'];
  if (!navSheet) return null;
  
  // Laufzeitbeginn kann in I2 oder I3 stehen (je nach ZIM-Variante)
  let startDate = excelDateToDate(getCellValue(navSheet, 'I2'));
  let endDate = excelDateToDate(getCellValue(navSheet, 'I3'));
  
  // Fallback: Wenn I2 das Ende ist und I3 leer
  if (startDate && endDate && startDate > endDate) {
    // Vertauscht - I2 ist Ende, I3 ist Anfang? Unwahrscheinlich, aber pruefen
    const temp = startDate;
    startDate = endDate;
    endDate = temp;
  }
  
  // Wenn I3 das Startdatum ist (wie bei manchen Varianten)
  if (!startDate && endDate) {
    startDate = endDate;
    endDate = excelDateToDate(getCellValue(navSheet, 'I4'));
  }
  
  if (!startDate) {
    console.error('ZIM-Parser: Kein Laufzeitbeginn gefunden');
    return null;
  }
  
  const projectName = getCellValue(navSheet, 'C3') || getCellValue(navSheet, 'B4') || 'Unbekanntes Projekt';
  const fkz = getCellValue(navSheet, 'C6') || getCellValue(navSheet, 'B6') || '';
  const company = getCellValue(navSheet, 'C7') || getCellValue(navSheet, 'B8') || '';
  
  return {
    name: String(projectName).substring(0, 100),
    fkz: String(fkz),
    company: String(company),
    startDate: startDate,
    endDate: endDate || new Date(),
    startYear: startDate.getFullYear(),
    fundingType: 'ZIM'
  };
}

/**
 * Parst ein einzelnes MA-Sheet und extrahiert alle Monatsdaten
 */
export function parseEmployeeSheet(
  workbook: XLSX.WorkBook,
  sheetName: string,
  startYear: number
): { name: string; months: MonthData[] } | null {
  
  const parsed = parseSheetName(sheetName);
  if (!parsed) return null;
  
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return null;
  
  const { name: nachname, projectYear } = parsed;
  const calendarYear = startYear + projectYear - 1;
  
  // Vollstaendiger Name aus M11 oder M12 (erste Monatszeile)
  const fullName = getCellValue(sheet, 'M12') || getCellValue(sheet, 'M11') || nachname;
  
  const months: MonthData[] = [];
  
  // 12 Monats-Bloecke, Start bei Zeile 11, alle 43 Zeilen
  const BLOCK_SIZE = 43;
  const FIRST_BLOCK_START = 11;
  
  for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
    const blockStart = FIRST_BLOCK_START + (monthIndex * BLOCK_SIZE);
    
    // Monatsdatum aus Spalte A
    const monthDateRaw = getCellValue(sheet, `A${blockStart}`);
    const monthDate = excelDateToDate(monthDateRaw);
    
    if (!monthDate) continue;
    
    const month = monthDate.getMonth() + 1; // 1-12
    const actualYear = monthDate.getFullYear(); // Tatsaechliches Jahr aus Datum!
    
    // Dynamisch Summenzeile finden: Suche nach "Summe der förderbaren" im Block
    let sumRow = findRowByText(sheet, 'summe', blockStart + 15, blockStart + 25, 'C');
    if (!sumRow) {
      // Fallback: Feste Position
      sumRow = blockStart + 20;
    }
    
    // Urlaub-Zeile: Nach Summenzeile suchen
    let urlaubRow = findRowByText(sheet, 'urlaub', sumRow, sumRow + 10, 'C');
    if (!urlaubRow) {
      urlaubRow = sumRow + 3;
    }
    
    // Krankheit-Zeile: Nach Urlaub suchen
    let krankRow = findRowByText(sheet, 'krankheit', sumRow, sumRow + 10, 'C');
    if (!krankRow) {
      krankRow = sumRow + 4;
    }
    
    const dailyData: DailyEntry[] = [];
    let totalHours = 0;
    
    // Tagesdaten aus Spalten E-AI (Tag 1-31) - NICHT AJ!
    for (let day = 1; day <= 31; day++) {
      const col = day + 4; // Tag 1 = Spalte E (5), Tag 31 = Spalte AI (35)
      const colLetter = XLSX.utils.encode_col(col - 1); // 0-basiert
      
      // Stunden aus Summenzeile
      const hoursRaw = getCellValue(sheet, `${colLetter}${sumRow}`);
      const hours = typeof hoursRaw === 'number' ? hoursRaw : 0;
      
      // Urlaub pruefen
      const urlaubRaw = getCellValue(sheet, `${colLetter}${urlaubRow}`);
      const hasUrlaub = urlaubRaw && (urlaubRaw === 'U' || urlaubRaw === 8 || (typeof urlaubRaw === 'number' && urlaubRaw > 0));
      
      // Krankheit pruefen
      const krankRaw = getCellValue(sheet, `${colLetter}${krankRow}`);
      const hasKrank = krankRaw && (krankRaw === 'K' || krankRaw === 8 || (typeof krankRaw === 'number' && krankRaw > 0));
      
      if (hours > 0 || hasUrlaub || hasKrank) {
        const entry: DailyEntry = {
          day,
          hours: hours || 0
        };
        
        if (hasUrlaub) entry.absence = 'U';
        if (hasKrank) entry.absence = 'K';
        
        dailyData.push(entry);
        totalHours += hours;
      }
    }
    
    // Nur Monate mit Daten speichern
    if (dailyData.length > 0 || totalHours > 0) {
      months.push({
        month,
        calendarYear: actualYear, // Verwende tatsaechliches Jahr aus Datum!
        projectYear,
        dailyData,
        totalHours,
        billableHours: totalHours
      });
    }
  }
  
  return {
    name: String(fullName),
    months
  };
}

/**
 * Hauptfunktion: Parst komplette ZIM Excel-Datei
 */
export function parseZimExcel(workbook: XLSX.WorkBook): ZimParseResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // 1. Projekt-Daten aus Nav-Sheet
  const project = parseNavSheet(workbook);
  if (!project) {
    errors.push('Nav-Sheet nicht gefunden oder Laufzeitbeginn fehlt');
    return { success: false, errors, warnings };
  }
  
  console.log(`[ZIM-Parser] Projekt: ${project.name}, Startjahr: ${project.startYear}`);
  
  // 2. MA-Sheets identifizieren
  const employeeSheets = workbook.SheetNames.filter(name => isEmployeeSheet(name));
  
  if (employeeSheets.length === 0) {
    errors.push('Keine Mitarbeiter-Sheets gefunden (erwartet: "[Name] J1", "[Name] J2", ...)');
    return { success: false, project, errors, warnings };
  }
  
  console.log(`[ZIM-Parser] ${employeeSheets.length} MA-Sheets gefunden:`, employeeSheets);
  
  // 3. Alle MA-Sheets parsen
  const employeeMap = new Map<string, ZimEmployee>();
  
  for (const sheetName of employeeSheets) {
    const result = parseEmployeeSheet(workbook, sheetName, project.startYear);
    
    if (!result) {
      warnings.push(`Sheet "${sheetName}" konnte nicht geparst werden`);
      continue;
    }
    
    console.log(`[ZIM-Parser] ${sheetName}: ${result.months.length} Monate gefunden`);
    
    // Mitarbeiter zusammenfuehren (gleicher Name aus verschiedenen Jahren)
    const existing = employeeMap.get(result.name);
    if (existing) {
      existing.months.push(...result.months);
    } else {
      employeeMap.set(result.name, {
        name: result.name,
        months: result.months
      });
    }
  }
  
  const employees = Array.from(employeeMap.values());
  
  // Sortiere Monate chronologisch
  for (const emp of employees) {
    emp.months.sort((a, b) => {
      if (a.calendarYear !== b.calendarYear) return a.calendarYear - b.calendarYear;
      return a.month - b.month;
    });
  }
  
  // Statistik
  let totalHours = 0;
  let totalMonths = 0;
  for (const emp of employees) {
    for (const m of emp.months) {
      totalHours += m.totalHours;
      totalMonths++;
    }
  }
  
  console.log(`[ZIM-Parser] ${employees.length} Mitarbeiter, ${totalMonths} Monate, ${totalHours.toFixed(1)} Stunden total`);
  
  return {
    success: true,
    project,
    employees,
    errors,
    warnings
  };
}

// ============================================================================
// EXPORT-FUNKTIONEN (fuer Integration mit bestehendem Import-Modul)
// ============================================================================

/**
 * Konvertiert ZIM-Ergebnis in das Format des bestehenden Import-Moduls
 * WICHTIG: Erstellt einen Eintrag pro Mitarbeiter UND Projektjahr!
 */
export function convertToImportFormat(result: ZimParseResult): {
  projectName: string;
  projectFkz: string;
  employees: Array<{
    name: string;
    projectYear: number;
    months: Array<{
      month: number;
      year: number;
      projectYear: number;
      billableHours: number;
      totalHours: number;
      dailyData: Array<{
        day: number;
        hours: number;
        type: string;
      }>;
    }>;
  }>;
} | null {
  if (!result.success || !result.project || !result.employees) {
    return null;
  }
  
  // Für jeden Mitarbeiter: Aufteilen nach Projektjahr
  const employeesByYear: Array<{
    name: string;
    projectYear: number;
    months: Array<{
      month: number;
      year: number;
      projectYear: number;
      billableHours: number;
      totalHours: number;
      dailyData: Array<{
        day: number;
        hours: number;
        type: string;
      }>;
    }>;
  }> = [];
  
  for (const emp of result.employees) {
    // Gruppiere Monate nach Projektjahr
    const monthsByProjectYear = new Map<number, typeof emp.months>();
    
    for (const m of emp.months) {
      if (!monthsByProjectYear.has(m.projectYear)) {
        monthsByProjectYear.set(m.projectYear, []);
      }
      monthsByProjectYear.get(m.projectYear)!.push(m);
    }
    
    // Erstelle einen Eintrag pro Projektjahr
    for (const [projectYear, months] of monthsByProjectYear) {
      employeesByYear.push({
        name: emp.name,
        projectYear,
        months: months.map(m => ({
          month: m.month,
          year: m.calendarYear,
          projectYear: m.projectYear,
          billableHours: m.billableHours,
          totalHours: m.totalHours,
          dailyData: m.dailyData.map(d => ({
            day: d.day,
            hours: d.hours,
            type: d.absence || (d.hours > 0 ? 'work' : 'none')
          }))
        }))
      });
    }
  }
  
  // Sortiere nach Name und Projektjahr
  employeesByYear.sort((a, b) => {
    if (a.name !== b.name) return a.name.localeCompare(b.name);
    return a.projectYear - b.projectYear;
  });
  
  return {
    projectName: result.project.name,
    projectFkz: result.project.fkz,
    employees: employeesByYear
  };
}