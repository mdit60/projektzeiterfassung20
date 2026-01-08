// src/app/v7/firma/projekte/page.tsx
// VERSION: v7.3.4 (SW-Release V7.3)
// DATUM: 07. Januar 2026
// BESCHREIBUNG: Firmen-Projektseite - IDENTISCH mit Berater-Ansicht
// PRINZIP: Berater und Firma sehen gleiche Inhalte/Layouts, nur Header unterscheidet sich

'use client';

// KONSTANTE: Stunden pro Personenmonat (40h/Woche × 52 Wochen / 12 Monate)
const HOURS_PER_PM = 173.33;

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

// ============================================
// FARBEN
// ============================================

const COLORS = {
  beraterPortal: '#0369a1', // Ozeanblau
  firmenPortal: '#65A655',  // Cubintec-Grün
};

// ============================================
// TYPEN (identisch mit Berater-Seite)
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
  street: string | null;
  zip_code: string | null;
  city: string | null;
  federal_state: string | null;
  contact_person: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  is_active: boolean;
  created_at: string;
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
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  position_title: string | null;
  qualification: string | null;
  weekly_hours: number | null;
  employment_start: string | null;
  is_active: boolean;
}

interface WorkPackage {
  id: string;
  project_id: string;
  ap_number: number;
  ap_code: string | null;
  name: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  total_person_months: number | null;
  is_active: boolean;
}

interface ProjectAssignment {
  id: string;
  project_id: string;
  employee_id: string;
  role_in_project: string | null;
  is_active: boolean;
}

interface WorkPackageAssignment {
  id: string;
  work_package_id: string;
  employee_id: string;
  planned_person_months: number | null;
  is_active: boolean;
}

interface ProjectBudget {
  id: string;
  project_id: string;
  funding_amount: number | null;
  total_person_months: number | null;
}

// ============================================
// KONSTANTEN (identisch mit Berater-Seite)
// ============================================

const BUNDESLAND_NAMES: Record<string, string> = {
  'DE-BW': 'Baden-Württemberg',
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
  'DE-TH': 'Thüringen',
};

// ============================================
// KOMPONENTE
// ============================================

export default function FirmaProjektePage() {
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
  const [projectAssignments, setProjectAssignments] = useState<ProjectAssignment[]>([]);
  const [wpAssignments, setWPAssignments] = useState<WorkPackageAssignment[]>([]);
  const [projectBudgets, setProjectBudgets] = useState<Record<string, ProjectBudget>>({});

  // Tab State - IDENTISCH mit Berater
  const [activeTab, setActiveTab] = useState<'overview' | 'projects' | 'employees' | 'workpackages'>('overview');
  
  // Expandierte Projekte
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());

  // Berechtigungen
  const isAdmin = userProfile?.role === 'client_admin';

  // ============================================
  // DATEN LADEN
  // ============================================

  const loadAllData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Auth prüfen
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        router.push('/login');
        return;
      }

      // Profil laden
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

      // 1. Firma laden
      const { data: companyData, error: companyError } = await supabase
        .from('v7_client_companies')
        .select('*')
        .eq('id', companyId)
        .single();

      if (companyError) throw new Error(`Firma nicht gefunden`);
      setCompany(companyData);

      // 2. Projekte laden
      const { data: projectsData } = await supabase
        .from('v7_projects')
        .select('*')
        .eq('client_company_id', companyId)
        .eq('is_active', true)
        .order('start_date', { ascending: false });

      setProjects(projectsData || []);

      // 3. Mitarbeiter laden
      const { data: employeesData } = await supabase
        .from('v7_employees')
        .select('*')
        .eq('client_company_id', companyId)
        .eq('is_active', true)
        .order('display_name');

      setEmployees(employeesData || []);

      // 4. Arbeitspakete laden
      if (projectsData && projectsData.length > 0) {
        const projectIds = projectsData.map(p => p.id);

        const { data: wpData } = await supabase
          .from('v7_work_packages')
          .select('*')
          .in('project_id', projectIds)
          .eq('is_active', true)
          .order('ap_number');

        setWorkPackages(wpData || []);

        // 5. Budgets laden
        const { data: budgetData } = await supabase
          .from('v7_project_budget')
          .select('*')
          .in('project_id', projectIds);

        if (budgetData) {
          const budgetMap: Record<string, ProjectBudget> = {};
          budgetData.forEach(b => { budgetMap[b.project_id] = b; });
          setProjectBudgets(budgetMap);
        }

        // 6. Projekt-Zuordnungen laden
        const { data: assignmentData } = await supabase
          .from('v7_project_assignments')
          .select('*')
          .in('project_id', projectIds)
          .eq('is_active', true);

        setProjectAssignments(assignmentData || []);

        // 7. AP-Zuordnungen laden
        if (wpData && wpData.length > 0) {
          const wpIds = wpData.map(wp => wp.id);
          const { data: wpAssignData } = await supabase
            .from('v7_work_package_assignments')
            .select('*')
            .in('work_package_id', wpIds)
            .eq('is_active', true);

          setWPAssignments(wpAssignData || []);
        }
      }

    } catch (err) {
      console.error('Fehler beim Laden:', err);
      setError('Daten konnten nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  }, [router, supabase]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // ============================================
  // HILFSFUNKTIONEN (identisch mit Berater)
  // ============================================

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('de-DE');
  };

  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return '0 €';
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
  };

  const getEmployeesForProject = (projectId: string): Employee[] => {
    const assignedIds = projectAssignments
      .filter(a => a.project_id === projectId)
      .map(a => a.employee_id);
    return employees.filter(e => assignedIds.includes(e.id));
  };

  const getWorkPackagesForProject = (projectId: string): WorkPackage[] => {
    return workPackages.filter(wp => wp.project_id === projectId);
  };

  const getTotalPMForProject = (projectId: string): number => {
    return getWorkPackagesForProject(projectId)
      .reduce((sum, wp) => sum + (wp.total_person_months || 0), 0);
  };

  const getAssignedEmployeesForWP = (wpId: string): { employee: Employee; pm: number }[] => {
    const assignments = wpAssignments.filter(a => a.work_package_id === wpId);
    return assignments.map(a => {
      const employee = employees.find(e => e.id === a.employee_id);
      return {
        employee: employee!,
        pm: a.planned_person_months || 0,
      };
    }).filter(item => item.employee);
  };

  const getDistributedPMForWP = (wpId: string): number => {
    return wpAssignments
      .filter(a => a.work_package_id === wpId)
      .reduce((sum, a) => sum + (a.planned_person_months || 0), 0);
  };

  const toggleProjectExpanded = (projectId: string) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId);
    } else {
      newExpanded.add(projectId);
    }
    setExpandedProjects(newExpanded);
  };

  const getFundingFormatBadge = (format: string) => {
    const colors: Record<string, string> = {
      'ZIM': 'bg-blue-100 text-blue-800',
      'BMBF_KMU': 'bg-purple-100 text-purple-800',
      'FZUL': 'bg-green-100 text-green-800',
      'OTHER': 'bg-gray-100 text-gray-800',
    };
    const displayNames: Record<string, string> = {
      'ZIM': 'ZIM',
      'BMBF_KMU': 'BMBF',
      'FZUL': 'FZul',
      'OTHER': 'Sonstige',
    };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[format] || colors['OTHER']}`}>
        {displayNames[format] || format}
      </span>
    );
  };

  const totalFunding = Object.values(projectBudgets).reduce((sum, b) => sum + (b.funding_amount || 0), 0);

  // ============================================
  // LOGOUT
  // ============================================

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
          <p className="mt-4 text-gray-600">Lade Firmendaten...</p>
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
      {/* Header - GRÜN für Firmen-Portal */}
      <header style={{ backgroundColor: COLORS.firmenPortal }} className="shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            {/* Links: Zurück + PZE + Firmenname */}
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
                <h1 className="text-lg font-semibold text-white">{company.name}</h1>
                <p className="text-sm text-green-100">
                  Firmen-Portal • {BUNDESLAND_NAMES[company.federal_state || ''] || company.federal_state || 'Kein Bundesland'}
                </p>
              </div>
            </div>

            {/* Rechts: Benutzer + Abmelden */}
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

      {/* Tabs - IDENTISCH mit Berater (nur Farbe anders) */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex gap-8">
            {[
              { id: 'overview', label: 'Übersicht', icon: '📊' },
              { id: 'projects', label: `Projekte (${projects.length})`, icon: '📁' },
              { id: 'employees', label: `Mitarbeiter (${employees.length})`, icon: '👥' },
              { id: 'workpackages', label: `Arbeitspakete (${workPackages.length})`, icon: '📋' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`py-4 px-1 border-b-2 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ============================================ */}
        {/* TAB: ÜBERSICHT - IDENTISCH mit Berater */}
        {/* ============================================ */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Statistik-Karten */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-3xl font-bold text-blue-600">{projects.length}</div>
                <div className="text-sm text-gray-500 mt-1">Förderprojekte</div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-3xl font-bold text-green-600">{employees.length}</div>
                <div className="text-sm text-gray-500 mt-1">Mitarbeiter</div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-3xl font-bold text-purple-600">{workPackages.length}</div>
                <div className="text-sm text-gray-500 mt-1">Arbeitspakete</div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-3xl font-bold text-orange-600">{formatCurrency(totalFunding)}</div>
                <div className="text-sm text-gray-500 mt-1">Fördervolumen gesamt</div>
              </div>
            </div>

            {/* Firmendaten - IDENTISCH mit Berater */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Firmendaten</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="text-sm text-gray-500">Firmenname</div>
                  <div className="font-medium text-gray-900">{company.name}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Adresse</div>
                  <div className="font-medium text-gray-900">
                    {company.street || '-'}<br />
                    {company.zip_code} {company.city}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Bundesland</div>
                  <div className="font-medium text-gray-900">
                    {BUNDESLAND_NAMES[company.federal_state || ''] || company.federal_state || '-'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Ansprechpartner</div>
                  <div className="font-medium text-gray-900">{company.contact_person || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">E-Mail</div>
                  <div className="font-medium text-gray-900">
                    {company.contact_email ? (
                      <a href={`mailto:${company.contact_email}`} className="text-green-600 hover:underline">
                        {company.contact_email}
                      </a>
                    ) : '-'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Telefon</div>
                  <div className="font-medium text-gray-900">{company.contact_phone || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Angelegt am</div>
                  <div className="font-medium text-gray-900">{formatDate(company.created_at)}</div>
                </div>
              </div>
            </div>

            {/* Aktuelle Projekte */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Aktuelle Projekte</h3>
                <button
                  onClick={() => setActiveTab('projects')}
                  className="text-green-600 hover:text-green-700 text-sm"
                >
                  Alle anzeigen →
                </button>
              </div>
              {projects.length === 0 ? (
                <p className="text-gray-500">Noch keine Projekte vorhanden.</p>
              ) : (
                <div className="space-y-3">
                  {projects.slice(0, 3).map(project => (
                    <div key={project.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">{project.name}</span>
                            {getFundingFormatBadge(project.funding_format)}
                          </div>
                          <p className="text-sm text-gray-500">FKZ: {project.funding_reference || '-'}</p>
                        </div>
                        <span className="text-sm text-gray-400">
                          {formatDate(project.start_date)} - {formatDate(project.end_date)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================ */}
        {/* TAB: PROJEKTE - IDENTISCH mit Berater */}
        {/* ============================================ */}
        {activeTab === 'projects' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Projekte</h2>
              {/* Kein "Neues Projekt" Button für Firma - das macht der Berater */}
            </div>

            {projects.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <p className="text-gray-500">Noch keine Projekte vorhanden.</p>
                <p className="text-sm text-gray-400 mt-2">
                  Wenden Sie sich an Ihren Berater, um ein Förderprojekt anzulegen.
                </p>
              </div>
            ) : (
              projects.map(project => {
                const projectWPs = getWorkPackagesForProject(project.id);
                const projectEmployees = getEmployeesForProject(project.id);
                const totalPM = getTotalPMForProject(project.id);
                const isExpanded = expandedProjects.has(project.id);

                return (
                  <div key={project.id} className="bg-white rounded-lg shadow overflow-hidden">
                    {/* Projekt-Header */}
                    <div 
                      className="p-4 cursor-pointer hover:bg-gray-50"
                      onClick={() => toggleProjectExpanded(project.id)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-start gap-3">
                          <button className="mt-1 text-gray-400">
                            <svg 
                              className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} 
                              fill="none" 
                              stroke="currentColor" 
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-gray-900">{project.name}</span>
                              {getFundingFormatBadge(project.funding_format)}
                            </div>
                            <p className="text-sm text-gray-500">FKZ: {project.funding_reference || '-'}</p>
                            
                            {/* MA-Chips - IDENTISCH mit Berater */}
                            {projectEmployees.length > 0 && (
                              <div className="mt-2">
                                <span className="text-xs text-gray-400 uppercase">Zugeordnete Mitarbeiter</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {projectEmployees.map(emp => (
                                    <span 
                                      key={emp.id}
                                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-700"
                                    >
                                      👤 {emp.display_name}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-sm text-gray-400">
                            {formatDate(project.start_date)} - {formatDate(project.end_date)}
                          </span>
                        </div>
                      </div>
                      
                      {/* Projekt-Statistik */}
                      <div className="mt-3 pt-3 border-t flex items-center gap-6 text-sm text-gray-500">
                        <span>📋 {projectWPs.length} Arbeitspakete</span>
                        <span>•</span>
                        <span>{totalPM.toFixed(1)} PM gesamt</span>
                      </div>
                    </div>

                    {/* Expandierter Bereich: Arbeitspakete - IDENTISCH mit Berater */}
                    {isExpanded && projectWPs.length > 0 && (
                      <div className="border-t bg-gray-50 p-4">
                        <h4 className="font-medium text-gray-700 mb-3">Arbeitspakete</h4>
                        <div className="space-y-2">
                          {projectWPs.map(wp => {
                            const assignedEmps = getAssignedEmployeesForWP(wp.id);
                            const distributedPM = getDistributedPMForWP(wp.id);
                            
                            return (
                              <div key={wp.id} className="bg-white rounded border p-3">
                                <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-green-600 font-medium">
                                        {wp.ap_code || `AP${wp.ap_number}`}
                                      </span>
                                      <span className="text-gray-900">{wp.name}</span>
                                    </div>
                                    
                                    {/* Zugeordnete MA mit PM - IDENTISCH mit Berater */}
                                    {assignedEmps.length > 0 && (
                                      <div className="mt-2 flex flex-wrap gap-1">
                                        {assignedEmps.map(({ employee, pm }) => (
                                          <span 
                                            key={employee.id}
                                            className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-green-100 text-green-700"
                                          >
                                            {employee.display_name} ({pm.toFixed(2)} PM)
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                    
                                    <div className="mt-1 text-xs text-gray-400">
                                      Verteilt: {distributedPM.toFixed(2)} / {(wp.total_person_months || 0).toFixed(2)} PM
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="font-medium text-purple-600">
                                      {(wp.total_person_months || 0).toFixed(2)} PM
                                    </div>
                                    <div className="text-xs text-gray-400">
                                      = {((wp.total_person_months || 0) * HOURS_PER_PM).toFixed(0)} h
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ============================================ */}
        {/* TAB: MITARBEITER - IDENTISCH mit Berater */}
        {/* ============================================ */}
        {activeTab === 'employees' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Mitarbeiter</h2>
              {/* Kein "Neuer MA" Button für Firma vorerst */}
            </div>

            {employees.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <p className="text-gray-500">Noch keine Mitarbeiter vorhanden.</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Position / Qualifikation</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Wochenstunden</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Beschäftigt seit</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {employees.map(emp => (
                      <tr key={emp.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-900">{emp.display_name}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-gray-900">{emp.position_title || '-'}</div>
                          <div className="text-sm text-gray-500">{emp.qualification || 'keine Ausbildung'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                          {emp.weekly_hours || 40} h
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                          {formatDate(emp.employment_start)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                            Aktiv
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ============================================ */}
        {/* TAB: ARBEITSPAKETE - IDENTISCH mit Berater */}
        {/* ============================================ */}
        {activeTab === 'workpackages' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Arbeitspakete</h2>
              {/* Kein "Neues AP" Button für Firma vorerst */}
            </div>

            {workPackages.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <p className="text-gray-500">Noch keine Arbeitspakete vorhanden.</p>
              </div>
            ) : (
              // Gruppiert nach Projekt
              projects.map(project => {
                const projectWPs = getWorkPackagesForProject(project.id);
                if (projectWPs.length === 0) return null;

                const totalPM = projectWPs.reduce((sum, wp) => sum + (wp.total_person_months || 0), 0);

                return (
                  <div key={project.id} className="bg-white rounded-lg shadow overflow-hidden">
                    {/* Projekt-Header */}
                    <div className="bg-gray-50 px-4 py-3 border-b flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{project.name}</span>
                        {getFundingFormatBadge(project.funding_format)}
                        <span className="text-sm text-gray-500">FKZ: {project.funding_reference}</span>
                      </div>
                      <div className="text-sm text-gray-500">
                        {projectWPs.length} AP • {totalPM.toFixed(1)} PM ({(totalPM * HOURS_PER_PM).toFixed(0)} h)
                      </div>
                    </div>

                    {/* AP-Liste */}
                    <div className="divide-y divide-gray-100">
                      {projectWPs.map(wp => {
                        const assignedEmps = getAssignedEmployeesForWP(wp.id);
                        const distributedPM = getDistributedPMForWP(wp.id);

                        return (
                          <div key={wp.id} className="p-4 hover:bg-gray-50">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-green-600 font-bold">
                                    {wp.ap_code || `AP${wp.ap_number}`}
                                  </span>
                                  <span className="text-gray-900">{wp.name}</span>
                                </div>

                                {/* Zugeordnete MA */}
                                {assignedEmps.length > 0 ? (
                                  <div className="mt-2">
                                    <span className="text-xs text-gray-400">Zugeordnete MA:</span>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {assignedEmps.map(({ employee, pm }) => (
                                        <span 
                                          key={employee.id}
                                          className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-green-100 text-green-700"
                                        >
                                          {employee.display_name} ({pm.toFixed(2)} PM)
                                        </span>
                                      ))}
                                    </div>
                                    <div className="text-xs text-gray-400 mt-1">
                                      Verteilt: {distributedPM.toFixed(2)} / {(wp.total_person_months || 0).toFixed(2)} PM
                                    </div>
                                  </div>
                                ) : (
                                  <div className="mt-2 text-xs text-gray-400">
                                    Keine Mitarbeiter zugeordnet
                                  </div>
                                )}
                              </div>
                              <div className="text-right">
                                <div className="text-lg font-semibold text-purple-600">
                                  {(wp.total_person_months || 0).toFixed(2)} PM
                                </div>
                                <div className="text-xs text-gray-400">
                                  = {((wp.total_person_months || 0) * HOURS_PER_PM).toFixed(0)} h
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-sm text-gray-500">
            Projektzeiterfassung v7.3 · Firmen-Portal · © {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
}
