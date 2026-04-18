// src/components/shared/ProjectTeamManager.tsx
// ============================================================================
// PZE V7 - Projekt-Team Management
// ============================================================================
// Datum: 03. Februar 2026
// Version: 7.3.87
//
// Verwaltet das Projektteam:
// - MA aus Firmenstamm zum Projekt hinzufügen
// - Projektspezifische Daten: Lfd. Nr., Stundensatz, Rolle, Zeitraum
// - MA wird nie gelöscht, nur Zeitraum beendet
//
// Props:
// - projectId: string
// - clientCompanyId: string
// - canEdit: boolean
// - portal: 'berater' | 'firma'
// - onTeamChange?: () => void (Callback wenn Team geändert wird)
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
  ExternalLink
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

// Rollen-Optionen für Dropdown
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
  return value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

// ============================================================================
// KOMPONENTE: Dialog zum Hinzufügen eines MA
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

  // Reset beim Öffnen
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

  // Nächste freie Nummer vorschlagen
  const suggestedNumber = useMemo(() => {
    if (existingNumbers.length === 0) return 1;
    return Math.max(...existingNumbers) + 1;
  }, [existingNumbers]);

  const handleSave = async () => {
    // Validierung
    if (!selectedEmployeeId) {
      setError('Bitte Mitarbeiter auswählen');
      return;
    }
    
    const numValue = parseInt(employeeNumber);
    if (!employeeNumber || isNaN(numValue) || numValue < 1) {
      setError('Bitte gültige lfd. Nr. eingeben (mind. 1)');
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
            Mitarbeiter zum Team hinzufügen
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

          {/* Keine MA verfügbar */}
          {availableEmployees.length === 0 ? (
            <div className="text-center py-6">
              <Users className="mx-auto h-12 w-12 text-gray-300 mb-3" />
              <p className="text-gray-600 mb-2">Keine Mitarbeiter verfügbar</p>
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
                  <option value="">-- Bitte auswählen --</option>
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
                  Lfd. Nr. gemäß Anlage 6.1 *
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
                  Diese Nummer muss mit der Anlage 6.1 des Antrags übereinstimmen
                </p>
              </div>

              {/* Stundensatz */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stundensatz (€/h)
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
              className={`px-4 py-2 text-white rounded-lg transition-colors ${colors.button} disabled:opacity-50`}
            >
              {saving ? 'Speichern...' : 'Hinzufügen'}
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
    hourlyRate: number | null;
    roleInProject: string | null;
    assignmentStart: string | null;
    assignmentEnd: string | null;
  }) => Promise<void>;
  member: ProjectTeamMember | null;
  portal: 'berater' | 'firma';
}

function EditMemberDialog({
  isOpen,
  onClose,
  onSave,
  member,
  portal,
}: EditMemberDialogProps) {
  const colors = PORTAL_COLORS[portal];
  const [hourlyRate, setHourlyRate] = useState<string>('');
  const [roleInProject, setRoleInProject] = useState<string>('');
  const [assignmentStart, setAssignmentStart] = useState<string>('');
  const [assignmentEnd, setAssignmentEnd] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Werte setzen beim Öffnen
  useEffect(() => {
    if (isOpen && member) {
      setHourlyRate(member.hourly_rate?.toString().replace('.', ',') || '');
      setRoleInProject(member.role_in_project || '');
      setAssignmentStart(member.assignment_start || '');
      setAssignmentEnd(member.assignment_end || '');
      setError(null);
    }
  }, [isOpen, member]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    
    try {
      await onSave({
        hourlyRate: hourlyRate ? parseFloat(hourlyRate.replace(',', '.')) : null,
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Team-Mitglied bearbeiten
            </h3>
            <p className="text-sm text-gray-500">
              MA {member.employee_number}: {employeeName}
            </p>
          </div>
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

          {/* Lfd. Nr. (nur Anzeige) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Lfd. Nr. gemäß Anlage 6.1
            </label>
            <input
              type="text"
              value={member.employee_number || '-'}
              disabled
              className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Die lfd. Nr. kann nicht geändert werden
            </p>
          </div>

          {/* Stundensatz */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Stundensatz (€/h)
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

          {/* Zeitraum */}
          <div className="grid grid-cols-2 gap-4">
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
                Leer = noch aktiv
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Abbrechen
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className={`px-4 py-2 text-white rounded-lg transition-colors ${colors.button} disabled:opacity-50`}
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

  // Daten laden
  useEffect(() => {
    loadData();
  }, [projectId, clientCompanyId]);

  const loadData = async () => {
    setLoading(true);
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

      if (teamError) throw teamError;
      setTeamMembers(teamData || []);

      // Alle MA der Firma laden
      const { data: empData, error: empError } = await supabase
        .from('v7_employees')
        .select('*')
        .eq('client_company_id', clientCompanyId)
        .eq('is_active', true)
        .order('display_name');

      if (empError) throw empError;
      setAllEmployees(empData || []);

    } catch (err) {
      console.error('Fehler beim Laden des Teams:', err);
    } finally {
      setLoading(false);
    }
  };

  // Verfügbare MA (noch nicht im Team)
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

  // MA hinzufügen
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
    hourlyRate: number | null;
    roleInProject: string | null;
    assignmentStart: string | null;
    assignmentEnd: string | null;
  }) => {
    if (!editingMember) return;

    const { error } = await supabase
      .from('v7_project_assignments')
      .update({
        hourly_rate: data.hourlyRate,
        role_in_project: data.roleInProject,
        assignment_start: data.assignmentStart,
        assignment_end: data.assignmentEnd,
        is_active: !data.assignmentEnd, // Wenn Enddatum gesetzt, nicht mehr aktiv
      })
      .eq('id', editingMember.id);

    if (error) throw error;
    
    await loadData();
    onTeamChange?.();
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
                  className={`inline-flex items-center gap-2 px-4 py-2 text-white rounded-lg ${colors.button}`}
                >
                  <Plus size={18} />
                  Mitarbeiter hinzufügen
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
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-white rounded-lg ${colors.button}`}
          >
            <Plus size={16} />
            Mitarbeiter hinzufügen
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
        portal={portal}
      />
    </div>
  );
}
