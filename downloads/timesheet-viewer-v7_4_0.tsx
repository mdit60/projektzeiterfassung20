// src/app/v7/berater/timesheets/page.tsx
// ============================================================================
// PZE V7.4 - Timesheet-Viewer Berater-Portal
// ============================================================================
// Version: 7.4.0
// Datum: 23. Februar 2026
//
// Neue Seite fuer firmenuebergreifende Stundenuebersicht im Berater-Portal.
//
// Struktur:
//   Ebene 1: Firmentabelle (alle Kunden mit Projekt/Jahr-Zusammenfassung)
//   Ebene 2: Aufklappbare Projekt-Monatsmatrix pro Firma
//            Mitarbeiter x Monate (Jan-Dez) mit Ampelfarben
//            Direktlink zur Zeiterfassung des jeweiligen MA/Monat
//
// FZul-Erweiterung: Toggle-Tab vorbereitet, noch nicht aktiv.
// ============================================================================

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import PortalHeader from '@/components/shared/PortalHeader';
import PortalNav from '@/components/shared/PortalNav';
import {
  ChevronDown,
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

const CURRENT_YEAR = new Date().getFullYear();
const CURRENT_MONTH = new Date().getMonth() + 1; // 1-basiert

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
  is_active: boolean;
}

interface Project {
  id: string;
  name: string;
  short_name: string | null;
  funding_format: string | null;
  start_date: string | null;
  end_date: string | null;
  client_company_id: string;
}

interface Employee {
  id: string;
  display_name: string;
  first_name: string | null;
  last_name: string | null;
  client_company_id: string;
}

interface TimesheetEntry {
  id: string;
  project_id: string;
  employee_id: string;
  year: number;
  month: number;
  total_hours: number | null;
  total_fue_hours: number | null;
  is_locked: boolean;
}

// Aufbereitete Daten fuer die Matrix
interface CellData {
  timesheetId: string | null;
  totalHours: number;
  fuehours: number;
  status: 'complete' | 'partial' | 'empty' | 'future' | 'none';
}

interface ProjectMatrixRow {
  employee: Employee;
  cells: Record<number, CellData>; // month -> CellData
}

interface CompanyData {
  company: ClientCompany;
  projects: Project[];
  years: number[];
  totalEntries: number;
}

// ============================================================================
// HILFSFUNKTIONEN
// ============================================================================

function getCellStatus(
  cell: CellData | undefined,
  year: number,
  month: number
): 'complete' | 'partial' | 'empty_entry' | 'future' | 'none' {
  const isFuture =
    year > CURRENT_YEAR ||
    (year === CURRENT_YEAR && month > CURRENT_MONTH);

  if (isFuture) return 'future';
  if (!cell || cell.status === 'none') return 'none';
  if (cell.totalHours > 0) return 'complete';
  if (cell.status === 'empty' || cell.totalHours === 0) return 'empty_entry';
  return 'partial';
}

function getCellStyle(status: string): string {
  switch (status) {
    case 'complete':
      return 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200 cursor-pointer';
    case 'partial':
      return 'bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200 cursor-pointer';
    case 'empty_entry':
      return 'bg-red-100 text-red-700 border-red-200 hover:bg-red-200 cursor-pointer';
    case 'future':
      return 'bg-gray-50 text-gray-300 border-gray-100';
    case 'none':
    default:
      return 'bg-white text-gray-300 border-gray-100 hover:bg-gray-50 cursor-pointer';
  }
}

function getCellLabel(cell: CellData | undefined, status: string): string {
  if (status === 'future') return '';
  if (!cell || status === 'none') return '–';
  if (cell.totalHours > 0) return `${cell.totalHours.toFixed(0)}h`;
  return '0h';
}

// ============================================================================
// TOOLTIP-KOMPONENTE
// ============================================================================

function CellTooltip({
  cell,
  employee,
  month,
  year,
}: {
  cell: CellData | undefined;
  employee: Employee;
  month: number;
  year: number;
}) {
  if (!cell || cell.status === 'none') {
    return (
      <div className="text-xs">
        <div className="font-medium text-gray-700">{employee.display_name}</div>
        <div className="text-gray-500">{MONTHS[month - 1]} {year}</div>
        <div className="mt-1 text-gray-400 italic">Kein Eintrag vorhanden</div>
        <div className="mt-1 text-blue-500">Klicken zum Anlegen</div>
      </div>
    );
  }
  return (
    <div className="text-xs">
      <div className="font-medium text-gray-700">{employee.display_name}</div>
      <div className="text-gray-500">{MONTHS[month - 1]} {year}</div>
      <div className="mt-1 space-y-0.5">
        <div>Gesamt: <span className="font-medium">{cell.totalHours.toFixed(1)}h</span></div>
        {cell.fuehours > 0 && (
          <div>FuE (T): <span className="font-medium text-green-700">{cell.fuehours.toFixed(1)}h</span></div>
        )}
      </div>
      <div className="mt-1 text-blue-500 flex items-center gap-1">
        <ExternalLink size={10} /> Zur Zeiterfassung
      </div>
    </div>
  );
}

// ============================================================================
// MATRIX-TABELLE PRO PROJEKT
// ============================================================================

function ProjectMatrix({
  project,
  rows,
  year,
  companyId,
  onNavigate,
}: {
  project: Project;
  rows: ProjectMatrixRow[];
  year: number;
  companyId: string;
  onNavigate: (companyId: string, employeeId: string, year: number, month: number) => void;
}) {
  const [hoveredCell, setHoveredCell] = useState<{
    employeeId: string;
    month: number;
    rect: DOMRect;
  } | null>(null);

  if (rows.length === 0) {
    return (
      <div className="text-sm text-gray-400 italic px-4 py-2">
        Keine Mitarbeiter im Projekt zugeordnet.
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
          {rows.map((row) => (
            <tr key={row.employee.id} className="hover:bg-gray-50/50">
              <td className="px-3 py-1.5 border border-gray-200 font-medium text-gray-700 whitespace-nowrap">
                {row.employee.display_name}
              </td>
              {MONTHS.map((_, idx) => {
                const month = idx + 1;
                const cell = row.cells[month];
                const status = getCellStatus(cell, year, month);
                const cellStyle = getCellStyle(status);
                const label = getCellLabel(cell, status);
                const isClickable = status !== 'future';

                return (
                  <td
                    key={month}
                    className={`border border-gray-200 text-center relative`}
                    onMouseEnter={(e) => {
                      if (isClickable) {
                        setHoveredCell({
                          employeeId: row.employee.id,
                          month,
                          rect: e.currentTarget.getBoundingClientRect(),
                        });
                      }
                    }}
                    onMouseLeave={() => setHoveredCell(null)}
                  >
                    <div
                      className={`mx-0.5 my-0.5 rounded px-1 py-1 text-center font-medium border transition-colors ${cellStyle}`}
                      onClick={() =>
                        isClickable && onNavigate(companyId, row.employee.id, year, month)
                      }
                    >
                      {label}
                    </div>

                    {/* Tooltip */}
                    {hoveredCell?.employeeId === row.employee.id &&
                      hoveredCell?.month === month && (
                        <div
                          className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-3 w-48 pointer-events-none"
                          style={{
                            top: hoveredCell.rect.bottom + 4 + window.scrollY,
                            left: Math.min(
                              hoveredCell.rect.left + window.scrollX,
                              window.innerWidth - 200
                            ),
                          }}
                        >
                          <CellTooltip
                            cell={cell}
                            employee={row.employee}
                            month={month}
                            year={year}
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
// FIRMEN-ACCORDION-ROW
// ============================================================================

function CompanyAccordionRow({
  companyData,
  timesheets,
  employees,
  onNavigate,
}: {
  companyData: CompanyData;
  timesheets: TimesheetEntry[];
  employees: Employee[];
  onNavigate: (companyId: string, employeeId: string, year: number, month: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);

  const { company, projects, years, totalEntries } = companyData;

  // Mitarbeiter dieser Firma
  const companyEmployees = employees.filter(
    (e) => e.client_company_id === company.id
  );

  // Matrix-Daten fuer ein Projekt berechnen
  function buildMatrix(project: Project): ProjectMatrixRow[] {
    // Mitarbeiter die diesem Projekt zugeordnet sind (haben Timesheets)
    const projectTimesheets = timesheets.filter(
      (t) =>
        t.project_id === project.id &&
        t.year === selectedYear
    );

    // Alle MA die mindestens einen Eintrag haben
    const maWithEntries = new Set(projectTimesheets.map((t) => t.employee_id));

    // Auch MA ohne Eintrag aus companyEmployees einbeziehen? 
    // Nein: nur MA die mindestens mal einen Eintrag hatten (sauberere Ansicht)
    const relevantEmployees = companyEmployees.filter((e) =>
      maWithEntries.has(e.id)
    );

    if (relevantEmployees.length === 0) return [];

    return relevantEmployees.map((emp) => {
      const cells: Record<number, CellData> = {};
      for (let m = 1; m <= 12; m++) {
        const ts = projectTimesheets.find(
          (t) => t.employee_id === emp.id && t.month === m
        );
        if (ts) {
          cells[m] = {
            timesheetId: ts.id,
            totalHours: ts.total_hours ?? 0,
            fuehours: ts.total_fue_hours ?? 0,
            status: (ts.total_hours ?? 0) > 0 ? 'complete' : 'empty',
          };
        }
        // Kein Eintrag -> kein Key (wird als 'none' behandelt)
      }
      return { employee: emp, cells };
    });
  }

  const availableYears =
    years.length > 0
      ? years
      : [CURRENT_YEAR];

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Firmen-Header-Zeile */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 cursor-pointer transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div
            className={`transition-transform duration-200 text-gray-400 ${
              expanded ? 'rotate-90' : ''
            }`}
          >
            <ChevronRight size={18} />
          </div>
          <Building2 size={18} className="text-blue-600" />
          <div>
            <span className="font-semibold text-gray-800">
              {company.name}
            </span>
            {company.short_name && (
              <span className="ml-2 text-xs text-gray-400">
                ({company.short_name})
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-6 text-sm text-gray-500">
          <span className="flex items-center gap-1">
            <FolderKanban size={14} />
            {projects.length} {projects.length === 1 ? 'Projekt' : 'Projekte'}
          </span>
          <span className="flex items-center gap-1">
            <Calendar size={14} />
            {availableYears.join(', ')}
          </span>
          <span className="flex items-center gap-1">
            <Clock size={14} />
            {totalEntries} Eintr&auml;ge
          </span>
        </div>
      </div>

      {/* Aufgeklappter Bereich */}
      {expanded && (
        <div className="border-t border-gray-200 bg-gray-50/30">
          {/* Jahr-Filter */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-white/60">
            <Filter size={14} className="text-gray-400" />
            <span className="text-sm text-gray-600 font-medium">Jahr:</span>
            <div className="flex gap-1">
              {availableYears.map((y) => (
                <button
                  key={y}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedYear(y);
                  }}
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
          {projects.length === 0 ? (
            <div className="px-4 py-6 text-sm text-gray-400 text-center italic">
              Keine Projekte gefunden.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {projects.map((project) => {
                const matrix = buildMatrix(project);
                const yearEntries = timesheets.filter(
                  (t) =>
                    t.project_id === project.id && t.year === selectedYear
                ).length;

                return (
                  <div key={project.id} className="px-4 py-3">
                    {/* Projekt-Titel */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <FolderKanban size={15} className="text-blue-500" />
                        <span className="font-medium text-gray-700 text-sm">
                          {project.name}
                        </span>
                        {project.short_name && (
                          <span className="text-xs text-gray-400">
                            ({project.short_name})
                          </span>
                        )}
                        {project.funding_format && (
                          <span className="ml-1 px-2 py-0.5 bg-blue-50 text-blue-600 text-xs rounded border border-blue-100">
                            {project.funding_format}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-400">
                        {yearEntries} Eintr&auml;ge in {selectedYear}
                      </span>
                    </div>

                    {/* Matrix */}
                    <ProjectMatrix
                      project={project}
                      rows={matrix}
                      year={selectedYear}
                      companyId={company.id}
                      onNavigate={onNavigate}
                    />

                    {matrix.length === 0 && (
                      <div className="text-xs text-gray-400 italic px-2 py-2">
                        Keine Zeiterfassungs-Eintr&auml;ge f&uuml;r {selectedYear} vorhanden.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Ampel-Legende */}
          <div className="flex items-center gap-4 px-4 py-2 bg-white/40 border-t border-gray-100 text-xs text-gray-500">
            <span className="font-medium">Legende:</span>
            {[
              { color: 'bg-green-100 border-green-200', label: 'Vollst&auml;ndig' },
              { color: 'bg-orange-100 border-orange-200', label: 'Teilweise' },
              { color: 'bg-red-100 border-red-200', label: '0h erfasst' },
              { color: 'bg-white border-gray-200', label: 'Kein Eintrag' },
              { color: 'bg-gray-50 border-gray-100', label: 'Zuk&uuml;nftig' },
            ].map((item, i) => (
              <span key={i} className="flex items-center gap-1">
                <span
                  className={`inline-block w-3 h-3 rounded border ${item.color}`}
                />
                <span dangerouslySetInnerHTML={{ __html: item.label }} />
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
  const router = useRouter();
  const supabase = createClient();

  // State
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [companies, setCompanies] = useState<ClientCompany[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [timesheets, setTimesheets] = useState<TimesheetEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // ── Daten laden ──────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    try {
      setError(null);

      // User-Profil
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('v7_user_profiles')
        .select('id, email, display_name, role, consultant_company_id')
        .eq('email', user.email!)
        .single();

      if (profileError || !profile) throw new Error('Profil nicht gefunden.');
      if (!['consultant', 'system_admin'].includes(profile.role)) {
        router.push('/v7/firma/dashboard');
        return;
      }

      setUserProfile(profile);

      // Firmen des Beraters
      let companiesQuery = supabase
        .from('v7_client_companies')
        .select('id, name, short_name, is_active')
        .eq('is_active', true)
        .order('name');

      if (profile.role === 'consultant' && profile.consultant_company_id) {
        companiesQuery = companiesQuery.eq(
          'consultant_company_id',
          profile.consultant_company_id
        );
      }

      const { data: companiesData, error: companiesError } =
        await companiesQuery;
      if (companiesError) throw companiesError;
      setCompanies(companiesData || []);

      if (!companiesData || companiesData.length === 0) {
        setLoading(false);
        return;
      }

      const companyIds = companiesData.map((c) => c.id);

      // Projekte
      const { data: projectsData, error: projectsError } = await supabase
        .from('v7_projects')
        .select(
          'id, name, short_name, funding_format, start_date, end_date, client_company_id'
        )
        .in('client_company_id', companyIds)
        .eq('is_active', true)
        .order('name');

      if (projectsError) throw projectsError;
      setProjects(projectsData || []);

      // Mitarbeiter
      const { data: employeesData, error: employeesError } = await supabase
        .from('v7_employees')
        .select('id, display_name, first_name, last_name, client_company_id')
        .in('client_company_id', companyIds)
        .eq('is_active', true)
        .order('display_name');

      if (employeesError) throw employeesError;
      setEmployees(employeesData || []);

      // Timesheets (nur Metadaten, kein daily_data)
      if (projectsData && projectsData.length > 0) {
        const projectIds = projectsData.map((p) => p.id);
        const { data: tsData, error: tsError } = await supabase
          .from('v7_timesheets')
          .select(
            'id, project_id, employee_id, year, month, total_hours, total_fue_hours, is_locked'
          )
          .in('project_id', projectIds)
          .order('year', { ascending: false })
          .order('month', { ascending: false });

        if (tsError) throw tsError;
        setTimesheets(tsData || []);
      }
    } catch (err) {
      console.error('Ladefehler TimesheetViewer:', err);
      setError(
        err instanceof Error ? err.message : 'Unbekannter Fehler beim Laden.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [supabase, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Navigation zur Zeiterfassung ─────────────────────────────────────────

  const handleNavigateToZE = (
    companyId: string,
    employeeId: string,
    year: number,
    month: number
  ) => {
    router.push(
      `/v7/berater/foerderung/firma/${companyId}/zeiterfassung` +
        `?employeeId=${employeeId}&year=${year}&month=${month}`
    );
  };

  // ── Zusammenfassung pro Firma aufbereiten ─────────────────────────────────

  function buildCompanyData(company: ClientCompany): CompanyData {
    const companyProjects = projects.filter(
      (p) => p.client_company_id === company.id
    );
    const projectIds = companyProjects.map((p) => p.id);
    const companyTimesheets = timesheets.filter((t) =>
      projectIds.includes(t.project_id)
    );
    const years = [
      ...new Set(companyTimesheets.map((t) => t.year)),
    ].sort((a, b) => b - a);
    if (!years.includes(CURRENT_YEAR)) years.unshift(CURRENT_YEAR);

    return {
      company,
      projects: companyProjects,
      years,
      totalEntries: companyTimesheets.length,
    };
  }

  // ── Gesamtstatistik ───────────────────────────────────────────────────────

  const totalStats = {
    companies: companies.length,
    projects: projects.length,
    entries: timesheets.length,
    hoursSum: timesheets.reduce((s, t) => s + (t.total_hours ?? 0), 0),
  };

  // ── Render ────────────────────────────────────────────────────────────────

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
      {/* Header */}
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

      {/* Navigation */}
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
            <h1 className="text-2xl font-bold text-gray-900">
              Zeiterfassungs-&Uuml;bersicht
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Alle Stundenerfassungen &uuml;ber alle Kunden, Projekte und Mitarbeiter
            </p>
          </div>
          <button
            onClick={() => {
              setRefreshing(true);
              loadData();
            }}
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
            { label: 'Kunden', value: totalStats.companies, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Projekte', value: totalStats.projects, color: 'text-purple-600', bg: 'bg-purple-50' },
            { label: 'Eintr\u00e4ge', value: totalStats.entries, color: 'text-green-600', bg: 'bg-green-50' },
            {
              label: 'Stunden gesamt',
              value: `${totalStats.hoursSum.toFixed(0)}h`,
              color: 'text-orange-600',
              bg: 'bg-orange-50',
            },
          ].map((stat, i) => (
            <div
              key={i}
              className={`${stat.bg} rounded-lg p-4 border border-white shadow-sm`}
            >
              <div className={`text-2xl font-bold ${stat.color}`}>
                {stat.value}
              </div>
              <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* FZul-Tab-Vorbereitung (noch nicht aktiv) */}
        <div className="flex items-center gap-1 mb-4">
          <button className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-t-lg">
            Zeiterfassung
          </button>
          <button
            className="px-4 py-2 bg-white text-gray-400 text-sm border border-gray-200 
                       rounded-t-lg cursor-not-allowed"
            title="FZul-Analyse – in Vorbereitung (v7.4+)"
            disabled
          >
            FZul-Analyse
            <span className="ml-2 text-xs bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded">
              bald
            </span>
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
                  companyData={buildCompanyData(company)}
                  timesheets={timesheets}
                  employees={employees}
                  onNavigate={handleNavigateToZE}
                />
              ))}
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
