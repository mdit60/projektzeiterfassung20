// src/app/v7/berater/foerderung/firma/[id]/projekt/[projektId]/page.tsx
// ============================================================================
// PZE V7 - Berater-Portal Projekt-Detail (Wrapper)
// ============================================================================
// Datum: 21. Januar 2026
// Version: 7.3.56
//
// Diese Seite nutzt die Shared ProjectDetailPage Component.
// Route: /v7/berater/foerderung/firma/[id]/projekt/[projektId]
// ============================================================================

'use client';

import { useParams } from 'next/navigation';
import ProjectDetailPage from '@/components/shared/ProjectDetailPage';

export default function BeraterProjektDetail() {
  const params = useParams();
  const firmaId = params.id as string;        // [id] aus dem Pfad
  const projektId = params.projektId as string;

  return (
    <ProjectDetailPage
      portal="berater"
      projectId={projektId}
      companyId={firmaId}
      backUrl={`/v7/berater/foerderung/firma/${firmaId}?tab=projekte`}
    />
  );
}
