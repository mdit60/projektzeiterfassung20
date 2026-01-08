// src/app/v7/firma/zeiterfassung/page.tsx
// VERSION: v7.3.7 (SW-Release V7.3)
// DATUM: 08. Januar 2026
// BESCHREIBUNG: Zeiterfassung - Monatsansicht mit DB-Persistenz
// ÄNDERUNG: Laden und Speichern aus/in v7_timesheets

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

// ============================================
// KONSTANTEN
// ============================================

const HOURS_PER_PM = 173.33;

const COLORS = {
  firmenPortal: '#65A655',
};

const MONTH_NAMES = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
];

// Fehlzeit-Codes
const ABSENCE_CODES: Record<string, { label: string; color: string }> = {
  'U': { label: 'Urlaub', color: 'bg-blue-100 text-blue-800' },
  'K': { label: 'Krankheit', color: 'bg-red-100 text-red-800' },
  'F': { label: 'Feiertag', color: 'bg-orange-100 text-orange-800' },
  'S': { label: 'Sonderurlaub', color: 'bg-purple-100 text-purple-800' },
};

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
  weekly_hours: number | null;
  user_id: string | null;
}

interface Project {
  id: string;
  name: string;
  funding_reference: string | null;
}

interface WorkPackage {
  id: string;
  project_id: string;
  ap_number: number;
  ap_code: string | null;
  name: string;
  total_person_months: number | null;
}

interface ProjectAssignment {
  project_id: string;
  employee_id: string;
}

interface WorkPackageAssignment {
  work_package_id: string;
  employee_id: string;
  planned_person_months: number | null;
}

interface ClientCompany {
  id: string;
  name: string;
  federal_state: string | null;
}

// DB-Eintrag aus v7_timesheets
interface TimesheetEntry {
  id: string;
  employee_id: string;
  work_package_id: string | null;
  work_date: string;
  hours: number;
  is_billable: boolean;
  absence_code: string | null;
  notes: string | null;
}

// Zeiterfassungs-Daten pro Tag (im State)
interface DayEntry {
  id?: string; // DB-ID falls bereits gespeichert
  hours: number | null;
  absenceCode: string | null;
}

// Zeiterfassungs-Zeile (ein AP)
interface TimeEntryRow {
  workPackageId: string;
  projectId: string;
  projectName: string;
  apCode: string;
  apName: string;
  days: Record<number, DayEntry>; // day 1-31 -> entry
  sumHours: number;
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

  // Refs für Navigation
  const cellRefs = useRef<Map<string, HTMLInputElement>>(new Map());

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
  const [projectAssignments, setProjectAssignments] = useState<ProjectAssignment[]>([]);
  const [wpAssignments, setWPAssignments] = useState<WorkPackageAssignment[]>([]);

  // Ausgewählter Mitarbeiter und Monat
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);

  // Zeiterfassungs-Daten
  const [timeEntryRows, setTimeEntryRows] = useState<TimeEntryRow[]>([]);
  const [nonBillableHours, setNonBillableHours] = useState<Record<number, { id?: string; hours: number }>>({}); 
  const [absences, setAbsences] = useState<Record<number, { id?: string; code: string }>>({}); 

  // Feiertage
  const [holidays, setHolidays] = useState<Map<string, string>>(new Map());

  // Berechtigungen
  const isAdmin = userProfile?.role === 'client_admin';

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

      // Firma laden (für Bundesland -> Feiertage)
      const { data: companyData } = await supabase
        .from('v7_client_companies')
        .select('id, name, federal_state')
        .eq('id', companyId)
        .single();

      setCompany(companyData);

      // Feiertage berechnen
      if (companyData?.federal_state) {
        const h = getGermanHolidays(selectedYear, companyData.federal_state);
        setHolidays(h);
      }

      // Mitarbeiter laden
      const { data: employeesData } = await supabase
        .from('v7_employees')
        .select('id, display_name, weekly_hours, user_id')
        .eq('client_company_id', companyId)
        .eq('is_active', true)
        .order('display_name');

      setEmployees(employeesData || []);

      // MA-Auswahl: Admin sieht alle, normaler User nur sich selbst
      if (profile.role === 'client_admin' && employeesData && employeesData.length > 0) {
        setSelectedEmployeeId(employeesData[0].id);
      } else {
        // Eigenen Employee finden (über user_id)
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        const ownEmployee = employeesData?.find(e => e.user_id === currentUser?.id);
        if (ownEmployee) {
          setSelectedEmployeeId(ownEmployee.id);
        } else if (employeesData && employeesData.length > 0) {
          // Fallback: ersten nehmen
          setSelectedEmployeeId(employeesData[0].id);
        }
      }

      // Projekte laden
      const { data: projectsData } = await supabase
        .from('v7_projects')
        .select('id, name, funding_reference')
        .eq('client_company_id', companyId)
        .eq('is_active', true);

      setProjects(projectsData || []);

      // Arbeitspakete laden
      if (projectsData && projectsData.length > 0) {
        const projectIds = projectsData.map(p => p.id);

        const { data: wpData } = await supabase
          .from('v7_work_packages')
          .select('id, project_id, ap_number, ap_code, name, total_person_months')
          .in('project_id', projectIds)
          .eq('is_active', true)
          .order('ap_number');

        setWorkPackages(wpData || []);

        // Projekt-Zuordnungen
        const { data: paData } = await supabase
          .from('v7_project_assignments')
          .select('project_id, employee_id')
          .in('project_id', projectIds)
          .eq('is_active', true);

        setProjectAssignments(paData || []);

        // AP-Zuordnungen
        if (wpData && wpData.length > 0) {
          const wpIds = wpData.map(wp => wp.id);
          const { data: wpaData } = await supabase
            .from('v7_work_package_assignments')
            .select('work_package_id, employee_id, planned_person_months')
            .in('work_package_id', wpIds)
            .eq('is_active', true);

          setWPAssignments(wpaData || []);
        }
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

  // Feiertage bei Jahr-Änderung aktualisieren
  useEffect(() => {
    if (company?.federal_state) {
      const h = getGermanHolidays(selectedYear, company.federal_state);
      setHolidays(h);
    }
  }, [selectedYear, company?.federal_state]);

  // ============================================
  // ZEITERFASSUNGS-ZEILEN AUFBAUEN + DATEN LADEN
  // ============================================

  useEffect(() => {
    if (!selectedEmployeeId || loading) {
      return;
    }

    const buildRowsAndLoadData = async () => {
      // Projekte finden, denen der MA zugeordnet ist
      const assignedProjectIds = projectAssignments
        .filter(pa => pa.employee_id === selectedEmployeeId)
        .map(pa => pa.project_id);

      // Arbeitspakete finden, denen der MA zugeordnet ist
      const assignedWPIds = wpAssignments
        .filter(wpa => wpa.employee_id === selectedEmployeeId)
        .map(wpa => wpa.work_package_id);

      // Zeilen erstellen für zugeordnete APs
      const rows: TimeEntryRow[] = [];

      workPackages.forEach(wp => {
        const isAssignedToWP = assignedWPIds.includes(wp.id);
        const isAssignedToProject = assignedProjectIds.includes(wp.project_id);

        if (isAssignedToWP || isAssignedToProject) {
          const project = projects.find(p => p.id === wp.project_id);
          if (project) {
            rows.push({
              workPackageId: wp.id,
              projectId: wp.project_id,
              projectName: project.name,
              apCode: wp.ap_code || `AP${wp.ap_number}`,
              apName: wp.name,
              days: {},
              sumHours: 0,
            });
          }
        }
      });

      // Bestehende Daten aus DB laden
      const startDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
      const endDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${getDaysInMonth(selectedYear, selectedMonth)}`;

      const { data: existingEntries, error: loadError } = await supabase
        .from('v7_timesheets')
        .select('*')
        .eq('employee_id', selectedEmployeeId)
        .gte('work_date', startDate)
        .lte('work_date', endDate)
        .eq('is_active', true);

      if (loadError) {
        console.error('Fehler beim Laden der Zeiteinträge:', loadError);
      }

      // Daten in Rows einfügen
      const newNonBillable: Record<number, { id?: string; hours: number }> = {};
      const newAbsences: Record<number, { id?: string; code: string }> = {};

      if (existingEntries) {
        existingEntries.forEach(entry => {
          const day = parseInt(entry.work_date.split('-')[2]);

          // Fehlzeit?
          if (entry.absence_code) {
            newAbsences[day] = { id: entry.id, code: entry.absence_code };
          }
          // Nicht-förderbare Stunden?
          else if (entry.is_billable === false && !entry.work_package_id) {
            newNonBillable[day] = { id: entry.id, hours: entry.hours };
          }
          // AP-Buchung
          else if (entry.work_package_id) {
            const rowIndex = rows.findIndex(r => r.workPackageId === entry.work_package_id);
            if (rowIndex >= 0) {
              rows[rowIndex].days[day] = {
                id: entry.id,
                hours: entry.hours,
                absenceCode: null,
              };
            }
          }
        });

        // Summen neu berechnen
        rows.forEach(row => {
          row.sumHours = Object.values(row.days)
            .reduce((sum, entry) => sum + (entry.hours || 0), 0);
        });
      }

      setTimeEntryRows(rows);
      setNonBillableHours(newNonBillable);
      setAbsences(newAbsences);
      setHasChanges(false);
    };

    buildRowsAndLoadData();
  }, [selectedEmployeeId, selectedYear, selectedMonth, projects, workPackages, projectAssignments, wpAssignments, loading, supabase]);

  // ============================================
  // HILFSFUNKTIONEN
  // ============================================

  const getDaysInMonth = (year: number, month: number): number => {
    return new Date(year, month, 0).getDate();
  };

  const getDayOfWeek = (year: number, month: number, day: number): number => {
    return new Date(year, month - 1, day).getDay();
  };

  const getDayName = (dayOfWeek: number): string => {
    const names = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
    return names[dayOfWeek];
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

  // ============================================
  // EINGABE-HANDLER
  // ============================================

  const handleHoursChange = (rowIndex: number, day: number, value: string) => {
    const numValue = value === '' ? null : parseFloat(value);
    
    setTimeEntryRows(prev => {
      const updated = [...prev];
      if (!updated[rowIndex].days[day]) {
        updated[rowIndex].days[day] = { hours: null, absenceCode: null };
      }
      updated[rowIndex].days[day].hours = numValue;
      
      // Summe neu berechnen
      updated[rowIndex].sumHours = Object.values(updated[rowIndex].days)
        .reduce((sum, entry) => sum + (entry.hours || 0), 0);
      
      return updated;
    });
    setHasChanges(true);
  };

  const handleAbsenceChange = (day: number, code: string | null) => {
    setAbsences(prev => {
      const updated = { ...prev };
      if (code) {
        updated[day] = { id: prev[day]?.id, code };
      } else {
        delete updated[day];
      }
      return updated;
    });
    setHasChanges(true);
  };

  const handleNonBillableChange = (day: number, value: string) => {
    const numValue = value === '' ? 0 : parseFloat(value);
    setNonBillableHours(prev => {
      if (numValue === 0) {
        const updated = { ...prev };
        delete updated[day];
        return updated;
      }
      return {
        ...prev,
        [day]: { id: prev[day]?.id, hours: numValue },
      };
    });
    setHasChanges(true);
  };

  // ============================================
  // KEYBOARD NAVIGATION (wie Excel)
  // ============================================

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    rowIndex: number,
    day: number
  ) => {
    const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
    let nextRow = rowIndex;
    let nextDay = day;

    switch (e.key) {
      case 'Tab':
      case 'Enter':
        e.preventDefault();
        if (day < daysInMonth) {
          nextDay = day + 1;
        } else if (rowIndex < timeEntryRows.length - 1) {
          nextRow = rowIndex + 1;
          nextDay = 1;
        }
        break;
      case 'ArrowRight':
        if (day < daysInMonth) nextDay = day + 1;
        break;
      case 'ArrowLeft':
        if (day > 1) nextDay = day - 1;
        break;
      case 'ArrowDown':
        if (rowIndex < timeEntryRows.length - 1) nextRow = rowIndex + 1;
        break;
      case 'ArrowUp':
        if (rowIndex > 0) nextRow = rowIndex - 1;
        break;
      default:
        return;
    }

    const cellKey = `${nextRow}-${nextDay}`;
    const nextCell = cellRefs.current.get(cellKey);
    if (nextCell) {
      nextCell.focus();
      nextCell.select();
    }
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
      const entriesToUpsert: any[] = [];
      const idsToKeep: string[] = [];

      // 1. AP-Buchungen sammeln
      timeEntryRows.forEach(row => {
        Object.entries(row.days).forEach(([dayStr, entry]) => {
          const day = parseInt(dayStr);
          if (entry.hours && entry.hours > 0) {
            const record = {
              employee_id: selectedEmployeeId,
              work_package_id: row.workPackageId,
              project_id: row.projectId,
              work_date: formatWorkDate(day),
              hours: entry.hours,
              is_billable: true,
              absence_code: null,
              data_source: 'manual',
              entered_by: userProfile.id,
              entered_at: now,
              is_active: true,
              updated_at: now,
            };
            
            if (entry.id) {
              entriesToUpsert.push({ id: entry.id, ...record });
              idsToKeep.push(entry.id);
            } else {
              entriesToUpsert.push(record);
            }
          } else if (entry.id) {
            // Wurde gelöscht (hours = 0 oder null) -> nicht behalten
          }
        });
      });

      // 2. Nicht-förderbare Stunden sammeln
      Object.entries(nonBillableHours).forEach(([dayStr, entry]) => {
        const day = parseInt(dayStr);
        if (entry.hours > 0) {
          const record = {
            employee_id: selectedEmployeeId,
            work_package_id: null,
            project_id: null,
            work_date: formatWorkDate(day),
            hours: entry.hours,
            is_billable: false,
            absence_code: null,
            data_source: 'manual',
            entered_by: userProfile.id,
            entered_at: now,
            is_active: true,
            updated_at: now,
          };
          
          if (entry.id) {
            entriesToUpsert.push({ id: entry.id, ...record });
            idsToKeep.push(entry.id);
          } else {
            entriesToUpsert.push(record);
          }
        }
      });

      // 3. Fehlzeiten sammeln
      Object.entries(absences).forEach(([dayStr, entry]) => {
        const day = parseInt(dayStr);
        const record = {
          employee_id: selectedEmployeeId,
          work_package_id: null,
          project_id: null,
          work_date: formatWorkDate(day),
          hours: 0,
          is_billable: false,
          absence_code: entry.code,
          data_source: 'manual',
          entered_by: userProfile.id,
          entered_at: now,
          is_active: true,
          updated_at: now,
        };
        
        if (entry.id) {
          entriesToUpsert.push({ id: entry.id, ...record });
          idsToKeep.push(entry.id);
        } else {
          entriesToUpsert.push(record);
        }
      });

      // 4. Alle alten Einträge dieses Monats deaktivieren die nicht mehr gebraucht werden
      const startDate = formatWorkDate(1);
      const endDate = formatWorkDate(getDaysInMonth(selectedYear, selectedMonth));

      // Erst alte Einträge laden
      const { data: existingEntries } = await supabase
        .from('v7_timesheets')
        .select('id')
        .eq('employee_id', selectedEmployeeId)
        .gte('work_date', startDate)
        .lte('work_date', endDate)
        .eq('is_active', true);

      // IDs die gelöscht werden sollen (nicht mehr in idsToKeep)
      const idsToDeactivate = existingEntries
        ?.filter(e => !idsToKeep.includes(e.id))
        .map(e => e.id) || [];

      // 5. Deaktivieren
      if (idsToDeactivate.length > 0) {
        const { error: deleteError } = await supabase
          .from('v7_timesheets')
          .update({ is_active: false, updated_at: now })
          .in('id', idsToDeactivate);

        if (deleteError) {
          throw new Error('Fehler beim Löschen alter Einträge: ' + deleteError.message);
        }
      }

      // 6. Upsert neue/geänderte Einträge
      for (const entry of entriesToUpsert) {
        if (entry.id) {
          // Update
          const { error: updateError } = await supabase
            .from('v7_timesheets')
            .update(entry)
            .eq('id', entry.id);

          if (updateError) {
            throw new Error('Fehler beim Update: ' + updateError.message);
          }
        } else {
          // Insert
          const { error: insertError } = await supabase
            .from('v7_timesheets')
            .insert(entry);

          if (insertError) {
            throw new Error('Fehler beim Speichern: ' + insertError.message);
          }
        }
      }

      setSuccessMessage(`✅ Zeiterfassung für ${MONTH_NAMES[selectedMonth - 1]} ${selectedYear} gespeichert!`);
      setHasChanges(false);
      setTimeout(() => setSuccessMessage(null), 4000);

      // Daten neu laden um IDs zu aktualisieren
      // (wird automatisch durch useEffect getriggert)

    } catch (err: any) {
      console.error('Speichern fehlgeschlagen:', err);
      setError('Fehler beim Speichern: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // ============================================
  // NAVIGATION MONAT
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

  // ============================================
  // BERECHNUNGEN
  // ============================================

  const getTotalBillableHours = (): number => {
    return timeEntryRows.reduce((sum, row) => sum + row.sumHours, 0);
  };

  const getTotalNonBillableHours = (): number => {
    return Object.values(nonBillableHours).reduce((sum, e) => sum + e.hours, 0);
  };

  const getTotalAbsenceDays = (): number => {
    return Object.keys(absences).length;
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header style={{ backgroundColor: COLORS.firmenPortal }} className="shadow-sm">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
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
              <div className="bg-white rounded-lg px-3 py-1.5 text-sm font-bold" style={{ color: COLORS.firmenPortal }}>
                PZE
              </div>
              <div>
                <h1 className="text-lg font-semibold text-white">Zeiterfassung</h1>
                <p className="text-sm text-green-100">{company?.name}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {hasChanges && (
                <span className="text-yellow-200 text-sm flex items-center gap-1">
                  <span className="w-2 h-2 bg-yellow-300 rounded-full animate-pulse"></span>
                  Ungespeichert
                </span>
              )}
              <span className="text-white text-sm">{userProfile?.display_name}</span>
              <button
                onClick={handleLogout}
                className="text-green-100 hover:text-white flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Abmelden
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Steuerung */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Mitarbeiter-Auswahl */}
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700">Mitarbeiter:</label>
              <select
                value={selectedEmployeeId}
                onChange={(e) => {
                  if (hasChanges && !confirm('Ungespeicherte Änderungen verwerfen?')) return;
                  setSelectedEmployeeId(e.target.value);
                }}
                disabled={!isAdmin && employees.length <= 1}
                className="border rounded-lg px-3 py-2 min-w-[200px] focus:ring-2 focus:ring-green-500"
              >
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.display_name}</option>
                ))}
              </select>
              {!isAdmin && (
                <span className="text-sm text-gray-500">(Sie selbst)</span>
              )}
            </div>

            {/* Monat-Navigation */}
            <div className="flex items-center gap-2">
              <button
                onClick={goToPreviousMonth}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="flex items-center gap-2">
                <select
                  value={selectedMonth}
                  onChange={(e) => {
                    if (hasChanges && !confirm('Ungespeicherte Änderungen verwerfen?')) return;
                    setSelectedMonth(parseInt(e.target.value));
                  }}
                  className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500"
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
                  className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500"
                >
                  {[2024, 2025, 2026, 2027].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={goToNextMonth}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Speichern */}
            <button
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className={`px-6 py-2 rounded-lg flex items-center gap-2 ${
                hasChanges 
                  ? 'bg-green-600 text-white hover:bg-green-700' 
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              } disabled:opacity-50`}
            >
              {saving ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
              Speichern
            </button>
          </div>
        </div>
      </div>

      {/* Fehlermeldung / Erfolg */}
      {error && (
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        </div>
      )}
      {successMessage && (
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            {successMessage}
          </div>
        </div>
      )}

      {/* Legende */}
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 mt-4">
        <div className="bg-white rounded-lg shadow p-3 flex flex-wrap items-center gap-4 text-sm">
          <span className="font-medium text-gray-700">Legende:</span>
          <span className="flex items-center gap-1">
            <span className="w-6 h-6 bg-gray-200 rounded"></span> Wochenende
          </span>
          <span className="flex items-center gap-1">
            <span className="w-6 h-6 bg-orange-200 rounded"></span> Feiertag
          </span>
          {Object.entries(ABSENCE_CODES).filter(([code]) => code !== 'F').map(([code, { label, color }]) => (
            <span key={code} className="flex items-center gap-1">
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${color}`}>{code}</span> {label}
            </span>
          ))}
        </div>
      </div>

      {/* Zeiterfassungs-Tabelle */}
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="sticky left-0 bg-gray-50 px-2 py-2 text-left font-medium text-gray-700 border-b min-w-[200px] z-10">
                  Arbeitspaket
                </th>
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                  const weekend = isWeekend(selectedYear, selectedMonth, day);
                  const holiday = isHoliday(selectedYear, selectedMonth, day);
                  const dayName = getDayName(getDayOfWeek(selectedYear, selectedMonth, day));
                  
                  return (
                    <th
                      key={day}
                      className={`px-1 py-2 text-center font-medium border-b min-w-[40px] ${
                        holiday ? 'bg-orange-100' : weekend ? 'bg-gray-200' : 'bg-gray-50'
                      }`}
                      title={holiday || undefined}
                    >
                      <div className="text-xs text-gray-500">{dayName}</div>
                      <div>{day}</div>
                    </th>
                  );
                })}
                <th className="px-2 py-2 text-center font-medium text-gray-700 border-b bg-gray-100 min-w-[60px]">
                  Σ
                </th>
              </tr>
            </thead>
            <tbody>
              {/* 1. Förderbare Arbeiten */}
              <tr className="bg-green-50">
                <td colSpan={daysInMonth + 2} className="px-2 py-2 font-semibold text-green-800 border-b">
                  1. Förderbare Arbeiten
                </td>
              </tr>
              
              {timeEntryRows.length === 0 ? (
                <tr>
                  <td colSpan={daysInMonth + 2} className="px-4 py-8 text-center text-gray-500">
                    Keine Arbeitspakete zugeordnet. Bitte wenden Sie sich an Ihren Berater.
                  </td>
                </tr>
              ) : (
                timeEntryRows.map((row, rowIndex) => (
                  <tr key={row.workPackageId} className="hover:bg-gray-50">
                    <td className="sticky left-0 bg-white px-2 py-1 border-b z-10">
                      <div className="font-medium text-green-700">{row.apCode}</div>
                      <div className="text-xs text-gray-500 truncate max-w-[180px]" title={row.apName}>
                        {row.apName}
                      </div>
                    </td>
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                      const weekend = isWeekend(selectedYear, selectedMonth, day);
                      const holiday = isHoliday(selectedYear, selectedMonth, day);
                      const absence = absences[day];
                      const disabled = weekend || !!holiday || !!absence;
                      const cellKey = `${rowIndex}-${day}`;
                      
                      return (
                        <td
                          key={day}
                          className={`px-0.5 py-0.5 border-b text-center ${
                            holiday ? 'bg-orange-50' : weekend ? 'bg-gray-100' : ''
                          }`}
                        >
                          <input
                            ref={(el) => {
                              if (el) cellRefs.current.set(cellKey, el);
                            }}
                            type="number"
                            min="0"
                            max="24"
                            step="0.25"
                            value={row.days[day]?.hours ?? ''}
                            onChange={(e) => handleHoursChange(rowIndex, day, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, rowIndex, day)}
                            disabled={disabled}
                            className={`w-full h-8 text-center text-sm border rounded focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                              disabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white'
                            }`}
                          />
                        </td>
                      );
                    })}
                    <td className="px-2 py-1 border-b text-center font-semibold bg-gray-50">
                      {row.sumHours > 0 ? row.sumHours.toFixed(2) : '-'}
                    </td>
                  </tr>
                ))
              )}

              {/* Summe förderbare Stunden */}
              <tr className="bg-green-100 font-semibold">
                <td className="sticky left-0 bg-green-100 px-2 py-2 border-b z-10">
                  Σ Förderbare Stunden
                </td>
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                  const dayTotal = timeEntryRows.reduce((sum, row) => sum + (row.days[day]?.hours || 0), 0);
                  return (
                    <td key={day} className="px-1 py-2 border-b text-center text-green-800">
                      {dayTotal > 0 ? dayTotal.toFixed(1) : '-'}
                    </td>
                  );
                })}
                <td className="px-2 py-2 border-b text-center text-green-800 bg-green-200">
                  {getTotalBillableHours().toFixed(2)}
                </td>
              </tr>

              {/* 2. Nicht zuschussfähige Arbeiten */}
              <tr className="bg-yellow-50">
                <td colSpan={daysInMonth + 2} className="px-2 py-2 font-semibold text-yellow-800 border-b">
                  2. Nicht zuschussfähige Arbeiten
                </td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="sticky left-0 bg-white px-2 py-1 border-b z-10">
                  <div className="text-gray-700">Sonstige Arbeiten</div>
                </td>
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                  const weekend = isWeekend(selectedYear, selectedMonth, day);
                  const holiday = isHoliday(selectedYear, selectedMonth, day);
                  const absence = absences[day];
                  const disabled = weekend || !!holiday || !!absence;
                  
                  return (
                    <td
                      key={day}
                      className={`px-0.5 py-0.5 border-b text-center ${
                        holiday ? 'bg-orange-50' : weekend ? 'bg-gray-100' : ''
                      }`}
                    >
                      <input
                        type="number"
                        min="0"
                        max="24"
                        step="0.25"
                        value={nonBillableHours[day]?.hours || ''}
                        onChange={(e) => handleNonBillableChange(day, e.target.value)}
                        disabled={disabled}
                        className={`w-full h-8 text-center text-sm border rounded focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 ${
                          disabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white'
                        }`}
                      />
                    </td>
                  );
                })}
                <td className="px-2 py-1 border-b text-center font-semibold bg-yellow-50">
                  {getTotalNonBillableHours() > 0 ? getTotalNonBillableHours().toFixed(2) : '-'}
                </td>
              </tr>

              {/* 3. Fehlzeiten */}
              <tr className="bg-blue-50">
                <td colSpan={daysInMonth + 2} className="px-2 py-2 font-semibold text-blue-800 border-b">
                  3. Fehlzeiten (U=Urlaub, K=Krankheit, S=Sonderurlaub)
                </td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="sticky left-0 bg-white px-2 py-1 border-b z-10">
                  <div className="text-gray-700">Fehlzeit-Code</div>
                </td>
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                  const weekend = isWeekend(selectedYear, selectedMonth, day);
                  const holiday = isHoliday(selectedYear, selectedMonth, day);
                  const currentAbsence = absences[day]?.code || '';
                  
                  if (holiday) {
                    return (
                      <td key={day} className="px-0.5 py-0.5 border-b text-center bg-orange-100">
                        <span className="text-xs font-medium text-orange-700">F</span>
                      </td>
                    );
                  }
                  
                  if (weekend) {
                    return (
                      <td key={day} className="px-0.5 py-0.5 border-b text-center bg-gray-100">
                        -
                      </td>
                    );
                  }
                  
                  return (
                    <td key={day} className="px-0.5 py-0.5 border-b text-center">
                      <select
                        value={currentAbsence}
                        onChange={(e) => handleAbsenceChange(day, e.target.value || null)}
                        className="w-full h-8 text-center text-sm border rounded focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">-</option>
                        <option value="U">U</option>
                        <option value="K">K</option>
                        <option value="S">S</option>
                      </select>
                    </td>
                  );
                })}
                <td className="px-2 py-1 border-b text-center font-semibold bg-blue-50">
                  {getTotalAbsenceDays()} Tage
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Feiertage im Monat */}
      {Array.from(holidays.entries()).filter(([dateStr]) => {
        const [y, m] = dateStr.split('-').map(Number);
        return y === selectedYear && m === selectedMonth;
      }).length > 0 && (
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 pb-4">
          <div className="bg-orange-50 rounded-lg p-3 text-sm">
            <span className="font-medium text-orange-800">🎉 Feiertage im {MONTH_NAMES[selectedMonth - 1]}:</span>
            {Array.from(holidays.entries())
              .filter(([dateStr]) => {
                const [y, m] = dateStr.split('-').map(Number);
                return y === selectedYear && m === selectedMonth;
              })
              .map(([dateStr, name]) => (
                <span key={dateStr} className="ml-3 px-2 py-0.5 bg-orange-200 text-orange-800 rounded">
                  {parseInt(dateStr.split('-')[2])}. - {name}
                </span>
              ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t mt-8">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-sm text-gray-500">
            Projektzeiterfassung v7.3 · Firmen-Portal · © {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
}
