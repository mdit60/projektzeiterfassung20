'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const loadData = async () => {
      try {
        // 1. User laden
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login');
          return;
        }
        setUser(user);
        console.log('✅ User loaded:', user.id, user.email);

        // 2. Profil laden
        const { data: profileData, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        if (profileError) {
          console.error('❌ Profile error:', profileError);
        } else {
          setProfile(profileData);
          console.log('✅ Profile loaded:', profileData);

          // 3. Company laden
          if (profileData.company_id) {
            const { data: companyData, error: companyError } = await supabase
              .from('companies')
              .select('*')
              .eq('id', profileData.company_id)
              .single();
            
            if (companyError) {
              console.error('❌ Company error:', companyError);
            } else {
              setCompany(companyData);
              console.log('✅ Company loaded:', companyData);
            }
          }
        }
      } catch (error) {
        console.error('❌ Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [supabase, router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="text-lg font-medium text-gray-900 mb-2">Laden...</div>
          <div className="text-sm text-gray-600">Daten werden geladen</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const userName = profile?.name || user.email?.split('@')[0] || 'User';
  const companyName = company?.name || 'Projektzeiterfassung';
  const isAdmin = profile?.role === 'company_admin';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h1 className="text-xl font-bold text-gray-900">
                    {companyName}
                  </h1>
                  <p className="text-xs text-gray-500">Dashboard</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {userName}
                </p>
                {isAdmin && (
                  <span className="inline-block px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded font-medium">
                    Admin
                  </span>
                )}
              </div>
              <button
                onClick={handleLogout}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md transition-colors text-sm font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="px-4 py-6 sm:px-0">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Willkommen, {userName}!
          </h2>
          <p className="text-gray-600 mb-6">
            Verwalten Sie Ihre Projekte, Mitarbeiter und Arbeitszeiten
          </p>

          {/* Quick Actions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {/* Projekte */}
            <div 
              onClick={() => router.push('/projekte')}
              className="bg-white rounded-lg shadow hover:shadow-lg p-6 cursor-pointer transition-all"
            >
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="ml-4 text-lg font-semibold text-gray-900">Projekte</h3>
              </div>
              <p className="text-gray-600 text-sm">Projekte verwalten und erstellen</p>
            </div>

            {/* Mitarbeiter */}
            <div 
              onClick={() => router.push('/mitarbeiter')}
              className="bg-white rounded-lg shadow hover:shadow-lg p-6 cursor-pointer transition-all"
            >
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <h3 className="ml-4 text-lg font-semibold text-gray-900">Mitarbeiter</h3>
              </div>
              <p className="text-gray-600 text-sm">Team verwalten und Rollen zuweisen</p>
            </div>

            {/* Arbeitspläne */}
            <div 
              onClick={() => router.push('/arbeitsplaene')}
              className="bg-white rounded-lg shadow hover:shadow-lg p-6 cursor-pointer transition-all"
            >
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="ml-4 text-lg font-semibold text-gray-900">Arbeitspläne</h3>
              </div>
              <p className="text-gray-600 text-sm">Schichten und Zeitpläne erstellen</p>
            </div>

            {/* Zeiterfassung */}
            <div 
              onClick={() => router.push('/zeiterfassung')}
              className="bg-white rounded-lg shadow hover:shadow-lg p-6 cursor-pointer transition-all"
            >
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="ml-4 text-lg font-semibold text-gray-900">Zeiterfassung</h3>
              </div>
              <p className="text-gray-600 text-sm">Arbeitszeiten erfassen und auswerten</p>
            </div>

            {/* Berichte */}
            <div 
              onClick={() => router.push('/berichte')}
              className="bg-white rounded-lg shadow hover:shadow-lg p-6 cursor-pointer transition-all"
            >
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="ml-4 text-lg font-semibold text-gray-900">Berichte</h3>
              </div>
              <p className="text-gray-600 text-sm">Auswertungen und Statistiken</p>
            </div>

            {/* Firmendaten / Unternehmensdaten - NUR für Company Admin! */}
            {isAdmin && (
              <div 
                onClick={() => router.push('/einstellungen')}
                className="bg-white rounded-lg shadow hover:shadow-lg p-6 cursor-pointer transition-all border-2 border-green-200"
              >
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <h3 className="ml-4 text-lg font-semibold text-gray-900">Unternehmensdaten</h3>
                </div>
                <p className="text-gray-600 text-sm">Firmendaten anzeigen und bearbeiten</p>
              </div>
            )}
          </div>

          {/* Company Info Card */}
          {company && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Firmeninformationen</h3>
                {isAdmin && (
                  <button
                    onClick={() => router.push('/einstellungen')}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center"
                  >
                    Bearbeiten
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Firmenname:</span>
                  <p className="font-medium text-gray-900">{company.name}</p>
                </div>
                {company.legal_form && (
                  <div>
                    <span className="text-gray-600">Rechtsform:</span>
                    <p className="font-medium text-gray-900">{company.legal_form}</p>
                  </div>
                )}
                {company.vat_id && (
                  <div>
                    <span className="text-gray-600">USt-ID:</span>
                    <p className="font-medium text-gray-900">{company.vat_id}</p>
                  </div>
                )}
                <div className="md:col-span-2">
                  <span className="text-gray-600">Adresse:</span>
                  <p className="font-medium text-gray-900">
                    {company.street} {company.house_number}, {company.zip} {company.city}
                  </p>
                </div>
                {company.email && (
                  <div>
                    <span className="text-gray-600">E-Mail:</span>
                    <p className="font-medium text-gray-900">{company.email}</p>
                  </div>
                )}
                {company.website && (
                  <div>
                    <span className="text-gray-600">Website:</span>
                    <p className="font-medium text-gray-900">
                      <a 
                        href={`https://${company.website.replace(/^https?:\/\//, '')}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-700"
                      >
                        {company.website}
                      </a>
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Debug Info - nur wenn Profil fehlt */}
          {!profile && (
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 mt-6">
              <div className="flex">
                <svg className="w-5 h-5 text-red-600 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <h3 className="text-sm font-bold text-red-800">⚠️ FEHLER: Profil nicht gefunden!</h3>
                  <p className="text-sm text-red-700 mt-1">
                    Ihr Benutzerprofil konnte nicht geladen werden. Das bedeutet, die Datenbank-Abfrage schlägt fehl.
                  </p>
                  <p className="text-sm text-red-700 mt-2">
                    <strong>Bitte überprüfen Sie:</strong>
                  </p>
                  <ul className="text-sm text-red-700 mt-1 ml-4 list-disc">
                    <li>Wurden die RLS Policies korrekt ausgeführt?</li>
                    <li>Öffnen Sie die Browser Console (F12) und prüfen Sie die Fehler</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}