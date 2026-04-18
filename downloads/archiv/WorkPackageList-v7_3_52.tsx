'use client';

// src/components/shared/WorkPackageList.tsx
// ============================================================================
// PZE V7 - Gemeinsame WorkPackageList-Komponente
// ============================================================================
// Datum: 21. Januar 2026
// Version: 7.3.52
//
// Wiederverwendbare Arbeitspakete-Liste fuer:
// - Berater-Portal: Firmen-Detailseite
// - Firmen-Portal: Projekt-Detailseite
//
// Features:
// - Sortierung nach AP-Nummer (natuerlich: AP1, AP1.1, AP2, AP10)
// - Aktions-Buttons: MA zuordnen, Bearbeiten, Loeschen
// - Portal-spezifische Farben via portal-Parameter
// ============================================================================

import React from 'react';
import { Plus, Users, Pencil, Trash2 } from 'lucide-react';
import { V7PortalType } from '@/types/v7-types';
import { PORTAL_COLORS } from '@/lib/v7-constants';

// ============================================================================
// TYPEN
// ============================================================================

export interface WorkPackage {
  id: string;
  project_id: string;
  ap_number: number;
  ap_sub_number: number | null;
  ap_code: string | null;
  name: string;
  description: string | null;
  start_month: number | null;
  end_month: number | null;
  total_person_months: number | null;
  total_costs: number | null;
  is_active: boolean;
}

interface WorkPackageListProps {
  portal: V7PortalType;
  workPackages: WorkPackage[];
  projectId: string;
  onAddWorkPackage?: (projectId: string) => void;
  onEditWorkPackage?: (wp: WorkPackage) => void;
  onDeleteWorkPackage?: (wp: WorkPackage) => void;
  onAssignEmployees?: (wp: WorkPackage) => void;
  showAddButton?: boolean;
  showActionButtons?: boolean;
  isCollapsible?: boolean;
  initialExpanded?: boolean;
  className?: string;
}

// ============================================================================
// HELPER FUNKTIONEN
// ============================================================================

/**
 * Natuerliche Sortierung fuer AP-Codes (AP1, AP1.1, AP1.2, AP2, AP10, etc.)
 */
export function sortWorkPackages(wps: WorkPackage[]): WorkPackage[] {
  return [...wps].sort((a, b) => {
    // Primaer: Nach ap_number sortieren
    if (a.ap_number !== b.ap_number) {
      return a.ap_number - b.ap_number;
    }
    
    // Sekundaer: Nach ap_sub_number (0/null fuer Hauptpakete, 1/2/3 fuer Unterpakete)
    const subA = a.ap_sub_number ?? 0;
    const subB = b.ap_sub_number ?? 0;
    if (subA !== subB) {
      return subA - subB;
    }
    
    // Fallback: ap_code parsen (fuer aeltere Daten ohne ap_sub_number)
    const codeA = a.ap_code || `AP${a.ap_number}`;
    const codeB = b.ap_code || `AP${b.ap_number}`;
    
    const partsA = codeA.replace(/^AP/i, '').split('.').map(p => parseInt(p) || 0);
    const partsB = codeB.replace(/^AP/i, '').split('.').map(p => parseInt(p) || 0);
    
    for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
      const numA = partsA[i] || 0;
      const numB = partsB[i] || 0;
      if (numA !== numB) return numA - numB;
    }
    return 0;
  });
}

/**
 * Formatiert AP-Code aus Nummer und Unternummer
 */
export function formatAPCode(apNumber: number, apSubNumber: number | null): string {
  if (apSubNumber === null || apSubNumber === 0) {
    return `AP${apNumber}`;
  }
  return `AP${apNumber}.${apSubNumber}`;
}

/**
 * Formatiert PM-Wert
 */
function formatPM(pm: number | null): string {
  if (pm === null || pm === undefined) return '-';
  return `${pm.toFixed(pm % 1 === 0 ? 0 : 2)} PM`;
}

// ============================================================================
// KOMPONENTE
// ============================================================================

export default function WorkPackageList({
  portal,
  workPackages,
  projectId,
  onAddWorkPackage,
  onEditWorkPackage,
  onDeleteWorkPackage,
  onAssignEmployees,
  showAddButton = true,
  showActionButtons = true,
  isCollapsible = false,
  initialExpanded = true,
  className = '',
}: WorkPackageListProps) {
  const colors = PORTAL_COLORS[portal];
  const [isExpanded, setIsExpanded] = React.useState(initialExpanded);
  
  // Sortierte Arbeitspakete
  const sortedWPs = sortWorkPackages(workPackages);
  
  // Gesamt-PM berechnen
  const totalPM = sortedWPs.reduce((sum, wp) => sum + (wp.total_person_months || 0), 0);

  // ============================================
  // RENDER: Leere Liste
  // ============================================
  
  if (sortedWPs.length === 0) {
    return (
      <div className={`flex items-center justify-between p-3 bg-gray-50 rounded-lg ${className}`}>
        <span className="text-sm text-gray-500 italic">Keine Arbeitspakete vorhanden.</span>
        {showAddButton && onAddWorkPackage && (
          <button
            onClick={() => onAddWorkPackage(projectId)}
            className="px-3 py-1 text-sm rounded flex items-center gap-1 transition-colors"
            style={{ color: colors.primary }}
          >
            <Plus className="w-4 h-4" />
            Hinzufuegen
          </button>
        )}
      </div>
    );
  }

  // ============================================
  // RENDER: Collapsible Header
  // ============================================
  
  const renderHeader = () => {
    if (!isCollapsible) return null;
    
    return (
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-left hover:bg-gray-50 rounded p-2 -m-2 transition-colors mb-3"
      >
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span className="font-medium">
            <span className="mr-1">📋</span>
            {sortedWPs.length} Arbeitspaket{sortedWPs.length !== 1 ? 'e' : ''}
          </span>
          {totalPM > 0 && (
            <>
              <span>·</span>
              <span>{totalPM.toFixed(1)} PM gesamt</span>
            </>
          )}
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    );
  };

  // ============================================
  // RENDER: Tabelle
  // ============================================
  
  const renderTable = () => (
    <div className="border rounded-lg overflow-hidden">
      {/* Tabellen-Header */}
      <div className="bg-gray-100 px-4 py-2 flex items-center text-xs font-medium text-gray-600 uppercase border-b">
        <div className="w-16">AP</div>
        <div className="flex-1">Bezeichnung</div>
        <div className="w-24 text-right">PM</div>
        {showActionButtons && (
          <div className="w-32 text-right">
            {showAddButton && onAddWorkPackage && (
              <button
                onClick={() => onAddWorkPackage(projectId)}
                className="normal-case font-normal flex items-center gap-1 ml-auto transition-colors"
                style={{ color: colors.primary }}
              >
                <Plus className="w-3 h-3" />
                Hinzufuegen
              </button>
            )}
          </div>
        )}
      </div>
      
      {/* Tabellen-Body */}
      {sortedWPs.map((wp, idx) => (
        <div
          key={wp.id}
          className={`px-4 py-3 flex items-center hover:bg-gray-50 ${idx < sortedWPs.length - 1 ? 'border-b' : ''}`}
        >
          <div className="w-16">
            <span className="text-xs font-mono bg-gray-200 px-1.5 py-0.5 rounded">
              {wp.ap_code || formatAPCode(wp.ap_number, wp.ap_sub_number)}
            </span>
          </div>
          <div className="flex-1 text-sm text-gray-900">{wp.name}</div>
          <div className="w-24 text-right text-sm text-gray-600">
            {formatPM(wp.total_person_months)}
          </div>
          {showActionButtons && (
            <div className="w-32 flex justify-end gap-1">
              {onAssignEmployees && (
                <button
                  onClick={() => onAssignEmployees(wp)}
                  className="p-1.5 text-purple-600 hover:bg-purple-100 rounded transition-colors"
                  title="Mitarbeiter zuordnen"
                >
                  <Users className="w-4 h-4" />
                </button>
              )}
              {onEditWorkPackage && (
                <button
                  onClick={() => onEditWorkPackage(wp)}
                  className="p-1.5 text-gray-600 hover:bg-gray-200 rounded transition-colors"
                  title="Bearbeiten"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              )}
              {onDeleteWorkPackage && (
                <button
                  onClick={() => onDeleteWorkPackage(wp)}
                  className="p-1.5 text-red-500 hover:bg-red-100 rounded transition-colors"
                  title="Loeschen"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );

  // ============================================
  // RENDER: Hauptkomponente
  // ============================================
  
  return (
    <div className={className}>
      {renderHeader()}
      {(!isCollapsible || isExpanded) && renderTable()}
    </div>
  );
}

// ============================================================================
// ENDE
// ============================================================================
