// src/lib/stundennachweisSheetData.ts
// ============================================================================
// PZE V7 - Helfer: Stundennachweis-Anzeigemodell
// ============================================================================
// Version: 1.0.0
// Datum: 11. Juni 2026
// Zweck: Rekonstruiert aus gespeicherten v7_timesheets-Zeilen das
//   Anzeigemodell fuer EIN Stundennachweis-Blatt (ein Mitarbeiter, ein
//   Projekt, ein Monat). Reine Logik, kein React, kein Supabase --
//   damit testbar und sowohl im Einzel- als auch im Sammeldruck nutzbar.
//
// Spiegelt exakt die Lade-Logik der TimesheetForm (v7.4.6-29):
//   - work_package_id gesetzt + im Projekt -> AP-Zeile (foerderbar)
//   - absence_code (U/K/S) ohne work_package_id -> Fehlzeit
//   - !is_billable ohne work_package_id ohne absence_code -> sonstige Arbeit
//   - Werktags-Feiertage ohne S-Eintrag werden mit Tagesstunden
//     (standard_weekly_hours / 5) in der S-Zeile vorbelegt.
//
// HINWEIS zur AP-Zeilen-Reihenfolge: Im Gegensatz zur TimesheetForm (dort
//   DB-Reihenfolge) werden die AP-Zeilen hier deterministisch nach AP-Code
//   sortiert (Versions-Sort), damit der Sammeldruck stabil/vorhersehbar ist.
// ============================================================================

// Monatsnamen identisch zur TimesheetForm (MONTH_NAMES, ASCII "Maerz")
const MONTH_NAMES = [
  'Januar', 'Februar', 'Maerz', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
];

// ============================================================================
// EINGABE-TYPEN
// ============================================================================

export interface SheetTimesheetRow {
  work_date: string;                 // 'YYYY-MM-DD'
  hours: number | null;
  work_package_id: string | null;
  is_billable: boolean | null;
  absence_code: string | null;
}

export interface SheetWorkPackage {
  id: string;
  ap_code: string | null;
  ap_number: number | null;
  ap_sub_number: number | null;
  name: string | null;
  is_technical: boolean | string | number | null;
  total_person_months: number | null;
}

export interface SheetProject {
  name: string;
  funding_reference: string | null;
  funding_format: string | null;
}

export interface SheetCompany {
  name: string | null;
  standard_weekly_hours: number | null;
}

export interface SheetEmployee {
  display_name: string;
  first_name: string | null;
  last_name: string | null;
}

export interface BuildSheetInput {
  rows: SheetTimesheetRow[];
  project: SheetProject;
  workPackages: SheetWorkPackage[];  // bereits auf dieses Projekt gefiltert
  company: SheetCompany;
  employee: SheetEmployee;
  year: number;
  month: number;                     // 1-12
  holidays: Map<string, string>;     // Feiertage des Jahres (Key: YYYY-MM-DD)
}

// ============================================================================
// AUSGABE-TYPEN (Anzeigemodell)
// ============================================================================

export interface SheetApRow {
  workPackageId: string;
  apCodeDisplay: string;             // z.B. "1.2"
  name: string;
  isTechnical: boolean;
  hoursByDay: Record<number, number>;
  rowSum: number;
}

export interface SheetDay {
  day: number;
  weekend: boolean;
  holiday: string | null;            // Feiertagsname oder null
}

export interface StundennachweisSheetData {
  companyName: string;
  projectName: string;
  fundingReference: string;
  employeeName: string;
  monthLabel: string;                // z.B. "Maerz 2026"
  year: number;
  month: number;
  daysInMonth: number;
  isNetzwerk: boolean;
  isDurchfuehrbarkeitsstudie: boolean;
  days: SheetDay[];
  apRows: SheetApRow[];
  nonBillableByDay: Record<number, number>;
  nonBillableSum: number;
  absenceByDay: {
    U: Record<number, number>;
    K: Record<number, number>;
    S: Record<number, number>;
  };
  absenceSums: { U: number; K: number; S: number };
  daySumBillable: Record<number, number>;
  totalBillable: number;
  techDaySum: Record<number, number>;
  ntDaySum: Record<number, number>;
  techTotal: number;
  ntTotal: number;
  signatureDate: string;             // letzter Werktag, Format DD.MM.YYYY
}

// ============================================================================
// LOKALE HELFER
// ============================================================================

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function isWeekend(year: number, month: number, day: number): boolean {
  const dow = new Date(year, month - 1, day).getDay();
  return dow === 0 || dow === 6;
}

function dateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// Identisch zu TimesheetForm.isTechnicalAP (robust gegen DB-Datentypen)
function isTechnicalAP(wp: SheetWorkPackage | undefined | null): boolean {
  if (!wp) return false;
  const val = wp.is_technical as unknown;
  if (val === true || val === 'true' || val === 'TRUE' || val === '1' || val === 1) return true;
  return false;
}

// AP-Code-Anzeige identisch zur TimesheetForm (fuehrendes "AP" entfernt)
function apCodeDisplay(wp: SheetWorkPackage): string {
  return wp.ap_code
    ? wp.ap_code.replace(/^AP\s*/i, '')
    : `${wp.ap_number ?? ''}${wp.ap_sub_number ? `.${wp.ap_sub_number}` : ''}`;
}

// Versions-Sort identisch zu TimesheetForm.compareApCode
function compareApCode(a: SheetWorkPackage, b: SheetWorkPackage): number {
  const aParts = apCodeDisplay(a).split('.').map(Number);
  const bParts = apCodeDisplay(b).split('.').map(Number);
  for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
    const diff = (aParts[i] || 0) - (bParts[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ============================================================================
// HAUPTFUNKTION
// ============================================================================

export function buildStundennachweisSheetData(
  input: BuildSheetInput,
): StundennachweisSheetData {
  const { rows, project, workPackages, company, employee, year, month, holidays } = input;

  const daysInMonth = getDaysInMonth(year, month);
  const wpById = new Map<string, SheetWorkPackage>();
  workPackages.forEach(wp => wpById.set(wp.id, wp));
  const wpIds = new Set(workPackages.map(wp => wp.id));

  const isNetzwerk = project.funding_format === 'ZIM_NETZWERK';
  const isDurchfuehrbarkeitsstudie = !!project.funding_format?.includes('DS');

  // --- Tage (Wochenende / Feiertag) ---
  const days: SheetDay[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const weekend = isWeekend(year, month, d);
    const holName = holidays.get(dateKey(year, month, d)) || null;
    days.push({ day: d, weekend, holiday: holName });
  }

  // --- Zeilen klassifizieren (Spiegelung der Lade-Logik) ---
  const wpDayHours = new Map<string, Record<number, number>>(); // wpId -> day -> hours
  const nonBillableByDay: Record<number, number> = {};
  const absenceByDay = {
    U: {} as Record<number, number>,
    K: {} as Record<number, number>,
    S: {} as Record<number, number>,
  };

  rows.forEach(r => {
    const parts = r.work_date.split('-');
    const day = parseInt(parts[2], 10);
    if (!day || day < 1 || day > daysInMonth) return;
    const h = typeof r.hours === 'number' ? r.hours : 0;

    if (r.work_package_id && wpIds.has(r.work_package_id)) {
      if (!wpDayHours.has(r.work_package_id)) wpDayHours.set(r.work_package_id, {});
      const map = wpDayHours.get(r.work_package_id)!;
      map[day] = (map[day] || 0) + (h > 0 ? h : 0);
    } else if (r.absence_code && !r.work_package_id) {
      const code = (r.absence_code || '').toUpperCase();
      if (code === 'U' || code === 'K' || code === 'S') {
        absenceByDay[code][day] = (absenceByDay[code][day] || 0) + (h > 0 ? h : 0);
      }
    } else if (!r.is_billable && !r.work_package_id && !r.absence_code) {
      nonBillableByDay[day] = (nonBillableByDay[day] || 0) + (h > 0 ? h : 0);
    }
  });

  // --- Feiertags-Vorbelegung der S-Zeile (wie TimesheetForm v7.4.6-18) ---
  // Werktags-Feiertage ohne bestehenden S-Wert bekommen Tagesstunden.
  const companyDailyHours = round2((company.standard_weekly_hours || 40) / 5);
  for (let d = 1; d <= daysInMonth; d++) {
    if (isWeekend(year, month, d)) continue;
    const isHol = holidays.has(dateKey(year, month, d));
    const hasExisting = (absenceByDay.S[d] || 0) > 0;
    if (isHol && !hasExisting) {
      absenceByDay.S[d] = companyDailyHours;
    }
  }

  // --- AP-Zeilen aufbauen (nach AP-Code sortiert) ---
  const populatedWpIds = Array.from(wpDayHours.keys())
    .map(id => wpById.get(id))
    .filter((wp): wp is SheetWorkPackage => !!wp)
    .sort(compareApCode);

  const apRows: SheetApRow[] = populatedWpIds.map(wp => {
    const hoursByDay = wpDayHours.get(wp.id) || {};
    let rowSum = 0;
    Object.keys(hoursByDay).forEach(k => { rowSum += hoursByDay[Number(k)] || 0; });
    return {
      workPackageId: wp.id,
      apCodeDisplay: apCodeDisplay(wp),
      name: wp.name || '',
      isTechnical: isTechnicalAP(wp),
      hoursByDay,
      rowSum: round2(rowSum),
    };
  });

  // --- Summen ---
  const daySumBillable: Record<number, number> = {};
  const techDaySum: Record<number, number> = {};
  const ntDaySum: Record<number, number> = {};
  let totalBillable = 0;
  let techTotal = 0;
  let ntTotal = 0;

  for (let d = 1; d <= daysInMonth; d++) {
    let sum = 0;
    let tSum = 0;
    let nSum = 0;
    apRows.forEach(row => {
      const h = row.hoursByDay[d] || 0;
      if (h <= 0) return;
      sum += h;
      if (row.isTechnical) tSum += h; else nSum += h;
    });
    if (sum > 0) daySumBillable[d] = round2(sum);
    if (tSum > 0) techDaySum[d] = round2(tSum);
    if (nSum > 0) ntDaySum[d] = round2(nSum);
    totalBillable += sum;
    techTotal += tSum;
    ntTotal += nSum;
  }

  let nonBillableSum = 0;
  Object.keys(nonBillableByDay).forEach(k => { nonBillableSum += nonBillableByDay[Number(k)] || 0; });

  const absenceSums = {
    U: round2(Object.keys(absenceByDay.U).reduce((s, k) => s + (absenceByDay.U[Number(k)] || 0), 0)),
    K: round2(Object.keys(absenceByDay.K).reduce((s, k) => s + (absenceByDay.K[Number(k)] || 0), 0)),
    S: round2(Object.keys(absenceByDay.S).reduce((s, k) => s + (absenceByDay.S[Number(k)] || 0), 0)),
  };

  // --- Unterschriftsdatum: letzter Werktag (kein WE, kein Feiertag) ---
  let signatureDate = `${String(daysInMonth).padStart(2, '0')}.${String(month).padStart(2, '0')}.${year}`;
  for (let d = daysInMonth; d >= 1; d--) {
    if (!isWeekend(year, month, d) && !holidays.has(dateKey(year, month, d))) {
      signatureDate = `${String(d).padStart(2, '0')}.${String(month).padStart(2, '0')}.${year}`;
      break;
    }
  }

  const employeeName = employee
    ? (`${employee.last_name || ''}, ${employee.first_name || ''}`.trim().replace(/^,\s*/, '').replace(/,\s*$/, '') || employee.display_name)
    : '-';

  return {
    companyName: company.name || '',
    projectName: project.name || '-',
    fundingReference: project.funding_reference || '-',
    employeeName: employeeName || '-',
    monthLabel: `${MONTH_NAMES[month - 1]} ${year}`,
    year,
    month,
    daysInMonth,
    isNetzwerk,
    isDurchfuehrbarkeitsstudie,
    days,
    apRows,
    nonBillableByDay,
    nonBillableSum: round2(nonBillableSum),
    absenceByDay,
    absenceSums,
    daySumBillable,
    totalBillable: round2(totalBillable),
    techDaySum,
    ntDaySum,
    techTotal: round2(techTotal),
    ntTotal: round2(ntTotal),
    signatureDate,
  };
}
