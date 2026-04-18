// src/app/v7/firma/zeiterfassung/page.tsx
// ============================================================================
// PZE V7 - Zeiterfassung (Firmen-Portal) - Rollenbasiert
// ============================================================================
// Datum: 21. Januar 2026
// Version: 7.3.59
//
// Rollenbasierte Ansicht:
// - client_admin: Kann alle MA auswaehlen, alle Projekte
// - project_leader: Kann MA seiner Projekte auswaehlen
// - employee: Sieht nur eigene Zeiterfassung, nur zugeordnete Projekte
//
// URL-Parameter: ?projekt=<projectId> (optional - waehlt Projekt vor)
// ============================================================================

'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

import TimesheetForm from '@/components/shared/TimesheetForm';

// ============================================================================
// TYPEN
// ============================================================================

interface UserProfile {
  id: string;
  email: string;
  role: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  client_company_id: string | null;
}

interface Employee {
  id: string;
  display_name: string;
  first_name: string | null;
  last_name: string | null;
  weekly_hours: number | null;
  user_id: string | null;
  portal_role: string | null;
}

interface Project {
  id: string;
  name: string;
  short_name: string | null;
  funding_reference: string | null;
  funding_format: string | null;
}

interface WorkPackage {
  id: string;
  project_id: string;
  ap_number: number;
  ap_sub_number: number | null;
  ap_code: string | null;
  name: string;
}

interface ClientCompany {
  id: string;
  name: string;
  federal_state: string | null;
}

// ============================================================================
// INNER COMPONENT (mit useSearchParams)
// ============================================================================

function ZeiterfassungInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projektParam = searchParams.get('projekt');
  const supabase = createClient();

  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [company, setCompany] = useState<ClientCompany | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [workPackages, setWorkPackages] = useState<WorkPackage[]>([]);
  const [initialEmployeeId, setInitialEmployeeId] = useState<string>('');
  const [initialProjectId, setInitialProjectId] = useState<string>('');
  const [portalRole, setPortalRole] = useState<string>('employee');

  // ============================================================================
  // DATEN LADEN
  // ============================================================================

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
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

      // Firma laden
      const { data: companyData } = await supabase
        .from('v7_client_companies')
        .select('id, name, federal_state')
        .eq('id', companyId)
        .single();

      if (!companyData) {
        setError('Firma nicht gefunden.');
        setLoading(false);
        return;
      }
      setCompany(companyData);

      // Eigenen Mitarbeiter-Datensatz laden
      const { data: employeeData } = await supabase
        .from('v7_employees')
        .select('*')
        .eq('client_company_id', companyId)
        .eq('email', user.email)
        .maybeSingle();

      setCurrentEmployee(employeeData);

      // Portal-Rolle bestimmen
      const role = profile.role === 'client_admin' 
        ? 'client_admin' 
        : (employeeData?.portal_role || 'employee');
      setPortalRole(role);

      // ========================================
      // ROLLENBASIERTE DATEN LADEN
      // ========================================

      if (role === 'client_admin') {
        // ADMIN: Alle MA und alle Projekte
        await loadAdminData(companyId, user.id);

      } else if (role === 'project_leader' && employeeData) {
        // PROJEKTLEITER: MA seiner Projekte, zugeordnete Projekte
        await loadProjectLeaderData(companyId, employeeData.id, user.id);

      } else if (employeeData) {
        // MITARBEITER: Nur eigene Daten, zugeordnete Projekte
        await loadEmployeeData(companyId, employeeData.id);

      } else {
        setError('Kein Mitarbeiter-Profil gefunden.');
      }

    } catch (err: any) {
      console.error('Fehler beim Laden:', err);
      setError('Daten konnten nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  };

  // Admin: Alle MA, alle Projekte
  const loadAdminData = async (companyId: string, userId: string) => {
    // Alle Mitarbeiter laden
    const { data: employeesData } = await supabase
      .from('v7_employees')
      .select('id, display_name, first_name, last_name, weekly_hours, user_id, portal_role')
      .eq('client_company_id', companyId)
      .eq('is_active', true)
      .order('display_name');

    setEmployees(employeesData || []);

    // Ersten MA oder eigenen auswaehlen
    const ownEmployee = employeesData?.find(e => e.user_id === userId);
    if (ownEmployee) {
      setInitialEmployeeId(ownEmployee.id);
    } else if (employeesData && employeesData.length > 0) {
      setInitialEmployeeId(employeesData[0].id);
    }

    // Alle Projekte laden
    const { data: projectsData } = await supabase
      .from('v7_projects')
      .select('id, name, short_name, funding_reference, funding_format')
      .eq('client_company_id', companyId)
      .eq('is_active', true);

    setProjects(projectsData || []);
    selectInitialProject(projectsData || []);

    // Arbeitspakete laden
    await loadWorkPackages(projectsData || []);
  };

  // Projektleiter: MA seiner Projekte, zugeordnete Projekte
  const loadProjectLeaderData = async (companyId: string, employeeId: string, userId: string) => {
    // Projekte laden, denen der Projektleiter zugeordnet ist
    const { data: assignmentsData } = await supabase
      .from('v7_project_assignments')
      .select(`
        project_id,
        is_project_leader,
        v7_projects (id, name, short_name, funding_reference, funding_format)
      `)
      .eq('employee_id', employeeId)
      .eq('is_active', true);

    const projectsList: Project[] = [];
    const projectIds: string[] = [];

    assignmentsData?.forEach(a => {
      if (a.v7_projects) {
        projectsList.push(a.v7_projects as Project);
        projectIds.push(a.project_id);
      }
    });

    setProjects(projectsList);
    selectInitialProject(projectsList);

    // MA dieser Projekte laden (inkl. sich selbst)
    if (projectIds.length > 0) {
      const { data: projectAssignments } = await supabase
        .from('v7_project_assignments')
        .select('employee_id')
        .in('project_id', projectIds)
        .eq('is_active', true);

      const employeeIds = [...new Set(projectAssignments?.map(a => a.employee_id) || [])];

      if (employeeIds.length > 0) {
        const { data: employeesData } = await supabase
          .from('v7_employees')
          .select('id, display_name, first_name, last_name, weekly_hours, user_id, portal_role')
          .in('id', employeeIds)
          .eq('is_active', true)
          .order('display_name');

        setEmployees(employeesData || []);

        // Eigenen MA auswaehlen
        const ownEmployee = employeesData?.find(e => e.id === employeeId);
        if (ownEmployee) {
          setInitialEmployeeId(ownEmployee.id);
        } else if (employeesData && employeesData.length > 0) {
          setInitialEmployeeId(employeesData[0].id);
        }
      }
    }

    // Arbeitspakete laden
    await loadWorkPackages(projectsList);
  };

  // Mitarbeiter: Nur eigene Daten
  const loadEmployeeData = async (companyId: string, employeeId: string) => {
    // Nur eigenen MA in Liste
    const { data: employeeData } = await supabase
      .from('v7_employees')
      .select('id, display_name, first_name, last_name, weekly_hours, user_id, portal_role')
      .eq('id', employeeId)
      .single();

    if (employeeData) {
      setEmployees([employeeData]);
      setInitialEmployeeId(employeeData.id);
    }

    // Nur zugeordnete Projekte laden
    const { data: assignmentsData } = await supabase
      .from('v7_project_assignments')
      .select(`
        project_id,
        v7_projects (id, name, short_name, funding_reference, funding_format)
      `)
      .eq('employee_id', employeeId)
      .eq('is_active', true);

    const projectsList: Project[] = [];
    assignmentsData?.forEach(a => {
      if (a.v7_projects) {
        projectsList.push(a.v7_projects as Project);
      }
    });

    setProjects(projectsList);
    selectInitialProject(projectsList);

    // Arbeitspakete laden
    await loadWorkPackages(projectsList);
  };

  // Hilfsfunktion: Initiales Projekt auswaehlen
  const selectInitialProject = (projectsList: Project[]) => {
    if (projektParam && projectsList.some(p => p.id === projektParam)) {
      setInitialProjectId(projektParam);
    } else if (projectsList.length > 0) {
      setInitialProjectId(projectsList[0].id);
    }
  };

  // Hilfsfunktion: Arbeitspakete laden
  const loadWorkPackages = async (projectsList: Project[]) => {
    if (projectsList.length > 0) {
      const projectIds = projectsList.map(p => p.id);
      const { data: wpData } = await supabase
        .from('v7_work_packages')
        .select('id, project_id, ap_number, ap_sub_number, ap_code, name')
        .in('project_id', projectIds)
        .eq('is_active', true)
        .order('ap_number')
        .order('ap_sub_number');

      setWorkPackages(wpData || []);
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Lade Zeiterfassung...</p>
        </div>
      </div>
    );
  }

  if (error || !company || !userProfile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <p className="text-red-600 mb-4">{error || 'Fehler beim Laden'}</p>
          <button
            onClick={() => router.push('/v7/firma')}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Zurueck zum Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md text-center max-w-md">
          <p className="text-gray-600 mb-4">
            {portalRole === 'employee' 
              ? 'Sie sind keinem Projekt zugeordnet. Bitte wenden Sie sich an Ihren Administrator.'
              : 'Keine Projekte vorhanden. Bitte legen Sie zuerst ein Projekt an.'}
          </p>
          <button
            onClick={() => router.push('/v7/firma')}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Zurueck zum Dashboard
          </button>
        </div>
      </div>
    );
  }

  const isAdmin = portalRole === 'client_admin';
  const displayName = userProfile.display_name ||
    (userProfile.first_name && userProfile.last_name
      ? `${userProfile.first_name} ${userProfile.last_name}`
      : userProfile.email?.split('@')[0] || 'Benutzer');

  return (
    <TimesheetForm
      portal="firma"
      companyId={company.id}
      company={company}
      employees={employees}
      projects={projects}
      workPackages={workPackages}
      currentUserId={userProfile.id}
      currentUserDisplayName={displayName}
      isAdmin={isAdmin || portalRole === 'project_leader'}
      onBack={() => router.push('/v7/firma')}
      initialEmployeeId={initialEmployeeId}
      initialProjectId={initialProjectId || projects[0]?.id}
    />
  );
}

// ============================================================================
// EXPORT MIT SUSPENSE BOUNDARY
// ============================================================================

export default function FirmaZeiterfassung() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Lade Zeiterfassung...</p>
        </div>
      </div>
    }>
      <ZeiterfassungInner />
    </Suspense>
  );
}
