// src/app/v7/firma/zeiterfassung/page.tsx
// VERSION: v7.3.12 (SW-Release V7.3)
// DATUM: 08. Januar 2026
// BESCHREIBUNG: Zeiterfassung mit Excel-Navigation und PDF-Export
// ÄNDERUNGEN v7.3.12:
//   - Excel-Navigation: Pfeiltasten, Tab, Shift+Tab, Enter
//   - PDF-Export mit Speicherdialog
// ÄNDERUNGEN v7.3.11:
//   - "förderbare Projektarbeiten" statt "Management-Arbeiten"
//   - T-Spalte nur bei Durchführbarkeitsstudien
//   - Dynamische AP-Zeilen (+ Button)
// ÄNDERUNGEN v7.3.10:
//   - Header: 2x3 Layout (Zuwendungsempfänger|Stundennachweis, etc.)
//   - Unterschriften: senkrechte Trennlinie, Datum editierbar

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

// ============================================
// KONSTANTEN
// ============================================

const COLORS = {
  firmenPortal: '#65A655',
  headerOrange: '#F5D9C0',
  headerOrangeDark: '#E8B87D',
};

const MONTH_NAMES = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
];

// Fehlzeit-Codes (werden direkt im Kalenderfeld eingegeben)
const ABSENCE_CODES = ['U', 'K', 'S', 'F'];
const ABSENCE_LABELS: Record<string, string> = {
  'U': 'Urlaub (nur bezahlten Urlaub aufführen)',
  'K': 'Krankheit (nur bei Lohn- und Gehaltsfortzahlung)',
  'S': 'Sonstige bezahlte Ausfallzeiten (z. B. Feiertage)',
};

const DAILY_HOURS = 8; // Fehlzeit = 8h

// Bundesländer für Feiertage
const BUNDESLAENDER: Record<string, string> = {
  'DE-BW': 'Baden-Württemberg',
  'DE-BY': 'Bayern',
  'DE-BE': 'Berlin',
  'DE-BB': 'Brandenburg',
  'DE-HB': 'Bremen',
  'DE-HH': 'Hamburg',
  'DE-HE': 'Hessen',
  'DE-MV': 'Mecklenburg-Vorpommern',
  'DE-NI': 'Niedersachsen',
  'DE-NW': 'Nordrhein-Westfalen',
  'DE-RP': 'Rheinland-Pfalz',
  'DE-SL': 'Saarland',
  'DE-SN': 'Sachsen',
  'DE-ST': 'Sachsen-Anhalt',
  'DE-SH': 'Schleswig-Holstein',
  'DE-TH': 'Thüringen',
};

// ============================================
// TYPEN
// ============================================

interface UserProfile {
  id: string;
  email: string;
  role: string;
  display_name: string | null;
  client_company_id: string | null;
}

interface Employee {
  id: string;
  display_name: string;
  first_name: string | null;
  last_name: string | null;
  weekly_hours: number | null;
  user_id: string | null;
}

interface Project {
  id: string;
  name: string;
  short_name: string | null;
  funding_reference: string | null;
  funding_format: string | null;  // ZIM_SOLO, ZIM_KOOP, ZIM_NETZWERK, BMBF, etc.
}

interface WorkPackage {
  id: string;
  project_id: string;
  ap_number: number;
  ap_code: string | null;
  name: string;
}

interface ClientCompany {
  id: string;
  name: string;
  federal_state: string | null;
}

// Kalendereintrag: entweder Stunden oder Fehlzeit-Code
interface CalendarEntry {
  id?: string;
  value: string; // Zahl oder U/K/S
}

// Eine AP-Zeile (max 4)
interface APRow {
  workPackageId: string | null;
  entries: Record<number, CalendarEntry>; // Tag 1-31
}

// ============================================
// FEIERTAGS-BERECHNUNG
// ============================================

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
    holidays.set(`${year}-01-06`, 'Hl. Drei Könige');
  }
  if (['DE-BE', 'DE-MV'].includes(stateCode)) {
    holidays.set(`${year}-03-08`, 'Frauentag');
  }
  if (['DE-BW', 'DE-BY', 'DE-HE', 'DE-NW', 'DE-RP', 'DE-SL'].includes(stateCode)) {
    holidays.set(formatDate(addDays(easter, 60)), 'Fronleichnam');
  }
  if (['DE-SL'].includes(stateCode)) {
    holidays.set(`${year}-08-15`, 'Mariä Himmelfahrt');
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
    holidays.set(formatDate(bussUndBettag), 'Buß- u. Bettag');
  }

  return holidays;
};

// ============================================
// KOMPONENTE
// ============================================

export default function ZeiterfassungPage() {
  const router = useRouter();
  const supabase = createClient();
  const printRef = useRef<HTMLDivElement>(null);

  // State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [company, setCompany] = useState<ClientCompany | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [workPackages, setWorkPackages] = useState<WorkPackage[]>([]);

  // Ausgewählte Werte
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);

  // Unterschriftsdatum (editierbar, Standard: letzter Arbeitstag des Monats)
  const [signatureDate, setSignatureDate] = useState<string>('');

  // Zeiterfassungs-Daten: Dynamische AP-Zeilen (min. 4)
  const [apRows, setApRows] = useState<APRow[]>([
    { workPackageId: null, entries: {} },
    { workPackageId: null, entries: {} },
    { workPackageId: null, entries: {} },
    { workPackageId: null, entries: {} },
  ]);

  // Nicht zuschussfähige Arbeiten (eine Zeile)
  const [nonBillableEntries, setNonBillableEntries] = useState<Record<number, CalendarEntry>>({});

  // Feiertage
  const [holidays, setHolidays] = useState<Map<string, string>>(new Map());

  // Berechtigungen
  const isAdmin = userProfile?.role === 'client_admin';

  // Ausgewähltes Projekt
  const selectedProject = projects.find(p => p.id === selectedProjectId);
  
  // Verfügbare APs für das ausgewählte Projekt
  const availableWorkPackages = workPackages.filter(wp => wp.project_id === selectedProjectId);

  // Ausgewählter Mitarbeiter
  const selectedEmployee = employees.find(e => e.id === selectedEmployeeId);

  // Prüfen ob Projekt eine Durchführbarkeitsstudie ist (T-Spalte nur dann anzeigen)
  // DS-Projekte haben funding_format wie ZIM_DS, BMBF_DS etc.
  const isDurchfuehrbarkeitsstudie = selectedProject?.funding_format?.includes('DS') || false;

  // Prüfen ob alle AP-Zeilen belegt sind (für "Zeile hinzufügen" Button)
  const allRowsFilled = apRows.every(row => row.workPackageId !== null);

  // Funktion zum Hinzufügen einer neuen AP-Zeile
  const addApRow = () => {
    setApRows(prev => [...prev, { workPackageId: null, entries: {} }]);
    setHasChanges(true);
  };

  // ============================================
  // DATEN LADEN
  // ============================================

  const loadInitialData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        router.push('/login');
        return;
      }

      // Profil laden
      const { data: profile } = await supabase
        .from('v7_user_profiles')
        .select('*')
        .eq('email', user.email)
        .maybeSingle();

      if (!profile || !profile.client_company_id) {
        setError('Kein Firmenprofil gefunden.');
        setLoading(false);
        return;
      }

      setUserProfile(profile);
      const companyId = profile.client_company_id;

      // Firma laden
      const { data: companyData } = await supabase
        .from('v7_client_companies')
        .select('id, name, federal_state')
        .eq('id', companyId)
        .single();

      setCompany(companyData);

      // Feiertage berechnen
      if (companyData?.federal_state) {
        setHolidays(getGermanHolidays(selectedYear, companyData.federal_state));
      }

      // Mitarbeiter laden
      const { data: employeesData } = await supabase
        .from('v7_employees')
        .select('id, display_name, first_name, last_name, weekly_hours, user_id')
        .eq('client_company_id', companyId)
        .eq('is_active', true)
        .order('display_name');

      setEmployees(employeesData || []);

      // MA-Auswahl
      if (profile.role === 'client_admin' && employeesData && employeesData.length > 0) {
        setSelectedEmployeeId(employeesData[0].id);
      } else {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        const ownEmployee = employeesData?.find(e => e.user_id === currentUser?.id);
        if (ownEmployee) {
          setSelectedEmployeeId(ownEmployee.id);
        } else if (employeesData && employeesData.length > 0) {
          setSelectedEmployeeId(employeesData[0].id);
        }
      }

      // Projekte laden
      const { data: projectsData } = await supabase
        .from('v7_projects')
        .select('id, name, short_name, funding_reference, funding_format')
        .eq('client_company_id', companyId)
        .eq('is_active', true);

      setProjects(projectsData || []);

      // Erstes Projekt auswählen
      if (projectsData && projectsData.length > 0) {
        setSelectedProjectId(projectsData[0].id);

        // Arbeitspakete laden
        const projectIds = projectsData.map(p => p.id);
        const { data: wpData } = await supabase
          .from('v7_work_packages')
          .select('id, project_id, ap_number, ap_code, name')
          .in('project_id', projectIds)
          .eq('is_active', true)
          .order('ap_number');

        setWorkPackages(wpData || []);
      }

    } catch (err) {
      console.error('Fehler beim Laden:', err);
      setError('Daten konnten nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  }, [router, supabase, selectedYear]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Feiertage und Unterschriftsdatum bei Jahr/Monat-Änderung aktualisieren
  useEffect(() => {
    if (company?.federal_state) {
      setHolidays(getGermanHolidays(selectedYear, company.federal_state));
    }
    // Unterschriftsdatum auf letzten Arbeitstag setzen (nach holidays-Update)
  }, [selectedYear, company?.federal_state]);

  // Unterschriftsdatum aktualisieren wenn Monat/Jahr/Holidays sich ändern
  useEffect(() => {
    if (holidays.size > 0 || !company?.federal_state) {
      setSignatureDate(getLastWorkdayOfMonth(selectedYear, selectedMonth));
    }
  }, [selectedYear, selectedMonth, holidays]);

  // ============================================
  // DATEN LADEN FÜR AUSGEWÄHLTEN MA/PROJEKT/MONAT
  // ============================================

  useEffect(() => {
    if (!selectedEmployeeId || !selectedProjectId || loading) return;

    const loadTimeEntries = async () => {
      const startDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
      const endDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${getDaysInMonth(selectedYear, selectedMonth)}`;

      // Projekt-APs holen
      const projectWPs = workPackages.filter(wp => wp.project_id === selectedProjectId);
      const wpIds = projectWPs.map(wp => wp.id);

      if (wpIds.length === 0) {
        // Keine APs - leere Zeilen
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

      // Einträge laden
      const { data: entries } = await supabase
        .from('v7_timesheets')
        .select('*')
        .eq('employee_id', selectedEmployeeId)
        .gte('work_date', startDate)
        .lte('work_date', endDate)
        .eq('is_active', true);

      // Einträge in Rows einsortieren
      const newRows: APRow[] = [
        { workPackageId: null, entries: {} },
        { workPackageId: null, entries: {} },
        { workPackageId: null, entries: {} },
        { workPackageId: null, entries: {} },
      ];
      const newNonBillable: Record<number, CalendarEntry> = {};

      // Gruppieren nach work_package_id
      const wpEntryMap = new Map<string, Map<number, { id: string; value: string }>>();

      entries?.forEach(entry => {
        const day = parseInt(entry.work_date.split('-')[2]);

        if (entry.work_package_id && wpIds.includes(entry.work_package_id)) {
          // AP-Buchung
          if (!wpEntryMap.has(entry.work_package_id)) {
            wpEntryMap.set(entry.work_package_id, new Map());
          }
          const value = entry.absence_code || (entry.hours > 0 ? entry.hours.toString() : '');
          wpEntryMap.get(entry.work_package_id)!.set(day, { id: entry.id, value });
        } else if (!entry.is_billable && !entry.work_package_id && !entry.absence_code) {
          // Nicht zuschussfähig
          newNonBillable[day] = { id: entry.id, value: entry.hours > 0 ? entry.hours.toString() : '' };
        }
      });

      // In Rows einfügen (max 4)
      let rowIndex = 0;
      wpEntryMap.forEach((dayMap, wpId) => {
        if (rowIndex < 4) {
          const entriesObj: Record<number, CalendarEntry> = {};
          dayMap.forEach((entry, day) => {
            entriesObj[day] = entry;
          });
          newRows[rowIndex] = { workPackageId: wpId, entries: entriesObj };
          rowIndex++;
        }
      });

      setApRows(newRows);
      setNonBillableEntries(newNonBillable);
      setHasChanges(false);
    };

    loadTimeEntries();
  }, [selectedEmployeeId, selectedProjectId, selectedYear, selectedMonth, workPackages, loading, supabase]);

  // ============================================
  // HILFSFUNKTIONEN
  // ============================================

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

  const formatWorkDate = (day: number): string => {
    return `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const formatDisplayDate = (): string => {
    return `${String(selectedMonth).padStart(2, '0')} / ${selectedYear}`;
  };

  // Letzten Arbeitstag im Monat berechnen (kein WE, kein Feiertag)
  const getLastWorkdayOfMonth = (year: number, month: number): string => {
    const daysInMonth = getDaysInMonth(year, month);
    for (let day = daysInMonth; day >= 1; day--) {
      const dow = getDayOfWeek(year, month, day);
      const holidayName = isHoliday(year, month, day);
      if (dow !== 0 && dow !== 6 && !holidayName) {
        return `${String(day).padStart(2, '0')}.${String(month).padStart(2, '0')}.${year}`;
      }
    }
    // Fallback: letzter Tag des Monats
    return `${String(daysInMonth).padStart(2, '0')}.${String(month).padStart(2, '0')}.${year}`;
  };

  // Prüfen ob Eingabe eine Fehlzeit ist
  const isAbsenceCode = (value: string): boolean => {
    return ABSENCE_CODES.includes(value.toUpperCase());
  };

  // ============================================
  // EINGABE-HANDLER
  // ============================================

  const handleAPSelect = (rowIndex: number, wpId: string) => {
    setApRows(prev => {
      const updated = [...prev];
      updated[rowIndex] = { ...updated[rowIndex], workPackageId: wpId || null };
      return updated;
    });
    setHasChanges(true);
  };

  const handleCellChange = (rowIndex: number, day: number, value: string) => {
    // Normalisieren: Großbuchstaben für Fehlzeiten
    const normalizedValue = isAbsenceCode(value) ? value.toUpperCase() : value;
    
    // Validierung: nur Zahlen (mit Dezimal) oder Fehlzeit-Codes
    if (normalizedValue && !isAbsenceCode(normalizedValue)) {
      const num = parseFloat(normalizedValue);
      if (isNaN(num) || num < 0 || num > 24) return;
    }

    setApRows(prev => {
      const updated = [...prev];
      updated[rowIndex] = {
        ...updated[rowIndex],
        entries: {
          ...updated[rowIndex].entries,
          [day]: { ...updated[rowIndex].entries[day], value: normalizedValue },
        },
      };
      return updated;
    });
    setHasChanges(true);
  };

  const handleNonBillableChange = (day: number, value: string) => {
    if (value) {
      const num = parseFloat(value);
      if (isNaN(num) || num < 0 || num > 24) return;
    }

    setNonBillableEntries(prev => ({
      ...prev,
      [day]: { ...prev[day], value },
    }));
    setHasChanges(true);
  };

  // ============================================
  // TASTATUR-NAVIGATION (Excel-Style)
  // ============================================

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    rowIndex: number,
    day: number,
    rowType: 'ap' | 'nonbillable'
  ) => {
    // Nur bei Navigationstasten reagieren
    const navKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter'];
    if (!navKeys.includes(e.key)) return;

    const days = getDaysInMonth(selectedYear, selectedMonth);
    const totalApRows = apRows.length;
    
    // Hilfsfunktion: Prüfen ob Feld editierbar ist
    const canEdit = (r: number, d: number, type: 'ap' | 'nonbillable'): boolean => {
      if (d < 1 || d > days) return false;
      if (isWeekend(selectedYear, selectedMonth, d)) return false;
      if (isHoliday(selectedYear, selectedMonth, d)) return false;
      if (type === 'ap') {
        if (r < 0 || r >= totalApRows) return false;
        return apRows[r]?.workPackageId !== null;
      }
      return true;
    };

    // Fokus auf Feld setzen via DOM
    const focusCell = (r: number, d: number, type: 'ap' | 'nonbillable') => {
      setTimeout(() => {
        const selector = `input[data-row="${r}"][data-day="${d}"][data-type="${type}"]`;
        const el = document.querySelector(selector) as HTMLInputElement | null;
        if (el && !el.disabled) {
          el.focus();
          el.select();
        }
      }, 0);
    };

    // Nächstes editierbares Feld in Richtung finden
    const findNext = (startR: number, startD: number, dirR: number, dirD: number, type: 'ap' | 'nonbillable'): { r: number; d: number; t: 'ap' | 'nonbillable' } | null => {
      let r = startR + dirR;
      let d = startD + dirD;
      
      // Horizontal bewegen
      if (dirD !== 0 && dirR === 0) {
        while (d >= 1 && d <= days) {
          if (canEdit(r, d, type)) return { r, d, t: type };
          d += dirD;
        }
      }
      // Vertikal bewegen
      else if (dirR !== 0 && dirD === 0) {
        if (type === 'ap') {
          while (r >= 0 && r < totalApRows) {
            if (canEdit(r, d, 'ap')) return { r, d, t: 'ap' };
            r += dirR;
          }
          // Wenn runter und am Ende der AP-Zeilen, zu nonbillable
          if (dirR > 0 && canEdit(0, d, 'nonbillable')) {
            return { r: 0, d, t: 'nonbillable' };
          }
        } else if (type === 'nonbillable' && dirR < 0) {
          // Von nonbillable hoch zu letzter AP-Zeile
          for (let ri = totalApRows - 1; ri >= 0; ri--) {
            if (canEdit(ri, d, 'ap')) return { r: ri, d, t: 'ap' };
          }
        }
      }
      return null;
    };

    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault();
        {
          const next = findNext(rowIndex, day, 0, 1, rowType);
          if (next) focusCell(next.r, next.d, next.t);
        }
        break;

      case 'ArrowLeft':
        e.preventDefault();
        {
          const next = findNext(rowIndex, day, 0, -1, rowType);
          if (next) focusCell(next.r, next.d, next.t);
        }
        break;

      case 'ArrowDown':
        e.preventDefault();
        {
          const next = findNext(rowIndex, day, 1, 0, rowType);
          if (next) focusCell(next.r, next.d, next.t);
        }
        break;

      case 'ArrowUp':
        e.preventDefault();
        {
          const next = findNext(rowIndex, day, -1, 0, rowType);
          if (next) focusCell(next.r, next.d, next.t);
        }
        break;

      case 'Tab':
        e.preventDefault();
        if (e.shiftKey) {
          // Shift+Tab: Rückwärts
          let found = false;
          // Erst in gleicher Zeile nach links
          for (let d = day - 1; d >= 1; d--) {
            if (canEdit(rowIndex, d, rowType)) {
              focusCell(rowIndex, d, rowType);
              found = true;
              break;
            }
          }
          if (!found) {
            // Vorherige Zeile, letzter Tag
            if (rowType === 'nonbillable') {
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
            } else if (rowIndex > 0) {
              for (let d = days; d >= 1; d--) {
                if (canEdit(rowIndex - 1, d, 'ap')) {
                  focusCell(rowIndex - 1, d, 'ap');
                  break;
                }
              }
            }
          }
        } else {
          // Tab: Vorwärts
          let found = false;
          // Erst in gleicher Zeile nach rechts
          for (let d = day + 1; d <= days; d++) {
            if (canEdit(rowIndex, d, rowType)) {
              focusCell(rowIndex, d, rowType);
              found = true;
              break;
            }
          }
          if (!found) {
            // Nächste Zeile, erster Tag
            if (rowType === 'ap' && rowIndex < totalApRows - 1) {
              for (let d = 1; d <= days; d++) {
                if (canEdit(rowIndex + 1, d, 'ap')) {
                  focusCell(rowIndex + 1, d, 'ap');
                  found = true;
                  break;
                }
              }
            }
            if (!found) {
              // Zu nonbillable
              for (let d = 1; d <= days; d++) {
                if (canEdit(0, d, 'nonbillable')) {
                  focusCell(0, d, 'nonbillable');
                  break;
                }
              }
            }
          }
        }
        break;

      case 'Enter':
        e.preventDefault();
        // Nächstes LEERES Feld finden
        {
          let found = false;
          // In gleicher Zeile nach rechts
          for (let d = day + 1; d <= days; d++) {
            if (canEdit(rowIndex, d, rowType)) {
              const hasValue = rowType === 'ap' 
                ? apRows[rowIndex]?.entries[d]?.value 
                : nonBillableEntries[d]?.value;
              if (!hasValue) {
                focusCell(rowIndex, d, rowType);
                found = true;
                break;
              }
            }
          }
          // Nächste Zeilen
          if (!found && rowType === 'ap') {
            outer: for (let r = rowIndex + 1; r < totalApRows; r++) {
              for (let d = 1; d <= days; d++) {
                if (canEdit(r, d, 'ap') && !apRows[r]?.entries[d]?.value) {
                  focusCell(r, d, 'ap');
                  found = true;
                  break outer;
                }
              }
            }
          }
          // Nonbillable
          if (!found) {
            for (let d = 1; d <= days; d++) {
              if (canEdit(0, d, 'nonbillable') && !nonBillableEntries[d]?.value) {
                focusCell(0, d, 'nonbillable');
                break;
              }
            }
          }
        }
        break;
    }
  };

  // ============================================
  // BERECHNUNGEN
  // ============================================

  const calculateRowSum = (row: APRow): number => {
    return Object.values(row.entries).reduce((sum, entry) => {
      if (entry.value && !isAbsenceCode(entry.value)) {
        return sum + parseFloat(entry.value);
      }
      return sum;
    }, 0);
  };

  const calculateDaySum = (day: number): number => {
    return apRows.reduce((sum, row) => {
      const entry = row.entries[day];
      if (entry?.value && !isAbsenceCode(entry.value)) {
        return sum + parseFloat(entry.value);
      }
      return sum;
    }, 0);
  };

  const calculateTotalBillable = (): number => {
    return apRows.reduce((sum, row) => sum + calculateRowSum(row), 0);
  };

  const calculateNonBillableSum = (): number => {
    return Object.values(nonBillableEntries).reduce((sum, entry) => {
      if (entry.value) {
        return sum + parseFloat(entry.value);
      }
      return sum;
    }, 0);
  };

  // Fehlzeiten aus allen Zeilen sammeln
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

  // Fehlzeiten-Summen
  const calculateAbsenceSums = (): Record<string, number> => {
    const sums: Record<string, number> = { U: 0, K: 0, S: 0 };
    const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
    
    for (let day = 1; day <= daysInMonth; day++) {
      apRows.forEach(row => {
        const entry = row.entries[day];
        if (entry?.value && isAbsenceCode(entry.value)) {
          const code = entry.value.toUpperCase();
          if (sums[code] !== undefined) {
            sums[code] += DAILY_HOURS;
          }
        }
      });
    }
    return sums;
  };

  // ============================================
  // SPEICHERN
  // ============================================

  const handleSave = async () => {
    if (!selectedEmployeeId || !userProfile) return;

    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const now = new Date().toISOString();
      const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
      const entriesToSave: any[] = [];
      const idsToKeep: string[] = [];

      // AP-Zeilen durchgehen
      apRows.forEach(row => {
        if (!row.workPackageId) return;

        Object.entries(row.entries).forEach(([dayStr, entry]) => {
          const day = parseInt(dayStr);
          if (!entry.value) return;

          const isAbsence = isAbsenceCode(entry.value);
          const hours = isAbsence ? 0 : parseFloat(entry.value);

          const record = {
            employee_id: selectedEmployeeId,
            work_package_id: row.workPackageId,
            project_id: selectedProjectId,
            work_date: formatWorkDate(day),
            hours: hours,
            is_billable: !isAbsence,
            absence_code: isAbsence ? entry.value.toUpperCase() : null,
            data_source: 'manual',
            entered_by: userProfile.id,
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

      // Nicht zuschussfähige Stunden
      Object.entries(nonBillableEntries).forEach(([dayStr, entry]) => {
        const day = parseInt(dayStr);
        if (!entry.value || parseFloat(entry.value) === 0) return;

        const record = {
          employee_id: selectedEmployeeId,
          work_package_id: null,
          project_id: selectedProjectId,
          work_date: formatWorkDate(day),
          hours: parseFloat(entry.value),
          is_billable: false,
          absence_code: null,
          data_source: 'manual',
          entered_by: userProfile.id,
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

      // Alte Einträge deaktivieren
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

      setSuccessMessage(`âœ… Stundennachweis für ${MONTH_NAMES[selectedMonth - 1]} ${selectedYear} gespeichert!`);
      setHasChanges(false);
      setTimeout(() => setSuccessMessage(null), 4000);

    } catch (err: any) {
      console.error('Speichern fehlgeschlagen:', err);
      setError('Fehler beim Speichern: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // ============================================
  // PDF DRUCKEN & EXPORTIEREN
  // ============================================

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = async () => {
    // Dateiname generieren
    const empName = selectedEmployee?.display_name?.replace(/\s+/g, '_') || 'Mitarbeiter';
    const projectRef = selectedProject?.funding_reference?.replace(/\s+/g, '_') || selectedProject?.short_name || 'Projekt';
    const monthYear = `${String(selectedMonth).padStart(2, '0')}_${selectedYear}`;
    const defaultFileName = `Stundennachweis_${empName}_${projectRef}_${monthYear}.pdf`;

    // Browser-Print-Dialog mit "Als PDF speichern" Option
    // Der Benutzer kann im Dialog den Speicherort und Dateinamen wählen
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Popup blockiert. Bitte erlauben Sie Popups für diese Seite.');
      return;
    }

    // HTML des Druckbereichs holen
    const printContent = printRef.current;
    if (!printContent) return;

    // Styles sammeln
    const styles = Array.from(document.styleSheets)
      .map(sheet => {
        try {
          return Array.from(sheet.cssRules).map(rule => rule.cssText).join('\n');
        } catch {
          return '';
        }
      })
      .join('\n');

    // HTML für das neue Fenster erstellen
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${defaultFileName}</title>
          <style>
            ${styles}
            @page { size: A4 landscape; margin: 5mm; }
            body { 
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              background: white !important;
              margin: 0;
              padding: 10px;
            }
            @media print {
              body { background: white !important; }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
          <script>
            window.onload = function() {
              document.title = '${defaultFileName}';
              setTimeout(function() {
                window.print();
                window.onafterprint = function() { window.close(); };
              }, 250);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // ============================================
  // NAVIGATION
  // ============================================

  const goToPreviousMonth = () => {
    if (hasChanges && !confirm('Ungespeicherte Änderungen verwerfen?')) return;
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(prev => prev - 1);
    } else {
      setSelectedMonth(prev => prev - 1);
    }
  };

  const goToNextMonth = () => {
    if (hasChanges && !confirm('Ungespeicherte Änderungen verwerfen?')) return;
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(prev => prev + 1);
    } else {
      setSelectedMonth(prev => prev + 1);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  // ============================================
  // RENDER
  // ============================================

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Lade Zeiterfassung...</p>
        </div>
      </div>
    );
  }

  const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
  const absenceSums = calculateAbsenceSums();

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white">
      {/* Header - wird beim Drucken ausgeblendet */}
      <header style={{ backgroundColor: COLORS.firmenPortal }} className="shadow-sm print:hidden">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-3">
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  if (hasChanges && !confirm('Ungespeicherte Änderungen verwerfen?')) return;
                  router.push('/v7/firma');
                }}
                className="text-green-100 hover:text-white flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Zurück
              </button>
              <div className="bg-white rounded-lg px-3 py-1 text-sm font-bold" style={{ color: COLORS.firmenPortal }}>
                PZE
              </div>
              <h1 className="text-lg font-semibold text-white">Stundennachweis</h1>
            </div>

            <div className="flex items-center gap-3">
              {hasChanges && (
                <span className="text-yellow-200 text-sm flex items-center gap-1">
                  <span className="w-2 h-2 bg-yellow-300 rounded-full animate-pulse"></span>
                  Ungespeichert
                </span>
              )}
              <button
                onClick={handlePrint}
                className="px-3 py-1.5 bg-white/20 text-white rounded hover:bg-white/30 text-sm"
              >
                🖨️ Drucken
              </button>
              <button
                onClick={handleExportPDF}
                className="px-3 py-1.5 bg-white/20 text-white rounded hover:bg-white/30 text-sm"
              >
                📄 PDF Export
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !hasChanges}
                className={`px-4 py-1.5 rounded text-sm font-medium ${
                  hasChanges 
                    ? 'bg-white text-green-700 hover:bg-green-50' 
                    : 'bg-green-400 text-green-100 cursor-not-allowed'
                }`}
              >
                {saving ? '...' : '💾 Speichern'}
              </button>
              <span className="text-white text-sm">{userProfile?.display_name}</span>
              <button onClick={handleLogout} className="text-green-100 hover:text-white text-sm">
                Abmelden
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Steuerung - wird beim Drucken ausgeblendet */}
      <div className="bg-white border-b shadow-sm print:hidden">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex flex-wrap items-center gap-4">
            {/* Mitarbeiter */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-600">Mitarbeiter:</label>
              <select
                value={selectedEmployeeId}
                onChange={(e) => {
                  if (hasChanges && !confirm('Ungespeicherte Änderungen verwerfen?')) return;
                  setSelectedEmployeeId(e.target.value);
                }}
                disabled={!isAdmin && employees.length <= 1}
                className="border rounded px-2 py-1 text-sm"
              >
                {employees.map(emp => (
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
                  if (hasChanges && !confirm('Ungespeicherte Änderungen verwerfen?')) return;
                  setSelectedProjectId(e.target.value);
                }}
                className="border rounded px-2 py-1 text-sm min-w-[200px]"
              >
                {projects.map(p => (
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
                  if (hasChanges && !confirm('Ungespeicherte Änderungen verwerfen?')) return;
                  setSelectedMonth(parseInt(e.target.value));
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
                  if (hasChanges && !confirm('Ungespeicherte Änderungen verwerfen?')) return;
                  setSelectedYear(parseInt(e.target.value));
                }}
                className="border rounded px-2 py-1 text-sm"
              >
                {[2024, 2025, 2026, 2027].map(y => (
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

      {/* ============================================ */}
      {/* STUNDENNACHWEIS-FORMULAR (druckbar) */}
      {/* ============================================ */}
      <div ref={printRef} className="max-w-full mx-auto p-4 print:p-0 print:m-0">
        <div className="bg-white shadow-lg print:shadow-none overflow-x-auto">
          {/* Header-Bereich - 2x3 Layout */}
          <table className="w-full border-collapse text-xs" style={{ minWidth: '1000px', tableLayout: 'fixed' }}>
            <tbody>
              {/* Zeile 1: Zuwendungsempfänger | Stundennachweis mit Hinweis */}
              <tr>
                <td className="border p-2 print:p-1.5" style={{ width: '50%' }}>
                  <div className="text-[10px] print:text-[8px] text-gray-500">Zuwendungsempfänger (Firmenstempel)</div>
                  <div className="font-bold text-lg print:text-base text-center py-2">{company?.name}</div>
                </td>
                <td className="border p-2 print:p-1.5 text-center" style={{ width: '50%', backgroundColor: COLORS.headerOrange }}>
                  <div className="font-bold text-xl print:text-lg">Stundennachweis</div>
                  <div className="text-[10px] print:text-[8px] text-gray-600 mt-1">
                    Der Stundennachweis verbleibt beim Zuwendungsempfänger und ist nur nach Aufforderung vorzulegen.
                  </div>
                </td>
              </tr>

              {/* Zeile 2: Vorhabenthema | FKZ */}
              <tr>
                <td className="border p-2 print:p-1">
                  <div className="text-[10px] print:text-[8px] text-gray-500">Vorhabenthema</div>
                  <div className="font-semibold text-base print:text-sm text-center py-1">{selectedProject?.name || '-'}</div>
                </td>
                <td className="border p-2 print:p-1" style={{ backgroundColor: COLORS.headerOrange }}>
                  <div className="text-[10px] print:text-[8px] text-gray-500">Förderkennzeichen</div>
                  <div className="font-bold text-lg print:text-base text-center py-1">{selectedProject?.funding_reference || '-'}</div>
                </td>
              </tr>

              {/* Zeile 3: Monat | Mitarbeiter */}
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
            Die zu Lasten des Vorhabens abzurechnenden Personalstunden sind täglich eigenhändig von der betreffenden Person zu erfassen. Nur die produktiven, für das Vorhaben geleisteten Stunden sind zuwendungsfähig.
          </div>

          {/* Kalender-Tabelle */}
          <table className="w-full border-collapse text-xs" style={{ minWidth: '1000px' }}>
            <thead>
              <tr style={{ backgroundColor: COLORS.headerOrange }}>
                <th className="border p-1 text-left" style={{ width: '30px' }}>lfd. Nr.</th>
                <th className="border p-1 text-left" style={{ width: '30px' }}>AP</th>
                <th className="border p-1 text-left" style={{ width: '180px' }}>Kurzbezeichnung des Arbeitspakets</th>
                {isDurchfuehrbarkeitsstudie && (
                  <th className="border p-1 text-center" style={{ width: '20px' }}>T</th>
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
              </tr>
            </thead>
            <tbody>
              {/* Abschnitt 1: Förderbare Arbeiten */}
              <tr>
                <td className="border p-1 font-semibold" colSpan={(isDurchfuehrbarkeitsstudie ? 4 : 3) + daysInMonth + 1} style={{ backgroundColor: '#FFF9E6' }}>
                  1. förderbare Projektarbeiten (1)
                </td>
              </tr>

              {/* 4 AP-Zeilen */}
              {apRows.map((row, rowIndex) => {
                const selectedWP = workPackages.find(wp => wp.id === row.workPackageId);
                return (
                  <tr key={rowIndex}>
                    <td className="border p-1 text-center">{rowIndex + 1}.</td>
                    <td className="border p-0">
                      <select
                        value={row.workPackageId || ''}
                        onChange={(e) => handleAPSelect(rowIndex, e.target.value)}
                        className="w-full h-full p-1 text-xs border-0 bg-transparent print:appearance-none"
                      >
                        <option value="">-</option>
                        {availableWorkPackages.map(wp => (
                          <option key={wp.id} value={wp.id}>
                            {wp.ap_code || `AP${wp.ap_number}`}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="border p-1 text-[10px] leading-tight" style={{ maxWidth: '180px' }}>
                      <div className="line-clamp-2" title={selectedWP?.name}>
                        {selectedWP?.name || ''}
                      </div>
                    </td>
                    {isDurchfuehrbarkeitsstudie && (
                      <td className="border p-1 text-center text-gray-400">-</td>
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
                            } focus:ring-1 focus:ring-green-500 print:bg-transparent`}
                            style={{ minWidth: '24px' }}
                          />
                        </td>
                      );
                    })}
                    <td className="border p-1 text-center font-semibold bg-gray-50">
                      {calculateRowSum(row) > 0 ? calculateRowSum(row).toFixed(2) : '0,00'}
                    </td>
                  </tr>
                );
              })}

              {/* Button zum Hinzufügen einer AP-Zeile (nur wenn alle belegt und noch APs verfügbar) */}
              {allRowsFilled && availableWorkPackages.length > apRows.length && (
                <tr className="print:hidden">
                  <td colSpan={(isDurchfuehrbarkeitsstudie ? 4 : 3) + daysInMonth + 1} className="border p-1 text-center">
                    <button
                      onClick={addApRow}
                      className="text-xs text-green-600 hover:text-green-800 hover:underline"
                    >
                      + Weitere AP-Zeile hinzufügen
                    </button>
                  </td>
                </tr>
              )}

              {/* Summe förderbare Stunden */}
              <tr className="font-semibold" style={{ backgroundColor: '#E8F5E9' }}>
                <td className="border p-1" colSpan={isDurchfuehrbarkeitsstudie ? 4 : 3}>Summe der förderbaren Stunden (2)</td>
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
              </tr>

              {/* Abschnitt 2: Nicht zuschussfähig */}
              <tr>
                <td className="border p-1 font-semibold" colSpan={(isDurchfuehrbarkeitsstudie ? 4 : 3) + daysInMonth + 1} style={{ backgroundColor: '#FFF3E0' }}>
                  2. Nicht zuschussfähige Arbeiten
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
              </tr>

              {/* Abschnitt 3: Fehlzeiten */}
              <tr>
                <td className="border p-1 font-semibold" colSpan={(isDurchfuehrbarkeitsstudie ? 4 : 3) + daysInMonth + 1} style={{ backgroundColor: '#E3F2FD' }}>
                  3. Fehlzeiten
                </td>
              </tr>
              {/* Urlaub */}
              <tr>
                <td className="border p-1 text-[10px]" colSpan={isDurchfuehrbarkeitsstudie ? 4 : 3}>Urlaub (nur bezahlten Urlaub aufführen)</td>
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                  const absences = getAbsencesForDay(day);
                  const hasU = absences.some(a => a.code === 'U');
                  return (
                    <td key={day} className="border p-1 text-center text-[10px] bg-blue-50">
                      {hasU ? DAILY_HOURS.toFixed(0) : ''}
                    </td>
                  );
                })}
                <td className="border p-1 text-center font-semibold bg-blue-100">
                  {absenceSums.U > 0 ? absenceSums.U.toFixed(2) : '0,00'}
                </td>
              </tr>
              {/* Krankheit */}
              <tr>
                <td className="border p-1 text-[10px]" colSpan={isDurchfuehrbarkeitsstudie ? 4 : 3}>Krankheit (nur bei Lohn- und Gehaltsfortzahlung)</td>
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                  const absences = getAbsencesForDay(day);
                  const hasK = absences.some(a => a.code === 'K');
                  return (
                    <td key={day} className="border p-1 text-center text-[10px] bg-red-50">
                      {hasK ? DAILY_HOURS.toFixed(0) : ''}
                    </td>
                  );
                })}
                <td className="border p-1 text-center font-semibold bg-red-100">
                  {absenceSums.K > 0 ? absenceSums.K.toFixed(2) : '0,00'}
                </td>
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
                      {hasS || holiday ? DAILY_HOURS.toFixed(0) : ''}
                    </td>
                  );
                })}
                <td className="border p-1 text-center font-semibold bg-purple-100">
                  {absenceSums.S > 0 ? absenceSums.S.toFixed(2) : '0,00'}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Hinweistexte */}
          <div className="px-2 py-1 print:px-1 print:py-0.5 text-[7px] print:text-[5px] text-gray-600 border-x border-b">
            <p>
              <strong>(1)</strong> Die geleisteten Netzwerkbearbeitungsstunden sind für den gesamten Bewilligungszeitraum <strong>eigenhändig und zeitnah</strong>, d. h. mindestens innerhalb einer Woche zu erfassen. Die Angaben sind subventionserheblich im Sinne des § 264 Strafgesetzbuch.
            </p>
            <p>
              <strong>(2)</strong> Förderbar pro Monat sind die tatsächlich für das Netzwerk geleisteten Stunden, jedoch nicht mehr als arbeitsvertraglich, betrieblich oder tariflich vereinbart, <strong>maximal in Höhe von 52 (Wochen) / 12 (Monate) x Wochenarbeitszeit. Überstunden sind nicht förderbar.</strong>
            </p>
          </div>

          {/* Unterschriften - mit senkrechter Trennlinie, ohne horizontale Linie oben */}
          <div className="border-x border-b flex">
            <div className="flex-1 p-3 print:p-2 border-r border-gray-400">
              <div className="text-[9px] print:text-[7px] text-gray-500 mb-8 print:mb-6">Datum / Unterschrift des Mitarbeiters</div>
              <input
                type="text"
                value={signatureDate}
                onChange={(e) => setSignatureDate(e.target.value)}
                className="text-sm print:text-xs border-b border-gray-300 print:border-gray-400 bg-transparent w-28 focus:outline-none focus:border-green-500"
              />
            </div>
            <div className="flex-1 p-3 print:p-2">
              <div className="text-[9px] print:text-[7px] text-gray-500 mb-8 print:mb-6">Datum / Unterschrift Geschäftsführer bzw. FuE-Verantwortlicher (in öffentlichen Forschungseinrichtungen)</div>
              <input
                type="text"
                value={signatureDate}
                onChange={(e) => setSignatureDate(e.target.value)}
                className="text-sm print:text-xs border-b border-gray-300 print:border-gray-400 bg-transparent w-28 focus:outline-none focus:border-green-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t mt-4 print:hidden">
        <div className="max-w-full mx-auto px-4 py-3">
          <p className="text-center text-xs text-gray-500">
            Projektzeiterfassung v7.3 · Firmen-Portal · © {new Date().getFullYear()}
          </p>
        </div>
      </footer>

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
          /* Weißer Hintergrund für alles außerhalb des Formulars */
          body::after {
            content: '';
            display: block;
            background: white;
          }
          table {
            font-size: 8px !important;
          }
          input {
            font-size: 8px !important;
          }
          select {
            -webkit-appearance: none !important;
            appearance: none !important;
          }
        }
      `}</style>
    </div>
  );
}