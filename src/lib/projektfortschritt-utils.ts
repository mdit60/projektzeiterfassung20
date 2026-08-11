// src/lib/projektfortschritt-utils.ts
// ============================================================================
// PZE V7 - Projekt-Fortschritt Berechnungslogik (Shared Utility)
// ============================================================================
// Version: 7.4.9-9
// Datum: 11. August 2026
// v7.4.9-9: INTERIM-FIX gegen unmoegliche 100%-Empfehlung. Die Zeile "Fuer 100%
//   Ziel (alle N MA)" konnte einen benoetigten Tagessatz ausgeben, der ueber der
//   Vollast-Obergrenze (und ueber der foerderfaehigen Tagesgrenze) lag - z.B.
//   10,9 h/Tag je MA, obwohl "Vollast (Maximum)" nur 6,3 h/Tag zeigt. Ursache:
//   der benoetigte Satz (restStunden/restArbeitstage/N) wurde nicht gegen die
//   Kapazitaet geprueft; die Zeile erschien schon ab maxErreichbarPct >= 90.
//   FIX: Die 100%-Zeile erscheint nur noch, wenn 100% innerhalb der Vollast-
//   Grenze ueberhaupt erreichbar ist (maxErreichbarPct >= 100). In diesem Fall
//   ist der benoetigte Satz mathematisch garantiert <= Vollast, also nie
//   unmoeglich. Ist 100% nicht erreichbar (90..99%), entfaellt die Zeile und die
//   Vollast-Zeile weist per Hinweis "Bei Vollast max. X% - 100% nicht erreichbar"
//   auf die Obergrenze hin. HINWEIS: Dies ist ein Interim. Die vollstaendige
//   kapazitaets-/wahrscheinlichkeitsbasierte Neufassung ist separat als
//   KONZEPT-PROGNOSE-NEU dokumentiert.
// v7.4.9-8: AUSGESCHIEDENE Mitarbeiter werden in der Prognose beruecksichtigt.
//   PROBLEM: Ein aus dem Projekt ausgeschiedener MA (v7_project_assignments
//   .assignment_end in der Vergangenheit) wurde weiter als verfuegbare
//   Kapazitaet gezaehlt. Die Szenarien "Vollast alle N MA" und "Fuer 100% Ziel
//   (alle N MA)" teilten das benoetigte Team-Tempo durch die volle
//   Zuordnungszahl (z.B. 3 statt real 2) und rechneten die Kapazitaet des
//   Ausgeschiedenen als abrufbar mit -> je-MA-Werte zu niedrig, Erreichbarkeit
//   zu optimistisch. Ursache: PFProjectAssignment trug kein assignment_end, der
//   Rechenkern kannte den Austritt technisch nicht.
//   FIX: PFProjectAssignment erhaelt assignment_end. Ein MA gilt als verfuegbar,
//   wenn er mind. eine nicht-beendete Projekt-Zuordnung hat (Kriterium wie im
//   FirmaCockpit: !assignment_end || assignment_end >= heute). Team-Zaehlung,
//   Kapazitaets-Obergrenzen (teamMaxProMonat, GF/MA-Splits) und alle Szenarien
//   rechnen nur noch mit den verfuegbaren MA. aktivCount zaehlt Ausgeschiedene
//   nie mit. Neues Rueckgabefeld ausgeschiedenCount fuer die Anzeige. Die
//   offenen Planstunden des Ausgeschiedenen BLEIBEN im Ziel (Restteam uebernimmt)
//   - Ziel/Rest-Soll unveraendert, nur die Kapazitaets-/Szenariensicht schrumpft.
//   Abwaertskompatibel: ohne assignment_end (nicht geladen) gilt jeder als
//   verfuegbar -> Verhalten wie bisher.
// v7.4.9-7: Szenario "Fuer 100% Ziel (alle N MA)" nur noch anzeigen, wenn die
//   Hochrechnung das Foerderziel NICHT bereits voll erreicht.
//   PROBLEM: Die Kopf-Hochrechnung wurde in v7.4.9-6 auf das planbezogene
//   Modell umgestellt (prognostizierteGesamtStunden), der Szenarien-Block
//   darunter blieb aber auf der alten mechanischen Formel
//   (restStunden / restArbeitstage). Folge: Bei "Ziel sicher erreichbar"
//   (Prognose >= Plan) stand trotzdem eine Empfehlung "du brauchst X h/Tag je
//   MA fuer 100%" darunter - ein Widerspruch. Erreicht "weiter wie bisher"
//   bereits 100%, ist die 100%-Empfehlung ueberfluessig.
//   FIX: Zusaetzliche Bedingung prognostizierteGesamtStunden < gesamtPlanStunden
//   am 100%-Szenario. Nur wenn das Ziel mit dem aktuellen Kurs NICHT erreicht
//   wird, erscheint die Handlungsempfehlung. Restliche Logik unveraendert.
// v7.4.9-6: PROGNOSE ueberarbeitet - Planerfuellung statt flachem Monatstempo.
//   PROBLEM: Ein Projekt bei 83% Laufzeit / 82% PM / 86% Kosten wurde als
//   "Ziel gefaehrdet" gemeldet. Ursache war die Hochrechnung
//   prognostizierteGesamtStunden = Ist + (Durchschnitt der letzten 3
//   abgeschlossenen Monate) x Restmonate. Dieser flache Wert misst das
//   ABSOLUTE Monatstempo; der planmaessige Projektauslauf (fallende Ist-Balken
//   gegen Projektende) drueckt den Schnitt und ignoriert zugleich, dass die
//   Restmonate laut Plan noch grosse Soll-Bloecke haben. Ergebnis: falsche
//   Gefaehrdungswarnung, obwohl die kumulierte Ist-Leistung auf Plan liegt.
//   FIX: prognostizierteGesamtStunden = Ist(abgeschlossene Monate) + Rest-Soll
//   (aktueller + kuenftige Monate) x Erfuellungsgrad, wobei Erfuellungsgrad =
//   Ist/Soll der bereits abgeschlossenen Monate (gekappt auf [0, 1.15]). Die
//   AP-genaue Soll-Verteilung (sollMonatMap) wird dafuer zentral vorne berechnet
//   und auch vom Monatsverlauf genutzt. Ampel-Schwellen unveraendert
//   (>=90% gruen, >=60% gelb, sonst rot). Neues Rueckgabefeld erfuellungsgrad.
// v7.4.9-5: Foerderformat-Labels: BMBF_KMU -> 'KMU-innovativ'; 'OTHER' ergaenzt.
// v7.4.9-4: Abrechnungs-Stundensatz pro Mitarbeiter skalieren.
//   - rateScale jetzt = echte weekly_hours des MA / pmBasis (statt global
//     firmStd / pmBasis). Vorteil: kein Durchreichen des Firmenstandards in die
//     Aufrufer noetig; mathematisch korrekt auch bei Teilzeit (jeder MA mit
//     seinem echten Gehalt/Stunden -> Kosten = PM x Monatsgehalt).
//   - Rueckwaertskompatibel: ohne pm_basis bleibt pmBasis = firmStd bzw. 40.
//
// Version: 7.4.9-3: Projektbezogene PM-Basis (WAZ aus Antrag/Bescheid).
//   - Neuer Helfer hoursPerPM(weeklyHours) = weeklyHours x 52 / 12.
//   - PFProject erhaelt pm_basis_weekly_hours (Projekt-Override) und
//     firm_standard_weekly_hours (Firmenstandard / Fallback).
//   - Soll-Stunden und PM-Umrechnung laufen ueber hoursPerPM(pmBasis) statt
//     der festen 173,33.
//   - Kosten: Stundensatz wird mit rateScale (= firmStd / pmBasis) auf die
//     Abrechnungs-Basis gehoben, damit Plan-/Ist-Kosten = PM x Monatsgehalt
//     ergeben (frueher Mischung 40h-Stunden x realer Stundensatz -> zu hoch).
//   - maxProjektstundenMonat akzeptiert optional pmBasis/firmStd (Foerder-
//     Obergrenze statt 40h-Physik). Ohne Parameter unveraendertes Verhalten.
//   - Rueckwaertskompatibel: ohne gesetzte Felder = 40-Basis wie bisher.
//
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
  // v7.4.9-3: WAZ-Basis aus Antrag/Bescheid (Projekt-Override).
  // NULL = erbt firm_standard_weekly_hours.
  pm_basis_weekly_hours?: number | null;
  // v7.4.9-3: Regelarbeitszeit der Firma (Fallback + Stundensatz-Skalierung).
  firm_standard_weekly_hours?: number | null;
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
  // v7.4.9-8: Projekt-Austritt. Gesetzt und in der Vergangenheit = ausgeschieden.
  // Optional -> abwaertskompatibel: fehlt das Feld, gilt der MA als verfuegbar.
  assignment_end?: string | null;
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
  erfuellungsgrad: number;              // v7.4.9-6: Ist/Soll bis heute (Planerfuellung, 0..1.15)
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
  gesamtMACount: number;              // v7.4.9-8: nur verfuegbare MA (ohne Ausgeschiedene)
  ausgeschiedenCount: number;         // v7.4.9-8: aus dem Projekt ausgeschiedene MA
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

/**
 * v7.4.9-3: Stunden pro Personenmonat fuer eine gegebene Wochenarbeitszeit.
 * = weeklyHours x 52 / 12. hoursPerPM(40) = 173,33 (= HOURS_PER_PM).
 */
export function hoursPerPM(weeklyHours: number): number {
  return (weeklyHours * 52) / 12;
}

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
  'BMBF_KMU':      'KMU-innovativ',
  'BMBF_DS':       'BMBF Durchfuehrbarkeitsstudie',
  'OTHER':         'Sonstige',
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
  'BMBF_KMU':      'KMU-innov.',
  'BMBF_DS':       'BMBF DS',
  'OTHER':         'Sonst.',
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

/** Maximale Projektstunden pro Monat fuer einen MA (GF-Regel beachten)
 *  v7.4.9-3: Optional projektbasiert. Ohne pmBasis/firmStd unveraendertes
 *  40h-Verhalten. Mit Parametern: Foerder-Obergrenze = hoursPerPM(pmBasis) x
 *  Beschaeftigungsgrad (waz / firmStd). */
export function maxProjektstundenMonat(
  emp: PFEmployee | undefined,
  pmBasisWeeklyHours?: number | null,
  firmStandardWeeklyHours?: number | null,
): number {
  const waz = emp?.weekly_hours ?? 40;
  const firmStd = firmStandardWeeklyHours ?? 40;
  const pmBasis = pmBasisWeeklyHours ?? firmStd;
  const basisMax = hoursPerPM(pmBasis) * (waz / firmStd);
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

  // v7.4.9-3/-4: Projektbezogene PM-Basis. hpm steuert Soll/PM-Umrechnung.
  // rateScaleFor hebt den auf realer MA-WAZ gespeicherten Stundensatz auf die
  // Abrechnungs-Basis (Antrag/Bescheid) -> Plan-/Ist-Kosten = PM x Monatsgehalt,
  // korrekt auch bei Teilzeit (rateScale = echte weekly_hours des MA / pmBasis).
  const firmStdWAZ = project.firm_standard_weekly_hours ?? 40;
  const pmBasisWAZ = project.pm_basis_weekly_hours ?? firmStdWAZ;
  const hpm = hoursPerPM(pmBasisWAZ);
  const rateScaleFor = (employeeId: string): number => {
    if (pmBasisWAZ <= 0) return 1;
    const empWaz = employees.find(e => e.id === employeeId)?.weekly_hours ?? pmBasisWAZ;
    return empWaz / pmBasisWAZ;
  };

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
  const gesamtPlanStunden = gesamtPlanPM * hpm;
  const gesamtIstStunden = projTimesheets.reduce((s, t) => s + (t.hours || 0), 0);
  const gesamtIstPM = gesamtIstStunden / hpm;
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
    const rs = rateScaleFor(pa.employee_id);
    gesamtPlanKosten += planPM * hpm * rate * rs * (1 + overhead);
    const istH = projTimesheets
      .filter(t => t.employee_id === pa.employee_id)
      .reduce((s, t) => s + (t.hours || 0), 0);
    gesamtIstKosten += istH * rate * rs * (1 + overhead);
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
      const istPM = istH / hpm;
      const rate = pa.hourly_rate || 0;
      const rs = rateScaleFor(pa.employee_id);
      const planKosten = planPM * hpm * rate * rs * (1 + overhead);
      const istKosten = istH * rate * rs * (1 + overhead);
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

  // v7.4.9-6: AP-genaue Soll-Verteilung je Monat -- einmal zentral berechnet und
  // sowohl fuer die plan-bezogene Prognose (unten) als auch fuer den
  // Monatsverlauf (weiter unten) genutzt. Verteilt die Plan-Stunden jedes AP
  // tagegenau auf die ueberlappenden Kalendermonate.
  const sollMonatMap: Record<string, number> = {};
  projWPs.forEach(wp => {
    if (!wp.start_date || !wp.end_date) return;
    const apStart = new Date(wp.start_date);
    const apEnd = new Date(wp.end_date);
    const apWPAs = wpAssignments.filter(wpa => wpa.work_package_id === wp.id);
    const apTotalPM = apWPAs.reduce((s, wpa) => s + (wpa.planned_person_months || 0), 0);
    const apTotalHours = apTotalPM * hpm;
    if (apTotalHours === 0) return;
    const apDurationDays = (apEnd.getTime() - apStart.getTime()) / (1000 * 60 * 60 * 24) + 1;
    if (apDurationDays <= 0) return;
    const hoursPerDay = apTotalHours / apDurationDays;
    const cursor = new Date(apStart.getFullYear(), apStart.getMonth(), 1);
    const lastMonth = new Date(apEnd.getFullYear(), apEnd.getMonth(), 1);
    while (cursor <= lastMonth) {
      const year = cursor.getFullYear();
      const month = cursor.getMonth() + 1;
      const monthStart = new Date(year, month - 1, 1);
      const monthEnd = new Date(year, month, 0);
      const overlapStart = apStart > monthStart ? apStart : monthStart;
      const overlapEnd = apEnd < monthEnd ? apEnd : monthEnd;
      const overlapDays = (overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24) + 1;
      if (overlapDays > 0) {
        const key = year + '-' + String(month).padStart(2, '0');
        sollMonatMap[key] = (sollMonatMap[key] || 0) + hoursPerDay * overlapDays;
      }
      cursor.setMonth(cursor.getMonth() + 1);
    }
  });

  // ---- Projektion: plan-bezogene Hochrechnung (v7.4.9-6) ----
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

  // v7.4.9-6: PLAN-BEZOGENE Hochrechnung statt flacher 3-Monats-Fortschreibung.
  // Die alte Formel (Ist + Durchschnitt-letzte-3-Monate x Restmonate) mass das
  // absolute Monatstempo und stufte den normalen Projektauslauf faelschlich als
  // "gefaehrdet" ein, obwohl die kumulierte Ist-Leistung planmaessig lag.
  // Neue Formel: Ist der abgeschlossenen Monate + noch geplantes Rest-Soll,
  // skaliert mit dem bisher erreichten Erfuellungsgrad (Ist/Soll der bereits
  // abgeschlossenen Monate).
  let istBisHeute = 0;
  let sollBisHeute = 0;
  let restSollAbHeute = 0;
  {
    const alleMonatKeys = new Set<string>([
      ...Object.keys(sollMonatMap),
      ...Object.keys(istMonatMap),
    ]);
    alleMonatKeys.forEach(key => {
      const parts = key.split('-');
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const abgeschlossen = new Date(y, m, 0) < now;
      const soll = sollMonatMap[key] || 0;
      const ist = istMonatMap[key] || 0;
      if (abgeschlossen) {
        sollBisHeute += soll;
        istBisHeute += ist;
      } else {
        restSollAbHeute += soll;
      }
    });
  }
  // Erfuellungsgrad auf [0, 1.15] gekappt: leichter Vorlauf darf die Prognose
  // stuetzen, aber nicht beliebig ueberzeichnen (Abrechnung ist ohnehin auf den
  // Plan gedeckelt). Ohne abgeschlossene Soll-Basis (Projektstart) = 1.
  const erfuellungsgrad = sollBisHeute > 0
    ? Math.min(Math.max(istBisHeute / sollBisHeute, 0), 1.15)
    : 1;
  const prognostizierteGesamtStunden = istBisHeute + restSollAbHeute * erfuellungsgrad;
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

  // v7.4.9-8: Verfuegbarkeit je MA aus Projekt-Zuordnungen. Ein MA ist
  // verfuegbar, wenn er mind. eine nicht-beendete Zuordnung hat (Kriterium wie
  // im FirmaCockpit). Ausgeschiedene (assignment_end in der Vergangenheit)
  // zaehlen nicht mehr als Kapazitaet.
  const heuteStr = now.toISOString().split('T')[0];
  const maVerfuegbarMap = new Map<string, boolean>();
  projAssignments.forEach(pa => {
    const verfuegbar = !pa.assignment_end || pa.assignment_end >= heuteStr;
    maVerfuegbarMap.set(
      pa.employee_id,
      (maVerfuegbarMap.get(pa.employee_id) || false) || verfuegbar
    );
  });
  const alleMAIds = Array.from(maVerfuegbarMap.keys());
  const verfuegbareMAIds = alleMAIds.filter(id => maVerfuegbarMap.get(id));
  const ausgeschiedenCount = alleMAIds.length - verfuegbareMAIds.length;
  // Ausgeschiedene nie als "aktiv" zaehlen, auch wenn sie zuletzt gebucht haben.
  const aktivCount = Array.from(aktiveMaIds).filter(id => maVerfuegbarMap.get(id)).length;
  const gesamtMACount = verfuegbareMAIds.length;

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
  // v7.4.9-8: Kapazitaets-Obergrenzen nur ueber verfuegbare MA (ohne Ausgeschiedene).
  const maObergrenzen = verfuegbareMAIds.map(empId => {
    const emp = employees.find(e => e.id === empId);
    const maxProMonat = maxProjektstundenMonat(emp, pmBasisWAZ, firmStdWAZ);
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

  // v7.4.9-8: gesamtMACount > 0 verhindert Division durch Null, falls alle
  // zugeordneten MA ausgeschieden sind (dann gibt es kein Team fuer Szenarien).
  if (restArbeitstage > 0 && gesamtMACount > 0) {
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
        // v7.4.9-9: Hinweis auf die Obergrenze immer zeigen, wenn 100% nicht
        // erreichbar ist (nicht erst unter 90%). So ist die Kapazitaetsgrenze
        // sichtbar, sobald die 100%-Empfehlung entfaellt.
        hinweis: maxErreichbarPct < 90
          ? 'Selbst bei Vollast nur max. ' + maxErreichbarPct + '% des Foerderziels'
          : (maxErreichbarPct < 100
            ? 'Bei Vollast max. ' + maxErreichbarPct + '% - 100% nicht erreichbar'
            : undefined),
      });
    }

    // v7.4.9-7: 100%-Empfehlung nur, wenn der aktuelle Kurs das Ziel NICHT
    // schon erreicht. Erreicht "weiter wie bisher" bereits >= Plan
    // (prognostizierteGesamtStunden >= gesamtPlanStunden), waere die Empfehlung
    // ueberfluessig und stuende im Widerspruch zur gruenen Kopf-Hochrechnung.
    const zielMitAktuellemKursErreicht = prognostizierteGesamtStunden >= gesamtPlanStunden;
    // v7.4.9-9: Nur zeigen, wenn 100% innerhalb der Vollast-Grenze erreichbar ist
    // (maxErreichbarPct >= 100). Dann gilt: benoetigter Team-Satz
    // (restStunden/restArbeitstage) <= Vollast-Team-Satz, der benoetigte Satz je
    // MA ist also nie hoeher als die Vollast-Obergrenze. Verhindert unmoegliche
    // Empfehlungen wie 10,9 h/Tag ueber der 6,3-Vollast.
    if (restArbeitstage > 0 && restStunden > 0 && maxErreichbarPct >= 100 && !zielMitAktuellemKursErreicht) {
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

    // v7.4.9-6: nutzt die zentral vorberechnete sollMonatMap (siehe oben).
    let sollKumuliert = 0;
    let istKumuliert = 0;
    let projektionKumuliert = gesamtIstStunden;
    let zielProjektionKumuliert = gesamtIstStunden;
    const aktuellerMonatKey = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');

    monatData = months.map(({ year, month, label }) => {
      const key = year + '-' + String(month).padStart(2, '0');
      const soll = Math.round(sollMonatMap[key] || 0);
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
          // v7.4.9-6: Prognoselinie folgt dem geplanten Monats-Soll, skaliert
          // mit dem Erfuellungsgrad (konsistent zur Headline-Hochrechnung).
          projektionKumuliert += (sollMonatMap[key] || 0) * erfuellungsgrad;
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
    erfuellungsgrad,
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
    ausgeschiedenCount,
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
