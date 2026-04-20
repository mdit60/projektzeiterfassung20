// src/app/v7/berater/foerderung/firma/[id]/zeiterfassung/page.tsx
// ============================================================================
// PZE V7 - Zeiterfassung (Berater-Portal - Firmenansicht)
// ============================================================================
// Version: 7.4.6-1
// Datum: 20. April 2026
//
// v7.4.6-1: Company-Query um holiday_region erweitert (wird an TimesheetForm
//           durchgereicht fuer kommunale Feiertags-Sonderfaelle)
// v7.4.0-5: Employee-Query um employment_start, employment_end erweitert
//           Project-Query um start_date, end_date erweitert
//           (benoeigt fuer TimesheetForm v7.4.3-19 Monats-Einschraenkung)
// v7.4.0-4: (vorherige Version)
// v7.4.0-4: handleBack Default -> Firma-Detail statt Dashboard
//           returnUrl-Parameter weiterhin vorrangig
// v7.4.0-3: (vorherige Version)
// v7.4.0-2: FIX handleBack Default -> Dashboard (statt Firmendaten-Tab)
//           FIX companyName=PZE -> company.name (Header zeigt jetzt Firmenname)
// v7.4.0-1: returnUrl-Parameter: Zurueck-Button kehrt zur Ausgangsseite zurueck
//           Liest ?employee=, ?year=, ?month=, ?returnUrl= aus URL
//           Default-Zurueck: Dashboard
// v7.3.88-6: Erste Version - Berater sieht ZE der ausgewaehlten Kundenfirma
//
// Route: /v7/berater/foerderung/firma/[id]/zeiterfassung
// Unterschied zu Firmen-Portal:
//   - Blauer Header (Berater-Portal)
//   - companyId aus URL-Params (nicht aus User-Profil)
//   - Berater kann alle MA der Firma sehen und bearbeiten (isAdmin=true)
//   - returnUrl steuert wohin der Zurueck-Button zeigt
// ============================================================================

'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import PortalHeader from '@/components/shared/PortalHeader';
import PortalNav from '@/components/shared/PortalNav';
import TimesheetForm from '@/components/shared/TimesheetForm';
import { AlertCircle } from 'lucide-react';

// ============================================================================
// TYPEN
// ============================================================================

interface UserProfile {
  id: string;
  email: string;
  display_name: string | null;
  role: string;
}

interface ClientCompany {
  id: string;
  name: string;
  federal_state: string | null;
  holiday_region: string | null;  // v7.4.6
  standard_weekly_hours: number | null;
}

interface Employee {
  id: string;
  display_name: string;
  first_name: string | null;
  last_name: string | null;
  weekly_hours: number | null;
  employment_start: string | null;
  employment_end: string | null;
}

interface Project {
  id: string;
  name: string;
  short_name: string | null;
  funding_reference: string | null;
  funding_format: string | null;
  start_date: string | null;
  end_date: string | null;
}

interface WorkPackage {
  id: string;
  project_id: string;
  ap_number: number;
  ap_sub_number?: number;
  ap_code: string | null;
  name: string;
  is_technical?: boolean | null;
}

// ============================================================================
// INNERE KOMPONENTE (mit useSearchParams)
// ============================================================================

function BeraterZeiterfassungContent() {
  const router     = useRouter();
  const params     = useParams();
  const searchParams = useSearchParams();
  const supabase   = createClient();

  // companyId aus URL-Segment /berater/foerderung/firma/[id]/zeiterfassung
  const companyId = params.id as string;

  // URL-Parameter auslesen
  const urlEmployeeId = searchParams.get('employee');
  const urlYear       = searchParams.get('year');
  const urlMonth      = searchParams.get('month');
  const urlReturnUrl  = searchParams.get('returnUrl');

  // State
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState<string | null>(null);
  const [userProfile,  setUserProfile]  = useState<UserProfile | null>(null);
  const [company,      setCompany]      = useState<ClientCompany | null>(null);
  const [employees,    setEmployees]    = useState<Employee[]>([]);
  const [projects,     setProjects]     = useState<Project[]>([]);
  const [workPackages, setWorkPackages] = useState<WorkPackage[]>([]);

  // ============================================================================
  // DATEN LADEN
  // ============================================================================

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        // 1. User & Profil pruefen (muss Berater sein)
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/v7/login');
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from('v7_user_profiles')
          .select('id, email, display_name, role')
          .eq('email', user.email)
          .maybeSingle();

        if (profileError || !profile) {
          setError('Kein Benutzerprofil gefunden');
          return;
        }

        // Nur Berater duerfen diese Seite sehen
        if (!['consultant', 'system_admin'].includes(profile.role)) {
          router.push('/v7/firma/dashboard');
          return;
        }

        setUserProfile(profile);

        // 2. Kundenfirma laden
        const { data: companyData, error: companyError } = await supabase
          .from('v7_client_companies')
          .select('id, name, federal_state, holiday_region, standard_weekly_hours')
          .eq('id', companyId)
          .single();

        if (companyError || !companyData) {
          setError('Firma nicht gefunden');
          return;
        }
        setCompany(companyData);

        // 3. Mitarbeiter dieser Firma laden
        const { data: empls, error: emplError } = await supabase
          .from('v7_employees')
          .select('id, display_name, first_name, last_name, weekly_hours, employment_start, employment_end')
          .eq('client_company_id', companyId)
          .eq('is_active', true)
          .order('display_name');

        if (emplError) throw emplError;
        setEmployees(empls || []);

        // 4. Projekte dieser Firma laden
        const { data: projs, error: projError } = await supabase
          .from('v7_projects')
          .select('id, name, short_name, funding_reference, funding_format, start_date, end_date')
          .eq('client_company_id', companyId)
          .eq('is_active', true)
          .order('name');

        if (projError) throw projError;
        setProjects(projs || []);

        // 5. Arbeitspakete laden
        if (projs && projs.length > 0) {
          const projectIds = projs.map((p: Project) => p.id);
          const { data: wps, error: wpError } = await supabase
            .from('v7_work_packages')
            .select('id, project_id, ap_number, ap_sub_number, ap_code, name, is_technical')
            .in('project_id', projectIds)
            .eq('is_active', true)
            .order('ap_number');

          if (wpError) throw wpError;
          setWorkPackages(wps || []);
        }

      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Unbekannter Fehler beim Laden.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [supabase, router, companyId]);

  // ============================================================================
  // ZURUECK-NAVIGATION
  // ============================================================================

  const handleBack = () => {
    if (urlReturnUrl) {
      // Vom Timesheet-Viewer (oder anderer Seite) gekommen -> dorthin zurueck
      router.push(urlReturnUrl);
    } else {
      // Standard: Firma-Detail (Berater-Portal)
      router.push(`/v7/berater/foerderung/firma/${companyId}`);
    }
  };

  // ============================================================================
  // LOADING
  // ============================================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Zeiterfassung wird geladen...</p>
        </div>
      </div>
    );
  }

  // ============================================================================
  // FEHLER
  // ============================================================================

  if (error || !userProfile || !company) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Fehler</h2>
          <p className="text-gray-600 mb-4">{error || 'Unbekannter Fehler'}</p>
          <button
            onClick={() => router.push('/v7/berater/dashboard')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Zum Dashboard
          </button>
        </div>
      </div>
    );
  }

  // URL-Parameter fuer TimesheetForm aufbereiten
  const initialEmployeeId = urlEmployeeId || undefined;
  const initialYear       = urlYear  ? parseInt(urlYear,  10) : undefined;
  const initialMonth      = urlMonth ? parseInt(urlMonth, 10) : undefined;

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="min-h-screen bg-gray-50">
      <PortalHeader
        portal="berater"
        userRole={userProfile.role}
        userName={userProfile.display_name || userProfile.email}
        userEmail={userProfile.email}
        companyName={company.name}
        currentPath={`/v7/berater/foerderung/firma/${companyId}/zeiterfassung`}
      />
      <PortalNav
        portal="berater"
        userRole={userProfile.role}
        currentPath={`/v7/berater/foerderung/firma/${companyId}/zeiterfassung`}
      />

      <main className="py-4">
        <TimesheetForm
          portal="berater"
          companyId={company.id}
          company={company}
          employees={employees}
          projects={projects}
          workPackages={workPackages}
          currentUserId={userProfile.id}
          currentUserDisplayName={userProfile.display_name || userProfile.email}
          isAdmin={true}
          onBack={handleBack}
          initialEmployeeId={initialEmployeeId}
          initialYear={initialYear}
          initialMonth={initialMonth}
        />
      </main>
    </div>
  );
}

// ============================================================================
// HAUPTKOMPONENTE MIT SUSPENSE
// ============================================================================

export default function BeraterZeiterfassungPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    }>
      <BeraterZeiterfassungContent />
    </Suspense>
  );
}
