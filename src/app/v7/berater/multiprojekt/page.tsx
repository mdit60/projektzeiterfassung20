'use client';

// src/app/v7/berater/multiprojekt/page.tsx
// ============================================================================
// PZE V7 - Kapazitaetsplanungs-Tool (Berater-Portal)
// ============================================================================
// Version: 7.4.8-15
// v7.4.8-15: MA-Name in Kapazitaetsmatrix klickbar -> Navigation zur
//   Mitarbeiterverwaltung (Firmen-Cockpit). Mode-aware (App/Classic).
// v7.4.8-14: A-022 FIX: Monatskapazitaet auf echte Arbeitstage umgestellt.
//   Vorher: pauschale 173,33h x (WAZ/40) fuer jeden Monat (Jahresdurchschnitt).
//   Jetzt: countWorkdaysInMonth(jahr, monat, bundesland) x (WAZ/5).
//   Beruecksichtigt Feiertage des Bundeslandes und MA-spezifische WAZ.
//   Zusaetzlich: v7_employee_hours_history fuer unterjaerige WAZ-Aenderungen.
// v7.4.8-13: CRITICAL FIX: .limit(10000) auf v7_timesheets-Query (Supabase 1000-Zeilen-Limit)
// v7.4.8-12: Dashboard-Link im App-Modus (pze_mode='app') ausgeblendet
// Datum: 24. April 2026
//
// Layout:
//   - Kontrollleiste oben: Firma + Jahresfenster horizontal
//   - 3/4 links:  3x Jahresmatrix untereinander
//   - 1/4 rechts: FZul + Platz fuer kuenftige Erweiterungen
//   - Namensspalte schmal (80px), Summenspalten schmal + zentriert
//   - Druck-Button + @media print CSS (nur Tabellen sichtbar)
// ============================================================================

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import PortalHeader from '@/components/shared/PortalHeader';
import PortalNav from '@/components/shared/PortalNav';
import {
  Layers,
  Plus,
  ChevronRight,
  Users,
  CheckCircle,
  Clock,
  Loader2,
  BarChart3,
  ChevronLeft,
  ChevronDown,
  Printer,
} from 'lucide-react';
import {
  V7UserRole,
  V7FzulVorhaben,
  V7FzulVorhabenInsert,
} from '@/types/v7-types';
import { countWorkdaysInMonth, normalizeStateCode } from '@/lib/holidays/germanHolidays';
import type { HolidayRegion } from '@/lib/holidays/germanHolidays';

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

interface ProjektBeitrag {
  projekt_id: string;
  projekt_name: string;
  funding_format: string;
  geplant: number;
  verbucht: number;
}

interface MonatKapazitaet {
  monat: number;
  jahr: number;
  gesamt: number;
  geplant: number;
  verbucht: number;
  frei: number;
  freiProzent: number;
  projekte: ProjektBeitrag[];
}

interface MaKapazitaet {
  employee_id: string;
  display_name: string;
  weekly_hours: number;
  monate: MonatKapazitaet[];
}

// ============================================================================
// HILFSFUNKTIONEN
// ============================================================================

const MONAT_KURZ = ['Jan','Feb','Mrz','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
const MONAT_LABELS = ['Jan','Feb','Mrz','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];

function getAmpelDot(fp: number)  { return fp > 50 ? 'bg-green-500' : fp > 20 ? 'bg-yellow-400' : fp > 5 ? 'bg-orange-500' : 'bg-red-500'; }
function getAmpelText(fp: number) { return fp > 50 ? 'text-green-700' : fp > 20 ? 'text-yellow-700' : fp > 5 ? 'text-orange-700' : 'text-red-700'; }
function getAmpelBg(fp: number)   { return fp > 50 ? 'bg-green-50 border-green-200' : fp > 20 ? 'bg-yellow-50 border-yellow-200' : fp > 5 ? 'bg-orange-50 border-orange-200' : 'bg-red-50 border-red-200'; }

function monatsKap(weeklyHours: number): number {
  return Math.round((weeklyHours / 40) * 173.33 * 10) / 10;
}

// A-022: Effektive WAZ fuer einen Stichtag aus der Hours-History ermitteln
function getEffectiveWeeklyHours(
  history: Array<{ gueltig_ab: string; weekly_hours: number }>,
  stichtag: string,
  fallback: number,
): number {
  if (!history || history.length === 0) return fallback;
  const sorted = [...history].sort((a, b) => b.gueltig_ab.localeCompare(a.gueltig_ab));
  const eintrag = sorted.find((e) => e.gueltig_ab <= stichtag);
  return eintrag ? eintrag.weekly_hours : fallback;
}

// ============================================================================
// EINZELNE JAHRES-MATRIX
// ============================================================================

interface JahresmatrixProps {
  jahr: number;
  maListe: MaKapazitaet[];
  loading: boolean;
  companyId: string;  // A-022: fuer Klick auf MA-Name -> Mitarbeiterverwaltung
}

function Jahresmatrix({ jahr, maListe, loading, companyId }: JahresmatrixProps) {
  const router = useRouter();
  const [tooltip, setTooltip] = useState<{
    ma: MaKapazitaet; monat: MonatKapazitaet; x: number; y: number;
  } | null>(null);

  const monate12 = Array.from({ length: 12 }, (_, i) => i + 1);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-5 px-4 text-gray-400 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Wird berechnet...</span>
      </div>
    );
  }

  if (maListe.length === 0) {
    return (
      <div className="py-5 px-4 text-center text-gray-400 text-sm">
        <Users className="w-5 h-5 mx-auto mb-1 text-gray-300" />
        Keine Mitarbeiter gefunden.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto" onMouseLeave={() => setTooltip(null)}>
      <table className="border-collapse w-full" style={{ fontSize: '13px' }}>
        <thead>
          <tr className="bg-[#002451] text-white">
            {/* Namensspalte schmal */}
            <th className="text-center px-2 py-2 font-bold sticky left-0 bg-[#002451] z-10 border-r border-blue-700"
                style={{ minWidth: '80px', width: '80px' }}>
              {jahr}
            </th>
            <th className="text-center px-1 py-2 font-medium border-r border-blue-700 text-blue-200"
                style={{ minWidth: '32px', width: '32px', fontSize: '11px' }}>
              h/W
            </th>
            {monate12.map(m => (
              <th key={m}
                  className="text-center py-2 font-medium border-l border-blue-700"
                  style={{ minWidth: '44px', width: '44px', fontSize: '12px' }}>
                {MONAT_KURZ[m - 1]}
              </th>
            ))}
            {/* Summenspalten schmal + zentriert */}
            <th className="text-center px-1 py-2 font-semibold border-l border-blue-700 text-blue-100"
                style={{ minWidth: '46px', width: '46px', fontSize: '12px' }}>
              Frei h
            </th>
            <th className="text-center px-1 py-2 font-semibold border-l border-blue-700 text-blue-100"
                style={{ minWidth: '50px', width: '50px', fontSize: '12px' }}>
              Frei PM
            </th>
          </tr>
        </thead>
        <tbody>
          {maListe.map((ma, idx) => {
            const monateMA = ma.monate.filter(m => m.jahr === jahr);
            const gesamtFrei = monateMA.reduce((s, m) => s + m.frei, 0);
            const isOdd = idx % 2 === 0;
            const rowBg = isOdd ? 'bg-white' : 'bg-gray-50';

            return (
              <tr key={ma.employee_id}
                  className={`border-b border-gray-200 ${rowBg} hover:bg-blue-50`}>

                {/* Name schmal mit Tooltip bei Truncate — klickbar -> MA-Verwaltung */}
                <td className={`px-2 py-2 font-semibold text-gray-800 text-center sticky left-0 z-10 border-r border-gray-300 ${rowBg} hover:bg-blue-50 cursor-pointer`}
                    style={{ minWidth: '80px', width: '80px', fontSize: '12px' }}
                    title={`${ma.display_name} — Klick: Mitarbeiterdaten bearbeiten`}
                    onClick={() => {
                      const isAppMode = typeof window !== 'undefined' && localStorage.getItem('pze_mode') === 'app';
                      const url = isAppMode
                        ? `/v7/berater/app/firma/${companyId}`
                        : `/v7/berater/foerderung/firma/${companyId}`;
                      router.push(url);
                    }}>
                  <span className="block truncate text-blue-700 hover:underline">{ma.display_name}</span>
                </td>

                {/* WAZ */}
                <td className="px-1 py-2 text-center text-gray-400 border-r border-gray-200"
                    style={{ fontSize: '11px', width: '32px' }}>
                  {ma.weekly_hours}
                </td>

                {/* Monats-Ampeln */}
                {monate12.map(monat => {
                  const md = monateMA.find(m => m.monat === monat);
                  if (!md) {
                    return (
                      <td key={monat}
                          className="border-l border-gray-200 text-center bg-gray-100"
                          style={{ width: '44px' }}>
                        <span className="text-gray-300" style={{ fontSize: '10px' }}>--</span>
                      </td>
                    );
                  }
                  return (
                    <td key={monat}
                        className={`border-l border-gray-200 text-center cursor-pointer ${getAmpelBg(md.freiProzent)} border`}
                        style={{ width: '44px', padding: '4px 2px' }}
                        onMouseEnter={e => setTooltip({ ma, monat: md, x: e.clientX, y: e.clientY })}
                        onMouseMove={e => setTooltip(prev => prev ? { ...prev, x: e.clientX, y: e.clientY } : null)}
                    >
                      <div className="flex flex-col items-center gap-0.5">
                        <div className={`w-2 h-2 rounded-full ${getAmpelDot(md.freiProzent)}`}></div>
                        <div className={`font-bold ${getAmpelText(md.freiProzent)}`} style={{ fontSize: '12px' }}>
                          {md.frei > 0 ? md.frei.toFixed(0) : '0'}
                        </div>
                      </div>
                    </td>
                  );
                })}

                {/* Jahres-Summe h zentriert */}
                <td className="py-2 text-center font-bold border-l border-gray-300"
                    style={{ fontSize: '12px', width: '46px' }}>
                  <span className={gesamtFrei > 0 ? 'text-green-700' : 'text-red-500'}>
                    {gesamtFrei.toFixed(0)}
                  </span>
                </td>

                {/* Jahres-Summe PM zentriert */}
                <td className="py-2 text-center font-bold border-l border-gray-300"
                    style={{ fontSize: '12px', width: '50px' }}>
                  <span className={gesamtFrei > 0 ? 'text-green-700' : 'text-red-500'}>
                    {(gesamtFrei / 173.33).toFixed(2)}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Tooltip */}
      {tooltip && (
        <div className="fixed z-50 bg-white border border-gray-200 rounded-xl shadow-xl p-3 text-xs"
             style={{ left: tooltip.x + 12, top: tooltip.y - 120, minWidth: '240px', maxWidth: '300px', pointerEvents: 'none' }}>
          <div className="font-bold text-gray-800 mb-2 border-b border-gray-100 pb-1.5">
            {tooltip.ma.display_name} — {MONAT_KURZ[tooltip.monat.monat - 1]} {tooltip.monat.jahr}
          </div>
          <div className="flex justify-between text-gray-600 mb-2">
            <span className="text-gray-400">Monatskapazitaet:</span>
            <span className="font-medium">{tooltip.monat.gesamt.toFixed(1)} h</span>
          </div>
          {tooltip.monat.projekte.length > 0 && (
            <div className="space-y-1 mb-2">
              <div className="text-gray-400 font-medium uppercase tracking-wide mb-1" style={{ fontSize: '10px' }}>Projekte</div>
              {tooltip.monat.projekte.map(p => (
                <div key={p.projekt_id} className="bg-gray-50 rounded px-2 py-1">
                  <div className="font-semibold text-gray-700 truncate" style={{ fontSize: '11px' }}>{p.projekt_name}</div>
                  <div className="flex justify-between mt-0.5">
                    {p.geplant > 0 && <span className="text-orange-600">geplant: -{p.geplant.toFixed(1)}h</span>}
                    {p.verbucht > 0 && <span className="text-red-600">verbucht: -{p.verbucht.toFixed(1)}h</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="border-t border-gray-200 pt-1.5 flex justify-between font-bold">
            <span>Frei:</span>
            <span className={getAmpelText(tooltip.monat.freiProzent)}>
              {tooltip.monat.frei.toFixed(1)} h ({tooltip.monat.freiProzent.toFixed(0)}%)
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MODAL: NEUES VORHABEN
// ============================================================================

interface NeuesVorhabenModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: V7FzulVorhabenInsert) => Promise<void>;
  companies: ClientCompany[];
  saving: boolean;
  error: string | null;
}

function NeuesVorhabenModal({ isOpen, onClose, onSave, companies, saving, error }: NeuesVorhabenModalProps) {
  const aktuellesJahr = new Date().getFullYear();
  const [form, setForm] = useState({
    client_company_id: companies[0]?.id ?? '',
    title: '',
    vorhaben_id: '',
    wirtschaftsjahr: aktuellesJahr,
    start_monat: 1,
    ende_monat: 12,
    bundesland: '',
    notes: '',
  });

  useEffect(() => {
    if (companies.length > 0 && !form.client_company_id) {
      setForm(f => ({ ...f, client_company_id: companies[0].id }));
    }
  }, [companies, form.client_company_id]);

  if (!isOpen) return null;

  const isValid = form.client_company_id && form.title.trim().length > 0;

  const handleSubmit = async () => {
    if (!isValid) return;
    await onSave({
      client_company_id: form.client_company_id,
      title: form.title.trim(),
      vorhaben_id: form.vorhaben_id.trim() || null,
      wirtschaftsjahr: form.wirtschaftsjahr,
      start_monat: form.start_monat,
      ende_monat: form.ende_monat,
      bundesland: form.bundesland || null,
      status: 'entwurf',
      notes: form.notes || null,
    } as V7FzulVorhabenInsert);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-bold text-gray-900">Neues FZul-Vorhaben anlegen</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 text-xl">&times;</button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-sm text-red-700">{error}</div>}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Firma</label>
            <select value={form.client_company_id} onChange={e => setForm(f => ({ ...f, client_company_id: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Vorhabentitel</label>
            <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Titel des Forschungsvorhabens"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Wirtschaftsjahr</label>
              <input type="number" value={form.wirtschaftsjahr} onChange={e => setForm(f => ({ ...f, wirtschaftsjahr: Number(e.target.value) }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Vorhaben-ID (optional)</label>
              <input type="text" value={form.vorhaben_id} onChange={e => setForm(f => ({ ...f, vorhaben_id: e.target.value }))}
                placeholder="z.B. FZul-2026-001"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Startmonat</label>
              <select value={form.start_monat} onChange={e => setForm(f => ({ ...f, start_monat: Number(e.target.value) }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {MONAT_LABELS.map((l, i) => <option key={i+1} value={i+1}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Endmonat</label>
              <select value={form.ende_monat} onChange={e => setForm(f => ({ ...f, ende_monat: Number(e.target.value) }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {MONAT_LABELS.map((l, i) => <option key={i+1} value={i+1}>{l}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <button onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
            Abbrechen
          </button>
          <button onClick={handleSubmit} disabled={!isValid || saving}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#002451] rounded-lg hover:bg-[#001a3a] disabled:opacity-50">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Speichern...</> : <><Plus className="w-4 h-4" /> Anlegen</>}
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
  const [modalOpen, setModalOpen] = useState(false);
  const [savingModal, setSavingModal] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [neuesVorhabenDropdownOpen, setNeuesVorhabenDropdownOpen] = useState(false);

  // Kapazitaetsmatrix State
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [maKapazitaeten, setMaKapazitaeten] = useState<MaKapazitaet[]>([]);
  const [kapazitaetLoading, setKapazitaetLoading] = useState(false);
  const [startJahr, setStartJahr] = useState(new Date().getFullYear());

  // ============================================================================
  // BASISDATEN LADEN
  // ============================================================================

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/v7/login'); return; }

      const { data: profile, error: pErr } = await supabase
        .from('v7_user_profiles')
        .select('id, email, role, display_name, first_name, last_name, consultant_company_id')
        .eq('id', user.id)
        .single();
      if (pErr || !profile) { router.push('/v7/login'); return; }
      if (!['consultant', 'system_admin'].includes(profile.role)) {
        router.push('/v7/firma/dashboard'); return;
      }
      setUserProfile(profile);

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

      // FZul-Vorhaben
      const companyIds = comps.map((c: ClientCompany) => c.id);
      const { data: vorhabenRaw } = await supabase
        .from('v7_fzul_vorhaben')
        .select('*')
        .in('client_company_id', companyIds)
        .order('wirtschaftsjahr', { ascending: false });

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
          Object.entries(grouped).forEach(([vid, set]) => { maCounts[vid] = set.size; });
        }
      }

      const compMap = Object.fromEntries(comps.map((c: ClientCompany) => [c.id, c]));
      setVorhaben((vorhabenRaw || []).map((v: V7FzulVorhaben) => ({
        ...v,
        company_name: compMap[v.client_company_id]?.name ?? '-',
        company_short_name: compMap[v.client_company_id]?.short_name ?? null,
        ma_count: maCounts[v.id] ?? 0,
      })));

      if (comps.length > 0 && !selectedCompanyId) {
        setSelectedCompanyId(comps[0].id);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setLoading(false);
    }
  }, [supabase, router, selectedCompanyId]);

  useEffect(() => { loadData(); }, [loadData]);

  // ============================================================================
  // KAPAZITAETEN FUER 3 JAHRE LADEN
  // ============================================================================

  const ladeKapazitaeten = useCallback(async (companyId: string, ersteJahr: number) => {
    if (!companyId) return;
    setKapazitaetLoading(true);
    try {
      const heute = new Date();
      const jahreRange = [ersteJahr, ersteJahr + 1, ersteJahr + 2];
      const startDatum = `${ersteJahr}-01-01`;
      const endeDatum  = `${ersteJahr + 2}-12-31`;

      const { data: employees } = await supabase
        .from('v7_employees')
        .select('id, display_name, weekly_hours')
        .eq('client_company_id', companyId)
        .eq('is_active', true)
        .order('display_name');

      if (!employees || employees.length === 0) {
        setMaKapazitaeten([]);
        setKapazitaetLoading(false);
        return;
      }

      const employeeIds = employees.map((e: { id: string }) => e.id);

      // A-022: Bundesland + Feiertagsregion der Firma laden
      const { data: companyInfo } = await supabase
        .from('v7_client_companies')
        .select('federal_state, holiday_region')
        .eq('id', companyId)
        .single();
      const stateCode = normalizeStateCode(companyInfo?.federal_state);
      const holidayRegion = (companyInfo?.holiday_region || undefined) as HolidayRegion | undefined;

      // A-022: WAZ-Verlauf pro MA laden (fuer unterjaerige Aenderungen)
      let historyMap: Record<string, Array<{ gueltig_ab: string; weekly_hours: number }>> = {};
      const { data: histData } = await supabase
        .from('v7_employee_hours_history')
        .select('employee_id, weekly_hours, gueltig_ab')
        .in('employee_id', employeeIds);
      if (histData) {
        histData.forEach((h: { employee_id: string; weekly_hours: number; gueltig_ab: string }) => {
          if (!historyMap[h.employee_id]) historyMap[h.employee_id] = [];
          historyMap[h.employee_id].push({ gueltig_ab: h.gueltig_ab, weekly_hours: h.weekly_hours });
        });
      }

      const { data: projekte } = await supabase
        .from('v7_projects')
        .select('id, name, short_name, funding_format, start_date, end_date')
        .eq('client_company_id', companyId)
        .eq('is_active', true);

      const projektIds = (projekte || []).map((p: { id: string }) => p.id);
      const projektMap: Record<string, { name: string; funding_format: string }> = {};
      (projekte || []).forEach((p: { id: string; name: string; short_name: string | null; funding_format: string }) => {
        projektMap[p.id] = { name: p.short_name || p.name, funding_format: p.funding_format };
      });

      const nwmProjektIds = (projekte || [])
        .filter((p: { funding_format: string }) => p.funding_format === 'ZIM_NETZWERK')
        .map((p: { id: string }) => p.id);
      const standardProjektIds = (projekte || [])
        .filter((p: { funding_format: string }) => p.funding_format !== 'ZIM_NETZWERK')
        .map((p: { id: string }) => p.id);

      let apMap: Record<string, { start: string; end: string; project_id: string }> = {};
      if (standardProjektIds.length > 0) {
        const { data: aps } = await supabase
          .from('v7_work_packages')
          .select('id, project_id, start_date, end_date')
          .in('project_id', standardProjektIds)
          .not('start_date', 'is', null)
          .not('end_date', 'is', null);
        (aps || []).forEach((ap: { id: string; project_id: string; start_date: string; end_date: string }) => {
          apMap[ap.id] = { start: ap.start_date, end: ap.end_date, project_id: ap.project_id };
        });
      }

      let wpaData: Array<{ employee_id: string; work_package_id: string; planned_person_months: number }> = [];
      if (Object.keys(apMap).length > 0) {
        const { data: wpa } = await supabase
          .from('v7_work_package_assignments')
          .select('employee_id, work_package_id, planned_person_months')
          .in('employee_id', employeeIds)
          .in('work_package_id', Object.keys(apMap))
          .eq('is_active', true)
          .not('planned_person_months', 'is', null);
        wpaData = wpa || [];
      }

      let nwmApData: Array<{
        employee_id: string; work_package_id: string; planned_pm: number;
        start_datum: string; ende_datum: string; project_id: string;
      }> = [];

      if (nwmProjektIds.length > 0) {
        const { data: fzData } = await supabase
          .from('v7_nwm_foerderzeitraeume')
          .select('id, project_id, netzwerkjahr, start_datum, ende_datum')
          .in('project_id', nwmProjektIds)
          .lte('start_datum', endeDatum)
          .gte('ende_datum', startDatum);

        const fzIds = (fzData || []).map((fz: { id: string }) => fz.id);
        const fzProjektMap: Record<string, string> = {};
        (fzData || []).forEach((fz: { id: string; project_id: string }) => {
          fzProjektMap[fz.id] = fz.project_id;
        });

        if (fzIds.length > 0) {
          const { data: apPlanung } = await supabase
            .from('v7_nwm_ap_planung')
            .select('employee_id, work_package_id, planned_pm, start_datum, ende_datum, foerderzeitraum_id')
            .in('employee_id', employeeIds)
            .in('foerderzeitraum_id', fzIds)
            .not('planned_pm', 'is', null);

          (apPlanung || []).forEach((ap: {
            employee_id: string; work_package_id: string; planned_pm: number;
            start_datum: string; ende_datum: string; foerderzeitraum_id: string;
          }) => {
            nwmApData.push({ ...ap, project_id: fzProjektMap[ap.foerderzeitraum_id] ?? '' });
          });
        }
      }

      let tsData: Array<{ employee_id: string; project_id: string; work_date: string; hours: number }> = [];
      if (projektIds.length > 0) {
        const { data: ts } = await supabase
          .from('v7_timesheets')
          .select('employee_id, project_id, work_date, hours')
          .in('employee_id', employeeIds)
          .in('project_id', projektIds)
          .gte('work_date', startDatum)
          .lte('work_date', endeDatum)
          .eq('is_active', true)
          .limit(10000);
        tsData = ts || [];
      }

      const verbucht: Record<string, Record<number, Record<number, Record<string, number>>>> = {};
      tsData.forEach(ts => {
        const j = parseInt(ts.work_date.split('-')[0]);
        const m = parseInt(ts.work_date.split('-')[1]);
        if (!verbucht[ts.employee_id]) verbucht[ts.employee_id] = {};
        if (!verbucht[ts.employee_id][j]) verbucht[ts.employee_id][j] = {};
        if (!verbucht[ts.employee_id][j][m]) verbucht[ts.employee_id][j][m] = {};
        verbucht[ts.employee_id][j][m][ts.project_id] =
          (verbucht[ts.employee_id][j][m][ts.project_id] || 0) + Number(ts.hours);
      });

      const geplant: Record<string, Record<number, Record<number, Record<string, number>>>> = {};

      const verteile = (empId: string, pid: string, pm: number, apStart: string, apEnd: string) => {
        const start = new Date(apStart);
        const end   = new Date(apEnd);
        const totalH = pm * 173.33;
        const apMonate: { j: number; m: number }[] = [];
        let cur = new Date(start.getFullYear(), start.getMonth(), 1);
        const endM = new Date(end.getFullYear(), end.getMonth(), 1);
        while (cur <= endM) {
          apMonate.push({ j: cur.getFullYear(), m: cur.getMonth() + 1 });
          cur.setMonth(cur.getMonth() + 1);
        }
        if (apMonate.length === 0) return;
        const hProMonat = totalH / apMonate.length;
        apMonate.forEach(({ j, m }) => {
          if (!jahreRange.includes(j)) return;
          const istVergangenheit = j < heute.getFullYear() ||
            (j === heute.getFullYear() && m < heute.getMonth() + 1);
          if (istVergangenheit) return;
          if (!geplant[empId]) geplant[empId] = {};
          if (!geplant[empId][j]) geplant[empId][j] = {};
          if (!geplant[empId][j][m]) geplant[empId][j][m] = {};
          geplant[empId][j][m][pid] = (geplant[empId][j][m][pid] || 0) + hProMonat;
        });
      };

      wpaData.forEach(wpa => {
        const ap = apMap[wpa.work_package_id];
        if (!ap || !wpa.planned_person_months) return;
        verteile(wpa.employee_id, ap.project_id, wpa.planned_person_months, ap.start, ap.end);
      });

      nwmApData.forEach(ap => {
        if (!ap.planned_pm || !ap.start_datum || !ap.ende_datum || !ap.project_id) return;
        verteile(ap.employee_id, ap.project_id, ap.planned_pm, ap.start_datum, ap.ende_datum);
      });

      const result: MaKapazitaet[] = employees.map((emp: { id: string; display_name: string; weekly_hours: number }) => {
        const empHistory = historyMap[emp.id] || [];
        const monatsDaten: MonatKapazitaet[] = [];

        jahreRange.forEach(j => {
          for (let m = 1; m <= 12; m++) {
            // A-022: Effektive WAZ fuer diesen Monat (aus History oder Stammdaten)
            const stichtag = `${j}-${String(m).padStart(2, '0')}-01`;
            const effWAZ = getEffectiveWeeklyHours(empHistory, stichtag, emp.weekly_hours || 40);
            // A-022: Echte Arbeitstage dieses Monats (Werktage minus Feiertage)
            const arbeitstage = countWorkdaysInMonth(j, m, stateCode, holidayRegion);
            // A-022: Monatskapazitaet = Arbeitstage x Tagesstunden
            const gesamt = Math.round(arbeitstage * (effWAZ / 5) * 10) / 10;

            const geplantProjekte = geplant[emp.id]?.[j]?.[m] || {};
            const verbuchtProjekte = verbucht[emp.id]?.[j]?.[m] || {};
            const g = Math.round(Object.values(geplantProjekte).reduce((s, v) => s + v, 0) * 10) / 10;
            const v = Math.round(Object.values(verbuchtProjekte).reduce((s, h) => s + h, 0) * 10) / 10;
            const frei = Math.max(0, Math.round((gesamt - g - v) * 10) / 10);
            const freiProzent = gesamt > 0 ? (frei / gesamt) * 100 : 100;

            const alleProjektIds = new Set([...Object.keys(geplantProjekte), ...Object.keys(verbuchtProjekte)]);
            const projBeitraege: ProjektBeitrag[] = Array.from(alleProjektIds).map(pid => ({
              projekt_id: pid,
              projekt_name: projektMap[pid]?.name ?? pid,
              funding_format: projektMap[pid]?.funding_format ?? '',
              geplant: Math.round((geplantProjekte[pid] || 0) * 10) / 10,
              verbucht: Math.round((verbuchtProjekte[pid] || 0) * 10) / 10,
            }));

            monatsDaten.push({ monat: m, jahr: j, gesamt, geplant: g, verbucht: v, frei, freiProzent, projekte: projBeitraege });
          }
        });

        return {
          employee_id: emp.id,
          display_name: emp.display_name,
          weekly_hours: emp.weekly_hours || 40,
          monate: monatsDaten,
        };
      });

      setMaKapazitaeten(result);
    } catch (err) {
      console.error('Fehler bei Kapazitaetsberechnung:', err);
    } finally {
      setKapazitaetLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    if (selectedCompanyId) ladeKapazitaeten(selectedCompanyId, startJahr);
  }, [selectedCompanyId, startJahr, ladeKapazitaeten]);

  // ============================================================================
  // VORHABEN ANLEGEN
  // ============================================================================

  const handleSaveVorhaben = async (data: V7FzulVorhabenInsert) => {
    setSavingModal(true); setModalError(null);
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

  // ============================================================================
  // RENDER
  // ============================================================================

  const userName  = userProfile ? (userProfile.display_name || userProfile.email) : '';
  const userRole  = userProfile?.role ?? 'consultant';
  const dreiJahre = [startJahr, startJahr + 1, startJahr + 2];
  const selectedCompanyName = companies.find(c => c.id === selectedCompanyId)?.name ?? '';

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <PortalHeader portal="berater" userName={userName} userRole={userRole} />
        <PortalNav portal="berater" userRole={userRole} />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </main>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .kpt-print-area, .kpt-print-area * { visibility: visible; }
          .kpt-print-header, .kpt-print-header * { visibility: visible; }
          .kpt-print-area { position: absolute; left: 0; top: 40px; width: 100%; }
          .kpt-print-header { position: absolute; left: 0; top: 0; width: 100%; }
          @page { size: A4 landscape; margin: 1cm; }
          /* Rasterlinien erzwingen */
          .kpt-print-area table { border-collapse: collapse !important; width: 100% !important; }
          .kpt-print-area th,
          .kpt-print-area td { border: 1px solid #cbd5e1 !important; padding-top: 2px !important; padding-bottom: 2px !important; }
          /* Hintergrundfarben erzwingen */
          .kpt-print-area thead tr { background-color: #002451 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .kpt-print-area thead th { color: white !important; padding-top: 3px !important; padding-bottom: 3px !important; }
          /* rounded borders entfernen */
          .kpt-print-area > div { border-radius: 0 !important; margin-bottom: 10px !important; }
          /* Zellen-Innenleben kompakt */
          .kpt-print-area .flex-col { gap: 0 !important; }
        }
      `}</style>
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <PortalHeader portal="berater" userName={userName} userRole={userRole} />
      <PortalNav portal="berater" userRole={userRole} />

      <main className="flex-1 w-full">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

          {/* Zurueck - nur im Classic-Modus */}
          {typeof window !== 'undefined' && localStorage.getItem('pze_mode') !== 'app' && (
          <button onClick={() => router.push('/v7/berater/dashboard')}
            className="flex items-center gap-1 text-sm text-gray-400 hover:text-[#002451] mb-5">
            <ChevronLeft className="w-4 h-4" /> Dashboard
          </button>
          )}

          {/* ============================================================ */}
          {/* KONTROLLLEISTE OBEN: Titel + Firma + Jahresfenster            */}
          {/* ============================================================ */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4 mb-6 flex items-center gap-6 flex-wrap">

            {/* Titel */}
            <div className="flex items-center gap-3 mr-4">
              <div className="p-2 bg-[#002451] rounded-xl">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-base font-bold text-gray-900">Kapazitaetsplanung</h1>
                <p className="text-xs text-gray-400">Freie MA-Kapazitaeten</p>
              </div>
            </div>

            {/* Firmenauswahl */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Firma</span>
              <select
                value={selectedCompanyId}
                onChange={e => setSelectedCompanyId(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]">
                <option value="">Firma waehlen...</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            {/* Trennlinie */}
            <div className="h-8 w-px bg-gray-200"></div>

            {/* Jahresfenster-Navigation */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Zeitraum</span>
              <div className="flex items-center gap-2">
                <button onClick={() => setStartJahr(j => j - 1)}
                  className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-200">
                  {dreiJahre.map((j, i) => (
                    <span key={j} className={`text-sm font-semibold ${i === 0 ? 'text-[#002451]' : 'text-gray-400'}`}>
                      {j}{i < 2 ? <span className="text-gray-300 mx-1">·</span> : ''}
                    </span>
                  ))}
                </div>
                <button onClick={() => setStartJahr(j => j + 1)}
                  className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Legende */}
            <div className="flex items-center gap-3 ml-auto text-xs text-gray-500 flex-wrap">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block"></span> &gt;50%</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-yellow-400 inline-block"></span> 20-50%</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block"></span> 5-20%</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span> &lt;5% frei</span>
              <div className="w-px h-4 bg-gray-200 mx-1"></div>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-[#002451] transition-colors print:hidden">
                <Printer className="w-3.5 h-3.5" />
                Drucken
              </button>
            </div>
          </div>

          {/* Print-only: Titel + Firma + Zeitraum als Kopfzeile */}
          <div className="hidden print:block kpt-print-header mb-4 pb-2 border-b border-gray-300">
            <div className="flex items-center justify-between">
              <h1 className="text-lg font-bold text-gray-900">Kapazitaetsplanung — {selectedCompanyName}</h1>
              <p className="text-sm text-gray-600 font-medium">
                Zeitraum: {dreiJahre[0]} – {dreiJahre[2]}
              </p>
              <p className="text-xs text-gray-400">PZE V7 · {new Date().toLocaleDateString('de-DE')}</p>
            </div>
          </div>

          {/* ============================================================ */}
          {/* HAUPT-LAYOUT: 3/4 links + 1/4 rechts                         */}
          {/* ============================================================ */}
          <div className="flex gap-6 items-start">

            {/* Linke Spalte: 3 Jahresmatrizen */}
            <div className="flex-1 min-w-0 space-y-5 kpt-print-area">
              {dreiJahre.map(jahr => (
                <div key={jahr} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <Jahresmatrix
                    jahr={jahr}
                    maListe={maKapazitaeten}
                    loading={kapazitaetLoading}
                    companyId={selectedCompanyId}
                  />
                </div>
              ))}
            </div>

            {/* Rechte Spalte: FZul + kuenftige Erweiterungen */}
            <div className="w-72 flex-shrink-0 space-y-5">

              {/* FuE-Vorhaben */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-bold text-gray-700">FuE-Vorhaben</span>
                  </div>
                  <div className="relative">
                    <button
                      onClick={() => setNeuesVorhabenDropdownOpen(o => !o)}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-white bg-[#002451] rounded-lg hover:bg-[#001a3a]">
                      <Plus className="w-3 h-3" /> Neu
                      <ChevronDown className="w-3 h-3" />
                    </button>
                    {neuesVorhabenDropdownOpen && (
                      <div className="absolute right-0 top-9 z-30 bg-white border border-gray-200 rounded-xl shadow-xl py-1 w-52">
                        {[
                          { label: 'ZIM Einzelprojekt', id: 'zim_einzel' },
                          { label: 'ZIM Kooperation', id: 'zim_koop' },
                          { label: 'ZIM Netzwerk', id: 'zim_netzwerk' },
                          { label: 'BMBF / KMU Innovativ', id: 'bmbf' },
                          { label: 'EU-Projekt', id: 'eu' },
                          { label: 'Forschungszulage (FZul)', id: 'fzul' },
                          { label: 'Sonstiges', id: 'sonstiges' },
                        ].map(typ => (
                          <button key={typ.id}
                            onClick={() => {
                              setNeuesVorhabenDropdownOpen(false);
                              if (typ.id === 'fzul') { setModalError(null); setModalOpen(true); }
                            }}
                            className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 flex items-center justify-between gap-2">
                            <span>{typ.label}</span>
                            <span className="text-gray-300 italic">iV</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {vorhaben.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-6">Noch keine Vorhaben angelegt.</p>
                ) : (
                  <div className="space-y-2">
                    {vorhaben.slice(0, 10).map(v => (
                      <button key={v.id}
                        onClick={() => router.push(`/v7/berater/multiprojekt/${v.id}`)}
                        className="w-full text-left bg-gray-50 border border-gray-200 rounded-lg p-2.5 hover:border-[#002451] hover:bg-blue-50 transition-all group">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-gray-800 truncate">{v.title}</p>
                            <p className="text-xs text-gray-400 mt-0.5 truncate">{v.company_name} · Gj. {v.wirtschaftsjahr}</p>
                          </div>
                          <span className={`flex-shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs ${
                            v.status === 'abgeschlossen' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {v.status === 'abgeschlossen'
                              ? <><CheckCircle className="w-2.5 h-2.5" /> OK</>
                              : <><Clock className="w-2.5 h-2.5" /> Entwurf</>}
                          </span>
                        </div>
                      </button>
                    ))}
                    {vorhaben.length > 10 && (
                      <p className="text-xs text-gray-400 text-center pt-1">+ {vorhaben.length - 10} weitere</p>
                    )}
                  </div>
                )}
              </div>

              {/* Platzhalter fuer kuenftige Erweiterungen */}
              <div className="bg-white rounded-xl border border-dashed border-gray-200 p-4 text-center text-gray-300">
                <p className="text-xs">Weitere Tools</p>
                <p className="text-xs">demnächst hier</p>
              </div>

            </div>
          </div>

        </div>
      </main>

      <NeuesVorhabenModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveVorhaben}
        companies={companies}
        saving={savingModal}
        error={modalError}
      />
    </div>
    </>
  );
}
