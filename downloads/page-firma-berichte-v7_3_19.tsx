// src/app/v7/firma/berichte/page.tsx
// VERSION: v7.3.19 (SW-Release V7.3)
// DATUM: 20. Januar 2026
// BESCHREIBUNG: Berichte und Statistiken im Firmen-Portal
// BERECHTIGUNG: client_admin + project_leader können ansehen

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

// ============================================
// FARBEN
// ============================================

const COLORS = {
  firmenPortal: '#65A655',  // Cubintec-Grün
};

// ============================================
// TYPEN
// ============================================

interface UserProfile {
  id: string;
  email: string;
  role: string;
  display_name: string | null;
  client_company_id: string | null;
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
  funding_reference: string | null;
  funding_format: string;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
}

interface Employee {
  id: string;
  display_name: string;
  is_active: boolean;
}

interface WorkPackage {
  id: string;
  project_id: string;
  name: string;
  total_person_months: number | null;
  is_active: boolean;
}

interface ProjectBudget {
  id: string;
  project_id: string;
  funding_amount: number | null;
}

interface TimesheetSummary {
  totalHours: number;
  entriesCount: number;
  byProject: { projectId: string; projectName: string; hours: number }[];
  byEmployee: { employeeId: string; employeeName: string; hours: number }[];
}

// ============================================
// KONSTANTEN
// ============================================

const HOURS_PER_PM = 173.33;

// ============================================
// KOMPONENTE
// ============================================

export default function FirmaBerichtePage() {
  const router = useRouter();
  const supabase = createClient();

  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [company, setCompany] = useState<ClientCompany | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [workPackages, setWorkPackages] = useState<WorkPackage[]>([]);
  const [projectBudgets, setProjectBudgets] = useState<Record<string, ProjectBudget>>({});
  const [timesheetSummary, setTimesheetSummary] = useState<TimesheetSummary | null>(null);
  
  // Filter
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // ============================================
  // DATEN LADEN
  // ============================================

  const loadAllData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        router.push('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('v7_user_profiles')
        .select('*')
        .eq('email', user.email)
        .maybeSingle();

      if (!profile || !profile.client_company_id) {
        setError('Kein Firmenprofil gefunden.');
        setLoading(false);
        return;
      }

      setUserProfile(profile);
      const companyId = profile.client_company_id;

      // Firma laden
      const { data: companyData, error: companyError } = await supabase
        .from('v7_client_companies')
        .select('id, name, short_name')
        .eq('id', companyId)
        .single();

      if (companyError) throw new Error('Firma nicht gefunden');
      setCompany(companyData);

      // Projekte laden
      const { data: projectsData } = await supabase
        .from('v7_projects')
        .select('*')
        .eq('client_company_id', companyId)
        .eq('is_active', true)
        .order('start_date', { ascending: false });

      setProjects(projectsData || []);

      // Mitarbeiter laden
      const { data: employeesData } = await supabase
        .from('v7_employees')
        .select('id, display_name, is_active')
        .eq('client_company_id', companyId)
        .eq('is_active', true)
        .order('display_name');

      setEmployees(employeesData || []);

      // Arbeitspakete laden
      if (projectsData && projectsData.length > 0) {
        const projectIds = projectsData.map(p => p.id);

        const { data: wpData } = await supabase
          .from('v7_work_packages')
          .select('*')
          .in('project_id', projectIds)
          .eq('is_active', true);

        setWorkPackages(wpData || []);

        // Budgets laden
        const { data: budgetData } = await supabase
          .from('v7_project_budget')
          .select('*')
          .in('project_id', projectIds);

        if (budgetData) {
          const budgetMap: Record<string, ProjectBudget> = {};
          budgetData.forEach(b => { budgetMap[b.project_id] = b; });
          setProjectBudgets(budgetMap);
        }
      }

      // Timesheet-Daten für ausgewählten Monat laden
      await loadTimesheetData(companyId, projectsData || [], employeesData || []);

    } catch (err) {
      console.error('Fehler beim Laden:', err);
      setError('Daten konnten nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  }, [router, supabase, selectedMonth]);

  const loadTimesheetData = async (companyId: string, projectsData: Project[], employeesData: Employee[]) => {
    try {
      // Parse selected month
      const [year, month] = selectedMonth.split('-').map(Number);
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);

      // Lade Timesheet-Einträge für den Monat
      const { data: timesheetData } = await supabase
        .from('v7_timesheet_entries')
        .select('*, work_package:v7_work_packages(project_id)')
        .gte('entry_date', startDate.toISOString().split('T')[0])
        .lte('entry_date', endDate.toISOString().split('T')[0]);

      if (!timesheetData || timesheetData.length === 0) {
        setTimesheetSummary({
          totalHours: 0,
          entriesCount: 0,
          byProject: [],
          byEmployee: [],
        });
        return;
      }

      // Filter für aktuelle Firma (über Projekte)
      const projectIds = new Set(projectsData.map(p => p.id));
      const companyTimesheets = timesheetData.filter(t => 
        t.work_package && projectIds.has(t.work_package.project_id)
      );

      // Aggregieren
      const totalHours = companyTimesheets.reduce((sum, t) => sum + (t.hours || 0), 0);
      const entriesCount = companyTimesheets.length;

      // Nach Projekt
      const projectHours: Record<string, number> = {};
      companyTimesheets.forEach(t => {
        if (t.work_package) {
          const pid = t.work_package.project_id;
          projectHours[pid] = (projectHours[pid] || 0) + (t.hours || 0);
        }
      });
      const byProject = Object.entries(projectHours).map(([projectId, hours]) => {
        const project = projectsData.find(p => p.id === projectId);
        return {
          projectId,
          projectName: project?.name || 'Unbekannt',
          hours,
        };
      }).sort((a, b) => b.hours - a.hours);

      // Nach Mitarbeiter
      const employeeHours: Record<string, number> = {};
      companyTimesheets.forEach(t => {
        if (t.employee_id) {
          employeeHours[t.employee_id] = (employeeHours[t.employee_id] || 0) + (t.hours || 0);
        }
      });
      const byEmployee = Object.entries(employeeHours).map(([employeeId, hours]) => {
        const employee = employeesData.find(e => e.id === employeeId);
        return {
          employeeId,
          employeeName: employee?.display_name || 'Unbekannt',
          hours,
        };
      }).sort((a, b) => b.hours - a.hours);

      setTimesheetSummary({
        totalHours,
        entriesCount,
        byProject,
        byEmployee,
      });

    } catch (err) {
      console.error('Fehler beim Laden der Timesheet-Daten:', err);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // ============================================
  // HILFSFUNKTIONEN
  // ============================================

  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return '0 €';
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
  };

  const formatHours = (hours: number) => {
    return hours.toFixed(1).replace('.', ',') + ' h';
  };

  const getMonthName = (monthStr: string) => {
    const [year, month] = monthStr.split('-').map(Number);
    const date = new Date(year, month - 1, 1);
    return date.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
  };

  const totalPM = workPackages.reduce((sum, wp) => sum + (wp.total_person_months || 0), 0);
  const totalFunding = Object.values(projectBudgets).reduce((sum, b) => sum + (b.funding_amount || 0), 0);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  // ============================================
  // RENDER: LOADING / ERROR
  // ============================================

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Lade Berichte...</p>
        </div>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Fehler</h2>
          <p className="text-gray-600 mb-6">{error || 'Firma nicht gefunden'}</p>
          <button
            onClick={() => router.push('/v7/firma')}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Zurück zum Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER: HAUPTSEITE
  // ============================================

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header style={{ backgroundColor: COLORS.firmenPortal }} className="shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/v7/firma')}
                className="text-green-100 hover:text-white flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Zurück
              </button>
              <div className="bg-white rounded-lg px-3 py-1.5 text-sm font-bold" style={{ color: COLORS.firmenPortal }}>
                PZE
              </div>
              <div>
                <h1 className="text-lg font-semibold text-white">Berichte</h1>
                <p className="text-sm text-green-100">
                  {company.name}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-white text-sm">{userProfile?.display_name}</span>
              <button
                onClick={handleLogout}
                className="text-green-100 hover:text-white flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Abmelden
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Berichte & Statistiken</h2>
          <p className="text-gray-500 mt-1">Übersicht über Projekte, Mitarbeiter und Zeiterfassung</p>
        </div>

        {/* Übersicht-Karten */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Förderprojekte</p>
                <p className="text-3xl font-bold text-blue-600 mt-1">{projects.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">📁</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Mitarbeiter</p>
                <p className="text-3xl font-bold text-green-600 mt-1">{employees.length}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">👥</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Arbeitspakete</p>
                <p className="text-3xl font-bold text-purple-600 mt-1">{workPackages.length}</p>
                <p className="text-xs text-gray-400 mt-1">{totalPM.toFixed(1)} PM gesamt</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">📋</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Fördervolumen</p>
                <p className="text-3xl font-bold text-orange-600 mt-1">{formatCurrency(totalFunding)}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">💰</span>
              </div>
            </div>
          </div>
        </div>

        {/* Zeiterfassung Monatsbericht */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-8">
          <div className="p-6 border-b border-gray-100">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Zeiterfassung</h3>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-500">Monat:</label>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
          </div>

          <div className="p-6">
            {timesheetSummary ? (
              <div className="space-y-6">
                {/* Zusammenfassung */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-500">Erfasste Stunden im {getMonthName(selectedMonth)}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{formatHours(timesheetSummary.totalHours)}</p>
                    <p className="text-xs text-gray-400">{timesheetSummary.entriesCount} Einträge</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-500">Entspricht</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {(timesheetSummary.totalHours / HOURS_PER_PM).toFixed(2)} PM
                    </p>
                    <p className="text-xs text-gray-400">bei {HOURS_PER_PM} h/PM</p>
                  </div>
                </div>

                {/* Nach Projekt */}
                {timesheetSummary.byProject.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-700 mb-3">Nach Projekt</h4>
                    <div className="space-y-2">
                      {timesheetSummary.byProject.map(item => (
                        <div key={item.projectId} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                          <span className="text-gray-900">{item.projectName}</span>
                          <span className="font-medium text-gray-900">{formatHours(item.hours)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Nach Mitarbeiter */}
                {timesheetSummary.byEmployee.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-700 mb-3">Nach Mitarbeiter</h4>
                    <div className="space-y-2">
                      {timesheetSummary.byEmployee.map(item => (
                        <div key={item.employeeId} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                          <span className="text-gray-900">{item.employeeName}</span>
                          <span className="font-medium text-gray-900">{formatHours(item.hours)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {timesheetSummary.totalHours === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-2">📊</div>
                    <p>Keine Zeiteinträge im {getMonthName(selectedMonth)}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                Lade Zeiterfassungsdaten...
              </div>
            )}
          </div>
        </div>

        {/* Projekt-Übersicht */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">Projektübersicht</h3>
          </div>

          <div className="divide-y divide-gray-100">
            {projects.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                Keine Projekte vorhanden
              </div>
            ) : (
              projects.map(project => {
                const projectWPs = workPackages.filter(wp => wp.project_id === project.id);
                const projectPM = projectWPs.reduce((sum, wp) => sum + (wp.total_person_months || 0), 0);
                const budget = projectBudgets[project.id];

                return (
                  <div key={project.id} className="p-6 hover:bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{project.name}</span>
                          <span className="px-2 py-0.5 text-xs font-medium rounded bg-blue-100 text-blue-800">
                            {project.funding_format}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">FKZ: {project.funding_reference || '-'}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-purple-600">{projectPM.toFixed(1)} PM</p>
                        <p className="text-sm text-gray-500">{projectWPs.length} Arbeitspakete</p>
                        {budget?.funding_amount && (
                          <p className="text-sm text-orange-600">{formatCurrency(budget.funding_amount)}</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-sm text-gray-500">
            Projektzeiterfassung v7.3.19 · Firmen-Portal · © {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
}
