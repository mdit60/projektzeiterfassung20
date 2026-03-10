// src/components/shared/ProjectDetailPage.tsx
// ============================================================================
// PZE V7 - Shared Project Detail Page
// ============================================================================
// Datum: 05. Februar 2026
// Version: 7.3.88-7
//
// Gemeinsame Projekt-Detailseite fuer beide Portale:
// - Berater-Portal: /v7/berater/foerderung/firma/[firmaId]/projekt/[projektId]
// - Firmen-Portal: /v7/firma/projekte/[id]
//
// v7.3.88-7: FIX: projectTeam an WorkPackageTable uebergeben
//            MA-Sortierung im Arbeitsplan nach employee_number (lfd. Nr.)
// v7.3.87: NEU: Team-Tab mit ProjectTeamManager (MA vor APs zuordnen)
//          NEU: ArbeitsplanImport fuer Excel Download/Upload im AP-Tab
// v7.3.86: TypeScript Typ-Korrekturen:
//          - PortalHeader userRole/portalRole korrigiert
//          - Lokale Employee/WorkPackage Typen fuer Kompatibilitaet
//          - hideNavigation fuer Detailseiten
// v7.3.84: Zeiterfassungs-Tab mit Link zur Zeiterfassungsseite
// v7.3.81: Team-Sortierung nach employee_number (Anlage 6.2)
// v7.3.76-2: AP-Nummer mit Sub-Nummer (z.B. AP2.1)
//            Datumsfelder statt Monatsnummern
//            is_technical Flag fuer technische APs
//
// Props:
// - portal: 'berater' | 'firma' (steuert Farben)
// - projectId: string
// - companyId?: string (nur Berater - fuer Zurueck-Navigation)
// - backUrl?: string (optional - wohin Zurueck fuehrt)
//
// Tabs: Uebersicht | Arbeitspakete | Team | Zeiterfassung
// ============================================================================

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  ArrowLeft,
  FolderKanban,
  Package,
  Users,
  Clock,
  AlertCircle,
  Pencil,
  Save,
  X,
  Plus,
  Trash2,
} from 'lucide-react';

// Shared Components
import PortalHeader from '@/components/shared/PortalHeader';
import WorkPackageTable from '@/components/shared/WorkPackageTable';
import { 
  WorkPackage as WPListWorkPackage, 
  sortWorkPackages, 
  formatAPCode 
} from '@/components/shared/WorkPackageList';
import WorkPackageEditModal, { WorkPackageFormData, Project as WPProject } from '@/components/shared/WorkPackageEditModal';
import WorkPackageAssignmentModal, {
  Employee as WPModalEmployee,
  WorkPackageAssignment as WPModalAssignment,
} from '@/components/shared/WorkPackageAssignmentModal';
// NEU v7.3.87: Team-Manager und Import-Komponenten
import ProjectTeamManager from '@/components/shared/ProjectTeamManager';
import ArbeitsplanImport from '@/components/shared/ArbeitsplanImport';

// Types
import { V7UserRole, V7EmployeePortalRole, V7Employee, V7ClientCompany } from '@/types/v7-types';
import { HOURS_PER_PM, PORTAL_COLORS } from '@/lib/v7-constants';

// ============================================================================
// TYPEN
// ============================================================================

export type PortalType = 'berater' | 'firma';

// Lokale Typen die mit allen Shared Components kompatibel sind
interface WorkPackage {
  id: string;
  project_id: string;
  ap_number: number;
  ap_sub_number: number | null;
  ap_code: string | null;
  name: string;
  description: string | null;
  start_month: number | null;
  end_month: number | null;
  start_date: string | null;
  end_date: string | null;
  total_person_months: number | null;
  total_costs: number | null;
  is_active: boolean;
  is_technical?: boolean | null;
  planned_pm?: number | null;
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

// Employee fuer WorkPackageTable
interface WPEmployee {
  id: string;
  display_name: string;
  first_name: string | null;
  last_name: string | null;
  position_title: string | null;
  weekly_hours: number | null;
  employee_number: number | null;  // Nicht optional, immer definiert
}

interface ProjectDetailPageProps {
  portal: PortalType;
  projectId: string;
  companyId?: string;  // Nur Berater-Portal
  backUrl?: string;    // Wohin Zurueck fuehrt
}

interface UserProfile {
  id: string;
  email: string;
  role: V7UserRole;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  client_company_id: string | null;
}

interface Project {
  id: string;
  name: string;
  short_name: string | null;
  funding_format: string | null;
  funding_reference: string | null;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
  is_active: boolean;
  client_company_id: string;
  foerdersatz: number | null;
  overhead_t: number | null;
  overhead_nt: number | null;
  overhead_gleich: boolean | null;
  workplan_locked: boolean | null;
}

interface TeamMember {
  id: string;
  employee_id: string;
  employee_name: string;
  weekly_hours: number | null;
  role_in_project: string | null;
  is_project_leader: boolean;
  planned_pm: number | null;
  hourly_rate: number | null;
  employee_number: number | null;  // Mitarbeiter-Nummer aus ZIM-Antrag (Anlage 6.2)
}

interface TeamEditData {
  role_in_project: string;
  hourly_rate: string;
  is_project_leader: boolean;
}

interface ProjectEditData {
  name: string;
  short_name: string;
  funding_format: string;
  funding_reference: string;
  start_date: string;
  end_date: string;
  notes: string;
  foerdersatz: string;
  overhead_t: string;
  overhead_nt: string;
  overhead_gleich: boolean;
}

// Foerderprogramm-Optionen
const FUNDING_FORMATS = [
  { value: '', label: '-- Bitte waehlen --' },
  { value: 'ZIM', label: 'ZIM Einzelprojekt' },
  { value: 'ZIM_KOOP', label: 'ZIM Kooperationsprojekt' },
  { value: 'ZIM_NETZWERK', label: 'ZIM Netzwerk-Management' },
  { value: 'ZIM_DS', label: 'ZIM Durchfuehrbarkeitsstudie' },
  { value: 'BMBF', label: 'BMBF Foerderung' },
  { value: 'BMBF_DS', label: 'BMBF Durchfuehrbarkeitsstudie' },
];

type TabKey = 'uebersicht' | 'arbeitspakete' | 'team' | 'zeiterfassung';

// ============================================================================
// KOMPONENTE
// ============================================================================

export default function ProjectDetailPage({ 
  portal, 
  projectId, 
  companyId,
  backUrl 
}: ProjectDetailPageProps) {
  const router = useRouter();
  const supabase = createClient();

  // Portal-spezifische Farben
  const colors = PORTAL_COLORS[portal];
  const buttonBg = portal === 'firma' ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700';
  const buttonBgLight = portal === 'firma' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700';
  const focusRing = portal === 'firma' ? 'focus:ring-green-500 focus:border-green-500' : 'focus:ring-blue-500 focus:border-blue-500';
  const borderActive = portal === 'firma' ? 'border-green-600 text-green-600' : 'border-blue-600 text-blue-600';
  const spinnerColor = portal === 'firma' ? 'border-green-200 border-t-green-600' : 'border-blue-200 border-t-blue-600';

  // State - Basis
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [employee, setEmployee] = useState<V7Employee | null>(null);
  const [company, setCompany] = useState<V7ClientCompany | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('uebersicht');

  // State - Arbeitspakete
  const [workPackages, setWorkPackages] = useState<WorkPackage[]>([]);
  const [wpAssignments, setWpAssignments] = useState<WorkPackageAssignment[]>([]);
  const [allEmployees, setAllEmployees] = useState<WPEmployee[]>([]);
  const [projectEmployeeIds, setProjectEmployeeIds] = useState<string[]>([]);

  // State - WorkPackage Modals
  const [showWPEditModal, setShowWPEditModal] = useState(false);
  const [wpEditMode, setWpEditMode] = useState<'create' | 'edit'>('create');
  const [editingWP, setEditingWP] = useState<WorkPackage | null>(null);
  const [wpError, setWpError] = useState<string | null>(null);
  const [savingWP, setSavingWP] = useState(false);

  // State - WorkPackage Assignment Modal
  const [showWPAssignModal, setShowWPAssignModal] = useState(false);
  const [assignmentWP, setAssignmentWP] = useState<WorkPackage | null>(null);
  const [savingAssignment, setSavingAssignment] = useState(false);

  // State - Delete Confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [wpToDelete, setWpToDelete] = useState<WorkPackage | null>(null);
  const [deleting, setDeleting] = useState(false);

  // State - Team
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [teamEditData, setTeamEditData] = useState<TeamEditData>({
    role_in_project: '',
    hourly_rate: '',
    is_project_leader: false,
  });
  const [savingTeam, setSavingTeam] = useState(false);

  // State - Projekt-Bearbeitung
  const [showProjectEditModal, setShowProjectEditModal] = useState(false);
  const [projectEditData, setProjectEditData] = useState<ProjectEditData>({
    name: '',
    short_name: '',
    funding_format: '',
    funding_reference: '',
    start_date: '',
    end_date: '',
    notes: '',
    foerdersatz: '',
    overhead_t: '',
    overhead_nt: '',
    overhead_gleich: false,
  });
  const [savingProject, setSavingProject] = useState(false);
  const [showProjectDeleteConfirm, setShowProjectDeleteConfirm] = useState(false);
  const [projectDeleteConfirmText, setProjectDeleteConfirmText] = useState('');
  const [deletingProject, setDeletingProject] = useState(false);

  // ============================================================================
  // DATEN LADEN
  // ============================================================================

  useEffect(() => {
    loadData();
  }, [projectId, companyId]);

  const loadData = async () => {
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

      if (!profile) {
        setError('Kein Zugriff');
        setLoading(false);
        return;
      }

      setUserProfile(profile);

      // Firmen-ID bestimmen (je nach Portal)
      let targetCompanyId: string;
      
      if (portal === 'berater') {
        // Berater: Berechtigung pruefen und companyId verwenden
        if (!['system_admin', 'consultant'].includes(profile.role)) {
          setError('Keine Berater-Berechtigung');
          setLoading(false);
          return;
        }
        if (!companyId) {
          setError('Keine Firma angegeben');
          setLoading(false);
          return;
        }
        targetCompanyId = companyId;
      } else {
        // Firma: Eigene Firma des Users
        if (!profile.client_company_id) {
          setError('Kein Zugriff');
          setLoading(false);
          return;
        }
        targetCompanyId = profile.client_company_id;
      }

      // Firma laden
      const { data: companyData } = await supabase
        .from('v7_client_companies')
        .select('*')
        .eq('id', targetCompanyId)
        .single();

      if (companyData) setCompany(companyData);

      // Employee laden (nur Firmen-Portal)
      if (portal === 'firma') {
        const { data: employeeData } = await supabase
          .from('v7_employees')
          .select('*')
          .eq('client_company_id', targetCompanyId)
          .eq('email', user.email)
          .maybeSingle();

        if (employeeData) setEmployee(employeeData);
      }

      // Projekt laden
      const { data: projectData, error: projectError } = await supabase
        .from('v7_projects')
        .select('*')
        .eq('id', projectId)
        .eq('client_company_id', targetCompanyId)
        .single();

      if (projectError || !projectData) {
        setError('Projekt nicht gefunden');
        setLoading(false);
        return;
      }

      setProject(projectData);

      // Alle Mitarbeiter der Firma laden
      const { data: allEmpsData } = await supabase
        .from('v7_employees')
        .select('id, display_name, first_name, last_name, position_title, weekly_hours')
        .eq('client_company_id', targetCompanyId)
        .eq('is_active', true)
        .order('display_name');

      if (allEmpsData) {
        // Typen explizit mappen fuer Kompatibilitaet
        const mappedEmployees: WPEmployee[] = allEmpsData.map(emp => ({
          id: emp.id,
          display_name: emp.display_name,
          first_name: emp.first_name || null,
          last_name: emp.last_name || null,
          position_title: emp.position_title || null,
          weekly_hours: emp.weekly_hours || null,
          employee_number: null,  // Wird aus project_assignments geladen
        }));
        setAllEmployees(mappedEmployees);
      }

      // Arbeitspakete laden
      const { data: wpData } = await supabase
        .from('v7_work_packages')
        .select('*')
        .eq('project_id', projectId)
        .eq('is_active', true)
        .order('ap_number')
        .order('ap_sub_number');

      if (wpData) setWorkPackages(wpData);

      // Work Package Assignments laden
      if (wpData && wpData.length > 0) {
        const wpIds = wpData.map(wp => wp.id);
        const { data: wpaData } = await supabase
          .from('v7_work_package_assignments')
          .select('*')
          .in('work_package_id', wpIds)
          .eq('is_active', true);

        if (wpaData) setWpAssignments(wpaData);
      }

      // Projekt-Zuordnungen laden (fuer Team und WP-Zuordnungen)
      const { data: assignmentData } = await supabase
        .from('v7_project_assignments')
        .select(`
          id,
          employee_id,
          role_in_project,
          is_project_leader,
          hourly_rate,
          employee_number,
          v7_employees!inner(display_name, weekly_hours)
        `)
        .eq('project_id', projectId)
        .eq('is_active', true);

      if (assignmentData) {
        // Employee IDs die dem Projekt zugeordnet sind
        setProjectEmployeeIds(assignmentData.map((a: any) => a.employee_id));

        // WP-Assignments fuer PM-Aggregation
        const { data: wpAssignmentsData } = await supabase
          .from('v7_work_package_assignments')
          .select(`
            employee_id,
            planned_person_months,
            hourly_rate,
            work_package_id,
            v7_work_packages!inner(project_id)
          `)
          .eq('v7_work_packages.project_id', projectId)
          .eq('is_active', true);

        const team = assignmentData.map((a: any) => {
          const maWpAssignments = wpAssignmentsData?.filter(
            (wpa: any) => wpa.employee_id === a.employee_id
          ) || [];

          const totalPM = maWpAssignments.reduce(
            (sum: number, wpa: any) => sum + (wpa.planned_person_months || 0), 0
          );

          const hourlyRate = a.hourly_rate ||
            (maWpAssignments.length > 0 ? maWpAssignments[0].hourly_rate : null);

          return {
            id: a.id,
            employee_id: a.employee_id,
            employee_name: a.v7_employees?.display_name || 'Unbekannt',
            weekly_hours: a.v7_employees?.weekly_hours || 40,
            role_in_project: a.role_in_project,
            is_project_leader: a.is_project_leader || false,
            planned_pm: totalPM > 0 ? totalPM : null,
            hourly_rate: hourlyRate,
            employee_number: a.employee_number || null,  // MA-Nr aus ZIM-Antrag (Anlage 6.2)
          };
        });
        // Sortierung: Nach employee_number (Anlage 6.2), dann alphabetisch
        team.sort((a, b) => {
          // Beide haben employee_number -> danach sortieren
          if (a.employee_number !== null && b.employee_number !== null) {
            return a.employee_number - b.employee_number;
          }
          // Nur einer hat employee_number -> der kommt zuerst
          if (a.employee_number !== null) return -1;
          if (b.employee_number !== null) return 1;
          // Keiner hat employee_number -> alphabetisch
          return a.employee_name.localeCompare(b.employee_name, 'de');
        });
        setTeamMembers(team);
      }

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // HILFSFUNKTIONEN
  // ============================================================================

  const getUserName = (): string => {
    if (userProfile?.display_name) return userProfile.display_name;
    if (userProfile?.first_name && userProfile?.last_name) {
      return `${userProfile.first_name} ${userProfile.last_name}`;
    }
    return userProfile?.email?.split('@')[0] || 'Benutzer';
  };

  // Gibt die effektive Portal-Rolle zurueck (fuer Navigation und Berechtigungen)
  const getPortalRole = (): V7EmployeePortalRole | V7UserRole => {
    if (portal === 'berater') {
      // Im Berater-Portal: V7UserRole zurueckgeben
      return userProfile?.role || 'consultant';
    }
    // Im Firmen-Portal: V7EmployeePortalRole zurueckgeben
    if (userProfile?.role === 'client_admin') return 'client_admin';
    if (employee?.portal_role) return employee.portal_role;
    return 'employee';
  };
  
  // Gibt die V7UserRole fuer den PortalHeader zurueck
  const getUserRole = (): V7UserRole => {
    return userProfile?.role || 'client_user';
  };

  const isAdmin = (): boolean => {
    if (portal === 'berater') {
      return ['system_admin', 'consultant'].includes(userProfile?.role || '');
    }
    return getPortalRole() === 'client_admin';
  };

  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('de-DE');
  };

  const getTotalPM = (): number => {
    return workPackages.reduce((sum, wp) => sum + (wp.total_person_months || 0), 0);
  };

  const getMonthlyHours = (weeklyHours: number | null): number => {
    const hours = weeklyHours || 40;
    return Math.round((hours * 52 / 12) * 100) / 100;
  };

  const calcPlannedHours = (pm: number | null, weeklyHours: number | null): number => {
    if (!pm) return 0;
    const monthlyHours = getMonthlyHours(weeklyHours);
    return Math.round(pm * monthlyHours);
  };

  const getNextAPNumber = (pId: string): number => {
    const projectWPs = workPackages.filter(wp => wp.project_id === pId);
    if (projectWPs.length === 0) return 1;
    return Math.max(...projectWPs.map(wp => wp.ap_number)) + 1;
  };

  const getBackUrl = (): string => {
    if (backUrl) return backUrl;
    if (portal === 'berater' && companyId) {
      return `/v7/berater/foerderung/firma/${companyId}?tab=projekte`;
    }
    return '/v7/firma/projekte';
  };

  const getBackLabel = (): string => {
    if (portal === 'berater') return 'Firma';
    return 'Projekte';
  };

  // ============================================================================
  // WORKPACKAGE CRUD
  // ============================================================================

  const openCreateWPModal = () => {
    setWpEditMode('create');
    setEditingWP(null);
    setWpError(null);
    setShowWPEditModal(true);
  };

  const openEditWPModal = (wp: WorkPackage) => {
    setWpEditMode('edit');
    setEditingWP(wp);
    setWpError(null);
    setShowWPEditModal(true);
  };

  const closeWPEditModal = () => {
    setShowWPEditModal(false);
    setEditingWP(null);
    setWpError(null);
  };

  const handleSaveWP = async (formData: WorkPackageFormData) => {
    setSavingWP(true);
    setWpError(null);

    try {
      const wpData = {
        project_id: formData.project_id || projectId,
        ap_number: parseInt(formData.ap_number),
        // NEU: ap_sub_number aus Formular (z.B. "1" fuer AP2.1)
        ap_sub_number: formData.ap_sub_number ? parseInt(formData.ap_sub_number) : null,
        ap_code: formData.ap_code.trim() || `AP${formData.ap_number}`,
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        // NEU: Echte Datumsfelder statt Monatsnummern
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        // Legacy-Felder auf null (nicht mehr verwendet)
        start_month: null,
        end_month: null,
        total_person_months: formData.total_person_months ? parseFloat(formData.total_person_months) : null,
        total_costs: formData.total_costs ? parseFloat(formData.total_costs) : null,
        // NEU: Technisches AP Flag
        is_technical: formData.is_technical || false,
        updated_at: new Date().toISOString(),
      };

      if (wpEditMode === 'create') {
        const { error: insertError } = await supabase
          .from('v7_work_packages')
          .insert({ ...wpData, is_active: true });

        if (insertError) {
          if (insertError.code === '23505') {
            setWpError('Ein Arbeitspaket mit dieser Nummer existiert bereits');
          } else {
            setWpError(insertError.message);
          }
          return;
        }
      } else if (wpEditMode === 'edit' && editingWP) {
        const { error: updateError } = await supabase
          .from('v7_work_packages')
          .update(wpData)
          .eq('id', editingWP.id);

        if (updateError) {
          setWpError(updateError.message);
          return;
        }
      }

      closeWPEditModal();
      await loadData();

    } catch (err: any) {
      setWpError(err.message);
    } finally {
      setSavingWP(false);
    }
  };

  // Delete WorkPackage
  const openDeleteConfirmation = (wp: WorkPackage) => {
    setWpToDelete(wp);
    setShowDeleteConfirm(true);
  };

  const closeDeleteConfirmation = () => {
    setWpToDelete(null);
    setShowDeleteConfirm(false);
  };

  const handleDeleteWP = async () => {
    if (!wpToDelete) return;

    setDeleting(true);
    try {
      const { error: deleteError } = await supabase
        .from('v7_work_packages')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', wpToDelete.id);

      if (deleteError) throw deleteError;

      closeDeleteConfirmation();
      await loadData();

    } catch (err: any) {
      alert('Fehler beim Loeschen: ' + err.message);
    } finally {
      setDeleting(false);
    }
  };

  // ============================================================================
  // WORKPACKAGE ASSIGNMENT
  // ============================================================================

  const openWPAssignModal = (wp: WorkPackage) => {
    setAssignmentWP(wp);
    setShowWPAssignModal(true);
  };

  const closeWPAssignModal = () => {
    setAssignmentWP(null);
    setShowWPAssignModal(false);
  };

  const handleAddWPAssignment = async (employeeId: string, pm: number | null) => {
    if (!assignmentWP) return;

    setSavingAssignment(true);
    try {
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
          // Duplikat - reaktivieren
          await supabase
            .from('v7_work_package_assignments')
            .update({
              is_active: true,
              planned_person_months: pm,
              planned_hours: hours,
              updated_at: new Date().toISOString(),
            })
            .eq('work_package_id', assignmentWP.id)
            .eq('employee_id', employeeId);
        } else {
          throw insertError;
        }
      }

      await loadData();

    } catch (err: any) {
      alert('Fehler: ' + err.message);
    } finally {
      setSavingAssignment(false);
    }
  };

  const handleUpdateWPAssignment = async (employeeId: string, pm: number | null) => {
    if (!assignmentWP) return;

    setSavingAssignment(true);
    try {
      const hours = pm ? Math.round(pm * HOURS_PER_PM * 100) / 100 : null;

      const { error: updateError } = await supabase
        .from('v7_work_package_assignments')
        .update({
          planned_person_months: pm,
          planned_hours: hours,
          updated_at: new Date().toISOString(),
        })
        .eq('work_package_id', assignmentWP.id)
        .eq('employee_id', employeeId);

      if (updateError) throw updateError;

      await loadData();

    } catch (err: any) {
      alert('Fehler: ' + err.message);
    } finally {
      setSavingAssignment(false);
    }
  };

  const handleRemoveWPAssignment = async (employeeId: string) => {
    if (!assignmentWP) return;

    setSavingAssignment(true);
    try {
      const { error: updateError } = await supabase
        .from('v7_work_package_assignments')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('work_package_id', assignmentWP.id)
        .eq('employee_id', employeeId);

      if (updateError) throw updateError;

      await loadData();

    } catch (err: any) {
      alert('Fehler: ' + err.message);
    } finally {
      setSavingAssignment(false);
    }
  };

  // Handler fuer WorkPackageTable Inline-Edit
  const handleTableAssignmentChange = async (
    workPackageId: string, 
    employeeId: string, 
    plannedPm: number | null
  ): Promise<void> => {
    try {
      const hours = plannedPm ? Math.round(plannedPm * HOURS_PER_PM * 100) / 100 : null;

      // Pruefen ob Assignment existiert
      const existing = wpAssignments.find(
        a => a.work_package_id === workPackageId && a.employee_id === employeeId
      );

      if (existing) {
        if (plannedPm === null || plannedPm === 0) {
          // Loeschen wenn PM 0 oder null
          await supabase
            .from('v7_work_package_assignments')
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq('id', existing.id);
        } else {
          // Update
          await supabase
            .from('v7_work_package_assignments')
            .update({
              planned_person_months: plannedPm,
              planned_hours: hours,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id);
        }
      } else if (plannedPm && plannedPm > 0) {
        // Neu anlegen
        await supabase
          .from('v7_work_package_assignments')
          .insert({
            work_package_id: workPackageId,
            employee_id: employeeId,
            planned_person_months: plannedPm,
            planned_hours: hours,
            is_active: true,
          });
      }

      await loadData();
    } catch (err: any) {
      console.error('Assignment update error:', err);
      alert('Fehler beim Speichern: ' + err.message);
    }
  };

  // ============================================================================
  // TEAM-BEARBEITUNG
  // ============================================================================

  const openTeamEditModal = (member: TeamMember) => {
    setEditingMember(member);
    setTeamEditData({
      role_in_project: member.role_in_project || '',
      hourly_rate: member.hourly_rate?.toString() || '',
      is_project_leader: member.is_project_leader,
    });
  };

  const closeTeamEditModal = () => {
    setEditingMember(null);
    setTeamEditData({
      role_in_project: '',
      hourly_rate: '',
      is_project_leader: false,
    });
  };

  const handleTeamSave = async () => {
    if (!editingMember) return;

    setSavingTeam(true);
    try {
      const hourlyRate = teamEditData.hourly_rate
        ? parseFloat(teamEditData.hourly_rate)
        : null;

      const { error: paError } = await supabase
        .from('v7_project_assignments')
        .update({
          role_in_project: teamEditData.role_in_project || null,
          hourly_rate: hourlyRate,
          is_project_leader: teamEditData.is_project_leader,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingMember.id);

      if (paError) throw paError;

      // Stundensatz auch in work_package_assignments aktualisieren
      if (hourlyRate !== null) {
        const wpIds = workPackages.map(wp => wp.id);
        if (wpIds.length > 0) {
          await supabase
            .from('v7_work_package_assignments')
            .update({
              hourly_rate: hourlyRate,
              updated_at: new Date().toISOString(),
            })
            .eq('employee_id', editingMember.employee_id)
            .in('work_package_id', wpIds);
        }
      }

      setTeamMembers(prev => prev.map(m =>
        m.id === editingMember.id
          ? {
            ...m,
            role_in_project: teamEditData.role_in_project || null,
            hourly_rate: hourlyRate,
            is_project_leader: teamEditData.is_project_leader,
          }
          : m
      ));

      closeTeamEditModal();
    } catch (err: any) {
      alert('Fehler beim Speichern: ' + err.message);
    } finally {
      setSavingTeam(false);
    }
  };

  // ============================================================================
  // PROJEKT-BEARBEITUNG
  // ============================================================================

  const openProjectEditModal = () => {
    if (!project) return;
    setProjectEditData({
      name: project.name || '',
      short_name: project.short_name || '',
      funding_format: project.funding_format || '',
      funding_reference: project.funding_reference || '',
      start_date: project.start_date || '',
      end_date: project.end_date || '',
      notes: project.notes || '',
      foerdersatz: project.foerdersatz != null ? String(project.foerdersatz) : '',
      overhead_t: project.overhead_t != null ? String(project.overhead_t) : '',
      overhead_nt: project.overhead_nt != null ? String(project.overhead_nt) : '',
      overhead_gleich: project.overhead_gleich || false,
    });
    setShowProjectEditModal(true);
  };

  const closeProjectEditModal = () => {
    setShowProjectEditModal(false);
  };

  const handleProjectSave = async () => {
    if (!project) return;

    setSavingProject(true);
    try {
      const { error: updateError } = await supabase
        .from('v7_projects')
        .update({
          name: projectEditData.name.trim() || null,
          short_name: projectEditData.short_name.trim() || null,
          funding_format: projectEditData.funding_format || null,
          funding_reference: projectEditData.funding_reference.trim() || null,
          start_date: projectEditData.start_date || null,
          end_date: projectEditData.end_date || null,
          notes: projectEditData.notes.trim() || null,
          foerdersatz: projectEditData.foerdersatz !== '' ? parseFloat(projectEditData.foerdersatz) : null,
          overhead_t: projectEditData.overhead_t !== '' ? parseFloat(projectEditData.overhead_t) : null,
          overhead_nt: projectEditData.overhead_gleich
            ? (projectEditData.overhead_t !== '' ? parseFloat(projectEditData.overhead_t) : null)
            : (projectEditData.overhead_nt !== '' ? parseFloat(projectEditData.overhead_nt) : null),
          overhead_gleich: projectEditData.overhead_gleich,
          updated_at: new Date().toISOString(),
        })
        .eq('id', project.id);

      if (updateError) throw updateError;

      setProject(prev => prev ? {
        ...prev,
        name: projectEditData.name.trim() || '',
        short_name: projectEditData.short_name.trim() || null,
        funding_format: projectEditData.funding_format || null,
        funding_reference: projectEditData.funding_reference.trim() || null,
        start_date: projectEditData.start_date || null,
        end_date: projectEditData.end_date || null,
        notes: projectEditData.notes.trim() || null,
        foerdersatz: projectEditData.foerdersatz !== '' ? parseFloat(projectEditData.foerdersatz) : null,
        overhead_t: projectEditData.overhead_t !== '' ? parseFloat(projectEditData.overhead_t) : null,
        overhead_nt: projectEditData.overhead_gleich
          ? (projectEditData.overhead_t !== '' ? parseFloat(projectEditData.overhead_t) : null)
          : (projectEditData.overhead_nt !== '' ? parseFloat(projectEditData.overhead_nt) : null),
        overhead_gleich: projectEditData.overhead_gleich,
      } : null);

      closeProjectEditModal();
    } catch (err: any) {
      alert('Fehler beim Speichern: ' + err.message);
    } finally {
      setSavingProject(false);
    }
  };

  // Projekt vollstaendig loeschen (nur fuer Berater/Admin)
  const handleProjectDelete = async () => {
    if (!project) return;
    
    // Sicherheitsabfrage: Projektname muss eingegeben werden
    const expectedName = project.short_name || project.name;
    if (projectDeleteConfirmText !== expectedName) {
      alert(`Bitte geben Sie "${expectedName}" ein, um das Loeschen zu bestaetigen.`);
      return;
    }

    setDeletingProject(true);
    try {
      // 1. Work Package Assignments loeschen
      const { data: wpData } = await supabase
        .from('v7_work_packages')
        .select('id')
        .eq('project_id', project.id);
      
      if (wpData && wpData.length > 0) {
        const wpIds = wpData.map(wp => wp.id);
        await supabase
          .from('v7_work_package_assignments')
          .delete()
          .in('work_package_id', wpIds);
      }

      // 2. Work Packages loeschen
      await supabase
        .from('v7_work_packages')
        .delete()
        .eq('project_id', project.id);

      // 3. Project Assignments loeschen
      await supabase
        .from('v7_project_assignments')
        .delete()
        .eq('project_id', project.id);

      // 4. Timesheets loeschen
      await supabase
        .from('v7_timesheets')
        .delete()
        .eq('project_id', project.id);

      // 5. Projekt selbst loeschen
      const { error: deleteError } = await supabase
        .from('v7_projects')
        .delete()
        .eq('id', project.id);

      if (deleteError) throw deleteError;

      // Zurueck zur Firmenseite navigieren
      router.push(getBackUrl());
    } catch (err: any) {
      alert('Fehler beim Loeschen: ' + err.message);
    } finally {
      setDeletingProject(false);
      setShowProjectDeleteConfirm(false);
      setProjectDeleteConfirmText('');
    }
  };

  // ============================================================================
  // TABS
  // ============================================================================

  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: 'uebersicht', label: 'Uebersicht', icon: <FolderKanban size={18} /> },
    { key: 'arbeitspakete', label: 'Arbeitspakete', icon: <Package size={18} /> },
    { key: 'team', label: 'Team', icon: <Users size={18} /> },
    { key: 'zeiterfassung', label: 'Zeiterfassung', icon: <Clock size={18} /> },
  ];

  // ============================================================================
  // RENDER
  // ============================================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className={`w-10 h-10 border-4 ${spinnerColor} rounded-full animate-spin`}></div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">{error || 'Projekt nicht gefunden'}</p>
          <button
            onClick={() => router.push(getBackUrl())}
            className={`px-4 py-2 ${buttonBg} text-white rounded-lg`}
          >
            Zurueck
          </button>
        </div>
      </div>
    );
  }

  const userName = getUserName();
  const portalRole = getPortalRole();
  const adminUser = isAdmin();

  // Projekt als WPProject fuer Modal
  const wpProjects: WPProject[] = project ? [{
    id: project.id,
    name: project.name,
    funding_reference: project.funding_reference,
    funding_format: project.funding_format,  // NEU: Fuer is_technical Checkbox bei ZIM_DS
  }] : [];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <PortalHeader
        portal={portal}
        userName={userName}
        userRole={getUserRole()}
        portalRole={portal === 'firma' ? (getPortalRole() as V7EmployeePortalRole) : undefined}
        companyName={company?.name || 'Firma'}
        hideNavigation={true}
      />

      {/* Projekt-Header mit Zurueck-Button */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push(getBackUrl())}
                className="flex items-center gap-1 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft size={20} />
                <span className="text-sm">{getBackLabel()}</span>
              </button>
              <div className="h-6 w-px bg-gray-300"></div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{project.name}</h1>
                <div className="flex items-center gap-3 text-sm text-gray-500">
                  {project.funding_format && (
                    <span className={`px-2 py-0.5 ${buttonBgLight} rounded text-xs font-medium`}>
                      {project.funding_format}
                    </span>
                  )}
                  {project.funding_reference && (
                    <span>FKZ: {project.funding_reference}</span>
                  )}
                </div>
              </div>
            </div>

            {adminUser && (
              <button
                onClick={openProjectEditModal}
                className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 
                           hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Pencil size={18} />
                <span className="hidden sm:inline text-sm">Bearbeiten</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Projekt-Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center space-x-1 overflow-x-auto -mb-px">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`
                  flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 
                  transition-colors whitespace-nowrap
                  ${activeTab === tab.key
                    ? borderActive
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                  }
                `}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.key === 'arbeitspakete' && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                    {workPackages.length}
                  </span>
                )}
                {tab.key === 'team' && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                    {teamMembers.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">

        {/* Tab: Uebersicht */}
        {activeTab === 'uebersicht' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Projektdaten</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="text-sm text-gray-500 mb-1">Projektname</div>
                  <div className="text-gray-900">{project.name}</div>
                </div>
                {project.short_name && (
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Kurzname</div>
                    <div className="text-gray-900">{project.short_name}</div>
                  </div>
                )}
                <div>
                  <div className="text-sm text-gray-500 mb-1">Foerderformat</div>
                  <div className="text-gray-900">{project.funding_format || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">Foerderkennzeichen (FKZ)</div>
                  <div className="text-gray-900">{project.funding_reference || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">Laufzeit</div>
                  <div className="text-gray-900">
                    {formatDate(project.start_date)} - {formatDate(project.end_date)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">Geplante PM gesamt</div>
                  <div className="text-gray-900">{getTotalPM().toFixed(2)} PM</div>
                </div>
              </div>
              {project.notes && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="text-sm text-gray-500 mb-1">Notizen</div>
                  <div className="text-gray-900 whitespace-pre-wrap">{project.notes}</div>
                </div>
              )}
              {(project.foerdersatz != null || project.overhead_t != null) && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="text-sm font-medium text-gray-700 mb-3">Foerderparameter (ZIM)</div>
                  <div className="grid grid-cols-2 gap-4">
                    {project.foerdersatz != null && (
                      <div>
                        <div className="text-sm text-gray-500 mb-1">Foerdersatz</div>
                        <div className="text-gray-900">{project.foerdersatz} %</div>
                      </div>
                    )}
                    {project.overhead_t != null && (
                      <div>
                        <div className="text-sm text-gray-500 mb-1">
                          {project.overhead_gleich ? 'Gemeinkostenzuschlag' : 'Gemeinkostenzuschlag (T)'}
                        </div>
                        <div className="text-gray-900">{project.overhead_t} %</div>
                      </div>
                    )}
                    {!project.overhead_gleich && project.overhead_nt != null && (
                      <div>
                        <div className="text-sm text-gray-500 mb-1">Gemeinkostenzuschlag (NT)</div>
                        <div className="text-gray-900">{project.overhead_nt} %</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab: Arbeitspakete - mit Shared Component */}
        {activeTab === 'arbeitspakete' && (
          <div>
            {/* NEU v7.3.87: Header mit Import-Buttons */}
            {adminUser && (
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Arbeitspakete</h2>
                <div className="flex items-center gap-3">
                  {/* Excel Import/Download Buttons */}
                  <ArbeitsplanImport
                    projectId={projectId}
                    hasTeam={teamMembers.length > 0}
                    teamCount={teamMembers.length}
                    onImportComplete={() => {
                      // Nach Import: Daten neu laden
                      loadData();
                    }}
                    portal={portal}
                  />
                  {/* Manuell AP anlegen */}
                  <button
                    onClick={openCreateWPModal}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-white rounded-lg ${buttonBg}`}
                  >
                    <Plus size={16} />
                    Neues AP
                  </button>
                </div>
              </div>
            )}

            {workPackages.length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 mb-4">Keine Arbeitspakete vorhanden</p>
                {adminUser && teamMembers.length === 0 && (
                  <p className="text-sm text-amber-600 mb-4">
                    Bitte zuerst im Tab "Team" Mitarbeiter hinzufuegen, um die Excel-Vorlage nutzen zu koennen.
                  </p>
                )}
                {adminUser && !teamMembers.length && (
                  <button
                    onClick={openCreateWPModal}
                    className={`px-4 py-2 ${buttonBg} text-white rounded-lg`}
                  >
                    Erstes AP anlegen
                  </button>
                )}
              </div>
            ) : (
              <WorkPackageTable
                projectId={projectId}
                employees={allEmployees.filter(e => projectEmployeeIds.includes(e.id))}
                workPackages={workPackages.map(wp => ({
                  id: wp.id,
                  ap_code: wp.ap_code || formatAPCode(wp.ap_number, wp.ap_sub_number),
                  ap_number: wp.ap_number,
                  ap_sub_number: wp.ap_sub_number,
                  name: wp.name,
                  description: wp.description,
                  start_date: wp.start_date,
                  end_date: wp.end_date,
                  planned_pm: wp.total_person_months,
                  is_technical: wp.is_technical ?? null,  // Explizit null wenn undefined
                }))}
                assignments={wpAssignments.map(a => ({
                  id: a.id,
                  work_package_id: a.work_package_id,
                  employee_id: a.employee_id,
                  planned_pm: a.planned_person_months || 0,
                }))}
                projectTeam={teamMembers.map(tm => ({
                  id: tm.id,
                  project_id: projectId,
                  employee_id: tm.employee_id,
                  employee_number: tm.employee_number,
                  role_in_project: tm.role_in_project,
                  hourly_rate_override: tm.hourly_rate,
                }))}
                canEdit={adminUser}
                onAssignmentChange={handleTableAssignmentChange}
                onAddAP={adminUser ? openCreateWPModal : undefined}
                onEditAP={adminUser ? (wp) => {
                  // Map zurueck zum lokalen WorkPackage Format
                  const originalWP = workPackages.find(w => w.id === wp.id);
                  if (originalWP) openEditWPModal(originalWP);
                } : undefined}
                onDeleteAP={adminUser ? (wp) => {
                  const originalWP = workPackages.find(w => w.id === wp.id);
                  if (originalWP) openDeleteConfirmation(originalWP);
                } : undefined}
                portal={portal}
                fundingFormat={project?.funding_format}
              />
            )}
          </div>
        )}

        {/* Tab: Team - NEU v7.3.87: ProjectTeamManager */}
        {activeTab === 'team' && (
          <ProjectTeamManager
            projectId={projectId}
            clientCompanyId={project?.client_company_id || company?.id || companyId || ''}
            canEdit={adminUser}
            portal={portal}
            onTeamChange={() => {
              // Team hat sich geaendert - Daten neu laden
              loadData();
            }}
          />
        )}

        {/* Modal: Team-Mitglied bearbeiten */}
        {editingMember && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  Mitarbeiter bearbeiten
                </h3>
                <button
                  onClick={closeTeamEditModal}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                  <strong>{editingMember.employee_name}</strong>
                  <div className="mt-1 grid grid-cols-2 gap-2 text-xs">
                    <span>Wochenstunden: {editingMember.weekly_hours || 40} h</span>
                    <span>Monatsstunden: {getMonthlyHours(editingMember.weekly_hours)} h</span>
                    <span>Geplante PM: {editingMember.planned_pm?.toFixed(2) || '-'}</span>
                    <span>Geplante Std: {calcPlannedHours(editingMember.planned_pm, editingMember.weekly_hours) || '-'}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rolle im Projekt
                  </label>
                  <input
                    type="text"
                    value={teamEditData.role_in_project}
                    onChange={(e) => setTeamEditData(prev => ({ ...prev, role_in_project: e.target.value }))}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 ${focusRing}`}
                    placeholder="z.B. Entwickler, Projektleiter"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stundensatz (EUR/h)
                  </label>
                  <input
                    type="number"
                    value={teamEditData.hourly_rate}
                    onChange={(e) => setTeamEditData(prev => ({ ...prev, hourly_rate: e.target.value }))}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 ${focusRing}`}
                    placeholder="z.B. 45.50"
                    step="0.01"
                    min="0"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Stundensatz lt. Antrag (wird fuer Kostenberechnung verwendet)
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_project_leader"
                    checked={teamEditData.is_project_leader}
                    onChange={(e) => setTeamEditData(prev => ({ ...prev, is_project_leader: e.target.checked }))}
                    className={`w-4 h-4 ${portal === 'firma' ? 'text-green-600' : 'text-blue-600'} border-gray-300 rounded focus:ring-${portal === 'firma' ? 'green' : 'blue'}-500`}
                  />
                  <label htmlFor="is_project_leader" className="text-sm text-gray-700">
                    Projektleiter
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
                <button
                  onClick={closeTeamEditModal}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleTeamSave}
                  disabled={savingTeam}
                  className={`flex items-center gap-2 px-4 py-2 ${buttonBg} text-white rounded-lg 
                             disabled:opacity-50 transition-colors`}
                >
                  {savingTeam ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Speichern...
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      Speichern
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Zeiterfassung */}
        {activeTab === 'zeiterfassung' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Zeiterfassung</h2>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
              <Clock className={`w-16 h-16 mx-auto mb-4 ${portal === 'firma' ? 'text-green-500' : 'text-blue-500'}`} />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Stundennachweise fuer {project?.short_name || project?.name}
              </h3>
              <p className="text-gray-600 mb-6">
                Erfassen und verwalten Sie die Projektstunden fuer alle Team-Mitglieder.
              </p>
              <button
                onClick={() => {
                  const zeiterfassungUrl = portal === 'berater'
                    ? `/v7/berater/foerderung/firma/${companyId || project?.client_company_id}/zeiterfassung?projekt=${projectId}`
                    : `/v7/firma/zeiterfassung?projekt=${projectId}`;
                  router.push(zeiterfassungUrl);
                }}
                className={`inline-flex items-center gap-2 px-6 py-3 ${buttonBg} text-white font-medium rounded-lg transition-colors`}
              >
                <Clock size={20} />
                Zeiterfassung oeffnen
              </button>
              
              {/* Team-Uebersicht */}
              {teamMembers.length > 0 && (
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Team-Mitglieder ({teamMembers.length})</h4>
                  <div className="flex flex-wrap justify-center gap-2">
                    {teamMembers.map((member) => (
                      <span
                        key={member.id}
                        className="inline-flex items-center px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full"
                      >
                        {member.employee_name}
                        {member.is_project_leader && (
                          <span className="ml-1 text-xs text-blue-600">(PL)</span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      </main>

      {/* ============================================ */}
      {/* MODALS */}
      {/* ============================================ */}

      {/* Modal: WorkPackage bearbeiten/anlegen */}
      <WorkPackageEditModal
        portal={portal}
        isOpen={showWPEditModal}
        onClose={closeWPEditModal}
        onSave={handleSaveWP}
        mode={wpEditMode}
        workPackage={editingWP}
        projects={wpProjects}
        defaultProjectId={projectId}
        getNextAPNumber={getNextAPNumber}
        saving={savingWP}
        error={wpError}
      />

      {/* Modal: WorkPackage MA zuordnen */}
      <WorkPackageAssignmentModal
        portal={portal}
        isOpen={showWPAssignModal}
        onClose={closeWPAssignModal}
        workPackage={assignmentWP}
        allEmployees={allEmployees}
        projectEmployeeIds={projectEmployeeIds}
        assignments={wpAssignments}
        onAddAssignment={handleAddWPAssignment}
        onUpdateAssignment={handleUpdateWPAssignment}
        onRemoveAssignment={handleRemoveWPAssignment}
        saving={savingAssignment}
      />

      {/* Modal: Loeschen bestaetigen */}
      {showDeleteConfirm && wpToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Arbeitspaket loeschen?
              </h3>
              <p className="text-gray-600 mb-4">
                Moechten Sie <strong>{wpToDelete.ap_code || formatAPCode(wpToDelete.ap_number, wpToDelete.ap_sub_number)}: {wpToDelete.name}</strong> wirklich loeschen?
              </p>
              <p className="text-sm text-gray-500">
                Das Arbeitspaket wird deaktiviert und kann spaeter wiederhergestellt werden.
              </p>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
              <button
                onClick={closeDeleteConfirmation}
                disabled={deleting}
                className="flex-1 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Abbrechen
              </button>
              <button
                onClick={handleDeleteWP}
                disabled={deleting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? 'Loeschen...' : 'Loeschen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Projekt bearbeiten */}
      {showProjectEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white">
              <h3 className="text-lg font-semibold text-gray-900">
                Projekt bearbeiten
              </h3>
              <button
                onClick={closeProjectEditModal}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Projektname *
                </label>
                <input
                  type="text"
                  value={projectEditData.name}
                  onChange={(e) => setProjectEditData(prev => ({ ...prev, name: e.target.value }))}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 ${focusRing}`}
                  placeholder="z.B. DigiTrans"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kurzbezeichnung
                </label>
                <input
                  type="text"
                  value={projectEditData.short_name}
                  onChange={(e) => setProjectEditData(prev => ({ ...prev, short_name: e.target.value }))}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 ${focusRing}`}
                  placeholder="z.B. DT"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Foerderprogramm
                </label>
                <select
                  value={projectEditData.funding_format}
                  onChange={(e) => setProjectEditData(prev => ({ ...prev, funding_format: e.target.value }))}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 ${focusRing}`}
                >
                  {FUNDING_FORMATS.map(f => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Foerderkennzeichen (FKZ)
                </label>
                <input
                  type="text"
                  value={projectEditData.funding_reference}
                  onChange={(e) => setProjectEditData(prev => ({ ...prev, funding_reference: e.target.value }))}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 ${focusRing}`}
                  placeholder="z.B. 16KN087502"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Startdatum
                  </label>
                  <input
                    type="date"
                    value={projectEditData.start_date}
                    onChange={(e) => setProjectEditData(prev => ({ ...prev, start_date: e.target.value }))}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 ${focusRing}`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Enddatum
                  </label>
                  <input
                    type="date"
                    value={projectEditData.end_date}
                    onChange={(e) => setProjectEditData(prev => ({ ...prev, end_date: e.target.value }))}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 ${focusRing}`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notizen
                </label>
                <textarea
                  value={projectEditData.notes}
                  onChange={(e) => setProjectEditData(prev => ({ ...prev, notes: e.target.value }))}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 ${focusRing}`}
                  rows={3}
                  placeholder="Optionale Notizen zum Projekt"
                />
              </div>

              {/* Foerderparameter - nur fuer ZIM-Projekte */}
              {(projectEditData.funding_format === 'ZIM' ||
                projectEditData.funding_format === 'ZIM_DS' ||
                projectEditData.funding_format === 'ZIM_KOOP' ||
                projectEditData.funding_format === 'ZIM_NETZWERK') && (
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="text-sm font-medium text-gray-700 mb-3">Foerderparameter (ZIM)</div>
                  <div className="grid grid-cols-2 gap-4">

                    {/* Foerdersatz - immer sichtbar */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Foerdersatz (%)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={projectEditData.foerdersatz}
                        onChange={(e) => setProjectEditData(prev => ({ ...prev, foerdersatz: e.target.value }))}
                        className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 ${focusRing}`}
                        placeholder="z.B. 45.00"
                      />
                    </div>

                    {/* ZIM_DS: GKZ T + NT getrennt mit Toggle */}
                    {projectEditData.funding_format === 'ZIM_DS' ? (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Gemeinkostenzuschlag T (%)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={projectEditData.overhead_t}
                            onChange={(e) => setProjectEditData(prev => ({
                              ...prev,
                              overhead_t: e.target.value,
                              overhead_nt: prev.overhead_gleich ? e.target.value : prev.overhead_nt
                            }))}
                            className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 ${focusRing}`}
                            placeholder="z.B. 28.42"
                          />
                        </div>
                        {!projectEditData.overhead_gleich && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Gemeinkostenzuschlag NT (%)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={projectEditData.overhead_nt}
                              onChange={(e) => setProjectEditData(prev => ({ ...prev, overhead_nt: e.target.value }))}
                              className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 ${focusRing}`}
                              placeholder="z.B. 29.88"
                            />
                          </div>
                        )}
                        <div className="flex items-center gap-2 pt-2">
                          <input
                            type="checkbox"
                            id="overhead_gleich"
                            checked={projectEditData.overhead_gleich}
                            onChange={(e) => setProjectEditData(prev => ({
                              ...prev,
                              overhead_gleich: e.target.checked,
                              overhead_nt: e.target.checked ? prev.overhead_t : prev.overhead_nt
                            }))}
                            className="w-4 h-4 rounded border-gray-300"
                          />
                          <label htmlFor="overhead_gleich" className="text-sm text-gray-700">
                            T und NT gleich
                          </label>
                        </div>
                      </>
                    ) : (
                      /* Alle anderen ZIM-Typen: nur ein GKZ */
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Gemeinkostenzuschlag (%)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={projectEditData.overhead_t}
                          onChange={(e) => setProjectEditData(prev => ({
                            ...prev,
                            overhead_t: e.target.value,
                            overhead_nt: e.target.value
                          }))}
                          className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 ${focusRing}`}
                          placeholder="z.B. 28.42"
                        />
                      </div>
                    )}

                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-between gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg sticky bottom-0">
              {/* Loeschen-Button nur fuer Berater-Portal */}
              {portal === 'berater' && (
                <button
                  onClick={() => setShowProjectDeleteConfirm(true)}
                  className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={16} />
                  Loeschen
                </button>
              )}
              {portal !== 'berater' && <div></div>}
              
              <div className="flex gap-3">
                <button
                  onClick={closeProjectEditModal}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleProjectSave}
                  disabled={savingProject || !projectEditData.name.trim()}
                  className={`flex items-center gap-2 px-4 py-2 ${buttonBg} text-white rounded-lg 
                             disabled:opacity-50 transition-colors`}
                >
                  {savingProject ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Speichern...
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      Speichern
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loeschen-Bestaetigungs-Modal */}
      {showProjectDeleteConfirm && project && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-200 bg-red-50">
              <div className="p-2 bg-red-100 rounded-full">
                <AlertCircle className="text-red-600" size={24} />
              </div>
              <h3 className="text-lg font-semibold text-red-900">
                Projekt loeschen
              </h3>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-gray-700">
                Sind Sie sicher, dass Sie das Projekt <strong>{project.name}</strong> loeschen moechten?
              </p>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
                <strong>Achtung:</strong> Folgende Daten werden unwiderruflich geloescht:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Alle Arbeitspakete ({workPackages.length})</li>
                  <li>Alle Mitarbeiter-Zuordnungen ({teamMembers.length})</li>
                  <li>Alle Zeiteintraege</li>
                </ul>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Geben Sie <strong>"{project.short_name || project.name}"</strong> ein, um zu bestaetigen:
                </label>
                <input
                  type="text"
                  value={projectDeleteConfirmText}
                  onChange={(e) => setProjectDeleteConfirmText(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="Projektname eingeben"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
              <button
                onClick={() => {
                  setShowProjectDeleteConfirm(false);
                  setProjectDeleteConfirmText('');
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={handleProjectDelete}
                disabled={deletingProject || projectDeleteConfirmText !== (project.short_name || project.name)}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg 
                           disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {deletingProject ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Loeschen...
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    Endgueltig loeschen
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <p className="text-center text-sm text-gray-500">
            PZE v7.3.86 | {company?.name}
          </p>
        </div>
      </footer>
    </div>
  );
}
