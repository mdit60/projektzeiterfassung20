// src/app/v7/firma/projekte/page.tsx
// VERSION: v7.3.3 (SW-Release V7.3)
// DATUM: 07. Januar 2026
// BESCHREIBUNG: Projektübersicht mit Arbeitspaketen (CRUD), Mitarbeitern und Firmenkennzahlen
// FIX: Korrigierte Spaltennamen für v7_work_packages (ap_number, name, total_person_months)

'use client';

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
  project_contact_name: string | null;
  project_contact_email: string | null;
  project_contact_phone: string | null;
  project_contact_position: string | null;
  company_employee_count: number | null;
  company_revenue_previous_year: number | null;
  company_balance_sheet_total: number | null;
  kmu_status: string | null;
  company_data_reference_date: string | null;
  funding_quota: number | null;
  funding_amount_approved: number | null;
  total_project_cost: number | null;
  project_summary: string | null;
  is_active: boolean;
  created_at: string;
  employee_count?: number;
  work_package_count?: number;
  total_pm?: number;
}

// Korrigierte Typen für v7_work_packages
interface WorkPackage {
  id: string;
  project_id: string;
  ap_number: number;           // Spalte heißt ap_number, nicht wp_number
  ap_code: string | null;      // z.B. "AP1", "AP1.1"
  name: string;                // Spalte heißt name, nicht title
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  start_month: number | null;
  end_month: number | null;
  total_person_months: number | null;  // Spalte heißt total_person_months, nicht planned_pm
  total_costs: number | null;
  is_active: boolean;
}

interface Employee {
  id: string;
  display_name: string;
  position_title: string | null;
  email: string | null;
}

interface ProjectAssignment {
  id: string;
  project_id: string;
  employee_id: string;
  role_in_project: string | null;
  employee?: Employee;
}

interface WPFormData {
  ap_number: string;
  ap_code: string;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  total_person_months: string;
}

// ============================================
// KONSTANTEN
// ============================================

const EMPTY_WP_FORM: WPFormData = {
  ap_number: '',
  ap_code: '',
  name: '',
  description: '',
  start_date: '',
  end_date: '',
  total_person_months: '',
};

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
  
  // Tab State
  const [activeTab, setActiveTab] = useState<'workpackages' | 'employees' | 'companydata'>('workpackages');
  
  // Modal States
  const [showWPModal, setShowWPModal] = useState(false);
  const [editingWP, setEditingWP] = useState<WorkPackage | null>(null);
  const [wpFormData, setWPFormData] = useState<WPFormData>(EMPTY_WP_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Berechtigungen
  const isAdmin = userProfile?.role === 'client_admin';
  const isProjectLeader = userProfile?.role === 'project_leader' || isAdmin;

  // ============================================
  // DATEN LADEN
  // ============================================

  const loadData = useCallback(async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        router.push('/login');
        return;
      }

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

      const { data: company } = await supabase
        .from('v7_client_companies')
        .select('name')
        .eq('id', profile.client_company_id)
        .single();

      if (company) {
        setCompanyName(company.name);
      }

      const { data: projectsData, error: projectsError } = await supabase
        .from('v7_projects')
        .select('*')
        .eq('client_company_id', profile.client_company_id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (projectsError) throw projectsError;

      const projectsWithCounts = await Promise.all(
        (projectsData || []).map(async (project) => {
          const { count: empCount } = await supabase
            .from('v7_project_assignments')
            .select('*', { count: 'exact', head: true })
            .eq('project_id', project.id);

          // KORRIGIERT: total_person_months statt planned_pm
          const { data: wps } = await supabase
            .from('v7_work_packages')
            .select('total_person_months')
            .eq('project_id', project.id)
            .eq('is_active', true);

          const wpCount = wps?.length || 0;
          const totalPm = wps?.reduce((sum, wp) => sum + (wp.total_person_months || 0), 0) || 0;

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
    setActiveTab('workpackages');
    await loadProjectDetails(project.id);
  };

  const loadProjectDetails = async (projectId: string) => {
    // KORRIGIERT: Sortierung nach ap_number statt wp_number
    const { data: wps, error: wpsError } = await supabase
      .from('v7_work_packages')
      .select('*')
      .eq('project_id', projectId)
      .eq('is_active', true)
      .order('ap_number');

    if (wpsError) {
      console.error('Fehler beim Laden der Arbeitspakete:', wpsError);
    }
    
    setWorkPackages(wps || []);

    const { data: assignments } = await supabase
      .from('v7_project_assignments')
      .select(`
        *,
        employee:v7_employees(id, display_name, position_title, email)
      `)
      .eq('project_id', projectId);

    setProjectAssignments(assignments || []);
  };

  // ============================================
  // ARBEITSPAKET CRUD
  // ============================================

  const openNewWPModal = () => {
    const nextNumber = workPackages.length > 0 
      ? Math.max(...workPackages.map(wp => wp.ap_number || 0)) + 1
      : 1;
    
    setWPFormData({
      ...EMPTY_WP_FORM,
      ap_number: String(nextNumber),
      ap_code: `AP${nextNumber}`,
      start_date: selectedProject?.start_date?.split('T')[0] || '',
      end_date: selectedProject?.end_date?.split('T')[0] || '',
    });
    setEditingWP(null);
    setShowWPModal(true);
  };

  const openEditWPModal = (wp: WorkPackage) => {
    setWPFormData({
      ap_number: String(wp.ap_number),
      ap_code: wp.ap_code || '',
      name: wp.name,
      description: wp.description || '',
      start_date: wp.start_date?.split('T')[0] || '',
      end_date: wp.end_date?.split('T')[0] || '',
      total_person_months: wp.total_person_months?.toString() || '',
    });
    setEditingWP(wp);
    setShowWPModal(true);
  };

  const saveWorkPackage = async () => {
    if (!selectedProject || !wpFormData.name.trim()) return;

    setSaving(true);
    try {
      // KORRIGIERT: Richtige Spaltennamen verwenden
      const wpData = {
        project_id: selectedProject.id,
        ap_number: parseInt(wpFormData.ap_number) || 1,
        ap_code: wpFormData.ap_code.trim() || null,
        name: wpFormData.name.trim(),
        description: wpFormData.description.trim() || null,
        start_date: wpFormData.start_date || null,
        end_date: wpFormData.end_date || null,
        total_person_months: wpFormData.total_person_months ? parseFloat(wpFormData.total_person_months) : null,
        is_active: true,
      };

      if (editingWP) {
        const { error } = await supabase
          .from('v7_work_packages')
          .update(wpData)
          .eq('id', editingWP.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('v7_work_packages')
          .insert(wpData);
        if (error) throw error;
      }

      setShowWPModal(false);
      await loadProjectDetails(selectedProject.id);
      
      // Update project counts
      const updatedProject = {
        ...selectedProject,
        work_package_count: (selectedProject.work_package_count || 0) + (editingWP ? 0 : 1),
      };
      setSelectedProject(updatedProject);

    } catch (err) {
      console.error('Fehler beim Speichern:', err);
      alert('Fehler beim Speichern des Arbeitspakets');
    } finally {
      setSaving(false);
    }
  };

  const deleteWorkPackage = async (wpId: string) => {
    if (!selectedProject) return;

    try {
      const { error } = await supabase
        .from('v7_work_packages')
        .update({ is_active: false })
        .eq('id', wpId);

      if (error) throw error;

      setDeleteConfirm(null);
      await loadProjectDetails(selectedProject.id);
      
      setSelectedProject({
        ...selectedProject,
        work_package_count: Math.max(0, (selectedProject.work_package_count || 0) - 1),
      });

    } catch (err) {
      console.error('Fehler beim Löschen:', err);
      alert('Fehler beim Löschen des Arbeitspakets');
    }
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

  // AP-Code anzeigen (bevorzugt ap_code, sonst "AP" + ap_number)
  const getAPDisplay = (wp: WorkPackage) => {
    return wp.ap_code || `AP${wp.ap_number}`;
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
  // RENDER: TAB CONTENT - ARBEITSPAKETE
  // ============================================

  const renderWorkPackagesTab = () => (
    <div>
      {/* Header mit Button */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-medium text-gray-700">
          {workPackages.length} Arbeitspaket{workPackages.length !== 1 ? 'e' : ''}
        </h3>
        {isProjectLeader && (
          <button
            onClick={openNewWPModal}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Neues Arbeitspaket
          </button>
        )}
      </div>

      {/* Liste */}
      {workPackages.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="text-gray-600 mb-4">Noch keine Arbeitspakete vorhanden.</p>
          {isProjectLeader && (
            <button
              onClick={openNewWPModal}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Erstes Arbeitspaket anlegen
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {workPackages.map((wp) => (
            <div key={wp.id} className="border rounded-lg p-4 hover:border-green-300 transition-colors bg-white">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="text-green-600 font-bold text-lg">{getAPDisplay(wp)}</span>
                    <h4 className="font-medium text-gray-900">{wp.name}</h4>
                  </div>
                  {wp.description && (
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{wp.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                    <span>📅 {formatDate(wp.start_date)} - {formatDate(wp.end_date)}</span>
                    {wp.total_person_months && (
                      <span className="text-purple-600 font-medium">
                        {wp.total_person_months} PM
                      </span>
                    )}
                  </div>
                </div>
                {isProjectLeader && (
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => openEditWPModal(wp)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                      title="Bearbeiten"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(wp.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                      title="Löschen"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>

              {/* Delete Confirm */}
              {deleteConfirm === wp.id && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700 mb-2">Arbeitspaket wirklich löschen?</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => deleteWorkPackage(wp.id)}
                      className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                    >
                      Ja, löschen
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300"
                    >
                      Abbrechen
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ============================================
  // RENDER: TAB CONTENT - MITARBEITER
  // ============================================

  const renderEmployeesTab = () => (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-medium text-gray-700">
          {projectAssignments.length} zugeordnete Mitarbeiter
        </h3>
      </div>

      {projectAssignments.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <p className="text-gray-600">Noch keine Mitarbeiter zugeordnet.</p>
          <p className="text-sm text-gray-400 mt-1">Die Zuordnung erfolgt über den Berater oder im Bereich Mitarbeiter.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {projectAssignments.map((assignment) => (
            <div key={assignment.id} className="border rounded-lg p-4 bg-white flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-green-600 font-medium">
                    {assignment.employee?.display_name?.charAt(0) || '?'}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">{assignment.employee?.display_name}</p>
                  <p className="text-sm text-gray-500">
                    {assignment.employee?.position_title || 'Keine Position angegeben'}
                  </p>
                </div>
              </div>
              {assignment.role_in_project && (
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                  {assignment.role_in_project}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ============================================
  // RENDER: TAB CONTENT - FIRMENKENNZAHLEN
  // ============================================

  const renderCompanyDataTab = () => (
    <div className="space-y-6">
      {/* Ansprechpartner */}
      <div>
        <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          Projektansprechpartner
        </h4>
        <div className="grid grid-cols-2 gap-4 bg-gray-50 rounded-lg p-4">
          <div>
            <p className="text-xs text-gray-500">Name</p>
            <p className="font-medium">{selectedProject?.project_contact_name || '-'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Position</p>
            <p className="font-medium">{selectedProject?.project_contact_position || '-'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">E-Mail</p>
            <p className="font-medium">{selectedProject?.project_contact_email || '-'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Telefon</p>
            <p className="font-medium">{selectedProject?.project_contact_phone || '-'}</p>
          </div>
        </div>
      </div>

      {/* Kennzahlen */}
      <div>
        <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Unternehmenskennzahlen (zum Antragszeitpunkt)
        </h4>
        <div className="grid grid-cols-2 gap-4 bg-gray-50 rounded-lg p-4">
          <div>
            <p className="text-xs text-gray-500">Mitarbeiterzahl</p>
            <p className="font-medium">{selectedProject?.company_employee_count || '-'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Umsatz Vorjahr</p>
            <p className="font-medium">{formatCurrency(selectedProject?.company_revenue_previous_year || null)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Bilanzsumme</p>
            <p className="font-medium">{formatCurrency(selectedProject?.company_balance_sheet_total || null)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">KMU-Status</p>
            <p className="font-medium">
              {selectedProject?.kmu_status ? KMU_STATUS_LABELS[selectedProject.kmu_status] || selectedProject.kmu_status : '-'}
            </p>
          </div>
          <div className="col-span-2">
            <p className="text-xs text-gray-500">Stichtag der Angaben</p>
            <p className="font-medium">{formatDate(selectedProject?.company_data_reference_date || null)}</p>
          </div>
        </div>
      </div>

      {/* Förderdaten */}
      <div>
        <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Förderdaten
        </h4>
        <div className="grid grid-cols-2 gap-4 bg-gray-50 rounded-lg p-4">
          <div>
            <p className="text-xs text-gray-500">Förderquote</p>
            <p className="font-medium">{formatPercent(selectedProject?.funding_quota || null)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Bewilligte Fördersumme</p>
            <p className="font-medium">{formatCurrency(selectedProject?.funding_amount_approved || null)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Gesamtkosten</p>
            <p className="font-medium">{formatCurrency(selectedProject?.total_project_cost || null)}</p>
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-400 text-center">
        Diese Daten wurden zum Zeitpunkt der Antragstellung erfasst. Änderungen können über Ihren Berater vorgenommen werden.
      </p>
    </div>
  );

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
              className="text-gray-400 hover:text-gray-600 p-2"
              title="Schließen"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Statistik-Karten */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-2xl font-bold text-green-600">{workPackages.length}</p>
              <p className="text-sm text-gray-500">Arbeitspakete</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-2xl font-bold text-blue-600">{projectAssignments.length}</p>
              <p className="text-sm text-gray-500">Mitarbeiter</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-2xl font-bold text-purple-600">
                {workPackages.reduce((sum, wp) => sum + (wp.total_person_months || 0), 0).toFixed(1)}
              </p>
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
            <nav className="flex">
              <button
                onClick={() => setActiveTab('workpackages')}
                className={`px-6 py-3 border-b-2 font-medium text-sm ${
                  activeTab === 'workpackages'
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Arbeitspakete ({workPackages.length})
              </button>
              <button
                onClick={() => setActiveTab('employees')}
                className={`px-6 py-3 border-b-2 font-medium text-sm ${
                  activeTab === 'employees'
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Mitarbeiter ({projectAssignments.length})
              </button>
              <button
                onClick={() => setActiveTab('companydata')}
                className={`px-6 py-3 border-b-2 font-medium text-sm ${
                  activeTab === 'companydata'
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Firmenkennzahlen
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'workpackages' && renderWorkPackagesTab()}
            {activeTab === 'employees' && renderEmployeesTab()}
            {activeTab === 'companydata' && renderCompanyDataTab()}
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // RENDER: ARBEITSPAKET MODAL
  // ============================================

  const renderWPModal = () => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold">
              {editingWP ? 'Arbeitspaket bearbeiten' : 'Neues Arbeitspaket'}
            </h3>
            <button 
              onClick={() => setShowWPModal(false)} 
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-4 gap-4">
            <div className="col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">AP-Nr.</label>
              <input
                type="number"
                value={wpFormData.ap_number}
                onChange={(e) => setWPFormData({ ...wpFormData, ap_number: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="1"
              />
            </div>
            <div className="col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
              <input
                type="text"
                value={wpFormData.ap_code}
                onChange={(e) => setWPFormData({ ...wpFormData, ap_code: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="AP1"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">PM</label>
              <input
                type="number"
                step="0.1"
                value={wpFormData.total_person_months}
                onChange={(e) => setWPFormData({ ...wpFormData, total_person_months: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="z.B. 3.5"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bezeichnung *</label>
            <input
              type="text"
              value={wpFormData.name}
              onChange={(e) => setWPFormData({ ...wpFormData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              placeholder="Bezeichnung des Arbeitspakets"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Beschreibung</label>
            <textarea
              value={wpFormData.description}
              onChange={(e) => setWPFormData({ ...wpFormData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              placeholder="Beschreibung der Arbeiten..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Startdatum</label>
              <input
                type="date"
                value={wpFormData.start_date}
                onChange={(e) => setWPFormData({ ...wpFormData, start_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Enddatum</label>
              <input
                type="date"
                value={wpFormData.end_date}
                onChange={(e) => setWPFormData({ ...wpFormData, end_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
          </div>

          <p className="text-xs text-gray-400">1 PM = 173,33 Stunden</p>
        </div>

        <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
          <button
            onClick={() => setShowWPModal(false)}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Abbrechen
          </button>
          <button
            onClick={saveWorkPackage}
            disabled={saving || !wpFormData.name.trim()}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Speichern...
              </>
            ) : (
              'Speichern'
            )}
          </button>
        </div>
      </div>
    </div>
  );

  // ============================================
  // RENDER: HAUPTSEITE
  // ============================================

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header style={{ backgroundColor: COLORS.firmenPortal }} className="shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => selectedProject ? setSelectedProject(null) : router.push('/v7/firma')}
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
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Ihre Projekte</h2>
                <p className="text-gray-500">{projects.length} Projekt{projects.length !== 1 ? 'e' : ''}</p>
              </div>
            </div>

            {projects.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Noch keine Projekte</h3>
                <p className="text-gray-500 text-sm">
                  Wenden Sie sich an Ihren Berater, um ein Förderprojekt anzulegen.
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

      {/* Modals */}
      {showWPModal && renderWPModal()}
    </div>
  );
}
