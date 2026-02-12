// src/app/v7/berater/dashboard/page.tsx
// ============================================================================
// PZE V7 - Berater-Dashboard (Redirect)
// ============================================================================
// Version: 7.3.89
// Datum: 09. Februar 2026
//
// TEMPORAER: Leitet auf /v7/berater/foerderung weiter.
// Wird beim Modul-Dashboard-Umbau durch richtige Dashboard-Seite ersetzt.
// ============================================================================

import { redirect } from 'next/navigation';

export default function BeraterDashboardPage() {
  redirect('/v7/berater/foerderung');
}
