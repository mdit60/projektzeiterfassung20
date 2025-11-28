'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

interface Profile {
  id: string;
  name: string;
  email: string;
  role: 'company_admin' | 'manager' | 'employee';
  company_id: string;
}

interface Company {
  id: string;
  name: string;
  legal_form: string;
  vat_id: string;
  street: string;
  house_number: string;
  zip: string;
  city: string;
  email: string;
  website: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      // 1. Auth User laden
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.log('❌ No user found, redirecting to login');
        router.push('/login');
        return;
      }
      
      setUser(user);
      console.log('✅ User loaded:', user.id);

      // 2. Profil laden
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profileError || !profileData) {
        console.error('❌ Profile error:', profileError);
        setError('Profil konnte nicht geladen werden. Bitte kontaktieren Sie den Administrator.');
        setLoading(false);
        return;
      }

      setProfile(profileData);
      console.log('✅ Profile loaded:', profileData.name, '| Role:', profileData.role);

      // 3. Firma laden
      if (profileData.company_id) {
        const { data: companyData, error: companyError } = await supabase
          .from('companies')
          .select('*')
          .eq('id', profileData.company_id)
          .single();

        if (companyError) {
          console.error('⚠️ Company error:', companyError);
        } else {
          setCompany(companyData);
          console.log('✅ Company loaded:', companyData.name);
        }
      }

    } catch (err: any) {
      console.error('❌ Error loading data:', err);
      setError('Ein Fehler ist aufgetreten');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-lg font-medium text-gray-900">Laden...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg max-w-md">
          <h3 className="font-bold mb-2">Fehler</h3>
          <p>{error}</p>
          <button 
            onClick={() => router.push('/login')}
            className="mt-4 text-red-600 underline"
          >
            Zurück zum Login
          </button>
        </div>
      </div>
    );
  }

  const isAdmin = profile?.role === 'company_admin';

  // Kachel-Definitionen (ohne Arbeitspläne!)
  const tiles = [
    {
      title: 'Projekte',
      description: 'Projekte verwalten und erstellen',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      color: 'bg-blue-100 text-blue-600',
      href: '/projekte',
      visible: true
    },
    {
      title: 'Mitarbeiter',
      description: 'Team verwalten und Rollen zuweisen',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      color: 'bg-purple-100 text-purple-600',
      href: '/mitarbeiter',
      visible: isAdmin || profile?.role === 'manager'
    },
    {
      title: 'Zeiterfassung',
      description: 'Arbeitszeiten erfassen und auswerten',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'bg-orange-100 text-orange-600',
      href: '/zeiterfassung',
      visible: true
    },
    {
      title: 'Berichte',
      description: 'Auswertungen und Statistiken',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      color: 'bg-red-100 text-red-600',
      href: '/berichte',
      visible: isAdmin || profile?.role === 'manager'
    },
    {
      title: 'Unternehmensdaten',
      description: 'Firmendaten anzeigen und bearbeiten',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      color: 'bg-green-100 text-green-600',
      borderColor: 'border-green-300',
      href: '/einstellungen',
      visible: isAdmin
    }
  ];

  const visibleTiles = tiles.filter(t => t.visible);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo & Company Name */}
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white mr-3">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{company?.name || 'Firma'}</h1>
                <p className="text-xs text-gray-500">Dashboard</p>
              </div>
            </div>

            {/* User Info & Logout */}
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{profile?.name}</p>
                {isAdmin && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                    Admin
                  </span>
                )}
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Willkommen, {profile?.name?.split(' ')[0]}!
          </h2>
          <p className="text-gray-600">
            Verwalten Sie Ihre Projekte, Mitarbeiter und Arbeitszeiten
          </p>
        </div>

        {/* Tiles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {visibleTiles.map((tile, index) => (
            <div
              key={index}
              onClick={() => router.push(tile.href)}
              className={`bg-white rounded-xl shadow-sm border-2 ${tile.borderColor || 'border-transparent'} hover:border-gray-300 hover:shadow-md transition-all cursor-pointer p-6`}
            >
              <div className="flex items-start">
                <div className={`p-3 rounded-lg ${tile.color}`}>
                  {tile.icon}
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900">{tile.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">{tile.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Company Info Box */}
        {company && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Firmeninformationen</h3>
              {isAdmin && (
                <button
                  onClick={() => router.push('/einstellungen')}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center"
                >
                  Bearbeiten
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </button>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Firmenname</p>
                <p className="text-sm font-medium text-gray-900">{company.name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Rechtsform</p>
                <p className="text-sm font-medium text-gray-900">{company.legal_form || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">USt-ID</p>
                <p className="text-sm font-medium text-gray-900">{company.vat_id || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Adresse</p>
                <p className="text-sm font-medium text-gray-900">
                  {company.street} {company.house_number}, {company.zip} {company.city}
                </p>
              </div>
              {company.email && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">E-Mail</p>
                  <p className="text-sm font-medium text-gray-900">{company.email}</p>
                </div>
              )}
              {company.website && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Website</p>
                  <a 
                    href={company.website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-blue-600 hover:underline"
                  >
                    {company.website}
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}