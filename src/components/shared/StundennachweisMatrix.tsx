// src/components/shared/StundennachweisMatrix.tsx
// ============================================================================
// PZE V7 - Shared Component: Stundennachweis-Matrix
// ============================================================================
// Version: 7.4.6-13
// v7.4.6-13: Stufe 3a - AP-Status direkt aus der Matrix erreichbar. Neuer Button
//   "AP-Status" in der Bedienleiste neben "Sammeldruck" oeffnet den eigenstaendigen
//   ApStatusModal-Dialog (geplant/gebucht/offen je AP und MA, inkl. Monats-
//   Aufschluesselung), der seine Daten selbst per projectId laedt - kein Umweg mehr
//   ueber ein Timesheet. Sichtbarkeit: Prop apAnalyseEnabled (Berater immer; Firma
//   nur bei Freischaltung v7_client_companies.ap_analyse_firma_freigeschaltet; fehlt
//   der Prop, konservativ nach Portal). Button nur ausserhalb des Druckmodus.
// v7.4.6-12: FIX zu -11. Die kleine Monatszahl zeigte ALLE erfassten Stunden
//   (foerderbar + nicht-foerderbare "sonstige"). Bei Geschaeftsfuehrern (50%-Regel)
//   erschien so ein zu hoher Wert (u.a. > 170), der der AP-Gesamtplanung aehnelte
//   statt den tatsaechlich gebuchten Stunden. Jetzt summiert die Anzeige nur noch
//   die FOERDERBAREN Stunden (is_billable === true) - identisch zur "gebucht"-Spalte
//   im AP-Status. Der Ampel-Status bleibt unveraendert (nutzt weiter alle erfassten
//   Tage fuer die Vollstaendigkeit). Tooltip zeigt jetzt "<x>h gebucht".
// v7.4.6-11: Stufe 1 Management-Uebersicht. In jeder Monatszelle wird zusaetzlich
//   zur Ampel die gebuchte Monats-Stundenzahl je MA als kleine Zahl unter dem
//   Feld angezeigt (nur wenn erfasst und Monat in Laufzeit/Vergangenheit). Kein
//   Umschalter noetig - man sieht Auslastung/Luft sofort beim Oeffnen der Matrix.
//   Fuer Berater UND Firma sichtbar (nicht schaltbar). Klick-ins-Timesheet +
//   Ruecksprung unveraendert (onNavigateToZE). Reine Anzeige, keine DB-/Logikaenderung.
// v7.4.6-10: ZA-Direktlink im Karten-Header (oben, neben Projektname/FKZ/Typ).
//   Springt in die Zahlungsanforderung des aktiven Projekts (gleiche Seite,
//   returnTo = aktuelle URL). Portal-abhaengige Route (Berater/Firma). Nur am
//   Bildschirm (Header ist print:hidden), erscheint nicht im PDF/Sammeldruck.
// Version: 7.4.6-9
// v7.4.6-9: PDF-Dateiname Sammeldruck auf finales Schema umgestellt -
//   Leerzeichen statt Unterstrich, ohne Wort "Stundenerfassung" und ohne
//   Praefix "Stundennachweise": 1 MA "<NN><VV> <Zeitraum> <FKZ> <Vorname>
//   <Nachname>", mehrere MA "<Zeitraum> <FKZ>". Kein .pdf im document.title
//   (Browser haengt die Endung selbst an).
// Version: 7.4.6-8
// v7.4.6-8: Sammeldruck-PDF bekommt einen sprechenden Dateinamen (analog
//   Einzeldruck in TimesheetForm v7.4.6-56). Schema:
//     1 MA  -> <NN><VV>_<Zeitraum>_<FKZ>_Stundenerfassung_<Vorname>_<Nachname>
//     >1 MA -> Stundennachweise_<Zeitraum>_<FKZ>
//   Zeitraum = YYMM (ein Monat) bzw. YYMM-YYMM (Spanne; min/max der Auswahl).
//   Name -> erster Vor-/Nachname, ASCII-gewandelt. document.title wird vor
//   window.print gesetzt und nach afterprint zurueckgestellt.
// Version: 7.4.6-7
// v7.4.6-7: Klick auf Monatszelle uebergibt jetzt das aktive Projekt
//   (activeProjectId) an onNavigateToZE -> die ZE-Seite kann das richtige
//   Projekt vorbelegen. Vorher landete man immer im ersten Projekt.
// Version: 7.4.6-6
// Datum: 24. Juni 2026
// v7.4.6-6: A-034 Dual-Read Abwesenheiten im Sammeldruck. Die synthetischen
//   Abwesenheits-Zeilen aus v7_employee_absences (loadEmployeeAbsencesAsTimesheets)
//   werden vor dem Bauen der Druckblaetter zu den geladenen v7_timesheets-Zeilen
//   gemergt; Dedup gegen evtl. noch aktive Alt-Abwesenheitszeilen (Uebergangsphase).
// v7.4.6-5: FIX Desync-Schutz. activeProjectId bekommt einen Selbstheilungs-
//   Guard: liegt matrixProjectId nicht im uebergebenen projects-Array, wird
//   projects[0] genutzt. Verhindert faelschliches "Keine Projektdaten
//   verfuegbar" bei Mehr-Projekt-Firmen, wenn der einbindende Dashboard-Dropdown
//   das projects-Array filtert, der interne Auswahl-State aber veraltet ist.
//   Reiner Lese-Guard, Matrix-Logik (Monate/Zellen/Filter) unveraendert.
// v7.4.6-4: FIX Mehr-Projekt-Firmen. Die MA-Zeilen wurden aus ALLEN
//   projectAssignments gebildet (ohne Projektfilter) -> bei einer Firma mit
//   mehreren Projekten erschienen alle Teammitglieder aller Projekte, egal
//   welches Projekt oben gewaehlt war. Jetzt werden die Assignments zuerst auf
//   das aktive Projekt gefiltert (pa.project_id === activeProjectId); MA-Liste,
//   Sortierung und die MA-spezifischen Start/End-Grenzen nutzen diese
//   gefilterte Liste. project_id im ProjectAssignment-Interface ergaenzt (war
//   zur Laufzeit vorhanden aus loadProjectAssignments, nur nicht deklariert).
// v7.4.6-3: NEU Sammeldruck-Modus. Ein Umschalt-Knopf ("Sammeldruck") macht die
//   Matrix zur Auswahlflaeche: Klick auf eine Monatsspalte waehlt den Monat
//   fuer alle MA, Klick auf einen MA-Namen die ganze Zeile, Klick auf eine
//   Zelle einzeln, Eck-Feld = alles/nichts. "Drucken (n)" laedt die Detail-
//   daten der Auswahl selbst nach (Company, WPs, Employees, Timesheets), baut
//   daraus mit StundennachweisSheet + buildStundennachweisSheetData die
//   Blaetter und ruft window.print auf. Nur die Blaetter landen auf Papier
//   (CSS-Trick: alles ausser #snw-print-root im Druck ausgeblendet) -- die
//   einbindenden Seiten (Cockpit, BerichtePage) bleiben unveraendert.
//   Ausserhalb des Modus verhaelt sich die Matrix exakt wie bisher
//   (Zellklick -> Zeiterfassung).
// v7.4.6-2: matrixEmployees-Quelle geaendert: war wpAssignments (Arbeitsplan),
//   jetzt projectAssignments (Projektteam). Damit erscheinen ALLE MA im
//   Projektteam in der Matrix, unabhaengig ob sie im Arbeitsplan stehen.
//   BEGRUENDUNG: Nachfolge-MA uebernehmen offene AP ohne eigenen AP-Eintrag.
//   WICHTIGER GRUNDSATZ: Der Arbeitsplan spiegelt die urspruengliche
//   Antragstellung wider (Zuwendungsbescheid) und darf nachtraeglich nicht
//   veraendert werden. Die tatsaechliche Arbeit dokumentiert sich ueber die
//   Zeiterfassung -- beide Ebenen bleiben damit sauber getrennt.
//   Konsequenz: Nachtraeglich falsch zugeordnete AP-Eintraege koennen
//   rueckgaengig gemacht werden; neue MA erscheinen allein durch den
//   Projektteam-Eintrag korrekt in der Matrix.
//
//   src/lib/holidays/germanHolidays.ts. Lokale getGermanHolidays/
//   normalizeStateCode entfernt. Company-Interface um holiday_region erweitert.
//   Hinweis: Die lokale Version normalisierte auf Kurzcode ("BY" statt "DE-BY")
//   und fehlte Buss-/Bettag, Frauentag, Weltkindertag. Utility ist vollstaendig
//   und liefert bei identischem Input die korrekten Ergebnisse.
//
// v7.4.4-4: NEU: Monats-Zellen grau wenn MA nicht im Unternehmen/Projekt
//   - Employee um employment_start/end erweitert
//   - ProjectAssignment um assignment_start/end erweitert
//   - Monate vor Eintritt oder nach Austritt als 'outside' (grau, nicht klickbar)
// v7.4.4-3: NEU: Oranger Punkt bei offenen Timesheet-Notizen
//   - Neues Prop: notes (Array von TimesheetNote)
//   - Offene Notiz = oranger Punkt in der Zelle (oben rechts)
//   - Erledigte Notizen: kein Punkt (verschwinden)
// v7.4.4-2: FIX: Stundennachweis-Matrix sortiert nach MA-Nr. (employee_number)
//   - projectAssignments als neues Prop ergaenzt
//   - matrixEmployees wird nach employee_number sortiert
//
// Wird von beiden Portalen genutzt:
// - Firmen-Portal:  /v7/firma/berichte
// - Berater-Portal: /v7/berater/foerderung/firma/[id]/berichte
//
// Props:
// - portal: 'berater' | 'firma'
// - companyId: string
// - projects: Project[]
// - workPackages: WorkPackage[]
// - wpAssignments: WPAssignment[]
// - employees: Employee[]
// - timesheets: Timesheet[]
// - completions: Completion[]
// - company: Company | null
// - matrixProjectId: string | null
// - onProjectChange: (id: string) => void
// - onNavigateToZE: (employeeId: string, year: number, month: number, projectId: string) => void
// ============================================================================

'use client';

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Grid3x3, CheckCircle, AlertTriangle, XCircle, Printer, X, CheckSquare, Square } from 'lucide-react';
import {
  getGermanHolidays,
  countWorkdaysInMonth,
  type HolidayRegion,
} from '@/lib/holidays/germanHolidays';
import { createClient } from '@/lib/supabase/client';
import StundennachweisSheet from '@/components/shared/StundennachweisSheet';
import ApStatusModal from '@/components/shared/ApStatusModal'; // v7.4.6-13: AP-Status-Dialog
import {
  buildStundennachweisSheetData,
  type StundennachweisSheetData,
} from '@/lib/stundennachweisSheetData';
import { loadEmployeeAbsencesAsTimesheets } from '@/lib/employeeAbsences';

// ============================================================================
// FOERDERFORMAT-LABELS
// ============================================================================

const FUNDING_FORMAT_LABELS: Record<string, string> = {
  'ZIM':          'ZIM Einzelprojekt',
  'ZIM_KOOP':     'ZIM Kooperationsprojekt',
  'ZIM_NETZWERK': 'ZIM Netzwerk-Management',
  'ZIM_DS':       'ZIM Durchfuehrbarkeitsstudie',
  'BMBF':         'BMBF Foerderung',
  'BMBF_DS':      'BMBF Durchfuehrbarkeitsstudie',
};

const getFundingLabel = (format: string | null | undefined): string =>
  format ? (FUNDING_FORMAT_LABELS[format] || format) : '';

// ============================================================================
// TYPEN
// ============================================================================

interface Project {
  id: string;
  name: string;
  short_name: string | null;
  funding_format: string | null;
  funding_reference: string | null;
  start_date: string | null;
  end_date: string | null;
}

interface WorkPackage {
  id: string;
  project_id: string;
}

interface WPAssignment {
  work_package_id: string;
  employee_id: string;
}

interface ProjectAssignment {
  employee_id: string;
  project_id: string;
  employee_number: number | null;
  assignment_start: string | null;
  assignment_end: string | null;
}

interface Employee {
  id: string;
  display_name: string;
  employment_start: string | null;
  employment_end: string | null;
}

interface Timesheet {
  project_id: string;
  employee_id: string;
  work_date: string;
  hours: number | null;
  is_billable?: boolean | null; // v7.4.6-12: fuer die foerderbaren (gebuchten) Stunden
}

interface Completion {
  employee_id: string;
  year: number;
  month: number;
}

interface Company {
  federal_state: string | null;
  holiday_region: string | null;  // v7.4.6
}

interface TimesheetNote {
  employee_id: string;
  project_id: string;
  year: number;
  month: number;
  status: string;
}

interface MatrixMonth {
  year: number;
  month: number;
  label: string;
}

interface MatrixCell {
  employeeId: string;
  year: number;
  month: number;
  hoursRecorded: number;   // alle erfassten Stunden (fuer Vollstaendigkeits-Status)
  billableHours: number;   // v7.4.6-12: nur foerderbare (is_billable) Stunden -> Anzeige-Zahl
  status: 'complete' | 'partial' | 'missing' | 'future' | 'outside';
}

interface StundennachweisMatrixProps {
  portal: 'berater' | 'firma';
  companyId: string;
  projects: Project[];
  workPackages: WorkPackage[];
  wpAssignments: WPAssignment[];
  projectAssignments: ProjectAssignment[];
  employees: Employee[];
  timesheets: Timesheet[];
  completions: Completion[];
  notes: TimesheetNote[];
  company: Company | null;
  matrixProjectId: string | null;
  onProjectChange: (id: string) => void;
  onNavigateToZE: (employeeId: string, year: number, month: number, projectId: string) => void;
  // v7.4.6-13: vertiefte AP-Status-Analyse verfuegbar? Berater immer; Firma nur bei
  // Freischaltung (v7_client_companies.ap_analyse_firma_freigeschaltet). Fehlt der
  // Wert, wird konservativ nach Portal entschieden (Berater true, Firma false).
  apAnalyseEnabled?: boolean;
}

// ============================================================================
// HILFSFUNKTIONEN (Feiertage + Arbeitstage)
// ============================================================================

const MONTH_SHORT = ['Jan','Feb','Mrz','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];

// Feiertagsberechnung + Sollarbeitstage ausgelagert in
// src/lib/holidays/germanHolidays.ts (v7.4.6).
// Import oben: getGermanHolidays, countWorkdaysInMonth, HolidayRegion

// ============================================================================
// COMPONENT
// ============================================================================

export default function StundennachweisMatrix({
  portal,
  companyId,
  projects,
  workPackages,
  wpAssignments,
  projectAssignments,
  employees,
  timesheets,
  completions,
  notes,
  company,
  matrixProjectId,
  onProjectChange,
  onNavigateToZE,
  apAnalyseEnabled,
}: StundennachweisMatrixProps) {

  const accentColor = portal === 'berater' ? 'text-blue-600' : 'text-green-600';
  const iconColor = portal === 'berater' ? 'text-blue-600' : 'text-green-600';
  const focusRing = portal === 'berater' ? 'focus:ring-blue-500' : 'focus:ring-green-500';
  const router = useRouter();  // v7.4.6-10: fuer ZA-Sprung
  // v7.4.6-13: AP-Status-Analyse verfuegbar? Fehlt der Prop, konservativ nach Portal.
  const apEnabled = apAnalyseEnabled ?? (portal === 'berater');
  const [showApStatus, setShowApStatus] = useState(false);

  // v7.4.6-5: Selbstheilungs-Guard. Liegt die uebergebene matrixProjectId NICHT
  // im (ggf. gefilterten) projects-Array, faellt die Auswahl auf projects[0]
  // zurueck statt eine nicht zuordenbare ID zu fuehren (-> matrixData null ->
  // faelschlich "Keine Projektdaten"). Tritt auf, wenn der einbindende
  // Dashboard-Dropdown projects filtert, ein separater Auswahl-State aber
  // veraltet bleibt. Schuetzt alle Aufrufer der Shared-Komponente.
  const activeProjectId = (matrixProjectId && projects.some(p => p.id === matrixProjectId))
    ? matrixProjectId
    : (projects[0]?.id || null);
  const activeProject = projects.find(p => p.id === activeProjectId) || projects[0] || null;

  // v7.4.6-10: Sprung zur Zahlungsanforderung (ZA) des aktiven Projekts.
  // Gleiche Seite; returnTo = aktuelle URL fuer den Zurueck-Button in der ZA.
  // Portal-abhaengige Route (Berater vs. Firma).
  const goToZA = () => {
    if (!activeProjectId) return;
    const rt = encodeURIComponent(window.location.pathname + window.location.search);
    const base = portal === 'berater'
      ? `/v7/berater/foerderung/firma/${companyId}/za`
      : `/v7/firma/za`;
    router.push(`${base}?projektId=${activeProjectId}&returnTo=${rt}`);
  };

  const matrixData = useMemo(() => {
    if (!activeProjectId) return null;
    const project = projects.find(p => p.id === activeProjectId);
    if (!project || !project.start_date || !project.end_date) return null;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    const pStart = new Date(project.start_date);
    const pEnd = new Date(project.end_date);
    const startYear = pStart.getFullYear();
    const startMonth = pStart.getMonth() + 1;
    const endYear = pEnd.getFullYear();
    const endMonth = pEnd.getMonth() + 1;

    const months: MatrixMonth[] = [];
    for (let y = startYear; y <= endYear; y++) {
      const mStart = y === startYear ? startMonth : 1;
      const mEnd = y === endYear ? endMonth : 12;
      for (let m = mStart; m <= mEnd; m++) {
        months.push({ year: y, month: m, label: MONTH_SHORT[m-1] });
      }
    }

    const years = [...new Set(months.map(m => m.year))];
    const projectWPs = workPackages.filter(wp => wp.project_id === activeProjectId);
    // v7.4.6-4: Assignments zuerst auf das aktive Projekt filtern, sonst
    // erscheinen bei Mehr-Projekt-Firmen die MA aller Projekte.
    const projectAssignmentsForActive = projectAssignments.filter(
      pa => pa.project_id === activeProjectId
    );
    // v7.4.6-2: Quelle ist projectAssignments (Projektteam), nicht wpAssignments
    // (Arbeitsplan). Alle MA im Team erscheinen in der Matrix.
    const assignedEmployeeIds = [...new Set(
      projectAssignmentsForActive.map(pa => pa.employee_id)
    )];
    const matrixEmployees = employees
      .filter(e => assignedEmployeeIds.includes(e.id))
      .sort((a, b) => {
        const paA = projectAssignmentsForActive.find(pa => pa.employee_id === a.id);
        const paB = projectAssignmentsForActive.find(pa => pa.employee_id === b.id);
        const nrA = paA?.employee_number ?? 9999;
        const nrB = paB?.employee_number ?? 9999;
        if (nrA !== nrB) return nrA - nrB;
        return (a.display_name || '').localeCompare(b.display_name || '', 'de');
      });

    // Feiertagsmap pro Jahr einmal berechnen (v7.4.6: inkl. holiday_region)
    const holidayRegion = (company?.holiday_region ?? undefined) as HolidayRegion;
    const holidaysByYear: Record<number, Map<string, string>> = {};
    years.forEach(y => {
      holidaysByYear[y] = getGermanHolidays(y, company?.federal_state ?? null, holidayRegion);
    });

    const cells: MatrixCell[] = [];
    matrixEmployees.forEach(emp => {
      // NEU v7.4.4-4: Erlaubten Zeitraum pro MA berechnen
      const myAssignment = projectAssignmentsForActive.find(pa => pa.employee_id === emp.id);
      const startLimits: string[] = [];
      if (emp.employment_start) startLimits.push(emp.employment_start);
      if (myAssignment?.assignment_start) startLimits.push(myAssignment.assignment_start);
      const latestStart = startLimits.length > 0 ? startLimits.sort().pop()! : null;
      const firstAllowedVal = latestStart
        ? parseInt(latestStart.split('-')[0]) * 12 + parseInt(latestStart.split('-')[1])
        : 0;

      const endLimits: string[] = [];
      if (emp.employment_end) endLimits.push(emp.employment_end);
      if (myAssignment?.assignment_end) endLimits.push(myAssignment.assignment_end);
      const earliestEnd = endLimits.length > 0 ? endLimits.sort()[0] : null;
      const lastAllowedVal = earliestEnd
        ? parseInt(earliestEnd.split('-')[0]) * 12 + parseInt(earliestEnd.split('-')[1])
        : 99999;

      months.forEach(({ year, month }) => {
        const isFuture = year > currentYear || (year === currentYear && month > currentMonth);

        // NEU v7.4.4-4: Monat ausserhalb des erlaubten Bereichs?
        const monthVal = year * 12 + month;
        const isOutside = (latestStart && monthVal < firstAllowedVal) || (earliestEnd && monthVal > lastAllowedVal);

        const monthTimesheets = timesheets.filter(t => {
          if (t.project_id !== activeProjectId) return false;
          if (t.employee_id !== emp.id) return false;
          const d = new Date(t.work_date);
          return d.getFullYear() === year && d.getMonth() + 1 === month;
        });
        const hoursRecorded = monthTimesheets.reduce((sum, t) => sum + (t.hours || 0), 0);
        // v7.4.6-12: nur foerderbare (gebuchte) Stunden - schliesst nicht-foerderbare
        // "sonstige Arbeiten" aus (relevant v.a. bei GF mit 50%-Regel).
        const billableHours = monthTimesheets.reduce((sum, t) => sum + (t.is_billable === true ? (t.hours || 0) : 0), 0);
        const workingDays = countWorkdaysInMonth(year, month, company?.federal_state ?? null, holidayRegion);
        const daysWithEntries = new Set(
          monthTimesheets.filter(t => (t.hours || 0) > 0).map(t => t.work_date)
        ).size;
        const holidays = holidaysByYear[year] || new Map();
        let holidayCount = 0;
        const daysInMon = new Date(year, month, 0).getDate();
        for (let d = 1; d <= daysInMon; d++) {
          const dow = new Date(year, month-1, d).getDay();
          if (dow === 0 || dow === 6) continue;
          const ds = `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
          if (holidays.has(ds)) holidayCount++;
        }
        const daysRecorded = daysWithEntries + holidayCount;
        const isCompleted = completions.some(
          c => c.employee_id === emp.id && c.year === year && c.month === month
        );
        let status: MatrixCell['status'] = 'missing';
        if (isOutside) status = 'outside';
        else if (isFuture) status = 'future';
        else if (isCompleted) status = 'complete';
        else if (hoursRecorded > 0 && daysRecorded >= workingDays) status = 'complete';
        else if (hoursRecorded > 0) status = 'partial';
        cells.push({ employeeId: emp.id, year, month, hoursRecorded, billableHours, status });
      });
    });

    return { project, months, years, employees: matrixEmployees, cells };
  }, [activeProjectId, projects, workPackages, wpAssignments, projectAssignments, employees, timesheets, company, completions]);

  // ==========================================================================
  // v7.4.6-3: SAMMELDRUCK
  // ==========================================================================
  const [druckModus, setDruckModus] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [printSheets, setPrintSheets] = useState<StundennachweisSheetData[] | null>(null);
  // v7.4.6-8: Titel-Swap fuer sprechenden Sammeldruck-Dateinamen.
  const printTitleRef = useRef<string>('');
  const prevTitleRef = useRef<string>('');
  const [printing, setPrinting] = useState(false);

  // Auswahl bei Projektwechsel zuruecksetzen (Keys sind projektbezogen).
  useEffect(() => { setSelected(new Set()); }, [activeProjectId]);

  // Druckbare (= waehlbare) Zellen: alles ausser Zukunft/ausserhalb.
  const selectableKeys = useMemo(() => {
    const s = new Set<string>();
    if (!matrixData) return s;
    matrixData.cells.forEach(c => {
      if (c.status !== 'future' && c.status !== 'outside') {
        s.add(`${c.employeeId}|${c.year}|${c.month}`);
      }
    });
    return s;
  }, [matrixData]);

  const isSelected = (employeeId: string, year: number, month: number): boolean =>
    selected.has(`${employeeId}|${year}|${month}`);

  const toggleGroup = (keys: string[]) => {
    if (keys.length === 0) return;
    setSelected(prev => {
      const next = new Set(prev);
      const allSel = keys.every(k => next.has(k));
      if (allSel) keys.forEach(k => next.delete(k));
      else keys.forEach(k => next.add(k));
      return next;
    });
  };

  const toggleCell = (employeeId: string, year: number, month: number) => {
    const k = `${employeeId}|${year}|${month}`;
    if (!selectableKeys.has(k)) return;
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k); else next.add(k);
      return next;
    });
  };

  const columnKeys = (year: number, month: number): string[] =>
    (matrixData?.employees || [])
      .map(e => `${e.id}|${year}|${month}`)
      .filter(k => selectableKeys.has(k));

  const rowKeys = (employeeId: string): string[] =>
    (matrixData?.months || [])
      .map(m => `${employeeId}|${m.year}|${m.month}`)
      .filter(k => selectableKeys.has(k));

  const allSelectableKeys = (): string[] => Array.from(selectableKeys);

  const toggleDruckModus = () => {
    setDruckModus(prev => {
      if (prev) setSelected(new Set()); // beim Verlassen Auswahl leeren
      return !prev;
    });
  };

  const handleSammeldruck = async () => {
    if (selected.size === 0 || !activeProjectId) return;
    const proj = projects.find(p => p.id === activeProjectId);
    if (!proj) return;
    setPrinting(true);
    try {
      const supabase = createClient();
      const cells = Array.from(selected).map(k => {
        const [employeeId, y, m] = k.split('|');
        return { employeeId, year: Number(y), month: Number(m) };
      });
      const empIds = Array.from(new Set(cells.map(c => c.employeeId)));

      // Zeitspanne der Auswahl bestimmen
      let minDate = '9999-12-31';
      let maxDate = '0000-01-01';
      cells.forEach(c => {
        const first = `${c.year}-${String(c.month).padStart(2, '0')}-01`;
        const lastDay = new Date(c.year, c.month, 0).getDate();
        const last = `${c.year}-${String(c.month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
        if (first < minDate) minDate = first;
        if (last > maxDate) maxDate = last;
      });

      const [companyRes, wpRes, empRes, tsRes] = await Promise.all([
        supabase
          .from('v7_client_companies')
          .select('id, name, federal_state, holiday_region, standard_weekly_hours')
          .eq('id', companyId)
          .single(),
        supabase
          .from('v7_work_packages')
          .select('id, project_id, ap_number, ap_sub_number, ap_code, name, is_technical, total_person_months')
          .eq('project_id', activeProjectId)
          .eq('is_active', true),
        supabase
          .from('v7_employees')
          .select('id, display_name, first_name, last_name')
          .in('id', empIds),
        supabase
          .from('v7_timesheets')
          .select('id, employee_id, work_package_id, work_date, hours, is_billable, absence_code, is_active')
          .eq('project_id', activeProjectId)
          .eq('is_active', true)
          .in('employee_id', empIds)
          .gte('work_date', minDate)
          .lte('work_date', maxDate),
      ]);

      const comp = companyRes.data as { name?: string; federal_state?: string | null; holiday_region?: string | null; standard_weekly_hours?: number | null } | null;
      const wps = (wpRes.data || []) as Array<{ id: string; ap_code: string | null; ap_number: number | null; ap_sub_number: number | null; name: string | null; is_technical: boolean | string | number | null; total_person_months: number | null }>;
      const emps = (empRes.data || []) as Array<{ id: string; display_name: string; first_name: string | null; last_name: string | null }>;
      const tsAll = (tsRes.data || []) as Array<{ employee_id: string; work_package_id: string | null; work_date: string; hours: number | null; is_billable: boolean | null; absence_code: string | null }>;

      // A-034 Dual-Read: zentrale Abwesenheiten als synthetische Zeilen ergaenzen.
      // Dedup gegen evtl. noch aktive Alt-Abwesenheitszeilen in v7_timesheets
      // (work_package_id IS NULL + absence_code gesetzt). Projekt ist konstant
      // (activeProjectId), daher Schluessel ueber employee + work_date.
      const existingAbsenceKeys = new Set(
        tsAll
          .filter(t => !t.work_package_id && t.absence_code)
          .map(t => `${t.employee_id}|${t.work_date}`)
      );
      const absenceSynth = await loadEmployeeAbsencesAsTimesheets([activeProjectId], {
        employeeIds: empIds,
        fromDate: minDate,
        toDate: maxDate,
      });
      const tsAllRows = [
        ...tsAll,
        ...absenceSynth
          .filter(s => !existingAbsenceKeys.has(`${s.employee_id}|${s.work_date}`))
          .map(s => ({
            employee_id: s.employee_id,
            work_package_id: s.work_package_id as string | null,
            work_date: s.work_date,
            hours: s.hours as number | null,
            is_billable: s.is_billable as boolean | null,
            absence_code: s.absence_code as string | null,
          })),
      ];

      // Feiertage je benoetigtem Jahr einmal berechnen
      const region = (comp?.holiday_region ?? undefined) as HolidayRegion;
      const holidaysByYear: Record<number, Map<string, string>> = {};
      Array.from(new Set(cells.map(c => c.year))).forEach(y => {
        holidaysByYear[y] = getGermanHolidays(y, comp?.federal_state ?? null, region);
      });

      // Reihenfolge: nach MA-Reihenfolge der Matrix, dann Jahr/Monat
      const empOrder = new Map<string, number>();
      (matrixData?.employees || []).forEach((e, idx) => empOrder.set(e.id, idx));
      cells.sort((a, b) => {
        const ea = empOrder.get(a.employeeId) ?? 9999;
        const eb = empOrder.get(b.employeeId) ?? 9999;
        if (ea !== eb) return ea - eb;
        if (a.year !== b.year) return a.year - b.year;
        return a.month - b.month;
      });

      const sheets: StundennachweisSheetData[] = cells.map(c => {
        const emp = emps.find(e => e.id === c.employeeId);
        const rows = tsAllRows.filter(t => {
          if (t.employee_id !== c.employeeId) return false;
          const parts = t.work_date.split('-').map(Number);
          return parts[0] === c.year && parts[1] === c.month;
        });
        return buildStundennachweisSheetData({
          rows,
          project: { name: proj.name, funding_reference: proj.funding_reference, funding_format: proj.funding_format },
          workPackages: wps,
          company: { name: comp?.name ?? '', standard_weekly_hours: comp?.standard_weekly_hours ?? null },
          employee: emp
            ? { display_name: emp.display_name, first_name: emp.first_name, last_name: emp.last_name }
            : { display_name: '-', first_name: null, last_name: null },
          year: c.year,
          month: c.month,
          holidays: holidaysByYear[c.year],
        });
      });

      // v7.4.6-9: PDF-Dateiname Sammeldruck, Leerzeichen-getrennt, ohne
      //   "Stundenerfassung":
      //   1 MA  -> <NN><VV> <Zeitraum> <FKZ> <Vorname> <Nachname>
      //   >1 MA -> <Zeitraum> <FKZ>
      //   Zeitraum: YYMM (ein Monat) bzw. YYMM-YYMM (min/max der Auswahl).
      //   Kein .pdf im document.title (Browser haengt die Endung selbst an).
      {
        const toAscii = (s: string): string =>
          (s || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/\u00df/g, 'ss')
            .replace(/[^A-Za-z0-9]/g, '');
        const firstToken = (s: string): string => (s || '').trim().split(/\s+/)[0] || '';
        const yymmList = cells.map(c => `${String(c.year).slice(-2)}${String(c.month).padStart(2, '0')}`);
        const minYYMM = yymmList.reduce((a, b) => (b < a ? b : a), yymmList[0]);
        const maxYYMM = yymmList.reduce((a, b) => (b > a ? b : a), yymmList[0]);
        const timePart = minYYMM === maxYYMM ? minYYMM : `${minYYMM}-${maxYYMM}`;
        const fkz = (proj.funding_reference || proj.short_name || 'Projekt').replace(/[\/\s]+/g, '_');
        let fileName = `${timePart} ${fkz}`;
        if (empIds.length === 1) {
          const emp = emps.find(e => e.id === empIds[0]);
          const lastAscii = toAscii(firstToken(emp?.last_name || ''));
          const firstAscii = toAscii(firstToken(emp?.first_name || ''));
          const initials = `${lastAscii.charAt(0)}${firstAscii.charAt(0)}`.toUpperCase();
          if (initials && firstAscii && lastAscii) {
            fileName = `${initials} ${timePart} ${fkz} ${firstAscii} ${lastAscii}`;
          }
        }
        printTitleRef.current = fileName;
      }

      setPrintSheets(sheets);
    } catch (err) {
      console.error('[StundennachweisMatrix] Sammeldruck-Fehler:', err);
      alert('Beim Laden der Druckdaten ist ein Fehler aufgetreten.');
    } finally {
      setPrinting(false);
    }
  };

  // Wenn die Blaetter im DOM sind: Druckdialog oeffnen.
  useEffect(() => {
    if (printSheets && printSheets.length > 0) {
      // v7.4.6-8: sprechenden Dateinamen setzen (Browser nutzt document.title
      // als PDF-Vorschlag); Rueckstellung im afterprint-Handler.
      prevTitleRef.current = document.title;
      if (printTitleRef.current) document.title = printTitleRef.current;
      const id = window.setTimeout(() => window.print(), 120);
      return () => window.clearTimeout(id);
    }
  }, [printSheets]);

  // Nach dem Drucken Blaetter wieder aus dem DOM nehmen.
  useEffect(() => {
    const after = () => {
      setPrintSheets(null);
      // v7.4.6-8: urspruenglichen Seitentitel wiederherstellen.
      if (prevTitleRef.current) { document.title = prevTitleRef.current; prevTitleRef.current = ''; }
    };
    window.addEventListener('afterprint', after);
    return () => window.removeEventListener('afterprint', after);
  }, []);

  const selectedCount = selected.size;

  return (
    <>
    <div className="mt-6 border border-gray-200 rounded-lg overflow-hidden print:hidden">

      {/* Header */}
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Grid3x3 className={`w-5 h-5 ${iconColor}`} />
          <span className="font-medium text-gray-900">Stundennachweis-Matrix</span>

          {/* Mehrere Projekte: Dropdown */}
          {projects.length > 1 && (
            <select
              value={activeProjectId || ''}
              onChange={e => onProjectChange(e.target.value)}
              className={`text-sm border border-gray-300 rounded px-2 py-1 focus:ring-1 ${focusRing}`}
            >
              {projects.map(p => (
                <option key={p.id} value={p.id}>
                  {p.short_name || p.name}
                  {p.funding_reference ? ` (${p.funding_reference})` : ''}
                </option>
              ))}
            </select>
          )}

          {/* Einzelprojekt: Name + FKZ + Format */}
          {projects.length === 1 && activeProject && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-800">
                {activeProject.short_name || activeProject.name}
              </span>
              {activeProject.funding_reference && (
                <span className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-0.5 rounded">
                  {activeProject.funding_reference}
                </span>
              )}
              {activeProject.funding_format && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">
                  {getFundingLabel(activeProject.funding_format)}
                </span>
              )}
            </div>
          )}

          {/* v7.4.6-10: Direktlink zur Zahlungsanforderung (ZA) des Projekts */}
          {activeProjectId && (
            <button
              onClick={goToZA}
              className={`flex items-center gap-1 text-sm ${accentColor} hover:underline`}
              title="Zur Zahlungsanforderung (ZA) dieses Projekts springen"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              ZA
            </button>
          )}
        </div>

        {/* Legende */}
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-green-500 inline-block"></span>Vollstaendig
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-orange-400 inline-block"></span>Teilweise
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-red-400 inline-block"></span>Fehlt
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-gray-200 inline-block"></span>Zukunft
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block"></span>Rueckfrage
          </span>
        </div>
      </div>

      {/* v7.4.6-3: Sammeldruck-Bedienleiste */}
      <div className="bg-white px-4 py-2 border-b border-gray-200 flex items-center justify-between gap-3 flex-wrap print:hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={toggleDruckModus}
            className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded border transition-colors ${
              druckModus
                ? 'text-white border-transparent'
                : `bg-white ${accentColor} border-gray-300 hover:bg-gray-50`
            }`}
            style={druckModus ? { backgroundColor: portal === 'berater' ? '#002451' : '#65A655' } : undefined}
          >
            <Printer className="w-4 h-4" /> Sammeldruck
          </button>
          {/* v7.4.6-13: AP-Status-Dialog direkt aus der Matrix (neben Sammeldruck) */}
          {!druckModus && apEnabled && activeProjectId && (
            <button
              onClick={() => setShowApStatus(true)}
              className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded border bg-white ${accentColor} border-gray-300 hover:bg-gray-50`}
              title="AP-Status (geplant / gebucht / offen je Arbeitspaket und Mitarbeiter) oeffnen"
            >
              <Grid3x3 className="w-4 h-4" /> AP-Status
            </button>
          )}
          {druckModus && (
            <span className="text-xs text-gray-500">
              Monatsspalte, MA-Name oder Zelle anklicken zum Aus-/Abwaehlen.
            </span>
          )}
        </div>
        {druckModus && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => toggleGroup(allSelectableKeys())}
              className="text-xs px-2 py-1 rounded border border-gray-300 text-gray-600 hover:bg-gray-50"
            >
              Alle / keine
            </button>
            <button
              onClick={handleSammeldruck}
              disabled={selectedCount === 0 || printing}
              className="flex items-center gap-2 text-sm px-3 py-1.5 rounded text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: portal === 'berater' ? '#002451' : '#65A655' }}
            >
              <Printer className="w-4 h-4" />
              {printing ? 'Lade...' : `Drucken (${selectedCount})`}
            </button>
            <button
              onClick={toggleDruckModus}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded border border-gray-300 text-gray-600 hover:bg-gray-50"
            >
              <X className="w-3.5 h-3.5" /> Abbrechen
            </button>
          </div>
        )}
      </div>

      {/* Tabelle */}
      {!matrixData ? (
        <div className="p-8 text-center text-gray-500">
          Keine Projektdaten verfuegbar (Projekt benoetigt Start- und Enddatum).
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-200">
                <th
                  className={`px-3 py-2 text-left font-semibold text-gray-600 w-40 sticky left-0 bg-gray-100 z-10 ${druckModus ? 'cursor-pointer select-none' : ''}`}
                  onClick={druckModus ? () => toggleGroup(allSelectableKeys()) : undefined}
                  title={druckModus ? 'Alle aus-/abwaehlen' : undefined}
                >
                  {druckModus ? (
                    <span className="flex items-center gap-1">
                      {selectableKeys.size > 0 && allSelectableKeys().every(k => selected.has(k))
                        ? <CheckSquare className="w-4 h-4" />
                        : <Square className="w-4 h-4 text-gray-400" />}
                      Mitarbeiter
                    </span>
                  ) : 'Mitarbeiter'}
                </th>
                {matrixData.years.map(year => {
                  const monthsInYear = matrixData.months.filter(m => m.year === year);
                  return (
                    <th key={year} colSpan={monthsInYear.length}
                      className="px-2 py-2 text-center font-bold text-gray-700 border-l border-gray-300">
                      Jahr {year - matrixData.years[0] + 1} ({year})
                    </th>
                  );
                })}
              </tr>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-3 py-2 sticky left-0 bg-gray-50 z-10"></th>
                {matrixData.months.map(({ year, month, label }) => {
                  const now = new Date();
                  const isCurrent = year === now.getFullYear() && month === now.getMonth() + 1;
                  const cKeys = druckModus ? columnKeys(year, month) : [];
                  const colSel = cKeys.length > 0 && cKeys.every(k => selected.has(k));
                  return (
                    <th key={`${year}-${month}`}
                      onClick={druckModus && cKeys.length > 0 ? () => toggleGroup(cKeys) : undefined}
                      title={druckModus ? 'Monat fuer alle MA aus-/abwaehlen' : undefined}
                      className={`px-1 py-2 text-center font-medium w-10 border-l border-gray-200 ${isCurrent ? 'text-blue-700 bg-blue-50' : 'text-gray-500'} ${druckModus && cKeys.length > 0 ? 'cursor-pointer select-none' : ''} ${colSel ? 'bg-blue-100 text-blue-800' : ''}`}>
                      {druckModus && (
                        <span className="flex justify-center mb-0.5">
                          {colSel
                            ? <CheckSquare className="w-3 h-3" />
                            : (cKeys.length > 0 ? <Square className="w-3 h-3 text-gray-400" /> : null)}
                        </span>
                      )}
                      {label}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {matrixData.employees.map((emp, empIdx) => (
                <tr key={emp.id} className={empIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td
                    onClick={druckModus ? () => { const rk = rowKeys(emp.id); if (rk.length) toggleGroup(rk); } : undefined}
                    title={druckModus ? 'Alle Monate dieses MA aus-/abwaehlen' : undefined}
                    className={`px-3 py-2 font-medium text-gray-800 sticky left-0 z-10 ${empIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${druckModus ? 'cursor-pointer select-none' : ''}`}>
                    {druckModus ? (
                      <span className="flex items-center gap-1">
                        {(() => {
                          const rk = rowKeys(emp.id);
                          const sel = rk.length > 0 && rk.every(k => selected.has(k));
                          return sel
                            ? <CheckSquare className="w-4 h-4" />
                            : <Square className="w-4 h-4 text-gray-400" />;
                        })()}
                        {emp.display_name}
                      </span>
                    ) : emp.display_name}
                  </td>
                  {matrixData.months.map(({ year, month }) => {
                    const cell = matrixData.cells.find(
                      c => c.employeeId === emp.id && c.year === year && c.month === month
                    );
                    const status = cell?.status || 'future';
                    const hours = cell?.hoursRecorded || 0;
                    const billable = cell?.billableHours || 0; // v7.4.6-12: Anzeige-Zahl = foerderbar gebucht
                    const colorMap: Record<string, string> = {
                      complete: 'bg-green-500 hover:bg-green-600 cursor-pointer',
                      partial:  'bg-orange-400 hover:bg-orange-500 cursor-pointer',
                      missing:  'bg-red-400 hover:bg-red-500 cursor-pointer',
                      future:   'bg-gray-200 cursor-default',
                      outside:  'bg-gray-100 cursor-default',
                    };
                    const isClickable = status !== 'future' && status !== 'outside';
                    // NEU v7.4.4-3: Offene Notiz pruefen
                    const hasOpenNote = notes.some(
                      n => n.employee_id === emp.id && n.project_id === activeProjectId && n.year === year && n.month === month && n.status === 'offen'
                    );
                    const monthName = ['Januar','Februar','Maerz','April','Mai','Juni','Juli',
                      'August','September','Oktober','November','Dezember'][month-1];
                    const tooltip = (status === 'future'
                      ? `${monthName} ${year}: Noch nicht erfasst`
                      : status === 'complete'
                      ? `${monthName} ${year}: ${billable.toFixed(1)}h gebucht -Vollstaendig`
                      : status === 'partial'
                      ? `${monthName} ${year}: ${billable.toFixed(1)}h gebucht -In Bearbeitung`
                      : `${monthName} ${year}: Keine Erfassung`)
                      + (hasOpenNote ? ' | Offene Rueckfrage' : '');
                    // v7.4.6-11: gebuchte Monatsstunden als kleine Zusatzzahl unter dem
                    // Ampel-Feld (nur wenn erfasst und Monat innerhalb Laufzeit/Vergangenheit).
                    const hoursLabel = (isClickable && billable > 0)
                      ? (Number.isInteger(billable) ? String(billable) : billable.toFixed(1))
                      : '';
                    return (
                      <td key={`${year}-${month}`}
                        className="px-1 py-1.5 text-center border-l border-gray-100"
                        title={tooltip}>
                        <div className="flex flex-col items-center">
                          <div className="relative w-8 h-7">
                            <div
                              className={`w-full h-full rounded flex items-center justify-center text-white font-bold transition-colors ${colorMap[status] || 'bg-gray-100'} ${druckModus && isClickable && isSelected(emp.id, year, month) ? 'ring-2 ring-offset-1 ring-blue-700' : ''}`}
                              onClick={() => {
                                if (druckModus) { if (isClickable) toggleCell(emp.id, year, month); }
                                else if (isClickable) onNavigateToZE(emp.id, year, month, activeProjectId);
                              }}
                            >
                              {status === 'complete' && <CheckCircle size={14} />}
                              {status === 'partial'  && <AlertTriangle size={14} />}
                              {status === 'missing'  && <XCircle size={14} />}
                              {status === 'future'   && <span className="text-gray-400 text-xs">-</span>}
                            </div>
                            {hasOpenNote && (
                              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-orange-500 rounded-full border border-white"></span>
                            )}
                          </div>
                          <span className="mt-0.5 h-3 text-[10px] leading-none text-gray-600 tabular-nums">{hoursLabel}</span>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="bg-gray-50 px-4 py-2 border-t border-gray-200 text-xs text-gray-500 print:hidden">
        {druckModus
          ? 'Sammeldruck: die gewaehlten Stundennachweise werden zu einem Ausdruck/PDF zusammengefasst (je Blatt eine Seite). Im Druckdialog "Als PDF speichern" waehlen.'
          : 'Klick auf eine Zelle oeffnet die Zeiterfassung des Mitarbeiters fuer den jeweiligen Monat.'}
      </div>
    </div>

    {/* v7.4.6-3: Druck-Container -- nur die Blaetter landen auf Papier.
        Der Style blendet im Druck ALLES ausser #snw-print-root aus und wird nur
        eingehaengt, solange Blaetter aktiv sind (sonst wuerde ein manuelles
        Strg+P der Seite leer drucken). */}
    {printSheets && printSheets.length > 0 && (
      <>
        <div id="snw-print-root" className="hidden print:block">
          {printSheets.map((sheet, i) => (
            <StundennachweisSheet
              key={i}
              data={sheet}
              pageBreakAfter={i < printSheets.length - 1}
            />
          ))}
        </div>
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            body * { visibility: hidden !important; }
            #snw-print-root, #snw-print-root * { visibility: visible !important; }
            #snw-print-root { position: absolute; left: 0; top: 0; width: 100%; }
            html, body {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              background: #fff !important;
              margin: 0 !important;
            }
            @page { size: A4 landscape; margin: 5mm; }
            #snw-print-root table { font-size: 8px !important; }
          }
        ` }} />
      </>
    )}

    {/* v7.4.6-13: AP-Status-Dialog (eigenstaendige Komponente, laedt per projectId) */}
    {showApStatus && activeProjectId && (
      <ApStatusModal
        open={showApStatus}
        onClose={() => setShowApStatus(false)}
        projectId={activeProjectId}
        projectLabel={activeProject?.short_name || activeProject?.name || ''}
      />
    )}
    </>
  );
}
