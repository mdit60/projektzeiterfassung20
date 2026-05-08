'use client';

// src/components/shared/FirmaCockpit.tsx
// ============================================================================
// SHARED COMPONENT: FirmaCockpit
// Version: 7.4.9-3
// Datum: 8. Mai 2026
//
// Firma-Cockpit als MIS (Management Information System)
// Zeigt alle relevanten Informationen einer Firma auf einen Blick.
//
// Verwendung:
//   - Berater-Portal: /v7/berater/foerderung/firma/[id]/cockpit
//   - Firmen-Portal:  /v7/firma/cockpit (Landing Page fuer Firmen-Admin)
//
// v7.4.9-3: Buttons umbenannt: Projektdaten / Projektfortschritt / Stundennachweis
//           Eigene Routen fuer Fortschritt + Matrix (ohne BerichtePage-Huelle)
//           returnTo=cockpit fuer zuverlaessige Zurueck-Navigation
// v7.4.9-2: KPI-Fortschrittsbalken in Projektkarten (Laufzeit, PM, Kosten)
//           ZA: Status aus Daten abgeleitet (kein Dropdown)
//           ZA: Spalten Eingereicht/Anforderung/Auszahlung/Differenz/Kommentar
// v7.4.9-1: Erstversion - Grundgeruest mit Live-Daten
// ============================================================================

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  ArrowLeft,
  Building2,
  Users,
  FolderKanban,
  Phone,
  Mail,
  MapPin,
  Calendar,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertCircle,
  Banknote,
  Clock,
  CheckCircle,
  FileText,
  BarChart3,
  TrendingUp,
} from 'lucide-react';

// ============================================================================
// KONSTANTEN
// ============================================================================

const PORTAL_PRIMARY: Record<string, string> = {
  berater: '#002451',
  firma: '#65A655',
};

const HOURS_PER_PM = 173.33;

const FUNDING_FORMAT_LABELS: Record<string, string> = {
  'ZIM_EINZEL': 'ZIM Einzel',
  'ZIM_KOOPERATION': 'ZIM Koop.',
  'ZIM_NETZWERK': 'ZIM NWM',
  'ZIM_DS': 'ZIM DS',
  'BMBF_KMU': 'BMBF/KMU-innov.',
  'FORSCHUNGSZULAGE': 'FZul',
};

// ============================================================================
// TYPEN
// ============================================================================

interface FirmaCockpitProps {
  firmaId: string;
  portal: 'berater' | 'firma';
}

interface FirmaData {
  id: string;
  name: string;
  contact_person: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  federal_state: string | null;
  holiday_region: string | null;
  standard_weekly_hours: number | null;
}

interface ProjektData {
  id: string;
  name: string;
  short_name: string | null;
  funding_reference: string | null;
  funding_format: string;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  foerdersatz: number | null;
  overhead_t: number | null;
  bewilligte_summe: number | null;
}

interface MitarbeiterData {
  id: string;
  display_name: string;
  position_title: string | null;
  portal_role: string | null;
  weekly_hours: number | null;
  is_active: boolean;
  projekte: string[];
}

interface ZAData {
  id: string;
  project_id: string;
  za_nummer: number;
  zeitraum_von: string | null;
  zeitraum_bis: string | null;
  status: string;
  foerderbetrag_gesamt: number | null;
  zahlungseingang_datum: string | null;
  zahlungseingang_betrag: number | null;
  zahlungseingang_kommentar: string | null;
  eingereicht_am: string | null;
  projekt_name?: string;
  projekt_fkz?: string;
}

interface ProjektKPI {
  laufzeitPct: number;
  laufzeitLabel: string;
  pmPct: number;
  pmLabel: string;
  kostenPct: number;
  kostenLabel: string;
}

// ============================================================================
// HILFSFUNKTIONEN
// ============================================================================

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatDateShort(dateStr: string | null): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('de-DE', { month: '2-digit', year: 'numeric' });
}

function formatEuro(betrag: number | null): string {
  if (betrag == null) return '-';
  return betrag.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' EUR';
}

function formatEuroShort(betrag: number | null): string {
  if (betrag == null) return '-';
  if (Math.abs(betrag) >= 1000) {
    return Math.round(betrag / 1000).toLocaleString('de-DE') + 'k EUR';
  }
  return Math.round(betrag).toLocaleString('de-DE') + ' EUR';
}

function formatLaufzeit(start: string | null, end: string | null): string {
  if (!start || !end) return '-';
  return formatDateShort(start) + ' - ' + formatDateShort(end);
}

// ZA-Status aus Daten ableiten
function deriveZAStatus(za: ZAData): { label: string; color: string; bg: string } {
  if (za.zahlungseingang_datum && za.zahlungseingang_betrag != null && za.zahlungseingang_betrag > 0) {
    return { label: 'Ausgezahlt', color: 'text-green-700', bg: 'bg-green-50' };
  }
  if (za.eingereicht_am) {
    return { label: 'Eingereicht', color: 'text-blue-700', bg: 'bg-blue-50' };
  }
  return { label: 'Entwurf', color: 'text-gray-500', bg: 'bg-gray-50' };
}

// ============================================================================
// FORTSCHRITTSBALKEN
// ============================================================================

function ProgressBar({ pct, label, sublabel, color }: {
  pct: number;
  label: string;
  sublabel: string;
  color: string;
}) {
  const clampedPct = Math.min(100, Math.max(0, pct));
  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-xs font-medium text-gray-600">{label}</span>
        <span className="text-xs font-bold" style={{ color }}>{pct}%</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2">
        <div
          className="h-2 rounded-full transition-all duration-500"
          style={{ width: `${clampedPct}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-[10px] text-gray-400 mt-0.5 block">{sublabel}</span>
    </div>
  );
}

// ============================================================================
// KOMPONENTE
// ============================================================================

export default function FirmaCockpit({ firmaId, portal }: FirmaCockpitProps) {
  const router = useRouter();
  const supabase = createClient();
  const primaryColor = PORTAL_PRIMARY[portal] || PORTAL_PRIMARY.berater;

  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [firma, setFirma] = useState<FirmaData | null>(null);
  const [projekte, setProjekte] = useState<ProjektData[]>([]);
  const [mitarbeiter, setMitarbeiter] = useState<MitarbeiterData[]>([]);
  const [zaList, setZaList] = useState<ZAData[]>([]);
  const [showInactiveProjekte, setShowInactiveProjekte] = useState(false);

  // KPI-Daten pro Projekt
  const [projektKPIs, setProjektKPIs] = useState<Record<string, ProjektKPI>>({});

  // ==========================================================================
  // DATEN LADEN
  // ==========================================================================

  useEffect(() => {
    loadCockpitData();
  }, [firmaId]);

  async function loadCockpitData() {
    try {
      setLoading(true);
      setError(null);

      // 1. Firmendaten
      const { data: firmaDB, error: firmaErr } = await supabase
        .from('v7_client_companies')
        .select('id, name, contact_person, contact_phone, contact_email, federal_state, holiday_region, standard_weekly_hours')
        .eq('id', firmaId)
        .single();

      if (firmaErr || !firmaDB) {
        setError('Firmendaten konnten nicht geladen werden.');
        return;
      }
      setFirma(firmaDB);

      // 2. Projekte (inkl. KPI-relevante Felder)
      const { data: projektDB } = await supabase
        .from('v7_projects')
        .select('id, name, short_name, funding_reference, funding_format, start_date, end_date, is_active, foerdersatz, overhead_t, bewilligte_summe')
        .eq('client_company_id', firmaId)
        .order('is_active', { ascending: false })
        .order('start_date', { ascending: false });

      const alleProjekte: ProjektData[] = projektDB || [];
      setProjekte(alleProjekte);

      const aktiveProjektIds = alleProjekte.filter(p => p.is_active).map(p => p.id);

      // 3. Mitarbeiter mit Projekt-Zuordnungen
      const { data: maDB } = await supabase
        .from('v7_employees')
        .select('id, display_name, position_title, portal_role, weekly_hours, is_active')
        .eq('client_company_id', firmaId)
        .eq('is_active', true)
        .order('display_name');

      const maList: MitarbeiterData[] = [];
      if (maDB && alleProjekte.length > 0) {
        for (const ma of maDB) {
          const { data: wpaDB } = await supabase
            .from('v7_work_package_assignments')
            .select('work_package_id, is_active, v7_work_packages!inner(project_id)')
            .eq('employee_id', ma.id)
            .eq('is_active', true);

          const projektIds = new Set<string>();
          if (wpaDB) {
            for (const wpa of wpaDB) {
              const wp = wpa.v7_work_packages as any;
              if (wp?.project_id) projektIds.add(wp.project_id);
            }
          }

          const projektNamen = alleProjekte
            .filter(p => projektIds.has(p.id) && p.is_active)
            .map(p => p.short_name || p.name);

          maList.push({ ...ma, projekte: projektNamen });
        }
      }
      setMitarbeiter(maList);

      // 4. KPI-Daten fuer aktive Projekte
      if (aktiveProjektIds.length > 0) {
        // Arbeitspakete
        const { data: wpDB } = await supabase
          .from('v7_work_packages')
          .select('id, project_id, total_person_months, start_date, end_date')
          .in('project_id', aktiveProjektIds)
          .eq('is_active', true);

        const wpIds = (wpDB || []).map(wp => wp.id);

        // AP-Zuordnungen
        let wpaDB: any[] = [];
        if (wpIds.length > 0) {
          const { data } = await supabase
            .from('v7_work_package_assignments')
            .select('work_package_id, employee_id, planned_person_months')
            .in('work_package_id', wpIds)
            .eq('is_active', true);
          wpaDB = data || [];
        }

        // Projekt-Zuordnungen (Stundensaetze)
        const { data: paDB } = await supabase
          .from('v7_project_assignments')
          .select('project_id, employee_id, hourly_rate')
          .in('project_id', aktiveProjektIds)
          .eq('is_active', true);

        // Timesheets
        const { data: tsDB } = await supabase
          .from('v7_timesheets')
          .select('project_id, employee_id, hours, is_billable')
          .in('project_id', aktiveProjektIds)
          .eq('is_active', true);

        // KPIs berechnen
        const kpis: Record<string, ProjektKPI> = {};
        const now = new Date();

        for (const projekt of alleProjekte.filter(p => p.is_active)) {
          const projWPs = (wpDB || []).filter(wp => wp.project_id === projekt.id);
          const projTS = (tsDB || []).filter(t => t.project_id === projekt.id && t.is_billable !== false);
          const projPA = (paDB || []).filter(pa => pa.project_id === projekt.id);

          // Laufzeit
          let laufzeitPct = 0;
          let laufzeitLabel = '-';
          if (projekt.start_date && projekt.end_date) {
            const start = new Date(projekt.start_date);
            const end = new Date(projekt.end_date);
            const total = end.getTime() - start.getTime();
            const elapsed = Math.max(0, Math.min(total, now.getTime() - start.getTime()));
            laufzeitPct = total > 0 ? Math.round((elapsed / total) * 100) : 0;
            const gesamtMonate = Math.round(total / (30.44 * 24 * 60 * 60 * 1000));
            const vergangeMonate = Math.round(elapsed / (30.44 * 24 * 60 * 60 * 1000));
            laufzeitLabel = vergangeMonate + '/' + gesamtMonate + ' Mon.';
          }

          // PM
          const gesamtPlanPM = projWPs.reduce((s, wp) => s + (wp.total_person_months || 0), 0);
          const gesamtIstStunden = projTS.reduce((s, t) => s + (t.hours || 0), 0);
          const gesamtIstPM = gesamtIstStunden / HOURS_PER_PM;
          const pmPct = gesamtPlanPM > 0 ? Math.round((gesamtIstPM / gesamtPlanPM) * 100) : 0;
          const pmLabel = (Math.round(gesamtIstPM * 10) / 10) + '/' + (Math.round(gesamtPlanPM * 10) / 10) + ' PM';

          // Kosten
          const overhead = (projekt.overhead_t || 0) / 100;
          let gesamtPlanKosten = 0;
          let gesamtIstKosten = 0;
          projPA.forEach(pa => {
            const rate = pa.hourly_rate || 0;
            if (rate === 0) return;
            const maWPAs = wpaDB.filter((wpa: any) => {
              const wp = projWPs.find(w => w.id === wpa.work_package_id);
              return wp && wpa.employee_id === pa.employee_id;
            });
            const planPM = maWPAs.reduce((s: number, wpa: any) => s + (wpa.planned_person_months || 0), 0);
            gesamtPlanKosten += planPM * HOURS_PER_PM * rate * (1 + overhead);
            const istH = projTS
              .filter(t => t.employee_id === pa.employee_id)
              .reduce((s, t) => s + (t.hours || 0), 0);
            gesamtIstKosten += istH * rate * (1 + overhead);
          });
          const kostenPct = gesamtPlanKosten > 0 ? Math.round((gesamtIstKosten / gesamtPlanKosten) * 100) : 0;
          const kostenLabel = formatEuroShort(gesamtIstKosten) + '/' + formatEuroShort(gesamtPlanKosten);

          kpis[projekt.id] = { laufzeitPct, laufzeitLabel, pmPct, pmLabel, kostenPct, kostenLabel };
        }
        setProjektKPIs(kpis);

        // 5. ZA-Uebersicht
        const { data: zaDB } = await supabase
          .from('v7_zahlungsanforderungen')
          .select('id, project_id, za_nummer, zeitraum_von, zeitraum_bis, status, foerderbetrag_gesamt, zahlungseingang_datum, zahlungseingang_betrag, zahlungseingang_kommentar, eingereicht_am')
          .in('project_id', alleProjekte.map(p => p.id))
          .order('eingereicht_am', { ascending: false });

        const zaWithProjekt = (zaDB || []).map(za => {
          const proj = alleProjekte.find(p => p.id === za.project_id);
          return {
            ...za,
            projekt_name: proj?.short_name || proj?.name || '-',
            projekt_fkz: proj?.funding_reference || '-',
          };
        });
        setZaList(zaWithProjekt);
      }

    } catch (err) {
      console.error('Cockpit loadData error:', err);
      setError('Unerwarteter Fehler beim Laden des Cockpits.');
    } finally {
      setLoading(false);
    }
  }

  // ==========================================================================
  // NAVIGATION
  // ==========================================================================

  function handleBack() {
    if (portal === 'berater') {
      router.push('/v7/berater/foerderung');
    } else {
      router.push('/v7/firma/dashboard');
    }
  }

  function handleProjektdatenClick(projektId: string) {
    const returnTo = encodeURIComponent(
      portal === 'berater'
        ? `/v7/berater/foerderung/firma/${firmaId}/cockpit`
        : `/v7/firma/cockpit`
    );
    if (portal === 'berater') {
      router.push(`/v7/berater/foerderung/firma/${firmaId}/projekt/${projektId}?returnTo=${returnTo}`);
    } else {
      router.push(`/v7/firma/projekte/${projektId}?returnTo=${returnTo}`);
    }
  }

  function handleFortschrittClick(projektId: string) {
    if (portal === 'berater') {
      router.push(`/v7/berater/foerderung/firma/${firmaId}/cockpit/fortschritt?projekt=${projektId}`);
    } else {
      router.push(`/v7/firma/cockpit/fortschritt?projekt=${projektId}`);
    }
  }

  function handleStundennachweisClick(projektId: string) {
    if (portal === 'berater') {
      router.push(`/v7/berater/foerderung/firma/${firmaId}/cockpit/stundennachweis?projekt=${projektId}`);
    } else {
      router.push(`/v7/firma/cockpit/stundennachweis?projekt=${projektId}`);
    }
  }

  // ==========================================================================
  // BERECHNUNGEN
  // ==========================================================================

  const aktiveProjekte = projekte.filter(p => p.is_active);
  const inaktiveProjekte = projekte.filter(p => !p.is_active);

  // ZA-Summen: nur eingereichte/ausgezahlte ZAs (nicht Entwuerfe)
  const zaEingereicht = zaList.filter(z => z.eingereicht_am);
  const zaAngefordert = zaEingereicht.reduce((sum, z) => sum + (z.foerderbetrag_gesamt || 0), 0);
  const zaAusgezahlt = zaEingereicht.reduce((sum, z) => sum + (z.zahlungseingang_betrag || 0), 0);
  const zaDifferenzGesamt = zaAngefordert - zaAusgezahlt;

  // ==========================================================================
  // RENDER: LOADING / ERROR
  // ==========================================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: primaryColor }} />
      </div>
    );
  }

  if (error || !firma) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <span>{error || 'Firma nicht gefunden.'}</span>
        </div>
        <button
          onClick={handleBack}
          className="mt-4 hover:underline flex items-center gap-2 text-sm"
          style={{ color: primaryColor }}
        >
          <ArrowLeft className="w-4 h-4" />
          Zurueck
        </button>
      </div>
    );
  }

  // ==========================================================================
  // RENDER: COCKPIT
  // ==========================================================================

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">

      {/* Kopfzeile: Zurueck + Firmenname */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">
            {portal === 'berater' ? 'Kundenfirmen' : 'Dashboard'}
          </span>
        </button>
        <div className="h-5 w-px bg-gray-300" />
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Building2 className="w-5 h-5" style={{ color: primaryColor }} />
          {firma.name}
        </h1>
      </div>

      {/* 3-Spalten Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* ================================================================ */}
        {/* LINKE SPALTE: Firmenkopf + Mitarbeiter (3 von 12 Spalten)        */}
        {/* ================================================================ */}
        <div className="lg:col-span-3 space-y-6">

          {/* --- Firmenkopf --- */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2
              className="text-sm font-semibold uppercase tracking-wider mb-4"
              style={{ color: primaryColor }}
            >
              Firmendaten
            </h2>

            <div className="space-y-3 text-sm">
              {firma.contact_person && (
                <div className="flex items-start gap-3">
                  <Users className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">{firma.contact_person}</span>
                </div>
              )}
              {firma.contact_phone && (
                <div className="flex items-start gap-3">
                  <Phone className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <a href={`tel:${firma.contact_phone}`} className="text-gray-700 hover:underline">
                    {firma.contact_phone}
                  </a>
                </div>
              )}
              {firma.contact_email && (
                <div className="flex items-start gap-3">
                  <Mail className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <a href={`mailto:${firma.contact_email}`} className="text-gray-700 hover:underline break-all">
                    {firma.contact_email}
                  </a>
                </div>
              )}
              {firma.federal_state && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">
                    {firma.federal_state}
                    {firma.holiday_region && (
                      <span className="text-gray-400 ml-1">({firma.holiday_region})</span>
                    )}
                  </span>
                </div>
              )}
              {firma.standard_weekly_hours != null && (
                <div className="flex items-start gap-3">
                  <Clock className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">
                    {String(firma.standard_weekly_hours).replace('.', ',')} h/Woche
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* --- Mitarbeiter --- */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2
              className="text-sm font-semibold uppercase tracking-wider mb-4 flex items-center gap-2"
              style={{ color: primaryColor }}
            >
              <Users className="w-4 h-4" />
              Mitarbeiter ({mitarbeiter.length})
            </h2>

            {mitarbeiter.length === 0 ? (
              <p className="text-sm text-gray-400">Keine aktiven Mitarbeiter.</p>
            ) : (
              <div className="space-y-3">
                {mitarbeiter.map(ma => (
                  <div key={ma.id} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">
                        {ma.display_name}
                      </span>
                      <span className="text-xs text-gray-400">
                        {ma.weekly_hours != null ? `${String(ma.weekly_hours).replace('.', ',')}h` : '-'}
                      </span>
                    </div>
                    {ma.position_title && (
                      <span className="text-xs text-gray-500">{ma.position_title}</span>
                    )}
                    {ma.projekte.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {ma.projekte.map((pName, idx) => (
                          <span
                            key={idx}
                            className="inline-block text-xs px-2 py-0.5 rounded-full border"
                            style={{
                              color: primaryColor,
                              borderColor: primaryColor + '40',
                              backgroundColor: primaryColor + '10',
                            }}
                          >
                            {pName}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* ================================================================ */}
        {/* MITTLERE SPALTE: Projekte mit KPIs (5 von 12 Spalten)           */}
        {/* ================================================================ */}
        <div className="lg:col-span-5 space-y-6">

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2
              className="text-sm font-semibold uppercase tracking-wider mb-4 flex items-center gap-2"
              style={{ color: primaryColor }}
            >
              <FolderKanban className="w-4 h-4" />
              Aktive Projekte ({aktiveProjekte.length})
            </h2>

            {aktiveProjekte.length === 0 ? (
              <p className="text-sm text-gray-400">Keine aktiven Projekte.</p>
            ) : (
              <div className="space-y-4">
                {aktiveProjekte.map(projekt => {
                  const kpi = projektKPIs[projekt.id];
                  return (
                    <div
                      key={projekt.id}
                      className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 hover:shadow-sm transition-all"
                    >
                      {/* FKZ + Format */}
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-mono text-gray-500">
                          {projekt.funding_reference || 'Kein FKZ'}
                        </span>
                        <span
                          className="text-xs font-medium px-2 py-0.5 rounded-full"
                          style={{
                            color: primaryColor,
                            backgroundColor: primaryColor + '15',
                          }}
                        >
                          {FUNDING_FORMAT_LABELS[projekt.funding_format] || projekt.funding_format}
                        </span>
                      </div>

                      {/* Projektname */}
                      <h3 className="text-sm font-semibold text-gray-900 mb-1 leading-snug">
                        {projekt.short_name || projekt.name}
                      </h3>

                      {/* Laufzeit */}
                      <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatLaufzeit(projekt.start_date, projekt.end_date)}
                      </div>

                      {/* KPI-Fortschrittsbalken */}
                      {kpi && (
                        <div className="flex gap-3 mb-3 pt-2 border-t border-gray-100">
                          <ProgressBar
                            pct={kpi.laufzeitPct}
                            label="Laufzeit"
                            sublabel={kpi.laufzeitLabel}
                            color="#6366f1"
                          />
                          <ProgressBar
                            pct={kpi.pmPct}
                            label="PM"
                            sublabel={kpi.pmLabel}
                            color="#0ea5e9"
                          />
                          <ProgressBar
                            pct={kpi.kostenPct}
                            label="Kosten"
                            sublabel={kpi.kostenLabel}
                            color="#10b981"
                          />
                        </div>
                      )}

                      {/* Direktlinks */}
                      <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                        <button
                          onClick={() => handleProjektdatenClick(projekt.id)}
                          className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors"
                        >
                          <FileText className="w-3 h-3" />
                          Projektdaten
                        </button>
                        <button
                          onClick={() => handleFortschrittClick(projekt.id)}
                          className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors"
                        >
                          <TrendingUp className="w-3 h-3" />
                          Projektfortschritt
                        </button>
                        <button
                          onClick={() => handleStundennachweisClick(projekt.id)}
                          className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors"
                        >
                          <BarChart3 className="w-3 h-3" />
                          Stundennachweis
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Inaktive Projekte */}
            {inaktiveProjekte.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <button
                  onClick={() => setShowInactiveProjekte(!showInactiveProjekte)}
                  className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                >
                  {showInactiveProjekte ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  {inaktiveProjekte.length} abgeschlossene Projekte
                </button>

                {showInactiveProjekte && (
                  <div className="mt-3 space-y-2">
                    {inaktiveProjekte.map(projekt => (
                      <div
                        key={projekt.id}
                        className="border border-gray-100 rounded-lg p-3 bg-gray-50 opacity-70"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-mono text-gray-400">
                            {projekt.funding_reference || '-'}
                          </span>
                          <span className="text-xs text-gray-400">
                            {FUNDING_FORMAT_LABELS[projekt.funding_format] || projekt.funding_format}
                          </span>
                        </div>
                        <h3 className="text-sm text-gray-600">
                          {projekt.short_name || projekt.name}
                        </h3>
                        <div className="text-xs text-gray-400 mt-1">
                          {formatLaufzeit(projekt.start_date, projekt.end_date)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ================================================================ */}
        {/* RECHTE SPALTE: Finanzen / ZA (4 von 12 Spalten)                 */}
        {/* ================================================================ */}
        <div className="lg:col-span-4 space-y-6">

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2
              className="text-sm font-semibold uppercase tracking-wider mb-4 flex items-center gap-2"
              style={{ color: primaryColor }}
            >
              <Banknote className="w-4 h-4" />
              Zahlungsanforderungen
            </h2>

            {/* Summen-Karten */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-[10px] text-blue-600 font-medium mb-1">Angefordert</div>
                <div className="text-xs font-bold text-blue-800">
                  {formatEuro(zaAngefordert)}
                </div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-[10px] text-green-600 font-medium mb-1">Ausgezahlt</div>
                <div className="text-xs font-bold text-green-800">
                  {formatEuro(zaAusgezahlt)}
                </div>
              </div>
              <div className={`text-center p-3 rounded-lg ${zaDifferenzGesamt > 0 ? 'bg-amber-50' : 'bg-gray-50'}`}>
                <div className={`text-[10px] font-medium mb-1 ${zaDifferenzGesamt > 0 ? 'text-amber-600' : 'text-gray-500'}`}>
                  Differenz
                </div>
                <div className={`text-xs font-bold ${zaDifferenzGesamt > 0 ? 'text-amber-800' : 'text-gray-600'}`}>
                  {formatEuro(zaDifferenzGesamt)}
                </div>
              </div>
            </div>

            {/* ZA-Liste */}
            {zaList.length === 0 ? (
              <p className="text-sm text-gray-400">Keine Zahlungsanforderungen vorhanden.</p>
            ) : (
              <div className="space-y-2">
                {zaList.map(za => {
                  const zaStatus = deriveZAStatus(za);
                  const differenz = (za.foerderbetrag_gesamt || 0) - (za.zahlungseingang_betrag || 0);
                  const hatAuszahlung = za.zahlungseingang_betrag != null && za.zahlungseingang_betrag > 0;

                  return (
                    <div
                      key={za.id}
                      className="border border-gray-200 rounded-lg p-3"
                    >
                      {/* Kopfzeile: FKZ / ZA Nr */}
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-gray-900">
                          {za.projekt_fkz} / ZA {za.za_nummer}
                        </span>
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${zaStatus.bg} ${zaStatus.color}`}>
                          {zaStatus.label}
                        </span>
                      </div>

                      {/* Zeitraum */}
                      <div className="text-xs text-gray-500 mb-2">
                        {za.zeitraum_von && za.zeitraum_bis
                          ? formatDateShort(za.zeitraum_von) + ' - ' + formatDateShort(za.zeitraum_bis)
                          : '-'}
                      </div>

                      {/* Datentabelle */}
                      <table className="w-full text-xs">
                        <tbody>
                          {/* Eingereicht */}
                          {za.eingereicht_am && (
                            <tr className="border-t border-gray-100">
                              <td className="py-1 text-gray-500 w-24">Eingereicht</td>
                              <td className="py-1 text-gray-700">{formatDate(za.eingereicht_am)}</td>
                            </tr>
                          )}

                          {/* Anforderung */}
                          <tr className="border-t border-gray-100">
                            <td className="py-1 text-gray-500">Anforderung</td>
                            <td className="py-1 text-gray-700 font-medium">{formatEuro(za.foerderbetrag_gesamt)}</td>
                          </tr>

                          {/* Auszahlung */}
                          {hatAuszahlung && (
                            <>
                              <tr className="border-t border-gray-100">
                                <td className="py-1 text-gray-500">Auszahlung</td>
                                <td className="py-1 text-green-700 font-medium">
                                  {formatDate(za.zahlungseingang_datum)} / {formatEuro(za.zahlungseingang_betrag)}
                                </td>
                              </tr>

                              {/* Differenz */}
                              {differenz !== 0 && (
                                <tr className="border-t border-gray-100">
                                  <td className="py-1 text-gray-500">Differenz</td>
                                  <td className={`py-1 font-medium ${differenz > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                                    {differenz > 0 ? '-' : '+'}{formatEuro(Math.abs(differenz))}
                                  </td>
                                </tr>
                              )}

                              {/* Kommentar */}
                              {za.zahlungseingang_kommentar && (
                                <tr className="border-t border-gray-100">
                                  <td className="py-1 text-gray-500">Kommentar</td>
                                  <td className="py-1 text-gray-600 italic">{za.zahlungseingang_kommentar}</td>
                                </tr>
                              )}
                            </>
                          )}
                        </tbody>
                      </table>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
