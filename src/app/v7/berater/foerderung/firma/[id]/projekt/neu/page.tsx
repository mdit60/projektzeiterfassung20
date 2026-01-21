// src/app/v7/berater/foerderung/firma/[id]/projekt/neu/page.tsx
// ============================================================================
// PZE V7 - Neues Projekt anlegen (Berater-Portal)
// ============================================================================
// Datum: 21. Januar 2026
// Version: 7.3.57
//
// Nutzt Shared Component: ProjectCreateForm
// ============================================================================

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, AlertCircle } from 'lucide-react';

import PortalHeader from '@/components/shared/PortalHeader';
import ProjectCreateForm from '@/components/shared/ProjectCreateForm';

// ============================================================================
// TYPEN
// ============================================================================

interface UserProfile {
  id: string;
  email: string;
  role: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
}

interface ClientCompany {
  id: string;
  name: string;
}

// ============================================================================
// KOMPONENTE
// ============================================================================

export default function BeraterNeuesProjekt() {
  const router = useRouter();
  const params = useParams();
  const companyId = params.id as string;
  const supabase = createClient();

  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [company, setCompany] = useState<ClientCompany | null>(null);

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

      const { data: profile } = await supabase
        .from('v7_user_profiles')
        .select('*')
        .eq('email', user.email)
        .maybeSingle();

      if (!profile || !['system_admin', 'consultant'].includes(profile.role)) {
        setError('Keine Berater-Berechtigung');
        setLoading(false);
        return;
      }
      setUserProfile(profile);

      const { data: companyData, error: companyError } = await supabase
        .from('v7_client_companies')
        .select('id, name')
        .eq('id', companyId)
        .single();

      if (companyError) {
        setError('Firma nicht gefunden');
        setLoading(false);
        return;
      }
      setCompany(companyData);

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
    return userProfile?.email?.split('@')[0] || 'Berater';
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">{error || 'Firma nicht gefunden'}</p>
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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <PortalHeader
        portal="berater"
        userName={getUserName()}
        userRole={userProfile?.role as any || 'consultant'}
        companyName={company.name}
      />

      {/* Sub-Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 py-4">
            <button
              onClick={() => router.push(`/v7/berater/foerderung/firma/${companyId}?tab=projekte`)}
              className="flex items-center gap-1 text-gray-500 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft size={18} />
              <span className="text-sm">Zurueck</span>
            </button>
            <div className="h-6 w-px bg-gray-200"></div>
            <h1 className="text-lg font-semibold text-gray-900">Neues Projekt fuer {company.name}</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <ProjectCreateForm
          portal="berater"
          companyId={company.id}
          companyName={company.name}
          onSuccess={(projectId) => router.push(`/v7/berater/foerderung/firma/${companyId}/projekt/${projectId}`)}
          onCancel={() => router.push(`/v7/berater/foerderung/firma/${companyId}?tab=projekte`)}
        />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <p className="text-center text-sm text-gray-500">
            PZE v7.3.57 | {company.name}
          </p>
        </div>
      </footer>
    </div>
  );
}
