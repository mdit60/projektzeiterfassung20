// src/app/v7/berater/timesheets/page.tsx
// ============================================================================
// PZE V7.4 - Timesheet-Viewer Berater-Portal
// ============================================================================
// Version: 7.4.0-8
// Datum: 17. April 2026
//
// v7.4.0-8: NEU: Offene Rueckfragen-Badge pro Firma im Accordion
//   - Laedt offene v7_timesheet_notes
//   - Oranger Badge "X Rueckfragen" in der Firmen-Zeile
//   - Sichtbar in Accordion- und Jahresansicht
// v7.4.0-5: FIX Leere Projekte - MA aus v7_project_assignments laden
//   - Bisher: nur MA mit vorhandenen Eintraegen sichtbar (aggregated-Filter)
//   - Neu: MA aus Projektzuordnungen (v7_project_assignments) laden
//   - Alle zugeordneten MA erscheinen in der Matrix, auch ohne ZE-Eintraege
//   - Klick auf leere Zelle -> ZE neu erfassen moeglich
//   - Fallback: wenn keine Zuordnungen, zeige MA mit Eintraegen (wie bisher)
// v7.4.0-4: FIX URL-Parameter: employeeId -> employee, returnUrl hinzugefuegt
//   - Chronologisch links nach rechts
//   - Mitte = aktuelles Jahr, 2 Jahre davor, 2 Jahre danach
//   - Pfeil links/rechts verschiebt das Fenster um 1 Jahr
// v7.4.0-2: Globaler Jahresfilter + projektbasierte Laufzeit
//   - Globaler Jahres-Filter oben: zeigt alle Projekte die in diesem Jahr aktiv waren
//   - Kein Jahr gewaehlt: Accordion-Ansicht alle Firmen (wie v7.4.0-1)
//   - Jahres-Reiter pro Projekt: nur Jahre innerhalb start_date..end_date
//   - Monate ausserhalb Projektlaufzeit: grau gesperrt
//   - Vollstaendigkeits-Badge pro Projekt/Jahr: gruene/orange/rote Zaehler
//   - Firma + Projektname als Gruppenheader in Jahresansicht
//
// v7.4.0-1: DB-Schema korrigiert (work_date, hours, day_type)
// v7.4.0:   Erste Version Timesheet-Viewer
// ============================================================================

'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import PortalHeader from '@/components/shared/PortalHeader';
import PortalNav from '@/components/shared/PortalNav';
import {
  ChevronRight,
  ChevronLeft,
  Building2,
  FolderKanban,
  Calendar,
  Clock,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ExternalLink,
  MessageCircle,
} from 'lucide-react';

// ============================================================================
// KONSTANTEN
// ============================================================================

const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mrz', 'Apr', 'Mai', 'Jun',
  'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez',
];

const CURRENT_YEAR  = new Date().getFullYear();
const CURRENT_MONTH = new Date().getMonth() + 1;

// ============================================================================
// TYPEN
// ============================================================================

interface UserProfile {
  id: string;
  email: string;
  display_name: string | null;
  role: string;
  consultant_company_id: string | null;
}

interface ClientCompany {
  id: string;
  name: string;
  short_name: string | null;
}

interface Project {
  id: string;
  name: string;
  short_name: string | null;
  funding_format: string | null;
  funding_reference: string | null;
  start_date: string | null;   // "2023-04-01"
  end_date: string | null;     // "2025-09-30"
  client_company_id: string;
}

interface Employee {
  id: string;
  display_name: string;
  client_company_id: string;
}

interface TimesheetRow {
  id: string;
  project_id: string;
  employee_id: string;
  work_date: string;
  hours: number;
  day_type: string | null;
  is_active: boolean;
}

// Projektzuordnung: welcher MA ist welchem Projekt zugeordnet
interface ProjectAssignment {
  project_id: string;
  employee_id: string;
}

// Aggregiert: Stunden + Tage pro MA/Projekt/Monat
interface MonthSummary {
  totalHours: number;
  dayCount: number;
}

// Vollstaendigkeits-Badge pro Projekt/Jahr
interface CompletionBadge {
  complete: number;   // MA-Monate mit Stunden > 0
  partial: number;    // MA-Monate mit 0h (Eintrag vorhanden aber leer)
  missing: number;    // MA-Monate ohne Eintrag (innerhalb Laufzeit, Vergangenheit)
  total: number;      // Gesamt erwartete MA-Monate
}

// ============================================================================
// HILFSFUNKTIONEN
// ============================================================================

// Aggregiere Rohdaten zu [maId][projectId][month] fuer ein Jahr
function aggregateTimesheets(
  rows: TimesheetRow[],
  year: number
): Record<string, Record<string, Record<number, MonthSummary>>> {
  const result: Record<string, Record<string, Record<number, MonthSummary>>> = {};
  for (const row of rows) {
    if (!row.is_active) continue;
    const d = new Date(row.work_date);
    if (d.getFullYear() !== year) continue;
    const month = d.getMonth() + 1;
    if (!result[row.employee_id]) result[row.employee_id] = {};
    if (!result[row.employee_id][row.project_id]) result[row.employee_id][row.project_id] = {};
    if (!result[row.employee_id][row.project_id][month]) {
      result[row.employee_id][row.project_id][month] = { totalHours: 0, dayCount: 0 };
    }
    result[row.employee_id][row.project_id][month].totalHours += Number(row.hours) || 0;
    result[row.employee_id][row.project_id][month].dayCount   += 1;
  }
  return result;
}

// Ist ein Monat innerhalb der Projektlaufzeit?
function isMonthInProject(
  project: Project, year: number, month: number
): boolean {
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd   = new Date(year, month, 0);
  const projStart  = project.start_date ? new Date(project.start_date) : null;
  const projEnd    = project.end_date   ? new Date(project.end_date)   : null;
  if (projStart && monthEnd < projStart) return false;
  if (projEnd   && monthStart > projEnd) return false;
  return true;
}

// Ist ein Projekt in einem bestimmten Jahr aktiv?
function isProjectInYear(project: Project, year: number): boolean {
  return isMonthInProject(project, year, 1) ||
         isMonthInProject(project, year, 12);
}

// Alle Jahre der Projektlaufzeit berechnen
function getProjectYears(project: Project): number[] {
  if (!project.start_date && !project.end_date) return [CURRENT_YEAR];
  const startYear = project.start_date
    ? new Date(project.start_date).getFullYear()
    : CURRENT_YEAR - 2;
  const endYear = project.end_date
    ? new Date(project.end_date).getFullYear()
    : CURRENT_YEAR;
  const years: number[] = [];
  for (let y = startYear; y <= endYear; y++) years.push(y);
  return years;
}

// Ampel-Status einer Zelle
type CellStatus = 'complete' | 'zero' | 'future' | 'outside' | 'none';

function getCellStatus(
  summary: MonthSummary | undefined,
  project: Project,
  year: number,
  month: number
): CellStatus {
  if (!isMonthInProject(project, year, month)) return 'outside';
  const isFuture =
    year > CURRENT_YEAR ||
    (year === CURRENT_YEAR && month > CURRENT_MONTH);
  if (isFuture) return 'future';
  if (!summary) return 'none';
  if (summary.totalHours > 0) return 'complete';
  return 'zero';
}

function getCellStyle(status: CellStatus): string {
  switch (status) {
    case 'complete': return 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200 cursor-pointer';
    case 'zero':     return 'bg-red-100 text-red-700 border-red-200 hover:bg-red-200 cursor-pointer';
    case 'future':   return 'bg-gray-50 text-gray-300 border-gray-100';
    case 'outside':  return 'bg-gray-100 text-gray-300 border-gray-200';
    default:         return 'bg-white text-gray-400 border-gray-100 hover:bg-blue-50 cursor-pointer';
  }
}

function getCellLabel(summary: MonthSummary | undefined, status: CellStatus): string {
  if (status === 'future' || status === 'outside') return '';
  if (!summary || status === 'none') return '-';
  return `${summary.totalHours.toFixed(0)}h`;
}

// Vollstaendigkeits-Badge berechnen
function calcCompletion(
  project: Project,
  employees: Employee[],
  assignments: ProjectAssignment[],
  aggregated: Record<string, Record<string, Record<number, MonthSummary>>>,
  year: number
): CompletionBadge {
  // MA aus Projektzuordnungen; Fallback: MA mit Eintraegen
  const assignedIds = assignments
    .filter((a) => a.project_id === project.id)
    .map((a) => a.employee_id);
  const projectEmployees = assignedIds.length > 0
    ? employees.filter((e) => assignedIds.includes(e.id))
    : employees.filter((e) => aggregated[e.id]?.[project.id]);

  let complete = 0, zero = 0, missing = 0, total = 0;

  for (const emp of projectEmployees) {
    for (let m = 1; m <= 12; m++) {
      if (!isMonthInProject(project, year, m)) continue;
      const isFuture =
        year > CURRENT_YEAR ||
        (year === CURRENT_YEAR && m > CURRENT_MONTH);
      if (isFuture) continue;
      total++;
      const summary = aggregated[emp.id]?.[project.id]?.[m];
      if (!summary) { missing++; }
      else if (summary.totalHours > 0) { complete++; }
      else { zero++; }
    }
  }
  return { complete, partial: zero, missing, total };
}

// ============================================================================
// TOOLTIP-KOMPONENTE
// ============================================================================

function CellTooltip({
  summary, employeeName, month, year, status,
}: {
  summary: MonthSummary | undefined;
  employeeName: string;
  month: number;
  year: number;
  status: CellStatus;
}) {
  return (
    <div className="text-xs">
      <div className="font-medium text-gray-700">{employeeName}</div>
      <div className="text-gray-500">{MONTHS_SHORT[month - 1]} {year}</div>
      {summary && summary.totalHours > 0 ? (
        <div className="mt-1 space-y-0.5">
          <div>Stunden: <span className="font-medium">{summary.totalHours.toFixed(1)}h</span></div>
          <div>Eintraege: <span className="font-medium">{summary.dayCount} Tage</span></div>
        </div>
      ) : status === 'none' ? (
        <div className="mt-1 text-gray-400 italic">Kein Eintrag</div>
      ) : (
        <div className="mt-1 text-orange-600">0h erfasst</div>
      )}
      {(status === 'none' || status === 'complete' || status === 'zero') && (
        <div className="mt-1 text-blue-500 flex items-center gap-1">
          <ExternalLink size={10} /> Zur Zeiterfassung
        </div>
      )}
    </div>
  );
}

// ============================================================================
// VOLLSTAENDIGKEITS-BADGE
// ============================================================================

function CompletionBadgeDisplay({ badge }: { badge: CompletionBadge }) {
  if (badge.total === 0) return null;
  return (
    <div className="flex items-center gap-2 text-xs">
      {badge.complete > 0 && (
        <span className="flex items-center gap-1 text-green-700">
          <CheckCircle2 size={12} /> {badge.complete}
        </span>
      )}
      {badge.partial > 0 && (
        <span className="flex items-center gap-1 text-orange-600">
          <AlertTriangle size={12} /> {badge.partial}
        </span>
      )}
      {badge.missing > 0 && (
        <span className="flex items-center gap-1 text-red-600">
          <XCircle size={12} /> {badge.missing}
        </span>
      )}
      <span className="text-gray-400">/ {badge.total}</span>
    </div>
  );
}

// ============================================================================
// PROJEKT-MATRIX (wiederverwendbar fuer beide Ansichten)
// ============================================================================

function ProjectMatrix({
  project,
  employees,
  assignments,
  aggregated,
  year,
  companyId,
  onNavigate,
}: {
  project: Project;
  employees: Employee[];
  assignments: ProjectAssignment[];
  aggregated: Record<string, Record<string, Record<number, MonthSummary>>>;
  year: number;
  companyId: string;
  onNavigate: (companyId: string, employeeId: string, year: number, month: number) => void;
}) {
  const [hoveredCell, setHoveredCell] = useState<{
    employeeId: string; month: number; rect: DOMRect;
  } | null>(null);

  // MA die diesem Projekt zugeordnet sind (aus v7_project_assignments)
  const assignedEmployeeIds = assignments
    .filter((a) => a.project_id === project.id)
    .map((a) => a.employee_id);

  // Primaer: zugeordnete MA; Fallback: MA mit vorhandenen Eintraegen
  const relevantEmployees = assignedEmployeeIds.length > 0
    ? employees.filter((e) => assignedEmployeeIds.includes(e.id))
    : employees.filter((e) => aggregated[e.id]?.[project.id]);

  if (relevantEmployees.length === 0) {
    return (
      <div className="text-xs text-gray-400 italic px-2 py-2">
        Keine Mitarbeiter zugeordnet. Bitte zuerst MA im Projekteam hinterlegen.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-xs border-collapse">
        <thead>
          <tr className="bg-gray-50">
            <th className="text-left px-3 py-2 font-medium text-gray-600 border border-gray-200 min-w-[140px]">
              Mitarbeiter
            </th>
            {MONTHS_SHORT.map((m, idx) => {
              const inProject = isMonthInProject(project, year, idx + 1);
              const isCurrent = idx + 1 === CURRENT_MONTH && year === CURRENT_YEAR;
              return (
                <th
                  key={idx}
                  className={`px-2 py-2 font-medium text-center border border-gray-200 min-w-[52px] ${
                    !inProject
                      ? 'bg-gray-100 text-gray-300'
                      : isCurrent
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-600'
                  }`}
                >
                  {m}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {relevantEmployees.map((emp) => (
            <tr key={emp.id} className="hover:bg-gray-50/50">
              <td className="px-3 py-1.5 border border-gray-200 font-medium text-gray-700 whitespace-nowrap">
                {emp.display_name}
              </td>
              {MONTHS_SHORT.map((_, idx) => {
                const month   = idx + 1;
                const summary = aggregated[emp.id]?.[project.id]?.[month];
                const status  = getCellStatus(summary, project, year, month);
                const label   = getCellLabel(summary, status);
                const clickable = status !== 'future' && status !== 'outside';

                return (
                  <td
                    key={month}
                    className="border border-gray-200 text-center relative"
                    onMouseEnter={(e) => {
                      if (clickable) setHoveredCell({
                        employeeId: emp.id, month,
                        rect: e.currentTarget.getBoundingClientRect(),
                      });
                    }}
                    onMouseLeave={() => setHoveredCell(null)}
                  >
                    <div
                      className={`mx-0.5 my-0.5 rounded px-1 py-1 text-center font-medium border transition-colors ${getCellStyle(status)}`}
                      onClick={() => clickable && onNavigate(companyId, emp.id, year, month)}
                    >
                      {label}
                    </div>
                    {hoveredCell?.employeeId === emp.id && hoveredCell?.month === month && (
                      <div
                        className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-3 w-44 pointer-events-none"
                        style={{
                          top:  hoveredCell.rect.bottom + 4 + window.scrollY,
                          left: Math.min(hoveredCell.rect.left + window.scrollX, window.innerWidth - 190),
                        }}
                      >
                        <CellTooltip
                          summary={summary}
                          employeeName={emp.display_name}
                          month={month}
                          year={year}
                          status={status}
                        />
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================================
// PROJEKT-CARD (fuer Jahresansicht UND Accordion)
// ============================================================================

function ProjectCard({
  project,
  company,
  employees,
  assignments,
  timesheets,
  initialYear,
  onNavigate,
  showCompanyHeader,
}: {
  project: Project;
  company: ClientCompany;
  employees: Employee[];
  assignments: ProjectAssignment[];
  timesheets: TimesheetRow[];
  initialYear: number;
  onNavigate: (companyId: string, employeeId: string, year: number, month: number) => void;
  showCompanyHeader: boolean;
}) {
  const projectYears = getProjectYears(project);
  const [selectedYear, setSelectedYear] = useState(
    projectYears.includes(initialYear) ? initialYear : projectYears[projectYears.length - 1]
  );

  const aggregated = useMemo(
    () => aggregateTimesheets(timesheets, selectedYear),
    [timesheets, selectedYear]
  );

  const companyEmployees = employees.filter((e) => e.client_company_id === company.id);
  const badge = calcCompletion(project, companyEmployees, assignments, aggregated, selectedYear);

  const yearEntries = timesheets.filter((t) => {
    const d = new Date(t.work_date);
    return t.project_id === project.id && d.getFullYear() === selectedYear;
  }).length;

  const laufzeit = project.start_date && project.end_date
    ? `${new Date(project.start_date).getFullYear()} \u2013 ${new Date(project.end_date).getFullYear()}`
    : project.start_date
      ? `ab ${new Date(project.start_date).getFullYear()}`
      : null;

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
      {/* Firmen-Header (nur in Jahresansicht) */}
      {showCompanyHeader && (
        <div className="px-4 py-2 bg-blue-50 border-b border-blue-100 flex items-center gap-2">
          <Building2 size={14} className="text-blue-600" />
          <span className="text-sm font-semibold text-blue-800">{company.name}</span>
          {company.short_name && (
            <span className="text-xs text-blue-500">({company.short_name})</span>
          )}
        </div>
      )}

      {/* Projekt-Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-start justify-between gap-4">
        <div className="flex items-start gap-2 min-w-0">
          <FolderKanban size={16} className="text-blue-500 mt-0.5 shrink-0" />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-gray-800 text-sm">{project.name}</span>
              {project.short_name && (
                <span className="text-xs text-gray-400">({project.short_name})</span>
              )}
              {project.funding_format && (
                <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs rounded border border-blue-100">
                  {project.funding_format}
                </span>
              )}
              {laufzeit && (
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <Calendar size={11} />
                  {laufzeit}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Rechts: Badge + Jahres-Reiter */}
        <div className="flex items-center gap-3 shrink-0">
          <CompletionBadgeDisplay badge={badge} />
          <div className="flex gap-1">
            {projectYears.map((y) => (
              <button
                key={y}
                onClick={() => setSelectedYear(y)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  selectedYear === y
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {y}
              </button>
            ))}
          </div>
          <span className="text-xs text-gray-400 whitespace-nowrap">
            {yearEntries} Eintr.
          </span>
        </div>
      </div>

      {/* Matrix */}
      <div className="p-2">
        <ProjectMatrix
          project={project}
          employees={companyEmployees}
          assignments={assignments}
          aggregated={aggregated}
          year={selectedYear}
          companyId={company.id}
          onNavigate={onNavigate}
        />
      </div>

      {/* Legende */}
      <div className="flex items-center gap-4 px-4 py-2 bg-gray-50 border-t border-gray-100 text-xs text-gray-500">
        <span className="font-medium">Legende:</span>
        {[
          { color: 'bg-green-100 border-green-200', label: 'Erfasst' },
          { color: 'bg-red-100 border-red-200',     label: '0h' },
          { color: 'bg-white border-gray-200',      label: 'Kein Eintrag' },
          { color: 'bg-gray-100 border-gray-200',   label: 'Ausserhalb Laufzeit' },
          { color: 'bg-gray-50 border-gray-100',    label: 'Zukunft' },
        ].map((item, i) => (
          <span key={i} className="flex items-center gap-1">
            <span className={`inline-block w-3 h-3 rounded border ${item.color}`} />
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// FIRMEN-ACCORDION (fuer Gesamt-Ansicht ohne Jahresfilter)
// ============================================================================

function CompanyAccordion({
  company, projects, employees, assignments, timesheets, onNavigate, openNoteCount, onNoteClick,
}: {
  company: ClientCompany;
  projects: Project[];
  employees: Employee[];
  assignments: ProjectAssignment[];
  timesheets: TimesheetRow[];
  onNavigate: (companyId: string, employeeId: string, year: number, month: number) => void;
  openNoteCount: number;
  onNoteClick: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const companyProjects    = projects.filter((p) => p.client_company_id === company.id);
  const companyTimesheets  = timesheets.filter((t) =>
    companyProjects.some((p) => p.id === t.project_id)
  );
  const totalEntries = companyTimesheets.length;
  const totalHours   = companyTimesheets.reduce((s, t) => s + (Number(t.hours) || 0), 0);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Firmen-Zeile */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 cursor-pointer transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <ChevronRight
            size={18}
            className={`text-gray-400 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
          />
          <Building2 size={18} className="text-blue-600" />
          <span className="font-semibold text-gray-800">{company.name}</span>
          {company.short_name && (
            <span className="text-xs text-gray-400">({company.short_name})</span>
          )}
        </div>
        <div className="flex items-center gap-6 text-sm text-gray-500">
          {openNoteCount > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); onNoteClick(); }}
              className="flex items-center gap-1 text-orange-500 font-medium hover:text-orange-700 hover:underline"
            >
              <MessageCircle size={14} />
              {openNoteCount} {openNoteCount === 1 ? 'Rueckfrage' : 'Rueckfragen'}
            </button>
          )}
          <span className="flex items-center gap-1">
            <FolderKanban size={14} />
            {companyProjects.length} {companyProjects.length === 1 ? 'Projekt' : 'Projekte'}
          </span>
          <span className="flex items-center gap-1">
            <Clock size={14} />
            {totalHours.toFixed(0)}h / {totalEntries} Eintr.
          </span>
        </div>
      </div>

      {/* Projekte */}
      {expanded && (
        <div className="border-t border-gray-200 p-3 bg-gray-50/30 space-y-3">
          {companyProjects.length === 0 ? (
            <div className="text-sm text-gray-400 italic text-center py-4">
              Keine Projekte vorhanden.
            </div>
          ) : (
            companyProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                company={company}
                employees={employees}
                assignments={assignments}
                timesheets={timesheets}
                initialYear={CURRENT_YEAR}
                onNavigate={onNavigate}
                showCompanyHeader={false}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// HAUPTSEITE
// ============================================================================

export default function TimesheetViewerPage() {
  const router   = useRouter();
  const supabase = createClient();

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [companies,    setCompanies]   = useState<ClientCompany[]>([]);
  const [projects,     setProjects]    = useState<Project[]>([]);
  const [employees,    setEmployees]   = useState<Employee[]>([]);
  const [assignments,  setAssignments] = useState<ProjectAssignment[]>([]);
  const [timesheets,   setTimesheets]  = useState<TimesheetRow[]>([]);
  // NEU v7.4.0-8: Offene Notizen mit Details pro Firma
  const [openNotes,    setOpenNotes]   = useState<Record<string, { count: number; firstNote: { employee_id: string; year: number; month: number } | null }>>({}); 
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [refreshing,  setRefreshing]  = useState(false);

  // Globaler Jahres-Filter: null = alle Firmen (Accordion)
  const [globalYear,    setGlobalYear]    = useState<number | null>(null);
  // Sliding Window: Mitte des 5-Jahres-Fensters (Standard: aktuelles Jahr)
  const [windowCenter,  setWindowCenter]  = useState<number>(CURRENT_YEAR);

  // Die 5 sichtbaren Jahre: windowCenter-2 bis windowCenter+2, chronologisch
  const visibleYears = useMemo(() => {
    return [
      windowCenter - 2,
      windowCenter - 1,
      windowCenter,
      windowCenter + 1,
      windowCenter + 2,
    ];
  }, [windowCenter]);

  //  Daten laden --------------------------------------------------------

  const loadData = useCallback(async () => {
    try {
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data: profile, error: pErr } = await supabase
        .from('v7_user_profiles')
        .select('id, email, display_name, role, consultant_company_id')
        .eq('email', user.email!)
        .single();
      if (pErr || !profile) throw new Error('Profil nicht gefunden.');
      if (!['consultant', 'system_admin'].includes(profile.role)) {
        router.push('/v7/firma/dashboard'); return;
      }
      setUserProfile(profile);

      // Firmen
      let q = supabase
        .from('v7_client_companies')
        .select('id, name, short_name')
        .eq('is_active', true)
        .order('name');
      if (profile.role === 'consultant' && profile.consultant_company_id) {
        q = q.eq('consultant_company_id', profile.consultant_company_id);
      }
      const { data: comp, error: cErr } = await q;
      if (cErr) throw cErr;
      setCompanies(comp || []);
      if (!comp || comp.length === 0) { setLoading(false); return; }

      const companyIds = comp.map((c: ClientCompany) => c.id);

      // Projekte (inkl. start_date + end_date fuer Laufzeit)
      const { data: proj, error: prErr } = await supabase
        .from('v7_projects')
        .select('id, name, short_name, funding_format, funding_reference, start_date, end_date, client_company_id')
        .in('client_company_id', companyIds)
        .eq('is_active', true)
        .order('name');
      if (prErr) throw prErr;
      setProjects(proj || []);

      // Mitarbeiter
      const { data: empl, error: eErr } = await supabase
        .from('v7_employees')
        .select('id, display_name, client_company_id')
        .in('client_company_id', companyIds)
        .eq('is_active', true)
        .order('display_name');
      if (eErr) throw eErr;
      setEmployees(empl || []);

      // Projektzuordnungen - welcher MA ist welchem Projekt zugeordnet
      if (proj && proj.length > 0) {
        const projectIds = proj.map((p: Project) => p.id);
        const { data: assign, error: aErr } = await supabase
          .from('v7_project_assignments')
          .select('project_id, employee_id')
          .in('project_id', projectIds)
          .eq('is_active', true);
        if (aErr) {
          console.warn('Projektzuordnungen konnten nicht geladen werden:', aErr);
          setAssignments([]);
        } else {
          setAssignments(assign || []);
        }
      }

      // Timesheets
      if (proj && proj.length > 0) {
        const projectIds = proj.map((p: Project) => p.id);
        const { data: ts, error: tErr } = await supabase
          .from('v7_timesheets')
          .select('id, project_id, employee_id, work_date, hours, day_type, is_active')
          .in('project_id', projectIds)
          .eq('is_active', true)
          .order('work_date', { ascending: false });
        if (tErr) throw tErr;
        setTimesheets(ts || []);

        // NEU v7.4.0-8: Offene Notizen pro Firma mit Details
        const { data: notesRaw } = await supabase
          .from('v7_timesheet_notes')
          .select('project_id, employee_id, year, month')
          .eq('status', 'offen');

        if (notesRaw && notesRaw.length > 0) {
          const notesByCompany: Record<string, { count: number; firstNote: { employee_id: string; year: number; month: number } | null }> = {};
          notesRaw.forEach((n: { project_id: string; employee_id: string; year: number; month: number }) => {
            const noteProject = (proj || []).find((p: Project) => p.id === n.project_id);
            if (noteProject) {
              const cid = noteProject.client_company_id;
              if (!notesByCompany[cid]) {
                notesByCompany[cid] = { count: 0, firstNote: null };
              }
              notesByCompany[cid].count++;
              if (!notesByCompany[cid].firstNote) {
                notesByCompany[cid].firstNote = { employee_id: n.employee_id, year: n.year, month: n.month };
              }
            }
          });
          setOpenNotes(notesByCompany);
        } else {
          setOpenNotes({});
        }
      }

    } catch (err) {
      console.error('Ladefehler TimesheetViewer:', err);
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler beim Laden.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [supabase, router]);

  useEffect(() => { loadData(); }, [loadData]);

  //  Globale Jahres-Liste (alle Jahre die mind. 1 Projekt hat) ----------

  const availableYears = useMemo(() => {
    const yearSet = new Set<number>();
    for (const proj of projects) {
      for (const y of getProjectYears(proj)) yearSet.add(y);
    }
    return [...yearSet].sort((a, b) => b - a);
  }, [projects]);

  //  Gefilterte Projekte fuer Jahresansicht ------------------------------

  const filteredProjects = useMemo(() => {
    if (globalYear === null) return [];
    return projects.filter((p) => isProjectInYear(p, globalYear));
  }, [projects, globalYear]);

  //  Navigation zur Zeiterfassung ----------------------------------------

  const handleNavigate = (
    companyId: string, employeeId: string, year: number, month: number
  ) => {
    // Parameter-Namen muessen mit Berater-ZE-Seite uebereinstimmen:
    // ?employee= (nicht ?employeeId=), ?year=, ?month=
    // returnUrl damit Zurueck-Button wieder hier hin fuehrt
    const params = new URLSearchParams({
      employee:  employeeId,
      year:      year.toString(),
      month:     month.toString(),
      returnUrl: '/v7/berater/timesheets',
    });
    router.push(
      `/v7/berater/foerderung/firma/${companyId}/zeiterfassung?${params.toString()}`
    );
  };

  //  Gesamtstatistik --------------------------------------------------

  const totalHours = timesheets.reduce((s, t) => s + (Number(t.hours) || 0), 0);

  //  Render --------------------------------------------------------

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Zeiterfassungen werden geladen...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {userProfile && (
        <PortalHeader
          portal="berater"
          userRole={userProfile.role}
          userName={userProfile.display_name || userProfile.email}
          userEmail={userProfile.email}
          companyName="PZE"
          currentPath="/v7/berater/timesheets"
        />
      )}
      {userProfile && (
        <PortalNav
          portal="berater"
          userRole={userProfile.role}
          currentPath="/v7/berater/timesheets"
        />
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* Seitentitel */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Zeiterfassungs-&Uuml;bersicht</h1>
            <p className="text-sm text-gray-500 mt-1">
              Alle Stundenerfassungen &uuml;ber alle Kunden, Projekte und Mitarbeiter
            </p>
          </div>
          <button
            onClick={() => { setRefreshing(true); loadData(); }}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200
                       rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
            Aktualisieren
          </button>
        </div>

        {/* Fehler */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700">
            <AlertCircle size={18} />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Statistik-Kacheln */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Kunden',             value: companies.length,          color: 'text-blue-600',   bg: 'bg-blue-50'   },
            { label: 'Projekte',           value: projects.length,           color: 'text-purple-600', bg: 'bg-purple-50' },
            { label: 'Tageseintr\u00e4ge', value: timesheets.length,         color: 'text-green-600',  bg: 'bg-green-50'  },
            { label: 'Stunden gesamt',     value: `${totalHours.toFixed(0)}h`, color: 'text-orange-600', bg: 'bg-orange-50' },
          ].map((stat, i) => (
            <div key={i} className={`${stat.bg} rounded-lg p-4 border border-white shadow-sm`}>
              <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Tab-Leiste */}
        <div className="flex items-center gap-1 mb-0">
          <button className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-t-lg">
            Zeiterfassung
          </button>
          <button
            disabled
            className="px-4 py-2 bg-white text-gray-400 text-sm border border-gray-200 rounded-t-lg cursor-not-allowed"
            title="FZul-Analyse - in Vorbereitung (v7.4+)"
          >
            FZul-Analyse
            <span className="ml-2 text-xs bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded">bald</span>
          </button>
        </div>

        {/* Haupt-Panel */}
        <div className="bg-white rounded-b-lg rounded-tr-lg border border-gray-200 shadow-sm">

          {/* Globaler Jahres-Filter - Sliding Window */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 bg-gray-50/50">
            <span className="text-sm font-medium text-gray-600 shrink-0 mr-1">Jahr:</span>

            {/* Pfeil links - Fenster nach links verschieben (aeltere Jahre) */}
            <button
              onClick={() => setWindowCenter((c) => c - 1)}
              className="p-1.5 rounded-lg bg-white border border-gray-200 text-gray-500
                         hover:bg-gray-100 hover:text-gray-700 transition-colors shrink-0"
              title="Aeltere Jahre anzeigen"
            >
              <ChevronLeft size={16} />
            </button>

            {/* "Alle Firmen" Button */}
            <button
              onClick={() => setGlobalYear(null)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors shrink-0 ${
                globalYear === null
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              Alle
            </button>

            <div className="w-px h-5 bg-gray-200 shrink-0" />

            {/* 5 sichtbare Jahre - chronologisch links nach rechts */}
            <div className="flex gap-1.5">
              {visibleYears.map((y) => {
                const isCurrent = y === CURRENT_YEAR;
                const isSelected = globalYear === y;
                return (
                  <button
                    key={y}
                    onClick={() => setGlobalYear(y)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-sm'
                        : isCurrent
                          ? 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
                          : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {y}
                    {isCurrent && !isSelected && (
                      <span className="ml-1 text-xs opacity-60">&#9679;</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Pfeil rechts - Fenster nach rechts verschieben (neuere Jahre) */}
            <button
              onClick={() => setWindowCenter((c) => c + 1)}
              className="p-1.5 rounded-lg bg-white border border-gray-200 text-gray-500
                         hover:bg-gray-100 hover:text-gray-700 transition-colors shrink-0"
              title="Neuere Jahre anzeigen"
            >
              <ChevronRight size={16} />
            </button>

            {/* Zurueck zu aktuellem Jahr */}
            {windowCenter !== CURRENT_YEAR && (
              <button
                onClick={() => setWindowCenter(CURRENT_YEAR)}
                className="ml-1 px-2 py-1 rounded text-xs text-blue-600 hover:bg-blue-50 transition-colors"
                title="Zum aktuellen Jahr"
              >
                Heute
              </button>
            )}
          </div>

          {/* ANSICHT A: Alle Firmen (Accordion) */}
          {globalYear === null && (
            <div className="p-3 space-y-2">
              {companies.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  <Building2 size={32} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Keine Kunden gefunden.</p>
                </div>
              ) : (
                companies.map((company) => (
                  <CompanyAccordion
                    key={company.id}
                    company={company}
                    projects={projects}
                    employees={employees}
                    assignments={assignments}
                    timesheets={timesheets}
                    onNavigate={handleNavigate}
                    openNoteCount={openNotes[company.id]?.count || 0}
                    onNoteClick={() => {
                      const noteData = openNotes[company.id];
                      if (!noteData) return;
                      if (noteData.count === 1 && noteData.firstNote) {
                        // Eine Notiz: direkt zur ZE
                        handleNavigate(company.id, noteData.firstNote.employee_id, noteData.firstNote.year, noteData.firstNote.month);
                      } else {
                        // Mehrere Notizen: zur Berichte-Seite (Matrix mit orangen Punkten)
                        router.push(`/v7/berater/foerderung/firma/${company.id}/berichte`);
                      }
                    }}
                  />
                ))
              )}
            </div>
          )}

          {/* ANSICHT B: Jahres-Filter aktiv - alle Projekte dieses Jahres */}
          {globalYear !== null && (
            <div className="p-3">
              {filteredProjects.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  <Calendar size={32} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Keine aktiven Projekte in {globalYear}.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1 mb-2">
                    <span className="text-sm text-gray-500">
                      <span className="font-medium text-gray-700">{filteredProjects.length}</span>
                      {' '}aktive {filteredProjects.length === 1 ? 'Projekt' : 'Projekte'} in {globalYear}
                    </span>
                  </div>
                  {filteredProjects.map((project) => {
                    const company = companies.find((c) => c.id === project.client_company_id);
                    if (!company) return null;
                    return (
                      <ProjectCard
                        key={project.id}
                        project={project}
                        company={company}
                        employees={employees}
                        assignments={assignments}
                        timesheets={timesheets}
                        initialYear={globalYear}
                        onNavigate={handleNavigate}
                        showCompanyHeader={true}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
