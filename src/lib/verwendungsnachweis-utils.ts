// ============================================================================
// verwendungsnachweis-utils-v1_2-2.ts
// Version: 1.2-4
// v1.2-4: ABSCHNITT B IN SICH GESCHLOSSEN + ABSCHNITT C (Personenstunden).
//   B BISHER FALSCH: gesamtZuwendung war die Summe der je ZA eingefrorenen
//   foerderbetrag_gesamt. Das sind ANFORDERUNGEN, nicht der endgueltige
//   Zuwendungsanspruch. Weil Abschnitt A die Kosten aus den aktuellen Stunden
//   und Saetzen neu rechnet, liefen A und B auseinander, sobald nach dem
//   Einreichen einer ZA etwas an den Stunden geaendert wurde. Folge: der
//   Eigenanteil war je nach Rechenweg verschieden - ein Widerspruch, denn
//   Kosten - Zuwendung und Kosten x (1 - Foerdersatz) muessen identisch sein.
//   FIX (nur DS/EP; NWM behaelt seine Jahres-Mischsaetze):
//     Zuwendung gesamt = Foerdersatz x Summe A
//     bisher erhalten  = Summe der Zahlungseingaenge
//     Schlusszahlung   = Zuwendung gesamt - bisher erhalten
//     Eigenanteil      = Summe A - Zuwendung gesamt
//     Summe            = Zuwendung gesamt + Eigenanteil  (muss Summe A sein)
//   Die Abweichung zu den tatsaechlich angeforderten Betraegen wird als
//   Warnung ausgewiesen (angefordertLautZa), nicht in B versteckt.
//   NEU Abschnitt C: kumulierte Personenstunden je Mitarbeiter (technisch /
//   nichttechnisch) ueber den Berichtszeitraum. Die DS-Schlussabrechnung
//   verlangt diese Gesamtzahlen; sie entstehen aus derselben taggenauen
//   Filterung wie die Kosten in A und sind damit gegen Zeile (1) und (4)
//   pruefbar. Sortierung nach employee_number (lfd. Nr. gemaess Antrag).
// v1.2-3: round2() wird EXPORTIERT. Hintergrund: ZAPanel hat den Foerder-
//   betrag mit Math.round() auf GANZE EURO gekappt, waehrend die Kosten
//   centgenau gefuehrt werden - das Formular verlangt in allen Spalten
//   [EUR, Cent]. Zudem rundet Math.round auch auf, wodurch mehr als der
//   Foerdersatz angefordert werden konnte. ZAPanel rundet ab v7.4.4-71
//   kaufmaennisch auf zwei Dezimalen und nutzt dafuer genau diese Funktion,
//   damit ZA und VN identisch runden.
// v1.2-2: TAGGENAUER ABRECHNUNGSFILTER (Fix Monatslogik).
//   BEFUND: computeDSPersonalkosten hat die Zeiterfassung ueber GANZE
//   Kalendermonate gefiltert (monthsInRange). Aus einem ZA-Zeitraum
//   01.07.-30.08. wurde damit "Juli und August komplett" -> Buchungen vom
//   31.08. wurden mitgerechnet, obwohl sie ausserhalb des Bewilligungs-
//   zeitraums liegen und nicht zuwendungsfaehig sind.
//   FIX: Filterung jetzt taggenau ueber ISO-String-Vergleich (work_date ist
//   'YYYY-MM-DD', lexikografische Ordnung = chronologische Ordnung). Kein
//   new Date() mehr -> zugleich weg mit der Zeitzonen-Falle, dass
//   new Date('2026-08-31') als UTC-Mitternacht geparst, aber mit
//   getFullYear()/getMonth() in Ortszeit ausgewertet wurde.
//   ZUSAETZLICH: harte Kappung auf den Bewilligungszeitraum des Projekts
//   (v7_projects.start_date / end_date). Ein ZA-Zeitraum, der darueber
//   hinausragt, kann keine Kosten mehr ausserhalb der Laufzeit erzeugen.
//   Die beiden Helfer abrechnungsFenster() und istImFenster() sind bewusst
//   EXPORTIERT: ZAPanel importiert exakt dieselbe Logik, damit ZA und VN
//   nicht erneut auseinanderlaufen koennen.
//   monthsInRange() entfaellt ersatzlos (wurde nur hier benutzt).
// v1.2-1: NWM-VARIANTE (Netzwerk-Management) implementiert - Phase 1 + Phase 2.
//   Der NWM-VN aggregiert die bereits in den ZA gespeicherten NWM-Werte
//   (nwm_personalkosten, nwm_kosten_dritte, nwm_kosten_uebrige, nwm_kosten_gesamt,
//   foerderbetrag_gesamt). Bewusst KEINE Neuberechnung der Personalkosten: jeder
//   ZA traegt seinen eigenen Foerdersatz je Laufzeitjahr (Phase 1/2 fallend),
//   der bereits in foerderbetrag_gesamt steckt -> Summe ist automatisch korrekt.
//   Zeilen: (1) Personalkosten, (2) Auftraege an Dritte, (3) Uebrige Kosten
//   (pauschal 100% der Personalkosten). Summe = Gesamtkosten NWM. Finanzierung:
//   Foerderbetrag (= Zuwendung gesamt) + NEU Eigenanteil (= Gesamt - Foerder).
//   Foerdersatz im Kopf = effektiver Mischsatz ueber alle Laufzeitjahre.
//   Phase aus project.netzwerk_phase (enthaelt '2' -> NW_PH2, sonst NW_PH1).
// v1.1-3: Zuschlag-Prozentsaetze in den Labels jetzt DYNAMISCH aus den
//   Projektdaten (overhead_t / overhead_nt) statt fest "30%". DS zeigt T und NT
//   getrennt mit den tatsaechlichen Werten; EP zeigt overhead_t. Die Rechnung
//   nutzte diese Werte bereits - nur die Beschriftung war fix.
// v1.1-2: FIX Varianten-Erkennung an die echten Enum-Werte (v7-types):
//   Einzel = ZIM_EINZEL, Koop = ZIM_KOOP (beide EP/Koop-VN), DS = ZIM_DS,
//   'ZIM' (Alt/allgemein) = EP/Koop. Netzwerk = ZIM_NETZWERK.
// Aggregations-Helfer VN-Modul (De-minimis-Varianten).
//
// Variantenfaehig: die Kernrechnung ist 1:1 aus ZAPanel-v7_4_4-61 uebernommen,
// je Foerderformat der passende ZA-Zweig:
//   - ZIM_DS  -> DS De-minimis (6 Zeilen T/NT + Zuschlag + Auftraege)
//   - ZIM     -> Einzel-/Koop (Personal, Zuschlag uebrige, Auftraege 6.3a,
//                FuE-Auftraege 6.3b, FuE-Personalaufnahme 6.3c)
//   - ZIM_NETZWERK -> NWM Phase 1/2 (Personal + Auftraege + Uebrige, Eigenanteil)
// AGVO ist bewusst NICHT abgebildet (wird direkt im PDF ausgefuellt).
//
// ASCII-only (Konvention): Umlaute in Anzeige-Strings als \u-Escapes.
// ============================================================================


// ------------------------------- Eingabetypen -------------------------------
export interface VNProject {
  id: string;
  funding_format: string | null;
  foerdersatz: number | null;
  overhead_t: number | null;
  overhead_nt: number | null;
  pm_basis_weekly_hours: number | null;
  short_name: string | null;
  title: string | null;
  foerderkennzeichen: string | null;
  bewilligung_datum: string | null;
  bewilligte_summe: number | null;
  start_date: string | null;
  end_date: string | null;
  client_company_id: string | null;
  netzwerk_phase: string | null;
}

export interface VNProjectAssignment {
  employee_id: string;
  project_id: string;
  employee_number: number | null;
  hourly_rate: number | null;
  hourly_rate_approved: number | null;
  weekly_hours: number | null;
}

export interface VNWorkPackage {
  id: string;
  project_id: string;
  is_technical: boolean | null;
}

export interface VNEmployee {
  id: string;
  display_name: string;
}

export interface VNTimesheet {
  project_id: string;
  employee_id: string;
  work_date: string;
  hours: number;
  is_active: boolean;
  is_billable: boolean;
  work_package_id: string | null;
}

export interface VNZahlungsanforderung {
  id: string;
  project_id: string;
  za_nummer: string | null;
  zeitraum_von: string | null;
  zeitraum_bis: string | null;
  auftraege_dritte_t: number | null;
  auftraege_dritte_nt: number | null;
  fue_unterauftrag: number | null;
  zeitw_personalaufnahme: number | null;
  foerderbetrag_gesamt: number | null;
  zahlungseingang_betrag: number | null;
  // NWM-Felder (nur ZIM_NETZWERK)
  nwm_personalkosten: number | null;
  nwm_kosten_dritte: number | null;
  nwm_kosten_uebrige: number | null;
  nwm_kosten_gesamt: number | null;
  foerdersatz_percent: number | null;
  laufzeitjahr: number | null;
}

export interface VNData {
  projects: VNProject[];
  projectAssignments: VNProjectAssignment[];
  workPackages: VNWorkPackage[];
  employees: VNEmployee[];
  timesheets: VNTimesheet[];
  zahlungsanforderungen: VNZahlungsanforderung[];
}


// ------------------------------ Ergebnistypen -------------------------------
export type VNVariante = 'DS_DEMINIMIS' | 'EP_KOOP' | 'NW_PH1' | 'NW_PH2' | 'UNBEKANNT';

export interface VNKostenZeile {
  nr: number;
  label: string;
  betrag: number;
}

export interface VNFinanzierung {
  bisherErhalten: number;
  gesamtZuwendung: number;
  schlusszahlung: number;
  eigenanteil: number;          // v1.2-4: immer gesetzt (Summe A - Zuwendung)
  summeFinanzierung: number;    // v1.2-4: Kontrollzeile, muss summeKosten sein
  angefordertLautZa: number;    // v1.2-4: Summe der eingereichten ZA-Betraege
}

// v1.2-4: Abschnitt C - kumulierte Personenstunden je Mitarbeiter
export interface VNStundenZeile {
  nr: number;
  empId: string;
  empName: string;
  stdT: number;
  stdNT: number;
  stdGesamt: number;
}

export interface VNResult {
  variante: VNVariante;
  varianteLabel: string;
  formularVersion: string;
  foerderkennzeichen: string | null;
  kurzbezeichnung: string | null;
  titelTeilvorhaben: string | null;
  bescheidDatum: string | null;
  foerdersatz: number;
  berichtszeitraumVon: string | null;
  berichtszeitraumBis: string | null;
  kostenZeilen: VNKostenZeile[];
  summeKosten: number;
  stundenZeilen: VNStundenZeile[];   // v1.2-4
  summeStdT: number;                 // v1.2-4
  summeStdNT: number;                // v1.2-4
  finanzierung: VNFinanzierung;
  anzahlZas: number;
  warnungen: string[];
}


// -------------------- Abrechnungsfenster (v1.2-2, zentral) ------------------
// EINZIGE Quelle der Wahrheit fuer "welche Zeitbuchung gehoert in diese
// Abrechnung". Auch von ZAPanel importiert - nicht duplizieren.
//
// Regel: das abrechenbare Fenster ist der Schnitt aus
//   [ZA-Zeitraum] und [Bewilligungszeitraum des Projekts].
// Liegt kein Schnitt vor (leeres Fenster), wird null geliefert.
//
// Datumsformat: ISO 'YYYY-MM-DD'. Der Vergleich erfolgt bewusst als
// String-Vergleich - bei ISO-Daten ist die lexikografische Ordnung identisch
// zur chronologischen, und es entstehen keine Zeitzonen-Verschiebungen.

export function toIsoDay(value: string | null | undefined): string | null {
  if (!value) return null;
  const s = String(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

export function abrechnungsFenster(
  zaVon: string | null | undefined,
  zaBis: string | null | undefined,
  projektStart: string | null | undefined,
  projektEnde: string | null | undefined,
): { von: string; bis: string } | null {
  const von0 = toIsoDay(zaVon);
  const bis0 = toIsoDay(zaBis);
  if (!von0 || !bis0) return null;
  const pStart = toIsoDay(projektStart);
  const pEnde = toIsoDay(projektEnde);
  const von = pStart && pStart > von0 ? pStart : von0;
  const bis = pEnde && pEnde < bis0 ? pEnde : bis0;
  if (von > bis) return null;
  return { von, bis };
}

export function istImFenster(workDate: string | null | undefined, von: string, bis: string): boolean {
  const d = toIsoDay(workDate);
  if (!d) return false;
  return d >= von && d <= bis;
}


// ------------------------------ Hilfsfunktionen -----------------------------
// v1.2-3: exportiert - ZAPanel nutzt dieselbe Rundung (kaufmaennisch, 2 Dez.)
export function round2(n: number): number { return Math.round(n * 100) / 100; }

export function getHourlyRate(pa: VNProjectAssignment | undefined, project: VNProject | undefined): number | null {
  if (!pa) return null;
  if (pa.hourly_rate_approved != null) return pa.hourly_rate_approved;
  if (pa.hourly_rate != null) {
    const pmBasis = (project?.pm_basis_weekly_hours ?? pa.weekly_hours) ?? null;
    const realWAZ = pa.weekly_hours ?? pmBasis;
    if (pmBasis && realWAZ && pmBasis > 0) return pa.hourly_rate * (realWAZ / pmBasis);
    return pa.hourly_rate;
  }
  return null;
}

// Personalkosten technisch/nichttechnisch fuer einen Zeitraum.
// v1.2-2: taggenau statt monatsweise, zusaetzlich auf den Bewilligungs-
// zeitraum des Projekts gekappt. Bei Nicht-DS-Projekten (isDS=false) landen
// ALLE Stunden in pkT, pkNT=0.
export function computeDSPersonalkosten(
  projectId: string, vonStr: string, bisStr: string, data: VNData,
): { pkT: number; pkNT: number } {
  const project = data.projects.find(p => p.id === projectId);
  if (!project || !vonStr || !bisStr) return { pkT: 0, pkNT: 0 };

  const fenster = abrechnungsFenster(vonStr, bisStr, project.start_date, project.end_date);
  if (!fenster) return { pkT: 0, pkNT: 0 };
  const { von, bis } = fenster;

  const isDS = String(project.funding_format || '').toUpperCase().trim() === 'ZIM_DS';
  const technicalWPIds = isDS
    ? data.workPackages.filter(wp => wp.project_id === projectId && wp.is_technical === true).map(wp => wp.id)
    : [];
  const empIds = [...new Set(data.projectAssignments.filter(pa => pa.project_id === projectId).map(pa => pa.employee_id))];

  let pkT = 0, pkNT = 0;
  for (const empId of empIds) {
    const pa = data.projectAssignments.find(a => a.employee_id === empId && a.project_id === projectId);
    const rate = getHourlyRate(pa, project) || 0;
    const entries = data.timesheets.filter(ts =>
      ts.project_id === projectId && ts.employee_id === empId &&
      ts.is_active && ts.is_billable &&
      istImFenster(ts.work_date, von, bis));
    let hoursT = 0, hoursNT = 0;
    if (isDS) {
      hoursT = entries.filter(ts => technicalWPIds.includes(ts.work_package_id || '')).reduce((s, ts) => s + ts.hours, 0);
      hoursNT = entries.filter(ts => !technicalWPIds.includes(ts.work_package_id || '')).reduce((s, ts) => s + ts.hours, 0);
    } else {
      hoursT = entries.reduce((s, ts) => s + ts.hours, 0);
    }
    pkT += hoursT * rate; pkNT += hoursNT * rate;
  }
  return { pkT, pkNT };
}

// v1.2-4: Personenstunden technisch/nichttechnisch je Mitarbeiter fuer einen
// Zeitraum - gleiche Filterung wie computeDSPersonalkosten, nur ohne Satz.
export function computeDSPersonenstunden(
  projectId: string, vonStr: string, bisStr: string, data: VNData,
): Array<{ empId: string; stdT: number; stdNT: number }> {
  const project = data.projects.find(p => p.id === projectId);
  if (!project || !vonStr || !bisStr) return [];
  const fenster = abrechnungsFenster(vonStr, bisStr, project.start_date, project.end_date);
  if (!fenster) return [];
  const { von, bis } = fenster;

  const isDS = String(project.funding_format || '').toUpperCase().trim() === 'ZIM_DS';
  const technicalWPIds = isDS
    ? data.workPackages.filter(wp => wp.project_id === projectId && wp.is_technical === true).map(wp => wp.id)
    : [];
  const empIds = [...new Set(data.projectAssignments.filter(pa => pa.project_id === projectId).map(pa => pa.employee_id))];

  return empIds.map(empId => {
    const entries = data.timesheets.filter(ts =>
      ts.project_id === projectId && ts.employee_id === empId &&
      ts.is_active && ts.is_billable &&
      istImFenster(ts.work_date, von, bis));
    const stdT = isDS
      ? entries.filter(ts => technicalWPIds.includes(ts.work_package_id || '')).reduce((s, ts) => s + ts.hours, 0)
      : entries.reduce((s, ts) => s + ts.hours, 0);
    const stdNT = isDS
      ? entries.filter(ts => !technicalWPIds.includes(ts.work_package_id || '')).reduce((s, ts) => s + ts.hours, 0)
      : 0;
    return { empId, stdT, stdNT };
  });
}

// Variante aus Foerderformat + (bei Netzwerk) Phase bestimmen.
// AGVO bewusst ausgeklammert. netzwerkPhase enthaelt typ. '1'/'2' bzw.
// 'Etablierung'/'Umsetzung' -> alles mit '2' oder 'umsetzung' = Phase 2.
export function bestimmeVariante(fundingFormat: string | null, netzwerkPhase?: string | null): VNVariante {
  const f = String(fundingFormat || '').toUpperCase().trim();
  if (f === 'ZIM_DS') return 'DS_DEMINIMIS';
  if (f === 'ZIM_EINZEL' || f === 'ZIM_KOOP' || f === 'ZIM') return 'EP_KOOP';
  if (f === 'ZIM_NETZWERK') {
    const ph = String(netzwerkPhase || '').toLowerCase();
    if (ph.includes('2') || ph.includes('umsetzung')) return 'NW_PH2';
    return 'NW_PH1';
  }
  return 'UNBEKANNT';
}

const VARIANTE_META: Record<VNVariante, { label: string; version: string }> = {
  DS_DEMINIMIS: { label: 'DS De-minimis', version: '3.00' },
  EP_KOOP:      { label: 'Einzel-/Kooperationsprojekt', version: '3.02' },
  NW_PH1:       { label: 'Netzwerk Phase 1', version: '3.00' },
  NW_PH2:       { label: 'Netzwerk Phase 2', version: '3.00' },
  UNBEKANNT:    { label: 'unbekannt', version: '' },
};

// Zeilen-Labels werden je Variante dynamisch in computeVNSchluss gebaut
// (Zuschlag-Prozentsatz aus overhead_t / overhead_nt der Projektdaten).

function zaImZeitraum(za: VNZahlungsanforderung, von: string | null, bis: string | null): boolean {
  if (!za.zeitraum_von || !za.zeitraum_bis) return false;
  if (von && za.zeitraum_von < von) return false;
  if (bis && za.zeitraum_bis > bis) return false;
  return true;
}


// ------------------------------ Hauptfunktion -------------------------------
export function computeVNSchluss(
  projectId: string, vonStr: string | null, bisStr: string | null, data: VNData,
): VNResult {
  const project = data.projects.find(p => p.id === projectId);
  const warnungen: string[] = [];
  const variante = bestimmeVariante(project?.funding_format ?? null, project?.netzwerk_phase ?? null);
  const meta = VARIANTE_META[variante];

  const von = vonStr ?? project?.start_date ?? null;
  const bis = bisStr ?? project?.end_date ?? null;

  const zas = data.zahlungsanforderungen
    .filter(za => za.project_id === projectId)
    .filter(za => zaImZeitraum(za, von, bis));
  if (zas.length === 0) warnungen.push('Keine Zahlungsanforderungen im Berichtszeitraum gefunden.');

  // v1.2-2: Hinweis, wenn ein ZA-Zeitraum ueber den Bewilligungszeitraum
  // hinausragt - die Kosten werden dann gekappt und weichen bewusst von der
  // eingereichten ZA ab.
  const pStart = toIsoDay(project?.start_date);
  const pEnde = toIsoDay(project?.end_date);
  for (const za of zas) {
    const zv = toIsoDay(za.zeitraum_von);
    const zb = toIsoDay(za.zeitraum_bis);
    if ((pStart && zv && zv < pStart) || (pEnde && zb && zb > pEnde)) {
      warnungen.push('ZA ' + (za.za_nummer || '?') + ': Abrechnungszeitraum ragt \u00fcber den Bewilligungszeitraum hinaus - Kosten wurden auf die Laufzeit gekappt.');
    }
  }

  const overheadT = project?.overhead_t || 0;
  const overheadNT = (project?.overhead_nt ?? project?.overhead_t) || 0;
  let foerdersatz = project?.foerdersatz || 0;

  let betraege: number[] = [];
  let labels: string[] = [];
  let eigenanteil: number | undefined = undefined;

  if (variante === 'DS_DEMINIMIS') {
    let pkT = 0, gkT = 0, auftrT = 0, pkNT = 0, gkNT = 0, auftrNT = 0, fueUA = 0, zeitwPA = 0;
    for (const za of zas) {
      const { pkT: a, pkNT: b } = computeDSPersonalkosten(projectId, za.zeitraum_von || '', za.zeitraum_bis || '', data);
      pkT += a; pkNT += b;
      gkT += a * overheadT / 100; gkNT += b * overheadNT / 100;
      auftrT += za.auftraege_dritte_t || 0; auftrNT += za.auftraege_dritte_nt || 0;
      fueUA += za.fue_unterauftrag || 0; zeitwPA += za.zeitw_personalaufnahme || 0;
    }
    betraege = [pkT, gkT, auftrT, pkNT, gkNT, auftrNT].map(round2);
    labels = [
      'Personal technisch',
      'Zuschlag f\u00fcr \u00fcbrige Kosten technisch (' + overheadT + '%)',
      'Kosten der Auftr\u00e4ge an Dritte, technisch',
      'Personal nichttechnisch',
      'Zuschlag f\u00fcr \u00fcbrige Kosten nichttechnisch (' + overheadNT + '%)',
      'Kosten der Auftr\u00e4ge an Dritte, nichttechnisch',
    ];
    if (round2(fueUA) > 0 || round2(zeitwPA) > 0)
      warnungen.push('FuE-Unterauftrag / zeitw. Personalaufnahme > 0 - im DS-Formular nicht vorgesehen; Sonderfall pruefen.');
  } else if (variante === 'EP_KOOP') {
    let pk = 0, gk = 0, auftr = 0, fueUA = 0, zeitwPA = 0;
    for (const za of zas) {
      const { pkT } = computeDSPersonalkosten(projectId, za.zeitraum_von || '', za.zeitraum_bis || '', data);
      pk += pkT; gk += pkT * overheadT / 100;
      auftr += za.auftraege_dritte_t || 0;
      fueUA += za.fue_unterauftrag || 0; zeitwPA += za.zeitw_personalaufnahme || 0;
    }
    betraege = [pk, gk, auftr, fueUA, zeitwPA].map(round2);
    labels = [
      'Personalkosten (6.2)',
      'Zuschlag f\u00fcr \u00fcbrige Kosten (' + overheadT + '%)',
      'Kosten f\u00fcr projektbezogene Auftr\u00e4ge an Dritte (6.3a)',
      'Kosten f\u00fcr FuE-Auftr\u00e4ge (6.3b)',
      'Kosten f\u00fcr FuE-Personalaufnahme (6.3c)',
    ];
  } else if (variante === 'NW_PH1' || variante === 'NW_PH2') {
    // NWM: die je ZA gespeicherten NWM-Werte aggregieren. Foerdersatz/Laufzeit-
    // jahr stecken bereits in foerderbetrag_gesamt je ZA -> Summe ist korrekt.
    let pk = 0, dritte = 0, uebrige = 0, gesamt = 0, foerder = 0;
    for (const za of zas) {
      pk += za.nwm_personalkosten || 0;
      dritte += za.nwm_kosten_dritte || 0;
      uebrige += za.nwm_kosten_uebrige || 0;
      gesamt += za.nwm_kosten_gesamt || 0;
      foerder += za.foerderbetrag_gesamt || 0;
    }
    pk = round2(pk); dritte = round2(dritte); uebrige = round2(uebrige);
    // Gesamt bevorzugt aus gespeichertem Feld, sonst aus den Teilbetraegen.
    const gesamtKosten = round2(gesamt) || round2(pk + dritte + uebrige);
    const foerderbetrag = round2(foerder);
    betraege = [pk, dritte, uebrige];
    labels = [
      'Personalkosten (f\u00f6rderf\u00e4hig)',
      'Kosten der Auftr\u00e4ge an Dritte',
      '\u00dcbrige Kosten (pauschal 100% der Personalkosten)',
    ];
    eigenanteil = round2(gesamtKosten - foerderbetrag);
    // Kopf-Foerdersatz: effektiver Mischsatz ueber alle Laufzeitjahre.
    foerdersatz = gesamtKosten > 0 ? round2(foerderbetrag / gesamtKosten * 100) : 0;
    if (gesamtKosten === 0)
      warnungen.push('Keine NWM-Kosten in den Zahlungsanforderungen gefunden - wurden die ZA mit NWM-Feldern gespeichert?');
    warnungen.push('NWM: Foerdersatz im Kopf ist der effektive Mischsatz ueber alle Laufzeitjahre (je Jahr fallend).');
  } else {
    warnungen.push('Foerderformat nicht als VN-Variante erkannt (AGVO bleibt aussen vor).');
    betraege = []; labels = [];
  }

  const kostenZeilen: VNKostenZeile[] = labels.map((label, i) => ({ nr: i + 1, label, betrag: betraege[i] }));
  const summeKosten = round2(betraege.reduce((s, v) => s + v, 0));

  // ------------------------- Abschnitt C: Stunden ---------------------------
  // Ueber dieselben ZA aggregiert wie die Kosten -> Stunden x Satz muss Zeile
  // (1) bzw. (4) ergeben.
  const stdMap = new Map<string, { stdT: number; stdNT: number }>();
  for (const za of zas) {
    for (const r of computeDSPersonenstunden(projectId, za.zeitraum_von || '', za.zeitraum_bis || '', data)) {
      const cur = stdMap.get(r.empId) || { stdT: 0, stdNT: 0 };
      cur.stdT += r.stdT; cur.stdNT += r.stdNT;
      stdMap.set(r.empId, cur);
    }
  }
  const nummerVon = (empId: string): number =>
    data.projectAssignments.find(pa => pa.project_id === projectId && pa.employee_id === empId)?.employee_number ?? 999;
  const stundenZeilen: VNStundenZeile[] = [...stdMap.entries()]
    .map(([empId, v]) => ({
      nr: 0, empId,
      empName: data.employees.find(e => e.id === empId)?.display_name || empId,
      stdT: round2(v.stdT), stdNT: round2(v.stdNT), stdGesamt: round2(v.stdT + v.stdNT),
    }))
    .filter(r => r.stdGesamt > 0)
    .sort((a, b) => (nummerVon(a.empId) - nummerVon(b.empId)) || a.empName.localeCompare(b.empName))
    .map((r, i) => ({ ...r, nr: i + 1 }));
  const summeStdT = round2(stundenZeilen.reduce((s, r) => s + r.stdT, 0));
  const summeStdNT = round2(stundenZeilen.reduce((s, r) => s + r.stdNT, 0));

  // ---------------------- Abschnitt B: Finanzierung -------------------------
  const bisherErhalten = round2(zas.reduce((s, za) => s + (za.zahlungseingang_betrag || 0), 0));
  const angefordertLautZa = round2(zas.reduce((s, za) => s + (za.foerderbetrag_gesamt || 0), 0));

  // NWM traegt je Laufzeitjahr einen eigenen Foerdersatz; dort bleibt die
  // Summe der ZA-Betraege massgeblich (eigenanteil kommt aus dem NWM-Zweig).
  const istNWM = variante === 'NW_PH1' || variante === 'NW_PH2';
  const gesamtZuwendung = istNWM
    ? angefordertLautZa
    : round2(summeKosten * foerdersatz / 100);
  // eigenanteil ist im NWM-Zweig bereits gesetzt; sonst Residuum aus A.
  const eigenanteilWert: number = eigenanteil != null ? eigenanteil : round2(summeKosten - gesamtZuwendung);
  const summeFinanzierung = round2(gesamtZuwendung + eigenanteilWert);
  const schlusszahlung = round2(gesamtZuwendung - bisherErhalten);

  if (!istNWM && Math.abs(angefordertLautZa - gesamtZuwendung) > 0.005) {
    const diff = round2(angefordertLautZa - gesamtZuwendung);
    warnungen.push(
      'Mit den Zahlungsanforderungen wurden ' + angefordertLautZa.toFixed(2) +
      ' EUR angefordert, der Anspruch aus Abschnitt A betr\u00e4gt ' + gesamtZuwendung.toFixed(2) +
      ' EUR (Differenz ' + (diff > 0 ? '+' : '') + diff.toFixed(2) +
      ' EUR). Ma\u00dfgeblich ist der Anspruch; die Differenz gleicht die Schlusszahlung aus.');
  }
  if (schlusszahlung < 0) {
    warnungen.push('Die bisher erhaltenen Zuwendungen \u00fcbersteigen den Anspruch - es ergibt sich eine R\u00fcckforderung.');
  }

  return {
    variante, varianteLabel: meta.label, formularVersion: meta.version,
    foerderkennzeichen: project?.foerderkennzeichen ?? null,
    kurzbezeichnung: project?.short_name ?? null,
    titelTeilvorhaben: project?.title ?? null,
    bescheidDatum: project?.bewilligung_datum ?? null,
    foerdersatz,
    berichtszeitraumVon: von, berichtszeitraumBis: bis,
    kostenZeilen, summeKosten,
    stundenZeilen, summeStdT, summeStdNT,
    finanzierung: { bisherErhalten, gesamtZuwendung, schlusszahlung, eigenanteil: eigenanteilWert, summeFinanzierung, angefordertLautZa },
    anzahlZas: zas.length, warnungen,
  };
}
