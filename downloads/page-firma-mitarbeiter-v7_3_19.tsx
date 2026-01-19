// src/app/v7/firma/mitarbeiter/page.tsx
// VERSION: v7.3.19 (SW-Release V7.3)
// DATUM: 20. Januar 2026
// BESCHREIBUNG: Mitarbeiter-Verwaltung im Firmen-Portal
// BERECHTIGUNG: client_admin kann alle verwalten, project_leader nur ansehen

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

// ============================================
// FARBEN
// ============================================

const COLORS = {
  firmenPortal: '#65A655',  // Cubintec-Grün
};

// ============================================
// TYPEN
// ============================================

interface UserProfile {
  id: string;
  email: string;
  role: string;
  display_name: string | null;
  client_company_id: string | null;
}

interface ClientCompany {
  id: string;
  name: string;
  short_name: string | null;
}

interface Employee {
  id: string;
  display_name: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  position_title: string | null;
  qualification: string | null;
  weekly_hours: number | null;
  hourly_rate: number | null;
  employment_start: string | null;
  employment_end: string | null;
  is_active: boolean;
  created_at: string;
}

interface EmployeeFormData {
  display_name: string;
  first_name: string;
  last_name: string;
  email: string;
  position_title: string;
  qualification: string;
  weekly_hours: string;
  hourly_rate: string;
  employment_start: string;
  employment_end: string;
}

const EMPTY_EMPLOYEE_FORM: EmployeeFormData = {
  display_name: '',
  first_name: '',
  last_name: '',
  email: '',
  position_title: '',
  qualification: '',
  weekly_hours: '40',
  hourly_rate: '',
  employment_start: '',
  employment_end: '',
};

// ============================================
// KOMPONENTE
// ============================================

export default function FirmaMitarbeiterPage() {
  const router = useRouter();
  const supabase = createClient();

  // State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [company, setCompany] = useState<ClientCompany | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showInactive, setShowInactive] = useState(false);

  // Modal State
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [employeeModalMode, setEmployeeModalMode] = useState<'create' | 'edit'>('create');
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [employeeFormData, setEmployeeFormData] = useState<EmployeeFormData>(EMPTY_EMPLOYEE_FORM);
  const [employeeFormError, setEmployeeFormError] = useState<string | null>(null);

  // Delete Confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);

  // Berechtigungen
  const canEdit = userProfile?.role === 'client_admin';

  // ============================================
  // DATEN LADEN
  // ============================================

  const loadAllData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        router.push('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('v7_user_profiles')
        .select('*')
        .eq('email', user.email)
        .maybeSingle();

      if (!profile || !profile.client_company_id) {
        setError('Kein Firmenprofil gefunden.');
        setLoading(false);
        return;
      }

      setUserProfile(profile);
      const companyId = profile.client_company_id;

      // Firma laden
      const { data: companyData, error: companyError } = await supabase
        .from('v7_client_companies')
        .select('id, name, short_name')
        .eq('id', companyId)
        .single();

      if (companyError) throw new Error('Firma nicht gefunden');
      setCompany(companyData);

      // Mitarbeiter laden
      let query = supabase
        .from('v7_employees')
        .select('*')
        .eq('client_company_id', companyId)
        .order('display_name');

      if (!showInactive) {
        query = query.eq('is_active', true);
      }

      const { data: employeesData } = await query;
      setEmployees(employeesData || []);

    } catch (err) {
      console.error('Fehler beim Laden:', err);
      setError('Daten konnten nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  }, [router, supabase, showInactive]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // ============================================
  // EMPLOYEE CRUD
  // ============================================

  const openCreateEmployeeModal = () => {
    setEmployeeModalMode('create');
    setEditingEmployee(null);
    setEmployeeFormData(EMPTY_EMPLOYEE_FORM);
    setEmployeeFormError(null);
    setShowEmployeeModal(true);
  };

  const openEditEmployeeModal = (emp: Employee) => {
    setEmployeeModalMode('edit');
    setEditingEmployee(emp);
    setEmployeeFormData({
      display_name: emp.display_name || '',
      first_name: emp.first_name || '',
      last_name: emp.last_name || '',
      email: emp.email || '',
      position_title: emp.position_title || '',
      qualification: emp.qualification || '',
      weekly_hours: emp.weekly_hours?.toString() || '40',
      hourly_rate: emp.hourly_rate?.toString() || '',
      employment_start: emp.employment_start?.split('T')[0] || '',
      employment_end: emp.employment_end?.split('T')[0] || '',
    });
    setEmployeeFormError(null);
    setShowEmployeeModal(true);
  };

  const closeEmployeeModal = () => {
    setShowEmployeeModal(false);
    setEditingEmployee(null);
    setEmployeeFormData(EMPTY_EMPLOYEE_FORM);
    setEmployeeFormError(null);
  };

  const handleEmployeeInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEmployeeFormData(prev => {
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

  const handleSaveEmployee = async () => {
    if (!employeeFormData.display_name.trim()) {
      setEmployeeFormError('Anzeigename ist erforderlich');
      return;
    }

    if (!company) return;

    setSaving(true);
    setEmployeeFormError(null);

    try {
      const employeeData = {
        display_name: employeeFormData.display_name.trim(),
        first_name: employeeFormData.first_name.trim() || null,
        last_name: employeeFormData.last_name.trim() || null,
        email: employeeFormData.email.trim() || null,
        position_title: employeeFormData.position_title.trim() || null,
        qualification: employeeFormData.qualification.trim() || null,
        weekly_hours: employeeFormData.weekly_hours ? parseFloat(employeeFormData.weekly_hours) : 40,
        hourly_rate: employeeFormData.hourly_rate ? parseFloat(employeeFormData.hourly_rate) : null,
        employment_start: employeeFormData.employment_start || null,
        employment_end: employeeFormData.employment_end || null,
        updated_at: new Date().toISOString(),
      };

      if (employeeModalMode === 'create') {
        const { error: insertError } = await supabase
          .from('v7_employees')
          .insert({
            ...employeeData,
            client_company_id: company.id,
            is_active: true,
          });

        if (insertError) {
          if (insertError.code === '23505') {
            setEmployeeFormError('Ein Mitarbeiter mit diesem Namen existiert bereits');
          } else {
            setEmployeeFormError(insertError.message);
          }
          return;
        }
      } else if (employeeModalMode === 'edit' && editingEmployee) {
        const { error: updateError } = await supabase
          .from('v7_employees')
          .update(employeeData)
          .eq('id', editingEmployee.id);

        if (updateError) {
          setEmployeeFormError(updateError.message);
          return;
        }
      }

      closeEmployeeModal();
      await loadAllData();

    } catch (err: any) {
      setEmployeeFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteEmployee = (emp: Employee) => {
    setEmployeeToDelete(emp);
    setShowDeleteConfirm(true);
  };

  const handleDeleteEmployee = async () => {
    if (!employeeToDelete) return;

    setSaving(true);
    try {
      // Soft-Delete: is_active = false
      const { error: deleteError } = await supabase
        .from('v7_employees')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', employeeToDelete.id);

      if (deleteError) {
        setError(deleteError.message);
        return;
      }

      setShowDeleteConfirm(false);
      setEmployeeToDelete(null);
      await loadAllData();

    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleReactivateEmployee = async (emp: Employee) => {
    setSaving(true);
    try {
      const { error: updateError } = await supabase
        .from('v7_employees')
        .update({ is_active: true, updated_at: new Date().toISOString() })
        .eq('id', emp.id);

      if (updateError) {
        setError(updateError.message);
        return;
      }

      await loadAllData();

    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // ============================================
  // HILFSFUNKTIONEN
  // ============================================

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('de-DE');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  // ============================================
  // RENDER: LOADING / ERROR
  // ============================================

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Lade Mitarbeiter...</p>
        </div>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Fehler</h2>
          <p className="text-gray-600 mb-6">{error || 'Firma nicht gefunden'}</p>
          <button
            onClick={() => router.push('/v7/firma')}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Zurück zum Dashboard
          </button>
        </div>
      </div>
    );
  }

  const activeEmployees = employees.filter(e => e.is_active);
  const inactiveEmployees = employees.filter(e => !e.is_active);

  // ============================================
  // RENDER: HAUPTSEITE
  // ============================================

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header style={{ backgroundColor: COLORS.firmenPortal }} className="shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/v7/firma')}
                className="text-green-100 hover:text-white flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Zurück
              </button>
              <div className="bg-white rounded-lg px-3 py-1.5 text-sm font-bold" style={{ color: COLORS.firmenPortal }}>
                PZE
              </div>
              <div>
                <h1 className="text-lg font-semibold text-white">Mitarbeiter</h1>
                <p className="text-sm text-green-100">
                  {company.name}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-white text-sm">{userProfile?.display_name}</span>
              <button
                onClick={handleLogout}
                className="text-green-100 hover:text-white flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Abmelden
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header mit Button */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Mitarbeiter</h2>
            <p className="text-gray-500 mt-1">
              {activeEmployees.length} aktive Mitarbeiter
              {inactiveEmployees.length > 0 && ` · ${inactiveEmployees.length} inaktiv`}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {inactiveEmployees.length > 0 && (
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showInactive}
                  onChange={(e) => setShowInactive(e.target.checked)}
                  className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                Inaktive anzeigen
              </label>
            )}
            {canEdit && (
              <button
                onClick={openCreateEmployeeModal}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Neuer Mitarbeiter
              </button>
            )}
          </div>
        </div>

        {/* Mitarbeiter-Liste */}
        {employees.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="text-gray-400 text-5xl mb-4">👥</div>
            <p className="text-gray-500 mb-4">Noch keine Mitarbeiter vorhanden.</p>
            {canEdit && (
              <button
                onClick={openCreateEmployeeModal}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Ersten Mitarbeiter anlegen
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Position / Qualifikation</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">E-Mail</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Wochenstunden</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Beschäftigt seit</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  {canEdit && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aktionen</th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {employees.map(emp => (
                  <tr key={emp.id} className={`hover:bg-gray-50 ${!emp.is_active ? 'bg-gray-100 opacity-60' : ''}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-medium">
                          {emp.first_name?.[0] || emp.display_name?.[0] || '?'}
                          {emp.last_name?.[0] || ''}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{emp.display_name}</div>
                          {emp.first_name && emp.last_name && (
                            <div className="text-sm text-gray-500">{emp.first_name} {emp.last_name}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-gray-900">{emp.position_title || '-'}</div>
                      <div className="text-sm text-gray-500">{emp.qualification || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {emp.email ? (
                        <a href={`mailto:${emp.email}`} className="text-green-600 hover:underline">
                          {emp.email}
                        </a>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                      {emp.weekly_hours || 40} h
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                      {formatDate(emp.employment_start)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {emp.is_active ? (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                          Aktiv
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-200 text-gray-600">
                          Inaktiv
                        </span>
                      )}
                    </td>
                    {canEdit && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEditEmployeeModal(emp)}
                            className="p-1 text-gray-400 hover:text-blue-600"
                            title="Bearbeiten"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                          {emp.is_active ? (
                            <button
                              onClick={() => confirmDeleteEmployee(emp)}
                              className="p-1 text-gray-400 hover:text-red-600"
                              title="Deaktivieren"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleReactivateEmployee(emp)}
                              className="p-1 text-gray-400 hover:text-green-600"
                              title="Reaktivieren"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
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
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-sm text-gray-500">
            Projektzeiterfassung v7.3.19 · Firmen-Portal · © {new Date().getFullYear()}
          </p>
        </div>
      </footer>

      {/* MODAL: Mitarbeiter anlegen/bearbeiten */}
      {showEmployeeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                {employeeModalMode === 'create' ? 'Neuer Mitarbeiter' : 'Mitarbeiter bearbeiten'}
              </h3>
              <button onClick={closeEmployeeModal} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              {employeeFormError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{employeeFormError}</div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vorname</label>
                  <input
                    type="text"
                    name="first_name"
                    value={employeeFormData.first_name}
                    onChange={handleEmployeeInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    placeholder="Max"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nachname</label>
                  <input
                    type="text"
                    name="last_name"
                    value={employeeFormData.last_name}
                    onChange={handleEmployeeInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    placeholder="Mustermann"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Anzeigename *</label>
                  <input
                    type="text"
                    name="display_name"
                    value={employeeFormData.display_name}
                    onChange={handleEmployeeInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    placeholder="Mustermann, Max"
                  />
                  <p className="text-xs text-gray-500 mt-1">Wird automatisch aus Vor- und Nachname generiert</p>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">E-Mail</label>
                  <input
                    type="email"
                    name="email"
                    value={employeeFormData.email}
                    onChange={handleEmployeeInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    placeholder="max.mustermann@firma.de"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                  <input
                    type="text"
                    name="position_title"
                    value={employeeFormData.position_title}
                    onChange={handleEmployeeInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    placeholder="z.B. Softwareentwickler"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Qualifikation</label>
                  <input
                    type="text"
                    name="qualification"
                    value={employeeFormData.qualification}
                    onChange={handleEmployeeInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    placeholder="z.B. M.Sc. Informatik"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Wochenstunden</label>
                  <input
                    type="number"
                    name="weekly_hours"
                    value={employeeFormData.weekly_hours}
                    onChange={handleEmployeeInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    min="0"
                    max="60"
                    step="0.5"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stundensatz (€)</label>
                  <input
                    type="number"
                    name="hourly_rate"
                    value={employeeFormData.hourly_rate}
                    onChange={handleEmployeeInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    min="0"
                    step="0.01"
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Beschäftigt seit</label>
                  <input
                    type="date"
                    name="employment_start"
                    value={employeeFormData.employment_start}
                    onChange={handleEmployeeInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Beschäftigt bis</label>
                  <input
                    type="date"
                    name="employment_end"
                    value={employeeFormData.employment_end}
                    onChange={handleEmployeeInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Leer lassen wenn noch beschäftigt</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
              <button onClick={closeEmployeeModal} className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                Abbrechen
              </button>
              <button
                onClick={handleSaveEmployee}
                disabled={saving}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
              >
                {saving && <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>}
                {employeeModalMode === 'create' ? 'Anlegen' : 'Speichern'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Löschen bestätigen */}
      {showDeleteConfirm && employeeToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Mitarbeiter deaktivieren?</h3>
                  <p className="text-gray-500 mt-1">
                    Möchten Sie <strong>{employeeToDelete.display_name}</strong> wirklich deaktivieren?
                  </p>
                  <p className="text-sm text-gray-400 mt-2">
                    Der Mitarbeiter wird nicht gelöscht und kann später reaktiviert werden.
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
                onClick={handleDeleteEmployee}
                disabled={saving}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                Deaktivieren
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
