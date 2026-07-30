'use client';

// src/app/v7/berater/foerderung/firma/[id]/verwendungsnachweis/page.tsx
// (identisch auch unter src/app/v7/berater/app/firma/[id]/verwendungsnachweis/page.tsx)
// ============================================================================
// Route: /v7/berater/foerderung/firma/[id]/verwendungsnachweis
// Version: 1.0-2
// ----------------------------------------------------------------------------
// v1.0-2: FIX Next.js-15-Build - useSearchParams() muss in eine <Suspense>-
//   Grenze (missing-suspense-with-csr-bailout, Prerender-Fehler). Inhalt in
//   eigene Komponente ausgelagert, Default-Export rendert sie in Suspense.
//   Muster analog ZASeite-Route. Logik unveraendert.
// v1.0-1: Duenne Route-Seite: Auth-Guard (nur consultant/system_admin), danach
//   Rendern der VerwendungsnachweisSeite.
//   ?projekt=<id>     -> Projekt vorselektieren
//   ?returnUrl=/...   -> Ziel des Zurueck-Buttons (sonst 'cockpit')
// ============================================================================

import { Suspense, useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import VerwendungsnachweisSeite from '@/components/shared/VerwendungsnachweisSeite';
import PortalHeader from '@/components/shared/PortalHeader';
import { Loader2 } from 'lucide-react';

function BeraterVNContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const firmaId = params.id as string;
  const projekt = searchParams.get('projekt') || undefined;
  const returnTo = searchParams.get('returnUrl') || searchParams.get('returnTo') || undefined;

  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    async function guard() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      const { data: profile } = await supabase
        .from('v7_user_profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      if (!profile || (profile.role !== 'consultant' && profile.role !== 'system_admin')) {
        router.push('/v7/berater');
        return;
      }
      setAllowed(true);
    }
    guard();
  }, [router]);

  if (!allowed) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PortalHeader portal="berater" companyName="Laden..." userName="" userRole="consultant" />
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-[#002451]" />
        </div>
      </div>
    );
  }

  return (
    <VerwendungsnachweisSeite
      portal="berater"
      clientCompanyId={firmaId}
      initialProjektId={projekt}
      returnTo={returnTo}
    />
  );
}

export default function BeraterVerwendungsnachweisPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center text-gray-500">Laden...</div>
    }>
      <BeraterVNContent />
    </Suspense>
  );
}
