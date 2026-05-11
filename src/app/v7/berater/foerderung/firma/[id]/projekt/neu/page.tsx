'use client';

// src/app/v7/berater/foerderung/firma/[id]/projekt/neu/page.tsx
// ============================================================================
// Version: 1.0.0
// v1.0.0: Neue Page fuer /projekt/neu
//   - liest returnTo aus searchParams
//   - onSuccess -> ProjectDetail mit returnTo (User sieht neues Projekt, dann Zurueck)
//   - onCancel -> returnTo (direkt zurueck zum Ausgangspunkt)
//   - Suspense-Wrapper fuer useSearchParams (Next.js-Pflicht)
// ============================================================================

import React, { Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';
import ProjectCreateForm from '@/components/shared/ProjectCreateForm';
import PortalHeader from '@/components/shared/PortalHeader';
import { Loader2 } from 'lucide-react';

export default function BeraterProjektNeuPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#002451]" />
      </div>
    }>
      <BeraterProjektNeuPageInner />
    </Suspense>
  );
}

function BeraterProjektNeuPageInner() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const firmaId = params.id as string;
  const returnTo = searchParams.get('returnTo');

  const supabase = createClient();
  const [firmaName, setFirmaName] = useState('');
  const [userDisplayName, setUserDisplayName] = useState('');

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/v7/login'); return; }

      const { data: profile } = await supabase
        .from('v7_user_profiles')
        .select('display_name')
        .eq('id', user.id)
        .single();
      if (profile?.display_name) setUserDisplayName(profile.display_name);

      const { data: firma } = await supabase
        .from('v7_client_companies')
        .select('name')
        .eq('id', firmaId)
        .single();
      if (firma?.name) setFirmaName(firma.name);
    }
    load();
  }, [firmaId]);

  // Nach erfolgreichem Anlegen: zur Projektdetail-Seite, returnTo mitgeben
  const handleSuccess = (projectId: string) => {
    const detailUrl = `/v7/berater/foerderung/firma/${firmaId}/projekt/${projectId}`;
    if (returnTo) {
      router.push(`${detailUrl}?returnTo=${encodeURIComponent(returnTo)}`);
    } else {
      router.push(detailUrl);
    }
  };

  // Abbrechen: zurueck zum Ausgangspunkt
  const handleCancel = () => {
    if (returnTo) {
      router.push(decodeURIComponent(returnTo));
    } else {
      router.push(`/v7/berater/foerderung/firma/${firmaId}?tab=projekte`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <PortalHeader
        portal="berater"
        companyName={firmaName}
        userName={userDisplayName}
        userRole="consultant"
      />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <ProjectCreateForm
          portal="berater"
          companyId={firmaId}
          companyName={firmaName}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      </div>
    </div>
  );
}
