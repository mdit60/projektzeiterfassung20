'use client';

// src/app/v7/firma/za/page.tsx
// ============================================================================
// PZE V8-C - Firma ZA-Seite (Page-Wrapper)
// ============================================================================
// Datum: 9. Mai 2026
// Version: 1.0.0
//
// Duenner Page-Wrapper fuer ZASeite im Firmen-Portal.
// CompanyId wird von ZASeite selbst aus dem UserProfil geladen (clientCompanyId=null).
// ============================================================================

'use client';

import { useSearchParams } from 'next/navigation';
import ZASeite from '@/components/shared/ZASeite';

export default function FirmaZAPage() {
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
