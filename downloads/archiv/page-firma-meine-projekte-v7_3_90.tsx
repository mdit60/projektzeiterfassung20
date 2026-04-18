// src/app/v7/firma/meine-projekte/page.tsx
// ============================================================================
// PZE V7 - Meine Projekte (Redirect)
// ============================================================================
// Datum: 12. Februar 2026
// Version: 7.3.90
//
// Leitet auf /v7/firma/projekte weiter.
// Die Projekte-Seite zeigt fuer project_leader und employee
// automatisch nur die zugeordneten Projekte.
// ============================================================================

import { redirect } from 'next/navigation';

export default function MeineProjektePage() {
  redirect('/v7/firma/projekte');
}
