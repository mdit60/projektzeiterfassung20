// src/hooks/useBerichteData.ts
// ============================================================================
// PZE - Shared Data-Loading Hook fuer Berichte-Komponenten
// ============================================================================
// Datum: 25. Juni 2026
// Version: 1.0.3
// v1.0.3: REGRESSION-FIX. Beim A-034-Umbau auf v1.0.2 ging das in v1.0.1
//   eingefuehrte .limit(10000) auf der v7_timesheets-Query verloren. Folge:
//   Supabases stilles 1000-Zeilen-Default schnitt die Timesheets bei Firmen mit
//   viel Historie willkuerlich ab -> ZA-Anlage-1a (is_billable-Filter) und
//   Berichte/Matrix zeigten "Keine Zeiterfassungsdaten". Limit wiederhergestellt.
// v1.0.2: A-034 Dual-Read Abwesenheiten. Synthetische Abwesenheits-Zeilen aus
//   v7_employee_absences (ueber loadEmployeeAbsencesAsTimesheets) werden zu den
//   v7_timesheets-Zeilen gemergt. Dedup gegen evtl. noch aktive Alt-Abwesenheits-
//   zeilen (Uebergangsphase, anhand absence_code + work_package_id IS NULL).
//   BerichteTimesheetEntry um absence_code erweitert; Timesheet-Select ergaenzt.
// v1.0.1: CRITICAL FIX: .limit(10000) auf v7_timesheets-Query (Supabase 1000-Zeilen-Limit)
//
// Zweck:
//   Zentraler Data-Loading Hook fuer alle Berichte-Komponenten:
//   ZAPanel, StundennachweisMatrix, ProjektFortschrittPanel
//
//   Bisher lud BerichtePage alle Daten und reichte sie als Props weiter.
//   Dieser Hook kapselt exakt dieselbe Ladelogik, sodass beliebige
//   Seiten/Komponenten darauf zugreifen koennen - ohne von BerichtePage
//   abhaengig zu sein.
//
//   BerichtePage selbst wird auf diesen Hook umgestellt (kein Umbau,
//   nur Auslagerung). Neue V8-C Seiten (ZASeite, StundennachweisSeite etc.)
//   nutzen ihn direkt.
//
// Verwendung:
//   const { loading, error, company, projects, employees, ... } =
//     useBerichteData({ companyId, portal });
//
// ============================================================================

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { loadProjectAssignments } from '@/components/shared/ZAPanel';
import { loadEmployeeAbsencesAsTimesheets } from '@/lib/employeeAbsences';

// ============================================================================
// TYPEN (identisch mit BerichtePage-Typen)
// ============================================================================

export interface BerichteCompany {
  id: string;
  name: string;
  federal_state: string | null;
  holiday_region: string | null;
}

export interface BerichteProject {
  id: string;
  name: string;
  short_name: string | null;
  funding_format: string | null;
  funding_reference: string | null;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  foerdersatz: number | null;
  overhead_t: number | null;
  overhead_nt: number | null;
  overhead_gleich: boolean | null;
  bewilligte_summe: number | null;
}

export interface BerichteEmployee {
  id: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  user_id: string | null;
  portal_role: string | null;
  employment_start: string | null;
  employment_end: string | null;
}

export interface BerichteWorkPackage {
  id: string;
  project_id: string;
  ap_number: string | null;
  ap_code: string | null;
  name: string;
  total_person_months: number | null;
  start_date: string | null;
  end_date: string | null;
  is_technical: boolean | null;
}

export interface BerichteWpAssignment {
  id: string;
  work_package_id: string;
  employee_id: string;
  planned_person_months: number | null;
}

export interface BerichteTimesheetEntry {
  id: string;
  project_id: string;
  employee_id: string;
  work_package_id: string | null;
  work_date: string;
  hours: number;
  day_type: string | null;
  is_active: boolean;
  is_billable: boolean | null;
  absence_code: string | null;
}

export interface BerichteCompletion {
  employee_id: string;
  project_id: string;
  year: number;
  month: number;
}

export interface BerichteTimesheetNote {
  employee_id: string;
  project_id: string;
  year: number;
  month: number;
  status: string;
}

export interface BerichteData {
  loading: boolean;
  error: string | null;
  company: BerichteCompany | null;
  projects: BerichteProject[];
  employees: BerichteEmployee[];
  workPackages: BerichteWorkPackage[];
  wpAssignments: BerichteWpAssignment[];
  timesheets: BerichteTimesheetEntry[];
  completions: BerichteCompletion[];
  timesheetNotes: BerichteTimesheetNote[];
  projectAssignments: any[];
  portalRole: string;
  userProfile: any;
}

// ============================================================================
// HOOK
// ============================================================================

interface UseBerichteDataParams {
  companyId: string | null;  // Berater: Firmen-ID als Prop | Firma: null (aus Profil)
  portal: 'berater' | 'firma';
}

export function useBerichteData({ companyId: clientCompanyId, portal }: UseBerichteDataParams): BerichteData {
  const supabase = createClient();

  const [loading, setLoading]                   = useState(true);
  const [error, setError]                       = useState<string | null>(null);
  const [company, setCompany]                   = useState<BerichteCompany | null>(null);
  const [projects, setProjects]                 = useState<BerichteProject[]>([]);
  const [employees, setEmployees]               = useState<BerichteEmployee[]>([]);
  const [workPackages, setWorkPackages]         = useState<BerichteWorkPackage[]>([]);
  const [wpAssignments, setWpAssignments]       = useState<BerichteWpAssignment[]>([]);
  const [timesheets, setTimesheets]             = useState<BerichteTimesheetEntry[]>([]);
  const [completions, setCompletions]           = useState<BerichteCompletion[]>([]);
  const [timesheetNotes, setTimesheetNotes]     = useState<BerichteTimesheetNote[]>([]);
  const [projectAssignments, setProjectAssignments] = useState<any[]>([]);
  const [portalRole, setPortalRole]             = useState<string>('');
  const [userProfile, setUserProfile]           = useState<any>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setError('Nicht eingeloggt'); return; }

        // CompanyId ermitteln
        let companyId = clientCompanyId || null;

        if (!companyId) {
          // Firma-Portal: aus UserProfil
          const { data: profile, error: profileError } = await supabase
            .from('v7_user_profiles')
            .select('id, email, display_name, role, client_company_id')
            .eq('email', user.email)
            .maybeSingle();
          if (profileError || !profile) { setError('Fehler beim Laden des Benutzerprofils'); return; }
          if (!profile.client_company_id) { setError('Keine Firma zugeordnet.'); return; }
          setUserProfile(profile);
          companyId = profile.client_company_id;
        } else {
          // Berater: Profil trotzdem laden fuer Display-Name
          const { data: profile } = await supabase
            .from('v7_user_profiles')
            .select('id, email, display_name, role, client_company_id')
            .eq('email', user.email)
            .maybeSingle();
          if (profile) setUserProfile(profile);
        }

        // Company
        const { data: companyData, error: companyError } = await supabase
          .from('v7_client_companies')
          .select('id, name, federal_state, holiday_region')
          .eq('id', companyId)
          .single();
        if (companyError || !companyData) { setError('Firma nicht gefunden'); return; }
        setCompany(companyData);

        // Projekte
        const { data: projectsData } = await supabase
          .from('v7_projects')
          .select('id, name, short_name, funding_format, funding_reference, start_date, end_date, is_active, foerdersatz, overhead_t, overhead_nt, overhead_gleich, bewilligte_summe')
          .eq('client_company_id', companyId)
          .eq('is_active', true);
        setProjects(projectsData || []);

        // Mitarbeiter
        const { data: employeesData } = await supabase
          .from('v7_employees')
          .select('id, display_name, first_name, last_name, user_id, portal_role, employment_start, employment_end')
          .eq('client_company_id', companyId)
          .eq('is_active', true);
        setEmployees(employeesData || []);

        // Portal-Rolle bestimmen
        if (portal === 'firma') {
          const myEmployee = (employeesData || []).find((emp: any) => emp.user_id === user.id);
          const { data: profile } = await supabase
            .from('v7_user_profiles')
            .select('role')
            .eq('email', user.email)
            .maybeSingle();
          if (profile?.role === 'client_admin') setPortalRole('client_admin');
          else if (myEmployee?.portal_role) setPortalRole(myEmployee.portal_role);
          else setPortalRole('employee');
        } else {
          setPortalRole('consultant');
        }

        // Arbeitspakete + Zuordnungen
        const projectIds = (projectsData || []).map((p: any) => p.id);
        if (projectIds.length > 0) {
          const { data: wpData } = await supabase
            .from('v7_work_packages')
            .select('id, project_id, ap_number, ap_code, name, total_person_months, start_date, end_date, is_technical')
            .in('project_id', projectIds)
            .eq('is_active', true)
            .limit(10000);
          setWorkPackages(wpData || []);

          if (wpData && wpData.length > 0) {
            const wpIds = wpData.map((wp: any) => wp.id);
            const { data: wpaData } = await supabase
              .from('v7_work_package_assignments')
              .select('id, work_package_id, employee_id, planned_person_months')
              .in('work_package_id', wpIds)
              .eq('is_active', true);
            setWpAssignments(wpaData || []);
          }

          // Timesheets
          const { data: timesheetData } = await supabase
            .from('v7_timesheets')
            .select('id, project_id, employee_id, work_package_id, work_date, hours, day_type, is_active, is_billable, absence_code')
            .in('project_id', projectIds)
            .eq('is_active', true)
            .limit(10000);
          const tsRows = (timesheetData || []) as BerichteTimesheetEntry[];

          // A-034 Dual-Read: zentrale Abwesenheiten als synthetische Zeilen
          // ergaenzen. Dedup gegen evtl. noch aktive Alt-Abwesenheitszeilen in
          // v7_timesheets (work_package_id IS NULL + absence_code gesetzt), damit
          // in der Uebergangsphase nichts doppelt zaehlt.
          const existingAbsenceKeys = new Set(
            tsRows
              .filter(t => !t.work_package_id && t.absence_code)
              .map(t => `${t.employee_id}|${t.project_id}|${t.work_date}`)
          );
          const absenceSynth = await loadEmployeeAbsencesAsTimesheets(projectIds);
          const absenceEntries: BerichteTimesheetEntry[] = absenceSynth
            .filter(s => !existingAbsenceKeys.has(`${s.employee_id}|${s.project_id}|${s.work_date}`))
            .map(s => ({
              id: s.id,
              project_id: s.project_id,
              employee_id: s.employee_id,
              work_package_id: s.work_package_id,
              work_date: s.work_date,
              hours: s.hours,
              day_type: s.day_type,
              is_active: s.is_active,
              is_billable: s.is_billable,
              absence_code: s.absence_code,
            }));
          setTimesheets([...tsRows, ...absenceEntries]);

          // Completions
          const { data: completionsData } = await supabase
            .from('v7_timesheet_completions')
            .select('employee_id, project_id, year, month')
            .in('project_id', projectIds);
          setCompletions(completionsData || []);

          // Timesheet-Notizen
          const { data: notesData } = await supabase
            .from('v7_timesheet_notes')
            .select('employee_id, project_id, year, month, status')
            .in('project_id', projectIds)
            .eq('status', 'offen');
          setTimesheetNotes(notesData || []);

          // Projekt-Zuordnungen
          const paFlat = await loadProjectAssignments(projectIds);
          const { data: assignDates } = await supabase
            .from('v7_project_assignments')
            .select('employee_id, assignment_start, assignment_end')
            .in('project_id', projectIds)
            .eq('is_active', true);

          const paWithDates = paFlat.map((pa: any) => {
            const dates = (assignDates || []).find((d: any) => d.employee_id === pa.employee_id);
            return {
              ...pa,
              assignment_start: dates?.assignment_start || null,
              assignment_end: dates?.assignment_end || null,
            };
          });
          setProjectAssignments(paWithDates);
        }

      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [clientCompanyId, portal]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    loading,
    error,
    company,
    projects,
    employees,
    workPackages,
    wpAssignments,
    timesheets,
    completions,
    timesheetNotes,
    projectAssignments,
    portalRole,
    userProfile,
  };
}

// ============================================================================
// ENDE useBerichteData v1.0.2
// ============================================================================
