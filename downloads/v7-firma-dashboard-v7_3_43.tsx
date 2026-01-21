// src/app/v7/firma/dashboard/page.tsx
// ============================================================================
// PZE V7 - Firmen-Portal Dashboard
// ============================================================================
// Datum: 21. Januar 2026
// Version: 7.3.43
//
// Dashboard fuer Firmen-Portal mit rollenbasierter Ansicht:
// - client_admin: Vollstaendiges Dashboard mit allen Kacheln
// - project_leader: Nur zugeordnete Projekte
// - employee: Nur eigene Projekte und Zeiterfassung
// ============================================================================

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import {
  Building2,
  FolderKanban,
  Users,
  Clock,
  BarChart3,
  ChevronRight,
  AlertCircle,
  TrendingUp,
  Calendar,
} from 'lucide-react';

// Gemeinsame Komponenten
import PortalHeader from '@/components/shared/PortalHeader';
import { CapacitySummary } from '@/components/shared/CapacityBar';

// Types und Constants
import { 
  V7UserRole, 
  V7EmployeePortalRole,
  V7Employee,
  V7Project,
  V7ClientCompany,
} from '@/types/v7-types';
import { MONTH_NAMES } from '@/lib/v7-constants';

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

interface DashboardStats {
  projectCount: number;
  employeeCount: number;
  activeProjectCount: number;
  hoursThisMonth: number;
}

interface ProjectSummary {
  id: string;
  name: string;
  funding_format: string | null;
  funding_reference: string | null;
  progress_percentage: number;
  hours_booked: number;
  hours_planned: number;
}

// ============================================================================
// KOMPONENTE
// ============================================================================

export default function FirmaDashboard() {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClientComponentClient();

  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [employee, setEmployee] = useState<V7Employee | null>(null);
  const [company, setCompany] = useState<V7ClientCompany | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    projectCount: 0,
    employeeCount: 0,
    activeProjectCount: 0,
    hoursThisMonth: 0,
  });
  const [recentProjects, setRecentProjects] = useState<ProjectSummary[]>([]);

  // Aktueller Monat
  const now = new Date();
  const currentMonth = MONTH_NAMES[now.getMonth()];
  const currentYear = now.getFullYear();

  // ============================================================================
  // AUTH & DATEN LADEN
  // ============================================================================

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  const checkAuthAndLoadData = async () => {
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
        setError('Kein Profil gefunden. Bitte Administrator kontaktieren.');
        setLoading(false);
        return;
      }

      // Pruefen ob Berater-Rolle -> Weiterleitung
      if (profile.role === 'consultant' || profile.role === 'system_admin') {
        router.push('/v7/berater/dashboard');
        return;
      }

      // Pruefen ob Firma zugeordnet
      if (!profile.client_company_id) {
        setError('Keine Firma zugeordnet. Bitte Administrator kontaktieren.');
        setLoading(false);
        return;
      }

      setUserProfile(profile);

      // Firma laden
      const { data: companyData, error: companyError } = await supabase
        .from('v7_client_companies')
        .select('*')
        .eq('id', profile.client_company_id)
        .single();

      if (companyError || !companyData) {
        setError('Firma nicht gefunden.');
        setLoading(false);
        return;
      }

      setCompany(companyData);

      // Employee-Datensatz des Users laden (falls vorhanden)
      const { data: employeeData } = await supabase
        .from('v7_employees')
        .select('*')
        .eq('client_company_id', profile.client_company_id)
        .eq('email', user.email)
        .maybeSingle();

      if (employeeData) {
        setEmployee(employeeData);
      }

      // Statistiken laden
      await loadStats(profile.client_company_id, profile.role, employeeData);

      // Projekte laden
      await loadProjects(profile.client_company_id, profile.role, employeeData);

    } catch (err: any) {
      console.error('Fehler:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async (
    companyId: string, 
    role: V7UserRole, 
    employeeData: V7Employee | null
  ) => {
    // Projekte zaehlen
    const { count: projectCount } = await supabase
      .from('v7_projects')
      .select('*', { count: 'exact', head: true })
      .eq('client_company_id', companyId)
      .eq('is_active', true);

    // Mitarbeiter zaehlen
    const { count: employeeCount } = await supabase
      .from('v7_employees')
      .select('*', { count: 'exact', head: true })
      .eq('client_company_id', companyId)
      .eq('is_active', true);

    // Stunden diesen Monat
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    let hoursQuery = supabase
      .from('v7_timesheets')
      .select('total_hours')
      .eq('year', year)
      .eq('month', month);

    // Fuer nicht-Admins nur eigene Stunden
    if (role !== 'client_admin' && employeeData) {
      hoursQuery = hoursQuery.eq('employee_id', employeeData.id);
    }

    const { data: timesheets } = await hoursQuery;
    const totalHours = timesheets?.reduce((sum, t) => sum + (t.total_hours || 0), 0) || 0;

    setStats({
      projectCount: projectCount || 0,
      employeeCount: employeeCount || 0,
      activeProjectCount: projectCount || 0,
      hoursThisMonth: totalHours,
    });
  };

  const loadProjects = async (
    companyId: string, 
    role: V7UserRole, 
    employeeData: V7Employee | null
  ) => {
    let query = supabase
      .from('v7_projects')
      .select('id, name, funding_format, funding_reference')
      .eq('client_company_id', companyId)
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(5);

    // Fuer nicht-Admins nur zugeordnete Projekte
    if (role !== 'client_admin' && employeeData) {
      const { data: assignments } = await supabase
        .from('v7_project_assignments')
        .select('project_id')
        .eq('employee_id', employeeData.id)
        .eq('is_active', true);

      if (assignments && assignments.length > 0) {
        const projectIds = assignments.map(a => a.project_id);
        query = query.in('id', projectIds);
      } else {
        // Keine Zuordnungen -> leere Liste
        setRecentProjects([]);
        return;
      }
    }

    const { data: projects } = await query;

    if (projects) {
      // Vereinfachte Projekt-Summary (ohne Stunden-Berechnung erstmal)
      const summaries: ProjectSummary[] = projects.map(p => ({
        id: p.id,
        name: p.name,
        funding_format: p.funding_format,
        funding_reference: p.funding_reference,
        progress_percentage: 0,
        hours_booked: 0,
        hours_planned: 0,
      }));
      setRecentProjects(summaries);
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
    return userProfile?.email || 'Benutzer';
  };

  const getPortalRole = (): V7EmployeePortalRole => {
    if (userProfile?.role === 'client_admin') return 'client_admin';
    if (employee?.portal_role) return employee.portal_role;
    return 'employee';
  };

  const isAdmin = (): boolean => {
    return userProfile?.role === 'client_admin' || getPortalRole() === 'client_admin';
  };

  // ============================================================================
  // RENDER: LOADING
  // ============================================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Laden...</p>
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER: ERROR
  // ============================================================================

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Fehler</h2>
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

  // ============================================================================
  // RENDER: DASHBOARD
  // ============================================================================

  const userName = getUserName();
  const portalRole = getPortalRole();
  const showAdminContent = isAdmin();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <PortalHeader
        portal="firma"
        userRole={userProfile?.role || 'client_user'}
        portalRole={portalRole}
        userName={userName}
        userEmail={userProfile?.email || ''}
        companyName={company?.name}
        currentPath={pathname}
      />

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Willkommen */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Willkommen, {userName}!
          </h1>
          <p className="text-gray-600 mt-1">
            {showAdminContent 
              ? `${company?.name} - Verwalten Sie Projekte, Mitarbeiter und Zeiterfassung.`
              : `${company?.name} - Ihre Projekte und Zeiterfassung.`
            }
          </p>
        </div>

        {/* Statistik-Karten (Admin-Sicht) */}
        {showAdminContent && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Projekte */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Aktive Projekte</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{stats.projectCount}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <FolderKanban className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            {/* Mitarbeiter */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Mitarbeiter</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{stats.employeeCount}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            {/* Stunden diesen Monat */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Stunden {currentMonth}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">
                    {stats.hoursThisMonth.toLocaleString('de-DE')}
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>

            {/* Auslastung */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Durchschn. Auslastung</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">--</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Haupt-Kacheln */}
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {showAdminContent ? 'Bereiche' : 'Meine Bereiche'}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          
          {/* Firmendaten (nur Admin) */}
          {showAdminContent && (
            <Link href="/v7/firma/firmendaten" className="block group">
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 
                            hover:shadow-md hover:border-green-300 transition-all h-full">
                <div className="flex items-start space-x-4">
                  <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center
                                group-hover:bg-green-200 transition-colors">
                    <Building2 className="w-7 h-7 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">Firmendaten</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Stammdaten anzeigen und bearbeiten
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-green-600 transition-colors" />
                </div>
              </div>
            </Link>
          )}

          {/* Projekte */}
          <Link 
            href={showAdminContent ? '/v7/firma/projekte' : '/v7/firma/meine-projekte'} 
            className="block group"
          >
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 
                          hover:shadow-md hover:border-green-300 transition-all h-full">
              <div className="flex items-start space-x-4">
                <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center
                              group-hover:bg-blue-200 transition-colors">
                  <FolderKanban className="w-7 h-7 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {showAdminContent ? 'Projekte' : 'Meine Projekte'}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {showAdminContent 
                      ? `${stats.projectCount} aktive Projekte verwalten`
                      : 'Zugeordnete Projekte ansehen'
                    }
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-green-600 transition-colors" />
              </div>
            </div>
          </Link>

          {/* Mitarbeiter (nur Admin) */}
          {showAdminContent && (
            <Link href="/v7/firma/mitarbeiter" className="block group">
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 
                            hover:shadow-md hover:border-green-300 transition-all h-full">
                <div className="flex items-start space-x-4">
                  <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center
                                group-hover:bg-purple-200 transition-colors">
                    <Users className="w-7 h-7 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">Mitarbeiter</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {stats.employeeCount} Mitarbeiter verwalten
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-green-600 transition-colors" />
                </div>
              </div>
            </Link>
          )}

          {/* Zeiterfassung */}
          <Link 
            href={showAdminContent ? '/v7/firma/zeiterfassung' : '/v7/firma/meine-zeiterfassung'} 
            className="block group"
          >
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 
                          hover:shadow-md hover:border-green-300 transition-all h-full">
              <div className="flex items-start space-x-4">
                <div className="w-14 h-14 bg-orange-100 rounded-xl flex items-center justify-center
                              group-hover:bg-orange-200 transition-colors">
                  <Clock className="w-7 h-7 text-orange-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {showAdminContent ? 'Zeiterfassung' : 'Meine Zeiterfassung'}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {showAdminContent 
                      ? 'Stundennachweise aller Mitarbeiter'
                      : 'Eigene Arbeitszeiten erfassen'
                    }
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-green-600 transition-colors" />
              </div>
            </div>
          </Link>

          {/* Mein Status (fuer alle) */}
          <Link href="/v7/firma/mein-status" className="block group">
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 
                          hover:shadow-md hover:border-green-300 transition-all h-full">
              <div className="flex items-start space-x-4">
                <div className="w-14 h-14 bg-teal-100 rounded-xl flex items-center justify-center
                              group-hover:bg-teal-200 transition-colors">
                  <BarChart3 className="w-7 h-7 text-teal-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {showAdminContent ? 'Berichte' : 'Mein Status'}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {showAdminContent 
                      ? 'Auswertungen und Exporte'
                      : 'Projekt-Fortschritt und Kapazitaet'
                    }
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-green-600 transition-colors" />
              </div>
            </div>
          </Link>
        </div>

        {/* Hinweis fuer Employee */}
        {!showAdminContent && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-6">
            <div className="flex items-start space-x-3">
              <Calendar className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-green-900">Tipp zur Zeiterfassung</h4>
                <p className="text-sm text-green-700 mt-1">
                  Erfassen Sie Ihre Arbeitszeiten regelmaessig ueber "Meine Zeiterfassung". 
                  Unter "Mein Status" sehen Sie, wie viele Stunden Sie noch auf Ihre Projekte buchen koennen.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-sm text-gray-500">
            Projektzeiterfassung v7.3.43 | {company?.name} | {currentYear}
          </p>
        </div>
      </footer>
    </div>
  );
}

// ============================================================================
// ENDE
// ============================================================================
