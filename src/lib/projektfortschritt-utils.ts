// src/lib/projektfortschritt-utils.ts
// ============================================================================
// PZE V7 - Projekt-Fortschritt Berechnungslogik (Shared Utility)
// ============================================================================
// Version: 7.4.9-2
// Datum: 11. Juni 2026
// v7.4.9-2: Zwei Korrekturen an der Foerder-Prognose.
//   1. Foerder-Maximum = min(bewilligte_summe, Plankosten x Foerdersatz). Mehr
//      als die foerderfaehigen Plankosten ist nie abrufbar, auch wenn die
//      bewilligte Summe rundungsbedingt hoeher gespeichert ist. Behebt die
//      Phantom-"Verschenkt"-Betraege (z.B. 6 EUR) bei 100% Planerfuellung.
//   2. Neue Felder prognoseStundenAbrechenbar (= min(Hochrechnung, Plan)) und
//      tempoUeberPlan. Die Roh-Hochrechnung bleibt fuer Tempo/Szenarien intern
//      erhalten; fuer die abrechnungsrelevante Anzeige wird auf den Plan gekappt.
//
// Extrahierte Berechnungslogik aus ProjektFortschrittPanel v7.4.5-22.
// Wird genutzt von:
//   - ProjektFortschrittPanel (Detailansicht)
//   - FirmaCockpit (kompakte Monatsverlauf + Prognose)
//
// Keine React-Abhaengigkeiten - reine TypeScript-Funktionen.
// ============================================================================

// ============================================================================
// INTERFACES
// ============================================================================

export interface PFProject {
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

export interface PFWorkPackage {
  id: string;
  project_id: string;
  total_person_months: number | null;
  start_date: string | null;
  end_date: string | null;
}

export interface PFWorkPackageAssignment {
  work_package_id: string;
  employee_id: string;
  planned_person_months: number;
}

export interface PFProjectAssignment {
  project_id: string;
  employee_id: string;
  hourly_rate: number | null;
}

export interface PFEmployee {
  id: string;
  display_name: string;
  weekly_hours?: number | null;
  position_title?: string | null;
}

export interface PFTimesheetEntry {
  project_id: string;
  employee_id: string;
  work_date: string;
  hours: number;
  is_billable: boolean;
}

// ============================================================================
// ERGEBNIS-TYPEN
// ============================================================================

export interface MonatDatum {
  monat: string;
  year: number;
  month: number;
  istVergangenheit: boolean;
  Soll: number;
  Ist: number;
  SollKumuliert: number;
  IstKumuliert: number | undefined;
  IstProjektion?: number;
  ZielProjektion?: number;
}

export interface MAChartDatum {
  name: string;
  planPM: number;
  istPM: number;
  planEUR: number;
  istEUR: number;
}

export interface Szenario {
  label: string;
  hProTagJeMA: number;
  teamHProTag: number;
  erreichbar: boolean;
  hinweis?: string;
}

export interface PrognoseFarbe {
  stroke: string;
  bg: string;
  text: string;
  label: string;
  icon: 'gruen' | 'gelb' | 'rot';
}

export interface ProjectAnalysis {
  // Laufzeit
  laufzeitPct: number;
  laufzeitLabel: string;
  vergangeMonate: number;
  gesamtMonate: number;
  // PM
  pmPct: number;
  gesamtPlanPM: number;
  gesamtIstPM: number;
  gesamtPlanStunden: number;
  gesamtIstStunden: number;
  // Kosten
  kostenPct: number;
  gesamtPlanKosten: number;
  gesamtIstKosten: number;
  // MA-Daten (Balkendiagramme)
  maData: MAChartDatum[];
  // Monatsverlauf
  monatData: MonatDatum[];
  // Prognose
  prognoseAktiv: boolean;
  erreichungsgrad: number;
  fehlendStunden: number;
  prognostizierteGesamtStunden: number;
  prognoseStundenAbrechenbar: number;   // v7.4.9-2: auf Plan gekappt (Abrechnung)
  tempoUeberPlan: boolean;              // v7.4.9-2: Roh-Hochrechnung > Plan
  pFarbe: PrognoseFarbe;
  basisStunden: number;
  letzten3Count: number;
  zielErreichbar: boolean;
  zielStundenProMonat: number;
  // Kosten-Prognose
  kostenDatenVorhanden: boolean;
  foerdersatz: number | null;
  foerderbarProg: number;
  foerderbarPlan: number;
  verschenktProg: number;
  verschenktZiel: number;
  prognostizierteGesamtKosten: number;
  // Team-Daten
  aktivCount: number;
  gesamtMACount: number;
  gfCount: number;
  normalMACount: number;
  istHProTagTeam: number;
  istHProTagJeMA: number;
  avgMaxProTagGF: number;
  avgMaxProTagMA: number;
  teamMaxProMonat: number;
  // Szenarien
  szenarien: Szenario[];
  verbleibendeMonateAb: number;
}

// ============================================================================
// KONSTANTEN
// ============================================================================

export const HOURS_PER_PM = 173.33;
export const MAX_STUNDEN_MONAT_VOLLZEIT = 173.33;
export const GF_FAKTOR = 0.5; // 50%-Regel fuer Geschaeftsfuehrer
export const GF_POSITIONS = ['Geschaeftsfuehrer', 'Gesellschafter-Geschaeftsfuehrer'];

export const MONTH_NAMES_SHORT = [
  'Jan', 'Feb', 'Mrz', 'Apr', 'Mai', 'Jun',
  'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez',
];

export const FUNDING_FORMAT_LABELS: Record<string, string> = {
  'ZIM':           'ZIM Einzelprojekt',
  'ZIM_EINZEL':    'ZIM Einzelprojekt',
  'ZIM_KOOP':      'ZIM Kooperationsprojekt',
  'ZIM_KOOPERATION': 'ZIM Kooperationsprojekt',
  'ZIM_NETZWERK':  'ZIM Netzwerk-Management',
  'ZIM_DS':        'ZIM Durchfuehrbarkeitsstudie',
  'BMBF':          'BMBF Foerderung',
  'BMBF_KMU':      'BMBF/KMU-innovativ',
  'BMBF_DS':       'BMBF Durchfuehrbarkeitsstudie',
  'FORSCHUNGSZULAGE': 'Forschungszulage',
};

// Cockpit-Kompakt-Labels
export const FUNDING_FORMAT_SHORT: Record<string, string> = {
  'ZIM_EINZEL':    'ZIM Einzel',
  'ZIM_KOOPERATION': 'ZIM Koop.',
  'ZIM_NETZWERK':  'ZIM NWM',
  'ZIM_DS':        'ZIM DS',
  'ZIM':           'ZIM',
  'ZIM_KOOP':      'ZIM Koop.',
  'BMBF':          'BMBF',
  'BMBF_KMU':      'BMBF/KMU-innov.',
  'BMBF_DS':       'BMBF DS',
  'FORSCHUNGSZULAGE': 'FZul',
};

// ============================================================================
// FORMATIERUNGSFUNKTIONEN
// ============================================================================

export const fmt1 = (v: number): string =>
  v.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export const fmtEur = (v: number): string =>
  v.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' EUR';

export const fmtH = (v: number): string =>
  v.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' h';

export const fmtDateDE = (d: string | null | undefined): string => {
  if (!d) return '--';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '--';
  return dt.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export const fmtDateShortDE = (d: string | null | undefined): string => {
  if (!d) return '-';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '-';
  return dt.toLocaleDateString('de-DE', { month: '2-digit', year: 'numeric' });
};

export const fmtEuroShort = (betrag: number | null): string => {
  if (betrag == null) return '-';
  if (Math.abs(betrag) >= 1000) {
    return Math.round(betrag / 1000).toLocaleString('de-DE') + 'k EUR';
  }
  return Math.round(betrag).toLocaleString('de-DE') + ' EUR';
};

export const fmtEuroFull = (betrag: number | null): string => {
  if (betrag == null) return '-';
  return betrag.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' EUR';
};

// ============================================================================
// HILFSFUNKTIONEN
// ============================================================================

/** Arbeitstage im Monat (Mo-Fr, ohne Feiertage - vereinfacht) */
export function arbeitstageImMonat(year: number, month: number): number {
  const days = new Date(year, month, 0).getDate();
  let count = 0;
  for (let d = 1; d <= days; d++) {
    const dow = new Date(year, month - 1, d).getDay();
    if (dow >= 1 && dow <= 5) count++;
  }
  return count;
}

/** Maximale Projektstunden pro Monat fuer einen MA (GF-Regel beachten) */
export function maxProjektstundenMonat(emp: PFEmployee | undefined): number {
  const waz = emp?.weekly_hours ?? 40;
  const basisMax = MAX_STUNDEN_MONAT_VOLLZEIT * (waz / 40);
  const istGF = emp?.position_title
    ? GF_POSITIONS.includes(emp.position_title)
    : false;
  return istGF ? basisMax * GF_FAKTOR : basisMax;
}

/** Prueft ob MA ein GF ist */
export function istGeschaeftsfuehrer(emp: PFEmployee | undefined): boolean {
  if (!emp?.position_title) return false;
  return GF_POSITIONS.includes(emp.position_title);
}

/** Prognose-Farbe basierend auf Erreichungsgrad */
export function prognoseFarbe(erreichungsgrad: number): PrognoseFarbe {
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

/** Fortschrittsbalken-Farbe */
export function progressColor(pct: number, timePct: number): string {
  if (pct >= timePct - 5) return 'text-green-600';
  if (timePct - pct > 25) return 'text-red-600';
  return 'text-amber-600';
}

export function progressBg(pct: number, timePct: number): string {
  if (pct >= timePct - 5) return 'bg-green-500';
  if (timePct - pct > 25) return 'bg-red-500';
  return 'bg-amber-500';
}

// ============================================================================
// HAUPTBERECHNUNG
// ============================================================================

export function calculateProjectAnalysis(
  project: PFProject,
  workPackages: PFWorkPackage[],
  wpAssignments: PFWorkPackageAssignment[],
  projectAssignments: PFProjectAssignment[],
  employees: PFEmployee[],
  timesheets: PFTimesheetEntry[],
): ProjectAnalysis | null {
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
    laufzeitLabel = vergangeMonate + ' / ' + gesamtMonate + ' Monate';
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
  const maData: MAChartDatum[] = projAssignments
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
        planPM: Math.round(planPM * 10) / 10,
        istPM: Math.round(istPM * 10) / 10,
        planEUR: Math.round(planKosten),
        istEUR: Math.round(istKosten),
      };
    })
    .filter(d => d.planPM > 0 || d.istPM > 0);

  // ---- Monatsverlauf: AP-genaue Soll-Verteilung ----
  let monatData: MonatDatum[] = [];

  // ---- Projektion: Durchschnitt letzte 3 abgeschlossene Monate ----
  const istMonatMap: Record<string, number> = {};
  projTimesheets.forEach(t => {
    const d = new Date(t.work_date);
    const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    istMonatMap[key] = (istMonatMap[key] || 0) + t.hours;
  });

  const vergangeneMonatKeys = Object.keys(istMonatMap)
    .filter(key => {
      const parts = key.split('-');
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
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

  // v7.4.9-2: Abrechnungsrelevante Hochrechnung auf den Plan gekappt - mehr als
  // das Foerderziel kann nicht abgerechnet werden. Die Roh-Hochrechnung bleibt
  // fuer die Tempo- und Szenarienlogik unveraendert erhalten.
  const prognoseStundenAbrechenbar = Math.min(prognostizierteGesamtStunden, gesamtPlanStunden);
  const tempoUeberPlan = prognostizierteGesamtStunden > gesamtPlanStunden;

  // ---- Beteiligung & Intensitaet ----
  const aktiveMaIds = new Set<string>();
  projTimesheets.forEach(t => {
    const d = new Date(t.work_date);
    const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    if (letzten3.includes(key)) aktiveMaIds.add(t.employee_id);
  });

  const alleMAIds = Array.from(new Set(projAssignments.map(pa => pa.employee_id)));
  const aktivCount = aktiveMaIds.size;
  const gesamtMACount = alleMAIds.length;

  // Arbeitstage der letzten 3 Monate
  const gesamtArbeitstage3M = letzten3.reduce((s, key) => {
    const parts = key.split('-');
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    return s + arbeitstageImMonat(y, m);
  }, 0);

  const istHGesamt3M = letzten3.reduce((s, k) => s + (istMonatMap[k] || 0), 0);

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
  const szenarien: Szenario[] = [];

  if (restArbeitstage > 0) {
    const teamMaxErreichbar = teamMaxProMonat * verbleibendeMonateAb;
    const maxErreichbarGesamt = gesamtIstStunden + teamMaxErreichbar;
    const maxErreichbarPct = gesamtPlanStunden > 0
      ? Math.round((maxErreichbarGesamt / gesamtPlanStunden) * 100)
      : 0;

    szenarien.push({
      label: 'Weiter wie bisher (' + aktivCount + ' aktive MA)',
      hProTagJeMA: Math.round(istHProTagJeMA * 10) / 10,
      teamHProTag: Math.round(istHProTagTeam * 10) / 10,
      erreichbar: erreichungsgrad >= 90,
    });

    if (maxErreichbarPct < 100) {
      szenarien.push({
        label: 'Vollast alle ' + gesamtMACount + ' MA (Maximum)',
        hProTagJeMA: Math.round((teamMaxProMonat / gesamtMACount / 21.7) * 10) / 10,
        teamHProTag: Math.round((teamMaxProMonat / 21.7) * 10) / 10,
        erreichbar: maxErreichbarPct >= 90,
        hinweis: maxErreichbarPct < 90
          ? 'Selbst bei Vollast: max. ' + maxErreichbarPct + '% des Foerderziels erreichbar'
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
          hinweis = 'GF: max. ' + (Math.round(gfMaxHProTag * 10) / 10) + ' h/Tag moeglich (50%-Regel)';
        }
      }

      if (szenarien.length < 3) {
        szenarien.push({
          label: 'Fuer 100% Ziel (alle ' + gesamtMACount + ' MA)',
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

  const foerderbarRechnerischProg = Math.min(prognostizierteGesamtKosten, gesamtPlanKosten) * fs;
  const foerderbarRechnerischPlan = gesamtPlanKosten * fs;

  const deckel = bewilligteSumme ?? Infinity;
  const foerderbarProg = Math.min(foerderbarRechnerischProg, deckel);
  const foerderbarPlan = Math.min(foerderbarRechnerischPlan, deckel);

  // v7.4.9-2: Maximal erreichbare Zuwendung = Minimum aus bewilligter Summe und
  // (Plankosten x Foerdersatz). Mehr als die foerderfaehigen Plankosten kann nie
  // abgerufen werden, auch wenn die bewilligte Summe rundungsbedingt hoeher
  // gespeichert ist. Behebt Phantom-"Verschenkt"-Betraege bei 100% Plan.
  const foerderMaximum = Math.min(bewilligteSumme ?? Infinity, foerderbarRechnerischPlan);
  const verschenktProg = Math.max(0, foerderMaximum - foerderbarProg);
  const verschenktZiel = 0;

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
        label: MONTH_NAMES_SHORT[cur.getMonth()] + ' ' + String(cur.getFullYear()).slice(-2),
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
        const key = year + '-' + String(month).padStart(2, '0');
        sollMap[key] = (sollMap[key] || 0) + hoursPerDay * overlapDays;
      });
    });

    let sollKumuliert = 0;
    let istKumuliert = 0;
    let projektionKumuliert = gesamtIstStunden;
    let zielProjektionKumuliert = gesamtIstStunden;
    const aktuellerMonatKey = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');

    monatData = months.map(({ year, month, label }) => {
      const key = year + '-' + String(month).padStart(2, '0');
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
        Soll: soll,
        Ist: ist,
        SollKumuliert: Math.round(sollKumuliert),
        IstKumuliert: istVergangenheit ? Math.round(istKumuliert) : undefined,
        IstProjektion: projektion,
        ZielProjektion: zielProjektion,
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
    prognoseStundenAbrechenbar,
    tempoUeberPlan,
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
}
