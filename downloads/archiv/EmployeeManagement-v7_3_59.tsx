// src/components/shared/EmployeeManagement.tsx
// ============================================================================
// PZE V7 - Shared Employee Management Component
// ============================================================================
// Datum: 21. Januar 2026
// Version: 7.3.59
//
// Wird von beiden Portalen genutzt:
// - Firmen-Portal: /v7/firma/mitarbeiter
// - Berater-Portal: /v7/berater/foerderung/firma/[id]?tab=mitarbeiter
//
// Volle CRUD-Funktionalitaet:
// - Liste mit Suche
// - Anlegen
// - Bearbeiten
// - Deaktivieren/Reaktivieren
// - Portal-Rolle zuweisen (employee/project_leader/client_admin)
//
// Props:
// - portal: 'berater' | 'firma'
// - companyId: string
// - canEdit: boolean
// - title?: string
// ============================================================================

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Users,
  Search,
  Plus,
  Pencil,
  UserX,
  RefreshCw,
  X,
  Save,
  KeyRound,
} from 'lucide-react';

// ============================================================================
// TYPEN
// ============================================================================

export interface Employee {
  id: string;
  display_name: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  position_title: string | null;
  qualification: string | null;
  weekly_hours: number | null;
  employment_start: string | null;
  employment_end: string | null;
  is_active: boolean;
  portal_role: string | null;
  user_id: string | null;
}

interface EmployeeFormData {
  display_name: string;
  first_name: string;
  last_name: string;
  email: string;
  position_title: string;
  qualification: string;
  weekly_hours: string;
  employment_start: string;
  employment_end: string;
  portal_role: string;
}

interface EmployeeManagementProps {
  portal: 'berater' | 'firma';
  companyId: string;
  canEdit: boolean;
  title?: string;
}

// ============================================================================
// KONSTANTEN
// ============================================================================

const EMPTY_FORM: EmployeeFormData = {
  display_name: '',
  first_name: '',
  last_name: '',
  email: '',
  position_title: '',
  qualification: '',
  weekly_hours: '40',
  employment_start: '',
  employment_end: '',
  portal_role: 'employee',
};

const QUALIFICATION_OPTIONS = [
  'keine Ausbildung',
  'Berufsausbildung',
  'Meister/Techniker',
  'Bachelor',
  'Master/Diplom',
  'Promotion',
];

const PORTAL_ROLE_OPTIONS = [
  { value: 'employee', label: 'Mitarbeiter', description: 'Kann nur eigene Zeiterfassung sehen' },
  { value: 'project_leader', label: 'Projektleiter', description: 'Kann zugeordnete Projekte und deren MA sehen' },
  { value: 'client_admin', label: 'Administrator', description: 'Voller Zugriff auf alle Firmendaten' },
];

const PORTAL_COLORS = {
  berater: {
    button: 'bg-blue-600 hover:bg-blue-700',
    focus: 'focus:ring-blue-500',
    badge: 'bg-blue-100 text-blue-800',
    text: 'text-blue-600',
    hover: 'hover:text-blue-900',
  },
  firma: {
    button: 'bg-green-600 hover:bg-green-700',
    focus: 'focus:ring-green-500',
    badge: 'bg-green-100 text-green-800',
    text: 'text-green-600',
    hover: 'hover:text-green-900',
  },
};

// ============================================================================
// KOMPONENTE
// ============================================================================

export default function EmployeeManagement({
  portal,
  companyId,
  canEdit,
  title = 'Mitarbeiter',
}: EmployeeManagementProps) {
  const supabase = createClient();
  const colors = PORTAL_COLORS[portal];

  // State - Daten
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showInactive, setShowInactive] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // State - Modal
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState<EmployeeFormData>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  // State - Delete Confirm
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);

  // State - Login erstellen Modal
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginEmployee, setLoginEmployee] = useState<Employee | null>(null);
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [creatingLogin, setCreatingLogin] = useState(false);

  // ============================================================================
  // DATEN LADEN
  // ============================================================================

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('v7_employees')
        .select('id, display_name, first_name, last_name, email, position_title, qualification, weekly_hours, employment_start, employment_end, is_active, portal_role, user_id')
        .eq('client_company_id', companyId)
        .order('display_name');

      if (!showInactive) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;
      if (error) throw error;
      setEmployees(data || []);
    } catch (err) {
      console.error('Fehler beim Laden:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase, companyId, showInactive]);

  useEffect(() => {
    if (companyId) loadEmployees();
  }, [companyId, loadEmployees]);

  // ============================================================================
  // MODAL FUNKTIONEN
  // ============================================================================

  const openCreateModal = () => {
    setModalMode('create');
    setEditingEmployee(null);
    setFormData(EMPTY_FORM);
    setFormError(null);
    setShowModal(true);
  };

  const openEditModal = (emp: Employee) => {
    setModalMode('edit');
    setEditingEmployee(emp);
    setFormData({
      display_name: emp.display_name || '',
      first_name: emp.first_name || '',
      last_name: emp.last_name || '',
      email: emp.email || '',
      position_title: emp.position_title || '',
      qualification: emp.qualification || '',
      weekly_hours: emp.weekly_hours?.toString() || '40',
      employment_start: emp.employment_start?.split('T')[0] || '',
      employment_end: emp.employment_end?.split('T')[0] || '',
      portal_role: emp.portal_role || 'employee',
    });
    setFormError(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingEmployee(null);
    setFormData(EMPTY_FORM);
    setFormError(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      // Auto-generate display_name
      if (name === 'first_name' || name === 'last_name') {
        const firstName = name === 'first_name' ? value : prev.first_name;
        const lastName = name === 'last_name' ? value : prev.last_name;
        if (lastName || firstName) {
          updated.display_name = lastName && firstName
            ? `${lastName}, ${firstName}`
            : lastName || firstName;
        }
      }
      return updated;
    });
  };

  // ============================================================================
  // CRUD FUNKTIONEN
  // ============================================================================

  const handleSave = async () => {
    if (!formData.display_name.trim()) {
      setFormError('Anzeigename ist erforderlich');
      return;
    }

    setSaving(true);
    setFormError(null);

    try {
      const employeeData = {
        display_name: formData.display_name.trim(),
        first_name: formData.first_name.trim() || null,
        last_name: formData.last_name.trim() || null,
        email: formData.email.trim() || null,
        position_title: formData.position_title.trim() || null,
        qualification: formData.qualification.trim() || null,
        weekly_hours: formData.weekly_hours ? parseFloat(formData.weekly_hours) : 40,
        employment_start: formData.employment_start || null,
        employment_end: formData.employment_end || null,
        portal_role: formData.portal_role || 'employee',
        updated_at: new Date().toISOString(),
      };

      if (modalMode === 'create') {
        const { error } = await supabase
          .from('v7_employees')
          .insert({
            ...employeeData,
            client_company_id: companyId,
            is_active: true,
          });

        if (error) {
          if (error.code === '23505') {
            setFormError('Ein Mitarbeiter mit diesem Namen existiert bereits');
          } else {
            setFormError(error.message);
          }
          return;
        }
      } else if (editingEmployee) {
        const { error } = await supabase
          .from('v7_employees')
          .update(employeeData)
          .eq('id', editingEmployee.id);

        if (error) {
          setFormError(error.message);
          return;
        }
      }

      closeModal();
      await loadEmployees();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (emp: Employee) => {
    setEmployeeToDelete(emp);
    setShowDeleteConfirm(true);
  };

  const handleDelete = async () => {
    if (!employeeToDelete) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('v7_employees')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', employeeToDelete.id);

      if (error) throw error;

      setShowDeleteConfirm(false);
      setEmployeeToDelete(null);
      await loadEmployees();
    } catch (err: any) {
      console.error('Fehler beim Deaktivieren:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleReactivate = async (emp: Employee) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('v7_employees')
        .update({ is_active: true, updated_at: new Date().toISOString() })
        .eq('id', emp.id);

      if (error) throw error;
      await loadEmployees();
    } catch (err: any) {
      console.error('Fehler beim Reaktivieren:', err);
    } finally {
      setSaving(false);
    }
  };

  // ============================================================================
  // LOGIN ERSTELLEN
  // ============================================================================

  const openLoginModal = (emp: Employee) => {
    if (!emp.email) {
      alert('Mitarbeiter hat keine E-Mail-Adresse hinterlegt.');
      return;
    }
    setLoginEmployee(emp);
    setLoginPassword('');
    setLoginError(null);
    setShowLoginModal(true);
  };

  const closeLoginModal = () => {
    setShowLoginModal(false);
    setLoginEmployee(null);
    setLoginPassword('');
    setLoginError(null);
  };

  const handleCreateLogin = async () => {
    if (!loginEmployee || !loginEmployee.email) return;

    if (loginPassword.length < 6) {
      setLoginError('Passwort muss mindestens 6 Zeichen haben.');
      return;
    }

    setCreatingLogin(true);
    setLoginError(null);

    try {
      // 1. Auth-User erstellen (Admin API - ohne E-Mail-Versand)
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: loginEmployee.email,
        password: loginPassword,
        email_confirm: true, // Direkt bestaetigt, keine E-Mail
      });

      if (authError) {
        // Fallback: Normale signUp verwenden (sendet evtl. E-Mail)
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: loginEmployee.email,
          password: loginPassword,
          options: {
            data: {
              display_name: loginEmployee.display_name,
            }
          }
        });

        if (signUpError) {
          if (signUpError.message.includes('already registered')) {
            setLoginError('Diese E-Mail ist bereits registriert.');
          } else {
            setLoginError(signUpError.message);
          }
          return;
        }

        if (!signUpData.user) {
          setLoginError('Benutzer konnte nicht erstellt werden.');
          return;
        }

        // User ID von signUp
        const userId = signUpData.user.id;

        // 2. user_profile erstellen
        await createUserProfile(userId, loginEmployee);

        // 3. employee.user_id verknuepfen
        await linkEmployeeToUser(loginEmployee.id, userId);

      } else if (authData.user) {
        // Admin API hat funktioniert
        const userId = authData.user.id;

        // 2. user_profile erstellen
        await createUserProfile(userId, loginEmployee);

        // 3. employee.user_id verknuepfen
        await linkEmployeeToUser(loginEmployee.id, userId);
      }

      closeLoginModal();
      await loadEmployees();
      alert(`Login erstellt fuer ${loginEmployee.display_name}!\n\nE-Mail: ${loginEmployee.email}\nPasswort: ${loginPassword}`);

    } catch (err: any) {
      console.error('Fehler beim Login erstellen:', err);
      setLoginError(err.message || 'Ein Fehler ist aufgetreten.');
    } finally {
      setCreatingLogin(false);
    }
  };

  const createUserProfile = async (userId: string, emp: Employee) => {
    // v7_user_profiles.role kann sein: 'system_admin', 'consultant', 'client_user'
    // Firmen-Mitarbeiter sind immer 'client_user' - die Portal-Rolle steht in v7_employees.portal_role
    const { error } = await supabase
      .from('v7_user_profiles')
      .insert({
        id: userId,
        email: emp.email,
        role: 'client_user',  // Alle Firmen-MA sind client_user
        display_name: emp.display_name,
        first_name: emp.first_name,
        last_name: emp.last_name,
        client_company_id: companyId,
      });

    if (error && error.code !== '23505') {
      throw error;
    }
  };

  const linkEmployeeToUser = async (employeeId: string, userId: string) => {
    const { error } = await supabase
      .from('v7_employees')
      .update({ 
        user_id: userId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', employeeId);

    if (error) throw error;
  };

  // ============================================================================
  // HILFSFUNKTIONEN
  // ============================================================================

  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('de-DE');
  };

  // Filter
  const filteredEmployees = employees.filter(e =>
    e.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (e.email && e.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (e.position_title && e.position_title.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const activeCount = employees.filter(e => e.is_active).length;
  const inactiveCount = employees.filter(e => !e.is_active).length;

  // ============================================================================
  // RENDER - LOADING
  // ============================================================================

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className={`w-10 h-10 border-4 border-gray-200 rounded-full animate-spin ${
          portal === 'berater' ? 'border-t-blue-600' : 'border-t-green-600'
        }`}></div>
      </div>
    );
  }

  // ============================================================================
  // RENDER - MAIN
  // ============================================================================

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {activeCount} aktiv{showInactive && inactiveCount > 0 && `, ${inactiveCount} inaktiv`}
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Suche */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm w-48
                         focus:outline-none focus:ring-2 ${colors.focus} focus:border-transparent`}
            />
          </div>

          {/* Inaktive Checkbox */}
          <label className="flex items-center gap-2 text-sm text-gray-600 whitespace-nowrap">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className={`rounded border-gray-300 ${colors.text} ${colors.focus}`}
            />
            Inaktive
          </label>

          {/* Neu Button */}
          {canEdit && (
            <button
              onClick={openCreateModal}
              className={`flex items-center gap-2 px-4 py-2 text-white rounded-lg
                         transition-colors text-sm font-medium ${colors.button}`}
            >
              <Plus size={18} />
              <span className="hidden sm:inline">Neu</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabelle */}
      {filteredEmployees.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">
            {searchTerm ? 'Keine Mitarbeiter gefunden.' : 'Noch keine Mitarbeiter vorhanden.'}
          </p>
          {canEdit && !searchTerm && (
            <button
              onClick={openCreateModal}
              className={`mt-4 inline-flex items-center gap-2 px-4 py-2 text-white rounded-lg ${colors.button}`}
            >
              <Plus size={18} />
              Ersten Mitarbeiter anlegen
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Mitarbeiter</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase hidden sm:table-cell">Position</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase hidden md:table-cell">Rolle</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase hidden lg:table-cell">Std./Woche</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                  {canEdit && (
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Aktionen</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredEmployees.map((emp) => (
                  <tr
                    key={emp.id}
                    className={`hover:bg-gray-50 ${!emp.is_active ? 'opacity-60' : ''}`}
                  >
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{emp.display_name}</div>
                      {emp.email && (
                        <div className="text-sm text-gray-500">{emp.email}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 hidden sm:table-cell text-gray-600">
                      {emp.position_title || '-'}
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      {emp.portal_role === 'client_admin' && (
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-700">
                          Admin
                        </span>
                      )}
                      {emp.portal_role === 'project_leader' && (
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                          Projektleiter
                        </span>
                      )}
                      {(!emp.portal_role || emp.portal_role === 'employee') && (
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                          Mitarbeiter
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 hidden lg:table-cell text-gray-600">
                      {emp.weekly_hours || 40} h
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        {emp.is_active ? (
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${colors.badge}`}>
                            Aktiv
                          </span>
                        ) : (
                          <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                            Inaktiv
                          </span>
                        )}
                        {emp.user_id ? (
                          <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                            Login
                          </span>
                        ) : emp.email ? (
                          <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-700">
                            Kein Login
                          </span>
                        ) : null}
                      </div>
                    </td>
                    {canEdit && (
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          {/* Login erstellen - nur wenn noch kein Login und E-Mail vorhanden */}
                          {!emp.user_id && emp.email && emp.is_active && (
                            <button
                              onClick={() => openLoginModal(emp)}
                              className="p-1.5 text-orange-600 hover:text-orange-800 rounded"
                              title="Login erstellen"
                            >
                              <KeyRound size={18} />
                            </button>
                          )}
                          <button
                            onClick={() => openEditModal(emp)}
                            className={`p-1.5 ${colors.text} ${colors.hover} rounded`}
                            title="Bearbeiten"
                          >
                            <Pencil size={18} />
                          </button>
                          {emp.is_active ? (
                            <button
                              onClick={() => confirmDelete(emp)}
                              className="p-1.5 text-red-600 hover:text-red-900 rounded"
                              title="Deaktivieren"
                            >
                              <UserX size={18} />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleReactivate(emp)}
                              className="p-1.5 text-blue-600 hover:text-blue-900 rounded"
                              title="Reaktivieren"
                            >
                              <RefreshCw size={18} />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Anzahl */}
      <div className="text-sm text-gray-500">
        {filteredEmployees.length} {filteredEmployees.length === 1 ? 'Mitarbeiter' : 'Mitarbeiter'}
      </div>

      {/* ================================================================ */}
      {/* MODAL: Mitarbeiter anlegen/bearbeiten */}
      {/* ================================================================ */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                {modalMode === 'create' ? 'Neuer Mitarbeiter' : 'Mitarbeiter bearbeiten'}
              </h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vorname</label>
                  <input
                    type="text"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 ${colors.focus}`}
                    placeholder="Max"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nachname</label>
                  <input
                    type="text"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 ${colors.focus}`}
                    placeholder="Mustermann"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Anzeigename *</label>
                  <input
                    type="text"
                    name="display_name"
                    value={formData.display_name}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 ${colors.focus}`}
                    placeholder="Mustermann, Max"
                  />
                  <p className="text-xs text-gray-500 mt-1">Wird automatisch aus Vor- und Nachname generiert</p>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">E-Mail</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 ${colors.focus}`}
                    placeholder="max.mustermann@firma.de"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Portal-Rolle</label>
                  <select
                    name="portal_role"
                    value={formData.portal_role}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 ${colors.focus}`}
                  >
                    {PORTAL_ROLE_OPTIONS.map(role => (
                      <option key={role.value} value={role.value}>{role.label}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {PORTAL_ROLE_OPTIONS.find(r => r.value === formData.portal_role)?.description}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                  <input
                    type="text"
                    name="position_title"
                    value={formData.position_title}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 ${colors.focus}`}
                    placeholder="z.B. Softwareentwickler"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Qualifikation</label>
                  <select
                    name="qualification"
                    value={formData.qualification}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 ${colors.focus}`}
                  >
                    <option value="">-- Bitte waehlen --</option>
                    {QUALIFICATION_OPTIONS.map(q => (
                      <option key={q} value={q}>{q}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Wochenstunden</label>
                  <input
                    type="number"
                    name="weekly_hours"
                    value={formData.weekly_hours}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 ${colors.focus}`}
                    min="0"
                    max="60"
                    step="0.5"
                  />
                </div>
                <div></div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Beschaeftigt seit</label>
                  <input
                    type="date"
                    name="employment_start"
                    value={formData.employment_start}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 ${colors.focus}`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Beschaeftigt bis</label>
                  <input
                    type="date"
                    name="employment_end"
                    value={formData.employment_end}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 ${colors.focus}`}
                  />
                  <p className="text-xs text-gray-500 mt-1">Leer lassen wenn noch beschaeftigt</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Abbrechen
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className={`px-4 py-2 text-white rounded-lg disabled:opacity-50 flex items-center gap-2 ${colors.button}`}
              >
                {saving && <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>}
                <Save size={18} />
                {modalMode === 'create' ? 'Anlegen' : 'Speichern'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* MODAL: Deaktivieren bestaetigen */}
      {/* ================================================================ */}
      {showDeleteConfirm && employeeToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <UserX className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Mitarbeiter deaktivieren?</h3>
                  <p className="text-gray-500 mt-1">
                    Moechten Sie <strong>{employeeToDelete.display_name}</strong> wirklich deaktivieren?
                  </p>
                  <p className="text-sm text-gray-400 mt-2">
                    Der Mitarbeiter wird nicht geloescht und kann spaeter reaktiviert werden.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
              <button
                onClick={() => { setShowDeleteConfirm(false); setEmployeeToDelete(null); }}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Abbrechen
              </button>
              <button
                onClick={handleDelete}
                disabled={saving}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                Deaktivieren
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* MODAL: Login erstellen */}
      {/* ================================================================ */}
      {showLoginModal && loginEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="flex justify-between items-center px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                Login erstellen
              </h3>
              <button onClick={closeLoginModal} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              {loginError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {loginError}
                </div>
              )}

              <div className="bg-orange-50 border border-orange-200 text-orange-800 px-4 py-3 rounded-lg text-sm">
                <strong>Test-Modus:</strong> Es wird keine E-Mail versendet. 
                Der Mitarbeiter kann sich direkt mit diesen Zugangsdaten einloggen.
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mitarbeiter</label>
                <div className="px-3 py-2 bg-gray-100 rounded-lg text-gray-700">
                  {loginEmployee.display_name}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-Mail</label>
                <div className="px-3 py-2 bg-gray-100 rounded-lg text-gray-700">
                  {loginEmployee.email}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Portal-Rolle</label>
                <div className="px-3 py-2 bg-gray-100 rounded-lg">
                  {loginEmployee.portal_role === 'client_admin' && (
                    <span className="text-purple-700">Administrator</span>
                  )}
                  {loginEmployee.portal_role === 'project_leader' && (
                    <span className="text-blue-700">Projektleiter</span>
                  )}
                  {(!loginEmployee.portal_role || loginEmployee.portal_role === 'employee') && (
                    <span className="text-gray-700">Mitarbeiter</span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Passwort <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 ${colors.focus}`}
                  placeholder="Mind. 6 Zeichen"
                  autoComplete="new-password"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Dieses Passwort muss dem Mitarbeiter mitgeteilt werden.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
              <button
                onClick={closeLoginModal}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Abbrechen
              </button>
              <button
                onClick={handleCreateLogin}
                disabled={creatingLogin || !loginPassword}
                className={`px-4 py-2 text-white rounded-lg disabled:opacity-50 ${colors.button}`}
              >
                {creatingLogin ? 'Erstelle...' : 'Login erstellen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
