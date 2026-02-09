// src/app/v7/firma/firmendaten/page.tsx
// ============================================================================
// PZE V7 - Firmendaten (Firmen-Portal)
// ============================================================================
// Datum: 21. Januar 2026
// Version: 7.3.57
//
// Nutzt Shared Component: CompanyDataView
// ============================================================================

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { AlertCircle } from 'lucide-react';

// Komponenten
import PortalHeader from '@/components/shared/PortalHeader';
import PortalNav from '@/components/shared/PortalNav';
import CompanyDataView, { CompanyData } from '@/components/shared/CompanyDataView';

// Types
import { V7UserRole, V7EmployeePortalRole, V7Employee } from '@/types/v7-types';

// ============================================================================
// TYPEN
// ============================================================================

interface UserProfile {
  id: string;
  email: string;
  role: V7UserRole;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  client_company_id: string | null;
}

// ============================================================================
// KOMPONENTE
// ============================================================================

export default function Firmendaten() {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [employee, setEmployee] = useState<V7Employee | null>(null);
  const [company, setCompany] = useState<CompanyData | null>(null);

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

      const { data: profile } = await supabase
        .from('v7_user_profiles')
        .select('*')
        .eq('email', user.email)
        .maybeSingle();

      if (!profile || !profile.client_company_id) {
        setError('Kein Zugriff auf das Firmen-Portal');
        setLoading(false);
        return;
      }

      setUserProfile(profile);

      const { data: companyData } = await supabase
        .from('v7_client_companies')
        .select('id, name, short_name, street, zip_code, city, federal_state, contact_person, contact_email, contact_phone, created_at')
        .eq('id', profile.client_company_id)
        .single();

      if (companyData) setCompany(companyData);

      const { data: employeeData } = await supabase
        .from('v7_employees')
        .select('*')
        .eq('client_company_id', profile.client_company_id)
        .eq('email', user.email)
        .maybeSingle();

      if (employeeData) setEmployee(employeeData);

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

  const getPortalRole = (): V7EmployeePortalRole => {
    if (userProfile?.role === 'client_admin') return 'client_admin';
    if (employee?.portal_role) return employee.portal_role;
    return 'employee';
  };

  const canEdit = (): boolean => {
    return userProfile?.role === 'client_admin' || employee?.portal_role === 'client_admin';
  };

  const handleSaveCompany = async (data: CompanyData) => {
    const { error: updateError } = await supabase
      .from('v7_client_companies')
      .update({
        name: data.name,
        short_name: data.short_name,
        street: data.street,
        zip_code: data.zip_code,
        city: data.city,
        federal_state: data.federal_state,
        contact_person: data.contact_person,
        contact_email: data.contact_email,
        contact_phone: data.contact_phone,
        updated_at: new Date().toISOString(),
      })
      .eq('id', data.id);

    if (updateError) throw updateError;

    // Lokalen State aktualisieren
    setCompany(data);
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-green-200 border-t-green-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error && !company) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  const userName = getUserName();
  const portalRole = getPortalRole();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <PortalHeader
        portal="firma"
        userName={userName}
        userRole={portalRole}
        companyName={company?.name || 'Firma'}
      />

      {/* Navigation */}
      <PortalNav
        portal="firma"
        userRole={userProfile?.role || 'client_user'}
        portalRole={portalRole}
        currentPath={pathname}
      />

      {/* Content */}
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {company && (
          <CompanyDataView
            portal="firma"
            company={company}
            canEdit={canEdit()}
            onSave={handleSaveCompany}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <p className="text-center text-sm text-gray-500">
            PZE v7.3.57 - Firmen-Portal
          </p>
        </div>
      </footer>
    </div>
  );
}
