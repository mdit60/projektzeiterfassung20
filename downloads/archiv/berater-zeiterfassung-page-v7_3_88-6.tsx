// src/app/v7/berater/foerderung/firma/[id]/zeiterfassung/page.tsx
// ============================================================================
// PZE V7 - Zeiterfassung (Berater-Portal)
// ============================================================================
// Version: 7.3.88-6
// Datum: 05. Februar 2026
//
// v7.3.88-6: FIX is_technical in WorkPackage-Query hinzugefuegt
//            T-Spalte zeigt jetzt korrekt X fuer technische APs
// v7.3.59:   Basis-Version mit Shared Component
//
// Nutzt Shared Component: TimesheetForm
// Firma-ID kommt aus URL-Parameter [id]
// URL-Parameter: ?projekt=<projectId> (optional - waehlt Projekt vor)
//                ?employee=<employeeId> (optional - waehlt MA vor)
//                ?year=<year> (optional)
//                ?month=<month> (optional)
// ============================================================================

'use client';

import React, { useState, useEffect, Suspense } from 'react';
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
  is_technical: boolean | null;  // FIX: Hinzugefuegt fuer T-Spalte
}

interface ClientCompany {
  id: string;
  name: string;
  federal_state: string | null;
}

// ============================================================================
// INNER COMPONENT (mit useSearchParams)
// ============================================================================

function BeraterZeiterfassungInner() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const companyId = params.id as string;
  
  // URL-Parameter auslesen
  const projektParam = searchParams.get('projekt');
  const employeeParam = searchParams.get('employee');
  const yearParam = searchParams.get('year');
  const monthParam = searchParams.get('month');
  
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

      // Arbeitspakete laden - MIT is_technical!
      if (projectsData && projectsData.length > 0) {
        const projectIds = projectsData.map(p => p.id);
        const { data: wpData } = await supabase
          .from('v7_work_packages')
          .select('id, project_id, ap_number, ap_sub_number, ap_code, name, is_technical')  // FIX: is_technical hinzugefuegt
          .in('project_id', projectIds)
          .eq('is_active', true)
          .order('ap_number')
          .order('ap_sub_number');

        setWorkPackages(wpData || []);
        
        // Debug-Log
        console.log('[Berater-Zeiterfassung] Arbeitspakete geladen:', wpData?.length);
        console.log('[Berater-Zeiterfassung] Technische APs:', wpData?.filter(wp => wp.is_technical === true).length);
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600 mx-auto"></div>
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
            className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700"
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
            className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700"
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
            className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700"
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

  // Initiale Werte aus URL-Parametern
  const initialEmployeeId = employeeParam || employees[0]?.id;
  const initialYear = yearParam ? parseInt(yearParam, 10) : undefined;
  const initialMonth = monthParam ? parseInt(monthParam, 10) : undefined;

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
      initialEmployeeId={initialEmployeeId}
      initialProjectId={initialProjectId || projects[0]?.id}
      initialYear={initialYear}
      initialMonth={initialMonth}
    />
  );
}

// ============================================================================
// EXPORT MIT SUSPENSE BOUNDARY
// ============================================================================

export default function BeraterZeiterfassung() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Lade Zeiterfassung...</p>
        </div>
      </div>
    }>
      <BeraterZeiterfassungInner />
    </Suspense>
  );
}
