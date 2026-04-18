// src/app/v7/berater/foerderung/page.tsx
// VERSION: v7.1.2 - Firmenübersicht mit Link zu Detailseite
// DATUM: 03. Januar 2026

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

// ============================================
// TYPEN
// ============================================

interface ClientCompany {
  id: string;
  name: string;
  short_name: string | null;
  city: string | null;
  federal_state: string | null;
  is_active: boolean;
  created_at: string;
  project_count?: number;
  employee_count?: number;
}

interface UserProfile {
  id: string;
  email: string;
  role: string;
  consultant_company_id: string | null;
  display_name: string | null;
}

// ============================================
// BUNDESLÄNDER MAPPING
// ============================================

const BUNDESLAND_NAMES: Record<string, string> = {
  'DE-BW': 'Baden-Württemberg',
  'DE-BY': 'Bayern',
  'DE-BE': 'Berlin',
  'DE-BB': 'Brandenburg',
  'DE-HB': 'Bremen',
  'DE-HH': 'Hamburg',
  'DE-HE': 'Hessen',
  'DE-MV': 'Mecklenburg-Vorpommern',
  'DE-NI': 'Niedersachsen',
  'DE-NW': 'Nordrhein-Westfalen',
  'DE-RP': 'Rheinland-Pfalz',
  'DE-SL': 'Saarland',
  'DE-SN': 'Sachsen',
  'DE-ST': 'Sachsen-Anhalt',
  'DE-SH': 'Schleswig-Holstein',
  'DE-TH': 'Thüringen',
};

// ============================================
// KOMPONENTE
// ============================================

export default function FoerderungPage() {
  const router = useRouter();
  const supabase = createClient();

  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [companies, setCompanies] = useState<ClientCompany[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // ============================================
  // AUTH & DATEN LADEN
  // ============================================

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  const checkAuthAndLoadData = async () => {
    try {
      // 1. Auth prüfen
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        router.push('/login');
        return;
      }

      // 2. Profil laden
      const { data: profile, error: profileError } = await supabase
        .from('v7_user_profiles')
        .select('*')
        .eq('email', user.email)
        .maybeSingle();

      if (profileError || !profile) {
        setError('Kein V7-Profil gefunden. Bitte Administrator kontaktieren.');
        setLoading(false);
        return;
      }

      // 3. Rolle prüfen
      if (profile.role !== 'consultant' && profile.role !== 'system_admin') {
        router.push('/v7/firma');
        return;
      }

      setUserProfile(profile);

      // 4. Kundenfirmen laden
      await loadCompanies(profile.consultant_company_id);

    } catch (err: any) {
      console.error('Auth-Fehler:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadCompanies = async (consultantCompanyId: string | null) => {
    if (!consultantCompanyId) {
      setCompanies([]);
      return;
    }

    // Firmen laden
    const { data: companiesData, error: companiesError } = await supabase
      .from('v7_client_companies')
      .select('*')
      .eq('consultant_company_id', consultantCompanyId)
      .eq('is_active', true)
      .order('name');

    if (companiesError) {
      console.error('Firmen-Fehler:', companiesError);
      return;
    }

    // Für jede Firma: Projekt- und MA-Anzahl laden
    const companiesWithCounts = await Promise.all(
      (companiesData || []).map(async (company) => {
        // Projekte zählen
        const { count: projectCount } = await supabase
          .from('v7_projects')
          .select('*', { count: 'exact', head: true })
          .eq('client_company_id', company.id)
          .eq('is_active', true);

        // Mitarbeiter zählen
        const { count: employeeCount } = await supabase
          .from('v7_employees')
          .select('*', { count: 'exact', head: true })
          .eq('client_company_id', company.id)
          .eq('is_active', true);

        return {
          ...company,
          project_count: projectCount || 0,
          employee_count: employeeCount || 0,
        };
      })
    );

    setCompanies(companiesWithCounts);
  };

  // ============================================
  // FILTER
  // ============================================

  const filteredCompanies = companies.filter(company => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      company.name.toLowerCase().includes(search) ||
      (company.short_name && company.short_name.toLowerCase().includes(search)) ||
      (company.city && company.city.toLowerCase().includes(search))
    );
  });

  // ============================================
  // LOGOUT
  // ============================================

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
          <p className="mt-4 text-gray-600">Lade Daten...</p>
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
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
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
  // RENDER: HAUPTSEITE
  // ============================================

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/v7/berater')}
                className="text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Zurück
              </button>
              <div className="h-6 w-px bg-gray-300"></div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Förderberatung</h1>
                <p className="text-sm text-gray-500">ZIM, BMBF, KMU-innovativ</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/v7/berater/foerderung/import"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Neuer Import
              </Link>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm"
              >
                Abmelden
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Suchfeld */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <svg
              className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Firma suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Statistik */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl font-bold text-blue-600">{companies.length}</div>
            <div className="text-sm text-gray-500 mt-1">Kundenfirmen</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl font-bold text-green-600">
              {companies.reduce((sum, c) => sum + (c.project_count || 0), 0)}
            </div>
            <div className="text-sm text-gray-500 mt-1">Förderprojekte gesamt</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl font-bold text-purple-600">
              {companies.reduce((sum, c) => sum + (c.employee_count || 0), 0)}
            </div>
            <div className="text-sm text-gray-500 mt-1">Mitarbeiter gesamt</div>
          </div>
        </div>

        {/* Firmenliste */}
        {filteredCompanies.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            {companies.length === 0 ? (
              <>
                <div className="text-5xl mb-4">🏢</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Keine Kundenfirmen vorhanden</h3>
                <p className="text-gray-500 mb-6">
                  Importieren Sie einen ZIM-Antrag, um die erste Firma anzulegen.
                </p>
                <Link
                  href="/v7/berater/foerderung/import"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  + Neuer Import
                </Link>
              </>
            ) : (
              <>
                <div className="text-5xl mb-4">🔍</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Keine Treffer</h3>
                <p className="text-gray-500">Keine Firma gefunden für "{searchTerm}"</p>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCompanies.map(company => (
              <Link
                key={company.id}
                href={`/v7/berater/foerderung/firma/${company.id}`}
                className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer block"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{company.name}</h3>
                    {company.short_name && (
                      <p className="text-sm text-gray-500">{company.short_name}</p>
                    )}
                  </div>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
                
                <div className="text-sm text-gray-500 mb-4">
                  {company.city && <span>{company.city}</span>}
                  {company.city && company.federal_state && <span> • </span>}
                  {company.federal_state && (
                    <span>{BUNDESLAND_NAMES[company.federal_state] || company.federal_state}</span>
                  )}
                </div>

                <div className="flex gap-4 text-sm">
                  <div className="flex items-center gap-1.5">
                    <span className="text-blue-600">📁</span>
                    <span className="text-gray-600">{company.project_count} Projekte</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-green-600">👥</span>
                    <span className="text-gray-600">{company.employee_count} MA</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
