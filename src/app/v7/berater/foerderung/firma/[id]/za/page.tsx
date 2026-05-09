'use client';

// src/app/v7/berater/foerderung/firma/[id]/za/page.tsx
// Version: 1.0.1
// v1.0.1: Suspense-Wrapper fuer useSearchParams (Next.js App Router Pflicht)

import { use, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ZASeite from '@/components/shared/ZASeite';

interface PageProps {
  params: Promise<{ id: string }>;
}

function ZAContent({ id }: { id: string }) {
  const searchParams = useSearchParams();
  const projektId = searchParams.get('projektId') || undefined;
  const zaId      = searchParams.get('zaId') || undefined;
  const returnTo  = searchParams.get('returnTo') || undefined;

  return (
    <ZASeite
      portal="berater"
      clientCompanyId={id}
      initialProjektId={projektId}
      initialZaId={zaId}
      returnTo={returnTo}
    />
  );
}

export default function BeraterZAPage({ params }: PageProps) {
  const { id } = use(params);
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-500">Laden...</div>}>
      <ZAContent id={id} />
    </Suspense>
  );
}
