// src/components/shared/ProjectDetailPage.tsx
// ============================================================================
// PZE V7 - Shared Project Detail Page
// ============================================================================
// Datum: 23. Maerz 2026
// Version: 7.4.4-32
//
// v7.4.4-32: ArbeitsplanImport und Kein-Team-Hinweis nur fuer adminUser sichtbar
//   - Projektleiter und Mitarbeiter sehen den Arbeitsplan nur lesend
//   - Excel-Vorlage Download/Upload ausschliesslich fuer client_admin und Berater
//
// KOMPLETTER NEUAUFBAU (Session 6) - Revision 1
// Kein Patchen - von Grund auf korrekt implementiert:
// - Profil-Query via .eq('email', user.email) - korrekte Lookup-Methode
// - wpAssignments-Query ohne !inner - verhindert silent exception
// - ArbeitsplanImport Props exakt nach Interface (hasTeam, teamCount, onImportComplete)
// - WorkPackageTable Props exakt nach Interface (assignments.planned_pm, projectTeam-Felder)
// - WPEmployee mit position_title + weekly_hours (laut WPModalEmployee-Interface)
// - onAddAssignment/onUpdateAssignment/onRemoveAssignment mit 2-Param-Signatur (laut Modal)
// - WorkPackage-Mapping fuer WPT: ap_code string (nicht nullable) + nur WPT-Felder
// - Durchgehend typsicher - kein 'as any'
//
// Gemeinsame Projekt-Detailseite fuer beide Portale:
// - Berater-Portal: /v7/berater/foerderung/firma/[firmaId]/projekt/[projektId]
// - Firmen-Portal: /v7/firma/projekte/[id]
//
// Tabs: Uebersicht | Arbeitspakete | Team | Zeiterfassung | Zahlungsanforderungen (ZIM)
// ============================================================================

'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  Receipt,
  ChevronRight,
  CheckCircle,
  FileText,
  Send,
} from 'lucide-react';

import PortalHeader from '@/components/shared/PortalHeader';
import WorkPackageTable from '@/components/shared/WorkPackageTable';
import {
  WorkPackage as WPListWorkPackage,
  sortWorkPackages,
  formatAPCode,
} from '@/components/shared/WorkPackageList';
import WorkPackageEditModal, {
  WorkPackageFormData,
  Project as WPProject,
} from '@/components/shared/WorkPackageEditModal';
import WorkPackageAssignmentModal, {
  Employee as WPModalEmployee,
  WorkPackageAssignment as WPModalAssignment,
} from '@/components/shared/WorkPackageAssignmentModal';
import ProjectTeamManager from '@/components/shared/ProjectTeamManager';
import ArbeitsplanImport from '@/components/shared/ArbeitsplanImport';

import {
  V7UserRole,
  V7EmployeePortalRole,
  V7Employee,
  V7ClientCompany,
} from '@/types/v7-types';
import { HOURS_PER_PM, PORTAL_COLORS } from '@/lib/v7-constants';

// ============================================================================
// TYPEN
// ============================================================================

export type PortalType = 'berater' | 'firma';

// WorkPackage - kompatibel mit WorkPackageTable und WorkPackageEditModal
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
  is_technical: boolean | null;
  planned_pm: number | null;
}

// Assignment - exakt wie WorkPackageTable erwartet
interface WPAssignment {
  id: string;
  work_package_id: string;
  employee_id: string;
  planned_pm: number;
}

// Employee fuer WorkPackageTable
interface WPEmployee {
  id: string;
  display_name: string;
  first_name: string | null;
  last_name: string | null;
  position_title: string | null;
  weekly_hours: number | null;
  employee_number: number | null;
}

// ProjectTeamMember - exakt wie WorkPackageTable erwartet
interface WPProjectTeamMember {
  id: string;
  project_id: string;
  employee_id: string;
  employee_number: number | null;
  role_in_project: string | null;
  hourly_rate_override: number | null;
}

// TeamMember intern (fuer Anzeige im Team-Tab und Zeiterfassungs-Tab)
interface TeamMember {
  id: string;
  employee_id: string;
  employee_name: string;
  weekly_hours: number | null;
  role_in_project: string | null;
  is_project_leader: boolean;
  planned_pm: number | null;
  hourly_rate: number | null;
  employee_number: number | null;
}

interface ProjectDetailPageProps {
  portal: PortalType;
  projectId: string;
  companyId?: string;
  backUrl?: string;
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

interface Zahlungsanforderung {
  id: string;
  project_id: string;
  za_nummer: number;
  zeitraum_von: string;
  zeitraum_bis: string;
  auftraege_dritte_t: number | null;
  auftraege_dritte_nt: number | null;
  fue_unterauftrag: number | null;
  zeitw_personalaufnahme: number | null;
  status: string;
  notizen: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// KONSTANTEN
// ============================================================================

const FUNDING_FORMATS = [
  { value: '', label: '-- Bitte waehlen --' },
  { value: 'ZIM', label: 'ZIM Einzelprojekt' },
  { value: 'ZIM_KOOP', label: 'ZIM Kooperationsprojekt' },
  { value: 'ZIM_NETZWERK', label: 'ZIM Netzwerk-Management' },
  { value: 'ZIM_DS', label: 'ZIM Durchfuehrbarkeitsstudie' },
  { value: 'BMBF', label: 'BMBF Foerderung' },
  { value: 'BMBF_DS', label: 'BMBF Durchfuehrbarkeitsstudie' },
];

const ZA_STATUS_OPTIONS = [
  { value: 'entwurf', label: 'Entwurf' },
  { value: 'eingereicht', label: 'Eingereicht' },
  { value: 'bewilligt', label: 'Bewilligt' },
];

const ZA_STATUS_STYLE: Record<string, {
  bg: string;
  text: string;
  border: string;
  icon: React.ReactNode;
}> = {
  entwurf:     { bg: 'bg-gray-100',   text: 'text-gray-700',   border: 'border-gray-300',   icon: <FileText size={14} /> },
  eingereicht: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300', icon: <Send size={14} /> },
  bewilligt:   { bg: 'bg-green-100',  text: 'text-green-800',  border: 'border-green-300',  icon: <CheckCircle size={14} /> },
};

type TabKey = 'uebersicht' | 'arbeitspakete' | 'team' | 'zeiterfassung' | 'zahlungsanforderungen';

// ============================================================================
// KOMPONENTE
// ============================================================================

export default function ProjectDetailPage({
  portal,
  projectId,
  companyId,
  backUrl,
}: ProjectDetailPageProps) {
  const router = useRouter();
  const supabase = createClient();

  const buttonBg = portal === 'firma'
    ? 'bg-green-600 hover:bg-green-700'
    : 'bg-blue-600 hover:bg-blue-700';
  const buttonBgLight = portal === 'firma'
    ? 'bg-green-100 text-green-700'
    : 'bg-blue-100 text-blue-700';
  const focusRing = portal === 'firma'
    ? 'focus:ring-green-500 focus:border-green-500'
    : 'focus:ring-blue-500 focus:border-blue-500';
  const borderActive = portal === 'firma'
    ? 'border-green-600 text-green-600'
    : 'border-blue-600 text-blue-600';
  const spinnerColor = portal === 'firma'
    ? 'border-green-200 border-t-green-600'
    : 'border-blue-200 border-t-blue-600';

  // State Basis
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [employee, setEmployee] = useState<V7Employee | null>(null);
  const [company, setCompany] = useState<V7ClientCompany | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('uebersicht');

  // State Arbeitspakete
  const [workPackages, setWorkPackages] = useState<WorkPackage[]>([]);
  const [wpAssignments, setWpAssignments] = useState<WPAssignment[]>([]);
  const [allEmployees, setAllEmployees] = useState<WPEmployee[]>([]);
  const [projectEmployeeIds, setProjectEmployeeIds] = useState<string[]>([]);

  // State fuer WorkPackageTable: projectTeam im richtigen Format
  const [wpProjectTeam, setWpProjectTeam] = useState<WPProjectTeamMember[]>([]);

  // State fuer interne Anzeige (Team-Tab, Zeiterfassungs-Tab)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  // State WorkPackage Modals
  const [showWPEditModal, setShowWPEditModal] = useState(false);
  const [wpEditMode, setWpEditMode] = useState<'create' | 'edit'>('create');
  const [editingWP, setEditingWP] = useState<WorkPackage | null>(null);
  const [wpError, setWpError] = useState<string | null>(null);
  const [savingWP, setSavingWP] = useState(false);

  const [showWPAssignModal, setShowWPAssignModal] = useState(false);
  const [assignmentWP, setAssignmentWP] = useState<WorkPackage | null>(null);
  const [savingAssignment, setSavingAssignment] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [wpToDelete, setWpToDelete] = useState<WorkPackage | null>(null);
  const [deleting, setDeleting] = useState(false);

  // State Team Edit
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [teamEditData, setTeamEditData] = useState<TeamEditData>({
    role_in_project: '',
    hourly_rate: '',
    is_project_leader: false,
  });
  const [savingTeam, setSavingTeam] = useState(false);

  // State Projekt-Bearbeitung
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

  // State Zahlungsanforderungen
  const [zaList, setZaList] = useState<Zahlungsanforderung[]>([]);
  const [zaLoading, setZaLoading] = useState(false);
  const [zaStatusUpdating, setZaStatusUpdating] = useState<string | null>(null);

  // ============================================================================
  // DATEN LADEN
  // ============================================================================

  const loadData = useCallback(async () => {
    try {
      // Auth
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user || !user.email) {
        router.push('/login');
        return;
      }

      // KORREKT: Profil-Lookup via email, nicht via id
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

      let targetCompanyId: string;

      if (portal === 'berater') {
        if (!['system_admin', 'consultant'].includes(profile.role)) {
          setError('Keine Berater-Berechtigung');
          setLoading(false);
          return;
        }
        if (!companyId) return;
        targetCompanyId = companyId;
      } else {
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

      // MA-Profil fuer Firmen-Portal
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

      // Alle aktiven MAs der Firma (fuer WorkPackageTable Spalten-Header)
      const { data: allEmpsData } = await supabase
        .from('v7_employees')
        .select('id, display_name, first_name, last_name, position_title, weekly_hours, employee_number')
        .eq('client_company_id', targetCompanyId)
        .eq('is_active', true)
        .order('display_name');

      const mappedAllEmps: WPEmployee[] = (allEmpsData || []).map(emp => ({
        id: emp.id,
        display_name: emp.display_name,
        first_name: emp.first_name || null,
        last_name: emp.last_name || null,
        position_title: emp.position_title || null,
        weekly_hours: emp.weekly_hours || null,
        employee_number: emp.employee_number || null,
      }));
      setAllEmployees(mappedAllEmps);

      // Arbeitspakete laden
      const { data: wpData } = await supabase
        .from('v7_work_packages')
        .select('*')
        .eq('project_id', projectId)
        .eq('is_active', true)
        .order('ap_number')
        .order('ap_sub_number');

      const loadedWPs: WorkPackage[] = (wpData || []).map(wp => ({
        ...wp,
        planned_pm: wp.total_person_months || null,
      }));
      setWorkPackages(loadedWPs);

      // WP-Assignments laden - OHNE !inner um silent exception zu vermeiden
      if (loadedWPs.length > 0) {
        const wpIds = loadedWPs.map(wp => wp.id);
        const { data: wpaData } = await supabase
          .from('v7_work_package_assignments')
          .select('id, work_package_id, employee_id, planned_person_months')
          .in('work_package_id', wpIds)
          .eq('is_active', true);

        // Mapping auf exaktes WPAssignment-Interface
        const mappedAssignments: WPAssignment[] = (wpaData || []).map(a => ({
          id: a.id,
          work_package_id: a.work_package_id,
          employee_id: a.employee_id,
          planned_pm: a.planned_person_months || 0,
        }));
        setWpAssignments(mappedAssignments);
      } else {
        setWpAssignments([]);
      }

      // Projekt-Assignments (Team) laden
      const { data: assignmentData } = await supabase
        .from('v7_project_assignments')
        .select(`
          id,
          employee_id,
          role_in_project,
          is_project_leader,
          hourly_rate,
          employee_number,
          v7_employees (
            id,
            display_name,
            weekly_hours
          )
        `)
        .eq('project_id', projectId)
        .eq('is_active', true);

      if (assignmentData && assignmentData.length > 0) {
        setProjectEmployeeIds(assignmentData.map(a => a.employee_id));

        // WP-PM pro Mitarbeiter aggregieren (fuer planned_pm in TeamMember)
        const wpIds = loadedWPs.map(wp => wp.id);
        const { data: wpAmtData } = wpIds.length > 0
          ? await supabase
              .from('v7_work_package_assignments')
              .select('employee_id, planned_person_months')
              .in('work_package_id', wpIds)
              .eq('is_active', true)
          : { data: [] };

        // TeamMember fuer interne Anzeige aufbauen
        const team: TeamMember[] = assignmentData.map(a => {
          const emp = a.v7_employees as unknown as { id: string; display_name: string; weekly_hours: number | null } | null;
          const maWpa = (wpAmtData || []).filter(w => w.employee_id === a.employee_id);
          const totalPM = maWpa.reduce((sum, w) => sum + (w.planned_person_months || 0), 0);
          return {
            id: a.id,
            employee_id: a.employee_id,
            employee_name: emp?.display_name || 'Unbekannt',
            weekly_hours: emp?.weekly_hours || 40,
            role_in_project: a.role_in_project || null,
            is_project_leader: a.is_project_leader || false,
            planned_pm: totalPM > 0 ? totalPM : null,
            hourly_rate: a.hourly_rate || null,
            employee_number: a.employee_number || null,
          };
        });

        // Sortierung nach employee_number, dann Name
        team.sort((a, b) => {
          if (a.employee_number !== null && b.employee_number !== null) {
            return a.employee_number - b.employee_number;
          }
          if (a.employee_number !== null) return -1;
          if (b.employee_number !== null) return 1;
          return a.employee_name.localeCompare(b.employee_name, 'de');
        });
        setTeamMembers(team);

        // WPProjectTeamMember fuer WorkPackageTable aufbauen
        // Exakt nach Interface: id, project_id, employee_id, employee_number, role_in_project, hourly_rate_override
        const wpTeam: WPProjectTeamMember[] = assignmentData.map(a => ({
          id: a.id,
          project_id: projectId,
          employee_id: a.employee_id,
          employee_number: a.employee_number || null,
          role_in_project: a.role_in_project || null,
          hourly_rate_override: a.hourly_rate || null,
        }));
        setWpProjectTeam(wpTeam);

      } else {
        setTeamMembers([]);
        setWpProjectTeam([]);
        setProjectEmployeeIds([]);
      }

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unbekannter Fehler';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [projectId, companyId, portal]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ZA-Liste laden
  const loadZaList = useCallback(async () => {
    if (!projectId) return;
    setZaLoading(true);
    try {
      const { data, error: zaError } = await supabase
        .from('v7_zahlungsanforderungen')
        .select('*')
        .eq('project_id', projectId)
        .order('za_nummer', { ascending: true });
      if (zaError) throw zaError;
      setZaList(data || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Fehler';
      console.error('Fehler beim Laden der ZA-Liste:', msg);
    } finally {
      setZaLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (activeTab === 'zahlungsanforderungen') {
      loadZaList();
    }
  }, [activeTab, loadZaList]);

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

  const getPortalRole = (): V7EmployeePortalRole | V7UserRole => {
    if (portal === 'berater') return userProfile?.role || 'consultant';
    if (userProfile?.role === 'client_admin') return 'client_admin';
    if (employee?.portal_role) return employee.portal_role;
    return 'employee';
  };

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

  const isZimProject = (): boolean => {
    return (project?.funding_format || '').startsWith('ZIM');
  };

  const formatZeitraum = (von: string, bis: string): string => {
    const vd = new Date(von);
    const bd = new Date(bis);
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mai', 'Jun',
      'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
    return `${monthNames[vd.getMonth()]} ${vd.getFullYear()} \u2013 ${monthNames[bd.getMonth()]} ${bd.getFullYear()}`;
  };

  const navigateToBerichteWithZA = (zaId?: string) => {
    const baseUrl = portal === 'berater'
      ? `/v7/berater/foerderung/firma/${companyId || project?.client_company_id}/berichte`
      : `/v7/firma/berichte`;
    let params = `panel=za&projekt=${projectId}`;
    if (zaId) params += `&za_id=${zaId}`;
    router.push(`${baseUrl}?${params}`);
  };

  // ============================================================================
  // ZA STATUS
  // ============================================================================

  const handleZAStatusChange = async (zaId: string, newStatus: string) => {
    setZaStatusUpdating(zaId);
    try {
      const { error: updateError } = await supabase
        .from('v7_zahlungsanforderungen')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', zaId);
      if (updateError) throw updateError;
      setZaList(prev => prev.map(za =>
        za.id === zaId ? { ...za, status: newStatus } : za
      ));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Fehler';
      alert('Fehler beim Speichern des Status: ' + msg);
    } finally {
      setZaStatusUpdating(null);
    }
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
        ap_sub_number: formData.ap_sub_number ? parseInt(formData.ap_sub_number) : null,
        ap_code: formData.ap_code.trim() || `AP${formData.ap_number}`,
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        total_person_months: formData.total_person_months
          ? parseFloat(formData.total_person_months)
          : null,
        is_technical: formData.is_technical ?? null,
        is_active: true,
      };

      if (wpEditMode === 'create') {
        const { error: insertError } = await supabase
          .from('v7_work_packages')
          .insert(wpData);
        if (insertError) throw insertError;
      } else if (editingWP) {
        const { error: updateError } = await supabase
          .from('v7_work_packages')
          .update({ ...wpData, updated_at: new Date().toISOString() })
          .eq('id', editingWP.id);
        if (updateError) throw updateError;
      }

      await loadData();
      closeWPEditModal();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Fehler beim Speichern';
      setWpError(msg);
    } finally {
      setSavingWP(false);
    }
  };

  const openDeleteConfirmation = (wp: WorkPackage) => {
    setWpToDelete(wp);
    setShowDeleteConfirm(true);
  };

  const closeDeleteConfirmation = () => {
    setShowDeleteConfirm(false);
    setWpToDelete(null);
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
      await loadData();
      closeDeleteConfirmation();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Fehler';
      alert('Fehler beim Loeschen: ' + msg);
    } finally {
      setDeleting(false);
    }
  };

  const openWPAssignModal = (wp: WorkPackage) => {
    setAssignmentWP(wp);
    setShowWPAssignModal(true);
  };

  const closeWPAssignModal = () => {
    setShowWPAssignModal(false);
    setAssignmentWP(null);
  };

  // ============================================================================
  // WP ASSIGNMENT (via WorkPackageAssignmentModal)
  // ============================================================================

  // Signatur: (employeeId, pm) - nutzt assignmentWP aus State fuer work_package_id
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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Fehler';
      alert('Fehler: ' + msg);
    } finally {
      setSavingAssignment(false);
    }
  };

  // Signatur: (employeeId, pm) - nutzt assignmentWP aus State
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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Fehler';
      alert('Fehler: ' + msg);
    } finally {
      setSavingAssignment(false);
    }
  };

  // Signatur: (employeeId) - nutzt assignmentWP aus State
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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Fehler';
      alert('Fehler: ' + msg);
    } finally {
      setSavingAssignment(false);
    }
  };

  // ============================================================================
  // WP ASSIGNMENT via WorkPackageTable (inline)
  // ============================================================================

  const handleTableAssignmentChange = async (
    workPackageId: string,
    employeeId: string,
    plannedPm: number | null
  ) => {
    try {
      const hours = plannedPm ? Math.round(plannedPm * HOURS_PER_PM) : 0;
      const existing = wpAssignments.find(
        a => a.work_package_id === workPackageId && a.employee_id === employeeId
      );

      if (existing) {
        if (!plannedPm || plannedPm <= 0) {
          await supabase
            .from('v7_work_package_assignments')
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq('id', existing.id);
        } else {
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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Fehler';
      alert('Fehler beim Speichern: ' + msg);
    }
  };

  // ============================================================================
  // TEAM EDIT
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
    setTeamEditData({ role_in_project: '', hourly_rate: '', is_project_leader: false });
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

      if (hourlyRate !== null) {
        const wpIds = workPackages.map(wp => wp.id);
        if (wpIds.length > 0) {
          await supabase
            .from('v7_work_package_assignments')
            .update({ hourly_rate: hourlyRate, updated_at: new Date().toISOString() })
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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Fehler';
      alert('Fehler beim Speichern: ' + msg);
    } finally {
      setSavingTeam(false);
    }
  };

  // ============================================================================
  // PROJEKT EDIT
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

  const closeProjectEditModal = () => setShowProjectEditModal(false);

  const handleProjectSave = async () => {
    if (!project) return;
    setSavingProject(true);
    try {
      const overhead_nt_val = projectEditData.overhead_gleich
        ? (projectEditData.overhead_t !== '' ? parseFloat(projectEditData.overhead_t) : null)
        : (projectEditData.overhead_nt !== '' ? parseFloat(projectEditData.overhead_nt) : null);

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
          overhead_nt: overhead_nt_val,
          overhead_gleich: projectEditData.overhead_gleich,
          updated_at: new Date().toISOString(),
        })
        .eq('id', project.id);

      if (updateError) throw updateError;
      await loadData();
      closeProjectEditModal();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Fehler';
      alert('Fehler beim Speichern: ' + msg);
    } finally {
      setSavingProject(false);
    }
  };

  const handleProjectDelete = async () => {
    if (!project) return;
    const expectedName = project.short_name || project.name;
    if (projectDeleteConfirmText !== expectedName) {
      alert(`Bitte geben Sie "${expectedName}" ein, um das Loeschen zu bestaetigen.`);
      return;
    }
    setDeletingProject(true);
    try {
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

      await supabase.from('v7_work_packages').delete().eq('project_id', project.id);
      await supabase.from('v7_project_assignments').delete().eq('project_id', project.id);
      await supabase.from('v7_timesheets').delete().eq('project_id', project.id);

      const { error: deleteError } = await supabase
        .from('v7_projects')
        .delete()
        .eq('id', project.id);
      if (deleteError) throw deleteError;

      router.push(getBackUrl());
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Fehler';
      alert('Fehler beim Loeschen: ' + msg);
    } finally {
      setDeletingProject(false);
      setShowProjectDeleteConfirm(false);
      setProjectDeleteConfirmText('');
    }
  };

  // ============================================================================
  // TABS
  // ============================================================================

  const buildTabs = (): { key: TabKey; label: string; icon: React.ReactNode }[] => {
    const baseTabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
      { key: 'uebersicht',    label: 'Uebersicht',   icon: <FolderKanban size={18} /> },
      { key: 'arbeitspakete', label: 'Arbeitspakete', icon: <Package size={18} /> },
      { key: 'team',          label: 'Team',          icon: <Users size={18} /> },
      { key: 'zeiterfassung', label: 'Zeiterfassung', icon: <Clock size={18} /> },
    ];
    if (isZimProject()) {
      baseTabs.push({ key: 'zahlungsanforderungen', label: 'Zahlungsanforderungen', icon: <Receipt size={18} /> });
    }
    return baseTabs;
  };

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
  const tabs = buildTabs();

  const wpProjects: WPProject[] = [{
    id: project.id,
    name: project.name,
    funding_reference: project.funding_reference,
    funding_format: project.funding_format,
  }];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* Header */}
      <PortalHeader
        portal={portal}
        userName={userName}
        userRole={getUserRole()}
        portalRole={portal === 'firma' ? (portalRole as V7EmployeePortalRole) : undefined}
        companyName={company?.name || 'Firma'}
        hideNavigation={true}
      />

      {/* Projekt-Titelzeile */}
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
                className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Pencil size={18} />
                <span className="hidden sm:inline text-sm">Bearbeiten</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tab-Leiste */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center space-x-1 overflow-x-auto -mb-px">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={[
                  'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2',
                  'transition-colors whitespace-nowrap',
                  activeTab === tab.key
                    ? borderActive
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300',
                ].join(' ')}
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
                {tab.key === 'zahlungsanforderungen' && zaList.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                    {zaList.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Inhalt */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">

        {/* ------------------------------------------------------------------ */}
        {/* Tab: Uebersicht                                                     */}
        {/* ------------------------------------------------------------------ */}
        {activeTab === 'uebersicht' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Projektdetails</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Projektname</label>
                    <p className="mt-1 text-gray-900">{project.name}</p>
                  </div>
                  {project.short_name && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Kurzbezeichnung</label>
                      <p className="mt-1 text-gray-900">{project.short_name}</p>
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium text-gray-500">Foerderprogramm</label>
                    <p className="mt-1">
                      <span className={`px-2 py-1 ${buttonBgLight} rounded text-sm font-medium`}>
                        {project.funding_format || '-'}
                      </span>
                    </p>
                  </div>
                  {project.funding_reference && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Foerderkennzeichen</label>
                      <p className="mt-1 text-gray-900 font-mono">{project.funding_reference}</p>
                    </div>
                  )}
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Laufzeit</label>
                    <p className="mt-1 text-gray-900">
                      {formatDate(project.start_date)} &ndash; {formatDate(project.end_date)}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Projektteam</label>
                    <p className="mt-1 text-gray-900">{teamMembers.length} Mitarbeiter</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Arbeitspakete</label>
                    <p className="mt-1 text-gray-900">
                      {workPackages.length} AP ({getTotalPM().toFixed(1)} PM gesamt)
                    </p>
                  </div>
                  {project.foerdersatz && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Foerderparameter</label>
                      <p className="mt-1 text-gray-900">
                        Foerdersatz: {project.foerdersatz}%
                        {project.overhead_t && ` | GKZ: ${project.overhead_t}%`}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              {project.notes && (
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <label className="text-sm font-medium text-gray-500">Notizen</label>
                  <p className="mt-1 text-gray-700 text-sm whitespace-pre-wrap">{project.notes}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* Tab: Arbeitspakete                                                  */}
        {/* ------------------------------------------------------------------ */}
        {activeTab === 'arbeitspakete' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Arbeitspakete ({workPackages.length})
              </h2>
              {adminUser && (
                <button
                  onClick={openCreateWPModal}
                  className={`flex items-center gap-2 px-4 py-2 ${buttonBg} text-white rounded-lg transition-colors text-sm`}
                >
                  <Plus size={16} />
                  Neues AP
                </button>
              )}
            </div>

            {adminUser && teamMembers.length === 0 && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
                <AlertCircle size={16} className="text-yellow-600 mt-0.5 shrink-0" />
                <p className="text-sm text-yellow-800">
                  Bitte zuerst im Tab &quot;Team&quot; Mitarbeiter hinzufuegen,
                  um die Excel-Vorlage nutzen zu koennen.
                </p>
              </div>
            )}

            {/* ArbeitsplanImport - nur fuer Admin sichtbar */}
            {adminUser && (
              <ArbeitsplanImport
                projectId={projectId}
                hasTeam={teamMembers.length > 0}
                teamCount={teamMembers.length}
                onImportComplete={loadData}
                portal={portal}
              />
            )}

            {/* WorkPackageTable - Props auf WPT-eigenes Interface gemappt */}
            <WorkPackageTable
              portal={portal}
              projectId={projectId}
              workPackages={workPackages.map(wp => ({
                id: wp.id,
                ap_code: wp.ap_code ?? `AP${wp.ap_number}`,
                ap_number: wp.ap_number,
                ap_sub_number: wp.ap_sub_number,
                name: wp.name,
                description: wp.description,
                start_date: wp.start_date,
                end_date: wp.end_date,
                planned_pm: wp.planned_pm,
                is_technical: wp.is_technical,
              }))}
              employees={allEmployees}
              assignments={wpAssignments}
              projectTeam={wpProjectTeam}
              canEdit={adminUser}
              onAssignmentChange={handleTableAssignmentChange}
              onEditAP={adminUser ? (wp) => {
                const full = workPackages.find(w => w.id === wp.id);
                if (full) openEditWPModal(full);
              } : undefined}
              onDeleteAP={adminUser ? (wp) => {
                const full = workPackages.find(w => w.id === wp.id);
                if (full) openDeleteConfirmation(full);
              } : undefined}
              fundingFormat={project.funding_format}
            />
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* Tab: Team                                                           */}
        {/* ------------------------------------------------------------------ */}
        {activeTab === 'team' && (
          <div>
            <ProjectTeamManager
              portal={portal}
              projectId={projectId}
              clientCompanyId={companyId || project.client_company_id}
              onTeamChange={loadData}
              canEdit={adminUser}
            />
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* Tab: Zeiterfassung                                                  */}
        {/* ------------------------------------------------------------------ */}
        {activeTab === 'zeiterfassung' && (
          <div>
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
              <Clock className={`w-16 h-16 mx-auto mb-4 ${portal === 'firma' ? 'text-green-500' : 'text-blue-500'}`} />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Stundennachweise fuer {project.short_name || project.name}
              </h3>
              <p className="text-gray-600 mb-6">
                Erfassen und verwalten Sie die Projektstunden fuer alle Team-Mitglieder.
              </p>
              <button
                onClick={() => {
                  const url = portal === 'berater'
                    ? `/v7/berater/foerderung/firma/${companyId || project.client_company_id}/zeiterfassung?projekt=${projectId}`
                    : `/v7/firma/zeiterfassung?projekt=${projectId}`;
                  router.push(url);
                }}
                className={`inline-flex items-center gap-2 px-6 py-3 ${buttonBg} text-white font-medium rounded-lg transition-colors`}
              >
                <Clock size={20} />
                Zeiterfassung oeffnen
              </button>

              {teamMembers.length > 0 && (
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">
                    Team-Mitglieder ({teamMembers.length})
                  </h4>
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

        {/* ------------------------------------------------------------------ */}
        {/* Tab: Zahlungsanforderungen (nur ZIM-Projekte)                       */}
        {/* ------------------------------------------------------------------ */}
        {activeTab === 'zahlungsanforderungen' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Zahlungsanforderungen</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  Datengrundlage fuer ZIM-Mittelabruf | Projekt: {project.short_name || project.name}
                </p>
              </div>
              <button
                onClick={() => navigateToBerichteWithZA()}
                className={`flex items-center gap-2 px-4 py-2 ${buttonBg} text-white rounded-lg transition-colors text-sm`}
              >
                <Plus size={16} />
                Neue ZA erstellen
              </button>
            </div>

            {zaLoading && (
              <div className="flex items-center justify-center py-16">
                <div className={`w-8 h-8 border-4 ${spinnerColor} rounded-full animate-spin`}></div>
              </div>
            )}

            {!zaLoading && zaList.length === 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                <Receipt className={`w-16 h-16 mx-auto mb-4 ${portal === 'firma' ? 'text-green-300' : 'text-blue-300'}`} />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Noch keine Zahlungsanforderungen
                </h3>
                <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                  Erstellen Sie die erste ZA fuer dieses Projekt. Die Daten dienen als
                  Grundlage fuer den manuellen Uebertrag in das offizielle ZIM-Formular.
                </p>
                <button
                  onClick={() => navigateToBerichteWithZA()}
                  className={`inline-flex items-center gap-2 px-6 py-3 ${buttonBg} text-white font-medium rounded-lg transition-colors`}
                >
                  <Plus size={20} />
                  Erste ZA erstellen
                </button>
              </div>
            )}

            {!zaLoading && zaList.length > 0 && (
              <div className="space-y-3">
                {zaList.map((za) => {
                  const statusStyle = ZA_STATUS_STYLE[za.status] || ZA_STATUS_STYLE['entwurf'];
                  const isUpdating = zaStatusUpdating === za.id;
                  return (
                    <div
                      key={za.id}
                      className="bg-white rounded-lg border border-gray-200 p-4 hover:border-gray-300 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-4">

                        {/* ZA-Nummer + Zeitraum */}
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div className={[
                            'shrink-0 w-12 h-12 rounded-lg flex flex-col items-center justify-center',
                            portal === 'firma'
                              ? 'bg-green-50 border border-green-200'
                              : 'bg-blue-50 border border-blue-200',
                          ].join(' ')}>
                            <span className={`text-xs font-medium ${portal === 'firma' ? 'text-green-600' : 'text-blue-600'}`}>
                              ZA
                            </span>
                            <span className={`text-lg font-bold leading-none ${portal === 'firma' ? 'text-green-700' : 'text-blue-700'}`}>
                              {za.za_nummer}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-gray-900 text-sm">
                              {formatZeitraum(za.zeitraum_von, za.zeitraum_bis)}
                            </div>
                            <div className="text-xs text-gray-400 mt-0.5">
                              {new Date(za.zeitraum_von).toLocaleDateString('de-DE')}
                              {' '}&ndash;{' '}
                              {new Date(za.zeitraum_bis).toLocaleDateString('de-DE')}
                            </div>
                            {za.notizen && (
                              <div className="text-xs text-gray-500 mt-1 truncate max-w-xs">
                                {za.notizen}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Status-Dropdown */}
                        <div className="shrink-0">
                          <div className="relative">
                            <select
                              value={za.status}
                              onChange={(e) => handleZAStatusChange(za.id, e.target.value)}
                              disabled={isUpdating}
                              className={[
                                'appearance-none pl-8 pr-6 py-1.5 text-sm font-medium rounded-lg border',
                                'cursor-pointer transition-colors disabled:opacity-60',
                                'focus:outline-none focus:ring-2',
                                statusStyle.bg,
                                statusStyle.text,
                                statusStyle.border,
                                portal === 'firma' ? 'focus:ring-green-500' : 'focus:ring-blue-500',
                              ].join(' ')}
                            >
                              {ZA_STATUS_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                            <div className={`absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none ${statusStyle.text}`}>
                              {isUpdating
                                ? <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                : statusStyle.icon
                              }
                            </div>
                          </div>
                        </div>

                        {/* ZA oeffnen */}
                        <div className="shrink-0">
                          <button
                            onClick={() => navigateToBerichteWithZA(za.id)}
                            className={[
                              'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-colors',
                              portal === 'firma'
                                ? 'text-green-700 border-green-300 hover:bg-green-50'
                                : 'text-blue-700 border-blue-300 hover:bg-blue-50',
                            ].join(' ')}
                          >
                            <FileText size={15} />
                            <span>ZA oeffnen</span>
                            <ChevronRight size={14} />
                          </button>
                        </div>

                      </div>
                    </div>
                  );
                })}

                {/* Zusammenfassung */}
                <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between text-sm text-gray-500">
                  <span>
                    {zaList.length} Zahlungsanforderung{zaList.length !== 1 ? 'en' : ''} gesamt
                    {zaList.filter(z => z.status === 'bewilligt').length > 0 && (
                      <span className="ml-2 text-green-600 font-medium">
                        | {zaList.filter(z => z.status === 'bewilligt').length} bewilligt
                      </span>
                    )}
                    {zaList.filter(z => z.status === 'eingereicht').length > 0 && (
                      <span className="ml-2 text-yellow-600 font-medium">
                        | {zaList.filter(z => z.status === 'eingereicht').length} eingereicht
                      </span>
                    )}
                  </span>
                  <button
                    onClick={() => navigateToBerichteWithZA()}
                    className={`flex items-center gap-1 text-sm font-medium ${portal === 'firma' ? 'text-green-600 hover:text-green-800' : 'text-blue-600 hover:text-blue-800'}`}
                  >
                    <Plus size={14} />
                    Neue ZA
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

      </main>

      {/* ================================================================== */}
      {/* MODALS                                                               */}
      {/* ================================================================== */}

      {/* Modal: WorkPackage anlegen / bearbeiten */}
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

      {/* Modal: MA einem AP zuordnen */}
      <WorkPackageAssignmentModal
        portal={portal}
        isOpen={showWPAssignModal}
        onClose={closeWPAssignModal}
        workPackage={assignmentWP}
        allEmployees={allEmployees as WPModalEmployee[]}
        projectEmployeeIds={projectEmployeeIds}
        assignments={wpAssignments as unknown as WPModalAssignment[]}
        onAddAssignment={handleAddWPAssignment}
        onUpdateAssignment={handleUpdateWPAssignment}
        onRemoveAssignment={handleRemoveWPAssignment}
        saving={savingAssignment}
      />

      {/* Modal: AP loeschen bestaetigen */}
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
                Moechten Sie{' '}
                <strong>
                  {wpToDelete.ap_code || formatAPCode(wpToDelete.ap_number, wpToDelete.ap_sub_number)}: {wpToDelete.name}
                </strong>{' '}
                wirklich loeschen?
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

      {/* Modal: Team-Mitglied bearbeiten */}
      {editingMember && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingMember.employee_name}
              </h3>
              <button onClick={closeTeamEditModal} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rolle im Projekt
                </label>
                <input
                  type="text"
                  value={teamEditData.role_in_project}
                  onChange={(e) => setTeamEditData(prev => ({ ...prev, role_in_project: e.target.value }))}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 ${focusRing}`}
                  placeholder="z.B. Teilprojektleiter"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stundensatz (EUR/h)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={teamEditData.hourly_rate}
                  onChange={(e) => setTeamEditData(prev => ({ ...prev, hourly_rate: e.target.value }))}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 ${focusRing}`}
                  placeholder="z.B. 25.00"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_project_leader"
                  checked={teamEditData.is_project_leader}
                  onChange={(e) => setTeamEditData(prev => ({ ...prev, is_project_leader: e.target.checked }))}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <label htmlFor="is_project_leader" className="text-sm text-gray-700">
                  Projektleiter
                </label>
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
              <button
                onClick={closeTeamEditModal}
                className="flex-1 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Abbrechen
              </button>
              <button
                onClick={handleTeamSave}
                disabled={savingTeam}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 ${buttonBg} text-white rounded-lg disabled:opacity-50`}
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

      {/* Modal: Projekt bearbeiten */}
      {showProjectEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white">
              <h3 className="text-lg font-semibold text-gray-900">Projekt bearbeiten</h3>
              <button onClick={closeProjectEditModal} className="text-gray-400 hover:text-gray-600">
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
                  Foerderkennzeichen
                </label>
                <input
                  type="text"
                  value={projectEditData.funding_reference}
                  onChange={(e) => setProjectEditData(prev => ({ ...prev, funding_reference: e.target.value }))}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 ${focusRing}`}
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
                        overhead_nt: prev.overhead_gleich ? e.target.value : prev.overhead_nt,
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
                        overhead_nt: e.target.checked ? prev.overhead_t : prev.overhead_nt,
                      }))}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    <label htmlFor="overhead_gleich" className="text-sm text-gray-700">
                      T und NT gleich
                    </label>
                  </div>
                </>
              ) : (
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
                      overhead_nt: e.target.value,
                    }))}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 ${focusRing}`}
                    placeholder="z.B. 28.42"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notizen
                </label>
                <textarea
                  rows={3}
                  value={projectEditData.notes}
                  onChange={(e) => setProjectEditData(prev => ({ ...prev, notes: e.target.value }))}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 ${focusRing}`}
                />
              </div>
            </div>

            <div className="flex justify-between gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg sticky bottom-0">
              {portal === 'berater' ? (
                <button
                  onClick={() => setShowProjectDeleteConfirm(true)}
                  className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={16} />
                  Loeschen
                </button>
              ) : (
                <div></div>
              )}
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
                  className={`flex items-center gap-2 px-4 py-2 ${buttonBg} text-white rounded-lg disabled:opacity-50 transition-colors`}
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

      {/* Modal: Projekt loeschen bestaetigen */}
      {showProjectDeleteConfirm && project && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-200 bg-red-50">
              <div className="p-2 bg-red-100 rounded-full">
                <AlertCircle className="text-red-600" size={24} />
              </div>
              <h3 className="text-lg font-semibold text-red-900">Projekt loeschen</h3>
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
                  Geben Sie <strong>&quot;{project.short_name || project.name}&quot;</strong> ein, um zu bestaetigen:
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
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
            PZE v7.4.4 | {company?.name}
          </p>
        </div>
      </footer>

    </div>
  );
}
