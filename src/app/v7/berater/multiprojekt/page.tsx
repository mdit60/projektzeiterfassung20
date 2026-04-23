'use client';

// src/app/v7/berater/multiprojekt/page.tsx
// ============================================================================
// PZE V7 - Kapazitaetsplanungs-Tool (Berater-Portal)
// ============================================================================
// Version: 7.4.8-4
// Datum: 23. April 2026
//
// Zwei Bereiche:
//   A) Kapazitaetsmatrix: MA x Monat Ampel-Uebersicht (neu)
//   B) FZul-Vorhaben: Liste bestehender Vorhaben (unveraendert)
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
  BarChart3,
  ChevronLeft,
  ChevronDown,
} from 'lucide-react';
import {
  V7UserRole,
  V7FzulVorhaben,
  V7FzulVorhabenInsert,
  V7_PUBLIC_FUNDING_FORMATS,
} from '@/types/v7-types';

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

// Projektbeitrag pro Monat (fuer Tooltip)
interface ProjektBeitrag {
  projekt_id: string;
  projekt_name: string;
  funding_format: string;
  geplant: number;
  verbucht: number;
}

// Kapazitaets-Daten pro MA und Monat
interface MonatKapazitaet {
  monat: number;
  jahr: number;
  gesamt: number;
  geplant: number;
  verbucht: number;
  frei: number;
  freiProzent: number;
  projekte: ProjektBeitrag[];   // Aufschluesselung nach Projekten
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

function getAmpelklasse(freiProzent: number): string {
  if (freiProzent > 50) return 'bg-green-500';
  if (freiProzent > 20) return 'bg-yellow-400';
  if (freiProzent > 5)  return 'bg-orange-500';
  return 'bg-red-500';
}

function getAmpelText(freiProzent: number): string {
  if (freiProzent > 50) return 'text-green-700';
  if (freiProzent > 20) return 'text-yellow-700';
  if (freiProzent > 5)  return 'text-orange-700';
  return 'text-red-700';
}

function getAmpelBg(freiProzent: number): string {
  if (freiProzent > 50) return 'bg-green-50 border-green-200';
  if (freiProzent > 20) return 'bg-yellow-50 border-yellow-200';
  if (freiProzent > 5)  return 'bg-orange-50 border-orange-200';
  return 'bg-red-50 border-red-200';
}

// Monatsarbeitszeit
function monatsKapazitaet(weeklyHours: number): number {
  return Math.round((weeklyHours / 40) * 173.33 * 10) / 10;
}

// Generiere Liste der naechsten N Monate ab einem Startpunkt
function generiereMonateListe(startJahr: number, startMonat: number, anzahl: number): {jahr: number; monat: number}[] {
  const liste = [];
  let j = startJahr;
  let m = startMonat;
  for (let i = 0; i < anzahl; i++) {
    liste.push({ jahr: j, monat: m });
    m++;
    if (m > 12) { m = 1; j++; }
  }
  return liste;
}

// ============================================================================
// KAPAZITAETSMATRIX KOMPONENTE
// ============================================================================

interface KapazitaetsmatrixProps {
  maListe: MaKapazitaet[];
  monate: {jahr: number; monat: number}[];
  loading: boolean;
}

function Kapazitaetsmatrix({ maListe, monate, loading }: KapazitaetsmatrixProps) {

  const [tooltip, setTooltip] = useState<{
    ma: MaKapazitaet;
    monat: MonatKapazitaet;
    x: number;
    y: number;
  } | null>(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        <span className="text-sm">Kapazitaeten werden berechnet...</span>
      </div>
    );
  }

  if (maListe.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <Users className="w-8 h-8 mx-auto mb-2 text-gray-300" />
        <p className="text-sm">Keine Mitarbeiter gefunden.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto" onMouseLeave={() => setTooltip(null)}>
      <table className="border-collapse text-xs" style={{ minWidth: '800px' }}>
        <thead>
          <tr className="bg-[#002451] text-white">
            <th className="text-left px-3 py-2 font-semibold sticky left-0 bg-[#002451] z-10 border-r border-blue-800"
                style={{ minWidth: '160px' }}>
              Mitarbeiter
            </th>
            <th className="text-right px-2 py-2 font-medium border-r border-blue-800 text-blue-200"
                style={{ minWidth: '40px' }}>
              h/W
            </th>
            {monate.map(({ jahr, monat }) => (
              <th key={`${jahr}-${monat}`}
                  className="text-center py-2 font-medium border-l border-blue-800"
                  style={{ minWidth: '52px', width: '52px' }}>
                <div style={{ fontSize: '10px' }} className="text-blue-200">
                  {monat === 1 ? String(jahr) : ''}
                </div>
                <div>{MONAT_KURZ[monat - 1]}</div>
              </th>
            ))}
            <th className="text-right px-2 py-2 font-medium border-l border-blue-800 text-blue-200"
                style={{ minWidth: '52px' }}>
              Frei h
            </th>
          </tr>
        </thead>
        <tbody>
          {maListe.map((ma, idx) => {
            const gesamtFrei = ma.monate.reduce((s, m) => s + m.frei, 0);
            const isOdd = idx % 2 === 0;

            return (
              <tr key={ma.employee_id}
                  className={`border-b border-gray-200 ${isOdd ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50`}>

                {/* Name sticky */}
                <td className={`px-3 py-2 font-semibold text-gray-800 sticky left-0 z-10 border-r border-gray-300 ${isOdd ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50`}
                    style={{ minWidth: '160px', fontSize: '12px' }}>
                  {ma.display_name}
                </td>

                {/* WAZ */}
                <td className="px-2 py-2 text-right text-gray-400 border-r border-gray-200"
                    style={{ fontSize: '11px' }}>
                  {ma.weekly_hours}
                </td>

                {/* Monats-Ampeln */}
                {monate.map(({ jahr, monat }) => {
                  const md = ma.monate.find(m => m.jahr === jahr && m.monat === monat);
                  if (!md) {
                    return (
                      <td key={`${jahr}-${monat}`}
                          className="border-l border-gray-200 text-center bg-gray-100"
                          style={{ width: '52px' }}>
                        <span className="text-gray-300" style={{ fontSize: '10px' }}>--</span>
                      </td>
                    );
                  }

                  const ampelBg = getAmpelBg(md.freiProzent);
                  const ampelText = getAmpelText(md.freiProzent);
                  const ampelDot = getAmpelklasse(md.freiProzent);

                  return (
                    <td key={`${jahr}-${monat}`}
                        className={`border-l border-gray-200 text-center cursor-pointer ${ampelBg} border`}
                        style={{ width: '52px', padding: '4px 2px' }}
                        onMouseEnter={(e) => setTooltip({
                          ma,
                          monat: md,
                          x: e.clientX,
                          y: e.clientY,
                        })}
                        onMouseMove={(e) => setTooltip(prev => prev ? { ...prev, x: e.clientX, y: e.clientY } : null)}
                    >
                      <div className="flex flex-col items-center gap-0.5">
                        <div className={`w-2 h-2 rounded-full ${ampelDot}`}></div>
                        <div className={`font-bold ${ampelText}`} style={{ fontSize: '11px' }}>
                          {md.frei > 0 ? md.frei.toFixed(0) : '0'}
                        </div>
                      </div>
                    </td>
                  );
                })}

                {/* Gesamt frei */}
                <td className="px-2 py-2 text-right font-bold border-l border-gray-300"
                    style={{ fontSize: '12px', minWidth: '52px' }}>
                  <span className={gesamtFrei > 0 ? 'text-green-700' : 'text-red-500'}>
                    {gesamtFrei.toFixed(0)}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 bg-white border border-gray-200 rounded-xl shadow-xl p-3 text-xs"
          style={{ left: tooltip.x + 12, top: tooltip.y - 120, minWidth: '240px', maxWidth: '300px', pointerEvents: 'none' }}
        >
          <div className="font-bold text-gray-800 mb-2 border-b border-gray-100 pb-1.5">
            {tooltip.ma.display_name} -- {MONAT_KURZ[tooltip.monat.monat - 1]} {tooltip.monat.jahr}
          </div>
          <div className="space-y-0.5 text-gray-600 mb-2">
            <div className="flex justify-between">
              <span className="text-gray-400">Monatskapazitaet:</span>
              <span className="font-medium">{tooltip.monat.gesamt.toFixed(1)} h</span>
            </div>
          </div>
          {tooltip.monat.projekte.length > 0 && (
            <div className="space-y-1 mb-2">
              <div className="text-gray-400 text-xs font-medium uppercase tracking-wide">Projekte</div>
              {tooltip.monat.projekte.map((p) => (
                <div key={p.projekt_id} className="bg-gray-50 rounded px-2 py-1">
                  <div className="font-semibold text-gray-700 truncate" style={{fontSize:'11px'}}>{p.projekt_name}</div>
                  <div className="flex justify-between mt-0.5">
                    {p.geplant > 0 && (
                      <span className="text-orange-600">geplant: -{p.geplant.toFixed(1)}h</span>
                    )}
                    {p.verbucht > 0 && (
                      <span className="text-red-600">verbucht: -{p.verbucht.toFixed(1)}h</span>
                    )}
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

      {/* Legende */}
      <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-green-500 inline-block"></span> &gt;50% frei
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-yellow-400 inline-block"></span> 20-50% frei
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-orange-500 inline-block"></span> 5-20% frei
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-red-500 inline-block"></span> &lt;5% frei
        </span>
        <span className="text-gray-400 ml-2">Zahl = freie Stunden im Monat</span>
      </div>
    </div>
  );
}

// ============================================================================
// MODAL: NEUES VORHABEN
// ============================================================================

const MONAT_LABELS = ['Jan','Feb','Mrz','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];

interface NeuesVorhabenModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: V7FzulVorhabenInsert) => Promise<void>;
  companies: ClientCompany[];
  saving: boolean;
  error: string | null;
}

function NeuesVorhabenModal({ isOpen, onClose, onSave, companies, saving, error }: NeuesVorhabenModalProps) {
  const [firmId, setFirmId] = useState('');
  const [title, setTitle] = useState('');
  const [vorhabenId, setVorhabenId] = useState('');
  const [jahr, setJahr] = useState(new Date().getFullYear());
  const [startMonat, setStartMonat] = useState(1);
  const [endeMonat, setEndeMonat] = useState(12);

  const selectedCompany = companies.find((c) => c.id === firmId);

  useEffect(() => {
    if (!isOpen) {
      setFirmId(''); setTitle(''); setVorhabenId('');
      setJahr(new Date().getFullYear()); setStartMonat(1); setEndeMonat(12);
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
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Neues FZul-Vorhaben</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Firma <span className="text-red-500">*</span>
            </label>
            <select value={firmId} onChange={(e) => setFirmId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Firma waehlen...</option>
              {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kurzbezeichnung FuE-Vorhaben <span className="text-red-500">*</span>
            </label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="z.B. Entwicklung eines KI-Diagnosesystems"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vorhaben-ID (BSFZ) <span className="text-xs font-normal text-gray-400">optional</span>
            </label>
            <input type="text" value={vorhabenId} onChange={(e) => setVorhabenId(e.target.value)}
              placeholder="z.B. 210-577-509/2024-1/1"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Jahr *</label>
              <select value={jahr} onChange={(e) => setJahr(Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {[2023,2024,2025,2026,2027,2028].map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Von</label>
              <select value={startMonat} onChange={(e) => setStartMonat(Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {MONAT_LABELS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bis</label>
              <select value={endeMonat} onChange={(e) => setEndeMonat(Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {MONAT_LABELS.map((m, i) => <option key={i+1} value={i+1} disabled={i+1 < startMonat}>{m}</option>)}
              </select>
            </div>
          </div>
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
            </div>
          )}
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
  const [suche, setSuche] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [savingModal, setSavingModal] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [neuesVorhabenDropdownOpen, setNeuesVorhabenDropdownOpen] = useState(false);

  // Kapazitaetsmatrix State
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [maKapazitaeten, setMaKapazitaeten] = useState<MaKapazitaet[]>([]);
  const [kapazitaetLoading, setKapazitaetLoading] = useState(false);
  const [anzeigeJahr, setAnzeigeJahr] = useState(new Date().getFullYear());
  const MONATE_ANZEIGE = 12; // Jahresansicht

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

      // Erste Firma vorauswaehlen
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
  // KAPAZITAETSMATRIX BERECHNEN
  // ============================================================================

  const ladeKapazitaeten = useCallback(async (companyId: string, jahr: number) => {
    if (!companyId) return;
    setKapazitaetLoading(true);
    try {
      const heute = new Date();
      const monate = generiereMonateListe(jahr, 1, 12);

      // Mitarbeiter der Firma
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

      const employeeIds = employees.map((e: {id: string}) => e.id);

      // Alle aktiven Projekte der Firma (mit Namen und Foerderformat)
      const { data: projekte } = await supabase
        .from('v7_projects')
        .select('id, name, short_name, funding_format, start_date, end_date')
        .eq('client_company_id', companyId)
        .eq('is_active', true);

      const projektIds = (projekte || []).map((p: {id: string}) => p.id);
      const projektMap: Record<string, { name: string; funding_format: string }> = {};
      (projekte || []).forEach((p: { id: string; name: string; short_name: string | null; funding_format: string }) => {
        projektMap[p.id] = { name: p.short_name || p.name, funding_format: p.funding_format };
      });

      // NWM vs. Standard-Projekte trennen
      const nwmProjektIds = (projekte || [])
        .filter((p: { funding_format: string }) => p.funding_format === 'ZIM_NETZWERK')
        .map((p: { id: string }) => p.id);
      const standardProjektIds = (projekte || [])
        .filter((p: { funding_format: string }) => p.funding_format !== 'ZIM_NETZWERK')
        .map((p: { id: string }) => p.id);

      // Standard-Projekte: Arbeitspakete laden
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

      // Standard-Projekte: Work Package Assignments
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

      // NWM-Projekte: Foerderzeitraeume + AP-Planung
      let nwmApData: Array<{
        employee_id: string; work_package_id: string; planned_pm: number;
        start_datum: string; ende_datum: string; project_id: string;
      }> = [];

      if (nwmProjektIds.length > 0) {
        const { data: fzData } = await supabase
          .from('v7_nwm_foerderzeitraeume')
          .select('id, project_id, netzwerkjahr, start_datum, ende_datum')
          .in('project_id', nwmProjektIds)
          .lte('start_datum', `${jahr}-12-31`)
          .gte('ende_datum', `${jahr}-01-01`);

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

      // Verbuchte Stunden
      const startDatum = `${jahr}-01-01`;
      const endeDatum = `${jahr}-12-31`;
      let tsData: Array<{ employee_id: string; project_id: string; work_date: string; hours: number }> = [];
      if (projektIds.length > 0) {
        const { data: ts } = await supabase
          .from('v7_timesheets')
          .select('employee_id, project_id, work_date, hours')
          .in('employee_id', employeeIds)
          .in('project_id', projektIds)
          .gte('work_date', startDatum)
          .lte('work_date', endeDatum)
          .eq('is_active', true);
        tsData = ts || [];
      }

      const verbucht: Record<string, Record<number, Record<string, number>>> = {};
      tsData.forEach(ts => {
        const m = parseInt(ts.work_date.split('-')[1]);
        if (!verbucht[ts.employee_id]) verbucht[ts.employee_id] = {};
        if (!verbucht[ts.employee_id][m]) verbucht[ts.employee_id][m] = {};
        verbucht[ts.employee_id][m][ts.project_id] =
          (verbucht[ts.employee_id][m][ts.project_id] || 0) + Number(ts.hours);
      });

      // Hilfsfunktion: PM gleichmaessig auf Monate verteilen
      const verteileAufMonate = (
        empId: string, pid: string, pm: number, apStart: string, apEnd: string,
        geplantMap: Record<string, Record<number, Record<string, number>>>
      ) => {
        const start = new Date(apStart);
        const end   = new Date(apEnd);
        const totalH = pm * 173.33;
        const apMonate: {j: number; m: number}[] = [];
        let cur = new Date(start.getFullYear(), start.getMonth(), 1);
        const endM = new Date(end.getFullYear(), end.getMonth(), 1);
        while (cur <= endM) {
          apMonate.push({ j: cur.getFullYear(), m: cur.getMonth() + 1 });
          cur.setMonth(cur.getMonth() + 1);
        }
        if (apMonate.length === 0) return;
        const hProMonat = totalH / apMonate.length;
        apMonate.forEach(({ j, m }) => {
          if (j !== jahr) return;
          const istVergangenheit = j < heute.getFullYear() ||
            (j === heute.getFullYear() && m < heute.getMonth() + 1);
          if (istVergangenheit) return;
          if (!geplantMap[empId]) geplantMap[empId] = {};
          if (!geplantMap[empId][m]) geplantMap[empId][m] = {};
          geplantMap[empId][m][pid] = (geplantMap[empId][m][pid] || 0) + hProMonat;
        });
      };

      const geplant: Record<string, Record<number, Record<string, number>>> = {};

      // Standard-Projekte
      wpaData.forEach(wpa => {
        const ap = apMap[wpa.work_package_id];
        if (!ap || !wpa.planned_person_months) return;
        verteileAufMonate(wpa.employee_id, ap.project_id, wpa.planned_person_months, ap.start, ap.end, geplant);
      });

      // NWM-Projekte (aus v7_nwm_ap_planung)
      nwmApData.forEach(ap => {
        if (!ap.planned_pm || !ap.start_datum || !ap.ende_datum || !ap.project_id) return;
        verteileAufMonate(ap.employee_id, ap.project_id, ap.planned_pm, ap.start_datum, ap.ende_datum, geplant);
      });


      // MaKapazitaet zusammenbauen
      const result: MaKapazitaet[] = employees.map((emp: { id: string; display_name: string; weekly_hours: number }) => {
        const gesamt = monatsKapazitaet(emp.weekly_hours || 40);

        const monatsDaten: MonatKapazitaet[] = monate.map(({ jahr: j, monat: m }) => {
          // Geplante Stunden gesamt + pro Projekt
          const geplantProjekte = geplant[emp.id]?.[m] || {};
          const g = Math.round(Object.values(geplantProjekte).reduce((s, v) => s + v, 0) * 10) / 10;

          // Verbuchte Stunden gesamt + pro Projekt
          const verbuchtProjekte = verbucht[emp.id]?.[m] || {};
          const v = Math.round(Object.values(verbuchtProjekte).reduce((s, h) => s + h, 0) * 10) / 10;

          const frei = Math.max(0, Math.round((gesamt - g - v) * 10) / 10);
          const freiProzent = gesamt > 0 ? (frei / gesamt) * 100 : 100;

          // Projektbeitraege fuer Tooltip
          const alleProjektIds = new Set([
            ...Object.keys(geplantProjekte),
            ...Object.keys(verbuchtProjekte),
          ]);
          const projBeitraege: ProjektBeitrag[] = Array.from(alleProjektIds).map(pid => ({
            projekt_id: pid,
            projekt_name: projektMap[pid]?.name ?? pid,
            funding_format: projektMap[pid]?.funding_format ?? '',
            geplant: Math.round((geplantProjekte[pid] || 0) * 10) / 10,
            verbucht: Math.round((verbuchtProjekte[pid] || 0) * 10) / 10,
          }));

          return { monat: m, jahr: j, gesamt, geplant: g, verbucht: v, frei, freiProzent, projekte: projBeitraege };
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
    if (selectedCompanyId) ladeKapazitaeten(selectedCompanyId, anzeigeJahr);
  }, [selectedCompanyId, anzeigeJahr, ladeKapazitaeten]);

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
  // FILTER FZul-VORHABEN
  // ============================================================================

  const gefilterteVorhaben = vorhaben.filter((v) => {
    if (!suche) return true;
    const q = suche.toLowerCase();
    return v.title.toLowerCase().includes(q) ||
      v.company_name.toLowerCase().includes(q) ||
      String(v.wirtschaftsjahr).includes(q);
  });

  const groupedVorhaben: Record<string, VorhabenMitFirma[]> = {};
  gefilterteVorhaben.forEach((v) => {
    if (!groupedVorhaben[v.client_company_id]) groupedVorhaben[v.client_company_id] = [];
    groupedVorhaben[v.client_company_id].push(v);
  });

  const userName = userProfile ? (userProfile.display_name || userProfile.email) : '';
  const userRole = userProfile?.role ?? 'consultant';
  const monate = generiereMonateListe(anzeigeJahr, 1, MONATE_ANZEIGE);

  // ============================================================================
  // RENDER
  // ============================================================================

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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <PortalHeader portal="berater" userName={userName} userRole={userRole} />
      <PortalNav portal="berater" userRole={userRole} />

      <main className="flex-1 w-full">

        {/* ================================================================ */}
        {/* BEREICH A: KAPAZITAETSMATRIX                                      */}
        {/* ================================================================ */}

        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-6">
          <div className="max-w-screen-2xl mx-auto">

            {/* Zurueck-Button */}
            <button
              onClick={() => router.push('/v7/berater/dashboard')}
              className="flex items-center gap-1 text-sm text-gray-400 hover:text-[#002451] mb-4">
              <ChevronLeft className="w-4 h-4" /> Dashboard
            </button>

            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#002451] rounded-xl">
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-900">Kapazitaetsplanung</h1>
                  <p className="text-xs text-gray-500">Freie MA-Kapazitaeten auf einen Blick</p>
                </div>
              </div>

              {/* Firmen-Selektor + Jahr-Navigation */}
              <div className="flex items-center gap-3">
                <select
                  value={selectedCompanyId}
                  onChange={(e) => setSelectedCompanyId(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Firma waehlen...</option>
                  {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>

                <div className="flex items-center gap-1 border border-gray-300 rounded-lg px-2 py-1.5">
                  <button onClick={() => setAnzeigeJahr(j => j - 1)}
                    className="p-0.5 hover:bg-gray-100 rounded text-gray-500">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm font-semibold text-gray-700 w-10 text-center">
                    {anzeigeJahr}
                  </span>
                  <button onClick={() => setAnzeigeJahr(j => j + 1)}
                    className="p-0.5 hover:bg-gray-100 rounded text-gray-500">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Matrix */}
            <Kapazitaetsmatrix
              maListe={maKapazitaeten}
              monate={monate}
              loading={kapazitaetLoading}
            />
          </div>
        </div>

        {/* ================================================================ */}
        {/* BEREICH B: FZUL-VORHABEN                                         */}
        {/* ================================================================ */}

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-xl">
                <Layers className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">FuE-Vorhaben</h2>
                <p className="text-xs text-gray-500">Uebersicht freier Kapazitaeten auf Basis geplanter und gebuchter Foerderprojektstunden</p>
              </div>
            </div>
            <div className="relative">
              <button
                onClick={() => setNeuesVorhabenDropdownOpen(o => !o)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-[#002451] rounded-lg hover:bg-[#001a3a]">
                <Plus className="w-4 h-4" /> Neues FuE-Vorhaben
                <ChevronDown className="w-3 h-3" />
              </button>
              {neuesVorhabenDropdownOpen && (
                <div className="absolute right-0 top-10 z-30 bg-white border border-gray-200 rounded-xl shadow-xl py-1 w-56">
                  {[
                    { label: 'ZIM Einzelprojekt', id: 'zim_einzel' },
                    { label: 'ZIM Kooperation', id: 'zim_koop' },
                    { label: 'ZIM Netzwerk', id: 'zim_netzwerk' },
                    { label: 'BMBF / KMU Innovativ', id: 'bmbf' },
                    { label: 'EU-Projekt', id: 'eu' },
                    { label: 'Forschungszulage (FZul)', id: 'fzul' },
                    { label: 'Sonstiges', id: 'sonstiges' },
                  ].map((typ) => (
                    <button key={typ.id}
                      onClick={() => {
                        setNeuesVorhabenDropdownOpen(false);
                        if (typ.id === 'fzul') { setModalError(null); setModalOpen(true); }
                      }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center justify-between gap-2">
                      <span>{typ.label}</span>
                      <span className="text-xs text-gray-300 italic">iV</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {vorhaben.length > 0 && (
            <div className="relative mb-5 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Vorhaben oder Firma suchen..."
                value={suche} onChange={(e) => setSuche(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          )}

          {vorhaben.length === 0 && (
            <div className="text-center py-10 text-gray-400">
              <Layers className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">Noch keine FZul-Vorhaben angelegt.</p>
            </div>
          )}

          {Object.entries(groupedVorhaben).map(([companyId, gruppe]) => (
            <div key={companyId} className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="w-4 h-4 text-gray-400" />
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {gruppe[0].company_name}
                </h3>
              </div>
              <div className="space-y-2">
                {gruppe.map((v) => (
                  <button key={v.id}
                    onClick={() => router.push(`/v7/berater/multiprojekt/${v.id}`)}
                    className="w-full text-left bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md hover:border-[#002451] transition-all group">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <h4 className="text-sm font-semibold text-gray-900 truncate">{v.title}</h4>
                          {v.status === 'abgeschlossen'
                            ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">
                                <CheckCircle className="w-3 h-3" /> Abgeschlossen
                              </span>
                            : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-yellow-100 text-yellow-700">
                                <Clock className="w-3 h-3" /> Entwurf
                              </span>
                          }
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-400">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> Gj. {v.wirtschaftsjahr}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {v.ma_count === 0 ? 'Keine Mitarbeiter' : `${v.ma_count} Mitarbeiter`}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#002451] flex-shrink-0" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
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
  );
}
