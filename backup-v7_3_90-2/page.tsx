// src/app/v7/berater/page.tsx
// ============================================================================
// PZE V7 - Berater-Portal Redirect
// ============================================================================
// Version: 7.3.90-1
// Datum: 10. Februar 2026
//
// Leitet auf das Modul-Dashboard weiter.
// ERSETZT: Alte Willkommens-Seite mit Foerderberatung/FZul-Kacheln (v7.3.86-2)
// ============================================================================

import { redirect } from 'next/navigation';

export default function BeraterPage() {
  redirect('/v7/berater/dashboard');
}
