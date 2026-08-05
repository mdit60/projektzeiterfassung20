// src/app/v7/firma/mein-status/page.tsx
// ============================================================================
// PZE V7 - Mein Status (Firmen-Portal)
// ============================================================================
// Version: 7.4.4-18
// v7.4.4-18: Foerder-Badge BMBF_KMU -> 'KMU-innovativ'; Fall 'OTHER' -> 'Sonstige'.
// v7.4.4-17: ASCII-Konformitaet - Umlaute in Kommentaren als ae/oe/ue
// v7.4.4-16: CRITICAL FIX: .limit(10000) auf v7_timesheets-Query (Supabase 1000-Zeilen-Limit)
// v7.4.4-15: ZA und Legende naher zusammen, Legende einzeilig kompakt
// v7.4.4-14: Abstaende weiter reduziert fuer bessere ZA-Sichtbarkeit
// v7.4.4-13: Kennzahlen neben ZE-Header, Warnbalken weg, Kontrast Buttons, Abstaende kompakter
// v7.4.4-12: Navigation MA vereinfacht, Kennzahlen in Projektzeile
//   - Download-Buttons entfernt (jetzt im Hilfe-Dropdown der PortalNav)
//   - 4 Kennzahl-Kacheln entfernt
//   - Kennzahlen als kompakte Statuszeile je Projekt eingefuegt
//   - Kontrast: text-gray-400/500 -> text-gray-700 durchgaengig
// v7.4.4-11: FIX: Download-Link Firmen-Administrator korrigiert
//   - Pfad: PZE_Schnellstart_Firmen-Administrator.pdf -> PZE_Anleitung_Firmen-Administrator.pdf
//   - Label: "Schnellstart-Anleitung Firmen-Administrator" -> "Anleitung Firmen-Administrator"
//   - Grund: Datei existiert im public/manuals/ als "Anleitung_...", nicht als "Schnellstart_..."
//   - 404-Fehler bei Download ist damit behoben
// v7.4.4-10: NEU: Offene Rueckfragen-Abschnitt fuer Admin/PL
//   - Laedt offene v7_timesheet_notes der eigenen Firma
//   - Tabelle mit MA/Projekt/Monat/Notiz + Direktlink zur ZE
//   - Nur sichtbar fuer client_admin und project_leader
// v7.4.4-8: FIX: Monatsstatus grueen wenn Completion-Flag gesetzt
//   Laedt v7_timesheet_completions und verwendet es als primaeren Status
// Datum: 23. Maerz 2026
//
// v7.4.4-6: Download-Link Projektleiter auf PZE_Anleitung_Projektleiter.pdf aktualisiert
//
// v7.4.4-5: FIX: isAdminOrPL prueft userPortalRole statt profile.role
//   - profile.role ist fuer alle Firmen-User 'client_user', nie 'client_admin'
//   - client_admin-Rolle kommt aus v7_employees.portal_role -> userPortalRole
//   - Dadurch wurde ZA-Abfrage nie ausgefuehrt -> Ampel zeigte altes Datum
//
// v7.4.4-4: ZA-Ampel: Faelligkeit aus echten ZA-Daten berechnen
//   - Laedt v7_zahlungsanforderungen beim Start
//   - Naechste Faelligkeit = zeitraum_bis der letzten ZA mit Status
//     'eingereicht' oder 'bewilligt' + 3 Monate
//   - Fallback-Kette: eingereichte ZA -> naechste_za_faellig (DB) -> start_date + 3 Monate
//   - ZA-Ampel zeigt auch Status der letzten eingereichten ZA an
//   - Keine manuelle Pflege von naechste_za_faellig mehr noetig
//
// v7.4.4-3: NEU: ZA-Ampel-Kachel fuer ZIM-Projekte (Step 5 ZA-Modul)
//   - Neue Sektion "Naechste Zahlungsanforderung" nach den Projekt-Karten
//   - Ampellogik: GRUEN (>30 Tage), GELB (<=30 Tage), ROT (<=14 Tage)
//   - Nur fuer ZIM-Projekte (funding_format beginnt mit 'ZIM')
//   - Spalten: Projekt / ZA faellig / Stunden vollstaendig / Status
//   - Klick auf "Zur ZA" navigiert zu /v7/firma/berichte?panel=za
//   - Nur sichtbar fuer client_admin und project_leader
//
// v7.3.95-5: FAQ Zeiterfassung als zweiter PDF-Download-Link
// v7.3.95-4: FIX: Timesheet-Query mit is_active=true Filter
// v7.3.95-3: Ampel-Logik korrigiert
// v7.3.91: Initiale Version
// ============================================================================

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import PortalHeader from '@/components/shared/PortalHeader';
import PortalNav from '@/components/shared/PortalNav';
import {
  BarChart3,
  FolderKanban,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  Calendar,
  ChevronRight,
  AlertCircle,
  TrendingUp,
  Download,
  Receipt,
  MessageCircle,
} from 'lucide-react';

// ============================================================================
// TYPEN
// ============================================================================

type PortalRole = 'client_admin' | 'project_leader' | 'employee';

interface UserProfile {
  id: string;
  email: string;
  display_name: string | null;
  role: string;
  client_company_id: string | null;
}

interface ClientCompany {
  id: string;
  name: string;
  federal_state: string | null;
}

interface Project {
  id: string;
  name: string;
  short_name: string | null;
  funding_format: string | null;
  funding_reference: string | null;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  naechste_za_faellig: string | null;
}

interface TimesheetEntry {
  id: string;
  project_id: string;
  employee_id: string;
  work_date: string;
  hours: number;
  day_type: string | null;
}

interface ProjectAssignment {
  id: string;
  project_id: string;
  employee_id: string;
  assignment_start: string | null;
  assignment_end: string | null;
}

interface Employee {
  id: string;
}

type MonthStatus = 'complete' | 'partial' | 'missing' | 'future' | 'outside';

interface MonthData {
  year: number;
  month: number;
  status: MonthStatus;
  hoursRecorded: number;
  workingDays: number;
  daysRecorded: number;
}

interface ProjectStatus {
  project: Project;
  months: MonthData[];
  totalMonths: number;
  completeMonths: number;
  partialMonths: number;
  missingMonths: number;
}

// ZA-Ampel fuer ein Projekt
interface ZARecord {
  id: string;
  project_id: string;
  za_nummer: number;
  zeitraum_bis: string;
  status: string | null;
}

interface ZAStatus {
  project: Project;
  faelligDate: Date | null;
  daysUntilDue: number | null;
  allEmployeesComplete: boolean;
  totalEmployees: number;
  completeEmployees: number;
  ampel: 'gruen' | 'gelb' | 'rot';
  letzteZA: ZARecord | null;
}

// ============================================================================
// HILFSFUNKTIONEN: FEIERTAGE
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

const getGermanHolidays = (year: number, stateCode: string): Map<string, string> => {
  const holidays = new Map<string, string>();
  const easter = getEasterSunday(year);

  const formatDate = (d: Date): string => {
    const y = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const dy = String(d.getDate()).padStart(2, '0');
    return `${y}-${mo}-${dy}`;
  };

  const addDays = (d: Date, days: number): Date => {
    const r = new Date(d);
    r.setDate(d.getDate() + days);
    return r;
  };

  holidays.set(`${year}-01-01`, 'Neujahr');
  holidays.set(formatDate(addDays(easter, -2)), 'Karfreitag');
  holidays.set(formatDate(addDays(easter, 1)), 'Ostermontag');
  holidays.set(`${year}-05-01`, 'Tag der Arbeit');
  holidays.set(formatDate(addDays(easter, 39)), 'Chr. Himmelfahrt');
  holidays.set(formatDate(addDays(easter, 50)), 'Pfingstmontag');
  holidays.set(`${year}-10-03`, 'Tag d. Dt. Einheit');
  holidays.set(`${year}-12-25`, '1. Weihnachtstag');
  holidays.set(`${year}-12-26`, '2. Weihnachtstag');

  if (['DE-BW', 'DE-BY', 'DE-ST'].includes(stateCode || '')) {
    holidays.set(`${year}-01-06`, 'Hl. Drei Koenige');
  }
  if (['DE-BW', 'DE-BY', 'DE-HE', 'DE-NW', 'DE-RP', 'DE-SL'].includes(stateCode || '')) {
    holidays.set(formatDate(addDays(easter, 60)), 'Fronleichnam');
  }
  if (['DE-BB', 'DE-HB', 'DE-HH', 'DE-MV', 'DE-NI', 'DE-SN', 'DE-ST', 'DE-SH', 'DE-TH'].includes(stateCode || '')) {
    holidays.set(`${year}-10-31`, 'Reformationstag');
  }
  if (['DE-BW', 'DE-BY', 'DE-NW', 'DE-RP', 'DE-SL'].includes(stateCode || '')) {
    holidays.set(`${year}-11-01`, 'Allerheiligen');
  }
  if (['DE-SN'].includes(stateCode || '')) {
    holidays.set(formatDate(addDays(easter, -1)), 'Buss- und Bettag');
  }

  return holidays;
};

const getWorkingDaysInMonth = (year: number, month: number, holidays: Map<string, string>): number => {
  const daysInMonth = new Date(year, month, 0).getDate();
  let workingDays = 0;
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    const dayOfWeek = date.getDay();
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;
    if (holidays.has(dateStr)) continue;
    workingDays++;
  }
  return workingDays;
};

// ============================================================================
// WEITERE HILFSFUNKTIONEN
// ============================================================================

const getMonthName = (month: number): string => {
  const months = ['Jan', 'Feb', 'Mrz', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
  return months[month - 1] || '';
};

const getMonthNameFull = (month: number): string => {
  const months = [
    'Januar', 'Februar', 'Maerz', 'April', 'Mai', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
  ];
  return months[month - 1] || '';
};

const getFundingBadge = (format: string | null): { label: string; color: string } => {
  switch (format) {
    case 'ZIM_EINZEL':      return { label: 'ZIM Einzel',        color: 'bg-blue-100 text-blue-700' };
    case 'ZIM_KOOP':        return { label: 'ZIM Kooperation',   color: 'bg-blue-100 text-blue-700' };
    case 'ZIM_NETZWERK':    return { label: 'ZIM Netzwerk',      color: 'bg-purple-100 text-purple-700' };
    case 'ZIM_DURCHFUEHRBARKEIT': return { label: 'ZIM Durchf.studie', color: 'bg-indigo-100 text-indigo-700' };
    case 'BMBF_KMU':        return { label: 'KMU-innovativ', color: 'bg-teal-100 text-teal-700' };
    case 'OTHER':           return { label: 'Sonstige', color: 'bg-gray-100 text-gray-700' };
    default:                return { label: format || 'Sonstiges', color: 'bg-gray-100 text-gray-700' };
  }
};

const formatDateDE = (dateStr: string | null): string => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
};

// Tage zwischen heute und einem Datum (positiv = in der Zukunft)
const daysDiff = (date: Date): number => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
};

// ============================================================================
// KOMPONENTE
// ============================================================================

export default function MeinStatusPage() {
  const router = useRouter();
  const supabase = createClient();

  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [company, setCompany] = useState<ClientCompany | null>(null);
  const [portalRole, setPortalRole] = useState<PortalRole>('employee');
  const [currentEmployeeId, setCurrentEmployeeId] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [assignments, setAssignments] = useState<ProjectAssignment[]>([]);
  const [timesheets, setTimesheets] = useState<TimesheetEntry[]>([]);
  // Fuer ZA-Ampel: alle MA der Firma + deren Projektbelegungen
  const [allProjectEmployees, setAllProjectEmployees] = useState<Record<string, string[]>>({});
  // Fuer ZA-Ampel: eingereichte/bewilligte ZAs pro Projekt
  const [zaRecords, setZARecords] = useState<ZARecord[]>([]);
  const [completions, setCompletions] = useState<{employee_id: string; project_id: string; year: number; month: number}[]>([]);
  // NEU v7.4.4-10: Offene Rueckfragen
  const [offeneNotizen, setOffeneNotizen] = useState<{id: string; employee_id: string; project_id: string; year: number; month: number; note_text: string; employee_name: string; project_name: string}[]>([]);
  // NEU v7.4.4-10: Employment-Daten fuer Monats-Einschraenkung
  const [employmentStart, setEmploymentStart] = useState<string | null>(null);
  const [employmentEnd, setEmploymentEnd] = useState<string | null>(null);

  // ============================================================================
  // DATEN LADEN
  // ============================================================================

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        // 1. Auth
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/v7/login');
          return;
        }

        // 2. User-Profil
        const { data: profile, error: profileError } = await supabase
          .from('v7_user_profiles')
          .select('id, email, display_name, role, client_company_id')
          .eq('email', user.email)
          .maybeSingle();

        if (profileError || !profile) {
          setError('Kein Benutzerprofil gefunden');
          return;
        }

        if (!profile.client_company_id) {
          setError('Keine Firma zugeordnet. Bitte melden Sie sich mit einem Firmen-Account an.');
          return;
        }

        setUserProfile(profile);
        const companyId = profile.client_company_id;

        // 3. Company
        const { data: companyData, error: companyError } = await supabase
          .from('v7_client_companies')
          .select('id, name, federal_state')
          .eq('id', companyId)
          .single();

        if (companyError || !companyData) {
          setError('Firma nicht gefunden');
          return;
        }
        setCompany(companyData);

        // 4. Portal-Rolle ermitteln
        const { data: employeeRecord } = await supabase
          .from('v7_employees')
          .select('id, user_id, portal_role, employment_start, employment_end')
          .eq('client_company_id', companyId)
          .eq('user_id', user.id)
          .maybeSingle();

        let userPortalRole: PortalRole = 'employee';
        let userEmployeeId: string | null = null;

        if (profile.role === 'client_admin') {
          userPortalRole = 'client_admin';
          if (employeeRecord) {
            userEmployeeId = employeeRecord.id;
          }
        } else if (employeeRecord) {
          userPortalRole = (employeeRecord.portal_role as PortalRole) || 'employee';
          userEmployeeId = employeeRecord.id;
        }

        setPortalRole(userPortalRole);
        setCurrentEmployeeId(userEmployeeId);
        // NEU v7.4.4-10: employment_start fuer Monats-Einschraenkung
        setEmploymentStart(employeeRecord?.employment_start || null);
        setEmploymentEnd(employeeRecord?.employment_end || null);

        // 5. Projekte laden (inkl. naechste_za_faellig)
        const { data: projectsData } = await supabase
          .from('v7_projects')
          .select('id, name, short_name, funding_format, funding_reference, start_date, end_date, is_active, naechste_za_faellig')
          .eq('client_company_id', companyId)
          .eq('is_active', true);

        const loadedProjects = (projectsData || []) as Project[];
        setProjects(loadedProjects);

        const projectIds = loadedProjects.map((p) => p.id);

        // 6. Eigene Projekt-Zuordnungen
        if (projectIds.length > 0 && userEmployeeId) {
          const { data: assignmentData } = await supabase
            .from('v7_project_assignments')
            .select('id, project_id, employee_id, assignment_start, assignment_end')
            .in('project_id', projectIds)
            .eq('employee_id', userEmployeeId)
            .eq('is_active', true);

          setAssignments(assignmentData || []);

          // 7. Eigene Zeiterfassungen
          const { data: timesheetData } = await supabase
            .from('v7_timesheets')
            .select('id, project_id, employee_id, work_date, hours, day_type')
            .eq('employee_id', userEmployeeId)
            .eq('is_active', true)
            .in('project_id', projectIds)
            .limit(10000);

          setTimesheets(timesheetData || []);

          // Completions fuer diesen MA laden
          if (projectIds.length > 0) {
            const { data: completionData } = await supabase
              .from('v7_timesheet_completions')
              .select('employee_id, project_id, year, month')
              .eq('employee_id', userEmployeeId)
              .in('project_id', projectIds);
            setCompletions(completionData || []);
          }
        } else if (userPortalRole === 'client_admin' && !userEmployeeId) {
          setAssignments([]);
          setTimesheets([]);
        }

        // 8. ZA-Ampel: alle MA pro ZIM-Projekt laden (fuer client_admin + project_leader)
        // WICHTIG: Rolle kommt aus userPortalRole (basiert auf v7_employees.portal_role)
        // NICHT aus profile.role (das ist immer 'client_user' fuer Firmen-User)
        const isAdminOrPL = userPortalRole === 'client_admin' || userPortalRole === 'project_leader';
        const zimProjectIds = loadedProjects
          .filter((p) => (p.funding_format || '').startsWith('ZIM'))
          .map((p) => p.id);

        if (isAdminOrPL && zimProjectIds.length > 0) {
          const { data: allAssignments } = await supabase
            .from('v7_project_assignments')
            .select('project_id, employee_id')
            .in('project_id', zimProjectIds)
            .eq('is_active', true);

          // Map: project_id -> employee_id[]
          const empMap: Record<string, string[]> = {};
          (allAssignments || []).forEach((a) => {
            if (!empMap[a.project_id]) empMap[a.project_id] = [];
            if (!empMap[a.project_id].includes(a.employee_id)) {
              empMap[a.project_id].push(a.employee_id);
            }
          });
          setAllProjectEmployees(empMap);

          // 9. ZA-Daten laden fuer Faelligkeitsberechnung
          // Nur ZAs mit Status eingereicht oder bewilligt
          const { data: zaData } = await supabase
            .from('v7_zahlungsanforderungen')
            .select('id, project_id, za_nummer, zeitraum_bis, status')
            .in('project_id', zimProjectIds)
            .in('status', ['eingereicht', 'bewilligt'])
            .order('za_nummer', { ascending: true });

          setZARecords(zaData || []);
        }

        // NEU v7.4.4-10: Offene Rueckfragen laden (nur fuer Admin/PL)
        if (isAdminOrPL && projectIds.length > 0) {
          const { data: notesRaw } = await supabase
            .from('v7_timesheet_notes')
            .select('id, employee_id, project_id, year, month, note_text')
            .in('project_id', projectIds)
            .eq('status', 'offen');

          if (notesRaw && notesRaw.length > 0) {
            // MA-Namen laden
            const noteEmpIds = [...new Set(notesRaw.map(n => n.employee_id))];
            const { data: noteEmps } = await supabase
              .from('v7_employees')
              .select('id, display_name')
              .in('id', noteEmpIds);

            setOffeneNotizen(notesRaw.map(n => {
              const emp = (noteEmps || []).find(e => e.id === n.employee_id);
              const proj = loadedProjects.find(p => p.id === n.project_id);
              return {
                id: n.id,
                employee_id: n.employee_id,
                project_id: n.project_id,
                year: n.year,
                month: n.month,
                note_text: n.note_text,
                employee_name: emp?.display_name || '?',
                project_name: proj?.short_name || proj?.name || '?',
              };
            }));
          }
        }

      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unbekannter Fehler';
        console.error('Fehler beim Laden:', message);
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [router, supabase]);

  // ============================================================================
  // PROJEKT-STATUS BERECHNEN (Zeiterfassung-Ampel)
  // ============================================================================

  const projectStatuses: ProjectStatus[] = useMemo(() => {
    if (!company || projects.length === 0) return [];

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    const assignedProjectIds = new Set((assignments || []).map((a) => a.project_id));
    const relevantProjects = currentEmployeeId
      ? (projects || []).filter((p) => assignedProjectIds.has(p.id))
      : [];

    return relevantProjects.map((project) => {
      const startDate = project.start_date ? new Date(project.start_date) : null;
      const endDate = project.end_date ? new Date(project.end_date) : null;

      const startYear = startDate ? startDate.getFullYear() : currentYear;
      const startMonth = startDate ? startDate.getMonth() + 1 : 1;
      const endYear = endDate ? endDate.getFullYear() : currentYear;
      const endMonth = endDate ? endDate.getMonth() + 1 : 12;

      // NEU v7.4.4-10: Fruehester erlaubter Monat fuer diesen MA
      // = Maximum aus employment_start und assignment_start
      const myAssignment = (assignments || []).find(a => a.project_id === project.id);
      const dateLimits: string[] = [];
      if (employmentStart) dateLimits.push(employmentStart);
      if (myAssignment?.assignment_start) dateLimits.push(myAssignment.assignment_start);
      const latestStart = dateLimits.length > 0 ? dateLimits.sort().pop()! : null;
      const firstAllowedYear = latestStart ? parseInt(latestStart.split('-')[0]) : 0;
      const firstAllowedMonth = latestStart ? parseInt(latestStart.split('-')[1]) : 0;

      // Spaetester erlaubter Monat
      const endLimits: string[] = [];
      if (employmentEnd) endLimits.push(employmentEnd);
      if (myAssignment?.assignment_end) endLimits.push(myAssignment.assignment_end);
      const earliestEnd = endLimits.length > 0 ? endLimits.sort()[0] : null;
      const lastAllowedYear = earliestEnd ? parseInt(earliestEnd.split('-')[0]) : 9999;
      const lastAllowedMonth = earliestEnd ? parseInt(earliestEnd.split('-')[1]) : 12;

      const months: MonthData[] = [];
      let completeCount = 0;
      let partialCount = 0;
      let missingCount = 0;

      for (let y = startYear; y <= endYear; y++) {
        const mStart = y === startYear ? startMonth : 1;
        const mEnd = y === endYear ? endMonth : 12;

        for (let m = mStart; m <= mEnd; m++) {
          const isFuture = y > currentYear || (y === currentYear && m > currentMonth);

          // NEU v7.4.4-10: Monat ausserhalb des erlaubten Bereichs?
          const monthVal = y * 12 + m;
          const minVal = firstAllowedYear * 12 + firstAllowedMonth;
          const maxVal = lastAllowedYear * 12 + lastAllowedMonth;
          const isOutside = latestStart ? monthVal < minVal : false;
          const isAfterEnd = earliestEnd ? monthVal > maxVal : false;

          const holidays = getGermanHolidays(y, company.federal_state || '');
          const workingDays = getWorkingDaysInMonth(y, m, holidays);

          const monthTimesheets = (timesheets || []).filter((t) => {
            if (t.project_id !== project.id) return false;
            const d = new Date(t.work_date);
            return d.getFullYear() === y && d.getMonth() + 1 === m;
          });

          const hoursRecorded = monthTimesheets.reduce((sum, t) => sum + (t.hours || 0), 0);
          const daysRecorded = new Set(
            monthTimesheets.filter((t) => (t.hours || 0) > 0).map((t) => t.work_date)
          ).size;

          // Completion-Flag aus v7_timesheet_completions hat Prioritaet
          const isCompleted = completions.some(c =>
            c.project_id === project.id &&
            c.year === y &&
            c.month === m
          );

          let status: MonthStatus = 'missing';
          if (isOutside || isAfterEnd) {
            status = 'outside';
          } else if (isFuture) {
            status = 'future';
          } else if (isCompleted) {
            status = 'complete';
            completeCount++;
          } else if (hoursRecorded > 0 && daysRecorded >= workingDays) {
            status = 'complete';
            completeCount++;
          } else if (hoursRecorded > 0) {
            status = 'partial';
            partialCount++;
          } else {
            status = 'missing';
            missingCount++;
          }

          months.push({ year: y, month: m, status, hoursRecorded, workingDays, daysRecorded });
        }
      }

      const pastMonths = months.filter((m) => m.status !== 'future' && m.status !== 'outside').length;

      return {
        project,
        months,
        totalMonths: pastMonths,
        completeMonths: completeCount,
        partialMonths: partialCount,
        missingMonths: missingCount,
      };
    });
  }, [projects, assignments, timesheets, company, currentEmployeeId, completions, employmentStart, employmentEnd]);

  // ============================================================================
  // GESAMT-STATISTIK
  // ============================================================================

  const totalStats = useMemo(() => {
    let total = 0; let complete = 0; let partial = 0; let missing = 0;
    (projectStatuses || []).forEach((ps) => {
      total += ps.totalMonths;
      complete += ps.completeMonths;
      partial += ps.partialMonths;
      missing += ps.missingMonths;
    });
    return { total, complete, partial, missing };
  }, [projectStatuses]);

  // ============================================================================
  // ZA-AMPEL BERECHNEN
  // ============================================================================

  const zaStatuses: ZAStatus[] = useMemo(() => {
    const isAdminOrPL = portalRole === 'client_admin' || portalRole === 'project_leader';
    if (!isAdminOrPL) return [];

    const zimProjects = (projects || []).filter((p) => (p.funding_format || '').startsWith('ZIM'));
    if (zimProjects.length === 0) return [];

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    return zimProjects.map((project) => {
      // Letzte eingereichte oder bewilligte ZA fuer dieses Projekt
      const projektZAs = (zaRecords || []).filter((z) => z.project_id === project.id);
      const letzteZA = projektZAs.length > 0
        ? projektZAs[projektZAs.length - 1]
        : null;

      // Faelligkeits-Berechnung (Prioritaet):
      // 1. zeitraum_bis der letzten eingereichten/bewilligten ZA + 3 Monate
      // 2. naechste_za_faellig aus v7_projects (manuell gesetzt)
      // 3. start_date + 3 Monate (absoluter Fallback)
      let faelligDate: Date | null = null;
      if (letzteZA) {
        const bis = new Date(letzteZA.zeitraum_bis);
        faelligDate = new Date(bis.getFullYear(), bis.getMonth() + 3, bis.getDate());
      } else if (project.naechste_za_faellig) {
        faelligDate = new Date(project.naechste_za_faellig);
      } else if (project.start_date) {
        const sd = new Date(project.start_date);
        faelligDate = new Date(sd.getFullYear(), sd.getMonth() + 3, sd.getDate());
      }

      const daysUntilDue = faelligDate ? daysDiff(faelligDate) : null;

      // Stunden-Vollstaendigkeit: alle MA des Projekts im aktuellen Monat
      const projectEmps = allProjectEmployees[project.id] || [];
      const totalEmployees = projectEmps.length;

      const completeEmployees = projectEmps.filter((empId) => {
        return (timesheets || []).some((t) => {
          if (t.project_id !== project.id) return false;
          if (t.employee_id !== empId) return false;
          const d = new Date(t.work_date);
          return d.getFullYear() === currentYear && d.getMonth() + 1 === currentMonth;
        });
      }).length;

      const allEmployeesComplete = totalEmployees > 0 && completeEmployees >= totalEmployees;

      // Ampellogik
      let ampel: 'gruen' | 'gelb' | 'rot' = 'gruen';
      if (daysUntilDue !== null) {
        if (daysUntilDue <= 14 || (!allEmployeesComplete && daysUntilDue <= 30)) {
          ampel = 'rot';
        } else if (daysUntilDue <= 30 || !allEmployeesComplete) {
          ampel = 'gelb';
        } else {
          ampel = 'gruen';
        }
      }

      return { project, faelligDate, daysUntilDue, allEmployeesComplete, totalEmployees, completeEmployees, ampel, letzteZA };
    });
  }, [projects, portalRole, allProjectEmployees, timesheets, zaRecords]);

  // ============================================================================
  // NAVIGATION
  // ============================================================================

  const navigateToTimesheet = (year: number, month: number) => {
    const params = new URLSearchParams();
    if (currentEmployeeId) params.set('employee', currentEmployeeId);
    params.set('year', String(year));
    params.set('month', String(month));
    params.set('returnUrl', '/v7/firma/mein-status');
    router.push(`/v7/firma/zeiterfassung?${params.toString()}`);
  };

  const navigateToZA = () => {
    router.push('/v7/firma/berichte?panel=za');
  };

  // ============================================================================
  // RENDER: LOADING
  // ============================================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PortalHeader portal="firma" companyName="" userName="" userRole="client_admin" />
        <PortalNav portal="firma" userRole="client_admin" portalRole="client_admin" />
        <main className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="w-10 h-10 border-4 border-green-200 border-t-green-600 rounded-full animate-spin" />
          </div>
        </main>
      </div>
    );
  }

  // ============================================================================
  // RENDER: ERROR
  // ============================================================================

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PortalHeader portal="firma" companyName="" userName="" userRole="client_admin" />
        <PortalNav portal="firma" userRole="client_admin" portalRole="client_admin" />
        <main className="max-w-7xl mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-700">{error}</p>
          </div>
        </main>
      </div>
    );
  }

  // ============================================================================
  // RENDER: HAUPTSEITE
  // ============================================================================

  const assignedProjectCount = (projectStatuses || []).length;
  const hasProjects = assignedProjectCount > 0;
  const showZASection = zaStatuses.length > 0 && (portalRole === 'client_admin' || portalRole === 'project_leader');

  return (
    <div className="min-h-screen bg-gray-50">
      <PortalHeader
        portal="firma"
        companyName={company?.name || ''}
        userName={userProfile?.display_name || ''}
        userRole={portalRole}
      />
      <PortalNav
        portal="firma"
        userRole={portalRole === 'client_admin' ? 'client_admin' : 'client_user'}
        portalRole={portalRole}
      />

      <main className="max-w-7xl mx-auto px-4 py-8">

        {/* ================================================================ */}
        {/* KOPFBEREICH                                                      */}
        {/* ================================================================ */}
        <div className="mb-3">
          <h1 className="text-2xl font-bold text-gray-900">Mein Status</h1>
          <p className="text-gray-700 mt-1">
            Uebersicht Ihrer Zeiterfassung nach Projekten und Monaten
          </p>
        </div>

        {/* Downloads und Kennzahl-Kacheln wurden in v7.4.4-12 entfernt:
            - Downloads jetzt im Hilfe-Dropdown der Navigationsleiste
            - Kennzahlen jetzt als kompakte Statuszeile je Projekt (siehe unten) */}


        {/* NEU v7.4.4-10: Offene Rueckfragen (nur Admin/PL) - direkt nach Statistik */}
        {offeneNotizen.length > 0 && (portalRole === 'client_admin' || portalRole === 'project_leader') && (
          <div className="mb-3 bg-white rounded-xl border border-orange-200 p-4">
            <div className="flex items-center gap-2 mb-4">
              <MessageCircle size={20} className="text-orange-500" />
              <h2 className="text-base font-semibold text-gray-900">
                Offene Rueckfragen ({offeneNotizen.length})
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-orange-50 border-b border-orange-200">
                    <th className="px-4 py-2 text-left font-medium text-gray-600">Projekt</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">Mitarbeiter</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">Monat</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">Notiz</th>
                    <th className="px-4 py-2 text-center font-medium text-gray-600"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {offeneNotizen.map(notiz => (
                    <tr key={notiz.id} className="hover:bg-orange-50/50">
                      <td className="px-4 py-2.5 text-gray-800 font-medium">{notiz.project_name}</td>
                      <td className="px-4 py-2.5 text-gray-700">{notiz.employee_name}</td>
                      <td className="px-4 py-2.5 text-gray-700 whitespace-nowrap">
                        {['Januar','Februar','Maerz','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'][notiz.month - 1]} {notiz.year}
                      </td>
                      <td className="px-4 py-2.5 text-gray-600 text-xs max-w-xs truncate" title={notiz.note_text}>
                        {notiz.note_text}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <button
                          onClick={() => {
                            const params = new URLSearchParams();
                            params.set('employee', notiz.employee_id);
                            params.set('year', String(notiz.year));
                            params.set('month', String(notiz.month));
                            params.set('returnUrl', '/v7/firma/mein-status');
                            router.push(`/v7/firma/zeiterfassung?${params.toString()}`);
                          }}
                          className="text-xs text-green-600 hover:text-green-800 hover:underline whitespace-nowrap"
                        >
                          Zur Zeiterfassung
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* PROJEKT-KARTEN (Zeiterfassung-Ampel)                             */}
        {/* ================================================================ */}
        {!hasProjects ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <FolderKanban className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-600 mb-2">Keine Projekte zugeordnet</h2>
            <p className="text-gray-700">
              Sie sind aktuell keinem Projekt zugeordnet. Bitte wenden Sie sich an Ihren Projektleiter.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {(projectStatuses || []).map((ps) => {
              const badge = getFundingBadge(ps.project.funding_format);
              const pastMonths = ps.totalMonths;
              const progressPercent = pastMonths > 0 ? Math.round((ps.completeMonths / pastMonths) * 100) : 0;

              return (
                <div key={ps.project.id} className="bg-white rounded-lg shadow">
                  {/* Projekt-Header */}
                  <div className="px-4 py-2 border-b border-gray-100">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h2 className="text-lg font-semibold text-gray-900">
                            {ps.project.short_name || ps.project.name}
                          </h2>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge.color}`}>
                            {badge.label}
                          </span>
                        </div>
                        {ps.project.short_name && ps.project.short_name !== ps.project.name && (
                          <p className="text-sm text-gray-700">{ps.project.name}</p>
                        )}
                        <p className="text-sm text-gray-700 mt-1">
                          <Calendar className="w-3.5 h-3.5 inline mr-1" />
                          {formatDateDE(ps.project.start_date)} - {formatDateDE(ps.project.end_date)}
                          {ps.project.funding_reference && (
                            <span className="ml-3 text-gray-600">FKZ: {ps.project.funding_reference}</span>
                          )}
                        </p>
                        {/* Kennzahlen werden neben ZE-Header angezeigt */}
                      </div>
                      {/* Fortschritt */}
                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-gray-600" />
                          <span className="text-sm font-medium text-gray-700">
                            {ps.completeMonths} / {pastMonths} Monate
                          </span>
                        </div>
                        <div className="w-32 bg-gray-200 rounded-full h-2 mt-2">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              progressPercent >= 80
                                ? 'bg-green-500'
                                : progressPercent >= 50
                                ? 'bg-orange-400'
                                : 'bg-red-400'
                            }`}
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Monats-Zeitleiste */}
                  <div className="px-4 py-2">
                    {/* Header mit Kennzahlen nebeneinander */}
                    <div className="flex items-center gap-4 mb-2">
                      <p className="text-xs text-gray-700 font-medium uppercase tracking-wide">
                        Zeiterfassung nach Monaten
                      </p>
                      <div className="flex items-center gap-3 ml-2">
                        <span className="flex items-center gap-1 text-xs text-green-700 font-medium">
                          <CheckCircle className="w-3.5 h-3.5" />
                          {ps.completeMonths} vollstaendig
                        </span>
                        {ps.partialMonths > 0 && (
                          <span className="flex items-center gap-1 text-xs text-orange-600 font-medium">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            {ps.partialMonths} in Bearbeitung
                          </span>
                        )}
                        {ps.missingMonths > 0 && (
                          <span className="flex items-center gap-1 text-xs text-red-600 font-medium">
                            <XCircle className="w-3.5 h-3.5" />
                            {ps.missingMonths} nicht erfasst
                          </span>
                        )}
                      </div>
                    </div>
                    {(() => {
                      const years = [...new Set((ps.months || []).map((m) => m.year))];
                      return years.map((year) => {
                        const yearMonths = (ps.months || []).filter((m) => m.year === year);
                        return (
                          <div key={year} className="mb-1 last:mb-0">
                            <p className="text-xs text-gray-600 mb-1">{year}</p>
                            <div className="flex flex-wrap gap-1.5">
                              {yearMonths.map((md) => {
                                const isClickable = md.status !== 'future' && md.status !== 'outside';
                                let bgColor = 'bg-gray-100 text-gray-500';
                                let title = '';
                                let borderStyle = '';
                                switch (md.status) {
                                  case 'complete':
                                    bgColor = 'bg-green-200 text-green-800 hover:bg-green-300';
                                    title = `${getMonthNameFull(md.month)} ${md.year}: Vollstaendig (${md.hoursRecorded.toFixed(1)}h an ${md.daysRecorded} Tagen)`;
                                    borderStyle = 'border border-green-400';
                                    break;
                                  case 'partial':
                                    bgColor = 'bg-orange-200 text-orange-800 hover:bg-orange-300';
                                    title = `${getMonthNameFull(md.month)} ${md.year}: In Bearbeitung (${md.hoursRecorded.toFixed(1)}h an ${md.daysRecorded} von ${md.workingDays} Tagen)`;
                                    borderStyle = 'border border-orange-400';
                                    break;
                                  case 'missing':
                                    bgColor = 'bg-red-200 text-red-800 hover:bg-red-300';
                                    title = `${getMonthNameFull(md.month)} ${md.year}: Nicht erfasst (${md.workingDays} Arbeitstage)`;
                                    borderStyle = 'border border-red-400';
                                    break;
                                  case 'future':
                                    bgColor = 'bg-gray-50 text-gray-400';
                                    title = `${getMonthNameFull(md.month)} ${md.year}: Zukuenftig`;
                                    borderStyle = 'border border-gray-200';
                                    break;
                                  case 'outside':
                                    bgColor = 'bg-gray-100 text-gray-300';
                                    title = `${getMonthNameFull(md.month)} ${md.year}: Nicht im Projekt/Unternehmen`;
                                    borderStyle = 'border border-gray-200';
                                    break;
                                  default:
                                    break;
                                }
                                return (
                                  <button
                                    key={`${md.year}-${md.month}`}
                                    onClick={() => isClickable && navigateToTimesheet(md.year, md.month)}
                                    disabled={!isClickable}
                                    title={title}
                                    className={`
                                      w-12 h-10 rounded-md text-xs font-semibold
                                      flex flex-col items-center justify-center
                                      transition-colors
                                      ${bgColor} ${borderStyle}
                                      ${isClickable ? 'cursor-pointer' : 'cursor-default opacity-50'}
                                    `}
                                  >
                                    <span className="leading-none">{getMonthName(md.month)}</span>
                                    {md.status === 'complete' && <CheckCircle className="w-3 h-3 mt-0.5" />}
                                    {md.status === 'partial' && <AlertTriangle className="w-3 h-3 mt-0.5" />}
                                    {md.status === 'missing' && <XCircle className="w-3 h-3 mt-0.5" />}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>

                  {/* Warnbalken entfernt - Kennzahlen jetzt neben ZE-Header */}
                </div>
              );
            })}
          </div>
        )}

        {/* ================================================================ */}
        {/* ZA-AMPEL-SEKTION (nur fuer client_admin + project_leader)        */}
        {/* ================================================================ */}
        {showZASection && (
          <div className="mt-3 bg-white rounded-lg shadow">
            {/* Abschnitts-Header */}
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
              <div className="w-9 h-9 bg-orange-50 rounded-lg flex items-center justify-center">
                <Receipt className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900">Naechste Zahlungsanforderung</h2>
                <p className="text-xs text-gray-700 mt-0.5">Faelligkeiten und Stunden-Status fuer ZIM-Projekte</p>
              </div>
            </div>

            {/* Tabelle */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wide">Projekt</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wide">ZA faellig</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wide">Stunden MA (akt. Monat)</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wide">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wide"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(zaStatuses || []).map((za) => {
                    const badge = getFundingBadge(za.project.funding_format);

                    // Ampel-Farben
                    let ampelBg = 'bg-green-100';
                    let ampelText = 'text-green-700';
                    let ampelBorder = 'border-green-300';
                    let ampelLabel = 'OK';
                    let ampelIcon = <CheckCircle className="w-3.5 h-3.5" />;
                    let rowBg = '';

                    if (za.ampel === 'rot') {
                      ampelBg = 'bg-red-100';
                      ampelText = 'text-red-700';
                      ampelBorder = 'border-red-300';
                      ampelLabel = 'Dringend';
                      ampelIcon = <XCircle className="w-3.5 h-3.5" />;
                      rowBg = 'bg-red-50';
                    } else if (za.ampel === 'gelb') {
                      ampelBg = 'bg-orange-100';
                      ampelText = 'text-orange-700';
                      ampelBorder = 'border-orange-300';
                      ampelLabel = 'Bald faellig';
                      ampelIcon = <AlertTriangle className="w-3.5 h-3.5" />;
                      rowBg = 'bg-orange-50';
                    }

                    // Tage-Text
                    let daysText = '-';
                    if (za.daysUntilDue !== null) {
                      if (za.daysUntilDue < 0) {
                        daysText = `${Math.abs(za.daysUntilDue)} Tage ueberfaellig`;
                      } else if (za.daysUntilDue === 0) {
                        daysText = 'Heute faellig';
                      } else {
                        daysText = `in ${za.daysUntilDue} Tagen`;
                      }
                    }

                    return (
                      <tr key={za.project.id} className={rowBg}>
                        {/* Projekt */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">
                              {za.project.short_name || za.project.name}
                            </span>
                            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${badge.color}`}>
                              {badge.label}
                            </span>
                          </div>
                          {za.project.funding_reference && (
                            <p className="text-xs text-gray-600 mt-0.5">FKZ: {za.project.funding_reference}</p>
                          )}
                        </td>

                        {/* ZA faellig */}
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900">
                            {za.faelligDate ? formatDateDE(za.faelligDate.toISOString()) : '-'}
                          </div>
                          <div className="text-xs text-gray-700 mt-0.5">{daysText}</div>
                          {za.letzteZA && (
                            <div className="text-xs text-gray-600 mt-0.5">
                              Basis: ZA {za.letzteZA.za_nummer} ({za.letzteZA.status})
                            </div>
                          )}
                        </td>

                        {/* Stunden-Status */}
                        <td className="px-6 py-4">
                          {za.totalEmployees === 0 ? (
                            <span className="text-xs text-gray-600">Keine MA zugeordnet</span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <div className="flex-1 max-w-24 bg-gray-200 rounded-full h-1.5">
                                <div
                                  className={`h-1.5 rounded-full ${za.allEmployeesComplete ? 'bg-green-500' : 'bg-orange-400'}`}
                                  style={{ width: `${za.totalEmployees > 0 ? Math.round((za.completeEmployees / za.totalEmployees) * 100) : 0}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-600 whitespace-nowrap">
                                {za.completeEmployees}/{za.totalEmployees} MA
                              </span>
                            </div>
                          )}
                          <div className="text-xs text-gray-600 mt-1">
                            {za.allEmployeesComplete ? 'Vollstaendig' : 'Nicht vollstaendig'}
                          </div>
                        </td>

                        {/* Ampel */}
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${ampelBg} ${ampelText} ${ampelBorder}`}>
                            {ampelIcon}
                            {ampelLabel}
                          </span>
                        </td>

                        {/* Action */}
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={navigateToZA}
                            className="inline-flex items-center gap-1 text-xs font-medium text-green-700 hover:text-green-900 hover:underline"
                          >
                            Zur ZA
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Legende */}
            <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 rounded-b-lg">
              <div className="flex flex-wrap gap-4 text-xs text-gray-700">
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-300 font-medium">
                    <CheckCircle className="w-3 h-3" /> OK
                  </span>
                  <span>Frist &gt; 30 Tage und Stunden vollstaendig</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 border border-orange-300 font-medium">
                    <AlertTriangle className="w-3 h-3" /> Bald faellig
                  </span>
                  <span>Frist &lt;= 30 Tage oder Stunden unvollstaendig</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-300 font-medium">
                    <XCircle className="w-3 h-3" /> Dringend
                  </span>
                  <span>Frist &lt;= 14 Tage oder Stunden fehlen bei Frist &lt;= 30 Tage</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* LEGENDE (Zeiterfassung-Ampel)                                    */}
        {/* ================================================================ */}
        {hasProjects && (
          <div className="mt-3 bg-white rounded-lg shadow px-4 py-3">
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <span className="text-xs font-medium text-gray-700 mr-1">Legende:</span>
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded bg-green-200 border border-green-400 flex items-center justify-center">
                  <CheckCircle className="w-3 h-3 text-green-800" />
                </div>
                <span className="text-xs text-gray-700">Vollstaendig</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded bg-orange-200 border border-orange-400 flex items-center justify-center">
                  <AlertTriangle className="w-3 h-3 text-orange-800" />
                </div>
                <span className="text-xs text-gray-700">In Bearbeitung</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded bg-red-200 border border-red-400 flex items-center justify-center">
                  <XCircle className="w-3 h-3 text-red-800" />
                </div>
                <span className="text-xs text-gray-700">Nicht erfasst</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded bg-gray-50 border border-gray-200" />
                <span className="text-xs text-gray-700">Zukuenftig</span>
              </div>
              <span className="text-xs text-gray-500 ml-2">Klick auf Monat = direkt zur Zeiterfassung</span>
            </div>
          </div>
        )}

        <div className="h-4" />
      </main>
    </div>
  );
}
