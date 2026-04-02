// src/app/v7/berater/foerderung/firma/[id]/berichte/page.tsx
// ============================================================================
// PZE V7 - Berichte & Controlling (Berater-Portal) - Wrapper
// ============================================================================
// Version: 7.4.4-24
// Datum: 02. April 2026
//
// Duenner Wrapper. Logik vollstaendig in BerichtePage (Shared Component).
// clientCompanyId kommt aus URL-Params ([id]).
// ============================================================================

'use client';

import { useParams } from 'next/navigation';
import BerichtePage from '@/components/shared/BerichtePage';

export default function BeraterBerichtePage() {
  const params = useParams();
  const clientCompanyId = params?.id as string;
  return <BerichtePage portal="berater" clientCompanyId={clientCompanyId} />;
}
