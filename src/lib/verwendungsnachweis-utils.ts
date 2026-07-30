// ============================================================================
// verwendungsnachweis-utils-v1_2-1.ts
// Version: 1.2-1
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
  eigenanteil?: number; // nur NWM: Eigenanteil des Netzwerkpartners
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
  finanzierung: VNFinanzierung;
  anzahlZas: number;
  warnungen: string[];
}


// ------------------------------ Hilfsfunktionen -----------------------------
function round2(n: number): number { return Math.round(n * 100) / 100; }

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

function monthsInRange(vonStr: string, bisStr: string): { year: number; month: number }[] {
  const von = new Date(vonStr); const bis = new Date(bisStr);
  const out: { year: number; month: number }[] = [];
  const cur = new Date(von.getFullYear(), von.getMonth(), 1);
  while (cur <= bis) { out.push({ year: cur.getFullYear(), month: cur.getMonth() + 1 }); cur.setMonth(cur.getMonth() + 1); }
  return out;
}

// Personalkosten technisch/nichttechnisch fuer einen Zeitraum (1:1 ZAPanel).
// Bei Nicht-DS-Projekten (isDS=false) landen ALLE Stunden in pkT, pkNT=0.
export function computeDSPersonalkosten(
  projectId: string, vonStr: string, bisStr: string, data: VNData,
): { pkT: number; pkNT: number } {
  const project = data.projects.find(p => p.id === projectId);
  if (!project || !vonStr || !bisStr) return { pkT: 0, pkNT: 0 };
  const isDS = String(project.funding_format || '').toUpperCase().trim() === 'ZIM_DS';
  const months = monthsInRange(vonStr, bisStr);
  const technicalWPIds = isDS
    ? data.workPackages.filter(wp => wp.project_id === projectId && wp.is_technical === true).map(wp => wp.id)
    : [];
  const empIds = [...new Set(data.projectAssignments.filter(pa => pa.project_id === projectId).map(pa => pa.employee_id))];
  let pkT = 0, pkNT = 0;
  for (const empId of empIds) {
    const pa = data.projectAssignments.find(a => a.employee_id === empId && a.project_id === projectId);
    const rate = getHourlyRate(pa, project) || 0;
    let hoursT = 0, hoursNT = 0;
    for (const m of months) {
      const entries = data.timesheets.filter(ts =>
        ts.project_id === projectId && ts.employee_id === empId && ts.is_active && ts.is_billable &&
        (() => { const d = new Date(ts.work_date); return d.getFullYear() === m.year && (d.getMonth() + 1) === m.month; })());
      if (isDS) {
        hoursT += entries.filter(ts => technicalWPIds.includes(ts.work_package_id || '')).reduce((s, ts) => s + ts.hours, 0);
        hoursNT += entries.filter(ts => !technicalWPIds.includes(ts.work_package_id || '')).reduce((s, ts) => s + ts.hours, 0);
      } else {
        hoursT += entries.reduce((s, ts) => s + ts.hours, 0);
      }
    }
    pkT += hoursT * rate; pkNT += hoursNT * rate;
  }
  return { pkT, pkNT };
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

  const bisherErhalten = round2(zas.reduce((s, za) => s + (za.zahlungseingang_betrag || 0), 0));
  const gesamtZuwendung = round2(zas.reduce((s, za) => s + (za.foerderbetrag_gesamt || 0), 0));
  const schlusszahlung = round2(Math.max(0, gesamtZuwendung - bisherErhalten));

  return {
    variante, varianteLabel: meta.label, formularVersion: meta.version,
    foerderkennzeichen: project?.foerderkennzeichen ?? null,
    kurzbezeichnung: project?.short_name ?? null,
    titelTeilvorhaben: project?.title ?? null,
    bescheidDatum: project?.bewilligung_datum ?? null,
    foerdersatz,
    berichtszeitraumVon: von, berichtszeitraumBis: bis,
    kostenZeilen, summeKosten,
    finanzierung: { bisherErhalten, gesamtZuwendung, schlusszahlung, eigenanteil },
    anzahlZas: zas.length, warnungen,
  };
}
