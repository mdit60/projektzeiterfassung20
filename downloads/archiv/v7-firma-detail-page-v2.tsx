// src/app/v7/berater/foerderung/firma/[id]/page.tsx
// VERSION: v7.1.3 - Firmen-Detailseite mit Projekt & MA CRUD
// DATUM: 03. Januar 2026

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

// ============================================
// TYPEN
// ============================================

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
  internal_notes: string | null;
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
  fzul_vorhaben_title: string | null;
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
  employment_end: string | null;
  is_active: boolean;
}

interface WorkPackage {
  id: string;
  project_id: string;
  ap_number: number;
  ap_code: string | null;
  name: string;
  start_month: number | null;
  end_month: number | null;
  total_person_months: number | null;
  total_costs: number | null;
}

interface ProjectBudget {
  id: string;
  project_id: string;
  total_costs: number | null;
  personnel_costs: number | null;
  funding_rate: number | null;
  funding_amount: number | null;
  duration_months: number | null;
  total_person_months: number | null;
}

// Form Types
interface ProjectFormData {
  name: string;
  short_name: string;
  funding_reference: string;
  funding_format: string;
  start_date: string;
  end_date: string;
  fzul_vorhaben_title: string;
}

interface EmployeeFormData {
  display_name: string;
  first_name: string;
  last_name: string;
  email: string;
  position_title: string;
  qualification: string;
  weekly_hours: string;
  employment_start: string;
  employment_end: string;
}

const EMPTY_PROJECT_FORM: ProjectFormData = {
  name: '',
  short_name: '',
  funding_reference: '',
  funding_format: 'ZIM',
  start_date: '',
  end_date: '',
  fzul_vorhaben_title: '',
};

const EMPTY_EMPLOYEE_FORM: EmployeeFormData = {
  display_name: '',
  first_name: '',
  last_name: '',
  email: '',
  position_title: '',
  qualification: '',
  weekly_hours: '40',
  employment_start: '',
  employment_end: '',
};

// ============================================
// KONSTANTEN
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

const FUNDING_FORMATS = [
  { code: 'ZIM', name: 'ZIM' },
  { code: 'BMBF_KMU', name: 'BMBF/KMU-innovativ' },
  { code: 'FZUL', name: 'Forschungszulage' },
  { code: 'OTHER', name: 'Sonstige' },
];

// ============================================
// KOMPONENTE
// ============================================

export default function FirmaDetailPage() {
  const router = useRouter();
  const params = useParams();
  const companyId = params.id as string;
  const supabase = createClient();

  // State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [company, setCompany] = useState<ClientCompany | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [workPackages, setWorkPackages] = useState<WorkPackage[]>([]);
  const [projectBudgets, setProjectBudgets] = useState<Record<string, ProjectBudget>>({});
  
  // Tab-State
  const [activeTab, setActiveTab] = useState<'overview' | 'projects' | 'employees' | 'workpackages'>('overview');
  
  // Expandierte Projekte
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());

  // Project Modal State
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [projectModalMode, setProjectModalMode] = useState<'create' | 'edit'>('create');
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [projectFormData, setProjectFormData] = useState<ProjectFormData>(EMPTY_PROJECT_FORM);
  const [projectFormError, setProjectFormError] = useState<string | null>(null);

  // Employee Modal State
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [employeeModalMode, setEmployeeModalMode] = useState<'create' | 'edit'>('create');
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [employeeFormData, setEmployeeFormData] = useState<EmployeeFormData>(EMPTY_EMPLOYEE_FORM);
  const [employeeFormError, setEmployeeFormError] = useState<string | null>(null);

  // Delete Confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteType, setDeleteType] = useState<'project' | 'employee'>('project');
  const [itemToDelete, setItemToDelete] = useState<Project | Employee | null>(null);

  // ============================================
  // DATEN LADEN
  // ============================================

  useEffect(() => {
    if (companyId) {
      loadAllData();
    }
  }, [companyId]);

  const loadAllData = async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Firma laden
      const { data: companyData, error: companyError } = await supabase
        .from('v7_client_companies')
        .select('*')
        .eq('id', companyId)
        .single();

      if (companyError) throw new Error(`Firma nicht gefunden: ${companyError.message}`);
      setCompany(companyData);

      // 2. Projekte laden
      const { data: projectsData, error: projectsError } = await supabase
        .from('v7_projects')
        .select('*')
        .eq('client_company_id', companyId)
        .eq('is_active', true)
        .order('start_date', { ascending: false });

      if (projectsError) throw new Error(`Projekte-Fehler: ${projectsError.message}`);
      setProjects(projectsData || []);

      // 3. Mitarbeiter laden
      const { data: employeesData, error: employeesError } = await supabase
        .from('v7_employees')
        .select('*')
        .eq('client_company_id', companyId)
        .eq('is_active', true)
        .order('display_name');

      if (employeesError) throw new Error(`Mitarbeiter-Fehler: ${employeesError.message}`);
      setEmployees(employeesData || []);

      // 4. Arbeitspakete laden
      if (projectsData && projectsData.length > 0) {
        const projectIds = projectsData.map(p => p.id);
        
        const { data: wpData, error: wpError } = await supabase
          .from('v7_work_packages')
          .select('*')
          .in('project_id', projectIds)
          .eq('is_active', true)
          .order('ap_number');

        if (wpError) throw new Error(`Arbeitspakete-Fehler: ${wpError.message}`);
        setWorkPackages(wpData || []);

        // 5. Budgets laden
        const { data: budgetData, error: budgetError } = await supabase
          .from('v7_project_budget')
          .select('*')
          .in('project_id', projectIds);

        if (!budgetError && budgetData) {
          const budgetMap: Record<string, ProjectBudget> = {};
          budgetData.forEach(b => {
            budgetMap[b.project_id] = b;
          });
          setProjectBudgets(budgetMap);
        }
      }

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // PROJECT CRUD
  // ============================================

  const openCreateProjectModal = () => {
    setProjectModalMode('create');
    setEditingProject(null);
    setProjectFormData(EMPTY_PROJECT_FORM);
    setProjectFormError(null);
    setShowProjectModal(true);
  };

  const openEditProjectModal = (project: Project) => {
    setProjectModalMode('edit');
    setEditingProject(project);
    setProjectFormData({
      name: project.name || '',
      short_name: project.short_name || '',
      funding_reference: project.funding_reference || '',
      funding_format: project.funding_format || 'ZIM',
      start_date: project.start_date || '',
      end_date: project.end_date || '',
      fzul_vorhaben_title: project.fzul_vorhaben_title || '',
    });
    setProjectFormError(null);
    setShowProjectModal(true);
  };

  const closeProjectModal = () => {
    setShowProjectModal(false);
    setEditingProject(null);
    setProjectFormData(EMPTY_PROJECT_FORM);
    setProjectFormError(null);
  };

  const handleProjectInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProjectFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveProject = async () => {
    if (!projectFormData.name.trim()) {
      setProjectFormError('Projektname ist erforderlich');
      return;
    }

    setSaving(true);
    setProjectFormError(null);

    try {
      const projectData = {
        name: projectFormData.name.trim(),
        short_name: projectFormData.short_name.trim() || null,
        funding_reference: projectFormData.funding_reference.trim() || null,
        funding_format: projectFormData.funding_format || 'ZIM',
        start_date: projectFormData.start_date || null,
        end_date: projectFormData.end_date || null,
        fzul_vorhaben_title: projectFormData.fzul_vorhaben_title.trim() || null,
        updated_at: new Date().toISOString(),
      };

      if (projectModalMode === 'create') {
        const { error: insertError } = await supabase
          .from('v7_projects')
          .insert({
            ...projectData,
            client_company_id: companyId,
            is_active: true,
          });

        if (insertError) {
          setProjectFormError(insertError.message);
          return;
        }
      } else if (projectModalMode === 'edit' && editingProject) {
        const { error: updateError } = await supabase
          .from('v7_projects')
          .update(projectData)
          .eq('id', editingProject.id);

        if (updateError) {
          setProjectFormError(updateError.message);
          return;
        }
      }

      closeProjectModal();
      await loadAllData();

    } catch (err: any) {
      setProjectFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // ============================================
  // EMPLOYEE CRUD
  // ============================================

  const openCreateEmployeeModal = () => {
    setEmployeeModalMode('create');
    setEditingEmployee(null);
    setEmployeeFormData(EMPTY_EMPLOYEE_FORM);
    setEmployeeFormError(null);
    setShowEmployeeModal(true);
  };

  const openEditEmployeeModal = (employee: Employee) => {
    setEmployeeModalMode('edit');
    setEditingEmployee(employee);
    setEmployeeFormData({
      display_name: employee.display_name || '',
      first_name: employee.first_name || '',
      last_name: employee.last_name || '',
      email: employee.email || '',
      position_title: employee.position_title || '',
      qualification: employee.qualification || '',
      weekly_hours: employee.weekly_hours?.toString() || '40',
      employment_start: employee.employment_start || '',
      employment_end: employee.employment_end || '',
    });
    setEmployeeFormError(null);
    setShowEmployeeModal(true);
  };

  const closeEmployeeModal = () => {
    setShowEmployeeModal(false);
    setEditingEmployee(null);
    setEmployeeFormData(EMPTY_EMPLOYEE_FORM);
    setEmployeeFormError(null);
  };

  const handleEmployeeInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEmployeeFormData(prev => ({ ...prev, [name]: value }));
    
    // Auto-generate display_name
    if (name === 'first_name' || name === 'last_name') {
      const newFirst = name === 'first_name' ? value : employeeFormData.first_name;
      const newLast = name === 'last_name' ? value : employeeFormData.last_name;
      if (newFirst || newLast) {
        setEmployeeFormData(prev => ({
          ...prev,
          [name]: value,
          display_name: `${newLast}${newFirst && newLast ? ', ' : ''}${newFirst}`.trim(),
        }));
      }
    }
  };

  const handleSaveEmployee = async () => {
    if (!employeeFormData.display_name.trim() && !employeeFormData.first_name.trim() && !employeeFormData.last_name.trim()) {
      setEmployeeFormError('Name ist erforderlich');
      return;
    }

    setSaving(true);
    setEmployeeFormError(null);

    try {
      const displayName = employeeFormData.display_name.trim() ||
        `${employeeFormData.last_name}${employeeFormData.first_name && employeeFormData.last_name ? ', ' : ''}${employeeFormData.first_name}`.trim();

      const employeeData = {
        display_name: displayName,
        first_name: employeeFormData.first_name.trim() || null,
        last_name: employeeFormData.last_name.trim() || null,
        email: employeeFormData.email.trim() || null,
        position_title: employeeFormData.position_title.trim() || null,
        qualification: employeeFormData.qualification.trim() || null,
        weekly_hours: employeeFormData.weekly_hours ? parseFloat(employeeFormData.weekly_hours) : 40,
        employment_start: employeeFormData.employment_start || null,
        employment_end: employeeFormData.employment_end || null,
        updated_at: new Date().toISOString(),
      };

      if (employeeModalMode === 'create') {
        const { error: insertError } = await supabase
          .from('v7_employees')
          .insert({
            ...employeeData,
            client_company_id: companyId,
            is_active: true,
          });

        if (insertError) {
          if (insertError.code === '23505') {
            setEmployeeFormError('Ein Mitarbeiter mit diesem Namen existiert bereits');
          } else {
            setEmployeeFormError(insertError.message);
          }
          return;
        }
      } else if (employeeModalMode === 'edit' && editingEmployee) {
        const { error: updateError } = await supabase
          .from('v7_employees')
          .update(employeeData)
          .eq('id', editingEmployee.id);

        if (updateError) {
          setEmployeeFormError(updateError.message);
          return;
        }
      }

      closeEmployeeModal();
      await loadAllData();

    } catch (err: any) {
      setEmployeeFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // ============================================
  // DELETE
  // ============================================

  const openDeleteConfirmation = (type: 'project' | 'employee', item: Project | Employee) => {
    setDeleteType(type);
    setItemToDelete(item);
    setShowDeleteConfirm(true);
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;

    setSaving(true);

    try {
      const table = deleteType === 'project' ? 'v7_projects' : 'v7_employees';
      
      const { error: deleteError } = await supabase
        .from(table)
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', itemToDelete.id);

      if (deleteError) {
        setError(deleteError.message);
        return;
      }

      setShowDeleteConfirm(false);
      setItemToDelete(null);
      await loadAllData();

    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // ============================================
  // HELPER FUNKTIONEN
  // ============================================

  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('de-DE');
    } catch {
      return dateStr;
    }
  };

  const formatCurrency = (amount: number | null): string => {
    if (amount === null || amount === undefined) return '-';
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercent = (value: number | null): string => {
    if (value === null || value === undefined) return '-';
    return `${value}%`;
  };

  const getWorkPackagesForProject = (projectId: string): WorkPackage[] => {
    return workPackages.filter(wp => wp.project_id === projectId);
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
  // RENDER: LOADING / ERROR
  // ============================================

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
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
            onClick={() => router.push('/v7/berater/foerderung')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Zurück zur Übersicht
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
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/v7/berater/foerderung')}
                className="text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Zurück
              </button>
              <div className="h-6 w-px bg-gray-300"></div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{company.name}</h1>
                <p className="text-sm text-gray-500">
                  Förderberatung • {BUNDESLAND_NAMES[company.federal_state || ''] || company.federal_state || 'Kein Bundesland'}
                </p>
              </div>
            </div>
            <Link
              href="/v7/berater/foerderung/import"
              className="px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 text-sm font-medium"
            >
              + Projekt importieren
            </Link>
          </div>
        </div>
      </header>

      {/* Tabs */}
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
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
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
        {/* TAB: ÜBERSICHT */}
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

            {/* Firmendaten */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Firmendaten</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="text-sm text-gray-500">Firmenname</div>
                  <div className="font-medium text-gray-900">{company.name}</div>
                </div>
                {company.short_name && (
                  <div>
                    <div className="text-sm text-gray-500">Kurzname</div>
                    <div className="font-medium text-gray-900">{company.short_name}</div>
                  </div>
                )}
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
                      <a href={`mailto:${company.contact_email}`} className="text-blue-600 hover:underline">
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
                  className="text-blue-600 hover:underline text-sm"
                >
                  Alle anzeigen →
                </button>
              </div>
              {projects.length === 0 ? (
                <p className="text-gray-500">Noch keine Projekte angelegt.</p>
              ) : (
                <div className="space-y-3">
                  {projects.slice(0, 3).map(project => (
                    <div key={project.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium text-gray-900">{project.name}</div>
                        {project.funding_reference && (
                          <div className="text-sm text-gray-500">FKZ: {project.funding_reference}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        {getFundingFormatBadge(project.funding_format)}
                        <span className="text-sm text-gray-500">
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
        {/* TAB: PROJEKTE */}
        {/* ============================================ */}
        {activeTab === 'projects' && (
          <div className="space-y-4">
            {/* Header mit Button */}
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Projekte</h3>
              <button
                onClick={openCreateProjectModal}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Neues Projekt
              </button>
            </div>

            {projects.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <div className="text-5xl mb-4">📁</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Keine Projekte vorhanden</h3>
                <p className="text-gray-500 mb-4">Legen Sie ein neues Projekt an oder importieren Sie einen ZIM-Antrag.</p>
                <button
                  onClick={openCreateProjectModal}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  + Neues Projekt
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {projects.map(project => {
                  const budget = projectBudgets[project.id];
                  const wps = getWorkPackagesForProject(project.id);

                  return (
                    <div key={project.id} className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow group relative">
                      {/* Edit/Delete Buttons */}
                      <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEditProjectModal(project)}
                          className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded text-gray-600"
                          title="Bearbeiten"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => openDeleteConfirmation('project', project)}
                          className="p-1.5 bg-gray-100 hover:bg-red-100 rounded text-gray-600 hover:text-red-600"
                          title="Löschen"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>

                      <div className="flex justify-between items-start mb-4 pr-20">
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <h4 className="text-lg font-semibold text-gray-900">{project.name}</h4>
                            {getFundingFormatBadge(project.funding_format)}
                          </div>
                          {project.funding_reference && (
                            <p className="text-sm text-gray-500">FKZ: {project.funding_reference}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500">
                            {formatDate(project.start_date)} - {formatDate(project.end_date)}
                          </p>
                        </div>
                      </div>

                      {budget && (
                        <div className="grid grid-cols-4 gap-4 py-4 border-t border-b mb-4">
                          <div>
                            <div className="text-xs text-gray-500 uppercase">Gesamtkosten</div>
                            <div className="font-semibold text-gray-900">{formatCurrency(budget.total_costs)}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 uppercase">Förderung</div>
                            <div className="font-semibold text-green-600">{formatCurrency(budget.funding_amount)}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 uppercase">Förderquote</div>
                            <div className="font-semibold text-gray-900">{formatPercent(budget.funding_rate)}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 uppercase">Laufzeit</div>
                            <div className="font-semibold text-gray-900">{budget.duration_months || '-'} Monate</div>
                          </div>
                        </div>
                      )}

                      {wps.length > 0 && (
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <span>📋 {wps.length} Arbeitspakete</span>
                          <span>•</span>
                          <span>
                            {wps.reduce((sum, wp) => sum + (wp.total_person_months || 0), 0).toFixed(1)} PM gesamt
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ============================================ */}
        {/* TAB: MITARBEITER */}
        {/* ============================================ */}
        {activeTab === 'employees' && (
          <div className="space-y-4">
            {/* Header mit Button */}
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Mitarbeiter</h3>
              <button
                onClick={openCreateEmployeeModal}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Neuer Mitarbeiter
              </button>
            </div>

            {employees.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <div className="text-5xl mb-4">👥</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Keine Mitarbeiter vorhanden</h3>
                <p className="text-gray-500 mb-4">Legen Sie Mitarbeiter an, die an Förderprojekten arbeiten.</p>
                <button
                  onClick={openCreateEmployeeModal}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  + Neuer Mitarbeiter
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Position / Qualifikation</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Wochenstunden</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Beschäftigt seit</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Aktionen</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {employees.map(emp => (
                      <tr key={emp.id} className="hover:bg-gray-50 group">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-900">{emp.display_name}</div>
                          {emp.email && <div className="text-sm text-gray-500">{emp.email}</div>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{emp.position_title || '-'}</div>
                          {emp.qualification && <div className="text-sm text-gray-500">{emp.qualification}</div>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {emp.weekly_hours ? `${emp.weekly_hours} h` : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(emp.employment_start)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            emp.is_active && !emp.employment_end
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {emp.is_active && !emp.employment_end ? 'Aktiv' : 'Inaktiv'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => openEditEmployeeModal(emp)}
                              className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded text-gray-600"
                              title="Bearbeiten"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => openDeleteConfirmation('employee', emp)}
                              className="p-1.5 bg-gray-100 hover:bg-red-100 rounded text-gray-600 hover:text-red-600"
                              title="Löschen"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
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
        {/* TAB: ARBEITSPAKETE */}
        {/* ============================================ */}
        {activeTab === 'workpackages' && (
          <div className="space-y-4">
            {projects.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <div className="text-5xl mb-4">📋</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Keine Arbeitspakete vorhanden</h3>
                <p className="text-gray-500">Arbeitspakete werden beim Import von ZIM-Anträgen automatisch angelegt.</p>
              </div>
            ) : (
              projects.map(project => {
                const wps = getWorkPackagesForProject(project.id);
                const isExpanded = expandedProjects.has(project.id);

                if (wps.length === 0) return null;

                return (
                  <div key={project.id} className="bg-white rounded-lg shadow">
                    <button
                      onClick={() => toggleProjectExpanded(project.id)}
                      className="w-full px-6 py-4 flex justify-between items-center hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <svg
                          className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        <div className="text-left">
                          <div className="font-medium text-gray-900">{project.name}</div>
                          {project.funding_reference && (
                            <div className="text-sm text-gray-500">FKZ: {project.funding_reference}</div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {getFundingFormatBadge(project.funding_format)}
                        <span className="text-sm text-gray-500">{wps.length} AP</span>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t divide-y">
                        {wps.map(wp => (
                          <div key={wp.id} className="px-6 py-4 pl-14 hover:bg-gray-50">
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-800 text-sm font-medium">
                                    {wp.ap_code || `AP${wp.ap_number}`}
                                  </span>
                                  <span className="font-medium text-gray-900">{wp.name}</span>
                                </div>
                                {(wp.start_month || wp.end_month) && (
                                  <p className="text-sm text-gray-500 mt-1 ml-10">
                                    Monat {wp.start_month || '?'} - {wp.end_month || '?'}
                                  </p>
                                )}
                              </div>
                              <div className="text-right">
                                {wp.total_person_months && (
                                  <div className="text-sm font-medium text-gray-900">
                                    {wp.total_person_months} PM
                                  </div>
                                )}
                                {wp.total_costs && (
                                  <div className="text-sm text-gray-500">
                                    {formatCurrency(wp.total_costs)}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </main>

      {/* ============================================ */}
      {/* MODAL: Projekt anlegen/bearbeiten */}
      {/* ============================================ */}
      {showProjectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                {projectModalMode === 'create' ? 'Neues Projekt anlegen' : 'Projekt bearbeiten'}
              </h3>
              <button onClick={closeProjectModal} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              {projectFormError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{projectFormError}</div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Projektname *</label>
                  <input
                    type="text"
                    name="name"
                    value={projectFormData.name}
                    onChange={handleProjectInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Projektbezeichnung"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kurzname</label>
                  <input
                    type="text"
                    name="short_name"
                    value={projectFormData.short_name}
                    onChange={handleProjectInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Kürzel"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Förderkennzeichen (FKZ)</label>
                  <input
                    type="text"
                    name="funding_reference"
                    value={projectFormData.funding_reference}
                    onChange={handleProjectInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="z.B. 16KN087520"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Förderformat</label>
                  <select
                    name="funding_format"
                    value={projectFormData.funding_format}
                    onChange={handleProjectInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {FUNDING_FORMATS.map(f => (
                      <option key={f.code} value={f.code}>{f.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">FZul-Vorhaben</label>
                  <input
                    type="text"
                    name="fzul_vorhaben_title"
                    value={projectFormData.fzul_vorhaben_title}
                    onChange={handleProjectInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Kurzbezeichnung lt. FZul"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Startdatum</label>
                  <input
                    type="date"
                    name="start_date"
                    value={projectFormData.start_date}
                    onChange={handleProjectInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Enddatum</label>
                  <input
                    type="date"
                    name="end_date"
                    value={projectFormData.end_date}
                    onChange={handleProjectInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
              <button onClick={closeProjectModal} className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                Abbrechen
              </button>
              <button
                onClick={handleSaveProject}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {saving && <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>}
                {projectModalMode === 'create' ? 'Anlegen' : 'Speichern'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* MODAL: Mitarbeiter anlegen/bearbeiten */}
      {/* ============================================ */}
      {showEmployeeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                {employeeModalMode === 'create' ? 'Neuer Mitarbeiter' : 'Mitarbeiter bearbeiten'}
              </h3>
              <button onClick={closeEmployeeModal} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              {employeeFormError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{employeeFormError}</div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vorname</label>
                  <input
                    type="text"
                    name="first_name"
                    value={employeeFormData.first_name}
                    onChange={handleEmployeeInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nachname</label>
                  <input
                    type="text"
                    name="last_name"
                    value={employeeFormData.last_name}
                    onChange={handleEmployeeInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Anzeigename</label>
                  <input
                    type="text"
                    name="display_name"
                    value={employeeFormData.display_name}
                    onChange={handleEmployeeInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Nachname, Vorname"
                  />
                  <p className="text-xs text-gray-500 mt-1">Wird automatisch aus Vor- und Nachname generiert</p>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">E-Mail</label>
                  <input
                    type="email"
                    name="email"
                    value={employeeFormData.email}
                    onChange={handleEmployeeInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                  <input
                    type="text"
                    name="position_title"
                    value={employeeFormData.position_title}
                    onChange={handleEmployeeInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="z.B. Entwicklungsingenieur"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Qualifikation</label>
                  <input
                    type="text"
                    name="qualification"
                    value={employeeFormData.qualification}
                    onChange={handleEmployeeInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="z.B. M.Sc. Elektrotechnik"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Wochenstunden</label>
                  <input
                    type="number"
                    name="weekly_hours"
                    value={employeeFormData.weekly_hours}
                    onChange={handleEmployeeInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    min="1"
                    max="50"
                    step="0.5"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Beschäftigt seit</label>
                  <input
                    type="date"
                    name="employment_start"
                    value={employeeFormData.employment_start}
                    onChange={handleEmployeeInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Beschäftigt bis</label>
                  <input
                    type="date"
                    name="employment_end"
                    value={employeeFormData.employment_end}
                    onChange={handleEmployeeInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
              <button onClick={closeEmployeeModal} className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                Abbrechen
              </button>
              <button
                onClick={handleSaveEmployee}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {saving && <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>}
                {employeeModalMode === 'create' ? 'Anlegen' : 'Speichern'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* MODAL: Löschen bestätigen */}
      {/* ============================================ */}
      {showDeleteConfirm && itemToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 text-center">
              <div className="text-red-500 text-5xl mb-4">🗑️</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {deleteType === 'project' ? 'Projekt löschen?' : 'Mitarbeiter löschen?'}
              </h3>
              <p className="text-gray-600 mb-4">
                Möchten Sie <strong>{'name' in itemToDelete ? itemToDelete.name : itemToDelete.display_name}</strong> wirklich löschen?
              </p>
              <p className="text-gray-500 text-sm">
                {deleteType === 'project' 
                  ? 'Das Projekt wird deaktiviert und kann später wiederhergestellt werden.'
                  : 'Der Mitarbeiter wird deaktiviert und kann später wiederhergestellt werden.'}
              </p>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t bg-gray-50">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setItemToDelete(null);
                }}
                className="flex-1 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Abbrechen
              </button>
              <button
                onClick={handleDelete}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {saving ? 'Lösche...' : 'Löschen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
