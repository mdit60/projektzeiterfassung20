// src/app/v7/firma/dashboard/page.tsx
// ============================================================================
// PZE V7 - Firmen-Portal Dashboard
// ============================================================================
// Datum: 21. Januar 2026
// Version: 7.3.61
//
// Dashboard mit rollenbasierter Ansicht:
//
// ADMIN (client_admin):
//   - Volle Statistiken (Projekte, MA, Stunden)
//   - Alle Projekte-Tabelle
//   - Navigation: Firmendaten | Projekte | Mitarbeiter
//
// PROJEKTLEITER (project_leader):
//   - "Meine Projekte" mit Zeiterfassungs-Button pro Projekt
//   - KEINE separate "Meine Zeiterfassung" Box (redundant!)
//   - Navigation: Projekte | Zeiterfassung
//
// MITARBEITER (employee):
//   - Grosse "Zeiterfassung" Box als Hauptaktion
//   - "Meine Projekte" Liste (nur zur Info)
//   - Navigation: Zeiterfassung
//
// FIX v7.3.61: Projektleiter sieht keine redundante Zeiterfassungs-Box mehr
// ============================================================================

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
  Building2,
  FolderKanban,
  Users,
  Clock,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';

// Gemeinsame Komponenten
import PortalHeader from '@/components/shared/PortalHeader';

// Types
import { 
  V7UserRole, 
  V7EmployeePortalRole,
  V7Employee,
  V7Project,
  V7ClientCompany,
} from '@/types/v7-types';

// ============================================================================
// TYPEN
// ============================================================================

interface UserProfile {
  id: string;
  email: string;
  role: V7UserRole;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  client_company_id: string | null;
}

interface ProjectWithAssignment extends V7Project {
  isAssigned?: boolean;
}

// ============================================================================
// KOMPONENTE
// ============================================================================

export default function FirmaDashboard() {
  const router = useRouter();
  const supabase = createClient();

  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [employee, setEmployee] = useState<V7Employee | null>(null);
  const [company, setCompany] = useState<V7ClientCompany | null>(null);
  const [allProjects, setAllProjects] = useState<V7Project[]>([]);
  const [myProjects, setMyProjects] = useState<ProjectWithAssignment[]>([]);
  const [employeeCount, setEmployeeCount] = useState(0);

  // ============================================================================
  // DATEN LADEN
  // ============================================================================

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        router.push('/login');
        return;
      }

      // User Profile laden
      const { data: profile, error: profileError } = await supabase
        .from('v7_user_profiles')
        .select('*')
        .eq('email', user.email)
        .maybeSingle();

      if (profileError || !profile) {
        setError('Profil nicht gefunden');
        setLoading(false);
        return;
      }

      // Berater -> Weiterleitung
      if (profile.role === 'consultant' || profile.role === 'system_admin') {
        router.push('/v7/berater/dashboard');
        return;
      }

      if (!profile.client_company_id) {
        setError('Keine Firma zugeordnet');
        setLoading(false);
        return;
      }

      setUserProfile(profile);

      // Firma laden
      const { data: companyData } = await supabase
        .from('v7_client_companies')
        .select('*')
        .eq('id', profile.client_company_id)
        .single();

      if (companyData) setCompany(companyData);

      // Employee-Daten des aktuellen Users
      const { data: employeeData } = await supabase
        .from('v7_employees')
        .select('*')
        .eq('client_company_id', profile.client_company_id)
        .eq('email', user.email)
        .maybeSingle();

      if (employeeData) setEmployee(employeeData);

      // Alle Projekte laden (fuer Admin)
      const { data: projectsData } = await supabase
        .from('v7_projects')
        .select('*')
        .eq('client_company_id', profile.client_company_id)
        .eq('is_active', true)
        .order('name');

      if (projectsData) setAllProjects(projectsData);

      // Meine Projekte laden (fuer PL und Employee)
      if (employeeData) {
        await loadMyProjects(employeeData.id, projectsData || []);
      }

      // Mitarbeiter zaehlen
      const { count } = await supabase
        .from('v7_employees')
        .select('*', { count: 'exact', head: true })
        .eq('client_company_id', profile.client_company_id)
        .eq('is_active', true);

      setEmployeeCount(count || 0);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadMyProjects = async (employeeId: string, allProjectsList: V7Project[]) => {
    // =========================================================================
    // EINZIGE QUELLE: v7_work_package_assignments
    // =========================================================================
    // Ein Mitarbeiter ist einem Projekt zugeordnet, wenn er mindestens einem
    // Arbeitspaket dieses Projekts zugeordnet ist.
    // Das ist die logische Hierarchie:
    //   Projekt → Arbeitspakete → MA-Zuordnung mit PM
    // =========================================================================
    
    const projectIds = new Set<string>();
    
    // Work Package Assignments laden und Projekt-IDs extrahieren
    const { data: wpAssignments } = await supabase
      .from('v7_work_package_assignments')
      .select(`
        work_package_id,
        v7_work_packages!inner(project_id)
      `)
      .eq('employee_id', employeeId)
      .eq('is_active', true);

    (wpAssignments || []).forEach((a: any) => {
      if (a.v7_work_packages?.project_id) {
        projectIds.add(a.v7_work_packages.project_id);
      }
    });

    // Projekte filtern
    const myProjectsList: ProjectWithAssignment[] = allProjectsList
      .filter(p => projectIds.has(p.id))
      .map(p => ({
        ...p,
        isAssigned: true,
      }));

    setMyProjects(myProjectsList);
  };

  // ============================================================================
  // HILFSFUNKTIONEN
  // ============================================================================

  const getUserName = (): string => {
    if (employee?.display_name) return employee.display_name;
    if (userProfile?.display_name) return userProfile.display_name;
    if (userProfile?.first_name && userProfile?.last_name) {
      return `${userProfile.first_name} ${userProfile.last_name}`;
    }
    return userProfile?.email?.split('@')[0] || 'Benutzer';
  };

  const getPortalRole = (): V7EmployeePortalRole => {
    // Zuerst v7_user_profiles.role pruefen
    if (userProfile?.role === 'client_admin') return 'client_admin';
    // Dann v7_employees.portal_role
    if (employee?.portal_role) return employee.portal_role as V7EmployeePortalRole;
    return 'employee';
  };

  const getRoleLabel = (role: V7EmployeePortalRole): string => {
    const labels: Record<V7EmployeePortalRole, string> = {
      client_admin: 'Administrator',
      project_leader: 'Projektleiter',
      employee: 'Mitarbeiter',
    };
    return labels[role] || 'Mitarbeiter';
  };

  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('de-DE');
  };

  const getFundingFormatLabel = (format: string | null): string => {
    const formats: Record<string, string> = {
      'ZIM': 'ZIM',
      'ZIM_KOOP': 'ZIM Koop',
      'ZIM_NETZWERK': 'Netzwerk',
      'ZIM_DS': 'ZIM DS',
      'BMBF': 'BMBF',
      'BMBF_DS': 'BMBF DS',
    };
    return formats[format || ''] || format || '-';
  };

  // ============================================================================
  // RENDER - LOADING / ERROR
  // ============================================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-green-200 border-t-green-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/login')}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Zum Login
          </button>
        </div>
      </div>
    );
  }

  const userName = getUserName();
  const portalRole = getPortalRole();
  const isAdmin = portalRole === 'client_admin';
  const isProjectLeader = portalRole === 'project_leader';
  const isEmployee = portalRole === 'employee';

  // ============================================================================
  // RENDER - ADMIN DASHBOARD
  // ============================================================================

  if (isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <PortalHeader
          portal="firma"
          userName={userName}
          userRole={portalRole}
          companyName={company?.name || 'Firma'}
        />

        {/* Sub-Navigation fuer Admin */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex gap-8">
              <Link
                href="/v7/firma/firmendaten"
                className="flex items-center gap-2 py-4 px-1 border-b-2 border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300 font-medium text-sm transition-colors"
              >
                <Building2 size={18} />
                Firmendaten
              </Link>
              <Link
                href="/v7/firma/projekte"
                className="flex items-center gap-2 py-4 px-1 border-b-2 border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300 font-medium text-sm transition-colors"
              >
                <FolderKanban size={18} />
                Projekte
                <span className="ml-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                  {allProjects.length}
                </span>
              </Link>
              <Link
                href="/v7/firma/mitarbeiter"
                className="flex items-center gap-2 py-4 px-1 border-b-2 border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300 font-medium text-sm transition-colors"
              >
                <Users size={18} />
                Mitarbeiter
              </Link>
            </nav>
          </div>
        </div>

        <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
          {/* Willkommen */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">
              Willkommen, {userName}!
            </h1>
            <p className="text-gray-600 mt-1">
              Angemeldet als {getRoleLabel(portalRole)} bei {company?.name}
            </p>
            
            <div className="flex gap-3 mt-4">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-full text-sm text-gray-700">
                <FolderKanban size={16} className="text-blue-500" />
                {allProjects.length} {allProjects.length === 1 ? 'Projekt' : 'Projekte'}
              </span>
              <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-full text-sm text-gray-700">
                <Users size={16} className="text-purple-500" />
                {employeeCount} Mitarbeiter
              </span>
            </div>
          </div>

          {/* Projekte-Tabelle */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="font-semibold text-gray-900">Aktive Projekte</h2>
              <Link
                href="/v7/firma/projekte"
                className="text-sm text-green-600 hover:text-green-700 font-medium"
              >
                Alle anzeigen
              </Link>
            </div>
            
            {allProjects.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <FolderKanban size={48} className="mx-auto mb-4 text-gray-300" />
                <p>Noch keine Projekte vorhanden</p>
                <Link
                  href="/v7/firma/projekte/neu"
                  className="inline-block mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
                >
                  Erstes Projekt anlegen
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <th className="px-6 py-3">Projekt</th>
                      <th className="px-6 py-3">Format</th>
                      <th className="px-6 py-3">FKZ</th>
                      <th className="px-6 py-3">Laufzeit bis</th>
                      <th className="px-6 py-3 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {allProjects.slice(0, 10).map((project) => (
                      <tr
                        key={project.id}
                        onClick={() => router.push(`/v7/firma/projekte/${project.id}`)}
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900">{project.name}</div>
                          {project.short_name && (
                            <div className="text-sm text-gray-500">{project.short_name}</div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {project.funding_format && (
                            <span className="inline-flex px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-700">
                              {getFundingFormatLabel(project.funding_format)}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          {project.funding_reference || '-'}
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          {formatDate(project.end_date)}
                        </td>
                        <td className="px-6 py-4">
                          <ChevronRight size={18} className="text-gray-400" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>

        <footer className="bg-white border-t mt-auto">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <p className="text-center text-sm text-gray-500">
              PZE v7.3.61 | {company?.name}
            </p>
          </div>
        </footer>
      </div>
    );
  }

  // ============================================================================
  // RENDER - PROJEKTLEITER DASHBOARD
  // ============================================================================

  if (isProjectLeader) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <PortalHeader
          portal="firma"
          userName={userName}
          userRole={portalRole}
          companyName={company?.name || 'Firma'}
        />

        {/* Sub-Navigation fuer Projektleiter */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex gap-8">
              <Link
                href="/v7/firma/projekte"
                className="flex items-center gap-2 py-4 px-1 border-b-2 border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300 font-medium text-sm transition-colors"
              >
                <FolderKanban size={18} />
                Projekte
              </Link>
              <Link
                href="/v7/firma/zeiterfassung"
                className="flex items-center gap-2 py-4 px-1 border-b-2 border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300 font-medium text-sm transition-colors"
              >
                <Clock size={18} />
                Zeiterfassung
              </Link>
            </nav>
          </div>
        </div>

        <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
          {/* Willkommen */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">
              Willkommen, {userName}!
            </h1>
            <p className="text-gray-600 mt-1">
              Angemeldet als {getRoleLabel(portalRole)} bei {company?.name}
            </p>
            
            <div className="flex gap-3 mt-4">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-full text-sm text-gray-700">
                <FolderKanban size={16} className="text-blue-500" />
                {myProjects.length} zugeordnete {myProjects.length === 1 ? 'Projekt' : 'Projekte'}
              </span>
            </div>
          </div>

          {/* Meine Projekte - mit Zeiterfassungs-Button */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">Meine Projekte</h2>
            </div>
            
            {myProjects.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <FolderKanban size={48} className="mx-auto mb-4 text-gray-300" />
                <p>Sie sind noch keinem Projekt zugeordnet.</p>
                <p className="text-sm mt-2">Bitte wenden Sie sich an Ihren Administrator.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {myProjects.map((project) => (
                  <div
                    key={project.id}
                    className="px-6 py-4 flex items-center justify-between hover:bg-gray-50"
                  >
                    <div>
                      <div className="font-medium text-gray-900">{project.name}</div>
                      <div className="text-sm text-gray-500">
                        {getFundingFormatLabel(project.funding_format)}
                        {project.funding_reference && ` - ${project.funding_reference}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/v7/firma/zeiterfassung?projekt=${project.id}`}
                        className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                      >
                        Zeiterfassung
                      </Link>
                      <Link
                        href={`/v7/firma/projekte/${project.id}`}
                        className="px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
                      >
                        Details
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Schnellzugriff - kompakt, OHNE separate Zeiterfassungs-Box */}
          <div className="mt-8 bg-green-50 border border-green-200 rounded-lg p-6">
            <h3 className="font-medium text-green-900 mb-2">Hinweis zur Zeiterfassung</h3>
            <p className="text-sm text-green-700">
              Als Projektleiter koennen Sie die Zeiterfassung fuer alle Mitarbeiter Ihrer Projekte 
              einsehen und pruefen. Klicken Sie auf "Zeiterfassung" bei einem Projekt, um die 
              Stundennachweise zu verwalten.
            </p>
          </div>
        </main>

        <footer className="bg-white border-t mt-auto">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <p className="text-center text-sm text-gray-500">
              PZE v7.3.61 | {company?.name}
            </p>
          </div>
        </footer>
      </div>
    );
  }

  // ============================================================================
  // RENDER - MITARBEITER DASHBOARD
  // ============================================================================

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <PortalHeader
        portal="firma"
        userName={userName}
        userRole={portalRole}
        companyName={company?.name || 'Firma'}
      />

      {/* Sub-Navigation fuer Mitarbeiter - nur Zeiterfassung */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex gap-8">
            <Link
              href="/v7/firma/zeiterfassung"
              className="flex items-center gap-2 py-4 px-1 border-b-2 border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300 font-medium text-sm transition-colors"
            >
              <Clock size={18} />
              Zeiterfassung
            </Link>
          </nav>
        </div>
      </div>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Willkommen */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Willkommen, {userName}!
          </h1>
          <p className="text-gray-600 mt-1">
            Angemeldet als {getRoleLabel(portalRole)} bei {company?.name}
          </p>
          
          <div className="flex gap-3 mt-4">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-full text-sm text-gray-700">
              <FolderKanban size={16} className="text-blue-500" />
              {myProjects.length} zugeordnete {myProjects.length === 1 ? 'Projekt' : 'Projekte'}
            </span>
          </div>
        </div>

        {/* Grosse Zeiterfassungs-Box - Hauptaktion fuer Mitarbeiter */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 text-center mb-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Zeiterfassung</h2>
          <p className="text-gray-600 mb-6">Erfassen Sie hier Ihre Projektstunden</p>
          <Link
            href="/v7/firma/zeiterfassung"
            className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
          >
            <Clock size={20} />
            Zeiterfassung oeffnen
          </Link>
        </div>

        {/* Meine Projekte - Info-Liste */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">Meine Projekte</h2>
          </div>
          
          {myProjects.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <FolderKanban size={48} className="mx-auto mb-4 text-gray-300" />
              <p>Sie sind noch keinem Projekt zugeordnet.</p>
              <p className="text-sm mt-2">Bitte wenden Sie sich an Ihren Administrator.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {myProjects.map((project) => (
                <div
                  key={project.id}
                  className="px-6 py-4 flex items-center justify-between hover:bg-gray-50"
                >
                  <div>
                    <div className="font-medium text-gray-900">{project.name}</div>
                    <div className="text-sm text-gray-500">
                      {getFundingFormatLabel(project.funding_format)}
                      {project.funding_reference && ` - ${project.funding_reference}`}
                    </div>
                  </div>
                  <Link
                    href={`/v7/firma/zeiterfassung?projekt=${project.id}`}
                    className="px-4 py-2 bg-green-100 text-green-700 text-sm font-medium rounded-lg hover:bg-green-200 transition-colors"
                  >
                    Stunden erfassen
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <footer className="bg-white border-t mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <p className="text-center text-sm text-gray-500">
            PZE v7.3.61 | {company?.name}
          </p>
        </div>
      </footer>
    </div>
  );
}

// ============================================================================
// ENDE
// ============================================================================
