// src/app/v7/berater/fzul/firma/[id]/page.tsx
// ============================================================================
// PZE V7.4 - FZul Firmenanalyse (Berater-Portal)
// ============================================================================
// Version: 7.4.1
// Datum: 05. Februar 2026
//
// Route: /v7/berater/fzul/firma/[id]
// Wird aufgerufen von: /v7/berater/fzul (Firmenauswahl)
//
// Zeigt die Kapazitaetsanalyse fuer eine einzelne Firma:
// - Alle Mitarbeiter mit verfuegbaren/gebuchten/freien Stunden
// - Monatsdetails pro MA
// - Projektbuchungen
// ============================================================================

'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  BarChart3,
  Building2,
  Users,
  Calendar,
  TrendingUp,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowLeft,
  RefreshCw,
  FileSpreadsheet,
  Download,
} from 'lucide-react';

// ============================================================================
// KONSTANTEN
// ============================================================================

const COLORS = {
  beraterPortal: '#0369a1',
};

const MONTH_NAMES = [
  'Januar', 'Februar', 'Maerz', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
];

const MONTH_SHORT = ['Jan', 'Feb', 'Mrz', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

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
  city: string | null;
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
  availableHours: number;
  bookedProjectHours: number;
  freeHoursForFzul: number;
  utilizationPercent: number;
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
      
      if (dayOfWeek === 0 || dayOfWeek === 6) continue;
      if (holidays.has(dateStr)) continue;
      
      workingDays++;
    }
    
    const hoursPerDay = weeklyHours / 5;
    const monthHours = workingDays * hoursPerDay;
    monthlyHours.push(monthHours);
    totalAvailable += monthHours;
  }
  
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

export default function FzulFirmaAnalysePage() {
  const router = useRouter();
  const params = useParams();
  const supabase = createClient();
  const firmaId = params.id as string;
  
  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  
  // Daten
  const [company, setCompany] = useState<ClientCompany | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [timesheets, setTimesheets] = useState<TimesheetEntry[]>([]);
  
  // Filter
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  
  // UI State
  const [expandedEmployees, setExpandedEmployees] = useState<Set<string>>(new Set());
  
  // ============================================================================
  // DATEN LADEN
  // ============================================================================
  
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
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
      
      if (!['system_admin', 'consultant'].includes(profileData.role)) {
        setError('Keine Berechtigung fuer diese Seite');
        return;
      }
      
      setProfile(profileData);
      
      // 2. Firma laden
      const { data: companyData, error: companyError } = await supabase
        .from('v7_client_companies')
        .select('*')
        .eq('id', firmaId)
        .single();
      
      if (companyError || !companyData) {
        setError('Firma nicht gefunden');
        return;
      }
      
      setCompany(companyData);
      
      // 3. Mitarbeiter laden
      const { data: employeesData } = await supabase
        .from('v7_employees')
        .select('*')
        .eq('client_company_id', firmaId)
        .eq('is_active', true)
        .order('display_name');
      
      setEmployees(employeesData || []);
      
      // 4. Projekte laden (nur Foerderprojekte)
      const { data: projectsData } = await supabase
        .from('v7_projects')
        .select('*')
        .eq('client_company_id', firmaId)
        .neq('funding_format', 'FZUL')
        .eq('is_active', true);
      
      setProjects(projectsData || []);
      
    } catch (err) {
      console.error('Fehler beim Laden:', err);
      setError('Fehler beim Laden der Daten');
    } finally {
      setLoading(false);
    }
  }, [firmaId, router, supabase]);
  
  const loadTimesheets = useCallback(async () => {
    if (!firmaId) return;
    
    try {
      const startDate = `${selectedYear}-01-01`;
      const endDate = `${selectedYear}-12-31`;
      
      // Alle Mitarbeiter-IDs dieser Firma
      const employeeIds = employees.map(e => e.id);
      if (employeeIds.length === 0) return;
      
      const { data: timesheetData } = await supabase
        .from('v7_timesheets')
        .select('*')
        .in('employee_id', employeeIds)
        .gte('work_date', startDate)
        .lte('work_date', endDate)
        .eq('is_active', true);
      
      setTimesheets(timesheetData || []);
      
    } catch (err) {
      console.error('Fehler beim Laden der Zeiterfassung:', err);
    }
  }, [firmaId, selectedYear, employees, supabase]);
  
  useEffect(() => {
    loadData();
  }, [loadData]);
  
  useEffect(() => {
    if (employees.length > 0) {
      loadTimesheets();
    }
  }, [employees, selectedYear, loadTimesheets]);
  
  // ============================================================================
  // ANALYSE BERECHNEN
  // ============================================================================
  
  const analysisData = useMemo((): EmployeeAnalysis[] => {
    if (!company || employees.length === 0) return [];
    
    const analyses: EmployeeAnalysis[] = [];
    
    for (const employee of employees) {
      const weeklyHours = employee.weekly_hours || 40;
      const annualLeave = employee.annual_leave_days || 30;
      const { total: availableHours, monthly: monthlyAvailable } = calculateAvailableHours(
        selectedYear,
        weeklyHours,
        annualLeave,
        company.federal_state
      );
      
      const employeeTimesheets = timesheets.filter(t => t.employee_id === employee.id);
      
      const projectBookings: Map<string, ProjectBooking> = new Map();
      const monthlyBooked: number[] = Array(12).fill(0);
      
      for (const ts of employeeTimesheets) {
        const project = projects.find(p => p.id === ts.project_id);
        if (!project) continue;
        
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
        
        const month = new Date(ts.work_date).getMonth();
        monthlyBooked[month] += ts.hours;
      }
      
      const bookedProjectHours = Array.from(projectBookings.values()).reduce((sum, p) => sum + p.hours, 0);
      const freeHoursForFzul = Math.max(0, availableHours - bookedProjectHours);
      const utilizationPercent = availableHours > 0 ? (bookedProjectHours / availableHours) * 100 : 0;
      
      const monthlyData: MonthlyData[] = monthlyAvailable.map((available, idx) => ({
        month: idx + 1,
        available: Math.round(available),
        booked: Math.round(monthlyBooked[idx]),
        free: Math.max(0, Math.round(available - monthlyBooked[idx]))
      }));
      
      analyses.push({
        employee,
        availableHours: Math.round(availableHours),
        bookedProjectHours: Math.round(bookedProjectHours),
        freeHoursForFzul: Math.round(freeHoursForFzul),
        utilizationPercent: Math.round(utilizationPercent),
        monthlyData,
        projects: Array.from(projectBookings.values())
      });
    }
    
    return analyses;
  }, [company, employees, projects, timesheets, selectedYear]);
  
  // Summen
  const totals = useMemo(() => ({
    available: analysisData.reduce((sum, e) => sum + e.availableHours, 0),
    booked: analysisData.reduce((sum, e) => sum + e.bookedProjectHours, 0),
    free: analysisData.reduce((sum, e) => sum + e.freeHoursForFzul, 0),
    employees: analysisData.length
  }), [analysisData]);
  
  // ============================================================================
  // UI HANDLER
  // ============================================================================
  
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
  
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };
  
  // ============================================================================
  // RENDER
  // ============================================================================
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin text-sky-600 mx-auto mb-2" />
            <p className="text-gray-600">Lade Firmendaten...</p>
          </div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto p-6 pt-20">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => router.push('/v7/berater/fzul')}
              className="mt-4 text-sm text-red-600 hover:text-red-800"
            >
              Zurueck zur Firmenauswahl
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header style={{ backgroundColor: COLORS.beraterPortal }} className="shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/v7/berater/fzul')}
                className="text-blue-200 hover:text-white flex items-center gap-1"
              >
                <ArrowLeft className="w-4 h-4" />
                Zurueck
              </button>
              <div className="bg-white rounded-lg px-3 py-1.5 text-sm font-bold" style={{ color: COLORS.beraterPortal }}>
                PZE
              </div>
              <div>
                <h1 className="text-lg font-semibold text-white">FZul-Analyse</h1>
                <p className="text-sm text-blue-200">{company?.name}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <span className="text-white text-sm">{profile?.display_name}</span>
              <button
                onClick={handleLogout}
                className="text-blue-200 hover:text-white"
              >
                Abmelden
              </button>
            </div>
          </div>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Firmen-Info + Jahr-Auswahl */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-sky-100 rounded-lg flex items-center justify-center">
                <Building2 className="w-6 h-6 text-sky-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{company?.name}</h2>
                <p className="text-gray-500">
                  {company?.city && `${company.city}, `}
                  {BUNDESLAENDER[company?.federal_state || ''] || company?.federal_state}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Analysejahr</label>
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
            </div>
          </div>
        </div>
        
        {/* Kennzahlen */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
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
        
        {/* Keine Mitarbeiter */}
        {analysisData.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Keine Mitarbeiter gefunden</h3>
            <p className="text-gray-500">
              Fuer diese Firma sind noch keine Mitarbeiter angelegt.
            </p>
          </div>
        )}
        
        {/* Mitarbeiter-Liste */}
        {analysisData.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b">
              <h3 className="font-semibold text-gray-900">Mitarbeiter-Analyse {selectedYear}</h3>
            </div>
            
            <div className="divide-y">
              {analysisData.map(empAnalysis => (
                <div key={empAnalysis.employee.id} className="p-4">
                  {/* MA-Zeile */}
                  <div 
                    className="flex items-center justify-between cursor-pointer hover:bg-gray-50 -m-2 p-2 rounded"
                    onClick={() => toggleEmployeeExpanded(empAnalysis.employee.id)}
                  >
                    <div className="flex items-center gap-3">
                      {expandedEmployees.has(empAnalysis.employee.id) ? (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      )}
                      <div className="w-10 h-10 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center text-sm font-medium">
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
                      <div className="text-right hidden sm:block">
                        <div className="text-gray-500">Verfuegbar</div>
                        <div className="font-medium">{empAnalysis.availableHours.toLocaleString('de-DE')} h</div>
                      </div>
                      <div className="text-right hidden sm:block">
                        <div className="text-gray-500">Gebucht</div>
                        <div className="font-medium text-blue-600">{empAnalysis.bookedProjectHours.toLocaleString('de-DE')} h</div>
                      </div>
                      <div className="text-right">
                        <div className="text-gray-500">Frei (FZul)</div>
                        <div className="font-medium text-green-600">{empAnalysis.freeHoursForFzul.toLocaleString('de-DE')} h</div>
                      </div>
                      <div className="w-20 hidden md:block">
                        <div className="text-xs text-gray-500 mb-1">{empAnalysis.utilizationPercent}%</div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${empAnalysis.utilizationPercent > 90 ? 'bg-red-500' : empAnalysis.utilizationPercent > 70 ? 'bg-yellow-500' : 'bg-green-500'}`}
                            style={{ width: `${Math.min(100, empAnalysis.utilizationPercent)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Details */}
                  {expandedEmployees.has(empAnalysis.employee.id) && (
                    <div className="mt-4 ml-8 space-y-4">
                      {/* Projekte */}
                      {empAnalysis.projects.length > 0 ? (
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Gebuchte Foerderprojekte:</h4>
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
                      ) : (
                        <div className="text-sm text-gray-500 bg-gray-50 rounded px-3 py-2">
                          Keine Projektstunden erfasst - alle Stunden frei fuer FZul
                        </div>
                      )}
                      
                      {/* Monatsuebersicht */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Monatsuebersicht {selectedYear}:</h4>
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-sm">
                            <thead>
                              <tr className="bg-gray-100">
                                <th className="px-2 py-1 text-left font-medium text-gray-600 w-24"></th>
                                {MONTH_SHORT.map((m, idx) => (
                                  <th key={idx} className="px-2 py-1 text-center font-medium text-gray-600 w-12">{m}</th>
                                ))}
                                <th className="px-3 py-1 text-center font-medium text-gray-700 bg-gray-200">Summe</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td className="px-2 py-1 text-gray-600">Verfuegbar</td>
                                {empAnalysis.monthlyData.map((m, idx) => (
                                  <td key={idx} className="px-2 py-1 text-center text-gray-700">{m.available}</td>
                                ))}
                                <td className="px-3 py-1 text-center font-medium bg-gray-50">{empAnalysis.availableHours}</td>
                              </tr>
                              <tr>
                                <td className="px-2 py-1 text-gray-600">Gebucht</td>
                                {empAnalysis.monthlyData.map((m, idx) => (
                                  <td key={idx} className="px-2 py-1 text-center text-blue-600">{m.booked || '-'}</td>
                                ))}
                                <td className="px-3 py-1 text-center font-medium text-blue-600 bg-gray-50">{empAnalysis.bookedProjectHours}</td>
                              </tr>
                              <tr className="bg-green-50">
                                <td className="px-2 py-1 text-gray-700 font-medium">Frei (FZul)</td>
                                {empAnalysis.monthlyData.map((m, idx) => (
                                  <td key={idx} className="px-2 py-1 text-center text-green-600 font-medium">{m.free}</td>
                                ))}
                                <td className="px-3 py-1 text-center font-bold text-green-700 bg-green-100">{empAnalysis.freeHoursForFzul}</td>
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
          </div>
        )}
        
        {/* Info-Box */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-medium mb-1">Berechnungsgrundlage:</p>
              <ul className="list-disc list-inside space-y-1 text-amber-700">
                <li>Verfuegbar = Arbeitstage (ohne WE/Feiertage) × Tagesstunden - Urlaub</li>
                <li>Gebucht = Erfasste Stunden in Foerderprojekten (ZIM, BMBF etc.)</li>
                <li>Frei (FZul) = Verfuegbar - Gebucht = Potenzial fuer Forschungszulage</li>
                <li>Feiertage werden fuer {BUNDESLAENDER[company?.federal_state || ''] || company?.federal_state} berechnet</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
