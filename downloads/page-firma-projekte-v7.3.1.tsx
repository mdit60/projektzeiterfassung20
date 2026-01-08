// src/app/v7/firma/projekte/page.tsx
// VERSION: v7.3.1 (SW-Release V7.3)
// DATUM: 07. Januar 2026
// BESCHREIBUNG: Projektübersicht für Firmen-Portal mit Arbeitspaketen und Firmenkennzahlen

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

// ============================================
// FARBEN
// ============================================

const COLORS = {
  beraterPortal: '#0369a1', // Ozeanblau
  firmenPortal: '#65A655',  // Cubintec-Grün
};

// ============================================
// TYPEN
// ============================================

interface UserProfile {
  id: string;
  email: string;
  role: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  client_company_id: string | null;
}

interface Project {
  id: string;
  client_company_id: string;
  name: string;
  short_name: string | null;
  funding_reference: string | null;
  funding_format: string | null;
  start_date: string | null;
  end_date: string | null;
  project_status: string | null;
  // Ansprechpartner
  project_contact_name: string | null;
  project_contact_email: string | null;
  project_contact_phone: string | null;
  project_contact_position: string | null;
  // Firmenkennzahlen
  company_employee_count: number | null;
  company_revenue_previous_year: number | null;
  company_balance_sheet_total: number | null;
  kmu_status: string | null;
  company_data_reference_date: string | null;
  // Förderdaten
  funding_quota: number | null;
  funding_amount_approved: number | null;
  total_project_cost: number | null;
  // Beschreibung
  project_summary: string | null;
  is_active: boolean;
  created_at: string;
  // Counts
  employee_count?: number;
  work_package_count?: number;
  total_pm?: number;
}

interface WorkPackage {
  id: string;
  project_id: string;
  wp_number: number;
  title: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  planned_pm: number | null;
  is_active: boolean;
}

interface Employee {
  id: string;
  display_name: string;
  position_title: string | null;
}

interface ProjectAssignment {
  id: string;
  project_id: string;
  employee_id: string;
  employee?: Employee;
}

// ============================================
// KONSTANTEN
// ============================================

const KMU_STATUS_LABELS: Record<string, string> = {
  'klein': 'Kleines Unternehmen (<50 MA, <10 Mio €)',
  'mittel': 'Mittleres Unternehmen (<250 MA, <50 Mio €)',
  'gross': 'Großes Unternehmen',
  'nicht_kmu': 'Kein KMU',
};

const PROJECT_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  'draft': { label: 'Entwurf', color: 'bg-gray-100 text-gray-700' },
  'submitted': { label: 'Eingereicht', color: 'bg-yellow-100 text-yellow-700' },
  'approved': { label: 'Bewilligt', color: 'bg-blue-100 text-blue-700' },
  'active': { label: 'Aktiv', color: 'bg-green-100 text-green-700' },
  'completed': { label: 'Abgeschlossen', color: 'bg-purple-100 text-purple-700' },
  'cancelled': { label: 'Abgebrochen', color: 'bg-red-100 text-red-700' },
};

const FUNDING_FORMAT_LABELS: Record<string, string> = {
  'ZIM': 'ZIM',
  'BMBF_KMU': 'BMBF/KMU-innovativ',
  'FZUL': 'Forschungszulage',
  'OTHER': 'Sonstige',
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
  const [companyName, setCompanyName] = useState<string>('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [workPackages, setWorkPackages] = useState<WorkPackage[]>([]);
  const [projectAssignments, setProjectAssignments] = useState<ProjectAssignment[]>([]);
  
  // Modal States
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showCompanyDataModal, setShowCompanyDataModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [saving, setSaving] = useState(false);

  // Berechtigungen
  const isAdmin = userProfile?.role === 'client_admin';
  const isProjectLeader = userProfile?.role === 'project_leader' || isAdmin;

  // ============================================
  // DATEN LADEN
  // ============================================

  const loadData = useCallback(async () => {
    try {
      // Auth prüfen
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        router.push('/login');
        return;
      }

      // Profil laden
      const { data: profile, error: profileError } = await supabase
        .from('v7_user_profiles')
        .select('*')
        .eq('email', user.email)
        .maybeSingle();

      if (profileError || !profile || !profile.client_company_id) {
        setError('Kein Firmenprofil gefunden.');
        setLoading(false);
        return;
      }

      setUserProfile(profile);

      // Firmenname laden
      const { data: company } = await supabase
        .from('v7_client_companies')
        .select('name')
        .eq('id', profile.client_company_id)
        .single();

      if (company) {
        setCompanyName(company.name);
      }

      // Projekte laden
      const { data: projectsData, error: projectsError } = await supabase
        .from('v7_projects')
        .select('*')
        .eq('client_company_id', profile.client_company_id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (projectsError) throw projectsError;

      // Für jedes Projekt: Mitarbeiter und AP-Counts laden
      const projectsWithCounts = await Promise.all(
        (projectsData || []).map(async (project) => {
          // Mitarbeiter-Count
          const { count: empCount } = await supabase
            .from('v7_project_assignments')
            .select('*', { count: 'exact', head: true })
            .eq('project_id', project.id);

          // Arbeitspakete
          const { data: wps } = await supabase
            .from('v7_work_packages')
            .select('planned_pm')
            .eq('project_id', project.id)
            .eq('is_active', true);

          const wpCount = wps?.length || 0;
          const totalPm = wps?.reduce((sum, wp) => sum + (wp.planned_pm || 0), 0) || 0;

          return {
            ...project,
            employee_count: empCount || 0,
            work_package_count: wpCount,
            total_pm: totalPm,
          };
        })
      );

      setProjects(projectsWithCounts);

    } catch (err) {
      console.error('Fehler beim Laden:', err);
      setError('Daten konnten nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  }, [router, supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ============================================
  // PROJEKT AUSWÄHLEN
  // ============================================

  const selectProject = async (project: Project) => {
    setSelectedProject(project);

    // Arbeitspakete laden
    const { data: wps } = await supabase
      .from('v7_work_packages')
      .select('*')
      .eq('project_id', project.id)
      .eq('is_active', true)
      .order('wp_number');

    setWorkPackages(wps || []);

    // Zugeordnete Mitarbeiter laden
    const { data: assignments } = await supabase
      .from('v7_project_assignments')
      .select(`
        *,
        employee:v7_employees(id, display_name, position_title)
      `)
      .eq('project_id', project.id);

    setProjectAssignments(assignments || []);
  };

  // ============================================
  // LOGOUT
  // ============================================

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  // ============================================
  // HILFSFUNKTIONEN
  // ============================================

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('de-DE');
  };

  const formatCurrency = (value: number | null) => {
    if (value === null) return '-';
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
  };

  const formatPercent = (value: number | null) => {
    if (value === null) return '-';
    return `${value.toFixed(1)} %`;
  };

  // ============================================
  // RENDER: LOADING
  // ============================================

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Projekte werden geladen...</p>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER: ERROR
  // ============================================

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Fehler</h2>
          <p className="text-gray-600 mb-4">{error}</p>
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
  // RENDER: PROJEKT-DETAIL
  // ============================================

  const renderProjectDetail = () => {
    if (!selectedProject) return null;

    const status = PROJECT_STATUS_LABELS[selectedProject.project_status || 'active'];

    return (
      <div>
        {/* Projekt-Header */}
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold text-gray-900">{selectedProject.name}</h2>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                  {status.label}
                </span>
              </div>
              {selectedProject.funding_reference && (
                <p className="text-gray-600">
                  <span className="font-medium">FKZ:</span> {selectedProject.funding_reference}
                  {selectedProject.funding_format && (
                    <span className="ml-3 px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-sm">
                      {FUNDING_FORMAT_LABELS[selectedProject.funding_format] || selectedProject.funding_format}
                    </span>
                  )}
                </p>
              )}
              <p className="text-gray-500 text-sm mt-1">
                Laufzeit: {formatDate(selectedProject.start_date)} - {formatDate(selectedProject.end_date)}
              </p>
            </div>
            <button
              onClick={() => setSelectedProject(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Statistik-Karten */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-2xl font-bold text-green-600">{selectedProject.work_package_count}</p>
              <p className="text-sm text-gray-500">Arbeitspakete</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-2xl font-bold text-blue-600">{selectedProject.employee_count}</p>
              <p className="text-sm text-gray-500">Mitarbeiter</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-2xl font-bold text-purple-600">{selectedProject.total_pm?.toFixed(1) || '0'}</p>
              <p className="text-sm text-gray-500">PM gesamt</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-2xl font-bold text-orange-600">{formatPercent(selectedProject.funding_quota)}</p>
              <p className="text-sm text-gray-500">Förderquote</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="border-b">
            <nav className="flex -mb-px">
              <button className="px-6 py-3 border-b-2 border-green-500 text-green-600 font-medium">
                Arbeitspakete ({workPackages.length})
              </button>
              <button className="px-6 py-3 border-b-2 border-transparent text-gray-500 hover:text-gray-700">
                Mitarbeiter ({projectAssignments.length})
              </button>
              <button 
                onClick={() => setShowCompanyDataModal(true)}
                className="px-6 py-3 border-b-2 border-transparent text-gray-500 hover:text-gray-700"
              >
                Firmenkennzahlen
              </button>
            </nav>
          </div>

          {/* Arbeitspakete-Liste */}
          <div className="p-6">
            {workPackages.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>Keine Arbeitspakete vorhanden.</p>
                <p className="text-sm mt-1">Arbeitspakete werden vom Berater angelegt.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {workPackages.map((wp) => (
                  <div key={wp.id} className="border rounded-lg p-4 hover:border-green-300 transition-colors">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-green-600 font-bold">AP {wp.wp_number}</span>
                          <h4 className="font-medium text-gray-900">{wp.title}</h4>
                        </div>
                        {wp.description && (
                          <p className="text-sm text-gray-500 mt-1">{wp.description}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-2">
                          {formatDate(wp.start_date)} - {formatDate(wp.end_date)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-purple-600">{wp.planned_pm || 0} PM</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Firmenkennzahlen Modal */}
        {showCompanyDataModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold">Firmenkennzahlen zum Antragszeitpunkt</h3>
                  <button onClick={() => setShowCompanyDataModal(false)} className="text-gray-400 hover:text-gray-600">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="p-6 space-y-6">
                {/* Ansprechpartner */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Projektansprechpartner</h4>
                  <div className="grid grid-cols-2 gap-4 bg-gray-50 rounded-lg p-4">
                    <div>
                      <p className="text-xs text-gray-500">Name</p>
                      <p className="font-medium">{selectedProject.project_contact_name || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Position</p>
                      <p className="font-medium">{selectedProject.project_contact_position || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">E-Mail</p>
                      <p className="font-medium">{selectedProject.project_contact_email || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Telefon</p>
                      <p className="font-medium">{selectedProject.project_contact_phone || '-'}</p>
                    </div>
                  </div>
                </div>

                {/* Kennzahlen */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Unternehmenskennzahlen</h4>
                  <div className="grid grid-cols-2 gap-4 bg-gray-50 rounded-lg p-4">
                    <div>
                      <p className="text-xs text-gray-500">Mitarbeiterzahl</p>
                      <p className="font-medium">{selectedProject.company_employee_count || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Umsatz Vorjahr</p>
                      <p className="font-medium">{formatCurrency(selectedProject.company_revenue_previous_year)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Bilanzsumme</p>
                      <p className="font-medium">{formatCurrency(selectedProject.company_balance_sheet_total)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">KMU-Status</p>
                      <p className="font-medium">
                        {selectedProject.kmu_status ? KMU_STATUS_LABELS[selectedProject.kmu_status] || selectedProject.kmu_status : '-'}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-gray-500">Stichtag der Angaben</p>
                      <p className="font-medium">{formatDate(selectedProject.company_data_reference_date)}</p>
                    </div>
                  </div>
                </div>

                {/* Förderdaten */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Förderdaten</h4>
                  <div className="grid grid-cols-2 gap-4 bg-gray-50 rounded-lg p-4">
                    <div>
                      <p className="text-xs text-gray-500">Förderquote</p>
                      <p className="font-medium">{formatPercent(selectedProject.funding_quota)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Bewilligte Fördersumme</p>
                      <p className="font-medium">{formatCurrency(selectedProject.funding_amount_approved)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Gesamtkosten</p>
                      <p className="font-medium">{formatCurrency(selectedProject.total_project_cost)}</p>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-gray-400 text-center">
                  Diese Daten wurden zum Zeitpunkt der Antragstellung erfasst und können vom Berater bearbeitet werden.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ============================================
  // RENDER: HAUPTSEITE
  // ============================================

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header - Grün für Firmen-Portal */}
      <header style={{ backgroundColor: COLORS.firmenPortal }} className="shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            {/* Links: Zurück + PZE + Titel */}
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
                <h1 className="text-lg font-semibold text-white">Projekte</h1>
                <p className="text-sm text-green-100">{companyName}</p>
              </div>
            </div>

            {/* Rechts: Benutzer + Abmelden */}
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-white">{userProfile?.display_name}</p>
                <p className="text-xs text-green-100">{isAdmin ? 'Administrator' : 'Projektleiter'}</p>
              </div>
              <button
                onClick={handleLogout}
                className="text-green-100 hover:text-white p-2 rounded-lg hover:bg-green-600 transition-colors"
                title="Abmelden"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {selectedProject ? (
          renderProjectDetail()
        ) : (
          <>
            {/* Titel */}
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Ihre Projekte</h2>
                <p className="text-gray-500">{projects.length} Projekte</p>
              </div>
            </div>

            {/* Projekt-Liste */}
            {projects.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Noch keine Projekte</h3>
                <p className="text-gray-500 text-sm">
                  Projekte werden von Ihrem Berater angelegt.
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {projects.map((project) => {
                  const status = PROJECT_STATUS_LABELS[project.project_status || 'active'];
                  return (
                    <div
                      key={project.id}
                      onClick={() => selectProject(project)}
                      className="bg-white rounded-xl shadow-sm border hover:shadow-md hover:border-green-300 transition-all cursor-pointer p-6"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">{project.name}</h3>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                              {status.label}
                            </span>
                            {project.funding_format && (
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                                {FUNDING_FORMAT_LABELS[project.funding_format] || project.funding_format}
                              </span>
                            )}
                          </div>
                          {project.funding_reference && (
                            <p className="text-gray-600 text-sm">FKZ: {project.funding_reference}</p>
                          )}
                          <p className="text-gray-400 text-sm mt-1">
                            {formatDate(project.start_date)} - {formatDate(project.end_date)}
                          </p>
                        </div>
                        <div className="flex items-center gap-6 text-center">
                          <div>
                            <p className="text-xl font-bold text-green-600">{project.work_package_count}</p>
                            <p className="text-xs text-gray-500">AP</p>
                          </div>
                          <div>
                            <p className="text-xl font-bold text-blue-600">{project.employee_count}</p>
                            <p className="text-xs text-gray-500">MA</p>
                          </div>
                          <div>
                            <p className="text-xl font-bold text-purple-600">{project.total_pm?.toFixed(1)}</p>
                            <p className="text-xs text-gray-500">PM</p>
                          </div>
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-sm text-gray-500">
            Projektzeiterfassung v7.3 · Firmen-Portal · © {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
}
