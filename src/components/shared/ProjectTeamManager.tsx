// src/components/shared/ProjectTeamManager.tsx
// ============================================================================
// PZE V7 - Projekt-Team Management
// ============================================================================
// Datum: 09. Maerz 2026
// Version: 7.3.95-4
//
// Verwaltet das Projektteam:
// - MA aus Firmenstamm zum Projekt hinzufuegen
// - Projektspezifische Daten: Lfd. Nr., Stundensatz, Rolle, Zeitraum
// - Anlage 6.1 Felder: Jahresgehalt, Betriebl. Wochenstunden -> Stundensatz
// - MA wird nie geloescht, nur Zeitraum beendet
//
// AENDERUNGEN v7.3.95-4:
// - DB-Migration: monthly_gross + additional_salary_components neu in v7_employees
// - Employee-Interface: monthly_gross + additional_salary_components ergaenzt
// - useEffect: Laedt monthly_gross + additional_salary_components direkt aus DB
//   (kein Rueckrechnen aus annual_salary mehr noetig)
// - handleEditMember: Speichert alle 3 Felder: monthly_gross, additional_salary_components,
//   annual_salary (berechnet) in v7_employees
// - Datenmigration in SQL: bestehende annual_salary Werte werden aufgeteilt
//
// AENDERUNGEN v7.3.95-3:
// - EditMemberDialog: Gehaltsberechnung erweitert wie in Prod-Version:
//   * Fix-Monatsbruttolohn (EUR) - wird x12 gerechnet
//   * Weitere fixe Gehaltsbestandteile (EUR/Jahr) - z.B. Weihnachtsgeld
//   * = Jahresbrutto: Anzeige als berechneter Summenwert
//   * annualSalary wird aus monthlyGross + additionalComponents berechnet
//   * Speichern speichert weiterhin annualSalary als Gesamtwert
//
// AENDERUNGEN v7.3.95-2:
// - EditMemberDialog: 2-Spalten-Layout (max-w-2xl statt max-w-md)
//   Linke Spalte: Lfd. Nr. + Anlage 6.1 Stundensatzberechnung
//   Rechte Spalte: Rolle + Zeitraum (seit/bis) + berechnete Werte
//   Speichern-Button immer sichtbar ohne Scrollen
//
// AENDERUNGEN v7.3.95-1:
// - Anlage 6.1 Felder im Bearbeiten-Dialog:
//   * Jahresbruttolohn/-gehalt (EUR) - Spalte 1
//   * pWAZ: Wochenarbeitszeit MA lt. Arbeitsvertrag (kann Teilzeit sein)
//   * bWAZ: betriebsuebliche Wochenarbeitszeit Vollzeit (i.d.R. 40h)
//   * Teilzeitfaktor = pWAZ / bWAZ (3 Nachkommastellen)
//   * Nominale Jahresarbeitsstunden = pWAZ * 52 (Spalte 2)
// - Stundensatz wird automatisch berechnet: Jahresbrutto / (pWAZ * 52) = Spalte 3
// - Stundensatz bleibt manuell ueberschreibbar (gelbe Hervorhebung)
// - Employee-Daten (annual_salary, weekly_hours, company_weekly_hours) werden mitgespeichert
//
// AENDERUNGEN v7.3.95:
// - FIX: Lfd. Nr. im Bearbeiten-Dialog jetzt AENDERBAR (nicht mehr disabled)
//   Duplikat-Pruefung: andere MA mit gleicher Nr. werden geprueft
// - Edit-Handler speichert jetzt auch employee_number mit
//
// Props:
// - projectId: string
// - clientCompanyId: string
// - canEdit: boolean
// - portal: 'berater' | 'firma'
// - onTeamChange?: () => void (Callback wenn Team geaendert wird)
// ============================================================================

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { 
  Plus, 
  Pencil, 
  UserMinus, 
  Users, 
  AlertCircle,
  X,
  Check,
  ExternalLink,
  Trash2
} from 'lucide-react';
import { PORTAL_COLORS } from '@/lib/v7-constants';

// ============================================================================
// TYPEN
// ============================================================================

interface Employee {
  id: string;
  display_name: string;
  first_name: string | null;
  last_name: string | null;
  qualification: string | null;
  weekly_hours: number | null;
  annual_salary: number | null;
  monthly_gross: number | null;
  additional_salary_components: number | null;
  company_weekly_hours: number | null;
  hourly_rate: number | null;
  is_active: boolean;
}

interface ProjectTeamMember {
  id: string;
  project_id: string;
  employee_id: string;
  employee_number: number | null;
  hourly_rate: number | null;
  role_in_project: string | null;
  assignment_start: string | null;
  assignment_end: string | null;
  is_active: boolean;
  // Joined from employee
  employee?: Employee;
}

interface ProjectTeamManagerProps {
  projectId: string;
  clientCompanyId: string;
  canEdit: boolean;
  portal: 'berater' | 'firma';
  onTeamChange?: () => void;
}

// Rollen-Optionen fuer Dropdown
const ROLE_OPTIONS = [
  'Projektleiter',
  'HW-Entwickler',
  'SW-Entwickler',
  'Systemarchitekt',
  'Systemtester',
  'Konstrukteur',
  'Versuchsingenieur',
  'Wissenschaftlicher Mitarbeiter',
  'Techniker',
  'Sonstige',
];

// ============================================================================
// HELPER
// ============================================================================

function formatShortName(firstName: string | null, lastName: string | null): string {
  if (!lastName) return '?';
  const initial = firstName ? `${firstName.charAt(0)}.` : '';
  return `${initial}${lastName}`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('de-DE');
}

function formatCurrency(value: number | null): string {
  if (value === null || value === undefined) return '-';
  return value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' EUR';
}

// ============================================================================
// KOMPONENTE: Dialog zum Hinzufuegen eines MA
// ============================================================================

interface AddMemberDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    employeeId: string;
    employeeNumber: number;
    hourlyRate: number | null;
    roleInProject: string | null;
    assignmentStart: string | null;
  }) => Promise<void>;
  availableEmployees: Employee[];
  existingNumbers: number[];
  portal: 'berater' | 'firma';
}

function AddMemberDialog({
  isOpen,
  onClose,
  onSave,
  availableEmployees,
  existingNumbers,
  portal,
}: AddMemberDialogProps) {
  const colors = PORTAL_COLORS[portal];
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [employeeNumber, setEmployeeNumber] = useState<string>('');
  const [hourlyRate, setHourlyRate] = useState<string>('');
  const [roleInProject, setRoleInProject] = useState<string>('');
  const [assignmentStart, setAssignmentStart] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset beim Oeffnen
  useEffect(() => {
    if (isOpen) {
      setSelectedEmployeeId('');
      setEmployeeNumber('');
      setHourlyRate('');
      setRoleInProject('');
      setAssignmentStart('');
      setError(null);
    }
  }, [isOpen]);

  // Naechste freie Nummer vorschlagen
  const suggestedNumber = useMemo(() => {
    if (existingNumbers.length === 0) return 1;
    return Math.max(...existingNumbers) + 1;
  }, [existingNumbers]);

  const handleSave = async () => {
    // Validierung
    if (!selectedEmployeeId) {
      setError('Bitte Mitarbeiter auswaehlen');
      return;
    }
    
    const numValue = parseInt(employeeNumber);
    if (!employeeNumber || isNaN(numValue) || numValue < 1) {
      setError('Bitte gueltige lfd. Nr. eingeben (mind. 1)');
      return;
    }
    
    if (existingNumbers.includes(numValue)) {
      setError(`Lfd. Nr. ${numValue} ist bereits vergeben`);
      return;
    }

    setSaving(true);
    setError(null);
    
    try {
      await onSave({
        employeeId: selectedEmployeeId,
        employeeNumber: numValue,
        hourlyRate: hourlyRate ? parseFloat(hourlyRate.replace(',', '.')) : null,
        roleInProject: roleInProject || null,
        assignmentStart: assignmentStart || null,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">
            Mitarbeiter zum Team hinzufuegen
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-4">
          {/* Fehler */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {/* Keine MA verfuegbar */}
          {availableEmployees.length === 0 ? (
            <div className="text-center py-6">
              <Users className="mx-auto h-12 w-12 text-gray-300 mb-3" />
              <p className="text-gray-600 mb-2">Keine Mitarbeiter verfuegbar</p>
              <p className="text-sm text-gray-500">
                Alle Mitarbeiter der Firma sind bereits im Projektteam, 
                oder es wurden noch keine Mitarbeiter angelegt.
              </p>
              <a 
                href={portal === 'berater' ? '#' : '/v7/firma/mitarbeiter'}
                className="inline-flex items-center gap-1 mt-4 text-sm text-blue-600 hover:underline"
              >
                <ExternalLink size={14} />
                Mitarbeiter in Firmendaten anlegen
              </a>
            </div>
          ) : (
            <>
              {/* MA Auswahl */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mitarbeiter *
                </label>
                <select
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">-- Bitte auswaehlen --</option>
                  {availableEmployees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.display_name} {emp.qualification ? `(${emp.qualification})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Lfd. Nr. */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lfd. Nr. gemaess Anlage 6.1 *
                </label>
                <input
                  type="number"
                  min="1"
                  value={employeeNumber}
                  onChange={(e) => setEmployeeNumber(e.target.value)}
                  placeholder={`Vorschlag: ${suggestedNumber}`}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Diese Nummer muss mit der Anlage 6.1 des Antrags uebereinstimmen
                </p>
              </div>

              {/* Stundensatz */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stundensatz (EUR/h)
                </label>
                <input
                  type="text"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                  placeholder="z.B. 45,00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Rolle */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rolle im Projekt
                </label>
                <select
                  value={roleInProject}
                  onChange={(e) => setRoleInProject(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">-- Optional --</option>
                  {ROLE_OPTIONS.map((role) => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </div>

              {/* Startdatum */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Im Projekt seit
                </label>
                <input
                  type="date"
                  value={assignmentStart}
                  onChange={(e) => setAssignmentStart(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leer lassen = ab Projektstart
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Abbrechen
          </button>
          {availableEmployees.length > 0 && (
            <button
              onClick={handleSave}
              disabled={saving}
              className={`px-4 py-2 text-white rounded-lg transition-colors ${colors.buttonBg} disabled:opacity-50`}
            >
              {saving ? 'Speichern...' : 'Hinzufuegen'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// KOMPONENTE: Dialog zum Bearbeiten eines Team-Mitglieds
// ============================================================================

interface EditMemberDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    employeeNumber: number;
    hourlyRate: number | null;
    annualSalary: number | null;
    monthlyGross: number | null;
    additionalSalaryComponents: number | null;
    personalWeeklyHours: number | null;
    companyWeeklyHours: number | null;
    roleInProject: string | null;
    assignmentStart: string | null;
    assignmentEnd: string | null;
  }) => Promise<void>;
  member: ProjectTeamMember | null;
  existingNumbers: number[];
  portal: 'berater' | 'firma';
}

function EditMemberDialog({
  isOpen,
  onClose,
  onSave,
  member,
  existingNumbers,
  portal,
}: EditMemberDialogProps) {
  const colors = PORTAL_COLORS[portal];
  const [employeeNumber, setEmployeeNumber] = useState<string>('');
  // Gehaltsberechnung: Monatsbrutto + Zusatzkomponenten = Jahresbrutto
  const [monthlyGross, setMonthlyGross] = useState<string>('');
  const [additionalComponents, setAdditionalComponents] = useState<string>('0');
  const [personalWeeklyHours, setPersonalWeeklyHours] = useState<string>('');
  const [companyWeeklyHours, setCompanyWeeklyHours] = useState<string>('');
  const [hourlyRate, setHourlyRate] = useState<string>('');
  const [hourlyRateManual, setHourlyRateManual] = useState(false);
  const [approvedRate, setApprovedRate] = useState<string>('');
  const [roleInProject, setRoleInProject] = useState<string>('');
  const [assignmentStart, setAssignmentStart] = useState<string>('');
  const [assignmentEnd, setAssignmentEnd] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Jahresbrutto = Monatsbrutto x 12 + Zusatzkomponenten
  const annualSalary = (() => {
    const monthly = parseFloat(monthlyGross);
    const additional = parseFloat(additionalComponents) || 0;
    if (monthly > 0) return monthly * 12 + additional;
    return null;
  })();

  // Teilzeitfaktor berechnen
  const teilzeitfaktor = (() => {
    const pWAZ = parseFloat(personalWeeklyHours);
    const bWAZ = parseFloat(companyWeeklyHours);
    if (pWAZ > 0 && bWAZ > 0) return pWAZ / bWAZ;
    return null;
  })();

  // Nominale Jahresarbeitsstunden = pWAZ * 52
  const yearlyHours = (() => {
    const pWAZ = parseFloat(personalWeeklyHours);
    if (pWAZ > 0) return pWAZ * 52;
    return null;
  })();

  // Werte setzen beim Oeffnen
  useEffect(() => {
    if (isOpen && member) {
      setEmployeeNumber(member.employee_number?.toString() || '');
      const emp = member.employee;

      // Anlage 6.1: Gehaltsdetails direkt aus neuen DB-Feldern laden
      if (emp?.monthly_gross) {
        // Neue DB-Felder vorhanden - direkt laden
        setMonthlyGross(emp.monthly_gross.toString());
        setAdditionalComponents((emp.additional_salary_components ?? 0).toString());
      } else if (emp?.annual_salary) {
        // Fallback: annual_salary / 12 als Naeherung (alte Datensaetze vor Migration)
        setMonthlyGross((emp.annual_salary / 12).toFixed(2));
        setAdditionalComponents('0');
      } else {
        setMonthlyGross('');
        setAdditionalComponents('0');
      }

      setPersonalWeeklyHours(emp?.weekly_hours?.toString() || '40');
      setCompanyWeeklyHours(emp?.company_weekly_hours?.toString() || '40');
      setHourlyRate(member.hourly_rate?.toString().replace('.', ',') || '');
      setApprovedRate('');

      // Pruefen ob Stundensatz manuell gesetzt wurde (nicht berechnet)
      const effectiveAnnual = emp?.monthly_gross
        ? emp.monthly_gross * 12 + (emp.additional_salary_components ?? 0)
        : (emp?.annual_salary ?? null);
      if (effectiveAnnual && emp?.weekly_hours) {
        const calcRate = effectiveAnnual / (emp.weekly_hours * 52);
        const currentRate = member.hourly_rate || 0;
        setHourlyRateManual(Math.abs(calcRate - currentRate) > 0.01);
      } else {
        setHourlyRateManual(member.hourly_rate !== null && member.hourly_rate > 0);
      }

      setRoleInProject(member.role_in_project || '');
      setAssignmentStart(member.assignment_start || '');
      setAssignmentEnd(member.assignment_end || '');
      setError(null);
    }
  }, [isOpen, member]);

  // Auto-Berechnung: Stundensatz = Jahresbrutto / (pWAZ * 52)
  const calculateRate = (salary: number | null, pWAZ: string) => {
    const hoursNum = parseFloat(pWAZ);
    if (salary && salary > 0 && hoursNum > 0) {
      const rate = salary / (hoursNum * 52);
      return rate.toFixed(2).replace('.', ',');
    }
    return '';
  };

  const handleMonthlyGrossChange = (value: string) => {
    setMonthlyGross(value);
    if (!hourlyRateManual) {
      const monthly = parseFloat(value);
      const additional = parseFloat(additionalComponents) || 0;
      const annual = monthly > 0 ? monthly * 12 + additional : null;
      const calc = calculateRate(annual, personalWeeklyHours);
      if (calc) setHourlyRate(calc);
    }
  };

  const handleAdditionalChange = (value: string) => {
    setAdditionalComponents(value);
    if (!hourlyRateManual) {
      const monthly = parseFloat(monthlyGross);
      const additional = parseFloat(value) || 0;
      const annual = monthly > 0 ? monthly * 12 + additional : null;
      const calc = calculateRate(annual, personalWeeklyHours);
      if (calc) setHourlyRate(calc);
    }
  };

  const handlePersonalHoursChange = (value: string) => {
    setPersonalWeeklyHours(value);
    if (!hourlyRateManual) {
      const calc = calculateRate(annualSalary, value);
      if (calc) setHourlyRate(calc);
    }
  };

  const handleHourlyRateChange = (value: string) => {
    setHourlyRate(value);
    setHourlyRateManual(true);
  };

  const handleResetRate = () => {
    setHourlyRateManual(false);
    const calc = calculateRate(annualSalary, personalWeeklyHours);
    if (calc) setHourlyRate(calc);
  };

  const handleSave = async () => {
    // Validierung lfd. Nr.
    const numValue = parseInt(employeeNumber);
    if (!employeeNumber || isNaN(numValue) || numValue < 1) {
      setError('Bitte gueltige lfd. Nr. eingeben (mind. 1)');
      return;
    }

    // Duplikat-Pruefung (andere MA mit gleicher Nr.)
    const otherNumbers = existingNumbers.filter(n => n !== member?.employee_number);
    if (otherNumbers.includes(numValue)) {
      setError(`Lfd. Nr. ${numValue} ist bereits an einen anderen Mitarbeiter vergeben`);
      return;
    }

    setSaving(true);
    setError(null);
    
    try {
      await onSave({
        employeeNumber: numValue,
        hourlyRate: hourlyRate ? parseFloat(hourlyRate.replace(',', '.')) : null,
        annualSalary: annualSalary,
        monthlyGross: monthlyGross ? parseFloat(monthlyGross) : null,
        additionalSalaryComponents: additionalComponents ? parseFloat(additionalComponents) : 0,
        personalWeeklyHours: personalWeeklyHours ? parseFloat(personalWeeklyHours) : null,
        companyWeeklyHours: companyWeeklyHours ? parseFloat(companyWeeklyHours) : null,
        roleInProject: roleInProject || null,
        assignmentStart: assignmentStart || null,
        assignmentEnd: assignmentEnd || null,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !member) return null;

  const employeeName = member.employee?.display_name || 'Mitarbeiter';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Team-Mitglied bearbeiten
            </h3>
            <p className="text-sm text-gray-500">
              {employeeName}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {/* Content: 2-Spalten-Layout */}
        <div className="px-6 py-4">
          {/* Fehler - volle Breite */}
          {error && (
            <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-6">
            {/* === LINKE SPALTE: Lfd. Nr. + Anlage 6.1 === */}
            <div className="space-y-4">

              {/* Lfd. Nr. */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lfd. Nr. gemaess Anlage 6.1 *
                </label>
                <input
                  type="number"
                  min="1"
                  value={employeeNumber}
                  onChange={(e) => setEmployeeNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Muss mit der Anlage 6.1 des Antrags uebereinstimmen
                </p>
              </div>

              {/* === Anlage 6.1: Gehaltsberechnung === */}
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">
                  Anlage 6.1 - Stundensatzberechnung
                </p>

                {/* Fix-Monatsbruttolohn */}
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fix-Monatsbruttolohn (EUR)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={monthlyGross}
                    onChange={(e) => handleMonthlyGrossChange(e.target.value)}
                    placeholder="z.B. 5200,00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Fix-Monatsbruttolohn lt. Arbeitsvertrag
                  </p>
                </div>

                {/* Weitere fixe Gehaltsbestandteile */}
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Weitere fixe Gehaltsbestandteile (EUR/Jahr)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={additionalComponents}
                    onChange={(e) => handleAdditionalChange(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Anlage 6.1a: Weihnachtsgeld, Urlaubsgeld etc. (oft 0)
                  </p>
                </div>

                {/* = Jahresbrutto Anzeige */}
                {annualSalary !== null && (
                  <div className="bg-white border border-blue-200 rounded-lg px-3 py-2 mb-3">
                    <span className="text-sm font-semibold text-gray-700">= Jahresbrutto: </span>
                    <span className="text-sm font-bold text-blue-800">
                      {annualSalary.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EUR
                    </span>
                  </div>
                )}

                {/* pWAZ + bWAZ nebeneinander */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      pWAZ (Std.)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="60"
                      value={personalWeeklyHours}
                      onChange={(e) => handlePersonalHoursChange(e.target.value)}
                      placeholder="40"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      lt. Arbeitsvertrag
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      bWAZ (Std.)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="60"
                      value={companyWeeklyHours}
                      onChange={(e) => setCompanyWeeklyHours(e.target.value)}
                      placeholder="40"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Betriebsueblich (Vollzeit)
                    </p>
                  </div>
                </div>

                {/* Stundensatz */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Stundensatz (EUR/h)
                    </label>
                    {hourlyRateManual && annualSalary && personalWeeklyHours && (
                      <button
                        type="button"
                        onClick={handleResetRate}
                        className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        Neu berechnen
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={hourlyRate}
                    onChange={(e) => handleHourlyRateChange(e.target.value)}
                    placeholder="z.B. 30,00"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      hourlyRateManual ? 'border-amber-300 bg-amber-50' : 'border-gray-300'
                    }`}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {hourlyRateManual
                      ? 'Manuell eingegeben (ueberschreibt Berechnung)'
                      : annualSalary && personalWeeklyHours
                        ? 'Spalte 3: Jahresbrutto / (pWAZ x 52)'
                        : 'Wird aus Jahresbrutto und pWAZ berechnet'
                    }
                  </p>
                </div>

                {/* Bewilligter Stundensatz lt. Bescheid */}
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bewilligter Stundensatz lt. Bescheid (EUR/h)
                  </label>
                  <input
                    type="text"
                    value={approvedRate}
                    onChange={(e) => setApprovedRate(e.target.value)}
                    placeholder="z.B. 57,69"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Falls abweichend vom kalkulatorischen Satz (Punkt 1.2.2 im Bescheid)
                  </p>
                </div>
              </div>
            </div>

            {/* === RECHTE SPALTE: Berechnete Werte + Rolle + Zeitraum === */}
            <div className="space-y-4">

              {/* Berechnete Werte (nur wenn Daten vorhanden) */}
              <div className="border border-gray-200 rounded-lg p-4 bg-blue-50">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">
                  Berechnete Werte
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Jahresarbeitsstd. (pWAZ x 52):</span>
                    <span className="font-medium">
                      {yearlyHours ? yearlyHours.toLocaleString('de-DE') + ' h' : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Teilzeitfaktor (pWAZ / bWAZ):</span>
                    <span className="font-medium">
                      {teilzeitfaktor ? teilzeitfaktor.toFixed(3).replace('.', ',') : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-blue-200 pt-2 mt-2">
                    <span className="text-gray-700 font-medium">Stundensatz (berechnet):</span>
                    <span className="font-semibold text-blue-800">
                      {annualSalary && personalWeeklyHours
                        ? (annualSalary / (parseFloat(personalWeeklyHours) * 52))
                            .toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' EUR/h'
                        : '-'
                      }
                    </span>
                  </div>
                </div>
              </div>

              {/* Rolle */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rolle im Projekt
                </label>
                <select
                  value={roleInProject}
                  onChange={(e) => setRoleInProject(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">-- Optional --</option>
                  {ROLE_OPTIONS.map((role) => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </div>

              {/* Zeitraum: Im Projekt seit */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Im Projekt seit
                </label>
                <input
                  type="date"
                  value={assignmentStart}
                  onChange={(e) => setAssignmentStart(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Zeitraum: Im Projekt bis */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Im Projekt bis
                </label>
                <input
                  type="date"
                  value={assignmentEnd}
                  onChange={(e) => setAssignmentEnd(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leer lassen = Mitarbeiter noch aktiv im Projekt
                </p>
              </div>

            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-lg">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Abbrechen
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className={`px-4 py-2 text-white rounded-lg transition-colors ${colors.buttonBg} disabled:opacity-50`}
          >
            {saving ? 'Speichern...' : 'Speichern'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// HAUPTKOMPONENTE
// ============================================================================

export default function ProjectTeamManager({
  projectId,
  clientCompanyId,
  canEdit,
  portal,
  onTeamChange,
}: ProjectTeamManagerProps) {
  const supabase = createClient();
  const colors = PORTAL_COLORS[portal];
  
  const [loading, setLoading] = useState(true);
  const [teamMembers, setTeamMembers] = useState<ProjectTeamMember[]>([]);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingMember, setEditingMember] = useState<ProjectTeamMember | null>(null);
  const [deletingMember, setDeletingMember] = useState<ProjectTeamMember | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [memberHasTimeEntries, setMemberHasTimeEntries] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Daten laden
  useEffect(() => {
    loadData();
  }, [projectId, clientCompanyId]);

  const loadData = async () => {
    setLoading(true);
    
    // DEBUG
    console.log('ProjectTeamManager - loadData called');
    console.log('  projectId:', projectId);
    console.log('  clientCompanyId:', clientCompanyId);
    
    try {
      // Team-Mitglieder laden
      const { data: teamData, error: teamError } = await supabase
        .from('v7_project_assignments')
        .select(`
          *,
          employee:v7_employees(*)
        `)
        .eq('project_id', projectId)
        .order('employee_number', { ascending: true });

      console.log('  teamData:', teamData?.length, 'Eintraege');
      if (teamError) {
        console.error('  teamError:', teamError);
        throw teamError;
      }
      setTeamMembers(teamData || []);

      // Alle MA der Firma laden
      const { data: empData, error: empError } = await supabase
        .from('v7_employees')
        .select('*')
        .eq('client_company_id', clientCompanyId)
        .eq('is_active', true)
        .order('display_name');

      console.log('  empData:', empData?.length, 'Mitarbeiter gefunden');
      if (empError) {
        console.error('  empError:', empError);
        throw empError;
      }
      setAllEmployees(empData || []);

    } catch (err) {
      console.error('Fehler beim Laden des Teams:', err);
    } finally {
      setLoading(false);
    }
  };

  // Verfuegbare MA (noch nicht im Team)
  const availableEmployees = useMemo(() => {
    const teamEmployeeIds = new Set(teamMembers.map(m => m.employee_id));
    return allEmployees.filter(emp => !teamEmployeeIds.has(emp.id));
  }, [allEmployees, teamMembers]);

  // Bereits vergebene Nummern
  const existingNumbers = useMemo(() => {
    return teamMembers
      .filter(m => m.employee_number !== null)
      .map(m => m.employee_number as number);
  }, [teamMembers]);

  // MA hinzufuegen
  const handleAddMember = async (data: {
    employeeId: string;
    employeeNumber: number;
    hourlyRate: number | null;
    roleInProject: string | null;
    assignmentStart: string | null;
  }) => {
    const { error } = await supabase
      .from('v7_project_assignments')
      .insert({
        project_id: projectId,
        employee_id: data.employeeId,
        employee_number: data.employeeNumber,
        hourly_rate: data.hourlyRate,
        role_in_project: data.roleInProject,
        assignment_start: data.assignmentStart,
        is_active: true,
      });

    if (error) throw error;
    
    await loadData();
    onTeamChange?.();
  };

  // MA bearbeiten
  const handleEditMember = async (data: {
    employeeNumber: number;
    hourlyRate: number | null;
    annualSalary: number | null;
    monthlyGross: number | null;
    additionalSalaryComponents: number | null;
    personalWeeklyHours: number | null;
    companyWeeklyHours: number | null;
    roleInProject: string | null;
    assignmentStart: string | null;
    assignmentEnd: string | null;
  }) => {
    if (!editingMember) return;

    // 1. Project Assignment aktualisieren (Stundensatz, Rolle, Zeitraum)
    const { error: assignError } = await supabase
      .from('v7_project_assignments')
      .update({
        employee_number: data.employeeNumber,
        hourly_rate: data.hourlyRate,
        role_in_project: data.roleInProject,
        assignment_start: data.assignmentStart,
        assignment_end: data.assignmentEnd,
        is_active: !data.assignmentEnd,
      })
      .eq('id', editingMember.id);

    if (assignError) throw assignError;

    // 2. Anlage 6.1 Felder im Employee-Stamm speichern (inkl. neue Felder)
    const empUpdate: Record<string, any> = {};
    if (data.monthlyGross !== null)              empUpdate.monthly_gross = data.monthlyGross;
    if (data.additionalSalaryComponents !== null) empUpdate.additional_salary_components = data.additionalSalaryComponents;
    if (data.annualSalary !== null)              empUpdate.annual_salary = data.annualSalary;
    if (data.personalWeeklyHours !== null)       empUpdate.weekly_hours = data.personalWeeklyHours;
    if (data.companyWeeklyHours !== null)        empUpdate.company_weekly_hours = data.companyWeeklyHours;
    if (data.hourlyRate !== null)                empUpdate.hourly_rate = data.hourlyRate;

    if (Object.keys(empUpdate).length > 0) {
      const { error: empError } = await supabase
        .from('v7_employees')
        .update(empUpdate)
        .eq('id', editingMember.employee_id);

      if (empError) {
        console.error('Fehler beim Speichern der Anlage 6.1 Daten:', empError);
        // Kein throw - Assignment wurde schon gespeichert
      }
    }
    
    await loadData();
    onTeamChange?.();
  };

  // MA loeschen - Pruefung ob Zeiterfassung existiert
  const handleDeleteClick = async (member: ProjectTeamMember) => {
    setDeletingMember(member);
    
    // Pruefe ob MA Zeiterfassung in diesem Projekt hat
    const { count, error } = await supabase
      .from('v7_time_entries')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .eq('employee_id', member.employee_id);
    
    if (error) {
      console.error('Fehler beim Pruefen der Zeiterfassung:', error);
      setMemberHasTimeEntries(false);
    } else {
      setMemberHasTimeEntries((count || 0) > 0);
    }
    
    setShowDeleteDialog(true);
  };

  // MA tatsaechlich loeschen
  const handleDeleteConfirm = async () => {
    if (!deletingMember) return;
    
    setDeleting(true);
    
    try {
      const { error } = await supabase
        .from('v7_project_assignments')
        .delete()
        .eq('id', deletingMember.id);
      
      if (error) throw error;
      
      await loadData();
      onTeamChange?.();
      setShowDeleteDialog(false);
      setDeletingMember(null);
    } catch (err) {
      console.error('Fehler beim Loeschen:', err);
    } finally {
      setDeleting(false);
    }
  };

  // Loading
  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400 mx-auto"></div>
        <p className="text-gray-500 mt-2">Team wird geladen...</p>
      </div>
    );
  }

  // Leerer Zustand
  if (teamMembers.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <div className="text-center">
          <Users className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Keine Mitarbeiter zugeordnet
          </h3>
          <p className="text-gray-500 mb-6">
            Stellen Sie das Projektteam zusammen, bevor Sie Arbeitspakete anlegen.
          </p>
          
          {canEdit && (
            <>
              {allEmployees.length === 0 ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-left">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="text-yellow-600 mt-0.5" size={20} />
                    <div>
                      <p className="text-yellow-800 font-medium">
                        Keine Mitarbeiter in der Firma vorhanden
                      </p>
                      <p className="text-yellow-700 text-sm mt-1">
                        Bitte legen Sie zuerst Mitarbeiter in den Firmendaten an.
                      </p>
                      <a 
                        href={portal === 'berater' ? '#' : '/v7/firma/mitarbeiter'}
                        className="inline-flex items-center gap-1 mt-2 text-sm text-blue-600 hover:underline"
                      >
                        <ExternalLink size={14} />
                        Zu den Firmendaten / Mitarbeiter
                      </a>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowAddDialog(true)}
                  className={`inline-flex items-center gap-2 px-4 py-2 text-white rounded-lg ${colors.buttonBg}`}
                >
                  <Plus size={18} />
                  Mitarbeiter hinzufuegen
                </button>
              )}
            </>
          )}
        </div>

        {/* Dialoge */}
        <AddMemberDialog
          isOpen={showAddDialog}
          onClose={() => setShowAddDialog(false)}
          onSave={handleAddMember}
          availableEmployees={availableEmployees}
          existingNumbers={existingNumbers}
          portal={portal}
        />
      </div>
    );
  }

  // Team-Tabelle
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center px-4 py-3 border-b bg-gray-50">
        <div>
          <h3 className="font-semibold text-gray-900">Team</h3>
          <p className="text-sm text-gray-500">
            {teamMembers.filter(m => m.is_active).length} aktive Mitarbeiter
          </p>
        </div>
        {canEdit && availableEmployees.length > 0 && (
          <button
            onClick={() => setShowAddDialog(true)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-white rounded-lg ${colors.buttonBg}`}
          >
            <Plus size={16} />
            Mitarbeiter hinzufuegen
          </button>
        )}
      </div>

      {/* Tabelle */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="px-4 py-3 text-left font-medium text-gray-600">Nr.</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Mitarbeiter</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Qualifikation</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Rolle</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Stundensatz</th>
              <th className="px-4 py-3 text-center font-medium text-gray-600">Zeitraum</th>
              <th className="px-4 py-3 text-center font-medium text-gray-600">Status</th>
              {canEdit && (
                <th className="px-4 py-3 text-center font-medium text-gray-600">Aktionen</th>
              )}
            </tr>
          </thead>
          <tbody>
            {teamMembers.map((member) => {
              const emp = member.employee;
              const isActive = member.is_active && !member.assignment_end;
              
              return (
                <tr 
                  key={member.id} 
                  className={`border-b hover:bg-gray-50 ${!isActive ? 'bg-gray-50 text-gray-500' : ''}`}
                >
                  <td className="px-4 py-3 font-medium">
                    {member.employee_number || '-'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{emp?.display_name || '-'}</div>
                    {emp?.first_name && emp?.last_name && (
                      <div className="text-xs text-gray-500">
                        {formatShortName(emp.first_name, emp.last_name)}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {emp?.qualification || '-'}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {member.role_in_project || '-'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {formatCurrency(member.hourly_rate)}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-600">
                    {member.assignment_start || member.assignment_end ? (
                      <span className="text-xs">
                        {formatDate(member.assignment_start)} - {formatDate(member.assignment_end)}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">Gesamte Laufzeit</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {isActive ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Aktiv
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-600">
                        Ausgeschieden
                      </span>
                    )}
                  </td>
                  {canEdit && (
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => {
                            setEditingMember(member);
                            setShowEditDialog(true);
                          }}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Bearbeiten"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(member)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Entfernen"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Hinweis wenn alle MA der Firma im Team */}
      {canEdit && availableEmployees.length === 0 && allEmployees.length > 0 && (
        <div className="px-4 py-3 bg-blue-50 border-t text-sm text-blue-700">
          Alle Mitarbeiter der Firma sind bereits im Projektteam.
        </div>
      )}

      {/* Dialoge */}
      <AddMemberDialog
        isOpen={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        onSave={handleAddMember}
        availableEmployees={availableEmployees}
        existingNumbers={existingNumbers}
        portal={portal}
      />

      <EditMemberDialog
        isOpen={showEditDialog}
        onClose={() => {
          setShowEditDialog(false);
          setEditingMember(null);
        }}
        onSave={handleEditMember}
        member={editingMember}
        existingNumbers={existingNumbers}
        portal={portal}
      />

      {/* Loeschen-Dialog */}
      {showDeleteDialog && deletingMember && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${memberHasTimeEntries ? 'bg-amber-100' : 'bg-red-100'}`}>
                  {memberHasTimeEntries ? (
                    <AlertCircle className="text-amber-600" size={20} />
                  ) : (
                    <Trash2 className="text-red-600" size={20} />
                  )}
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {memberHasTimeEntries ? 'Mitarbeiter hat Zeiterfassung' : 'Mitarbeiter entfernen'}
                </h3>
              </div>
              <button 
                onClick={() => {
                  setShowDeleteDialog(false);
                  setDeletingMember(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="px-6 py-4">
              <p className="text-gray-700 mb-2">
                <strong>MA {deletingMember.employee_number}: {deletingMember.employee?.display_name}</strong>
              </p>
              
              {memberHasTimeEntries ? (
                <div className="space-y-3">
                  <p className="text-gray-600">
                    Dieser Mitarbeiter hat bereits Stunden in diesem Projekt erfasst und kann nicht geloescht werden.
                  </p>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                    <strong>Alternative:</strong> Setzen Sie im Bearbeiten-Dialog ein "Im Projekt bis" Datum, 
                    um den Mitarbeiter als ausgeschieden zu markieren.
                  </div>
                </div>
              ) : (
                <p className="text-gray-600">
                  Moechten Sie diesen Mitarbeiter wirklich aus dem Projektteam entfernen?
                  Diese Aktion kann nicht rueckgaengig gemacht werden.
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-lg">
              <button
                onClick={() => {
                  setShowDeleteDialog(false);
                  setDeletingMember(null);
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {memberHasTimeEntries ? 'Schliessen' : 'Abbrechen'}
              </button>
              
              {!memberHasTimeEntries && (
                <button
                  onClick={handleDeleteConfirm}
                  disabled={deleting}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {deleting ? 'Wird entfernt...' : 'Entfernen'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
