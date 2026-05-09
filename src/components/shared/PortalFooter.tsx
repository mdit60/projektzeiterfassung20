'use client';

// src/components/shared/PortalFooter.tsx
// ============================================================================
// PZE - Gemeinsamer Portal-Footer
// ============================================================================
// Datum: 9. Mai 2026
// Version: 7.4.9-1
//
// v7.4.9-1: Erstversion - Permanenter Footer unten
//   - position: fixed, bottom: 0, volle Breite
//   - Gleiche Portalfarbe wie PortalHeader (blau Berater / gruen Firma)
//   - print:hidden - erscheint nicht im Druck (Stundennachweis etc.)
//   - Text: PZE - Projektzeiterfassung by Cubintec GmbH + Impressum/AGB Platzhalter
//   - Wird auf allen Seiten mit PortalHeader eingebunden
//   - Alle Seiten benoetigen pb-12 am Hauptinhalt damit nichts verdeckt wird
// ============================================================================

import { V7PortalType } from '@/types/v7-types';
import { PORTAL_COLORS } from '@/lib/v7-constants';

// ============================================================================
// TYPEN
// ============================================================================

interface PortalFooterProps {
  portal?: V7PortalType; // Optional: default 'berater' (navy) fuer Login-Seite
}

// ============================================================================
// KOMPONENTE
// ============================================================================

export default function PortalFooter({ portal = 'berater' }: PortalFooterProps) {
  const colors = PORTAL_COLORS[portal];
  const year = new Date().getFullYear();

  return (
    <footer
      className="fixed bottom-0 left-0 right-0 z-40 h-9 flex items-center justify-center print:hidden"
      style={{ backgroundColor: colors.primary }}
    >
      <p className="text-xs text-center" style={{ color: 'rgba(255,255,255,0.75)' }}>
        PZE &ndash; Projektzeiterfassung by Cubintec GmbH, {year}
        &nbsp;&middot;&nbsp;
        <span
          className="cursor-default transition-colors"
          style={{ color: 'rgba(255,255,255,0.75)' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,1)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.75)')}
        >
          Impressum
        </span>
        &nbsp;&middot;&nbsp;
        <span
          className="cursor-default transition-colors"
          style={{ color: 'rgba(255,255,255,0.75)' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,1)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.75)')}
        >
          AGB &amp; Datenschutz
        </span>
      </p>
    </footer>
  );
}

// ============================================================================
// ENDE PortalFooter v7.4.9-1
// ============================================================================
