// src/app/v7/page.tsx
// VERSION: v7.0.0 - Firmenübersicht
// BESCHREIBUNG: Zeigt alle Kundenfirmen des Beraters mit Statistiken
// FUNKTIONEN:
// - Liste aller Kundenfirmen
// - Neue Firma anlegen (Modal)
// - Firma öffnen → Detail-Ansicht
// - Statistiken (MA-Anzahl, Projekte)

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { 
  V7ClientCompany, 
  V7ClientCompanyInsert,
  V7_FEDERAL_STATES,
  V7FederalStateCode 
} from '@/types/v7-types';

// ============================================================================
// INTERFACES
// ============================================================================

interface ClientCompanyWithStats extends V7ClientCompany {
  employee_count: number;
  project_count: number;
}

interface UserProfile {
  id: string;
  company_id: string;
  role: string;
  name?: string;
  email: string;
}

// ============================================================================
// KOMPONENTE
// ============================================================================

export default function V7FirmenuebersichtPage() {
  const router = useRouter();
  const supabase = createClient();

  // State
  const [user, setUser] = useState<UserProfile | null>(null);
  const [companies, setCompanies] = useState<ClientCompanyWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modal State
  const [showNewCompanyModal, setShowNewCompanyModal] = useState(false);
  const [newCompany, setNewCompany] = useState<Partial<V7ClientCompanyInsert>>({
    name: '',
    short_name: '',
    federal_state: 'DE-NW',
    contact_person: '',
    contact_email: '',
  });
  const [saving, setSaving] = useState(false);

  // Suche & Filter
  const [searchTerm, setSearchTerm] = useState('');

  // ============================================================================
  // DATEN LADEN
  // ============================================================================

  const loadUser = useCallback(async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      router.push('/login');
      return null;
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', authUser.id)
      .single();

    if (profile) {
      setUser(profile);
      return profile;
    }
    return null;
  }, [supabase, router]);

  const loadCompanies = useCallback(async (consultantCompanyId: string) => {
    setLoading(true);
    setError(null);

    try {
      // Kundenfirmen laden
      const { data: companiesData, error: companiesError } = await supabase
        .from('v7_client_companies')
        .select('*')
        .eq('consultant_company_id', consultantCompanyId)
        .eq('is_active', true)
        .order('name');

      if (companiesError) throw companiesError;

      // Für jede Firma: MA-Anzahl und Projekt-Anzahl laden
      const companiesWithStats: ClientCompanyWithStats[] = await Promise.all(
        (companiesData || []).map(async (company) => {
          // MA zählen
          const { count: empCount } = await supabase
            .from('v7_employees')
            .select('*', { count: 'exact', head: true })
            .eq('client_company_id', company.id)
            .eq('is_active', true);

          // Projekte zählen
          const { count: projCount } = await supabase
            .from('v7_projects')
            .select('*', { count: 'exact', head: true })
            .eq('client_company_id', company.id)
            .eq('is_active', true);

          return {
            ...company,
            employee_count: empCount || 0,
            project_count: projCount || 0,
          };
        })
      );

      setCompanies(companiesWithStats);
    } catch (err) {
      console.error('Fehler beim Laden:', err);
      setError('Firmen konnten nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    const init = async () => {
      const profile = await loadUser();
      if (profile?.company_id) {
        await loadCompanies(profile.company_id);
      }
    };
    init();
  }, [loadUser, loadCompanies]);

  // ============================================================================
  // FIRMA ANLEGEN
  // ============================================================================

  const handleCreateCompany = async () => {
    if (!newCompany.name?.trim()) {
      setError('Bitte Firmennamen eingeben.');
      return;
    }
    if (!user?.company_id) {
      setError('Benutzer nicht korrekt geladen.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const insertData: V7ClientCompanyInsert = {
        consultant_company_id: user.company_id,
        name: newCompany.name.trim(),
        short_name: newCompany.short_name?.trim() || null,
        federal_state: newCompany.federal_state || 'DE-NW',
        contact_person: newCompany.contact_person?.trim() || null,
        contact_email: newCompany.contact_email?.trim() || null,
        is_active: true,
      };

      const { data, error: insertError } = await supabase
        .from('v7_client_companies')
        .insert(insertData)
        .select()
        .single();

      if (insertError) throw insertError;

      setSuccess(`Firma "${data.name}" erfolgreich angelegt!`);
      setShowNewCompanyModal(false);
      setNewCompany({
        name: '',
        short_name: '',
        federal_state: 'DE-NW',
        contact_person: '',
        contact_email: '',
      });

      // Liste neu laden
      await loadCompanies(user.company_id);

      // Nach 3 Sekunden zur Firma navigieren
      setTimeout(() => {
        router.push(`/v7/firmen/${data.id}`);
      }, 1500);

    } catch (err) {
      console.error('Fehler beim Anlegen:', err);
      setError('Firma konnte nicht angelegt werden.');
    } finally {
      setSaving(false);
    }
  };

  // ============================================================================
  // FILTER
  // ============================================================================

  const filteredCompanies = companies.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.short_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.city?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ============================================================================
  // RENDER
  // ============================================================================

  // Lade-Zustand
  if (loading && companies.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Lade Firmendaten...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header mit Suche und Neu-Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🏢 Kundenfirmen</h1>
          <p className="text-gray-500 mt-1">
            {companies.length} Firma{companies.length !== 1 ? 'en' : ''} verwaltet
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Suche */}
          <div className="relative">
            <input
              type="text"
              placeholder="Firma suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border rounded-lg w-64 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
          </div>

          {/* Neu-Button */}
          <button
            onClick={() => setShowNewCompanyModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 whitespace-nowrap"
          >
            <span>➕</span>
            <span>Neue Firma</span>
          </button>
        </div>
      </div>

      {/* Meldungen */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between">
          <span>❌ {error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">✕</button>
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center justify-between">
          <span>✅ {success}</span>
          <button onClick={() => setSuccess(null)} className="text-green-500 hover:text-green-700">✕</button>
        </div>
      )}

      {/* Firmen-Liste (Karten) */}
      {filteredCompanies.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
          {companies.length === 0 ? (
            <>
              <div className="text-5xl mb-4">🏢</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Noch keine Kundenfirmen</h3>
              <p className="text-gray-500 mb-6">Legen Sie Ihre erste Kundenfirma an, um mit der Zeiterfassung zu beginnen.</p>
              <button
                onClick={() => setShowNewCompanyModal(true)}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                ➕ Erste Firma anlegen
              </button>
            </>
          ) : (
            <>
              <div className="text-5xl mb-4">🔍</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Keine Treffer</h3>
              <p className="text-gray-500">Keine Firma gefunden für "{searchTerm}"</p>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCompanies.map((company) => (
            <div
              key={company.id}
              onClick={() => router.push(`/v7/firmen/${company.id}`)}
              className="bg-white rounded-xl shadow-sm border p-5 hover:shadow-md hover:border-blue-300 cursor-pointer transition-all"
            >
              {/* Firmenname */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{company.name}</h3>
                  {company.short_name && (
                    <p className="text-sm text-gray-500">{company.short_name}</p>
                  )}
                </div>
                <span className="text-2xl">🏢</span>
              </div>

              {/* Standort */}
              {(company.city || company.federal_state) && (
                <p className="text-sm text-gray-500 mb-3">
                  📍 {company.city ? `${company.city}, ` : ''}
                  {V7_FEDERAL_STATES[company.federal_state as V7FederalStateCode] || company.federal_state}
                </p>
              )}

              {/* Statistiken */}
              <div className="flex items-center gap-4 pt-3 border-t">
                <div className="flex items-center gap-1 text-sm">
                  <span>👥</span>
                  <span className="font-medium">{company.employee_count}</span>
                  <span className="text-gray-500">MA</span>
                </div>
                <div className="flex items-center gap-1 text-sm">
                  <span>📁</span>
                  <span className="font-medium">{company.project_count}</span>
                  <span className="text-gray-500">Projekte</span>
                </div>
              </div>

              {/* Ansprechpartner */}
              {company.contact_person && (
                <p className="text-xs text-gray-400 mt-3">
                  👤 {company.contact_person}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ============================================ */}
      {/* MODAL: Neue Firma anlegen */}
      {/* ============================================ */}
      {showNewCompanyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg mx-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">🏢 Neue Kundenfirma anlegen</h2>
              <button 
                onClick={() => setShowNewCompanyModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              {/* Firmenname */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Firmenname <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newCompany.name || ''}
                  onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  placeholder="z.B. Musterfirma GmbH"
                  autoFocus
                />
              </div>

              {/* Kurzname */}
              <div>
                <label className="block text-sm font-medium mb-1">Kurzname (optional)</label>
                <input
                  type="text"
                  value={newCompany.short_name || ''}
                  onChange={(e) => setNewCompany({ ...newCompany, short_name: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="z.B. Muster"
                />
              </div>

              {/* Bundesland */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Bundesland <span className="text-red-500">*</span>
                </label>
                <select
                  value={newCompany.federal_state || 'DE-NW'}
                  onChange={(e) => setNewCompany({ ...newCompany, federal_state: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  {Object.entries(V7_FEDERAL_STATES).map(([code, name]) => (
                    <option key={code} value={code}>{name}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Wichtig für korrekte Feiertags-Berechnung</p>
              </div>

              {/* Ansprechpartner */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Ansprechpartner</label>
                  <input
                    type="text"
                    value={newCompany.contact_person || ''}
                    onChange={(e) => setNewCompany({ ...newCompany, contact_person: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="Max Mustermann"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">E-Mail</label>
                  <input
                    type="email"
                    value={newCompany.contact_email || ''}
                    onChange={(e) => setNewCompany({ ...newCompany, contact_email: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="max@firma.de"
                  />
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
              <button
                onClick={() => setShowNewCompanyModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Abbrechen
              </button>
              <button
                onClick={handleCreateCompany}
                disabled={saving || !newCompany.name?.trim()}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    <span>Speichere...</span>
                  </>
                ) : (
                  <>
                    <span>💾</span>
                    <span>Firma anlegen</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}