'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

export default function BerichtePage() {
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [profile, setProfile] = useState<any>(null);
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

      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('*, companies(name)')
        .eq('user_id', user.id)
        .single();

      if (profileData) {
        setProfile(profileData);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
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

  // Geplante Features
  const plannedFeatures = [
    {
      title: 'Zeiterfassungs-Status',
      description: 'Übersicht aller Mitarbeiter: Wer hat für welchen Monat erfasst? Ampel-System für schnelle Kontrolle.',
      icon: '📊',
      status: 'In Planung'
    },
    {
      title: 'Projekt-Auswertung',
      description: 'Soll/Ist-Vergleich der Personenmonate pro Projekt. Fortschrittsbalken und Budget-Übersicht.',
      icon: '📈',
      status: 'In Planung'
    },
    {
      title: 'FZul-Jahresübersicht',
      description: 'Jahreskalender pro Mitarbeiter und Projekt für die Forschungszulage. Export als Excel/PDF.',
      icon: '📅',
      status: 'In Planung'
    },
    {
      title: 'Stundennachweis Export',
      description: 'Monatliche Stundennachweise im offiziellen Format. Bereit für Behörden und Prüfungen.',
      icon: '📄',
      status: 'In Planung'
    },
    {
      title: 'Urlaubsübersicht',
      description: 'Jahreskalender mit Urlaubstagen aller Mitarbeiter. Resturlaub-Berechnung.',
      icon: '🏖️',
      status: 'Später'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/dashboard')}
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="font-medium">Zurück zum Dashboard</span>
              </button>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-600">{profile?.name}</span>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-red-400 to-red-600 rounded-2xl mb-6">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Berichte & Auswertungen</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Hier entstehen umfangreiche Reporting-Funktionen für Ihre FuE-Projekte.
            Die Berichte werden speziell auf die Anforderungen der Forschungszulage und 
            weiterer Förderrichtlinien abgestimmt.
          </p>
        </div>

        {/* Coming Soon Badge */}
        <div className="flex justify-center mb-12">
          <div className="inline-flex items-center px-6 py-3 bg-amber-100 text-amber-800 rounded-full">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-semibold">Coming Soon</span>
            <span className="mx-2">•</span>
            <span>In aktiver Entwicklung</span>
          </div>
        </div>

        {/* Geplante Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {plannedFeatures.map((feature, index) => (
            <div 
              key={index}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <span className="text-4xl">{feature.icon}</span>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  feature.status === 'In Planung' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {feature.status}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
              <p className="text-sm text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <h4 className="text-lg font-semibold text-blue-900 mb-2">Was Sie jetzt schon nutzen können</h4>
              <ul className="text-blue-800 space-y-2">
                <li className="flex items-center">
                  <svg className="w-4 h-4 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span><strong>Zeiterfassung</strong> - Monatliche Stundenerfassung mit Feiertagen</span>
                </li>
                <li className="flex items-center">
                  <svg className="w-4 h-4 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span><strong>Anlage 6.2</strong> - Personalkapazität im Projekt-Detail</span>
                </li>
                <li className="flex items-center">
                  <svg className="w-4 h-4 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span><strong>Anlage 5 Kontrollsummen</strong> - PM-Übersicht im Projekt-Detail</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <button
            onClick={() => router.push('/zeiterfassung')}
            className="inline-flex items-center px-6 py-3 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors font-medium"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Zur Zeiterfassung
          </button>
          <button
            onClick={() => router.push('/projekte')}
            className="inline-flex items-center px-6 py-3 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors font-medium"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Zu den Projekten
          </button>
        </div>
      </div>
    </div>
  );
}