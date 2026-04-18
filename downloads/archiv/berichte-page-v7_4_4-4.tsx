// src/app/v7/firma/berichte/page.tsx
// ============================================================================
// PZE V7 - Berichte & Controlling (Firmen-Portal)
// ============================================================================
// Version: 7.4.3-18
// Datum: 09. Maerz 2026
//
// v7.4.3-18: Zeitraum-Filter fuer Personalkosten-Export
//            - Kachel klappt Inline-Panel auf (wie Stundennachweis-Matrix)
//            - Von/Bis-Datumsfelder (vorbelegt: Projektstart / heute)
//            - Projekt-Dropdown falls mehrere Projekte vorhanden
//            - Export-Button loest XLSX-Download aus
//            - Timesheets werden nach work_date gefiltert (>= von, <= bis)
//            - Neue State-Variablen: showPKPanel, pkProjectId,
//              pkVon (string YYYY-MM-DD), pkBis (string YYYY-MM-DD)
// v7.4.3-17: Echter XLSX Multi-Sheet Export (xlsx npm-Paket v0.18.5)
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
import * as XLSX from 'xlsx';
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
  foerdersatz: number | null;
  overhead_t: number | null;
  overhead_nt: number | null;
  overhead_gleich: boolean | null;
}

// ZA-Eintrag aus der Datenbank
interface ZahlungsanforderungDB {
  id: string;
  project_id: string;
  za_nummer: number;
  zeitraum_von: string;
  zeitraum_bis: string;
  auftraege_dritte_t: number | null;
  auftraege_dritte_nt: number | null;
  fue_unterauftrag: number | null;
  zeitw_personalaufnahme: number | null;
  status: string;
  notizen: string | null;
}

// ZA-Formular-Zustand (Strings fuer Eingabefelder)
interface ZAFormData {
  za_nummer: string;
  zeitraum_von: string;
  zeitraum_bis: string;
  auftraege_dritte_t: string;
  auftraege_dritte_nt: string;
  fue_unterauftrag: string;
  zeitw_personalaufnahme: string;
  notizen: string;
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

  // Personalkosten-Panel
  const [showPKPanel, setShowPKPanel] = useState(false);
  const [pkProjectId, setPKProjectId] = useState<string>('');
  const [pkVon, setPKVon] = useState<string>('');
  const [pkBis, setPKBis] = useState<string>('');

  // ZA-Panel
  const [showZAPanel, setShowZAPanel] = useState(false);
  const [zaProjectId, setZAProjectId] = useState<string>('');
  const [zaTab, setZATab] = useState<'deckblatt' | 'anlage1a' | 'anlage1b'>('deckblatt');
  const [zaList, setZAList] = useState<ZahlungsanforderungDB[]>([]);
  const [zaFormData, setZAFormData] = useState<ZAFormData>({
    za_nummer: '1',
    zeitraum_von: '',
    zeitraum_bis: '',
    auftraege_dritte_t: '',
    auftraege_dritte_nt: '',
    fue_unterauftrag: '',
    zeitw_personalaufnahme: '',
    notizen: '',
  });
  const [zaSelectedId, setZASelectedId] = useState<string | null>(null);
  const [zaSaving, setZASaving] = useState(false);
  const [zaLoading, setZALoading] = useState(false);
  
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
          .select('id, name, short_name, funding_format, funding_reference, start_date, end_date, is_active, foerdersatz, overhead_t, overhead_nt, overhead_gleich')
          .eq('client_company_id', companyId)
          .eq('is_active', true);
        
        if (projectsError) {
          console.error('Projekte-Fehler:', projectsError);
        }
        console.log('Projekte geladen:', projectsData?.length || 0);
        setProjects(projectsData || []);

        // PK-Panel Standardwerte: erstes Projekt, Von=Projektstart, Bis=heute
        if (projectsData && projectsData.length > 0) {
          const firstProject = projectsData[0];
          setPKProjectId(firstProject.id);
          setPKVon(firstProject.start_date
            ? firstProject.start_date.slice(0, 10)
            : new Date().toISOString().slice(0, 10));
          setPKBis(new Date().toISOString().slice(0, 10));
        }
        
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
            .select('id, project_id, ap_number, ap_code, name, total_person_months, start_date, end_date, is_technical')
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
            .select('id, project_id, employee_id, work_package_id, work_date, hours, day_type, is_active, is_billable')
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

  // Wenn Projekt im Panel wechselt: Von auf Projektstart zuruecksetzen
  const handlePkProjectChange = (newId: string) => {
    setPKProjectId(newId);
    const p = projects.find(pr => pr.id === newId);
    if (p) {
      setPKVon(p.start_date ? p.start_date.slice(0, 10) : '');
      setPKBis(p.end_date ? p.end_date.slice(0, 10) : new Date().toISOString().slice(0, 10));
    }
  };

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
      const projectPAs = projectAssignments.filter(
        pa => pa.project_id === projectId && assignedEmpIds.includes(pa.employee_id)
      );

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
          totalPM += wpa.planned_person_months * (Math.max(0, overlapDuration) / apDuration);
        });
        return totalPM;
      };

      const today = new Date().toLocaleDateString('de-DE');
      const vonLabel = new Date(vonDate).toLocaleDateString('de-DE');
      const bisLabel = new Date(bisDate).toLocaleDateString('de-DE');

      // Timesheets auf Abrechnungszeitraum einschraenken
      const timesheetsInRange = timesheets.filter(t =>
        t.work_date >= vonDate && t.work_date <= bisDate
      );

      // ----------------------------------------------------------------
      // Sheet 1: Personalkosten Uebersicht
      // ----------------------------------------------------------------
      const ws1Data: any[][] = [];
      ws1Data.push([`Personalkosten - ${project.name}`]);
      ws1Data.push([`Foerderkennzeichen: ${project.funding_reference || '-'}`]);
      ws1Data.push([`Abrechnungszeitraum: ${vonLabel} bis ${bisLabel}`]);
      ws1Data.push([`Laufzeit gesamt: ${pStart ? pStart.toLocaleDateString('de-DE') : '-'} bis ${pEnd ? pEnd.toLocaleDateString('de-DE') : '-'}`]);
      ws1Data.push([`Erstellt am: ${today}`]);
      ws1Data.push([]);
      ws1Data.push([
        'Lfd.Nr.', 'Name', 'Qualifikation',
        'Jahresgehalt (EUR)', 'pWAZ (Std/Woche)', 'Stundensatz (EUR/h)',
        'Geplante PM', 'Erfasste Stunden', 'Erfasste PM',
        'Personalkosten im Zeitraum (EUR)', 'Geplante Gesamtkosten (EUR)',
      ]);

      let sumGeplantePM = 0, sumErfassteH = 0, sumErfasstePM = 0;
      let sumKostenBisher = 0, sumKostenGesamt = 0;

      sortedPAs.forEach((pa, idx) => {
        const emp = employees.find(e => e.id === pa.employee_id);
        const empName = emp?.display_name || '-';
        const geplantePM = projectWPAs
          .filter(a => a.employee_id === pa.employee_id)
          .reduce((s, a) => s + (a.planned_person_months || 0), 0);
        const erfassteH = timesheetsInRange
          .filter(t => t.project_id === projectId && t.employee_id === pa.employee_id && t.is_billable)
          .reduce((s, t) => s + (t.hours || 0), 0);
        const erfasstePM = erfassteH / HOURS_PER_PM;
        const stundensatz = pa.hourly_rate || 0;
        const kostenBisher = erfassteH * stundensatz;
        const kostenGesamt = geplantePM * HOURS_PER_PM * stundensatz;

        sumGeplantePM += geplantePM; sumErfassteH += erfassteH;
        sumErfasstePM += erfasstePM; sumKostenBisher += kostenBisher;
        sumKostenGesamt += kostenGesamt;

        ws1Data.push([
          pa.employee_number ?? (idx + 1),
          empName,
          pa.qualification || '-',
          pa.annual_salary ?? null,
          pa.weekly_hours ?? null,
          stundensatz > 0 ? stundensatz : null,
          fmt(geplantePM),
          fmt(erfassteH),
          fmt(erfasstePM),
          fmt(kostenBisher),
          fmt(kostenGesamt),
        ]);
      });

      ws1Data.push([]);
      ws1Data.push([
        null, 'SUMME', null, null, null, null,
        fmt(sumGeplantePM), fmt(sumErfassteH), fmt(sumErfasstePM),
        fmt(sumKostenBisher), fmt(sumKostenGesamt),
      ]);
      ws1Data.push([]);
      ws1Data.push(['Hinweis: Personalkosten im Zeitraum = Erfasste Stunden (foerderbar) x Stundensatz']);
      ws1Data.push(['Geplante Gesamtkosten = Geplante PM (gesamt) x 173,33 h/PM x Stundensatz']);

      const ws1 = XLSX.utils.aoa_to_sheet(ws1Data);
      ws1['!cols'] = [
        { wch: 8 }, { wch: 25 }, { wch: 18 }, { wch: 18 },
        { wch: 16 }, { wch: 18 }, { wch: 12 }, { wch: 16 },
        { wch: 12 }, { wch: 28 }, { wch: 26 },
      ];

      // ----------------------------------------------------------------
      // Sheet 2: Jahresscheiben (Anlage 5)
      // ----------------------------------------------------------------
      const yearHeaders = projectYears.map((y, i) => `Jahr ${i + 1} (${y}) [PM]`);
      const ws2Data: any[][] = [];
      ws2Data.push([`Jahresscheiben (Anlage 5) - ${project.name}`]);
      ws2Data.push([`Foerderkennzeichen: ${project.funding_reference || '-'}`]);
      ws2Data.push([`Abrechnungszeitraum: ${vonLabel} bis ${bisLabel}`]);
      ws2Data.push([`Erstellt am: ${today}`]);
      ws2Data.push([]);
      ws2Data.push([
        'Lfd.Nr.', 'Name', 'Qualifikation', 'Stundensatz (EUR/h)',
        ...yearHeaders, 'Gesamt [PM]', 'Personalkosten gesamt (EUR)',
      ]);

      const sumJahresPMs: number[] = projectYears.map(() => 0);
      let sumGesamtPM2 = 0, sumGesamtKosten2 = 0;

      sortedPAs.forEach((pa, idx) => {
        const emp = employees.find(e => e.id === pa.employee_id);
        const empName = emp?.display_name || '-';
        const stundensatz = pa.hourly_rate || 0;
        const yearPMs = projectYears.map(y => fmt(getPMForYear(pa.employee_id, y)));
        const gesamtPM = fmt(yearPMs.reduce((s, v) => s + v, 0));
        const gesamtKosten = fmt(gesamtPM * HOURS_PER_PM * stundensatz);

        yearPMs.forEach((pm, i) => { sumJahresPMs[i] += pm; });
        sumGesamtPM2 += gesamtPM;
        sumGesamtKosten2 += gesamtKosten;

        ws2Data.push([
          pa.employee_number ?? (idx + 1),
          empName,
          pa.qualification || '-',
          stundensatz > 0 ? stundensatz : null,
          ...yearPMs,
          gesamtPM,
          gesamtKosten,
        ]);
      });

      ws2Data.push([]);
      ws2Data.push([
        null, 'SUMME', null, null,
        ...sumJahresPMs.map(v => fmt(v)),
        fmt(sumGesamtPM2), fmt(sumGesamtKosten2),
      ]);
      ws2Data.push([]);
      ws2Data.push(['Hinweis: 1 PM = 173,33 Stunden (40h/Woche x 52 Wochen / 12 Monate)']);
      ws2Data.push(['Jahresscheiben werden aus AP-Zeitraeumen anteilig berechnet']);

      const ws2 = XLSX.utils.aoa_to_sheet(ws2Data);
      ws2['!cols'] = [
        { wch: 8 }, { wch: 25 }, { wch: 18 }, { wch: 18 },
        ...projectYears.map(() => ({ wch: 18 })),
        { wch: 14 }, { wch: 26 },
      ];

      // ----------------------------------------------------------------
      // Workbook herunterladen
      // ----------------------------------------------------------------
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws1, 'Personalkosten');
      XLSX.utils.book_append_sheet(wb, ws2, 'Jahresscheiben (Anlage 5)');

      const vonDateStr = vonDate.replace(/-/g, '');
      const bisDateStr = bisDate.replace(/-/g, '');
      const safeName = (project.short_name || project.name).replace(/[^a-zA-Z0-9_\-]/g, '_');
      XLSX.writeFile(wb, `Personalkosten_${safeName}_${vonDateStr}-${bisDateStr}.xlsx`);

    } catch (err: any) {
      console.error('Export-Fehler:', err);
      alert('Export fehlgeschlagen: ' + err.message);
    } finally {
      setExportLoading(false);
    }
  };

  // ============================================================================
  // ZA-FUNKTIONEN
  // ============================================================================

  // ZA-Panel oeffnen: ZA-Liste fuer Projekt laden und Formular vorbelegen
  const openZAPanel = async (projectId: string) => {
    setZALoading(true);
    setZASelectedId(null);
    const project = projects.find(p => p.id === projectId);

    // Naechste freie ZA-Nummer ermitteln
    const { data: existingZAs } = await supabase
      .from('v7_zahlungsanforderungen')
      .select('id, project_id, za_nummer, zeitraum_von, zeitraum_bis, auftraege_dritte_t, auftraege_dritte_nt, fue_unterauftrag, zeitw_personalaufnahme, status, notizen')
      .eq('project_id', projectId)
      .order('za_nummer', { ascending: true });

    const zaListLoaded: ZahlungsanforderungDB[] = existingZAs || [];
    setZAList(zaListLoaded);

    const nextNummer = zaListLoaded.length > 0
      ? Math.max(...zaListLoaded.map(z => z.za_nummer)) + 1
      : 1;

    // Zeitraum: nach letzter ZA oder Projektstart
    const lastZA = zaListLoaded.length > 0 ? zaListLoaded[zaListLoaded.length - 1] : null;
    const vonDefault = lastZA
      ? (() => {
          const d = new Date(lastZA.zeitraum_bis);
          d.setDate(d.getDate() + 1);
          return d.toISOString().slice(0, 10);
        })()
      : (project?.start_date?.slice(0, 10) || new Date().toISOString().slice(0, 10));
    const bisDefault = new Date().toISOString().slice(0, 10);

    setZAFormData({
      za_nummer: String(nextNummer),
      zeitraum_von: vonDefault,
      zeitraum_bis: bisDefault,
      auftraege_dritte_t: '',
      auftraege_dritte_nt: '',
      fue_unterauftrag: '',
      zeitw_personalaufnahme: '',
      notizen: '',
    });
    setZALoading(false);
  };

  // Bestehende ZA in Formular laden
  const loadZAIntoForm = (za: ZahlungsanforderungDB) => {
    setZASelectedId(za.id);
    setZAFormData({
      za_nummer: String(za.za_nummer),
      zeitraum_von: za.zeitraum_von,
      zeitraum_bis: za.zeitraum_bis,
      auftraege_dritte_t: za.auftraege_dritte_t != null ? String(za.auftraege_dritte_t) : '',
      auftraege_dritte_nt: za.auftraege_dritte_nt != null ? String(za.auftraege_dritte_nt) : '',
      fue_unterauftrag: za.fue_unterauftrag != null ? String(za.fue_unterauftrag) : '',
      zeitw_personalaufnahme: za.zeitw_personalaufnahme != null ? String(za.zeitw_personalaufnahme) : '',
      notizen: za.notizen || '',
    });
  };

  // ZA speichern (neu oder update)
  const handleZASave = async () => {
    if (!zaProjectId) return;
    setZASaving(true);
    try {
      const payload = {
        project_id: zaProjectId,
        za_nummer: parseInt(zaFormData.za_nummer) || 1,
        zeitraum_von: zaFormData.zeitraum_von,
        zeitraum_bis: zaFormData.zeitraum_bis,
        auftraege_dritte_t: zaFormData.auftraege_dritte_t !== '' ? parseFloat(zaFormData.auftraege_dritte_t) : 0,
        auftraege_dritte_nt: zaFormData.auftraege_dritte_nt !== '' ? parseFloat(zaFormData.auftraege_dritte_nt) : 0,
        fue_unterauftrag: zaFormData.fue_unterauftrag !== '' ? parseFloat(zaFormData.fue_unterauftrag) : 0,
        zeitw_personalaufnahme: zaFormData.zeitw_personalaufnahme !== '' ? parseFloat(zaFormData.zeitw_personalaufnahme) : 0,
        notizen: zaFormData.notizen.trim() || null,
        updated_at: new Date().toISOString(),
      };

      if (zaSelectedId) {
        await supabase.from('v7_zahlungsanforderungen').update(payload).eq('id', zaSelectedId);
      } else {
        const { data: newZA } = await supabase.from('v7_zahlungsanforderungen').insert(payload).select().single();
        if (newZA) setZASelectedId(newZA.id);
      }
      // Liste neu laden
      await openZAPanel(zaProjectId);
      alert('ZA gespeichert.');
    } catch (err: any) {
      alert('Fehler beim Speichern: ' + err.message);
    } finally {
      setZASaving(false);
    }
  };

  // Hilfsfunktion: Personenstunden je MA je Monat im ZA-Zeitraum
  const getZAPersonenstunden = (projectId: string, vonStr: string, bisStr: string) => {
    if (!vonStr || !bisStr) return [];
    const project = projects.find(p => p.id === projectId);
    if (!project) return [];
    const isDS = project.funding_format === 'ZIM_DS';

    // MA die dem Projekt zugeordnet sind (ueber WP-Assignments)
    const projectWPs = workPackages.filter(wp => wp.project_id === projectId);
    const projectWPIds = projectWPs.map(wp => wp.id);
    const assignedEmployeeIds = [...new Set(
      wpAssignments
        .filter(wpa => projectWPIds.includes(wpa.work_package_id))
        .map(wpa => wpa.employee_id)
    )];

    // Monate im Zeitraum bestimmen
    const vonDate = new Date(vonStr);
    const bisDate = new Date(bisStr);
    const months: { year: number; month: number; label: string }[] = [];
    const cur = new Date(vonDate.getFullYear(), vonDate.getMonth(), 1);
    while (cur <= bisDate) {
      months.push({
        year: cur.getFullYear(),
        month: cur.getMonth() + 1,
        label: cur.toLocaleString('de-DE', { month: 'short', year: '2-digit' }),
      });
      cur.setMonth(cur.getMonth() + 1);
    }

    // Pro MA: Stunden je Monat
    return assignedEmployeeIds.map(empId => {
      const emp = employees.find(e => e.id === empId);
      const empName = emp ? emp.display_name : empId;

      // Technische AP-IDs fuer diesen MA
      const technicalWPIds = isDS
        ? projectWPs.filter(wp => wp.is_technical === true).map(wp => wp.id)
        : [];

      const monthData = months.map(m => {
        const monthEntries = timesheets.filter(ts =>
          ts.project_id === projectId &&
          ts.employee_id === empId &&
          ts.is_active &&
          ts.is_billable &&
          (() => {
            const d = new Date(ts.work_date);
            return d.getFullYear() === m.year && (d.getMonth() + 1) === m.month;
          })()
        );
        const hoursT = isDS
          ? monthEntries.filter(ts => technicalWPIds.includes(ts.work_package_id || '')).reduce((s, ts) => s + ts.hours, 0)
          : monthEntries.reduce((s, ts) => s + ts.hours, 0);
        const hoursNT = isDS
          ? monthEntries.filter(ts => !technicalWPIds.includes(ts.work_package_id || '')).reduce((s, ts) => s + ts.hours, 0)
          : 0;
        return { ...m, hoursT, hoursNT, hoursTotal: hoursT + hoursNT };
      });

      const totalT = monthData.reduce((s, m) => s + m.hoursT, 0);
      const totalNT = monthData.reduce((s, m) => s + m.hoursNT, 0);
      return { empId, empName, monthData, totalT, totalNT, totalAll: totalT + totalNT };
    }).filter(row => row.totalAll > 0); // Nur MA mit Stunden im Zeitraum anzeigen
  };

  // Hilfsfunktion: Stundensatz fuer MA aus project_assignments
  const getHourlyRate = (empId: string, projectId: string): number | null => {
    const pa = projectAssignments.find(pa => pa.employee_id === empId && pa.project_id === projectId);
    return pa?.hourly_rate || null;
  };

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

              {/* Kachel 1: Personalkosten - AKTIV mit aufklappbarem Panel */}
              <div className="flex flex-col">
                <button
                  onClick={() => setShowPKPanel(prev => !prev)}
                  disabled={projects.length === 0}
                  className={`flex flex-col items-center p-6 border-2 rounded-lg transition-colors ${
                    projects.length === 0
                      ? 'border-dashed border-gray-300 text-gray-400 cursor-not-allowed'
                      : showPKPanel
                        ? 'border-green-600 text-green-800 bg-green-100 cursor-pointer'
                        : 'border-green-400 text-green-700 bg-green-50 hover:bg-green-100 cursor-pointer'
                  }`}
                >
                  <FileSpreadsheet className="w-10 h-10 mb-3" />
                  <span className="font-medium">Personalkosten</span>
                  <span className="text-xs mt-1">Excel-Export</span>
                  <span className="text-xs mt-2 bg-green-200 text-green-800 px-2 py-0.5 rounded flex items-center gap-1">
                    {showPKPanel ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    {showPKPanel ? 'Schliessen' : 'Zeitraum waehlen'}
                  </span>
                </button>

                {/* Aufklappbares Panel */}
                {showPKPanel && (
                  <div className="mt-2 p-4 bg-white border border-green-300 rounded-lg shadow-sm">
                    {/* Projekt-Auswahl (nur wenn mehrere Projekte) */}
                    {projects.length > 1 && (
                      <div className="mb-3">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Projekt</label>
                        <select
                          value={pkProjectId}
                          onChange={e => handlePkProjectChange(e.target.value)}
                          className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:border-green-500"
                        >
                          {projects.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.short_name || p.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    {/* Von / Bis */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Von</label>
                        <input
                          type="date"
                          value={pkVon}
                          onChange={e => setPKVon(e.target.value)}
                          className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:border-green-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Bis</label>
                        <input
                          type="date"
                          value={pkBis}
                          onChange={e => setPKBis(e.target.value)}
                          className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:border-green-500"
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        handlePersonalkostenExport(pkProjectId, pkVon, pkBis);
                        setShowPKPanel(false);
                      }}
                      disabled={exportLoading || !pkVon || !pkBis}
                      className="w-full py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white text-sm font-medium rounded transition-colors flex items-center justify-center gap-2"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      {exportLoading ? 'Wird erstellt...' : 'Excel herunterladen'}
                    </button>
                  </div>
                )}
              </div>

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

              {/* Kachel 4: Zahlungsanforderung - AKTIV */}
              <button
                onClick={() => {
                  const newShow = !showZAPanel;
                  setShowZAPanel(newShow);
                  if (newShow) {
                    const pid = zaProjectId || projects[0]?.id || '';
                    setZAProjectId(pid);
                    if (pid) openZAPanel(pid);
                  }
                }}
                className={`flex flex-col items-center p-6 border-2 rounded-lg transition-colors
                  ${showZAPanel
                    ? 'border-green-600 bg-green-50 text-green-700'
                    : 'border-green-200 bg-white text-green-700 hover:border-green-400 hover:bg-green-50'
                  }`}
              >
                <FileText className="w-10 h-10 mb-3" />
                <span className="font-medium">Zahlungsanforderung</span>
                <span className="text-xs mt-1 text-green-600">ZIM Mittelabruf</span>
                <span className={`text-xs mt-2 flex items-center gap-1 px-2 py-0.5 rounded ${showZAPanel ? 'bg-green-200' : 'bg-green-100'}`}>
                  {showZAPanel ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  {showZAPanel ? 'Schliessen' : 'Oeffnen'}
                </span>
              </button>
            </div>

            {/* ZA-Panel (aufklappbar) */}
            {showZAPanel && (() => {
              const zaProject = projects.find(p => p.id === zaProjectId);
              if (!zaProject) return null;
              const isDS = zaProject.funding_format === 'ZIM_DS';

              // Berechnungen fuer Deckblatt
              const vonStr = zaFormData.zeitraum_von;
              const bisStr = zaFormData.zeitraum_bis;
              const psData = (vonStr && bisStr) ? getZAPersonenstunden(zaProjectId, vonStr, bisStr) : [];

              // Personalkosten T und NT
              const pkT = psData.reduce((sum, row) => {
                const rate = getHourlyRate(row.empId, zaProjectId) || 0;
                return sum + row.totalT * rate;
              }, 0);
              const pkNT = psData.reduce((sum, row) => {
                const rate = getHourlyRate(row.empId, zaProjectId) || 0;
                return sum + row.totalNT * rate;
              }, 0);
              const pkGesamt = isDS ? (pkT + pkNT) : psData.reduce((sum, row) => {
                const rate = getHourlyRate(row.empId, zaProjectId) || 0;
                return sum + row.totalAll * rate;
              }, 0);

              const foerdersatz = zaProject.foerdersatz || 0;
              const overheadT = zaProject.overhead_t || 0;
              const overheadNT = isDS ? (zaProject.overhead_nt || zaProject.overhead_t || 0) : (zaProject.overhead_t || 0);

              const gkT = isDS ? pkT * overheadT / 100 : pkGesamt * overheadT / 100;
              const gkNT = isDS ? pkNT * overheadNT / 100 : 0;
              const auftraegeT = parseFloat(zaFormData.auftraege_dritte_t || '0') || 0;
              const auftraegeNT = parseFloat(zaFormData.auftraege_dritte_nt || '0') || 0;
              const fueUA = parseFloat(zaFormData.fue_unterauftrag || '0') || 0;
              const zeitwPA = parseFloat(zaFormData.zeitw_personalaufnahme || '0') || 0;

              const summeT = isDS ? (pkT + gkT + auftraegeT) : 0;
              const summeNT = isDS ? (pkNT + gkNT + auftraegeNT) : 0;
              const summeGesamt = isDS
                ? (summeT + summeNT + fueUA + zeitwPA)
                : (pkGesamt + gkT + auftraegeT + fueUA + zeitwPA);
              const antZuwendung = Math.round(summeGesamt * foerdersatz / 100);

              const fmt = (v: number) => v.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
              const fmtDate = (s: string) => {
                if (!s) return '';
                const [y, m, d] = s.split('-');
                return `${d}.${m}.${y}`;
              };

              return (
                <div className="mt-6 border border-green-200 rounded-lg overflow-hidden">
                  {/* Panel-Header */}
                  <div className="bg-green-50 px-4 py-3 border-b border-green-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-green-600" />
                      <span className="font-medium text-gray-900">Zahlungsanforderung (ZIM)</span>
                      {projects.length > 1 && (
                        <select
                          value={zaProjectId}
                          onChange={e => {
                            setZAProjectId(e.target.value);
                            openZAPanel(e.target.value);
                          }}
                          className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-green-500"
                        >
                          {projects.map(p => (
                            <option key={p.id} value={p.id}>{p.short_name || p.name}</option>
                          ))}
                        </select>
                      )}
                      {isDS && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">DS-Formular</span>}
                    </div>
                    {/* Bestehende ZAs */}
                    {zaList.length > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Gespeicherte ZAs:</span>
                        {zaList.map(za => (
                          <button
                            key={za.id}
                            onClick={() => loadZAIntoForm(za)}
                            className={`text-xs px-2 py-1 rounded border transition-colors
                              ${zaSelectedId === za.id
                                ? 'bg-green-600 text-white border-green-600'
                                : 'bg-white text-gray-700 border-gray-300 hover:border-green-400'}`}
                          >
                            ZA {za.za_nummer}
                          </button>
                        ))}
                        <button
                          onClick={() => {
                            setZASelectedId(null);
                            openZAPanel(zaProjectId);
                          }}
                          className="text-xs px-2 py-1 rounded border border-dashed border-green-400 text-green-600 hover:bg-green-50"
                        >
                          + Neue ZA
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Tab-Navigation + Drucken-Button */}
                  <div className="flex items-center border-b border-gray-200 bg-white">
                    <div className="flex flex-1">
                      {(['deckblatt', 'anlage1a', 'anlage1b'] as const).map(tab => (
                        <button
                          key={tab}
                          onClick={() => setZATab(tab)}
                          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors
                            ${zaTab === tab
                              ? 'border-green-600 text-green-700'
                              : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        >
                          {tab === 'deckblatt' ? 'Deckblatt (Seite 5)' : tab === 'anlage1a' ? 'Anlage 1a - Personenstunden' : 'Anlage 1b - Personalkosten'}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => {
                        const el = document.getElementById('za-print-area');
                        if (!el) return;
                        const printWin = window.open('', '_blank', 'width=900,height=700');
                        if (!printWin) return;
                        const styles = Array.from(document.styleSheets)
                          .map(ss => { try { return Array.from(ss.cssRules).map(r => r.cssText).join('\n'); } catch { return ''; } })
                          .join('\n');
                        const tabLabel = zaTab === 'deckblatt' ? 'Deckblatt' : zaTab === 'anlage1a' ? 'Anlage 1a' : 'Anlage 1b';
                        printWin.document.write(
                          '<html><head><title>ZA ' + zaFormData.za_nummer + ' - ' + tabLabel +
                          '</title><style>' + styles +
                          ' @media print { body { margin: 10mm; } } @page { size: A4 portrait; margin: 15mm; }</style></head><body>' +
                          el.innerHTML + '</body></html>'
                        );
                        printWin.document.close();
                        printWin.focus();
                        setTimeout(() => { printWin.print(); printWin.close(); }, 400);
                      }}
                      className="flex items-center gap-1.5 mx-3 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded transition-colors"
                      title="Dieses Formblatt drucken"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 6 2 18 2 18 9"/>
                        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                        <rect x="6" y="14" width="12" height="8"/>
                      </svg>
                      Drucken
                    </button>
                  </div>

                  {zaLoading ? (
                    <div className="p-8 text-center text-gray-500">Lade...</div>
                  ) : (
                    <div className="p-4 bg-white">

                      {/* ---- TAB: DECKBLATT (Seite 5) - formulargetreu ---- */}
                      {zaTab === 'deckblatt' && (
                        <div className="space-y-4">

                          {/* Formular-Header wie ZIM-PDF */}
                          <div id="za-print-area" className="border-2 border-gray-400 rounded bg-white p-4">
                            <div className="text-center text-xs text-gray-500 mb-3 font-medium uppercase tracking-wide">
                              Zentrales Innovationsprogramm Mittelstand (ZIM) &mdash; Zahlungsanforderung
                              {isDS ? ' fuer Durchfuehrbarkeitsstudien' : ''}
                            </div>

                            {/* Kopfdaten-Zeile */}
                            <div className="grid grid-cols-4 gap-3 mb-4 pb-3 border-b border-gray-300">
                              <div>
                                <div className="text-xs text-gray-500 mb-1">Foerderkennzeichen</div>
                                <div className="font-medium text-sm bg-yellow-50 border border-gray-300 rounded px-2 py-1 min-h-[28px]">
                                  {zaProject.funding_reference || <span className="text-gray-400 italic">nicht hinterlegt</span>}
                                </div>
                              </div>
                              <div>
                                <div className="text-xs text-gray-500 mb-1">Zahlungsanforderung Nr.</div>
                                <input type="number" min="1" value={zaFormData.za_nummer}
                                  onChange={e => setZAFormData(prev => ({ ...prev, za_nummer: e.target.value }))}
                                  className="w-full px-2 py-1 text-sm font-medium border border-gray-300 rounded focus:ring-1 focus:ring-green-500 bg-blue-50" />
                              </div>
                              <div>
                                <div className="text-xs text-gray-500 mb-1">Abrechnungszeitraum von</div>
                                <input type="date" value={zaFormData.zeitraum_von}
                                  onChange={e => setZAFormData(prev => ({ ...prev, zeitraum_von: e.target.value }))}
                                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-green-500 bg-blue-50" />
                              </div>
                              <div>
                                <div className="text-xs text-gray-500 mb-1">bis</div>
                                <input type="date" value={zaFormData.zeitraum_bis}
                                  onChange={e => setZAFormData(prev => ({ ...prev, zeitraum_bis: e.target.value }))}
                                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-green-500 bg-blue-50" />
                              </div>
                            </div>

                            {/* Foerderparameter-Hinweis */}
                            {(!zaProject.foerdersatz || !zaProject.overhead_t) && (
                              <div className="bg-amber-50 border border-amber-300 rounded p-2 text-xs text-amber-700 mb-3">
                                Foerderparameter (Foerdersatz, GKZ) sind noch nicht am Projekt hinterlegt.
                                Bitte im Projekt bearbeiten (Tab Uebersicht &rsaquo; Bearbeiten).
                              </div>
                            )}

                            {/* Kostentabelle - exakt wie Formblatt Seite 5 */}
                            <div className="text-xs font-medium text-gray-700 mb-1">
                              Zuwendungsfaehige Kosten im Abrechnungszeitraum und anteilige Zuwendung
                            </div>
                            <table className="w-full text-xs border border-gray-400">
                              <thead>
                                <tr className="bg-gray-100">
                                  <th className="text-left px-2 py-1.5 border border-gray-300 font-medium w-8">Nr.</th>
                                  <th className="text-left px-2 py-1.5 border border-gray-300 font-medium">Kostenart</th>
                                  {isDS ? (
                                    <>
                                      <th className="text-right px-2 py-1.5 border border-gray-300 font-medium w-32">entst. Kosten technisch<br />[EUR, Cent]</th>
                                      <th className="text-right px-2 py-1.5 border border-gray-300 font-medium w-32">entst. Kosten nichttechn.<br />[EUR, Cent]</th>
                                    </>
                                  ) : (
                                    <>
                                      <th className="text-right px-2 py-1.5 border border-gray-300 font-medium w-40">entstandene zuwendungs-<br />faehige Kosten [EUR, Cent]</th>
                                      <th className="text-center px-2 py-1.5 border border-gray-300 font-medium w-24">Foerdersatz<br />[%]</th>
                                      <th className="text-right px-2 py-1.5 border border-gray-300 font-medium w-40">anteilige Zuwendung<br />(Summe gerundet) [EUR, Cent]</th>
                                    </>
                                  )}
                                </tr>
                              </thead>
                              <tbody>
                                {/* (1) Personal technisch */}
                                <tr>
                                  <td className="px-2 py-1.5 border border-gray-300 text-center text-gray-500">(1)</td>
                                  <td className="px-2 py-1.5 border border-gray-300">
                                    Personal {isDS ? 'technisch' : ''} (lt. Anlage 1b)
                                  </td>
                                  {isDS ? (
                                    <>
                                      <td className="px-2 py-1.5 border border-gray-300 text-right font-mono bg-blue-50">{fmt(pkT)}</td>
                                      <td className="px-2 py-1.5 border border-gray-300 text-right font-mono bg-gray-50 text-gray-400">--</td>
                                    </>
                                  ) : (
                                    <>
                                      <td className="px-2 py-1.5 border border-gray-300 text-right font-mono bg-blue-50">{fmt(pkGesamt)}</td>
                                      <td className="px-2 py-1.5 border border-gray-300 text-center bg-gray-50 text-gray-400">--</td>
                                      <td className="px-2 py-1.5 border border-gray-300 bg-gray-50"></td>
                                    </>
                                  )}
                                </tr>
                                {/* (2) Zuschlag T */}
                                <tr>
                                  <td className="px-2 py-1.5 border border-gray-300 text-center text-gray-500">(2)</td>
                                  <td className="px-2 py-1.5 border border-gray-300">
                                    Zuschlag fuer uebrige Kosten{isDS ? ' technisch' : ''}&nbsp;
                                    <span className="font-medium">{overheadT}%</span>
                                  </td>
                                  {isDS ? (
                                    <>
                                      <td className="px-2 py-1.5 border border-gray-300 text-right font-mono bg-blue-50">{fmt(gkT)}</td>
                                      <td className="px-2 py-1.5 border border-gray-300 text-right font-mono bg-gray-50 text-gray-400">--</td>
                                    </>
                                  ) : (
                                    <>
                                      <td className="px-2 py-1.5 border border-gray-300 text-right font-mono bg-blue-50">{fmt(gkT)}</td>
                                      <td className="px-2 py-1.5 border border-gray-300 text-center bg-gray-50 text-gray-400">--</td>
                                      <td className="px-2 py-1.5 border border-gray-300 bg-gray-50"></td>
                                    </>
                                  )}
                                </tr>
                                {/* (3) Personal nichttechnisch - nur DS */}
                                {isDS && (
                                  <tr>
                                    <td className="px-2 py-1.5 border border-gray-300 text-center text-gray-500">(3)</td>
                                    <td className="px-2 py-1.5 border border-gray-300">Personal nichttechnisch (lt. Anlage 1b)</td>
                                    <td className="px-2 py-1.5 border border-gray-300 text-right font-mono bg-gray-50 text-gray-400">--</td>
                                    <td className="px-2 py-1.5 border border-gray-300 text-right font-mono bg-blue-50">{fmt(pkNT)}</td>
                                  </tr>
                                )}
                                {/* (4) Zuschlag NT - nur DS */}
                                {isDS && (
                                  <tr>
                                    <td className="px-2 py-1.5 border border-gray-300 text-center text-gray-500">(4)</td>
                                    <td className="px-2 py-1.5 border border-gray-300">
                                      Zuschlag fuer uebrige Kosten nichttechnisch&nbsp;
                                      <span className="font-medium">{overheadNT}%</span>
                                    </td>
                                    <td className="px-2 py-1.5 border border-gray-300 text-right font-mono bg-gray-50 text-gray-400">--</td>
                                    <td className="px-2 py-1.5 border border-gray-300 text-right font-mono bg-blue-50">{fmt(gkNT)}</td>
                                  </tr>
                                )}
                                {/* (5) Auftraege Dritte technisch */}
                                <tr>
                                  <td className="px-2 py-1.5 border border-gray-300 text-center text-gray-500">{isDS ? '(5)' : '(3)'}</td>
                                  <td className="px-2 py-1.5 border border-gray-300">
                                    Kosten der Auftraege an wiss. qual. Dritte{isDS ? ', technisch' : ''}
                                  </td>
                                  {isDS ? (
                                    <>
                                      <td className="px-2 py-1.5 border border-gray-300">
                                        <input type="number" step="0.01" min="0" value={zaFormData.auftraege_dritte_t}
                                          onChange={e => setZAFormData(prev => ({ ...prev, auftraege_dritte_t: e.target.value }))}
                                          className="w-full px-1 py-0.5 text-right border border-gray-300 rounded focus:ring-1 focus:ring-green-500 bg-blue-50"
                                          placeholder="0,00" />
                                      </td>
                                      <td className="px-2 py-1.5 border border-gray-300 bg-gray-50 text-gray-400 text-right">--</td>
                                    </>
                                  ) : (
                                    <>
                                      <td className="px-2 py-1.5 border border-gray-300">
                                        <input type="number" step="0.01" min="0" value={zaFormData.auftraege_dritte_t}
                                          onChange={e => setZAFormData(prev => ({ ...prev, auftraege_dritte_t: e.target.value }))}
                                          className="w-full px-1 py-0.5 text-right border border-gray-300 rounded focus:ring-1 focus:ring-green-500 bg-blue-50"
                                          placeholder="0,00" />
                                      </td>
                                      <td className="px-2 py-1.5 border border-gray-300 text-center bg-gray-50 text-gray-400">--</td>
                                      <td className="px-2 py-1.5 border border-gray-300 bg-gray-50"></td>
                                    </>
                                  )}
                                </tr>
                                {/* (6) Auftraege Dritte nichttechnisch - nur DS */}
                                {isDS && (
                                  <tr>
                                    <td className="px-2 py-1.5 border border-gray-300 text-center text-gray-500">(6)</td>
                                    <td className="px-2 py-1.5 border border-gray-300">Kosten der Auftraege an wiss. qual. Dritte, nichttechnisch</td>
                                    <td className="px-2 py-1.5 border border-gray-300 bg-gray-50 text-gray-400 text-right">--</td>
                                    <td className="px-2 py-1.5 border border-gray-300">
                                      <input type="number" step="0.01" min="0" value={zaFormData.auftraege_dritte_nt}
                                        onChange={e => setZAFormData(prev => ({ ...prev, auftraege_dritte_nt: e.target.value }))}
                                        className="w-full px-1 py-0.5 text-right border border-gray-300 rounded focus:ring-1 focus:ring-green-500 bg-blue-50"
                                        placeholder="0,00" />
                                    </td>
                                  </tr>
                                )}
                                {/* FuE-Unterauftrag - nur normales ZIM */}
                                {!isDS && (
                                  <tr>
                                    <td className="px-2 py-1.5 border border-gray-300 text-center text-gray-500">(4)</td>
                                    <td className="px-2 py-1.5 border border-gray-300">FuE-Unterauftrag</td>
                                    <td className="px-2 py-1.5 border border-gray-300">
                                      <input type="number" step="0.01" min="0" value={zaFormData.fue_unterauftrag}
                                        onChange={e => setZAFormData(prev => ({ ...prev, fue_unterauftrag: e.target.value }))}
                                        className="w-full px-1 py-0.5 text-right border border-gray-300 rounded focus:ring-1 focus:ring-green-500 bg-blue-50"
                                        placeholder="0,00" />
                                    </td>
                                    <td className="px-2 py-1.5 border border-gray-300 text-center bg-gray-50 text-gray-400">--</td>
                                    <td className="px-2 py-1.5 border border-gray-300 bg-gray-50"></td>
                                  </tr>
                                )}
                                {/* Zeitw. Personalaufnahme - nur normales ZIM */}
                                {!isDS && (
                                  <tr>
                                    <td className="px-2 py-1.5 border border-gray-300 text-center text-gray-500">(5)</td>
                                    <td className="px-2 py-1.5 border border-gray-300">Zeitweilige Personalaufnahme</td>
                                    <td className="px-2 py-1.5 border border-gray-300">
                                      <input type="number" step="0.01" min="0" value={zaFormData.zeitw_personalaufnahme}
                                        onChange={e => setZAFormData(prev => ({ ...prev, zeitw_personalaufnahme: e.target.value }))}
                                        className="w-full px-1 py-0.5 text-right border border-gray-300 rounded focus:ring-1 focus:ring-green-500 bg-blue-50"
                                        placeholder="0,00" />
                                    </td>
                                    <td className="px-2 py-1.5 border border-gray-300 text-center bg-gray-50 text-gray-400">--</td>
                                    <td className="px-2 py-1.5 border border-gray-300 bg-gray-50"></td>
                                  </tr>
                                )}
                                {/* Summe */}
                                <tr className="bg-gray-100 font-semibold">
                                  <td className="px-2 py-1.5 border border-gray-300"></td>
                                  <td className="px-2 py-1.5 border border-gray-300">Summe</td>
                                  {isDS ? (
                                    <>
                                      <td className="px-2 py-1.5 border border-gray-300 text-right font-mono">{fmt(summeT)}</td>
                                      <td className="px-2 py-1.5 border border-gray-300 text-right font-mono">{fmt(summeNT)}</td>
                                    </>
                                  ) : (
                                    <>
                                      <td className="px-2 py-1.5 border border-gray-300 text-right font-mono">{fmt(summeGesamt)}</td>
                                      <td className="px-2 py-1.5 border border-gray-300 text-center font-medium">{foerdersatz}%</td>
                                      <td className="px-2 py-1.5 border border-gray-300 text-right font-mono text-green-800">{fmt(antZuwendung)}</td>
                                    </>
                                  )}
                                </tr>
                                {/* Gesamt + Zuwendung bei DS */}
                                {isDS && (
                                  <>
                                    <tr className="bg-gray-200 font-semibold">
                                      <td className="px-2 py-1.5 border border-gray-300"></td>
                                      <td className="px-2 py-1.5 border border-gray-300">Summe gesamt (T + NT)</td>
                                      <td colSpan={2} className="px-2 py-1.5 border border-gray-300 text-right font-mono">{fmt(summeGesamt)}</td>
                                    </tr>
                                    <tr className="bg-green-50 font-semibold">
                                      <td className="px-2 py-1.5 border border-gray-300"></td>
                                      <td className="px-2 py-1.5 border border-gray-300 text-green-800">Anteilige Zuwendung ({foerdersatz}% Foerdersatz)</td>
                                      <td colSpan={2} className="px-2 py-1.5 border border-gray-300 text-right font-mono text-green-800">{fmt(antZuwendung)}</td>
                                    </tr>
                                  </>
                                )}
                              </tbody>
                            </table>

                            {/* Interne Notizen */}
                            <div className="mt-3">
                              <label className="block text-xs text-gray-500 mb-1">Interne Notizen (nicht im Formular)</label>
                              <textarea value={zaFormData.notizen}
                                onChange={e => setZAFormData(prev => ({ ...prev, notizen: e.target.value }))}
                                rows={2}
                                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-green-500"
                                placeholder="Optionale Notizen zur ZA" />
                            </div>
                          </div>

                          {/* Speichern-Button */}
                          <div className="flex justify-end">
                            <button onClick={handleZASave}
                              disabled={zaSaving || !zaFormData.zeitraum_von || !zaFormData.zeitraum_bis}
                              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50 transition-colors text-sm">
                              {zaSaving ? 'Speichern...' : (zaSelectedId ? 'Aktualisieren' : 'ZA speichern')}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* ---- TAB: ANLAGE 1a (Seite 6) - formulargetreu ---- */}
                      {zaTab === 'anlage1a' && (
                        <div>
                          {(!zaFormData.zeitraum_von || !zaFormData.zeitraum_bis) ? (
                            <div className="p-4 text-sm text-gray-500 text-center">
                              Bitte zunaechst im Tab "Deckblatt" den Abrechnungszeitraum festlegen.
                            </div>
                          ) : psData.length === 0 ? (
                            <div className="p-4 text-sm text-gray-500 text-center">
                              Keine Zeiterfassungsdaten im gewaehlten Zeitraum gefunden.
                            </div>
                          ) : (
                            <div id="za-print-area" className="border-2 border-gray-400 rounded bg-white p-4">
                              {/* Formular-Header Anlage 1a */}
                              <div className="text-center text-xs text-gray-500 mb-1 font-medium uppercase tracking-wide">
                                Zentrales Innovationsprogramm Mittelstand (ZIM) &mdash; Anlage 1a
                              </div>
                              <div className="text-center text-base font-bold mb-3">
                                Abrechnung der foerderbaren Personenstunden
                              </div>

                              {/* Kopfdaten */}
                              <div className="grid grid-cols-4 gap-3 mb-4 pb-3 border-b border-gray-300 text-xs">
                                <div>
                                  <span className="text-gray-500">Foerderkennzeichen: </span>
                                  <span className="font-medium">{zaProject.funding_reference || '--'}</span>
                                </div>
                                <div>
                                  <span className="text-gray-500">zu ZA-Nr.: </span>
                                  <span className="font-medium">{zaFormData.za_nummer}</span>
                                </div>
                                <div>
                                  <span className="text-gray-500">Zeitraum von: </span>
                                  <span className="font-medium">{fmtDate(zaFormData.zeitraum_von)}</span>
                                </div>
                                <div>
                                  <span className="text-gray-500">bis: </span>
                                  <span className="font-medium">{fmtDate(zaFormData.zeitraum_bis)}</span>
                                </div>
                              </div>

                              {/* Tabelle Anlage 1a */}
                              <div className="overflow-x-auto">
                                <table className="w-full text-xs border border-gray-400">
                                  <thead>
                                    <tr className="bg-gray-100">
                                      <th className="px-2 py-1.5 border border-gray-300 text-center w-8">lfd.<br />Nr.</th>
                                      <th className="px-2 py-1.5 border border-gray-300 text-left w-36">Projektmitarbeiter(in)<br />(Name, Vorname)</th>
                                      <th className="px-2 py-1.5 border border-gray-300 text-center w-24">Monat</th>
                                      {isDS ? (
                                        <>
                                          <th className="px-2 py-1.5 border border-gray-300 text-center">foerderbare<br />Std. je Monat<br />[h] techn.</th>
                                          <th className="px-2 py-1.5 border border-gray-300 text-center">foerderbare<br />Std. je Monat<br />[h] nichttechn.</th>
                                          <th className="px-2 py-1.5 border border-gray-300 text-center">Summe<br />[h] techn.</th>
                                          <th className="px-2 py-1.5 border border-gray-300 text-center">Summe<br />[h] nichttechn.</th>
                                        </>
                                      ) : (
                                        <>
                                          <th className="px-2 py-1.5 border border-gray-300 text-center">foerderbare Personenstunden<br />je Monat [h]</th>
                                          <th className="px-2 py-1.5 border border-gray-300 text-center">Summe<br />[h]</th>
                                        </>
                                      )}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {psData.map((row, idx) => {
                                      const firstMonth = row.monthData[0];
                                      return (
                                        <React.Fragment key={row.empId}>
                                          {row.monthData.map((m, mIdx) => (
                                            <tr key={`${row.empId}-${m.year}-${m.month}`}
                                              className={mIdx === 0 ? 'border-t-2 border-gray-400' : ''}>
                                              {mIdx === 0 && (
                                                <>
                                                  <td className="px-2 py-1.5 border border-gray-300 text-center align-top" rowSpan={row.monthData.length}>
                                                    {idx + 1}
                                                  </td>
                                                  <td className="px-2 py-1.5 border border-gray-300 font-medium align-top" rowSpan={row.monthData.length}>
                                                    {row.empName}
                                                  </td>
                                                </>
                                              )}
                                              <td className="px-2 py-1.5 border border-gray-300 text-center whitespace-nowrap">
                                                {m.label}
                                              </td>
                                              {isDS ? (
                                                <>
                                                  <td className="px-2 py-1.5 border border-gray-300 text-right font-mono">
                                                    {m.hoursT > 0 ? m.hoursT.toFixed(2) : ''}
                                                  </td>
                                                  <td className="px-2 py-1.5 border border-gray-300 text-right font-mono">
                                                    {m.hoursNT > 0 ? m.hoursNT.toFixed(2) : ''}
                                                  </td>
                                                  {mIdx === 0 && (
                                                    <>
                                                      <td className="px-2 py-1.5 border border-gray-300 text-right font-mono font-semibold bg-blue-50 align-top" rowSpan={row.monthData.length}>
                                                        {row.totalT > 0 ? row.totalT.toFixed(2) : '--'}
                                                      </td>
                                                      <td className="px-2 py-1.5 border border-gray-300 text-right font-mono font-semibold bg-blue-50 align-top" rowSpan={row.monthData.length}>
                                                        {row.totalNT > 0 ? row.totalNT.toFixed(2) : '--'}
                                                      </td>
                                                    </>
                                                  )}
                                                </>
                                              ) : (
                                                <>
                                                  <td className="px-2 py-1.5 border border-gray-300 text-right font-mono">
                                                    {m.hoursTotal > 0 ? m.hoursTotal.toFixed(2) : ''}
                                                  </td>
                                                  {mIdx === 0 && (
                                                    <td className="px-2 py-1.5 border border-gray-300 text-right font-mono font-semibold bg-blue-50 align-top" rowSpan={row.monthData.length}>
                                                      {row.totalAll > 0 ? row.totalAll.toFixed(2) : '--'}
                                                    </td>
                                                  )}
                                                </>
                                              )}
                                            </tr>
                                          ))}
                                        </React.Fragment>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                              <p className="text-xs text-gray-400 mt-2">
                                Foerderbare Personenstunden: geleistete Projektbearbeitungsstunden gemaess Stundennachweisen,
                                jedoch nicht mehr als arbeitsvertraglich vereinbart.
                                Max. foerderbare Std. je Monat = Wochenarbeitszeit x 52 (Wochen) : 12 (Monate).
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* ---- TAB: ANLAGE 1b (Seite 7) - formulargetreu ---- */}
                      {zaTab === 'anlage1b' && (
                        <div>
                          {(!zaFormData.zeitraum_von || !zaFormData.zeitraum_bis) ? (
                            <div className="p-4 text-sm text-gray-500 text-center">
                              Bitte zunaechst im Tab "Deckblatt" den Abrechnungszeitraum festlegen.
                            </div>
                          ) : psData.length === 0 ? (
                            <div className="p-4 text-sm text-gray-500 text-center">
                              Keine Zeiterfassungsdaten im gewaehlten Zeitraum gefunden.
                            </div>
                          ) : (
                            <div id="za-print-area" className="border-2 border-gray-400 rounded bg-white p-4">
                              {/* Formular-Header Anlage 1b */}
                              <div className="text-center text-xs text-gray-500 mb-1 font-medium uppercase tracking-wide">
                                Zentrales Innovationsprogramm Mittelstand (ZIM) &mdash; Anlage 1b
                              </div>
                              <div className="text-center text-base font-bold mb-3">
                                Abrechnung der zuwendungsfaehigen Personalkosten
                              </div>

                              {/* Kopfdaten */}
                              <div className="grid grid-cols-4 gap-3 mb-4 pb-3 border-b border-gray-300 text-xs">
                                <div>
                                  <span className="text-gray-500">Foerderkennzeichen: </span>
                                  <span className="font-medium">{zaProject.funding_reference || '--'}</span>
                                </div>
                                <div>
                                  <span className="text-gray-500">zu ZA-Nr.: </span>
                                  <span className="font-medium">{zaFormData.za_nummer}</span>
                                </div>
                                <div>
                                  <span className="text-gray-500">Zeitraum von: </span>
                                  <span className="font-medium">{fmtDate(zaFormData.zeitraum_von)}</span>
                                </div>
                                <div>
                                  <span className="text-gray-500">bis: </span>
                                  <span className="font-medium">{fmtDate(zaFormData.zeitraum_bis)}</span>
                                </div>
                              </div>

                              {/* Tabelle Anlage 1b */}
                              <div className="overflow-x-auto">
                                <table className="w-full text-xs border border-gray-400">
                                  <thead>
                                    <tr className="bg-gray-100">
                                      <th className="px-2 py-1.5 border border-gray-300 text-center w-8">lfd.<br />Nr.</th>
                                      <th className="px-2 py-1.5 border border-gray-300 text-left">Projektmitarbeiter(in)</th>
                                      {isDS ? (
                                        <>
                                          <th className="px-2 py-1.5 border border-gray-300 text-right">foerderbare<br />Std. techn.<br />entspr. 1a (1)<br />[h]</th>
                                          <th className="px-2 py-1.5 border border-gray-300 text-right">foerderbare<br />Std. nichttechn.<br />entspr. 1a (2)<br />[h]</th>
                                        </>
                                      ) : (
                                        <th className="px-2 py-1.5 border border-gray-300 text-right">foerderbare<br />Personenstunden<br />entspr. Anlage 1a<br />[h]</th>
                                      )}
                                      <th className="px-2 py-1.5 border border-gray-300 text-right">Stundensatz<br />[EUR, Cent/h]</th>
                                      {isDS ? (
                                        <>
                                          <th className="px-2 py-1.5 border border-gray-300 text-right">entst. PK<br />technisch<br />(1) x (3)<br />[EUR, Cent]</th>
                                          <th className="px-2 py-1.5 border border-gray-300 text-right">entst. PK<br />nichttechn.<br />(2) x (3)<br />[EUR, Cent]</th>
                                        </>
                                      ) : (
                                        <th className="px-2 py-1.5 border border-gray-300 text-right">entstandene PK<br />Stunden x Satz<br />[EUR, Cent]</th>
                                      )}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {psData.map((row, idx) => {
                                      const rate = getHourlyRate(row.empId, zaProjectId) || 0;
                                      const pkRowT = row.totalT * rate;
                                      const pkRowNT = row.totalNT * rate;
                                      const pkRow = row.totalAll * rate;
                                      return (
                                        <tr key={row.empId} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                          <td className="px-2 py-2 border border-gray-300 text-center">{idx + 1}</td>
                                          <td className="px-2 py-2 border border-gray-300 font-medium">{row.empName}</td>
                                          {isDS ? (
                                            <>
                                              <td className="px-2 py-2 border border-gray-300 text-right font-mono">{row.totalT > 0 ? row.totalT.toFixed(2) : '--'}</td>
                                              <td className="px-2 py-2 border border-gray-300 text-right font-mono">{row.totalNT > 0 ? row.totalNT.toFixed(2) : '--'}</td>
                                            </>
                                          ) : (
                                            <td className="px-2 py-2 border border-gray-300 text-right font-mono">{row.totalAll > 0 ? row.totalAll.toFixed(2) : '--'}</td>
                                          )}
                                          <td className="px-2 py-2 border border-gray-300 text-right font-mono">
                                            {rate > 0 ? rate.toFixed(2) : <span className="text-amber-500 font-normal">fehlt!</span>}
                                          </td>
                                          {isDS ? (
                                            <>
                                              <td className="px-2 py-2 border border-gray-300 text-right font-mono font-semibold">{fmt(pkRowT)}</td>
                                              <td className="px-2 py-2 border border-gray-300 text-right font-mono font-semibold">{fmt(pkRowNT)}</td>
                                            </>
                                          ) : (
                                            <td className="px-2 py-2 border border-gray-300 text-right font-mono font-semibold">{fmt(pkRow)}</td>
                                          )}
                                        </tr>
                                      );
                                    })}
                                    {/* Summenzeile */}
                                    <tr className="bg-gray-100 font-semibold border-t-2 border-gray-400">
                                      <td colSpan={2} className="px-2 py-2 border border-gray-300 text-right">Summe/Uebertrag:</td>
                                      {isDS ? (
                                        <>
                                          <td className="px-2 py-2 border border-gray-300 text-right font-mono">{psData.reduce((s, r) => s + r.totalT, 0).toFixed(2)}</td>
                                          <td className="px-2 py-2 border border-gray-300 text-right font-mono">{psData.reduce((s, r) => s + r.totalNT, 0).toFixed(2)}</td>
                                          <td className="px-2 py-2 border border-gray-300"></td>
                                          <td className="px-2 py-2 border border-gray-300 text-right font-mono">{fmt(pkT)}</td>
                                          <td className="px-2 py-2 border border-gray-300 text-right font-mono">{fmt(pkNT)}</td>
                                        </>
                                      ) : (
                                        <>
                                          <td className="px-2 py-2 border border-gray-300 text-right font-mono">{psData.reduce((s, r) => s + r.totalAll, 0).toFixed(2)}</td>
                                          <td className="px-2 py-2 border border-gray-300"></td>
                                          <td className="px-2 py-2 border border-gray-300 text-right font-mono">{fmt(pkGesamt)}</td>
                                        </>
                                      )}
                                    </tr>
                                  </tbody>
                                </table>
                              </div>
                              <p className="text-xs text-gray-400 mt-2">
                                Stundensatz = vom Zuwendungsgeber anerkannter personengebundener Stundensatz (aus Projektteam).
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                    </div>
                  )}
                </div>
              );
            })()}

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
        Projektzeiterfassung v7.4.3-18 - Firmen-Portal - 2026
      </footer>
    </div>
  );
}
