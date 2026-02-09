// src/app/v7/firma/projekte/[id]/page.tsx
// ============================================================================
// PZE V7 - Firmen-Portal Projekt-Detail (Wrapper)
// ============================================================================
// Datum: 21. Januar 2026
// Version: 7.3.56
//
// Diese Seite nutzt die Shared ProjectDetailPage Component.
// ============================================================================

'use client';

import { useParams } from 'next/navigation';
import ProjectDetailPage from '@/components/shared/ProjectDetailPage';

export default function FirmaProjektDetail() {
  const params = useParams();
  const projectId = params.id as string;

  return (
    <ProjectDetailPage
      portal="firma"
      projectId={projectId}
      backUrl="/v7/firma/projekte"
    />
  );
}
