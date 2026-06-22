'use client';

// Route: /v7/berater/foerderung/firma/[id]/cockpit/stundennachweis
// Eigenstaendige Seite fuer StundennachweisMatrix (ohne BerichtePage)
// Version: 7.4.9-6
// v7.4.9-6: assignment_start/end je Mitarbeiter UND Projekt zusammenfuehren
//   (vorher nur je employee_id -> ein MA in mehreren Projekten konnte die
//   Datumsgrenzen des falschen Projekts erben). project_id in die
//   assignDates-Query aufgenommen, Merge matcht jetzt employee_id + project_id.
//   Zusammenspiel mit StundennachweisMatrix v7.4.6-4 (Projektfilter der MA).
// v7.4.9-5: FIX Cockpit-Navigation:
//   (1) Zellen-Klick uebergab den Monat als ?monat=YYYY-MM und ?ma= - die
//       Zeiterfassungs-Seite liest aber ?employee=, ?year=, ?month=. Dadurch
//       wurden MA und Monat ignoriert und der aktuelle Monat geoeffnet.
//       Jetzt korrekte Parameter + ?returnUrl= zurueck auf die Matrix.
//   (2) "Zurueck" fuehrt jetzt deterministisch ins Firma-Cockpit (App-Modus
//       bzw. klassisch), statt per router.back() im alten Foerder-Portal zu
//       landen.

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import PortalHeader from '@/components/shared/PortalHeader';
import StundennachweisMatrix from '@/components/shared/StundennachweisMatrix';
import { loadProjectAssignments } from '@/components/shared/ZAPanel';
import { ArrowLeft, Loader2 } from 'lucide-react';

export default function CockpitStundennachweisPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const firmaId = params.id as string;
  const projektId = searchParams.get('projekt') || '';

  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [firmaName, setFirmaName] = useState('');

  const [company, setCompany] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [workPackages, setWorkPackages] = useState<any[]>([]);
  const [wpAssignments, setWpAssignments] = useState<any[]>([]);
  const [projectAssignments, setProjectAssignments] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [timesheets, setTimesheets] = useState<any[]>([]);
  const [completions, setCompletions] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [matrixProjectId, setMatrixProjectId] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data: profile } = await supabase
        .from('v7_user_profiles')
        .select('display_name, email, role')
        .eq('id', user.id)
        .single();

      if (!profile || (profile.role !== 'consultant' && profile.role !== 'system_admin')) {
        router.push('/v7/berater'); return;
      }
      setUserName(profile.display_name || profile.email || '');

      const { data: companyData } = await supabase
        .from('v7_client_companies')
        .select('id, name, federal_state, holiday_region')
        .eq('id', firmaId)
        .single();
      setCompany(companyData);
      setFirmaName(companyData?.name || '');

      const { data: projectsData } = await supabase
        .from('v7_projects')
        .select('id, name, short_name, funding_format, funding_reference, start_date, end_date, is_active')
        .eq('client_company_id', firmaId)
        .eq('is_active', true);
      setProjects(projectsData || []);

      if (projektId) {
        setMatrixProjectId(projektId);
      } else if (projectsData && projectsData.length > 0) {
        setMatrixProjectId(projectsData[0].id);
      }

      const projectIds = (projectsData || []).map((p: any) => p.id);
      if (projectIds.length > 0) {
        const { data: wpData } = await supabase
          .from('v7_work_packages')
          .select('id, project_id, ap_number, ap_code, name, total_person_months, start_date, end_date')
          .in('project_id', projectIds)
          .eq('is_active', true);
        setWorkPackages(wpData || []);

        const wpIds = (wpData || []).map((wp: any) => wp.id);
        if (wpIds.length > 0) {
          const { data: wpaData } = await supabase
            .from('v7_work_package_assignments')
            .select('id, work_package_id, employee_id, planned_person_months')
            .in('work_package_id', wpIds)
            .eq('is_active', true);
          setWpAssignments(wpaData || []);
        }

        const paFlat = await loadProjectAssignments(projectIds);
        const { data: assignDates } = await supabase
          .from('v7_project_assignments')
          .select('employee_id, project_id, assignment_start, assignment_end')
          .in('project_id', projectIds)
          .eq('is_active', true);
        const paWithDates = paFlat.map((pa: any) => {
          const dates = (assignDates || []).find(
            (d: any) => d.employee_id === pa.employee_id && d.project_id === pa.project_id
          );
          return {
            ...pa,
            assignment_start: dates?.assignment_start || null,
            assignment_end: dates?.assignment_end || null,
          };
        });
        setProjectAssignments(paWithDates);

        const { data: empData } = await supabase
          .from('v7_employees')
          .select('id, display_name, first_name, last_name, user_id, portal_role, employment_start, employment_end')
          .eq('client_company_id', firmaId)
          .eq('is_active', true);
        setEmployees(empData || []);

        const { data: tsData } = await supabase
          .from('v7_timesheets')
          .select('id, project_id, employee_id, work_package_id, work_date, hours, day_type, is_active, is_billable')
          .in('project_id', projectIds)
          .eq('is_active', true);
        setTimesheets(tsData || []);

        const { data: compData } = await supabase
          .from('v7_timesheet_completions')
          .select('employee_id, project_id, year, month')
          .in('project_id', projectIds);
        setCompletions(compData || []);

        const { data: notesData } = await supabase
          .from('v7_timesheet_notes')
          .select('employee_id, project_id, year, month, status')
          .in('project_id', projectIds)
          .eq('status', 'offen');
        setNotes(notesData || []);
      }

      setLoading(false);
    }
    loadData();
  }, [firmaId, router]);

  function handleProjectChange(id: string) {
    setMatrixProjectId(id);
  }

  function handleNavigateToZE(employeeId: string, year: number, month: number) {
    // v7.4.9-5: Parameter an die Zeiterfassungs-Seite anpassen (employee/year/month)
    // und returnUrl zurueck auf diese Matrix mitgeben, damit "Zurueck" dorthin fuehrt.
    const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
    router.push(
      `/v7/berater/foerderung/firma/${firmaId}/zeiterfassung?employee=${employeeId}&year=${year}&month=${month}&returnUrl=${returnUrl}`
    );
  }

  function handleBack() {
    // v7.4.9-5: deterministisch zurueck ins Firma-Cockpit (App- oder klassisch),
    // nicht per router.back() (landete sonst im alten Foerder-Portal).
    const appMode = typeof window !== 'undefined' && localStorage.getItem('pze_mode') === 'app';
    router.push(
      appMode
        ? `/v7/berater/app/firma/${firmaId}`
        : `/v7/berater/foerderung/firma/${firmaId}/cockpit`
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PortalHeader portal="berater" companyName="Laden..." userName="" userRole="consultant" />
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-[#002451]" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PortalHeader
        portal="berater"
        companyName={firmaName}
        userName={userName}
        userRole="consultant"
      />
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Zurueck</span>
        </button>

        <StundennachweisMatrix
          portal="berater"
          companyId={firmaId}
          projects={projects}
          workPackages={workPackages}
          wpAssignments={wpAssignments}
          projectAssignments={projectAssignments}
          employees={employees}
          timesheets={timesheets}
          completions={completions}
          notes={notes}
          company={company}
          matrixProjectId={matrixProjectId}
          onProjectChange={handleProjectChange}
          onNavigateToZE={handleNavigateToZE}
        />
      </div>
    </div>
  );
}
