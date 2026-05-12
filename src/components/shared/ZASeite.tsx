'use client';

// src/components/shared/ZASeite.tsx
// ============================================================================
// PZE V8-C - Standalone Zahlungsanforderungs-Seite
// ============================================================================
// Datum: 9. Mai 2026
// Version: 1.0.8
// v1.0.8: "Zurueck zum Cockpit" -> "Zurueck" (kein Cockpit-Begriff mehr in UI)
// v1.0.7: Volle Breite ohne max-w Einschraenkung
// v1.0.6: Schriftgroesse angepasst (text-xs->1rem, text-sm->1.125rem) - identisch FirmaCockpit
//
// Zweck:
//   Eigenstaendige ZA-Seite ohne BerichtePage-Dashboard-Overhead.
//   Wird vom FirmaCockpit direkt aufgerufen wenn der Nutzer auf eine
//   ZA-Nummer klickt.
//
//   Architektur V8-C:
//   - Nutzt useBerichteData fuer Datenladen
//   - Rendert nur: PortalHeader + PortalNav + ZAPanel + PortalFooter
//   - Kein Dashboard, keine Kacheln, kein Overhead
//   - Zurueck-Button navigiert zum Cockpit (returnTo=cockpit)
//     oder zur Firma-Detailseite (Standard)
//
// Props:
//   portal          - 'berater' | 'firma'
//   clientCompanyId - Firmen-ID (Berater: aus Route, Firma: null -> aus Profil)
//   initialProjektId - Projekt vorselektieren (optional)
//   initialZaId     - ZA vorselektieren (optional)
//   returnTo        - Ziel des Zurueck-Buttons ('cockpit' | undefined)
// ============================================================================

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import PortalHeader from '@/components/shared/PortalHeader';
import PortalNav from '@/components/shared/PortalNav';
import PortalFooter from '@/components/shared/PortalFooter';
import ZAPanel from '@/components/shared/ZAPanel';
import { useBerichteData } from '@/hooks/useBerichteData';
import { V7PortalType, V7UserRole } from '@/types/v7-types';

// ============================================================================
// TYPEN
// ============================================================================

interface ZASeiteProps {
  portal: V7PortalType;
  clientCompanyId: string | null;
  initialProjektId?: string;
  initialZaId?: string;
  returnTo?: string;
}

// ============================================================================
// KOMPONENTE
// ============================================================================

export default function ZASeite({
  portal,
  clientCompanyId,
  initialProjektId,
  initialZaId,
  returnTo,
}: ZASeiteProps) {

  // Daten laden via shared hook
  const {
    loading,
    error,
    company,
    projects,
    employees,
    workPackages,
    wpAssignments,
    timesheets,
    projectAssignments,
    portalRole,
    userProfile,
  } = useBerichteData({ companyId: clientCompanyId, portal });

  // Zurueck-URL bestimmen
  const zurueckUrl = portal === 'berater'
    ? returnTo === 'cockpit'
      ? `/v7/berater/foerderung/firma/${clientCompanyId}/cockpit`
      : `/v7/berater/foerderung/firma/${clientCompanyId}`
    : '/v7/firma/dashboard';

  const zurueckLabel = '\u2190 Zurueck';

  // ============================================================================
  // LOADING
  // ============================================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PortalHeader
          portal={portal}
          userRole={portalRole as V7UserRole || 'consultant'}
          userName={userProfile?.display_name || ''}
          companyName={company?.name || ''}
        />
        <PortalNav portal={portal} userRole={portalRole as V7UserRole || 'consultant'} />
        <div className="flex items-center justify-center py-20">
          <div className="text-gray-500">Daten werden geladen...</div>
        </div>
        <PortalFooter portal={portal} />
      </div>
    );
  }

  // ============================================================================
  // FEHLER
  // ============================================================================

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PortalHeader
          portal={portal}
          userRole={portalRole as V7UserRole || 'consultant'}
          userName={userProfile?.display_name || ''}
          companyName={company?.name || ''}
        />
        <PortalNav portal={portal} userRole={portalRole as V7UserRole || 'consultant'} />
        <div className="max-w-2xl mx-auto px-4 py-12">
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-6 py-4">
            {error}
          </div>
        </div>
        <PortalFooter portal={portal} />
      </div>
    );
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="min-h-screen bg-gray-50">

      <PortalHeader
        portal={portal}
        userRole={portalRole as V7UserRole || 'consultant'}
        userName={userProfile?.display_name || ''}
        companyName={company?.name || ''}
      />

      <PortalNav portal={portal} userRole={portalRole as V7UserRole || 'consultant'} />

      <style>{`
        #za-seite-content .text-xs { font-size: 1rem !important; line-height: 1.5rem !important; }
        #za-seite-content .text-sm { font-size: 1.125rem !important; line-height: 1.75rem !important; }
      `}</style>
      <div id="za-seite-content" className="w-full px-6 py-6 pb-12">

        {/* Zurueck-Navigation */}
        <div className="flex items-center gap-4 mb-6">
          <a
            href={zurueckUrl}
            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm"
          >
            {zurueckLabel}
          </a>
          {company && (
            <>
              <span className="text-gray-300">|</span>
              <span className="text-sm text-gray-600 font-medium">{company.name}</span>
            </>
          )}
        </div>

        {/* ZAPanel - direkt, ohne Kacheln */}
        {projects.length === 0 ? (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg px-6 py-4 text-sm">
            Keine aktiven Projekte gefunden.
          </div>
        ) : (
          <ZAPanel
            portal={portal}
            projects={initialProjektId
              ? projects.filter(p => p.id === initialProjektId)
              : projects}
            workPackages={workPackages}
            wpAssignments={wpAssignments}
            employees={employees}
            timesheets={timesheets}
            projectAssignments={projectAssignments}
            initialProjectId={initialProjektId}
            initialZaId={initialZaId}
          />
        )}

      </div>

      <PortalFooter portal={portal} />

    </div>
  );
}

// ============================================================================
// ENDE ZASeite v1.0.0
// ============================================================================
