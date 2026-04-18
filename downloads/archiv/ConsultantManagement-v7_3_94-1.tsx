// src/components/shared/ConsultantManagement.tsx
// ============================================================================
// PZE V7 - Berater-Verwaltung (System-Admin)
// ============================================================================
// Datum: 17. Februar 2026
// Version: 7.3.94-1
//
// Nur fuer system_admin sichtbar.
// Verwaltet Berater (role=consultant/system_admin) der eigenen Beraterfirma.
//
// Funktionen:
// - Liste aller Berater mit Status
// - Neuen Berater anlegen (Auth + v7_user_profiles)
// - Bestehenden User zum Berater befoerdern (falls Email schon existiert)
// - Rolle aendern (consultant <-> system_admin)
// - Berater deaktivieren/reaktivieren
// - Passwort zuruecksetzen
//
// AENDERUNGEN v7.3.94-1:
// - Beim Anlegen: Prueft ob Email schon in v7_user_profiles existiert
//   Falls ja: Update auf consultant/system_admin statt Insert (duplicate key fix)
//   Falls nein: Neuen Auth-User + Profil erstellen wie bisher
//
// Props:
// - consultantCompanyId: string (UUID der Beraterfirma)
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
  Shield,
  ShieldCheck,
  Check,
  Eye,
  EyeOff,
} from 'lucide-react';

// ============================================================================
// TYPEN
// ============================================================================

interface Consultant {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
}

interface ConsultantFormData {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  role: string;
}

interface ConsultantManagementProps {
  consultantCompanyId: string;
}

// ============================================================================
// KONSTANTEN
// ============================================================================

const EMPTY_FORM: ConsultantFormData = {
  first_name: '',
  last_name: '',
  email: '',
  password: '',
  role: 'consultant',
};

const ROLE_OPTIONS = [
  { value: 'consultant', label: 'Berater', description: 'Kann Kundenfirmen betreuen' },
  { value: 'system_admin', label: 'System-Administrator', description: 'Vollzugriff inkl. Berater-Verwaltung' },
];

// ============================================================================
// KOMPONENTE
// ============================================================================

export default function ConsultantManagement({ consultantCompanyId }: ConsultantManagementProps) {
  const supabase = createClient();

  // State
  const [consultants, setConsultants] = useState<Consultant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactive, setShowInactive] = useState(false);

  // Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [formData, setFormData] = useState<ConsultantFormData>(EMPTY_FORM);
  const [editingConsultant, setEditingConsultant] = useState<Consultant | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  // ============================================================================
  // DATEN LADEN
  // ============================================================================

  const loadConsultants = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('v7_user_profiles')
        .select('id, email, first_name, last_name, display_name, role, is_active, created_at')
        .eq('consultant_company_id', consultantCompanyId)
        .in('role', ['consultant', 'system_admin'])
        .order('display_name');

      if (fetchError) throw fetchError;
      setConsultants(data || []);
    } catch (err: any) {
      setError('Fehler beim Laden: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [consultantCompanyId, supabase]);

  useEffect(() => {
    loadConsultants();
  }, [loadConsultants]);

  // ============================================================================
  // HILFSFUNKTIONEN
  // ============================================================================

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const generatePassword = (): string => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let pw = '';
    for (let i = 0; i < 12; i++) {
      pw += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pw;
  };

  // ============================================================================
  // BERATER ANLEGEN
  // ============================================================================

  const handleCreate = async () => {
    if (!formData.first_name || !formData.last_name || !formData.email || !formData.password) {
      setError('Bitte alle Pflichtfelder ausfuellen.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const displayName = `${formData.last_name}, ${formData.first_name}`;
      const emailLower = formData.email.toLowerCase();

      // ----------------------------------------------------------------
      // Schritt 0: Pruefen ob User schon in v7_user_profiles existiert
      // ----------------------------------------------------------------
      const { data: existingProfile } = await supabase
        .from('v7_user_profiles')
        .select('id, email, display_name, role, consultant_company_id')
        .eq('email', emailLower)
        .maybeSingle();

      if (existingProfile) {
        // User existiert bereits - zum Berater befoerdern
        const { error: updateError } = await supabase
          .from('v7_user_profiles')
          .update({
            first_name: formData.first_name,
            last_name: formData.last_name,
            display_name: displayName,
            role: formData.role,
            consultant_company_id: consultantCompanyId,
            is_active: true,
            // client_company_id bleibt erhalten (falls auch Firmen-User)
          })
          .eq('id', existingProfile.id);

        if (updateError) throw updateError;

        showSuccess(
          `Bestehender User "${displayName}" wurde zum ${formData.role === 'system_admin' ? 'System-Administrator' : 'Berater'} befoerdert.`
        );
        setShowCreateModal(false);
        setFormData(EMPTY_FORM);
        await loadConsultants();
        return;
      }

      // ----------------------------------------------------------------
      // Schritt 1: Neuen Auth-User erstellen via signUp
      // ----------------------------------------------------------------
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            display_name: displayName,
          }
        }
      });

      if (signUpError) {
        if (signUpError.message.includes('already registered')) {
          // Auth-User existiert, aber kein v7_user_profiles Eintrag
          // Wir versuchen den User ueber signIn zu identifizieren
          setError(
            'Diese E-Mail ist bereits als Auth-User registriert, hat aber kein Profil. ' +
            'Bitte den User zuerst im Supabase Dashboard pruefen.'
          );
        } else {
          setError(signUpError.message);
        }
        return;
      }

      if (!signUpData.user) {
        setError('Benutzer konnte nicht erstellt werden.');
        return;
      }

      // ----------------------------------------------------------------
      // Schritt 2: v7_user_profiles Eintrag erstellen
      // ----------------------------------------------------------------
      const { error: profileError } = await supabase
        .from('v7_user_profiles')
        .insert({
          id: signUpData.user.id,
          email: formData.email.toLowerCase(),
          first_name: formData.first_name,
          last_name: formData.last_name,
          display_name: displayName,
          role: formData.role,
          consultant_company_id: consultantCompanyId,
          is_active: true,
        });

      if (profileError) throw profileError;

      showSuccess(`Berater "${displayName}" wurde angelegt. Login: ${formData.email} / ${formData.password}`);
      setShowCreateModal(false);
      setFormData(EMPTY_FORM);
      await loadConsultants();

    } catch (err: any) {
      setError('Fehler beim Anlegen: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // ============================================================================
  // ROLLE AENDERN
  // ============================================================================

  const handleEditRole = async () => {
    if (!editingConsultant) return;

    setSaving(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('v7_user_profiles')
        .update({
          role: formData.role,
          first_name: formData.first_name,
          last_name: formData.last_name,
          display_name: `${formData.last_name}, ${formData.first_name}`,
        })
        .eq('id', editingConsultant.id);

      if (updateError) throw updateError;

      showSuccess(`Berater "${formData.last_name}, ${formData.first_name}" wurde aktualisiert.`);
      setShowEditModal(false);
      setEditingConsultant(null);
      await loadConsultants();

    } catch (err: any) {
      setError('Fehler beim Speichern: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // ============================================================================
  // DEAKTIVIEREN / REAKTIVIEREN
  // ============================================================================

  const handleToggleActive = async (consultant: Consultant) => {
    const newStatus = !consultant.is_active;
    const action = newStatus ? 'reaktiviert' : 'deaktiviert';

    if (!newStatus && !confirm(`Berater "${consultant.display_name}" wirklich deaktivieren?`)) {
      return;
    }

    try {
      const { error: updateError } = await supabase
        .from('v7_user_profiles')
        .update({ is_active: newStatus })
        .eq('id', consultant.id);

      if (updateError) throw updateError;

      showSuccess(`Berater "${consultant.display_name}" wurde ${action}.`);
      await loadConsultants();

    } catch (err: any) {
      setError('Fehler: ' + err.message);
    }
  };

  // ============================================================================
  // PASSWORT ZURUECKSETZEN
  // ============================================================================

  const handlePasswordReset = async () => {
    if (!editingConsultant || !newPassword) return;

    setSaving(true);
    setError(null);

    try {
      // Passwort-Reset ueber Supabase Admin API
      // Hinweis: signUp mit gleicher Email geht nicht.
      // Wir nutzen den Password-Reset per Email oder setzen
      // das Passwort direkt wenn wir die service_role haben.
      // Da wir im Client sind, nutzen wir resetPasswordForEmail.
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        editingConsultant.email,
        { redirectTo: `${window.location.origin}/v7/berater` }
      );

      if (resetError) throw resetError;

      showSuccess(`Passwort-Reset-Email wurde an ${editingConsultant.email} gesendet.`);
      setShowPasswordModal(false);
      setNewPassword('');
      setEditingConsultant(null);

    } catch (err: any) {
      setError('Fehler beim Passwort-Reset: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // ============================================================================
  // MODAL OEFFNEN
  // ============================================================================

  const openCreateModal = () => {
    setFormData({ ...EMPTY_FORM, password: generatePassword() });
    setShowCreateModal(true);
    setError(null);
  };

  const openEditModal = (consultant: Consultant) => {
    setEditingConsultant(consultant);
    setFormData({
      first_name: consultant.first_name || '',
      last_name: consultant.last_name || '',
      email: consultant.email,
      password: '',
      role: consultant.role,
    });
    setShowEditModal(true);
    setError(null);
  };

  const openPasswordModal = (consultant: Consultant) => {
    setEditingConsultant(consultant);
    setNewPassword('');
    setShowPasswordModal(true);
    setError(null);
  };

  // ============================================================================
  // FILTER
  // ============================================================================

  const filteredConsultants = (consultants || []).filter(c => {
    if (!showInactive && !c.is_active) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        (c.display_name || '').toLowerCase().includes(term) ||
        (c.email || '').toLowerCase().includes(term)
      );
    }
    return true;
  });

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div>
      {/* Erfolgsmeldung */}
      {successMessage && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 flex items-center gap-2">
          <Check size={18} />
          <span className="whitespace-pre-line">{successMessage}</span>
        </div>
      )}

      {/* Fehlermeldung */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800">
          {error}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Berater suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm w-64 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded"
            />
            Inaktive anzeigen
          </label>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadConsultants}
            className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
            title="Aktualisieren"
          >
            <RefreshCw size={18} />
          </button>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            <Plus size={18} />
            Neuer Berater
          </button>
        </div>
      </div>

      {/* Tabelle */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Lade Berater...</div>
      ) : filteredConsultants.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          {searchTerm ? 'Keine Berater gefunden.' : 'Noch keine Berater angelegt.'}
        </div>
      ) : (
        <div className="bg-white border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">E-Mail</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Rolle</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Status</th>
                <th className="text-right px-4 py-3 font-medium text-gray-700">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredConsultants.map((c) => (
                <tr key={c.id} className={`hover:bg-gray-50 ${!c.is_active ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {c.display_name || `${c.last_name}, ${c.first_name}`}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{c.email}</td>
                  <td className="px-4 py-3">
                    {c.role === 'system_admin' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        <ShieldCheck size={12} />
                        System-Admin
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        <Shield size={12} />
                        Berater
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {c.is_active ? (
                      <span className="text-green-600 text-xs font-medium">Aktiv</span>
                    ) : (
                      <span className="text-red-500 text-xs font-medium">Inaktiv</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEditModal(c)}
                        className="p-1.5 text-gray-500 hover:text-blue-600 rounded hover:bg-blue-50"
                        title="Bearbeiten"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => openPasswordModal(c)}
                        className="p-1.5 text-gray-500 hover:text-orange-600 rounded hover:bg-orange-50"
                        title="Passwort zuruecksetzen"
                      >
                        <KeyRound size={16} />
                      </button>
                      <button
                        onClick={() => handleToggleActive(c)}
                        className={`p-1.5 rounded ${c.is_active
                          ? 'text-gray-500 hover:text-red-600 hover:bg-red-50'
                          : 'text-gray-500 hover:text-green-600 hover:bg-green-50'
                        }`}
                        title={c.is_active ? 'Deaktivieren' : 'Reaktivieren'}
                      >
                        {c.is_active ? <UserX size={16} /> : <RefreshCw size={16} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ================================================================== */}
      {/* MODAL: Neuer Berater                                               */}
      {/* ================================================================== */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Neuer Berater</h3>
              <button onClick={() => setShowCreateModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X size={20} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {error && (
                <div className="p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{error}</div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vorname *</label>
                  <input
                    type="text"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nachname *</label>
                  <input
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-Mail *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Passwort *</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 pr-10 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, password: generatePassword() })}
                  className="mt-1 text-xs text-blue-600 hover:underline"
                >
                  Neues Passwort generieren
                </button>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rolle *</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                >
                  {ROLE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  {ROLE_OPTIONS.find(o => o.value === formData.role)?.description}
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t bg-gray-50 rounded-b-xl">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-sm text-gray-700 bg-white border rounded-lg hover:bg-gray-50"
              >
                Abbrechen
              </button>
              <button
                onClick={handleCreate}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <Save size={16} />
                {saving ? 'Wird angelegt...' : 'Berater anlegen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* MODAL: Berater bearbeiten                                          */}
      {/* ================================================================== */}
      {showEditModal && editingConsultant && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Berater bearbeiten</h3>
              <button onClick={() => { setShowEditModal(false); setEditingConsultant(null); }} className="p-1 hover:bg-gray-100 rounded">
                <X size={20} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {error && (
                <div className="p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{error}</div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vorname</label>
                  <input
                    type="text"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nachname</label>
                  <input
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-Mail</label>
                <input
                  type="email"
                  value={formData.email}
                  disabled
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50 text-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rolle</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                >
                  {ROLE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  {ROLE_OPTIONS.find(o => o.value === formData.role)?.description}
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t bg-gray-50 rounded-b-xl">
              <button
                onClick={() => { setShowEditModal(false); setEditingConsultant(null); }}
                className="px-4 py-2 text-sm text-gray-700 bg-white border rounded-lg hover:bg-gray-50"
              >
                Abbrechen
              </button>
              <button
                onClick={handleEditRole}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <Save size={16} />
                {saving ? 'Speichern...' : 'Speichern'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* MODAL: Passwort zuruecksetzen                                      */}
      {/* ================================================================== */}
      {showPasswordModal && editingConsultant && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Passwort zuruecksetzen</h3>
              <button onClick={() => { setShowPasswordModal(false); setEditingConsultant(null); }} className="p-1 hover:bg-gray-100 rounded">
                <X size={20} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {error && (
                <div className="p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{error}</div>
              )}
              <p className="text-sm text-gray-600">
                Eine E-Mail mit einem Passwort-Reset-Link wird an
                <strong> {editingConsultant.email}</strong> gesendet.
              </p>
              <p className="text-sm text-gray-600">
                Der Berater kann dann ueber den Link ein neues Passwort festlegen.
              </p>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t bg-gray-50 rounded-b-xl">
              <button
                onClick={() => { setShowPasswordModal(false); setEditingConsultant(null); }}
                className="px-4 py-2 text-sm text-gray-700 bg-white border rounded-lg hover:bg-gray-50"
              >
                Abbrechen
              </button>
              <button
                onClick={handlePasswordReset}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
              >
                <KeyRound size={16} />
                {saving ? 'Sende...' : 'Reset-Email senden'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
