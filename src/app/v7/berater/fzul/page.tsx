// src/app/v7/berater/fzul/page.tsx
// VERSION: v7.4.9-3 (SW-Release V7.4.9)
// v7.4.9-3: ASCII-Konformitaet - Umlaute als \u-Escapes (Literale) bzw. HTML-Entities (JSX)
// ============================================
// v7.4.9-2: A-006 Header-Vereinheitlichung der FZul-Seite - finale, korrekte Fassung.
//           Versionsnummer bewusst auf v7.4.9-2 gezogen: in downloads/ lag bereits eine
//           VERWORFENE v7.4.9-1 (halbfertiger Header-Umbau, in Session 49 per git restore
//           verworfen - A-017). Diese Datei ersetzt sie endgueltig. Aufbau auf der sauberen
//           live-Basis v7.3.1.
//           Eigenstaendige Kopfzeile (Ozeanblau #0369a1, "Zurueck"-Button, eigenes Logout)
//           ersetzt durch PortalHeader (hideNavigation) + PortalNav. Korrektes Berater-Blau
//           #002451, Navigationszeile vorhanden, Rueckkehr ins Cockpit ueber Home-Icon.
//           BEWUSST ANDERS als die verworfene v7.4.9-1:
//           (a) Umlaute in allen sichtbaren UI-Texten erhalten (keine ae/oe/ue-Regressionen);
//           (b) KEINE redundante v7_consultant_companies-Query / kein companyName-Prop
//               (PortalHeader laedt die Beraterfirma selbst);
//           (c) hideNavigation gesetzt -> keine doppelte Navigationszeile;
//           (d) totes handleLogout + COLORS-Konstante entfernt.
//           Inhalt (Firmenauswahl, Suche, Grid) unveraendert. Analyse-Routing offen
//           (Modul in Vorbereitung).
// v7.3.1:   Header-Vereinheitlichung Ozeanblau (07. Januar 2026, live-Basis)
// ============================================

'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import PortalHeader from '@/components/shared/PortalHeader'
import PortalNav from '@/components/shared/PortalNav'

// ============================================
// TYPEN
// ============================================

interface UserProfile {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  display_name: string | null
  role: string
  consultant_company_id: string | null
}

interface ClientCompany {
  id: string
  name: string
  short_name: string | null
  city: string | null
  federal_state: string | null
}

// ============================================
// BUNDESLAENDER MAPPING
// ============================================

const BUNDESLAND_NAMES: Record<string, string> = {
  'DE-BW': 'Baden-W\u00fcrttemberg',
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
  'DE-TH': 'Th\u00fcringen',
}

// ============================================
// HAUPTKOMPONENTE
// ============================================

export default function FzulBeratungPage() {
  const router = useRouter()
  const supabase = createClient()

  // State
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [companies, setCompanies] = useState<ClientCompany[]>([])
  const [searchTerm, setSearchTerm] = useState('')

  // ============================================
  // DATEN LADEN
  // ============================================

  const loadData = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        router.push('/login')
        return
      }

      // Profil laden
      const { data: profileData } = await supabase
        .from('v7_user_profiles')
        .select('*')
        .eq('email', session.user.email)
        .maybeSingle()

      if (!profileData || !profileData.consultant_company_id) {
        router.push('/v7/berater')
        return
      }

      setProfile(profileData)

      // Kunden-Firmen laden
      const { data: companiesData } = await supabase
        .from('v7_client_companies')
        .select('*')
        .eq('consultant_company_id', profileData.consultant_company_id)
        .eq('is_active', true)
        .order('name')

      if (companiesData) {
        setCompanies(companiesData)
      }

    } catch (err) {
      console.error('Fehler beim Laden:', err)
    } finally {
      setLoading(false)
    }
  }, [router, supabase])

  useEffect(() => {
    loadData()
  }, [loadData])

  // ============================================
  // GEFILTERTE FIRMEN
  // ============================================

  const filteredCompanies = companies.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.short_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.city?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // ============================================
  // RENDER: LOADING
  // ============================================

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PortalHeader portal="berater" userName="" userRole="consultant" companyName="" hideNavigation />
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Firmen werden geladen...</p>
          </div>
        </div>
      </div>
    )
  }

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Einheitlicher Header + Navigationszeile (A-006) */}
      <PortalHeader portal="berater" userName="" userRole="consultant" companyName="" hideNavigation />
      <PortalNav portal="berater" userRole={profile?.role || 'consultant'} />

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Info-Banner */}
        <div className="mb-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-blue-800 text-sm">
                W&auml;hlen Sie eine Firma aus, um deren Stundennachweise zu analysieren und die verf&uuml;gbaren FuE-Stunden f&uuml;r die Forschungszulage zu ermitteln.
              </p>
            </div>
          </div>
        </div>

        {/* Titel & Suche */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Firma ausw&auml;hlen</h2>
            <p className="text-gray-500">{companies.length} Firmen verf&uuml;gbar</p>
          </div>

          {/* Suche */}
          <div className="relative w-full sm:w-56">
            <input
              type="text"
              placeholder="Suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Firmen-Grid */}
        {filteredCompanies.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? 'Keine Firmen gefunden' : 'Noch keine Firmen vorhanden'}
            </h3>
            <p className="text-gray-500 mb-6 text-sm">
              {searchTerm 
                ? 'Versuchen Sie einen anderen Suchbegriff'
                : 'Legen Sie zuerst Firmen in der F\u00f6rderberatung an.'
              }
            </p>
            {!searchTerm && (
              <button
                onClick={() => router.push('/v7/berater/foerderung')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
              >
                Zur F&ouml;rderberatung
              </button>
            )}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCompanies.map((company) => (
              <div
                key={company.id}
                onClick={() => router.push(`/v7/berater/fzul/firma/${company.id}`)}
                className="bg-white rounded-lg shadow-sm border hover:shadow-md hover:border-blue-300 transition-all cursor-pointer p-5"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{company.name}</h3>
                    {company.short_name && (
                      <p className="text-sm text-gray-500">{company.short_name}</p>
                    )}
                  </div>
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>

                {(company.city || company.federal_state) && (
                  <p className="text-sm text-gray-500 mb-3 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {[
                      company.city,
                      company.federal_state ? BUNDESLAND_NAMES[company.federal_state] || company.federal_state : null
                    ].filter(Boolean).join(', ')}
                  </p>
                )}

                <div className="pt-3 border-t flex items-center justify-between">
                  <span className="text-sm text-blue-600 font-medium">Analyse starten</span>
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
