// ==================================================
// Datei: src/app/dashboard/page.tsx
// Dashboard mit Position-Anzeige statt Rolle
// ==================================================

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

interface Company {
  id: string;
  name: string;
  legal_form: string | null;
  street: string | null;
  house_number: string | null;
  postal_code: string | null;
  city: string | null;
  website: string | null;
  ust_id: string | null;
}

interface UserProfile {
  id: string;
  user_id: string;
  company_id: string;
  name: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  role: 'admin' | 'user';
  job_function: string | null;
  department: string | null;
  is_active: boolean;
}

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // Profil laden
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profileError || !profileData) {
        console.error('Error loading profile:', profileError);
        router.push('/login');
        return;
      }

      setProfile(profileData);

      // Firma laden
      const { data: companyData } = await supabase
        .from('companies')
        .select('*')
        .eq('id', profileData.company_id)
        .single();

      if (companyData) {
        setCompany(companyData);
      }

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  // Position oder Fallback anzeigen
  const getDisplayPosition = () => {
    if (profile?.job_function) {
      return profile.job_function;
    }
    // Fallback auf Rolle wenn keine Position gesetzt
    return profile?.role === 'admin' ? 'Projektleiter' : 'Mitarbeiter';
  };

  // Prüfen ob User Admin ist
  const isAdmin = profile?.role === 'admin';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <div className="mt-4 text-gray-600">Laden...</div>
        </div>
      </div>
    );
  }

  const firstName = profile?.first_name || profile?.name?.split(' ')[0] || 'User';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo und Firmenname */}
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">{company?.name || 'Firma'}</h1>
                <p className="text-xs text-gray-500">Dashboard</p>
              </div>
            </div>

            {/* User Info */}
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{profile?.name}</p>
                {/* Position statt Rolle anzeigen */}
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                  {getDisplayPosition()}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Welcome */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 italic">Willkommen, {firstName}!</h2>
          <p className="text-gray-600 mt-1">Verwalten Sie Ihre Projekte, Mitarbeiter und Arbeitszeiten</p>
        </div>

        {/* Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Projekte - Nur für Admin */}
          {isAdmin && (
            <button
              onClick={() => router.push('/projekte')}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-blue-300 transition-all text-left group"
            >
              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4 group-hover:bg-blue-200 transition-colors">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Projekte</h3>
                  <p className="text-sm text-gray-500">Projekte verwalten und erstellen</p>
                </div>
              </div>
            </button>
          )}

          {/* Mitarbeiter - Nur für Admin */}
          {isAdmin && (
            <button
              onClick={() => router.push('/mitarbeiter')}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-teal-300 transition-all text-left group"
            >
              <div className="flex items-center">
                <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center mr-4 group-hover:bg-teal-200 transition-colors">
                  <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Mitarbeiter</h3>
                  <p className="text-sm text-gray-500">Team verwalten und Rollen zuweisen</p>
                </div>
              </div>
            </button>
          )}

          {/* Zeiterfassung - Für alle */}
          <button
            onClick={() => router.push('/zeiterfassung')}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-red-300 transition-all text-left group"
          >
            <div className="flex items-center">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mr-4 group-hover:bg-red-200 transition-colors">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Zeiterfassung</h3>
                <p className="text-sm text-gray-500">Arbeitszeiten erfassen und auswerten</p>
              </div>
            </div>
          </button>

          {/* Berichte - Nur für Admin */}
          {isAdmin && (
            <button
              onClick={() => router.push('/berichte')}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-orange-300 transition-all text-left group"
            >
              <div className="flex items-center">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mr-4 group-hover:bg-orange-200 transition-colors">
                  <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Berichte</h3>
                  <p className="text-sm text-gray-500">Auswertungen und Statistiken</p>
                </div>
              </div>
            </button>
          )}

          {/* Unternehmensdaten - Nur für Admin */}
          {isAdmin && (
            <button
              onClick={() => router.push('/einstellungen')}
              className="bg-white rounded-xl shadow-sm border border-teal-200 p-6 hover:shadow-md hover:border-teal-400 transition-all text-left group"
            >
              <div className="flex items-center">
                <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center mr-4 group-hover:bg-teal-200 transition-colors">
                  <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Unternehmensdaten</h3>
                  <p className="text-sm text-gray-500">Firmendaten anzeigen und bearbeiten</p>
                </div>
              </div>
            </button>
          )}
        </div>

        {/* Firmeninformationen - Nur für Admin */}
        {isAdmin && company && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Firmeninformationen</h3>
              <button
                onClick={() => router.push('/einstellungen')}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center"
              >
                Bearbeiten
                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Firmenname</p>
                <p className="text-sm font-medium text-gray-900">{company.name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Rechtsform</p>
                <p className="text-sm font-medium text-gray-900">{company.legal_form || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">UST-ID</p>
                <p className="text-sm font-medium text-gray-900">{company.ust_id || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Adresse</p>
                <p className="text-sm font-medium text-gray-900">
                  {company.street && company.house_number 
                    ? `${company.street} ${company.house_number}, ${company.postal_code} ${company.city}`
                    : '-'
                  }
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Website</p>
                {company.website ? (
                  <a 
                    href={company.website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-blue-600 hover:text-blue-700"
                  >
                    {company.website}
                  </a>
                ) : (
                  <p className="text-sm font-medium text-gray-900">-</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Hinweis für normale Mitarbeiter */}
        {!isAdmin && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
            <div className="flex items-start">
              <svg className="w-6 h-6 text-blue-600 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h4 className="text-sm font-medium text-blue-800">Ihre Zeiterfassung</h4>
                <p className="text-sm text-blue-700 mt-1">
                  Klicken Sie auf "Zeiterfassung" um Ihre Arbeitszeiten zu erfassen und zu verwalten.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}