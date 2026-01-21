// src/app/v7/firma/dashboard/page.tsx
// ============================================================================
// PZE V7 - Firmen-Portal Dashboard
// ============================================================================
// Datum: 21. Januar 2026
// Version: 7.3.45
//
// Dashboard mit:
// - Sub-Navigation unter dem Header (Firmendaten | Projekte | Mitarbeiter)
// - Willkommen-Bereich mit Badges
// - Aktive Projekte Tabelle
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
  const [projects, setProjects] = useState<V7Project[]>([]);
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

      // Projekte laden
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
    if (employee?.portal_role) return employee.portal_role;
    return 'employee';
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

      {/* Sub-Navigation */}
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

      {/* Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        
        {/* Willkommen */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Willkommen, {userName}!
          </h1>
          
          {/* Badges */}
          <div className="flex gap-3 mt-4">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-full text-sm text-gray-700">
              <FolderKanban size={16} className="text-blue-500" />
              {projects.length} Projekte
            </span>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-full text-sm text-gray-700">
              <Users size={16} className="text-purple-500" />
              {employeeCount} Mitarbeiter
            </span>
          </div>
        </div>

        {/* Aktive Projekte */}
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
                  {projects.map((project) => (
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

      {/* Footer */}
      <footer className="bg-white border-t mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <p className="text-center text-sm text-gray-500">
            PZE v7.3.45 | {company?.name}
          </p>
        </div>
      </footer>
    </div>
  );
}
