// src/app/v7/firma/dashboard/page.tsx
// ============================================================================
// PZE V7 - Firmen-Portal Dashboard
// ============================================================================
// Datum: 21. Januar 2026
// Version: 7.3.42
//
// Einstiegsseite fuer das Firmen-Portal
// Zeigt Uebersicht der Projekte
// ============================================================================

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
  FolderKanban,
  AlertCircle,
  ChevronRight,
  Users,
} from 'lucide-react';

// Gemeinsame Komponenten
import PortalHeader from '@/components/shared/PortalHeader';
import PortalNav from '@/components/shared/PortalNav';

// Types
import { 
  V7UserRole, 
  V7EmployeePortalRole,
  V7Employee,
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

interface ProjectSummary {
  id: string;
  name: string;
  short_name: string | null;
  funding_format: string | null;
  funding_reference: string | null;
  end_date: string | null;
}

// ============================================================================
// KOMPONENTE
// ============================================================================

export default function FirmaDashboard() {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [employee, setEmployee] = useState<V7Employee | null>(null);
  const [company, setCompany] = useState<V7ClientCompany | null>(null);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [stats, setStats] = useState({ projectCount: 0, employeeCount: 0 });

  // ============================================================================
  // AUTH & DATEN LADEN
  // ============================================================================

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Auth pruefen
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        router.push('/login');
        return;
      }

      // Profil laden
      const { data: profile, error: profileError } = await supabase
        .from('v7_user_profiles')
        .select('*')
        .eq('email', user.email)
        .maybeSingle();

      if (profileError || !profile) {
        setError('Kein Profil gefunden.');
        setLoading(false);
        return;
      }

      // Berater -> Weiterleitung
      if (profile.role === 'consultant' || profile.role === 'system_admin') {
        router.push('/v7/berater/dashboard');
        return;
      }

      if (!profile.client_company_id) {
        setError('Keine Firma zugeordnet.');
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

      if (companyData) {
        setCompany(companyData);
      }

      // Employee laden
      const { data: employeeData } = await supabase
        .from('v7_employees')
        .select('*')
        .eq('client_company_id', profile.client_company_id)
        .eq('email', user.email)
        .maybeSingle();

      if (employeeData) {
        setEmployee(employeeData);
      }

      // Stats laden
      const { count: projectCount } = await supabase
        .from('v7_projects')
        .select('*', { count: 'exact', head: true })
        .eq('client_company_id', profile.client_company_id)
        .eq('is_active', true);

      const { count: employeeCount } = await supabase
        .from('v7_employees')
        .select('*', { count: 'exact', head: true })
        .eq('client_company_id', profile.client_company_id)
        .eq('is_active', true);

      setStats({
        projectCount: projectCount || 0,
        employeeCount: employeeCount || 0,
      });

      // Projekte laden
      await loadProjects(profile.client_company_id, profile.role, employeeData);

    } catch (err: any) {
      console.error('Fehler:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadProjects = async (
    companyId: string, 
    role: V7UserRole, 
    employeeData: V7Employee | null
  ) => {
    let query = supabase
      .from('v7_projects')
      .select('id, name, short_name, funding_format, funding_reference, end_date')
      .eq('client_company_id', companyId)
      .eq('is_active', true)
      .order('name')
      .limit(20);

    // Nicht-Admins: nur zugeordnete Projekte
    if (role !== 'client_admin' && employeeData) {
      const { data: assignments } = await supabase
        .from('v7_project_assignments')
        .select('project_id')
        .eq('employee_id', employeeData.id)
        .eq('is_active', true);

      if (assignments && assignments.length > 0) {
        query = query.in('id', assignments.map(a => a.project_id));
      } else {
        setProjects([]);
        return;
      }
    }

    const { data } = await query;
    if (data) setProjects(data);
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
    if (employee?.portal_role) return employee.portal_role;
    return 'employee';
  };

  const isAdmin = (): boolean => {
    return userProfile?.role === 'client_admin' || getPortalRole() === 'client_admin';
  };

  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('de-DE');
  };

  // ============================================================================
  // RENDER
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
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md text-center">
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
  const showAdminContent = isAdmin();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <PortalHeader
        portal="firma"
        userName={userName}
        userRole={portalRole}
        companyName={company?.name || 'Firma'}
      />

      {/* Navigation */}
      <PortalNav
        portal="firma"
        userRole={userProfile?.role || 'client_user'}
        portalRole={portalRole}
        currentPath={pathname}
      />

      {/* Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        
        {/* Willkommen */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Willkommen, {userName}!
          </h1>
          
          {/* Quick Stats (nur Admin) */}
          {showAdminContent && (
            <div className="mt-4 flex flex-wrap gap-4 text-sm">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-white rounded-full border border-gray-200">
                <FolderKanban className="w-4 h-4 text-green-600" />
                <span>{stats.projectCount} Projekte</span>
              </span>
              <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-white rounded-full border border-gray-200">
                <Users className="w-4 h-4 text-blue-600" />
                <span>{stats.employeeCount} Mitarbeiter</span>
              </span>
            </div>
          )}
        </div>

        {/* Projekte */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {showAdminContent ? 'Aktive Projekte' : 'Meine Projekte'}
            </h2>
            {showAdminContent && (
              <Link 
                href="/v7/firma/projekte"
                className="text-sm text-green-600 hover:text-green-700 font-medium"
              >
                Alle anzeigen
              </Link>
            )}
          </div>

          {projects.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
              <FolderKanban className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">
                {showAdminContent 
                  ? 'Noch keine Projekte vorhanden.' 
                  : 'Keine Projekte zugeordnet.'
                }
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Projekt</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase hidden sm:table-cell">Format</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase hidden md:table-cell">FKZ</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase hidden lg:table-cell">Laufzeit bis</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {projects.map((p) => (
                    <tr 
                      key={p.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => router.push(`/v7/firma/projekte/${p.id}`)}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{p.name}</div>
                        {p.short_name && <div className="text-sm text-gray-500">{p.short_name}</div>}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        {p.funding_format ? (
                          <span className="px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-700">
                            {p.funding_format}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 hidden md:table-cell">
                        {p.funding_reference || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 hidden lg:table-cell">
                        {formatDate(p.end_date)}
                      </td>
                      <td className="px-4 py-3">
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <p className="text-center text-sm text-gray-500">
            PZE v7.3.42 | {company?.name}
          </p>
        </div>
      </footer>
    </div>
  );
}
