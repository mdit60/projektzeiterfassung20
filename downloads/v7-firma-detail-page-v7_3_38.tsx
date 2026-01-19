// src/app/v7/berater/foerderung/firma/[id]/page.tsx
// VERSION: v7.3.38 - Arbeitspakete-Liste mit Tabellenstruktur
// DATUM: 19. Januar 2026
// ÄNDERUNG v7.1.6: MA zu Arbeitspaket zuordnen mit PM-Verteilung
// ÄNDERUNG v7.3.23: Förderformat-Liste erweitert
// ÄNDERUNG v7.3.24: UTF-8 Encoding-Fehler behoben
// ÄNDERUNG v7.3.28: Blauer Header wiederhergestellt
// ÄNDERUNG v7.3.30: Projekt-Bearbeitung direkt in Übersicht möglich
// ÄNDERUNG v7.3.31: Header-Farbe korrigiert auf Ozeanblau #0369a1
// ÄNDERUNG v7.3.35: Arbeitspakete-Tab entfernt, Statistik-Karten entfernt, Firmendaten-Edit
// ÄNDERUNG v7.3.37: Projekt importieren im Projekte-Tab, Arbeitspakete aufklappbar
// ÄNDERUNG v7.3.38: Arbeitspakete-Tabelle mit immer sichtbaren Aktions-Buttons

'use client';

// KONSTANTE: Stunden pro Personenmonat (40h/Woche Ã— 52 Wochen / 12 Monate)
const HOURS_PER_PM = 173.33;

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
  // Förderrelevante Felder v7.3.35
  kmu_status: string | null;
  founding_year: number | null;
  industry_sector: string | null;
  employee_count: number | null;
  annual_revenue: number | null;
  balance_sheet_total: number | null;
  commercial_register: string | null;
  vat_id: string | null;
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

interface ProjectAssignment {
  id: string;
  project_id: string;
  employee_id: string;
  role_in_project: string | null;
  fue_percentage: number | null;
  is_active: boolean;
}

interface WorkPackageAssignment {
  id: string;
  work_package_id: string;
  employee_id: string;
  planned_person_months: number | null;
  planned_hours: number | null;
  role_description: string | null;
  is_active: boolean;
}

interface WorkPackage {
  id: string;
  project_id: string;
  ap_number: number;
  ap_code: string | null;
  name: string;
  description: string | null;
  start_month: number | null;
  end_month: number | null;
  total_person_months: number | null;
  total_costs: number | null;
  is_active: boolean;
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

// WorkPackage Form
interface WorkPackageFormData {
  project_id: string;
  ap_number: string;
  ap_code: string;
  name: string;
  description: string;
  start_month: string;
  end_month: string;
  total_person_months: string;
  total_costs: string;
}

const EMPTY_WORKPACKAGE_FORM: WorkPackageFormData = {
  project_id: '',
  ap_number: '',
  ap_code: '',
  name: '',
  description: '',
  start_month: '',
  end_month: '',
  total_person_months: '',
  total_costs: '',
};

// Company Form v7.3.35
interface CompanyFormData {
  name: string;
  short_name: string;
  street: string;
  zip_code: string;
  city: string;
  federal_state: string;
  contact_person: string;
  contact_email: string;
  contact_phone: string;
  internal_notes: string;
  kmu_status: string;
  founding_year: string;
  industry_sector: string;
  employee_count: string;
  annual_revenue: string;
  balance_sheet_total: string;
  commercial_register: string;
  vat_id: string;
}

const EMPTY_COMPANY_FORM: CompanyFormData = {
  name: '',
  short_name: '',
  street: '',
  zip_code: '',
  city: '',
  federal_state: '',
  contact_person: '',
  contact_email: '',
  contact_phone: '',
  internal_notes: '',
  kmu_status: '',
  founding_year: '',
  industry_sector: '',
  employee_count: '',
  annual_revenue: '',
  balance_sheet_total: '',
  commercial_register: '',
  vat_id: '',
};

const KMU_STATUS_OPTIONS = [
  { value: '', label: 'Bitte wählen...' },
  { value: 'micro', label: 'Kleinstunternehmen (< 10 MA, ≤ 2 Mio. €)' },
  { value: 'small', label: 'Kleines Unternehmen (< 50 MA, ≤ 10 Mio. €)' },
  { value: 'medium', label: 'Mittleres Unternehmen (< 250 MA, ≤ 50 Mio. €)' },
  { value: 'large', label: 'Großunternehmen (≥ 250 MA)' },
];

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
  { code: 'ZIM_EINZEL', name: 'ZIM Einzel' },
  { code: 'ZIM_KOOP', name: 'ZIM Kooperation' },
  { code: 'ZIM_NETZWERK', name: 'ZIM Netzwerk' },
  { code: 'ZIM_DURCHFUEHRBARKEIT', name: 'ZIM Durchführbarkeitsstudie' },
  { code: 'BMBF_KMU', name: 'BMBF KMU-innovativ' },
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
  const [projectAssignments, setProjectAssignments] = useState<ProjectAssignment[]>([]);
  const [wpAssignments, setWPAssignments] = useState<WorkPackageAssignment[]>([]);
  
  // Tab-State
  const [activeTab, setActiveTab] = useState<'overview' | 'projects' | 'employees'>('overview');
  
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

  // WorkPackage Modal State
  const [showWPModal, setShowWPModal] = useState(false);
  const [wpModalMode, setWPModalMode] = useState<'create' | 'edit'>('create');
  const [editingWP, setEditingWP] = useState<WorkPackage | null>(null);
  const [wpFormData, setWPFormData] = useState<WorkPackageFormData>(EMPTY_WORKPACKAGE_FORM);
  const [wpFormError, setWPFormError] = useState<string | null>(null);

  // Project Assignment Modal State
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [assignmentProject, setAssignmentProject] = useState<Project | null>(null);

  // WP Assignment Modal State
  const [showWPAssignmentModal, setShowWPAssignmentModal] = useState(false);
  const [assignmentWP, setAssignmentWP] = useState<WorkPackage | null>(null);
  const [wpAssignmentPM, setWPAssignmentPM] = useState<Record<string, string>>({});

  // Delete Confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteType, setDeleteType] = useState<'project' | 'employee' | 'workpackage'>('project');
  const [itemToDelete, setItemToDelete] = useState<Project | Employee | WorkPackage | null>(null);

  // Company Modal State v7.3.35
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [companyFormData, setCompanyFormData] = useState<CompanyFormData>(EMPTY_COMPANY_FORM);
  const [companyFormError, setCompanyFormError] = useState<string | null>(null);

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

        // 6. Projekt-Zuordnungen laden
        const { data: assignmentData, error: assignmentError } = await supabase
          .from('v7_project_assignments')
          .select('*')
          .in('project_id', projectIds)
          .eq('is_active', true);

        if (!assignmentError && assignmentData) {
          setProjectAssignments(assignmentData);
        }

        // 7. Arbeitspaket-Zuordnungen laden
        if (wpData && wpData.length > 0) {
          const wpIds = wpData.map(wp => wp.id);
          const { data: wpAssignData, error: wpAssignError } = await supabase
            .from('v7_work_package_assignments')
            .select('*')
            .in('work_package_id', wpIds)
            .eq('is_active', true);

          if (!wpAssignError && wpAssignData) {
            setWPAssignments(wpAssignData);
          }
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
  // WORKPACKAGE CRUD
  // ============================================

  const getNextAPNumber = (projectId: string): number => {
    const projectWPs = workPackages.filter(wp => wp.project_id === projectId);
    if (projectWPs.length === 0) return 1;
    return Math.max(...projectWPs.map(wp => wp.ap_number)) + 1;
  };

  const openCreateWPModal = (projectId?: string) => {
    const targetProjectId = projectId || (projects.length > 0 ? projects[0].id : '');
    const nextAPNumber = targetProjectId ? getNextAPNumber(targetProjectId) : 1;
    
    setWPModalMode('create');
    setEditingWP(null);
    setWPFormData({
      ...EMPTY_WORKPACKAGE_FORM,
      project_id: targetProjectId,
      ap_number: nextAPNumber.toString(),
      ap_code: `AP${nextAPNumber}`,
    });
    setWPFormError(null);
    setShowWPModal(true);
  };

  const openEditWPModal = (wp: WorkPackage) => {
    setWPModalMode('edit');
    setEditingWP(wp);
    setWPFormData({
      project_id: wp.project_id,
      ap_number: wp.ap_number.toString(),
      ap_code: wp.ap_code || '',
      name: wp.name || '',
      description: wp.description || '',
      start_month: wp.start_month?.toString() || '',
      end_month: wp.end_month?.toString() || '',
      total_person_months: wp.total_person_months?.toString() || '',
      total_costs: wp.total_costs?.toString() || '',
    });
    setWPFormError(null);
    setShowWPModal(true);
  };

  const closeWPModal = () => {
    setShowWPModal(false);
    setEditingWP(null);
    setWPFormData(EMPTY_WORKPACKAGE_FORM);
    setWPFormError(null);
  };

  const handleWPInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setWPFormData(prev => ({ ...prev, [name]: value }));
    
    // Auto-generate ap_code when ap_number changes
    if (name === 'ap_number' && value) {
      setWPFormData(prev => ({ ...prev, ap_number: value, ap_code: `AP${value}` }));
    }
    
    // Update project_id and recalculate next AP number
    if (name === 'project_id' && value && wpModalMode === 'create') {
      const nextAPNumber = getNextAPNumber(value);
      setWPFormData(prev => ({ ...prev, project_id: value, ap_number: nextAPNumber.toString(), ap_code: `AP${nextAPNumber}` }));
    }
  };

  const handleSaveWP = async () => {
    if (!wpFormData.name.trim()) {
      setWPFormError('Name des Arbeitspakets ist erforderlich');
      return;
    }
    if (!wpFormData.project_id) {
      setWPFormError('Bitte wählen Sie ein Projekt');
      return;
    }
    if (!wpFormData.ap_number) {
      setWPFormError('AP-Nummer ist erforderlich');
      return;
    }

    setSaving(true);
    setWPFormError(null);

    try {
      const wpData = {
        project_id: wpFormData.project_id,
        ap_number: parseInt(wpFormData.ap_number),
        ap_code: wpFormData.ap_code.trim() || `AP${wpFormData.ap_number}`,
        name: wpFormData.name.trim(),
        description: wpFormData.description.trim() || null,
        start_month: wpFormData.start_month ? parseInt(wpFormData.start_month) : null,
        end_month: wpFormData.end_month ? parseInt(wpFormData.end_month) : null,
        total_person_months: wpFormData.total_person_months ? parseFloat(wpFormData.total_person_months) : null,
        total_costs: wpFormData.total_costs ? parseFloat(wpFormData.total_costs) : null,
        updated_at: new Date().toISOString(),
      };

      if (wpModalMode === 'create') {
        const { error: insertError } = await supabase
          .from('v7_work_packages')
          .insert({ ...wpData, is_active: true });

        if (insertError) {
          if (insertError.code === '23505') {
            setWPFormError('Ein Arbeitspaket mit dieser Nummer existiert bereits für dieses Projekt');
          } else {
            setWPFormError(insertError.message);
          }
          return;
        }
      } else if (wpModalMode === 'edit' && editingWP) {
        const { error: updateError } = await supabase
          .from('v7_work_packages')
          .update(wpData)
          .eq('id', editingWP.id);

        if (updateError) {
          setWPFormError(updateError.message);
          return;
        }
      }

      closeWPModal();
      await loadAllData();

    } catch (err: any) {
      setWPFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // ============================================
  // PROJECT ASSIGNMENT CRUD
  // ============================================

  const getProjectAssignments = (projectId: string): ProjectAssignment[] => {
    return projectAssignments.filter(pa => pa.project_id === projectId);
  };

  const getAssignedEmployees = (projectId: string): Employee[] => {
    const assignments = getProjectAssignments(projectId);
    const assignedIds = assignments.map(a => a.employee_id);
    return employees.filter(e => assignedIds.includes(e.id));
  };

  const getUnassignedEmployees = (projectId: string): Employee[] => {
    const assignments = getProjectAssignments(projectId);
    const assignedIds = assignments.map(a => a.employee_id);
    return employees.filter(e => !assignedIds.includes(e.id));
  };

  const openAssignmentModal = (project: Project) => {
    setAssignmentProject(project);
    setShowAssignmentModal(true);
  };

  const closeAssignmentModal = () => {
    setShowAssignmentModal(false);
    setAssignmentProject(null);
  };

  const handleAddAssignment = async (employeeId: string) => {
    if (!assignmentProject) return;

    setSaving(true);
    try {
      const { error: insertError } = await supabase
        .from('v7_project_assignments')
        .insert({
          project_id: assignmentProject.id,
          employee_id: employeeId,
          is_active: true,
        });

      if (insertError) {
        if (insertError.code === '23505') {
          // Duplikat - evtl. deaktiviert, reaktivieren
          await supabase
            .from('v7_project_assignments')
            .update({ is_active: true, updated_at: new Date().toISOString() })
            .eq('project_id', assignmentProject.id)
            .eq('employee_id', employeeId);
        } else {
          setError(insertError.message);
          return;
        }
      }

      await loadAllData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveAssignment = async (employeeId: string) => {
    if (!assignmentProject) return;

    setSaving(true);
    try {
      const { error: updateError } = await supabase
        .from('v7_project_assignments')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('project_id', assignmentProject.id)
        .eq('employee_id', employeeId);

      if (updateError) {
        setError(updateError.message);
        return;
      }

      await loadAllData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // ============================================
  // WORK PACKAGE ASSIGNMENT CRUD
  // ============================================

  const getWPAssignments = (wpId: string): WorkPackageAssignment[] => {
    return wpAssignments.filter(wpa => wpa.work_package_id === wpId);
  };

  const getWPAssignedEmployees = (wpId: string): Employee[] => {
    const assignments = getWPAssignments(wpId);
    const assignedIds = assignments.map(a => a.employee_id);
    return employees.filter(e => assignedIds.includes(e.id));
  };

  // Nur MA die dem PROJEKT zugeordnet sind, aber noch nicht diesem AP
  const getWPAvailableEmployees = (wp: WorkPackage): Employee[] => {
    const projectAssigns = getProjectAssignments(wp.project_id);
    const projectEmployeeIds = projectAssigns.map(pa => pa.employee_id);
    const wpAssigns = getWPAssignments(wp.id);
    const wpAssignedIds = wpAssigns.map(wpa => wpa.employee_id);
    
    return employees.filter(e => 
      projectEmployeeIds.includes(e.id) && !wpAssignedIds.includes(e.id)
    );
  };

  const getWPAssignmentPM = (wpId: string, employeeId: string): number | null => {
    const assignment = wpAssignments.find(
      wpa => wpa.work_package_id === wpId && wpa.employee_id === employeeId
    );
    return assignment?.planned_person_months ?? null;
  };

  const openWPAssignmentModal = (wp: WorkPackage) => {
    setAssignmentWP(wp);
    // PM-Werte für bestehende Zuordnungen laden
    const pmValues: Record<string, string> = {};
    const assigns = getWPAssignments(wp.id);
    assigns.forEach(a => {
      pmValues[a.employee_id] = a.planned_person_months?.toString() || '';
    });
    setWPAssignmentPM(pmValues);
    setShowWPAssignmentModal(true);
  };

  const closeWPAssignmentModal = () => {
    setShowWPAssignmentModal(false);
    setAssignmentWP(null);
    setWPAssignmentPM({});
  };

  const handleAddWPAssignment = async (employeeId: string) => {
    if (!assignmentWP) return;

    setSaving(true);
    try {
      const pm = parseFloat(wpAssignmentPM[employeeId] || '0') || null;
      const hours = pm ? Math.round(pm * HOURS_PER_PM * 100) / 100 : null;

      const { error: insertError } = await supabase
        .from('v7_work_package_assignments')
        .insert({
          work_package_id: assignmentWP.id,
          employee_id: employeeId,
          planned_person_months: pm,
          planned_hours: hours,
          is_active: true,
        });

      if (insertError) {
        if (insertError.code === '23505') {
          // Duplikat - reaktivieren und PM updaten
          await supabase
            .from('v7_work_package_assignments')
            .update({ 
              is_active: true, 
              planned_person_months: pm,
              planned_hours: hours,
              updated_at: new Date().toISOString() 
            })
            .eq('work_package_id', assignmentWP.id)
            .eq('employee_id', employeeId);
        } else {
          setError(insertError.message);
          return;
        }
      }

      await loadAllData();
      // PM-State aktualisieren
      setWPAssignmentPM(prev => {
        const newState = { ...prev };
        delete newState[employeeId];
        return newState;
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateWPAssignmentPM = async (employeeId: string, pmValue: string) => {
    if (!assignmentWP) return;

    const pm = parseFloat(pmValue) || null;
    const hours = pm ? Math.round(pm * HOURS_PER_PM * 100) / 100 : null;

    setSaving(true);
    try {
      const { error: updateError } = await supabase
        .from('v7_work_package_assignments')
        .update({ 
          planned_person_months: pm,
          planned_hours: hours,
          updated_at: new Date().toISOString() 
        })
        .eq('work_package_id', assignmentWP.id)
        .eq('employee_id', employeeId);

      if (updateError) {
        setError(updateError.message);
        return;
      }

      await loadAllData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveWPAssignment = async (employeeId: string) => {
    if (!assignmentWP) return;

    setSaving(true);
    try {
      const { error: updateError } = await supabase
        .from('v7_work_package_assignments')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('work_package_id', assignmentWP.id)
        .eq('employee_id', employeeId);

      if (updateError) {
        setError(updateError.message);
        return;
      }

      await loadAllData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // ============================================
  // COMPANY MODAL v7.3.35
  // ============================================

  const openCompanyEditModal = () => {
    if (!company) return;
    setCompanyFormData({
      name: company.name || '',
      short_name: company.short_name || '',
      street: company.street || '',
      zip_code: company.zip_code || '',
      city: company.city || '',
      federal_state: company.federal_state || '',
      contact_person: company.contact_person || '',
      contact_email: company.contact_email || '',
      contact_phone: company.contact_phone || '',
      internal_notes: company.internal_notes || '',
      kmu_status: company.kmu_status || '',
      founding_year: company.founding_year?.toString() || '',
      industry_sector: company.industry_sector || '',
      employee_count: company.employee_count?.toString() || '',
      annual_revenue: company.annual_revenue?.toString() || '',
      balance_sheet_total: company.balance_sheet_total?.toString() || '',
      commercial_register: company.commercial_register || '',
      vat_id: company.vat_id || '',
    });
    setCompanyFormError(null);
    setShowCompanyModal(true);
  };

  const closeCompanyModal = () => {
    setShowCompanyModal(false);
    setCompanyFormData(EMPTY_COMPANY_FORM);
    setCompanyFormError(null);
  };

  const handleSaveCompany = async () => {
    if (!company) return;
    
    if (!companyFormData.name.trim()) {
      setCompanyFormError('Firmenname ist erforderlich');
      return;
    }
    
    if (companyFormData.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(companyFormData.contact_email)) {
      setCompanyFormError('Ungültige E-Mail-Adresse');
      return;
    }
    
    if (companyFormData.zip_code && !/^\d{5}$/.test(companyFormData.zip_code)) {
      setCompanyFormError('PLZ muss 5 Ziffern haben');
      return;
    }

    setSaving(true);
    setCompanyFormError(null);

    try {
      const updateData = {
        name: companyFormData.name.trim(),
        short_name: companyFormData.short_name.trim() || null,
        street: companyFormData.street.trim() || null,
        zip_code: companyFormData.zip_code.trim() || null,
        city: companyFormData.city.trim() || null,
        federal_state: companyFormData.federal_state || null,
        contact_person: companyFormData.contact_person.trim() || null,
        contact_email: companyFormData.contact_email.trim() || null,
        contact_phone: companyFormData.contact_phone.trim() || null,
        internal_notes: companyFormData.internal_notes.trim() || null,
        kmu_status: companyFormData.kmu_status || null,
        founding_year: companyFormData.founding_year ? parseInt(companyFormData.founding_year) : null,
        industry_sector: companyFormData.industry_sector.trim() || null,
        employee_count: companyFormData.employee_count ? parseInt(companyFormData.employee_count) : null,
        annual_revenue: companyFormData.annual_revenue ? parseFloat(companyFormData.annual_revenue) : null,
        balance_sheet_total: companyFormData.balance_sheet_total ? parseFloat(companyFormData.balance_sheet_total) : null,
        commercial_register: companyFormData.commercial_register.trim() || null,
        vat_id: companyFormData.vat_id.trim() || null,
      };

      const { error: updateError } = await supabase
        .from('v7_client_companies')
        .update(updateData)
        .eq('id', company.id);

      if (updateError) throw updateError;

      setCompany({ ...company, ...updateData });
      closeCompanyModal();
    } catch (err: any) {
      setCompanyFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const getKmuStatusLabel = (status: string | null): string => {
    if (!status) return '-';
    const option = KMU_STATUS_OPTIONS.find(o => o.value === status);
    return option ? option.label : status;
  };

  // ============================================
  // DELETE
  // ============================================

  const openDeleteConfirmation = (type: 'project' | 'employee' | 'workpackage', item: Project | Employee | WorkPackage) => {
    setDeleteType(type);
    setItemToDelete(item);
    setShowDeleteConfirm(true);
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;

    setSaving(true);

    try {
      const tableMap = {
        'project': 'v7_projects',
        'employee': 'v7_employees',
        'workpackage': 'v7_work_packages',
      };
      const table = tableMap[deleteType];
      
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

  const formatPM = (pm: number | null): string => {
    if (pm === null || pm === undefined) return '-';
    return `${pm.toFixed(2)} PM`;
  };

  const pmToHours = (pm: number | null): string => {
    if (pm === null || pm === undefined) return '-';
    const hours = pm * HOURS_PER_PM;
    return `${hours.toFixed(0)} h`;
  };

  const getDeleteItemName = (): string => {
    if (!itemToDelete) return '';
    if ('name' in itemToDelete) return itemToDelete.name;
    if ('display_name' in itemToDelete) return itemToDelete.display_name;
    return '';
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
      {/* Header - BLAU für Berater-Portal */}
      <header className="text-white shadow-lg" style={{ backgroundColor: '#0369a1' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/v7/berater/foerderung')}
                className="text-white/80 hover:text-white flex items-center gap-1"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Zurück
              </button>
              <div className="h-6 w-px bg-white/30"></div>
              <div>
                <h1 className="text-xl font-bold">{company.name}</h1>
                <p className="text-sm text-white/80">
                  Förderberatung · {BUNDESLAND_NAMES[company.federal_state || ''] || company.federal_state || 'Kein Bundesland'}
                </p>
              </div>
            </div>
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
            {/* Firmendaten */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Firmendaten</h3>
                <button
                  onClick={openCompanyEditModal}
                  className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                  title="Firmendaten bearbeiten"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              </div>
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
                    <div key={project.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg group">
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
                        {/* Bearbeiten/Löschen Icons */}
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openEditProjectModal(project)}
                            className="p-1.5 bg-white hover:bg-gray-100 rounded text-gray-600"
                            title="Bearbeiten"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => openDeleteConfirmation('project', project)}
                            className="p-1.5 bg-white hover:bg-red-50 rounded text-gray-600 hover:text-red-600"
                            title="Löschen"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
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
            {/* Header mit Buttons */}
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Projekte</h3>
              <div className="flex gap-2">
                <button
                  onClick={openCreateProjectModal}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Neues Projekt
                </button>
                <Link
                  href="/v7/berater/foerderung/import"
                  className="px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Projekt importieren
                </Link>
              </div>
            </div>

            {projects.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <div className="text-5xl mb-4">📁</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Keine Projekte vorhanden</h3>
                <p className="text-gray-500 mb-4">Legen Sie ein neues Projekt an oder importieren Sie einen ZIM-Antrag.</p>
                <div className="flex justify-center gap-3">
                  <button
                    onClick={openCreateProjectModal}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    + Neues Projekt
                  </button>
                  <Link
                    href="/v7/berater/foerderung/import"
                    className="px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Projekt importieren
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {projects.map(project => {
                  const budget = projectBudgets[project.id];
                  const wps = getWorkPackagesForProject(project.id);
                  const isExpanded = expandedProjects.has(project.id);

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

                      {/* Zugeordnete Mitarbeiter */}
                      <div className="py-3 border-b mb-3">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs text-gray-500 uppercase font-medium">Zugeordnete Mitarbeiter</span>
                          <button
                            onClick={() => openAssignmentModal(project)}
                            className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Bearbeiten
                          </button>
                        </div>
                        {(() => {
                          const assignedEmps = getAssignedEmployees(project.id);
                          if (assignedEmps.length === 0) {
                            return (
                              <p className="text-sm text-gray-400 italic">Keine Mitarbeiter zugeordnet</p>
                            );
                          }
                          return (
                            <div className="flex flex-wrap gap-2">
                              {assignedEmps.map(emp => (
                                <span
                                  key={emp.id}
                                  className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                                >
                                  👤 {emp.display_name}
                                </span>
                              ))}
                            </div>
                          );
                        })()}
                      </div>

                      {/* Arbeitspakete - klickbar zum Aufklappen */}
                      <div className="border-t pt-3">
                        <button
                          onClick={() => toggleProjectExpanded(project.id)}
                          className="w-full flex items-center justify-between text-left hover:bg-gray-50 rounded p-2 -m-2 transition-colors"
                        >
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span className="font-medium">📋 {wps.length} Arbeitspakete</span>
                            {wps.length > 0 && (
                              <>
                                <span>·</span>
                                <span>
                                  {wps.reduce((sum, wp) => sum + (wp.total_person_months || 0), 0).toFixed(1)} PM gesamt
                                </span>
                              </>
                            )}
                          </div>
                          <svg
                            className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>

                        {/* Expandierte Arbeitspakete-Liste - klare Tabellenstruktur */}
                        {isExpanded && (
                          <div className="mt-3">
                            {wps.length === 0 ? (
                              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <span className="text-sm text-gray-500 italic">Keine Arbeitspakete vorhanden.</span>
                                <button
                                  onClick={() => openCreateWPModal(project.id)}
                                  className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded flex items-center gap-1"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                  </svg>
                                  Hinzufügen
                                </button>
                              </div>
                            ) : (
                              <div className="border rounded-lg overflow-hidden">
                                {/* Tabellen-Header */}
                                <div className="bg-gray-100 px-4 py-2 flex items-center text-xs font-medium text-gray-600 uppercase border-b">
                                  <div className="w-16">AP</div>
                                  <div className="flex-1">Bezeichnung</div>
                                  <div className="w-24 text-right">PM</div>
                                  <div className="w-32 text-right">
                                    <button
                                      onClick={() => openCreateWPModal(project.id)}
                                      className="text-blue-600 hover:text-blue-800 normal-case font-normal flex items-center gap-1 ml-auto"
                                    >
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                      </svg>
                                      Hinzufügen
                                    </button>
                                  </div>
                                </div>
                                {/* Tabellen-Body */}
                                {wps.map((wp, idx) => (
                                  <div
                                    key={wp.id}
                                    className={`px-4 py-3 flex items-center hover:bg-gray-50 ${idx < wps.length - 1 ? 'border-b' : ''}`}
                                  >
                                    <div className="w-16">
                                      <span className="text-xs font-mono bg-gray-200 px-1.5 py-0.5 rounded">
                                        AP{wp.ap_number}
                                      </span>
                                    </div>
                                    <div className="flex-1 text-sm text-gray-900">{wp.name}</div>
                                    <div className="w-24 text-right text-sm text-gray-600">
                                      {wp.total_person_months ? `${wp.total_person_months} PM` : '-'}
                                    </div>
                                    <div className="w-32 flex justify-end gap-1">
                                      <button
                                        onClick={() => openWPAssignmentModal(wp)}
                                        className="p-1.5 text-purple-600 hover:bg-purple-100 rounded"
                                        title="Mitarbeiter zuordnen"
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                      </button>
                                      <button
                                        onClick={() => openEditWPModal(wp)}
                                        className="p-1.5 text-gray-600 hover:bg-gray-200 rounded"
                                        title="Bearbeiten"
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                        </svg>
                                      </button>
                                      <button
                                        onClick={() => openDeleteConfirmation('workpackage', wp)}
                                        className="p-1.5 text-red-500 hover:bg-red-100 rounded"
                                        title="Löschen"
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
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
      {/* MODAL: Arbeitspaket anlegen/bearbeiten */}
      {/* ============================================ */}
      {showWPModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                {wpModalMode === 'create' ? 'Neues Arbeitspaket anlegen' : 'Arbeitspaket bearbeiten'}
              </h3>
              <button onClick={closeWPModal} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              {wpFormError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{wpFormError}</div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Projekt-Auswahl */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Projekt *</label>
                  <select
                    name="project_id"
                    value={wpFormData.project_id}
                    onChange={handleWPInputChange}
                    disabled={wpModalMode === 'edit'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  >
                    <option value="">-- Projekt auswählen --</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.funding_reference ? `(${p.funding_reference})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* AP-Nummer und Code */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">AP-Nummer *</label>
                  <input
                    type="number"
                    name="ap_number"
                    value={wpFormData.ap_number}
                    onChange={handleWPInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    min="1"
                    placeholder="1, 2, 3..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">AP-Code</label>
                  <input
                    type="text"
                    name="ap_code"
                    value={wpFormData.ap_code}
                    onChange={handleWPInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="AP1, AP2..."
                  />
                </div>

                {/* Name */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={wpFormData.name}
                    onChange={handleWPInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Bezeichnung des Arbeitspakets"
                  />
                </div>

                {/* Beschreibung */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Beschreibung</label>
                  <textarea
                    name="description"
                    value={wpFormData.description}
                    onChange={handleWPInputChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Kurze Beschreibung der Arbeitsinhalte"
                  />
                </div>

                {/* Laufzeit */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Startmonat</label>
                  <input
                    type="number"
                    name="start_month"
                    value={wpFormData.start_month}
                    onChange={handleWPInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    min="1"
                    max="60"
                    placeholder="Projektmonat 1-36"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Endmonat</label>
                  <input
                    type="number"
                    name="end_month"
                    value={wpFormData.end_month}
                    onChange={handleWPInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    min="1"
                    max="60"
                    placeholder="Projektmonat 1-36"
                  />
                </div>

                {/* PM und Kosten */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Personenmonate (PM)</label>
                  <input
                    type="number"
                    name="total_person_months"
                    value={wpFormData.total_person_months}
                    onChange={handleWPInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    min="0"
                    step="0.1"
                    placeholder="z.B. 2.5"
                  />
                  {wpFormData.total_person_months && (
                    <p className="text-xs text-gray-500 mt-1">
                      = {pmToHours(parseFloat(wpFormData.total_person_months))} (bei 173,33 h/PM)
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gesamtkosten (€)</label>
                  <input
                    type="number"
                    name="total_costs"
                    value={wpFormData.total_costs}
                    onChange={handleWPInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    min="0"
                    step="100"
                    placeholder="z.B. 25000"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
              <button onClick={closeWPModal} className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                Abbrechen
              </button>
              <button
                onClick={handleSaveWP}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {saving && <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>}
                {wpModalMode === 'create' ? 'Anlegen' : 'Speichern'}
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
                {deleteType === 'project' ? 'Projekt löschen?' : 
                 deleteType === 'employee' ? 'Mitarbeiter löschen?' : 
                 'Arbeitspaket löschen?'}
              </h3>
              <p className="text-gray-600 mb-4">
                Möchten Sie <strong>{getDeleteItemName()}</strong> wirklich löschen?
              </p>
              <p className="text-gray-500 text-sm">
                {deleteType === 'project' 
                  ? 'Das Projekt und zugehörige Arbeitspakete werden deaktiviert.'
                  : deleteType === 'employee'
                  ? 'Der Mitarbeiter wird deaktiviert und kann später wiederhergestellt werden.'
                  : 'Das Arbeitspaket wird deaktiviert und kann später wiederhergestellt werden.'}
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

      {/* ============================================ */}
      {/* MODAL: Mitarbeiter zu Projekt zuordnen */}
      {/* ============================================ */}
      {showAssignmentModal && assignmentProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center px-6 py-4 border-b">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Mitarbeiter zuordnen</h3>
                <p className="text-sm text-gray-500">{assignmentProject.name}</p>
              </div>
              <button onClick={closeAssignmentModal} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {/* Zugeordnete Mitarbeiter */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  Zugeordnet ({getAssignedEmployees(assignmentProject.id).length})
                </h4>
                {getAssignedEmployees(assignmentProject.id).length === 0 ? (
                  <p className="text-sm text-gray-400 italic pl-4">Keine Mitarbeiter zugeordnet</p>
                ) : (
                  <div className="space-y-2">
                    {getAssignedEmployees(assignmentProject.id).map(emp => (
                      <div
                        key={emp.id}
                        className="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-200"
                      >
                        <div>
                          <div className="font-medium text-gray-900">{emp.display_name}</div>
                          {emp.position_title && (
                            <div className="text-sm text-gray-500">{emp.position_title}</div>
                          )}
                        </div>
                        <button
                          onClick={() => handleRemoveAssignment(emp.id)}
                          disabled={saving}
                          className="p-1.5 text-red-600 hover:bg-red-100 rounded disabled:opacity-50"
                          title="Zuordnung entfernen"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Verfügbare Mitarbeiter */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                  Verfügbar ({getUnassignedEmployees(assignmentProject.id).length})
                </h4>
                {getUnassignedEmployees(assignmentProject.id).length === 0 ? (
                  <p className="text-sm text-gray-400 italic pl-4">Alle Mitarbeiter sind bereits zugeordnet</p>
                ) : (
                  <div className="space-y-2">
                    {getUnassignedEmployees(assignmentProject.id).map(emp => (
                      <div
                        key={emp.id}
                        className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                      >
                        <div>
                          <div className="font-medium text-gray-900">{emp.display_name}</div>
                          {emp.position_title && (
                            <div className="text-sm text-gray-500">{emp.position_title}</div>
                          )}
                        </div>
                        <button
                          onClick={() => handleAddAssignment(emp.id)}
                          disabled={saving}
                          className="p-1.5 text-green-600 hover:bg-green-100 rounded disabled:opacity-50"
                          title="Zum Projekt hinzufügen"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t bg-gray-50">
              <button
                onClick={closeAssignmentModal}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Fertig
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* MODAL: Mitarbeiter zu Arbeitspaket zuordnen */}
      {/* ============================================ */}
      {showWPAssignmentModal && assignmentWP && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center px-6 py-4 border-b">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">MA zu Arbeitspaket zuordnen</h3>
                <p className="text-sm text-gray-500">
                  {assignmentWP.ap_code || `AP${assignmentWP.ap_number}`}: {assignmentWP.name}
                </p>
                {assignmentWP.total_person_months && (
                  <p className="text-xs text-gray-400">
                    Gesamt: {assignmentWP.total_person_months.toFixed(2)} PM ({pmToHours(assignmentWP.total_person_months)})
                  </p>
                )}
              </div>
              <button onClick={closeWPAssignmentModal} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {/* Zugeordnete Mitarbeiter mit PM */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                  Zugeordnet ({getWPAssignedEmployees(assignmentWP.id).length})
                </h4>
                {getWPAssignedEmployees(assignmentWP.id).length === 0 ? (
                  <p className="text-sm text-gray-400 italic pl-4">Keine Mitarbeiter zugeordnet</p>
                ) : (
                  <div className="space-y-2">
                    {getWPAssignedEmployees(assignmentWP.id).map(emp => {
                      const currentPM = getWPAssignmentPM(assignmentWP.id, emp.id);
                      return (
                        <div
                          key={emp.id}
                          className="p-3 bg-purple-50 rounded-lg border border-purple-200"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <div className="font-medium text-gray-900">{emp.display_name}</div>
                              {emp.position_title && (
                                <div className="text-sm text-gray-500">{emp.position_title}</div>
                              )}
                            </div>
                            <button
                              onClick={() => handleRemoveWPAssignment(emp.id)}
                              disabled={saving}
                              className="p-1 text-red-600 hover:bg-red-100 rounded disabled:opacity-50"
                              title="Zuordnung entfernen"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                          <div className="flex items-center gap-2">
                            <label className="text-xs text-gray-600">PM:</label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={currentPM?.toString() || ''}
                              onChange={(e) => {
                                // Lokaler State für Live-Anzeige
                                const val = e.target.value;
                                setWPAssignmentPM(prev => ({ ...prev, [emp.id]: val }));
                              }}
                              onBlur={(e) => {
                                // Bei Blur speichern
                                handleUpdateWPAssignmentPM(emp.id, e.target.value);
                              }}
                              className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-purple-500"
                            />
                            {currentPM && (
                              <span className="text-xs text-gray-500">
                                = {(currentPM * HOURS_PER_PM).toFixed(0)} h
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                
                {/* Summe */}
                {getWPAssignedEmployees(assignmentWP.id).length > 0 && (
                  <div className="mt-3 p-2 bg-gray-100 rounded text-sm">
                    <div className="flex justify-between">
                      <span>Verteilt:</span>
                      <span className="font-medium">
                        {getWPAssignments(assignmentWP.id)
                          .reduce((sum, a) => sum + (a.planned_person_months || 0), 0)
                          .toFixed(2)} PM
                      </span>
                    </div>
                    {assignmentWP.total_person_months && (
                      <div className="flex justify-between text-gray-500">
                        <span>Gesamt AP:</span>
                        <span>{assignmentWP.total_person_months.toFixed(2)} PM</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Verfügbare Mitarbeiter (nur die, die dem Projekt zugeordnet sind) */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                  Verfügbar aus Projekt ({getWPAvailableEmployees(assignmentWP).length})
                </h4>
                {getWPAvailableEmployees(assignmentWP).length === 0 ? (
                  <p className="text-sm text-gray-400 italic pl-4">
                    {getProjectAssignments(assignmentWP.project_id).length === 0
                      ? 'Keine MA dem Projekt zugeordnet'
                      : 'Alle Projekt-MA sind diesem AP zugeordnet'}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {getWPAvailableEmployees(assignmentWP).map(emp => (
                      <div
                        key={emp.id}
                        className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="font-medium text-gray-900">{emp.display_name}</div>
                            {emp.position_title && (
                              <div className="text-sm text-gray-500">{emp.position_title}</div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-gray-600">PM:</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={wpAssignmentPM[emp.id] || ''}
                            onChange={(e) => setWPAssignmentPM(prev => ({ ...prev, [emp.id]: e.target.value }))}
                            className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-purple-500"
                          />
                          <button
                            onClick={() => handleAddWPAssignment(emp.id)}
                            disabled={saving}
                            className="px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
                          >
                            Hinzufügen
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t bg-gray-50">
              <button
                onClick={closeWPAssignmentModal}
                className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Fertig
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* MODAL: FIRMA BEARBEITEN v7.3.35 */}
      {/* ============================================ */}
      {showCompanyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50 rounded-t-xl">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Firma bearbeiten</h2>
                <p className="text-sm text-gray-500">{company?.name}</p>
              </div>
              <button onClick={closeCompanyModal} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Form */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {companyFormError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {companyFormError}
                </div>
              )}

              {/* Stammdaten */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-3 pb-2 border-b">Stammdaten</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Firmenname *</label>
                    <input
                      type="text"
                      value={companyFormData.name}
                      onChange={(e) => setCompanyFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Kurzname</label>
                    <input
                      type="text"
                      value={companyFormData.short_name}
                      onChange={(e) => setCompanyFormData(prev => ({ ...prev, short_name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Adresse */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-3 pb-2 border-b">Adresse</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Straße</label>
                    <input
                      type="text"
                      value={companyFormData.street}
                      onChange={(e) => setCompanyFormData(prev => ({ ...prev, street: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">PLZ</label>
                      <input
                        type="text"
                        value={companyFormData.zip_code}
                        onChange={(e) => setCompanyFormData(prev => ({ ...prev, zip_code: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        maxLength={5}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm text-gray-600 mb-1">Ort</label>
                      <input
                        type="text"
                        value={companyFormData.city}
                        onChange={(e) => setCompanyFormData(prev => ({ ...prev, city: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Bundesland</label>
                    <select
                      value={companyFormData.federal_state}
                      onChange={(e) => setCompanyFormData(prev => ({ ...prev, federal_state: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Bitte wählen...</option>
                      {Object.entries(BUNDESLAND_NAMES).map(([code, name]) => (
                        <option key={code} value={code}>{name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Ansprechpartner */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-3 pb-2 border-b">Ansprechpartner</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Name</label>
                    <input
                      type="text"
                      value={companyFormData.contact_person}
                      onChange={(e) => setCompanyFormData(prev => ({ ...prev, contact_person: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">E-Mail</label>
                    <input
                      type="email"
                      value={companyFormData.contact_email}
                      onChange={(e) => setCompanyFormData(prev => ({ ...prev, contact_email: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">Telefon</label>
                    <input
                      type="tel"
                      value={companyFormData.contact_phone}
                      onChange={(e) => setCompanyFormData(prev => ({ ...prev, contact_phone: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Förderrelevante Angaben */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-3 pb-2 border-b">Förderrelevante Angaben</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">KMU-Status</label>
                    <select
                      value={companyFormData.kmu_status}
                      onChange={(e) => setCompanyFormData(prev => ({ ...prev, kmu_status: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {KMU_STATUS_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Gründungsjahr</label>
                    <input
                      type="number"
                      value={companyFormData.founding_year}
                      onChange={(e) => setCompanyFormData(prev => ({ ...prev, founding_year: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      min="1800"
                      max={new Date().getFullYear()}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Mitarbeiterzahl</label>
                    <input
                      type="number"
                      value={companyFormData.employee_count}
                      onChange={(e) => setCompanyFormData(prev => ({ ...prev, employee_count: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Branche</label>
                    <input
                      type="text"
                      value={companyFormData.industry_sector}
                      onChange={(e) => setCompanyFormData(prev => ({ ...prev, industry_sector: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Jahresumsatz (€)</label>
                    <input
                      type="number"
                      value={companyFormData.annual_revenue}
                      onChange={(e) => setCompanyFormData(prev => ({ ...prev, annual_revenue: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Bilanzsumme (€)</label>
                    <input
                      type="number"
                      value={companyFormData.balance_sheet_total}
                      onChange={(e) => setCompanyFormData(prev => ({ ...prev, balance_sheet_total: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Handelsregister</label>
                    <input
                      type="text"
                      value={companyFormData.commercial_register}
                      onChange={(e) => setCompanyFormData(prev => ({ ...prev, commercial_register: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="HRB 12345"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">USt-IdNr.</label>
                    <input
                      type="text"
                      value={companyFormData.vat_id}
                      onChange={(e) => setCompanyFormData(prev => ({ ...prev, vat_id: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="DE123456789"
                    />
                  </div>
                </div>
              </div>

              {/* Interne Notizen */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-3 pb-2 border-b">Interne Notizen</h3>
                <textarea
                  value={companyFormData.internal_notes}
                  onChange={(e) => setCompanyFormData(prev => ({ ...prev, internal_notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t bg-gray-50 rounded-b-xl flex justify-end gap-3">
              <button
                onClick={closeCompanyModal}
                disabled={saving}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Abbrechen
              </button>
              <button
                onClick={handleSaveCompany}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Speichern...
                  </>
                ) : (
                  'Speichern'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
