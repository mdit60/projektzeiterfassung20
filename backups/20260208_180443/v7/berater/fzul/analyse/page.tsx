// src/app/v7/berater/fzul/analyse/page.tsx
// ============================================================================
// PZE V7.4 - FZul Kapazitaetsanalyse (Berater-Portal)
// ============================================================================
// Version: 7.4.0
// Datum: 05. Februar 2026
//
// NEUES FEATURE-SET V7.4: Forschungszulage (FZul) Integration
//
// Analysiert die Zeiterfassungsdaten aller Kundenfirmen und zeigt:
// - Verfuegbare Arbeitsstunden pro MA/Jahr
// - Gebuchte Projektstunden (aus v7_timesheets)
// - Freie Kapazitaet fuer Forschungszulage (FZul)
//
// Datenquellen:
// - v7_timesheets: Gebuchte Projektstunden
// - v7_employees: MA-Stammdaten (weekly_hours, annual_leave_days)
// - v7_client_companies: Firmendaten (federal_state fuer Feiertage)
// ============================================================================

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import PortalHeader from '@/components/shared/PortalHeader';
import {
  BarChart3,
  Building2,
  Users,
  Calendar,
  TrendingUp,
  FileSpreadsheet,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  Clock,
  Filter,
  Download,
  RefreshCw,
} from 'lucide-react';

// ============================================================================
// KONSTANTEN
// ============================================================================

const HOURS_PER_DAY = 8;
const WEEKS_PER_YEAR = 52;
const MONTHS_PER_YEAR = 12;

const MONTH_NAMES = [
  'Januar', 'Februar', 'Maerz', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
];

const MONTH_SHORT = ['Jan', 'Feb', 'Mrz', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

// Bundeslaender mit Codes
const BUNDESLAENDER: Record<string, string> = {
  'DE-BW': 'Baden-Wuerttemberg',
  'DE-BY': 'Bayern',
  'DE-BE': 'Berlin',
  'DE-BB': 'Brandenburg',
  'DE-HB': 'Bremen',
  'DE-HH': 'Hamburg',
  'DE-HE': 'Hessen',
  'DE-MV': 'Mecklenburg-Vorpommern',
  'DE-NI': 'Niedersachsen',
  'DE-NW': 'Nordrhein-Westfalen',
  'DE-RP': 'Rheinland-Pfalz',
  'DE-SL': 'Saarland',
  'DE-SN': 'Sachsen',
  'DE-ST': 'Sachsen-Anhalt',
  'DE-SH': 'Schleswig-Holstein',
  'DE-TH': 'Thueringen',
};

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
  federal_state: string;
}

interface Employee {
  id: string;
  client_company_id: string;
  display_name: string;
  first_name: string | null;
  last_name: string | null;
  weekly_hours: number | null;
  annual_leave_days: number | null;
  employment_start: string | null;
  employment_end: string | null;
}

interface Project {
  id: string;
  client_company_id: string;
  name: string;
  short_name: string | null;
  funding_format: string;
  funding_reference: string | null;
}

interface TimesheetEntry {
  id: string;
  employee_id: string;
  project_id: string;
  work_date: string;
  hours: number;
  day_type: string | null;
}

interface EmployeeAnalysis {
  employee: Employee;
  company: ClientCompany;
  year: number;
  availableHours: number;        // Verfuegbare Arbeitsstunden
  bookedProjectHours: number;    // In Foerderprojekten gebucht
  freeHoursForFzul: number;      // Frei fuer Forschungszulage
  utilizationPercent: number;    // Auslastung in %
  monthlyData: MonthlyData[];
  projects: ProjectBooking[];
}

interface MonthlyData {
  month: number;
  available: number;
  booked: number;
  free: number;
}

interface ProjectBooking {
  projectId: string;
  projectName: string;
  fundingFormat: string;
  fundingReference: string | null;
  hours: number;
}

interface CompanySummary {
  company: ClientCompany;
  employees: EmployeeAnalysis[];
  totalAvailable: number;
  totalBooked: number;
  totalFree: number;
  expanded: boolean;
}

// ============================================================================
// FEIERTAGS-BERECHNUNG
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
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
};

const getGermanHolidays = (year: number, stateCode: string): Map<string, string> => {
  const holidays = new Map<string, string>();
  const state = stateCode.replace('DE-', '');
  
  // Feste Feiertage (bundesweit)
  holidays.set(`${year}-01-01`, 'Neujahr');
  holidays.set(`${year}-05-01`, 'Tag der Arbeit');
  holidays.set(`${year}-10-03`, 'Tag der Deutschen Einheit');
  holidays.set(`${year}-12-25`, '1. Weihnachtstag');
  holidays.set(`${year}-12-26`, '2. Weihnachtstag');
  
  // Bewegliche Feiertage (Ostern-basiert)
  const easter = getEasterSunday(year);
  const addDays = (date: Date, days: number): Date => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  };
  const formatDate = (date: Date): string => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };
  
  holidays.set(formatDate(addDays(easter, -2)), 'Karfreitag');
  holidays.set(formatDate(easter), 'Ostersonntag');
  holidays.set(formatDate(addDays(easter, 1)), 'Ostermontag');
  holidays.set(formatDate(addDays(easter, 39)), 'Christi Himmelfahrt');
  holidays.set(formatDate(addDays(easter, 49)), 'Pfingstsonntag');
  holidays.set(formatDate(addDays(easter, 50)), 'Pfingstmontag');
  
  // Laenderspezifische Feiertage
  if (['BW', 'BY', 'ST'].includes(state)) {
    holidays.set(`${year}-01-06`, 'Heilige Drei Koenige');
  }
  if (['BW', 'BY', 'HE', 'NW', 'RP', 'SL'].includes(state)) {
    holidays.set(formatDate(addDays(easter, 60)), 'Fronleichnam');
  }
  if (['BY', 'SL'].includes(state)) {
    holidays.set(`${year}-08-15`, 'Mariae Himmelfahrt');
  }
  if (['BB', 'MV', 'SN', 'ST', 'TH', 'HB', 'HH', 'NI', 'SH'].includes(state)) {
    holidays.set(`${year}-10-31`, 'Reformationstag');
  }
  if (['BW', 'BY', 'NW', 'RP', 'SL'].includes(state)) {
    holidays.set(`${year}-11-01`, 'Allerheiligen');
  }
  if (state === 'SN') {
    // Buss- und Bettag: Mittwoch vor dem 23. November
    const nov23 = new Date(year, 10, 23);
    const dayOfWeek = nov23.getDay();
    const daysToWednesday = (dayOfWeek >= 3) ? (dayOfWeek - 3) : (dayOfWeek + 4);
    const bussUndBettag = new Date(year, 10, 23 - daysToWednesday);
    holidays.set(formatDate(bussUndBettag), 'Buss- und Bettag');
  }
  
  return holidays;
};

// ============================================================================
// BERECHNUNGSFUNKTIONEN
// ============================================================================

const calculateAvailableHours = (
  year: number,
  weeklyHours: number,
  annualLeaveDays: number,
  federalState: string
): { total: number; monthly: number[] } => {
  const holidays = getGermanHolidays(year, federalState);
  const monthlyHours: number[] = [];
  let totalAvailable = 0;
  
  for (let month = 0; month < 12; month++) {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let workingDays = 0;
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dayOfWeek = date.getDay();
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      
      // Wochenende ueberspringen
      if (dayOfWeek === 0 || dayOfWeek === 6) continue;
      // Feiertag ueberspringen
      if (holidays.has(dateStr)) continue;
      
      workingDays++;
    }
    
    // Stunden pro Tag basierend auf Wochenstunden
    const hoursPerDay = weeklyHours / 5;
    const monthHours = workingDays * hoursPerDay;
    monthlyHours.push(monthHours);
    totalAvailable += monthHours;
  }
  
  // Urlaub abziehen (gleichmaessig auf Monate verteilt als Vereinfachung)
  const hoursPerDay = weeklyHours / 5;
  const leaveHours = annualLeaveDays * hoursPerDay;
  const leavePerMonth = leaveHours / 12;
  
  const adjustedMonthly = monthlyHours.map(h => Math.max(0, h - leavePerMonth));
  const adjustedTotal = totalAvailable - leaveHours;
  
  return { total: Math.max(0, adjustedTotal), monthly: adjustedMonthly };
};

// ============================================================================
// HAUPTKOMPONENTE
// ============================================================================

export default function FzulAnalysePage() {
  const router = useRouter();
  const supabase = createClient();
  
  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  
  // Daten
  const [companies, setCompanies] = useState<ClientCompany[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [timesheets, setTimesheets] = useState<TimesheetEntry[]>([]);
  
  // Filter
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('all');
  
  // UI State
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set());
  const [expandedEmployees, setExpandedEmployees] = useState<Set<string>>(new Set());
  
  // ============================================================================
  // DATEN LADEN
  // ============================================================================
  
  useEffect(() => {
    loadData();
  }, []);
  
  useEffect(() => {
    if (profile) {
      loadTimesheets();
    }
  }, [selectedYear, profile]);
  
  const loadData = async () => {
    try {
      setLoading(true);
      
      // 1. User-Profil laden
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      
      const { data: profileData, error: profileError } = await supabase
        .from('v7_user_profiles')
        .select('*')
        .eq('email', user.email)
        .single();
      
      if (profileError || !profileData) {
        setError('Benutzerprofil nicht gefunden');
        return;
      }
      
      // Nur Berater/Admins haben Zugriff
      if (!['system_admin', 'consultant'].includes(profileData.role)) {
        setError('Keine Berechtigung fuer diese Seite');
        return;
      }
      
      setProfile(profileData);
      
      // 2. Kundenfirmen laden
      const { data: companiesData, error: companiesError } = await supabase
        .from('v7_client_companies')
        .select('*')
        .eq('consultant_company_id', profileData.consultant_company_id)
        .eq('is_active', true)
        .order('name');
      
      if (companiesError) throw companiesError;
      setCompanies(companiesData || []);
      
      // 3. Mitarbeiter laden (alle Firmen)
      const companyIds = (companiesData || []).map(c => c.id);
      if (companyIds.length > 0) {
        const { data: employeesData, error: employeesError } = await supabase
          .from('v7_employees')
          .select('*')
          .in('client_company_id', companyIds)
          .eq('is_active', true)
          .order('display_name');
        
        if (employeesError) throw employeesError;
        setEmployees(employeesData || []);
      }
      
      // 4. Projekte laden (nur Foerderprojekte, nicht FZUL)
      if (companyIds.length > 0) {
        const { data: projectsData, error: projectsError } = await supabase
          .from('v7_projects')
          .select('*')
          .in('client_company_id', companyIds)
          .neq('funding_format', 'FZUL')
          .eq('is_active', true);
        
        if (projectsError) throw projectsError;
        setProjects(projectsData || []);
      }
      
    } catch (err) {
      console.error('Fehler beim Laden:', err);
      setError('Fehler beim Laden der Daten');
    } finally {
      setLoading(false);
    }
  };
  
  const loadTimesheets = async () => {
    if (!profile) return;
    
    try {
      const companyIds = companies.map(c => c.id);
      if (companyIds.length === 0) return;
      
      // Zeiterfassungen fuer das ausgewaehlte Jahr laden
      const startDate = `${selectedYear}-01-01`;
      const endDate = `${selectedYear}-12-31`;
      
      const { data: timesheetData, error: timesheetError } = await supabase
        .from('v7_timesheets')
        .select('*')
        .gte('work_date', startDate)
        .lte('work_date', endDate)
        .eq('is_active', true);
      
      if (timesheetError) throw timesheetError;
      setTimesheets(timesheetData || []);
      
    } catch (err) {
      console.error('Fehler beim Laden der Zeiterfassung:', err);
    }
  };
  
  // ============================================================================
  // ANALYSE BERECHNEN
  // ============================================================================
  
  const analysisData = useMemo((): CompanySummary[] => {
    if (companies.length === 0) return [];
    
    const summaries: CompanySummary[] = [];
    
    // Firmen filtern
    const filteredCompanies = selectedCompanyId === 'all' 
      ? companies 
      : companies.filter(c => c.id === selectedCompanyId);
    
    for (const company of filteredCompanies) {
      const companyEmployees = employees.filter(e => e.client_company_id === company.id);
      const companyProjects = projects.filter(p => p.client_company_id === company.id);
      
      const employeeAnalyses: EmployeeAnalysis[] = [];
      
      for (const employee of companyEmployees) {
        // Verfuegbare Stunden berechnen
        const weeklyHours = employee.weekly_hours || 40;
        const annualLeave = employee.annual_leave_days || 30;
        const { total: availableHours, monthly: monthlyAvailable } = calculateAvailableHours(
          selectedYear,
          weeklyHours,
          annualLeave,
          company.federal_state
        );
        
        // Gebuchte Stunden aus Timesheets
        const employeeTimesheets = timesheets.filter(t => t.employee_id === employee.id);
        
        // Nach Projekten gruppieren
        const projectBookings: Map<string, ProjectBooking> = new Map();
        const monthlyBooked: number[] = Array(12).fill(0);
        
        for (const ts of employeeTimesheets) {
          const project = companyProjects.find(p => p.id === ts.project_id);
          if (!project) continue;
          
          // Projekt-Summe
          const existing = projectBookings.get(project.id);
          if (existing) {
            existing.hours += ts.hours;
          } else {
            projectBookings.set(project.id, {
              projectId: project.id,
              projectName: project.name,
              fundingFormat: project.funding_format,
              fundingReference: project.funding_reference,
              hours: ts.hours
            });
          }
          
          // Monatssumme
          const month = new Date(ts.work_date).getMonth();
          monthlyBooked[month] += ts.hours;
        }
        
        const bookedProjectHours = Array.from(projectBookings.values()).reduce((sum, p) => sum + p.hours, 0);
        const freeHoursForFzul = Math.max(0, availableHours - bookedProjectHours);
        const utilizationPercent = availableHours > 0 ? (bookedProjectHours / availableHours) * 100 : 0;
        
        // Monatsdaten zusammenstellen
        const monthlyData: MonthlyData[] = monthlyAvailable.map((available, idx) => ({
          month: idx + 1,
          available: Math.round(available),
          booked: Math.round(monthlyBooked[idx]),
          free: Math.max(0, Math.round(available - monthlyBooked[idx]))
        }));
        
        employeeAnalyses.push({
          employee,
          company,
          year: selectedYear,
          availableHours: Math.round(availableHours),
          bookedProjectHours: Math.round(bookedProjectHours),
          freeHoursForFzul: Math.round(freeHoursForFzul),
          utilizationPercent: Math.round(utilizationPercent),
          monthlyData,
          projects: Array.from(projectBookings.values())
        });
      }
      
      // Firmen-Summen
      const totalAvailable = employeeAnalyses.reduce((sum, e) => sum + e.availableHours, 0);
      const totalBooked = employeeAnalyses.reduce((sum, e) => sum + e.bookedProjectHours, 0);
      const totalFree = employeeAnalyses.reduce((sum, e) => sum + e.freeHoursForFzul, 0);
      
      summaries.push({
        company,
        employees: employeeAnalyses,
        totalAvailable,
        totalBooked,
        totalFree,
        expanded: expandedCompanies.has(company.id)
      });
    }
    
    return summaries;
  }, [companies, employees, projects, timesheets, selectedYear, selectedCompanyId, expandedCompanies]);
  
  // Gesamtsummen
  const totals = useMemo(() => {
    return {
      available: analysisData.reduce((sum, c) => sum + c.totalAvailable, 0),
      booked: analysisData.reduce((sum, c) => sum + c.totalBooked, 0),
      free: analysisData.reduce((sum, c) => sum + c.totalFree, 0),
      employees: analysisData.reduce((sum, c) => sum + c.employees.length, 0),
      companies: analysisData.length
    };
  }, [analysisData]);
  
  // ============================================================================
  // UI HANDLER
  // ============================================================================
  
  const toggleCompanyExpanded = (companyId: string) => {
    setExpandedCompanies(prev => {
      const next = new Set(prev);
      if (next.has(companyId)) {
        next.delete(companyId);
      } else {
        next.add(companyId);
      }
      return next;
    });
  };
  
  const toggleEmployeeExpanded = (employeeId: string) => {
    setExpandedEmployees(prev => {
      const next = new Set(prev);
      if (next.has(employeeId)) {
        next.delete(employeeId);
      } else {
        next.add(employeeId);
      }
      return next;
    });
  };
  
  // ============================================================================
  // RENDER
  // ============================================================================
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PortalHeader portal="berater" title="FZul-Analyse" />
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin text-sky-600 mx-auto mb-2" />
            <p className="text-gray-600">Lade Daten...</p>
          </div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PortalHeader portal="berater" title="FZul-Analyse" />
        <div className="max-w-4xl mx-auto p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <PortalHeader portal="berater" title="FZul-Kapazitaetsanalyse" />
      
      <main className="max-w-7xl mx-auto p-6">
        {/* Header mit Filter */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <BarChart3 className="w-7 h-7 text-sky-600" />
                Forschungszulage - Kapazitaetsanalyse
              </h1>
              <p className="text-gray-600 mt-1">
                Analyse der verfuegbaren Stunden fuer die Forschungszulage (35a EStG)
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Jahr-Auswahl */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Jahr</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                >
                  {[2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030].map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
              
              {/* Firmen-Filter */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Firma</label>
                <select
                  value={selectedCompanyId}
                  onChange={(e) => setSelectedCompanyId(e.target.value)}
                  className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                >
                  <option value="all">Alle Firmen</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
        
        {/* Kennzahlen-Uebersicht */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <Building2 className="w-4 h-4" />
              Firmen
            </div>
            <div className="text-2xl font-bold text-gray-900">{totals.companies}</div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <Users className="w-4 h-4" />
              Mitarbeiter
            </div>
            <div className="text-2xl font-bold text-gray-900">{totals.employees}</div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <Clock className="w-4 h-4" />
              Verfuegbar
            </div>
            <div className="text-2xl font-bold text-gray-900">{totals.available.toLocaleString('de-DE')} h</div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <TrendingUp className="w-4 h-4" />
              In Projekten
            </div>
            <div className="text-2xl font-bold text-blue-600">{totals.booked.toLocaleString('de-DE')} h</div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <CheckCircle className="w-4 h-4" />
              Frei fuer FZul
            </div>
            <div className="text-2xl font-bold text-green-600">{totals.free.toLocaleString('de-DE')} h</div>
          </div>
        </div>
        
        {/* Keine Daten */}
        {analysisData.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
            <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Keine Firmen gefunden</h3>
            <p className="text-gray-500">
              Es sind noch keine Kundenfirmen mit Mitarbeitern vorhanden.
            </p>
          </div>
        )}
        
        {/* Firmen-Liste */}
        {analysisData.map(companySummary => (
          <div key={companySummary.company.id} className="bg-white rounded-lg shadow-sm border mb-4 overflow-hidden">
            {/* Firmen-Header */}
            <div 
              className="flex items-center justify-between p-4 bg-gray-50 border-b cursor-pointer hover:bg-gray-100"
              onClick={() => toggleCompanyExpanded(companySummary.company.id)}
            >
              <div className="flex items-center gap-3">
                {expandedCompanies.has(companySummary.company.id) ? (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                )}
                <Building2 className="w-5 h-5 text-sky-600" />
                <div>
                  <h3 className="font-semibold text-gray-900">{companySummary.company.name}</h3>
                  <p className="text-sm text-gray-500">
                    {companySummary.employees.length} Mitarbeiter | {BUNDESLAENDER[companySummary.company.federal_state] || companySummary.company.federal_state}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-6 text-sm">
                <div className="text-right">
                  <div className="text-gray-500">Verfuegbar</div>
                  <div className="font-semibold">{companySummary.totalAvailable.toLocaleString('de-DE')} h</div>
                </div>
                <div className="text-right">
                  <div className="text-gray-500">In Projekten</div>
                  <div className="font-semibold text-blue-600">{companySummary.totalBooked.toLocaleString('de-DE')} h</div>
                </div>
                <div className="text-right">
                  <div className="text-gray-500">Frei (FZul)</div>
                  <div className="font-semibold text-green-600">{companySummary.totalFree.toLocaleString('de-DE')} h</div>
                </div>
              </div>
            </div>
            
            {/* Mitarbeiter-Liste (aufgeklappt) */}
            {expandedCompanies.has(companySummary.company.id) && (
              <div className="divide-y">
                {companySummary.employees.map(empAnalysis => (
                  <div key={empAnalysis.employee.id} className="p-4">
                    {/* MA-Zeile */}
                    <div 
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => toggleEmployeeExpanded(empAnalysis.employee.id)}
                    >
                      <div className="flex items-center gap-3">
                        {expandedEmployees.has(empAnalysis.employee.id) ? (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        )}
                        <div className="w-8 h-8 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center text-sm font-medium">
                          {empAnalysis.employee.display_name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{empAnalysis.employee.display_name}</div>
                          <div className="text-sm text-gray-500">
                            {empAnalysis.employee.weekly_hours || 40}h/Woche | {empAnalysis.employee.annual_leave_days || 30} Urlaubstage
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-6 text-sm">
                        <div className="text-right">
                          <div className="text-gray-500">Verfuegbar</div>
                          <div className="font-medium">{empAnalysis.availableHours.toLocaleString('de-DE')} h</div>
                        </div>
                        <div className="text-right">
                          <div className="text-gray-500">Gebucht</div>
                          <div className="font-medium text-blue-600">{empAnalysis.bookedProjectHours.toLocaleString('de-DE')} h</div>
                        </div>
                        <div className="text-right">
                          <div className="text-gray-500">Frei</div>
                          <div className="font-medium text-green-600">{empAnalysis.freeHoursForFzul.toLocaleString('de-DE')} h</div>
                        </div>
                        <div className="w-24">
                          <div className="text-xs text-gray-500 mb-1">{empAnalysis.utilizationPercent}% Auslastung</div>
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${empAnalysis.utilizationPercent > 90 ? 'bg-red-500' : empAnalysis.utilizationPercent > 70 ? 'bg-yellow-500' : 'bg-green-500'}`}
                              style={{ width: `${Math.min(100, empAnalysis.utilizationPercent)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Details (aufgeklappt) */}
                    {expandedEmployees.has(empAnalysis.employee.id) && (
                      <div className="mt-4 ml-12 space-y-4">
                        {/* Projekte */}
                        {empAnalysis.projects.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Gebuchte Projekte:</h4>
                            <div className="space-y-1">
                              {empAnalysis.projects.map(proj => (
                                <div key={proj.projectId} className="flex items-center justify-between text-sm bg-gray-50 rounded px-3 py-2">
                                  <div className="flex items-center gap-2">
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                      proj.fundingFormat === 'ZIM' ? 'bg-blue-100 text-blue-700' :
                                      proj.fundingFormat === 'BMBF_KMU' ? 'bg-purple-100 text-purple-700' :
                                      'bg-gray-100 text-gray-700'
                                    }`}>
                                      {proj.fundingFormat}
                                    </span>
                                    <span className="font-medium">{proj.projectName}</span>
                                    {proj.fundingReference && (
                                      <span className="text-gray-500">({proj.fundingReference})</span>
                                    )}
                                  </div>
                                  <span className="font-medium">{proj.hours.toLocaleString('de-DE')} h</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Monatsübersicht */}
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Monatsuebersicht:</h4>
                          <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                              <thead>
                                <tr className="bg-gray-100">
                                  <th className="px-2 py-1 text-left font-medium text-gray-600">Monat</th>
                                  {MONTH_SHORT.map((m, idx) => (
                                    <th key={idx} className="px-2 py-1 text-center font-medium text-gray-600">{m}</th>
                                  ))}
                                  <th className="px-2 py-1 text-center font-medium text-gray-600 bg-gray-200">Summe</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr>
                                  <td className="px-2 py-1 text-gray-600">Verfuegbar</td>
                                  {empAnalysis.monthlyData.map((m, idx) => (
                                    <td key={idx} className="px-2 py-1 text-center">{m.available}</td>
                                  ))}
                                  <td className="px-2 py-1 text-center font-medium bg-gray-50">{empAnalysis.availableHours}</td>
                                </tr>
                                <tr>
                                  <td className="px-2 py-1 text-gray-600">Gebucht</td>
                                  {empAnalysis.monthlyData.map((m, idx) => (
                                    <td key={idx} className="px-2 py-1 text-center text-blue-600">{m.booked || '-'}</td>
                                  ))}
                                  <td className="px-2 py-1 text-center font-medium text-blue-600 bg-gray-50">{empAnalysis.bookedProjectHours}</td>
                                </tr>
                                <tr className="bg-green-50">
                                  <td className="px-2 py-1 text-gray-600 font-medium">Frei (FZul)</td>
                                  {empAnalysis.monthlyData.map((m, idx) => (
                                    <td key={idx} className="px-2 py-1 text-center text-green-600 font-medium">{m.free}</td>
                                  ))}
                                  <td className="px-2 py-1 text-center font-bold text-green-700 bg-green-100">{empAnalysis.freeHoursForFzul}</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        
        {/* Info-Box */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-medium mb-1">Hinweis zur Berechnung:</p>
              <ul className="list-disc list-inside space-y-1 text-amber-700">
                <li>Verfuegbare Stunden = Arbeitstage (ohne WE/Feiertage) × Tagesstunden - Urlaub</li>
                <li>Gebuchte Stunden stammen aus der V7-Zeiterfassung der Foerderprojekte</li>
                <li>Freie Stunden (FZul) = Verfuegbar - Gebucht = Potenzial fuer Forschungszulage</li>
                <li>Feiertage werden bundeslandspezifisch berechnet</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
