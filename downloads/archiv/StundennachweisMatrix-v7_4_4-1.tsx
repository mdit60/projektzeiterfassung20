// src/components/shared/StundennachweisMatrix.tsx
// ============================================================================
// PZE V7 - Shared Component: Stundennachweis-Matrix
// ============================================================================
// Version: 7.4.4-1
// Datum: 1. April 2026
//
// Wird von beiden Portalen genutzt:
// - Firmen-Portal:  /v7/firma/berichte
// - Berater-Portal: /v7/berater/foerderung/firma/[id]/berichte
//
// Props:
// - portal: 'berater' | 'firma'
// - companyId: string
// - projects: Project[]
// - workPackages: WorkPackage[]
// - wpAssignments: WPAssignment[]
// - employees: Employee[]
// - timesheets: Timesheet[]
// - completions: Completion[]
// - company: Company | null
// - matrixProjectId: string | null
// - onProjectChange: (id: string) => void
// - onNavigateToZE: (employeeId: string, year: number, month: number) => void
// ============================================================================

'use client';

import React, { useMemo } from 'react';
import { Grid3x3, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

// ============================================================================
// FOERDERFORMAT-LABELS
// ============================================================================

const FUNDING_FORMAT_LABELS: Record<string, string> = {
  'ZIM':          'ZIM Einzelprojekt',
  'ZIM_KOOP':     'ZIM Kooperationsprojekt',
  'ZIM_NETZWERK': 'ZIM Netzwerk-Management',
  'ZIM_DS':       'ZIM Durchfuehrbarkeitsstudie',
  'BMBF':         'BMBF Foerderung',
  'BMBF_DS':      'BMBF Durchfuehrbarkeitsstudie',
};

const getFundingLabel = (format: string | null | undefined): string =>
  format ? (FUNDING_FORMAT_LABELS[format] || format) : '';

// ============================================================================
// TYPEN
// ============================================================================

interface Project {
  id: string;
  name: string;
  short_name: string | null;
  funding_format: string | null;
  funding_reference: string | null;
  start_date: string | null;
  end_date: string | null;
}

interface WorkPackage {
  id: string;
  project_id: string;
}

interface WPAssignment {
  work_package_id: string;
  employee_id: string;
}

interface Employee {
  id: string;
  display_name: string;
}

interface Timesheet {
  project_id: string;
  employee_id: string;
  work_date: string;
  hours: number | null;
}

interface Completion {
  employee_id: string;
  year: number;
  month: number;
}

interface Company {
  federal_state: string | null;
}

interface MatrixMonth {
  year: number;
  month: number;
  label: string;
}

interface MatrixCell {
  employeeId: string;
  year: number;
  month: number;
  hoursRecorded: number;
  status: 'complete' | 'partial' | 'missing' | 'future' | 'outside';
}

interface StundennachweisMatrixProps {
  portal: 'berater' | 'firma';
  companyId: string;
  projects: Project[];
  workPackages: WorkPackage[];
  wpAssignments: WPAssignment[];
  employees: Employee[];
  timesheets: Timesheet[];
  completions: Completion[];
  company: Company | null;
  matrixProjectId: string | null;
  onProjectChange: (id: string) => void;
  onNavigateToZE: (employeeId: string, year: number, month: number) => void;
}

// ============================================================================
// HILFSFUNKTIONEN (Feiertage + Arbeitstage)
// ============================================================================

const MONTH_SHORT = ['Jan','Feb','Mrz','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];

function normalizeStateCode(state: string | null | undefined): string {
  if (!state) return 'BY';
  const s = state.toUpperCase().trim();
  const map: Record<string, string> = {
    'BAYERN': 'BY', 'BAVARIA': 'BY',
    'BERLIN': 'BE', 'BRANDENBURG': 'BB',
    'BREMEN': 'HB', 'HAMBURG': 'HH',
    'HESSEN': 'HE', 'HESSE': 'HE',
    'MECKLENBURG-VORPOMMERN': 'MV', 'MV': 'MV',
    'NIEDERSACHSEN': 'NI', 'LOWER SAXONY': 'NI',
    'NORDRHEIN-WESTFALEN': 'NW', 'NRW': 'NW',
    'RHEINLAND-PFALZ': 'RP',
    'SAARLAND': 'SL',
    'SACHSEN': 'SN', 'SAXONY': 'SN',
    'SACHSEN-ANHALT': 'ST',
    'SCHLESWIG-HOLSTEIN': 'SH',
    'THUERINGEN': 'TH', 'THURINGIA': 'TH',
    'BADEN-WUERTTEMBERG': 'BW', 'BW': 'BW',
  };
  return map[s] || s.substring(0, 2) || 'BY';
}

function getGermanHolidays(year: number, state: string): Map<string, string> {
  const holidays = new Map<string, string>();
  const add = (month: number, day: number, name: string) => {
    holidays.set(`${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`, name);
  };
  // Ostern berechnen (Gauss)
  const a = year % 19, b = Math.floor(year/100), c = year % 100;
  const d = Math.floor(b/4), e = b % 4, f = Math.floor((b+8)/25);
  const g = Math.floor((b-f+1)/3), h = (19*a+b-d-g+15) % 30;
  const i = Math.floor(c/4), k = c % 4;
  const l = (32+2*e+2*i-h-k) % 7;
  const m = Math.floor((a+11*h+22*l)/451);
  const month = Math.floor((h+l-7*m+114)/31);
  const day = ((h+l-7*m+114) % 31)+1;
  const easter = new Date(year, month-1, day);
  const addDays = (d: Date, n: number) => new Date(d.getTime()+n*86400000);
  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

  holidays.set(fmt(addDays(easter,-2)), 'Karfreitag');
  holidays.set(fmt(easter), 'Ostersonntag');
  holidays.set(fmt(addDays(easter,1)), 'Ostermontag');
  holidays.set(fmt(addDays(easter,39)), 'Himmelfahrt');
  holidays.set(fmt(addDays(easter,49)), 'Pfingstsonntag');
  holidays.set(fmt(addDays(easter,50)), 'Pfingstmontag');

  add(1,1,'Neujahr'); add(5,1,'Tag der Arbeit');
  add(10,3,'Tag der Deutschen Einheit'); add(12,25,'1. Weihnachtstag');
  add(12,26,'2. Weihnachtstag');

  const stateHolidays: Record<string, Array<[number,number,string]>> = {
    BY: [[1,6,'Heilige Drei Koenige'],[8,15,'Mariae Himmelfahrt'],[11,1,'Allerheiligen']],
    BW: [[1,6,'Heilige Drei Koenige'],[11,1,'Allerheiligen']],
    NW: [[11,1,'Allerheiligen']],
    RP: [[11,1,'Allerheiligen']],
    SL: [[8,15,'Mariae Himmelfahrt'],[11,1,'Allerheiligen']],
    SN: [[10,31,'Reformationstag']],
    TH: [[10,31,'Reformationstag']],
    ST: [[10,31,'Reformationstag']],
    BB: [[10,31,'Reformationstag']],
    MV: [[10,31,'Reformationstag']],
    SH: [],
    HH: [],
    HB: [],
    NI: [],
    HE: [],
    BE: [],
  };
  const extra = stateHolidays[state] || [];
  extra.forEach(([m,d,n]) => add(m,d,n));

  const corpusChristi = addDays(easter, 60);
  if (['BY','BW','HE','NW','RP','SL'].includes(state)) {
    holidays.set(fmt(corpusChristi), 'Fronleichnam');
  }
  return holidays;
}

function getWorkingDaysInMonth(year: number, month: number, holidays: Map<string, string>): number {
  let count = 0;
  const daysInMonth = new Date(year, month, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const dow = new Date(year, month-1, d).getDay();
    if (dow === 0 || dow === 6) continue;
    const ds = `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    if (!holidays.has(ds)) count++;
  }
  return count;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function StundennachweisMatrix({
  portal,
  companyId,
  projects,
  workPackages,
  wpAssignments,
  employees,
  timesheets,
  completions,
  company,
  matrixProjectId,
  onProjectChange,
  onNavigateToZE,
}: StundennachweisMatrixProps) {

  const accentColor = portal === 'berater' ? 'text-blue-600' : 'text-green-600';
  const iconColor = portal === 'berater' ? 'text-blue-600' : 'text-green-600';
  const focusRing = portal === 'berater' ? 'focus:ring-blue-500' : 'focus:ring-green-500';

  const activeProjectId = matrixProjectId || projects[0]?.id || null;
  const activeProject = projects.find(p => p.id === activeProjectId) || projects[0] || null;

  const matrixData = useMemo(() => {
    if (!activeProjectId) return null;
    const project = projects.find(p => p.id === activeProjectId);
    if (!project || !project.start_date || !project.end_date) return null;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    const pStart = new Date(project.start_date);
    const pEnd = new Date(project.end_date);
    const startYear = pStart.getFullYear();
    const startMonth = pStart.getMonth() + 1;
    const endYear = pEnd.getFullYear();
    const endMonth = pEnd.getMonth() + 1;

    const months: MatrixMonth[] = [];
    for (let y = startYear; y <= endYear; y++) {
      const mStart = y === startYear ? startMonth : 1;
      const mEnd = y === endYear ? endMonth : 12;
      for (let m = mStart; m <= mEnd; m++) {
        months.push({ year: y, month: m, label: MONTH_SHORT[m-1] });
      }
    }

    const years = [...new Set(months.map(m => m.year))];
    const projectWPs = workPackages.filter(wp => wp.project_id === activeProjectId);
    const projectWPIds = projectWPs.map(wp => wp.id);
    const assignedEmployeeIds = [...new Set(
      wpAssignments.filter(a => projectWPIds.includes(a.work_package_id)).map(a => a.employee_id)
    )];
    const matrixEmployees = employees.filter(e => assignedEmployeeIds.includes(e.id));

    const holidaysByYear: Record<number, Map<string, string>> = {};
    years.forEach(y => {
      holidaysByYear[y] = getGermanHolidays(y, normalizeStateCode(company?.federal_state));
    });

    const cells: MatrixCell[] = [];
    matrixEmployees.forEach(emp => {
      months.forEach(({ year, month }) => {
        const isFuture = year > currentYear || (year === currentYear && month > currentMonth);
        const monthTimesheets = timesheets.filter(t => {
          if (t.project_id !== activeProjectId) return false;
          if (t.employee_id !== emp.id) return false;
          const d = new Date(t.work_date);
          return d.getFullYear() === year && d.getMonth() + 1 === month;
        });
        const hoursRecorded = monthTimesheets.reduce((sum, t) => sum + (t.hours || 0), 0);
        const workingDays = getWorkingDaysInMonth(year, month, holidaysByYear[year] || new Map());
        const daysWithEntries = new Set(
          monthTimesheets.filter(t => (t.hours || 0) > 0).map(t => t.work_date)
        ).size;
        const holidays = holidaysByYear[year] || new Map();
        let holidayCount = 0;
        const daysInMon = new Date(year, month, 0).getDate();
        for (let d = 1; d <= daysInMon; d++) {
          const dow = new Date(year, month-1, d).getDay();
          if (dow === 0 || dow === 6) continue;
          const ds = `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
          if (holidays.has(ds)) holidayCount++;
        }
        const daysRecorded = daysWithEntries + holidayCount;
        const isCompleted = completions.some(
          c => c.employee_id === emp.id && c.year === year && c.month === month
        );
        let status: MatrixCell['status'] = 'missing';
        if (isFuture) status = 'future';
        else if (isCompleted) status = 'complete';
        else if (hoursRecorded > 0 && daysRecorded >= workingDays) status = 'complete';
        else if (hoursRecorded > 0) status = 'partial';
        cells.push({ employeeId: emp.id, year, month, hoursRecorded, status });
      });
    });

    return { project, months, years, employees: matrixEmployees, cells };
  }, [activeProjectId, projects, workPackages, wpAssignments, employees, timesheets, company, completions]);

  return (
    <div className="mt-6 border border-gray-200 rounded-lg overflow-hidden">

      {/* Header */}
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Grid3x3 className={`w-5 h-5 ${iconColor}`} />
          <span className="font-medium text-gray-900">Stundennachweis-Matrix</span>

          {/* Mehrere Projekte: Dropdown */}
          {projects.length > 1 && (
            <select
              value={activeProjectId || ''}
              onChange={e => onProjectChange(e.target.value)}
              className={`text-sm border border-gray-300 rounded px-2 py-1 focus:ring-1 ${focusRing}`}
            >
              {projects.map(p => (
                <option key={p.id} value={p.id}>
                  {p.short_name || p.name}
                  {p.funding_reference ? ` (${p.funding_reference})` : ''}
                </option>
              ))}
            </select>
          )}

          {/* Einzelprojekt: Name + FKZ + Format */}
          {projects.length === 1 && activeProject && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-800">
                {activeProject.short_name || activeProject.name}
              </span>
              {activeProject.funding_reference && (
                <span className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-0.5 rounded">
                  {activeProject.funding_reference}
                </span>
              )}
              {activeProject.funding_format && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">
                  {getFundingLabel(activeProject.funding_format)}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Legende */}
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-green-500 inline-block"></span>Vollstaendig
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-orange-400 inline-block"></span>Teilweise
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-red-400 inline-block"></span>Fehlt
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-gray-200 inline-block"></span>Zukunft
          </span>
        </div>
      </div>

      {/* Tabelle */}
      {!matrixData ? (
        <div className="p-8 text-center text-gray-500">
          Keine Projektdaten verfuegbar (Projekt benoetigt Start- und Enddatum).
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-200">
                <th className="px-3 py-2 text-left font-semibold text-gray-600 w-40 sticky left-0 bg-gray-100 z-10">
                  Mitarbeiter
                </th>
                {matrixData.years.map(year => {
                  const monthsInYear = matrixData.months.filter(m => m.year === year);
                  return (
                    <th key={year} colSpan={monthsInYear.length}
                      className="px-2 py-2 text-center font-bold text-gray-700 border-l border-gray-300">
                      Jahr {year - matrixData.years[0] + 1} ({year})
                    </th>
                  );
                })}
              </tr>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-3 py-2 sticky left-0 bg-gray-50 z-10"></th>
                {matrixData.months.map(({ year, month, label }) => {
                  const now = new Date();
                  const isCurrent = year === now.getFullYear() && month === now.getMonth() + 1;
                  return (
                    <th key={`${year}-${month}`}
                      className={`px-1 py-2 text-center font-medium w-10 border-l border-gray-200 ${isCurrent ? 'text-blue-700 bg-blue-50' : 'text-gray-500'}`}>
                      {label}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {matrixData.employees.map((emp, empIdx) => (
                <tr key={emp.id} className={empIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className={`px-3 py-2 font-medium text-gray-800 sticky left-0 z-10 ${empIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    {emp.display_name}
                  </td>
                  {matrixData.months.map(({ year, month }) => {
                    const cell = matrixData.cells.find(
                      c => c.employeeId === emp.id && c.year === year && c.month === month
                    );
                    const status = cell?.status || 'future';
                    const hours = cell?.hoursRecorded || 0;
                    const colorMap: Record<string, string> = {
                      complete: 'bg-green-500 hover:bg-green-600 cursor-pointer',
                      partial:  'bg-orange-400 hover:bg-orange-500 cursor-pointer',
                      missing:  'bg-red-400 hover:bg-red-500 cursor-pointer',
                      future:   'bg-gray-200 cursor-default',
                      outside:  'bg-gray-100 cursor-default',
                    };
                    const isClickable = status !== 'future' && status !== 'outside';
                    const monthName = ['Januar','Februar','Maerz','April','Mai','Juni','Juli',
                      'August','September','Oktober','November','Dezember'][month-1];
                    const tooltip = status === 'future'
                      ? `${monthName} ${year}: Noch nicht erfasst`
                      : status === 'complete'
                      ? `${monthName} ${year}: ${hours.toFixed(1)}h - Vollstaendig`
                      : status === 'partial'
                      ? `${monthName} ${year}: ${hours.toFixed(1)}h - In Bearbeitung`
                      : `${monthName} ${year}: Keine Erfassung`;
                    return (
                      <td key={`${year}-${month}`}
                        className="px-1 py-2 text-center border-l border-gray-100"
                        title={tooltip}>
                        <div
                          className={`w-8 h-7 mx-auto rounded flex items-center justify-center text-white font-bold transition-colors ${colorMap[status] || 'bg-gray-100'}`}
                          onClick={() => { if (isClickable) onNavigateToZE(emp.id, year, month); }}
                        >
                          {status === 'complete' && <CheckCircle size={14} />}
                          {status === 'partial'  && <AlertTriangle size={14} />}
                          {status === 'missing'  && <XCircle size={14} />}
                          {status === 'future'   && <span className="text-gray-400 text-xs">-</span>}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="bg-gray-50 px-4 py-2 border-t border-gray-200 text-xs text-gray-500">
        Klick auf eine Zelle oeffnet die Zeiterfassung des Mitarbeiters fuer den jeweiligen Monat.
      </div>
    </div>
  );
}
