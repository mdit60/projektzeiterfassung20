'use client';

// src/app/v7/firma/verwendungsnachweis/page.tsx
// ============================================================================
// Route: /v7/firma/verwendungsnachweis
// Version: 1.0-2
// ----------------------------------------------------------------------------
// v1.0-2: FIX Next.js-15-Build - useSearchParams() muss in eine <Suspense>-
//   Grenze (missing-suspense-with-csr-bailout, Prerender-Fehler). Inhalt in
//   eigene Komponente ausgelagert, Default-Export rendert sie in Suspense.
//   Muster analog ZASeite-Route. Logik unveraendert.
// v1.0-1: Duenne Route-Seite im Firmen-Portal: Login-Guard, danach Rendern der
//   VerwendungsnachweisSeite (clientCompanyId=null -> Firma aus Profil).
//   ?projekt=<id>     -> Projekt vorselektieren
//   ?returnUrl=/...   -> Ziel des Zurueck-Buttons
// ============================================================================

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import VerwendungsnachweisSeite from '@/components/shared/VerwendungsnachweisSeite';
import PortalHeader from '@/components/shared/PortalHeader';
import { Loader2 } from 'lucide-react';

function FirmaVNContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projekt = searchParams.get('projekt') || undefined;
  const returnTo = searchParams.get('returnUrl') || searchParams.get('returnTo') || undefined;

  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function guard() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      setReady(true);
    }
    guard();
  }, [router]);

  if (!ready) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PortalHeader portal="firma" companyName="Laden..." userName="" userRole="client_admin" />
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-green-700" />
        </div>
      </div>
    );
  }

  return (
    <VerwendungsnachweisSeite
      portal="firma"
      clientCompanyId={null}
      initialProjektId={projekt}
      returnTo={returnTo}
    />
  );
}

export default function FirmaVerwendungsnachweisPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center text-gray-500">Laden...</div>
    }>
      <FirmaVNContent />
    </Suspense>
  );
}
