// src/components/shared/ProjektFortschrittPanel.tsx
// ============================================================================
// PZE V7 - Projekt-Fortschritt Grafische Auswertung
// ============================================================================
// Version: 7.4.5-10
// Datum: 24. April 2026
//
// v7.4.5-10: Szenario-Labels um MA-Anzahl ergaenzt
//   - "Weiter wie bisher" -> "Weiter wie bisher (X aktive MA)"
//   - "Vollast alle N MA" bleibt unveraendert
//   - "Fuer 100% Ziel benoetigt" -> "Fuer 100% Ziel (alle N MA)"
//
// v7.4.5-9: 3-Spalten-Layout mit Foerder-Konsequenzen (siehe dort)
// Datum: 24. April 2026
//
// v7.4.5-9: 3-Spalten-Layout im Prognose-Block
//   - Spalte 1: Aktuelle Situation (MA, Intensitaet, GF-Grenzen)
//   - Spalte 2: Was waere noetig? (Szenarien mit h/Tag je MA)
//   - Spalte 3: Konsequenzen (Foerderkosten, verschenkte Foerdermittel)
//   - Kosten-Prognose auf Basis echter Stundensaetze je MA (keine Schaetzung)
//   - Foerdersatz aus project.foerdersatz (nur wenn vorhanden, sonst Spalte leer)
//   - Prognose-Kosten: proportional nach MA-Ist-Anteil verteilt
//
// v7.4.5-8: Layout-Aufraeum (siehe dort)
// Datum: 24. April 2026
//
// v7.4.5-7: Zweite Projektions-Linie im Diagramm
//   - 'Ziel Projektion' (gruen): zeigt Verlauf wenn MA ab jetzt Zieltempo fahren
//   - 'Ist Projektion' (orange): bisheriges Tempo weitergeschrieben (unveraendert)
//   - Zieltempo = benoetigte Team-h/Monat fuer 100% Foerderziel
//   - Nur sichtbar wenn Ziel physikalisch erreichbar (maxErreichbarPct >= 90)
//   - zielStundenProMonat als neues Berechnungsfeld im analysis-Objekt
//
// v7.4.5-6: Korrekturen Zielerreichungs-Prognose
//   - Employee-Interface um position_title erweitert (GF-Erkennung)
//   - Intensitaet jetzt als Oe je MA (nicht Team-Summe) angezeigt
//   - Zusaetzlich: Team-Summe h/Tag als Kontextinformation
//   - MA-individuelle Obergrenzen: GF max. 86,67 h/Monat (50%-Regel ZIM),
//     normale MA max. 173,33 h/Monat (x Teilzeitfaktor)
//   - Team-Maximum korrekt aus Summe der individuellen Obergrenzen berechnet
//   - Szenarien zeigen benoetigte h/Tag je MA (nicht Team-Summe)
//   - Szenario-Erreichbarkeit prueft gegen individuelle Obergrenzen (GF / MA)
//   - GF_POSITIONS: 'Geschaeftsfuehrer', 'Gesellschafter-Geschaeftsfuehrer'
//
// v7.4.5-5: Zielerreichungs-Prognose (Basisversion - siehe dort)
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
import { TrendingUp, Clock, Euro, Users, CheckCircle, AlertCircle, Target } from 'lucide-react';

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
    // Fuer jeden MA im Projekt: max. Projektstunden/Monat und h/Tag
    const maObergrenzen = alleMAIds.map(empId => {
      const emp = employees.find(e => e.id === empId);
      const maxProMonat = maxProjektstundenMonat(emp);
      const isGF = istGeschaeftsfuehrer(emp);
      return { empId, maxProMonat, isGF, emp };
    });

    // Team-Maximum gesamt pro Monat (Summe aller individuellen Obergrenzen)
    const teamMaxProMonat = maObergrenzen.reduce((s, ma) => s + ma.maxProMonat, 0);

    // Aufschluesseln: wie viele GF, wie viele normale MA
    const gfCount = maObergrenzen.filter(ma => ma.isGF).length;
    const normalMACount = gesamtMACount - gfCount;

    // Durchschnittliche Obergrenzen fuer Anzeige
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
    // Jedes Szenario zeigt benoetigte h/Tag JE MA (nicht Team-Summe)
    // und prueft gegen individuelle Obergrenzen

    const szenarien: Array<{
      label: string;
      hProTagJeMA: number;       // benoetigte h/Tag je eingesetztem MA (Durchschnitt)
      teamHProTag: number;       // Team-Summe h/Tag (Info)
      erreichbar: boolean;
      hinweis?: string;
    }> = [];

    if (restArbeitstage > 0) {

      // Szenario 1: Weiter wie bisher (Ist-Tempo)
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

      // Szenario 2: Vollast aller MA (physikalisches Maximum)
      // Zeigt was maximal noch erreichbar ist
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

      // Szenario 3: Benoetigt fuer 100% Ziel - nur wenn ueberhaupt erreichbar
      if (restArbeitstage > 0 && restStunden > 0 && maxErreichbarPct >= 90) {
        // Benoetigte Team-Stunden pro Tag
        const benoetigtTeamHProTag = restStunden / restArbeitstage;
        // Aufteilen auf MA unter Beruecksichtigung GF-Grenze:
        // Versuche gleichmaessige Verteilung auf alle MA
        const benoetigtJeMAHProTag = gesamtMACount > 0
          ? benoetigtTeamHProTag / gesamtMACount
          : 0;

        // Pruefe ob GF-Anteil realistisch
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

    // ---- Kosten-Prognose (nur mit echten Daten) ----
    // Foerdersatz aus Projekt (z.B. 45 = 45%)
    const foerdersatz = project.foerdersatz ?? null;
    const kostenDatenVorhanden = foerdersatz !== null && gesamtPlanKosten > 0 && gesamtIstKosten > 0;

    // Prognostizierte Kosten: MA-proportional aus Ist-Kosten hochgerechnet
    // Fuer jeden MA: Ist-Kosten / Ist-Stunden = realer Stundensatz inkl. Overhead
    // Prognose-Stunden je MA: proportional nach Ist-Anteil an Team-Gesamtstunden
    let prognostizierteGesamtKosten = gesamtIstKosten;
    let zielKosten = gesamtPlanKosten; // 100%-Ziel = Plankosten

    if (kostenDatenVorhanden && prognostizierteGesamtStunden > gesamtIstStunden) {
      const progDeltaStunden = prognostizierteGesamtStunden - gesamtIstStunden;
      // Gewichteter Durchschnittsstundensatz aus echten MA-Daten
      // = gesamtIstKosten / gesamtIstStunden (nur wenn Ist-Stunden > 0)
      if (gesamtIstStunden > 0) {
        const avgStundensatz = gesamtIstKosten / gesamtIstStunden;
        prognostizierteGesamtKosten = gesamtIstKosten + progDeltaStunden * avgStundensatz;
      } else {
        // Kein Ist vorhanden: Plan-Stundensatz verwenden
        const avgPlanStundensatz = gesamtPlanKosten / gesamtPlanStunden;
        prognostizierteGesamtKosten = prognostizierteGesamtStunden * avgPlanStundensatz;
      }
    }

    // Foerderbare Betraege je Szenario
    const fs = (foerdersatz ?? 0) / 100;
    const foerderbarIst     = gesamtIstKosten * fs;
    const foerderbarProg    = Math.min(prognostizierteGesamtKosten, gesamtPlanKosten) * fs;
    const foerderbarPlan    = gesamtPlanKosten * fs; // = bewilligter Betrag
    const verschenktProg    = Math.max(0, foerderbarPlan - foerderbarProg);

    // Ziel-Szenario (100%): Plankosten voll abrufbar
    const foerderbarZiel    = gesamtPlanKosten * fs;
    const verschenktZiel    = 0;

    // ---- Zieltempo-Kosten (fuer 100%-Szenario) ----
    // Bereits als zielKosten = gesamtPlanKosten definiert

    // ---- Zieltempo: benoetigte Teamstunden pro Monat fuer 100% Foerderziel ----
    // Nur berechnen wenn Ziel noch erreichbar (maxErreichbarPct >= 90)
    const teamMaxErreichbarGesamt = gesamtIstStunden + teamMaxProMonat * verbleibendeMonateAb;
    const maxErreichbarPct = gesamtPlanStunden > 0
      ? Math.round((teamMaxErreichbarGesamt / gesamtPlanStunden) * 100)
      : 0;
    const zielErreichbar = maxErreichbarPct >= 90;
    // Benoetigte Teamstunden pro Monat ab jetzt fuer genau 100% Ziel
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

      // Soll-Map
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

      // Kombinierte Daten mit Projektion
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
            // Startpunkt beider Linien = aktueller Ist-Wert
            projektion = istKumuliert;
            projektionKumuliert = istKumuliert;
            zielProjektion = istKumuliert;
            zielProjektionKumuliert = istKumuliert;
          } else {
            // Ist-Tempo Projektion (orange)
            projektionKumuliert += basisStunden;
            projektion = Math.round(Math.min(projektionKumuliert, gesamtPlanStunden));
            // Ziel-Tempo Projektion (gruen) - nur wenn Ziel erreichbar
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
      // Prognose
      prognoseAktiv,
      erreichungsgrad,
      fehlendStunden,
      prognostizierteGesamtStunden,
      pFarbe,
      basisStunden,
      letzten3Count: letzten3.length,
      zielErreichbar,
      zielStundenProMonat,
      // Kosten-Prognose
      kostenDatenVorhanden,
      foerdersatz,
      foerderbarIst,
      foerderbarProg,
      foerderbarPlan,
      verschenktProg,
      foerderbarZiel,
      verschenktZiel,
      prognostizierteGesamtKosten,
      // Beteiligung & Intensitaet
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
      <div className="p-8 text-center text-gray-400">
        Kein Projekt ausgewaehlt.
      </div>
    );
  }

  const xAxisInterval = Math.max(0, Math.floor(analysis.monatData.length / 12) - 1);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="space-y-5">

      {/* Projekt-Auswahl oder Projektname */}
      {projects.length > 1 ? (
        <div className="flex items-center gap-3">
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
        </div>
      ) : (
        <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
          <span className="text-base font-bold text-gray-900">
            {project.short_name || project.name}
          </span>
          {project.funding_reference && (
            <span className="text-sm text-gray-500 font-mono bg-gray-100 px-2 py-0.5 rounded">
              {project.funding_reference}
            </span>
          )}
          {project.funding_format && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">
              {getFundingLabel(project.funding_format)}
            </span>
          )}
        </div>
      )}

      {/* ---- 3 Kennzahl-Kacheln ---- */}
      <div className="grid grid-cols-3 gap-4">

        {/* Laufzeit */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={16} className="text-gray-400" />
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Laufzeit
            </span>
          </div>
          <div className="text-3xl font-bold mb-1" style={{ color: accentColor }}>
            {analysis.laufzeitPct}%
          </div>
          <div className="text-xs text-gray-500 mb-2">{analysis.laufzeitLabel}</div>
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
            <Users size={16} className="text-gray-400" />
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
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
          <div className="text-xs text-gray-500 mb-2">
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
            <Euro size={16} className="text-gray-400" />
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
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
          <div className="text-xs text-gray-500 mb-2">
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
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} unit=" PM" width={45} />
                <Tooltip content={<PMTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
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
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={v => `${(v / 1000).toFixed(0)}k`}
                  width={45}
                />
                <Tooltip content={<KostenTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Plan EUR" fill="#e2e8f0" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Ist EUR" fill={accentColor} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ---- Monatsverlauf: ComposedChart ---- */}
      {analysis.monatData.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-1">
            Monatsverlauf Projektstunden
          </h4>
          <p className="text-xs text-gray-400 mb-4">
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
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart
              data={analysis.monatData}
              margin={{ top: 10, right: 60, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="monat" tick={{ fontSize: 10 }} interval={xAxisInterval} />
              <YAxis yAxisId="monat" orientation="left" tick={{ fontSize: 10 }} unit=" h" width={52} />
              <YAxis yAxisId="kumuliert" orientation="right" tick={{ fontSize: 10 }} unit=" h" width={60} />
              <Tooltip content={<MonatTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />

              <Bar yAxisId="monat" dataKey="Soll" fill="#cbd5e1" radius={[2, 2, 0, 0]} name="Soll (Monat)" maxBarSize={16} />
              <Bar yAxisId="monat" dataKey="Ist" fill={accentColor} fillOpacity={0.8} radius={[2, 2, 0, 0]} name="Ist (Monat)" maxBarSize={16} />

              <Line yAxisId="kumuliert" type="monotone" dataKey="Soll kumuliert" stroke="#94a3b8" strokeWidth={2} strokeDasharray="6 3" dot={false} name="Soll kumuliert" />
              <Line yAxisId="kumuliert" type="monotone" dataKey="Ist kumuliert" stroke={accentColor} strokeWidth={2.5} dot={false} name="Ist kumuliert" connectNulls={false} />

              {analysis.prognoseAktiv && (
                <Line yAxisId="kumuliert" type="monotone" dataKey="Ist Projektion" stroke={analysis.pFarbe.stroke} strokeWidth={2} strokeDasharray="4 4" dot={false} name="Prognose kumuliert" connectNulls={true} />
              )}

              {/* Ziel-Projektion: steiler Verlauf zum Foerderziel (gruen) */}
              {analysis.prognoseAktiv && analysis.zielErreichbar && (
                <Line yAxisId="kumuliert" type="monotone" dataKey="Ziel Projektion" stroke="#16a34a" strokeWidth={2} strokeDasharray="4 4" dot={false} name="Zieltempo kumuliert" connectNulls={true} />
              )}
            </ComposedChart>
          </ResponsiveContainer>
          <p className="text-xs text-gray-400 mt-2">
            Nur foerderbare Projektstunden (is_billable = true).
            Soll-Verteilung gleichmaessig ueber AP-Laufzeit je Arbeitspaket.
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

          {/* Zwei Bloecke untereinander: volle Breite, klare Trennung */}
          <div className="space-y-3">

            {/* Block 1: Hochrechnung (volle Breite) */}
            <div className="bg-white bg-opacity-70 rounded-lg p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Hochrechnung
              </p>
              <div className="grid grid-cols-3 gap-4 mb-3">
                <div>
                  <div className="text-xs text-gray-500 mb-0.5">Ziel (Plan)</div>
                  <div className="text-sm font-semibold text-gray-900">{fmtH(analysis.gesamtPlanStunden)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-0.5">Bisher verbucht</div>
                  <div className="text-sm font-semibold text-gray-900">{fmtH(analysis.gesamtIstStunden)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-0.5">Prognose gesamt</div>
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
                <span className="text-gray-400">
                  Basis: {Math.round(analysis.basisStunden)} h/Monat (Team, letzte {analysis.letzten3Count} Monate)
                </span>
                <span className={`font-bold ${analysis.pFarbe.text}`}>
                  {Math.min(analysis.erreichungsgrad, 100)}% des Foerderziels
                </span>
              </div>
              {analysis.fehlendStunden > 0 && (
                <div className="text-xs text-gray-500 mt-1">
                  Fehlende Stunden bei aktuellem Tempo:
                  <span className="font-semibold text-gray-700 ml-1">{fmtH(Math.round(analysis.fehlendStunden))}</span>
                </div>
              )}
            </div>

            {/* Block 2: 3 Spalten - Situation / Szenarien / Konsequenzen */}
            <div className="grid grid-cols-3 gap-3">

              {/* Spalte 1: Aktuelle Situation */}
              <div className="bg-white bg-opacity-70 rounded-lg p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Aktuelle Situation
                </p>
                <div className="space-y-2">
                  <div>
                    <div className="text-xs text-gray-500">Aktive Mitarbeiter</div>
                    <div className={`text-sm font-semibold mt-0.5 ${
                      analysis.aktivCount < analysis.gesamtMACount ? 'text-amber-600' : 'text-green-600'
                    }`}>
                      {analysis.aktivCount} / {analysis.gesamtMACount}
                      {analysis.gfCount > 0 && (
                        <span className="text-gray-400 font-normal text-xs ml-1">
                          ({analysis.gfCount} GF + {analysis.normalMACount} MA)
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Intensitaet je MA</div>
                    <div className="text-sm font-semibold text-gray-900 mt-0.5">
                      {analysis.istHProTagJeMA > 0
                        ? `${Math.round(analysis.istHProTagJeMA * 10) / 10} h/Tag`
                        : '--'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Team gesamt</div>
                    <div className="text-sm font-semibold text-gray-900 mt-0.5">
                      {analysis.istHProTagTeam > 0
                        ? `${Math.round(analysis.istHProTagTeam * 10) / 10} h/Tag`
                        : '--'}
                    </div>
                  </div>
                  {analysis.gfCount > 0 && (
                    <div className="pt-2 border-t border-gray-100 space-y-1">
                      <p className="text-xs text-gray-400">Max. moeglich je Tag:</p>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">GF (50%-Regel)</span>
                        <span className="font-medium text-gray-700">
                          {Math.round(analysis.avgMaxProTagGF * 10) / 10} h
                        </span>
                      </div>
                      {analysis.normalMACount > 0 && (
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Mitarbeiter</span>
                          <span className="font-medium text-gray-700">
                            {Math.round(analysis.avgMaxProTagMA * 10) / 10} h
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="text-xs text-gray-400 mt-3 pt-2 border-t border-gray-100">
                  Basis: letzte {analysis.letzten3Count} abgeschl. Monate
                </div>
              </div>

              {/* Spalte 2: Was waere noetig? */}
              <div className="bg-white bg-opacity-70 rounded-lg p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
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
                          <div className="text-xs text-gray-500">{sz.label}</div>
                          <div className={`text-sm font-bold mt-0.5 ${sz.erreichbar ? 'text-green-700' : 'text-red-600'}`}>
                            {sz.hProTagJeMA > 0 ? `${sz.hProTagJeMA} h/Tag je MA` : 'wie bisher'}
                          </div>
                          <div className="text-xs text-gray-400">
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
                  <p className="text-xs text-gray-400">Keine Szenarien verfuegbar.</p>
                )}
                {analysis.verbleibendeMonateAb > 0 && (
                  <div className="text-xs text-gray-400 mt-3 pt-2 border-t border-gray-100">
                    Noch {analysis.verbleibendeMonateAb} Monate bis Projektende
                  </div>
                )}
              </div>

              {/* Spalte 3: Konsequenzen (Foerderkosten) */}
              <div className="bg-white bg-opacity-70 rounded-lg p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Foerder-Konsequenzen
                </p>
                {analysis.kostenDatenVorhanden ? (
                  <div className="space-y-4">

                    {/* Weiter wie bisher */}
                    {analysis.szenarien[0] && (
                      <div>
                        <div className="flex items-center gap-1 mb-1">
                          <AlertCircle size={12} className={analysis.szenarien[0].erreichbar ? 'text-green-500' : 'text-red-400'} />
                          <span className="text-xs text-gray-500">{analysis.szenarien[0].label}</span>
                        </div>
                        <div className="text-xs space-y-0.5">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Abrufbar:</span>
                            <span className="font-semibold text-gray-800">
                              {fmtEur(Math.round(analysis.foerderbarProg))}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Erreichungsgrad:</span>
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

                    {/* Ziel 100% */}
                    <div className="pt-2 border-t border-gray-100">
                      <div className="flex items-center gap-1 mb-1">
                        <CheckCircle size={12} className="text-green-500" />
                        <span className="text-xs text-gray-500">Bei 100% Zielerreichung</span>
                      </div>
                      <div className="text-xs space-y-0.5">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Abrufbar:</span>
                          <span className="font-semibold text-green-700">
                            {fmtEur(Math.round(analysis.foerderbarPlan))}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Verschenkt:</span>
                          <span className="font-semibold text-green-700">0 EUR</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-xs text-gray-400 pt-1 border-t border-gray-100">
                      Foerdersatz: {analysis.foerdersatz}% &nbsp;&middot;&nbsp; Basis: echte Stundensaetze
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-gray-400 space-y-1">
                    <p>Keine Kostendaten verfuegbar.</p>
                    <p>Bitte Stundensaetze und Foerdersatz im Projekt hinterlegen.</p>
                  </div>
                )}
              </div>

            </div>{/* Ende grid cols-3 */}
          </div>
        </div>
      )}

      {/* Fallback: keine Daten */}
      {analysis.maData.length === 0 && analysis.monatData.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
          <TrendingUp size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Noch keine Zeiterfassungsdaten vorhanden.</p>
        </div>
      )}

    </div>
  );
}
