// src/components/shared/WorkPackageTable.tsx
// ============================================================================
// PZE V7 - Arbeitsplan-Tabelle (Excel-Style mit Inline-Edit)
// ============================================================================
// Datum: 02. Maerz 2026
// Version: 7.3.90-2
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
// v7.3.90-2: NEU: Stunden + Erfasst + Verfuegbar pro AP in Summe-Spalte
//            Laedt Ist-Stunden direkt aus v7_timesheets (kein Prop-Drilling)
//            Summe-Spalte: PM, darunter Stunden, darunter "X h frei" / "X h ueber"
//            Footer: Zeile "Erfasst (Ist)" + Zeile "Verfuegbar (Rest)" pro MA
//            Farb-Ampel: gruen = frei, rot = ueberschritten, grau = ausgeschoepft
// v7.3.90: T/NT Spalte: Header "T/NT", Werte "T" und "NT" statt "X" und "-"
// v7.3.85 FIXES:
// - Sortierung: AP1.1/1.2 kommen nach AP1, nicht ans Ende
// - Sticky Spalten: AP + Beschreibung bleiben beim Scrollen sichtbar
// - MA-Namen: "M. Duehrkop" statt nur "Duehrkop" (unterscheidbar)
// ============================================================================

'use client';

import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

// ============================================================================
// TYPEN
// ============================================================================

interface Employee {
  id: string;
  display_name: string;
  first_name: string | null;
  last_name: string | null;
  employee_number: number | null;
}

interface ProjectTeamMember {
  id: string;
  project_id: string;
  employee_id: string;
  employee_number: number | null;
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
  is_technical?: boolean | null;
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
  projectTeam?: ProjectTeamMember[];
  canEdit: boolean;
  onAssignmentChange: (workPackageId: string, employeeId: string, plannedPm: number | null) => Promise<void>;
  onAddAP?: () => void;
  onEditAP?: (wp: WorkPackage) => void;
  onDeleteAP?: (wp: WorkPackage) => void;
  portal?: 'berater' | 'firma';
  fundingFormat?: string | null;
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

const PM_TO_HOURS = 173.33;

// ============================================================================
// HILFSFUNKTIONEN
// ============================================================================

const formatDateShort = (dateStr: string | null): string => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear().toString().slice(-2);
  return `${day}.${month}.${year}`;
};

const getShortName = (emp: Employee): string => {
  if (emp.first_name && emp.last_name) {
    const initial = emp.first_name.charAt(0) + '.';
    return `${initial} ${emp.last_name}`;
  }
  if (emp.last_name) {
    return emp.last_name;
  }
  const parts = emp.display_name.split(',');
  if (parts.length >= 2) {
    const nachname = parts[0].trim();
    const vorname = parts[1].trim();
    return `${vorname.charAt(0)}. ${nachname}`;
  }
  return emp.display_name;
};

const sortWorkPackages = (wps: WorkPackage[]): WorkPackage[] => {
  return [...wps].sort((a, b) => {
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
    if (newValue === value || (newValue === null && value === null)) {
      setIsEditing(false);
      return;
    }
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
    if (e.key === 'Enter') handleSave();
    else if (e.key === 'Escape') setIsEditing(false);
    else if (e.key === 'Tab') handleSave();
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => handleSave()}
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
        hasValue ? 'text-gray-900 font-medium' : 'text-gray-300'
      } ${canEdit ? 'hover:bg-blue-50 hover:text-blue-700' : ''}`}
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
  const isZimDS = fundingFormat === 'ZIM_DS';

  // ============================================================================
  // TIMESHEET IST-STUNDEN LADEN
  // ============================================================================

  // Erfasste Stunden pro AP und pro MA
  const [hoursPerWP, setHoursPerWP] = useState<Record<string, number>>({});
  const [hoursPerEmployee, setHoursPerEmployee] = useState<Record<string, number>>({});
  const [timesheetLoaded, setTimesheetLoaded] = useState(false);

  useEffect(() => {
    const loadTimesheetHours = async () => {
      if (!projectId || workPackages.length === 0) return;

      try {
        const supabase = createClient();

        // Alle aktiven billable Timesheet-Eintraege fuer dieses Projekt laden
        // Nur die Felder die wir brauchen: work_package_id, employee_id, hours
        const { data: entries, error } = await supabase
          .from('v7_timesheets')
          .select('work_package_id, employee_id, hours')
          .eq('project_id', projectId)
          .eq('is_active', true)
          .eq('is_billable', true);

        if (error) {
          console.error('[WorkPackageTable] Fehler beim Laden der Timesheet-Daten:', error);
          return;
        }

        if (!entries || entries.length === 0) {
          setTimesheetLoaded(true);
          return;
        }

        // Aggregieren: Stunden pro AP
        const wpHours: Record<string, number> = {};
        const empHours: Record<string, number> = {};

        entries.forEach((entry: any) => {
          const h = parseFloat(entry.hours) || 0;
          if (h <= 0) return;

          // Pro Arbeitspaket
          if (entry.work_package_id) {
            wpHours[entry.work_package_id] = (wpHours[entry.work_package_id] || 0) + h;
          }

          // Pro Mitarbeiter
          if (entry.employee_id) {
            empHours[entry.employee_id] = (empHours[entry.employee_id] || 0) + h;
          }
        });

        setHoursPerWP(wpHours);
        setHoursPerEmployee(empHours);
        setTimesheetLoaded(true);

        console.log('[WorkPackageTable] Timesheet-Daten geladen:', {
          eintraege: entries.length,
          aps_mit_stunden: Object.keys(wpHours).length,
          ma_mit_stunden: Object.keys(empHours).length,
        });
      } catch (err) {
        console.error('[WorkPackageTable] Timesheet-Lade-Fehler:', err);
      }
    };

    loadTimesheetHours();
  }, [projectId, workPackages.length]);

  // Pruefen ob tatsaechlich Ist-Stunden existieren
  const hasTimesheetData = timesheetLoaded && (
    Object.values(hoursPerWP).some(h => h > 0) ||
    Object.values(hoursPerEmployee).some(h => h > 0)
  );

  // ============================================================================
  // BERECHNUNGEN
  // ============================================================================

  const projectTeamMap = useMemo(() => {
    const map = new Map<string, ProjectTeamMember>();
    projectTeam.forEach(pt => map.set(pt.employee_id, pt));
    return map;
  }, [projectTeam]);

  const getEmployeeNumber = (emp: Employee): number | null => {
    const teamMember = projectTeamMap.get(emp.id);
    return teamMember?.employee_number ?? emp.employee_number ?? null;
  };

  const sortedEmployees = useMemo(() => {
    return [...employees].sort((a, b) => {
      const numA = getEmployeeNumber(a);
      const numB = getEmployeeNumber(b);
      if (numA !== null && numB !== null) return numA - numB;
      if (numA !== null) return -1;
      if (numB !== null) return 1;
      return a.display_name.localeCompare(b.display_name, 'de');
    });
  }, [employees, projectTeamMap]);

  const sortedWPs = useMemo(() => sortWorkPackages(workPackages), [workPackages]);

  const assignmentMap = useMemo(() => {
    const map = new Map<string, Assignment>();
    assignments.forEach(a => map.set(`${a.work_package_id}-${a.employee_id}`, a));
    return map;
  }, [assignments]);

  const getPM = (wpId: string, empId: string): number | null => {
    const assignment = assignmentMap.get(`${wpId}-${empId}`);
    return assignment?.planned_pm ?? null;
  };

  const sums = useMemo(() => {
    const perEmployee = new Map<string, number>();
    sortedEmployees.forEach(emp => perEmployee.set(emp.id, 0));
    const perWP = new Map<string, number>();
    sortedWPs.forEach(wp => perWP.set(wp.id, 0));
    let total = 0;
    assignments.forEach(a => {
      const pm = a.planned_pm || 0;
      perEmployee.set(a.employee_id, (perEmployee.get(a.employee_id) || 0) + pm);
      perWP.set(a.work_package_id, (perWP.get(a.work_package_id) || 0) + pm);
      total += pm;
    });
    return { perEmployee, perWP, total };
  }, [assignments, sortedEmployees, sortedWPs]);

  const totalTimesheetHours = useMemo(() => {
    let total = 0;
    Object.values(hoursPerEmployee).forEach(h => { total += h; });
    return total;
  }, [hoursPerEmployee]);

  const handleCellChange = async (wpId: string, empId: string, newPm: number | null) => {
    await onAssignmentChange(wpId, empId, newPm);
  };

  // ============================================================================
  // LEERE ZUSTAENDE
  // ============================================================================

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

  if (employees.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Keine Mitarbeiter zugeordnet</h3>
        <p className="text-gray-500">
          Fuegen Sie zuerst Mitarbeiter zum Projekt-Team hinzu.
        </p>
      </div>
    );
  }

  // ============================================================================
  // RENDER
  // ============================================================================

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
            <tr className="bg-gray-100 border-b">
              <th 
                className="px-3 py-2 text-left font-medium text-gray-600 border-r bg-gray-100 sticky left-0 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]"
                style={{ minWidth: '70px' }}
              >
                AP
              </th>
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
              {isZimDS && (
                <th 
                  className="px-1 py-2 text-center font-medium text-gray-600 border-r" 
                  style={{ minWidth: '35px', maxWidth: '40px' }}
                  title="Technisch / Nicht-technisch"
                >
                  T/NT
                </th>
              )}
              {sortedEmployees.map((emp) => {
                const empNumber = getEmployeeNumber(emp);
                return (
                  <th
                    key={emp.id}
                    className="px-1 py-2 text-center font-medium text-gray-700 border-r border-gray-300"
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
              <th className="px-2 py-2 text-center font-semibold text-gray-700 bg-gray-200" style={{ minWidth: '90px' }}>
                Summe
              </th>
              {canEdit && (
                <th className="px-2 py-2 text-center font-medium text-gray-600" style={{ minWidth: '60px' }}>
                </th>
              )}
            </tr>
          </thead>

          {/* Tabellenkoerper */}
          <tbody>
            {sortedWPs.map((wp) => {
              const wpSum = sums.perWP.get(wp.id) || 0;
              const wpHours = wpSum * PM_TO_HOURS;
              const wpBooked = hoursPerWP[wp.id] || 0;
              const wpAvailable = wpHours - wpBooked;
              const isSubAP = wp.ap_code.includes('.') && wp.ap_code.split('.').length > 1;
              const rowBg = isSubAP ? 'bg-white' : 'bg-gray-50';

              return (
                <tr key={wp.id} className={`border-b hover:bg-blue-50 ${rowBg}`}>
                  {/* STICKY: AP-Nummer */}
                  <td 
                    className={`px-3 py-2 border-r font-mono text-sm sticky left-0 z-10 ${rowBg} shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] ${
                      isSubAP ? 'text-gray-600 pl-5' : 'font-semibold text-gray-900'
                    }`}
                    style={{ minWidth: '70px' }}
                  >
                    {wp.ap_code}
                  </td>

                  {/* Beschreibung */}
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

                  {/* T/NT */}
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
                    <td key={emp.id} className="px-0 py-0 border-r border-gray-300">
                      <EditableCell
                        value={getPM(wp.id, emp.id)}
                        canEdit={canEdit}
                        onChange={(newPm) => handleCellChange(wp.id, emp.id, newPm)}
                        portalColors={colors}
                      />
                    </td>
                  ))}

                  {/* Summe-Spalte: PM + Stunden + Verfuegbar */}
                  <td className="px-2 py-1 text-center bg-gray-100 border-l border-gray-300">
                    {/* PM-Summe */}
                    <div className="font-semibold text-gray-900 text-sm">
                      {wpSum > 0 ? wpSum.toFixed(2).replace('.', ',') : '-'}
                    </div>
                    {/* Geplante Stunden */}
                    {wpSum > 0 && (
                      <div className="text-[10px] text-gray-500 leading-tight mt-0.5">
                        = {Math.round(wpHours).toLocaleString('de-DE')} h
                      </div>
                    )}
                    {/* Verfuegbare Stunden (nur wenn Ist-Daten vorhanden) */}
                    {wpSum > 0 && hasTimesheetData && (
                      <div className="text-[10px] leading-tight mt-0.5">
                        {wpBooked > 0 && (
                          <span className="text-blue-600">
                            {Math.round(wpBooked).toLocaleString('de-DE')} h erfasst
                          </span>
                        )}
                        {wpBooked > 0 && <br />}
                        <span className={`font-medium ${
                          wpAvailable > 0 ? 'text-green-700' : 
                          wpAvailable < 0 ? 'text-red-600' : 
                          'text-gray-500'
                        }`}>
                          {wpAvailable > 0 
                            ? `${Math.round(wpAvailable).toLocaleString('de-DE')} h frei`
                            : wpAvailable < 0 
                              ? `${Math.round(Math.abs(wpAvailable)).toLocaleString('de-DE')} h ueber`
                              : 'ausgeschoepft'}
                        </span>
                      </div>
                    )}
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
            {/* Zeile 1: PM-Summen */}
            <tr className={`${colors.header} ${colors.headerText}`}>
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

            {/* Zeile 2: Geplante Stunden (PM x 173,33) */}
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
                const hours = empSum * PM_TO_HOURS;
                return (
                  <td key={emp.id} className="px-2 py-1.5 text-center text-xs border-r">
                    {hours > 0 ? Math.round(hours).toLocaleString('de-DE') : '-'}
                  </td>
                );
              })}
              <td className="px-2 py-1.5 text-center font-medium text-sm">
                {Math.round(sums.total * PM_TO_HOURS).toLocaleString('de-DE')} h
              </td>
              {canEdit && <td></td>}
            </tr>

            {/* Zeile 3: Erfasste Stunden (Ist) - nur wenn Daten vorhanden */}
            {hasTimesheetData && (
              <tr className="bg-blue-50 text-blue-800">
                <td 
                  className="px-3 py-1.5 text-sm border-r bg-blue-50 sticky left-0 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]"
                  style={{ minWidth: '70px' }}
                >
                </td>
                <td 
                  className="px-2 py-1.5 text-sm font-medium border-r bg-blue-50"
                  style={{ minWidth: '140px', maxWidth: '180px' }}
                >
                  davon erfasst (Ist)
                </td>
                <td colSpan={2} className="px-2 py-1.5 border-r bg-blue-50"></td>
                {isZimDS && <td className="px-2 py-1.5 border-r bg-blue-50"></td>}
                {sortedEmployees.map((emp) => {
                  const booked = hoursPerEmployee[emp.id] || 0;
                  return (
                    <td key={emp.id} className="px-2 py-1.5 text-center text-xs border-r bg-blue-50 font-medium">
                      {booked > 0 ? Math.round(booked).toLocaleString('de-DE') : '-'}
                    </td>
                  );
                })}
                <td className="px-2 py-1.5 text-center font-medium text-sm bg-blue-50">
                  {totalTimesheetHours > 0 ? `${Math.round(totalTimesheetHours).toLocaleString('de-DE')} h` : '-'}
                </td>
                {canEdit && <td className="bg-blue-50"></td>}
              </tr>
            )}

            {/* Zeile 4: Verfuegbare Stunden (Rest) - nur wenn Daten vorhanden */}
            {hasTimesheetData && (
              <tr className="bg-green-50 text-green-800 border-t border-green-200">
                <td 
                  className="px-3 py-1.5 text-sm border-r bg-green-50 sticky left-0 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]"
                  style={{ minWidth: '70px' }}
                >
                </td>
                <td 
                  className="px-2 py-1.5 text-sm font-medium border-r bg-green-50"
                  style={{ minWidth: '140px', maxWidth: '180px' }}
                >
                  noch verfuegbar
                </td>
                <td colSpan={2} className="px-2 py-1.5 border-r bg-green-50"></td>
                {isZimDS && <td className="px-2 py-1.5 border-r bg-green-50"></td>}
                {sortedEmployees.map((emp) => {
                  const empSum = sums.perEmployee.get(emp.id) || 0;
                  const planned = empSum * PM_TO_HOURS;
                  const booked = hoursPerEmployee[emp.id] || 0;
                  const available = planned - booked;
                  const isOver = available < 0;
                  return (
                    <td key={emp.id} className={`px-2 py-1.5 text-center text-xs border-r bg-green-50 font-semibold ${isOver ? 'text-red-600' : ''}`}>
                      {planned > 0 ? Math.round(available).toLocaleString('de-DE') : '-'}
                    </td>
                  );
                })}
                {(() => {
                  const totalPlanned = sums.total * PM_TO_HOURS;
                  const totalAvailable = totalPlanned - totalTimesheetHours;
                  const isOver = totalAvailable < 0;
                  return (
                    <td className={`px-2 py-1.5 text-center font-semibold text-sm bg-green-50 ${isOver ? 'text-red-600' : ''}`}>
                      {Math.round(totalAvailable).toLocaleString('de-DE')} h
                    </td>
                  );
                })()}
                {canEdit && <td className="bg-green-50"></td>}
              </tr>
            )}
          </tfoot>
        </table>
      </div>

      {/* Legende */}
      <div className="px-4 py-2 bg-gray-50 border-t text-xs text-gray-500 flex flex-wrap gap-4">
        <span>PM = Personenmonate</span>
        <span>1 PM = 173,33 Stunden</span>
        {canEdit && <span className="text-blue-600">Klicken Sie in eine Zelle zum Bearbeiten</span>}
      </div>
    </div>
  );
}
