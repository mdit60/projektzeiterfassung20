// src/components/shared/ProjektFortschrittPanel.tsx
// ============================================================================
// PZE V7 - Projekt-Fortschritt Grafische Auswertung
// ============================================================================
// Version: 7.4.5-22
// v7.4.5-22: FIX Foerderbetrags-Berechnung
//   - bewilligte_summe als Deckel fuer abrufbare Foerdermittel
//   - Bei 100% Zielerreichung max = bewilligte_summe (nicht Plan x Foerdersatz)
//   - Verschenkt = bewilligte_summe - prognose (nicht Plan - prognose)
// Datum: 25. April 2026
//
// v7.4.5-20: Custom Legend fuer bessere Lesbarkeit
//   - Soll-Serien (hell) bekommen dunklere Label-Farbe in der Legende
//   - Farbkästchen bleibt original, nur Text-Label wird dunkler
//
// v7.4.5-19: Kontrast-Verbesserung - Anthrazit fuer alle Texte
//   - text-gray-700/500 -> text-gray-700 (#374151) fuer alle Beschriftungen
//   - Chart-Achsen tick fill: #374151
//   - Chart-Legende color: #374151
//   - Icons: text-gray-700 -> text-gray-700
//
// v7.4.5-18: PDF-Export auf window.print() umgestellt
//   - html2canvas inkompatibel mit Tailwind CSS v4 + Next.js (oklch-Problem)
//   - Neuer Ansatz: Druckfenster mit isoliertem HTML + Inline-SVG-Styles
//   - Dateiname wird als window.title gesetzt (macOS/Chrome: "Als PDF" nutzt Title)
//   - Druckbereich: Monatsverlauf + Zielerreichungs-Prognose
//   - pdfAreaRef und html2canvas/jspdf-Imports entfernt
//
// v7.4.5-17: FIX oklch - Stylesheets im DOM-Klon entfernen (hat nicht funktioniert)
// v7.4.5-12: Projektlaufzeit im Header + PDF-Export
//   - getComputedStyle liefert immer rgb()/rgba() - auch fuer oklch-Werte
//   - Diese RGB-Werte direkt als inline style setzen, kein replace durch transparent
//   - Behebt: Text und Zahlen fehlen im PDF
//
// v7.4.5-15: FIX PDF einseitig dynamische Seitenhoehe
//   - Tailwind CSS v4 nutzt oklch() - wird von html2canvas nicht unterstuetzt
//   - onclone-Handler ersetzt alle oklch()-Werte durch transparent
//   - Verhindert "Attempting to parse an unsupported color function oklch"
//
// v7.4.5-13: FIX html2canvas Import fuer Next.js
//   - Robuster Import: (module as any).default ?? module
//   - Behebt "can't access property split, file is undefined"
//
// v7.4.5-12: Projektlaufzeit im Header + PDF-Export
//   - Projektlaufzeit <Startdatum> - <Enddatum> neben FKZ und Foerderprogramm
//     (gilt fuer Einzel- und Multi-Projekt-Ansicht)
//   - Button "Als PDF speichern" im Monatsverlauf/Prognose-Bereich
//     Export via html2canvas + jsPDF
//     Dateiname: <Projektname>_<FKZ>_Projektfortschritt_JJJJMMDD.pdf
//     Druckbereich: Monatsverlauf-Diagramm + Zielerreichungs-Prognose
//
// v7.4.5-11: Szenario-Labels um MA-Anzahl ergaenzt
// v7.4.5-10: (Vorgaenger - siehe dort)
// ============================================================================

'use client';

import React, { useMemo, useState } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, Clock, Euro, Users, CheckCircle, AlertCircle, Target, Printer } from 'lucide-react';

// Foerderformat-Labels
const FUNDING_FORMAT_LABELS: Record<string, string> = {
  'ZIM':           'ZIM Einzelprojekt',
  'ZIM_KOOP':      'ZIM Kooperationsprojekt',
  'ZIM_NETZWERK':  'ZIM Netzwerk-Management',
  'ZIM_DS':        'ZIM Durchfuehrbarkeitsstudie',
  'BMBF':          'BMBF Foerderung',
  'BMBF_DS':       'BMBF Durchfuehrbarkeitsstudie',
};
const getFundingLabel = (format: string | null | undefined): string =>
  format ? (FUNDING_FORMAT_LABELS[format] || format) : '';

// GF-Positionen gemaess ZIM-Richtlinie (50%-Regel)
const GF_POSITIONS = ['Geschaeftsfuehrer', 'Gesellschafter-Geschaeftsfuehrer'];

// ============================================================================
// TYPEN
// ============================================================================

interface Project {
  id: string;
  name: string;
  short_name: string | null;
  funding_format: string | null;
  funding_reference?: string | null;
  start_date: string | null;
  end_date: string | null;
  foerdersatz: number | null;
  overhead_t: number | null;
  bewilligte_summe?: number | null;
}

interface WorkPackage {
  id: string;
  project_id: string;
  total_person_months: number | null;
  start_date: string | null;
  end_date: string | null;
}

interface WorkPackageAssignment {
  work_package_id: string;
  employee_id: string;
  planned_person_months: number;
}

interface ProjectAssignment {
  project_id: string;
  employee_id: string;
  hourly_rate: number | null;
}

interface Employee {
  id: string;
  display_name: string;
  weekly_hours?: number | null;
  position_title?: string | null;
}

interface TimesheetEntry {
  project_id: string;
  employee_id: string;
  work_date: string;
  hours: number;
  is_billable: boolean;
}

interface ProjektFortschrittPanelProps {
  portal: 'berater' | 'firma';
  projects: Project[];
  workPackages: WorkPackage[];
  wpAssignments: WorkPackageAssignment[];
  projectAssignments: ProjectAssignment[];
  employees: Employee[];
  timesheets: TimesheetEntry[];
  initialProjectId?: string;
}

// ============================================================================
// KONSTANTEN
// ============================================================================

const HOURS_PER_PM = 173.33;
const MAX_STUNDEN_MONAT_VOLLZEIT = 173.33;
const GF_FAKTOR = 0.5; // 50%-Regel fuer Geschaeftsfuehrer

const MONTH_NAMES_SHORT = [
  'Jan', 'Feb', 'Mrz', 'Apr', 'Mai', 'Jun',
  'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez',
];

const fmt1 = (v: number) =>
  v.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const fmtEur = (v: number) =>
  v.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' EUR';
const fmtH = (v: number) =>
  v.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' h';

// Datum DD.MM.YYYY
const fmtDateDE = (d: string | null | undefined): string => {
  if (!d) return '--';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '--';
  return dt.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

// ============================================================================
// HILFSFUNKTIONEN
// ============================================================================

const progressColor = (pct: number, timePct: number): string => {
  if (pct >= timePct - 5) return 'text-green-600';
  if (timePct - pct > 25) return 'text-red-600';
  return 'text-amber-600';
};

const progressBg = (pct: number, timePct: number): string => {
  if (pct >= timePct - 5) return 'bg-green-500';
  if (timePct - pct > 25) return 'bg-red-500';
  return 'bg-amber-500';
};

// Arbeitstage im Monat (Mo-Fr, ohne Feiertage - vereinfacht)
function arbeitstageImMonat(year: number, month: number): number {
  const days = new Date(year, month, 0).getDate();
  let count = 0;
  for (let d = 1; d <= days; d++) {
    const dow = new Date(year, month - 1, d).getDay();
    if (dow >= 1 && dow <= 5) count++;
  }
  return count;
}

// Maximale Projektstunden pro Monat fuer einen MA (GF-Regel beachten)
function maxProjektstundenMonat(emp: Employee | undefined): number {
  const waz = emp?.weekly_hours ?? 40;
  const basisMax = MAX_STUNDEN_MONAT_VOLLZEIT * (waz / 40);
  const istGF = emp?.position_title
    ? GF_POSITIONS.includes(emp.position_title)
    : false;
  return istGF ? basisMax * GF_FAKTOR : basisMax;
}

// Prueft ob MA ein GF ist
function istGeschaeftsfuehrer(emp: Employee | undefined): boolean {
  if (!emp?.position_title) return false;
  return GF_POSITIONS.includes(emp.position_title);
}

// ============================================================================
// PROGNOSE-FARBEN
// ============================================================================

function prognoseFarbe(erreichungsgrad: number): {
  stroke: string;
  bg: string;
  text: string;
  label: string;
  icon: 'gruen' | 'gelb' | 'rot';
} {
  if (erreichungsgrad >= 90) return {
    stroke: '#16a34a', bg: 'bg-green-50', text: 'text-green-700',
    label: 'Ziel erreichbar', icon: 'gruen',
  };
  if (erreichungsgrad >= 60) return {
    stroke: '#d97706', bg: 'bg-amber-50', text: 'text-amber-700',
    label: 'Ziel gefaehrdet', icon: 'gelb',
  };
  return {
    stroke: '#dc2626', bg: 'bg-red-50', text: 'text-red-700',
    label: 'Ziel kritisch', icon: 'rot',
  };
}

// ============================================================================
// CUSTOM TOOLTIPS
// ============================================================================

// ============================================================================
// CUSTOM LEGEND
// ============================================================================

const LEGENDE_LABEL_OVERRIDE: Record<string, string> = {
  'Soll (Monat)':   '#475569',
  'Soll kumuliert': '#475569',
  'Plan PM':        '#475569',
  'Plan EUR':       '#475569',
};

const CustomLegend = ({ payload }: any) => {
  if (!payload?.length) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '4px 16px', marginTop: 4 }}>
      {payload.map((entry: any, i: number) => {
        const labelColor = LEGENDE_LABEL_OVERRIDE[entry.value] || '#374151';
        const iconColor = entry.color || '#374151';
        const dashes = entry.payload?.strokeDasharray;
        const isLine = entry.type === 'line' || !!dashes;
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            {isLine ? (
              <svg width="20" height="10" style={{ flexShrink: 0 }}>
                <line x1="0" y1="5" x2="20" y2="5"
                  stroke={iconColor} strokeWidth="2.5"
                  strokeDasharray={dashes || '0'} />
              </svg>
            ) : (
              <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 2, backgroundColor: iconColor, flexShrink: 0 }} />
            )}
            <span style={{ fontSize: 11, color: labelColor }}>{entry.value}</span>
          </div>
        );
      })}
    </div>
  );
};

const PMTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs">
      <p className="font-semibold text-gray-900 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: {fmt1(p.value)} PM
        </p>
      ))}
    </div>
  );
};

const KostenTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs">
      <p className="font-semibold text-gray-900 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: {fmtEur(p.value)}
        </p>
      ))}
    </div>
  );
};

const MonatTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs">
      <p className="font-semibold text-gray-900 mb-2">{label}</p>
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
// KOMPONENTE
// ============================================================================

export default function ProjektFortschrittPanel({
  portal,
  projects,
  workPackages,
  wpAssignments,
  projectAssignments,
  employees,
  timesheets,
  initialProjectId,
}: ProjektFortschrittPanelProps) {

  const accentColor = portal === 'firma' ? '#16a34a' : '#2563eb';

  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    initialProjectId || projects[0]?.id || ''
  );
  const [isPrinting, setIsPrinting] = useState(false);

  // ID fuer den Druckbereich (Monatsverlauf + Prognose)
  const printAreaId = 'pfp-print-area';

  const project = projects.find(p => p.id === selectedProjectId) || projects[0];

  // ============================================================================
  // BERECHNUNGEN
  // ============================================================================

  const analysis = useMemo(() => {
    if (!project) return null;

    const projWPs = workPackages.filter(wp => wp.project_id === project.id);
    const projAssignments = projectAssignments.filter(pa => pa.project_id === project.id);
    const projTimesheets = timesheets.filter(
      t => t.project_id === project.id && t.is_billable !== false
    );

    const now = new Date();

    // ---- Laufzeit-Fortschritt ----
    let laufzeitPct = 0;
    let laufzeitLabel = '--';
    let gesamtMonate = 0;
    let vergangeMonate = 0;
    let verbleibendeMonateAb = 0;

    if (project.start_date && project.end_date) {
      const start = new Date(project.start_date);
      const end = new Date(project.end_date);
      const total = end.getTime() - start.getTime();
      const elapsed = Math.max(0, Math.min(total, now.getTime() - start.getTime()));
      laufzeitPct = total > 0 ? Math.round((elapsed / total) * 100) : 0;
      gesamtMonate = Math.round(total / (30.44 * 24 * 60 * 60 * 1000));
      vergangeMonate = Math.round(elapsed / (30.44 * 24 * 60 * 60 * 1000));
      const naechsterMonat = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const endMonat = new Date(end.getFullYear(), end.getMonth() + 1, 1);
      verbleibendeMonateAb = Math.max(0,
        Math.round((endMonat.getTime() - naechsterMonat.getTime()) / (30.44 * 24 * 60 * 60 * 1000))
      );
      laufzeitLabel = `${vergangeMonate} / ${gesamtMonate} Monate`;
    }

    // ---- PM-Fortschritt ----
    const gesamtPlanPM = projWPs.reduce((s, wp) => s + (wp.total_person_months || 0), 0);
    const gesamtPlanStunden = gesamtPlanPM * HOURS_PER_PM;
    const gesamtIstStunden = projTimesheets.reduce((s, t) => s + (t.hours || 0), 0);
    const gesamtIstPM = gesamtIstStunden / HOURS_PER_PM;
    const pmPct = gesamtPlanPM > 0 ? Math.round((gesamtIstPM / gesamtPlanPM) * 100) : 0;

    // ---- Kosten-Fortschritt ----
    const overhead = (project.overhead_t || 0) / 100;
    let gesamtPlanKosten = 0;
    let gesamtIstKosten = 0;

    projAssignments.forEach(pa => {
      const rate = pa.hourly_rate || 0;
      if (rate === 0) return;
      const maWPAs = wpAssignments.filter(wpa => {
        const wp = projWPs.find(w => w.id === wpa.work_package_id);
        return wp && wpa.employee_id === pa.employee_id;
      });
      const planPM = maWPAs.reduce((s, wpa) => s + (wpa.planned_person_months || 0), 0);
      gesamtPlanKosten += planPM * HOURS_PER_PM * rate * (1 + overhead);
      const istH = projTimesheets
        .filter(t => t.employee_id === pa.employee_id)
        .reduce((s, t) => s + (t.hours || 0), 0);
      gesamtIstKosten += istH * rate * (1 + overhead);
    });

    const kostenPct =
      gesamtPlanKosten > 0 ? Math.round((gesamtIstKosten / gesamtPlanKosten) * 100) : 0;

    // ---- MA-Daten fuer Balkendiagramme ----
    const maData = projAssignments
      .map(pa => {
        const emp = employees.find(e => e.id === pa.employee_id);
        const name = emp?.display_name.split(',')[0] || 'MA';
        const maWPAs = wpAssignments.filter(wpa => {
          const wp = projWPs.find(w => w.id === wpa.work_package_id);
          return wp && wpa.employee_id === pa.employee_id;
        });
        const planPM = maWPAs.reduce((s, wpa) => s + (wpa.planned_person_months || 0), 0);
        const istH = projTimesheets
          .filter(t => t.employee_id === pa.employee_id)
          .reduce((s, t) => s + (t.hours || 0), 0);
        const istPM = istH / HOURS_PER_PM;
        const rate = pa.hourly_rate || 0;
        const planKosten = planPM * HOURS_PER_PM * rate * (1 + overhead);
        const istKosten = istH * rate * (1 + overhead);
        return {
          name,
          'Plan PM': Math.round(planPM * 10) / 10,
          'Ist PM': Math.round(istPM * 10) / 10,
          'Plan EUR': Math.round(planKosten),
          'Ist EUR': Math.round(istKosten),
        };
      })
      .filter(d => d['Plan PM'] > 0 || d['Ist PM'] > 0);

    // ---- Monatsverlauf: AP-genaue Soll-Verteilung ----
    type MonatDatum = {
      monat: string;
      year: number;
      month: number;
      istVergangenheit: boolean;
      'Soll': number;
      'Ist': number;
      'Soll kumuliert': number;
      'Ist kumuliert': number | undefined;
      'Ist Projektion'?: number;
      'Ziel Projektion'?: number;
    };

    let monatData: MonatDatum[] = [];

    // ---- Projektion: Durchschnitt letzte 3 abgeschlossene Monate ----
    const istMonatMap: Record<string, number> = {};
    projTimesheets.forEach(t => {
      const d = new Date(t.work_date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      istMonatMap[key] = (istMonatMap[key] || 0) + t.hours;
    });

    const vergangeneMonatKeys = Object.keys(istMonatMap)
      .filter(key => {
        const [y, m] = key.split('-').map(Number);
        const monatsEnde = new Date(y, m, 0);
        return monatsEnde < now;
      })
      .sort()
      .reverse();

    const letzten3 = vergangeneMonatKeys.slice(0, 3);
    const basisStunden = letzten3.length > 0
      ? letzten3.reduce((s, k) => s + (istMonatMap[k] || 0), 0) / letzten3.length
      : 0;

    const prognostizierteGesamtStunden = gesamtIstStunden + basisStunden * verbleibendeMonateAb;
    const erreichungsgrad = gesamtPlanStunden > 0
      ? Math.round((prognostizierteGesamtStunden / gesamtPlanStunden) * 100)
      : 0;
    const fehlendStunden = Math.max(0, gesamtPlanStunden - prognostizierteGesamtStunden);
    const pFarbe = prognoseFarbe(Math.min(erreichungsgrad, 100));

    // ---- Beteiligung & Intensitaet ----
    const aktiveMaIds = new Set<string>();
    projTimesheets.forEach(t => {
      const d = new Date(t.work_date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (letzten3.includes(key)) aktiveMaIds.add(t.employee_id);
    });

    const alleMAIds = Array.from(new Set(projAssignments.map(pa => pa.employee_id)));
    const aktivCount = aktiveMaIds.size;
    const gesamtMACount = alleMAIds.length;

    // Arbeitstage der letzten 3 Monate
    const gesamtArbeitstage3M = letzten3.reduce((s, key) => {
      const [y, m] = key.split('-').map(Number);
      return s + arbeitstageImMonat(y, m);
    }, 0);

    const istHGesamt3M = letzten3.reduce((s, k) => s + (istMonatMap[k] || 0), 0);

    // Oe h/Tag: Team gesamt und je aktivem MA
    const istHProTagTeam = gesamtArbeitstage3M > 0 ? istHGesamt3M / gesamtArbeitstage3M : 0;
    const istHProTagJeMA = (gesamtArbeitstage3M > 0 && aktivCount > 0)
      ? istHGesamt3M / gesamtArbeitstage3M / aktivCount
      : 0;

    // ---- MA-individuelle Obergrenzen ----
    const maObergrenzen = alleMAIds.map(empId => {
      const emp = employees.find(e => e.id === empId);
      const maxProMonat = maxProjektstundenMonat(emp);
      const isGF = istGeschaeftsfuehrer(emp);
      return { empId, maxProMonat, isGF, emp };
    });

    // Team-Maximum gesamt pro Monat
    const teamMaxProMonat = maObergrenzen.reduce((s, ma) => s + ma.maxProMonat, 0);

    const gfCount = maObergrenzen.filter(ma => ma.isGF).length;
    const normalMACount = gesamtMACount - gfCount;

    const avgMaxProTagGF = gfCount > 0
      ? maObergrenzen.filter(ma => ma.isGF).reduce((s, ma) => s + ma.maxProMonat, 0) / gfCount / 21.7
      : 0;
    const avgMaxProTagMA = normalMACount > 0
      ? maObergrenzen.filter(ma => !ma.isGF).reduce((s, ma) => s + ma.maxProMonat, 0) / normalMACount / 21.7
      : 0;

    // ---- Restliche Arbeitstage bis Projektende ----
    let restArbeitstage = 0;
    if (project.end_date) {
      const projEnd = new Date(project.end_date);
      const startCalc = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const cur2 = new Date(startCalc);
      while (cur2 <= projEnd) {
        restArbeitstage += arbeitstageImMonat(cur2.getFullYear(), cur2.getMonth() + 1);
        cur2.setMonth(cur2.getMonth() + 1);
      }
    }

    const restStunden = Math.max(0, gesamtPlanStunden - gesamtIstStunden);

    // ---- Szenarien ----
    const szenarien: Array<{
      label: string;
      hProTagJeMA: number;
      teamHProTag: number;
      erreichbar: boolean;
      hinweis?: string;
    }> = [];

    if (restArbeitstage > 0) {

      const teamMaxErreichbar = teamMaxProMonat * verbleibendeMonateAb;
      const maxErreichbarGesamt = gesamtIstStunden + teamMaxErreichbar;
      const maxErreichbarPct = gesamtPlanStunden > 0
        ? Math.round((maxErreichbarGesamt / gesamtPlanStunden) * 100)
        : 0;

      szenarien.push({
        label: `Weiter wie bisher (${aktivCount} aktive MA)`,
        hProTagJeMA: Math.round(istHProTagJeMA * 10) / 10,
        teamHProTag: Math.round(istHProTagTeam * 10) / 10,
        erreichbar: erreichungsgrad >= 90,
      });

      if (maxErreichbarPct < 100) {
        szenarien.push({
          label: `Vollast alle ${gesamtMACount} MA (Maximum)`,
          hProTagJeMA: Math.round((teamMaxProMonat / gesamtMACount / 21.7) * 10) / 10,
          teamHProTag: Math.round((teamMaxProMonat / 21.7) * 10) / 10,
          erreichbar: maxErreichbarPct >= 90,
          hinweis: maxErreichbarPct < 90
            ? `Selbst bei Vollast: max. ${maxErreichbarPct}% des Foerderziels erreichbar`
            : undefined,
        });
      }

      if (restArbeitstage > 0 && restStunden > 0 && maxErreichbarPct >= 90) {
        const benoetigtTeamHProTag = restStunden / restArbeitstage;
        const benoetigtJeMAHProTag = gesamtMACount > 0
          ? benoetigtTeamHProTag / gesamtMACount
          : 0;

        const gfMaxHProTag = gfCount > 0 ? avgMaxProTagGF : 0;
        const maMaxHProTag = normalMACount > 0 ? avgMaxProTagMA : 0;

        const erreichbar = (gfCount === 0 || benoetigtJeMAHProTag <= gfMaxHProTag) &&
                           (normalMACount === 0 || benoetigtJeMAHProTag <= maMaxHProTag);

        let hinweis: string | undefined;
        if (!erreichbar) {
          if (gfCount > 0 && benoetigtJeMAHProTag > gfMaxHProTag) {
            hinweis = `GF: max. ${Math.round(gfMaxHProTag * 10) / 10} h/Tag moeglich (50%-Regel)`;
          }
        }

        if (szenarien.length < 3) {
          szenarien.push({
            label: `Fuer 100% Ziel (alle ${gesamtMACount} MA)`,
            hProTagJeMA: Math.round(benoetigtJeMAHProTag * 10) / 10,
            teamHProTag: Math.round(benoetigtTeamHProTag * 10) / 10,
            erreichbar,
            hinweis,
          });
        }
      }
    }

    // ---- Kosten-Prognose ----
    const foerdersatz = project.foerdersatz ?? null;
    const bewilligteSumme = project.bewilligte_summe ?? null;
    const kostenDatenVorhanden = foerdersatz !== null && gesamtPlanKosten > 0 && gesamtIstKosten > 0;

    let prognostizierteGesamtKosten = gesamtIstKosten;

    if (kostenDatenVorhanden && prognostizierteGesamtStunden > gesamtIstStunden) {
      const progDeltaStunden = prognostizierteGesamtStunden - gesamtIstStunden;
      if (gesamtIstStunden > 0) {
        const avgStundensatz = gesamtIstKosten / gesamtIstStunden;
        prognostizierteGesamtKosten = gesamtIstKosten + progDeltaStunden * avgStundensatz;
      } else {
        const avgPlanStundensatz = gesamtPlanKosten / gesamtPlanStunden;
        prognostizierteGesamtKosten = prognostizierteGesamtStunden * avgPlanStundensatz;
      }
    }

    const fs = (foerdersatz ?? 0) / 100;

    // Foerderbetrag aus Plankosten (rechnerisch)
    const foerderbarRechnerischProg = Math.min(prognostizierteGesamtKosten, gesamtPlanKosten) * fs;
    const foerderbarRechnerischPlan = gesamtPlanKosten * fs;

    // Gedeckelt durch bewilligte Fördersumme (niemals mehr als bewilligt!)
    const deckel = bewilligteSumme ?? Infinity;
    const foerderbarProg = Math.min(foerderbarRechnerischProg, deckel);
    const foerderbarPlan = Math.min(foerderbarRechnerischPlan, deckel);

    // Verschenkt = was von der bewilligten Summe nicht abgerufen wird
    // Basis ist bewilligte_summe falls vorhanden, sonst rechnerischer Plan
    const foerderMaximum = bewilligteSumme ?? foerderbarRechnerischPlan;
    const verschenktProg = Math.max(0, foerderMaximum - foerderbarProg);
    const verschenktZiel  = 0;

    // ---- Zieltempo ----
    const teamMaxErreichbarGesamt = gesamtIstStunden + teamMaxProMonat * verbleibendeMonateAb;
    const maxErreichbarPct = gesamtPlanStunden > 0
      ? Math.round((teamMaxErreichbarGesamt / gesamtPlanStunden) * 100)
      : 0;
    const zielErreichbar = maxErreichbarPct >= 90;
    const zielStundenProMonat = (zielErreichbar && verbleibendeMonateAb > 0)
      ? restStunden / verbleibendeMonateAb
      : 0;

    // ---- Monatsverlauf aufbauen ----
    if (project.start_date && project.end_date) {
      const projStart = new Date(project.start_date);
      const projEnd = new Date(project.end_date);

      const months: { year: number; month: number; label: string }[] = [];
      const cur = new Date(projStart.getFullYear(), projStart.getMonth(), 1);
      const endMonth = new Date(projEnd.getFullYear(), projEnd.getMonth(), 1);
      while (cur <= endMonth) {
        months.push({
          year: cur.getFullYear(),
          month: cur.getMonth() + 1,
          label: `${MONTH_NAMES_SHORT[cur.getMonth()]} ${String(cur.getFullYear()).slice(-2)}`,
        });
        cur.setMonth(cur.getMonth() + 1);
      }

      const sollMap: Record<string, number> = {};
      projWPs.forEach(wp => {
        if (!wp.start_date || !wp.end_date) return;
        const apStart = new Date(wp.start_date);
        const apEnd = new Date(wp.end_date);
        const apWPAs = wpAssignments.filter(wpa => wpa.work_package_id === wp.id);
        const apTotalPM = apWPAs.reduce((s, wpa) => s + (wpa.planned_person_months || 0), 0);
        const apTotalHours = apTotalPM * HOURS_PER_PM;
        if (apTotalHours === 0) return;
        const apDurationDays =
          (apEnd.getTime() - apStart.getTime()) / (1000 * 60 * 60 * 24) + 1;
        if (apDurationDays <= 0) return;
        const hoursPerDay = apTotalHours / apDurationDays;
        months.forEach(({ year, month }) => {
          const monthStart = new Date(year, month - 1, 1);
          const monthEnd = new Date(year, month, 0);
          if (apEnd < monthStart || apStart > monthEnd) return;
          const overlapStart = apStart > monthStart ? apStart : monthStart;
          const overlapEnd = apEnd < monthEnd ? apEnd : monthEnd;
          const overlapDays =
            (overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24) + 1;
          const key = `${year}-${String(month).padStart(2, '0')}`;
          sollMap[key] = (sollMap[key] || 0) + hoursPerDay * overlapDays;
        });
      });

      let sollKumuliert = 0;
      let istKumuliert = 0;
      let projektionKumuliert = gesamtIstStunden;
      let zielProjektionKumuliert = gesamtIstStunden;
      const aktuellerMonatKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      monatData = months.map(({ year, month, label }) => {
        const key = `${year}-${String(month).padStart(2, '0')}`;
        const soll = Math.round(sollMap[key] || 0);
        const ist = Math.round(istMonatMap[key] || 0);
        sollKumuliert += soll;
        istKumuliert += ist;

        const monatsEnde = new Date(year, month, 0);
        const istVergangenheit = monatsEnde < now;
        const istAktuell = key === aktuellerMonatKey;

        let projektion: number | undefined = undefined;
        let zielProjektion: number | undefined = undefined;

        if (!istVergangenheit || istAktuell) {
          if (istAktuell) {
            projektion = istKumuliert;
            projektionKumuliert = istKumuliert;
            zielProjektion = istKumuliert;
            zielProjektionKumuliert = istKumuliert;
          } else {
            projektionKumuliert += basisStunden;
            projektion = Math.round(Math.min(projektionKumuliert, gesamtPlanStunden));
            if (zielErreichbar && zielStundenProMonat > 0) {
              zielProjektionKumuliert += zielStundenProMonat;
              zielProjektion = Math.round(Math.min(zielProjektionKumuliert, gesamtPlanStunden));
            }
          }
        }

        return {
          monat: label,
          year,
          month,
          istVergangenheit,
          'Soll': soll,
          'Ist': ist,
          'Soll kumuliert': Math.round(sollKumuliert),
          'Ist kumuliert': istVergangenheit ? Math.round(istKumuliert) : undefined,
          'Ist Projektion': projektion,
          'Ziel Projektion': zielProjektion,
        };
      });
    }

    const prognoseAktiv = laufzeitPct > 10 && gesamtPlanStunden > 0;

    return {
      laufzeitPct,
      laufzeitLabel,
      vergangeMonate,
      gesamtMonate,
      pmPct,
      gesamtPlanPM,
      gesamtIstPM,
      gesamtPlanStunden,
      gesamtIstStunden,
      kostenPct,
      gesamtPlanKosten,
      gesamtIstKosten,
      maData,
      monatData,
      prognoseAktiv,
      erreichungsgrad,
      fehlendStunden,
      prognostizierteGesamtStunden,
      pFarbe,
      basisStunden,
      letzten3Count: letzten3.length,
      zielErreichbar,
      zielStundenProMonat,
      kostenDatenVorhanden,
      foerdersatz,
      foerderbarProg,
      foerderbarPlan,
      verschenktProg,
      verschenktZiel,
      prognostizierteGesamtKosten,
      aktivCount,
      gesamtMACount,
      gfCount,
      normalMACount,
      istHProTagTeam,
      istHProTagJeMA,
      avgMaxProTagGF,
      avgMaxProTagMA,
      teamMaxProMonat,
      szenarien,
      verbleibendeMonateAb,
    };
  }, [project, workPackages, wpAssignments, projectAssignments, employees, timesheets]);

  if (!project || !analysis) {
    return (
      <div className="p-8 text-center text-gray-700">
        Kein Projekt ausgewaehlt.
      </div>
    );
  }

  const xAxisInterval = Math.max(0, Math.floor(analysis.monatData.length / 12) - 1);

  // ============================================================================
  // DRUCK / PDF-EXPORT via window.print()
  // ============================================================================

  const handlePrint = () => {
    const el = document.getElementById(printAreaId);
    if (!el) return;
    setIsPrinting(true);

    const today = new Date();
    const dateStr = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, '0'),
      String(today.getDate()).padStart(2, '0'),
    ].join('');
    const projName = (project.short_name || project.name).replace(/[^a-zA-Z0-9_-]/g, '_');
    const fkz = (project.funding_reference || 'keinFKZ').replace(/[^a-zA-Z0-9_-]/g, '_');
    const docTitle = `${projName}_${fkz}_Projektfortschritt_${dateStr}`;

    // Alle Styles des aktuellen Dokuments sammeln
    const styles = Array.from(document.styleSheets)
      .map(ss => {
        try {
          return Array.from(ss.cssRules).map(r => r.cssText).join('\n');
        } catch { return ''; }
      })
      .join('\n');

    const printWin = window.open('', '_blank', 'width=1200,height=900');
    if (!printWin) { setIsPrinting(false); return; }

    printWin.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${docTitle}</title>
  <style>
    ${styles}
    @page { size: A4 landscape; margin: 10mm; }
    @media print {
      body { margin: 0; padding: 0; background: white; }
      button { display: none !important; }
    }
    body { background: white; font-family: sans-serif; padding: 10px; }
  </style>
</head>
<body>
  ${el.outerHTML}
</body>
</html>`);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => {
      printWin.print();
      printWin.close();
      setIsPrinting(false);
    }, 600);
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="space-y-5">

      {/* Projekt-Auswahl oder Projektname */}
      {projects.length > 1 ? (
        <div className="flex items-center gap-3 flex-wrap">
          <label className="text-sm font-medium text-gray-700">Projekt:</label>
          <select
            value={selectedProjectId}
            onChange={e => setSelectedProjectId(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
          >
            {projects.map(p => (
              <option key={p.id} value={p.id}>
                {p.short_name || p.name}
                {p.funding_reference ? ` (${p.funding_reference})` : ''}
              </option>
            ))}
          </select>
          {/* Laufzeit auch beim Multi-Projekt-Dropdown */}
          {(project.start_date || project.end_date) && (
            <span className="text-xs text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
              {fmtDateDE(project.start_date)} &ndash; {fmtDateDE(project.end_date)}
            </span>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2 flex-wrap pb-3 border-b border-gray-100">
          <span className="text-base font-bold text-gray-900">
            {project.short_name || project.name}
          </span>
          {project.funding_reference && (
            <span className="text-sm text-gray-700 font-mono bg-gray-100 px-2 py-0.5 rounded">
              {project.funding_reference}
            </span>
          )}
          {project.funding_format && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">
              {getFundingLabel(project.funding_format)}
            </span>
          )}
          {/* NEU: Projektlaufzeit */}
          {(project.start_date || project.end_date) && (
            <span className="text-xs text-gray-700 bg-gray-100 px-2 py-0.5 rounded ml-1">
              {fmtDateDE(project.start_date)} &ndash; {fmtDateDE(project.end_date)}
            </span>
          )}
        </div>
      )}

      {/* ---- 3 Kennzahl-Kacheln ---- */}
      <div className="grid grid-cols-3 gap-4">

        {/* Laufzeit */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={16} className="text-gray-700" />
            <span className="text-xs font-medium text-gray-700 uppercase tracking-wide">
              Laufzeit
            </span>
          </div>
          <div className="text-3xl font-bold mb-1" style={{ color: accentColor }}>
            {analysis.laufzeitPct}%
          </div>
          <div className="text-xs text-gray-700 mb-2">{analysis.laufzeitLabel}</div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div
              className="h-2 rounded-full transition-all"
              style={{
                width: `${Math.min(100, analysis.laufzeitPct)}%`,
                backgroundColor: accentColor,
              }}
            />
          </div>
        </div>

        {/* PM-Fortschritt */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users size={16} className="text-gray-700" />
            <span className="text-xs font-medium text-gray-700 uppercase tracking-wide">
              Personenmonate
            </span>
          </div>
          <div
            className={`text-3xl font-bold mb-1 ${progressColor(
              analysis.pmPct,
              analysis.laufzeitPct
            )}`}
          >
            {analysis.pmPct}%
          </div>
          <div className="text-xs text-gray-700 mb-2">
            {fmt1(analysis.gesamtIstPM)} / {fmt1(analysis.gesamtPlanPM)} PM
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${progressBg(
                analysis.pmPct,
                analysis.laufzeitPct
              )}`}
              style={{ width: `${Math.min(100, analysis.pmPct)}%` }}
            />
          </div>
        </div>

        {/* Kosten-Fortschritt */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Euro size={16} className="text-gray-700" />
            <span className="text-xs font-medium text-gray-700 uppercase tracking-wide">
              Kosten
            </span>
          </div>
          <div
            className={`text-3xl font-bold mb-1 ${progressColor(
              analysis.kostenPct,
              analysis.laufzeitPct
            )}`}
          >
            {analysis.kostenPct}%
          </div>
          <div className="text-xs text-gray-700 mb-2">
            {fmtEur(analysis.gesamtIstKosten)} / {fmtEur(analysis.gesamtPlanKosten)}
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${progressBg(
                analysis.kostenPct,
                analysis.laufzeitPct
              )}`}
              style={{ width: `${Math.min(100, analysis.kostenPct)}%` }}
            />
          </div>
        </div>
      </div>

      {/* ---- Balkendiagramme MA ---- */}
      {analysis.maData.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-4">
              Personenmonate je Mitarbeiter (Plan vs. Ist)
            </h4>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={analysis.maData}
                margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#374151" }} />
                <YAxis tick={{ fontSize: 11, fill: "#374151" }} unit=" PM" width={45} />
                <Tooltip content={<PMTooltip />} />
                <Legend content={<CustomLegend />} />
                <Bar dataKey="Plan PM" fill="#e2e8f0" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Ist PM" fill={accentColor} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-4">
              Personalkosten je Mitarbeiter (Plan vs. Ist)
            </h4>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={analysis.maData}
                margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#374151" }} />
                <YAxis
                  tick={{ fontSize: 11, fill: "#374151" }}
                  tickFormatter={v => `${(v / 1000).toFixed(0)}k`}
                  width={45}
                />
                <Tooltip content={<KostenTooltip />} />
                <Legend content={<CustomLegend />} />
                <Bar dataKey="Plan EUR" fill="#e2e8f0" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Ist EUR" fill={accentColor} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ---- PDF-Export-Bereich (Monatsverlauf + Prognose) ---- */}
      <div id={printAreaId} className="space-y-5">

        {/* ---- Monatsverlauf: ComposedChart ---- */}
        {analysis.monatData.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            {/* Header mit PDF-Button */}
            <div className="flex items-start justify-between mb-1">
              <div>
                <h4 className="text-sm font-semibold text-gray-700">
                  Monatsverlauf Projektstunden
                </h4>
                <p className="text-xs text-gray-700 mt-0.5">
                  Saeulen: geplante vs. erfasste Stunden je Monat &nbsp;&middot;&nbsp;
                  Linien: kumulierter Soll- und Ist-Verlauf
                  {analysis.prognoseAktiv && (
                    <> &nbsp;&middot;&nbsp;
                      <span style={{ color: analysis.pFarbe.stroke }}>
                        Gestrichelt: Prognose bei aktuellem Tempo
                      </span>
                    </>
                  )}
                </p>
              </div>
              <button
                onClick={handlePrint}
                disabled={isPrinting}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ml-4 shrink-0"
                title="Monatsverlauf und Prognose drucken / als PDF speichern"
              >
                <Printer size={14} />
                {isPrinting ? 'Wird vorbereitet...' : 'Drucken / PDF'}
              </button>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart
                data={analysis.monatData}
                margin={{ top: 10, right: 60, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="monat" tick={{ fontSize: 10, fill: "#374151" }} interval={xAxisInterval} />
                <YAxis yAxisId="monat" orientation="left" tick={{ fontSize: 10, fill: "#374151" }} unit=" h" width={52} />
                <YAxis yAxisId="kumuliert" orientation="right" tick={{ fontSize: 10, fill: "#374151" }} unit=" h" width={60} />
                <Tooltip content={<MonatTooltip />} />
                <Legend content={<CustomLegend />} />

                <Bar yAxisId="monat" dataKey="Soll" fill="#cbd5e1" radius={[2, 2, 0, 0]} name="Soll (Monat)" maxBarSize={16} />
                <Bar yAxisId="monat" dataKey="Ist" fill={accentColor} fillOpacity={0.8} radius={[2, 2, 0, 0]} name="Ist (Monat)" maxBarSize={16} />

                <Line yAxisId="kumuliert" type="monotone" dataKey="Soll kumuliert" stroke="#94a3b8" strokeWidth={2} strokeDasharray="6 3" dot={false} name="Soll kumuliert" />
                <Line yAxisId="kumuliert" type="monotone" dataKey="Ist kumuliert" stroke={accentColor} strokeWidth={2.5} dot={false} name="Ist kumuliert" connectNulls={false} />

                {analysis.prognoseAktiv && (
                  <Line yAxisId="kumuliert" type="monotone" dataKey="Ist Projektion" stroke={analysis.pFarbe.stroke} strokeWidth={2} strokeDasharray="4 4" dot={false} name="Prognose kumuliert" connectNulls={true} />
                )}

                {analysis.prognoseAktiv && analysis.zielErreichbar && (
                  <Line yAxisId="kumuliert" type="monotone" dataKey="Ziel Projektion" stroke="#16a34a" strokeWidth={2} strokeDasharray="4 4" dot={false} name="Zieltempo kumuliert" connectNulls={true} />
                )}
              </ComposedChart>
            </ResponsiveContainer>
            <p className="text-xs text-gray-700 mt-2">
              Nur foerderbare Projektstunden. Soll-Verteilung gleichmaessig ueber AP-Laufzeit je Arbeitspaket.
            </p>
          </div>
        )}

        {/* ---- Zielerreichungs-Prognose ---- */}
        {analysis.prognoseAktiv && (
          <div className={`rounded-xl border p-4 ${analysis.pFarbe.bg} ${
            analysis.pFarbe.icon === 'rot' ? 'border-red-200' :
            analysis.pFarbe.icon === 'gelb' ? 'border-amber-200' : 'border-green-200'
          }`}>

            {/* Header */}
            <div className="flex items-center gap-2 mb-4">
              <Target size={18} className={analysis.pFarbe.text} />
              <h4 className={`text-sm font-semibold ${analysis.pFarbe.text}`}>
                Zielerreichungs-Prognose
              </h4>
              <span className={`ml-auto text-xs font-bold px-2.5 py-1 rounded-full ${
                analysis.pFarbe.icon === 'rot' ? 'bg-red-100 text-red-700' :
                analysis.pFarbe.icon === 'gelb' ? 'bg-amber-100 text-amber-700' :
                'bg-green-100 text-green-700'
              }`}>
                {analysis.pFarbe.icon === 'rot' ? '\u26a0 Kritisch' :
                 analysis.pFarbe.icon === 'gelb' ? '\u26a0 Gefaehrdet' : '\u2713 Erreichbar'}
              </span>
            </div>

            <div className="space-y-3">

              {/* Block 1: Hochrechnung (volle Breite) */}
              <div className="bg-white bg-opacity-70 rounded-lg p-4">
                <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">
                  Hochrechnung
                </p>
                <div className="grid grid-cols-3 gap-4 mb-3">
                  <div>
                    <div className="text-xs text-gray-700 mb-0.5">Ziel (Plan)</div>
                    <div className="text-sm font-semibold text-gray-900">{fmtH(analysis.gesamtPlanStunden)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-700 mb-0.5">Bisher verbucht</div>
                    <div className="text-sm font-semibold text-gray-900">{fmtH(analysis.gesamtIstStunden)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-700 mb-0.5">Prognose gesamt</div>
                    <div className={`text-sm font-bold ${analysis.pFarbe.text}`}>
                      {fmtH(Math.round(analysis.prognostizierteGesamtStunden))}
                    </div>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, analysis.erreichungsgrad)}%`,
                      backgroundColor: analysis.pFarbe.stroke,
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-700">
                    Basis: {Math.round(analysis.basisStunden)} h/Monat (Team, letzte {analysis.letzten3Count} Monate)
                  </span>
                  <span className={`font-bold ${analysis.pFarbe.text}`}>
                    {Math.min(analysis.erreichungsgrad, 100)}% des Foerderziels
                  </span>
                </div>
                {analysis.fehlendStunden > 0 && (
                  <div className="text-xs text-gray-700 mt-1">
                    Fehlende Stunden bei aktuellem Tempo:
                    <span className="font-semibold text-gray-700 ml-1">{fmtH(Math.round(analysis.fehlendStunden))}</span>
                  </div>
                )}
              </div>

              {/* Block 2: 3 Spalten - Situation / Szenarien / Konsequenzen */}
              <div className="grid grid-cols-3 gap-3">

                {/* Spalte 1: Aktuelle Situation */}
                <div className="bg-white bg-opacity-70 rounded-lg p-4">
                  <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">
                    Aktuelle Situation
                  </p>
                  <div className="space-y-2">
                    <div>
                      <div className="text-xs text-gray-700">Aktive Mitarbeiter</div>
                      <div className={`text-sm font-semibold mt-0.5 ${
                        analysis.aktivCount < analysis.gesamtMACount ? 'text-amber-600' : 'text-green-600'
                      }`}>
                        {analysis.aktivCount} / {analysis.gesamtMACount}
                        {analysis.gfCount > 0 && (
                          <span className="text-gray-700 font-normal text-xs ml-1">
                            ({analysis.gfCount} GF + {analysis.normalMACount} MA)
                          </span>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-700">Intensitaet je MA</div>
                      <div className="text-sm font-semibold text-gray-900 mt-0.5">
                        {analysis.istHProTagJeMA > 0
                          ? `${Math.round(analysis.istHProTagJeMA * 10) / 10} h/Tag`
                          : '--'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-700">Team gesamt</div>
                      <div className="text-sm font-semibold text-gray-900 mt-0.5">
                        {analysis.istHProTagTeam > 0
                          ? `${Math.round(analysis.istHProTagTeam * 10) / 10} h/Tag`
                          : '--'}
                      </div>
                    </div>
                    {analysis.gfCount > 0 && (
                      <div className="pt-2 border-t border-gray-100 space-y-1">
                        <p className="text-xs text-gray-700">Max. moeglich je Tag:</p>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-700">GF (50%-Regel)</span>
                          <span className="font-medium text-gray-700">
                            {Math.round(analysis.avgMaxProTagGF * 10) / 10} h
                          </span>
                        </div>
                        {analysis.normalMACount > 0 && (
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-700">Mitarbeiter</span>
                            <span className="font-medium text-gray-700">
                              {Math.round(analysis.avgMaxProTagMA * 10) / 10} h
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-gray-700 mt-3 pt-2 border-t border-gray-100">
                    Basis: letzte {analysis.letzten3Count} abgeschl. Monate
                  </div>
                </div>

                {/* Spalte 2: Was waere noetig? */}
                <div className="bg-white bg-opacity-70 rounded-lg p-4">
                  <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">
                    Was waere noetig?
                  </p>
                  {analysis.szenarien.length > 0 ? (
                    <div className="space-y-4">
                      {analysis.szenarien.map((sz, i) => (
                        <div key={i} className="flex items-start gap-2">
                          {sz.erreichbar
                            ? <CheckCircle size={14} className="text-green-500 mt-0.5 shrink-0" />
                            : <AlertCircle size={14} className="text-red-400 mt-0.5 shrink-0" />
                          }
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-gray-700">{sz.label}</div>
                            <div className={`text-sm font-bold mt-0.5 ${sz.erreichbar ? 'text-green-700' : 'text-red-600'}`}>
                              {sz.hProTagJeMA > 0 ? `${sz.hProTagJeMA} h/Tag je MA` : 'wie bisher'}
                            </div>
                            <div className="text-xs text-gray-700">
                              Team: {sz.teamHProTag} h/Tag
                            </div>
                            {sz.hinweis && (
                              <div className="text-xs text-red-500 mt-0.5">{sz.hinweis}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-700">Keine Szenarien verfuegbar.</p>
                  )}
                  {analysis.verbleibendeMonateAb > 0 && (
                    <div className="text-xs text-gray-700 mt-3 pt-2 border-t border-gray-100">
                      Noch {analysis.verbleibendeMonateAb} Monate bis Projektende
                    </div>
                  )}
                  <div className="text-xs text-gray-700 mt-2 pt-2 border-t border-gray-100 italic">
                    Durchschnittswerte zur Orientierung. Individuelle Buchung
                    je Mitarbeiter gemaess Arbeitsplan.
                  </div>
                </div>

                {/* Spalte 3: Foerder-Konsequenzen */}
                <div className="bg-white bg-opacity-70 rounded-lg p-4">
                  <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">
                    Foerder-Konsequenzen
                  </p>
                  {analysis.kostenDatenVorhanden ? (
                    <div className="space-y-4">

                      {analysis.szenarien[0] && (
                        <div>
                          <div className="flex items-center gap-1 mb-1">
                            <AlertCircle size={12} className={analysis.szenarien[0].erreichbar ? 'text-green-500' : 'text-red-400'} />
                            <span className="text-xs text-gray-700">{analysis.szenarien[0].label}</span>
                          </div>
                          <div className="text-xs space-y-0.5">
                            <div className="flex justify-between">
                              <span className="text-gray-700">Abrufbar:</span>
                              <span className="font-semibold text-gray-800">
                                {fmtEur(Math.round(analysis.foerderbarProg))}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-700">Erreichungsgrad:</span>
                              <span className={`font-semibold ${analysis.pFarbe.text}`}>
                                {Math.min(analysis.erreichungsgrad, 100)}%
                              </span>
                            </div>
                            {analysis.verschenktProg > 0 && (
                              <div className="flex justify-between text-red-600 font-semibold mt-1 pt-1 border-t border-red-100">
                                <span>Verschenkt:</span>
                                <span>{fmtEur(Math.round(analysis.verschenktProg))}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="pt-2 border-t border-gray-100">
                        <div className="flex items-center gap-1 mb-1">
                          <CheckCircle size={12} className="text-green-500" />
                          <span className="text-xs text-gray-700">Bei 100% Zielerreichung</span>
                        </div>
                        <div className="text-xs space-y-0.5">
                          <div className="flex justify-between">
                            <span className="text-gray-700">Abrufbar:</span>
                            <span className="font-semibold text-green-700">
                              {fmtEur(Math.round(analysis.foerderbarPlan))}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-700">Verschenkt:</span>
                            <span className="font-semibold text-green-700">0 EUR</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-xs text-gray-700 pt-1 border-t border-gray-100">
                        Foerdersatz: {analysis.foerdersatz}% &nbsp;&middot;&nbsp; Basis: echte Stundensaetze
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-gray-700 space-y-1">
                      <p>Keine Kostendaten verfuegbar.</p>
                      <p>Bitte Stundensaetze und Foerdersatz im Projekt hinterlegen.</p>
                    </div>
                  )}
                </div>

              </div>{/* Ende grid cols-3 */}
            </div>
          </div>
        )}

      </div>{/* Ende Druckbereich */}

      {/* Fallback: keine Daten */}
      {analysis.maData.length === 0 && analysis.monatData.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-700">
          <TrendingUp size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Noch keine Zeiterfassungsdaten vorhanden.</p>
        </div>
      )}

    </div>
  );
}
