// src/app/v7/firma/zeiterfassung/page.tsx
// ============================================================================
// PZE V7 - Zeiterfassung Seite (Firmen-Portal)
// ============================================================================
// Version: 7.3.88
// Datum: 05. Februar 2026
//
// NEU v7.3.88: Liest URL-Parameter aus Berichte-Seite:
//   - employee: MA-ID
//   - year: Jahr
//   - month: Monat (1-12)
//
// Beispiel-URL: /v7/firma/zeiterfassung?employee=abc-123&year=2023&month=2
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

interface UserProfile {
  id: string;
  email: string;
  display_name: string | null;
  role: string;
  client_company_id: string | null;
}

interface ClientCompany {
  id: string;
  name: string;
  federal_state: string | null;
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
  ap_sub_number?: number;
  ap_code: string | null;
  name: string;
  is_technical?: boolean | null;
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
  
  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [company, setCompany] = useState<ClientCompany | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [workPackages, setWorkPackages] = useState<WorkPackage[]>([]);

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
        
        // User-Profil
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
          .select('id, name, federal_state')
          .eq('id', companyId)
          .single();
        
        if (companyError || !companyData) {
          setError('Firma nicht gefunden');
          return;
        }
        setCompany(companyData);
        
        // 3. Mitarbeiter
        const { data: employeesData } = await supabase
          .from('v7_employees')
          .select('id, display_name, first_name, last_name, weekly_hours')
          .eq('client_company_id', companyId)
          .eq('is_active', true)
          .order('display_name');
        
        setEmployees(employeesData || []);
        
        // 4. Projekte (nur aktive)
        const { data: projectsData } = await supabase
          .from('v7_projects')
          .select('id, name, short_name, funding_reference, funding_format')
          .eq('client_company_id', companyId)
          .eq('is_active', true)
          .order('name');
        
        setProjects(projectsData || []);
        
        // 5. Arbeitspakete
        const projectIds = (projectsData || []).map(p => p.id);
        if (projectIds.length > 0) {
          const { data: wpData } = await supabase
            .from('v7_work_packages')
            .select('id, project_id, ap_number, ap_sub_number, ap_code, name, is_technical')
            .in('project_id', projectIds)
            .eq('is_active', true)
            .order('ap_number');
          
          setWorkPackages(wpData || []);
        }
        
      } catch (err: any) {
        console.error('Fehler beim Laden:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [router, supabase]);

  // ============================================================================
  // RENDER
  // ============================================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PortalHeader 
          portal="firma" 
          companyName="" 
          userName=""
          userRole="client_admin"
        />
        <PortalNav portal="firma" userRole="client_admin" portalRole="client_admin" />
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
        <PortalHeader 
          portal="firma" 
          companyName="" 
          userName=""
          userRole="client_admin"
        />
        <PortalNav portal="firma" userRole="client_admin" portalRole="client_admin" />
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

  // Ermittle initiale Werte aus URL-Parametern
  const initialEmployeeId = urlEmployeeId || undefined;
  const initialYear = urlYear ? parseInt(urlYear, 10) : undefined;
  const initialMonth = urlMonth ? parseInt(urlMonth, 10) : undefined;

  // Finde erstes Projekt mit dem MA hat Zuordnung (falls vorhanden)
  // Hier koennte man spaeter die project_assignments pruefen

  return (
    <div className="min-h-screen bg-gray-50">
      <PortalHeader 
        portal="firma" 
        companyName={company.name} 
        userName={userProfile.display_name || ''}
        userRole="client_admin"
      />
      <PortalNav portal="firma" userRole="client_admin" portalRole="client_admin" />
      
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
          isAdmin={userProfile.role === 'client_admin'}
          onBack={() => router.push('/v7/firma/berichte')}
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
