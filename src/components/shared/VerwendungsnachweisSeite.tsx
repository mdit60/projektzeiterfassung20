'use client';

// src/components/shared/VerwendungsnachweisSeite.tsx
// ============================================================================
// PZE V7 - Standalone Verwendungsnachweis-Seite (De-minimis-Varianten + NWM)
// Version: 1.2-2
// v1.2-2: VN-Freigabe je Firma. Im FIRMEN-Portal wird die Seite nur angezeigt,
//   wenn die Firma freigeschaltet ist (v7_client_companies.vn_firma_freigeschaltet);
//   sonst ein Sperr-Hinweis (Schutz gegen Deep-Links). Berater-Portal immer frei.
//   Steuerung zentral in der Administration (nur system_admin).
// v1.2-1: NWM (ZIM_NETZWERK) aufgenommen. Filter erfasst jetzt auch Netzwerk-
//   Projekte; Projekt-Select um netzwerk_phase erweitert (Phase-1/2-Erkennung
//   in der Lib/Panel). AGVO bleibt aussen vor.
// v1.1-2: FIX Foerderformat-Werte - Einzel = ZIM_EINZEL, Koop = ZIM_KOOP (nicht
//   'ZIM'). Filter jetzt auf ZIM_EINZEL/ZIM_KOOP/ZIM/ZIM_DS. NWM folgt.
// v1.1-1: laedt alle foerderfaehigen De-minimis-Projekte, nicht mehr nur DS.
// ----------------------------------------------------------------------------
// v1.0-3: FIX Spaltenname - FKZ liegt in v7_projects als `funding_reference`,
//   nicht `foerderkennzeichen`. Die falsche Spalte liess die gesamte
//   Projekt-Abfrage fehlschlagen (Supabase -> null) -> "keine DS-Projekte".
// v1.0-2: SELBSTLADEND (nicht mehr ueber useBerichteData). Grund: der VN erfolgt
//   nach Projektende -> es muessen auch ABGESCHLOSSENE (is_active=false)
//   DS-Projekte erfasst werden. useBerichteData laedt nur aktive Projekte und
//   bindet WP/Timesheets an deren IDs. Diese Seite laedt DS-Projekte OHNE
//   is_active-Filter selbst; WP/Timesheets/Assignments wie im ZA-Modul
//   (loadProjectAssignments). useBerichteData bleibt unveraendert.
// v1.0-1: erste Fassung (ueber useBerichteData) - abgeloest.
//
// Props:
//   portal           - 'berater' | 'firma'
//   clientCompanyId  - Firmen-ID (Berater: aus Route; Firma: null -> aus Profil)
//   initialProjektId - Projekt vorselektieren (optional)
//   returnTo         - Ziel des Zurueck-Buttons (konkreter Pfad '/...' oder 'cockpit')
// ============================================================================

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import PortalHeader from '@/components/shared/PortalHeader';
import PortalNav from '@/components/shared/PortalNav';
import PortalFooter from '@/components/shared/PortalFooter';
import VerwendungsnachweisPanel from '@/components/shared/VerwendungsnachweisPanel';
import { loadProjectAssignments } from '@/components/shared/ZAPanel';
import { V7PortalType, V7UserRole } from '@/types/v7-types';

interface VerwendungsnachweisSeiteProps {
  portal: V7PortalType;
  clientCompanyId: string | null;
  initialProjektId?: string;
  returnTo?: string;
}

export default function VerwendungsnachweisSeite({
  portal,
  clientCompanyId,
  initialProjektId,
  returnTo,
}: VerwendungsnachweisSeiteProps) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState('');
  const [role, setRole] = useState<string>(portal === 'berater' ? 'consultant' : 'client_admin');
  const [company, setCompany] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [workPackages, setWorkPackages] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [timesheets, setTimesheets] = useState<any[]>([]);
  const [projectAssignments, setProjectAssignments] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/login'); return; }

        const { data: profile } = await supabase
          .from('v7_user_profiles')
          .select('display_name, email, role, client_company_id')
          .eq('id', user.id)
          .maybeSingle();
        setUserName(profile?.display_name || profile?.email || '');
        setRole(profile?.role || (portal === 'berater' ? 'consultant' : 'client_admin'));

        const firmaId = clientCompanyId || profile?.client_company_id || null;
        if (!firmaId) { setError('Keine Firma ermittelbar.'); setLoading(false); return; }

        const { data: companyData } = await supabase
          .from('v7_client_companies')
          .select('id, name, federal_state, holiday_region, vn_firma_freigeschaltet')
          .eq('id', firmaId)
          .maybeSingle();
        setCompany(companyData);

        // VN-Projekte OHNE is_active-Filter (VN erfolgt nach Projektende).
        // De-minimis-Varianten (Einzel/Koop/DS) + Netzwerk (NWM). AGVO aussen vor.
        const { data: projectsData } = await supabase
          .from('v7_projects')
          .select('id, name, short_name, funding_format, funding_reference, foerdersatz, overhead_t, overhead_nt, start_date, end_date, bewilligung_datum, bewilligte_summe, pm_basis_weekly_hours, beihilfe_basis, netzwerk_phase, is_active')
          .eq('client_company_id', firmaId);
        const dsProjects = (projectsData || []).filter((p: any) => {
          const f = String(p.funding_format || '').toUpperCase().trim();
          return f === 'ZIM_EINZEL' || f === 'ZIM_KOOP' || f === 'ZIM' || f === 'ZIM_DS' || f === 'ZIM_NETZWERK';
        });
        setProjects(dsProjects);

        const ids = dsProjects.map((p: any) => p.id);
        if (ids.length > 0) {
          const { data: wp } = await supabase
            .from('v7_work_packages')
            .select('id, project_id, ap_number, ap_code, name, is_technical')
            .in('project_id', ids)
            .eq('is_active', true)
            .limit(10000);
          setWorkPackages(wp || []);

          const { data: ts } = await supabase
            .from('v7_timesheets')
            .select('id, project_id, employee_id, work_package_id, work_date, hours, is_active, is_billable')
            .in('project_id', ids)
            .eq('is_active', true)
            .limit(10000);
          setTimesheets(ts || []);

          const pa = await loadProjectAssignments(ids);
          setProjectAssignments(pa || []);

          const { data: emp } = await supabase
            .from('v7_employees')
            .select('id, display_name')
            .eq('client_company_id', firmaId);
          setEmployees(emp || []);
        }

        setLoading(false);
      } catch (e: any) {
        setError(e?.message || 'Fehler beim Laden.');
        setLoading(false);
      }
    }
    load();
  }, [clientCompanyId, portal, router]);

  const isAppMode = typeof window !== 'undefined' && localStorage.getItem('pze_mode') === 'app';
  const firmaId = company?.id || clientCompanyId || '';
  const zurueckUrl = (returnTo && returnTo.startsWith('/'))
    ? returnTo
    : portal === 'berater'
      ? (isAppMode
          ? `/v7/berater/app/firma/${firmaId}`
          : `/v7/berater/foerderung/firma/${firmaId}/cockpit`)
      : '/v7/firma/dashboard';
  const zurueckLabel = '\u2190 Zurueck';
  const uiRole = (role as V7UserRole) || 'consultant';

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PortalHeader portal={portal} userRole={uiRole} userName={userName} companyName={company?.name || ''} />
        <PortalNav portal={portal} userRole={uiRole} />
        <div className="flex items-center justify-center py-20">
          <div className="text-gray-500">Daten werden geladen...</div>
        </div>
        <PortalFooter portal={portal} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PortalHeader portal={portal} userRole={uiRole} userName={userName} companyName={company?.name || ''} />
        <PortalNav portal={portal} userRole={uiRole} />
        <div className="max-w-2xl mx-auto px-4 py-12">
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-6 py-4">{error}</div>
        </div>
        <PortalFooter portal={portal} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PortalHeader portal={portal} userRole={uiRole} userName={userName} companyName={company?.name || ''} />
      <PortalNav portal={portal} userRole={uiRole} />

      <div className="w-full px-6 py-6 pb-12">
        <div className="flex items-center gap-4 mb-6">
          <a href={zurueckUrl} className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm">
            {zurueckLabel}
          </a>
          {company && (
            <>
              <span className="text-gray-300">|</span>
              <span className="text-sm text-gray-600 font-medium">{company.name}</span>
            </>
          )}
        </div>

        {portal === 'firma' && !company?.vn_firma_freigeschaltet ? (
          <div className="bg-gray-50 border border-gray-200 text-gray-600 rounded-lg px-6 py-8 text-sm text-center">
            Der Verwendungsnachweis ist fuer diese Firma noch nicht freigeschaltet.
            <br />Bei Fragen wenden Sie sich bitte an Ihren Foerderberater.
          </div>
        ) : projects.length === 0 ? (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg px-6 py-4 text-sm">
            Keine foerderfaehigen Projekte (Einzel/Koop/DS/Netzwerk) fuer diese Firma gefunden (inkl. abgeschlossener). AGVO bleibt aussen vor.
          </div>
        ) : (
          <VerwendungsnachweisPanel
            portal={portal}
            projects={projects}
            workPackages={workPackages}
            employees={employees}
            timesheets={timesheets}
            projectAssignments={projectAssignments}
            initialProjectId={initialProjektId}
          />
        )}
      </div>

      <PortalFooter portal={portal} />
    </div>
  );
}

// ============================================================================
// ENDE VerwendungsnachweisSeite v1.2-1
// ============================================================================
