// src/app/v7/firma/projekte/[id]/page.tsx
// ============================================================================
// PZE V7 - Firmen-Portal Projekt-Detail (Wrapper)
// ============================================================================
// Datum: 12. Februar 2026
// Version: 7.3.90
//
// Nutzt die Shared ProjectDetailPage Component.
// Route: /v7/firma/projekte/[id]
// ============================================================================

'use client';

import { useParams } from 'next/navigation';
import ProjectDetailPage from '@/components/shared/ProjectDetailPage';

export default function FirmaProjektDetail() {
  const params = useParams();
  const projektId = params.id as string;

  return (
    <ProjectDetailPage
      portal="firma"
      projectId={projektId}
      backUrl="/v7/firma/projekte"
    />
  );
}
