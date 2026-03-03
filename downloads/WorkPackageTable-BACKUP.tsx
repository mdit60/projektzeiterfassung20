// src/components/shared/WorkPackageTable.tsx
// ============================================================================
// PZE V7 - Arbeitsplan-Tabelle (Excel-Style mit Inline-Edit)
// ============================================================================
// Datum: 26. Februar 2026
// Version: 7.4.2-3
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
// v7.4.2-3: Anlage 5 Kontrollsummen unterhalb des Arbeitsplans
//           Fuer ALLE ZIM-Formate:
//           a) Personenmonate je Arbeitspaket
//           b) Personenmonate je Mitarbeiter (+ beteiligte AP)
//           Bei ZIM_DS zusaetzlich: T/NT-Spalten getrennt
//           Bei normalem ZIM: nur eine PM-Spalte
// v7.3.90: T/NT Spalte: Header "T/NT", Werte "T" und "NT" statt "X" und "-"
//          Konsistent mit Zeiterfassung (TimesheetForm)
// v7.3.85 FIXES:
// - Sortierung: AP1.1/1.2 kommen nach AP1, nicht ans Ende
// - Sticky Spalten: AP + Beschreibung bleiben beim Scrollen sichtbar
// - MA-Namen: "M. Duehrkop" statt nur "Duehrkop" (unterscheidbar)
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
  hourly_rate: number | null;
}

interface WorkPackage {
  id: string;
  project_id: string;
  ap_number: number;
  ap_code: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  is_technical?: boolean | null;  // Technisches AP (fuer ZIM_DS)
  total_person_months?: number;
}

interface Assignment {
  work_package_id: string;
  employee_id: string;
  planned_pm: number;
}

interface WorkPackageTableProps {
  projectId: string;
  employees: Employee[];
  workPackages: WorkPackage[];
  assignments: Assignment[];
  projectTeam?: ProjectTeamMember[];  // Projektspezifische MA-Nummern (optional fuer Rueckwaertskompatibilitaet)
  canEdit: boolean;
  onAssignmentChange: (workPackageId: string, employeeId: string, plannedPm: number | null) => Promise<void>;
  onAddAP?: () => void;
  onEditAP?: (wp: WorkPackage) => void;
  onDeleteAP?: (wp: WorkPackage) => void;
  portal?: 'berater' | 'firma';
  fundingFormat?: string | null;  // Um ZIM_DS zu erkennen und "T/NT"-Spalte anzuzeigen
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
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear().toString().slice(-2);
  return `${day}.${month}.${year}`;
};

// MA-Kurzname: "M. Duehrkop" oder "T. Duehrkop" (Initial + Nachname)
const getShortName = (emp: Employee): string => {
  if (emp.first_name && emp.last_name) {
    const initial = emp.first_name.charAt(0) + '.';
    return `${initial} ${emp.last_name}`;
  }
  if (emp.last_name) {
    return emp.last_name;
  }
  // Fallback: display_name parsen (Format "Nachname, Vorname")
  const parts = emp.display_name.split(',');
  if (parts.length >= 2) {
    const nachname = parts[0].trim();
    const vorname = parts[1].trim();
    return `${vorname.charAt(0)}. ${nachname}`;
  }
  return emp.display_name;
};

// Sortiere APs numerisch: 1, 1.1, 1.2, 2, 2.1, 10, 10.1
// Entfernt "AP" Prefix falls vorhanden
const sortWorkPackages = (wps: WorkPackage[]): WorkPackage[] => {
  return [...wps].sort((a, b) => {
    // "AP1.2" -> "1.2", "1.2" -> "1.2"
    const aCode = a.ap_code.replace(/^AP/i, '');
    const bCode = b.ap_code.replace(/^AP/i, '');
    
    const aParts = aCode.split('.').map(s => parseInt(s) || 0);
    const bParts = bCode.split('.').map(s => parseInt(s) || 0);
    
    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
      const aVal = aParts[i] || 0;
      const bVal = bParts[i] || 0;
      if (aVal !== bVal) return aVal - bVal;
    }
    return 0;
  });
};

// PM formatieren: deutsches Komma, 0 als "0"
const fmtPM = (val: number): string => {
  if (val === 0) return '0';
  return val.toFixed(2).replace('.', ',');
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
  fundingFormat,
}: WorkPackageTableProps) {
  const colors = PORTAL_COLORS[portal];
  const isZimDS = fundingFormat === 'ZIM_DS';  // Durchfuehrbarkeitsstudie?
  const isZim = (fundingFormat || '').startsWith('ZIM');  // Alle ZIM-Formate

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

  // Anlage 5 Kontrollsummen (fuer alle ZIM-Formate)
  const anlage5 = useMemo(() => {
    if (!isZim) return null;

    // a) PM je Arbeitspaket
    const perAP: Array<{
      apCode: string;
      pmTechnisch: number;
      pmNichtTechnisch: number;
      pmGesamt: number;
    }> = [];

    sortedWPs.forEach(wp => {
      const wpPM = sums.perWP.get(wp.id) || 0;
      if (isZimDS) {
        perAP.push({
          apCode: wp.ap_code.replace(/^AP/i, ''),
          pmTechnisch: wp.is_technical ? wpPM : 0,
          pmNichtTechnisch: wp.is_technical ? 0 : wpPM,
          pmGesamt: wpPM,
        });
      } else {
        perAP.push({
          apCode: wp.ap_code.replace(/^AP/i, ''),
          pmTechnisch: 0,
          pmNichtTechnisch: 0,
          pmGesamt: wpPM,
        });
      }
    });

    const sumT = perAP.reduce((s, a) => s + a.pmTechnisch, 0);
    const sumNT = perAP.reduce((s, a) => s + a.pmNichtTechnisch, 0);
    const sumGesamt = perAP.reduce((s, a) => s + a.pmGesamt, 0);

    // b) PM je Mitarbeiter
    const perMA: Array<{
      maNumber: number | null;
      pmTechnisch: number;
      pmNichtTechnisch: number;
      pmGesamt: number;
      beteiligteAP: string[];
    }> = [];

    sortedEmployees.forEach(emp => {
      let pmT = 0;
      let pmNT = 0;
      let pmTotal = 0;
      const apList: string[] = [];

      sortedWPs.forEach(wp => {
        const pm = getPM(wp.id, emp.id) || 0;
        if (pm > 0) {
          apList.push(wp.ap_code.replace(/^AP/i, ''));
          if (isZimDS) {
            if (wp.is_technical) {
              pmT += pm;
            } else {
              pmNT += pm;
            }
          }
          pmTotal += pm;
        }
      });

      if (pmTotal > 0) {
        perMA.push({
          maNumber: getEmployeeNumber(emp),
          pmTechnisch: pmT,
          pmNichtTechnisch: pmNT,
          pmGesamt: pmTotal,
          beteiligteAP: apList,
        });
      }
    });

    const maSumT = perMA.reduce((s, m) => s + m.pmTechnisch, 0);
    const maSumNT = perMA.reduce((s, m) => s + m.pmNichtTechnisch, 0);
    const maSumGesamt = perMA.reduce((s, m) => s + m.pmGesamt, 0);

    return {
      perAP, sumT, sumNT, sumGesamt,
      perMA, maSumT, maSumNT, maSumGesamt,
    };
  }, [isZim, isZimDS, sortedWPs, sortedEmployees, sums, assignments]);

  // Handler fuer Zellen-Aenderung
  const handleCellChange = async (wpId: string, empId: string, newPm: number | null) => {
    await onAssignmentChange(wpId, empId, newPm);
  };

  // Leerer Zustand
  if (workPackages.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
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
        <h3 className="text-lg font-medium text-gray-900 mb-2">Keine Mitarbeiter zugeordnet</h3>
        <p className="text-gray-500">
          Bitte fuegen Sie zuerst Mitarbeiter im Team-Tab hinzu.
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
        <table className="w-full text-sm border-collapse">
          {/* Tabellenkopf */}
          <thead>
            {/* Zeile 1: Gruppierung */}
            <tr className="bg-gray-100 border-b">
              {/* STICKY: AP-Nummer */}
              <th 
                className="px-3 py-2 text-left font-medium text-gray-600 border-r bg-gray-100 sticky left-0 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]"
                style={{ minWidth: '70px' }}
              >
                AP
              </th>
              {/* Beschreibung - schmaler, scrollt mit */}
              <th 
                className="px-2 py-2 text-left font-medium text-gray-600 border-r bg-gray-100"
                style={{ minWidth: '140px', maxWidth: '180px' }}
              >
                Beschreibung
              </th>
              <th className="px-2 py-2 text-center font-medium text-gray-600 border-r" style={{ minWidth: '55px' }}>
                von
              </th>
              <th className="px-2 py-2 text-center font-medium text-gray-600 border-r" style={{ minWidth: '55px' }}>
                bis
              </th>
              {/* T/NT-Spalte nur bei ZIM_DS */}
              {isZimDS && (
                <th 
                  className="px-1 py-2 text-center font-medium text-gray-600 border-r" 
                  style={{ minWidth: '35px', maxWidth: '40px' }}
                  title="Technisch / Nicht-technisch"
                >
                  T/NT
                </th>
              )}
              {/* MA-Spalten */}
              {sortedEmployees.map((emp, idx) => {
                const empNumber = getEmployeeNumber(emp);
                return (
                  <th
                    key={emp.id}
                    className={`px-1 py-2 text-center font-medium text-gray-700 border-r border-gray-300`}
                    style={{ minWidth: '80px', maxWidth: '100px' }}
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
              const rowBg = isSubAP ? 'bg-white' : 'bg-gray-50';

              return (
                <tr
                  key={wp.id}
                  className={`border-b hover:bg-blue-50 ${rowBg}`}
                >
                  {/* STICKY: AP-Nummer */}
                  <td 
                    className={`px-3 py-2 border-r font-mono text-sm sticky left-0 z-10 ${rowBg} shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] ${
                      isSubAP ? 'text-gray-600 pl-5' : 'font-semibold text-gray-900'
                    }`}
                    style={{ minWidth: '70px' }}
                  >
                    {wp.ap_code}
                  </td>

                  {/* Beschreibung - schmaler, mehrzeilig */}
                  <td 
                    className={`px-2 py-1 border-r ${rowBg}`}
                    style={{ minWidth: '140px', maxWidth: '180px' }}
                  >
                    <div className={`text-xs leading-tight ${isSubAP ? 'text-gray-700' : 'font-medium text-gray-900'}`} 
                         title={wp.name}
                         style={{ 
                           display: '-webkit-box',
                           WebkitLineClamp: 2,
                           WebkitBoxOrient: 'vertical',
                           overflow: 'hidden'
                         }}>
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

                  {/* T/NT-Spalte nur bei ZIM_DS */}
                  {isZimDS && (
                    <td className="px-1 py-2 text-center border-r text-xs">
                      {wp.is_technical ? (
                        <span className="text-green-600 font-bold">T</span>
                      ) : (
                        <span className="text-amber-600 font-bold">NT</span>
                      )}
                    </td>
                  )}

                  {/* MA-Zellen */}
                  {sortedEmployees.map((emp) => (
                    <td
                      key={emp.id}
                      className="px-0 py-0 border-r border-gray-300"
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
              {/* STICKY: Summe Label */}
              <td 
                className={`px-3 py-2 font-semibold border-r border-white/20 sticky left-0 z-10 ${colors.header} shadow-[2px_0_5px_-2px_rgba(0,0,0,0.2)]`}
                style={{ minWidth: '70px' }}
              >
                Summe
              </td>
              <td 
                className={`px-2 py-2 text-xs font-semibold border-r border-white/20 ${colors.header}`}
                style={{ minWidth: '140px', maxWidth: '180px' }}
              >
                PM
              </td>
              <td colSpan={2} className="px-2 py-2 border-r border-white/20"></td>
              {isZimDS && <td className="px-2 py-2 border-r border-white/20"></td>}
              {sortedEmployees.map((emp) => {
                const empSum = sums.perEmployee.get(emp.id) || 0;
                return (
                  <td key={emp.id} className="px-2 py-2 text-center font-semibold border-r border-white/30">
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
              <td 
                className="px-3 py-1.5 text-sm border-r bg-gray-100 sticky left-0 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]"
                style={{ minWidth: '70px' }}
              >
                =
              </td>
              <td 
                className="px-2 py-1.5 text-sm border-r bg-gray-100"
                style={{ minWidth: '140px', maxWidth: '180px' }}
              >
                Stunden (x 173,33)
              </td>
              <td colSpan={2} className="px-2 py-1.5 border-r"></td>
              {isZimDS && <td className="px-2 py-1.5 border-r"></td>}
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

      {/* ================================================================ */}
      {/* ANLAGE 5 KONTROLLSUMMEN (nur bei ZIM-Formaten)                  */}
      {/* ================================================================ */}
      {isZim && anlage5 && (
        <div className="border-t border-gray-300 px-4 py-4 bg-gray-50">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">
            Kontrollsummen (Anlage 5)
          </h4>

          <div className={`grid gap-6 ${isZimDS ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-2'}`}>

            {/* a) Personenmonate je Arbeitspaket */}
            <div>
              <p className="text-xs font-medium text-gray-600 mb-2">
                a) Personenmonate je Arbeitspaket
              </p>
              <table className="w-full text-xs border border-gray-300">
                <thead>
                  <tr className="bg-gray-200">
                    <th className="px-2 py-1.5 text-left border-r border-gray-300 font-medium">AP Nr.</th>
                    {isZimDS ? (
                      <>
                        <th className="px-2 py-1.5 text-right border-r border-gray-300 font-medium">
                          <span title="Aufwand PM fuer technische Vorprojekte, Vorstudien und Tests">PM technisch</span>
                        </th>
                        <th className="px-2 py-1.5 text-right border-r border-gray-300 font-medium">
                          <span title="Aufwand PM fuer weitere Arbeiten">PM weitere</span>
                        </th>
                      </>
                    ) : (
                      <th className="px-2 py-1.5 text-right border-r border-gray-300 font-medium">PM</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {anlage5.perAP.map((ap, idx) => (
                    <tr key={idx} className="border-t border-gray-200 hover:bg-gray-100">
                      <td className="px-2 py-1 border-r border-gray-300 font-mono">{ap.apCode}</td>
                      {isZimDS ? (
                        <>
                          <td className="px-2 py-1 text-right border-r border-gray-300">
                            {ap.pmTechnisch > 0 ? fmtPM(ap.pmTechnisch) : '0'}
                          </td>
                          <td className="px-2 py-1 text-right border-r border-gray-300">
                            {ap.pmNichtTechnisch > 0 ? fmtPM(ap.pmNichtTechnisch) : '0'}
                          </td>
                        </>
                      ) : (
                        <td className="px-2 py-1 text-right border-r border-gray-300">
                          {ap.pmGesamt > 0 ? fmtPM(ap.pmGesamt) : '0'}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-400 bg-gray-200 font-semibold">
                    <td className="px-2 py-1.5 border-r border-gray-300">Summe</td>
                    {isZimDS ? (
                      <>
                        <td className="px-2 py-1.5 text-right border-r border-gray-300">
                          {fmtPM(anlage5.sumT)}
                        </td>
                        <td className="px-2 py-1.5 text-right border-r border-gray-300">
                          {fmtPM(anlage5.sumNT)}
                        </td>
                      </>
                    ) : (
                      <td className="px-2 py-1.5 text-right border-r border-gray-300">
                        {fmtPM(anlage5.sumGesamt)}
                      </td>
                    )}
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* b) Personenmonate je Mitarbeiter */}
            <div>
              <p className="text-xs font-medium text-gray-600 mb-2">
                b) Personenmonate je Mitarbeiter
              </p>
              <table className="w-full text-xs border border-gray-300">
                <thead>
                  <tr className="bg-gray-200">
                    <th className="px-2 py-1.5 text-left border-r border-gray-300 font-medium">MA Nr.</th>
                    {isZimDS ? (
                      <>
                        <th className="px-2 py-1.5 text-right border-r border-gray-300 font-medium">
                          <span title="Aufwand PM fuer technische Vorprojekte, Vorstudien und Tests">PM technisch</span>
                        </th>
                        <th className="px-2 py-1.5 text-right border-r border-gray-300 font-medium">
                          <span title="Aufwand PM fuer weitere Arbeiten">PM weitere</span>
                        </th>
                      </>
                    ) : (
                      <th className="px-2 py-1.5 text-right border-r border-gray-300 font-medium">PM</th>
                    )}
                    <th className="px-2 py-1.5 text-left font-medium">beteiligt an AP</th>
                  </tr>
                </thead>
                <tbody>
                  {anlage5.perMA.map((ma, idx) => (
                    <tr key={idx} className="border-t border-gray-200 hover:bg-gray-100">
                      <td className="px-2 py-1 border-r border-gray-300 font-mono">
                        {ma.maNumber || (idx + 1)}
                      </td>
                      {isZimDS ? (
                        <>
                          <td className="px-2 py-1 text-right border-r border-gray-300">
                            {ma.pmTechnisch > 0 ? fmtPM(ma.pmTechnisch) : '0'}
                          </td>
                          <td className="px-2 py-1 text-right border-r border-gray-300">
                            {ma.pmNichtTechnisch > 0 ? fmtPM(ma.pmNichtTechnisch) : '0'}
                          </td>
                        </>
                      ) : (
                        <td className="px-2 py-1 text-right border-r border-gray-300">
                          {ma.pmGesamt > 0 ? fmtPM(ma.pmGesamt) : '0'}
                        </td>
                      )}
                      <td className="px-2 py-1 text-gray-600">
                        {ma.beteiligteAP.join('; ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-400 bg-gray-200 font-semibold">
                    <td className="px-2 py-1.5 border-r border-gray-300">Summe</td>
                    {isZimDS ? (
                      <>
                        <td className="px-2 py-1.5 text-right border-r border-gray-300">
                          {fmtPM(anlage5.maSumT)}
                        </td>
                        <td className="px-2 py-1.5 text-right border-r border-gray-300">
                          {fmtPM(anlage5.maSumNT)}
                        </td>
                      </>
                    ) : (
                      <td className="px-2 py-1.5 text-right border-r border-gray-300">
                        {fmtPM(anlage5.maSumGesamt)}
                      </td>
                    )}
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
