// src/app/v7/berater/foerderung/firma/[id]/berichte/page.tsx
// ============================================================================
// PZE V7 - Berichte & Controlling (Berater-Portal - Firmenansicht)
// ============================================================================
// Version: 7.4.4-20
// Datum: 28. Maerz 2026
//
// v7.4.4-19: Projektfortschritt-Kachel aktiviert (war "Demnaechst")
//            - ProjektFortschrittPanel eingebunden (shared component)
//            - showFortschritt State ergaenzt
//            - WorkPackages-Query um start_date/end_date erweitert
//              (benoetigt fuer AP-genaue Soll-Verteilung im Panel)
// v7.4.4-18: Stundennachweis-Matrix Completion-Flag
// v7.4.4-15: Kachel "Zahlungsanforderung" umbenannt
// v7.4.4-5:  ZA-Logik in Shared Component ZAPanel ausgelagert
// v7.4.4-2:  Personalkosten Excel-Export + ZA-Modul
// v7.4.3-12: Stundennachweis-Matrix
// ============================================================================

'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import * as XLSX from 'xlsx';
import PortalHeader from '@/components/shared/PortalHeader';
import PortalNav from '@/components/shared/PortalNav';
import ZAPanel, { loadProjectAssignments } from '@/components/shared/ZAPanel';
import ProjektFortschrittPanel from '@/components/shared/ProjektFortschrittPanel';
import StundennachweisMatrix from '@/components/shared/StundennachweisMatrix';
import {
  BarChart3,
  FolderKanban,
  Users,
  Package,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  XCircle,
  FileSpreadsheet,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Grid3x3,
  Calendar,
} from 'lucide-react';

// ============================================================================
// KONSTANTEN
// ============================================================================

const HOURS_PER_PM = 173.33;

// ============================================================================
// TYPEN
// ============================================================================

interface UserProfile {
  id: string;
  email: string;
  display_name: string | null;
  role: string;
  client_company_id: string | null;
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

interface Company {
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
  foerdersatz: number | null;
  overhead_t: number | null;
  overhead_nt: number | null;
  overhead_gleich: boolean | null;
}

interface Employee {
  id: string;
  display_name: string;
  first_name: string | null;
  last_name: string | null;
}

interface WorkPackage {
  id: string;
  project_id: string;
  ap_number: number;
  ap_code: string | null;
  name: string;
  total_person_months: number | null;
  start_date: string | null;
  end_date: string | null;
  is_technical: boolean | null;
}

interface WorkPackageAssignment {
  id: string;
  work_package_id: string;
  employee_id: string;
  planned_person_months: number;
}

interface TimesheetEntry {
  id: string;
  project_id: string;
  employee_id: string;
  work_package_id: string | null;
  work_date: string;
  hours: number;
  day_type: string | null;
  is_active: boolean;
  is_billable: boolean;
}

interface ProjectAssignment {
  id: string;
  project_id: string;
  employee_id: string;
  employee_number: number | null;
  hourly_rate: number | null;
  annual_salary: number | null;
  weekly_hours: number | null;
  qualification: string | null;
}

interface ProjectStats {
  project: Project;
  plannedPM: number;
  actualPM: number;
  progressPercent: number;
  timeProgressPercent: number;
  status: 'on-track' | 'warning' | 'critical';
}

interface EmployeeTimesheetStatus {
  employee: Employee;
  projects: string[];
  sollHours: number;
  erfasstHours: number;
  offenHours: number;
  progressPercent: number;
  budgetStatus: 'on-track' | 'warning' | 'exceeded';
}

// ============================================================================
// HILFSFUNKTIONEN
// ============================================================================

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

const normalizeStateCode = (state: string | null | undefined): string => {
  if (!state) return '';
  if (state.startsWith('DE-')) return state;
  const map: Record<string, string> = {
    'Baden-Wuerttemberg': 'DE-BW',
    'Bayern': 'DE-BY', 'Bavaria': 'DE-BY',
    'Berlin': 'DE-BE', 'Brandenburg': 'DE-BB',
    'Bremen': 'DE-HB', 'Hamburg': 'DE-HH',
    'Hessen': 'DE-HE', 'Hesse': 'DE-HE',
    'Mecklenburg-Vorpommern': 'DE-MV',
    'Niedersachsen': 'DE-NI', 'Lower Saxony': 'DE-NI',
    'Nordrhein-Westfalen': 'DE-NW', 'North Rhine-Westphalia': 'DE-NW',
    'Rheinland-Pfalz': 'DE-RP', 'Rhineland-Palatinate': 'DE-RP',
    'Saarland': 'DE-SL', 'Sachsen': 'DE-SN', 'Saxony': 'DE-SN',
    'Sachsen-Anhalt': 'DE-ST', 'Schleswig-Holstein': 'DE-SH',
    'Thueringen': 'DE-TH', 'Thuringia': 'DE-TH',
  };
  return map[state] || state;
};

const getGermanHolidays = (year: number, stateCode: string): Map<string, string> => {
  const holidays = new Map<string, string>();
  const easter = getEasterSunday(year);
  const formatDate = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  const addDays = (d: Date, days: number): Date => {
    const r = new Date(d);
    r.setDate(d.getDate() + days);
    return r;
  };
  holidays.set(`${year}-01-01`, 'Neujahr');
  holidays.set(formatDate(addDays(easter, -2)), 'Karfreitag');
  holidays.set(formatDate(addDays(easter, 1)), 'Ostermontag');
  holidays.set(`${year}-05-01`, 'Tag der Arbeit');
  holidays.set(formatDate(addDays(easter, 39)), 'Chr. Himmelfahrt');
  holidays.set(formatDate(addDays(easter, 50)), 'Pfingstmontag');
  holidays.set(`${year}-10-03`, 'Tag d. Dt. Einheit');
  holidays.set(`${year}-12-25`, '1. Weihnachtstag');
  holidays.set(`${year}-12-26`, '2. Weihnachtstag');
  if (['DE-BW', 'DE-BY', 'DE-ST'].includes(stateCode || '')) {
    holidays.set(`${year}-01-06`, 'Hl. Drei Koenige');
  }
  if (['DE-BW', 'DE-BY', 'DE-HE', 'DE-NW', 'DE-RP', 'DE-SL'].includes(stateCode || '')) {
    holidays.set(formatDate(addDays(easter, 60)), 'Fronleichnam');
  }
  if (['DE-BY', 'DE-SL'].includes(stateCode || '')) {
    holidays.set(`${year}-08-15`, 'Mariae Himmelfahrt');
  }
  if (['DE-BB', 'DE-HB', 'DE-HH', 'DE-MV', 'DE-NI', 'DE-SN', 'DE-ST', 'DE-SH', 'DE-TH'].includes(stateCode || '')) {
    holidays.set(`${year}-10-31`, 'Reformationstag');
  }
  if (['DE-BW', 'DE-BY', 'DE-NW', 'DE-RP', 'DE-SL'].includes(stateCode || '')) {
    holidays.set(`${year}-11-01`, 'Allerheiligen');
  }
  return holidays;
};

const formatPM = (pm: number): string => pm.toFixed(1).replace('.', ',');

// ============================================================================
// HAUPTKOMPONENTE
// ============================================================================

function BeratePageContent() {
  const router = useRouter();
  const params = useParams();
  const companyId = params?.id as string;
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [workPackages, setWorkPackages] = useState<WorkPackage[]>([]);
  const [wpAssignments, setWpAssignments] = useState<WorkPackageAssignment[]>([]);
  const [timesheets, setTimesheets] = useState<TimesheetEntry[]>([]);
  const [completions, setCompletions] = useState<{employee_id: string; project_id: string; year: number; month: number}[]>([]);
  const [projectAssignments, setProjectAssignments] = useState<ProjectAssignment[]>([]);
  const [exportLoading, setExportLoading] = useState(false);

  // Personalkosten-Panel
  const [showPKPanel, setShowPKPanel] = useState(false);
  const [pkProjectId, setPKProjectId] = useState<string>('');
  const [pkVon, setPKVon] = useState('');
  const [pkBis, setPKBis] = useState('');

  const [selectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear] = useState(new Date().getFullYear());
  const [showMatrix, setShowMatrix] = useState(false);
  const [showZA, setShowZA] = useState(false);
  const [showFortschritt, setShowFortschritt] = useState(false);
  const [matrixProjectId, setMatrixProjectId] = useState<string | null>(null);

  const holidays = useMemo(() => {
    if (!company?.federal_state) return new Map<string, string>();
    return getGermanHolidays(selectedYear, normalizeStateCode(company.federal_state));
  }, [selectedYear, company?.federal_state]);

  // ============================================================================
  // DATEN LADEN
  // ============================================================================

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/v7/login'); return; }

        const { data: profile, error: profileError } = await supabase
          .from('v7_user_profiles')
          .select('id, email, display_name, role')
          .eq('email', user.email)
          .maybeSingle();
        if (profileError || !profile) { setError('Kein Benutzerprofil gefunden'); return; }
        setUserProfile(profile);

        const { data: companyData, error: companyError } = await supabase
          .from('v7_client_companies')
          .select('id, name, federal_state')
          .eq('id', companyId)
          .single();
        if (companyError || !companyData) { setError('Firma nicht gefunden'); return; }
        setCompany(companyData);

        const { data: projectsData } = await supabase
          .from('v7_projects')
          .select('id, name, short_name, funding_format, funding_reference, start_date, end_date, is_active, foerdersatz, overhead_t, overhead_nt, overhead_gleich')
          .eq('client_company_id', companyId)
          .eq('is_active', true);
        setProjects(projectsData || []);

        if (projectsData && projectsData.length > 0) {
          setPKProjectId(projectsData[0].id);
          setPKVon(projectsData[0].start_date?.slice(0, 10) || '');
          setPKBis(new Date().toISOString().slice(0, 10));
        }

        const { data: employeesData } = await supabase
          .from('v7_employees')
          .select('id, display_name, first_name, last_name')
          .eq('client_company_id', companyId)
          .eq('is_active', true);
        setEmployees(employeesData || []);

        const projectIds = (projectsData || []).map(p => p.id);

        if (projectIds.length > 0) {
          // start_date + end_date fuer AP-genaue Soll-Verteilung im ProjektFortschrittPanel
          const { data: wpData } = await supabase
            .from('v7_work_packages')
            .select('id, project_id, ap_number, ap_code, name, total_person_months, start_date, end_date, is_technical')
            .in('project_id', projectIds)
            .eq('is_active', true);
          setWorkPackages(wpData || []);

          if (wpData && wpData.length > 0) {
            const wpIds = wpData.map((wp: any) => wp.id);
            const { data: wpaData } = await supabase
              .from('v7_work_package_assignments')
              .select('id, work_package_id, employee_id, planned_person_months')
              .in('work_package_id', wpIds)
              .eq('is_active', true);
            setWpAssignments(wpaData || []);
          }

          const { data: timesheetData } = await supabase
            .from('v7_timesheets')
            .select('id, project_id, employee_id, work_package_id, work_date, hours, day_type, is_active, is_billable')
            .in('project_id', projectIds)
            .eq('is_active', true);
          setTimesheets(timesheetData || []);

          const { data: completionsData } = await supabase
            .from('v7_timesheet_completions')
            .select('employee_id, project_id, year, month')
            .in('project_id', projectIds);
          setCompletions(completionsData || []);

          const paFlat = await loadProjectAssignments(projectIds);
          setProjectAssignments(paFlat);
        }

      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [router, supabase, companyId]);

  // ============================================================================
  // BERECHNUNGEN
  // ============================================================================

  const stats = useMemo(() => {
    const totalPlannedPM = workPackages.reduce((sum, wp) => sum + (wp.total_person_months || 0), 0);
    const totalHours = timesheets.filter(t => t.is_billable === true).reduce((sum, t) => sum + t.hours, 0);
    const totalActualPM = totalHours / HOURS_PER_PM;
    const uniqueEmployeesInProjects = new Set(wpAssignments.map(a => a.employee_id)).size;
    return {
      projectCount: projects.length,
      employeeCount: uniqueEmployeesInProjects,
      totalPlannedPM,
      totalActualPM,
      progressPercent: totalPlannedPM > 0 ? (totalActualPM / totalPlannedPM) * 100 : 0,
    };
  }, [projects, workPackages, timesheets, wpAssignments]);

  const projectStats: ProjectStats[] = useMemo(() => {
    return projects.map(project => {
      const projectWPs = workPackages.filter(wp => wp.project_id === project.id);
      const plannedPM = projectWPs.reduce((sum, wp) => sum + (wp.total_person_months || 0), 0);
      const actualHours = timesheets
        .filter(t => t.project_id === project.id && t.is_billable === true)
        .reduce((sum, t) => sum + t.hours, 0);
      const actualPM = actualHours / HOURS_PER_PM;
      const progressPercent = plannedPM > 0 ? (actualPM / plannedPM) * 100 : 0;
      let timeProgressPercent = 0;
      if (project.start_date && project.end_date) {
        const now = new Date();
        const start = new Date(project.start_date);
        const end = new Date(project.end_date);
        const total = end.getTime() - start.getTime();
        if (total > 0) timeProgressPercent = Math.min(100, (Math.max(0, now.getTime() - start.getTime()) / total) * 100);
      }
      let status: 'on-track' | 'warning' | 'critical' = 'on-track';
      if (progressPercent > 110) status = 'critical';
      else if (timeProgressPercent - progressPercent > 25) status = 'warning';
      return { project, plannedPM, actualPM, progressPercent, timeProgressPercent, status };
    });
  }, [projects, workPackages, timesheets]);

  const employeeTimesheetStatus: EmployeeTimesheetStatus[] = useMemo(() => {
    const employeesInProjects = employees.filter(emp => wpAssignments.some(a => a.employee_id === emp.id));
    let projectStart: string | null = null;
    let projectEnd: string | null = null;
    workPackages.forEach(wp => {
      if (wp.start_date && (!projectStart || wp.start_date < projectStart)) projectStart = wp.start_date;
      if (wp.end_date && (!projectEnd || wp.end_date > projectEnd)) projectEnd = wp.end_date;
    });
    let timeProgress = 0;
    if (projectStart && projectEnd) {
      const now = new Date();
      const start = new Date(projectStart);
      const end = new Date(projectEnd);
      const total = end.getTime() - start.getTime();
      if (total > 0) timeProgress = Math.min(100, (Math.max(0, now.getTime() - start.getTime()) / total) * 100);
    }
    return employeesInProjects.map(employee => {
      const employeeAssignments = wpAssignments.filter(a => a.employee_id === employee.id);
      const employeeWpIds = employeeAssignments.map(a => a.work_package_id);
      const employeeProjectIds = [...new Set(workPackages.filter(wp => employeeWpIds.includes(wp.id)).map(wp => wp.project_id))];
      const projectNames = projects.filter(p => employeeProjectIds.includes(p.id)).map(p => p.short_name || p.name);
      const sollPM = employeeAssignments.reduce((sum, a) => sum + (a.planned_person_months || 0), 0);
      const sollHours = sollPM * HOURS_PER_PM;
      const erfasstHours = timesheets.filter(t => t.employee_id === employee.id && t.is_billable === true).reduce((sum, t) => sum + t.hours, 0);
      const offenHours = sollHours - erfasstHours;
      const progressPercent = sollHours > 0 ? (erfasstHours / sollHours) * 100 : 0;
      let budgetStatus: 'on-track' | 'warning' | 'exceeded' = 'on-track';
      if (offenHours < 0) budgetStatus = 'exceeded';
      else if (timeProgress - progressPercent > 25) budgetStatus = 'warning';
      return { employee, projects: projectNames, sollHours, erfasstHours, offenHours, progressPercent, budgetStatus };
    });
  }, [employees, wpAssignments, workPackages, projects, timesheets]);

  const MONTH_SHORT = ['Jan','Feb','Mrz','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];

  const matrixData = useMemo(() => {
    const projectId = matrixProjectId || (projects.length > 0 ? projects[0].id : null);
    if (!projectId) return null;
    const project = projects.find(p => p.id === projectId);
    if (!project || !project.start_date || !project.end_date) return null;
    const pStart = new Date(project.start_date);
    const pEnd = new Date(project.end_date);
    const months: MatrixMonth[] = [];
    for (let y = pStart.getFullYear(); y <= pEnd.getFullYear(); y++) {
      const mStart = y === pStart.getFullYear() ? pStart.getMonth() + 1 : 1;
      const mEnd = y === pEnd.getFullYear() ? pEnd.getMonth() + 1 : 12;
      for (let m = mStart; m <= mEnd; m++) {
        months.push({ year: y, month: m, label: MONTH_SHORT[m - 1] });
      }
    }
    const years = [...new Set(months.map(m => m.year))];
    const projectWPs = workPackages.filter(wp => wp.project_id === projectId);
    const projectWPIds = projectWPs.map(wp => wp.id);
    const assignedEmployeeIds = [...new Set(wpAssignments.filter(a => projectWPIds.includes(a.work_package_id)).map(a => a.employee_id))];
    const matrixEmployees = employees.filter(e => assignedEmployeeIds.includes(e.id));
    const holidaysByYear: Record<number, Map<string, string>> = {};
    years.forEach(y => { holidaysByYear[y] = getGermanHolidays(y, normalizeStateCode(company?.federal_state)); });
    const now = new Date();
    const cells: MatrixCell[] = [];
    matrixEmployees.forEach(emp => {
      months.forEach(({ year, month }) => {
        const isFuture = year > now.getFullYear() || (year === now.getFullYear() && month > now.getMonth() + 1);
        const monthTimesheets = timesheets.filter(t => {
          if (t.project_id !== projectId || t.employee_id !== emp.id) return false;
          const d = new Date(t.work_date);
          return d.getFullYear() === year && d.getMonth() + 1 === month;
        });
        const hoursRecorded = monthTimesheets.reduce((sum, t) => sum + t.hours, 0);
        const workingDays = getWorkingDaysInMonth(year, month, holidaysByYear[year] || new Map());
        const daysWithEntries = new Set(monthTimesheets.filter(t => t.hours > 0).map(t => t.work_date)).size;
        const hols = holidaysByYear[year] || new Map();
        let holidayCount = 0;
        const daysInMon = new Date(year, month, 0).getDate();
        for (let d = 1; d <= daysInMon; d++) {
          const dow = new Date(year, month - 1, d).getDay();
          if (dow === 0 || dow === 6) continue;
          const ds = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          if (hols.has(ds)) holidayCount++;
        }
        const daysRecorded = daysWithEntries + holidayCount;
        const isCompleted = completions.some(c => c.employee_id === emp.id && c.year === year && c.month === month);
        let status: MatrixCell['status'] = 'missing';
        if (isFuture) status = 'future';
        else if (isCompleted) status = 'complete';
        else if (hoursRecorded > 0 && daysRecorded >= workingDays) status = 'complete';
        else if (hoursRecorded > 0) status = 'partial';
        cells.push({ employeeId: emp.id, year, month, hoursRecorded, status });
      });
    });
    return { project, months, years, employees: matrixEmployees, cells };
  }, [matrixProjectId, projects, workPackages, wpAssignments, employees, timesheets, company, completions]);

  // ============================================================================
  // PERSONALKOSTEN EXCEL-EXPORT
  // ============================================================================

  const handlePersonalkostenExport = (exportProjectId?: string, vonStr?: string, bisStr?: string) => {
    const projectId = exportProjectId || pkProjectId || (projects.length > 0 ? projects[0].id : null);
    if (!projectId) return;
    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    const vonDate = vonStr || pkVon || project.start_date || '';
    const bisDate = bisStr || pkBis || project.end_date || '';
    if (!vonDate || !bisDate) { alert('Bitte Von- und Bis-Datum angeben.'); return; }
    setExportLoading(true);
    try {
      const pStart = project.start_date ? new Date(project.start_date) : null;
      const pEnd = project.end_date ? new Date(project.end_date) : null;
      const startYear = pStart ? pStart.getFullYear() : new Date().getFullYear();
      const endYear = pEnd ? pEnd.getFullYear() : startYear;
      const projectYears: number[] = [];
      for (let y = startYear; y <= endYear; y++) projectYears.push(y);
      const projectWPs = workPackages.filter(wp => wp.project_id === projectId);
      const projectWPIds = projectWPs.map(wp => wp.id);
      const projectWPAs = wpAssignments.filter(a => projectWPIds.includes(a.work_package_id));
      const assignedEmpIds = [...new Set(projectWPAs.map(a => a.employee_id))];
      const projectPAs = projectAssignments.filter(pa => pa.project_id === projectId && assignedEmpIds.includes(pa.employee_id));
      const sortedPAs = [...projectPAs].sort((a, b) => {
        if (a.employee_number !== null && b.employee_number !== null) return a.employee_number - b.employee_number;
        if (a.employee_number !== null) return -1;
        if (b.employee_number !== null) return 1;
        const nameA = employees.find(e => e.id === a.employee_id)?.display_name || '';
        const nameB = employees.find(e => e.id === b.employee_id)?.display_name || '';
        return nameA.localeCompare(nameB, 'de');
      });
      const fmt2 = (v: number): number => Math.round(v * 100) / 100;
      const getPMForYear = (empId: string, year: number): number => {
        let totalPM = 0;
        projectWPs.forEach((wp: any) => {
          if (!wp.start_date || !wp.end_date) return;
          const wpStart = new Date(wp.start_date);
          const wpEnd = new Date(wp.end_date);
          const yearStart = new Date(year, 0, 1);
          const yearEnd = new Date(year, 11, 31);
          if (wpEnd < yearStart || wpStart > yearEnd) return;
          const wpa = projectWPAs.find(a => a.work_package_id === wp.id && a.employee_id === empId);
          if (!wpa || !wpa.planned_person_months) return;
          const apDuration = (wpEnd.getTime() - wpStart.getTime()) / (1000 * 60 * 60 * 24 * 30.4375);
          if (apDuration <= 0) return;
          const overlapStart = wpStart < yearStart ? yearStart : wpStart;
          const overlapEnd = wpEnd > yearEnd ? yearEnd : wpEnd;
          const overlapDuration = (overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24 * 30.4375);
          totalPM += wpa.planned_person_months * (Math.max(0, overlapDuration) / apDuration);
        });
        return totalPM;
      };
      const today = new Date().toLocaleDateString('de-DE');
      const vonLabel = new Date(vonDate).toLocaleDateString('de-DE');
      const bisLabel = new Date(bisDate).toLocaleDateString('de-DE');
      const timesheetsInRange = timesheets.filter(t => t.work_date >= vonDate && t.work_date <= bisDate);
      const ws1Data: any[][] = [];
      ws1Data.push([`Personalkosten - ${project.name}`]);
      ws1Data.push([`Foerderkennzeichen: ${project.funding_reference || '-'}`]);
      ws1Data.push([`Abrechnungszeitraum: ${vonLabel} bis ${bisLabel}`]);
      ws1Data.push([`Laufzeit gesamt: ${pStart ? pStart.toLocaleDateString('de-DE') : '-'} bis ${pEnd ? pEnd.toLocaleDateString('de-DE') : '-'}`]);
      ws1Data.push([`Erstellt am: ${today}`]);
      ws1Data.push([]);
      ws1Data.push(['Lfd.Nr.', 'Name', 'Qualifikation', 'Jahresgehalt (EUR)', 'pWAZ (Std/Woche)', 'Stundensatz (EUR/h)', 'Geplante PM', 'Erfasste Stunden', 'Erfasste PM', 'Personalkosten im Zeitraum (EUR)', 'Geplante Gesamtkosten (EUR)']);
      let sumGeplantePM = 0, sumErfassteH = 0, sumErfasstePM = 0, sumKostenBisher = 0, sumKostenGesamt = 0;
      sortedPAs.forEach((pa, idx) => {
        const emp = employees.find(e => e.id === pa.employee_id);
        const empName = emp?.display_name || '-';
        const geplantePM = projectWPAs.filter(a => a.employee_id === pa.employee_id).reduce((s, a) => s + (a.planned_person_months || 0), 0);
        const erfassteH = timesheetsInRange.filter(t => t.project_id === projectId && t.employee_id === pa.employee_id && t.is_billable).reduce((s, t) => s + t.hours, 0);
        const erfasstePM = erfassteH / HOURS_PER_PM;
        const stundensatz = pa.hourly_rate || 0;
        const kostenBisher = erfassteH * stundensatz;
        const kostenGesamt = geplantePM * HOURS_PER_PM * stundensatz;
        sumGeplantePM += geplantePM; sumErfassteH += erfassteH; sumErfasstePM += erfasstePM;
        sumKostenBisher += kostenBisher; sumKostenGesamt += kostenGesamt;
        ws1Data.push([pa.employee_number ?? (idx + 1), empName, pa.qualification || '-', pa.annual_salary ?? null, pa.weekly_hours ?? null, stundensatz > 0 ? stundensatz : null, fmt2(geplantePM), fmt2(erfassteH), fmt2(erfasstePM), fmt2(kostenBisher), fmt2(kostenGesamt)]);
      });
      ws1Data.push([]);
      ws1Data.push([null, 'SUMME', null, null, null, null, fmt2(sumGeplantePM), fmt2(sumErfassteH), fmt2(sumErfasstePM), fmt2(sumKostenBisher), fmt2(sumKostenGesamt)]);
      ws1Data.push([]); ws1Data.push(['Hinweis: Personalkosten im Zeitraum = Erfasste Stunden (foerderbar) x Stundensatz']); ws1Data.push(['Geplante Gesamtkosten = Geplante PM (gesamt) x 173,33 h/PM x Stundensatz']);
      const ws1 = XLSX.utils.aoa_to_sheet(ws1Data);
      ws1['!cols'] = [{ wch: 8 }, { wch: 25 }, { wch: 18 }, { wch: 18 }, { wch: 16 }, { wch: 18 }, { wch: 12 }, { wch: 16 }, { wch: 12 }, { wch: 28 }, { wch: 26 }];
      const yearHeaders = projectYears.map((y, i) => `Jahr ${i + 1} (${y}) [PM]`);
      const ws2Data: any[][] = [];
      ws2Data.push([`Jahresscheiben (Anlage 5) - ${project.name}`]);
      ws2Data.push([`Foerderkennzeichen: ${project.funding_reference || '-'}`]);
      ws2Data.push([`Abrechnungszeitraum: ${vonLabel} bis ${bisLabel}`]);
      ws2Data.push([`Erstellt am: ${today}`]); ws2Data.push([]);
      ws2Data.push(['Lfd.Nr.', 'Name', 'Qualifikation', 'Stundensatz (EUR/h)', ...yearHeaders, 'Gesamt [PM]', 'Personalkosten gesamt (EUR)']);
      const sumJahresPMs: number[] = projectYears.map(() => 0);
      let sumGesamtPM2 = 0, sumGesamtKosten2 = 0;
      sortedPAs.forEach((pa, idx) => {
        const emp = employees.find(e => e.id === pa.employee_id);
        const empName = emp?.display_name || '-';
        const stundensatz = pa.hourly_rate || 0;
        const yearPMs = projectYears.map(y => fmt2(getPMForYear(pa.employee_id, y)));
        const gesamtPM = fmt2(yearPMs.reduce((s, v) => s + v, 0));
        const gesamtKosten = fmt2(gesamtPM * HOURS_PER_PM * stundensatz);
        yearPMs.forEach((pm, i) => { sumJahresPMs[i] += pm; });
        sumGesamtPM2 += gesamtPM; sumGesamtKosten2 += gesamtKosten;
        ws2Data.push([pa.employee_number ?? (idx + 1), empName, pa.qualification || '-', stundensatz > 0 ? stundensatz : null, ...yearPMs, gesamtPM, gesamtKosten]);
      });
      ws2Data.push([]); ws2Data.push([null, 'SUMME', null, null, ...sumJahresPMs.map(v => fmt2(v)), fmt2(sumGesamtPM2), fmt2(sumGesamtKosten2)]);
      ws2Data.push([]); ws2Data.push(['Hinweis: 1 PM = 173,33 Stunden (40h/Woche x 52 Wochen / 12 Monate)']); ws2Data.push(['Jahresscheiben werden aus AP-Zeitraeumen anteilig berechnet']);
      const ws2 = XLSX.utils.aoa_to_sheet(ws2Data);
      ws2['!cols'] = [{ wch: 8 }, { wch: 25 }, { wch: 18 }, { wch: 18 }, ...projectYears.map(() => ({ wch: 18 })), { wch: 14 }, { wch: 26 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws1, 'Personalkosten');
      XLSX.utils.book_append_sheet(wb, ws2, 'Jahresscheiben (Anlage 5)');
      const vonDateStr = vonDate.replace(/-/g, '');
      const bisDateStr = bisDate.replace(/-/g, '');
      const safeName = (project.short_name || project.name).replace(/[^a-zA-Z0-9_\-]/g, '_');
      XLSX.writeFile(wb, `Personalkosten_${safeName}_${vonDateStr}-${bisDateStr}.xlsx`);
    } catch (err: any) {
      alert('Export fehlgeschlagen: ' + err.message);
    } finally {
      setExportLoading(false);
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PortalHeader portal="berater" companyName="" userName="" userRole="consultant" />
        <PortalNav portal="berater" userRole="consultant" />
        <main className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PortalHeader portal="berater" companyName="" userName="" userRole="consultant" />
        <PortalNav portal="berater" userRole="consultant" />
        <main className="max-w-7xl mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-700">{error}</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PortalHeader portal="berater" companyName={company?.name || ''} userName={userProfile?.display_name || ''} userRole="consultant" />
      <PortalNav portal="berater" userRole="consultant" />

      <main className="max-w-7xl mx-auto px-4 py-8">
        <a href={`/v7/berater/foerderung/firma/${companyId}`} className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 mb-4 text-sm">
          &larr; Zurueck zur Firma
        </a>

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Berichte & Controlling</h1>
          <p className="text-gray-600 mt-1">{company?.name} · Uebersicht Projekte, Kosten und Zeiterfassung</p>
        </div>

        {/* Kennzahlen */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Foerderprojekte</p>
                <p className="text-3xl font-bold text-blue-600">{stats.projectCount}</p>
                <p className="text-xs text-gray-400 mt-1">aktiv</p>
              </div>
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                <FolderKanban className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Mitarbeiter</p>
                <p className="text-3xl font-bold text-blue-600">{stats.employeeCount}</p>
                <p className="text-xs text-gray-400 mt-1">in Projekten</p>
              </div>
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Geplante PM</p>
                <p className="text-3xl font-bold text-purple-600">{formatPM(stats.totalPlannedPM)}</p>
                <p className="text-xs text-gray-400 mt-1">gesamt</p>
              </div>
              <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center">
                <Package className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Erfasste PM</p>
                <p className="text-3xl font-bold text-orange-600">{formatPM(stats.totalActualPM)}</p>
                <p className="text-xs text-gray-400 mt-1">{stats.progressPercent.toFixed(0)}% von Plan</p>
              </div>
              <div className="w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Projekt-Uebersicht */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Projekt-Uebersicht</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Projekt</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Laufzeit</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Plan-PM</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ist-PM</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fortschritt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {projectStats.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">Keine Projekte vorhanden</td></tr>
                ) : (
                  projectStats.map(ps => (
                    <tr key={ps.project.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{ps.project.name}</div>
                        <div className="text-sm text-gray-500 mt-0.5 flex items-center gap-2">
                          {ps.project.funding_format && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                              {ps.project.funding_format}
                            </span>
                          )}
                          {ps.project.funding_reference && `FKZ: ${ps.project.funding_reference}`}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {ps.project.start_date && ps.project.end_date
                            ? `${new Date(ps.project.start_date).toLocaleDateString('de-DE', { month: '2-digit', year: '2-digit' })} – ${new Date(ps.project.end_date).toLocaleDateString('de-DE', { month: '2-digit', year: '2-digit' })}`
                            : '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-gray-900">{formatPM(ps.plannedPM)}</td>
                      <td className="px-6 py-4 text-right font-medium text-gray-900">{formatPM(ps.actualPM)}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3 min-w-[160px]">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs text-gray-500 w-14">Erfasst</span>
                              <div className="flex-1 bg-gray-200 rounded-full h-2">
                                <div className={`h-2 rounded-full ${ps.status === 'critical' ? 'bg-red-500' : ps.status === 'warning' ? 'bg-orange-400' : 'bg-blue-500'}`} style={{ width: `${Math.min(100, ps.progressPercent)}%` }} />
                              </div>
                              <span className="text-xs font-medium text-gray-700 w-10 text-right">{ps.progressPercent.toFixed(0)}%</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500 w-14">Laufzeit</span>
                              <div className="flex-1 bg-gray-200 rounded-full h-2">
                                <div className="h-2 rounded-full bg-blue-300" style={{ width: `${Math.min(100, ps.timeProgressPercent)}%` }} />
                              </div>
                              <span className="text-xs font-medium text-blue-600 w-10 text-right">{ps.timeProgressPercent.toFixed(0)}%</span>
                            </div>
                          </div>
                          {ps.status === 'on-track' && <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />}
                          {ps.status === 'warning' && <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0" />}
                          {ps.status === 'critical' && <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Zeiterfassungs-Status */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Zeiterfassungs-Status</h2>
            <p className="text-sm text-gray-500 mt-1">Stundenbudget pro Mitarbeiter (Gesamtprojekt)</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mitarbeiter</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Projekt(e)</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Soll (h)</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Erfasst (h)</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Offen (h)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase" style={{ minWidth: '200px' }}>Fortschritt</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Aktion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {employeeTimesheetStatus.length === 0 ? (
                  <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">Keine Mitarbeiter mit Projektzuordnung</td></tr>
                ) : (
                  employeeTimesheetStatus.map(ets => {
                    const progressCapped = Math.min(100, ets.progressPercent);
                    const barColor = ets.budgetStatus === 'exceeded' ? 'bg-red-500' : ets.budgetStatus === 'warning' ? 'bg-orange-400' : 'bg-blue-500';
                    const offenColor = ets.offenHours < 0 ? 'text-red-600' : 'text-blue-700';
                    return (
                      <tr key={ets.employee.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-gray-900">{ets.employee.display_name}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{ets.projects.join(', ') || '-'}</td>
                        <td className="px-6 py-4 text-right text-gray-700 tabular-nums">{ets.sollHours > 0 ? Math.round(ets.sollHours).toLocaleString('de-DE') : '-'}</td>
                        <td className={`px-6 py-4 text-right tabular-nums font-medium ${ets.budgetStatus === 'warning' ? 'bg-orange-50' : ''}`}>{ets.erfasstHours > 0 ? Math.round(ets.erfasstHours).toLocaleString('de-DE') : '-'}</td>
                        <td className={`px-6 py-4 text-right tabular-nums font-medium ${offenColor}`}>{ets.sollHours > 0 ? Math.round(ets.offenHours).toLocaleString('de-DE') : '-'}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex-1 bg-gray-200 rounded-full h-2.5">
                              <div className={`h-2.5 rounded-full ${barColor}`} style={{ width: `${progressCapped}%` }} />
                            </div>
                            <span className="text-sm font-medium text-gray-700 w-12 text-right">{Math.round(ets.progressPercent)}%</span>
                            {ets.budgetStatus === 'exceeded' && <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />}
                            {ets.budgetStatus === 'warning' && <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0" />}
                            {ets.budgetStatus === 'on-track' && ets.erfasstHours > 0 && <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => router.push(`/v7/berater/foerderung/firma/${companyId}/zeiterfassung?employee=${ets.employee.id}`)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" />
                            Erfassen
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Reports */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Reports erstellen</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

              {/* Kachel 1: Personalkosten - AKTIV */}
              <div className="flex flex-col">
                <button
                  onClick={() => { setShowPKPanel(prev => !prev); }}
                  className={`flex flex-col items-center p-6 border-2 rounded-lg transition-colors cursor-pointer ${
                    showPKPanel ? 'border-blue-600 bg-blue-100 text-blue-800' : 'border-blue-400 bg-blue-50 text-blue-700 hover:bg-blue-100'
                  }`}
                >
                  <FileSpreadsheet className="w-10 h-10 mb-3" />
                  <span className="font-medium">Personalkosten</span>
                  <span className="text-xs mt-1">Excel-Export</span>
                  <span className={`text-xs mt-2 px-2 py-0.5 rounded flex items-center gap-1 ${showPKPanel ? 'bg-blue-200' : 'bg-blue-100'}`}>
                    {showPKPanel ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    {showPKPanel ? 'Schliessen' : 'Zeitraum waehlen'}
                  </span>
                </button>
                {showPKPanel && (
                  <div className="mt-2 p-4 border border-blue-200 rounded-lg bg-blue-50 text-sm">
                    {projects.length > 1 && (
                      <div className="mb-3">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Projekt</label>
                        <select value={pkProjectId} onChange={e => setPKProjectId(e.target.value)} className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:border-blue-500">
                          {projects.map(p => <option key={p.id} value={p.id}>{p.short_name || p.name}</option>)}
                        </select>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Von</label>
                        <input type="date" value={pkVon} onChange={e => setPKVon(e.target.value)} className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:border-blue-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Bis</label>
                        <input type="date" value={pkBis} onChange={e => setPKBis(e.target.value)} className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:border-blue-500" />
                      </div>
                    </div>
                    <button onClick={() => { handlePersonalkostenExport(pkProjectId, pkVon, pkBis); setShowPKPanel(false); }} disabled={exportLoading || !pkVon || !pkBis} className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white text-sm font-medium rounded transition-colors flex items-center justify-center gap-2">
                      <FileSpreadsheet className="w-4 h-4" />
                      {exportLoading ? 'Wird erstellt...' : 'Excel herunterladen'}
                    </button>
                  </div>
                )}
              </div>

              {/* Kachel 2: Stundennachweis - AKTIV */}
              <button
                onClick={() => { if (projects.length > 0 && !matrixProjectId) setMatrixProjectId(projects[0].id); setShowMatrix(prev => !prev); }}
                className="flex flex-col items-center p-6 border-2 border-blue-400 rounded-lg text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors cursor-pointer"
              >
                <Grid3x3 className="w-10 h-10 mb-3" />
                <span className="font-medium">Stundennachweis</span>
                <span className="text-xs mt-1">Matrix-Uebersicht</span>
                <span className="text-xs mt-2 bg-blue-200 text-blue-800 px-2 py-0.5 rounded flex items-center gap-1">
                  {showMatrix ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                  {showMatrix ? 'Schliessen' : 'Oeffnen'}
                </span>
              </button>

              {/* Kachel 3: Projektfortschritt - AKTIV */}
              <button
                onClick={() => setShowFortschritt(prev => !prev)}
                className={`flex flex-col items-center p-6 border-2 rounded-lg transition-colors cursor-pointer ${
                  showFortschritt ? 'border-blue-600 text-blue-800 bg-blue-100' : 'border-blue-400 text-blue-700 bg-blue-50 hover:bg-blue-100'
                }`}
              >
                <BarChart3 className="w-10 h-10 mb-3" />
                <span className="font-medium">Projekt-Fortschritt</span>
                <span className="text-xs mt-1">Grafische Auswertung</span>
                <span className={`text-xs mt-2 px-2 py-0.5 rounded flex items-center gap-1 ${showFortschritt ? 'bg-blue-200' : 'bg-blue-100'}`}>
                  {showFortschritt ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                  {showFortschritt ? 'Schliessen' : 'Oeffnen'}
                </span>
              </button>

              {/* Kachel 4: Zahlungsanforderung - AKTIV */}
              <button
                onClick={() => setShowZA(prev => !prev)}
                className={`flex flex-col items-center p-6 border-2 rounded-lg transition-colors cursor-pointer ${
                  showZA ? 'border-blue-600 text-blue-800 bg-blue-100' : 'border-blue-400 text-blue-700 bg-blue-50 hover:bg-blue-100'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <polyline points="10 9 9 9 8 9"/>
                </svg>
                <span className="font-medium">Daten f. Zahlungsanforderung</span>
                <span className="text-xs mt-1">Datengrundlage ZIM-Formular</span>
                <span className={`text-xs mt-2 px-2 py-0.5 rounded flex items-center gap-1 ${showZA ? 'bg-blue-200' : 'bg-blue-100'}`}>
                  {showZA ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  {showZA ? 'Schliessen' : 'Oeffnen'}
                </span>
              </button>
            </div>

            {/* Fortschritt-Panel - volle Breite */}
            {showFortschritt && (
              <div className="mt-4 bg-white rounded-xl border border-gray-200 p-5">
                <ProjektFortschrittPanel
                  portal="berater"
                  projects={projects}
                  workPackages={workPackages}
                  wpAssignments={wpAssignments}
                  projectAssignments={projectAssignments}
                  employees={employees}
                  timesheets={timesheets}
                />
              </div>
            )}

            {/* ZA-Panel - volle Breite */}
            {showZA && (
              <ZAPanel
                portal="berater"
                projects={projects}
                workPackages={workPackages}
                wpAssignments={wpAssignments}
                employees={employees}
                timesheets={timesheets}
                projectAssignments={projectAssignments}
              />
            )}

            {/* Stundennachweis-Matrix - Shared Component */}
            {showMatrix && (
              <StundennachweisMatrix
                portal="berater"
                companyId={companyId}
                projects={projects}
                workPackages={workPackages}
                wpAssignments={wpAssignments}
                employees={employees}
                timesheets={timesheets}
                completions={completions}
                company={company}
                matrixProjectId={matrixProjectId}
                onProjectChange={(id) => setMatrixProjectId(id)}
                onNavigateToZE={(empId, year, month) => {
                  const returnUrl = encodeURIComponent(`/v7/berater/foerderung/firma/${companyId}/berichte`);
                  router.push(`/v7/berater/foerderung/firma/${companyId}/zeiterfassung?employee=${empId}&year=${year}&month=${month}&returnUrl=${returnUrl}`);
                }}
              />
            )}
          </div>
        </div>
      </main>

      <footer className="text-center py-4 text-sm text-gray-500 mt-8">
        Projektzeiterfassung v7.4.4-19 · Berater-Portal · 2026
      </footer>
    </div>
  );
}

// ============================================================================
// SUSPENSE-WRAPPER
// ============================================================================

export default function BerichtePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    }>
      <BeratePageContent />
    </Suspense>
  );
}
