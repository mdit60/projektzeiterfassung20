'use client';

// src/components/shared/WorkPackageAssignmentModal.tsx
// ============================================================================
// PZE V7 - Gemeinsame WorkPackageAssignmentModal-Komponente
// ============================================================================
// Datum: 21. Januar 2026
// Version: 7.3.52
//
// Wiederverwendbares Modal fuer:
// - Mitarbeiter zu Arbeitspaketen zuordnen
// - PM-Werte eingeben und aendern
// - Zeigt nur MA die dem Projekt zugeordnet sind
//
// Portal-unabhaengig: Farben werden via portal-Parameter gesteuert
// ============================================================================

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { V7PortalType } from '@/types/v7-types';
import { PORTAL_COLORS, HOURS_PER_PM } from '@/lib/v7-constants';

// ============================================================================
// TYPEN
// ============================================================================

export interface Employee {
  id: string;
  display_name: string;
  position_title: string | null;
  weekly_hours: number | null;
}

export interface WorkPackage {
  id: string;
  project_id: string;
  ap_number: number;
  ap_sub_number: number | null;
  ap_code: string | null;
  name: string;
  total_person_months: number | null;
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

interface WorkPackageAssignmentModalProps {
  portal: V7PortalType;
  isOpen: boolean;
  onClose: () => void;
  workPackage: WorkPackage | null;
  
  // Alle Mitarbeiter der Firma
  allEmployees: Employee[];
  
  // IDs der MA die dem PROJEKT zugeordnet sind
  projectEmployeeIds: string[];
  
  // Bestehende Zuordnungen fuer dieses AP
  assignments: WorkPackageAssignment[];
  
  // Callbacks
  onAddAssignment: (employeeId: string, pm: number | null) => Promise<void>;
  onUpdateAssignment: (employeeId: string, pm: number | null) => Promise<void>;
  onRemoveAssignment: (employeeId: string) => Promise<void>;
  
  // Loading-State
  saving?: boolean;
}

// ============================================================================
// HELPER
// ============================================================================

function formatAPCode(wp: WorkPackage): string {
  if (wp.ap_code) return wp.ap_code;
  if (wp.ap_sub_number === null || wp.ap_sub_number === 0) {
    return `AP${wp.ap_number}`;
  }
  return `AP${wp.ap_number}.${wp.ap_sub_number}`;
}

function pmToHours(pm: number | null): string {
  if (pm === null || pm === undefined || pm === 0) return '-';
  return `${(pm * HOURS_PER_PM).toFixed(0)} h`;
}

// ============================================================================
// KOMPONENTE
// ============================================================================

export default function WorkPackageAssignmentModal({
  portal,
  isOpen,
  onClose,
  workPackage,
  allEmployees,
  projectEmployeeIds,
  assignments,
  onAddAssignment,
  onUpdateAssignment,
  onRemoveAssignment,
  saving = false,
}: WorkPackageAssignmentModalProps) {
  const colors = PORTAL_COLORS[portal];
  
  // Lokaler State fuer PM-Eingaben
  const [pmValues, setPmValues] = useState<Record<string, string>>({});
  
  // PM-Werte initialisieren wenn Modal oeffnet
  useEffect(() => {
    if (isOpen && workPackage) {
      const values: Record<string, string> = {};
      assignments.forEach(a => {
        if (a.work_package_id === workPackage.id) {
          values[a.employee_id] = a.planned_person_months?.toString() || '';
        }
      });
      setPmValues(values);
    }
  }, [isOpen, workPackage, assignments]);
  
  if (!isOpen || !workPackage) return null;
  
  // ============================================
  // BERECHNETE WERTE
  // ============================================
  
  // Zugeordnete MA (nur aktive Zuordnungen fuer dieses AP)
  const assignedEmployeeIds = assignments
    .filter(a => a.work_package_id === workPackage.id && a.is_active)
    .map(a => a.employee_id);
  
  const assignedEmployees = allEmployees.filter(e => 
    assignedEmployeeIds.includes(e.id)
  );
  
  // Verfuegbare MA (dem Projekt zugeordnet, aber nicht diesem AP)
  const availableEmployees = allEmployees.filter(e => 
    projectEmployeeIds.includes(e.id) && !assignedEmployeeIds.includes(e.id)
  );
  
  // Summe der verteilten PM
  const distributedPM = assignments
    .filter(a => a.work_package_id === workPackage.id && a.is_active)
    .reduce((sum, a) => sum + (a.planned_person_months || 0), 0);
  
  // ============================================
  // HANDLER
  // ============================================
  
  const handlePMChange = (employeeId: string, value: string) => {
    setPmValues(prev => ({ ...prev, [employeeId]: value }));
  };
  
  const handleAddEmployee = async (employeeId: string) => {
    const pm = parseFloat(pmValues[employeeId] || '0') || null;
    await onAddAssignment(employeeId, pm);
    // PM-Wert aus lokalem State entfernen nach Hinzufuegen
    setPmValues(prev => {
      const next = { ...prev };
      delete next[employeeId];
      return next;
    });
  };
  
  const handleUpdatePM = async (employeeId: string) => {
    const pm = parseFloat(pmValues[employeeId] || '0') || null;
    await onUpdateAssignment(employeeId, pm);
  };
  
  const handleRemoveEmployee = async (employeeId: string) => {
    await onRemoveAssignment(employeeId);
  };
  
  // ============================================
  // RENDER
  // ============================================
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              MA zu Arbeitspaket zuordnen
            </h3>
            <p className="text-sm text-gray-500">
              {formatAPCode(workPackage)}: {workPackage.name}
            </p>
            {workPackage.total_person_months && (
              <p className="text-xs text-gray-400">
                Gesamt: {workPackage.total_person_months.toFixed(2)} PM ({pmToHours(workPackage.total_person_months)})
              </p>
            )}
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Zugeordnete Mitarbeiter */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
              Zugeordnet ({assignedEmployees.length})
            </h4>
            
            {assignedEmployees.length === 0 ? (
              <p className="text-sm text-gray-400 italic pl-4">
                Keine Mitarbeiter zugeordnet
              </p>
            ) : (
              <div className="space-y-2">
                {assignedEmployees.map(emp => {
                  const assignment = assignments.find(
                    a => a.work_package_id === workPackage.id && a.employee_id === emp.id
                  );
                  const currentPM = assignment?.planned_person_months;
                  const localPM = pmValues[emp.id] ?? currentPM?.toString() ?? '';
                  
                  return (
                    <div
                      key={emp.id}
                      className="p-3 bg-purple-50 rounded-lg border border-purple-200"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-medium text-gray-900">{emp.display_name}</div>
                          {emp.position_title && (
                            <div className="text-sm text-gray-500">{emp.position_title}</div>
                          )}
                        </div>
                        <button
                          onClick={() => handleRemoveEmployee(emp.id)}
                          disabled={saving}
                          className="p-1 text-red-600 hover:bg-red-100 rounded disabled:opacity-50 transition-colors"
                          title="Zuordnung entfernen"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-gray-600">PM:</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={localPM}
                          onChange={(e) => handlePMChange(emp.id, e.target.value)}
                          onBlur={() => handleUpdatePM(emp.id)}
                          disabled={saving}
                          className="w-20 px-2 py-1 text-sm border border-gray-300 rounded 
                                     focus:ring-1 focus:ring-purple-500 disabled:opacity-50"
                        />
                        {currentPM && currentPM > 0 && (
                          <span className="text-xs text-gray-500">
                            = {pmToHours(currentPM)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            
            {/* Summe */}
            {assignedEmployees.length > 0 && (
              <div className="mt-3 p-2 bg-gray-100 rounded text-sm">
                <div className="flex justify-between">
                  <span>Verteilt:</span>
                  <span className="font-medium">{distributedPM.toFixed(2)} PM</span>
                </div>
                {workPackage.total_person_months && (
                  <div className="flex justify-between text-gray-500">
                    <span>Gesamt AP:</span>
                    <span>{workPackage.total_person_months.toFixed(2)} PM</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Verfuegbare Mitarbeiter */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
              Verfuegbar aus Projekt ({availableEmployees.length})
            </h4>
            
            {availableEmployees.length === 0 ? (
              <p className="text-sm text-gray-400 italic pl-4">
                {projectEmployeeIds.length === 0
                  ? 'Keine MA dem Projekt zugeordnet'
                  : 'Alle Projekt-MA sind diesem AP zugeordnet'}
              </p>
            ) : (
              <div className="space-y-2">
                {availableEmployees.map(emp => (
                  <div
                    key={emp.id}
                    className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-medium text-gray-900">{emp.display_name}</div>
                        {emp.position_title && (
                          <div className="text-sm text-gray-500">{emp.position_title}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-600">PM:</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={pmValues[emp.id] || ''}
                        onChange={(e) => handlePMChange(emp.id, e.target.value)}
                        disabled={saving}
                        className="w-20 px-2 py-1 text-sm border border-gray-300 rounded 
                                   focus:ring-1 focus:ring-purple-500 disabled:opacity-50"
                      />
                      <button
                        onClick={() => handleAddEmployee(emp.id)}
                        disabled={saving}
                        className="px-3 py-1 text-sm text-white rounded 
                                   disabled:opacity-50 transition-colors"
                        style={{ backgroundColor: '#9333ea' }}
                      >
                        Hinzufuegen
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-white rounded-lg transition-colors"
            style={{ backgroundColor: '#9333ea' }}
          >
            Fertig
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// ENDE
// ============================================================================
