// src/app/v7/berater/foerderung/firma/[id]/zeiterfassung/page.tsx
// ============================================================================
// PZE V7 - Zeiterfassung (Berater-Portal)
// ============================================================================
// Datum: 21. Januar 2026
// Version: 7.3.58
//
// Nutzt Shared Component: TimesheetForm
// Firma-ID kommt aus URL-Parameter [id]
// URL-Parameter: ?projekt=<projectId> (optional - waehlt Projekt vor)
// ============================================================================

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
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
}

interface Employee {
  id: string;
  display_name: string;
  first_name: string | null;
  last_name: string | null;
  weekly_hours: number | null;
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
// KOMPONENTE
// ============================================================================

export default function BeraterZeiterfassung() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const companyId = params.id as string;
  const projektParam = searchParams.get('projekt');
  const supabase = createClient();

  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [company, setCompany] = useState<ClientCompany | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [workPackages, setWorkPackages] = useState<WorkPackage[]>([]);
  const [initialProjectId, setInitialProjectId] = useState<string>('');

  // ============================================================================
  // DATEN LADEN
  // ============================================================================

  useEffect(() => {
    if (companyId) loadData();
  }, [companyId]);

  const loadData = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        router.push('/login');
        return;
      }

      // Profil laden (Berater-Check)
      const { data: profile } = await supabase
        .from('v7_user_profiles')
        .select('*')
        .eq('email', user.email)
        .maybeSingle();

      if (!profile || !['system_admin', 'consultant'].includes(profile.role)) {
        setError('Keine Berater-Berechtigung.');
        setLoading(false);
        return;
      }
      setUserProfile(profile);

      // Firma laden
      const { data: companyData, error: companyError } = await supabase
        .from('v7_client_companies')
        .select('id, name, federal_state')
        .eq('id', companyId)
        .single();

      if (companyError || !companyData) {
        setError('Firma nicht gefunden.');
        setLoading(false);
        return;
      }
      setCompany(companyData);

      // Mitarbeiter der Firma laden
      const { data: employeesData } = await supabase
        .from('v7_employees')
        .select('id, display_name, first_name, last_name, weekly_hours')
        .eq('client_company_id', companyId)
        .eq('is_active', true)
        .order('display_name');

      setEmployees(employeesData || []);

      // Projekte der Firma laden
      const { data: projectsData } = await supabase
        .from('v7_projects')
        .select('id, name, short_name, funding_reference, funding_format')
        .eq('client_company_id', companyId)
        .eq('is_active', true);

      setProjects(projectsData || []);

      // Projekt aus URL-Parameter oder erstes Projekt
      if (projektParam && projectsData?.some(p => p.id === projektParam)) {
        setInitialProjectId(projektParam);
      } else if (projectsData && projectsData.length > 0) {
        setInitialProjectId(projectsData[0].id);
      }

      // Arbeitspakete laden
      if (projectsData && projectsData.length > 0) {
        const projectIds = projectsData.map(p => p.id);
        const { data: wpData } = await supabase
          .from('v7_work_packages')
          .select('id, project_id, ap_number, ap_sub_number, ap_code, name')
          .in('project_id', projectIds)
          .eq('is_active', true)
          .order('ap_number')
          .order('ap_sub_number');

        setWorkPackages(wpData || []);
      }

    } catch (err: any) {
      console.error('Fehler beim Laden:', err);
      setError('Daten konnten nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
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
            onClick={() => router.push('/v7/berater/foerderung')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Zurueck zur Uebersicht
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
            Keine Projekte fuer {company.name} vorhanden.
          </p>
          <button
            onClick={() => router.push(`/v7/berater/foerderung/firma/${companyId}?tab=projekte`)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Projekte verwalten
          </button>
        </div>
      </div>
    );
  }

  if (employees.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md text-center max-w-md">
          <p className="text-gray-600 mb-4">
            Keine Mitarbeiter fuer {company.name} vorhanden.
          </p>
          <button
            onClick={() => router.push(`/v7/berater/foerderung/firma/${companyId}?tab=mitarbeiter`)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Mitarbeiter verwalten
          </button>
        </div>
      </div>
    );
  }

  const displayName = userProfile.display_name ||
    (userProfile.first_name && userProfile.last_name
      ? `${userProfile.first_name} ${userProfile.last_name}`
      : userProfile.email?.split('@')[0] || 'Berater');

  return (
    <TimesheetForm
      portal="berater"
      companyId={company.id}
      company={company}
      employees={employees}
      projects={projects}
      workPackages={workPackages}
      currentUserId={userProfile.id}
      currentUserDisplayName={displayName}
      isAdmin={true}
      onBack={() => router.push(`/v7/berater/foerderung/firma/${companyId}`)}
      initialEmployeeId={employees[0]?.id}
      initialProjectId={initialProjectId || projects[0]?.id}
    />
  );
}
