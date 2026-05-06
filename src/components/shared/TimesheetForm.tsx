// src/components/shared/TimesheetForm.tsx
// ============================================================================
// PZE V7 - Shared Timesheet Form Component
// ============================================================================
// Datum: 6. Mai 2026
// Version: 7.4.6-12
// v7.4.6-12: Arbeitszeitgrenzen finale Haertung:
//   - Monatsgrenze HART (wie Tagesgrenze): Speichern gesperrt + Monatssummen-
//     Zelle rot wenn ueberschritten. Weich-Modal fuer Monat entfernt.
//   - Tagessummenzelle rot wenn > 9h (visuelles Feedback direkt in Tabelle)
//   - Heute-Ampel entfernt (war konzeptionell falsch)
//   - Fehlermeldung im Ampel-Bereich bei Grenzueberschreitung
//   - GF-50%-Regel bleibt weich (Ermessensspielraum beim PT)
// v7.4.6-11: PHASE 3 Arbeitszeitgrenzen
// v7.4.6-8: FIX ArrowDown Navigation: leere AP-Zeilen werden uebersprungen, nonbillable immer erreichbar
// v7.4.6-7: FIX getAbsencesForDay + calculateAbsenceSums: nonBillableEntries (sonstige Arbeiten) fehlte
// v7.4.6-6: AP-Sortierfunktion compareApCode (Versions-Sort fuer dreistellige AP-Nummern)
// v7.4.6-5: AP-Spalte 30->55px, Summe-Monat 50->25px (Druck-neutral), offen 50->25px, Summe-Header -> Sigma
// v7.4.6-4: Vorbelegte AP-Zeilen werden nach ap_number/ap_sub_number
//   aufsteigend sortiert. Bisher kamen sie in der zufaelligen Reihenfolge
//   der DB-Query (v7_work_package_assignments) -> 5,7,3,4,6,8 statt 3,4,5,6,7,8.
//
// v7.4.6-3: Trennung von Vorbelegung und Dropdown:
//   - Matrix-Vorbelegung bei leerem Monat beachtet jetzt den Laufzeit-Check
//     (end_date + 2 Monate >= Monatsende). Alte APs werden nicht mehr
//     vorbelegt, selbst wenn sie noch offene Stunden haben.
//   - Dropdown "Weitere AP" zeigt wieder ALLE uebrigen echten APs des
//     Projekts (ohne Laufzeit-Check), damit Vertretungsfaelle moeglich
//     bleiben. Nur Ueberschriften (PM=0) und APs ohne Datum bleiben
//     auch hier ausgeblendet.
//
// v7.4.6-2: AP-Dropdown gefiltert:
//   - "Ueberschriften"-APs (total_person_months NULL oder 0) erscheinen
//     NIE mehr im Dropdown (weder zugeordnet noch Weitere AP)
//   - APs ohne start_date/end_date werden konservativ ausgeblendet
//   - "Zugeordnete AP" zeigt nur APs, deren end_date + 2 Monate >=
//     Monatsende des gewaehlten Timesheet-Monats liegt
//   - "Weitere AP" enthaelt alle anderen echten APs (mit PM & Datum):
//     abgelaufene zugeordnete, nicht zugewiesene, ausgeschoepfte
//   - WorkPackage-Interface um total_person_months, start_date, end_date
//     erweitert (wird von berater-ze-seite / zeiterfassung-page geliefert)
//
// v7.4.6-1: Feiertagsberechnung konsolidiert - nutzt zentrale Utility
//   src/lib/holidays/germanHolidays.ts. Lokale getEasterSunday/getGermanHolidays/
//   normalizeStateCode entfernt. Neues Feld company.holiday_region wird
//   an die Utility durchgereicht (kommunale Sonderfaelle wie BY_EVAN,
//   BY_AUGSBURG, SN_SORB, TH_EICHSFELD).
//
// v7.4.3-22: Timesheet-Notizen ueberarbeitet:
//   - Kein Loeschen mehr, nur noch Erledigt-Checkbox
//   - Ersteller-Name wird angezeigt (wer hat Notiz geschrieben)
//   - Erlediger-Name wird angezeigt (wer hat Erledigt gesetzt)
//   - Textfeld unbegrenzt (Ergaenzungen unten drunter)
//   - Alles print:hidden (keine Notizen im Druck)
//
// v7.4.3-21: NEU: Interne Timesheet-Notizen (Rueckfragen)
//   - Notiz-Icon neben Monatsauswahl (nur fuer PL/Admin/Berater sichtbar)
//   - Klick oeffnet Modal mit Freitext + offen/erledigt-Status
//   - Orange wenn offene Notiz existiert, sonst dezent grau
//   - Daten aus v7_timesheet_notes (1 Notiz pro MA/Projekt/Monat)
//   - Completion-Status Fix: loadCompletionStatus explizit aufgerufen
//
// v7.4.3-20: Compliance-Absicherung: Monatsauswahl eingeschraenkt auf
//   gueltigen Zeitraum. Beruecksichtigt:
//   - employment_start/end aus v7_employees (Firmenzugehoerigkeit)
//   - assignment_start/end aus v7_project_assignments (Projektzuordnung)
//   - start_date/end_date aus v7_projects (Projektlaufzeit)
//   Ungueltige Monate erscheinen gar nicht im Dropdown.
//   Pfeil-Navigation stoppt an den Raendern des erlaubten Bereichs.
//   Verhindert Zeiterfassung fuer Perioden in denen MA nicht im
//   Unternehmen oder nicht im Projekt war (Subventionsbetrugs-Praevention).
//
// v7.4.3-19: (Zwischenversion, Inkrement-Fehler)
// v7.4.3-18: (vorherige Version)
// v7.4.3-17: MA-Dropdown sortiert nach Team-Nummer (employee_number aus
//   v7_project_assignments) wenn ein Projekt ausgewaehlt ist.
//   Fallback: alphabetisch wenn kein Projekt oder MA nicht im Team.
//
// v7.4.3-16: "Monat abschliessen" speichert automatisch mit
//   - handleToggleComplete prueft hasChanges
//   - Falls ungespeichert: erst handleSave(), dann Completion setzen
//   - Kein separater Speichern-Klick noetig beim Abschliessen
//
// Wird von beiden Portalen genutzt:
// - Firmen-Portal: /v7/firma/zeiterfassung
// - Berater-Portal: /v7/berater/foerderung/firma/[id]/zeiterfassung
//
// v7.4.3-9: NEU: "Monat abschliessen"-Button
//            - Setzt Completion-Flag in v7_timesheet_completions
//            - Wird automatisch zurueckgesetzt wenn Aenderungen gespeichert werden
//            - Matrix-Ampel nutzt Completion-Flag fuer Gruen-Status
// v7.4.3-8: FIX: Feiertagsstunden werden jetzt in Summe "Sonstige" eingerechnet
// v7.4.3-7: FIX: Mariae Himmelfahrt fuer Bayern (DE-BY)
//            FIX: Bundesland-Normalisierung (DB: "Bayern" -> "DE-BY")
//            FIX: Feiertagsstunden aus standard_weekly_hours (Unternehmen)
//            FIX: Komma als Dezimaltrennzeichen durchgaengig
// v7.4.3-4: FIX: Vorbelegung wartet auf geladene Arbeitsplan-Daten
//            Verhindert dass APs mit offen=0 oder negativ vorbelegt werden
// v7.4.3-3: Vorbelegung + Dropdown nur APs mit offenen Stunden
//            Ausgeschoepfte APs nur ueber "Weitere AP" waehlbar
// v7.4.3-2: FIX: offen-Spalte aktualisiert sich sofort nach Speichern
//            (reloadBookedHours nach handleSave aufrufen)
// v7.4.3:    NEU: "offen"-Spalte pro AP-Zeile zeigt verbleibende Stunden
//            (geplant laut Arbeitsplan minus bisher erfasst ueber alle Monate)
//            NEU: AP-Vorbelegung aus Arbeitsplan-Zuordnungen des MA
//            (zugeordnete APs werden automatisch vorbelegt, Dropdown zweigeteilt)
// v7.3.91:   initialYear + initialMonth Props: Monat vorauswaehlen bei
//            Navigation aus Mein-Status oder Berichte-Seite
// v7.3.89:   FIX T-Spalte: T/NT statt X/- Anzeige
//            Getrennte Summenzeilen (technisch/nicht-technisch) bei ZIM_DS
//            Neue Hilfsfunktion isTechnicalAP() behandelt boolean, string,
//            number korrekt (DB liefert manchmal andere Typen als erwartet)
// v7.3.88-10: CRITICAL FIX - Null-Safety fuer Props (Vercel Production Crash)
//             employees, projects, workPackages als safeXxx abgesichert
//             Verhindert "filter is undefined" Fehler in Production Build
// v7.3.86-4: FIX Fehlzeiten-Speicherung - DB-Constraint beachten:
//            work_package_id und absence_code schliessen sich aus!
//            Bei Fehlzeiten: work_package_id = null, hours = 8
//            Lade-Logik angepasst fuer Fehlzeiten ohne work_package_id
// v7.3.86-3: Speichern-Button im Unsaved-Dialog wiederhergestellt
//            Erweitertes Debug-Logging fuer AP-Lade-Problem
// v7.3.86-2: Debug-Logging fuer Timesheet-Laden bei Monatswechsel
//            project_id Filter in Lade-Query hinzugefuegt
// v7.3.86-1: Jahr-Auswahl 2020-2030 wiederhergestellt
//            TypeScript Fix - is_technical Vergleich korrigiert
// v7.3.85-5: Features:
// - Excel-Navigation (Pfeiltasten, Tab, Shift+Tab, Enter)
// - PDF-Export mit Speicherdialog
// - Feiertags-Berechnung pro Bundesland
// - Fehlzeiten (U/K/S)
// - Dynamische AP-Zeilen
// - Durchfuehrbarkeitsstudien-Modus
// - Jahr 2020-2030 waehlbar
// - T-Spalte: Zeigt X wenn AP technisch (is_technical === true)
// - AP-Dropdown: Nur Nummer ohne "AP" Prefix
// ============================================================================

'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  getGermanHolidays,
  type HolidayRegion,
} from '@/lib/holidays/germanHolidays';

// ============================================================================
// KONSTANTEN
// ============================================================================

const PORTAL_COLORS = {
  berater: {
    primary: '#0369a1',     // Sky-700 (wie in v7-constants)
    button: 'bg-sky-600 hover:bg-sky-700',
    text: 'text-sky-700',
    ring: 'focus:ring-sky-500',
  },
  firma: {
    primary: '#65A655',
    button: 'bg-green-600 hover:bg-green-700',
    text: 'text-green-600',
    ring: 'focus:ring-green-500',
  },
};

const HEADER_ORANGE = '#F5D9C0';

// ============================================================================
// ARBEITSZEITGRENZEN (Phase 3, v7.4.6-11)
// Konsistent mit v7-types.ts und KONZEPT-ARBEITSZEITGRENZEN-v1_3.md
// ============================================================================
const MONATSGRENZE_VOLLZEIT = 173.33;  // 2080h / 12 Monate
const TAGESGRENZE_HART = 9;            // PT-Richtlinie, absolut
// GF-Positionen: exakter String-Match (wie in v7-types.ts)
const GF_POSITIONS_LOCAL: readonly string[] = [
  'Geschaeftsfuehrer',
  'Gesellschafter-Geschaeftsfuehrer',
];

const MONTH_NAMES = [
  'Januar', 'Februar', 'Maerz', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
];

const ABSENCE_CODES = ['U', 'K', 'S', 'F'];
const DAILY_HOURS = 8;

// ============================================================================
// TYPEN
// ============================================================================

interface Employee {
  id: string;
  display_name: string;
  first_name: string | null;
  last_name: string | null;
  weekly_hours: number | null;
  employment_start: string | null;
  employment_end: string | null;
}

interface Project {
  id: string;
  name: string;
  short_name: string | null;
  funding_reference: string | null;
  funding_format: string | null;
  start_date: string | null;
  end_date: string | null;
}

interface WorkPackage {
  id: string;
  project_id: string;
  ap_number: number;
  ap_sub_number?: number;
  ap_code: string | null;
  name: string;
  is_technical?: boolean | null;  // NEU: Technisches AP (fuer ZIM_DS)
  total_person_months: number | null;  // v7.4.6-2: Ueberschriften-Filter
  start_date: string | null;            // v7.4.6-2: Laufzeit-Filter
  end_date: string | null;              // v7.4.6-2: Laufzeit-Filter
}

interface ClientCompany {
  id: string;
  name: string;
  federal_state: string | null;
  holiday_region: string | null;  // v7.4.6: kommunaler Feiertags-Override
  standard_weekly_hours: number | null;
}

interface CalendarEntry {
  id?: string;
  value: string;
}

interface APRow {
  workPackageId: string | null;
  entries: Record<number, CalendarEntry>;
}

interface TimesheetFormProps {
  portal: 'berater' | 'firma';
  companyId: string;
  company: ClientCompany;
  employees: Employee[];
  projects: Project[];
  workPackages: WorkPackage[];
  currentUserId: string;
  currentUserDisplayName: string;
  isAdmin: boolean;
  onBack: () => void;
  initialEmployeeId?: string;
  initialProjectId?: string;
  initialYear?: number;
  initialMonth?: number;
}

// ============================================================================
// FEIERTAGS-BERECHNUNG
// ============================================================================
// Zentralisiert ab v7.4.6 in src/lib/holidays/germanHolidays.ts
// Siehe Import-Block ganz oben. Funktionen: getGermanHolidays, normalizeStateCode

// ============================================================================
// KOMPONENTE
// ============================================================================

export default function TimesheetForm({
  portal,
  companyId,
  company,
  employees,
  projects,
  workPackages,
  currentUserId,
  currentUserDisplayName,
  isAdmin,
  onBack,
  initialEmployeeId,
  initialProjectId,
  initialYear,
  initialMonth,
}: TimesheetFormProps) {
  const supabase = createClient();
  const printRef = useRef<HTMLDivElement>(null);
  const colors = PORTAL_COLORS[portal];

  // SAFETY: Props mit Default-Werten absichern (verhindert Vercel Production Crash)
  const safeEmployees = employees || [];
  const safeProjects = projects || [];
  const safeWorkPackages = workPackages || [];

  // Team-Nummern fuer das aktuell gewaehlte Projekt (employee_id -> employee_number)
  const [teamNumbers, setTeamNumbers] = useState<Map<string, number>>(new Map());

  // NEU v7.4.3-20: Assignment-Daten fuer Zeitraum-Einschraenkung
  const [assignmentStart, setAssignmentStart] = useState<string | null>(null);
  const [assignmentEnd, setAssignmentEnd] = useState<string | null>(null);

  // NEU v7.4.3-21: Timesheet-Notizen (interne Rueckfragen)
  const [noteText, setNoteText] = useState<string>('');
  const [noteStatus, setNoteStatus] = useState<'offen' | 'erledigt' | null>(null);
  const [noteId, setNoteId] = useState<string | null>(null);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteEditing, setNoteEditing] = useState<string>('');
  const [noteSaving, setNoteSaving] = useState(false);
  // NEU v7.4.3-22: Ersteller + Erlediger
  const [noteCreatedBy, setNoteCreatedBy] = useState<string>('');
  const [noteCreatedAt, setNoteCreatedAt] = useState<string>('');
  const [noteResolvedBy, setNoteResolvedBy] = useState<string>('');
  const [noteResolvedAt, setNoteResolvedAt] = useState<string>('');

  // Sortierte MA-Liste: nach Team-Nr. wenn Projekt gewaehlt, sonst alphabetisch
  const sortedEmployees = useMemo(() => {
    if (teamNumbers.size === 0) return safeEmployees;
    return [...safeEmployees].sort((a, b) => {
      const nA = teamNumbers.get(a.id) ?? 9999;
      const nB = teamNumbers.get(b.id) ?? 9999;
      if (nA !== nB) return nA - nB;
      return (a.display_name || '').localeCompare(b.display_name || '');
    });
  }, [safeEmployees, teamNumbers]);

  // State
  const [saving, setSaving] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [loadingCompletion, setLoadingCompletion] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Ausgewaehlte Werte
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(initialEmployeeId || safeEmployees[0]?.id || '');
  const [selectedProjectId, setSelectedProjectId] = useState<string>(initialProjectId || safeProjects[0]?.id || '');
  const [selectedYear, setSelectedYear] = useState<number>(initialYear || new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(initialMonth || new Date().getMonth() + 1);

  // Unterschriftsdatum
  const [signatureDate, setSignatureDate] = useState<string>('');

  // Dialog fuer ungespeicherte Aenderungen
  const [showUnsavedDialog, setShowUnsavedDialog] = useState<(() => void) | null>(null);

  // Zeiterfassungs-Daten
  const [apRows, setApRows] = useState<APRow[]>([
    { workPackageId: null, entries: {} },
    { workPackageId: null, entries: {} },
    { workPackageId: null, entries: {} },
    { workPackageId: null, entries: {} },
  ]);
  const [nonBillableEntries, setNonBillableEntries] = useState<Record<number, CalendarEntry>>({});

  // NEU v7.4.3: Arbeitsplan-Daten fuer "offen"-Spalte und AP-Vorbelegung
  // Geplante Stunden pro WP fuer den aktuellen MA (aus v7_work_package_assignments)
  const [plannedHoursPerWP, setPlannedHoursPerWP] = useState<Record<string, number>>({});
  // Bereits erfasste Stunden pro WP ueber ALLE Monate (kumuliert aus v7_timesheets)
  const [totalBookedPerWP, setTotalBookedPerWP] = useState<Record<string, number>>({});
  // IDs der APs, die dem MA laut Arbeitsplan zugeordnet sind
  const [assignedWPIds, setAssignedWPIds] = useState<string[]>([]);

  // Feiertage
  const [holidays, setHolidays] = useState<Map<string, string>>(new Map());

  // ============================================================================
  // ARBEITSZEITGRENZEN STATE (v7.4.6-12)
  // ============================================================================
  const [weeklyHoursAtMonth, setWeeklyHoursAtMonth] = useState<number>(40);
  const [positionTitle, setPositionTitle] = useState<string | null>(null);

  // Abgeleitete Werte
  const selectedProject = safeProjects.find(p => p.id === selectedProjectId);
  const availableWorkPackages = safeWorkPackages.filter(wp => wp.project_id === selectedProjectId);
  const selectedEmployee = safeEmployees.find(e => e.id === selectedEmployeeId);
  const isDurchfuehrbarkeitsstudie = selectedProject?.funding_format?.includes('DS') || false;

  // Hilfsfunktion: Prueft ob AP technisch ist (robust gegen verschiedene DB-Datentypen)
  const isTechnicalAP = (wp: WorkPackage | undefined | null): boolean => {
    if (!wp) return false;
    const val = wp.is_technical as unknown;
    if (val === true || val === 'true' || val === 'TRUE' || val === '1' || val === 1) return true;
    return false;
  };

  // ==========================================================================
  // v7.4.6-5: Universelle AP-Sortierfunktion (Versions-Sort)
  // --------------------------------------------------------------------------
  // Zerlegt ap_code (z.B. "3.1.1") punktweise in Zahlen und vergleicht
  // numerisch je Ebene. Fallback auf ap_number/ap_sub_number wenn kein ap_code.
  // Korrekt fuer beliebige Tiefe: 3 < 3.1 < 3.1.1 < 3.2 < 3.4 < 4 < 5.1
  // ==========================================================================
  const compareApCode = (a: WorkPackage, b: WorkPackage): number => {
    const getCode = (wp: WorkPackage) =>
      wp.ap_code
        ? wp.ap_code.replace(/^AP\s*/i, '')
        : `${wp.ap_number}${wp.ap_sub_number ? `.${wp.ap_sub_number}` : ''}`;
    const aParts = getCode(a).split('.').map(Number);
    const bParts = getCode(b).split('.').map(Number);
    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
      const diff = (aParts[i] || 0) - (bParts[i] || 0);
      if (diff !== 0) return diff;
    }
    return 0;
  };

  // ==========================================================================
  // v7.4.6-2: AP-Gruppenzuordnung fuer Dropdown
  // --------------------------------------------------------------------------
  // Ein AP ist nur dann ueberhaupt waehlbar, wenn:
  //   1. total_person_months > 0   (keine Ueberschriften)
  //   2. start_date UND end_date sind gesetzt   (keine Altdaten)
  // ==========================================================================

  const isSelectableAP = (wp: WorkPackage): boolean => {
    const pm = wp.total_person_months ?? 0;
    if (pm <= 0) return false;
    if (!wp.start_date || !wp.end_date) return false;
    return true;
  };

  // Referenzdatum = Monatsende des gewaehlten Timesheet-Monats
  // (getDaysInMonth wird inline repliziert, da es erst weiter unten im
  //  File deklariert ist und const-Funktionen nicht gehoistet werden)
  const getReferenceDate = (): Date => {
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    return new Date(selectedYear, selectedMonth - 1, daysInMonth);
  };

  // Zugeordnete AP: dem MA zugewiesen, mit offenen Stunden, und
  // end_date + 2 Monate >= Monatsende des gewaehlten Timesheet-Monats.
  const isAPInAssignedGroup = (wp: WorkPackage): boolean => {
    if (!isSelectableAP(wp)) return false;
    if (!assignedWPIds.includes(wp.id)) return false;
    const planned = plannedHoursPerWP[wp.id] || 0;
    const booked = totalBookedPerWP[wp.id] || 0;
    if (planned <= 0) return false;
    if ((planned - booked) <= 0) return false;
    // Laufzeit-Check: end_date + 2 volle Monate
    // Wir vergleichen nur monatsgenau, deshalb den Tag auf 1 setzen
    // (vermeidet JS-Rollover bei Monatsenden wie 31.7 -> 1.10)
    const endDate = new Date(wp.end_date as string);
    const endPlus2 = new Date(endDate.getFullYear(), endDate.getMonth() + 3, 0); // letzter Tag von Monat + 2
    const ref = getReferenceDate();
    return endPlus2 >= ref;
  };

  // Weitere AP (v7.4.6-3): Alle uebrigen echten APs (mit PM > 0 und Datum),
  // die nicht bereits in "Zugeordnete AP" sichtbar sind. Kein Laufzeit-Check
  // hier, damit Vertretungsfaelle (Uebernahme von einem anderen MA) moeglich
  // bleiben. Nur Ueberschriften und APs ohne Datum werden ausgeblendet.
  const isAPInWeitereGroup = (wp: WorkPackage): boolean => {
    if (!isSelectableAP(wp)) return false;
    return !isAPInAssignedGroup(wp);
  };

  const allRowsFilled = apRows.every(row => row.workPackageId !== null);

  // ============================================================================
  // NEU v7.4.3-20: Erlaubter Zeitraum fuer Monatsauswahl
  // ============================================================================
  // Beruecksichtigt: employment_start/end, assignment_start/end, project start/end
  // Ergebnis: { firstYear, firstMonth, lastYear, lastMonth } oder null (alles erlaubt)

  const allowedRange = useMemo(() => {
    // Fruehestes Datum = Maximum aus employment_start, assignment_start, project.start_date
    const startDates: string[] = [];
    if (selectedEmployee?.employment_start) startDates.push(selectedEmployee.employment_start);
    if (assignmentStart) startDates.push(assignmentStart);
    if (selectedProject?.start_date) startDates.push(selectedProject.start_date);

    // Spaetestes Datum = Minimum aus employment_end, assignment_end, project.end_date
    const endDates: string[] = [];
    if (selectedEmployee?.employment_end) endDates.push(selectedEmployee.employment_end);
    if (assignmentEnd) endDates.push(assignmentEnd);
    if (selectedProject?.end_date) endDates.push(selectedProject.end_date);

    // Fruehestes erlaubtes Datum (hoechstes Start-Datum)
    let firstYear = 2020;
    let firstMonth = 1;
    if (startDates.length > 0) {
      const latestStart = startDates.sort().pop()!; // alphabetisch sortiert = chronologisch bei ISO-Daten
      const parts = latestStart.split('-');
      firstYear = parseInt(parts[0]);
      firstMonth = parseInt(parts[1]);
    }

    // Spaetestes erlaubtes Datum (niedrigstes End-Datum)
    let lastYear = 2030;
    let lastMonth = 12;
    if (endDates.length > 0) {
      const earliestEnd = endDates.sort()[0]; // frueheSTES End-Datum
      const parts = earliestEnd.split('-');
      lastYear = parseInt(parts[0]);
      lastMonth = parseInt(parts[1]);
    }

    return { firstYear, firstMonth, lastYear, lastMonth };
  }, [selectedEmployee, assignmentStart, assignmentEnd, selectedProject]);

  // Hilfsfunktion: Ist ein Monat/Jahr im erlaubten Bereich?
  const isMonthAllowed = useCallback((year: number, month: number): boolean => {
    if (!allowedRange) return true;
    const { firstYear, firstMonth, lastYear, lastMonth } = allowedRange;
    const val = year * 12 + month;
    const min = firstYear * 12 + firstMonth;
    const max = lastYear * 12 + lastMonth;
    return val >= min && val <= max;
  }, [allowedRange]);

  // Gefilterte Monatsliste fuer das aktuell gewaehlte Jahr
  const allowedMonths = useMemo(() => {
    return MONTH_NAMES.map((name, idx) => ({
      name,
      month: idx + 1,
      allowed: isMonthAllowed(selectedYear, idx + 1),
    })).filter(m => m.allowed);
  }, [selectedYear, isMonthAllowed]);

  // Gefilterte Jahresliste
  const allowedYears = useMemo(() => {
    if (!allowedRange) return [2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030];
    const years: number[] = [];
    for (let y = allowedRange.firstYear; y <= allowedRange.lastYear; y++) {
      years.push(y);
    }
    return years;
  }, [allowedRange]);

  // ============================================================================
  // HILFSFUNKTIONEN
  // ============================================================================

  // Prueft auf ungespeicherte Aenderungen und zeigt Dialog
  const checkUnsavedChanges = (callback: () => void) => {
    if (hasChanges) {
      setShowUnsavedDialog(() => callback);
    } else {
      callback();
    }
  };

  const getDaysInMonth = (year: number, month: number): number => {
    return new Date(year, month, 0).getDate();
  };

  const getDayOfWeek = (year: number, month: number, day: number): number => {
    return new Date(year, month - 1, day).getDay();
  };

  const isWeekend = (year: number, month: number, day: number): boolean => {
    const dow = getDayOfWeek(year, month, day);
    return dow === 0 || dow === 6;
  };

  const isHoliday = (year: number, month: number, day: number): string | null => {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return holidays.get(dateStr) || null;
  };

  const isAbsenceCode = (value: string): boolean => {
    return ABSENCE_CODES.includes(value.toUpperCase());
  };

  // FIX v7.4.3-5: Komma als Dezimaltrennzeichen
  const parseHours = (value: string): number => {
    return parseFloat(value.replace(',', '.')) || 0;
  };

  // FIX v7.4.3-7: Feiertagsstunden aus Unternehmens-Wochenstunden
  // 38h/Woche -> 7,6h/Tag | 40h/Woche -> 8h/Tag
  const companyDailyHours = Math.round(((company?.standard_weekly_hours || 40) / 5) * 100) / 100;

  const formatWorkDate = (day: number): string => {
    return `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const formatDisplayDate = (): string => {
    return `${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}`;
  };

  const getLastWorkdayOfMonth = (year: number, month: number): string => {
    const daysInMonth = getDaysInMonth(year, month);
    for (let day = daysInMonth; day >= 1; day--) {
      if (!isWeekend(year, month, day) && !isHoliday(year, month, day)) {
        return `${String(day).padStart(2, '0')}.${String(month).padStart(2, '0')}.${year}`;
      }
    }
    return `${daysInMonth}.${String(month).padStart(2, '0')}.${year}`;
  };

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Feiertage berechnen - inkl. kommunaler Sonderregelung (v7.4.6)
  useEffect(() => {
    if (company?.federal_state) {
      setHolidays(
        getGermanHolidays(
          selectedYear,
          company.federal_state,
          (company.holiday_region ?? undefined) as HolidayRegion,
        ),
      );
    }
  }, [selectedYear, company?.federal_state, company?.holiday_region]);

  // Unterschriftsdatum
  useEffect(() => {
    setSignatureDate(getLastWorkdayOfMonth(selectedYear, selectedMonth));
  }, [selectedYear, selectedMonth, holidays]);

  // ============================================================================
  // ARBEITSZEITGRENZEN: MA-Daten laden (v7.4.6-11)
  // Laedt position_title + weekly_hours aus Historie fuer aktuellen MA/Monat
  // ============================================================================
  useEffect(() => {
    const loadMaData = async () => {
      if (!selectedEmployeeId) return;
      try {
        const supabaseClient = createClient();
        // position_title laden
        const { data: empData } = await supabaseClient
          .from('v7_employees')
          .select('position_title, weekly_hours')
          .eq('id', selectedEmployeeId)
          .maybeSingle();
        setPositionTitle(empData?.position_title ?? null);

        // weekly_hours aus Teilzeit-Historie fuer den ersten Tag des Monats
        const monatErster = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
        const { data: histEntry } = await supabaseClient
          .from('v7_employee_hours_history')
          .select('weekly_hours')
          .eq('employee_id', selectedEmployeeId)
          .lte('gueltig_ab', monatErster)
          .order('gueltig_ab', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (histEntry?.weekly_hours) {
          setWeeklyHoursAtMonth(Number(histEntry.weekly_hours));
        } else {
          // Fallback: static weekly_hours aus v7_employees
          setWeeklyHoursAtMonth(Number(empData?.weekly_hours ?? 40));
        }
      } catch (err) {
        console.error('[TimesheetForm] Fehler beim Laden MA-Arbeitszeitdaten:', err);
        setWeeklyHoursAtMonth(40);
      }
    };
    loadMaData();
  }, [selectedEmployeeId, selectedYear, selectedMonth]);

  // NEU v7.4.3-9: Completion-Status laden
  const loadCompletionStatus = async (empId: string, projId: string, year: number, month: number) => {
    if (!empId || !projId) return;
    try {
      const supabaseClient = createClient();
      const { data } = await supabaseClient
        .from('v7_timesheet_completions')
        .select('id')
        .eq('employee_id', empId)
        .eq('project_id', projId)
        .eq('year', year)
        .eq('month', month)
        .maybeSingle();
      setIsCompleted(!!data);
    } catch {
      setIsCompleted(false);
    }
  };

  // NEU v7.4.3: Arbeitsplan-Zuordnungen und kumulierte Stunden laden
  // Wiederverwendbare Funktion (wird auch nach Speichern aufgerufen)
  const reloadBookedHours = useCallback(async () => {
    if (!selectedEmployeeId || !selectedProjectId) return;
    try {
      const supabaseClient = createClient();
      const { data: tsEntries, error: tsErr } = await supabaseClient
        .from('v7_timesheets')
        .select('work_package_id, hours')
        .eq('employee_id', selectedEmployeeId)
        .eq('project_id', selectedProjectId)
        .eq('is_active', true)
        .eq('is_billable', true);

      if (tsErr) {
        console.error('[TimesheetForm] Fehler beim Laden der kumulierten Stunden:', tsErr);
        return;
      }

      const booked: Record<string, number> = {};
      (tsEntries || []).forEach((e: any) => {
        if (e.work_package_id) {
          const h = parseFloat(e.hours) || 0;
          if (h > 0) {
            booked[e.work_package_id] = (booked[e.work_package_id] || 0) + h;
          }
        }
      });

      setTotalBookedPerWP(booked);
      console.log('[TimesheetForm] Kumulierte Stunden aktualisiert:', booked);
    } catch (err) {
      console.error('[TimesheetForm] Fehler beim Reload der Stunden:', err);
    }
  }, [selectedEmployeeId, selectedProjectId]);

  // Team-Nummern + Assignment-Daten laden wenn Projekt oder MA sich aendert
  useEffect(() => {
    if (!selectedProjectId) {
      setTeamNumbers(new Map());
      setAssignmentStart(null);
      setAssignmentEnd(null);
      return;
    }
    const loadTeamNumbers = async () => {
      const supabaseClient = createClient();
      const { data } = await supabaseClient
        .from('v7_project_assignments')
        .select('employee_id, employee_number, assignment_start, assignment_end')
        .eq('project_id', selectedProjectId);
      if (data) {
        const map = new Map<string, number>();
        data.forEach((a: { employee_id: string; employee_number: number | null; assignment_start: string | null; assignment_end: string | null }) => {
          if (a.employee_number !== null) map.set(a.employee_id, a.employee_number);
        });
        setTeamNumbers(map);

        // NEU v7.4.3-20: Assignment-Daten fuer den aktuellen MA setzen
        if (selectedEmployeeId) {
          const myAssignment = data.find((a: { employee_id: string }) => a.employee_id === selectedEmployeeId);
          setAssignmentStart(myAssignment?.assignment_start || null);
          setAssignmentEnd(myAssignment?.assignment_end || null);
        }
      }
    };
    loadTeamNumbers();
  }, [selectedProjectId, selectedEmployeeId]);

  // NEU v7.4.3-20: Automatische Korrektur wenn aktueller Monat ausserhalb des erlaubten Bereichs
  useEffect(() => {
    if (!allowedRange) return;
    if (!isMonthAllowed(selectedYear, selectedMonth)) {
      const { firstYear, firstMonth, lastYear, lastMonth } = allowedRange;
      const currentVal = selectedYear * 12 + selectedMonth;
      const minVal = firstYear * 12 + firstMonth;
      const maxVal = lastYear * 12 + lastMonth;

      if (currentVal < minVal) {
        setSelectedYear(firstYear);
        setSelectedMonth(firstMonth);
      } else if (currentVal > maxVal) {
        setSelectedYear(lastYear);
        setSelectedMonth(lastMonth);
      }
    }
  }, [allowedRange, selectedYear, selectedMonth, isMonthAllowed]);

  // NEU v7.4.3-21: Timesheet-Notiz laden bei MA/Projekt/Monat-Wechsel
  useEffect(() => {
    if (!selectedEmployeeId || !selectedProjectId || !isAdmin) {
      setNoteId(null);
      setNoteText('');
      setNoteStatus(null);
      setNoteCreatedBy('');
      setNoteCreatedAt('');
      setNoteResolvedBy('');
      setNoteResolvedAt('');
      return;
    }
    const loadNote = async () => {
      try {
        const supabaseClient = createClient();
        const { data, error } = await supabaseClient
          .from('v7_timesheet_notes')
          .select('id, note_text, status, created_by, created_at, resolved_by, resolved_at')
          .eq('employee_id', selectedEmployeeId)
          .eq('project_id', selectedProjectId)
          .eq('year', selectedYear)
          .eq('month', selectedMonth)
          .maybeSingle();
        if (error) {
          console.error('[TimesheetForm] Notiz laden Fehler:', error);
          return;
        }
        if (data) {
          setNoteId(data.id);
          setNoteText(data.note_text);
          setNoteStatus(data.status as 'offen' | 'erledigt');

          // Ersteller-Name laden
          if (data.created_by) {
            const { data: creator } = await supabaseClient
              .from('v7_user_profiles')
              .select('display_name')
              .eq('id', data.created_by)
              .maybeSingle();
            setNoteCreatedBy(creator?.display_name || '');
          } else {
            setNoteCreatedBy('');
          }
          setNoteCreatedAt(data.created_at || '');

          // Erlediger-Name laden
          if (data.resolved_by) {
            const { data: resolver } = await supabaseClient
              .from('v7_user_profiles')
              .select('display_name')
              .eq('id', data.resolved_by)
              .maybeSingle();
            setNoteResolvedBy(resolver?.display_name || '');
          } else {
            setNoteResolvedBy('');
          }
          setNoteResolvedAt(data.resolved_at || '');
        } else {
          setNoteId(null);
          setNoteText('');
          setNoteStatus(null);
          setNoteCreatedBy('');
          setNoteCreatedAt('');
          setNoteResolvedBy('');
          setNoteResolvedAt('');
        }
      } catch (err) {
        console.error('[TimesheetForm] Notiz laden Fehler:', err);
      }
    };
    loadNote();
  }, [selectedEmployeeId, selectedProjectId, selectedYear, selectedMonth, isAdmin]);

  useEffect(() => {
    if (!selectedEmployeeId || !selectedProjectId) return;

    const loadAssignmentData = async () => {
      try {
        const supabaseClient = createClient();

        // 1. Geplante PM pro WP fuer diesen MA aus v7_work_package_assignments
        const { data: assignments, error: assErr } = await supabaseClient
          .from('v7_work_package_assignments')
          .select('work_package_id, planned_person_months')
          .eq('employee_id', selectedEmployeeId)
          .eq('is_active', true);

        if (assErr) {
          console.error('[TimesheetForm] Fehler beim Laden der Assignments:', assErr);
          return;
        }

        // Filter: Nur APs die zu diesem Projekt gehoeren
        const projectWPIds = safeWorkPackages
          .filter(wp => wp.project_id === selectedProjectId)
          .map(wp => wp.id);

        const planned: Record<string, number> = {};
        const assignedIds: string[] = [];

        (assignments || []).forEach((a: any) => {
          if (projectWPIds.includes(a.work_package_id)) {
            const pm = a.planned_person_months || 0;
            if (pm > 0) {
              planned[a.work_package_id] = pm * 173.33;
              assignedIds.push(a.work_package_id);
            }
          }
        });

        setPlannedHoursPerWP(planned);
        setAssignedWPIds(assignedIds);

        // 2. Kumulierte Ist-Stunden laden
        await reloadBookedHours();

        console.log('[TimesheetForm] Arbeitsplan geladen:', { planned, assignedIds });
      } catch (err) {
        console.error('[TimesheetForm] Fehler beim Laden der Arbeitsplan-Daten:', err);
      }
    };

    loadAssignmentData();
  }, [selectedEmployeeId, selectedProjectId, workPackages, reloadBookedHours]);

  // Daten laden fuer MA/Projekt/Monat
  useEffect(() => {
    if (!selectedEmployeeId || !selectedProjectId) {
      console.log('[TimesheetForm] Kein MA oder Projekt ausgewaehlt:', { selectedEmployeeId, selectedProjectId });
      return;
    }

    const loadTimeEntries = async () => {
      console.log('[TimesheetForm] ====== LADE ZEITEINTRAEGE ======');
      console.log('[TimesheetForm] Parameter:', { 
        selectedEmployeeId, 
        selectedProjectId, 
        selectedYear, 
        selectedMonth 
      });
      
      const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
      const startDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
      const endDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${daysInMonth}`;

      console.log('[TimesheetForm] Datumsbereich:', { startDate, endDate });
      console.log('[TimesheetForm] Alle workPackages (Props):', safeWorkPackages.length, safeWorkPackages.map(wp => ({ id: wp.id, project_id: wp.project_id, name: wp.name })));

      const projectWPs = safeWorkPackages.filter(wp => wp.project_id === selectedProjectId);
      const wpIds = projectWPs.map(wp => wp.id);
      
      console.log('[TimesheetForm] Gefilterte Projekt-APs:', projectWPs.length, projectWPs.map(wp => ({ id: wp.id, name: wp.name })));
      console.log('[TimesheetForm] WP IDs:', wpIds);

      if (wpIds.length === 0) {
        console.log('[TimesheetForm] WARNUNG: Keine APs fuer Projekt gefunden - setze leere Zeilen');
        setApRows([
          { workPackageId: null, entries: {} },
          { workPackageId: null, entries: {} },
          { workPackageId: null, entries: {} },
          { workPackageId: null, entries: {} },
        ]);
        setNonBillableEntries({});
        setHasChanges(false);
        return;
      }

      const { data: entries, error: loadError } = await supabase
        .from('v7_timesheets')
        .select('*')
        .eq('employee_id', selectedEmployeeId)
        .eq('project_id', selectedProjectId)
        .gte('work_date', startDate)
        .lte('work_date', endDate)
        .eq('is_active', true);

      if (loadError) {
        console.error('[TimesheetForm] DB-Fehler beim Laden:', loadError);
      }
      
      console.log('[TimesheetForm] Geladene DB-Eintraege:', entries?.length || 0);
      if (entries && entries.length > 0) {
        console.log('[TimesheetForm] Erste Eintraege:', entries.slice(0, 5).map(e => ({
          id: e.id,
          work_package_id: e.work_package_id,
          work_date: e.work_date,
          hours: e.hours,
          is_billable: e.is_billable
        })));
      }

      const newRows: APRow[] = [
        { workPackageId: null, entries: {} },
        { workPackageId: null, entries: {} },
        { workPackageId: null, entries: {} },
        { workPackageId: null, entries: {} },
      ];
      const newNonBillable: Record<number, CalendarEntry> = {};

      const wpEntryMap = new Map<string, Map<number, { id: string; value: string }>>();

      // Map fuer Fehlzeiten (ohne work_package_id, aber mit absence_code)
      const absenceEntries = new Map<number, { id: string; value: string }>();

      entries?.forEach(entry => {
        const day = parseInt(entry.work_date.split('-')[2]);

        if (entry.work_package_id && wpIds.includes(entry.work_package_id)) {
          // Normale Arbeitseintraege mit Work Package
          if (!wpEntryMap.has(entry.work_package_id)) {
            wpEntryMap.set(entry.work_package_id, new Map());
          }
          const value = entry.hours > 0 ? entry.hours.toString() : '';
          wpEntryMap.get(entry.work_package_id)!.set(day, { id: entry.id, value });
          console.log('[TimesheetForm] AP-Eintrag gefunden:', { wp_id: entry.work_package_id, day, value });
        } else if (entry.absence_code && !entry.work_package_id) {
          // Fehlzeiten (U/K/S) - werden ohne work_package_id gespeichert
          absenceEntries.set(day, { id: entry.id, value: entry.absence_code });
          console.log('[TimesheetForm] Fehlzeit-Eintrag gefunden:', { day, absence_code: entry.absence_code });
        } else if (!entry.is_billable && !entry.work_package_id && !entry.absence_code) {
          // Sonstige nicht zuschussfaehige Arbeiten (ohne absence_code)
          newNonBillable[day] = { id: entry.id, value: entry.hours > 0 ? entry.hours.toString() : '' };
          console.log('[TimesheetForm] Sonstige-Eintrag gefunden:', { day, hours: entry.hours });
        } else {
          console.log('[TimesheetForm] Eintrag NICHT zugeordnet:', { 
            wp_id: entry.work_package_id, 
            in_wpIds: entry.work_package_id ? wpIds.includes(entry.work_package_id) : 'null',
            is_billable: entry.is_billable,
            absence_code: entry.absence_code
          });
        }
      });

      console.log('[TimesheetForm] Verarbeitete WP-Eintraege:', wpEntryMap.size);
      console.log('[TimesheetForm] Fehlzeit-Eintraege:', absenceEntries.size);
      console.log('[TimesheetForm] Sonstige Eintraege:', Object.keys(newNonBillable).length);

      let rowIndex = 0;
      wpEntryMap.forEach((dayMap, wpId) => {
        if (rowIndex < 4) {
          const entriesObj: Record<number, CalendarEntry> = {};
          dayMap.forEach((entry, day) => {
            entriesObj[day] = entry;
          });
          // Fehlzeiten in die erste Zeile mit diesem WP einfuegen
          if (rowIndex === 0) {
            absenceEntries.forEach((entry, day) => {
              entriesObj[day] = entry;
            });
          }
          newRows[rowIndex] = { workPackageId: wpId, entries: entriesObj };
          rowIndex++;
        }
      });

      // Falls keine WP-Eintraege, aber Fehlzeiten vorhanden - in erste Zeile laden
      if (wpEntryMap.size === 0 && absenceEntries.size > 0 && wpIds.length > 0) {
        const entriesObj: Record<number, CalendarEntry> = {};
        absenceEntries.forEach((entry, day) => {
          entriesObj[day] = entry;
        });
        newRows[0] = { workPackageId: wpIds[0], entries: entriesObj };
        console.log('[TimesheetForm] Fehlzeiten in erste Zeile geladen mit WP:', wpIds[0]);
      }

      // NEU v7.4.3-3: AP-Vorbelegung nur fuer APs mit offenen Stunden
      // Wichtig: Nur ausfuehren wenn die Arbeitsplan-Daten bereits geladen sind
      const hasAssignmentData = Object.keys(plannedHoursPerWP).length > 0;
      
      if (wpEntryMap.size === 0 && absenceEntries.size === 0 && assignedWPIds.length > 0 && hasAssignmentData) {
        // v7.4.6-3: Nur APs vorbelegen, die dem MA zugeordnet sind, noch Stunden
        // offen haben UND deren Laufzeit zeitlich passt (end_date + 2 Monate
        // >= Monatsende). Damit werden alte APs (z.B. Spezifikation aus Mai)
        // nicht mehr automatisch in spaete Monate (z.B. Januar) gezogen.
        const relevantAssigned = assignedWPIds.filter(id => {
          if (!wpIds.includes(id)) return false;
          const wp = safeWorkPackages.find(w => w.id === id);
          if (!wp) return false;
          // Gleiche Filterregel wie Dropdown "Zugeordnete AP"
          if (!isAPInAssignedGroup(wp)) {
            console.log(`[TimesheetForm] AP ${id} uebersprungen (Filter Dropdown/Laufzeit)`);
            return false;
          }
          const planned = plannedHoursPerWP[id] || 0;
          const booked = totalBookedPerWP[id] || 0;
          const remaining = planned - booked;
          console.log(`[TimesheetForm] AP ${id}: planned=${planned.toFixed(0)}h, booked=${booked.toFixed(0)}h, remaining=${remaining.toFixed(0)}h`);
          return true;
        });
        console.log('[TimesheetForm] Vorbelege APs (zugeordnet + offen + Laufzeit ok):', relevantAssigned.length);

        // v7.4.6-5: Sortiere nach ap_code (Versions-Sort) statt ap_number/ap_sub_number,
        // damit dreistellige AP-Nummern wie 3.1.1 korrekt vor 3.4 einsortiert werden.
        const sortedAssigned = [...relevantAssigned].sort((aId, bId) => {
          const a = safeWorkPackages.find(w => w.id === aId);
          const b = safeWorkPackages.find(w => w.id === bId);
          if (!a || !b) return 0;
          return compareApCode(a, b);
        });

        // Erstelle Zeilen fuer zugeordnete APs + eine leere Zeile
        const prefilledRows: APRow[] = sortedAssigned.map(wpId => ({
          workPackageId: wpId,
          entries: {},
        }));
        // Mindestens eine leere Zeile anhaengen fuer weitere APs
        prefilledRows.push({ workPackageId: null, entries: {} });
        
        // Maximal 4 Zeilen initial, oder so viele wie zugeordnet + 1
        while (prefilledRows.length < 4) {
          prefilledRows.push({ workPackageId: null, entries: {} });
        }
        
        for (let i = 0; i < prefilledRows.length && i < newRows.length; i++) {
          newRows[i] = prefilledRows[i];
        }
        // Falls mehr zugeordnete APs als 4, Zeilen erweitern
        if (prefilledRows.length > newRows.length) {
          for (let i = newRows.length; i < prefilledRows.length; i++) {
            newRows.push(prefilledRows[i]);
          }
        }
      }

      console.log('[TimesheetForm] Finale apRows:', newRows.map(r => ({ wpId: r.workPackageId, entries: Object.keys(r.entries).length })));
      setApRows(newRows);
      setNonBillableEntries(newNonBillable);
      setHasChanges(false);
    };

    loadTimeEntries();
    // NEU v7.4.3-20: Completion-Status bei jedem Wechsel laden (war vorher nie aufgerufen!)
    loadCompletionStatus(selectedEmployeeId, selectedProjectId, selectedYear, selectedMonth);
  }, [selectedEmployeeId, selectedProjectId, selectedYear, selectedMonth, workPackages, supabase, assignedWPIds, plannedHoursPerWP, totalBookedPerWP]);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const addApRow = () => {
    setApRows(prev => [...prev, { workPackageId: null, entries: {} }]);
    setHasChanges(true);
  };

  const handleAPSelect = (rowIndex: number, wpId: string) => {
    setApRows(prev => {
      const newRows = [...prev];
      newRows[rowIndex] = { ...newRows[rowIndex], workPackageId: wpId || null };
      return newRows;
    });
    setHasChanges(true);
  };

  const handleCellChange = (rowIndex: number, day: number, value: string) => {
    setApRows(prev => {
      const newRows = [...prev];
      const newEntries = { ...newRows[rowIndex].entries };
      if (value) {
        newEntries[day] = { ...newEntries[day], value };
      } else {
        delete newEntries[day];
      }
      newRows[rowIndex] = { ...newRows[rowIndex], entries: newEntries };
      return newRows;
    });
    setHasChanges(true);
  };

  const handleNonBillableChange = (day: number, value: string) => {
    setNonBillableEntries(prev => {
      const newEntries = { ...prev };
      if (value) {
        newEntries[day] = { ...newEntries[day], value };
      } else {
        delete newEntries[day];
      }
      return newEntries;
    });
    setHasChanges(true);
  };

  // Keyboard Navigation
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    rowIndex: number,
    day: number,
    rowType: 'ap' | 'nonbillable'
  ) => {
    const days = getDaysInMonth(selectedYear, selectedMonth);
    const totalApRows = apRows.length;

    const canEdit = (r: number, d: number, type: 'ap' | 'nonbillable'): boolean => {
      if (isWeekend(selectedYear, selectedMonth, d)) return false;
      if (isHoliday(selectedYear, selectedMonth, d)) return false;
      if (type === 'ap' && !apRows[r]?.workPackageId) return false;
      return true;
    };

    const focusCell = (r: number, d: number, type: 'ap' | 'nonbillable') => {
      const input = document.querySelector(
        `input[data-row="${r}"][data-day="${d}"][data-type="${type}"]`
      ) as HTMLInputElement;
      input?.focus();
      input?.select();
    };

    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault();
        for (let d = day + 1; d <= days; d++) {
          if (canEdit(rowIndex, d, rowType)) {
            focusCell(rowIndex, d, rowType);
            break;
          }
        }
        break;

      case 'ArrowLeft':
        e.preventDefault();
        for (let d = day - 1; d >= 1; d--) {
          if (canEdit(rowIndex, d, rowType)) {
            focusCell(rowIndex, d, rowType);
            break;
          }
        }
        break;

      case 'ArrowDown':
        e.preventDefault();
        if (rowType === 'ap') {
          // v7.4.6-8: Naechste AP-Zeile suchen, die editierbar ist
          let foundNext = false;
          for (let r = rowIndex + 1; r < totalApRows; r++) {
            if (canEdit(r, day, 'ap')) {
              focusCell(r, day, 'ap');
              foundNext = true;
              break;
            }
          }
          // Keine weitere AP-Zeile -> in sonstige Arbeiten springen (falls Wochentag)
          if (!foundNext && canEdit(0, day, 'nonbillable')) {
            focusCell(0, day, 'nonbillable');
          }
        }
        break;

      case 'ArrowUp':
        e.preventDefault();
        if (rowType === 'nonbillable') {
          for (let r = totalApRows - 1; r >= 0; r--) {
            if (canEdit(r, day, 'ap')) {
              focusCell(r, day, 'ap');
              break;
            }
          }
        } else if (rowIndex > 0) {
          if (canEdit(rowIndex - 1, day, 'ap')) {
            focusCell(rowIndex - 1, day, 'ap');
          }
        }
        break;

      case 'Tab':
        e.preventDefault();
        if (e.shiftKey) {
          // Rueckwaerts
          let found = false;
          for (let d = day - 1; d >= 1; d--) {
            if (canEdit(rowIndex, d, rowType)) {
              focusCell(rowIndex, d, rowType);
              found = true;
              break;
            }
          }
          if (!found && rowType === 'nonbillable') {
            for (let r = totalApRows - 1; r >= 0; r--) {
              for (let d = days; d >= 1; d--) {
                if (canEdit(r, d, 'ap')) {
                  focusCell(r, d, 'ap');
                  found = true;
                  break;
                }
              }
              if (found) break;
            }
          } else if (!found && rowIndex > 0) {
            for (let d = days; d >= 1; d--) {
              if (canEdit(rowIndex - 1, d, 'ap')) {
                focusCell(rowIndex - 1, d, 'ap');
                break;
              }
            }
          }
        } else {
          // Vorwaerts
          let found = false;
          for (let d = day + 1; d <= days; d++) {
            if (canEdit(rowIndex, d, rowType)) {
              focusCell(rowIndex, d, rowType);
              found = true;
              break;
            }
          }
          if (!found && rowType === 'ap' && rowIndex < totalApRows - 1) {
            for (let d = 1; d <= days; d++) {
              if (canEdit(rowIndex + 1, d, 'ap')) {
                focusCell(rowIndex + 1, d, 'ap');
                found = true;
                break;
              }
            }
          }
          if (!found) {
            for (let d = 1; d <= days; d++) {
              if (canEdit(0, d, 'nonbillable')) {
                focusCell(0, d, 'nonbillable');
                break;
              }
            }
          }
        }
        break;

      case 'Enter':
        e.preventDefault();
        // Naechstes leeres Feld
        for (let d = day + 1; d <= days; d++) {
          if (canEdit(rowIndex, d, rowType)) {
            const hasValue = rowType === 'ap'
              ? apRows[rowIndex]?.entries[d]?.value
              : nonBillableEntries[d]?.value;
            if (!hasValue) {
              focusCell(rowIndex, d, rowType);
              return;
            }
          }
        }
        break;
    }
  };

  // ============================================================================
  // BERECHNUNGEN
  // ============================================================================

  const calculateRowSum = (row: APRow): number => {
    return Object.values(row.entries).reduce((sum, entry) => {
      if (entry.value && !isAbsenceCode(entry.value)) {
        return sum + parseHours(entry.value);
      }
      return sum;
    }, 0);
  };

  // NEU v7.4.3: Verbleibende Stunden fuer ein AP berechnen
  // = geplante Stunden (Arbeitsplan) minus kumulierte Ist-Stunden (alle Monate)
  // v7.4.6-9: Wenn MA nicht im Arbeitsplan (planned undefined), aber trotzdem
  // Stunden gebucht (Vertretungsfall) -> negative Zahl anzeigen statt "-"
  const calculateRemainingHours = (wpId: string | null): number | null => {
    if (!wpId) return null;
    const planned = plannedHoursPerWP[wpId];
    const booked = totalBookedPerWP[wpId] || 0;
    if (planned === undefined) {
      // MA nicht im Arbeitsplan: nur anzeigen wenn tatsaechlich Stunden gebucht
      if (booked > 0) return -Math.round(booked); // Ueberziehung als negative Zahl
      return null; // Noch keine Stunden -> "-"
    }
    return Math.round(planned - booked);
  };

  const calculateDaySum = (day: number): number => {
    return apRows.reduce((sum, row) => {
      const entry = row.entries[day];
      if (entry?.value && !isAbsenceCode(entry.value)) {
        return sum + parseHours(entry.value);
      }
      return sum;
    }, 0);
  };

  const calculateTotalBillable = (): number => {
    return apRows.reduce((sum, row) => sum + calculateRowSum(row), 0);
  };

  // NEU v7.3.89: Getrennte Summen fuer technische/nicht-technische APs (nur ZIM_DS)
  const calculateTechnicalDaySum = (day: number, technical: boolean): number => {
    return apRows.reduce((sum, row) => {
      if (!row.workPackageId) return sum;
      const wp = safeWorkPackages.find(w => w.id === row.workPackageId);
      const isTech = isTechnicalAP(wp);
      if (isTech !== technical) return sum;
      const entry = row.entries[day];
      if (entry?.value && !isAbsenceCode(entry.value)) {
        return sum + parseHours(entry.value);
      }
      return sum;
    }, 0);
  };

  const calculateTechnicalTotal = (technical: boolean): number => {
    return apRows.reduce((sum, row) => {
      if (!row.workPackageId) return sum;
      const wp = safeWorkPackages.find(w => w.id === row.workPackageId);
      const isTech = isTechnicalAP(wp);
      if (isTech !== technical) return sum;
      return sum + calculateRowSum(row);
    }, 0);
  };

  const calculateNonBillableSum = (): number => {
    return Object.values(nonBillableEntries).reduce((sum, entry) => {
      if (entry.value) {
        return sum + parseHours(entry.value);
      }
      return sum;
    }, 0);
  };

  const getAbsencesForDay = (day: number): { code: string; count: number }[] => {
    const absences: Record<string, number> = {};
    // AP-Zeilen pruefen
    apRows.forEach(row => {
      const entry = row.entries[day];
      if (entry?.value && isAbsenceCode(entry.value)) {
        const code = entry.value.toUpperCase();
        absences[code] = (absences[code] || 0) + 1;
      }
    });
    // v7.4.6-7: Auch nonBillableEntries (sonstige Arbeiten) pruefen
    const nbEntry = nonBillableEntries[day];
    if (nbEntry?.value && isAbsenceCode(nbEntry.value)) {
      const code = nbEntry.value.toUpperCase();
      absences[code] = (absences[code] || 0) + 1;
    }
    return Object.entries(absences).map(([code, count]) => ({ code, count }));
  };

  const calculateAbsenceSums = (): Record<string, number> => {
    const sums: Record<string, number> = { U: 0, K: 0, S: 0 };
    const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);

    for (let day = 1; day <= daysInMonth; day++) {
      // AP-Zeilen
      apRows.forEach(row => {
        const entry = row.entries[day];
        if (entry?.value && isAbsenceCode(entry.value)) {
          const code = entry.value.toUpperCase();
          if (sums[code] !== undefined) {
            sums[code] += companyDailyHours;
          }
        }
      });
      // v7.4.6-7: Auch nonBillableEntries (sonstige Arbeiten) pruefen
      const nbEntry = nonBillableEntries[day];
      if (nbEntry?.value && isAbsenceCode(nbEntry.value)) {
        const code = nbEntry.value.toUpperCase();
        if (sums[code] !== undefined) {
          sums[code] += companyDailyHours;
        }
      }
    }
    return sums;
  };

  // ============================================================================
  // ARBEITSZEITGRENZEN: BERECHNUNGEN (v7.4.6-12)
  // ============================================================================

  const monatsgrenze = MONATSGRENZE_VOLLZEIT * (weeklyHoursAtMonth / 40);
  const gfGrenze     = monatsgrenze * 0.5;
  const istGF        = positionTitle !== null && GF_POSITIONS_LOCAL.includes(positionTitle);

  // Monats-Projektstunden aus aktuellem Form-State (billable, keine Fehlzeiten)
  const calcFormProjektStunden = (): number => {
    return apRows.reduce((sum, row) => {
      if (!row.workPackageId) return sum;
      return sum + Object.values(row.entries).reduce((s, e) => {
        if (!e.value || isAbsenceCode(e.value)) return s;
        return s + parseHours(e.value);
      }, 0);
    }, 0);
  };

  // Tagessumme: Projektstunden + Sonstige (keine Fehlzeiten)
  const calcTagSumme = (day: number): number => {
    let sum = 0;
    apRows.forEach(row => {
      const e = row.entries[day];
      if (e?.value && !isAbsenceCode(e.value)) sum += parseHours(e.value);
    });
    const nb = nonBillableEntries[day];
    if (nb?.value && !isAbsenceCode(nb.value)) sum += parseHours(nb.value);
    return sum;
  };

  // Abgeleitete Warnzustaende (live, kein State noetig)
  const projektStundenMonat  = calcFormProjektStunden();
  const monatUeberschritten  = projektStundenMonat > monatsgrenze;
  const gfUeberschritten     = istGF && projektStundenMonat > gfGrenze;

  // Tages-Verletzung beim Speichern pruefen (alle Tage im Monat)
  const findTagVerletzung = (): number | null => {
    const daysInMon = getDaysInMonth(selectedYear, selectedMonth);
    for (let d = 1; d <= daysInMon; d++) {
      if (calcTagSumme(d) > TAGESGRENZE_HART) return d;
    }
    return null;
  };

  // NEU v7.4.3-9: Monat abschliessen / Completion toggeln
  const handleToggleComplete = async () => {
    if (!selectedEmployeeId || !selectedProjectId) return;
    setLoadingCompletion(true);
    try {
      // v7.4.3-16: Falls ungespeicherte Aenderungen vorhanden, erst speichern
      if (!isCompleted && hasChanges) {
        await handleSave();
      }
      const supabaseClient = createClient();
      if (isCompleted) {
        // Completion entfernen
        await supabaseClient
          .from('v7_timesheet_completions')
          .delete()
          .eq('employee_id', selectedEmployeeId)
          .eq('project_id', selectedProjectId)
          .eq('year', selectedYear)
          .eq('month', selectedMonth);
        setIsCompleted(false);
      } else {
        // Completion setzen
        const { data: { user } } = await supabaseClient.auth.getUser();
        const { data: profile } = await supabaseClient
          .from('v7_user_profiles')
          .select('id')
          .eq('email', user?.email || '')
          .maybeSingle();
        await supabaseClient
          .from('v7_timesheet_completions')
          .upsert({
            employee_id: selectedEmployeeId,
            project_id: selectedProjectId,
            year: selectedYear,
            month: selectedMonth,
            completed_at: new Date().toISOString(),
            completed_by: profile?.id || null,
          }, { onConflict: 'employee_id,project_id,year,month' });
        setIsCompleted(true);
      }
    } catch (err) {
      console.error('Completion error:', err);
    } finally {
      setLoadingCompletion(false);
    }
  };

  const handleSave = async () => {
    if (!selectedEmployeeId) return;

    // ============================================================================
    // ARBEITSZEITGRENZEN-VALIDIERUNG (v7.4.6-12)
    // ============================================================================

    // 1. HARTE Tagesgrenze 9h
    const verletzterTag = findTagVerletzung();
    if (verletzterTag !== null) {
      const tagSumme = calcTagSumme(verletzterTag);
      setError(
        `Max. ${TAGESGRENZE_HART},00 h/Tag (Tag ${verletzterTag}: ${tagSumme.toFixed(2).replace('.', ',')} h) ueberschritten -- nicht zulaessig. Bitte korrigieren.`
      );
      return;
    }

    // 2. HARTE Monatsgrenze
    if (monatUeberschritten) {
      setError(
        `Max. ${monatsgrenze.toFixed(2).replace('.', ',')} h/Monat ueberschritten ` +
        `(${projektStundenMonat.toFixed(2).replace('.', ',')} h erfasst) -- nicht zulaessig. Bitte korrigieren.`
      );
      return;
    }
    // (GF-Warnung ist rein informativ in der UI, kein Speichern-Block)
    setError(null);
    setSuccessMessage(null);

    try {
      const now = new Date().toISOString();
      const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
      const entriesToSave: any[] = [];
      const idsToKeep: string[] = [];

      // AP-Zeilen
      apRows.forEach(row => {
        if (!row.workPackageId) return;

        Object.entries(row.entries).forEach(([dayStr, entry]) => {
          const day = parseInt(dayStr);
          if (!entry.value) return;

          const isAbsence = isAbsenceCode(entry.value);
          const hours = isAbsence ? companyDailyHours : parseHours(entry.value);

          // DB-Constraint: work_package_id und absence_code schliessen sich gegenseitig aus!
          // Bei Fehlzeiten: work_package_id = null, absence_code gesetzt
          // Bei Arbeit: work_package_id gesetzt, absence_code = null
          const record = {
            employee_id: selectedEmployeeId,
            work_package_id: isAbsence ? null : row.workPackageId,
            project_id: selectedProjectId,
            work_date: formatWorkDate(day),
            hours: hours,
            is_billable: !isAbsence,
            absence_code: isAbsence ? entry.value.toUpperCase() : null,
            data_source: 'manual',
            entered_by: currentUserId,
            entered_at: now,
            is_active: true,
            updated_at: now,
          };

          if (entry.id) {
            entriesToSave.push({ id: entry.id, ...record });
            idsToKeep.push(entry.id);
          } else {
            entriesToSave.push(record);
          }
        });
      });

      // Nicht zuschussfaehig
      Object.entries(nonBillableEntries).forEach(([dayStr, entry]) => {
        const day = parseInt(dayStr);
        if (!entry.value || parseHours(entry.value) === 0) return;

        const record = {
          employee_id: selectedEmployeeId,
          work_package_id: null,
          project_id: selectedProjectId,
          work_date: formatWorkDate(day),
          hours: parseHours(entry.value),
          is_billable: false,
          absence_code: null,
          data_source: 'manual',
          entered_by: currentUserId,
          entered_at: now,
          is_active: true,
          updated_at: now,
        };

        if (entry.id) {
          entriesToSave.push({ id: entry.id, ...record });
          idsToKeep.push(entry.id);
        } else {
          entriesToSave.push(record);
        }
      });

      // Alte Eintraege deaktivieren
      const startDate = formatWorkDate(1);
      const endDate = formatWorkDate(daysInMonth);

      const { data: existingEntries } = await supabase
        .from('v7_timesheets')
        .select('id')
        .eq('employee_id', selectedEmployeeId)
        .eq('project_id', selectedProjectId)
        .gte('work_date', startDate)
        .lte('work_date', endDate)
        .eq('is_active', true);

      const idsToDeactivate = existingEntries
        ?.filter(e => !idsToKeep.includes(e.id))
        .map(e => e.id) || [];

      if (idsToDeactivate.length > 0) {
        await supabase
          .from('v7_timesheets')
          .update({ is_active: false, updated_at: now })
          .in('id', idsToDeactivate);
      }

      // Speichern
      for (const entry of entriesToSave) {
        if (entry.id) {
          await supabase.from('v7_timesheets').update(entry).eq('id', entry.id);
        } else {
          await supabase.from('v7_timesheets').insert(entry);
        }
      }

      setSuccessMessage(`Stundennachweis fuer ${MONTH_NAMES[selectedMonth - 1]} ${selectedYear} gespeichert!`);
      setHasChanges(false);
      setTimeout(() => setSuccessMessage(null), 4000);

      // NEU v7.4.3-9: Completion zuruecksetzen wenn Aenderungen gespeichert wurden
      if (isCompleted) {
        const supabaseCl = createClient();
        await supabaseCl
          .from('v7_timesheet_completions')
          .delete()
          .eq('employee_id', selectedEmployeeId)
          .eq('project_id', selectedProjectId)
          .eq('year', selectedYear)
          .eq('month', selectedMonth);
        setIsCompleted(false);
      }

      // NEU v7.4.3-2: offen-Spalte sofort aktualisieren nach Speichern
      await reloadBookedHours();

    } catch (err: any) {
      console.error('Speichern fehlgeschlagen:', err);
      setError('Fehler beim Speichern: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // ============================================================================
  // PDF EXPORT
  // ============================================================================

  // Ersetzt select-Elemente vor dem Drucken durch lesbare span-Texte.
  // Gibt Restore-Funktion zurueck die alles rueckgaengig macht.
  const replaceSelectsForPrint = (): (() => void) => {
    const container = printRef.current;
    if (!container) return () => {};
    const replacements: Array<{ select: HTMLSelectElement; span: HTMLSpanElement }> = [];
    container.querySelectorAll('select').forEach((select) => {
      const selectedOption = select.options[select.selectedIndex];
      const text = selectedOption ? selectedOption.text.trim() : '';
      const span = document.createElement('span');
      span.textContent = (text === '-' || text === '') ? '' : text;
      span.style.cssText = 'display:block;width:100%;text-align:center;font-size:inherit;padding:2px;';
      select.parentNode?.insertBefore(span, select);
      select.style.display = 'none';
      replacements.push({ select, span });
    });
    return () => {
      replacements.forEach(({ select, span }) => {
        select.style.display = '';
        span.parentNode?.removeChild(span);
      });
    };
  };

  const handlePrint = () => {
    const empName = selectedEmployee?.display_name?.replace(/\s+/g, '_') || 'Mitarbeiter';
    const projectRef = selectedProject?.funding_reference?.replace(/[\/\s]+/g, '_') || selectedProject?.short_name || 'Projekt';
    const monthYear = `${String(selectedMonth).padStart(2, '0')}_${selectedYear}`;
    const fileName = `Stundennachweis_${empName}_${projectRef}_${monthYear}`;
    const prevTitle = document.title;
    document.title = fileName;
    const restore = replaceSelectsForPrint();
    window.print();
    const cleanup = () => { restore(); document.title = prevTitle; };
    window.onafterprint = cleanup;
    setTimeout(cleanup, 3000);
  };

  const handleExportPDF = () => {
    handlePrint();
  };

  // ============================================================================
  // NEU v7.4.3-21: TIMESHEET-NOTIZEN (Interne Rueckfragen)
  // ============================================================================

  const handleOpenNoteModal = () => {
    setNoteEditing(noteText);
    setShowNoteModal(true);
  };

  const handleSaveNote = async () => {
    if (!selectedEmployeeId || !selectedProjectId || noteEditing.trim() === '') return;
    setNoteSaving(true);
    try {
      const supabaseClient = createClient();
      const { data: { user } } = await supabaseClient.auth.getUser();
      const { data: profile } = await supabaseClient
        .from('v7_user_profiles')
        .select('id, display_name')
        .eq('email', user?.email || '')
        .maybeSingle();
      const userId = profile?.id || null;

      if (noteId) {
        // Bestehende Notiz aktualisieren (kein Loeschen mehr)
        await supabaseClient
          .from('v7_timesheet_notes')
          .update({
            note_text: noteEditing.trim(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', noteId);
        setNoteText(noteEditing.trim());
      } else {
        // Neue Notiz erstellen
        const { data: newNote } = await supabaseClient
          .from('v7_timesheet_notes')
          .insert({
            employee_id: selectedEmployeeId,
            project_id: selectedProjectId,
            year: selectedYear,
            month: selectedMonth,
            note_text: noteEditing.trim(),
            status: 'offen',
            created_by: userId,
          })
          .select('id, created_at')
          .single();
        if (newNote) {
          setNoteId(newNote.id);
          setNoteText(noteEditing.trim());
          setNoteStatus('offen');
          setNoteCreatedBy(profile?.display_name || '');
          setNoteCreatedAt(newNote.created_at || '');
        }
      }
      setShowNoteModal(false);
    } catch (err) {
      console.error('[TimesheetForm] Notiz speichern Fehler:', err);
    } finally {
      setNoteSaving(false);
    }
  };

  const handleToggleNoteStatus = async () => {
    if (!noteId) return;
    setNoteSaving(true);
    try {
      const supabaseClient = createClient();
      const newStatus = noteStatus === 'offen' ? 'erledigt' : 'offen';

      const updateData: Record<string, unknown> = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };

      if (newStatus === 'erledigt') {
        const { data: { user } } = await supabaseClient.auth.getUser();
        const { data: profile } = await supabaseClient
          .from('v7_user_profiles')
          .select('id, display_name')
          .eq('email', user?.email || '')
          .maybeSingle();
        const now = new Date().toISOString();
        updateData.resolved_at = now;
        updateData.resolved_by = profile?.id || null;
        // v7.4.3-22: Erlediger-Info sofort in State setzen
        setNoteResolvedBy(profile?.display_name || '');
        setNoteResolvedAt(now);
      } else {
        updateData.resolved_at = null;
        updateData.resolved_by = null;
        setNoteResolvedBy('');
        setNoteResolvedAt('');
      }

      await supabaseClient
        .from('v7_timesheet_notes')
        .update(updateData)
        .eq('id', noteId);
      setNoteStatus(newStatus);
    } catch (err) {
      console.error('[TimesheetForm] Notiz-Status Fehler:', err);
    } finally {
      setNoteSaving(false);
    }
  };

  // ============================================================================
  // NAVIGATION
  // ============================================================================

  const goToPreviousMonth = () => {
    checkUnsavedChanges(() => {
      let newMonth = selectedMonth;
      let newYear = selectedYear;
      if (newMonth === 1) {
        newMonth = 12;
        newYear = newYear - 1;
      } else {
        newMonth = newMonth - 1;
      }
      // NEU v7.4.3-20: Nur navigieren wenn im erlaubten Bereich
      if (isMonthAllowed(newYear, newMonth)) {
        setSelectedMonth(newMonth);
        setSelectedYear(newYear);
      }
    });
  };

  const goToNextMonth = () => {
    checkUnsavedChanges(() => {
      let newMonth = selectedMonth;
      let newYear = selectedYear;
      if (newMonth === 12) {
        newMonth = 1;
        newYear = newYear + 1;
      } else {
        newMonth = newMonth + 1;
      }
      // NEU v7.4.3-20: Nur navigieren wenn im erlaubten Bereich
      if (isMonthAllowed(newYear, newMonth)) {
        setSelectedMonth(newMonth);
        setSelectedYear(newYear);
      }
    });
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
  const absenceSums = calculateAbsenceSums();

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white">
      {/* Header */}
      <header style={{ backgroundColor: colors.primary }} className="shadow-sm print:hidden">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-3">
            <div className="flex items-center gap-4">
              <button
                onClick={() => checkUnsavedChanges(onBack)}
                className="text-white/80 hover:text-white flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Zurueck
              </button>
              <div className="bg-white rounded-lg px-3 py-1 text-sm font-bold" style={{ color: colors.primary }}>
                PZE
              </div>
              <h1 className="text-lg font-semibold text-white">Stundennachweis</h1>
              {portal === 'berater' && (
                <span className="text-white/70 text-sm">| {company.name}</span>
              )}
            </div>

            <div className="flex items-center gap-3">
              {hasChanges && (
                <span className="text-yellow-200 text-sm flex items-center gap-1">
                  <span className="w-2 h-2 bg-yellow-300 rounded-full animate-pulse"></span>
                  Ungespeichert
                </span>
              )}
              {/* NEU v7.4.3-9: Monat abschliessen */}
              <button
                onClick={handleToggleComplete}
                disabled={loadingCompletion || !selectedEmployeeId || !selectedProjectId}
                title={isCompleted ? 'Monat ist abgeschlossen - klicken zum Aufheben' : 'Monat als vollstaendig erfasst markieren'}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  isCompleted
                    ? 'bg-green-500 text-white hover:bg-green-600'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                {loadingCompletion ? (
                  <span className="w-3 h-3 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                ) : isCompleted ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                {isCompleted ? 'Abgeschlossen' : 'Monat abschliessen'}
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !hasChanges}
                className={`px-4 py-1.5 rounded text-sm font-medium ${
                  hasChanges
                    ? 'bg-white text-gray-800 hover:bg-gray-100'
                    : 'bg-white/50 text-white/70 cursor-not-allowed'
                }`}
              >
                {saving ? '...' : 'Speichern'}
              </button>
              <button
                onClick={handleExportPDF}
                className="px-3 py-1.5 bg-white/20 text-white rounded hover:bg-white/30 text-sm"
              >
                PDF Export
              </button>
              <button
                onClick={handlePrint}
                className="px-3 py-1.5 bg-white/20 text-white rounded hover:bg-white/30 text-sm"
              >
                Drucken
              </button>
              <span className="text-white text-sm">{currentUserDisplayName}</span>
            </div>
          </div>
        </div>
      </header>

      {/* ================================================================
          ARBEITSZEITGRENZEN HINWEISE (v7.4.6-12) - nur bei Verletzung
          ================================================================ */}
      {(monatUeberschritten || gfUeberschritten) && (
        <div className="print:hidden">
          {monatUeberschritten && (
            <div className="bg-red-50 border-b border-red-200 px-4 py-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
              <span className="text-red-700 text-sm font-medium">
                Max. {monatsgrenze.toFixed(2).replace('.', ',')} h/Monat ueberschritten
                ({projektStundenMonat.toFixed(2).replace('.', ',')} h erfasst) -- nicht zulaessig, Speichern gesperrt
              </span>
            </div>
          )}
          {gfUeberschritten && !monatUeberschritten && (
            <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
              <span className="text-amber-700 text-sm font-medium">
                GF-Anteil {projektStundenMonat.toFixed(2).replace('.', ',')} h &gt; 50% Monatsarbeitszeit
                ({gfGrenze.toFixed(2).replace('.', ',')} h) -- Foerderrisiko beachten
              </span>
            </div>
          )}
        </div>
      )}

      {/* Steuerung */}
      <div className="bg-white border-b shadow-sm print:hidden">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex flex-wrap items-center gap-4">
            {/* Mitarbeiter */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-600">Mitarbeiter:</label>
              <select
                value={selectedEmployeeId}
                onChange={(e) => {
                  const newValue = e.target.value;
                  checkUnsavedChanges(() => setSelectedEmployeeId(newValue));
                }}
                disabled={!isAdmin && sortedEmployees.length <= 1}
                className="border rounded px-2 py-1 text-sm"
              >
                {sortedEmployees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.display_name}</option>
                ))}
              </select>
            </div>

            {/* Projekt */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-600">Projekt:</label>
              <select
                value={selectedProjectId}
                onChange={(e) => {
                  const newValue = e.target.value;
                  checkUnsavedChanges(() => setSelectedProjectId(newValue));
                }}
                className="border rounded px-2 py-1 text-sm min-w-[200px]"
              >
                {safeProjects.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.short_name || p.name} {p.funding_reference ? `(${p.funding_reference})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Monat */}
            <div className="flex items-center gap-1">
              <button onClick={goToPreviousMonth} className="p-1 hover:bg-gray-100 rounded">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <select
                value={selectedMonth}
                onChange={(e) => {
                  const newValue = parseInt(e.target.value);
                  checkUnsavedChanges(() => setSelectedMonth(newValue));
                }}
                className="border rounded px-2 py-1 text-sm"
              >
                {allowedMonths.map(m => (
                  <option key={m.month} value={m.month}>{m.name}</option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => {
                  const newValue = parseInt(e.target.value);
                  checkUnsavedChanges(() => setSelectedYear(newValue));
                }}
                className="border rounded px-2 py-1 text-sm"
              >
                {allowedYears.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <button onClick={goToNextMonth} className="p-1 hover:bg-gray-100 rounded">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* NEU v7.4.3-21: Notiz-Icon (nur fuer Admin/PL/Berater) */}
            {isAdmin && (
              <button
                onClick={handleOpenNoteModal}
                className="relative p-1.5 rounded hover:bg-gray-100"
                title={noteStatus === 'offen' ? 'Offene Rueckfrage vorhanden' : noteId ? 'Notiz vorhanden (erledigt)' : 'Notiz hinzufuegen'}
              >
                <svg className={`w-5 h-5 ${noteStatus === 'offen' ? 'text-orange-500' : noteId ? 'text-gray-400' : 'text-gray-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
                {noteStatus === 'offen' && (
                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-orange-500 rounded-full"></span>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Meldungen */}
      {error && (
        <div className="max-w-full mx-auto px-4 mt-2 print:hidden">
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">{error}</div>
        </div>
      )}
      {successMessage && (
        <div className="max-w-full mx-auto px-4 mt-2 print:hidden">
          <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded text-sm">{successMessage}</div>
        </div>
      )}

      {/* STUNDENNACHWEIS-FORMULAR */}
      <div ref={printRef} className="max-w-full mx-auto p-4 print:p-0 print:m-0">
        <div className="bg-white shadow-lg print:shadow-none overflow-x-auto">
          {/* Header-Bereich */}
          <table className="w-full border-collapse text-xs" style={{ minWidth: '1000px', tableLayout: 'fixed' }}>
            <tbody>
              <tr>
                <td className="border p-2 print:p-1.5" style={{ width: '50%' }}>
                  <div className="text-[10px] print:text-[8px] text-gray-500">Zuwendungsempfaenger (Firmenstempel)</div>
                  <div className="font-bold text-lg print:text-base text-center py-2">{company?.name}</div>
                </td>
                <td className="border p-2 print:p-1.5 text-center" style={{ width: '50%', backgroundColor: HEADER_ORANGE }}>
                  <div className="font-bold text-xl print:text-lg">Stundennachweis</div>
                  <div className="text-[10px] print:text-[8px] text-gray-600 mt-1">
                    Der Stundennachweis verbleibt beim Zuwendungsempfaenger und ist nur nach Aufforderung vorzulegen.
                  </div>
                </td>
              </tr>
              <tr>
                <td className="border p-2 print:p-1">
                  <div className="text-[10px] print:text-[8px] text-gray-500">Vorhabenthema</div>
                  <div className="font-semibold text-base print:text-sm text-center py-1">{selectedProject?.name || '-'}</div>
                </td>
                <td className="border p-2 print:p-1" style={{ backgroundColor: HEADER_ORANGE }}>
                  <div className="text-[10px] print:text-[8px] text-gray-500">Foerderkennzeichen</div>
                  <div className="font-bold text-lg print:text-base text-center py-1">{selectedProject?.funding_reference || '-'}</div>
                </td>
              </tr>
              <tr>
                <td className="border p-2 print:p-1">
                  <div className="text-[10px] print:text-[8px] text-gray-500">Monat</div>
                  <div className="font-semibold text-base print:text-sm text-center py-1">{formatDisplayDate()}</div>
                </td>
                <td className="border p-2 print:p-1">
                  <div className="text-[10px] print:text-[8px] text-gray-500">Mitarbeiter(in): [Name, Vorname]</div>
                  <div className="font-semibold text-base print:text-sm text-center py-1">
                    {selectedEmployee ? `${selectedEmployee.last_name || ''}, ${selectedEmployee.first_name || ''}`.trim() || selectedEmployee.display_name : '-'}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Hinweistext */}
          <div className="px-2 py-1 print:px-1 print:py-0.5 text-[8px] print:text-[6px] text-gray-600 border-x">
            Die zu Lasten des Vorhabens abzurechnenden Personalstunden sind taeglich eigenhaendig von der betreffenden Person zu erfassen. Nur die produktiven, fuer das Vorhaben geleisteten Stunden sind zuwendungsfaehig.
          </div>

          {/* Kalender-Tabelle */}
          <table className="w-full border-collapse text-xs" style={{ minWidth: '1000px' }}>
            <thead>
              <tr style={{ backgroundColor: HEADER_ORANGE }}>
                <th className="border p-1 text-left" style={{ width: '30px' }}>lfd. Nr.</th>
                <th className="border p-1 text-left" style={{ width: '55px' }}>AP</th>
                <th className="border p-1 text-left" style={{ width: '180px' }}>Kurzbezeichnung des Arbeitspakets</th>
                {isDurchfuehrbarkeitsstudie && (
                  <th className="border p-1 text-center" style={{ width: '28px' }}>T/NT</th>
                )}
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                  const weekend = isWeekend(selectedYear, selectedMonth, day);
                  const holiday = isHoliday(selectedYear, selectedMonth, day);
                  return (
                    <th
                      key={day}
                      className={`border p-0 text-center ${weekend ? 'bg-gray-300' : holiday ? 'bg-orange-200' : ''}`}
                      style={{ width: '24px', minWidth: '24px' }}
                      title={holiday || undefined}
                    >
                      {day.toString().padStart(2, '0')}
                    </th>
                  );
                })}
                <th className="border p-1 text-center" style={{ width: '25px' }}>S</th>
                <th className="border p-1 text-center print:hidden" style={{ width: '25px', backgroundColor: '#E8F5E9' }}>+/-</th>
              </tr>
            </thead>
            <tbody>
              {/* Abschnitt 1: Foerderbare Arbeiten */}
              <tr>
                <td className="border p-1 font-semibold" colSpan={(isDurchfuehrbarkeitsstudie ? 4 : 3) + daysInMonth + 2} style={{ backgroundColor: '#FFF9E6' }}>
                  1. foerderbare Projektarbeiten (1)
                </td>
              </tr>

              {/* AP-Zeilen */}
              {apRows.map((row, rowIndex) => {
                const selectedWP = safeWorkPackages.find(wp => wp.id === row.workPackageId);
                return (
                  <tr key={rowIndex}>
                    <td className="border p-1 text-center">{rowIndex + 1}.</td>
                    <td className="border p-0">
                      <select
                        value={row.workPackageId || ''}
                        onChange={(e) => handleAPSelect(rowIndex, e.target.value)}
                        className="w-full h-full p-1 text-xs border-0 bg-transparent print:appearance-none text-center"
                      >
                        <option value="">-</option>
                        {/* v7.4.6-2: AP-Gruppen ueber Helper-Funktionen */}
                        {availableWorkPackages.some(wp => isAPInAssignedGroup(wp)) && (
                          <optgroup label="Zugeordnete AP">
                            {availableWorkPackages
                              .filter(wp => isAPInAssignedGroup(wp))
                              .sort(compareApCode)
                              .map(wp => {
                                const apDisplay = wp.ap_code
                                  ? wp.ap_code.replace(/^AP/i, '')
                                  : `${wp.ap_number}${wp.ap_sub_number ? `.${wp.ap_sub_number}` : ''}`;
                                return (
                                  <option key={wp.id} value={wp.id}>
                                    {apDisplay}
                                  </option>
                                );
                              })}
                          </optgroup>
                        )}
                        {availableWorkPackages.some(wp => isAPInWeitereGroup(wp)) && (
                          <optgroup label="Weitere AP">
                            {availableWorkPackages
                              .filter(wp => isAPInWeitereGroup(wp))
                              .sort(compareApCode)
                              .map(wp => {
                                const apDisplay = wp.ap_code
                                  ? wp.ap_code.replace(/^AP/i, '')
                                  : `${wp.ap_number}${wp.ap_sub_number ? `.${wp.ap_sub_number}` : ''}`;
                                return (
                                  <option key={wp.id} value={wp.id}>
                                    {apDisplay}
                                  </option>
                                );
                              })}
                          </optgroup>
                        )}
                      </select>
                    </td>
                    <td className="border p-1 text-[10px] leading-tight" style={{ maxWidth: '180px' }}>
                      <div className="line-clamp-2" title={selectedWP?.name}>
                        {selectedWP?.name || ''}
                      </div>
                    </td>
                    {isDurchfuehrbarkeitsstudie && (
                      <td className="border p-1 text-center">
                        {selectedWP ? (
                          isTechnicalAP(selectedWP) ? (
                            <span className="text-green-700 font-bold text-xs">T</span>
                          ) : (
                            <span className="text-blue-700 font-bold text-xs">NT</span>
                          )
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                    )}
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                      const weekend = isWeekend(selectedYear, selectedMonth, day);
                      const holiday = isHoliday(selectedYear, selectedMonth, day);
                      const entry = row.entries[day];
                      const isAbsence = entry?.value && isAbsenceCode(entry.value);

                      return (
                        <td
                          key={day}
                          className={`border p-0 text-center ${
                            weekend ? 'bg-gray-200' : holiday ? 'bg-orange-100' : ''
                          }`}
                        >
                          <input
                            type="text"
                            data-row={rowIndex}
                            data-day={day}
                            data-type="ap"
                            value={entry?.value || ''}
                            onChange={(e) => handleCellChange(rowIndex, day, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, rowIndex, day, 'ap')}
                            disabled={weekend || !!holiday || !row.workPackageId}
                            maxLength={4}
                            className={`w-full h-8 text-center text-xs border-0 ${
                              weekend || !!holiday ? 'bg-transparent cursor-not-allowed' :
                              !row.workPackageId ? 'bg-gray-50 cursor-not-allowed' :
                              isAbsence ? 'bg-blue-100 font-bold text-blue-700' : 'bg-white'
                            } focus:ring-1 ${colors.ring} print:bg-transparent`}
                            style={{ minWidth: '24px' }}
                          />
                        </td>
                      );
                    })}
                    <td className="border p-1 text-center font-semibold bg-gray-50">
                      {calculateRowSum(row) > 0 ? calculateRowSum(row).toFixed(2) : '0,00'}
                    </td>
                    {/* NEU v7.4.3: offen-Spalte */}
                    <td className="border p-1 text-center text-xs print:hidden" style={{ backgroundColor: '#F1F8E9' }}>
                      {(() => {
                        const remaining = calculateRemainingHours(row.workPackageId);
                        if (remaining === null) return <span className="text-gray-300">-</span>;
                        if (remaining > 0) return <span className="text-green-700 font-semibold">{remaining}</span>;
                        if (remaining < 0) return <span className="text-red-600 font-bold">{remaining}</span>;
                        return <span className="text-gray-500">0</span>;
                      })()}
                    </td>
                  </tr>
                );
              })}

              {/* Button zum Hinzufuegen */}
              {allRowsFilled && availableWorkPackages.length > apRows.length && (
                <tr className="print:hidden">
                  <td colSpan={(isDurchfuehrbarkeitsstudie ? 4 : 3) + daysInMonth + 2} className="border p-1 text-center">
                    <button
                      onClick={addApRow}
                      className={`text-xs ${colors.text} hover:underline`}
                    >
                      + Weitere AP-Zeile hinzufuegen
                    </button>
                  </td>
                </tr>
              )}

              {/* Summe foerderbare Stunden */}
              {isDurchfuehrbarkeitsstudie ? (
                <>
                  {/* Summe technische APs */}
                  <tr className="font-semibold" style={{ backgroundColor: '#E8F5E9' }}>
                    <td className="border p-1 text-[10px]" colSpan={4}>Summe foerderbare Stunden - technisch (T)</td>
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                      const daySum = calculateTechnicalDaySum(day, true);
                      return (
                        <td key={day} className="border p-1 text-center text-[10px]">
                          {daySum > 0 ? daySum.toFixed(2) : ''}
                        </td>
                      );
                    })}
                    <td className="border p-1 text-center bg-green-200">
                      {calculateTechnicalTotal(true).toFixed(2)}
                    </td>
                    <td className="border p-1 bg-green-50 print:hidden"></td>
                  </tr>
                  {/* Summe nicht-technische APs */}
                  <tr className="font-semibold" style={{ backgroundColor: '#E3F2FD' }}>
                    <td className="border p-1 text-[10px]" colSpan={4}>Summe foerderbare Stunden - nicht-technisch (NT)</td>
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                      const daySum = calculateTechnicalDaySum(day, false);
                      return (
                        <td key={day} className="border p-1 text-center text-[10px]">
                          {daySum > 0 ? daySum.toFixed(2) : ''}
                        </td>
                      );
                    })}
                    <td className="border p-1 text-center bg-blue-200">
                      {calculateTechnicalTotal(false).toFixed(2)}
                    </td>
                    <td className="border p-1 bg-blue-50 print:hidden"></td>
                  </tr>
                  {/* Gesamtsumme */}
                  <tr className="font-bold" style={{ backgroundColor: '#C8E6C9' }}>
                    <td className="border p-1" colSpan={4}>Summe foerderbare Stunden gesamt (2)</td>
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                      const daySum = calculateDaySum(day);
                      const tagZuViel = daySum > TAGESGRENZE_HART;
                      return (
                        <td key={day} className={`border p-1 text-center text-[10px] ${tagZuViel ? 'bg-red-400 text-white font-bold' : ''}`}>
                          {daySum > 0 ? daySum.toFixed(2) : ''}
                        </td>
                      );
                    })}
                    <td className={`border p-1 text-center ${monatUeberschritten ? 'bg-red-500 text-white' : 'bg-green-300'}`}>
                      {calculateTotalBillable().toFixed(2)}
                    </td>
                    <td className="border p-1 bg-green-100 print:hidden"></td>
                  </tr>
                </>
              ) : (
                <tr className="font-semibold" style={{ backgroundColor: '#E8F5E9' }}>
                  <td className="border p-1" colSpan={3}>Summe der foerderbaren Stunden (2)</td>
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                    const daySum = calculateDaySum(day);
                    const tagZuViel = daySum > TAGESGRENZE_HART;
                    return (
                      <td key={day} className={`border p-1 text-center text-[10px] ${tagZuViel ? 'bg-red-400 text-white font-bold' : ''}`}>
                        {daySum > 0 ? daySum.toFixed(2) : '0,00'}
                      </td>
                    );
                  })}
                  <td className={`border p-1 text-center ${monatUeberschritten ? 'bg-red-500 text-white' : 'bg-green-200'}`}>
                    {calculateTotalBillable().toFixed(2)}
                  </td>
                  <td className="border p-1 bg-green-50 print:hidden"></td>
                </tr>
              )}

              {/* Abschnitt 2: Nicht zuschussfaehig */}
              <tr>
                <td className="border p-1 font-semibold" colSpan={(isDurchfuehrbarkeitsstudie ? 4 : 3) + daysInMonth + 2} style={{ backgroundColor: '#FFF3E0' }}>
                  2. Nicht zuschussfaehige Arbeiten
                </td>
              </tr>
              <tr>
                <td className="border p-1" colSpan={isDurchfuehrbarkeitsstudie ? 4 : 3}>sonstige Arbeiten</td>
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                  const weekend = isWeekend(selectedYear, selectedMonth, day);
                  const holiday = isHoliday(selectedYear, selectedMonth, day);
                  const entry = nonBillableEntries[day];

                  return (
                    <td key={day} className={`border p-0 text-center ${weekend ? 'bg-gray-200' : holiday ? 'bg-orange-100' : ''}`}>
                      <input
                        type="text"
                        data-row="0"
                        data-day={day}
                        data-type="nonbillable"
                        value={entry?.value || ''}
                        onChange={(e) => handleNonBillableChange(day, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, 0, day, 'nonbillable')}
                        disabled={weekend || !!holiday}
                        maxLength={4}
                        className={`w-full h-6 text-center text-xs border-0 ${
                          weekend || !!holiday ? 'bg-transparent cursor-not-allowed' : 'bg-white'
                        } focus:ring-1 focus:ring-yellow-500 print:bg-transparent`}
                      />
                    </td>
                  );
                })}
                <td className="border p-1 text-center font-semibold bg-yellow-50">
                  {calculateNonBillableSum().toFixed(2)}
                </td>
                <td className="border p-1 bg-yellow-50 print:hidden"></td>
              </tr>

              {/* Abschnitt 3: Fehlzeiten */}
              <tr>
                <td className="border p-1 font-semibold" colSpan={(isDurchfuehrbarkeitsstudie ? 4 : 3) + daysInMonth + 2} style={{ backgroundColor: '#E3F2FD' }}>
                  3. Fehlzeiten
                </td>
              </tr>
              {/* Urlaub */}
              <tr>
                <td className="border p-1 text-[10px]" colSpan={isDurchfuehrbarkeitsstudie ? 4 : 3}>Urlaub (nur bezahlten Urlaub auffuehren)</td>
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                  const absences = getAbsencesForDay(day);
                  const hasU = absences.some(a => a.code === 'U');
                  return (
                    <td key={day} className="border p-1 text-center text-[10px] bg-blue-50">
                      {hasU ? companyDailyHours.toFixed(1).replace('.', ',') : ''}
                    </td>
                  );
                })}
                <td className="border p-1 text-center font-semibold bg-blue-100">
                  {absenceSums.U > 0 ? absenceSums.U.toFixed(2) : '0,00'}
                </td>
                <td className="border p-1 bg-blue-50 print:hidden"></td>
              </tr>
              {/* Krankheit */}
              <tr>
                <td className="border p-1 text-[10px]" colSpan={isDurchfuehrbarkeitsstudie ? 4 : 3}>Krankheit (nur bei Lohn- und Gehaltsfortzahlung)</td>
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                  const absences = getAbsencesForDay(day);
                  const hasK = absences.some(a => a.code === 'K');
                  return (
                    <td key={day} className="border p-1 text-center text-[10px] bg-red-50">
                      {hasK ? companyDailyHours.toFixed(1).replace('.', ',') : ''}
                    </td>
                  );
                })}
                <td className="border p-1 text-center font-semibold bg-red-100">
                  {absenceSums.K > 0 ? absenceSums.K.toFixed(2) : '0,00'}
                </td>
                <td className="border p-1 bg-red-50 print:hidden"></td>
              </tr>
              {/* Sonstige */}
              <tr>
                <td className="border p-1 text-[10px]" colSpan={isDurchfuehrbarkeitsstudie ? 4 : 3}>Sonstige bezahlte Ausfallzeiten (z. B. Feiertage)</td>
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                  const absences = getAbsencesForDay(day);
                  const hasS = absences.some(a => a.code === 'S');
                  const holiday = isHoliday(selectedYear, selectedMonth, day);
                  const weekend = isWeekend(selectedYear, selectedMonth, day);
                  return (
                    <td key={day} className={`border p-1 text-center text-[10px] ${holiday && !weekend ? 'bg-orange-100' : 'bg-purple-50'}`}>
                      {/* v7.4.6-10: Feiertag auf Wochenende -> keine Fehlstunden anzeigen */}
                      {(hasS || (holiday && !weekend)) ? companyDailyHours.toFixed(1).replace('.', ',') : ''}
                    </td>
                  );
                })}
                <td className="border p-1 text-center font-semibold bg-purple-100">
                  {(() => {
                    // S-Codes aus apRows + automatische Feiertage summieren
                    let holidaySum = 0;
                    for (let d = 1; d <= daysInMonth; d++) {
                      const isWeekendDay = isWeekend(selectedYear, selectedMonth, d);
                      const holidayName = isHoliday(selectedYear, selectedMonth, d);
                      const absences = getAbsencesForDay(d);
                      const hasS = absences.some(a => a.code === 'S');
                      if ((hasS || holidayName) && !isWeekendDay) {
                        holidaySum += companyDailyHours;
                      }
                    }
                    return holidaySum > 0 ? holidaySum.toFixed(2) : '0,00';
                  })()}
                </td>
                <td className="border p-1 bg-purple-50 print:hidden"></td>
              </tr>
            </tbody>
          </table>

          {/* Hinweistexte */}
          <div className="px-2 py-1 print:px-1 print:py-0.5 text-[7px] print:text-[5px] text-gray-600 border-x border-b">
            <p>
              <strong>(1)</strong> Die geleisteten Projektbearbeitungsstunden sind fuer den gesamten Bewilligungszeitraum <strong>eigenhaendig und zeitnah</strong>, d. h. mindestens innerhalb einer Woche zu erfassen. Die Angaben sind subventionserheblich im Sinne des Paragraph 264 Strafgesetzbuch.
            </p>
            <p>
              <strong>(2)</strong> Foerderbar pro Monat sind die tatsaechlich fuer das Projekt geleisteten Stunden, jedoch nicht mehr als arbeitsvertraglich, betrieblich oder tariflich vereinbart, <strong>maximal in Hoehe von 52 (Wochen) / 12 (Monate) x Wochenarbeitszeit. Ueberstunden sind nicht foerderbar.</strong>
            </p>
          </div>

          {/* Unterschriften */}
          <div className="border-x border-b flex">
            <div className="flex-1 p-3 print:p-2 border-r border-gray-400">
              <div className="text-[9px] print:text-[7px] text-gray-500 mb-8 print:mb-6">Datum / Unterschrift des Mitarbeiters</div>
              <input
                type="text"
                value={signatureDate}
                onChange={(e) => setSignatureDate(e.target.value)}
                className={`text-sm print:text-xs border-b border-gray-300 print:border-gray-400 bg-transparent w-28 focus:outline-none ${colors.ring.replace('focus:ring', 'focus:border').replace('-500', '-600')}`}
              />
            </div>
            <div className="flex-1 p-3 print:p-2">
              <div className="text-[9px] print:text-[7px] text-gray-500 mb-8 print:mb-6">Datum / Unterschrift Geschaeftsfuehrer bzw. FuE-Verantwortlicher</div>
              <input
                type="text"
                value={signatureDate}
                onChange={(e) => setSignatureDate(e.target.value)}
                className={`text-sm print:text-xs border-b border-gray-300 print:border-gray-400 bg-transparent w-28 focus:outline-none ${colors.ring.replace('focus:ring', 'focus:border').replace('-500', '-600')}`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t mt-4 print:hidden">
        <div className="max-w-full mx-auto px-4 py-3">
          <p className="text-center text-xs text-gray-500">
            PZE v7.4.3 | {portal === 'berater' ? 'Berater-Portal' : 'Firmen-Portal'} | {company.name}
          </p>
        </div>
      </footer>

      {/* NEU v7.4.3-22: Notiz-Modal (ueberarbeitet) */}
      {showNoteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 print:hidden">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-lg mx-4 w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Interne Notiz
              </h3>
              <button onClick={() => setShowNoteModal(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="text-sm text-gray-500 mb-3">
              {selectedEmployee?.display_name} | {selectedProject?.short_name || selectedProject?.name} | {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
            </div>

            {/* Ersteller-Info */}
            {noteId && noteCreatedBy && (
              <div className="text-xs text-gray-400 mb-2">
                Erstellt von {noteCreatedBy}
                {noteCreatedAt && ` am ${new Date(noteCreatedAt).toLocaleDateString('de-DE')}`}
              </div>
            )}

            <textarea
              value={noteEditing}
              onChange={(e) => setNoteEditing(e.target.value)}
              placeholder="Rueckfrage oder Anmerkung eingeben..."
              rows={6}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-300 focus:border-orange-400"
            />

            {/* Erledigt-Checkbox (nur wenn Notiz existiert) */}
            {noteId && (
              <div className="mt-3 border-t pt-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={noteStatus === 'erledigt'}
                    onChange={handleToggleNoteStatus}
                    disabled={noteSaving}
                    className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <span className={`text-sm font-medium ${noteStatus === 'erledigt' ? 'text-green-700' : 'text-gray-600'}`}>
                    Erledigt
                  </span>
                </label>
                {noteStatus === 'erledigt' && noteResolvedBy && (
                  <div className="text-xs text-green-600 mt-1 ml-7">
                    Erledigt von {noteResolvedBy}
                    {noteResolvedAt && ` am ${new Date(noteResolvedAt).toLocaleDateString('de-DE')}`}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3 justify-end mt-4">
              <button
                onClick={() => setShowNoteModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm"
              >
                Abbrechen
              </button>
              <button
                onClick={handleSaveNote}
                disabled={noteSaving || noteEditing.trim() === ''}
                className={`px-4 py-2 rounded-lg text-sm ${
                  noteEditing.trim() === ''
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-orange-500 text-white hover:bg-orange-600'
                }`}
              >
                {noteSaving ? '...' : 'Speichern'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unsaved Changes Dialog */}
      {showUnsavedDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 print:hidden">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Ungespeicherte Aenderungen</h3>
            <p className="text-gray-600 mb-6">
              Sie haben ungespeicherte Aenderungen. Was moechten Sie tun?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowUnsavedDialog(null)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Abbrechen
              </button>
              <button
                onClick={() => {
                  const callback = showUnsavedDialog;
                  setShowUnsavedDialog(null);
                  setHasChanges(false);
                  callback();
                }}
                className="px-4 py-2 text-red-700 bg-red-100 rounded-lg hover:bg-red-200"
              >
                Verwerfen
              </button>
              <button
                onClick={async () => {
                  const callback = showUnsavedDialog;
                  await handleSave();
                  setShowUnsavedDialog(null);
                  callback();
                }}
                style={{ backgroundColor: colors.primary }}
                className="px-4 py-2 text-white rounded-lg hover:opacity-90"
              >
                Speichern
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          html, body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          @page {
            size: A4 landscape;
            margin: 5mm;
          }
          .print\\:hidden {
            display: none !important;
          }
          table {
            font-size: 8px !important;
          }
          input {
            font-size: 8px !important;
          }
          select {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
