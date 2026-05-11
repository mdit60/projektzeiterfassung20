'use client';

// src/app/v7/berater/app/firma/[id]/page.tsx
// ============================================================================
// Version: 1.0.0
// Firmen-Cockpit Route-Page (neue App-Struktur)
//   - Wrapper um bestehende FirmaCockpit-Komponente
//   - returnTo = /v7/berater/app/cockpit (App-Cockpit, nicht alte Struktur)
//   - Kein Querlink zur alten Struktur
// ============================================================================

import React from 'react';
import { useParams } from 'next/navigation';
import FirmaCockpit from '@/components/shared/FirmaCockpit';

export default function BeraterAppFirmaPage() {
  const params = useParams();
  const firmaId = params.id as string;

  return (
    <FirmaCockpit
      firmaId={firmaId}
      portal="berater"
    />
  );
}
