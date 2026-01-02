// src/app/v7/berater/fzul/page.tsx
// FZul-Beratung - Firmenauswahl für Forschungszulage
// VERSION: v7.1.0
// DATUM: 02. Januar 2026

'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

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
}

// ============================================
// HAUPTKOMPONENTE
// ============================================

export default function FzulBeratungPage() {
  const router = useRouter()
  const supabase = createClientComponentClient()

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Firmen werden geladen...</p>
        </div>
      </div>
    )
  }

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-green-700 to-green-800 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            {/* Logo & Navigation */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/v7/berater')}
                className="flex items-center justify-center w-12 h-12 bg-white/20 hover:bg-white/30 rounded-xl transition-colors"
              >
                <span className="text-xl font-bold">V7</span>
              </button>
              <div>
                <h1 className="text-xl font-bold">FZul-Beratung</h1>
                <p className="text-green-200 text-sm">Forschungszulage §35a EStG</p>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex items-center space-x-2">
              <span className="px-3 py-2 bg-white/20 rounded-lg text-sm font-medium">
                🏢 Firmenauswahl
              </span>
              <button
                onClick={() => router.push('/v7/berater')}
                className="px-3 py-2 hover:bg-white/10 rounded-lg text-sm transition-colors"
              >
                ← Zurück
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Breadcrumb */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center text-sm text-gray-500">
            <button onClick={() => router.push('/v7/berater')} className="hover:text-green-600">
              Berater-Portal
            </button>
            <span className="mx-2">/</span>
            <span className="text-gray-900 font-medium">FZul-Beratung</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Info-Banner */}
        <div className="mb-8 bg-green-50 border border-green-200 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <span className="text-3xl">📊</span>
            <div>
              <h3 className="font-bold text-green-900 mb-1">Forschungszulage beantragen</h3>
              <p className="text-green-700">
                Wählen Sie eine Firma aus, um deren Projekte und Stundennachweise zu analysieren. 
                Ermitteln Sie die verfügbaren FuE-Stunden und erstellen Sie den FZul-Nachweis.
              </p>
            </div>
          </div>
        </div>

        {/* Titel & Suche */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Firma auswählen
            </h2>
            <p className="text-gray-500">{companies.length} Firmen verfügbar</p>
          </div>

          {/* Suche */}
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Firma suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          </div>
        </div>

        {/* Firmen-Grid */}
        {filteredCompanies.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
            <span className="text-6xl mb-4 block">🏢</span>
            <h3 className="text-xl font-medium text-gray-900 mb-2">
              {searchTerm ? 'Keine Firmen gefunden' : 'Noch keine Firmen vorhanden'}
            </h3>
            <p className="text-gray-500 mb-6">
              {searchTerm 
                ? 'Versuchen Sie einen anderen Suchbegriff'
                : 'Legen Sie zuerst Firmen in der Förderberatung an.'
              }
            </p>
            {!searchTerm && (
              <button
                onClick={() => router.push('/v7/berater/foerderung')}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Zur Förderberatung
              </button>
            )}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCompanies.map((company) => (
              <div
                key={company.id}
                onClick={() => router.push(`/v7/berater/fzul/firma/${company.id}`)}
                className="bg-white rounded-xl shadow-sm border hover:shadow-md hover:border-green-300 transition-all cursor-pointer p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-gray-900">{company.name}</h3>
                    {company.short_name && (
                      <p className="text-sm text-gray-500">{company.short_name}</p>
                    )}
                  </div>
                  <span className="text-2xl">📊</span>
                </div>

                {(company.city || company.federal_state) && (
                  <p className="text-sm text-gray-500 mb-4 flex items-center gap-1">
                    <span>📍</span>
                    {[
                      company.city,
                      company.federal_state ? BUNDESLAND_NAMES[company.federal_state] || company.federal_state : null
                    ].filter(Boolean).join(', ')}
                  </p>
                )}

                <div className="mt-4 pt-4 border-t flex items-center justify-between">
                  <span className="text-sm text-green-600 font-medium">FZul-Analyse starten</span>
                  <span className="text-green-600">→</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Hinweis auf Features */}
        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-4 border">
            <span className="text-2xl mb-2 block">📥</span>
            <h4 className="font-medium text-gray-900">Import</h4>
            <p className="text-sm text-gray-500">Stundennachweise hochladen</p>
          </div>
          <div className="bg-white rounded-lg p-4 border">
            <span className="text-2xl mb-2 block">📝</span>
            <h4 className="font-medium text-gray-900">FZul Editor</h4>
            <p className="text-sm text-gray-500">Jahresnachweis bearbeiten</p>
          </div>
          <div className="bg-white rounded-lg p-4 border">
            <span className="text-2xl mb-2 block">👥</span>
            <h4 className="font-medium text-gray-900">MA Stammdaten</h4>
            <p className="text-sm text-gray-500">Mitarbeiter verwalten</p>
          </div>
          <div className="bg-white rounded-lg p-4 border">
            <span className="text-2xl mb-2 block">📦</span>
            <h4 className="font-medium text-gray-900">Archiv</h4>
            <p className="text-sm text-gray-500">Erstellte Nachweise</p>
          </div>
        </div>
      </main>
    </div>
  )
}
