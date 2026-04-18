// src/components/shared/TimesheetForm.tsx
// ============================================================================
// PZE V7 - Shared Timesheet Form Component
// ============================================================================
// Datum: 02. Maerz 2026
// Version: 7.4.3-16
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

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

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
}

interface Project {
  id: string;
  name: string;
  short_name: string | null;
  funding_reference: string | null;
  funding_format: string | null;
}

interface WorkPackage {
  id: string;
  project_id: string;
  ap_number: number;
  ap_sub_number?: number;
  ap_code: string | null;
  name: string;
  is_technical?: boolean | null;  // NEU: Technisches AP (fuer ZIM_DS)
}

interface ClientCompany {
  id: string;
  name: string;
  federal_state: string | null;
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

const getEasterSunday = (year: number): Date => {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month, day);
};

// FIX v7.4.3-7: Bundesland-Langname zu DE-XX Code normalisieren
const normalizeStateCode = (state: string | null | undefined): string => {
  if (!state) return '';
  if (state.startsWith('DE-')) return state;
  const map: Record<string, string> = {
    'Baden-Wuerttemberg': 'DE-BW',
    'Bayern': 'DE-BY', 'Bavaria': 'DE-BY',
    'Berlin': 'DE-BE', 'Brandenburg': 'DE-BB',
    'Bremen': 'DE-HB', 'Hamburg': 'DE-HH',
    'Hessen': 'DE-HE', 'Hesse': 'DE-HE',
    'Mecklenburg-Vorpommern': 'DE-MV',
    'Niedersachsen': 'DE-NI', 'Lower Saxony': 'DE-NI',
    'Nordrhein-Westfalen': 'DE-NW', 'North Rhine-Westphalia': 'DE-NW',
    'Rheinland-Pfalz': 'DE-RP', 'Rhineland-Palatinate': 'DE-RP',
    'Saarland': 'DE-SL', 'Sachsen': 'DE-SN', 'Saxony': 'DE-SN',
    'Sachsen-Anhalt': 'DE-ST', 'Schleswig-Holstein': 'DE-SH',
    'Thueringen': 'DE-TH', 'Thuringia': 'DE-TH',
  };
  return map[state] || state;
};

const getGermanHolidays = (year: number, stateCode: string): Map<string, string> => {
  const holidays = new Map<string, string>();
  const easter = getEasterSunday(year);

  const formatDate = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const addDays = (d: Date, days: number): Date => {
    const r = new Date(d);
    r.setDate(d.getDate() + days);
    return r;
  };

  // Bundesweite Feiertage
  holidays.set(`${year}-01-01`, 'Neujahr');
  holidays.set(formatDate(addDays(easter, -2)), 'Karfreitag');
  holidays.set(formatDate(addDays(easter, 1)), 'Ostermontag');
  holidays.set(`${year}-05-01`, 'Tag der Arbeit');
  holidays.set(formatDate(addDays(easter, 39)), 'Chr. Himmelfahrt');
  holidays.set(formatDate(addDays(easter, 50)), 'Pfingstmontag');
  holidays.set(`${year}-10-03`, 'Tag d. Dt. Einheit');
  holidays.set(`${year}-12-25`, '1. Weihnachtstag');
  holidays.set(`${year}-12-26`, '2. Weihnachtstag');

  // Landesspezifische Feiertage
  if (['DE-BW', 'DE-BY', 'DE-ST'].includes(stateCode)) {
    holidays.set(`${year}-01-06`, 'Hl. Drei Koenige');
  }
  if (['DE-BE', 'DE-MV'].includes(stateCode)) {
    holidays.set(`${year}-03-08`, 'Frauentag');
  }
  if (['DE-BW', 'DE-BY', 'DE-HE', 'DE-NW', 'DE-RP', 'DE-SL'].includes(stateCode)) {
    holidays.set(formatDate(addDays(easter, 60)), 'Fronleichnam');
  }
  // Bayern pauschal (83% kath. Gemeinden) + Saarland
  if (['DE-BY', 'DE-SL'].includes(stateCode)) {
    holidays.set(`${year}-08-15`, 'Mariae Himmelfahrt');
  }
  if (['DE-TH'].includes(stateCode)) {
    holidays.set(`${year}-09-20`, 'Weltkindertag');
  }
  if (['DE-BB', 'DE-HB', 'DE-HH', 'DE-MV', 'DE-NI', 'DE-SN', 'DE-ST', 'DE-SH', 'DE-TH'].includes(stateCode)) {
    holidays.set(`${year}-10-31`, 'Reformationstag');
  }
  if (['DE-BW', 'DE-BY', 'DE-NW', 'DE-RP', 'DE-SL'].includes(stateCode)) {
    holidays.set(`${year}-11-01`, 'Allerheiligen');
  }
  if (['DE-SN'].includes(stateCode)) {
    const nov23 = new Date(year, 10, 23);
    const dayOfWeek = nov23.getDay();
    const daysBack = (dayOfWeek + 7 - 3) % 7;
    const bussUndBettag = new Date(nov23);
    bussUndBettag.setDate(nov23.getDate() - (daysBack === 0 ? 7 : daysBack));
    holidays.set(formatDate(bussUndBettag), 'Buss- u. Bettag');
  }

  return holidays;
};

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

  const allRowsFilled = apRows.every(row => row.workPackageId !== null);

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

  // Feiertage berechnen
  useEffect(() => {
    if (company?.federal_state) {
      setHolidays(getGermanHolidays(selectedYear, normalizeStateCode(company.federal_state)));
    }
  }, [selectedYear, company?.federal_state]);

  // Unterschriftsdatum
  useEffect(() => {
    setSignatureDate(getLastWorkdayOfMonth(selectedYear, selectedMonth));
  }, [selectedYear, selectedMonth, holidays]);

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
      // Completion-Status sofort zuruecksetzen damit kein alter Wert haengen bleibt
      setIsCompleted(false);
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
        // Nur APs vorbelegen die dem MA zugeordnet sind UND noch Stunden offen haben
        const relevantAssigned = assignedWPIds.filter(id => {
          if (!wpIds.includes(id)) return false;
          const planned = plannedHoursPerWP[id] || 0;
          const booked = totalBookedPerWP[id] || 0;
          const remaining = planned - booked;
          console.log(`[TimesheetForm] AP ${id}: planned=${planned.toFixed(0)}h, booked=${booked.toFixed(0)}h, remaining=${remaining.toFixed(0)}h`);
          return planned > 0 && remaining > 0; // nur wenn noch offen
        });
        console.log('[TimesheetForm] Vorbelege APs mit offenen Stunden:', relevantAssigned.length);
        
        // Erstelle Zeilen fuer zugeordnete APs + eine leere Zeile
        const prefilledRows: APRow[] = relevantAssigned.map(wpId => ({
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
      // Completion-Status fuer diesen MA/Projekt/Monat laden
      await loadCompletionStatus(selectedEmployeeId, selectedProjectId, selectedYear, selectedMonth);
    };

    loadTimeEntries();
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
        if (rowType === 'ap' && rowIndex < totalApRows - 1) {
          if (canEdit(rowIndex + 1, day, 'ap')) {
            focusCell(rowIndex + 1, day, 'ap');
          }
        } else if (rowType === 'ap') {
          focusCell(0, day, 'nonbillable');
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
  const calculateRemainingHours = (wpId: string | null): number | null => {
    if (!wpId) return null;
    const planned = plannedHoursPerWP[wpId];
    if (planned === undefined) return null; // AP nicht im Arbeitsplan zugeordnet
    const booked = totalBookedPerWP[wpId] || 0;
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
    apRows.forEach(row => {
      const entry = row.entries[day];
      if (entry?.value && isAbsenceCode(entry.value)) {
        const code = entry.value.toUpperCase();
        absences[code] = (absences[code] || 0) + 1;
      }
    });
    return Object.entries(absences).map(([code, count]) => ({ code, count }));
  };

  const calculateAbsenceSums = (): Record<string, number> => {
    const sums: Record<string, number> = { U: 0, K: 0, S: 0 };
    const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);

    for (let day = 1; day <= daysInMonth; day++) {
      apRows.forEach(row => {
        const entry = row.entries[day];
        if (entry?.value && isAbsenceCode(entry.value)) {
          const code = entry.value.toUpperCase();
          if (sums[code] !== undefined) {
            sums[code] += companyDailyHours;
          }
        }
      });
    }
    return sums;
  };

  // ============================================================================
  // SPEICHERN
  // ============================================================================

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

    setSaving(true);
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
  // NAVIGATION
  // ============================================================================

  const goToPreviousMonth = () => {
    checkUnsavedChanges(() => {
      if (selectedMonth === 1) {
        setSelectedMonth(12);
        setSelectedYear(prev => prev - 1);
      } else {
        setSelectedMonth(prev => prev - 1);
      }
    });
  };

  const goToNextMonth = () => {
    checkUnsavedChanges(() => {
      if (selectedMonth === 12) {
        setSelectedMonth(1);
        setSelectedYear(prev => prev + 1);
      } else {
        setSelectedMonth(prev => prev + 1);
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
                disabled={!isAdmin && safeEmployees.length <= 1}
                className="border rounded px-2 py-1 text-sm"
              >
                {safeEmployees.map(emp => (
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
                {MONTH_NAMES.map((name, idx) => (
                  <option key={idx} value={idx + 1}>{name}</option>
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
                {[2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <button onClick={goToNextMonth} className="p-1 hover:bg-gray-100 rounded">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
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
                <th className="border p-1 text-left" style={{ width: '30px' }}>AP</th>
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
                <th className="border p-1 text-center" style={{ width: '50px' }}>Summe<br/>Monat</th>
                <th className="border p-1 text-center print:hidden" style={{ width: '50px', backgroundColor: '#E8F5E9' }}>offen</th>
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
                        {/* NEU v7.4.3-3: Zugeordnete APs mit offenen Stunden zuerst */}
                        {assignedWPIds.length > 0 && availableWorkPackages.some(wp => {
                          if (!assignedWPIds.includes(wp.id)) return false;
                          const planned = plannedHoursPerWP[wp.id] || 0;
                          const booked = totalBookedPerWP[wp.id] || 0;
                          return planned > 0 && (planned - booked) > 0;
                        }) && (
                          <optgroup label="Zugeordnete AP">
                            {availableWorkPackages
                              .filter(wp => {
                                if (!assignedWPIds.includes(wp.id)) return false;
                                const planned = plannedHoursPerWP[wp.id] || 0;
                                const booked = totalBookedPerWP[wp.id] || 0;
                                return planned > 0 && (planned - booked) > 0;
                              })
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
                        {/* Weitere APs (nicht zugeordnet oder ausgeschoepft) */}
                        {availableWorkPackages.some(wp => {
                          if (!assignedWPIds.includes(wp.id)) return true;
                          const planned = plannedHoursPerWP[wp.id] || 0;
                          const booked = totalBookedPerWP[wp.id] || 0;
                          return planned <= 0 || (planned - booked) <= 0;
                        }) && (
                          <optgroup label="Weitere AP">
                            {availableWorkPackages
                              .filter(wp => {
                                if (!assignedWPIds.includes(wp.id)) return true;
                                const planned = plannedHoursPerWP[wp.id] || 0;
                                const booked = totalBookedPerWP[wp.id] || 0;
                                return planned <= 0 || (planned - booked) <= 0;
                              })
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
                        {/* Fallback wenn keine Gruppen */}
                        {assignedWPIds.length === 0 && availableWorkPackages.map(wp => {
                          const apDisplay = wp.ap_code
                            ? wp.ap_code.replace(/^AP/i, '')
                            : `${wp.ap_number}${wp.ap_sub_number ? `.${wp.ap_sub_number}` : ''}`;
                          return (
                            <option key={wp.id} value={wp.id}>
                              {apDisplay}
                            </option>
                          );
                        })}
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
                      return (
                        <td key={day} className="border p-1 text-center text-[10px]">
                          {daySum > 0 ? daySum.toFixed(2) : ''}
                        </td>
                      );
                    })}
                    <td className="border p-1 text-center bg-green-300">
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
                    return (
                      <td key={day} className="border p-1 text-center text-[10px]">
                        {daySum > 0 ? daySum.toFixed(2) : '0,00'}
                      </td>
                    );
                  })}
                  <td className="border p-1 text-center bg-green-200">
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
                  return (
                    <td key={day} className={`border p-1 text-center text-[10px] ${holiday ? 'bg-orange-100' : 'bg-purple-50'}`}>
                      {hasS || holiday ? companyDailyHours.toFixed(1).replace('.', ',') : ''}
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
