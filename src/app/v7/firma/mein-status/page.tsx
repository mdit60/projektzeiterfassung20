// src/app/v7/firma/mein-status/page.tsx
// ============================================================================
// PZE V7 - Mein Status (Firmen-Portal)
// ============================================================================
// Version: 7.3.95-5
//
// v7.3.95-5: FAQ Zeiterfassung als zweiter PDF-Download-Link
// v7.3.95-4: FIX: Timesheet-Query mit is_active=true Filter
// Datum: 18. Februar 2026
//
// v7.3.95-3: Ampel-Logik korrigiert:
//   - Gruen:  Alle Arbeitstage haben Eintraege (statt 80%-Regel)
//   - Orange: In Bearbeitung (statt "Teilweise erfasst")
//   - Rot:    Nicht erfasst (keine Eintraege)
//   - Grau:   Zukuenftig
//   Rollenbasierter Download-Link fuer Benutzerhandbuch (PDF)
//
// v7.3.91: Initiale Version mit Ampel, Monats-Zeitleiste, Kennzahlen
//
// Architektur:
//   - Auth + Rollen-Erkennung wie zeiterfassung-page
//   - Shared PortalHeader + PortalNav
//   - Supabase: v7_timesheets (work_date, hours, day_type)
//   - Feiertags-Berechnung fuer Soll-Arbeitstage
// ============================================================================

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import PortalHeader from '@/components/shared/PortalHeader';
import PortalNav from '@/components/shared/PortalNav';
import {
  BarChart3,
  FolderKanban,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  Calendar,
  ChevronRight,
  AlertCircle,
  TrendingUp,
  Download,
} from 'lucide-react';

// ============================================================================
// TYPEN
// ============================================================================

type PortalRole = 'client_admin' | 'project_leader' | 'employee';

interface UserProfile {
  id: string;
  email: string;
  display_name: string | null;
  role: string;
  client_company_id: string | null;
}

interface ClientCompany {
  id: string;
  name: string;
  federal_state: string | null;
}

interface Project {
  id: string;
  name: string;
  short_name: string | null;
  funding_format: string | null;
  funding_reference: string | null;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
}

interface TimesheetEntry {
  id: string;
  project_id: string;
  employee_id: string;
  work_date: string;
  hours: number;
  day_type: string | null;
}

interface ProjectAssignment {
  id: string;
  project_id: string;
  employee_id: string;
}

type MonthStatus = 'complete' | 'partial' | 'missing' | 'future' | 'outside';

interface MonthData {
  year: number;
  month: number;
  status: MonthStatus;
  hoursRecorded: number;
  workingDays: number;
  daysRecorded: number;
}

interface ProjectStatus {
  project: Project;
  months: MonthData[];
  totalMonths: number;
  completeMonths: number;
  partialMonths: number;
  missingMonths: number;
}

// ============================================================================
// HILFSFUNKTIONEN: FEIERTAGE
// ============================================================================

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
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month, day);
};

const getGermanHolidays = (year: number, stateCode: string): Map<string, string> => {
  const holidays = new Map<string, string>();
  const easter = getEasterSunday(year);

  const formatDate = (d: Date): string => {
    const y = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const dy = String(d.getDate()).padStart(2, '0');
    return `${y}-${mo}-${dy}`;
  };

  const addDays = (d: Date, days: number): Date => {
    const r = new Date(d);
    r.setDate(d.getDate() + days);
    return r;
  };

  // Bundesweite Feiertage
  holidays.set(`${year}-01-01`, 'Neujahr');
  holidays.set(formatDate(addDays(easter, -2)), 'Karfreitag');
  holidays.set(formatDate(addDays(easter, 1)), 'Ostermontag');
  holidays.set(`${year}-05-01`, 'Tag der Arbeit');
  holidays.set(formatDate(addDays(easter, 39)), 'Chr. Himmelfahrt');
  holidays.set(formatDate(addDays(easter, 50)), 'Pfingstmontag');
  holidays.set(`${year}-10-03`, 'Tag d. Dt. Einheit');
  holidays.set(`${year}-12-25`, '1. Weihnachtstag');
  holidays.set(`${year}-12-26`, '2. Weihnachtstag');

  // Laenderspezifische Feiertage
  if (['DE-BW', 'DE-BY', 'DE-ST'].includes(stateCode || '')) {
    holidays.set(`${year}-01-06`, 'Hl. Drei Koenige');
  }
  if (['DE-BW', 'DE-BY', 'DE-HE', 'DE-NW', 'DE-RP', 'DE-SL'].includes(stateCode || '')) {
    holidays.set(formatDate(addDays(easter, 60)), 'Fronleichnam');
  }
  if (['DE-BB', 'DE-HB', 'DE-HH', 'DE-MV', 'DE-NI', 'DE-SN', 'DE-ST', 'DE-SH', 'DE-TH'].includes(stateCode || '')) {
    holidays.set(`${year}-10-31`, 'Reformationstag');
  }
  if (['DE-BW', 'DE-BY', 'DE-NW', 'DE-RP', 'DE-SL'].includes(stateCode || '')) {
    holidays.set(`${year}-11-01`, 'Allerheiligen');
  }
  if (['DE-SN'].includes(stateCode || '')) {
    holidays.set(formatDate(addDays(easter, -1)), 'Buss- und Bettag');
  }

  return holidays;
};

const getWorkingDaysInMonth = (year: number, month: number, holidays: Map<string, string>): number => {
  const daysInMonth = new Date(year, month, 0).getDate();
  let workingDays = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    const dayOfWeek = date.getDay();
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    if (dayOfWeek === 0 || dayOfWeek === 6) continue;
    if (holidays.has(dateStr)) continue;

    workingDays++;
  }

  return workingDays;
};

// ============================================================================
// WEITERE HILFSFUNKTIONEN
// ============================================================================

const getMonthName = (month: number): string => {
  const months = [
    'Jan', 'Feb', 'Mrz', 'Apr', 'Mai', 'Jun',
    'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez',
  ];
  return months[month - 1] || '';
};

const getMonthNameFull = (month: number): string => {
  const months = [
    'Januar', 'Februar', 'Maerz', 'April', 'Mai', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
  ];
  return months[month - 1] || '';
};

const getFundingBadge = (format: string | null): { label: string; color: string } => {
  switch (format) {
    case 'ZIM_EINZEL':
      return { label: 'ZIM Einzel', color: 'bg-blue-100 text-blue-700' };
    case 'ZIM_KOOP':
      return { label: 'ZIM Kooperation', color: 'bg-blue-100 text-blue-700' };
    case 'ZIM_NETZWERK':
      return { label: 'ZIM Netzwerk', color: 'bg-purple-100 text-purple-700' };
    case 'ZIM_DURCHFUEHRBARKEIT':
      return { label: 'ZIM Durchf.studie', color: 'bg-indigo-100 text-indigo-700' };
    case 'BMBF_KMU':
      return { label: 'BMBF/KMU-innovativ', color: 'bg-teal-100 text-teal-700' };
    default:
      return { label: format || 'Sonstiges', color: 'bg-gray-100 text-gray-700' };
  }
};

const formatDateDE = (dateStr: string | null): string => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
};

// ============================================================================
// KOMPONENTE
// ============================================================================

export default function MeinStatusPage() {
  const router = useRouter();
  const supabase = createClient();

  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [company, setCompany] = useState<ClientCompany | null>(null);
  const [portalRole, setPortalRole] = useState<PortalRole>('employee');
  const [currentEmployeeId, setCurrentEmployeeId] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [assignments, setAssignments] = useState<ProjectAssignment[]>([]);
  const [timesheets, setTimesheets] = useState<TimesheetEntry[]>([]);

  // ============================================================================
  // DATEN LADEN
  // ============================================================================

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        // 1. Auth
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/v7/login');
          return;
        }

        // 2. User-Profil
        const { data: profile, error: profileError } = await supabase
          .from('v7_user_profiles')
          .select('id, email, display_name, role, client_company_id')
          .eq('email', user.email)
          .maybeSingle();

        if (profileError || !profile) {
          setError('Kein Benutzerprofil gefunden');
          return;
        }

        if (!profile.client_company_id) {
          setError('Keine Firma zugeordnet. Bitte melden Sie sich mit einem Firmen-Account an.');
          return;
        }

        setUserProfile(profile);
        const companyId = profile.client_company_id;

        // 3. Company
        const { data: companyData, error: companyError } = await supabase
          .from('v7_client_companies')
          .select('id, name, federal_state')
          .eq('id', companyId)
          .single();

        if (companyError || !companyData) {
          setError('Firma nicht gefunden');
          return;
        }
        setCompany(companyData);

        // 4. Ermittle Portal-Rolle
        const { data: employeeRecord } = await supabase
          .from('v7_employees')
          .select('id, user_id, portal_role')
          .eq('client_company_id', companyId)
          .eq('user_id', user.id)
          .maybeSingle();

        let userPortalRole: PortalRole = 'employee';
        let userEmployeeId: string | null = null;

        if (profile.role === 'client_admin') {
          userPortalRole = 'client_admin';
          // Admin hat auch einen Employee-Record
          if (employeeRecord) {
            userEmployeeId = employeeRecord.id;
          }
        } else if (employeeRecord) {
          userPortalRole = (employeeRecord.portal_role as PortalRole) || 'employee';
          userEmployeeId = employeeRecord.id;
        }

        setPortalRole(userPortalRole);
        setCurrentEmployeeId(userEmployeeId);

        // 5. Projekte laden (alle aktiven der Firma)
        const { data: projectsData } = await supabase
          .from('v7_projects')
          .select('id, name, short_name, funding_format, funding_reference, start_date, end_date, is_active')
          .eq('client_company_id', companyId)
          .eq('is_active', true);

        setProjects(projectsData || []);

        // 6. Projekt-Zuordnungen des Users
        const projectIds = (projectsData || []).map((p) => p.id);
        if (projectIds.length > 0 && userEmployeeId) {
          const { data: assignmentData } = await supabase
            .from('v7_project_assignments')
            .select('id, project_id, employee_id')
            .in('project_id', projectIds)
            .eq('employee_id', userEmployeeId)
            .eq('is_active', true);

          setAssignments(assignmentData || []);

          // 7. Zeiterfassungen des Users
          const { data: timesheetData } = await supabase
            .from('v7_timesheets')
            .select('id, project_id, employee_id, work_date, hours, day_type')
            .eq('employee_id', userEmployeeId)
            .eq('is_active', true)
            .in('project_id', projectIds);

          setTimesheets(timesheetData || []);
        } else if (userPortalRole === 'client_admin' && !userEmployeeId) {
          // Admin ohne Employee-Record: keine eigenen Zeiterfassungen
          setAssignments([]);
          setTimesheets([]);
        }

      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unbekannter Fehler';
        console.error('Fehler beim Laden:', message);
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [router, supabase]);

  // ============================================================================
  // PROJEKT-STATUS BERECHNEN
  // ============================================================================

  const projectStatuses: ProjectStatus[] = useMemo(() => {
    if (!company || projects.length === 0) return [];

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    // Nur Projekte, denen der User zugeordnet ist
    const assignedProjectIds = new Set(
      (assignments || []).map((a) => a.project_id)
    );

    // Falls Admin ohne Employee-Record: alle Projekte zeigen
    const relevantProjects = currentEmployeeId
      ? (projects || []).filter((p) => assignedProjectIds.has(p.id))
      : [];

    return relevantProjects.map((project) => {
      // Projektzeitraum bestimmen
      const startDate = project.start_date ? new Date(project.start_date) : null;
      const endDate = project.end_date ? new Date(project.end_date) : null;

      const startYear = startDate ? startDate.getFullYear() : currentYear;
      const startMonth = startDate ? startDate.getMonth() + 1 : 1;
      const endYear = endDate ? endDate.getFullYear() : currentYear;
      const endMonth = endDate ? endDate.getMonth() + 1 : 12;

      // Alle Monate im Projektzeitraum
      const months: MonthData[] = [];
      let completeCount = 0;
      let partialCount = 0;
      let missingCount = 0;

      for (let y = startYear; y <= endYear; y++) {
        const mStart = y === startYear ? startMonth : 1;
        const mEnd = y === endYear ? endMonth : 12;

        for (let m = mStart; m <= mEnd; m++) {
          // Liegt der Monat in der Zukunft?
          const isFuture = y > currentYear || (y === currentYear && m > currentMonth);

          // Feiertage fuer dieses Jahr
          const holidays = getGermanHolidays(y, company.federal_state || '');
          const workingDays = getWorkingDaysInMonth(y, m, holidays);

          // Zeiterfassungen fuer diesen Monat/Projekt
          const monthTimesheets = (timesheets || []).filter((t) => {
            if (t.project_id !== project.id) return false;
            const d = new Date(t.work_date);
            return d.getFullYear() === y && d.getMonth() + 1 === m;
          });

          const hoursRecorded = monthTimesheets.reduce((sum, t) => sum + (t.hours || 0), 0);
          const daysRecorded = new Set(
            monthTimesheets
              .filter((t) => (t.hours || 0) > 0)
              .map((t) => t.work_date)
          ).size;

          let status: MonthStatus = 'missing';
          if (isFuture) {
            status = 'future';
          } else if (hoursRecorded > 0 && daysRecorded >= workingDays) {
            // Alle Arbeitstage haben Eintraege = vollstaendig
            status = 'complete';
            completeCount++;
          } else if (hoursRecorded > 0) {
            status = 'partial';
            partialCount++;
          } else {
            status = 'missing';
            missingCount++;
          }

          months.push({
            year: y,
            month: m,
            status,
            hoursRecorded,
            workingDays,
            daysRecorded,
          });
        }
      }

      const pastMonths = months.filter((m) => m.status !== 'future').length;

      return {
        project,
        months,
        totalMonths: pastMonths,
        completeMonths: completeCount,
        partialMonths: partialCount,
        missingMonths: missingCount,
      };
    });
  }, [projects, assignments, timesheets, company, currentEmployeeId]);

  // ============================================================================
  // GESAMT-STATISTIK
  // ============================================================================

  const totalStats = useMemo(() => {
    let total = 0;
    let complete = 0;
    let partial = 0;
    let missing = 0;

    (projectStatuses || []).forEach((ps) => {
      total += ps.totalMonths;
      complete += ps.completeMonths;
      partial += ps.partialMonths;
      missing += ps.missingMonths;
    });

    return { total, complete, partial, missing };
  }, [projectStatuses]);

  // ============================================================================
  // NAVIGATION ZUR ZEITERFASSUNG
  // ============================================================================

  const navigateToTimesheet = (year: number, month: number) => {
    const params = new URLSearchParams();
    if (currentEmployeeId) {
      params.set('employee', currentEmployeeId);
    }
    params.set('year', String(year));
    params.set('month', String(month));
    params.set('returnUrl', '/v7/firma/mein-status');
    router.push(`/v7/firma/zeiterfassung?${params.toString()}`);
  };

  // ============================================================================
  // RENDER: LOADING
  // ============================================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PortalHeader
          portal="firma"
          companyName=""
          userName=""
          userRole="client_admin"
        />
        <PortalNav portal="firma" userRole="client_admin" portalRole="client_admin" />
        <main className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="w-10 h-10 border-4 border-green-200 border-t-green-600 rounded-full animate-spin" />
          </div>
        </main>
      </div>
    );
  }

  // ============================================================================
  // RENDER: ERROR
  // ============================================================================

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PortalHeader
          portal="firma"
          companyName=""
          userName=""
          userRole="client_admin"
        />
        <PortalNav portal="firma" userRole="client_admin" portalRole="client_admin" />
        <main className="max-w-7xl mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-700">{error}</p>
          </div>
        </main>
      </div>
    );
  }

  // ============================================================================
  // RENDER: HAUPTSEITE
  // ============================================================================

  const assignedProjectCount = (projectStatuses || []).length;
  const hasProjects = assignedProjectCount > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <PortalHeader
        portal="firma"
        companyName={company?.name || ''}
        userName={userProfile?.display_name || ''}
        userRole={portalRole}
      />
      <PortalNav
        portal="firma"
        userRole={portalRole === 'client_admin' ? 'client_admin' : 'client_user'}
        portalRole={portalRole}
      />

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* ================================================================ */}
        {/* KOPFBEREICH                                                      */}
        {/* ================================================================ */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Mein Status</h1>
          <p className="text-gray-600 mt-1">
            Uebersicht Ihrer Zeiterfassung nach Projekten und Monaten
          </p>
        </div>

        {/* ================================================================ */}
        {/* BENUTZERHANDBUCH DOWNLOAD                                        */}
        {/* ================================================================ */}
        {(() => {
          const manualMap: Record<string, { file: string; label: string }> = {
            client_admin: {
              file: '/manuals/PZE_Schnellstart_Firmen-Administrator.pdf',
              label: 'Schnellstart-Anleitung Firmen-Administrator',
            },
            project_leader: {
              file: '/manuals/PZE_Kurzanleitung_Projektleiter.pdf',
              label: 'Kurzanleitung Projektleiter',
            },
            employee: {
              file: '/manuals/PZE_Kurzanleitung_Mitarbeiter.pdf',
              label: 'Kurzanleitung Mitarbeiter',
            },
          };
          const manual = manualMap[portalRole] || manualMap.employee;
          return (
            <div className="mb-6 space-y-2 print:hidden">
              {/* Kurzanleitung */}
              <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-green-800">
                  <Download className="w-4 h-4 flex-shrink-0" />
                  <span>
                    <strong>{manual.label}</strong> als PDF herunterladen
                  </span>
                </div>
                <a
                  href={manual.file}
                  download
                  className="text-sm font-medium text-green-700 hover:text-green-900 underline"
                >
                  Download
                </a>
              </div>
              {/* FAQ Zeiterfassung */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-blue-800">
                  <Download className="w-4 h-4 flex-shrink-0" />
                  <span>
                    <strong>FAQ Zeiterfassung</strong> als PDF herunterladen
                  </span>
                </div>
                <a
                  href="/manuals/PZE-FAQ-Zeiterfassung-v1.pdf"
                  download
                  className="text-sm font-medium text-blue-700 hover:text-blue-900 underline"
                >
                  Download
                </a>
              </div>
            </div>
          );
        })()}

        {/* ================================================================ */}
        {/* ZUSAMMENFASSUNG                                                  */}
        {/* ================================================================ */}
        {hasProjects && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            {/* Projekte */}
            <div className="bg-white rounded-lg shadow p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Meine Projekte</p>
                  <p className="text-3xl font-bold text-green-600">{assignedProjectCount}</p>
                </div>
                <div className="w-11 h-11 bg-green-50 rounded-lg flex items-center justify-center">
                  <FolderKanban className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            {/* Vollstaendig */}
            <div className="bg-white rounded-lg shadow p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Vollstaendig</p>
                  <p className="text-3xl font-bold text-green-600">{totalStats.complete}</p>
                  <p className="text-xs text-gray-400 mt-1">von {totalStats.total} Monaten</p>
                </div>
                <div className="w-11 h-11 bg-green-50 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            {/* Teilweise */}
            <div className="bg-white rounded-lg shadow p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">In Bearbeitung</p>
                  <p className="text-3xl font-bold text-orange-500">{totalStats.partial}</p>
                  <p className="text-xs text-gray-400 mt-1">Monate nacharbeiten</p>
                </div>
                <div className="w-11 h-11 bg-orange-50 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-orange-500" />
                </div>
              </div>
            </div>

            {/* Fehlend */}
            <div className="bg-white rounded-lg shadow p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Nicht erfasst</p>
                  <p className="text-3xl font-bold text-red-500">{totalStats.missing}</p>
                  <p className="text-xs text-gray-400 mt-1">Monate offen</p>
                </div>
                <div className="w-11 h-11 bg-red-50 rounded-lg flex items-center justify-center">
                  <XCircle className="w-6 h-6 text-red-500" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* PROJEKT-KARTEN                                                   */}
        {/* ================================================================ */}
        {!hasProjects ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <FolderKanban className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-600 mb-2">Keine Projekte zugeordnet</h2>
            <p className="text-gray-500">
              Sie sind aktuell keinem Projekt zugeordnet. Bitte wenden Sie sich an Ihren Projektleiter.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {(projectStatuses || []).map((ps) => {
              const badge = getFundingBadge(ps.project.funding_format);
              const pastMonths = ps.totalMonths;
              const progressPercent = pastMonths > 0
                ? Math.round((ps.completeMonths / pastMonths) * 100)
                : 0;

              return (
                <div key={ps.project.id} className="bg-white rounded-lg shadow">
                  {/* Projekt-Header */}
                  <div className="px-6 py-4 border-b border-gray-100">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h2 className="text-lg font-semibold text-gray-900">
                            {ps.project.short_name || ps.project.name}
                          </h2>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge.color}`}>
                            {badge.label}
                          </span>
                        </div>
                        {ps.project.short_name && ps.project.short_name !== ps.project.name && (
                          <p className="text-sm text-gray-500">{ps.project.name}</p>
                        )}
                        <p className="text-sm text-gray-400 mt-1">
                          <Calendar className="w-3.5 h-3.5 inline mr-1" />
                          {formatDateDE(ps.project.start_date)} - {formatDateDE(ps.project.end_date)}
                          {ps.project.funding_reference && (
                            <span className="ml-3 text-gray-400">
                              FKZ: {ps.project.funding_reference}
                            </span>
                          )}
                        </p>
                      </div>

                      {/* Fortschritt */}
                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-gray-400" />
                          <span className="text-sm font-medium text-gray-700">
                            {ps.completeMonths} / {pastMonths} Monate
                          </span>
                        </div>
                        <div className="w-32 bg-gray-200 rounded-full h-2 mt-2">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              progressPercent >= 80
                                ? 'bg-green-500'
                                : progressPercent >= 50
                                ? 'bg-orange-400'
                                : 'bg-red-400'
                            }`}
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Monats-Zeitleiste */}
                  <div className="px-6 py-4">
                    <p className="text-xs text-gray-500 mb-3 font-medium uppercase tracking-wide">
                      Zeiterfassung nach Monaten
                    </p>

                    {/* Gruppiert nach Jahr */}
                    {(() => {
                      const years = [...new Set((ps.months || []).map((m) => m.year))];
                      return years.map((year) => {
                        const yearMonths = (ps.months || []).filter((m) => m.year === year);
                        return (
                          <div key={year} className="mb-3 last:mb-0">
                            <p className="text-xs text-gray-400 mb-1.5">{year}</p>
                            <div className="flex flex-wrap gap-1.5">
                              {yearMonths.map((md) => {
                                const isClickable = md.status !== 'future' && md.status !== 'outside';

                                let bgColor = 'bg-gray-100 text-gray-400';
                                let title = '';
                                let borderStyle = '';

                                switch (md.status) {
                                  case 'complete':
                                    bgColor = 'bg-green-100 text-green-700 hover:bg-green-200';
                                    title = `${getMonthNameFull(md.month)} ${md.year}: Vollstaendig (${md.hoursRecorded.toFixed(1)}h an ${md.daysRecorded} Tagen)`;
                                    borderStyle = 'border border-green-300';
                                    break;
                                  case 'partial':
                                    bgColor = 'bg-orange-100 text-orange-700 hover:bg-orange-200';
                                    title = `${getMonthNameFull(md.month)} ${md.year}: In Bearbeitung (${md.hoursRecorded.toFixed(1)}h an ${md.daysRecorded} von ${md.workingDays} Tagen)`;
                                    borderStyle = 'border border-orange-300';
                                    break;
                                  case 'missing':
                                    bgColor = 'bg-red-100 text-red-700 hover:bg-red-200';
                                    title = `${getMonthNameFull(md.month)} ${md.year}: Nicht erfasst (${md.workingDays} Arbeitstage)`;
                                    borderStyle = 'border border-red-300';
                                    break;
                                  case 'future':
                                    bgColor = 'bg-gray-50 text-gray-400';
                                    title = `${getMonthNameFull(md.month)} ${md.year}: Zukuenftig`;
                                    borderStyle = 'border border-gray-200';
                                    break;
                                  default:
                                    break;
                                }

                                return (
                                  <button
                                    key={`${md.year}-${md.month}`}
                                    onClick={() => isClickable && navigateToTimesheet(md.year, md.month)}
                                    disabled={!isClickable}
                                    title={title}
                                    className={`
                                      w-12 h-10 rounded-md text-xs font-medium
                                      flex flex-col items-center justify-center
                                      transition-colors
                                      ${bgColor} ${borderStyle}
                                      ${isClickable ? 'cursor-pointer' : 'cursor-default opacity-60'}
                                    `}
                                  >
                                    <span className="leading-none">{getMonthName(md.month)}</span>
                                    {md.status === 'complete' && (
                                      <CheckCircle className="w-3 h-3 mt-0.5" />
                                    )}
                                    {md.status === 'partial' && (
                                      <AlertTriangle className="w-3 h-3 mt-0.5" />
                                    )}
                                    {md.status === 'missing' && (
                                      <XCircle className="w-3 h-3 mt-0.5" />
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>

                  {/* Detail-Zeile unten */}
                  {ps.missingMonths > 0 && (
                    <div className="px-6 py-3 bg-red-50 border-t border-red-100 rounded-b-lg">
                      <div className="flex items-center gap-2 text-sm text-red-700">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                        <span>
                          {ps.missingMonths === 1
                            ? '1 Monat ohne Zeiterfassung'
                            : `${ps.missingMonths} Monate ohne Zeiterfassung`}
                          {ps.partialMonths > 0 && (
                            <span className="text-orange-600">
                              {' '}| {ps.partialMonths} {ps.partialMonths === 1 ? 'Monat' : 'Monate'} in Bearbeitung
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  )}
                  {ps.missingMonths === 0 && ps.partialMonths > 0 && (
                    <div className="px-6 py-3 bg-orange-50 border-t border-orange-100 rounded-b-lg">
                      <div className="flex items-center gap-2 text-sm text-orange-700">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                        <span>
                          {ps.partialMonths === 1
                            ? '1 Monat in Bearbeitung'
                            : `${ps.partialMonths} Monate in Bearbeitung`}
                        </span>
                      </div>
                    </div>
                  )}
                  {ps.missingMonths === 0 && ps.partialMonths === 0 && ps.totalMonths > 0 && (
                    <div className="px-6 py-3 bg-green-50 border-t border-green-100 rounded-b-lg">
                      <div className="flex items-center gap-2 text-sm text-green-700">
                        <CheckCircle className="w-4 h-4 flex-shrink-0" />
                        <span>Alle Monate vollstaendig erfasst</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ================================================================ */}
        {/* LEGENDE                                                          */}
        {/* ================================================================ */}
        {hasProjects && (
          <div className="mt-8 bg-white rounded-lg shadow p-5">
            <p className="text-sm font-medium text-gray-700 mb-3">Legende</p>
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded bg-green-100 border border-green-300 flex items-center justify-center">
                  <CheckCircle className="w-3 h-3 text-green-700" />
                </div>
                <span className="text-gray-600">Vollstaendig erfasst</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded bg-orange-100 border border-orange-300 flex items-center justify-center">
                  <AlertTriangle className="w-3 h-3 text-orange-700" />
                </div>
                <span className="text-gray-600">In Bearbeitung</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded bg-red-100 border border-red-300 flex items-center justify-center">
                  <XCircle className="w-3 h-3 text-red-700" />
                </div>
                <span className="text-gray-600">Nicht erfasst</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded bg-gray-50 border border-gray-200" />
                <span className="text-gray-600">Zukuenftig</span>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-3">
              Klicken Sie auf einen Monat, um direkt zur Zeiterfassung zu gelangen.
              Ein Monat gilt als vollstaendig, wenn alle Arbeitstage Eintraege haben.
            </p>
          </div>
        )}

        {/* ================================================================ */}
        {/* FOOTER-SPACER                                                    */}
        {/* ================================================================ */}
        <div className="h-8" />
      </main>
    </div>
  );
}
