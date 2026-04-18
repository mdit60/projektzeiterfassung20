// src/app/v7/firma/berichte/page.tsx
// ============================================================================
// PZE V7 - Berichte & Controlling (Firmen-Portal)
// ============================================================================
// Version: 7.4.3-14
// Datum: 09. Maerz 2026
//
// v7.4.3-14: BUGFIX: SheetJS CDN-Import durch npm-Package ersetzt
//            - dynamischer CDN-Import crasht Vercel Webpack-Build
//            - Fix: import * as XLSX from 'xlsx' (npm-Package, bereits installiert)
//            - Alle anderen Aenderungen identisch zu v7.4.3-13
// v7.4.3-13: NEU: Personalkosten Excel-Export (Kachel 1)
//            - Kachel "Personalkosten" jetzt aktiv (gruen)
//            - Excel-Download direkt aus dem Browser (SheetJS)
//            - Tab 1 "Personalkosten": Pro MA: Lfd.Nr, Name, Qualifikation,
//              Jahresgehalt, pWAZ, Stundensatz, Geplante PM, Erfasste h,
//              Erfasste PM, Personalkosten bisher, Geplante Gesamtkosten
//            - Tab 2 "Jahresscheiben": Anlage-5-Tabelle: MA x Projektjahre
//              mit PM pro Jahr und Personalkosten gesamt
//            - Dateiname: Personalkosten_[ProjektName]_[Datum].xlsx
//            - Neuer State: projectAssignments (hourly_rate, employee_number,
//              annual_salary, qualification aus v7_project_assignments + JOIN)
// v7.4.3-12: Stundennachweis-Matrix aktiviert
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
  Users,
  Package,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  XCircle,
  FileSpreadsheet,
  FileText,
  Download,
  Calendar,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Grid3x3,
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

// Fuer die Stundennachweis-Matrix
interface MatrixMonth {
  year: number;
  month: number;
  label: string; // "Jan", "Feb", ...
}

interface MatrixCell {
  employeeId: string;
  year: number;
  month: number;
  hoursRecorded: number;
  status: 'complete' | 'partial' | 'missing' | 'future' | 'outside';
  // outside = Monat liegt ausserhalb der Projekt-Laufzeit fuer diesen MA
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
}

interface WorkPackageAssignment {
  id: string;
  work_package_id: string;
  employee_id: string;
  planned_person_months: number;
}

// Projekt-Zuordnung mit Gehalts- und Stundensatz-Daten (fuer Personalkosten-Export)
interface ProjectAssignment {
  id: string;
  project_id: string;
  employee_id: string;
  employee_number: number | null;
  hourly_rate: number | null;
  role_in_project: string | null;
  // Joined aus v7_employees:
  annual_salary: number | null;
  weekly_hours: number | null;
  qualification: string | null;
}

interface TimesheetEntry {
  id: string;
  project_id: string;
  employee_id: string;
  work_date: string;  // Korrekter Feldname!
  hours: number;
  day_type: string | null;  // 'work', 'vacation', 'sick', etc.
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
  if (['DE-BB', 'DE-HB', 'DE-HH', 'DE-MV', 'DE-NI', 'DE-SN', 'DE-ST', 'DE-SH', 'DE-TH'].includes(stateCode || '')) {
    holidays.set(`${year}-10-31`, 'Reformationstag');
  }
  if (['DE-BW', 'DE-BY', 'DE-NW', 'DE-RP', 'DE-SL'].includes(stateCode || '')) {
    holidays.set(`${year}-11-01`, 'Allerheiligen');
  }

  return holidays;
};

const formatPM = (pm: number): string => {
  return pm.toFixed(1).replace('.', ',');
};

const getMonthName = (month: number): string => {
  const months = ['Januar', 'Februar', 'Maerz', 'April', 'Mai', 'Juni', 
                  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  return months[month - 1];
};

// ============================================================================
// KOMPONENTE
// ============================================================================

export default function BerichtePage() {
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
  const [projectAssignments, setProjectAssignments] = useState<ProjectAssignment[]>([]);
  const [exportLoading, setExportLoading] = useState(false);
  
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showMatrix, setShowMatrix] = useState(false);
  const [matrixProjectId, setMatrixProjectId] = useState<string | null>(null);
  
  const holidays = useMemo(() => {
    if (!company?.federal_state) return new Map<string, string>();
    return getGermanHolidays(selectedYear, company.federal_state);
  }, [selectedYear, company?.federal_state]);

  // ============================================================================
  // DATEN LADEN
  // ============================================================================
  
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/v7/login');
          return;
        }
        
        // User-Profil
        const { data: profile, error: profileError } = await supabase
          .from('v7_user_profiles')
          .select('id, email, display_name, role, client_company_id')
          .eq('email', user.email)
          .maybeSingle();
        
        if (profileError) {
          console.error('Profil-Fehler:', profileError);
          setError('Fehler beim Laden des Benutzerprofils');
          return;
        }
        
        if (!profile) {
          setError('Kein Benutzerprofil gefunden');
          return;
        }
        
        if (!profile.client_company_id) {
          setError('Keine Firma zugeordnet. Bitte melden Sie sich mit einem Firmen-Account an.');
          return;
        }
        
        setUserProfile(profile);
        const companyId = profile.client_company_id;
        
        // Company
        const { data: companyData, error: companyError } = await supabase
          .from('v7_client_companies')
          .select('id, name, federal_state')
          .eq('id', companyId)
          .single();
        
        if (companyError || !companyData) {
          console.error('Firma-Fehler:', companyError);
          setError('Firma nicht gefunden');
          return;
        }
        setCompany(companyData);
        
        // Projekte - KORREKTER FELDNAME: client_company_id
        const { data: projectsData, error: projectsError } = await supabase
          .from('v7_projects')
          .select('id, name, short_name, funding_format, funding_reference, start_date, end_date, is_active')
          .eq('client_company_id', companyId)
          .eq('is_active', true);
        
        if (projectsError) {
          console.error('Projekte-Fehler:', projectsError);
        }
        console.log('Projekte geladen:', projectsData?.length || 0);
        setProjects(projectsData || []);
        
        // Mitarbeiter - KORREKTER FELDNAME: client_company_id
        const { data: employeesData, error: employeesError } = await supabase
          .from('v7_employees')
          .select('id, display_name, first_name, last_name, user_id, portal_role')
          .eq('client_company_id', companyId)
          .eq('is_active', true);
        
        if (employeesError) {
          console.error('MA-Fehler:', employeesError);
        }
        console.log('Mitarbeiter geladen:', employeesData?.length || 0);
        setEmployees(employeesData || []);
        
        // Portal-Rolle des eingeloggten Users bestimmen
        const myEmployee = (employeesData || []).find(
          (emp: any) => emp.user_id === user.id
        );
        if (profile.role === 'client_admin') {
          setPortalRole('client_admin');
        } else if (myEmployee?.portal_role) {
          setPortalRole(myEmployee.portal_role);
        } else {
          setPortalRole('employee');
        }
        
        // Arbeitspakete
        const projectIds = (projectsData || []).map(p => p.id);
        if (projectIds.length > 0) {
          const { data: wpData, error: wpError } = await supabase
            .from('v7_work_packages')
            .select('id, project_id, ap_number, ap_code, name, total_person_months')
            .in('project_id', projectIds)
            .eq('is_active', true);
          
          if (wpError) {
            console.error('WP-Fehler:', wpError);
          }
          console.log('Arbeitspakete geladen:', wpData?.length || 0);
          setWorkPackages(wpData || []);
        
          // AP-Zuordnungen mit geplanten PM
          if (wpData && wpData.length > 0) {
            const wpIds = wpData.map((wp: any) => wp.id);
            const { data: wpaData, error: wpaError } = await supabase
              .from('v7_work_package_assignments')
              .select('id, work_package_id, employee_id, planned_person_months')
              .in('work_package_id', wpIds)
              .eq('is_active', true);
            
            if (wpaError) {
              console.error('WP-Assignment-Fehler:', wpaError);
            }
            console.log('AP-Zuordnungen geladen:', wpaData?.length || 0);
            setWpAssignments(wpaData || []);
          }
        }
        
        // Zeiterfassung - KORREKTER FELDNAME: work_date (nicht date)
        // FIX v7.4.3: is_active=true (keine geloeschten Eintraege) + is_billable fuer PM-Berechnung
        if (projectIds.length > 0) {
          const { data: timesheetData, error: timesheetError } = await supabase
            .from('v7_timesheets')
            .select('id, project_id, employee_id, work_date, hours, day_type, is_active, is_billable')
            .in('project_id', projectIds)
            .eq('is_active', true);
          
          if (timesheetError) {
            console.error('Timesheet-Fehler:', timesheetError);
          }
          console.log('Zeiteintraege geladen:', timesheetData?.length || 0);
          setTimesheets(timesheetData || []);
        }

        // Projekt-Zuordnungen mit Gehalts-Daten (fuer Personalkosten-Export)
        // JOIN ueber v7_employees fuer annual_salary, weekly_hours, qualification
        if (projectIds.length > 0) {
          const { data: paData, error: paError } = await supabase
            .from('v7_project_assignments')
            .select(`
              id,
              project_id,
              employee_id,
              employee_number,
              hourly_rate,
              role_in_project,
              v7_employees!inner(annual_salary, weekly_hours, qualification)
            `)
            .in('project_id', projectIds)
            .eq('is_active', true);

          if (paError) {
            console.error('PA-Fehler:', paError);
          }

          const paFlat: ProjectAssignment[] = (paData || []).map((pa: any) => ({
            id: pa.id,
            project_id: pa.project_id,
            employee_id: pa.employee_id,
            employee_number: pa.employee_number,
            hourly_rate: pa.hourly_rate,
            role_in_project: pa.role_in_project,
            annual_salary: pa.v7_employees?.annual_salary ?? null,
            weekly_hours: pa.v7_employees?.weekly_hours ?? null,
            qualification: pa.v7_employees?.qualification ?? null,
          }));
          setProjectAssignments(paFlat);
        }
        
      } catch (err: any) {
        console.error('Allgemeiner Fehler:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [router, supabase]);

  // ============================================================================
  // BERECHNUNGEN
  // ============================================================================
  
  const stats = useMemo(() => {
    const totalPlannedPM = workPackages.reduce((sum, wp) => sum + (wp.total_person_months || 0), 0);
    
    // Nur foerderbare Arbeitsstunden zaehlen (is_billable=true)
    const totalHours = timesheets
      .filter(t => t.is_billable === true)
      .reduce((sum, t) => sum + (t.hours || 0), 0);
    const totalActualPM = totalHours / HOURS_PER_PM;
    
    const uniqueEmployeesInProjects = new Set(wpAssignments.map(a => a.employee_id)).size;
    
    return {
      projectCount: projects.length,
      employeeCount: uniqueEmployeesInProjects,
      workPackageCount: workPackages.length,
      totalPlannedPM,
      totalActualPM,
      progressPercent: totalPlannedPM > 0 ? (totalActualPM / totalPlannedPM) * 100 : 0,
    };
  }, [projects, workPackages, timesheets, wpAssignments]);

  const projectStats: ProjectStats[] = useMemo(() => {
    return projects.map(project => {
      const projectWPs = workPackages.filter(wp => wp.project_id === project.id);
      const plannedPM = projectWPs.reduce((sum, wp) => sum + (wp.total_person_months || 0), 0);
      
      const projectTimesheets = timesheets.filter(t => 
        t.project_id === project.id && 
        t.is_billable === true
      );
      const actualHours = projectTimesheets.reduce((sum, t) => sum + (t.hours || 0), 0);
      const actualPM = actualHours / HOURS_PER_PM;
      
      const progressPercent = plannedPM > 0 ? (actualPM / plannedPM) * 100 : 0;
      
      // Zeitfortschritt berechnen
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
      
      // Status basierend auf Differenz Zeitfortschritt vs Erfassungsgrad
      let status: 'on-track' | 'warning' | 'critical' = 'on-track';
      if (progressPercent > 110) {
        status = 'critical';
      } else if (timeProgressPercent - progressPercent > 25) {
        status = 'warning';
      }
      
      return { project, plannedPM, actualPM, progressPercent, timeProgressPercent, status };
    });
  }, [projects, workPackages, timesheets]);

  const employeeTimesheetStatus: EmployeeTimesheetStatus[] = useMemo(() => {
    const employeesInProjects = employees.filter(emp => 
      wpAssignments.some(a => a.employee_id === emp.id)
    );
    
    // Projekt-Gesamtzeitraum fuer Zeitfortschritt
    let projectStart: string | null = null;
    let projectEnd: string | null = null;
    workPackages.forEach(wp => {
      if (wp.start_date && (!projectStart || wp.start_date < projectStart)) projectStart = wp.start_date;
      if (wp.end_date && (!projectEnd || wp.end_date > projectEnd)) projectEnd = wp.end_date;
    });
    
    // Zeitfortschritt berechnen
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
      
      // Projekte ueber WP-Zuordnungen ermitteln
      const employeeWpIds = employeeAssignments.map(a => a.work_package_id);
      const employeeProjectIds = [...new Set(
        workPackages
          .filter(wp => employeeWpIds.includes(wp.id))
          .map(wp => wp.project_id)
      )];
      
      const projectNames = projects
        .filter(p => employeeProjectIds.includes(p.id))
        .map(p => p.short_name || p.name);
      
      // Soll-Stunden: Summe geplante PM * 173,33
      const sollPM = employeeAssignments.reduce((sum, a) => sum + (a.planned_person_months || 0), 0);
      const sollHours = sollPM * HOURS_PER_PM;
      
      // Erfasste Stunden: nur billable, gesamtes Projekt
      const erfasstHours = timesheets
        .filter(t => t.employee_id === employee.id && t.is_billable === true)
        .reduce((sum, t) => sum + (t.hours || 0), 0);
      
      const offenHours = sollHours - erfasstHours;
      const progressPercent = sollHours > 0 ? (erfasstHours / sollHours) * 100 : 0;
      
      // Ampel-Status: Vergleich Zeitfortschritt vs Erfassungsgrad
      let budgetStatus: 'on-track' | 'warning' | 'exceeded' = 'on-track';
      if (offenHours < 0) {
        budgetStatus = 'exceeded';
      } else if (timeProgress - progressPercent > 25) {
        budgetStatus = 'warning';
      }
      
      return {
        employee,
        projects: projectNames,
        sollHours,
        erfasstHours,
        offenHours,
        progressPercent,
        budgetStatus,
      };
    });
  }, [employees, wpAssignments, projects, timesheets, workPackages]);

  // ============================================================================
  // STUNDENNACHWEIS-MATRIX BERECHNUNG
  // ============================================================================

  // Monatskuerzel
  const MONTH_SHORT = ['Jan','Feb','Mrz','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];

  const matrixData = useMemo(() => {
    const projectId = matrixProjectId || (projects.length > 0 ? projects[0].id : null);
    if (!projectId) return null;

    const project = projects.find(p => p.id === projectId);
    if (!project || !project.start_date || !project.end_date) return null;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    // Alle Projektmonate berechnen
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
        months.push({ year: y, month: m, label: MONTH_SHORT[m - 1] });
      }
    }

    // Jahre fuer Gruppierung
    const years = [...new Set(months.map(m => m.year))];

    // MA die im Projekt sind (ueber v7_project_assignments Logik: WP-Zuordnungen)
    const projectWPs = workPackages.filter(wp => wp.project_id === projectId);
    const projectWPIds = projectWPs.map(wp => wp.id);
    const assignedEmployeeIds = [...new Set(
      wpAssignments
        .filter(a => projectWPIds.includes(a.work_package_id))
        .map(a => a.employee_id)
    )];
    const matrixEmployees = employees
      .filter(e => assignedEmployeeIds.includes(e.id));

    // Feiertage fuer relevante Jahre berechnen
    const holidaysByYear: Record<number, Map<string, string>> = {};
    years.forEach(y => {
      holidaysByYear[y] = getGermanHolidays(y, company?.federal_state || '');
    });

    // Zellen berechnen
    const cells: MatrixCell[] = [];
    matrixEmployees.forEach(emp => {
      months.forEach(({ year, month }) => {
        const isFuture = year > currentYear || (year === currentYear && month > currentMonth);

        const monthTimesheets = timesheets.filter(t => {
          if (t.project_id !== projectId) return false;
          if (t.employee_id !== emp.id) return false;
          const d = new Date(t.work_date);
          return d.getFullYear() === year && d.getMonth() + 1 === month;
        });

        const hoursRecorded = monthTimesheets.reduce((sum, t) => sum + (t.hours || 0), 0);
        const workingDays = getWorkingDaysInMonth(year, month, holidaysByYear[year] || new Map());
        const daysRecorded = new Set(
          monthTimesheets.filter(t => (t.hours || 0) > 0).map(t => t.work_date)
        ).size;

        let status: MatrixCell['status'] = 'missing';
        if (isFuture) {
          status = 'future';
        } else if (hoursRecorded > 0 && daysRecorded >= workingDays) {
          status = 'complete';
        } else if (hoursRecorded > 0) {
          status = 'partial';
        } else {
          status = 'missing';
        }

        cells.push({ employeeId: emp.id, year, month, hoursRecorded, status });
      });
    });

    return { project, months, years, employees: matrixEmployees, cells };
  }, [matrixProjectId, projects, workPackages, wpAssignments, employees, timesheets, company]);

  // ============================================================================
  // PERSONALKOSTEN EXCEL-EXPORT
  // ============================================================================

  const handlePersonalkostenExport = async (exportProjectId?: string) => {
    const projectId = exportProjectId || (projects.length > 0 ? projects[0].id : null);
    if (!projectId) return;

    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    setExportLoading(true);
    try {
      // XLSX-Export ohne externe Bibliothek: SpreadsheetML (XML) Format
      // wird von Excel, LibreOffice und Google Sheets nativ geoeffnet

      // --- Datenbasis ---
      const projectWPs = workPackages.filter(wp => wp.project_id === projectId);
      const projectWPIds = projectWPs.map(wp => wp.id);
      const projectWPAs = wpAssignments.filter(a => projectWPIds.includes(a.work_package_id));

      const assignedEmpIds = [...new Set(projectWPAs.map(a => a.employee_id))];
      const projectPAs = projectAssignments.filter(
        pa => pa.project_id === projectId && assignedEmpIds.includes(pa.employee_id)
      );

      const sortedPAs = [...projectPAs].sort((a, b) => {
        if (a.employee_number !== null && b.employee_number !== null) {
          return a.employee_number - b.employee_number;
        }
        if (a.employee_number !== null) return -1;
        if (b.employee_number !== null) return 1;
        const nameA = employees.find(e => e.id === a.employee_id)?.display_name || '';
        const nameB = employees.find(e => e.id === b.employee_id)?.display_name || '';
        return nameA.localeCompare(nameB, 'de');
      });

      const pStart = project.start_date ? new Date(project.start_date) : null;
      const pEnd = project.end_date ? new Date(project.end_date) : null;
      const startYear = pStart ? pStart.getFullYear() : new Date().getFullYear();
      const endYear = pEnd ? pEnd.getFullYear() : startYear;
      const projectYears: number[] = [];
      for (let y = startYear; y <= endYear; y++) projectYears.push(y);

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
          totalPM += wpa.planned_person_months * (Math.max(0, overlapDuration) / apDuration);
        });
        return totalPM;
      };

      const fmt = (v: number) => Math.round(v * 100) / 100;
      const today = new Date().toLocaleDateString('de-DE');

      // Hilfsfunktion: XML-Sonderzeichen escapen
      const esc = (s: string) => String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

      // SpreadsheetML-Zelle erzeugen
      const cell = (val: any, bold = false, bg = ''): string => {
        const styleAttr = (bold || bg)
          ? ` ss:StyleID="${bold && bg ? 'hdrBg' : bold ? 'hdr' : 'bg'}"`
          : '';
        if (val === null || val === undefined || val === '') {
          return `<Cell${styleAttr}><Data ss:Type="String"></Data></Cell>`;
        }
        if (typeof val === 'number') {
          return `<Cell${styleAttr}><Data ss:Type="Number">${val}</Data></Cell>`;
        }
        return `<Cell${styleAttr}><Data ss:Type="String">${esc(String(val))}</Data></Cell>`;
      };
      const row = (...cells: string[]) => `<Row>${cells.join('')}</Row>`;
      const emptyRow = () => '<Row></Row>';

      // ---------------------------------------------------------------
      // Worksheet 1: Personalkosten Uebersicht
      // ---------------------------------------------------------------
      const ws1Headers = [
        'Lfd.Nr.', 'Name', 'Qualifikation',
        'Jahresgehalt (EUR)', 'pWAZ (Std/Woche)', 'Stundensatz (EUR/h)',
        'Geplante PM', 'Erfasste Stunden', 'Erfasste PM',
        'Personalkosten bisher (EUR)', 'Geplante Gesamtkosten (EUR)',
      ];

      let sumGeplantePM = 0, sumErfassteH = 0, sumErfasstePM = 0;
      let sumKostenBisher = 0, sumKostenGesamt = 0;

      const ws1DataRows: string[] = [];
      sortedPAs.forEach((pa, idx) => {
        const emp = employees.find(e => e.id === pa.employee_id);
        const empName = emp?.display_name || '-';
        const geplantePM = projectWPAs
          .filter(a => a.employee_id === pa.employee_id)
          .reduce((s, a) => s + (a.planned_person_months || 0), 0);
        const erfassteH = timesheets
          .filter(t => t.project_id === projectId && t.employee_id === pa.employee_id && t.is_billable)
          .reduce((s, t) => s + (t.hours || 0), 0);
        const erfasstePM = erfassteH / HOURS_PER_PM;
        const stundensatz = pa.hourly_rate || 0;
        const kostenBisher = erfassteH * stundensatz;
        const kostenGesamt = geplantePM * HOURS_PER_PM * stundensatz;

        sumGeplantePM += geplantePM; sumErfassteH += erfassteH;
        sumErfasstePM += erfasstePM; sumKostenBisher += kostenBisher;
        sumKostenGesamt += kostenGesamt;

        ws1DataRows.push(row(
          cell(pa.employee_number ?? (idx + 1)),
          cell(empName),
          cell(pa.qualification || '-'),
          cell(pa.annual_salary ?? '-'),
          cell(pa.weekly_hours ?? '-'),
          cell(stundensatz > 0 ? stundensatz : '-'),
          cell(fmt(geplantePM)),
          cell(fmt(erfassteH)),
          cell(fmt(erfasstePM)),
          cell(fmt(kostenBisher)),
          cell(fmt(kostenGesamt)),
        ));
      });

      const ws1 = `
        <Worksheet ss:Name="Personalkosten">
          <Table>
            ${row(cell(`Personalkosten - ${project.name}`, true))}
            ${row(cell(`Foerderkennzeichen: ${project.funding_reference || '-'}`))}
            ${row(cell(`Laufzeit: ${pStart ? pStart.toLocaleDateString('de-DE') : '-'} bis ${pEnd ? pEnd.toLocaleDateString('de-DE') : '-'}`))}
            ${row(cell(`Erstellt am: ${today}`))}
            ${emptyRow()}
            ${row(...ws1Headers.map(h => cell(h, true)))}
            ${ws1DataRows.join('\n')}
            ${emptyRow()}
            ${row(
              cell(''), cell('SUMME', true), cell(''), cell(''), cell(''), cell(''),
              cell(fmt(sumGeplantePM), true),
              cell(fmt(sumErfassteH), true),
              cell(fmt(sumErfasstePM), true),
              cell(fmt(sumKostenBisher), true),
              cell(fmt(sumKostenGesamt), true),
            )}
            ${emptyRow()}
            ${row(cell('Hinweis: Personalkosten bisher = Erfasste Stunden (foerderbar) x Stundensatz'))}
            ${row(cell('Geplante Gesamtkosten = Geplante PM x 173,33 h/PM x Stundensatz'))}
          </Table>
        </Worksheet>`;

      // ---------------------------------------------------------------
      // Worksheet 2: Jahresscheiben (Anlage 5)
      // ---------------------------------------------------------------
      const yearHeaders = projectYears.map((y, i) => `Jahr ${i + 1} (${y}) [PM]`);
      const ws2Headers = [
        'Lfd.Nr.', 'Name', 'Qualifikation', 'Stundensatz (EUR/h)',
        ...yearHeaders, 'Gesamt [PM]', 'Personalkosten gesamt (EUR)',
      ];

      const sumJahresPMs: number[] = projectYears.map(() => 0);
      let sumGesamtPM2 = 0, sumGesamtKosten2 = 0;
      const ws2DataRows: string[] = [];

      sortedPAs.forEach((pa, idx) => {
        const emp = employees.find(e => e.id === pa.employee_id);
        const empName = emp?.display_name || '-';
        const stundensatz = pa.hourly_rate || 0;
        const yearPMs = projectYears.map(y => fmt(getPMForYear(pa.employee_id, y)));
        const gesamtPM = yearPMs.reduce((s, v) => s + v, 0);
        const gesamtKosten = fmt(gesamtPM * HOURS_PER_PM * stundensatz);

        yearPMs.forEach((pm, i) => { sumJahresPMs[i] += pm; });
        sumGesamtPM2 += gesamtPM;
        sumGesamtKosten2 += gesamtKosten;

        ws2DataRows.push(row(
          cell(pa.employee_number ?? (idx + 1)),
          cell(empName),
          cell(pa.qualification || '-'),
          cell(stundensatz > 0 ? stundensatz : '-'),
          ...yearPMs.map(pm => cell(pm)),
          cell(fmt(gesamtPM)),
          cell(fmt(gesamtKosten)),
        ));
      });

      const ws2 = `
        <Worksheet ss:Name="Jahresscheiben (Anlage 5)">
          <Table>
            ${row(cell(`Jahresscheiben (Anlage 5) - ${project.name}`, true))}
            ${row(cell(`Foerderkennzeichen: ${project.funding_reference || '-'}`))}
            ${row(cell(`Erstellt am: ${today}`))}
            ${emptyRow()}
            ${row(...ws2Headers.map(h => cell(h, true)))}
            ${ws2DataRows.join('\n')}
            ${emptyRow()}
            ${row(
              cell(''), cell('SUMME', true), cell(''), cell(''),
              ...sumJahresPMs.map(v => cell(fmt(v), true)),
              cell(fmt(sumGesamtPM2), true),
              cell(fmt(sumGesamtKosten2), true),
            )}
            ${emptyRow()}
            ${row(cell('Hinweis: 1 PM = 173,33 Stunden (40h/Woche x 52 Wochen / 12 Monate)'))}
            ${row(cell('Jahresscheiben werden aus AP-Zeitraeumen anteilig berechnet'))}
          </Table>
        </Worksheet>`;

      // ---------------------------------------------------------------
      // Workbook zusammenbauen und als .xls (SpreadsheetML) herunterladen
      // ---------------------------------------------------------------
      const workbook = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:x="urn:schemas-microsoft-com:office:excel">
  <Styles>
    <Style ss:ID="hdr">
      <Font ss:Bold="1"/>
    </Style>
    <Style ss:ID="hdrBg">
      <Font ss:Bold="1"/>
      <Interior ss:Color="#DBEAFE" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="bg">
      <Interior ss:Color="#DBEAFE" ss:Pattern="Solid"/>
    </Style>
  </Styles>
  ${ws1}
  ${ws2}
</Workbook>`;

      const blob = new Blob([workbook], {
        type: 'application/vnd.ms-excel;charset=utf-8',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const safeName = (project.short_name || project.name).replace(/[^a-zA-Z0-9_\-]/g, '_');
      a.href = url;
      a.download = `Personalkosten_${safeName}_${dateStr}.xls`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

    } catch (err: any) {
      console.error('Export-Fehler:', err);
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
        <PortalHeader 
          portal="firma" 
          companyName="" 
          userName=""
          userRole={portalRole === "client_admin" ? "client_admin" : "client_user"}
        />
        <PortalNav portal="firma" userRole={portalRole === "client_admin" ? "client_admin" : "client_user"} portalRole={portalRole} />
        <main className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="w-10 h-10 border-4 border-green-200 border-t-green-600 rounded-full animate-spin"></div>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PortalHeader 
          portal="firma" 
          companyName="" 
          userName=""
          userRole={portalRole === "client_admin" ? "client_admin" : "client_user"}
        />
        <PortalNav portal="firma" userRole={portalRole === "client_admin" ? "client_admin" : "client_user"} portalRole={portalRole} />
        <main className="max-w-7xl mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-700">{error}</p>
            <p className="text-sm text-red-600 mt-2">
              Tipp: Loggen Sie sich als Firmen-Benutzer ein (z.B. Thomas Duehrkop bei AS System).
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PortalHeader 
        portal="firma" 
        companyName={company?.name || ''} 
        userName={userProfile?.display_name || ''}
        userRole={portalRole === "client_admin" ? "client_admin" : "client_user"}
        portalRole={portalRole as any}
      />
      <PortalNav portal="firma" userRole={portalRole === "client_admin" ? "client_admin" : "client_user"} portalRole={portalRole} />
      
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Berichte & Controlling</h1>
          <p className="text-gray-600 mt-1">Uebersicht ueber Projekte, Kosten und Zeiterfassung</p>
        </div>

        {/* Kennzahlen */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Foerderprojekte</p>
                <p className="text-3xl font-bold text-green-600">{stats.projectCount}</p>
                <p className="text-xs text-gray-400 mt-1">aktiv</p>
              </div>
              <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                <FolderKanban className="w-6 h-6 text-green-600" />
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
                <p className="text-xs text-gray-400 mt-1">
                  {stats.progressPercent.toFixed(0)}% von Plan
                </p>
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
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      Keine Projekte vorhanden
                    </td>
                  </tr>
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
                      <td className="px-6 py-4 text-right font-medium text-gray-900">
                        {formatPM(ps.plannedPM)}
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-gray-900">
                        {formatPM(ps.actualPM)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 min-w-[140px]">
                            {/* Erfassungsfortschritt */}
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs text-gray-500 w-14">Erfasst</span>
                              <div className="flex-1 bg-gray-200 rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full ${
                                    ps.status === 'critical' ? 'bg-red-500' :
                                    ps.status === 'warning' ? 'bg-orange-400' :
                                    'bg-green-500'
                                  }`}
                                  style={{ width: `${Math.min(100, ps.progressPercent)}%` }}
                                />
                              </div>
                              <span className="text-xs font-medium text-gray-700 w-10 text-right">
                                {ps.progressPercent.toFixed(0)}%
                              </span>
                            </div>
                            {/* Zeitfortschritt */}
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500 w-14">Laufzeit</span>
                              <div className="flex-1 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="h-2 rounded-full bg-blue-400"
                                  style={{ width: `${Math.min(100, ps.timeProgressPercent)}%` }}
                                />
                              </div>
                              <span className="text-xs font-medium text-blue-600 w-10 text-right">
                                {ps.timeProgressPercent.toFixed(0)}%
                              </span>
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
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                      Keine Mitarbeiter mit Projektzuordnung
                    </td>
                  </tr>
                ) : (
                  employeeTimesheetStatus.map(ets => {
                    const progressCapped = Math.min(100, ets.progressPercent);
                    const barColor = ets.budgetStatus === 'exceeded' ? 'bg-red-500' 
                      : ets.budgetStatus === 'warning' ? 'bg-orange-400' 
                      : 'bg-green-500';
                    const offenColor = ets.offenHours < 0 ? 'text-red-600' : 'text-green-700';

                    return (
                    <tr key={ets.employee.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {ets.employee.display_name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {ets.projects.join(', ') || '-'}
                      </td>
                      <td className="px-6 py-4 text-right text-gray-700 tabular-nums">
                        {ets.sollHours > 0 ? Math.round(ets.sollHours).toLocaleString('de-DE') : '-'}
                      </td>
                      <td className={`px-6 py-4 text-right tabular-nums font-medium ${
                        ets.budgetStatus === 'warning' ? 'bg-orange-50' : ''
                      }`}>
                        {ets.erfasstHours > 0 ? Math.round(ets.erfasstHours).toLocaleString('de-DE') : '-'}
                      </td>
                      <td className={`px-6 py-4 text-right tabular-nums font-medium ${offenColor}`}>
                        {ets.sollHours > 0 ? Math.round(ets.offenHours).toLocaleString('de-DE') : '-'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 bg-gray-200 rounded-full h-2.5">
                            <div
                              className={`h-2.5 rounded-full ${barColor}`}
                              style={{ width: `${progressCapped}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-700 w-12 text-right">
                            {Math.round(ets.progressPercent)}%
                          </span>
                          {ets.budgetStatus === 'exceeded' && (
                            <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                          )}
                          {ets.budgetStatus === 'warning' && (
                            <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0" />
                          )}
                          {ets.budgetStatus === 'on-track' && ets.erfasstHours > 0 && (
                            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => {
                            router.push(`/v7/firma/zeiterfassung?employee=${ets.employee.id}`);
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                          title={`Zeiterfassung fuer ${ets.employee.display_name} oeffnen`}
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
              <button
                onClick={() => handlePersonalkostenExport()}
                disabled={exportLoading || projects.length === 0}
                className={`flex flex-col items-center p-6 border-2 rounded-lg transition-colors ${
                  projects.length === 0
                    ? 'border-dashed border-gray-300 text-gray-400 cursor-not-allowed'
                    : 'border-green-400 text-green-700 bg-green-50 hover:bg-green-100 cursor-pointer'
                }`}
              >
                <FileSpreadsheet className="w-10 h-10 mb-3" />
                <span className="font-medium">Personalkosten</span>
                <span className="text-xs mt-1">Excel-Export</span>
                <span className={`text-xs mt-2 px-2 py-0.5 rounded flex items-center gap-1 ${
                  exportLoading
                    ? 'bg-yellow-100 text-yellow-700'
                    : projects.length === 0
                      ? 'bg-gray-100 text-gray-500'
                      : 'bg-green-200 text-green-800'
                }`}>
                  {exportLoading ? 'Wird erstellt...' : 'Download'}
                </span>
              </button>

              {/* Kachel 2: Stundennachweis - AKTIV */}
              <button
                onClick={() => {
                  if (projects.length > 0 && !matrixProjectId) {
                    setMatrixProjectId(projects[0].id);
                  }
                  setShowMatrix(prev => !prev);
                }}
                className="flex flex-col items-center p-6 border-2 border-green-400 rounded-lg text-green-700 bg-green-50 hover:bg-green-100 transition-colors cursor-pointer"
              >
                <Grid3x3 className="w-10 h-10 mb-3" />
                <span className="font-medium">Stundennachweis</span>
                <span className="text-xs mt-1">Matrix-Uebersicht</span>
                <span className="text-xs mt-2 bg-green-200 text-green-800 px-2 py-0.5 rounded flex items-center gap-1">
                  {showMatrix ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                  {showMatrix ? 'Schliessen' : 'Oeffnen'}
                </span>
              </button>

              {/* Kachel 3: Projektfortschritt - noch deaktiviert */}
              <button disabled className="flex flex-col items-center p-6 border-2 border-dashed border-gray-300 rounded-lg text-gray-400 cursor-not-allowed">
                <BarChart3 className="w-10 h-10 mb-3" />
                <span className="font-medium">Projekt-Fortschritt</span>
                <span className="text-xs mt-1">Grafische Auswertung</span>
                <span className="text-xs mt-2 bg-gray-100 px-2 py-0.5 rounded">Demnaechst</span>
              </button>

              {/* Kachel 4: Zahlungsanforderung - noch deaktiviert */}
              <button disabled className="flex flex-col items-center p-6 border-2 border-dashed border-gray-300 rounded-lg text-gray-400 cursor-not-allowed">
                <Download className="w-10 h-10 mb-3" />
                <span className="font-medium">Zahlungsanforderung</span>
                <span className="text-xs mt-1">Mittelabruf (Quartal)</span>
                <span className="text-xs mt-2 bg-gray-100 px-2 py-0.5 rounded">Demnaechst</span>
              </button>
            </div>

            {/* Stundennachweis-Matrix (aufklappbar) */}
            {showMatrix && (
              <div className="mt-6 border border-gray-200 rounded-lg overflow-hidden">

                {/* Matrix-Header: Projekt-Auswahl (falls mehrere Projekte) */}
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Grid3x3 className="w-5 h-5 text-green-600" />
                    <span className="font-medium text-gray-900">Stundennachweis-Matrix</span>
                    {projects.length > 1 && (
                      <select
                        value={matrixProjectId || projects[0]?.id || ''}
                        onChange={e => setMatrixProjectId(e.target.value)}
                        className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-green-500"
                      >
                        {projects.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.short_name || p.name}
                          </option>
                        ))}
                      </select>
                    )}
                    {projects.length === 1 && (
                      <span className="text-sm text-gray-600">
                        {projects[0].short_name || projects[0].name}
                      </span>
                    )}
                  </div>
                  {/* Legende */}
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded-sm bg-green-500 inline-block"></span>
                      Vollstaendig
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded-sm bg-orange-400 inline-block"></span>
                      Teilweise
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded-sm bg-red-400 inline-block"></span>
                      Fehlt
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded-sm bg-gray-200 inline-block"></span>
                      Zukunft
                    </span>
                  </div>
                </div>

                {/* Matrix-Tabelle */}
                {!matrixData ? (
                  <div className="p-8 text-center text-gray-500">
                    Keine Projektdaten verfuegbar (Projekt benoetigt Start- und Enddatum).
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-xs">
                      <thead>
                        {/* Jahres-Gruppen-Header */}
                        <tr className="bg-gray-100 border-b border-gray-200">
                          <th className="px-3 py-2 text-left font-semibold text-gray-600 w-40 sticky left-0 bg-gray-100 z-10">
                            Mitarbeiter
                          </th>
                          {matrixData.years.map(year => {
                            const monthsInYear = matrixData.months.filter(m => m.year === year);
                            return (
                              <th
                                key={year}
                                colSpan={monthsInYear.length}
                                className="px-2 py-2 text-center font-bold text-gray-700 border-l border-gray-300"
                              >
                                Jahr {year - matrixData.years[0] + 1} ({year})
                              </th>
                            );
                          })}
                        </tr>
                        {/* Monats-Header */}
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="px-3 py-2 sticky left-0 bg-gray-50 z-10"></th>
                          {matrixData.months.map(({ year, month, label }) => {
                            const now = new Date();
                            const isCurrent = year === now.getFullYear() && month === now.getMonth() + 1;
                            return (
                              <th
                                key={`${year}-${month}`}
                                className={`px-1 py-2 text-center font-medium w-10 border-l border-gray-200 ${
                                  isCurrent ? 'text-green-700 bg-green-50' : 'text-gray-500'
                                }`}
                              >
                                {label}
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {matrixData.employees.map((emp, empIdx) => (
                          <tr
                            key={emp.id}
                            className={empIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                          >
                            {/* MA-Name sticky links */}
                            <td className={`px-3 py-2 font-medium text-gray-800 sticky left-0 z-10 ${
                              empIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                            }`}>
                              {emp.display_name}
                            </td>
                            {/* Monatszellen */}
                            {matrixData.months.map(({ year, month }) => {
                              const cell = matrixData.cells.find(
                                c => c.employeeId === emp.id && c.year === year && c.month === month
                              );
                              const status = cell?.status || 'future';
                              const hours = cell?.hoursRecorded || 0;

                              // Farben pro Status
                              const colorMap: Record<string, string> = {
                                complete: 'bg-green-500 hover:bg-green-600 cursor-pointer',
                                partial:  'bg-orange-400 hover:bg-orange-500 cursor-pointer',
                                missing:  'bg-red-400 hover:bg-red-500 cursor-pointer',
                                future:   'bg-gray-200 cursor-default',
                                outside:  'bg-gray-100 cursor-default',
                              };
                              const colorClass = colorMap[status] || 'bg-gray-100';
                              const isClickable = status !== 'future' && status !== 'outside';

                              // Tooltip-Text
                              const monthName = ['Januar','Februar','Maerz','April','Mai','Juni',
                                'Juli','August','September','Oktober','November','Dezember'][month - 1];
                              const tooltip = status === 'future'
                                ? `${monthName} ${year}: Noch nicht erfasst`
                                : status === 'complete'
                                  ? `${monthName} ${year}: ${hours.toFixed(1)}h - Vollstaendig`
                                  : status === 'partial'
                                    ? `${monthName} ${year}: ${hours.toFixed(1)}h - In Bearbeitung`
                                    : `${monthName} ${year}: Keine Erfassung`;

                              return (
                                <td
                                  key={`${year}-${month}`}
                                  className="px-1 py-2 text-center border-l border-gray-100"
                                  title={tooltip}
                                >
                                  <div
                                    className={`w-8 h-7 mx-auto rounded flex items-center justify-center text-white font-bold transition-colors ${colorClass}`}
                                    onClick={() => {
                                      if (!isClickable) return;
                                      // Finde employee_id fuer URL-Parameter
                                      const returnUrl = encodeURIComponent('/v7/firma/berichte');
                                      router.push(
                                        `/v7/firma/zeiterfassung?employee=${emp.id}&year=${year}&month=${month}&returnUrl=${returnUrl}`
                                      );
                                    }}
                                  >
                                    {status === 'complete' && <CheckCircle size={14} />}
                                    {status === 'partial' && <AlertTriangle size={14} />}
                                    {status === 'missing' && <XCircle size={14} />}
                                    {status === 'future' && (
                                      <span className="text-gray-400 text-xs">-</span>
                                    )}
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

                {/* Hinweis-Zeile */}
                <div className="bg-gray-50 px-4 py-2 border-t border-gray-200 text-xs text-gray-500">
                  Klick auf eine Zelle oeffnet die Zeiterfassung des Mitarbeiters fuer den jeweiligen Monat.
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      
      <footer className="text-center py-4 text-sm text-gray-500 mt-8">
        Projektzeiterfassung v7.4.3-14 - Firmen-Portal - 2026
      </footer>
    </div>
  );
}
