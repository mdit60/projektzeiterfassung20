'use client';

// src/app/v7/berater/multiprojekt/page.tsx
// ============================================================================
// PZE V7 - Multiprojekt-Tool / FZul-Kapazitaetsplanung (Berater-Portal)
// ============================================================================
// Version: 7.4.8-1
// Datum: 23. April 2026
//
// Uebersichtsseite aller FZul-Vorhaben des Beraters.
// Funktionen:
//   - Liste aller Vorhaben (gruppiert nach Firma)
//   - Neues Vorhaben anlegen (Modal)
//   - Navigation zur Vorhaben-Detailseite
// ============================================================================

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import PortalHeader from '@/components/shared/PortalHeader';
import PortalNav from '@/components/shared/PortalNav';
import {
  Layers,
  Plus,
  Search,
  ChevronRight,
  Building2,
  Calendar,
  Users,
  CheckCircle,
  Clock,
  AlertCircle,
  X,
  Loader2,
} from 'lucide-react';
import { V7UserRole, V7FzulVorhaben, V7FzulVorhabenInsert } from '@/types/v7-types';

// ============================================================================
// TYPEN
// ============================================================================

interface UserProfile {
  id: string;
  email: string;
  role: V7UserRole;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  consultant_company_id: string | null;
}

interface ClientCompany {
  id: string;
  name: string;
  short_name: string | null;
  federal_state: string | null;
}

interface VorhabenMitFirma extends V7FzulVorhaben {
  company_name: string;
  company_short_name: string | null;
  ma_count: number;
}

// ============================================================================
// HILFSFUNKTIONEN
// ============================================================================

const MONAT_LABELS = [
  'Jan', 'Feb', 'Mrz', 'Apr', 'Mai', 'Jun',
  'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez',
];

function formatZeitraum(startMonat: number, endeMonat: number, jahr: number): string {
  const start = MONAT_LABELS[startMonat - 1];
  const ende = MONAT_LABELS[endeMonat - 1];
  if (startMonat === 1 && endeMonat === 12) return `Gj. ${jahr}`;
  if (startMonat === endeMonat) return `${start} ${jahr}`;
  return `${start}-${ende} ${jahr}`;
}

// ============================================================================
// MODAL: NEUES VORHABEN ANLEGEN
// ============================================================================

interface NeuesVorhabenModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: V7FzulVorhabenInsert) => Promise<void>;
  companies: ClientCompany[];
  saving: boolean;
  error: string | null;
}

function NeuesVorhabenModal({
  isOpen, onClose, onSave, companies, saving, error,
}: NeuesVorhabenModalProps) {
  const [firmId, setFirmId] = useState('');
  const [title, setTitle] = useState('');
  const [vorhabenId, setVorhabenId] = useState('');
  const [jahr, setJahr] = useState(new Date().getFullYear());
  const [startMonat, setStartMonat] = useState(1);
  const [endeMonat, setEndeMonat] = useState(12);

  // Bundesland aus gewaehlter Firma
  const selectedCompany = companies.find((c) => c.id === firmId);

  useEffect(() => {
    if (!isOpen) {
      setFirmId('');
      setTitle('');
      setVorhabenId('');
      setJahr(new Date().getFullYear());
      setStartMonat(1);
      setEndeMonat(12);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!firmId || !title) return;
    await onSave({
      client_company_id: firmId,
      title: title.trim(),
      vorhaben_id: vorhabenId.trim() || null,
      wirtschaftsjahr: jahr,
      start_monat: startMonat,
      ende_monat: endeMonat,
      bundesland: selectedCompany?.federal_state ?? null,
      status: 'entwurf',
    });
  };

  const isValid = firmId !== '' && title.trim() !== '' && startMonat <= endeMonat;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Neues FZul-Vorhaben</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">

          {/* Firma */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Firma <span className="text-red-500">*</span>
            </label>
            <select
              value={firmId}
              onChange={(e) => setFirmId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Firma waehlen...</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {selectedCompany?.federal_state && (
              <p className="text-xs text-gray-500 mt-1">
                Bundesland: {selectedCompany.federal_state} (fuer Feiertagsberechnung)
              </p>
            )}
          </div>

          {/* Titel */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kurzbezeichnung des FuE-Vorhabens <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="z.B. Entwicklung eines KI-Diagnosesystems"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Sollte der Kurzbezeichnung in der BSFZ-Bescheinigung entsprechen.
            </p>
          </div>

          {/* Vorhaben-ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vorhaben-ID (BSFZ)
              <span className="ml-1 text-xs font-normal text-gray-400">optional</span>
            </label>
            <input
              type="text"
              value={vorhabenId}
              onChange={(e) => setVorhabenId(e.target.value)}
              placeholder="z.B. 210-577-509/2024-1/1"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Aus der Bescheinigung nach SS6 FZulG (kann spaeter ergaenzt werden).
            </p>
          </div>

          {/* Wirtschaftsjahr + Zeitraum */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Wirtschaftsjahr <span className="text-red-500">*</span>
              </label>
              <select
                value={jahr}
                onChange={(e) => setJahr(Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {[2023, 2024, 2025, 2026, 2027].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Von Monat
              </label>
              <select
                value={startMonat}
                onChange={(e) => setStartMonat(Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {MONAT_LABELS.map((m, i) => (
                  <option key={i + 1} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bis Monat
              </label>
              <select
                value={endeMonat}
                onChange={(e) => setEndeMonat(Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {MONAT_LABELS.map((m, i) => (
                  <option key={i + 1} value={i + 1} disabled={i + 1 < startMonat}>{m}</option>
                ))}
              </select>
            </div>
          </div>
          {startMonat > endeMonat && (
            <p className="text-xs text-red-600">
              Endmonat muss gleich oder nach dem Startmonat liegen.
            </p>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Abbrechen
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isValid || saving}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#002451] rounded-lg hover:bg-[#001a3a] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Speichern...</>
            ) : (
              <><Plus className="w-4 h-4" /> Vorhaben anlegen</>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}

// ============================================================================
// HAUPTKOMPONENTE
// ============================================================================

export default function MultiprojektPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [companies, setCompanies] = useState<ClientCompany[]>([]);
  const [vorhaben, setVorhaben] = useState<VorhabenMitFirma[]>([]);

  const [suche, setSuche] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [savingModal, setSavingModal] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // --------------------------------------------------------------------------
  // DATEN LADEN
  // --------------------------------------------------------------------------

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/v7/login'); return; }

      // Profil
      const { data: profile, error: pErr } = await supabase
        .from('v7_user_profiles')
        .select('id, email, role, display_name, first_name, last_name, consultant_company_id')
        .eq('id', user.id)
        .single();
      if (pErr || !profile) throw new Error('Profil nicht gefunden.');
      if (!['consultant', 'system_admin'].includes(profile.role)) {
        router.push('/v7/firma/dashboard');
        return;
      }
      setUserProfile(profile);

      // Firmen dieses Beraters
      let qCompanies = supabase
        .from('v7_client_companies')
        .select('id, name, short_name, federal_state')
        .eq('is_active', true)
        .order('name');
      if (profile.role === 'consultant' && profile.consultant_company_id) {
        qCompanies = qCompanies.eq('consultant_company_id', profile.consultant_company_id);
      }
      const { data: comps, error: cErr } = await qCompanies;
      if (cErr) throw cErr;
      setCompanies(comps || []);

      if (!comps || comps.length === 0) { setLoading(false); return; }

      const companyIds = comps.map((c: ClientCompany) => c.id);

      // Vorhaben laden
      const { data: vorhabenRaw, error: vErr } = await supabase
        .from('v7_fzul_vorhaben')
        .select('*')
        .in('client_company_id', companyIds)
        .order('wirtschaftsjahr', { ascending: false })
        .order('created_at', { ascending: false });
      if (vErr) throw vErr;

      // MA-Anzahl pro Vorhaben ermitteln
      const vorhabenIds = (vorhabenRaw || []).map((v: V7FzulVorhaben) => v.id);
      let maCounts: Record<string, number> = {};
      if (vorhabenIds.length > 0) {
        const { data: tsData } = await supabase
          .from('v7_fzul_timesheets')
          .select('vorhaben_id, employee_id')
          .in('vorhaben_id', vorhabenIds);
        if (tsData) {
          const grouped: Record<string, Set<string>> = {};
          tsData.forEach((r: { vorhaben_id: string; employee_id: string }) => {
            if (!grouped[r.vorhaben_id]) grouped[r.vorhaben_id] = new Set();
            grouped[r.vorhaben_id].add(r.employee_id);
          });
          Object.entries(grouped).forEach(([vid, set]) => {
            maCounts[vid] = set.size;
          });
        }
      }

      // Mit Firmendaten anreichern
      const compMap = Object.fromEntries(comps.map((c: ClientCompany) => [c.id, c]));
      const enriched: VorhabenMitFirma[] = (vorhabenRaw || []).map((v: V7FzulVorhaben) => ({
        ...v,
        company_name: compMap[v.client_company_id]?.name ?? '-',
        company_short_name: compMap[v.client_company_id]?.short_name ?? null,
        ma_count: maCounts[v.id] ?? 0,
      }));

      setVorhaben(enriched);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setLoading(false);
    }
  }, [supabase, router]);

  useEffect(() => { loadData(); }, [loadData]);

  // --------------------------------------------------------------------------
  // VORHABEN ANLEGEN
  // --------------------------------------------------------------------------

  const handleSaveVorhaben = async (data: V7FzulVorhabenInsert) => {
    setSavingModal(true);
    setModalError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Nicht angemeldet.');

      const { error: iErr } = await supabase
        .from('v7_fzul_vorhaben')
        .insert({ ...data, created_by: user.id });
      if (iErr) throw iErr;

      setModalOpen(false);
      await loadData();
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : 'Fehler beim Speichern.');
    } finally {
      setSavingModal(false);
    }
  };

  // --------------------------------------------------------------------------
  // FILTER
  // --------------------------------------------------------------------------

  const gefilterteVorhaben = vorhaben.filter((v) => {
    if (!suche) return true;
    const q = suche.toLowerCase();
    return (
      v.title.toLowerCase().includes(q) ||
      v.company_name.toLowerCase().includes(q) ||
      String(v.wirtschaftsjahr).includes(q) ||
      (v.vorhaben_id ?? '').toLowerCase().includes(q)
    );
  });

  // Gruppierung nach Firma
  const grouped: Record<string, VorhabenMitFirma[]> = {};
  gefilterteVorhaben.forEach((v) => {
    if (!grouped[v.client_company_id]) grouped[v.client_company_id] = [];
    grouped[v.client_company_id].push(v);
  });

  // --------------------------------------------------------------------------
  // RENDER-HILFSFUNKTIONEN
  // --------------------------------------------------------------------------

  const userName = userProfile
    ? (userProfile.display_name || userProfile.email)
    : '';
  const userRole = userProfile?.role ?? 'consultant';

  function StatusBadge({ status }: { status: string }) {
    if (status === 'abgeschlossen') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
          <CheckCircle className="w-3 h-3" /> Abgeschlossen
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
        <Clock className="w-3 h-3" /> Entwurf
      </span>
    );
  }

  // --------------------------------------------------------------------------
  // RENDER
  // --------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <PortalHeader portal="berater" userName={userName} userRole={userRole} />
        <PortalNav portal="berater" userRole={userRole} />
        <main className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-3 text-gray-500">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span>Wird geladen...</span>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      <PortalHeader portal="berater" userName={userName} userRole={userRole} />
      <PortalNav portal="berater" userRole={userRole} />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">

        {/* Seitenkopf */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#002451] rounded-xl">
              <Layers className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Multiprojekt-Tool</h1>
              <p className="text-sm text-gray-500">
                FZul-Kapazitaeten ermitteln und Stundenformulare erstellen
              </p>
            </div>
          </div>
          <button
            onClick={() => { setModalError(null); setModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#002451] rounded-lg hover:bg-[#001a3a] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Neues FZul-Vorhaben
          </button>
        </div>

        {/* Fehler */}
        {error && (
          <div className="mb-6 flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Suchfeld */}
        {vorhaben.length > 0 && (
          <div className="relative mb-6 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Vorhaben oder Firma suchen..."
              value={suche}
              onChange={(e) => setSuche(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        {/* Leer-Zustand */}
        {vorhaben.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="p-4 bg-gray-100 rounded-2xl mb-4">
              <Layers className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              Noch keine FZul-Vorhaben angelegt
            </h3>
            <p className="text-sm text-gray-500 max-w-md mb-6">
              Legen Sie ein Vorhaben fuer eine Ihrer Kundenfirmen an. Das Tool
              ermittelt automatisch die verfuegbaren FZul-Kapazitaeten aus den
              vorhandenen Zeiterfassungsdaten.
            </p>
            <button
              onClick={() => { setModalError(null); setModalOpen(true); }}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-[#002451] rounded-lg hover:bg-[#001a3a]"
            >
              <Plus className="w-4 h-4" />
              Erstes Vorhaben anlegen
            </button>
          </div>
        )}

        {/* Vorhaben-Liste gruppiert nach Firma */}
        {Object.entries(grouped).map(([companyId, vorhabenGruppe]) => (
          <div key={companyId} className="mb-8">

            {/* Firmen-Header */}
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="w-4 h-4 text-gray-400" />
              <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                {vorhabenGruppe[0].company_name}
              </h2>
              <span className="text-xs text-gray-400">
                ({vorhabenGruppe.length} {vorhabenGruppe.length === 1 ? 'Vorhaben' : 'Vorhaben'})
              </span>
            </div>

            {/* Karten */}
            <div className="space-y-3">
              {vorhabenGruppe.map((v) => (
                <button
                  key={v.id}
                  onClick={() => router.push(`/v7/berater/multiprojekt/${v.id}`)}
                  className="w-full text-left bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md hover:border-[#002451] transition-all duration-200 group"
                >
                  <div className="flex items-start justify-between gap-4">

                    {/* Links: Titel + Meta */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-base font-semibold text-gray-900 truncate">
                          {v.title}
                        </h3>
                        <StatusBadge status={v.status} />
                      </div>

                      <div className="flex items-center gap-4 text-sm text-gray-500 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatZeitraum(v.start_monat, v.ende_monat, v.wirtschaftsjahr)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" />
                          {v.ma_count === 0
                            ? 'Noch keine Mitarbeiter'
                            : `${v.ma_count} Mitarbeiter`}
                        </span>
                        {v.vorhaben_id && (
                          <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">
                            {v.vorhaben_id}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Rechts: Pfeil */}
                    <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-[#002451] flex-shrink-0 mt-0.5 transition-colors" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* Keine Suchergebnisse */}
        {vorhaben.length > 0 && gefilterteVorhaben.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Search className="w-8 h-8 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">Keine Vorhaben gefunden fuer "{suche}"</p>
          </div>
        )}

      </main>

      {/* Modal: Neues Vorhaben */}
      <NeuesVorhabenModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveVorhaben}
        companies={companies}
        saving={savingModal}
        error={modalError}
      />

    </div>
  );
}
