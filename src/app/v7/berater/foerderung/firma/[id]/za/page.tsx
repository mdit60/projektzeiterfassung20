'use client';

// src/app/v7/berater/foerderung/firma/[id]/za/page.tsx
// ============================================================================
// PZE V8-C - Berater ZA-Seite (Page-Wrapper)
// ============================================================================
// Datum: 9. Mai 2026
// Version: 1.0.0
//
// Duenner Page-Wrapper fuer ZASeite im Berater-Portal.
// Liest Route-Parameter und URL-Params, reicht sie an ZASeite weiter.
// ============================================================================

import { use } from 'react';
import { useSearchParams } from 'next/navigation';
import ZASeite from '@/components/shared/ZASeite';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function BeraterZAPage({ params }: PageProps) {
  const { id } = use(params);
  const searchParams = useSearchParams();

  const projektId  = searchParams.get('projektId') || undefined;
  const zaId       = searchParams.get('zaId') || undefined;
  const returnTo   = searchParams.get('returnTo') || undefined;

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
