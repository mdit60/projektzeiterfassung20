// src/app/v7/berater/admin/page.tsx
// ============================================================================
// PZE V7 - System-Administration (Berater-Portal)
// ============================================================================
// Datum: 17. Februar 2026
// Version: 7.3.94
//
// Nur fuer system_admin sichtbar.
// Enthaelt die Berater-Verwaltung (ConsultantManagement).
// Erreichbar ueber PortalNav "Administration" und Dashboard-Kachel "Sonstiges".
// ============================================================================

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import PortalHeader from '@/components/shared/PortalHeader';
import PortalNav from '@/components/shared/PortalNav';
import ConsultantManagement from '@/components/shared/ConsultantManagement';
import { Shield, ArrowLeft } from 'lucide-react';

// ============================================================================
// TYPEN
// ============================================================================

interface UserProfile {
  id: string;
  email: string;
  display_name: string | null;
  role: string;
  consultant_company_id: string | null;
}

interface ConsultantCompany {
  id: string;
  name: string;
}

// ============================================================================
// SEITE
// ============================================================================

export default function BeraterAdminPage() {
  const router = useRouter();
  const supabase = createClient();

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [company, setCompany] = useState<ConsultantCompany | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        // 1. Auth pruefen
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login');
          return;
        }

        // 2. Profil laden
        const { data: profile, error: profileError } = await supabase
          .from('v7_user_profiles')
          .select('id, email, display_name, role, consultant_company_id')
          .eq('id', user.id)
          .single();

        if (profileError || !profile) {
          setError('Profil nicht gefunden.');
          return;
        }

        // 3. Nur system_admin darf diese Seite sehen
        if (profile.role !== 'system_admin') {
          router.push('/v7/berater/foerderung');
          return;
        }

        setUserProfile(profile);

        // 4. Beraterfirma laden
        if (profile.consultant_company_id) {
          const { data: companyData } = await supabase
            .from('v7_consultant_companies')
            .select('id, name')
            .eq('id', profile.consultant_company_id)
            .single();

          if (companyData) {
            setCompany(companyData);
          }
        }

      } catch (err: any) {
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Lade Administration...</div>
      </div>
    );
  }

  if (error || !userProfile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-red-600">{error || 'Zugriff verweigert.'}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <PortalHeader
        portal="berater"
        companyName={company?.name || 'Berater'}
        userName={userProfile.display_name || userProfile.email}
      />

      {/* Navigation */}
      <PortalNav
        portal="berater"
        userRole={userProfile.role}
        currentPath="/v7/berater/admin"
      />

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Titel */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
            <Shield size={22} className="text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Administration</h1>
            <p className="text-sm text-gray-500">
              Berater-Verwaltung fuer {company?.name || 'Ihre Beraterfirma'}
            </p>
          </div>
        </div>

        {/* Berater-Verwaltung */}
        {userProfile.consultant_company_id && (
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Shield size={20} className="text-blue-600" />
              Berater-Team
            </h2>
            <ConsultantManagement
              consultantCompanyId={userProfile.consultant_company_id}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-8 py-3 text-center text-xs text-gray-400">
        PZE v7.3.94 | {company?.name || ''}
      </footer>
    </div>
  );
}
