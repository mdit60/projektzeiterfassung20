'use client';

// src/components/shared/FirmaCockpit.tsx
// ============================================================================
// SHARED COMPONENT: FirmaCockpit
// Version: 7.4.9-20
// v7.4.9-20: Direkt-Navigation fuer Anlegen-Buttons (kein Doppelklick mehr)
//   - handleNeueFirma: ?openNew=true -> foerderung-page oeffnet Modal direkt
//   - handleNeuerMitarbeiter: &openNew=true -> EmployeeManagement oeffnet Modal direkt
//   - handleNeuesProjekt: direkt zu /projekt/neu (kein Umweg ueber Projektliste)
// v7.4.9-19: Bugfix - alle Handler nutzen firmaIdLocal statt firmaId
//
// Firma-Cockpit als MIS (Management Information System)
// Zeigt alle relevanten Informationen einer Firma auf einen Blick.
//
// Verwendung:
//   - Berater-Portal: /v7/berater/foerderung/firma/[id]/cockpit
//   - Firmen-Portal:  /v7/firma/cockpit (Landing Page fuer Firmen-Admin)
//
// v7.4.9-10: Action-Buttons in allen Bereichen
//           - Firmendaten: "Bearbeiten" (Stift-Icon)
//           - Mitarbeiter: "+ Neuer MA"
//           - Projekte: "+ Neues Projekt"
//           - ZA: "+ Neue ZA"
//           - Alle navigieren zu den jeweiligen Verwaltungsseiten
// v7.4.9-9: PortalNav statt Inline-Nav
//           - PortalNav (Shared Component) am Cockpit-Kopf gerendert
//           - Konsistente Navigation wie auf allen anderen Seiten
//           - Inline-Nav-Leiste entfernt
// v7.4.9-8: Berater-Navigationsleiste im Cockpit
//           - Reiter: Cockpit | Netzwerk | Kapazitaetsplanung | Administration
//           - Administration nur fuer system_admin sichtbar
//           - Cockpit-Reiter aktiv (hervorgehoben)
//           - Nur im Berater-Portal sichtbar
// v7.4.9-7: Firma-Dropdown fuer Berater-Portal
//           - Berater kann Kundenfirma direkt im Cockpit wechseln
//           - "Neue Firma"-Button navigiert zur Foerderung-Seite
//           - Firmen-Portal: Header bleibt unveraendert (nur eigene Firma)
//           - Firmenliste via consultant_company_id geladen
// v7.4.9-6: Dropdown-Projektauswahl statt Kartenliste
//           - Alle 3 Spalten reagieren auf Projektauswahl
//           - Monatsverlauf-Chart (recharts ComposedChart) unter Projektkarte
//           - Prognose-Box mit Ampel unter Chart
//           - MA links: gefiltert nach ausgewaehltem Projekt
//           - ZA rechts: gefiltert nach ausgewaehltem Projekt
//           - Berechnungen via lib/projektfortschritt-utils.ts
// v7.4.9-5: Spalten 2|6|4, ZA-Tabelle zentriert formatiert
// v7.4.9-4: ZA als Tabelle mit 7 Spalten, gruppiert nach Projekt
// v7.4.9-3: Buttons umbenannt, eigene Routen fuer Fortschritt + Matrix
// v7.4.9-2: KPI-Fortschrittsbalken, ZA-Status abgeleitet
// v7.4.9-1: Erstversion - Grundgeruest mit Live-Daten
// ============================================================================

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
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
  ChevronRight,
  Loader2,
  AlertCircle,
  Banknote,
  Clock,
  FileText,
  BarChart3,
  TrendingUp,
  Target,
  Plus,
  Pencil,
} from 'lucide-react';
import PortalNav from '@/components/shared/PortalNav';
import PortalFooter from '@/components/shared/PortalFooter';
import {
  calculateProjectAnalysis,
  FUNDING_FORMAT_SHORT,
  fmtEuroShort,
  fmtEuroFull,
  fmtDateShortDE,
  fmt1,
  fmtH,
  HOURS_PER_PM,
} from '@/lib/projektfortschritt-utils';
import type {
  PFProject,
  PFWorkPackage,
  PFWorkPackageAssignment,
  PFProjectAssignment,
  PFEmployee,
  PFTimesheetEntry,
  ProjectAnalysis,
} from '@/lib/projektfortschritt-utils';

// ============================================================================
// KONSTANTEN
// ============================================================================

const PORTAL_PRIMARY: Record<string, string> = {
  berater: '#002451',
  firma: '#65A655',
};

// ============================================================================
// TYPEN
// ============================================================================

interface FirmaCockpitProps {
  firmaId: string;
  portal: 'berater' | 'firma';
}

interface FirmaListItem {
  id: string;
  name: string;
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
  projektIds: string[];
  projektNamen: string[];
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

function formatLaufzeit(start: string | null, end: string | null): string {
  if (!start || !end) return '-';
  return formatDateShort(start) + ' - ' + formatDateShort(end);
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
          style={{ width: clampedPct + '%', backgroundColor: color }}
        />
      </div>
      <span className="text-[10px] text-gray-400 mt-0.5 block">{sublabel}</span>
    </div>
  );
}

// ============================================================================
// CHART TOOLTIP (kompakt)
// ============================================================================

const CockpitTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-2 text-[11px]">
      <p className="font-semibold text-gray-900 mb-1">{label}</p>
      {payload.map((p: any, i: number) => {
        if (p.value == null) return null;
        return (
          <p key={i} style={{ color: p.fill || p.stroke }} className="mb-0.5">
            {p.name}: {Math.round(p.value)} h
          </p>
        );
      })}
    </div>
  );
};

// ============================================================================
// CHART LEGENDE (kompakt)
// ============================================================================

const LEGENDE_LABEL_OVERRIDE: Record<string, string> = {
  'Soll (Monat)':   '#475569',
  'Soll kumuliert': '#475569',
};

const CockpitLegend = ({ payload }: any) => {
  if (!payload?.length) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '3px 12px', marginTop: 2 }}>
      {payload.map((entry: any, i: number) => {
        const labelColor = LEGENDE_LABEL_OVERRIDE[entry.value] || '#374151';
        const iconColor = entry.color || '#374151';
        const dashes = entry.payload?.strokeDasharray;
        const isLine = entry.type === 'line' || !!dashes;
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {isLine ? (
              <svg width="16" height="8" style={{ flexShrink: 0 }}>
                <line x1="0" y1="4" x2="16" y2="4"
                  stroke={iconColor} strokeWidth="2"
                  strokeDasharray={dashes || '0'} />
              </svg>
            ) : (
              <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, backgroundColor: iconColor, flexShrink: 0 }} />
            )}
            <span style={{ fontSize: 10, color: labelColor }}>{entry.value}</span>
          </div>
        );
      })}
    </div>
  );
};

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

  // Berater: Alle Kundenfirmen fuer Dropdown
  const [alleFirmen, setAlleFirmen] = useState<FirmaListItem[]>([]);

  // Berater: Aktuelle Firmenauswahl - '' = Placeholder "Firma auswaehlen"
  // firmaId aus Props ist der URL-Wert; firmaIdLocal steuert die Anzeige
  // Berater-Portal startet immer mit leerem State (kein Auto-Select)
  const [firmaIdLocal, setFirmaIdLocal] = useState<string>(
    portal === 'berater' ? '' : firmaId
  );

  // Berater: User-Rolle (fuer Admin-Nav-Tab)
  const [userRole, setUserRole] = useState<string>('consultant');

  // Projektauswahl
  const [selectedProjektId, setSelectedProjektId] = useState<string>('');

  // Rohdaten fuer Analyse-Berechnung
  const [rawTimesheets, setRawTimesheets] = useState<PFTimesheetEntry[]>([]);
  const [rawWorkPackages, setRawWorkPackages] = useState<PFWorkPackage[]>([]);
  const [rawWPAssignments, setRawWPAssignments] = useState<PFWorkPackageAssignment[]>([]);
  const [rawProjAssignments, setRawProjAssignments] = useState<PFProjectAssignment[]>([]);
  const [rawEmployees, setRawEmployees] = useState<PFEmployee[]>([]);

  // ==========================================================================
  // DATEN LADEN
  // ==========================================================================

  useEffect(() => {
    if (firmaIdLocal) {
      loadCockpitData();
    } else {
      // Kein Auto-Select: nur alleFirmen laden fuer Dropdown
      loadAlleFirmen();
      setLoading(false);
    }
  }, [firmaIdLocal]);

  async function loadAlleFirmen() {
    if (portal !== 'berater') return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase
      .from('v7_user_profiles')
      .select('consultant_company_id, role')
      .eq('id', user.id)
      .single();
    if (profile?.role) setUserRole(profile.role);
    if (profile?.consultant_company_id) {
      const { data: firmenDB } = await supabase
        .from('v7_client_companies')
        .select('id, name')
        .eq('consultant_company_id', profile.consultant_company_id)
        .eq('is_active', true)
        .order('name');
      setAlleFirmen(firmenDB || []);
    }
  }

  async function loadCockpitData() {
    try {
      setLoading(true);
      setError(null);

      // Berater-Portal: Alle Kundenfirmen fuer Dropdown laden
      if (portal === 'berater') {
        await loadAlleFirmen();
      }

      // 1. Firmendaten
      const { data: firmaDB, error: firmaErr } = await supabase
        .from('v7_client_companies')
        .select('id, name, contact_person, contact_phone, contact_email, federal_state, holiday_region, standard_weekly_hours')
        .eq('id', firmaIdLocal)
        .single();

      if (firmaErr || !firmaDB) {
        setError('Firmendaten konnten nicht geladen werden.');
        return;
      }
      setFirma(firmaDB);

      // 2. Projekte
      const { data: projektDB } = await supabase
        .from('v7_projects')
        .select('id, name, short_name, funding_reference, funding_format, start_date, end_date, is_active, foerdersatz, overhead_t, bewilligte_summe')
        .eq('client_company_id', firmaIdLocal)
        .order('is_active', { ascending: false })
        .order('start_date', { ascending: false });

      const alleProjekte: ProjektData[] = projektDB || [];
      setProjekte(alleProjekte);

      const aktiveProjektIds = alleProjekte.filter(p => p.is_active).map(p => p.id);
      const alleProjektIds = alleProjekte.map(p => p.id);

      // Default-Auswahl: erstes aktives Projekt
      if (aktiveProjektIds.length > 0) {
        setSelectedProjektId(aktiveProjektIds[0]);
      }

      // 3. Mitarbeiter mit Projekt-Zuordnungen
      const { data: maDB } = await supabase
        .from('v7_employees')
        .select('id, display_name, position_title, portal_role, weekly_hours, is_active')
        .eq('client_company_id', firmaIdLocal)
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

          const projektIdSet = new Set<string>();
          if (wpaDB) {
            for (const wpa of wpaDB) {
              const wp = wpa.v7_work_packages as any;
              if (wp?.project_id) projektIdSet.add(wp.project_id);
            }
          }

          const projektNamen = alleProjekte
            .filter(p => projektIdSet.has(p.id) && p.is_active)
            .map(p => p.short_name || p.name);

          maList.push({
            ...ma,
            projektIds: Array.from(projektIdSet),
            projektNamen,
          });
        }
      }
      setMitarbeiter(maList);

      // Employees fuer Analyse (PFEmployee-Format)
      const pfEmployees: PFEmployee[] = (maDB || []).map(ma => ({
        id: ma.id,
        display_name: ma.display_name,
        weekly_hours: ma.weekly_hours,
        position_title: ma.position_title,
      }));
      setRawEmployees(pfEmployees);

      // 4. Arbeitspakete + Zuordnungen + Timesheets (ALLE Projekte)
      if (alleProjektIds.length > 0) {
        // Arbeitspakete
        const { data: wpDB } = await supabase
          .from('v7_work_packages')
          .select('id, project_id, total_person_months, start_date, end_date')
          .in('project_id', alleProjektIds)
          .eq('is_active', true);

        const wpList: PFWorkPackage[] = (wpDB || []).map(wp => ({
          id: wp.id,
          project_id: wp.project_id,
          total_person_months: wp.total_person_months,
          start_date: wp.start_date,
          end_date: wp.end_date,
        }));
        setRawWorkPackages(wpList);

        const wpIds = wpList.map(wp => wp.id);

        // AP-Zuordnungen
        let wpaList: PFWorkPackageAssignment[] = [];
        if (wpIds.length > 0) {
          const { data } = await supabase
            .from('v7_work_package_assignments')
            .select('work_package_id, employee_id, planned_person_months')
            .in('work_package_id', wpIds)
            .eq('is_active', true);
          wpaList = (data || []).map(wpa => ({
            work_package_id: wpa.work_package_id,
            employee_id: wpa.employee_id,
            planned_person_months: wpa.planned_person_months || 0,
          }));
        }
        setRawWPAssignments(wpaList);

        // Projekt-Zuordnungen (Stundensaetze)
        const { data: paDB } = await supabase
          .from('v7_project_assignments')
          .select('project_id, employee_id, hourly_rate')
          .in('project_id', alleProjektIds)
          .eq('is_active', true);
        const paList: PFProjectAssignment[] = (paDB || []).map(pa => ({
          project_id: pa.project_id,
          employee_id: pa.employee_id,
          hourly_rate: pa.hourly_rate,
        }));
        setRawProjAssignments(paList);

        // Timesheets MIT work_date (fuer Monatsverlauf)
        const { data: tsDB } = await supabase
          .from('v7_timesheets')
          .select('project_id, employee_id, work_date, hours, is_billable')
          .in('project_id', alleProjektIds)
          .eq('is_active', true);
        const tsList: PFTimesheetEntry[] = (tsDB || []).map(t => ({
          project_id: t.project_id,
          employee_id: t.employee_id,
          work_date: t.work_date,
          hours: t.hours || 0,
          is_billable: t.is_billable !== false,
        }));
        setRawTimesheets(tsList);

        // 5. ZA-Uebersicht
        const { data: zaDB } = await supabase
          .from('v7_zahlungsanforderungen')
          .select('id, project_id, za_nummer, zeitraum_von, zeitraum_bis, status, foerderbetrag_gesamt, zahlungseingang_datum, zahlungseingang_betrag, zahlungseingang_kommentar, eingereicht_am')
          .in('project_id', alleProjektIds)
          .order('za_nummer', { ascending: true });

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
  // ANALYSE-BERECHNUNG (useMemo - reagiert auf Projektauswahl)
  // ==========================================================================

  const analysis: ProjectAnalysis | null = useMemo(() => {
    if (!selectedProjektId) return null;
    const projekt = projekte.find(p => p.id === selectedProjektId);
    if (!projekt) return null;

    return calculateProjectAnalysis(
      projekt as PFProject,
      rawWorkPackages,
      rawWPAssignments,
      rawProjAssignments,
      rawEmployees,
      rawTimesheets,
    );
  }, [selectedProjektId, projekte, rawTimesheets, rawWorkPackages, rawWPAssignments, rawProjAssignments, rawEmployees]);

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

  function handleFirmaChange(newFirmaId: string) {
    if (!newFirmaId) {
      setFirmaIdLocal('');
      setFirma(null);
      return;
    }
    if (newFirmaId === firmaIdLocal) return;
    setFirmaIdLocal(newFirmaId);
  }

  function handleNeueFirma() {
    router.push('/v7/berater/foerderung?openNew=true');
  }

  function handleProjektdatenClick(projektId: string) {
    const returnTo = encodeURIComponent(
      portal === 'berater'
        ? '/v7/berater/foerderung/firma/' + firmaIdLocal + '/cockpit'
        : '/v7/firma/cockpit'
    );
    if (portal === 'berater') {
      router.push('/v7/berater/foerderung/firma/' + firmaIdLocal + '/projekt/' + projektId + '?returnTo=' + returnTo);
    } else {
      router.push('/v7/firma/projekte/' + projektId + '?returnTo=' + returnTo);
    }
  }

  function handleFortschrittClick(projektId: string) {
    if (portal === 'berater') {
      router.push('/v7/berater/foerderung/firma/' + firmaIdLocal + '/cockpit/fortschritt?projekt=' + projektId);
    } else {
      router.push('/v7/firma/cockpit/fortschritt?projekt=' + projektId);
    }
  }

  function handleStundennachweisClick(projektId: string) {
    if (portal === 'berater') {
      router.push('/v7/berater/foerderung/firma/' + firmaIdLocal + '/cockpit/stundennachweis?projekt=' + projektId);
    } else {
      router.push('/v7/firma/cockpit/stundennachweis?projekt=' + projektId);
    }
  }

  // --- Action-Buttons ---

  const cockpitReturnTo = encodeURIComponent(
    portal === 'berater'
      ? '/v7/berater/foerderung/firma/' + firmaIdLocal + '/cockpit'
      : '/v7/firma/cockpit'
  );

  function handleFirmendatenBearbeiten() {
    if (portal === 'berater') {
      router.push('/v7/berater/foerderung/firma/' + firmaIdLocal + '?tab=firmendaten&returnTo=' + cockpitReturnTo);
    } else {
      router.push('/v7/firma/firmendaten');
    }
  }

  function handleNeuerMitarbeiter() {
    if (portal === 'berater') {
      router.push('/v7/berater/foerderung/firma/' + firmaIdLocal + '?tab=mitarbeiter&openNew=true&returnTo=' + cockpitReturnTo);
    } else {
      router.push('/v7/firma/mitarbeiter');
    }
  }

  function handleNeuesProjekt() {
    if (portal === 'berater') {
      router.push('/v7/berater/foerderung/firma/' + firmaIdLocal + '/projekt/neu?returnTo=' + cockpitReturnTo);
    } else {
      router.push('/v7/firma/projekt/neu');
    }
  }

  function handleNeueZA() {
    if (!selectedProjektId) return;
    if (portal === 'berater') {
      const params = new URLSearchParams({
        projektId: selectedProjektId,
        returnTo: 'cockpit',
      });
      router.push('/v7/berater/foerderung/firma/' + firmaIdLocal + '/za?' + params.toString());
    } else {
      const params = new URLSearchParams({
        projektId: selectedProjektId,
        returnTo: 'cockpit',
      });
      router.push('/v7/firma/za?' + params.toString());
    }
  }

  // Klick auf ZA-Nummer -> direkt zur ZASeite
  function handleZAClick(za: ZAData) {
    if (portal === 'berater') {
      const params = new URLSearchParams({
        projektId: za.project_id,
        zaId: za.id,
        returnTo: 'cockpit',
      });
      router.push('/v7/berater/foerderung/firma/' + firmaIdLocal + '/za?' + params.toString());
    } else {
      const params = new URLSearchParams({
        projektId: za.project_id,
        zaId: za.id,
        returnTo: 'cockpit',
      });
      router.push('/v7/firma/za?' + params.toString());
    }
  }

  // ==========================================================================
  // ABGELEITETE DATEN
  // ==========================================================================

  const aktiveProjekte = projekte.filter(p => p.is_active);
  const inaktiveProjekte = projekte.filter(p => !p.is_active);
  const selectedProjekt = projekte.find(p => p.id === selectedProjektId);

  // MA gefiltert nach ausgewaehltem Projekt
  const filteredMA = selectedProjektId
    ? mitarbeiter.filter(ma => ma.projektIds.includes(selectedProjektId))
    : mitarbeiter;

  // ZA gefiltert nach ausgewaehltem Projekt
  const filteredZA = selectedProjektId
    ? zaList.filter(z => z.project_id === selectedProjektId)
    : zaList;

  // ZA-Summen (nur eingereichte/ausgezahlte, gefiltert)
  const zaEingereicht = filteredZA.filter(z => z.eingereicht_am);
  const zaAngefordert = zaEingereicht.reduce((sum, z) => sum + (z.foerderbetrag_gesamt || 0), 0);
  const zaAusgezahlt = zaEingereicht.reduce((sum, z) => sum + (z.zahlungseingang_betrag || 0), 0);
  const zaDifferenzGesamt = zaAngefordert - zaAusgezahlt;

  // Chart X-Achsen-Intervall
  const xAxisInterval = analysis
    ? Math.max(0, Math.floor(analysis.monatData.length / 12) - 1)
    : 0;

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

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
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

  // Berater-Portal: Kein Auto-Select - Firmenliste zur Auswahl
  if (portal === 'berater' && !firmaIdLocal) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="w-5 h-5" style={{ color: primaryColor }} />
            Kundenfirmen
          </h1>
          <button
            onClick={handleNeueFirma}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-600 font-medium transition-colors"
            title="Neue Kundenfirma anlegen"
          >
            <Plus className="w-3.5 h-3.5" />
            Neue Firma
          </button>
        </div>

        {/* Firmenliste scrollbar */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="max-h-[70vh] overflow-y-auto">
            {alleFirmen.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
                <Building2 className="w-10 h-10 opacity-20" />
                <p className="text-sm">Keine Kundenfirmen vorhanden</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {alleFirmen.map((f, idx) => (
                  <li key={f.id}>
                    <button
                      onClick={() => handleFirmaChange(f.id)}
                      className="w-full flex items-center gap-4 px-6 py-4 hover:bg-blue-50 transition-colors text-left group"
                    >
                      <span
                        className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                        style={{ backgroundColor: primaryColor }}
                      >
                        {f.name.charAt(0).toUpperCase()}
                      </span>
                      <span className="flex-1 text-sm font-medium text-gray-800 group-hover:text-blue-700">
                        {f.name}
                      </span>
                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-400 flex-shrink-0" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {alleFirmen.length > 0 && (
            <div className="px-6 py-2 bg-gray-50 border-t border-gray-100 text-xs text-gray-400">
              {alleFirmen.length} Firma{alleFirmen.length !== 1 ? 'en' : ''} · alphabetisch sortiert
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!firma) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: primaryColor }} />
      </div>
    );
  }

  // ==========================================================================
  // RENDER: COCKPIT
  // ==========================================================================

  return (
    <>
      {/* Groessere Schrift in den 4 Panels - Monatsverlauf ausgenommen */}
      <style>{`
        #cockpit-left .text-xs,
        #cockpit-right .text-xs,
        #cockpit-projekte .text-xs,
        #cockpit-prognose .text-xs { font-size: 1rem !important; line-height: 1.5rem !important; }
        #cockpit-left .text-sm,
        #cockpit-right .text-sm,
        #cockpit-projekte .text-sm,
        #cockpit-prognose .text-sm { font-size: 1.125rem !important; line-height: 1.75rem !important; }
      `}</style>
      {/* PortalNav: Konsistente Navigation direkt unter dem Header */}
      <PortalNav portal={portal} userRole={userRole} />

      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 pb-12">

      {/* Kopfzeile */}
      <div className="flex items-center gap-4 mb-6">
        {portal === 'berater' ? (
          <>
            {/* Berater: Firma-Dropdown */}
            <Building2 className="w-5 h-5 flex-shrink-0" style={{ color: primaryColor }} />
            {alleFirmen.length > 1 ? (
              <select
                value={firmaIdLocal}
                onChange={(e) => handleFirmaChange(e.target.value)}
                className="text-xl font-bold text-gray-900 bg-transparent border-none focus:outline-none focus:ring-0 cursor-pointer pr-8 appearance-none"
                style={{
                  backgroundImage: 'url("data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>') + '")',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 0px center',
                  backgroundSize: '18px',
                }}
              >
                <option value="">-- Firma auswaehlen --</option>
                {alleFirmen.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            ) : (
              <h1 className="text-xl font-bold text-gray-900">
                {firma.name}
              </h1>
            )}
            {/* Neue Firma Button: direkt neben Dropdown */}
            <button
              onClick={handleNeueFirma}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-600 font-medium transition-colors"
              title="Neue Kundenfirma anlegen"
            >
              <Plus className="w-3.5 h-3.5" />
              Neue Firma
            </button>
          </>
        ) : (
          <>
            {/* Firmen-Portal: Zurueck + Firmenname */}
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Dashboard</span>
            </button>
            <div className="h-5 w-px bg-gray-300" />
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Building2 className="w-5 h-5" style={{ color: primaryColor }} />
              {firma.name}
            </h1>
          </>
        )}
      </div>

      {/* 3-Spalten Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* ================================================================ */}
        {/* LINKE SPALTE: Firmenkopf + Mitarbeiter (2 von 12 Spalten)        */}
        {/* ================================================================ */}
        <div id="cockpit-left" className="lg:col-span-2 space-y-6">

          {/* --- Firmenkopf --- */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2
                className="text-sm font-semibold uppercase tracking-wider"
                style={{ color: primaryColor }}
              >
                Firmendaten
              </h2>
              <button
                onClick={handleFirmendatenBearbeiten}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 transition-colors"
                title="Firmendaten bearbeiten"
              >
                <Pencil className="w-3 h-3" />
              </button>
            </div>

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
                  <a href={'tel:' + firma.contact_phone} className="text-gray-700 hover:underline">
                    {firma.contact_phone}
                  </a>
                </div>
              )}
              {firma.contact_email && (
                <div className="flex items-start gap-3">
                  <Mail className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <a href={'mailto:' + firma.contact_email} className="text-gray-700 hover:underline break-all">
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

          {/* --- Mitarbeiter (gefiltert nach Projekt) --- */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2
                className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2"
                style={{ color: primaryColor }}
              >
                <Users className="w-4 h-4" />
                Mitarbeiter ({filteredMA.length})
              </h2>
              <button
                onClick={handleNeuerMitarbeiter}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 transition-colors"
                title="Neuen Mitarbeiter anlegen"
              >
                <Plus className="w-3.5 h-3.5" />
                Neuer MA
              </button>
            </div>

            {filteredMA.length === 0 ? (
              <p className="text-sm text-gray-400">Keine Mitarbeiter in diesem Projekt.</p>
            ) : (
              <div className="space-y-3">
                {filteredMA.map(ma => (
                  <div key={ma.id} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">
                        {ma.display_name}
                      </span>
                      <span className="text-xs text-gray-400">
                        {ma.weekly_hours != null ? String(ma.weekly_hours).replace('.', ',') + 'h' : '-'}
                      </span>
                    </div>
                    {ma.position_title && (
                      <span className="text-xs text-gray-500">{ma.position_title}</span>
                    )}
                    {ma.projektNamen.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {ma.projektNamen.map((pName, idx) => (
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
        {/* MITTLERE SPALTE: Projekte mit Monatsverlauf (6 von 12 Spalten)  */}
        {/* ================================================================ */}
        <div className="lg:col-span-6 space-y-6">

          {/* --- Projekt-Karte mit Dropdown --- */}
          <div id="cockpit-projekte" className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2
                className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2"
                style={{ color: primaryColor }}
              >
                <FolderKanban className="w-4 h-4" />
                Aktive Projekte ({aktiveProjekte.length})
              </h2>
              <button
                onClick={handleNeuesProjekt}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 transition-colors"
                title="Neues Projekt anlegen"
              >
                <Plus className="w-3.5 h-3.5" />
                Neues Projekt
              </button>
            </div>

            {aktiveProjekte.length === 0 ? (
              <p className="text-sm text-gray-400">Keine aktiven Projekte.</p>
            ) : (
              <>
                {/* Dropdown Projektauswahl */}
                <div className="mb-4">
                  <select
                    value={selectedProjektId}
                    onChange={(e) => setSelectedProjektId(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm font-medium text-gray-900 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent cursor-pointer appearance-none"
                    style={{
                      backgroundImage: 'url("data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>') + '")',
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 12px center',
                      backgroundSize: '16px',
                      paddingRight: '36px',
                      // @ts-ignore
                      focusRingColor: primaryColor,
                    }}
                  >
                    {aktiveProjekte.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.short_name || p.name}
                        {p.funding_reference ? ' (' + p.funding_reference + ')' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Ausgewaehltes Projekt: Details + KPIs + Buttons */}
                {selectedProjekt && selectedProjekt.is_active && (
                  <div className="border border-gray-200 rounded-lg p-4">

                    {/* FKZ + Format */}
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-mono text-gray-500">
                        {selectedProjekt.funding_reference || 'Kein FKZ'}
                      </span>
                      <span
                        className="text-xs font-medium px-2 py-0.5 rounded-full"
                        style={{
                          color: primaryColor,
                          backgroundColor: primaryColor + '15',
                        }}
                      >
                        {FUNDING_FORMAT_SHORT[selectedProjekt.funding_format] || selectedProjekt.funding_format}
                      </span>
                    </div>

                    {/* Projektname */}
                    <h3 className="text-sm font-semibold text-gray-900 mb-1 leading-snug">
                      {selectedProjekt.short_name || selectedProjekt.name}
                    </h3>

                    {/* Laufzeit */}
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatLaufzeit(selectedProjekt.start_date, selectedProjekt.end_date)}
                    </div>

                    {/* KPI-Fortschrittsbalken aus Analyse */}
                    {analysis && (
                      <div className="flex gap-3 mb-3 pt-2 border-t border-gray-100">
                        <ProgressBar
                          pct={analysis.laufzeitPct}
                          label="Laufzeit"
                          sublabel={analysis.vergangeMonate + '/' + analysis.gesamtMonate + ' Mon.'}
                          color="#6366f1"
                        />
                        <ProgressBar
                          pct={analysis.pmPct}
                          label="PM"
                          sublabel={fmt1(analysis.gesamtIstPM) + '/' + fmt1(analysis.gesamtPlanPM) + ' PM'}
                          color="#0ea5e9"
                        />
                        <ProgressBar
                          pct={analysis.kostenPct}
                          label="Kosten"
                          sublabel={fmtEuroShort(analysis.gesamtIstKosten) + '/' + fmtEuroShort(analysis.gesamtPlanKosten)}
                          color="#10b981"
                        />
                      </div>
                    )}

                    {/* Direktlinks */}
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                      <button
                        onClick={() => handleProjektdatenClick(selectedProjektId)}
                        className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors"
                      >
                        <FileText className="w-3 h-3" />
                        Projektdaten
                      </button>
                      <button
                        onClick={() => handleFortschrittClick(selectedProjektId)}
                        className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors"
                      >
                        <TrendingUp className="w-3 h-3" />
                        Projektfortschritt
                      </button>
                      <button
                        onClick={() => handleStundennachweisClick(selectedProjektId)}
                        className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors"
                      >
                        <BarChart3 className="w-3 h-3" />
                        Stundennachweis
                      </button>
                    </div>
                  </div>
                )}
              </>
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
                            {FUNDING_FORMAT_SHORT[projekt.funding_format] || projekt.funding_format}
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

          {/* --- Monatsverlauf Chart --- */}
          {analysis && analysis.monatData.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-1">
                Monatsverlauf Projektstunden
              </h3>
              <p className="text-[10px] text-gray-500 mb-3">
                Saeulen: Soll vs. Ist je Monat &middot; Linien: kumulierter Verlauf
                {analysis.prognoseAktiv && (
                  <>
                    {' '}&middot;{' '}
                    <span style={{ color: analysis.pFarbe.stroke }}>
                      Gestrichelt: Prognose
                    </span>
                  </>
                )}
              </p>
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart
                  data={analysis.monatData}
                  margin={{ top: 5, right: 50, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="monat"
                    tick={{ fontSize: 9, fill: '#374151' }}
                    interval={xAxisInterval}
                  />
                  <YAxis
                    yAxisId="monat"
                    orientation="left"
                    tick={{ fontSize: 9, fill: '#374151' }}
                    unit=" h"
                    width={45}
                  />
                  <YAxis
                    yAxisId="kumuliert"
                    orientation="right"
                    tick={{ fontSize: 9, fill: '#374151' }}
                    unit=" h"
                    width={50}
                  />
                  <Tooltip content={<CockpitTooltip />} />
                  <Legend content={<CockpitLegend />} />

                  <Bar
                    yAxisId="monat"
                    dataKey="Soll"
                    fill="#cbd5e1"
                    radius={[2, 2, 0, 0]}
                    name="Soll (Monat)"
                    maxBarSize={14}
                  />
                  <Bar
                    yAxisId="monat"
                    dataKey="Ist"
                    fill={primaryColor}
                    fillOpacity={0.8}
                    radius={[2, 2, 0, 0]}
                    name="Ist (Monat)"
                    maxBarSize={14}
                  />

                  <Line
                    yAxisId="kumuliert"
                    type="monotone"
                    dataKey="SollKumuliert"
                    stroke="#94a3b8"
                    strokeWidth={2}
                    strokeDasharray="6 3"
                    dot={false}
                    name="Soll kumuliert"
                  />
                  <Line
                    yAxisId="kumuliert"
                    type="monotone"
                    dataKey="IstKumuliert"
                    stroke={primaryColor}
                    strokeWidth={2.5}
                    dot={false}
                    name="Ist kumuliert"
                    connectNulls={false}
                  />

                  {analysis.prognoseAktiv && (
                    <Line
                      yAxisId="kumuliert"
                      type="monotone"
                      dataKey="IstProjektion"
                      stroke={analysis.pFarbe.stroke}
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      dot={false}
                      name="Prognose"
                      connectNulls={true}
                    />
                  )}

                  {analysis.prognoseAktiv && analysis.zielErreichbar && (
                    <Line
                      yAxisId="kumuliert"
                      type="monotone"
                      dataKey="ZielProjektion"
                      stroke="#16a34a"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      dot={false}
                      name="Zieltempo"
                      connectNulls={true}
                    />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* --- Prognose-Box (kompakt) --- */}
          {analysis && analysis.prognoseAktiv && (
            <div id="cockpit-prognose" className={'rounded-xl border p-4 ' + analysis.pFarbe.bg + ' ' + (
              analysis.pFarbe.icon === 'rot' ? 'border-red-200' :
              analysis.pFarbe.icon === 'gelb' ? 'border-amber-200' : 'border-green-200'
            )}>

              {/* Header */}
              <div className="flex items-center gap-2 mb-3">
                <Target size={16} className={analysis.pFarbe.text} />
                <h4 className={'text-sm font-semibold ' + analysis.pFarbe.text}>
                  Zielerreichungs-Prognose
                </h4>
                <span className={'ml-auto text-xs font-bold px-2 py-0.5 rounded-full ' + (
                  analysis.pFarbe.icon === 'rot' ? 'bg-red-100 text-red-700' :
                  analysis.pFarbe.icon === 'gelb' ? 'bg-amber-100 text-amber-700' :
                  'bg-green-100 text-green-700'
                )}>
                  {analysis.pFarbe.icon === 'rot' ? 'Kritisch' :
                   analysis.pFarbe.icon === 'gelb' ? 'Gefaehrdet' : 'Erreichbar'}
                </span>
              </div>

              {/* Kompakte Hochrechnung */}
              <div className="bg-white bg-opacity-70 rounded-lg p-3">
                <div className="grid grid-cols-3 gap-3 mb-2">
                  <div>
                    <div className="text-[10px] text-gray-500 mb-0.5">Ziel (Plan)</div>
                    <div className="text-xs font-semibold text-gray-900">{fmtH(analysis.gesamtPlanStunden)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-500 mb-0.5">Bisher verbucht</div>
                    <div className="text-xs font-semibold text-gray-900">{fmtH(analysis.gesamtIstStunden)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-500 mb-0.5">Prognose gesamt</div>
                    <div className={'text-xs font-bold ' + analysis.pFarbe.text}>
                      {fmtH(Math.round(analysis.prognostizierteGesamtStunden))}
                    </div>
                  </div>
                </div>

                {/* Fortschrittsbalken */}
                <div className="w-full bg-gray-200 rounded-full h-1.5 mb-1">
                  <div
                    className="h-1.5 rounded-full transition-all"
                    style={{
                      width: Math.min(100, analysis.erreichungsgrad) + '%',
                      backgroundColor: analysis.pFarbe.stroke,
                    }}
                  />
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-gray-500">
                    Basis: {Math.round(analysis.basisStunden)} h/Monat (letzte {analysis.letzten3Count} Mon.)
                  </span>
                  <span className={'font-bold ' + analysis.pFarbe.text}>
                    {Math.min(analysis.erreichungsgrad, 100)}% des Foerderziels
                  </span>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* ================================================================ */}
        {/* RECHTE SPALTE: ZA-Tabelle (4 von 12 Spalten)                    */}
        {/* ================================================================ */}
        <div id="cockpit-right" className="lg:col-span-4 space-y-6">

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2
                className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2"
                style={{ color: primaryColor }}
              >
                <Banknote className="w-4 h-4" />
                Zahlungsanforderungen
              </h2>
              <button
                onClick={handleNeueZA}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 transition-colors"
                title="Neue Zahlungsanforderung erstellen"
              >
                <Plus className="w-3.5 h-3.5" />
                Neue ZA
              </button>
            </div>

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
              <div className={'text-center p-3 rounded-lg ' + (zaDifferenzGesamt > 0 ? 'bg-amber-50' : 'bg-gray-50')}>
                <div className={'text-[10px] font-medium mb-1 ' + (zaDifferenzGesamt > 0 ? 'text-amber-600' : 'text-gray-500')}>
                  Differenz
                </div>
                <div className={'text-xs font-bold ' + (zaDifferenzGesamt > 0 ? 'text-amber-800' : 'text-gray-600')}>
                  {formatEuro(zaDifferenzGesamt)}
                </div>
              </div>
            </div>

            {/* Projekt-Label */}
            {selectedProjekt && (
              <div className="flex items-center gap-2 mb-3 pb-1 border-b border-gray-200">
                <span className="text-xs font-semibold text-gray-900">
                  {selectedProjekt.short_name || selectedProjekt.name}
                </span>
                <span className="text-xs font-mono text-gray-400">
                  {selectedProjekt.funding_reference || ''}
                </span>
              </div>
            )}

            {/* ZA-Tabelle */}
            {filteredZA.length === 0 ? (
              <p className="text-sm text-gray-400">Keine Zahlungsanforderungen vorhanden.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500">
                      <th className="text-center py-1.5 px-2 font-medium">ZA</th>
                      <th className="text-center py-1.5 px-2 font-medium">Eingereicht</th>
                      <th className="text-center py-1.5 px-2 font-medium">Anforderung</th>
                      <th className="text-center py-1.5 px-2 font-medium">Zahlung</th>
                      <th className="text-center py-1.5 px-2 font-medium">Betrag</th>
                      <th className="text-center py-1.5 px-2 font-medium">Differenz</th>
                      <th className="text-center py-1.5 px-2 font-medium">Kommentar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredZA
                      .sort((a, b) => a.za_nummer - b.za_nummer)
                      .map(za => {
                      const differenz = (za.foerderbetrag_gesamt || 0) - (za.zahlungseingang_betrag || 0);
                      const hatAuszahlung = za.zahlungseingang_betrag != null && za.zahlungseingang_betrag > 0;
                      const hatAnforderung = za.foerderbetrag_gesamt != null && za.foerderbetrag_gesamt > 0;

                      return (
                        <tr key={za.id} className="border-t border-gray-100 hover:bg-gray-50">
                          <td
                            className="py-1.5 px-2 text-center font-medium text-blue-600 hover:text-blue-800 cursor-pointer underline"
                            onClick={() => handleZAClick(za)}
                            title="ZA bearbeiten"
                          >
                            {za.za_nummer}
                          </td>
                          <td className="py-1.5 px-2 text-center text-gray-600">
                            {za.eingereicht_am ? formatDate(za.eingereicht_am) : '-'}
                          </td>
                          <td className="py-1.5 px-2 text-center text-gray-700 font-medium">
                            {hatAnforderung ? formatEuro(za.foerderbetrag_gesamt) : '-'}
                          </td>
                          <td className="py-1.5 px-2 text-center text-gray-600">
                            {za.zahlungseingang_datum ? formatDate(za.zahlungseingang_datum) : '-'}
                          </td>
                          <td className="py-1.5 px-2 text-center text-green-700 font-medium">
                            {hatAuszahlung ? formatEuro(za.zahlungseingang_betrag) : '-'}
                          </td>
                          <td className={'py-1.5 px-2 text-center font-medium ' + (
                            !hatAuszahlung ? 'text-gray-400' :
                            differenz > 0 ? 'text-amber-600' : 'text-gray-400'
                          )}>
                            {hatAuszahlung
                              ? (differenz !== 0 ? formatEuro(differenz) : '0,00 EUR')
                              : '-'}
                          </td>
                          <td className="py-1.5 px-2 text-center text-gray-500 italic max-w-[120px] truncate">
                            {za.zahlungseingang_kommentar || '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
      <PortalFooter portal={portal} />
    </>
  );
}
