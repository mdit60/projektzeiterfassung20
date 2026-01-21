// src/app/v7/firma/projekte/page.tsx
// ============================================================================
// PZE V7 - Projektliste
// ============================================================================
// Datum: 21. Januar 2026
// Version: 7.3.42
//
// Liste aller Projekte der Firma
// Klick auf Projekt oeffnet Projekt-Detail
// ============================================================================

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  FolderKanban,
  Plus,
  ChevronRight,
  AlertCircle,
  Search,
} from 'lucide-react';

// Komponenten
import PortalHeader from '@/components/shared/PortalHeader';
import PortalNav from '@/components/shared/PortalNav';

// Types
import { V7UserRole, V7EmployeePortalRole, V7Employee, V7ClientCompany } from '@/types/v7-types';

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

interface Project {
  id: string;
  name: string;
  short_name: string | null;
  funding_format: string | null;
  funding_reference: string | null;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
}

// ============================================================================
// KOMPONENTE
// ============================================================================

export default function ProjektListe() {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [employee, setEmployee] = useState<V7Employee | null>(null);
  const [company, setCompany] = useState<V7ClientCompany | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

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

      const { data: profile } = await supabase
        .from('v7_user_profiles')
        .select('*')
        .eq('email', user.email)
        .maybeSingle();

      if (!profile || !profile.client_company_id) {
        setError('Kein Zugriff');
        setLoading(false);
        return;
      }

      setUserProfile(profile);

      const { data: companyData } = await supabase
        .from('v7_client_companies')
        .select('*')
        .eq('id', profile.client_company_id)
        .single();

      if (companyData) setCompany(companyData);

      const { data: employeeData } = await supabase
        .from('v7_employees')
        .select('*')
        .eq('client_company_id', profile.client_company_id)
        .eq('email', user.email)
        .maybeSingle();

      if (employeeData) setEmployee(employeeData);

      // Projekte laden
      const { data: projectData } = await supabase
        .from('v7_projects')
        .select('*')
        .eq('client_company_id', profile.client_company_id)
        .eq('is_active', true)
        .order('name');

      if (projectData) setProjects(projectData);

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

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.funding_reference && p.funding_reference.toLowerCase().includes(searchTerm.toLowerCase()))
  );

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
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  const userName = getUserName();
  const portalRole = getPortalRole();

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
        
        {/* Header mit Suche und Button */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Projekte</h1>
          
          <div className="flex items-center gap-4">
            {/* Suche */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Suchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm w-48
                           focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            
            {/* Neues Projekt Button */}
            {portalRole === 'client_admin' && (
              <button
                onClick={() => router.push('/v7/firma/projekte/neu')}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg
                           hover:bg-green-700 transition-colors text-sm font-medium"
              >
                <Plus size={18} />
                <span className="hidden sm:inline">Neues Projekt</span>
              </button>
            )}
          </div>
        </div>

        {/* Projektliste */}
        {filteredProjects.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <FolderKanban className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">
              {searchTerm ? 'Keine Projekte gefunden.' : 'Noch keine Projekte vorhanden.'}
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
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase hidden lg:table-cell">Laufzeit</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredProjects.map((project) => (
                  <tr
                    key={project.id}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => router.push(`/v7/firma/projekte/${project.id}`)}
                  >
                    <td className="px-4 py-4">
                      <div className="font-medium text-gray-900">{project.name}</div>
                      {project.short_name && (
                        <div className="text-sm text-gray-500">{project.short_name}</div>
                      )}
                    </td>
                    <td className="px-4 py-4 hidden sm:table-cell">
                      {project.funding_format ? (
                        <span className="px-2 py-1 text-xs font-medium rounded bg-green-100 text-green-700">
                          {project.funding_format}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600 hidden md:table-cell">
                      {project.funding_reference || '-'}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600 hidden lg:table-cell">
                      {formatDate(project.start_date)} - {formatDate(project.end_date)}
                    </td>
                    <td className="px-4 py-4">
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Anzahl */}
        <div className="mt-4 text-sm text-gray-500">
          {filteredProjects.length} {filteredProjects.length === 1 ? 'Projekt' : 'Projekte'}
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
