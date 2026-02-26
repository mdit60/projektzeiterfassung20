// src/app/v7/berater/timesheets/page.tsx
// ============================================================================
// PZE V7.4 - Timesheet-Viewer Berater-Portal
// ============================================================================
// Version: 7.4.0-1
// Datum: 23. Februar 2026
//
// v7.4.0-1: DB-Schema korrigiert - echte v7_timesheets Struktur:
//   - Eine Zeile pro Tag (work_date, hours, day_type)
//   - Aggregation auf Monat/MA/Projekt erfolgt im Frontend
//   - Kein total_hours/total_fue_hours/is_locked in DB
//
// Struktur:
//   Ebene 1: Firmentabelle (alle Kunden mit Projekt/Jahr-Zusammenfassung)
//   Ebene 2: Aufklappbare Projekt-Monatsmatrix pro Firma
//            Mitarbeiter x Monate (Jan-Dez) mit Ampelfarben + Stunden
//            Direktlink zur Zeiterfassung des jeweiligen MA/Monat
// ============================================================================

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import PortalHeader from '@/components/shared/PortalHeader';
import PortalNav from '@/components/shared/PortalNav';
import {
  ChevronRight,
  Building2,
  FolderKanban,
  Calendar,
  Clock,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Filter,
} from 'lucide-react';

// ============================================================================
// KONSTANTEN
// ============================================================================

const MONTHS = [
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
  client_company_id: string;
}

interface Employee {
  id: string;
  display_name: string;
  client_company_id: string;
}

// Rohdaten aus DB: eine Zeile pro Tag
interface TimesheetRow {
  id: string;
  project_id: string;
  employee_id: string;
  work_date: string;   // "2026-01-15"
  hours: number;
  day_type: string | null;
  is_active: boolean;
}

// Aggregiert: Stunden pro MA/Projekt/Monat
interface MonthSummary {
  totalHours: number;
  dayCount: number;     // Anzahl Tage mit Eintraegen
  hasFuE: boolean;      // day_type enthaelt 'technical' o.ae.
}

// ============================================================================
// HILFSFUNKTIONEN
// ============================================================================

// Aggregiere Rohdaten zu MonthSummary[maId][projectId][month]
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
      result[row.employee_id][row.project_id][month] = {
        totalHours: 0, dayCount: 0, hasFuE: false,
      };
    }
    const summary = result[row.employee_id][row.project_id][month];
    summary.totalHours += Number(row.hours) || 0;
    summary.dayCount   += 1;
    if (row.day_type && row.day_type.toLowerCase().includes('tech')) {
      summary.hasFuE = true;
    }
  }

  return result;
}

// Ampel-Status einer Zelle
function getCellStatus(
  summary: MonthSummary | undefined,
  year: number,
  month: number
): 'complete' | 'partial' | 'zero' | 'future' | 'none' {
  const isFuture =
    year > CURRENT_YEAR ||
    (year === CURRENT_YEAR && month > CURRENT_MONTH);
  if (isFuture) return 'future';
  if (!summary) return 'none';
  if (summary.totalHours > 0) return 'complete';
  return 'zero';
}

function getCellStyle(status: string): string {
  switch (status) {
    case 'complete': return 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200 cursor-pointer';
    case 'partial':  return 'bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200 cursor-pointer';
    case 'zero':     return 'bg-red-100 text-red-700 border-red-200 hover:bg-red-200 cursor-pointer';
    case 'future':   return 'bg-gray-50 text-gray-300 border-gray-100';
    default:         return 'bg-white text-gray-300 border-gray-100 hover:bg-gray-50 cursor-pointer';
  }
}

function getCellLabel(summary: MonthSummary | undefined, status: string): string {
  if (status === 'future') return '';
  if (!summary || status === 'none') return '-';
  if (summary.totalHours > 0) return `${summary.totalHours.toFixed(0)}h`;
  return '0h';
}

// ============================================================================
// TOOLTIP
// ============================================================================

function CellTooltip({
  summary, employee, month, year,
}: {
  summary: MonthSummary | undefined;
  employee: Employee;
  month: number;
  year: number;
}) {
  return (
    <div className="text-xs">
      <div className="font-medium text-gray-700">{employee.display_name}</div>
      <div className="text-gray-500">{MONTHS[month - 1]} {year}</div>
      {summary ? (
        <div className="mt-1 space-y-0.5">
          <div>Stunden: <span className="font-medium">{summary.totalHours.toFixed(1)}h</span></div>
          <div>Tage: <span className="font-medium">{summary.dayCount}</span></div>
        </div>
      ) : (
        <div className="mt-1 text-gray-400 italic">Kein Eintrag</div>
      )}
      <div className="mt-1 text-blue-500 flex items-center gap-1">
        <ExternalLink size={10} /> Zur Zeiterfassung
      </div>
    </div>
  );
}

// ============================================================================
// PROJEKT-MATRIX
// ============================================================================

function ProjectMatrix({
  project,
  employees,
  aggregated,
  year,
  companyId,
  onNavigate,
}: {
  project: Project;
  employees: Employee[];
  aggregated: Record<string, Record<string, Record<number, MonthSummary>>>;
  year: number;
  companyId: string;
  onNavigate: (companyId: string, employeeId: string, year: number, month: number) => void;
}) {
  const [hoveredCell, setHoveredCell] = useState<{
    employeeId: string; month: number; rect: DOMRect;
  } | null>(null);

  // Nur MA die mindestens einen Eintrag in diesem Projekt haben
  const relevantEmployees = employees.filter(
    (emp) => aggregated[emp.id]?.[project.id]
  );

  if (relevantEmployees.length === 0) {
    return (
      <div className="text-xs text-gray-400 italic px-2 py-2">
        Keine Eintr&auml;ge f&uuml;r {year} vorhanden.
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
            {MONTHS.map((m, idx) => (
              <th
                key={idx}
                className={`px-2 py-2 font-medium text-center border border-gray-200 min-w-[52px] ${
                  idx + 1 === CURRENT_MONTH && year === CURRENT_YEAR
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600'
                }`}
              >
                {m}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {relevantEmployees.map((emp) => (
            <tr key={emp.id} className="hover:bg-gray-50/50">
              <td className="px-3 py-1.5 border border-gray-200 font-medium text-gray-700 whitespace-nowrap">
                {emp.display_name}
              </td>
              {MONTHS.map((_, idx) => {
                const month   = idx + 1;
                const summary = aggregated[emp.id]?.[project.id]?.[month];
                const status  = getCellStatus(summary, year, month);
                const label   = getCellLabel(summary, status);
                const clickable = status !== 'future';

                return (
                  <td
                    key={month}
                    className="border border-gray-200 text-center relative"
                    onMouseEnter={(e) => clickable && setHoveredCell({
                      employeeId: emp.id, month,
                      rect: e.currentTarget.getBoundingClientRect(),
                    })}
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
                        <CellTooltip summary={summary} employee={emp} month={month} year={year} />
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
// FIRMEN-ACCORDION
// ============================================================================

function CompanyAccordionRow({
  company, projects, employees, timesheets, onNavigate,
}: {
  company: ClientCompany;
  projects: Project[];
  employees: Employee[];
  timesheets: TimesheetRow[];
  onNavigate: (companyId: string, employeeId: string, year: number, month: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);

  const companyProjects  = projects.filter((p) => p.client_company_id === company.id);
  const companyEmployees = employees.filter((e) => e.client_company_id === company.id);
  const projectIds       = companyProjects.map((p) => p.id);

  // Zeitstempel dieser Firma filtern
  const companyTimesheets = timesheets.filter((t) => projectIds.includes(t.project_id));

  // Jahre aus Daten ableiten
  const rawYears = [
    ...new Set(companyTimesheets.map((t) => new Date(t.work_date).getFullYear())),
  ].filter(Boolean).sort((a, b) => b - a);
  const years = rawYears.length > 0 ? rawYears : [CURRENT_YEAR];
  if (!years.includes(CURRENT_YEAR)) years.unshift(CURRENT_YEAR);

  const totalEntries = companyTimesheets.length;

  // Aggregation fuer gewaehltes Jahr
  const aggregated = aggregateTimesheets(companyTimesheets, selectedYear);

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
          <span className="flex items-center gap-1">
            <FolderKanban size={14} />
            {companyProjects.length} {companyProjects.length === 1 ? 'Projekt' : 'Projekte'}
          </span>
          <span className="flex items-center gap-1">
            <Calendar size={14} />
            {years.slice(0, 3).join(', ')}
          </span>
          <span className="flex items-center gap-1">
            <Clock size={14} />
            {totalEntries} Eintr&auml;ge
          </span>
        </div>
      </div>

      {/* Aufgeklappter Inhalt */}
      {expanded && (
        <div className="border-t border-gray-200 bg-gray-50/30">
          {/* Jahr-Filter */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-white/60">
            <Filter size={14} className="text-gray-400" />
            <span className="text-sm text-gray-600 font-medium">Jahr:</span>
            <div className="flex gap-1">
              {years.map((y) => (
                <button
                  key={y}
                  onClick={(e) => { e.stopPropagation(); setSelectedYear(y); }}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    selectedYear === y
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {y}
                </button>
              ))}
            </div>
          </div>

          {/* Projekte */}
          {companyProjects.length === 0 ? (
            <div className="px-4 py-6 text-sm text-gray-400 text-center italic">
              Keine Projekte vorhanden.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {companyProjects.map((project) => {
                const yearEntries = companyTimesheets.filter((t) => {
                  const d = new Date(t.work_date);
                  return t.project_id === project.id && d.getFullYear() === selectedYear;
                }).length;

                return (
                  <div key={project.id} className="px-4 py-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <FolderKanban size={15} className="text-blue-500" />
                        <span className="font-medium text-gray-700 text-sm">{project.name}</span>
                        {project.short_name && (
                          <span className="text-xs text-gray-400">({project.short_name})</span>
                        )}
                        {project.funding_format && (
                          <span className="ml-1 px-2 py-0.5 bg-blue-50 text-blue-600 text-xs rounded border border-blue-100">
                            {project.funding_format}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-400">
                        {yearEntries} Tageseintr&auml;ge in {selectedYear}
                      </span>
                    </div>
                    <ProjectMatrix
                      project={project}
                      employees={companyEmployees}
                      aggregated={aggregated}
                      year={selectedYear}
                      companyId={company.id}
                      onNavigate={onNavigate}
                    />
                  </div>
                );
              })}
            </div>
          )}

          {/* Legende */}
          <div className="flex items-center gap-4 px-4 py-2 bg-white/40 border-t border-gray-100 text-xs text-gray-500">
            <span className="font-medium">Legende:</span>
            {[
              { color: 'bg-green-100 border-green-200', label: 'Stunden erfasst' },
              { color: 'bg-red-100 border-red-200',     label: '0h erfasst' },
              { color: 'bg-white border-gray-200',      label: 'Kein Eintrag' },
              { color: 'bg-gray-50 border-gray-100',    label: 'Zuk\u00fcnftig' },
            ].map((item, i) => (
              <span key={i} className="flex items-center gap-1">
                <span className={`inline-block w-3 h-3 rounded border ${item.color}`} />
                {item.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// HAUPTSEITE
// ============================================================================

export default function TimesheetViewerPage() {
  const router  = useRouter();
  const supabase = createClient();

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [companies,   setCompanies]   = useState<ClientCompany[]>([]);
  const [projects,    setProjects]    = useState<Project[]>([]);
  const [employees,   setEmployees]   = useState<Employee[]>([]);
  const [timesheets,  setTimesheets]  = useState<TimesheetRow[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [refreshing,  setRefreshing]  = useState(false);

  // ── Daten laden ────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    try {
      setError(null);

      // Auth
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

      // Projekte
      const { data: proj, error: prErr } = await supabase
        .from('v7_projects')
        .select('id, name, short_name, funding_format, client_company_id')
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

      // Timesheets - echtes Schema: work_date, hours, day_type
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

  // ── Navigation zur Zeiterfassung ──────────────────────────────────────

  const handleNavigate = (
    companyId: string, employeeId: string, year: number, month: number
  ) => {
    router.push(
      `/v7/berater/foerderung/firma/${companyId}/zeiterfassung` +
      `?employeeId=${employeeId}&year=${year}&month=${month}`
    );
  };

  // ── Gesamtstatistik ───────────────────────────────────────────────────

  const totalHours = timesheets.reduce((s, t) => s + (Number(t.hours) || 0), 0);

  // ── Render ────────────────────────────────────────────────────────────

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
            { label: 'Kunden',          value: companies.length,     color: 'text-blue-600',   bg: 'bg-blue-50'   },
            { label: 'Projekte',        value: projects.length,      color: 'text-purple-600', bg: 'bg-purple-50' },
            { label: 'Tageseintr\u00e4ge', value: timesheets.length, color: 'text-green-600',  bg: 'bg-green-50'  },
            { label: 'Stunden gesamt',  value: `${totalHours.toFixed(0)}h`, color: 'text-orange-600', bg: 'bg-orange-50' },
          ].map((stat, i) => (
            <div key={i} className={`${stat.bg} rounded-lg p-4 border border-white shadow-sm`}>
              <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Tab-Leiste */}
        <div className="flex items-center gap-1 mb-4">
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

        {/* Firmen-Liste */}
        <div className="bg-white rounded-b-lg rounded-tr-lg border border-gray-200 shadow-sm">
          {companies.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <Building2 size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Keine Kunden gefunden.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {companies.map((company) => (
                <CompanyAccordionRow
                  key={company.id}
                  company={company}
                  projects={projects}
                  employees={employees}
                  timesheets={timesheets}
                  onNavigate={handleNavigate}
                />
              ))}
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
