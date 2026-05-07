// src/app/v7/firma/projekte/page.tsx
// ============================================================================
// PZE V7 - Redirect: /v7/firma/projekte -> Dashboard
// ============================================================================
// Version: 7.3.90
// Datum: 7. Mai 2026
//
// Die separate Projektliste ist jetzt ins Dashboard integriert (BerichtePage
// v7.4.6-7+). Diese Seite leitet direkt auf das Dashboard weiter.
// Gilt auch als Ziel des Zurueck-Buttons in ProjectDetailPage.
// ============================================================================

import { redirect } from 'next/navigation';

export default function FirmaProjektePage() {
  redirect('/v7/firma/berichte');
}
