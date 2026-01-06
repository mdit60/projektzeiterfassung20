// src/app/v7/firma/page.tsx
// VERSION: v7.3.0 - Firmen-Dashboard (Client-Sicht)
// DATUM: 06. Januar 2026

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

// ============================================
// TYPEN
// ============================================

interface UserProfile {
  id: string;
  email: string;
  role: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  client_company_id: string | null;
}

interface ClientCompany {
  id: string;
  name: string;
  short_name: string | null;
  street: string | null;
  zip_code: string | null;
  city: string | null;
  federal_state: string | null;
  contact_person: string | null;
  contact_email: string | null;
}

interface DashboardStats {
  projectCount: number;
  employeeCount: number;
  workPackageCount: number;
  timesheetEntriesThisMonth: number;
}

// ============================================
// KOMPONENTE
// ============================================

export default function FirmaDashboard() {
  const router = useRouter();
  const supabase = createClient();

  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [company, setCompany] = useState<ClientCompany | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    projectCount: 0,
    employeeCount: 0,
    workPackageCount: 0,
    timesheetEntriesThisMonth: 0,
  });

  // ============================================
  // AUTH & DATEN LADEN
  // ============================================

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  const checkAuthAndLoadData = async () => {
    try {
      // Auth prüfen
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

      // Prüfen ob Firmen-Rolle
      if (profile.role === 'consultant' || profile.role === 'system_admin') {
        router.push('/v7/berater');
        return;
      }

      // Prüfen ob Firma zugeordnet
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

      // Statistiken laden
      await loadStats(profile.client_company_id, profile.role, profile.id);

    } catch (err: any) {
      console.error('Fehler:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async (companyId: string, role: string, userId: string) => {
    // Projekte zählen
    const { count: projectCount } = await supabase
      .from('v7_projects')
      .select('*', { count: 'exact', head: true })
      .eq('client_company_id', companyId)
      .eq('is_active', true);

    // Mitarbeiter zählen
    const { count: employeeCount } = await supabase
      .from('v7_employees')
      .select('*', { count: 'exact', head: true })
      .eq('client_company_id', companyId)
      .eq('is_active', true);

    // Arbeitspakete zählen (über Projekte)
    const { data: projects } = await supabase
      .from('v7_projects')
      .select('id')
      .eq('client_company_id', companyId)
      .eq('is_active', true);

    let workPackageCount = 0;
    if (projects && projects.length > 0) {
      const projectIds = projects.map(p => p.id);
      const { count } = await supabase
        .from('v7_work_packages')
        .select('*', { count: 'exact', head: true })
        .in('project_id', projectIds)
        .eq('is_active', true);
      workPackageCount = count || 0;
    }

    // Zeiteinträge diesen Monat (je nach Rolle)
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const lastOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    let timesheetQuery = supabase
      .from('v7_timesheets')
      .select('*', { count: 'exact', head: true })
      .gte('work_date', firstOfMonth)
      .lte('work_date', lastOfMonth)
      .eq('is_active', true);

    // Mitarbeiter sehen nur eigene Einträge
    if (role === 'client_user' || role === 'employee') {
      // Hier müssten wir den Employee-Eintrag des Users finden
      const { data: employee } = await supabase
        .from('v7_employees')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (employee) {
        timesheetQuery = timesheetQuery.eq('employee_id', employee.id);
      }
    }

    const { count: timesheetCount } = await timesheetQuery;

    setStats({
      projectCount: projectCount || 0,
      employeeCount: employeeCount || 0,
      workPackageCount: workPackageCount,
      timesheetEntriesThisMonth: timesheetCount || 0,
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  // ============================================
  // RENDER: LOADING
  // ============================================

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Wird geladen...</p>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER: ERROR
  // ============================================

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Fehler</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/login')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Zurück zum Login
          </button>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER: DASHBOARD
  // ============================================

  const isAdmin = userProfile?.role === 'client_admin' || userProfile?.role === 'project_leader';
  const userName = userProfile?.display_name || userProfile?.first_name || userProfile?.email?.split('@')[0] || 'Benutzer';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-green-600 text-white rounded-lg flex items-center justify-center font-bold">
                {company?.short_name?.substring(0, 2).toUpperCase() || company?.name?.substring(0, 2).toUpperCase() || 'F'}
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{company?.name}</h1>
                <p className="text-sm text-gray-500">Firmen-Portal</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                👤 {userName}
                {isAdmin && <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">Admin</span>}
              </span>
              <button
                onClick={handleLogout}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Abmelden
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Willkommen */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">
            Willkommen, {userName}!
          </h2>
          <p className="text-gray-600 mt-1">
            {isAdmin 
              ? 'Verwalten Sie Projekte, Mitarbeiter und Zeiterfassung.' 
              : 'Erfassen Sie hier Ihre Arbeitszeiten.'}
          </p>
        </div>

        {/* Statistik-Karten */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Projekte */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Projekte</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.projectCount}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">📁</span>
              </div>
            </div>
          </div>

          {/* Mitarbeiter (nur für Admin) */}
          {isAdmin && (
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Mitarbeiter</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{stats.employeeCount}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">👥</span>
                </div>
              </div>
            </div>
          )}

          {/* Arbeitspakete */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Arbeitspakete</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.workPackageCount}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">📦</span>
              </div>
            </div>
          </div>

          {/* Zeiteinträge diesen Monat */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Einträge (Monat)</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.timesheetEntriesThisMonth}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">⏱️</span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation-Kacheln */}
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Bereiche</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Zeiterfassung */}
          <Link href="/v7/firma/zeiterfassung" className="block">
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md hover:border-blue-200 transition-all cursor-pointer">
              <div className="flex items-start space-x-4">
                <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center">
                  <span className="text-3xl">⏱️</span>
                </div>
                <div className="flex-1">
                  <h4 className="text-lg font-semibold text-gray-900">Zeiterfassung</h4>
                  <p className="text-sm text-gray-500 mt-1">
                    {isAdmin ? 'Arbeitszeiten aller Mitarbeiter verwalten' : 'Eigene Arbeitszeiten erfassen'}
                  </p>
                </div>
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>

          {/* Projekte (nur Admin) */}
          {isAdmin && (
            <Link href="/v7/firma/projekte" className="block">
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md hover:border-blue-200 transition-all cursor-pointer">
                <div className="flex items-start space-x-4">
                  <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center">
                    <span className="text-3xl">📁</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-lg font-semibold text-gray-900">Projekte</h4>
                    <p className="text-sm text-gray-500 mt-1">
                      Projekte und Arbeitspakete verwalten
                    </p>
                  </div>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>
          )}

          {/* Mitarbeiter (nur Admin) */}
          {isAdmin && (
            <Link href="/v7/firma/mitarbeiter" className="block">
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md hover:border-blue-200 transition-all cursor-pointer">
                <div className="flex items-start space-x-4">
                  <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center">
                    <span className="text-3xl">👥</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-lg font-semibold text-gray-900">Mitarbeiter</h4>
                    <p className="text-sm text-gray-500 mt-1">
                      Mitarbeiter verwalten und einladen
                    </p>
                  </div>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>
          )}

          {/* Berichte (nur Admin) */}
          {isAdmin && (
            <Link href="/v7/firma/berichte" className="block">
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md hover:border-blue-200 transition-all cursor-pointer">
                <div className="flex items-start space-x-4">
                  <div className="w-14 h-14 bg-orange-100 rounded-xl flex items-center justify-center">
                    <span className="text-3xl">📊</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-lg font-semibold text-gray-900">Berichte</h4>
                    <p className="text-sm text-gray-500 mt-1">
                      Auswertungen und Exporte
                    </p>
                  </div>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>
          )}
        </div>

        {/* Firmendaten (nur Admin) */}
        {isAdmin && company && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Firmendaten</h3>
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-500">Adresse</p>
                  <p className="text-gray-900">
                    {company.street}<br />
                    {company.zip_code} {company.city}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Ansprechpartner</p>
                  <p className="text-gray-900">{company.contact_person || '-'}</p>
                  <p className="text-gray-600 text-sm">{company.contact_email || '-'}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Hinweis für normale Mitarbeiter */}
        {!isAdmin && (
          <div className="mt-8 bg-blue-50 border border-blue-100 rounded-xl p-6">
            <div className="flex items-start space-x-3">
              <span className="text-2xl">💡</span>
              <div>
                <h4 className="font-medium text-blue-900">Tipp</h4>
                <p className="text-sm text-blue-700 mt-1">
                  Erfassen Sie Ihre Arbeitszeiten regelmäßig über den Bereich "Zeiterfassung". 
                  Bei Fragen wenden Sie sich an Ihren Projektleiter.
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
            Projektzeiterfassung v7.3 · © {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
}
