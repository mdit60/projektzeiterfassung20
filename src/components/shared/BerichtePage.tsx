// src/components/shared/BerichtePage.tsx
// ============================================================================
// PZE V7 - Shared Component: Berichte & Controlling
// ============================================================================
// Version: 7.4.6-5
// v7.4.6-5: BerichtePage Umstrukturierung
//   - Projekt-Selektor-Kachel an erster Stelle (Dropdown fuer Projektauswahl)
//   - 3 Report-Kacheln direkt daneben (Stundennachweis, Fortschritt, ZA)
//   - 4 Kennzahl-Kacheln entfernt
//   - "Reports erstellen" Header entfernt
//   - Panels oeffnen direkt unter den Kacheln
//   - Projekt-Uebersicht-Tabelle darunter
//   - Personalkosten-Export vorerst ausgeblendet (spaeter neu platzieren)
// v7.4.6-4: FIX bewilligte_summe in DB-Select ergaenzt fuer ProjektFortschrittPanel
// Datum: 24. April 2026
//
// v7.4.6-3: Accordion-Prinzip fuer Report-Kacheln
//   - Einzelner activePanel-State ersetzt showMatrix/showZA/showFortschritt/showPKPanel
//   - Klick auf Kachel oeffnet diese und schliesst alle anderen automatisch
//   - Zweiter Klick auf aktive Kachel schliesst sie (Toggle)
//
// v7.4.6-2: Kundenfirmen-Link + Zeiterfassungs-Status unter Matrix (siehe dort)
//
// Ersetzt berichte-page (Firma) und berater-berichte-page (Berater).
// portal-Parameter steuert Farbe und Navigation.
// clientCompanyId-Prop: bei Berater aus URL-Params, bei Firma aus UserProfil.
//
// Wrapper-Dateien:
//   src/app/v7/firma/berichte/page.tsx
//   src/app/v7/berater/foerderung/firma/[id]/berichte/page.tsx
// ============================================================================

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import * as XLSX from 'xlsx';
import PortalHeader from '@/components/shared/PortalHeader';
import PortalNav from '@/components/shared/PortalNav';
import ProjektFortschrittPanel from '@/components/shared/ProjektFortschrittPanel';
import StundennachweisMatrix from '@/components/shared/StundennachweisMatrix';
import ZAPanel, { loadProjectAssignments } from '@/components/shared/ZAPanel';
import {
  getGermanHolidays,
  type HolidayRegion,
} from '@/lib/holidays/germanHolidays';
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
} from 'lucide-react';

// ============================================================================
// TYPEN
// ============================================================================

export interface BericherPageProps {
  portal: 'firma' | 'berater';
  // Bei Berater: aus URL-Params. Bei Firma: aus UserProfil (wird intern geladen).
  clientCompanyId?: string;
}

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
  holiday_region: string | null;  // v7.4.6
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
  bewilligte_summe: number | null;
}

interface Employee {
  id: string;
  display_name: string;
  first_name: string | null;
  last_name: string | null;
  employment_start: string | null;
  employment_end: string | null;
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

interface ProjectAssignment {
  id: string;
  project_id: string;
  employee_id: string;
  employee_number: number | null;
  hourly_rate: number | null;
  role_in_project: string | null;
  annual_salary: number | null;
  weekly_hours: number | null;
  qualification: string | null;
  assignment_start: string | null;
  assignment_end: string | null;
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
// KONSTANTEN
// ============================================================================

const HOURS_PER_PM = 173.33;
const MONTH_SHORT = ['Jan','Feb','Mrz','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];

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

// Feiertagsberechnung ausgelagert in src/lib/holidays/germanHolidays.ts (v7.4.6)
// Import oben: getGermanHolidays, HolidayRegion

const formatPM = (pm: number): string => pm.toFixed(1).replace('.', ',');

// ============================================================================
// SHARED COMPONENT
// ============================================================================

export default function BerichtePage({ portal, clientCompanyId }: BericherPageProps) {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [portalRole, setPortalRole] = useState<string>('employee');
  const [company, setCompany] = useState<Company | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [workPackages, setWorkPackages] = useState<WorkPackage[]>([]);
  const [wpAssignments, setWpAssignments] = useState<WorkPackageAssignment[]>([]);
  const [timesheets, setTimesheets] = useState<TimesheetEntry[]>([]);
  const [completions, setCompletions] = useState<{employee_id: string; project_id: string; year: number; month: number}[]>([]);
  const [projectAssignments, setProjectAssignments] = useState<ProjectAssignment[]>([]);
  // NEU v7.4.4-3: Timesheet-Notizen
  const [timesheetNotes, setTimesheetNotes] = useState<{employee_id: string; project_id: string; year: number; month: number; status: string}[]>([]);
  const [exportLoading, setExportLoading] = useState(false);

  // Accordion: immer nur ein Panel offen
  type ActivePanel = 'pk' | 'matrix' | 'fortschritt' | 'za' | null;
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);
  const togglePanel = (panel: ActivePanel) =>
    setActivePanel(prev => prev === panel ? null : panel);

  // Projekt-Selektor fuer Reports (null = erstes Projekt / alle)
  const [selectedReportProjectId, setSelectedReportProjectId] = useState<string | null>(null);

  const showPKPanel    = activePanel === 'pk';
  const showMatrix     = activePanel === 'matrix';
  const showFortschritt = activePanel === 'fortschritt';
  const showZA         = activePanel === 'za';

  const [pkProjectId, setPKProjectId] = useState<string>('');
  const [pkVon, setPKVon] = useState<string>('');
  const [pkBis, setPKBis] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [matrixProjectId, setMatrixProjectId] = useState<string | null>(null);

  const holidays = useMemo(() => {
    if (!company?.federal_state) return new Map<string, string>();
    return getGermanHolidays(
      selectedYear,
      company.federal_state,
      (company.holiday_region ?? undefined) as HolidayRegion,
    );
  }, [selectedYear, company?.federal_state, company?.holiday_region]);

  // Portal-spezifische Farben
  const colors = portal === 'berater'
    ? { primary: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-400', btn: 'text-blue-700 bg-blue-50 hover:bg-blue-100', btnActive: 'border-blue-600 text-blue-800 bg-blue-100', btnBadge: 'bg-blue-200 text-blue-800' }
    : { primary: 'text-green-600', bg: 'bg-green-50', border: 'border-green-400', btn: 'text-green-700 bg-green-50 hover:bg-green-100', btnActive: 'border-green-600 text-green-800 bg-green-100', btnBadge: 'bg-green-200 text-green-800' };

  // ============================================================================
  // DATEN LADEN
  // ============================================================================

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/v7/login'); return; }

        // companyId ermitteln: bei Berater aus Prop, bei Firma aus UserProfil
        let companyId = clientCompanyId || null;

        if (!companyId) {
          const { data: profile, error: profileError } = await supabase
            .from('v7_user_profiles')
            .select('id, email, display_name, role, client_company_id')
            .eq('email', user.email)
            .maybeSingle();
          if (profileError || !profile) { setError('Fehler beim Laden des Benutzerprofils'); return; }
          if (!profile.client_company_id) { setError('Keine Firma zugeordnet.'); return; }
          setUserProfile(profile);
          companyId = profile.client_company_id;
        } else {
          // Berater: UserProfil trotzdem laden fuer Display-Name
          const { data: profile } = await supabase
            .from('v7_user_profiles')
            .select('id, email, display_name, role, client_company_id')
            .eq('email', user.email)
            .maybeSingle();
          if (profile) setUserProfile(profile);
        }

        // Company
        const { data: companyData, error: companyError } = await supabase
          .from('v7_client_companies')
          .select('id, name, federal_state, holiday_region')
          .eq('id', companyId)
          .single();
        if (companyError || !companyData) { setError('Firma nicht gefunden'); return; }
        setCompany(companyData);

        // Projekte
        const { data: projectsData } = await supabase
          .from('v7_projects')
          .select('id, name, short_name, funding_format, funding_reference, start_date, end_date, is_active, foerdersatz, overhead_t, overhead_nt, overhead_gleich, bewilligte_summe')
          .eq('client_company_id', companyId)
          .eq('is_active', true);
        setProjects(projectsData || []);

        if (projectsData && projectsData.length > 0) {
          const firstProject = projectsData[0];
          setPKProjectId(firstProject.id);
          setPKVon(firstProject.start_date ? firstProject.start_date.slice(0, 10) : new Date().toISOString().slice(0, 10));
          setPKBis(new Date().toISOString().slice(0, 10));
        }

        // Mitarbeiter
        const { data: employeesData } = await supabase
          .from('v7_employees')
          .select('id, display_name, first_name, last_name, user_id, portal_role, employment_start, employment_end')
          .eq('client_company_id', companyId)
          .eq('is_active', true);
        setEmployees(employeesData || []);

        // Portal-Rolle nur bei Firma relevant
        if (portal === 'firma') {
          const myEmployee = (employeesData || []).find((emp: any) => emp.user_id === user.id);
          const { data: profile } = await supabase.from('v7_user_profiles').select('role').eq('email', user.email).maybeSingle();
          if (profile?.role === 'client_admin') setPortalRole('client_admin');
          else if (myEmployee?.portal_role) setPortalRole(myEmployee.portal_role);
          else setPortalRole('employee');
        } else {
          setPortalRole('consultant');
        }

        // Arbeitspakete
        const projectIds = (projectsData || []).map((p: any) => p.id);
        if (projectIds.length > 0) {
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

          // Timesheets
          const { data: timesheetData } = await supabase
            .from('v7_timesheets')
            .select('id, project_id, employee_id, work_package_id, work_date, hours, day_type, is_active, is_billable')
            .in('project_id', projectIds)
            .eq('is_active', true);
          setTimesheets(timesheetData || []);

          // Completions
          const { data: completionsData } = await supabase
            .from('v7_timesheet_completions')
            .select('employee_id, project_id, year, month')
            .in('project_id', projectIds);
          setCompletions(completionsData || []);

          // NEU v7.4.4-3: Timesheet-Notizen (offene Rueckfragen)
          const { data: notesData } = await supabase
            .from('v7_timesheet_notes')
            .select('employee_id, project_id, year, month, status')
            .in('project_id', projectIds)
            .eq('status', 'offen');
          setTimesheetNotes(notesData || []);

          // Projekt-Zuordnungen
          const paFlat = await loadProjectAssignments(projectIds);

          // NEU v7.4.4-4: assignment_start/end separat laden (nicht in loadProjectAssignments enthalten)
          const { data: assignDates } = await supabase
            .from('v7_project_assignments')
            .select('employee_id, assignment_start, assignment_end')
            .in('project_id', projectIds)
            .eq('is_active', true);

          // assignment_start/end in die projectAssignments mergen
          const paWithDates = paFlat.map((pa: ProjectAssignment) => {
            const dates = (assignDates || []).find((d: any) => d.employee_id === pa.employee_id);
            return {
              ...pa,
              assignment_start: dates?.assignment_start || null,
              assignment_end: dates?.assignment_end || null,
            };
          });
          setProjectAssignments(paWithDates);
        }

      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [router, supabase, clientCompanyId, portal]);

  // ============================================================================
  // BERECHNUNGEN
  // ============================================================================

  const stats = useMemo(() => {
    const totalPlannedPM = workPackages.reduce((sum, wp) => sum + (wp.total_person_months || 0), 0);
    const totalHours = timesheets.filter(t => t.is_billable === true).reduce((sum, t) => sum + (t.hours || 0), 0);
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
      const actualHours = timesheets.filter(t => t.project_id === project.id && t.is_billable === true).reduce((sum, t) => sum + (t.hours || 0), 0);
      const actualPM = actualHours / HOURS_PER_PM;
      const progressPercent = plannedPM > 0 ? (actualPM / plannedPM) * 100 : 0;
      let timeProgressPercent = 0;
      if (project.start_date && project.end_date) {
        const now = new Date();
        const start = new Date(project.start_date);
        const end = new Date(project.end_date);
        const totalDuration = end.getTime() - start.getTime();
        if (totalDuration > 0) {
          const elapsed = Math.max(0, now.getTime() - start.getTime());
          timeProgressPercent = Math.min(100, (elapsed / totalDuration) * 100);
        }
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
      const totalDuration = end.getTime() - start.getTime();
      if (totalDuration > 0) {
        const elapsed = Math.max(0, now.getTime() - start.getTime());
        timeProgress = Math.min(100, (elapsed / totalDuration) * 100);
      }
    }
    return employeesInProjects.map(employee => {
      const employeeAssignments = wpAssignments.filter(a => a.employee_id === employee.id);
      const employeeWpIds = employeeAssignments.map(a => a.work_package_id);
      const employeeProjectIds = [...new Set(workPackages.filter(wp => employeeWpIds.includes(wp.id)).map(wp => wp.project_id))];
      const projectNames = projects.filter(p => employeeProjectIds.includes(p.id)).map(p => p.short_name || p.name);
      const sollPM = employeeAssignments.reduce((sum, a) => sum + (a.planned_person_months || 0), 0);
      const sollHours = sollPM * HOURS_PER_PM;
      const erfasstHours = timesheets.filter(t => t.employee_id === employee.id && t.is_billable === true).reduce((sum, t) => sum + (t.hours || 0), 0);
      const offenHours = sollHours - erfasstHours;
      const progressPercent = sollHours > 0 ? (erfasstHours / sollHours) * 100 : 0;
      let budgetStatus: 'on-track' | 'warning' | 'exceeded' = 'on-track';
      if (offenHours < 0) budgetStatus = 'exceeded';
      else if (timeProgress - progressPercent > 25) budgetStatus = 'warning';
      return { employee, projects: projectNames, sollHours, erfasstHours, offenHours, progressPercent, budgetStatus };
    }).sort((a, b) => {
      // Nach MA-Nr. (employee_number aus projectAssignments) sortieren
      const paA = projectAssignments.find(pa => pa.employee_id === a.employee.id);
      const paB = projectAssignments.find(pa => pa.employee_id === b.employee.id);
      const nrA = paA?.employee_number ?? 9999;
      const nrB = paB?.employee_number ?? 9999;
      if (nrA !== nrB) return nrA - nrB;
      return (a.employee.display_name || '').localeCompare(b.employee.display_name || '', 'de');
    });
  }, [employees, wpAssignments, projects, timesheets, workPackages, projectAssignments]);

  // ============================================================================
  // PERSONALKOSTEN EXCEL-EXPORT
  // ============================================================================

  const handlePkProjectChange = (newId: string) => {
    setPKProjectId(newId);
    const p = projects.find(pr => pr.id === newId);
    if (p) {
      setPKVon(p.start_date ? p.start_date.slice(0, 10) : '');
      setPKBis(p.end_date ? p.end_date.slice(0, 10) : new Date().toISOString().slice(0, 10));
    }
  };

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

      const fmt = (v: number): number => Math.round(v * 100) / 100;

      const getPMForYear = (empId: string, year: number): number => {
        let totalPM = 0;
        projectWPs.forEach(wp => {
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
          totalPM += wpa.planned_person_months * (overlapDuration / apDuration);
        });
        return totalPM;
      };

      const von = new Date(vonDate);
      const bis = new Date(bisDate);

      const ws1Data: any[][] = [];
      ws1Data.push([`Personalkosten - ${project.short_name || project.name}`, '', '', '', '', '', '', '', '', '', '']);
      ws1Data.push([`Abrechnungszeitraum: ${von.toLocaleDateString('de-DE')} bis ${bis.toLocaleDateString('de-DE')}`, '', '', '', '', '', '', '', '', '', '']);
      ws1Data.push(['']);
      ws1Data.push(['Lfd.Nr.', 'Name', 'Qualifikation', 'Jahresgehalt (EUR)', 'pWAZ (Std/Woche)', 'Stundensatz (EUR/h)', 'Geplante PM', 'Erfasste Stunden', 'Erfasste PM', 'Personalkosten im Zeitraum (EUR)', 'Geplante Gesamtkosten (EUR)']);

      let lfdNr = 1;
      let sumGeplantePM = 0, sumErfassteH = 0, sumErfasstePM = 0, sumKostenBisher = 0, sumKostenGesamt = 0;

      sortedPAs.forEach(pa => {
        const emp = employees.find(e => e.id === pa.employee_id);
        if (!emp) return;
        const empAssignments = projectWPAs.filter(a => a.employee_id === pa.employee_id);
        const geplantePM = empAssignments.reduce((sum, a) => sum + (a.planned_person_months || 0), 0);
        const stundensatz = pa.hourly_rate || 0;
        const empTimesheets = timesheets.filter(t => {
          if (t.employee_id !== pa.employee_id || t.project_id !== projectId || !t.is_billable) return false;
          const d = new Date(t.work_date);
          return d >= von && d <= bis;
        });
        const erfassteH = empTimesheets.reduce((sum, t) => sum + (t.hours || 0), 0);
        const erfasstePM = erfassteH / HOURS_PER_PM;
        const kostenBisher = erfassteH * stundensatz;
        const kostenGesamt = geplantePM * HOURS_PER_PM * stundensatz;
        sumGeplantePM += geplantePM; sumErfassteH += erfassteH;
        sumErfasstePM += erfasstePM; sumKostenBisher += kostenBisher; sumKostenGesamt += kostenGesamt;
        ws1Data.push([lfdNr++, emp.display_name, pa.qualification || '', fmt(pa.annual_salary || 0), fmt(pa.weekly_hours || 40), fmt(stundensatz), fmt(geplantePM), fmt(erfassteH), fmt(erfasstePM), fmt(kostenBisher), fmt(kostenGesamt)]);
      });
      ws1Data.push(['', 'SUMME', '', '', '', '', fmt(sumGeplantePM), fmt(sumErfassteH), fmt(sumErfasstePM), fmt(sumKostenBisher), fmt(sumKostenGesamt)]);

      const ws2Data: any[][] = [];
      ws2Data.push([`Jahresscheiben - ${project.short_name || project.name}`]);
      ws2Data.push(['']);
      const headerRow2 = ['Lfd.Nr.', 'Name', 'Qualifikation', 'Stundensatz (EUR/h)', ...projectYears.map(y => `PM ${y}`), 'PM Gesamt', ...projectYears.map(y => `Kosten ${y} (EUR)`), 'Kosten Gesamt (EUR)'];
      ws2Data.push(headerRow2);

      let lfdNr2 = 1;
      sortedPAs.forEach(pa => {
        const emp = employees.find(e => e.id === pa.employee_id);
        if (!emp) return;
        const stundensatz = pa.hourly_rate || 0;
        const pmByYear = projectYears.map(y => fmt(getPMForYear(pa.employee_id, y)));
        const pmGesamt = pmByYear.reduce((s, v) => s + v, 0);
        const kostenByYear = pmByYear.map(pm => fmt(pm * HOURS_PER_PM * stundensatz));
        const kostenGesamt = kostenByYear.reduce((s, v) => s + v, 0);
        ws2Data.push([lfdNr2++, emp.display_name, pa.qualification || '', fmt(stundensatz), ...pmByYear, fmt(pmGesamt), ...kostenByYear, fmt(kostenGesamt)]);
      });

      const wb = XLSX.utils.book_new();
      const ws1 = XLSX.utils.aoa_to_sheet(ws1Data);
      const ws2 = XLSX.utils.aoa_to_sheet(ws2Data);
      XLSX.utils.book_append_sheet(wb, ws1, 'Personalkosten');
      XLSX.utils.book_append_sheet(wb, ws2, 'Jahresscheiben');
      const today = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `Personalkosten_${(project.short_name || project.name).replace(/[^a-zA-Z0-9]/g, '_')}_${today}.xlsx`);
    } finally {
      setExportLoading(false);
    }
  };

  // ============================================================================
  // RENDER-HILFEN
  // ============================================================================

  const userRole = portal === 'berater' ? 'consultant' : (portalRole === 'client_admin' ? 'client_admin' : 'client_user');

  const zeiterfassungUrl = (empId: string) =>
    portal === 'berater'
      ? `/v7/berater/foerderung/firma/${clientCompanyId}/zeiterfassung?employee=${empId}`
      : `/v7/firma/zeiterfassung?employee=${empId}`;

  const zurueckUrl = portal === 'berater'
    ? `/v7/berater/foerderung/firma/${clientCompanyId}`
    : undefined;

  const matrixReturnUrl = portal === 'berater'
    ? `/v7/berater/foerderung/firma/${clientCompanyId}/berichte`
    : '/v7/firma/berichte';

  // ============================================================================
  // LOADING / ERROR
  // ============================================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PortalHeader portal={portal} companyName="" userName="" userRole={userRole} />
        <PortalNav portal={portal} userRole={userRole} portalRole={portalRole} />
        <main className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-600 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-500">Daten werden geladen...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PortalHeader portal={portal} companyName="" userName="" userRole={userRole} />
        <PortalNav portal={portal} userRole={userRole} portalRole={portalRole} />
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
  // JSX
  // ============================================================================

  return (
    <div className="min-h-screen bg-gray-50">
      <PortalHeader
        portal={portal}
        companyName={company?.name || ''}
        userName={userProfile?.display_name || ''}
        userRole={userRole}
        portalRole={portalRole as any}
      />
      <PortalNav portal={portal} userRole={userRole} portalRole={portalRole} />

      <main className="max-w-7xl mx-auto px-4 py-8">

        {/* Navigation Links (nur Berater) */}
        {portal === 'berater' && (
          <div className="flex items-center gap-4 mb-4">
            {zurueckUrl && (
              <a href={zurueckUrl} className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm">
                &larr; Zurueck zur Firma
              </a>
            )}
            <span className="text-gray-300">|</span>
            <a href="/v7/berater/foerderung" className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm">
              Kundenfirmen
            </a>
          </div>
        )}

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Berichte &amp; Controlling</h1>
          <p className="text-gray-600 mt-1">
            {company?.name && portal === 'berater' ? `${company.name} \u00b7 ` : ''}
            Uebersicht Projekte, Kosten und Zeiterfassung
          </p>
        </div>

        {/* ================================================================ */}
        {/* REPORT-KACHELN + PROJEKT-SELEKTOR (oberste Stelle)              */}
        {/* ================================================================ */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">

          {/* Kachel 1: Projekt-Auswahl */}
          <div className={`flex flex-col border-2 rounded-xl p-4 bg-white ${colors.border}`}>
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-8 h-8 ${colors.bg} rounded-lg flex items-center justify-center`}>
                <FolderKanban className={`w-4 h-4 ${colors.primary}`} />
              </div>
              <span className="text-sm font-semibold text-gray-700">Projekt</span>
            </div>
            <select
              value={selectedReportProjectId || ''}
              onChange={e => setSelectedReportProjectId(e.target.value || null)}
              className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 ${colors.ring} mt-auto`}
            >
              {projects.length > 1 && <option value="">Alle Projekte</option>}
              {projects.map(p => (
                <option key={p.id} value={p.id}>
                  {p.short_name || p.name}
                </option>
              ))}
            </select>
            {projects.length === 1 && (
              <p className="text-xs text-gray-500 mt-2">{projects[0].funding_reference || ''}</p>
            )}
          </div>

          {/* Kachel 2: Stundennachweis */}
          <button
            onClick={() => { if (projects.length > 0 && !matrixProjectId) setMatrixProjectId(selectedReportProjectId || projects[0].id); togglePanel('matrix'); }}
            className={`flex flex-col items-center p-6 border-2 rounded-xl transition-colors cursor-pointer bg-white ${showMatrix ? colors.btnActive : `${colors.border} ${colors.btn}`}`}
          >
            <Grid3x3 className="w-10 h-10 mb-3" />
            <span className="font-medium">Stundennachweis</span>
            <span className="text-xs mt-1">Matrix-Uebersicht</span>
            <span className={`text-xs mt-2 ${colors.btnBadge} px-2 py-0.5 rounded flex items-center gap-1`}>
              {showMatrix ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
              {showMatrix ? 'Schliessen' : 'Oeffnen'}
            </span>
          </button>

          {/* Kachel 3: Projektfortschritt */}
          <button
            onClick={() => togglePanel('fortschritt')}
            className={`flex flex-col items-center p-6 border-2 rounded-xl transition-colors cursor-pointer bg-white ${showFortschritt ? colors.btnActive : `${colors.border} ${colors.btn}`}`}
          >
            <BarChart3 className="w-10 h-10 mb-3" />
            <span className="font-medium">Projekt-Fortschritt</span>
            <span className="text-xs mt-1">Grafische Auswertung</span>
            <span className={`text-xs mt-2 ${colors.btnBadge} px-2 py-0.5 rounded flex items-center gap-1`}>
              {showFortschritt ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
              {showFortschritt ? 'Schliessen' : 'Oeffnen'}
            </span>
          </button>

          {/* Kachel 4: Zahlungsanforderung */}
          <button
            onClick={() => togglePanel('za')}
            className={`flex flex-col items-center p-6 border-2 rounded-xl transition-colors cursor-pointer bg-white ${showZA ? colors.btnActive : `${colors.border} ${colors.btn}`}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            <span className="font-medium">Daten f. Zahlungsanforderung</span>
            <span className="text-xs mt-1">Datengrundlage ZIM-Formular</span>
            <span className={`text-xs mt-2 ${colors.btnBadge} px-2 py-0.5 rounded flex items-center gap-1`}>
              {showZA ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {showZA ? 'Schliessen' : 'Oeffnen'}
            </span>
          </button>
        </div>

        {/* Aufgeklappte Panels direkt unter den Kacheln */}
        {showFortschritt && (
          <div className="mb-6 bg-white rounded-xl border border-gray-200 p-5">
            <ProjektFortschrittPanel
              portal={portal}
              projects={selectedReportProjectId ? projects.filter(p => p.id === selectedReportProjectId) : projects}
              workPackages={workPackages}
              wpAssignments={wpAssignments}
              projectAssignments={projectAssignments}
              employees={employees}
              timesheets={timesheets}
            />
          </div>
        )}

        {showZA && (
          <div className="mb-6">
            <ZAPanel
              portal={portal}
              projects={selectedReportProjectId ? projects.filter(p => p.id === selectedReportProjectId) : projects}
              workPackages={workPackages}
              wpAssignments={wpAssignments}
              employees={employees}
              timesheets={timesheets}
              projectAssignments={projectAssignments}
            />
          </div>
        )}

        {showMatrix && (
          <div className="mb-6">
            <StundennachweisMatrix
              portal={portal}
              companyId={company?.id || ''}
              projects={selectedReportProjectId ? projects.filter(p => p.id === selectedReportProjectId) : projects}
              workPackages={workPackages}
              wpAssignments={wpAssignments}
              projectAssignments={projectAssignments}
              employees={employees}
              timesheets={timesheets}
              completions={completions}
              notes={timesheetNotes}
              company={company}
              matrixProjectId={matrixProjectId}
              onProjectChange={(id) => setMatrixProjectId(id)}
              onNavigateToZE={(empId, year, month) => {
                const returnUrl = encodeURIComponent(matrixReturnUrl);
                router.push(zeiterfassungUrl(empId) + `&year=${year}&month=${month}&returnUrl=${returnUrl}`);
              }}
            />
          </div>
        )}

        {/* Projekt-Uebersicht (Tabelle) */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Projekt-Uebersicht</h2>
          </div>          <div className="overflow-x-auto">
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
                        <div className="text-sm text-gray-500">
                          {ps.project.funding_format && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 mr-2">
                              {ps.project.funding_format}
                            </span>
                          )}
                          {ps.project.funding_reference && `FKZ: ${ps.project.funding_reference}`}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {ps.project.start_date && ps.project.end_date ? (
                          <>
                            {new Date(ps.project.start_date).toLocaleDateString('de-DE', { month: '2-digit', year: '2-digit' })}
                            {' - '}
                            {new Date(ps.project.end_date).toLocaleDateString('de-DE', { month: '2-digit', year: '2-digit' })}
                          </>
                        ) : '-'}
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-gray-900">{formatPM(ps.plannedPM)}</td>
                      <td className="px-6 py-4 text-right font-medium text-gray-900">{formatPM(ps.actualPM)}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 min-w-[140px]">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs text-gray-500 w-14">Erfasst</span>
                              <div className="flex-1 bg-gray-200 rounded-full h-2">
                                <div className={`h-2 rounded-full ${ps.status === 'critical' ? 'bg-red-500' : ps.status === 'warning' ? 'bg-orange-400' : 'bg-green-500'}`}
                                  style={{ width: `${Math.min(100, ps.progressPercent)}%` }} />
                              </div>
                              <span className="text-xs font-medium text-gray-700 w-10 text-right">{ps.progressPercent.toFixed(0)}%</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500 w-14">Laufzeit</span>
                              <div className="flex-1 bg-gray-200 rounded-full h-2">
                                <div className="h-2 rounded-full bg-blue-400" style={{ width: `${Math.min(100, ps.timeProgressPercent)}%` }} />
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

        {/* Personalkosten-Export (vorerst ausgeblendet, wird spaeter integriert) */}
        {showPKPanel && (
          <div className="mb-6 bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Personalkosten Excel-Export</h3>
            {projects.length > 1 && (
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-600 mb-1">Projekt</label>
                <select value={pkProjectId} onChange={e => handlePkProjectChange(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none">
                  {projects.map(p => <option key={p.id} value={p.id}>{p.short_name || p.name}</option>)}
                </select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Von</label>
                <input type="date" value={pkVon} onChange={e => setPKVon(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded px-2 py-1.5" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Bis</label>
                <input type="date" value={pkBis} onChange={e => setPKBis(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded px-2 py-1.5" />
              </div>
            </div>
            <button
              onClick={() => { handlePersonalkostenExport(pkProjectId, pkVon, pkBis); togglePanel(null); }}
              disabled={exportLoading || !pkVon || !pkBis}
              className={`w-full py-2 ${portal === 'berater' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'} disabled:bg-gray-300 text-white text-sm font-medium rounded transition-colors flex items-center justify-center gap-2`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              {exportLoading ? 'Wird erstellt...' : 'Excel herunterladen'}
            </button>
          </div>
        )}

        {/* Zeiterfassungs-Status (nur wenn Matrix offen) */}
        {showMatrix && (
          <div className="mb-6 bg-white rounded-lg shadow">
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
                      const barColor = ets.budgetStatus === 'exceeded' ? 'bg-red-500' : ets.budgetStatus === 'warning' ? 'bg-orange-400' : 'bg-green-500';
                      const offenColor = ets.offenHours < 0 ? 'text-red-600' : 'text-green-700';
                      return (
                        <tr key={ets.employee.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 font-medium text-gray-900">{ets.employee.display_name}</td>
                          <td className="px-6 py-4 text-sm text-gray-500">{ets.projects.join(', ') || '-'}</td>
                          <td className="px-6 py-4 text-right text-gray-700 tabular-nums">{ets.sollHours > 0 ? Math.round(ets.sollHours).toLocaleString('de-DE') : '-'}</td>
                          <td className={`px-6 py-4 text-right tabular-nums font-medium ${ets.budgetStatus === 'warning' ? 'bg-orange-50' : ''}`}>
                            {ets.erfasstHours > 0 ? Math.round(ets.erfasstHours).toLocaleString('de-DE') : '-'}
                          </td>
                          <td className={`px-6 py-4 text-right tabular-nums font-medium ${offenColor}`}>
                            {ets.sollHours > 0 ? Math.round(ets.offenHours).toLocaleString('de-DE') : '-'}
                          </td>
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
                              onClick={() => router.push(zeiterfassungUrl(ets.employee.id))}
                              className={`inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${colors.btn}`}
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
        )}

      </main>

      <footer className="text-center py-4 text-sm text-gray-500 mt-8">
        PZE v7.4.4 &middot; {company?.name || ''}
      </footer>
    </div>
  );
}
