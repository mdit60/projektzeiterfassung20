// src/app/v7/firma/projekte/page.tsx
// VERSION: v7.3.26 (SW-Release V7.3)
// DATUM: 20. Januar 2026
// BESCHREIBUNG: Firmen-Projektseite mit vollständiger CRUD-Funktionalität
// ÄNDERUNG v7.3.18: Statistik-Zeile von Übersichtsseite entfernt (verschoben nach Berichte)
// ÄNDERUNG v7.3.26: Förderformat-Liste ergänzt um ZIM Einzel und ZIM Durchführbarkeitsstudie
// ÄNDERUNG v7.3.26: UTF-8 Encoding-Fehler behoben
// BERECHTIGUNG: client_admin + project_leader können bearbeiten, employee nur ansehen

'use client';

// KONSTANTE: Stunden pro Personenmonat
const HOURS_PER_PM = 173.33;

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
  employment_end: string | null;
  is_active: boolean;
}

interface WorkPackage {
  id: string;
  project_id: string;
  ap_number: number;
  ap_code: string | null;
  name: string;
  description: string | null;
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

interface ProjectFormData {
  name: string;
  short_name: string;
  funding_reference: string;
  funding_format: string;
  start_date: string;
  end_date: string;
}

interface WorkPackageFormData {
  ap_number: string;
  ap_code: string;
  name: string;
  description: string;
  total_person_months: string;
}

interface WPAssignmentFormData {
  employee_id: string;
  planned_person_months: string;
}

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

const EMPTY_PROJECT_FORM: ProjectFormData = {
  name: '',
  short_name: '',
  funding_reference: '',
  funding_format: 'ZIM',
  start_date: '',
  end_date: '',
};

const EMPTY_WP_FORM: WorkPackageFormData = {
  ap_number: '1',
  ap_code: '',
  name: '',
  description: '',
  total_person_months: '1',
};

const FUNDING_FORMATS = [
  { value: 'ZIM_EINZEL', label: 'ZIM Einzel' },
  { value: 'ZIM_KOOP', label: 'ZIM Kooperation' },
  { value: 'ZIM_NETZWERK', label: 'ZIM Netzwerk' },
  { value: 'ZIM_DURCHFUEHRBARKEIT', label: 'ZIM Durchführbarkeitsstudie' },
  { value: 'BMBF_KMU', label: 'BMBF KMU-innovativ' },
  { value: 'FZUL', label: 'Forschungszulage' },
  { value: 'OTHER', label: 'Sonstige' },
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

// ============================================
// KOMPONENTE
// ============================================

export default function FirmaProjektePage() {
  const router = useRouter();
  const supabase = createClient();

  // State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [company, setCompany] = useState<ClientCompany | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [workPackages, setWorkPackages] = useState<WorkPackage[]>([]);
  const [projectAssignments, setProjectAssignments] = useState<ProjectAssignment[]>([]);
  const [wpAssignments, setWPAssignments] = useState<WorkPackageAssignment[]>([]);
  const [projectBudgets, setProjectBudgets] = useState<Record<string, ProjectBudget>>({});

  // Tab State
  const [activeTab, setActiveTab] = useState<'overview' | 'projects' | 'employees' | 'workpackages'>('overview');
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());

  // Employee Modal State
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [employeeModalMode, setEmployeeModalMode] = useState<'create' | 'edit'>('create');
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [employeeFormData, setEmployeeFormData] = useState<EmployeeFormData>(EMPTY_EMPLOYEE_FORM);
  const [employeeFormError, setEmployeeFormError] = useState<string | null>(null);

  // Delete Confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);

  // Project Modal State
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [projectModalMode, setProjectModalMode] = useState<'create' | 'edit'>('create');
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [projectFormData, setProjectFormData] = useState<ProjectFormData>(EMPTY_PROJECT_FORM);
  const [projectFormError, setProjectFormError] = useState<string | null>(null);

  // WorkPackage Modal State
  const [showWPModal, setShowWPModal] = useState(false);
  const [wpModalMode, setWPModalMode] = useState<'create' | 'edit'>('create');
  const [editingWP, setEditingWP] = useState<WorkPackage | null>(null);
  const [wpFormData, setWPFormData] = useState<WorkPackageFormData>(EMPTY_WP_FORM);
  const [wpFormError, setWPFormError] = useState<string | null>(null);
  const [wpProjectId, setWPProjectId] = useState<string | null>(null);

  // WP Assignment Modal State
  const [showWPAssignModal, setShowWPAssignModal] = useState(false);
  const [editingWPForAssign, setEditingWPForAssign] = useState<WorkPackage | null>(null);
  const [wpAssignFormData, setWPAssignFormData] = useState<WPAssignmentFormData[]>([]);
  const [wpAssignFormError, setWPAssignFormError] = useState<string | null>(null);

  // Berechtigungen - client_admin ODER project_leader dürfen bearbeiten
  const canEdit = userProfile?.role === 'client_admin' || userProfile?.role === 'project_leader';
  const isAdmin = userProfile?.role === 'client_admin';

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
  // EMPLOYEE CRUD
  // ============================================

  const openCreateEmployeeModal = () => {
    setEmployeeModalMode('create');
    setEditingEmployee(null);
    setEmployeeFormData(EMPTY_EMPLOYEE_FORM);
    setEmployeeFormError(null);
    setShowEmployeeModal(true);
  };

  const openEditEmployeeModal = (emp: Employee) => {
    setEmployeeModalMode('edit');
    setEditingEmployee(emp);
    setEmployeeFormData({
      display_name: emp.display_name || '',
      first_name: emp.first_name || '',
      last_name: emp.last_name || '',
      email: emp.email || '',
      position_title: emp.position_title || '',
      qualification: emp.qualification || '',
      weekly_hours: emp.weekly_hours?.toString() || '40',
      employment_start: emp.employment_start?.split('T')[0] || '',
      employment_end: emp.employment_end?.split('T')[0] || '',
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

  const handleEmployeeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEmployeeFormData(prev => {
      const updated = { ...prev, [name]: value };
      // Auto-generate display_name
      if (name === 'first_name' || name === 'last_name') {
        const firstName = name === 'first_name' ? value : prev.first_name;
        const lastName = name === 'last_name' ? value : prev.last_name;
        if (lastName || firstName) {
          updated.display_name = lastName && firstName 
            ? `${lastName}, ${firstName}`
            : lastName || firstName;
        }
      }
      return updated;
    });
  };

  const handleSaveEmployee = async () => {
    if (!employeeFormData.display_name.trim()) {
      setEmployeeFormError('Anzeigename ist erforderlich');
      return;
    }

    if (!company) return;

    setSaving(true);
    setEmployeeFormError(null);

    try {
      const employeeData = {
        display_name: employeeFormData.display_name.trim(),
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
            client_company_id: company.id,
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

  const confirmDeleteEmployee = (emp: Employee) => {
    setEmployeeToDelete(emp);
    setShowDeleteConfirm(true);
  };

  const handleDeleteEmployee = async () => {
    if (!employeeToDelete) return;

    setSaving(true);
    try {
      const { error: deleteError } = await supabase
        .from('v7_employees')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', employeeToDelete.id);

      if (deleteError) {
        setError(deleteError.message);
        return;
      }

      setShowDeleteConfirm(false);
      setEmployeeToDelete(null);
      await loadAllData();

    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
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

  const openEditProjectModal = (proj: Project) => {
    setProjectModalMode('edit');
    setEditingProject(proj);
    setProjectFormData({
      name: proj.name || '',
      short_name: proj.short_name || '',
      funding_reference: proj.funding_reference || '',
      funding_format: proj.funding_format || 'ZIM',
      start_date: proj.start_date?.split('T')[0] || '',
      end_date: proj.end_date?.split('T')[0] || '',
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

  const handleProjectInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setProjectFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveProject = async () => {
    if (!projectFormData.name.trim()) {
      setProjectFormError('Projektname ist erforderlich');
      return;
    }

    if (!company) return;

    setSaving(true);
    setProjectFormError(null);

    try {
      const projectData = {
        name: projectFormData.name.trim(),
        short_name: projectFormData.short_name.trim() || null,
        funding_reference: projectFormData.funding_reference.trim() || null,
        funding_format: projectFormData.funding_format,
        start_date: projectFormData.start_date || null,
        end_date: projectFormData.end_date || null,
        updated_at: new Date().toISOString(),
      };

      if (projectModalMode === 'create') {
        const { error: insertError } = await supabase
          .from('v7_projects')
          .insert({
            ...projectData,
            client_company_id: company.id,
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

  const handleDeleteProject = async (proj: Project) => {
    if (!confirm(`Projekt "${proj.name}" wirklich löschen?`)) return;

    setSaving(true);
    try {
      const { error: deleteError } = await supabase
        .from('v7_projects')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', proj.id);

      if (deleteError) {
        setError(deleteError.message);
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
  // WORKPACKAGE CRUD
  // ============================================

  const openCreateWPModal = (projectId: string) => {
    setWPModalMode('create');
    setEditingWP(null);
    setWPProjectId(projectId);
    const projectWPs = workPackages.filter(wp => wp.project_id === projectId);
    const nextNum = projectWPs.length > 0 ? Math.max(...projectWPs.map(wp => wp.ap_number)) + 1 : 1;
    setWPFormData({
      ...EMPTY_WP_FORM,
      ap_number: nextNum.toString(),
      ap_code: `AP${nextNum}`,
    });
    setWPFormError(null);
    setShowWPModal(true);
  };

  const openEditWPModal = (wp: WorkPackage) => {
    setWPModalMode('edit');
    setEditingWP(wp);
    setWPProjectId(wp.project_id);
    setWPFormData({
      ap_number: wp.ap_number.toString(),
      ap_code: wp.ap_code || '',
      name: wp.name || '',
      description: wp.description || '',
      total_person_months: wp.total_person_months?.toString() || '1',
    });
    setWPFormError(null);
    setShowWPModal(true);
  };

  const closeWPModal = () => {
    setShowWPModal(false);
    setEditingWP(null);
    setWPProjectId(null);
    setWPFormData(EMPTY_WP_FORM);
    setWPFormError(null);
  };

  const handleWPInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setWPFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveWP = async () => {
    if (!wpFormData.name.trim()) {
      setWPFormError('Name ist erforderlich');
      return;
    }

    if (!wpProjectId) return;

    setSaving(true);
    setWPFormError(null);

    try {
      const wpData = {
        ap_number: parseInt(wpFormData.ap_number) || 1,
        ap_code: wpFormData.ap_code.trim() || null,
        name: wpFormData.name.trim(),
        description: wpFormData.description.trim() || null,
        total_person_months: parseFloat(wpFormData.total_person_months) || 1,
        updated_at: new Date().toISOString(),
      };

      if (wpModalMode === 'create') {
        const { error: insertError } = await supabase
          .from('v7_work_packages')
          .insert({
            ...wpData,
            project_id: wpProjectId,
            is_active: true,
          });

        if (insertError) {
          setWPFormError(insertError.message);
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

  const handleDeleteWP = async (wp: WorkPackage) => {
    if (!confirm(`Arbeitspaket "${wp.ap_code || 'AP' + wp.ap_number}" wirklich löschen?`)) return;

    setSaving(true);
    try {
      const { error: deleteError } = await supabase
        .from('v7_work_packages')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', wp.id);

      if (deleteError) {
        setError(deleteError.message);
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
  // WP ASSIGNMENT (PM-Zuordnung)
  // ============================================

  const openWPAssignModal = (wp: WorkPackage) => {
    setEditingWPForAssign(wp);
    const existingAssigns = wpAssignments.filter(a => a.work_package_id === wp.id);
    const formData: WPAssignmentFormData[] = existingAssigns.map(a => ({
      employee_id: a.employee_id,
      planned_person_months: a.planned_person_months?.toString() || '0',
    }));
    if (formData.length === 0) {
      formData.push({ employee_id: '', planned_person_months: '0' });
    }
    setWPAssignFormData(formData);
    setWPAssignFormError(null);
    setShowWPAssignModal(true);
  };

  const closeWPAssignModal = () => {
    setShowWPAssignModal(false);
    setEditingWPForAssign(null);
    setWPAssignFormData([]);
    setWPAssignFormError(null);
  };

  const handleWPAssignChange = (index: number, field: 'employee_id' | 'planned_person_months', value: string) => {
    setWPAssignFormData(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addWPAssignRow = () => {
    setWPAssignFormData(prev => [...prev, { employee_id: '', planned_person_months: '0' }]);
  };

  const removeWPAssignRow = (index: number) => {
    setWPAssignFormData(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveWPAssign = async () => {
    if (!editingWPForAssign) return;

    setSaving(true);
    setWPAssignFormError(null);

    try {
      // Alte Zuordnungen deaktivieren
      await supabase
        .from('v7_work_package_assignments')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('work_package_id', editingWPForAssign.id);

      // Neue Zuordnungen erstellen
      const validAssigns = wpAssignFormData.filter(a => a.employee_id && parseFloat(a.planned_person_months) > 0);
      
      for (const assign of validAssigns) {
        const { error: insertError } = await supabase
          .from('v7_work_package_assignments')
          .insert({
            work_package_id: editingWPForAssign.id,
            employee_id: assign.employee_id,
            planned_person_months: parseFloat(assign.planned_person_months),
            is_active: true,
          });

        if (insertError && insertError.code === '23505') {
          // Bei Duplikat: Update
          await supabase
            .from('v7_work_package_assignments')
            .update({
              planned_person_months: parseFloat(assign.planned_person_months),
              is_active: true,
              updated_at: new Date().toISOString(),
            })
            .eq('work_package_id', editingWPForAssign.id)
            .eq('employee_id', assign.employee_id);
        }
      }

      closeWPAssignModal();
      await loadAllData();

    } catch (err: any) {
      setWPAssignFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // ============================================
  // HILFSFUNKTIONEN
  // ============================================

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('de-DE');
  };

  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return '0 â‚¬';
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
  };

  const getEmployeesForProject = (projectId: string): Employee[] => {
    const assignedIds = projectAssignments
      .filter(a => a.project_id === projectId)
      .map(a => a.employee_id);
    return employees.filter(e => assignedIds.includes(e.id));
  };

  // Natürliche Sortierung für AP-Codes (AP1, AP1.1, AP1.2, AP2, AP10, etc.)
  const sortWorkPackages = (wps: WorkPackage[]): WorkPackage[] => {
    return [...wps].sort((a, b) => {
      const codeA = a.ap_code || `AP${a.ap_number}`;
      const codeB = b.ap_code || `AP${b.ap_number}`;
      
      // Extrahiere Zahlen aus dem AP-Code für natürliche Sortierung
      const partsA = codeA.replace(/^AP/i, '').split('.').map(p => parseInt(p) || 0);
      const partsB = codeB.replace(/^AP/i, '').split('.').map(p => parseInt(p) || 0);
      
      // Vergleiche Teil für Teil
      for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
        const numA = partsA[i] || 0;
        const numB = partsB[i] || 0;
        if (numA !== numB) return numA - numB;
      }
      return 0;
    });
  };

  const getWorkPackagesForProject = (projectId: string): WorkPackage[] => {
    const filtered = workPackages.filter(wp => wp.project_id === projectId);
    return sortWorkPackages(filtered);
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
          <div className="text-red-500 text-5xl mb-4">âš ï¸Â</div>
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
                <h1 className="text-lg font-semibold text-white">{company.name}</h1>
                <p className="text-sm text-green-100">
                  Firmen-Portal · {BUNDESLAND_NAMES[company.federal_state || ''] || company.federal_state || 'Kein Bundesland'}
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

        {/* TAB: ÜBERSICHT */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
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
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Aktuelle Projekte</h3>
                <button onClick={() => setActiveTab('projects')} className="text-green-600 hover:text-green-700 text-sm">
                  Alle anzeigen â†’
                </button>
              </div>
              {projects.length === 0 ? (
                <p className="text-gray-500">Noch keine Projekte vorhanden.</p>
              ) : (
                <div className="space-y-3">
                  {projects.slice(0, 3).map(project => (
                    <div key={project.id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">{project.name}</span>
                            {getFundingFormatBadge(project.funding_format)}
                            {canEdit && (
                              <>
                                <button
                                  onClick={() => openEditProjectModal(project)}
                                  className="p-1 text-gray-400 hover:text-blue-600"
                                  title="Projekt bearbeiten"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => handleDeleteProject(project)}
                                  className="p-1 text-gray-400 hover:text-red-600"
                                  title="Projekt löschen"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </>
                            )}
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

        {/* TAB: PROJEKTE */}
        {activeTab === 'projects' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Projekte</h2>
              {canEdit && (
                <button
                  onClick={openCreateProjectModal}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Neues Projekt
                </button>
              )}
            </div>

            {projects.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <p className="text-gray-500">Noch keine Projekte vorhanden.</p>
              </div>
            ) : (
              projects.map(project => {
                const projectWPs = getWorkPackagesForProject(project.id);
                const projectEmployees = getEmployeesForProject(project.id);
                const totalPM = getTotalPMForProject(project.id);
                const isExpanded = expandedProjects.has(project.id);

                return (
                  <div key={project.id} className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="p-4 cursor-pointer hover:bg-gray-50" onClick={() => toggleProjectExpanded(project.id)}>
                      <div className="flex justify-between items-start">
                        <div className="flex items-start gap-3">
                          <button className="mt-1 text-gray-400">
                            <svg className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-gray-900">{project.name}</span>
                              {getFundingFormatBadge(project.funding_format)}
                              {canEdit && (
                                <>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); openEditProjectModal(project); }}
                                    className="p-1 text-gray-400 hover:text-blue-600"
                                    title="Projekt bearbeiten"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleDeleteProject(project); }}
                                    className="p-1 text-gray-400 hover:text-red-600"
                                    title="Projekt löschen"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </>
                              )}
                            </div>
                            <p className="text-sm text-gray-500">FKZ: {project.funding_reference || '-'}</p>
                            
                            {projectEmployees.length > 0 && (
                              <div className="mt-2">
                                <span className="text-xs text-gray-400 uppercase">Zugeordnete Mitarbeiter</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {projectEmployees.map(emp => (
                                    <span key={emp.id} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-700">
                                      👤 {emp.display_name}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        <span className="text-sm text-gray-400">
                          {formatDate(project.start_date)} - {formatDate(project.end_date)}
                        </span>
                      </div>
                      
                      <div className="mt-3 pt-3 border-t flex items-center gap-6 text-sm text-gray-500">
                        <span>📋 {projectWPs.length} Arbeitspakete</span>
                        <span>·</span>
                        <span>{totalPM.toFixed(1)} PM gesamt</span>
                      </div>
                    </div>

                    {isExpanded && projectWPs.length > 0 && (
                      <div className="border-t bg-gray-50 p-4">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="font-medium text-gray-700">Arbeitspakete</h4>
                          {canEdit && (
                            <button
                              onClick={() => openCreateWPModal(project.id)}
                              className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-1"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                              AP hinzufügen
                            </button>
                          )}
                        </div>
                        <div className="space-y-2">
                          {projectWPs.map(wp => {
                            const assignedEmps = getAssignedEmployeesForWP(wp.id);
                            const distributedPM = getDistributedPMForWP(wp.id);
                            
                            return (
                              <div key={wp.id} className="bg-white rounded border p-3">
                                <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-green-600 font-medium">{wp.ap_code || `AP${wp.ap_number}`}</span>
                                      <span className="text-gray-900">{wp.name}</span>
                                      {canEdit && (
                                        <>
                                          <button
                                            onClick={() => openEditWPModal(wp)}
                                            className="p-1 text-gray-400 hover:text-blue-600"
                                            title="Arbeitspaket bearbeiten"
                                          >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                            </svg>
                                          </button>
                                          <button
                                            onClick={() => openWPAssignModal(wp)}
                                            className="p-1 text-gray-400 hover:text-purple-600"
                                            title="Mitarbeiter zuordnen"
                                          >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                          </button>
                                          <button
                                            onClick={() => handleDeleteWP(wp)}
                                            className="p-1 text-gray-400 hover:text-red-600"
                                            title="Arbeitspaket löschen"
                                          >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                          </button>
                                        </>
                                      )}
                                    </div>
                                    
                                    {assignedEmps.length > 0 && (
                                      <div className="mt-2 flex flex-wrap gap-1">
                                        {assignedEmps.map(({ employee, pm }) => (
                                          <span key={employee.id} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-green-100 text-green-700">
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
                                    <div className="font-medium text-purple-600">{(wp.total_person_months || 0).toFixed(2)} PM</div>
                                    <div className="text-xs text-gray-400">= {((wp.total_person_months || 0) * HOURS_PER_PM).toFixed(0)} h</div>
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

        {/* TAB: MITARBEITER - MIT CRUD */}
        {activeTab === 'employees' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Mitarbeiter</h2>
              {canEdit && (
                <button
                  onClick={openCreateEmployeeModal}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Neuer Mitarbeiter
                </button>
              )}
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
                      {canEdit && (
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aktionen</th>
                      )}
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
                        {canEdit && (
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => openEditEmployeeModal(emp)}
                                className="p-1 text-gray-400 hover:text-blue-600"
                                title="Bearbeiten"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => confirmDeleteEmployee(emp)}
                                className="p-1 text-gray-400 hover:text-red-600"
                                title="Löschen"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB: ARBEITSPAKETE */}
        {activeTab === 'workpackages' && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">Arbeitspakete</h2>

            {workPackages.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <p className="text-gray-500">Noch keine Arbeitspakete vorhanden.</p>
              </div>
            ) : (
              projects.map(project => {
                const projectWPs = getWorkPackagesForProject(project.id);
                if (projectWPs.length === 0) return null;

                const totalPM = projectWPs.reduce((sum, wp) => sum + (wp.total_person_months || 0), 0);

                return (
                  <div key={project.id} className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="bg-gray-50 px-4 py-3 border-b flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{project.name}</span>
                        {getFundingFormatBadge(project.funding_format)}
                        <span className="text-sm text-gray-500">FKZ: {project.funding_reference}</span>
                      </div>
                      <div className="text-sm text-gray-500">
                        {projectWPs.length} AP · {totalPM.toFixed(1)} PM ({(totalPM * HOURS_PER_PM).toFixed(0)} h)
                      </div>
                    </div>

                    <div className="divide-y divide-gray-100">
                      {projectWPs.map(wp => {
                        const assignedEmps = getAssignedEmployeesForWP(wp.id);
                        const distributedPM = getDistributedPMForWP(wp.id);

                        return (
                          <div key={wp.id} className="p-4 hover:bg-gray-50">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-green-600 font-bold">{wp.ap_code || `AP${wp.ap_number}`}</span>
                                  <span className="text-gray-900">{wp.name}</span>
                                </div>

                                {assignedEmps.length > 0 ? (
                                  <div className="mt-2">
                                    <span className="text-xs text-gray-400">Zugeordnete MA:</span>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {assignedEmps.map(({ employee, pm }) => (
                                        <span key={employee.id} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-green-100 text-green-700">
                                          {employee.display_name} ({pm.toFixed(2)} PM)
                                        </span>
                                      ))}
                                    </div>
                                    <div className="text-xs text-gray-400 mt-1">
                                      Verteilt: {distributedPM.toFixed(2)} / {(wp.total_person_months || 0).toFixed(2)} PM
                                    </div>
                                  </div>
                                ) : (
                                  <div className="mt-2 text-xs text-gray-400">Keine Mitarbeiter zugeordnet</div>
                                )}
                              </div>
                              <div className="text-right">
                                <div className="text-lg font-semibold text-purple-600">{(wp.total_person_months || 0).toFixed(2)} PM</div>
                                <div className="text-xs text-gray-400">= {((wp.total_person_months || 0) * HOURS_PER_PM).toFixed(0)} h</div>
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
            Projektzeiterfassung v7.3.26 · Firmen-Portal · © {new Date().getFullYear()}
          </p>
        </div>
      </footer>

      {/* MODAL: Mitarbeiter anlegen/bearbeiten */}
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nachname</label>
                  <input
                    type="text"
                    name="last_name"
                    value={employeeFormData.last_name}
                    onChange={handleEmployeeInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Anzeigename</label>
                  <input
                    type="text"
                    name="display_name"
                    value={employeeFormData.display_name}
                    onChange={handleEmployeeInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                  <input
                    type="text"
                    name="position_title"
                    value={employeeFormData.position_title}
                    onChange={handleEmployeeInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
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
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
              >
                {saving && <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>}
                {employeeModalMode === 'create' ? 'Anlegen' : 'Speichern'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Löschen bestätigen */}
      {showDeleteConfirm && employeeToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Mitarbeiter löschen?</h3>
                  <p className="text-gray-500 mt-1">
                    Möchten Sie <strong>{employeeToDelete.display_name}</strong> wirklich löschen?
                  </p>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
              <button
                onClick={() => { setShowDeleteConfirm(false); setEmployeeToDelete(null); }}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Abbrechen
              </button>
              <button
                onClick={handleDeleteEmployee}
                disabled={saving}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                Löschen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Projekt anlegen/bearbeiten */}
      {showProjectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                {projectModalMode === 'create' ? 'Neues Projekt' : 'Projekt bearbeiten'}
              </h3>
              <button onClick={closeProjectModal} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4">
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    placeholder="z.B. DigiTrans - Digitale Transformation"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kurzname</label>
                  <input
                    type="text"
                    name="short_name"
                    value={projectFormData.short_name}
                    onChange={handleProjectInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    placeholder="z.B. DigiTrans"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Förderkennzeichen (FKZ)</label>
                  <input
                    type="text"
                    name="funding_reference"
                    value={projectFormData.funding_reference}
                    onChange={handleProjectInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    placeholder="z.B. 16KN087502"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Förderformat</label>
                  <select
                    name="funding_format"
                    value={projectFormData.funding_format}
                    onChange={handleProjectInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  >
                    {FUNDING_FORMATS.map(f => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Startdatum</label>
                  <input
                    type="date"
                    name="start_date"
                    value={projectFormData.start_date}
                    onChange={handleProjectInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Enddatum</label>
                  <input
                    type="date"
                    name="end_date"
                    value={projectFormData.end_date}
                    onChange={handleProjectInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
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
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
              >
                {saving && <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>}
                {projectModalMode === 'create' ? 'Anlegen' : 'Speichern'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Arbeitspaket anlegen/bearbeiten */}
      {showWPModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                {wpModalMode === 'create' ? 'Neues Arbeitspaket' : 'Arbeitspaket bearbeiten'}
              </h3>
              <button onClick={closeWPModal} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4">
              {wpFormError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{wpFormError}</div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">AP-Nummer</label>
                  <input
                    type="number"
                    name="ap_number"
                    value={wpFormData.ap_number}
                    onChange={handleWPInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">AP-Code</label>
                  <input
                    type="text"
                    name="ap_code"
                    value={wpFormData.ap_code}
                    onChange={handleWPInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    placeholder="z.B. AP1.1, AP2"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={wpFormData.name}
                    onChange={handleWPInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    placeholder="z.B. Konzeption und Entwicklung"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Beschreibung</label>
                  <textarea
                    name="description"
                    value={wpFormData.description}
                    onChange={handleWPInputChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    placeholder="Optionale Beschreibung..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Personenmonate (PM)</label>
                  <input
                    type="number"
                    name="total_person_months"
                    value={wpFormData.total_person_months}
                    onChange={handleWPInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    min="0.1"
                    step="0.1"
                  />
                  <p className="text-xs text-gray-500 mt-1">= {(parseFloat(wpFormData.total_person_months || '0') * HOURS_PER_PM).toFixed(0)} Stunden</p>
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
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
              >
                {saving && <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>}
                {wpModalMode === 'create' ? 'Anlegen' : 'Speichern'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Mitarbeiter zu AP zuordnen */}
      {showWPAssignModal && editingWPForAssign && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                Mitarbeiter zuordnen: {editingWPForAssign.ap_code || `AP${editingWPForAssign.ap_number}`}
              </h3>
              <button onClick={closeWPAssignModal} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4">
              {wpAssignFormError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{wpAssignFormError}</div>
              )}

              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600">
                  <strong>{editingWPForAssign.name}</strong><br />
                  Gesamt: {editingWPForAssign.total_person_months?.toFixed(2)} PM = {((editingWPForAssign.total_person_months || 0) * HOURS_PER_PM).toFixed(0)} h
                </p>
              </div>

              <div className="space-y-3">
                {wpAssignFormData.map((assign, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <select
                      value={assign.employee_id}
                      onChange={(e) => handleWPAssignChange(index, 'employee_id', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    >
                      <option value="">-- Mitarbeiter wählen --</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.display_name}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      value={assign.planned_person_months}
                      onChange={(e) => handleWPAssignChange(index, 'planned_person_months', e.target.value)}
                      className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      placeholder="PM"
                      min="0"
                      step="0.1"
                    />
                    <span className="text-sm text-gray-500 w-12">PM</span>
                    {wpAssignFormData.length > 1 && (
                      <button
                        onClick={() => removeWPAssignRow(index)}
                        className="p-2 text-red-500 hover:text-red-700"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button
                onClick={addWPAssignRow}
                className="text-green-600 hover:text-green-700 text-sm flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Weiteren Mitarbeiter hinzufügen
              </button>

              <div className="bg-blue-50 p-3 rounded-lg text-sm">
                <strong>Summe:</strong> {wpAssignFormData.reduce((sum, a) => sum + (parseFloat(a.planned_person_months) || 0), 0).toFixed(2)} PM 
                von {editingWPForAssign.total_person_months?.toFixed(2)} PM
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
              <button onClick={closeWPAssignModal} className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                Abbrechen
              </button>
              <button
                onClick={handleSaveWPAssign}
                disabled={saving}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
              >
                {saving && <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>}
                Speichern
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
