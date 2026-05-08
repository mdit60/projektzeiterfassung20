'use client';

// Route: /v7/berater/foerderung/firma/[id]/cockpit/fortschritt
// Eigenstaendige Seite fuer ProjektFortschrittPanel (ohne BerichtePage)
// Version: 7.4.9-4

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import PortalHeader from '@/components/shared/PortalHeader';
import ProjektFortschrittPanel from '@/components/shared/ProjektFortschrittPanel';
import { loadProjectAssignments } from '@/components/shared/ZAPanel';
import { ArrowLeft, Loader2 } from 'lucide-react';

export default function CockpitFortschrittPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const firmaId = params.id as string;
  const projektId = searchParams.get('projekt') || '';

  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [firmaName, setFirmaName] = useState('');

  const [projects, setProjects] = useState<any[]>([]);
  const [workPackages, setWorkPackages] = useState<any[]>([]);
  const [wpAssignments, setWpAssignments] = useState<any[]>([]);
  const [projectAssignments, setProjectAssignments] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [timesheets, setTimesheets] = useState<any[]>([]);

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

      const { data: firma } = await supabase
        .from('v7_client_companies')
        .select('name')
        .eq('id', firmaId)
        .single();
      setFirmaName(firma?.name || '');

      const { data: projectsData } = await supabase
        .from('v7_projects')
        .select('id, name, short_name, funding_format, funding_reference, start_date, end_date, is_active, foerdersatz, overhead_t, bewilligte_summe')
        .eq('client_company_id', firmaId)
        .eq('is_active', true);
      setProjects(projectsData || []);

      const projectIds = (projectsData || []).map((p: any) => p.id);
      if (projectIds.length > 0) {
        const { data: wpData } = await supabase
          .from('v7_work_packages')
          .select('id, project_id, total_person_months, start_date, end_date')
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
        setProjectAssignments(paFlat);

        const { data: empData } = await supabase
          .from('v7_employees')
          .select('id, display_name, weekly_hours, position_title')
          .eq('client_company_id', firmaId)
          .eq('is_active', true);
        setEmployees(empData || []);

        const { data: tsData } = await supabase
          .from('v7_timesheets')
          .select('id, project_id, employee_id, work_date, hours, is_billable')
          .in('project_id', projectIds)
          .eq('is_active', true);
        setTimesheets(tsData || []);
      }

      setLoading(false);
    }
    loadData();
  }, [firmaId, router]);

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
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Zurueck</span>
        </button>

        <ProjektFortschrittPanel
          portal="berater"
          projects={projects}
          workPackages={workPackages}
          wpAssignments={wpAssignments}
          projectAssignments={projectAssignments}
          employees={employees}
          timesheets={timesheets}
          initialProjectId={projektId}
        />
      </div>
    </div>
  );
}
