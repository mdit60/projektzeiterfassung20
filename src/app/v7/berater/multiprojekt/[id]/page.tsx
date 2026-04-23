'use client';

// src/app/v7/berater/multiprojekt/[id]/page.tsx
// ============================================================================
// PZE V7 - Multiprojekt-Tool: Vorhaben-Detailseite
// ============================================================================
// Version: 7.4.8-12
// Datum: 23. April 2026
//
// v7.4.8-7: Jahreskalender-Verbesserungen:
//           - Excel-Navigation (Tab/Enter/Pfeile) in Eingabefeldern
//           - Jahr sichtbar im Kalender-Header + Jahreswechsel-Buttons
//           - Sichtbarere Rasterlinien
//           - Schmalere Monat/Gef./FZul-Spalten
//           - Kompaktere Gesamt-Zeile und untere Zusammenfassung
// Datum: 23. April 2026
//
// Tabs:
//   Tab 1 - Uebersicht: MA-Liste mit aggregierten Stunden, MA-Auswahl
//   Tab 2 - Jahreskalender: Tagesweise Stundenansicht pro MA (editierbar)
//   Tab 3 - Export: Vorschau + Excel-Export (Phase 3)
//
// Kernlogik:
//   - Import: gefoerderte Stunden aus v7_timesheets aggregieren (tagesgenau)
//   - Invertierung: verfuegbare FZul-Stunden als Vorschlag
//   - Validierung: fue_hours <= verfuegbar_hours pro Tag
//   - Mehrfach-Vorhaben-Pruefung: Summe ueber alle Vorhaben eines MA
// ============================================================================

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import PortalHeader from '@/components/shared/PortalHeader';
import PortalNav from '@/components/shared/PortalNav';
import {
  ArrowLeft,
  ArrowRight,
  Users,
  Calendar,
  Download,
  Loader2,
  AlertCircle,
  CheckCircle,
  Clock,
  Plus,
  Save,
  RefreshCw,
  Info,
} from 'lucide-react';
import {
  V7UserRole,
  V7FzulVorhaben,
  V7FzulTimesheet,
  V7FzulTimesheetInsert,
} from '@/types/v7-types';
import { V7_PUBLIC_FUNDING_FORMATS } from '@/types/v7-types';
import {
  getGermanHolidays,
  normalizeStateCode,
} from '@/lib/holidays/germanHolidays';

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

interface Employee {
  id: string;
  display_name: string;
  weekly_hours: number;
  position_title: string | null;
  is_active: boolean;
  // Aus v7_employee_hours_history (zum Stichtag)
  effective_weekly_hours: number;
}

interface EmployeeWithStats extends Employee {
  hat_gefoerderte_projekte: boolean;
  gefoerdert_stunden_gesamt: number;
  fue_stunden_gesamt: number;
  verfuegbar_stunden_gesamt: number;
  timesheet_vorhanden: boolean;
  ausgewaehlt: boolean;
  taetigkeitsbezeichnung: string;
}

interface ClientCompany {
  id: string;
  name: string;
  federal_state: string | null;
  holiday_region: string | null;
  standard_weekly_hours: number;
}

// Tag im Jahreskalender
interface KalenderTag {
  datum: string;           // YYYY-MM-DD
  tag: number;             // 1-31
  wochentag: string;       // 'Mo', 'Di', ...
  istWochenende: boolean;
  istFeiertag: boolean;
  feiertagLabel: string | null;
  gefoerdert: number;      // Aus v7_timesheets (read-only)
  verfuegbar: number;      // Tagesarbeitszeit - gefoerdert
  fue: number;             // FZul-Stunden (editierbar)
  urlaub: number;
  krank: number;
  sonderurlaub: number;
  gespeichert: boolean;    // Eintrag existiert in v7_fzul_timesheets
  geaendert: boolean;      // Lokale Aenderung, noch nicht gespeichert
}

interface MonatDaten {
  monat: number;           // 1-12
  monatName: string;
  tage: KalenderTag[];
  sumGefoerdert: number;
  sumFue: number;
  sumVerfuegbar: number;
}

// ============================================================================
// KONSTANTEN
// ============================================================================

const WOCHENTAG_KURZ = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const MONAT_NAMEN = [
  'Januar', 'Februar', 'Maerz', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
];

// ============================================================================
// HILFSFUNKTIONEN
// ============================================================================

function formatDatum(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const t = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${t}`;
}

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
// JAHRESKALENDER-KOMPONENTE
// Layout: Monate als Zeilen, Tage 1-31 als Spalten (wie BSFZ-Vorlage)
// ============================================================================

interface JahreskalenderProps {
  monate: MonatDaten[];
  weeklyHours: number;
  wirtschaftsjahr: number;
  onFueChange: (datum: string, wert: number) => void;
  onSaveMonat: (monat: number) => Promise<void>;
  onJahrWechsel: (jahr: number) => void;
  savingMonat: number | null;
}

const TAGE_31 = Array.from({ length: 31 }, (_, i) => i + 1);
const AKTUELLES_JAHR = new Date().getFullYear();
const JAHR_OPTIONEN = Array.from({ length: 7 }, (_, i) => AKTUELLES_JAHR - 3 + i);

function Jahreskalender({
  monate, weeklyHours, wirtschaftsjahr,
  onFueChange, onSaveMonat, onJahrWechsel, savingMonat
}: JahreskalenderProps) {

  function zellBg(tag: KalenderTag | undefined): string {
    if (!tag) return 'bg-gray-300';
    if (tag.istFeiertag) return 'bg-orange-300';   // kraeftiges Orange wie Excel
    if (tag.istWochenende) return 'bg-orange-200';  // etwas heller fuer WE
    if (tag.gefoerdert > 0) return 'bg-red-200';    // deutlich rot wenn gefoerdert
    return 'bg-amber-50';                           // zartes Beige fuer freie Tage
  }

  // Excel-Navigation
  const canEdit = (datum: string): boolean => {
    for (const m of monate) {
      const tag = m.tage.find((t) => t.datum === datum);
      if (tag) return !tag.istWochenende && !tag.istFeiertag && tag.verfuegbar > 0;
    }
    return false;
  };

  const focusCell = (datum: string) => {
    const input = document.querySelector(
      `input[data-datum="${datum}"]`
    ) as HTMLInputElement;
    if (input) { input.focus(); input.select(); }
  };

  const alleArbeitstage = monate
    .flatMap((m) => m.tage)
    .filter((t) => !t.istWochenende && !t.istFeiertag && t.verfuegbar > 0)
    .map((t) => t.datum);

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    datum: string,
    monat: number,
  ) => {
    const idx = alleArbeitstage.indexOf(datum);

    // Hilfsfunktion: naechster editierbarer Tag im selben Monat
    const naechsterTagImMonat = (vonDatum: string, vorwaerts: boolean): string | null => {
      const monatTage = monate
        .find((m) => m.tage.some((t) => t.datum === vonDatum))
        ?.tage.filter((t) => !t.istWochenende && !t.istFeiertag && t.verfuegbar > 0)
        .map((t) => t.datum) ?? [];
      const idxImMonat = monatTage.indexOf(vonDatum);
      if (vorwaerts && idxImMonat < monatTage.length - 1) return monatTage[idxImMonat + 1];
      if (!vorwaerts && idxImMonat > 0) return monatTage[idxImMonat - 1];
      return null;
    };

    // Gleiches Tagesdatum im Nachbarmonat
    const tagImNachbarmonat = (vonDatum: string, nachOben: boolean): string | null => {
      const tag = parseInt(vonDatum.split('-')[2]);
      const zielMonat = monat + (nachOben ? -1 : 1);
      const zielMonate = monate.find((m) => m.monat === zielMonat);
      if (!zielMonate) return null;
      const zielTag = zielMonate.tage.find(
        (t) => t.tag === tag && !t.istWochenende && !t.istFeiertag && t.verfuegbar > 0
      );
      return zielTag?.datum ?? null;
    };

    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault();
        if (idx < alleArbeitstage.length - 1) focusCell(alleArbeitstage[idx + 1]);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        if (idx > 0) focusCell(alleArbeitstage[idx - 1]);
        break;
      case 'ArrowDown': {
        e.preventDefault();
        const ziel = tagImNachbarmonat(datum, false);
        if (ziel) focusCell(ziel);
        break;
      }
      case 'ArrowUp': {
        e.preventDefault();
        const ziel = tagImNachbarmonat(datum, true);
        if (ziel) focusCell(ziel);
        break;
      }
      case 'Tab':
        e.preventDefault();
        if (e.shiftKey) {
          if (idx > 0) focusCell(alleArbeitstage[idx - 1]);
        } else {
          if (idx < alleArbeitstage.length - 1) focusCell(alleArbeitstage[idx + 1]);
        }
        break;
      case 'Enter':
        e.preventDefault();
        // Naechstes leeres Feld im selben Monat, dann naechste Zelle
        for (let i = idx + 1; i < alleArbeitstage.length; i++) {
          const d = alleArbeitstage[i];
          const tagObj = monate.flatMap((m) => m.tage).find((t) => t.datum === d);
          if (tagObj && tagObj.fue === 0) { focusCell(d); return; }
        }
        if (idx < alleArbeitstage.length - 1) focusCell(alleArbeitstage[idx + 1]);
        break;
    }
  };

  return (
    <div className="border border-gray-300 rounded-xl overflow-hidden">

      {/* Jahr-Navigation */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-300">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onJahrWechsel(wirtschaftsjahr - 1)}
            disabled={wirtschaftsjahr <= JAHR_OPTIONEN[0]}
            className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Vorjahr"
          >
            <ArrowLeft className="w-4 h-4 text-gray-600" />
          </button>
          <span className="font-bold text-gray-800 text-base w-16 text-center">
            {wirtschaftsjahr}
          </span>
          <button
            onClick={() => onJahrWechsel(wirtschaftsjahr + 1)}
            disabled={wirtschaftsjahr >= JAHR_OPTIONEN[JAHR_OPTIONEN.length - 1]}
            className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Naechstes Jahr"
          >
            <ArrowRight className="w-4 h-4 text-gray-600" />
          </button>
          <span className="text-xs text-gray-400 ml-2">Wirtschaftsjahr</span>
        </div>
        <div className="text-xs text-gray-400 italic">
          Tab / Enter = naechste Zelle | Pfeile = Navigation
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="border-collapse w-full" style={{ minWidth: '1400px', fontSize: '13px' }}>
          <thead>
            <tr className="bg-[#002451] text-white">
              <th className="text-left px-2 py-2 font-bold sticky left-0 bg-[#002451] z-10 border border-blue-900"
                  style={{ minWidth: '55px', fontSize: '13px' }}>Monat</th>
              {TAGE_31.map((t) => (
                <th key={t} className="text-center py-2 font-semibold border border-blue-900"
                    style={{ minWidth: '40px', width: '40px', fontSize: '12px' }}>{t}</th>
              ))}
              <th className="text-right px-1 py-2 font-semibold border border-blue-900 text-orange-200"
                  style={{ minWidth: '42px', fontSize: '12px' }}>Gef.</th>
              <th className="text-right px-1 py-2 font-semibold border border-blue-900 text-green-200"
                  style={{ minWidth: '42px', fontSize: '12px' }}>FZul</th>
              <th className="py-2 border border-blue-900" style={{ minWidth: '28px' }}></th>
            </tr>
          </thead>
          <tbody>
            {monate.map((monatDaten) => {
              const tagMap: Record<number, KalenderTag> = {};
              monatDaten.tage.forEach((t) => { tagMap[t.tag] = t; });
              const hatAenderungen = monatDaten.tage.some((t) => t.geaendert);
              const isOdd = monatDaten.monat % 2 !== 0;

              return (
                <tr key={monatDaten.monat}
                    className={`border-b border-gray-300 ${isOdd ? 'bg-white' : 'bg-gray-50'} hover:bg-yellow-50 group`}
                    style={{ height: '52px' }}>

                  <td className={`px-2 font-bold text-gray-800 sticky left-0 z-10 border border-gray-400 ${isOdd ? 'bg-white' : 'bg-gray-50'} group-hover:bg-yellow-50`}
                      style={{ minWidth: '55px', fontSize: '13px' }}>
                    {monatDaten.monatName.slice(0, 3)}
                  </td>

                  {TAGE_31.map((t) => {
                    const tag = tagMap[t];
                    if (!tag) {
                      return <td key={t} className="bg-gray-300 border border-gray-400" style={{ width: '40px', backgroundColor: '#d1d5db' }}></td>;
                    }
                    const bg = zellBg(tag);
                    if (tag.istFeiertag) {
                      return (
                        <td key={t} className={`${bg} border border-gray-300 text-center align-middle`}
                            style={{ width: '40px' }} title={tag.feiertagLabel || ''}>
                          <div className="text-orange-900 font-bold" style={{ fontSize: '10px' }}>
                            {(tag.feiertagLabel || '')
                              .replace('Heilige Drei Koenige','Hl3K').replace('Karfreitag','KaFr')
                              .replace('Ostermontag','OsMo').replace('Ostersonntag','OsSo')
                              .replace('Tag der Arbeit','TdA').replace('Christi Himmelfahrt','CHF')
                              .replace('Pfingstmontag','PfMo').replace('Pfingstsonntag','PfSo')
                              .replace('Fronleichnam','Fron').replace('Tag der Deutschen Einheit','TdE')
                              .replace('Allerheiligen','AllH').replace('Reformationstag','Ref')
                              .replace('Buss- und Bettag','BuBe').replace('Weltkindertag','WKT')
                              .replace('Mariae Himmelfahrt','MaHi').replace('Augsburger Friedensfest','AuFr')
                              .replace('Internationaler Frauentag','FrTag').replace('Neujahr','Neuj')
                              .replace('1. Weihnachtstag','1.WT').replace('2. Weihnachtstag','2.WT')
                              .slice(0, 4)}
                          </div>
                        </td>
                      );
                    }
                    if (tag.istWochenende) {
                      return (
                        <td key={t} className={`${bg} border border-gray-300 text-center align-middle`}
                            style={{ width: '40px' }}>
                          <div className="text-orange-800 font-bold" style={{ fontSize: '11px' }}>
                            {tag.wochentag}
                          </div>
                        </td>
                      );
                    }
                    // Arbeitstag - eine Zahl: verfuegbare FZul-Stunden (gruen)
                    // Hintergrund hellrot wenn gefoerderte Stunden vorhanden
                    return (
                      <td key={t} className={`${bg} border border-gray-400 align-middle`}
                          style={{ width: '40px', padding: '2px 1px' }}>
                        <div className="flex flex-col items-center justify-center gap-0.5">
                          <div className="text-gray-500 font-medium" style={{ fontSize: '10px' }}>
                            {tag.wochentag}
                          </div>
                          <input
                            inputMode="decimal"
                            pattern="[0-9]*\.?[0-9]*"
                            data-datum={tag.datum}
                            value={tag.fue === 0 ? '' : tag.fue}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value.replace(',', '.')) || 0;
                              onFueChange(tag.datum, Math.min(val, tag.verfuegbar));
                            }}
                            onKeyDown={(e) => handleKeyDown(e, tag.datum, monatDaten.monat)}
                            disabled={tag.verfuegbar <= 0}
                            placeholder={tag.verfuegbar > 0
                              ? (tag.verfuegbar % 1 === 0 ? tag.verfuegbar.toFixed(0) : tag.verfuegbar.toFixed(1))
                              : '0'}
                            className={`
                              text-center border rounded bg-transparent outline-none font-bold
                              focus:ring-2 focus:ring-blue-400 focus:border-blue-400
                              [appearance:textfield]
                              [&::-webkit-outer-spin-button]:appearance-none
                              [&::-webkit-inner-spin-button]:appearance-none
                              ${tag.verfuegbar <= 0
                                ? 'text-red-500 cursor-not-allowed border-transparent placeholder-red-400 font-bold'
                                : tag.fue > 0
                                  ? 'text-green-700 border-green-400 bg-green-50'
                                  : 'placeholder-green-600 border-gray-200 font-semibold'
                              }
                              ${tag.geaendert ? 'border-blue-400 bg-blue-50 text-blue-700' : ''}
                            `}
                            style={{ fontSize: '13px', width: '36px', padding: '1px 2px' }}
                          />
                        </div>
                      </td>
                    );
                  })}

                  <td className="px-1 text-right font-bold border border-gray-400"
                      style={{ minWidth: '42px', fontSize: '12px' }}>
                    <span className={monatDaten.sumGefoerdert > 0 ? 'text-orange-600' : 'text-gray-300'}>
                      {monatDaten.sumGefoerdert > 0 ? monatDaten.sumGefoerdert.toFixed(1) : '-'}
                    </span>
                  </td>
                  <td className="px-1 text-right font-bold border border-gray-400"
                      style={{ minWidth: '42px', fontSize: '12px' }}>
                    <span className={monatDaten.sumFue > 0 ? 'text-green-700' : 'text-gray-300'}>
                      {monatDaten.sumFue > 0 ? monatDaten.sumFue.toFixed(1) : '-'}
                    </span>
                  </td>
                  <td className="text-center border border-gray-300" style={{ minWidth: '30px' }}>
                    <button
                      onClick={() => onSaveMonat(monatDaten.monat)}
                      disabled={!hatAenderungen || savingMonat !== null}
                      title={hatAenderungen ? 'Aenderungen speichern' : 'Keine Aenderungen'}
                      className={`p-1 rounded ${hatAenderungen ? 'text-green-600 hover:bg-green-100' : 'text-gray-300 cursor-not-allowed'}`}
                    >
                      {savingMonat === monatDaten.monat
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <Save className="w-3.5 h-3.5" />
                      }
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-[#002451] text-white font-bold" style={{ height: '36px' }}>
              <td className="px-2 sticky left-0 bg-[#002451] z-10 border border-blue-900"
                  style={{ fontSize: '13px' }}>Gesamt</td>
              {TAGE_31.map((t) => <td key={t} className="border border-blue-900"></td>)}
              <td className="px-1 text-right text-orange-200 border border-blue-900" style={{ fontSize: '13px' }}>
                {monate.reduce((s, m) => s + m.sumGefoerdert, 0).toFixed(1)}
              </td>
              <td className="px-1 text-right text-green-200 border border-blue-900" style={{ fontSize: '13px' }}>
                {monate.reduce((s, m) => s + m.sumFue, 0).toFixed(1)}
              </td>
              <td className="border border-blue-900"></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Legende */}
      <div className="flex items-center gap-4 px-4 py-1.5 bg-gray-50 border-t border-gray-300 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-orange-500 inline-block opacity-70"></span>
          Gefoerderte Stunden
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-green-600 inline-block opacity-70"></span>
          FZul-Stunden
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-indigo-200 inline-block"></span>
          Feiertag
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-gray-300 inline-block"></span>
          Wochenende
        </span>
        <span className="text-gray-400 italic">| Platzhalter = verfuegbare Stunden</span>
      </div>
    </div>
  );
}


// ============================================================================
// HAUPTKOMPONENTE
// ============================================================================

export default function MultiprojektDetailPage() {
  const router = useRouter();
  const params = useParams();
  const vorhabenId = params.id as string;
  const supabase = createClient();

  // Auth
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // Daten
  const [vorhaben, setVorhaben] = useState<V7FzulVorhaben | null>(null);
  const [anzeigeJahr, setAnzeigeJahr] = useState<number>(new Date().getFullYear());
  const [company, setCompany] = useState<ClientCompany | null>(null);
  const [alleMA, setAlleMA] = useState<EmployeeWithStats[]>([]);

  // UI-State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aktuellerTab, setAktuellerTab] = useState<'uebersicht' | 'kalender' | 'export'>('uebersicht');
  const [ausgewaehlterMA, setAusgewaehlterMA] = useState<EmployeeWithStats | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  // Kalender-State
  const [kalenderDaten, setKalenderDaten] = useState<MonatDaten[]>([]);
  const [kalenderLoading, setKalenderLoading] = useState(false);
  const [savingMonat, setSavingMonat] = useState<number | null>(null);

  // ============================================================================
  // DATEN LADEN
  // ============================================================================

  const loadVorhaben = useCallback(async () => {
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
      if (pErr || !profile) { router.push('/v7/login'); return; }
      if (!['consultant', 'system_admin'].includes(profile.role)) {
        router.push('/v7/firma/dashboard'); return;
      }
      setUserProfile(profile);

      // Vorhaben
      const { data: vh, error: vErr } = await supabase
        .from('v7_fzul_vorhaben')
        .select('*')
        .eq('id', vorhabenId)
        .single();
      if (vErr || !vh) throw new Error('Vorhaben nicht gefunden.');
      setVorhaben(vh);
      setAnzeigeJahr(vh.wirtschaftsjahr);

      // Firma
      const { data: comp, error: cErr } = await supabase
        .from('v7_client_companies')
        .select('id, name, federal_state, holiday_region, standard_weekly_hours')
        .eq('id', vh.client_company_id)
        .single();
      if (cErr || !comp) throw new Error('Firma nicht gefunden.');
      setCompany(comp);

      // Alle aktiven MA der Firma
      const { data: employees, error: eErr } = await supabase
        .from('v7_employees')
        .select('id, display_name, weekly_hours, position_title, is_active')
        .eq('client_company_id', vh.client_company_id)
        .eq('is_active', true)
        .order('display_name');
      if (eErr) throw eErr;

      // Teilzeit-Historien laden
      const employeeIds = (employees || []).map((e: Employee) => e.id);
      let historyMap: Record<string, Array<{ gueltig_ab: string; weekly_hours: number }>> = {};
      if (employeeIds.length > 0) {
        const { data: histData } = await supabase
          .from('v7_employee_hours_history')
          .select('employee_id, weekly_hours, gueltig_ab')
          .in('employee_id', employeeIds)
          .order('gueltig_ab', { ascending: false });
        if (histData) {
          histData.forEach((h: { employee_id: string; weekly_hours: number; gueltig_ab: string }) => {
            if (!historyMap[h.employee_id]) historyMap[h.employee_id] = [];
            historyMap[h.employee_id].push(h);
          });
        }
      }

      // Stichtag: 1. Januar des Wirtschaftsjahres
      const stichtag = `${vh.wirtschaftsjahr}-01-01`;

      // Gefoerderte Stunden aus v7_timesheets pro MA (fuer dieses Wirtschaftsjahr)
      const startDatum = `${vh.wirtschaftsjahr}-${String(vh.start_monat).padStart(2, '0')}-01`;
      const endeDatum = `${vh.wirtschaftsjahr}-${String(vh.ende_monat).padStart(2, '0')}-31`;

      // Alle gefoerderten Projekte der Firma
      const { data: projekteRaw } = await supabase
        .from('v7_projects')
        .select('id, funding_format')
        .eq('client_company_id', vh.client_company_id)
        .eq('is_active', true);

      const gefoerderteProjektIds = (projekteRaw || [])
        .filter((p: { id: string; funding_format: string | null }) =>
          p.funding_format && (V7_PUBLIC_FUNDING_FORMATS as string[]).includes(p.funding_format)
        )
        .map((p: { id: string }) => p.id);

      // Timesheets der gefoerderten Projekte im Zeitraum
      let gefoerdertStundenMap: Record<string, number> = {};
      if (gefoerderteProjektIds.length > 0 && employeeIds.length > 0) {
        const { data: tsData } = await supabase
          .from('v7_timesheets')
          .select('employee_id, hours')
          .in('project_id', gefoerderteProjektIds)
          .in('employee_id', employeeIds)
          .gte('work_date', startDatum)
          .lte('work_date', endeDatum)
          .eq('is_active', true)
          .not('day_type', 'in', '("urlaub","krank","sonderurlaub","feiertag")');

        if (tsData) {
          tsData.forEach((ts: { employee_id: string; hours: number }) => {
            gefoerdertStundenMap[ts.employee_id] =
              (gefoerdertStundenMap[ts.employee_id] || 0) + (ts.hours || 0);
          });
        }
      }

      // FZul-Timesheets des Vorhabens (bereits importiert)
      let fueStundenMap: Record<string, number> = {};
      let vorhandenMap: Record<string, boolean> = {};
      if (employeeIds.length > 0) {
        const { data: fzulTs } = await supabase
          .from('v7_fzul_timesheets')
          .select('employee_id, fue_hours, verfuegbar_hours, taetigkeitsbezeichnung')
          .eq('vorhaben_id', vorhabenId)
          .in('employee_id', employeeIds);

        if (fzulTs) {
          fzulTs.forEach((ts: {
            employee_id: string;
            fue_hours: number;
            verfuegbar_hours: number;
            taetigkeitsbezeichnung: string | null;
          }) => {
            fueStundenMap[ts.employee_id] = (fueStundenMap[ts.employee_id] || 0) + ts.fue_hours;
            vorhandenMap[ts.employee_id] = true;
          });
        }
      }

      // MA-Liste mit Stats zusammenbauen
      const maListe: EmployeeWithStats[] = (employees || []).map((emp: Employee) => {
        const effWH = getEffectiveWeeklyHours(
          historyMap[emp.id] || [],
          stichtag,
          emp.weekly_hours,
        );
        const gefoerdert = gefoerdertStundenMap[emp.id] || 0;
        const fue = fueStundenMap[emp.id] || 0;
        const monate = vh.ende_monat - vh.start_monat + 1;
        const maxStunden = (effWH / 40) * 173.33 * monate;
        const verfuegbar = Math.max(0, maxStunden - gefoerdert - fue);

        return {
          ...emp,
          effective_weekly_hours: effWH,
          hat_gefoerderte_projekte: gefoerdert > 0,
          gefoerdert_stunden_gesamt: gefoerdert,
          fue_stunden_gesamt: fue,
          verfuegbar_stunden_gesamt: verfuegbar,
          timesheet_vorhanden: vorhandenMap[emp.id] || false,
          ausgewaehlt: vorhandenMap[emp.id] || false,
          taetigkeitsbezeichnung: emp.position_title || '',
        };
      });

      setAlleMA(maListe);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setLoading(false);
    }
  }, [supabase, router, vorhabenId]);

  useEffect(() => { loadVorhaben(); }, [loadVorhaben]);

  // ============================================================================
  // IMPORT-LOGIK
  // ============================================================================

  const handleImport = async (ma: EmployeeWithStats) => {
    if (!vorhaben || !company) return;
    setImporting(true);
    setImportError(null);

    try {
      const stateCode = normalizeStateCode(company.federal_state);
      const holidayMap = getGermanHolidays(
        vorhaben.wirtschaftsjahr,
        stateCode,
        company.holiday_region as (import('@/lib/holidays/germanHolidays').HolidayRegion),
      );

      const tagesArbeitszeit = ma.effective_weekly_hours / 5;

      // Gefoerderte Stunden dieses MA tagesgenau laden
      const startDatum = `${vorhaben.wirtschaftsjahr}-${String(vorhaben.start_monat).padStart(2, '0')}-01`;
      const endDatum = new Date(vorhaben.wirtschaftsjahr, vorhaben.ende_monat, 0);
      const endeDatum = formatDatum(endDatum);

      // Alle gefoerderten Projekte der Firma
      const { data: projekteRaw } = await supabase
        .from('v7_projects')
        .select('id, funding_format')
        .eq('client_company_id', vorhaben.client_company_id)
        .eq('is_active', true);

      const gefoerderteProjektIds = (projekteRaw || [])
        .filter((p: { id: string; funding_format: string | null }) =>
          p.funding_format && (V7_PUBLIC_FUNDING_FORMATS as string[]).includes(p.funding_format)
        )
        .map((p: { id: string }) => p.id);

      // Tagesweise Stunden
      let tagesStunden: Record<string, number> = {};
      if (gefoerderteProjektIds.length > 0) {
        const { data: tsData } = await supabase
          .from('v7_timesheets')
          .select('work_date, hours, day_type')
          .eq('employee_id', ma.id)
          .in('project_id', gefoerderteProjektIds)
          .gte('work_date', startDatum)
          .lte('work_date', endeDatum)
          .eq('is_active', true)
          .not('day_type', 'in', '("urlaub","krank","sonderurlaub","feiertag")');

        if (tsData) {
          tsData.forEach((ts: { work_date: string; hours: number; day_type: string }) => {
            tagesStunden[ts.work_date] = (tagesStunden[ts.work_date] || 0) + (ts.hours || 0);
          });
        }
      }

      // Alle Tage des Zeitraums durchiterieren und FZul-Eintraege bauen
      const eintraege: V7FzulTimesheetInsert[] = [];
      const cursor = new Date(vorhaben.wirtschaftsjahr, vorhaben.start_monat - 1, 1);
      const ende = new Date(vorhaben.wirtschaftsjahr, vorhaben.ende_monat, 0);

      while (cursor <= ende) {
        const datumStr = formatDatum(cursor);
        const dow = cursor.getDay();
        const istWE = dow === 0 || dow === 6;
        const feiertagLabel = holidayMap.get(datumStr) || null;
        const istFeiertag = feiertagLabel !== null;

        let dayType: 'workday' | 'weekend' | 'holiday' = 'workday';
        if (istFeiertag) dayType = 'holiday';
        else if (istWE) dayType = 'weekend';

        const gefoerdert = tagesStunden[datumStr] || 0;
        const verfuegbar = istWE || istFeiertag
          ? 0
          : Math.max(0, tagesArbeitszeit - gefoerdert);
        const fue = verfuegbar; // Invertierung: alle verfuegbaren Stunden als Vorschlag

        eintraege.push({
          vorhaben_id: vorhabenId,
          employee_id: ma.id,
          work_date: datumStr,
          fue_hours: fue,
          gefoerdert_hours: gefoerdert,
          verfuegbar_hours: verfuegbar,
          taetigkeitsbezeichnung: ma.taetigkeitsbezeichnung || ma.position_title || null,
          day_type: dayType,
          holiday_label: feiertagLabel,
          urlaub_hours: 0,
          krank_hours: 0,
          sonderurlaub_hours: 0,
        });

        cursor.setDate(cursor.getDate() + 1);
      }

      // Upsert in v7_fzul_timesheets (bestehende Eintraege ersetzen)
      const BATCH = 50;
      for (let i = 0; i < eintraege.length; i += BATCH) {
        const batch = eintraege.slice(i, i + BATCH);
        const { error: uErr } = await supabase
          .from('v7_fzul_timesheets')
          .upsert(batch, { onConflict: 'vorhaben_id,employee_id,work_date' });
        if (uErr) throw uErr;
      }

      // MA-Liste neu laden
      await loadVorhaben();

      // Direkt zum Kalender dieses MA wechseln
      setAktuellerTab('kalender');
      await ladeKalender(ma);

    } catch (err: unknown) {
      setImportError(err instanceof Error ? err.message : 'Fehler beim Import.');
    } finally {
      setImporting(false);
    }
  };

  // ============================================================================
  // KALENDER LADEN
  // ============================================================================

  const ladeKalender = useCallback(async (ma: EmployeeWithStats, vorhabenOverride?: V7FzulVorhaben) => {
    const vh = vorhabenOverride ?? vorhaben;
    if (!vh || !company) return;
    setKalenderLoading(true);
    setAusgewaehlterMA(ma);

    try {
      const stateCode = normalizeStateCode(company.federal_state);
      const holidayMap = getGermanHolidays(
        vh.wirtschaftsjahr,
        stateCode,
        company.holiday_region as (import('@/lib/holidays/germanHolidays').HolidayRegion),
      );

      // FZul-Timesheets dieses MA laden
      const { data: tsData } = await supabase
        .from('v7_fzul_timesheets')
        .select('*')
        .eq('vorhaben_id', vorhabenId)
        .eq('employee_id', ma.id)
        .order('work_date');

      const tsMap: Record<string, V7FzulTimesheet> = {};
      (tsData || []).forEach((ts: V7FzulTimesheet) => {
        tsMap[ts.work_date] = ts;
      });

      // Monatsweise aufbauen
      const monatsListe: MonatDaten[] = [];
      for (let m = vh.start_monat; m <= vh.ende_monat; m++) {
        const tageImMonat = new Date(vh.wirtschaftsjahr, m, 0).getDate();
        const tagesArbeitszeit = ma.effective_weekly_hours / 5;
        const tage: KalenderTag[] = [];

        for (let t = 1; t <= tageImMonat; t++) {
          const datum = new Date(vh.wirtschaftsjahr, m - 1, t);
          const datumStr = formatDatum(datum);
          const dow = datum.getDay();
          const istWE = dow === 0 || dow === 6;
          const feiertagLabel = holidayMap.get(datumStr) || null;
          const istFeiertag = feiertagLabel !== null;

          const ts = tsMap[datumStr];
          const gefoerdert = ts ? ts.gefoerdert_hours : 0;
          const verfuegbar = istWE || istFeiertag
            ? 0
            : ts ? ts.verfuegbar_hours : Math.max(0, tagesArbeitszeit - gefoerdert);
          const fue = ts ? ts.fue_hours : 0;

          tage.push({
            datum: datumStr,
            tag: t,
            wochentag: WOCHENTAG_KURZ[dow],
            istWochenende: istWE,
            istFeiertag,
            feiertagLabel,
            gefoerdert,
            verfuegbar,
            fue,
            urlaub: ts ? ts.urlaub_hours : 0,
            krank: ts ? ts.krank_hours : 0,
            sonderurlaub: ts ? ts.sonderurlaub_hours : 0,
            gespeichert: !!ts,
            geaendert: false,
          });
        }

        const sumGefoerdert = tage.reduce((s, t) => s + t.gefoerdert, 0);
        const sumFue = tage.reduce((s, t) => s + t.fue, 0);
        const sumVerfuegbar = tage.reduce((s, t) => s + t.verfuegbar, 0);

        monatsListe.push({
          monat: m,
          monatName: MONAT_NAMEN[m - 1],
          tage,
          sumGefoerdert,
          sumFue,
          sumVerfuegbar,
        });
      }

      setKalenderDaten(monatsListe);
    } catch (err) {
      console.error('Fehler beim Laden des Kalenders:', err);
    } finally {
      setKalenderLoading(false);
    }
  }, [vorhaben, company, supabase, vorhabenId]);

  // ============================================================================
  // FUE-STUNDEN AENDERN (lokal)
  // ============================================================================

  const handleFueChange = useCallback((datum: string, wert: number) => {
    setKalenderDaten((prev) =>
      prev.map((monat) => ({
        ...monat,
        tage: monat.tage.map((tag) =>
          tag.datum === datum
            ? { ...tag, fue: wert, geaendert: true }
            : tag
        ),
        sumFue: monat.tage.reduce((s, t) =>
          s + (t.datum === datum ? wert : t.fue), 0
        ),
      }))
    );
  }, []);

  // ============================================================================
  // JAHRESWECHSEL
  // ============================================================================

  const handleJahrWechsel = useCallback(async (neuesJahr: number) => {
    if (!vorhaben || !ausgewaehlterMA) return;
    setAnzeigeJahr(neuesJahr);
    const vorhabenMitNeuemJahr = { ...vorhaben, wirtschaftsjahr: neuesJahr };
    await ladeKalender(ausgewaehlterMA, vorhabenMitNeuemJahr);
  }, [vorhaben, ausgewaehlterMA, ladeKalender]);

  // ============================================================================
  // MONAT SPEICHERN (alle geaenderten Tage eines Monats)
  // ============================================================================

  const handleSaveMonat = useCallback(async (monat: number) => {
    if (!ausgewaehlterMA) return;
    setSavingMonat(monat);

    try {
      const monatDaten = kalenderDaten.find((m) => m.monat === monat);
      if (!monatDaten) return;

      const geaenderteTage = monatDaten.tage.filter((t) => t.geaendert && !t.istWochenende && !t.istFeiertag);
      if (geaenderteTage.length === 0) return;

      const upserts = geaenderteTage.map((tag) => ({
        vorhaben_id: vorhabenId,
        employee_id: ausgewaehlterMA.id,
        work_date: tag.datum,
        fue_hours: tag.fue,
        gefoerdert_hours: tag.gefoerdert,
        verfuegbar_hours: tag.verfuegbar,
        taetigkeitsbezeichnung: ausgewaehlterMA.taetigkeitsbezeichnung || null,
        day_type: 'workday' as const,
        holiday_label: null,
        urlaub_hours: tag.urlaub,
        krank_hours: tag.krank,
        sonderurlaub_hours: tag.sonderurlaub,
      }));

      const { error: uErr } = await supabase
        .from('v7_fzul_timesheets')
        .upsert(upserts, { onConflict: 'vorhaben_id,employee_id,work_date' });
      if (uErr) throw uErr;

      // Tage als gespeichert markieren
      setKalenderDaten((prev) =>
        prev.map((m) =>
          m.monat === monat
            ? {
                ...m,
                tage: m.tage.map((t) =>
                  t.geaendert ? { ...t, gespeichert: true, geaendert: false } : t
                ),
              }
            : m
        )
      );
    } catch (err) {
      console.error('Fehler beim Speichern des Monats:', err);
    } finally {
      setSavingMonat(null);
    }
  }, [ausgewaehlterMA, kalenderDaten, supabase, vorhabenId]);

  // ============================================================================
  // RENDER
  // ============================================================================

  const userName = userProfile
    ? (userProfile.display_name || userProfile.email)
    : '';
  const userRole = userProfile?.role ?? 'consultant';

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

  if (error || !vorhaben) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <PortalHeader portal="berater" userName={userName} userRole={userRole} />
        <PortalNav portal="berater" userRole={userRole} />
        <main className="flex-1 max-w-7xl mx-auto px-4 py-8 w-full">
          <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
            <AlertCircle className="w-5 h-5" />
            {error || 'Vorhaben nicht gefunden.'}
          </div>
        </main>
      </div>
    );
  }

  const MONAT_LABELS = [
    'Jan','Feb','Mrz','Apr','Mai','Jun',
    'Jul','Aug','Sep','Okt','Nov','Dez',
  ];
  const zeitraum = vorhaben.start_monat === 1 && vorhaben.ende_monat === 12
    ? `Gj. ${vorhaben.wirtschaftsjahr}`
    : `${MONAT_LABELS[vorhaben.start_monat - 1]}-${MONAT_LABELS[vorhaben.ende_monat - 1]} ${vorhaben.wirtschaftsjahr}`;

  const maGruppeA = alleMA.filter((m) => m.hat_gefoerderte_projekte);
  const maGruppeB = alleMA.filter((m) => !m.hat_gefoerderte_projekte);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      <PortalHeader portal="berater" userName={userName} userRole={userRole} />
      <PortalNav portal="berater" userRole={userRole} />

      <main className="flex-1 w-full">

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb + Titel */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/v7/berater/multiprojekt')}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#002451] mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            Multiprojekt-Tool
          </button>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{vorhaben.title}</h1>
              <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                <span>{company?.name}</span>
                <span>-</span>
                <span>{zeitraum}</span>
                {vorhaben.vorhaben_id && (
                  <>
                    <span>-</span>
                    <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">
                      {vorhaben.vorhaben_id}
                    </span>
                  </>
                )}
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                  vorhaben.status === 'abgeschlossen'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {vorhaben.status === 'abgeschlossen'
                    ? <><CheckCircle className="w-3 h-3" /> Abgeschlossen</>
                    : <><Clock className="w-3 h-3" /> Entwurf</>
                  }
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-gray-200">
          {([
            { key: 'uebersicht', label: 'Uebersicht', icon: Users },
            { key: 'kalender', label: 'Jahreskalender', icon: Calendar },
            { key: 'export', label: 'Export', icon: Download },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setAktuellerTab(key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                aktuellerTab === key
                  ? 'border-[#002451] text-[#002451]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* ================================================================ */}
        </div> {/* Ende Header-Container */}

        {/* TAB 1: UEBERSICHT / MA-AUSWAHL                                   */}
        {/* ================================================================ */}

        {aktuellerTab === 'uebersicht' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
          <div className="space-y-6">

            {importError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                <AlertCircle className="w-4 h-4" />
                {importError}
              </div>
            )}

            {/* Hinweis */}
            <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800">
              <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>
                <strong>Vorgehensweise:</strong> Klicken Sie auf "Importieren" um die gefoerderten
                Stunden eines Mitarbeiters automatisch einzulesen. Anschliessend oeffnet sich der
                Jahreskalender mit den vorgeschlagenen FZul-Stunden (invertiert).
              </div>
            </div>

            {/* Gruppe A: MA mit gefoerderten Projekten */}
            {maGruppeA.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-orange-400 inline-block"></span>
                  Gruppe A - Mitarbeiter mit gefoerderten Projektstunden
                </h3>
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Mitarbeiter</th>
                        <th className="text-right px-4 py-3 font-medium text-gray-600">Gef. h</th>
                        <th className="text-right px-4 py-3 font-medium text-gray-600">FZul h</th>
                        <th className="text-right px-4 py-3 font-medium text-gray-600">Verf. h</th>
                        <th className="text-right px-4 py-3 font-medium text-gray-600">WAZ</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {maGruppeA.map((ma) => (
                        <tr key={ma.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900">{ma.display_name}</div>
                            {ma.taetigkeitsbezeichnung && (
                              <div className="text-xs text-gray-400">{ma.taetigkeitsbezeichnung}</div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right text-orange-600 font-medium">
                            {ma.gefoerdert_stunden_gesamt.toFixed(1)}
                          </td>
                          <td className="px-4 py-3 text-right text-green-600 font-medium">
                            {ma.fue_stunden_gesamt.toFixed(1)}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-500">
                            {ma.verfuegbar_stunden_gesamt.toFixed(1)}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-400 text-xs">
                            {ma.effective_weekly_hours} h/W
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2 justify-end">
                              {ma.timesheet_vorhanden && (
                                <button
                                  onClick={async () => {
                                    setAktuellerTab('kalender');
                                    await ladeKalender(ma);
                                  }}
                                  className="px-3 py-1 text-xs text-[#002451] border border-[#002451] rounded-lg hover:bg-blue-50"
                                >
                                  Kalender
                                </button>
                              )}
                              <button
                                onClick={() => handleImport(ma)}
                                disabled={importing}
                                className="flex items-center gap-1 px-3 py-1 text-xs text-white bg-[#002451] rounded-lg hover:bg-[#001a3a] disabled:opacity-50"
                              >
                                {importing
                                  ? <Loader2 className="w-3 h-3 animate-spin" />
                                  : <RefreshCw className="w-3 h-3" />
                                }
                                {ma.timesheet_vorhanden ? 'Neu importieren' : 'Importieren'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Gruppe B: MA ohne gefoerderte Projekte */}
            {maGruppeB.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-400 inline-block"></span>
                  Gruppe B - Mitarbeiter ohne gefoerderte Projektstunden
                </h3>
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Mitarbeiter</th>
                        <th className="text-right px-4 py-3 font-medium text-gray-600">Max. h</th>
                        <th className="text-right px-4 py-3 font-medium text-gray-600">WAZ</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {maGruppeB.map((ma) => {
                        const monate = vorhaben.ende_monat - vorhaben.start_monat + 1;
                        const maxH = (ma.effective_weekly_hours / 40) * 173.33 * monate;
                        return (
                          <tr key={ma.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <div className="font-medium text-gray-900">{ma.display_name}</div>
                              {ma.taetigkeitsbezeichnung && (
                                <div className="text-xs text-gray-400">{ma.taetigkeitsbezeichnung}</div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right text-green-600 font-medium">
                              {maxH.toFixed(1)}
                            </td>
                            <td className="px-4 py-3 text-right text-gray-400 text-xs">
                              {ma.effective_weekly_hours} h/W
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2 justify-end">
                                {ma.timesheet_vorhanden && (
                                  <button
                                    onClick={async () => {
                                      setAktuellerTab('kalender');
                                      await ladeKalender(ma);
                                    }}
                                    className="px-3 py-1 text-xs text-[#002451] border border-[#002451] rounded-lg hover:bg-blue-50"
                                  >
                                    Kalender
                                  </button>
                                )}
                                <button
                                  onClick={() => handleImport(ma)}
                                  disabled={importing}
                                  className="flex items-center gap-1 px-3 py-1 text-xs text-white bg-[#002451] rounded-lg hover:bg-[#001a3a] disabled:opacity-50"
                                >
                                  {importing
                                    ? <Loader2 className="w-3 h-3 animate-spin" />
                                    : <Plus className="w-3 h-3" />
                                  }
                                  {ma.timesheet_vorhanden ? 'Neu importieren' : 'Anlegen'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {alleMA.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Users className="w-8 h-8 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">Keine aktiven Mitarbeiter in dieser Firma gefunden.</p>
              </div>
            )}
          </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* TAB 2: JAHRESKALENDER - volle Seitenbreite                       */}
        {/* ================================================================ */}

        {aktuellerTab === 'kalender' && (
          <div className="w-full px-2 pb-8">
            {/* MA-Auswahl */}
            <div className="max-w-7xl mx-auto px-2 mb-4 flex items-center gap-3">
              <label className="text-sm font-medium text-gray-700">Mitarbeiter:</label>
              <select
                value={ausgewaehlterMA?.id ?? ''}
                onChange={async (e) => {
                  const ma = alleMA.find((m) => m.id === e.target.value);
                  if (ma) await ladeKalender(ma);
                }}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Mitarbeiter waehlen...</option>
                {alleMA.filter((m) => m.timesheet_vorhanden).map((ma) => (
                  <option key={ma.id} value={ma.id}>{ma.display_name}</option>
                ))}
              </select>
              {ausgewaehlterMA && (
                <span className="text-xs text-gray-500">
                  {ausgewaehlterMA.effective_weekly_hours} h/Woche
                  - {(ausgewaehlterMA.effective_weekly_hours / 5).toFixed(1)} h/Tag
                </span>
              )}
            </div>

            {kalenderLoading && (
              <div className="flex items-center gap-2 text-gray-500 py-8 justify-center">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">Kalender wird geladen...</span>
              </div>
            )}

            {!kalenderLoading && ausgewaehlterMA && kalenderDaten.length > 0 && (
              <div>
                {/* Legende */}
                <div className="flex items-center gap-4 mb-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded bg-orange-50 border border-orange-200 inline-block"></span>
                    Teilweise gefoerdert
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded bg-red-50 border border-red-200 inline-block"></span>
                    Vollstaendig gefoerdert
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded bg-green-50 border border-green-200 inline-block"></span>
                    FZul-Stunden eingetragen
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded bg-gray-50 border border-gray-200 inline-block"></span>
                    WE / Feiertag
                  </span>
                </div>

                <Jahreskalender
                  monate={kalenderDaten}
                  weeklyHours={ausgewaehlterMA.effective_weekly_hours}
                  wirtschaftsjahr={anzeigeJahr}
                  onFueChange={handleFueChange}
                  onSaveMonat={handleSaveMonat}
                  onJahrWechsel={handleJahrWechsel}
                  savingMonat={savingMonat}
                />

                {/* Jahres-Summe kompakt */}
                <div className="mt-3 mx-2 p-3 bg-[#002451] text-white rounded-xl">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-xl font-bold">
                        {kalenderDaten.reduce((s, m) => s + m.sumGefoerdert, 0).toFixed(1)} h
                      </div>
                      <div className="text-xs text-blue-200 mt-0.5">Gefoerderte Stunden</div>
                    </div>
                    <div>
                      <div className="text-xl font-bold">
                        {kalenderDaten.reduce((s, m) => s + m.sumFue, 0).toFixed(1)} h
                      </div>
                      <div className="text-xs text-blue-200 mt-0.5">FZul-Stunden</div>
                    </div>
                    <div>
                      <div className="text-xl font-bold">
                        {kalenderDaten.reduce((s, m) => s + m.sumVerfuegbar, 0).toFixed(1)} h
                      </div>
                      <div className="text-xs text-blue-200 mt-0.5">Verfuegbare Kapazitaet</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {!kalenderLoading && !ausgewaehlterMA && (
              <div className="text-center py-12 text-gray-500">
                <Calendar className="w-8 h-8 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">
                  Waehlen Sie einen Mitarbeiter aus oder importieren Sie zuerst
                  die Daten im Tab "Uebersicht".
                </p>
              </div>
            )}
          </div>
        )}

        {/* ================================================================ */}
        {/* TAB 3: EXPORT (Phase 3)                                          */}
        {/* ================================================================ */}

        {aktuellerTab === 'export' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="p-4 bg-gray-100 rounded-2xl mb-4">
              <Download className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              Excel-Export
            </h3>
            <p className="text-sm text-gray-500 max-w-md">
              Der Excel-Export mit dem amtlichen BSFZ-Formular wird in Phase 3 implementiert.
              Alle Berechnungen (Jahresarbeitszeit, FuE-Anteil, Hoechstgrenze) werden
              automatisch eingetragen.
            </p>
          </div>
          </div>
        )}

      </main>
    </div>
  );
}
