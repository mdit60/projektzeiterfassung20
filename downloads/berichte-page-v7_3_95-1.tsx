// src/app/v7/firma/berichte/page.tsx
// ============================================================================
// PZE V7 - Berichte & Controlling (Firmen-Portal)
// ============================================================================
// Version: 7.3.95-1
// Datum: 20. Februar 2026
//
// v7.3.95-1: userName Fallback auf v7_employees.display_name
// Fix v7.3.88-4: 
//   - Monats-Dropdown zeigt NUR Projektzeitraum (Start bis Ende)
//   - Neue Spalte "Aktion" mit Button zur Zeiterfassung
//   - Klick auf "Erfassen" oeffnet Zeiterfassung mit MA+Monat
//   - v7_projects.client_company_id (nicht company_id)
//   - v7_employees.client_company_id (nicht company_id)
//   - v7_timesheets.work_date (nicht date)
//   - v7_timesheets hat kein absence_code - day_type verwenden
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

interface ProjectAssignment {
  id: string;
  project_id: string;
  employee_id: string;
}

interface TimesheetEntry {
  id: string;
  project_id: string;
  employee_id: string;
  work_date: string;  // Korrekter Feldname!
  hours: number;
  day_type: string | null;  // 'work', 'vacation', 'sick', etc.
}

interface ProjectStats {
  project: Project;
  plannedPM: number;
  actualPM: number;
  progressPercent: number;
  status: 'on-track' | 'warning' | 'critical';
}

interface EmployeeTimesheetStatus {
  employee: Employee;
  projects: string[];
  workingDays: number;
  recordedDays: number;
  status: 'complete' | 'partial' | 'missing';
  missingDays: number;
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
  const [company, setCompany] = useState<Company | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [workPackages, setWorkPackages] = useState<WorkPackage[]>([]);
  const [assignments, setAssignments] = useState<ProjectAssignment[]>([]);
  const [timesheets, setTimesheets] = useState<TimesheetEntry[]>([]);
  
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
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

        // Fallback: display_name aus Employee wenn in Profile leer
        if (!profile.display_name) {
          const { data: empRecord } = await supabase
            .from('v7_employees')
            .select('display_name')
            .eq('client_company_id', companyId)
            .eq('user_id', user.id)
            .maybeSingle();
          if (empRecord?.display_name) {
            profile.display_name = empRecord.display_name;
            setUserProfile({ ...profile });
          }
        }
        
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
          .select('id, display_name, first_name, last_name')
          .eq('client_company_id', companyId)
          .eq('is_active', true);
        
        if (employeesError) {
          console.error('MA-Fehler:', employeesError);
        }
        console.log('Mitarbeiter geladen:', employeesData?.length || 0);
        setEmployees(employeesData || []);
        
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
        }
        
        // Projekt-Zuordnungen
        if (projectIds.length > 0) {
          const { data: assignmentData, error: assignmentError } = await supabase
            .from('v7_project_assignments')
            .select('id, project_id, employee_id')
            .in('project_id', projectIds)
            .eq('is_active', true);
          
          if (assignmentError) {
            console.error('Assignment-Fehler:', assignmentError);
          }
          console.log('Zuordnungen geladen:', assignmentData?.length || 0);
          setAssignments(assignmentData || []);
        }
        
        // Zeiterfassung - KORREKTER FELDNAME: work_date (nicht date)
        if (projectIds.length > 0) {
          const { data: timesheetData, error: timesheetError } = await supabase
            .from('v7_timesheets')
            .select('id, project_id, employee_id, work_date, hours, day_type')
            .in('project_id', projectIds);
          
          if (timesheetError) {
            console.error('Timesheet-Fehler:', timesheetError);
          }
          console.log('Zeiteintraege geladen:', timesheetData?.length || 0);
          setTimesheets(timesheetData || []);
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
    
    // Nur Arbeitsstunden zaehlen (day_type = 'work' oder null)
    const totalHours = timesheets
      .filter(t => !t.day_type || t.day_type === 'work')
      .reduce((sum, t) => sum + (t.hours || 0), 0);
    const totalActualPM = totalHours / HOURS_PER_PM;
    
    const uniqueEmployeesInProjects = new Set(assignments.map(a => a.employee_id)).size;
    
    return {
      projectCount: projects.length,
      employeeCount: uniqueEmployeesInProjects,
      workPackageCount: workPackages.length,
      totalPlannedPM,
      totalActualPM,
      progressPercent: totalPlannedPM > 0 ? (totalActualPM / totalPlannedPM) * 100 : 0,
    };
  }, [projects, workPackages, timesheets, assignments]);

  const projectStats: ProjectStats[] = useMemo(() => {
    return projects.map(project => {
      const projectWPs = workPackages.filter(wp => wp.project_id === project.id);
      const plannedPM = projectWPs.reduce((sum, wp) => sum + (wp.total_person_months || 0), 0);
      
      const projectTimesheets = timesheets.filter(t => 
        t.project_id === project.id && 
        (!t.day_type || t.day_type === 'work')
      );
      const actualHours = projectTimesheets.reduce((sum, t) => sum + (t.hours || 0), 0);
      const actualPM = actualHours / HOURS_PER_PM;
      
      const progressPercent = plannedPM > 0 ? (actualPM / plannedPM) * 100 : 0;
      
      let status: 'on-track' | 'warning' | 'critical' = 'on-track';
      if (progressPercent > 110) {
        status = 'critical';
      } else if (progressPercent > 90) {
        status = 'warning';
      }
      
      return { project, plannedPM, actualPM, progressPercent, status };
    });
  }, [projects, workPackages, timesheets]);

  const employeeTimesheetStatus: EmployeeTimesheetStatus[] = useMemo(() => {
    const startDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    const endDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${daysInMonth}`;
    
    const workingDays = getWorkingDaysInMonth(selectedYear, selectedMonth, holidays);
    
    const employeesInProjects = employees.filter(emp => 
      assignments.some(a => a.employee_id === emp.id)
    );
    
    return employeesInProjects.map(employee => {
      const employeeProjectIds = assignments
        .filter(a => a.employee_id === employee.id)
        .map(a => a.project_id);
      
      const projectNames = projects
        .filter(p => employeeProjectIds.includes(p.id))
        .map(p => p.short_name || p.name);
      
      // Erfasste Tage - KORREKTER FELDNAME: work_date
      const employeeTimesheets = timesheets.filter(t => 
        t.employee_id === employee.id &&
        t.work_date >= startDate &&
        t.work_date <= endDate
      );
      
      const uniqueDates = new Set(employeeTimesheets.map(t => t.work_date));
      const recordedDays = uniqueDates.size;
      
      let status: 'complete' | 'partial' | 'missing' = 'missing';
      if (recordedDays >= workingDays) {
        status = 'complete';
      } else if (recordedDays > 0) {
        status = 'partial';
      }
      
      return {
        employee,
        projects: projectNames,
        workingDays,
        recordedDays,
        status,
        missingDays: Math.max(0, workingDays - recordedDays),
      };
    });
  }, [employees, assignments, projects, timesheets, selectedYear, selectedMonth, holidays]);

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
          userRole="client_admin"
        />
        <PortalNav portal="firma" userRole="client_admin" portalRole="client_admin" />
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
          userRole="client_admin"
        />
        <PortalNav portal="firma" userRole="client_admin" portalRole="client_admin" />
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
        userRole="client_admin"
      />
      <PortalNav portal="firma" userRole="client_admin" portalRole="client_admin" />
      
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
                          <div className="flex-1 bg-gray-200 rounded-full h-2 min-w-[100px]">
                            <div 
                              className={`h-2 rounded-full ${
                                ps.status === 'critical' ? 'bg-red-500' :
                                ps.status === 'warning' ? 'bg-yellow-500' :
                                'bg-green-500'
                              }`}
                              style={{ width: `${Math.min(100, ps.progressPercent)}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-700 min-w-[40px]">
                            {ps.progressPercent.toFixed(0)}%
                          </span>
                          {ps.status === 'on-track' && <CheckCircle className="w-4 h-4 text-green-500" />}
                          {ps.status === 'warning' && <AlertTriangle className="w-4 h-4 text-yellow-500" />}
                          {ps.status === 'critical' && <AlertCircle className="w-4 h-4 text-red-500" />}
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
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Zeiterfassungs-Status</h2>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <select
                value={`${selectedYear}-${String(selectedMonth).padStart(2, '0')}`}
                onChange={(e) => {
                  const [year, month] = e.target.value.split('-');
                  setSelectedYear(parseInt(year));
                  setSelectedMonth(parseInt(month));
                }}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                {(() => {
                  // Berechne Zeitraum basierend auf Projekten (NUR Projektzeitraum!)
                  let earliestStart: Date | null = null;
                  let latestEnd: Date | null = null;
                  
                  projects.forEach(p => {
                    if (p.start_date) {
                      const start = new Date(p.start_date);
                      if (!earliestStart || start < earliestStart) earliestStart = start;
                    }
                    if (p.end_date) {
                      const end = new Date(p.end_date);
                      if (!latestEnd || end > latestEnd) latestEnd = end;
                    }
                  });
                  
                  // Fallback falls keine Projektdaten
                  if (!earliestStart) earliestStart = new Date();
                  if (!latestEnd) latestEnd = new Date();
                  
                  // Generiere Monate vom Projektende rueckwaerts bis Projektstart
                  const months: { year: number; month: number }[] = [];
                  const current = new Date(latestEnd.getFullYear(), latestEnd.getMonth(), 1);
                  const earliest = new Date(earliestStart.getFullYear(), earliestStart.getMonth(), 1);
                  
                  while (current >= earliest) {
                    months.push({ year: current.getFullYear(), month: current.getMonth() + 1 });
                    current.setMonth(current.getMonth() - 1);
                  }
                  
                  return months.map(({ year, month }) => (
                    <option key={`${year}-${month}`} value={`${year}-${String(month).padStart(2, '0')}`}>
                      {getMonthName(month)} {year}
                    </option>
                  ));
                })()}
              </select>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mitarbeiter</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Projekt(e)</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Soll-Tage</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Erfasst</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Aktion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {employeeTimesheetStatus.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      Keine Mitarbeiter mit Projektzuordnung
                    </td>
                  </tr>
                ) : (
                  employeeTimesheetStatus.map(ets => (
                    <tr key={ets.employee.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {ets.employee.display_name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {ets.projects.join(', ') || '-'}
                      </td>
                      <td className="px-6 py-4 text-right text-gray-700">
                        {ets.workingDays}
                      </td>
                      <td className="px-6 py-4 text-right text-gray-700">
                        {ets.recordedDays}
                      </td>
                      <td className="px-6 py-4">
                        {ets.status === 'complete' && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3" />
                            Vollstaendig
                          </span>
                        )}
                        {ets.status === 'partial' && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            <AlertTriangle className="w-3 h-3" />
                            {ets.missingDays} offen
                          </span>
                        )}
                        {ets.status === 'missing' && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <XCircle className="w-3 h-3" />
                            Fehlt
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => {
                            // Navigiere zur Zeiterfassung mit MA-ID und Monat als Parameter
                            const params = new URLSearchParams({
                              employee: ets.employee.id,
                              year: selectedYear.toString(),
                              month: selectedMonth.toString(),
                            });
                            router.push(`/v7/firma/zeiterfassung?${params.toString()}`);
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                          title={`Zeiterfassung fuer ${ets.employee.display_name} oeffnen`}
                        >
                          <ExternalLink className="w-4 h-4" />
                          Erfassen
                        </button>
                      </td>
                    </tr>
                  ))
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
              <button disabled className="flex flex-col items-center p-6 border-2 border-dashed border-gray-300 rounded-lg text-gray-400 cursor-not-allowed">
                <FileSpreadsheet className="w-10 h-10 mb-3" />
                <span className="font-medium">Personalkosten</span>
                <span className="text-xs mt-1">Excel-Export</span>
                <span className="text-xs mt-2 bg-gray-100 px-2 py-0.5 rounded">Demnaechst</span>
              </button>
              
              <button disabled className="flex flex-col items-center p-6 border-2 border-dashed border-gray-300 rounded-lg text-gray-400 cursor-not-allowed">
                <FileText className="w-10 h-10 mb-3" />
                <span className="font-medium">Stundennachweis</span>
                <span className="text-xs mt-1">PDF-Export</span>
                <span className="text-xs mt-2 bg-gray-100 px-2 py-0.5 rounded">Demnaechst</span>
              </button>
              
              <button disabled className="flex flex-col items-center p-6 border-2 border-dashed border-gray-300 rounded-lg text-gray-400 cursor-not-allowed">
                <BarChart3 className="w-10 h-10 mb-3" />
                <span className="font-medium">Projekt-Fortschritt</span>
                <span className="text-xs mt-1">Grafische Auswertung</span>
                <span className="text-xs mt-2 bg-gray-100 px-2 py-0.5 rounded">Demnaechst</span>
              </button>
              
              <button disabled className="flex flex-col items-center p-6 border-2 border-dashed border-gray-300 rounded-lg text-gray-400 cursor-not-allowed">
                <Download className="w-10 h-10 mb-3" />
                <span className="font-medium">Zahlungsanforderung</span>
                <span className="text-xs mt-1">Mittelabruf (Quartal)</span>
                <span className="text-xs mt-2 bg-gray-100 px-2 py-0.5 rounded">Demnaechst</span>
              </button>
            </div>
          </div>
        </div>
      </main>
      
      <footer className="text-center py-4 text-sm text-gray-500 mt-8">
        Projektzeiterfassung v7.3.88 &middot; Firmen-Portal &middot; &copy; 2026
      </footer>
    </div>
  );
}
