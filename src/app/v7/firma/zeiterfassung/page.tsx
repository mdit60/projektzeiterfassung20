// src/app/v7/firma/zeiterfassung/page.tsx
// ============================================================================
// PZE V7 - Zeiterfassung Seite (Firmen-Portal)
// ============================================================================
// Version: 7.4.6-4
// v7.4.6-4: Liest zusaetzlich ?projekt= aus der URL und gibt es als
//   initialProjectId an TimesheetForm -> richtiges Projekt vorbelegt.
// Version: 7.4.6-3
// Datum: 23. Juni 2026
// v7.4.6-3: Project-Query um pm_basis_weekly_hours erweitert (WAZ-Basis aus
//           Antrag/Bescheid, wird an TimesheetForm durchgereicht).
//
// v7.4.6-2: WorkPackage-Query um total_person_months, start_date, end_date
//           erweitert. Wird in TimesheetForm benoetigt, um AP-Ueberschriften
//           (ohne PM) und abgelaufene APs aus dem Dropdown zu filtern.
// v7.4.6-1: Company-Query um holiday_region erweitert (wird an TimesheetForm
//           durchgereicht fuer kommunale Feiertags-Sonderfaelle)
// v7.3.94: Employee-Query um employment_start, employment_end erweitert
//          Project-Query um start_date, end_date erweitert
//          (benoeigt fuer TimesheetForm v7.4.3-19 Monats-Einschraenkung)
// v7.3.93: (vorherige Version)
// v7.3.92: PortalNav fuer ALLE Rollen anzeigen (auch employee)
//          Zurueck-Button: Default immer auf Mein Status
// v7.3.91: returnUrl-Parameter
// v7.3.88: Liest URL-Parameter aus Berichte-Seite
// ============================================================================

'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import PortalHeader from '@/components/shared/PortalHeader';
import PortalNav from '@/components/shared/PortalNav';
import TimesheetForm from '@/components/shared/TimesheetForm';
import { AlertCircle } from 'lucide-react';

// ============================================================================
// TYPEN
// ============================================================================

type PortalRole = 'client_admin' | 'project_leader' | 'employee';

interface UserProfile {
  id: string;
  email: string;
  display_name: string | null;
  role: string;
  client_company_id: string | null;
}

interface EmployeeRecord {
  id: string;
  user_id: string | null;
  portal_role: PortalRole | null;
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
  pm_basis_weekly_hours: number | null;  // v7.4.6-3: WAZ-Basis aus Antrag/Bescheid
}

interface WorkPackage {
  id: string;
  project_id: string;
  ap_number: number;
  ap_sub_number?: number;
  ap_code: string | null;
  name: string;
  is_technical?: boolean | null;
  total_person_months: number | null;  // v7.4.6-2: fuer Ueberschriften-Filter
  start_date: string | null;            // v7.4.6-2: fuer Laufzeit-Filter
  end_date: string | null;              // v7.4.6-2: fuer Laufzeit-Filter
}

// ============================================================================
// INNERE KOMPONENTE (mit useSearchParams)
// ============================================================================

function ZeiterfassungContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  
  // URL-Parameter auslesen
  const urlEmployeeId = searchParams.get('employee');
  const urlYear = searchParams.get('year');
  const urlMonth = searchParams.get('month');
  const urlReturnUrl = searchParams.get('returnUrl');
  const urlProjekt = searchParams.get('projekt');  // v7.4.6-4
  
  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [company, setCompany] = useState<ClientCompany | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [workPackages, setWorkPackages] = useState<WorkPackage[]>([]);
  const [portalRole, setPortalRole] = useState<PortalRole>('employee');
  const [currentEmployeeId, setCurrentEmployeeId] = useState<string | null>(null);

  // ============================================================================
  // DATEN LADEN
  // ============================================================================

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // 1. User & Profile
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/v7/login');
          return;
        }
        
        const { data: profile, error: profileError } = await supabase
          .from('v7_user_profiles')
          .select('id, email, display_name, role, client_company_id')
          .eq('email', user.email)
          .maybeSingle();
        
        if (profileError || !profile) {
          setError('Kein Benutzerprofil gefunden');
          return;
        }
        
        if (!profile.client_company_id) {
          setError('Keine Firma zugeordnet. Bitte melden Sie sich mit einem Firmen-Account an.');
          return;
        }
        
        setUserProfile(profile);
        const companyId = profile.client_company_id;
        
        // 2. Company
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
        
        // 3. Portal-Rolle ermitteln
        const { data: employeeRecord } = await supabase
          .from('v7_employees')
          .select('id, user_id, portal_role')
          .eq('client_company_id', companyId)
          .eq('user_id', user.id)
          .maybeSingle();
        
        let userPortalRole: PortalRole = 'employee';
        let userEmployeeId: string | null = null;
        
        if (profile.role === 'client_admin') {
          userPortalRole = 'client_admin';
        } else if (employeeRecord) {
          userPortalRole = (employeeRecord.portal_role as PortalRole) || 'employee';
          userEmployeeId = employeeRecord.id;
        }
        
        // Auch fuer client_admin: Employee-ID ermitteln (fuer eigene ZE)
        if (userPortalRole === 'client_admin' && employeeRecord) {
          userEmployeeId = employeeRecord.id;
        }
        
        setPortalRole(userPortalRole);
        setCurrentEmployeeId(userEmployeeId);
        
        // 4. Mitarbeiter laden
        if (userPortalRole === 'client_admin' || userPortalRole === 'project_leader') {
          const { data: employeesData } = await supabase
            .from('v7_employees')
            .select('id, display_name, first_name, last_name, weekly_hours, employment_start, employment_end')
            .eq('client_company_id', companyId)
            .eq('is_active', true)
            .order('display_name');
          
          setEmployees(employeesData || []);
        } else if (userEmployeeId) {
          const { data: employeesData } = await supabase
            .from('v7_employees')
            .select('id, display_name, first_name, last_name, weekly_hours, employment_start, employment_end')
            .eq('id', userEmployeeId);
          
          setEmployees(employeesData || []);
        }
        
        // 5. Projekte (nur aktive)
        const { data: projectsData } = await supabase
          .from('v7_projects')
          .select('id, name, short_name, funding_reference, funding_format, start_date, end_date, pm_basis_weekly_hours')
          .eq('client_company_id', companyId)
          .eq('is_active', true)
          .order('name');
        
        setProjects(projectsData || []);
        
        // 6. Arbeitspakete
        const projectIds = (projectsData || []).map(p => p.id);
        if (projectIds.length > 0) {
          const { data: wpData } = await supabase
            .from('v7_work_packages')
            .select('id, project_id, ap_number, ap_sub_number, ap_code, name, is_technical, total_person_months, start_date, end_date')
            .in('project_id', projectIds)
            .eq('is_active', true)
            .order('ap_number');
          
          setWorkPackages(wpData || []);
        }
        
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unbekannter Fehler';
        setError(msg);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [router, supabase]);

  // ============================================================================
  // RENDER
  // ============================================================================

  const userRole = portalRole === 'client_admin' ? 'client_admin' : 'client_user';

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PortalHeader portal="firma" companyName="" userName="" userRole="client_user" />
        <main className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="w-10 h-10 border-4 border-green-200 border-t-green-600 rounded-full animate-spin"></div>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PortalHeader portal="firma" companyName="" userName="" userRole="client_user" />
        <main className="max-w-7xl mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-700">{error}</p>
          </div>
        </main>
      </div>
    );
  }

  if (!company || !userProfile) {
    return null;
  }

  // Initiale Werte aus URL-Parametern
  let initialEmployeeId: string | undefined;
  if (portalRole === 'client_admin' || portalRole === 'project_leader') {
    initialEmployeeId = urlEmployeeId || undefined;
  } else {
    initialEmployeeId = currentEmployeeId || undefined;
  }
  
  const initialYear = urlYear ? parseInt(urlYear, 10) : undefined;
  const initialMonth = urlMonth ? parseInt(urlMonth, 10) : undefined;
  const initialProjectId = urlProjekt || undefined;  // v7.4.6-4

  return (
    <div className="min-h-screen bg-gray-50">
      <PortalHeader 
        portal="firma" 
        companyName={company.name} 
        userName={userProfile.display_name || ''}
        userRole={userRole}
      />
      {/* Navigation fuer ALLE Rollen */}
      <PortalNav 
        portal="firma" 
        userRole={userRole} 
        portalRole={portalRole} 
      />
      
      <main className="py-4">
        <TimesheetForm
          portal="firma"
          companyId={company.id}
          company={company}
          employees={employees}
          projects={projects}
          workPackages={workPackages}
          currentUserId={userProfile.id}
          currentUserDisplayName={userProfile.display_name || userProfile.email}
          isAdmin={portalRole === 'client_admin'}
          onBack={() => {
            if (urlReturnUrl) {
              router.push(urlReturnUrl);
            } else {
              router.push('/v7/firma/mein-status');
            }
          }}
          initialEmployeeId={initialEmployeeId}
          initialYear={initialYear}
          initialMonth={initialMonth}
          initialProjectId={initialProjectId}
        />
      </main>
    </div>
  );
}

// ============================================================================
// HAUPTKOMPONENTE MIT SUSPENSE
// ============================================================================

export default function ZeiterfassungPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-green-200 border-t-green-600 rounded-full animate-spin"></div>
      </div>
    }>
      <ZeiterfassungContent />
    </Suspense>
  );
}
