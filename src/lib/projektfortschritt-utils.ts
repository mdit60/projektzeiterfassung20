// src/lib/projektfortschritt-utils.ts
// ============================================================================
// PZE V7 - Projekt-Fortschritt Berechnungslogik (Shared Utility)
// ============================================================================
// Version: 7.4.9-15
// Datum: 11. August 2026
// v7.4.9-15: DREISTUFIGE Zielerreichungs-Sicht. Neben (1) "Weiter wie bisher" und
//   (2) "Vollast (Maximum, offiziell leistbar)" gibt es jetzt Stufe (3) "Was fuer
//   100% zusaetzlich noetig waere". Neues Rueckgabeobjekt bedarfFuer100:
//     - zielSchonErreicht: aktueller Kurs erreicht 100% (kein Zusatzbedarf)
//     - imRahmenMoeglich: 100% ist innerhalb der WAZ-Vollast machbar -> noetiges
//       Team-Tempo (h/Tag)
//     - sonst: fehlende Stunden ueber die Vollast hinaus, ausgedrueckt als
//       Team-Mehrarbeit (h/Tag ueber die WAZ) ODER zusaetzliche Vollzeit-MA-
//       Aequivalente ueber die Restlaufzeit.
//   Die fruehere Szenario-Zeile "Fuer 100% Ziel" entfaellt (in Stufe 3 aufgegangen).
//   Die offizielle Vollast bleibt bei den foerderfaehig-sauberen Grenzen (MA WAZ,
//   GF 50%) - der 100%-Bedarf ist bewusst nur ein Hinweis, keine foerderfaehige Zusage.
// v7.4.9-14: MASSSTAB "100% Zielerreichung" = volle Ausschoepfung der BEWILLIGTEN
//   Foerdersumme (fachliche Vorgabe). Bisher war die Obergrenze auf
//   min(bewilligte_summe, Plankosten x Foerdersatz) gekappt (v7.4.9-2), sodass
//   "Bei 100%" die (ggf. niedrigeren) Plankosten x Satz zeigte und "verschenkt"
//   sich daran mass. NEU: foerderMaximum = bewilligte Summe (falls gesetzt);
//   "Bei 100% abrufbar" = bewilligte Summe; "verschenkt" = bewilligte Summe minus
//   abrufbar-bei-Prognose. Ohne bewilligte Summe Fallback auf Plankosten x Satz.
//   Folge: Ist der erfasste Plan guenstiger als die Bewilligung, zeigt
//   "verschenkt" dauerhaft die Luecke bis zur vollen Ausschoepfung - gewollt.
// v7.4.9-13: FIX Firmenstandard-WAZ. Der Beschaeftigungsgrad (waz / firmStd) fiel
//   auf firmStd = 40 zurueck, wenn project.firm_standard_weekly_hours nicht
//   gesetzt/geladen war - dadurch galt ein 37,5-h-Vollzeit-MA faelschlich als
//   93,75% und das Monatsmaximum war zu niedrig (GF 76 statt 81, MA entsprechend).
//   FIX: firmStd faellt jetzt auf options.firmStandardWeeklyHours (Firmen-
//   Regelarbeitszeit) bzw. die Antrags-WAZ (pm_basis) zurueck, erst dann auf 40.
//   Neues optionales Feld options.firmStandardWeeklyHours; die Aufrufer geben die
//   standard_weekly_hours der Firma mit.
// v7.4.9-12: FIX GF-Erkennung. Die 50%-Regel fuer Geschaeftsfuehrer griff nicht,
//   weil die lokale Pruefung den position_title exakt gegen die ASCII-
//   transliterierte Liste GF_POSITIONS (['Geschaeftsfuehrer', ...]) verglich,
//   die Stammdaten aber den echten Umlaut-String (Position mit ae/ue als echte
//   Umlaute) speichern -> nie ein Treffer, GF bekam faelschlich das volle
//   Monatsmaximum
//   (z.B. 162 statt 82 h). FIX: Nutzt jetzt die kanonische, umlaut-robuste
//   istGeschaeftsfuehrerTitle() aus v7-types (normalisiert Schreibweisen) in
//   maxProjektstundenMonat() und istGeschaeftsfuehrer(). Die alte ASCII-Liste
//   GF_POSITIONS bleibt nur als Export erhalten, wird aber nicht mehr zur
//   Erkennung genutzt.
// v7.4.9-11: PROGNOSE-NEUFASSUNG STUFE 2 (Ebene 2 - auslastungsbasierte
//   Hochrechnung). Siehe KONZEPT-PROGNOSE-NEU-v0_2. Die Kopf-Hochrechnung ist
//   nicht mehr die Planerfuellungs-Fortschreibung, sondern:
//     Prognose = Ist_bisher + Summe(kuenftige Monate: Potential(MA,Monat) x
//                erwartete Auslastung(MA)), inkl. Rest des laufenden Monats,
//                gedeckelt auf die Vollast-Kapazitaet (teamPotentialRest).
//   Erwartete Auslastung je MA = gleitender Durchschnitt (letzte 3 abgeschl.
//   Monate) von Ist/Potential, auf [0,1] geklemmt; Fallback: projektweite
//   Durchschnittsauslastung; ganz ohne Historie/ohne options -> Rueckfall auf die
//   bisherige Planerfuellungs-Hochrechnung (prognoseModell='planerfuellung').
//   Loest den Widerspruch "Kopf 98% trotz Kapazitaet ~90%": die Prognose kann
//   nie ueber die reale Teamkapazitaet steigen. Neue Felder: erwarteteAuslastung,
//   prognoseModell, prognoseVorlaeufig (true, solange < 3 repraesentative Monate).
//   Auch die gestrichelte Chart-Prognoselinie folgt jetzt dem Auslastungsmodell.
// v7.4.9-10: PROGNOSE-NEUFASSUNG STUFE 1 (Ebene 1 - reales Kapazitaetspotential).
//   Siehe KONZEPT-PROGNOSE-NEU-v0_2. Bisher: die maximal erreichbare Kapazitaet
//   des Teams war Pauschale (teamMaxProMonat x Restmonate) - ohne Lage der
//   Arbeitstage, ohne Feiertage, ohne Abwesenheiten. NEU: Das Restpotential wird
//   MONATSGENAU aus echten Nettoarbeitstagen (Werktage minus Feiertage laut
//   germanHolidays fuer Bundesland/holiday_region minus erfasste/geplante
//   Abwesenheiten) mal foerderfaehiger Tagesrate je MA berechnet und ueber die
//   Restmonate summiert (teamPotentialRest). Ein-/Austritt je Monat via
//   assignment_start/assignment_end (Ersatz-MA ab Eintritt, Ausgeschiedene ab
//   Austritt = 0). Ersetzt teamMaxErreichbar in maxErreichbarPct und im
//   Foerder-Konsequenzen-Block. Die Tages-Anzeigen (Vollast h/Tag) bleiben die
//   foerderfaehige Tagesrate und aendern sich nicht.
//   NEUE INPUTS (alle optional, abwaertskompatibel): options.federalState,
//   options.holidayRegion, options.absences. Ohne options faellt die Berechnung
//   auf Werktage ohne Feiertage/Abwesenheiten zurueck (Verhalten wie bisher, nur
//   mit echten Werktagszahlen je Monat statt Pauschal-21,7).
//   HINWEIS: Ebene 2 (auslastungsbasierte Hochrechnung) und Ebene 3
//   (ZA-Optimierung) folgen in Stufe 2/3; die Kopf-Hochrechnung ist hier noch
//   das Planerfuellungs-Modell aus v7.4.9-6.
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

import {
  getGermanHolidays,
  countWorkdaysInMonth,
  countWorkdays,
  type HolidayRegion,
} from './holidays/germanHolidays';
// v7.4.9-12: kanonische, umlaut-robuste GF-Erkennung (einzige Quelle laut v7-types).
import { istGeschaeftsfuehrerTitle } from '@/types/v7-types';

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
  // v7.4.9-10: Projekt-Eintritt. Fuer die monatsgenaue Potentialberechnung
  // (Ersatz-MA traegt Potential erst ab assignment_start bei). Optional.
  assignment_start?: string | null;
}

// v7.4.9-10: Abwesenheit (U/K/S) als Eingabe fuer die Potentialberechnung.
// work_date im Format 'YYYY-MM-DD'. Quelle: loadEmployeeAbsencesAsTimesheets.
export interface PFAbsenceEntry {
  employee_id: string;
  work_date: string;
  absence_code?: string | null;
}

// v7.4.9-10: Optionale Zusatz-Eingaben fuer die kapazitaetsbasierte Prognose.
// Alle Felder optional -> ohne sie Verhalten wie zuvor (Fallback auf Werktage
// ohne Feiertage/Abwesenheiten).
export interface PFPrognoseOptions {
  federalState?: string | null;   // Bundesland (Langname oder ISO) der Firma
  holidayRegion?: HolidayRegion;  // kommunaler Feiertags-Override (z.B. BY_AUGSBURG)
  absences?: PFAbsenceEntry[];     // erfasste UND geplante Abwesenheiten
  // v7.4.9-13: Firmen-Regelarbeitszeit (standard_weekly_hours) als Referenz fuer
  // den Beschaeftigungsgrad. Ohne diesen Wert faellt firmStd auf die Antrags-WAZ
  // (pm_basis) und erst dann auf 40 zurueck.
  firmStandardWeeklyHours?: number | null;
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

// v7.4.9-15: Stufe 3 - Bedarf, um 100% zu erreichen.
export interface BedarfFuer100 {
  zielSchonErreicht: boolean;   // aktueller Kurs erreicht bereits 100%
  imRahmenMoeglich: boolean;    // 100% ist mit WAZ-Vollast machbar
  fehlendStunden: number;       // Luecke ueber die Vollast hinaus (h)
  noetigTeamHProTag: number;    // bei imRahmenMoeglich: noetiges Team-Tempo (h/Tag)
  mehrarbeitProTag: number;     // sonst: Team-Mehrarbeit je Tag ueber die WAZ (h/Tag)
  zusatzMa: number;             // sonst: zusaetzliche Vollzeit-MA-Aequivalente
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
  erwarteteAuslastung: number;          // v7.4.9-11: projektweite erwartete Auslastung (0..1)
  prognoseModell: 'auslastung' | 'planerfuellung'; // v7.4.9-11
  prognoseVorlaeufig: boolean;          // v7.4.9-11: zu wenig repraesentative Monate
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
  // v7.4.9-10: reales Restpotential des verfuegbaren Teams (Ebene 1),
  // monatsgenau aus Nettoarbeitstagen x foerderfaehiger Tagesrate.
  kapazitaetPotentialRest: number;
  // true, wenn Feiertage/Abwesenheiten (options) einflossen; false = Fallback.
  potentialBasiert: boolean;
  // Szenarien
  szenarien: Szenario[];
  bedarfFuer100: BedarfFuer100;   // v7.4.9-15: Stufe 3
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
  // v7.4.9-12: umlaut-robuste GF-Erkennung ueber die kanonische Funktion.
  const istGF = istGeschaeftsfuehrerTitle(emp?.position_title ?? null);
  return istGF ? basisMax * GF_FAKTOR : basisMax;
}

/** Prueft ob MA ein GF ist (v7.4.9-12: kanonische, umlaut-robuste Pruefung) */
export function istGeschaeftsfuehrer(emp: PFEmployee | undefined): boolean {
  return istGeschaeftsfuehrerTitle(emp?.position_title ?? null);
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
  options?: PFPrognoseOptions,
): ProjectAnalysis | null {
  if (!project) return null;

  // v7.4.9-10: Kapazitaets-Helfer (Ebene 1). Alle Eingaben optional.
  const oFederalState = options?.federalState ?? null;
  const oHolidayRegion = options?.holidayRegion;
  const potentialBasiert = !!oFederalState || !!(options?.absences && options.absences.length > 0);

  // Nettowerktage eines Monats: mit Bundesland -> Werktage minus Feiertage,
  // sonst Fallback auf reine Werktage (Mo-Fr).
  const nettoWerktageImMonat = (y: number, m: number): number =>
    oFederalState
      ? countWorkdaysInMonth(y, m, oFederalState, oHolidayRegion)
      : arbeitstageImMonat(y, m);

  // Feiertagsmap je Jahr (fuer die Werktagspruefung von Abwesenheitstagen).
  const _holidayMapCache = new Map<number, Map<string, string>>();
  const _holidayMap = (y: number): Map<string, string> => {
    let mp = _holidayMapCache.get(y);
    if (!mp) {
      mp = oFederalState ? getGermanHolidays(y, oFederalState, oHolidayRegion) : new Map();
      _holidayMapCache.set(y, mp);
    }
    return mp;
  };
  // Ist ein Datum ('YYYY-MM-DD') ein Werktag am Arbeitsort (Mo-Fr, kein Feiertag)?
  const istWerktagStr = (dateStr: string): boolean => {
    const yy = parseInt(dateStr.slice(0, 4), 10);
    const mm = parseInt(dateStr.slice(5, 7), 10);
    const dd = parseInt(dateStr.slice(8, 10), 10);
    const dow = new Date(yy, mm - 1, dd).getDay();
    if (dow === 0 || dow === 6) return false;
    return !_holidayMap(yy).has(dateStr);
  };

  // Abwesenheitstage je MA (nur Werktage zaehlen; Wochenende/Feiertag reduziert
  // das Potential nicht doppelt).
  const _absDatesByEmp = new Map<string, Set<string>>();
  (options?.absences ?? []).forEach(a => {
    if (!a.employee_id || !a.work_date) return;
    let s = _absDatesByEmp.get(a.employee_id);
    if (!s) { s = new Set<string>(); _absDatesByEmp.set(a.employee_id, s); }
    s.add(a.work_date);
  });
  const abwesenheitsWerktage = (empId: string, ym: string): number => {
    const s = _absDatesByEmp.get(empId);
    if (!s) return 0;
    let c = 0;
    s.forEach(dt => { if (dt.slice(0, 7) === ym && istWerktagStr(dt)) c++; });
    return c;
  };
  // v7.4.9-11: Werktage in einem Datumsbereich (Fallback ohne Feiertage) und
  // Abwesenheits-Werktage in einem Bereich (fuer den laufenden Monatsrest).
  const werktageImZeitraum = (von: Date, bis: Date): number => {
    if (bis < von) return 0;
    let c = 0;
    const cur = new Date(von.getFullYear(), von.getMonth(), von.getDate());
    const end = new Date(bis.getFullYear(), bis.getMonth(), bis.getDate());
    while (cur <= end) {
      const dow = cur.getDay();
      if (dow !== 0 && dow !== 6) c++;
      cur.setDate(cur.getDate() + 1);
    }
    return c;
  };
  const nettoWerktageZeitraum = (von: Date, bis: Date): number =>
    oFederalState ? countWorkdays(von, bis, oFederalState, oHolidayRegion) : werktageImZeitraum(von, bis);
  const abwesenheitsWerktageImZeitraum = (empId: string, fromStr: string, toStr: string): number => {
    const s = _absDatesByEmp.get(empId);
    if (!s) return 0;
    let c = 0;
    s.forEach(dt => { if (dt >= fromStr && dt <= toStr && istWerktagStr(dt)) c++; });
    return c;
  };

  const projWPs = workPackages.filter(wp => wp.project_id === project.id);
  const projAssignments = projectAssignments.filter(pa => pa.project_id === project.id);
  const projTimesheets = timesheets.filter(
    t => t.project_id === project.id && t.is_billable !== false
  );

  // v7.4.9-3/-4: Projektbezogene PM-Basis. hpm steuert Soll/PM-Umrechnung.
  // rateScaleFor hebt den auf realer MA-WAZ gespeicherten Stundensatz auf die
  // Abrechnungs-Basis (Antrag/Bescheid) -> Plan-/Ist-Kosten = PM x Monatsgehalt,
  // korrekt auch bei Teilzeit (rateScale = echte weekly_hours des MA / pmBasis).
  // v7.4.9-13: Firmenstandard priorisiert (Projekt-Override -> Firmen-
  // Regelarbeitszeit aus options -> Antrags-WAZ -> 40). Verhindert die falsche
  // 40-h-Referenz, wenn firm_standard_weekly_hours am Projekt nicht gesetzt ist.
  const firmStdWAZ = project.firm_standard_weekly_hours
    ?? options?.firmStandardWeeklyHours
    ?? project.pm_basis_weekly_hours
    ?? 40;
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
  // v7.4.9-11: zusaetzlich Ist je (MA, Monat) fuer die Auslastung (Ebene 2).
  const istByEmpMonth = new Map<string, Map<string, number>>();
  projTimesheets.forEach(t => {
    const d = new Date(t.work_date);
    const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    istMonatMap[key] = (istMonatMap[key] || 0) + t.hours;
    let mm = istByEmpMonth.get(t.employee_id);
    if (!mm) { mm = new Map<string, number>(); istByEmpMonth.set(t.employee_id, mm); }
    mm.set(key, (mm.get(key) || 0) + (t.hours || 0));
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
  // v7.4.9-11: nur noch der PLANBEZOGENE Wert (Fallback fuer die Anlaufphase /
  // ohne options). Die endgueltige Hochrechnung (Ebene 2) wird weiter unten nach
  // der Potentialberechnung festgelegt und auf die Kapazitaet gedeckelt.
  const prognosePlanbasiert = istBisHeute + restSollAbHeute * erfuellungsgrad;

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

  // v7.4.9-10: Ebene 1 - foerderfaehige Tagesrate je verfuegbarem MA (Monats-
  // Obergrenze auf einen Standard-Arbeitstag umgelegt) und Ein-/Austrittsfenster.
  const tdByEmp = new Map<string, number>();
  maObergrenzen.forEach(ma => tdByEmp.set(ma.empId, ma.maxProMonat / 21.7));
  const fensterByEmp = new Map<string, { start: string | null; end: string | null }>();
  projAssignments.forEach(pa => {
    const start = pa.assignment_start ?? null;
    const end = pa.assignment_end ?? null;
    const prev = fensterByEmp.get(pa.employee_id);
    if (!prev) {
      fensterByEmp.set(pa.employee_id, { start, end });
    } else {
      // Ueber mehrere Zuordnungen: frueheste offene Grenze gewinnt (null = offen).
      const combStart = (prev.start == null || start == null)
        ? null : (start < prev.start ? start : prev.start);
      const combEnd = (prev.end == null || end == null)
        ? null : (end > prev.end ? end : prev.end);
      fensterByEmp.set(pa.employee_id, { start: combStart, end: combEnd });
    }
  });

  // ---- v7.4.9-11: Ebene 2 - erwartete Auslastung je MA ----
  // A(MA,Monat) = Ist / Potential der letzten 3 abgeschlossenen Monate,
  // gleitender (gleichgewichteter) Durchschnitt, auf [0,1] geklemmt.
  // Fallback bei fehlender MA-Historie: projektweite Durchschnittsauslastung.
  const auslastungByEmp = new Map<string, number>();
  let projIstSum = 0;
  let projPotSum = 0;
  let repMonateProjekt = 0;
  letzten3.forEach(ym => {
    const y = parseInt(ym.slice(0, 4), 10);
    const mo = parseInt(ym.slice(5, 7), 10);
    let potMonat = 0;
    let istMonat = 0;
    verfuegbareMAIds.forEach(empId => {
      const netto = Math.max(0, nettoWerktageImMonat(y, mo) - abwesenheitsWerktage(empId, ym));
      potMonat += netto * (tdByEmp.get(empId) ?? 0);
      istMonat += istByEmpMonth.get(empId)?.get(ym) ?? 0;
    });
    if (potMonat > 0 && istMonat > 0) {
      repMonateProjekt++;
      projPotSum += potMonat;
      projIstSum += istMonat;
    }
  });
  verfuegbareMAIds.forEach(empId => {
    const td = tdByEmp.get(empId) ?? 0;
    const werte: number[] = [];
    letzten3.forEach(ym => {
      const y = parseInt(ym.slice(0, 4), 10);
      const mo = parseInt(ym.slice(5, 7), 10);
      const netto = Math.max(0, nettoWerktageImMonat(y, mo) - abwesenheitsWerktage(empId, ym));
      const P = netto * td;
      if (P <= 0) return;
      const ist = istByEmpMonth.get(empId)?.get(ym) ?? 0;
      werte.push(ist / P);
    });
    if (werte.length > 0) {
      auslastungByEmp.set(empId, werte.reduce((a, b) => a + b, 0) / werte.length);
    }
  });
  const auslastungProjekt = projPotSum > 0 ? projIstSum / projPotSum : 1;
  const erwarteteAuslastung = Math.max(0, Math.min(1, auslastungProjekt));
  const auslastungClamp = (empId: string): number => {
    const a = auslastungByEmp.has(empId) ? (auslastungByEmp.get(empId) as number) : auslastungProjekt;
    return Math.max(0, Math.min(1, a));
  };

  // ---- Restliche Arbeitstage + Restpotential (Vollast, Ebene 1) und
  //      auslastungsgewichtetes Potential (Ebene 2) ----
  let restArbeitstage = 0;
  let teamPotentialRest = 0;        // Vollast (Auslastung = 100%)
  let teamPotentialGewichtet = 0;   // erwartete Auslastung
  let curRemainderGewichtet = 0;    // gewichteter Rest des laufenden Monats
  const erwartetProMonat: Record<string, number> = {}; // je kuenftigem Monat (gewichtet)

  // Laufender Monat: Rest ab morgen bis Monatsende (Actual bereits in gesamtIstStunden).
  {
    const morgen = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const curEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    if (morgen <= curEnd) {
      const nettoRest = nettoWerktageZeitraum(morgen, curEnd);
      const morgenStr = morgen.getFullYear() + '-' + String(morgen.getMonth() + 1).padStart(2, '0') + '-' + String(morgen.getDate()).padStart(2, '0');
      const curEndStr = curEnd.getFullYear() + '-' + String(curEnd.getMonth() + 1).padStart(2, '0') + '-' + String(curEnd.getDate()).padStart(2, '0');
      verfuegbareMAIds.forEach(empId => {
        const f = fensterByEmp.get(empId);
        const verf = !f || ((f.start == null || f.start <= curEndStr) && (f.end == null || f.end >= morgenStr));
        if (!verf) return;
        const td = tdByEmp.get(empId) ?? 0;
        const nettoEmp = Math.max(0, nettoRest - abwesenheitsWerktageImZeitraum(empId, morgenStr, curEndStr));
        teamPotentialRest += nettoEmp * td;
        const gew = nettoEmp * td * auslastungClamp(empId);
        teamPotentialGewichtet += gew;
        curRemainderGewichtet += gew;
      });
    }
  }

  // Volle kuenftige Monate (ab naechstem Monat bis Projektende).
  if (project.end_date) {
    const projEnd = new Date(project.end_date);
    const startCalc = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const cur2 = new Date(startCalc);
    while (cur2 <= projEnd) {
      const y = cur2.getFullYear();
      const mo = cur2.getMonth() + 1;
      // Bewusst weiterhin reine Werktage fuer den benoetigten-Tempo-Nenner.
      restArbeitstage += arbeitstageImMonat(y, mo);

      const netto = nettoWerktageImMonat(y, mo);
      const ym = y + '-' + String(mo).padStart(2, '0');
      const monatStart = ym + '-01';
      const monatEnde = ym + '-' + String(new Date(y, mo, 0).getDate()).padStart(2, '0');
      let monatGewichtet = 0;
      verfuegbareMAIds.forEach(empId => {
        const f = fensterByEmp.get(empId);
        const verfuegbarImMonat = !f
          || ((f.start == null || f.start <= monatEnde) && (f.end == null || f.end >= monatStart));
        if (!verfuegbarImMonat) return;
        const td = tdByEmp.get(empId) ?? 0;
        const nettoEmp = Math.max(0, netto - abwesenheitsWerktage(empId, ym));
        teamPotentialRest += nettoEmp * td;
        const gew = nettoEmp * td * auslastungClamp(empId);
        teamPotentialGewichtet += gew;
        monatGewichtet += gew;
      });
      erwartetProMonat[ym] = monatGewichtet;

      cur2.setMonth(cur2.getMonth() + 1);
    }
  }

  // ---- v7.4.9-11: endgueltige Hochrechnung (Ebene 2, auf Vollast gedeckelt) ----
  const vollastGesamt = gesamtIstStunden + teamPotentialRest;
  const prognoseAuslastung = Math.min(gesamtIstStunden + teamPotentialGewichtet, vollastGesamt);
  const nutzeEbene2 = potentialBasiert && repMonateProjekt >= 1;
  const prognoseModell: 'auslastung' | 'planerfuellung' = nutzeEbene2 ? 'auslastung' : 'planerfuellung';
  const prognoseVorlaeufig = nutzeEbene2 && repMonateProjekt < 3;
  const prognostizierteGesamtStunden = nutzeEbene2 ? prognoseAuslastung : prognosePlanbasiert;

  const erreichungsgrad = gesamtPlanStunden > 0
    ? Math.round((prognostizierteGesamtStunden / gesamtPlanStunden) * 100)
    : 0;
  const fehlendStunden = Math.max(0, gesamtPlanStunden - prognostizierteGesamtStunden);
  const pFarbe = prognoseFarbe(Math.min(erreichungsgrad, 100));
  // Abrechnungsrelevante Hochrechnung auf den Plan gekappt.
  const prognoseStundenAbrechenbar = Math.min(prognostizierteGesamtStunden, gesamtPlanStunden);
  const tempoUeberPlan = prognostizierteGesamtStunden > gesamtPlanStunden;

  const restStunden = Math.max(0, gesamtPlanStunden - gesamtIstStunden);

  // ---- Szenarien ----
  const szenarien: Szenario[] = [];

  // v7.4.9-8: gesamtMACount > 0 verhindert Division durch Null, falls alle
  // zugeordneten MA ausgeschieden sind (dann gibt es kein Team fuer Szenarien).
  if (restArbeitstage > 0 && gesamtMACount > 0) {
    // v7.4.9-10: reales Restpotential (Ebene 1) statt Pauschale
    // (teamMaxProMonat x Restmonate).
    const teamMaxErreichbar = teamPotentialRest;
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
        // Hinweis auf die Obergrenze, wenn 100% nicht erreichbar ist. Was dafuer
        // noetig waere, steht jetzt in Stufe 3 (bedarfFuer100).
        hinweis: maxErreichbarPct < 100
          ? 'Bei Vollast max. ' + maxErreichbarPct + '% des Foerderziels'
          : undefined,
      });
    }
    // v7.4.9-15: Die fruehere Szenario-Zeile "Fuer 100% Ziel" ist in Stufe 3
    // (bedarfFuer100, siehe unten) aufgegangen.
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

  // v7.4.9-14: Massstab "100% Zielerreichung" = volle Ausschoepfung der
  // bewilligten Foerdersumme. foerderMaximum = bewilligte Summe (falls gesetzt),
  // sonst Fallback auf Plankosten x Satz. "Bei 100% abrufbar" = foerderMaximum;
  // "verschenkt" misst sich daran. abrufbar bei Prognose bleibt auf foerderMaximum
  // gedeckelt (mehr als bewilligt ist nie abrufbar).
  const foerderMaximum = bewilligteSumme ?? foerderbarRechnerischPlan;
  const foerderbarProg = Math.min(foerderbarRechnerischProg, foerderMaximum);
  const foerderbarPlan = foerderMaximum;
  const verschenktProg = Math.max(0, foerderMaximum - foerderbarProg);
  const verschenktZiel = 0;

  // ---- Zieltempo ----
  // v7.4.9-10: reales Restpotential (Ebene 1) statt Pauschale.
  const teamMaxErreichbarGesamt = gesamtIstStunden + teamPotentialRest;
  const maxErreichbarPct = gesamtPlanStunden > 0
    ? Math.round((teamMaxErreichbarGesamt / gesamtPlanStunden) * 100)
    : 0;
  const zielErreichbar = maxErreichbarPct >= 90;
  const zielStundenProMonat = (zielErreichbar && verbleibendeMonateAb > 0)
    ? restStunden / verbleibendeMonateAb
    : 0;

  // ---- v7.4.9-15: Stufe 3 - Was fuer 100% zusaetzlich noetig waere ----
  const zielSchonErreicht = prognostizierteGesamtStunden >= gesamtPlanStunden;
  const hundertImRahmen = teamMaxErreichbarGesamt >= gesamtPlanStunden; // 100% mit WAZ-Vollast machbar
  const fehlendNachVollast = Math.max(0, gesamtPlanStunden - teamMaxErreichbarGesamt);
  // Bei "im Rahmen": noetiges Team-Tempo (h/Tag) fuer 100% innerhalb der WAZ.
  const noetigTeamHProTag100 = restArbeitstage > 0 ? restStunden / restArbeitstage : 0;
  // Sonst: Mehrarbeit je Tag (Team) ueber die Vollast hinaus.
  const mehrarbeitProTag100 = restArbeitstage > 0 ? fehlendNachVollast / restArbeitstage : 0;
  // ... bzw. zusaetzliche Vollzeit-MA-Aequivalente ueber die Restlaufzeit
  // (ein Vollzeit-MA ~ hoursPerPM(firmStdWAZ)/21,7 h je Werktag).
  const vzMaTagesStd = hoursPerPM(firmStdWAZ) / 21.7;
  const vzMaRestpotential = vzMaTagesStd * restArbeitstage;
  const zusatzMaFuer100 = vzMaRestpotential > 0 ? fehlendNachVollast / vzMaRestpotential : 0;
  const bedarfFuer100: BedarfFuer100 = {
    zielSchonErreicht,
    imRahmenMoeglich: hundertImRahmen,
    fehlendStunden: Math.round(fehlendNachVollast),
    noetigTeamHProTag: Math.round(noetigTeamHProTag100 * 10) / 10,
    mehrarbeitProTag: Math.round(mehrarbeitProTag100 * 10) / 10,
    zusatzMa: Math.round(zusatzMaFuer100 * 10) / 10,
  };

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
          // v7.4.9-11: laufenden Monatsrest (gewichtet) in die Prognoselinie
          // einspeisen, damit ihr Endpunkt der Headline-Hochrechnung entspricht.
          projektionKumuliert = istKumuliert + (nutzeEbene2 ? curRemainderGewichtet : 0);
          zielProjektion = istKumuliert;
          zielProjektionKumuliert = istKumuliert;
        } else {
          if (nutzeEbene2) {
            // v7.4.9-11: Prognoselinie folgt dem erwarteten Potential je Monat
            // (Auslastungsmodell) - konsistent zur Headline-Hochrechnung.
            projektionKumuliert += erwartetProMonat[key] ?? 0;
          } else {
            // Fallback: Prognoselinie folgt dem geplanten Monats-Soll x Erfuellungsgrad.
            projektionKumuliert += (sollMonatMap[key] || 0) * erfuellungsgrad;
          }
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
    erwarteteAuslastung,
    prognoseModell,
    prognoseVorlaeufig,
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
    kapazitaetPotentialRest: teamPotentialRest,
    potentialBasiert,
    szenarien,
    bedarfFuer100,
    verbleibendeMonateAb,
  };
}
