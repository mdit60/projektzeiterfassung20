// src/app/v7/firma/page.tsx
// ============================================================================
// PZE V7 - Redirect auf Dashboard (Berichte)
// ============================================================================
// Datum: 6. Mai 2026
// Version: 7.3.43
//
// Leitet auf /v7/firma/berichte weiter (Dashboard mit integrierter Projektliste).
// Gilt fuer alle Firmen-Rollen (Admin, PL, MA).
// ============================================================================

import { redirect } from 'next/navigation';

export default function FirmaPage() {
  redirect('/v7/firma/berichte');
}
