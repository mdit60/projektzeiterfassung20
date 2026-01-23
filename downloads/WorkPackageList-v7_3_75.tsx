'use client';

// src/components/shared/WorkPackageList.tsx
// ============================================================================
// PZE V7 - Gemeinsame WorkPackageList-Komponente
// ============================================================================
// Datum: 21. Januar 2026
// Version: 7.3.54
//
// Wiederverwendbare Arbeitspakete-Liste fuer:
// - Berater-Portal: Firmen-Detailseite
// - Firmen-Portal: Projekt-Detailseite
//
// Features:
// - Sortierung nach AP-Nummer (natuerlich: AP1, AP1.1, AP2, AP10)
// - Aktions-Buttons: MA zuordnen, Bearbeiten, Loeschen
// - Portal-spezifische Farben via portal-Parameter
// - MA-Zuordnungen mit PM-Werten inline anzeigen
// - Verteilt/Gesamt PM pro AP
// - Stunden-Umrechnung
//
// v7.3.54: MA-Zuordnungen inline anzeigen wie im Berater-Portal
// ============================================================================

import React from 'react';
import { Plus, Users, Pencil, Trash2 } from 'lucide-react';
import { V7PortalType } from '@/types/v7-types';
import { PORTAL_COLORS, HOURS_PER_PM } from '@/lib/v7-constants';

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

export interface WorkPackageAssignment {
  id: string;
  work_package_id: string;
  employee_id: string;
  planned_person_months: number | null;
  planned_hours: number | null;
  role_description: string | null;
  is_active: boolean;
}

export interface Employee {
  id: string;
  display_name: string;
  position_title: string | null;
  weekly_hours: number | null;
}

interface WorkPackageListProps {
  portal: V7PortalType;
  workPackages: WorkPackage[];
  projectId: string;
  // NEU: MA-Zuordnungen und Mitarbeiter-Liste
  assignments?: WorkPackageAssignment[];
  employees?: Employee[];
  // Callbacks
  onAddWorkPackage?: (projectId: string) => void;
  onEditWorkPackage?: (wp: WorkPackage) => void;
  onDeleteWorkPackage?: (wp: WorkPackage) => void;
  onAssignEmployees?: (wp: WorkPackage) => void;
  // Anzeige-Optionen
  showAddButton?: boolean;
  showActionButtons?: boolean;
  showAssignments?: boolean;  // NEU: MA-Zuordnungen anzeigen
  showHeader?: boolean;       // NEU: Header mit Titel und Add-Button anzeigen (default: true)
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
  return `${pm.toFixed(2)} PM`;
}

/**
 * Berechnet Stunden aus PM
 */
function pmToHours(pm: number | null): number {
  if (pm === null || pm === undefined) return 0;
  return Math.round(pm * HOURS_PER_PM);
}

// Farben fuer MA-Tags (rotierend)
const EMPLOYEE_COLORS = [
  { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' },
  { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' },
  { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-200' },
  { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200' },
  { bg: 'bg-pink-100', text: 'text-pink-800', border: 'border-pink-200' },
  { bg: 'bg-teal-100', text: 'text-teal-800', border: 'border-teal-200' },
  { bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-200' },
  { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200' },
];

// ============================================================================
// KOMPONENTE
// ============================================================================

export default function WorkPackageList({
  portal,
  workPackages,
  projectId,
  assignments = [],
  employees = [],
  onAddWorkPackage,
  onEditWorkPackage,
  onDeleteWorkPackage,
  onAssignEmployees,
  showAddButton = true,
  showActionButtons = true,
  showAssignments = true,
  showHeader = true,       // NEU: Standard ist true fuer Abwaertskompatibilitaet
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

  // Map fuer schnellen Mitarbeiter-Lookup
  const employeeMap = React.useMemo(() => {
    const map = new Map<string, Employee>();
    employees.forEach(e => map.set(e.id, e));
    return map;
  }, [employees]);

  // Farb-Map fuer konsistente MA-Farben
  const employeeColorMap = React.useMemo(() => {
    const map = new Map<string, typeof EMPLOYEE_COLORS[0]>();
    employees.forEach((e, idx) => {
      map.set(e.id, EMPLOYEE_COLORS[idx % EMPLOYEE_COLORS.length]);
    });
    return map;
  }, [employees]);

  // Zuordnungen pro AP
  const getAssignmentsForWP = (wpId: string): WorkPackageAssignment[] => {
    return assignments.filter(a => a.work_package_id === wpId && a.is_active);
  };

  // Verteilte PM pro AP
  const getDistributedPM = (wpId: string): number => {
    return getAssignmentsForWP(wpId)
      .reduce((sum, a) => sum + (a.planned_person_months || 0), 0);
  };

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
            ðŸ“‹ {sortedWPs.length} Arbeitspaket{sortedWPs.length !== 1 ? 'e' : ''}
          </span>
          {totalPM > 0 && (
            <>
              <span>Â·</span>
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
  // RENDER: Einzelnes Arbeitspaket (Card-Style)
  // ============================================
  
  const renderWorkPackageCard = (wp: WorkPackage) => {
    const wpAssignments = getAssignmentsForWP(wp.id);
    const distributedPM = getDistributedPM(wp.id);
    const totalWPPM = wp.total_person_months || 0;
    const totalHours = pmToHours(totalWPPM);
    
    return (
      <div
        key={wp.id}
        className="p-4 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow"
      >
        {/* Header-Zeile: AP-Code, Name, Aktionen, PM */}
        <div className="flex items-start justify-between gap-4 mb-2">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <span 
              className="text-sm font-semibold px-2 py-0.5 rounded shrink-0"
              style={{ color: colors.primary }}
            >
              {wp.ap_code || formatAPCode(wp.ap_number, wp.ap_sub_number)}
            </span>
            <span className="text-sm text-gray-900 leading-snug">
              {wp.name}
            </span>
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            {/* Aktions-Buttons */}
            {showActionButtons && (
              <div className="flex items-center gap-1">
                {onEditWorkPackage && (
                  <button
                    onClick={() => onEditWorkPackage(wp)}
                    className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                    title="Bearbeiten"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                )}
                {onAssignEmployees && (
                  <button
                    onClick={() => onAssignEmployees(wp)}
                    className="p-1.5 text-purple-600 hover:bg-purple-100 rounded transition-colors"
                    title="Mitarbeiter zuordnen"
                  >
                    <Users className="w-4 h-4" />
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
            
            {/* PM und Stunden */}
            <div className="text-right pl-3 border-l border-gray-200">
              <div className="text-sm font-semibold" style={{ color: colors.primary }}>
                {formatPM(totalWPPM)}
              </div>
              {totalHours > 0 && (
                <div className="text-xs text-gray-500">
                  = {totalHours} h
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* MA-Zuordnungen */}
        {showAssignments && (
          <div className="mt-3">
            {wpAssignments.length === 0 ? (
              <p className="text-xs text-gray-400 italic">
                Keine Mitarbeiter zugeordnet
              </p>
            ) : (
              <>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {wpAssignments.map(assignment => {
                    const emp = employeeMap.get(assignment.employee_id);
                    const empColors = employeeColorMap.get(assignment.employee_id) || EMPLOYEE_COLORS[0];
                    const pm = assignment.planned_person_months;
                    
                    if (!emp) return null;
                    
                    return (
                      <span
                        key={assignment.id}
                        className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${empColors.bg} ${empColors.text} ${empColors.border}`}
                      >
                        {emp.display_name}
                        {pm !== null && pm > 0 && (
                          <span className="ml-1 opacity-75">
                            ({pm.toFixed(2)} PM)
                          </span>
                        )}
                      </span>
                    );
                  })}
                </div>
                
                {/* Verteilt-Anzeige mit Farbe */}
                {(() => {
                  const hasCapacity = distributedPM < totalWPPM;
                  const isFullyAllocated = totalWPPM > 0 && distributedPM >= totalWPPM;
                  const isOverAllocated = totalWPPM > 0 && distributedPM > totalWPPM;
                  
                  return (
                    <div className={`text-xs ${
                      isOverAllocated 
                        ? 'text-red-600 font-medium' 
                        : isFullyAllocated 
                          ? 'text-gray-500' 
                          : 'text-green-600'
                    }`}>
                      Verteilt: {distributedPM.toFixed(2)} / {totalWPPM.toFixed(2)} PM
                      {isOverAllocated && ' ⚠️'}
                      {isFullyAllocated && !isOverAllocated && ' ✓'}
                    </div>
                  );
                })()}
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  // ============================================
  // RENDER: Hauptkomponente
  // ============================================
  
  return (
    <div className={className}>
      {renderHeader()}
      
      {(!isCollapsible || isExpanded) && (
        <div className="space-y-3">
          {/* Header mit Add-Button (optional) */}
          {showHeader && (
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">Arbeitspakete</h3>
              {showAddButton && onAddWorkPackage && (
                <button
                  onClick={() => onAddWorkPackage(projectId)}
                  className="px-3 py-1.5 text-sm text-white rounded-lg flex items-center gap-1.5 transition-colors"
                  style={{ backgroundColor: colors.primary }}
                >
                  <Plus className="w-4 h-4" />
                  AP hinzufuegen
                </button>
              )}
            </div>
          )}
          
          {/* Arbeitspakete-Cards */}
          <div className="space-y-2">
            {sortedWPs.map(wp => renderWorkPackageCard(wp))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// ENDE
// ============================================================================
