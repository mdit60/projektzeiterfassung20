// src/app/v7/firma/projekte/page.tsx
// ============================================================================
// PZE V7 - Projekte-Seite (Firmen-Portal)
// ============================================================================
// Version: 7.3.89
// Datum: 09. Februar 2026
//
// Nutzt shared ProjectList-Komponente (laedt Projekte selbst)
//
// v7.3.89:   KOMPLETT NEU - Ersetzt die alte v7.3.5 Seite (1200+ Zeilen)
//            durch schlanke Version mit shared ProjectList-Komponente.
//            Alte Version hatte Fehler: v7_project_budget Tabelle existiert nicht.
// ============================================================================

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import PortalHeader from '@/components/shared/PortalHeader';
import ProjectList from '@/components/shared/ProjectList';
import { Loader2 } from 'lucide-react';

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
  short_name: string | null;
}

// ============================================================================
// KOMPONENTE
// ============================================================================

export default function FirmaProjektePage() {
  const router = useRouter();
  const supabase = createClient();

  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [company, setCompany] = useState<ClientCompany | null>(null);
  const [portalRole, setPortalRole] = useState<PortalRole>('employee');

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
          setError('Benutzerprofil nicht gefunden');
          return;
        }

        if (!profile.client_company_id) {
          setError('Keine Firma zugeordnet');
          return;
        }

        setUserProfile(profile);

        // 2. Portal-Rolle ermitteln
        if (profile.role === 'client_admin') {
          setPortalRole('client_admin');
        } else {
          // Mitarbeiter-Eintrag suchen fuer portal_role
          const { data: empRecord } = await supabase
            .from('v7_employees')
            .select('id, user_id, portal_role')
            .eq('client_company_id', profile.client_company_id)
            .eq('user_id', profile.id)
            .maybeSingle();

          if (empRecord?.portal_role) {
            setPortalRole(empRecord.portal_role as PortalRole);
          }
        }

        // 3. Firma laden
        const { data: companyData, error: companyError } = await supabase
          .from('v7_client_companies')
          .select('id, name, short_name')
          .eq('id', profile.client_company_id)
          .single();

        if (companyError || !companyData) {
          setError('Firma nicht gefunden');
          return;
        }

        setCompany(companyData);

      } catch (err) {
        console.error('Fehler beim Laden:', err);
        setError('Unerwarteter Fehler beim Laden der Daten');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // ============================================================================
  // RENDER - LOADING
  // ============================================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-gray-400 mx-auto mb-4 animate-spin" />
          <p className="text-gray-500">Laden...</p>
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER - ERROR
  // ============================================================================

  if (error || !userProfile || !company) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md text-center">
          <p className="text-red-700">{error || 'Daten konnten nicht geladen werden'}</p>
          <button
            onClick={() => router.push('/v7/firma/dashboard')}
            className="mt-4 px-4 py-2 text-sm text-red-600 hover:text-red-800 underline"
          >
            Zurueck zum Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER - HAUPTINHALT
  // ============================================================================

  const isAdmin = userProfile.role === 'client_admin' || portalRole === 'client_admin';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <PortalHeader
        portal="firma"
        userRole={userProfile.role}
        portalRole={portalRole}
        userName={userProfile.display_name || userProfile.email}
        userEmail={userProfile.email}
        companyName={company.name}
        currentPath="/v7/firma/projekte"
      />

      {/* Hauptinhalt */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <ProjectList
          portal="firma"
          companyId={company.id}
          showNewButton={isAdmin}
        />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-sm text-gray-500">
            PZE v7.3.89 | Firmen-Portal | {company.name}
          </p>
        </div>
      </footer>
    </div>
  );
}
