// src/app/v7/firma/zeiterfassung/page.tsx
// ============================================================================
// PZE V7 - Zeiterfassung (Firmen-Portal)
// ============================================================================
// Datum: 21. Januar 2026
// Version: 7.3.57
//
// Nutzt Shared Component: TimesheetForm
// ============================================================================

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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

export default function FirmaZeiterfassung() {
  const router = useRouter();
  const supabase = createClient();

  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [company, setCompany] = useState<ClientCompany | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [workPackages, setWorkPackages] = useState<WorkPackage[]>([]);
  const [initialEmployeeId, setInitialEmployeeId] = useState<string>('');

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

      // Mitarbeiter laden
      const { data: employeesData } = await supabase
        .from('v7_employees')
        .select('id, display_name, first_name, last_name, weekly_hours, user_id')
        .eq('client_company_id', companyId)
        .eq('is_active', true)
        .order('display_name');

      setEmployees(employeesData || []);

      // Eigenen MA finden oder ersten waehlen
      const isAdmin = profile.role === 'client_admin';
      if (isAdmin && employeesData && employeesData.length > 0) {
        setInitialEmployeeId(employeesData[0].id);
      } else {
        const ownEmployee = employeesData?.find(e => e.user_id === user.id);
        if (ownEmployee) {
          setInitialEmployeeId(ownEmployee.id);
        } else if (employeesData && employeesData.length > 0) {
          setInitialEmployeeId(employeesData[0].id);
        }
      }

      // Projekte laden
      const { data: projectsData } = await supabase
        .from('v7_projects')
        .select('id, name, short_name, funding_reference, funding_format')
        .eq('client_company_id', companyId)
        .eq('is_active', true);

      setProjects(projectsData || []);

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
            Keine Projekte vorhanden. Bitte legen Sie zuerst ein Projekt an.
          </p>
          <button
            onClick={() => router.push('/v7/firma/projekte')}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Zu den Projekten
          </button>
        </div>
      </div>
    );
  }

  const isAdmin = userProfile.role === 'client_admin';
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
      isAdmin={isAdmin}
      onBack={() => router.push('/v7/firma')}
      initialEmployeeId={initialEmployeeId}
      initialProjectId={projects[0]?.id}
    />
  );
}
