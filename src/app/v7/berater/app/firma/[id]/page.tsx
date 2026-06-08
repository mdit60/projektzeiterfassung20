'use client';

// src/app/v7/berater/app/firma/[id]/page.tsx
// ============================================================================
// Version: 1.0.1
// Firmen-Cockpit Route-Page (neue App-Struktur)
//   - Wrapper um bestehende FirmaCockpit-Komponente
//   - returnTo = /v7/berater/app/cockpit (App-Cockpit, nicht alte Struktur)
//   - Kein Querlink zur alten Struktur
// v1.0.1: FIX fehlender Header - blauer PortalHeader-Balken (Firmenname +
//   Benutzer) wird jetzt gerendert, analog zur klassischen Cockpit-Seite
//   (/foerderung/firma/[id]/cockpit). FirmaCockpit rendert nur die Nav
//   (PortalNav), nicht den Header - daher muss die Wrapper-Seite ihn liefern.
// ============================================================================

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import PortalHeader from '@/components/shared/PortalHeader';
import FirmaCockpit from '@/components/shared/FirmaCockpit';

export default function BeraterAppFirmaPage() {
  const params = useParams();
  const router = useRouter();
  const firmaId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState('consultant');
  const [firmaName, setFirmaName] = useState('');

  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data: profile } = await supabase
        .from('v7_user_profiles')
        .select('display_name, email, role')
        .eq('id', user.id)
        .single();

      if (!profile || (profile.role !== 'consultant' && profile.role !== 'system_admin')) {
        router.push('/v7/berater');
        return;
      }
      setUserName(profile.display_name || profile.email || '');
      setUserRole(profile.role || 'consultant');

      if (firmaId !== 'select') {
        const { data: firma } = await supabase
          .from('v7_client_companies')
          .select('name')
          .eq('id', firmaId)
          .single();
        setFirmaName(firma?.name || '');
      }
      setLoading(false);
    }
    init();
  }, [firmaId, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PortalHeader portal="berater" companyName="Laden..." userName="" userRole="consultant" />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#002451]"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PortalHeader
        portal="berater"
        companyName={firmaName || 'Berater-Portal'}
        userName={userName}
        userRole={userRole}
      />
      <FirmaCockpit firmaId={firmaId} portal="berater" />
    </div>
  );
}
