// src/components/shared/WorkPackageTable.tsx
// ============================================================================
// PZE V7 - Arbeitsplan-Tabelle (Excel-Style mit Inline-Edit)
// ============================================================================
// Datum: 24. Januar 2026
// Version: 7.3.84
//
// SHARED COMPONENT - wird von beiden Portalen genutzt:
// - Berater-Portal: /v7/berater/foerderung/firma/[id]/projekt/[projektId]
// - Firmen-Portal: /v7/firma/projekte/[projektId]
//
// Zeigt Arbeitspakete als Tabelle mit:
// - Spalten fuer jeden Mitarbeiter
// - Inline-Edit fuer PM-Werte (wie Zeiterfassung)
// - Summen pro MA und pro AP
// - Zeitraum pro AP (von/bis)
//
// Props:
// - projectId: string
// - employees: Employee[]
// - workPackages: WorkPackage[]
// - assignments: Assignment[]
// - canEdit: boolean
// - onAssignmentChange: (apId, empId, pm) => Promise<void>
// - onAddAP: () => void
// - onEditAP: (ap) => void
// - onDeleteAP: (ap) => void
// - portal: 'berater' | 'firma'
// ============================================================================

'use client';

import React, { useState, useRef, useMemo } from 'react';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';

// ============================================================================
// TYPEN
// ============================================================================

interface Employee {
  id: string;
  display_name: string;
  first_name: string | null;
  last_name: string | null;
  employee_number: number | null;  // Fallback aus v7_employees
}

// Projektspezifische Team-Zuordnung
interface ProjectTeamMember {
  id: string;
  project_id: string;
  employee_id: string;
  employee_number: number | null;  // Projektspezifische lfd. Nr.
  role_in_project: string | null;
  hourly_rate_override: number | null;
}

interface WorkPackage {
  id: string;
  ap_code: string;
  ap_number: number;
  ap_sub_number: number | null;
  name: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  planned_pm: number | null;
}

interface Assignment {
  id: string;
  work_package_id: string;
  employee_id: string;
  planned_pm: number;
}

interface WorkPackageTableProps {
  projectId: string;
  employees: Employee[];
  workPackages: WorkPackage[];
  assignments: Assignment[];
  projectTeam?: ProjectTeamMember[];  // NEU: Projektspezifische MA-Nummern (optional fuer Rueckwaertskompatibilitaet)
  canEdit: boolean;
  onAssignmentChange: (workPackageId: string, employeeId: string, plannedPm: number | null) => Promise<void>;
  onAddAP?: () => void;
  onEditAP?: (wp: WorkPackage) => void;
  onDeleteAP?: (wp: WorkPackage) => void;
  portal?: 'berater' | 'firma';
}

// ============================================================================
// KONSTANTEN
// ============================================================================

const PORTAL_COLORS = {
  berater: {
    header: 'bg-sky-700',
    headerText: 'text-white',
    button: 'bg-sky-600 hover:bg-sky-700',
    focus: 'focus:ring-sky-500',
    highlight: 'bg-sky-50',
  },
  firma: {
    header: 'bg-green-600',
    headerText: 'text-white',
    button: 'bg-green-600 hover:bg-green-700',
    focus: 'focus:ring-green-500',
    highlight: 'bg-green-50',
  },
};

// ============================================================================
// HILFSFUNKTIONEN
// ============================================================================

// Datum formatieren: "10/25"
const formatDateShort = (dateStr: string | null): string => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear().toString().slice(-2);
  return `${month}/${year}`;
};

// MA-Kurzname: "Nachname" oder "Nachname, V."
const getShortName = (emp: Employee): string => {
  if (emp.last_name) {
    const initial = emp.first_name ? emp.first_name.charAt(0) + '.' : '';
    // Nur Nachname wenn zu lang
    const fullShort = `${emp.last_name}${initial ? ', ' + initial : ''}`;
    return fullShort.length > 12 ? emp.last_name : fullShort;
  }
  const parts = emp.display_name.split(',');
  return parts[0]?.trim() || emp.display_name;
};

// Sortiere APs numerisch: 1, 1.1, 1.2, 2, 2.1, 10, 10.1
const sortWorkPackages = (wps: WorkPackage[]): WorkPackage[] => {
  return [...wps].sort((a, b) => {
    const aParts = a.ap_code.split('.').map(Number);
    const bParts = b.ap_code.split('.').map(Number);
    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
      const aVal = aParts[i] || 0;
      const bVal = bParts[i] || 0;
      if (aVal !== bVal) return aVal - bVal;
    }
    return 0;
  });
};

// ============================================================================
// INLINE-EDIT ZELLE
// ============================================================================

interface EditableCellProps {
  value: number | null;
  canEdit: boolean;
  onChange: (newValue: number | null) => Promise<void>;
  portalColors: typeof PORTAL_COLORS.firma;
}

function EditableCell({ value, canEdit, onChange, portalColors }: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    if (!canEdit) return;
    setEditValue(value?.toString() || '');
    setIsEditing(true);
    setTimeout(() => inputRef.current?.select(), 10);
  };

  const handleSave = async () => {
    const trimmed = editValue.trim();
    const newValue = trimmed === '' ? null : parseFloat(trimmed.replace(',', '.'));
    
    // Keine Aenderung?
    if (newValue === value || (newValue === null && value === null)) {
      setIsEditing(false);
      return;
    }

    // Validierung
    if (newValue !== null && (isNaN(newValue) || newValue < 0)) {
      setIsEditing(false);
      return;
    }

    setSaving(true);
    try {
      await onChange(newValue);
    } catch (err) {
      console.error('Fehler beim Speichern:', err);
    } finally {
      setSaving(false);
      setIsEditing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
    } else if (e.key === 'Tab') {
      handleSave();
    }
  };

  const handleBlur = () => {
    handleSave();
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        disabled={saving}
        className={`w-full h-full px-1 py-0.5 text-center text-sm border-2 border-blue-500 rounded outline-none ${
          saving ? 'bg-gray-100' : 'bg-white'
        }`}
        style={{ minWidth: '50px' }}
        autoFocus
      />
    );
  }

  const hasValue = value !== null && value > 0;

  return (
    <div
      onClick={handleClick}
      className={`w-full h-full px-2 py-1 text-center text-sm cursor-pointer transition-colors ${
        hasValue 
          ? 'text-gray-900 font-medium' 
          : 'text-gray-300'
      } ${
        canEdit 
          ? 'hover:bg-blue-50 hover:text-blue-700' 
          : ''
      }`}
      title={canEdit ? 'Klicken zum Bearbeiten' : undefined}
    >
      {hasValue ? value.toFixed(2).replace('.', ',') : '-'}
    </div>
  );
}

// ============================================================================
// HAUPTKOMPONENTE
// ============================================================================

export default function WorkPackageTable({
  projectId,
  employees,
  workPackages,
  assignments,
  projectTeam = [],
  canEdit,
  onAssignmentChange,
  onAddAP,
  onEditAP,
  onDeleteAP,
  portal = 'firma',
}: WorkPackageTableProps) {
  const colors = PORTAL_COLORS[portal];

  // ProjectTeam-Map: employeeId -> ProjectTeamMember
  const projectTeamMap = useMemo(() => {
    const map = new Map<string, ProjectTeamMember>();
    projectTeam.forEach(pt => {
      map.set(pt.employee_id, pt);
    });
    return map;
  }, [projectTeam]);

  // Projektspezifische Nummer holen (Fallback auf employee.employee_number)
  const getEmployeeNumber = (emp: Employee): number | null => {
    const teamMember = projectTeamMap.get(emp.id);
    return teamMember?.employee_number ?? emp.employee_number ?? null;
  };

  // Sortierte Mitarbeiter (nach projektspezifischer Nummer, dann Name)
  const sortedEmployees = useMemo(() => {
    return [...employees].sort((a, b) => {
      const numA = getEmployeeNumber(a);
      const numB = getEmployeeNumber(b);
      if (numA !== null && numB !== null) {
        return numA - numB;
      }
      if (numA !== null) return -1;
      if (numB !== null) return 1;
      return a.display_name.localeCompare(b.display_name, 'de');
    });
  }, [employees, projectTeamMap]);

  const sortedWPs = useMemo(() => sortWorkPackages(workPackages), [workPackages]);

  // Assignment-Map: "wpId-empId" -> Assignment
  const assignmentMap = useMemo(() => {
    const map = new Map<string, Assignment>();
    assignments.forEach(a => {
      map.set(`${a.work_package_id}-${a.employee_id}`, a);
    });
    return map;
  }, [assignments]);

  // PM-Wert fuer WP+MA holen
  const getPM = (wpId: string, empId: string): number | null => {
    const assignment = assignmentMap.get(`${wpId}-${empId}`);
    return assignment?.planned_pm ?? null;
  };

  // Summen berechnen
  const sums = useMemo(() => {
    // Pro Mitarbeiter
    const perEmployee = new Map<string, number>();
    sortedEmployees.forEach(emp => perEmployee.set(emp.id, 0));

    // Pro Arbeitspaket
    const perWP = new Map<string, number>();
    sortedWPs.forEach(wp => perWP.set(wp.id, 0));

    // Gesamt
    let total = 0;

    assignments.forEach(a => {
      const pm = a.planned_pm || 0;
      perEmployee.set(a.employee_id, (perEmployee.get(a.employee_id) || 0) + pm);
      perWP.set(a.work_package_id, (perWP.get(a.work_package_id) || 0) + pm);
      total += pm;
    });

    return { perEmployee, perWP, total };
  }, [assignments, sortedEmployees, sortedWPs]);

  // Handler fuer Zellen-Aenderung
  const handleCellChange = async (wpId: string, empId: string, newPm: number | null) => {
    await onAssignmentChange(wpId, empId, newPm);
  };

  // Leerer Zustand
  if (workPackages.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <div className="text-4xl mb-4">📋</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Keine Arbeitspakete vorhanden</h3>
        <p className="text-gray-500 mb-4">
          Legen Sie Arbeitspakete an, um den Arbeitsplan zu erstellen.
        </p>
        {canEdit && onAddAP && (
          <button
            onClick={onAddAP}
            className={`inline-flex items-center gap-2 px-4 py-2 text-white rounded-lg ${colors.button}`}
          >
            <Plus size={18} />
            Arbeitspaket anlegen
          </button>
        )}
      </div>
    );
  }

  // Keine Mitarbeiter
  if (employees.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <div className="text-4xl mb-4">👥</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Keine Mitarbeiter zugeordnet</h3>
        <p className="text-gray-500">
          Fuegen Sie zuerst Mitarbeiter zum Projekt-Team hinzu.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center px-4 py-3 border-b bg-gray-50">
        <h3 className="font-semibold text-gray-900">Arbeitsplan</h3>
        <div className="flex gap-2">
          {canEdit && onAddAP && (
            <button
              onClick={onAddAP}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-white rounded-lg ${colors.button}`}
            >
              <Plus size={16} />
              AP hinzufuegen
            </button>
          )}
        </div>
      </div>

      {/* Tabelle mit horizontalem Scroll */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          {/* Tabellenkopf */}
          <thead>
            {/* Zeile 1: Gruppierung */}
            <tr className="bg-gray-100 border-b">
              <th className="px-3 py-2 text-left font-medium text-gray-600 border-r" style={{ minWidth: '60px' }}>
                AP
              </th>
              <th className="px-3 py-2 text-left font-medium text-gray-600 border-r" style={{ minWidth: '200px' }}>
                Beschreibung
              </th>
              <th className="px-2 py-2 text-center font-medium text-gray-600 border-r" style={{ minWidth: '55px' }}>
                von
              </th>
              <th className="px-2 py-2 text-center font-medium text-gray-600 border-r" style={{ minWidth: '55px' }}>
                bis
              </th>
              {/* MA-Spalten */}
              {sortedEmployees.map((emp, idx) => {
                const empNumber = getEmployeeNumber(emp);
                return (
                  <th
                    key={emp.id}
                    className={`px-1 py-2 text-center font-medium text-gray-700 ${
                      idx < sortedEmployees.length - 1 ? 'border-r border-gray-200' : 'border-r'
                    }`}
                    style={{ minWidth: '70px', maxWidth: '90px' }}
                    title={`${emp.display_name}${empNumber ? ` (MA #${empNumber})` : ''}`}
                  >
                    <div className="truncate text-xs">
                      {empNumber && (
                        <span className="text-gray-400 mr-1">#{empNumber}</span>
                      )}
                      {getShortName(emp)}
                    </div>
                  </th>
                );
              })}
              {/* Summe */}
              <th className="px-2 py-2 text-center font-semibold text-gray-700 bg-gray-200" style={{ minWidth: '70px' }}>
                Summe
              </th>
              {/* Aktionen */}
              {canEdit && (
                <th className="px-2 py-2 text-center font-medium text-gray-600" style={{ minWidth: '60px' }}>
                  
                </th>
              )}
            </tr>
          </thead>

          {/* Tabellenkoerper */}
          <tbody>
            {sortedWPs.map((wp, wpIdx) => {
              const wpSum = sums.perWP.get(wp.id) || 0;
              const isSubAP = wp.ap_code.includes('.') && wp.ap_code.split('.').length > 1;

              return (
                <tr
                  key={wp.id}
                  className={`border-b hover:bg-gray-50 ${
                    isSubAP ? 'bg-white' : 'bg-gray-50'
                  }`}
                >
                  {/* AP-Nummer */}
                  <td className={`px-3 py-2 border-r font-mono text-sm ${
                    isSubAP ? 'text-gray-600 pl-5' : 'font-semibold text-gray-900'
                  }`}>
                    {wp.ap_code}
                  </td>

                  {/* Beschreibung */}
                  <td className="px-3 py-2 border-r">
                    <div className={`truncate ${isSubAP ? 'text-gray-700' : 'font-medium text-gray-900'}`} 
                         title={wp.name}>
                      {wp.name}
                    </div>
                  </td>

                  {/* Von */}
                  <td className="px-2 py-2 text-center text-gray-500 border-r text-xs">
                    {formatDateShort(wp.start_date)}
                  </td>

                  {/* Bis */}
                  <td className="px-2 py-2 text-center text-gray-500 border-r text-xs">
                    {formatDateShort(wp.end_date)}
                  </td>

                  {/* MA-Zellen */}
                  {sortedEmployees.map((emp, empIdx) => (
                    <td
                      key={emp.id}
                      className={`px-0 py-0 border-r border-gray-100 ${
                        empIdx === sortedEmployees.length - 1 ? 'border-r-gray-200' : ''
                      }`}
                    >
                      <EditableCell
                        value={getPM(wp.id, emp.id)}
                        canEdit={canEdit}
                        onChange={(newPm) => handleCellChange(wp.id, emp.id, newPm)}
                        portalColors={colors}
                      />
                    </td>
                  ))}

                  {/* Zeilen-Summe */}
                  <td className="px-2 py-2 text-center font-semibold text-gray-900 bg-gray-100">
                    {wpSum > 0 ? wpSum.toFixed(2).replace('.', ',') : '-'}
                  </td>

                  {/* Aktionen */}
                  {canEdit && (
                    <td className="px-2 py-2 text-center">
                      <div className="flex justify-center gap-1">
                        {onEditAP && (
                          <button
                            onClick={() => onEditAP(wp)}
                            className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                            title="Bearbeiten"
                          >
                            <Pencil size={14} />
                          </button>
                        )}
                        {onDeleteAP && (
                          <button
                            onClick={() => onDeleteAP(wp)}
                            className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                            title="Loeschen"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>

          {/* Footer mit Summen */}
          <tfoot>
            <tr className={`${colors.header} ${colors.headerText}`}>
              <td colSpan={4} className="px-3 py-2 font-semibold border-r border-white/20">
                Summe Personenmonate
              </td>
              {sortedEmployees.map((emp) => {
                const empSum = sums.perEmployee.get(emp.id) || 0;
                return (
                  <td key={emp.id} className="px-2 py-2 text-center font-semibold border-r border-white/20">
                    {empSum > 0 ? empSum.toFixed(2).replace('.', ',') : '-'}
                  </td>
                );
              })}
              <td className="px-2 py-2 text-center font-bold text-lg">
                {sums.total.toFixed(2).replace('.', ',')}
              </td>
              {canEdit && <td></td>}
            </tr>
            {/* Stunden-Zeile */}
            <tr className="bg-gray-100 text-gray-600">
              <td colSpan={4} className="px-3 py-1.5 text-sm border-r">
                Entspricht Stunden (× 173,33)
              </td>
              {sortedEmployees.map((emp) => {
                const empSum = sums.perEmployee.get(emp.id) || 0;
                const hours = empSum * 173.33;
                return (
                  <td key={emp.id} className="px-2 py-1.5 text-center text-xs border-r">
                    {hours > 0 ? Math.round(hours).toLocaleString('de-DE') : '-'}
                  </td>
                );
              })}
              <td className="px-2 py-1.5 text-center font-medium text-sm">
                {Math.round(sums.total * 173.33).toLocaleString('de-DE')} h
              </td>
              {canEdit && <td></td>}
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Legende */}
      <div className="px-4 py-2 bg-gray-50 border-t text-xs text-gray-500 flex gap-4">
        <span>PM = Personenmonate</span>
        <span>1 PM = 173,33 Stunden</span>
        {canEdit && <span className="text-blue-600">Klicken Sie in eine Zelle zum Bearbeiten</span>}
      </div>
    </div>
  );
}
