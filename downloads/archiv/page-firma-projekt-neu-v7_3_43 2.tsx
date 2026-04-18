// src/app/v7/firma/projekte/neu/page.tsx
// ============================================================================
// PZE V7 - Neues Projekt anlegen (Firmen-Portal)
// ============================================================================
// Datum: 21. Januar 2026
// Version: 7.3.43
// ============================================================================

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  ArrowLeft,
  Save,
  AlertCircle,
} from 'lucide-react';

// Komponenten
import PortalHeader from '@/components/shared/PortalHeader';

// Types
import { V7UserRole, V7EmployeePortalRole, V7Employee, V7ClientCompany } from '@/types/v7-types';

// ============================================================================
// FOERDERPROGRAMME
// ============================================================================

const FUNDING_FORMATS = [
  { value: 'ZIM', label: 'ZIM Einzelprojekt' },
  { value: 'ZIM_KOOP', label: 'ZIM Kooperationsprojekt' },
  { value: 'ZIM_NETZWERK', label: 'ZIM Netzwerk-Management' },
  { value: 'ZIM_DS', label: 'ZIM Durchfuehrbarkeitsstudie' },
  { value: 'BMBF', label: 'BMBF Foerderung' },
  { value: 'BMBF_DS', label: 'BMBF Durchfuehrbarkeitsstudie' },
];

// ============================================================================
// TYPEN
// ============================================================================

interface UserProfile {
  id: string;
  email: string;
  role: V7UserRole;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  client_company_id: string | null;
}

interface ProjectFormData {
  name: string;
  short_name: string;
  funding_format: string;
  funding_reference: string;
  start_date: string;
  end_date: string;
  notes: string;
}

const EMPTY_FORM: ProjectFormData = {
  name: '',
  short_name: '',
  funding_format: '',
  funding_reference: '',
  start_date: '',
  end_date: '',
  notes: '',
};

// ============================================================================
// KOMPONENTE
// ============================================================================

export default function NeuesProjekt() {
  const router = useRouter();
  const supabase = createClient();

  // State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [employee, setEmployee] = useState<V7Employee | null>(null);
  const [company, setCompany] = useState<V7ClientCompany | null>(null);
  const [formData, setFormData] = useState<ProjectFormData>(EMPTY_FORM);

  // ============================================================================
  // DATEN LADEN
  // ============================================================================

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
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
        setError('Kein Zugriff');
        setLoading(false);
        return;
      }

      // Nur client_admin darf Projekte anlegen
      if (profile.role !== 'client_admin') {
        setError('Keine Berechtigung zum Anlegen von Projekten');
        setLoading(false);
        return;
      }

      setUserProfile(profile);

      const { data: companyData } = await supabase
        .from('v7_client_companies')
        .select('*')
        .eq('id', profile.client_company_id)
        .single();

      if (companyData) setCompany(companyData);

      const { data: employeeData } = await supabase
        .from('v7_employees')
        .select('*')
        .eq('client_company_id', profile.client_company_id)
        .eq('email', user.email)
        .maybeSingle();

      if (employeeData) setEmployee(employeeData);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // SPEICHERN
  // ============================================================================

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setError('Bitte geben Sie einen Projektnamen ein');
      return;
    }

    if (!company) return;

    setSaving(true);
    setError(null);

    try {
      const { data: newProject, error: insertError } = await supabase
        .from('v7_projects')
        .insert({
          client_company_id: company.id,
          name: formData.name.trim(),
          short_name: formData.short_name.trim() || null,
          funding_format: formData.funding_format || null,
          funding_reference: formData.funding_reference.trim() || null,
          start_date: formData.start_date || null,
          end_date: formData.end_date || null,
          notes: formData.notes.trim() || null,
          is_active: true,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Zur Projekt-Detail-Seite navigieren
      router.push(`/v7/firma/projekte/${newProject.id}`);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // ============================================================================
  // HILFSFUNKTIONEN
  // ============================================================================

  const getUserName = (): string => {
    if (userProfile?.display_name) return userProfile.display_name;
    if (userProfile?.first_name && userProfile?.last_name) {
      return `${userProfile.first_name} ${userProfile.last_name}`;
    }
    return userProfile?.email?.split('@')[0] || 'Benutzer';
  };

  const getPortalRole = (): V7EmployeePortalRole => {
    if (userProfile?.role === 'client_admin') return 'client_admin';
    if (employee?.portal_role) return employee.portal_role;
    return 'employee';
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-green-200 border-t-green-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error && !company) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/v7/firma/projekte')}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Zurueck zur Liste
          </button>
        </div>
      </div>
    );
  }

  const userName = getUserName();
  const portalRole = getPortalRole();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <PortalHeader
        portal="firma"
        userName={userName}
        userRole={portalRole}
        companyName={company?.name || 'Firma'}
      />

      {/* Sub-Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/v7/firma/projekte')}
              className="flex items-center gap-1 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft size={20} />
              <span className="text-sm">Projekte</span>
            </button>
            <div className="h-6 w-px bg-gray-300"></div>
            <h1 className="text-xl font-bold text-gray-900">Neues Projekt anlegen</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        
        {/* Fehlermeldung */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span className="text-red-800">{error}</span>
          </div>
        )}

        {/* Formular */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Projektname */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Projektname *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="z.B. Entwicklung innovativer Drucktechnologie"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg
                           focus:outline-none focus:ring-2 focus:ring-green-500"
                autoFocus
              />
            </div>

            {/* Kurzname */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Kurzname / Akronym
              </label>
              <input
                type="text"
                value={formData.short_name}
                onChange={(e) => setFormData({ ...formData, short_name: e.target.value })}
                placeholder="z.B. DigiTrans"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg
                           focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            {/* Foerderprogramm */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Foerderprogramm
              </label>
              <select
                value={formData.funding_format}
                onChange={(e) => setFormData({ ...formData, funding_format: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg
                           focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">-- Bitte waehlen --</option>
                {FUNDING_FORMATS.map(ff => (
                  <option key={ff.value} value={ff.value}>{ff.label}</option>
                ))}
              </select>
            </div>

            {/* FKZ */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Foerderkennzeichen (FKZ)
              </label>
              <input
                type="text"
                value={formData.funding_reference}
                onChange={(e) => setFormData({ ...formData, funding_reference: e.target.value })}
                placeholder="z.B. 16KN087502"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg
                           focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            {/* Startdatum */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Projektstart
              </label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg
                           focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            {/* Enddatum */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Projektende
              </label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg
                           focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            {/* Notizen */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notizen
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                placeholder="Optionale Notizen zum Projekt..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg
                           focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-200">
            <button
              onClick={() => router.push('/v7/firma/projekte')}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700
                         hover:bg-gray-50 transition-colors"
            >
              Abbrechen
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !formData.name.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg
                         hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Speichern...
                </>
              ) : (
                <>
                  <Save size={18} />
                  Projekt anlegen
                </>
              )}
            </button>
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <p className="text-center text-sm text-gray-500">
            PZE v7.3.43 - Firmen-Portal
          </p>
        </div>
      </footer>
    </div>
  );
}
