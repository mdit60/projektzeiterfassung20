'use client';

// src/app/v7/firma/za/page.tsx
// Version: 1.0.1
// v1.0.1: Suspense-Wrapper fuer useSearchParams (Next.js App Router Pflicht)

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ZASeite from '@/components/shared/ZASeite';

function ZAContent() {
  const searchParams = useSearchParams();
  const projektId = searchParams.get('projektId') || undefined;
  const zaId      = searchParams.get('zaId') || undefined;
  const returnTo  = searchParams.get('returnTo') || undefined;

  return (
    <ZASeite
      portal="firma"
      clientCompanyId={null}
      initialProjektId={projektId}
      initialZaId={zaId}
      returnTo={returnTo}
    />
  );
}

export default function FirmaZAPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-500">Laden...</div>}>
      <ZAContent />
    </Suspense>
  );
}
