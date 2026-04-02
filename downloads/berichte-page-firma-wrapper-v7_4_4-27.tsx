// src/app/v7/firma/berichte/page.tsx
// ============================================================================
// PZE V7 - Berichte & Controlling (Firmen-Portal) - Wrapper
// ============================================================================
// Version: 7.4.4-27
// Datum: 02. April 2026
//
// Duenner Wrapper. Logik vollstaendig in BerichtePage (Shared Component).
// clientCompanyId wird intern aus dem UserProfil geladen (portal='firma').
// ============================================================================

import BerichtePage from '@/components/shared/BerichtePage';

export default function FirmaBerichtePage() {
  return <BerichtePage portal="firma" />;
}
