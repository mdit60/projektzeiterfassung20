// src/app/v7/firma/dashboard/page.tsx
// ============================================================================
// PZE V7 - Firmen-Portal Dashboard (Rollenbasiert)
// ============================================================================
// Datum: 21. Januar 2026
// Version: 7.3.59
//
// Rollenbasierte Ansicht:
// - client_admin: Voller Zugriff (Firmendaten, Projekte, Mitarbeiter)
// - project_leader: Nur zugeordnete Projekte, Zeiterfassung der Projekt-MA
// - employee: Nur eigene Zeiterfassung
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

interface ProjectWithRole extends V7Project {
  is_project_leader?: boolean;
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
  const [projects, setProjects] = useState<ProjectWithRole[]>([]);
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

      // Portal-Rolle bestimmen
      const portalRole = profile.role === 'client_admin' 
        ? 'client_admin' 
        : (employeeData?.portal_role || 'employee');

      // Projekte laden - je nach Rolle
      if (portalRole === 'client_admin') {
        // Admin sieht alle Projekte
        const { data: projectsData } = await supabase
          .from('v7_projects')
          .select('*')
          .eq('client_company_id', profile.client_company_id)
          .eq('is_active', true)
          .order('name');

        if (projectsData) setProjects(projectsData);

        // Mitarbeiter zaehlen
        const { count } = await supabase
          .from('v7_employees')
          .select('*', { count: 'exact', head: true })
          .eq('client_company_id', profile.client_company_id)
          .eq('is_active', true);

        setEmployeeCount(count || 0);

      } else if (portalRole === 'project_leader' && employeeData) {
        // Projektleiter sieht nur zugeordnete Projekte
        const { data: assignmentsData } = await supabase
          .from('v7_project_assignments')
          .select(`
            project_id,
            is_project_leader,
            v7_projects (*)
          `)
          .eq('employee_id', employeeData.id)
          .eq('is_active', true);

        if (assignmentsData) {
          const projectsWithRole = assignmentsData
            .filter(a => a.v7_projects)
            .map(a => ({
              ...(a.v7_projects as V7Project),
              is_project_leader: a.is_project_leader,
            }));
          setProjects(projectsWithRole);
        }

      } else if (employeeData) {
        // Mitarbeiter sieht nur zugeordnete Projekte (ohne Details)
        const { data: assignmentsData } = await supabase
          .from('v7_project_assignments')
          .select(`
            project_id,
            v7_projects (id, name, short_name, funding_reference, funding_format)
          `)
          .eq('employee_id', employeeData.id)
          .eq('is_active', true);

        if (assignmentsData) {
          const projectsList = assignmentsData
            .filter(a => a.v7_projects)
            .map(a => a.v7_projects as V7Project);
          setProjects(projectsList);
        }
      }

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // HILFSFUNKTIONEN
  // ============================================================================

  const getUserName = (): string => {
    if (userProfile?.display_name) return userProfile.display_name;
    if (userProfile?.first_name && userProfile?.last_name) {
      return `${userProfile.first_name} ${userProfile.last_name}`;
    }
    return userProfile?.email?.split('@')[0] || 'Benutzer';
  };

  const getPortalRole = (): V7EmployeePortalRole => {
    if (userProfile?.role === 'client_admin') return 'client_admin';
    if (employee?.portal_role) return employee.portal_role as V7EmployeePortalRole;
    return 'employee';
  };

  const getRoleLabel = (role: V7EmployeePortalRole): string => {
    const labels: Record<V7EmployeePortalRole, string> = {
      'client_admin': 'Administrator',
      'project_leader': 'Projektleiter',
      'employee': 'Mitarbeiter',
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
  // RENDER - MAIN
  // ============================================================================

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <PortalHeader
        portal="firma"
        userName={userName}
        userRole={portalRole}
        companyName={company?.name || 'Firma'}
      />

      {/* Sub-Navigation - nur fuer Admin komplett sichtbar */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex gap-8">
            {/* Firmendaten - nur Admin */}
            {isAdmin && (
              <Link
                href="/v7/firma/firmendaten"
                className="flex items-center gap-2 py-4 px-1 border-b-2 border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300 font-medium text-sm transition-colors"
              >
                <Building2 size={18} />
                Firmendaten
              </Link>
            )}
            
            {/* Projekte - Admin und Projektleiter */}
            {(isAdmin || isProjectLeader) && (
              <Link
                href="/v7/firma/projekte"
                className="flex items-center gap-2 py-4 px-1 border-b-2 border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300 font-medium text-sm transition-colors"
              >
                <FolderKanban size={18} />
                Projekte
              </Link>
            )}
            
            {/* Mitarbeiter - nur Admin */}
            {isAdmin && (
              <Link
                href="/v7/firma/mitarbeiter"
                className="flex items-center gap-2 py-4 px-1 border-b-2 border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300 font-medium text-sm transition-colors"
              >
                <Users size={18} />
                Mitarbeiter
              </Link>
            )}
            
            {/* Zeiterfassung - alle Rollen */}
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

      {/* Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        
        {/* Willkommen */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Willkommen, {userName}!
          </h1>
          <p className="text-gray-600">
            Angemeldet als <span className="font-medium">{getRoleLabel(portalRole)}</span>
            {company && <> bei <span className="font-medium">{company.name}</span></>}
          </p>
          
          {/* Badges - je nach Rolle */}
          <div className="flex gap-3 mt-4">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-full text-sm text-gray-700">
              <FolderKanban size={16} className="text-blue-500" />
              {projects.length} {isAdmin ? 'Projekte' : 'zugeordnete Projekte'}
            </span>
            {isAdmin && (
              <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-full text-sm text-gray-700">
                <Users size={16} className="text-purple-500" />
                {employeeCount} Mitarbeiter
              </span>
            )}
          </div>
        </div>

        {/* === ADMIN ANSICHT === */}
        {isAdmin && (
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
            
            {projects.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <FolderKanban size={48} className="mx-auto mb-4 text-gray-300" />
                <p>Noch keine Projekte vorhanden</p>
                <Link
                  href="/v7/firma/projekte/neu"
                  className="mt-4 inline-block px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Erstes Projekt anlegen
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Projekt</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Foerderung</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Laufzeit</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {projects.slice(0, 5).map((project) => (
                      <tr key={project.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900">{project.name}</div>
                          {project.short_name && (
                            <div className="text-sm text-gray-500">{project.short_name}</div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-700">
                            {getFundingFormatLabel(project.funding_format)}
                          </span>
                          {project.funding_reference && (
                            <div className="text-xs text-gray-500 mt-1">{project.funding_reference}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {formatDate(project.start_date)} - {formatDate(project.end_date)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link
                            href={`/v7/firma/projekte/${project.id}`}
                            className="text-green-600 hover:text-green-700"
                          >
                            <ChevronRight size={20} />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* === PROJEKTLEITER ANSICHT === */}
        {isProjectLeader && (
          <div className="space-y-6">
            {/* Meine Projekte */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="font-semibold text-gray-900">Meine Projekte</h2>
              </div>
              
              {projects.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <FolderKanban size={48} className="mx-auto mb-4 text-gray-300" />
                  <p>Sie sind keinem Projekt zugeordnet</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {projects.map((project) => (
                    <div key={project.id} className="p-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">{project.name}</span>
                            {(project as ProjectWithRole).is_project_leader && (
                              <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded">
                                Projektleiter
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500 mt-1">
                            {getFundingFormatLabel(project.funding_format)}
                            {project.funding_reference && ` - ${project.funding_reference}`}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Link
                            href={`/v7/firma/zeiterfassung?projekt=${project.id}`}
                            className="px-3 py-1.5 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200"
                          >
                            Zeiterfassung
                          </Link>
                          <Link
                            href={`/v7/firma/projekte/${project.id}`}
                            className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                          >
                            Details
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Schnellzugriff */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <h2 className="font-semibold text-gray-900 mb-4">Schnellzugriff</h2>
              <div className="flex gap-4">
                <Link
                  href="/v7/firma/zeiterfassung"
                  className="flex-1 p-4 bg-green-50 rounded-lg hover:bg-green-100 text-center"
                >
                  <Clock size={24} className="mx-auto mb-2 text-green-600" />
                  <span className="text-sm font-medium text-green-700">Meine Zeiterfassung</span>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* === MITARBEITER ANSICHT === */}
        {isEmployee && (
          <div className="space-y-6">
            {/* Zeiterfassung Karte */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 text-center">
              <Clock size={48} className="mx-auto mb-4 text-green-500" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Zeiterfassung</h2>
              <p className="text-gray-600 mb-6">
                Erfassen Sie hier Ihre Projektstunden
              </p>
              <Link
                href="/v7/firma/zeiterfassung"
                className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
              >
                <Clock size={20} />
                Zeiterfassung oeffnen
              </Link>
            </div>

            {/* Meine Projekte (nur Anzeige) */}
            {projects.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="font-semibold text-gray-900">Meine Projekte</h2>
                </div>
                <div className="divide-y divide-gray-200">
                  {projects.map((project) => (
                    <div key={project.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium text-gray-900">{project.name}</span>
                          <div className="text-sm text-gray-500 mt-1">
                            {getFundingFormatLabel(project.funding_format)}
                            {project.funding_reference && ` - ${project.funding_reference}`}
                          </div>
                        </div>
                        <Link
                          href={`/v7/firma/zeiterfassung?projekt=${project.id}`}
                          className="px-3 py-1.5 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200"
                        >
                          Stunden erfassen
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <p className="text-center text-xs text-gray-500">
            PZE V7.3.59 | Firmen-Portal | {company?.name}
          </p>
        </div>
      </footer>
    </div>
  );
}
