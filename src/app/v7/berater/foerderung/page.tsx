// src/app/v7/berater/foerderung/page.tsx
// Förderberatung - Firmenübersicht mit Projekten
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
  contact_person: string | null
  is_active: boolean
}

interface CompanyStats {
  company_id: string
  employee_count: number
  project_count: number
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

export default function FoerderberatungPage() {
  const router = useRouter()
  const supabase = createClientComponentClient()

  // State
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [companies, setCompanies] = useState<ClientCompany[]>([])
  const [companyStats, setCompanyStats] = useState<Record<string, CompanyStats>>({})
  const [searchTerm, setSearchTerm] = useState('')
  const [showNewCompanyModal, setShowNewCompanyModal] = useState(false)
  const [newCompany, setNewCompany] = useState({
    name: '',
    short_name: '',
    city: '',
    federal_state: '',
    contact_person: '',
    contact_email: '',
    contact_phone: ''
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

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

        // Stats für jede Firma laden
        const stats: Record<string, CompanyStats> = {}
        
        for (const company of companiesData) {
          const [employeeResult, projectResult] = await Promise.all([
            supabase
              .from('v7_employees')
              .select('*', { count: 'exact', head: true })
              .eq('client_company_id', company.id)
              .eq('is_active', true),
            supabase
              .from('v7_projects')
              .select('*', { count: 'exact', head: true })
              .eq('client_company_id', company.id)
              .eq('is_active', true)
          ])

          stats[company.id] = {
            company_id: company.id,
            employee_count: employeeResult.count || 0,
            project_count: projectResult.count || 0
          }
        }
        
        setCompanyStats(stats)
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
  // NEUE FIRMA ANLEGEN
  // ============================================

  const handleCreateCompany = async () => {
    if (!profile?.consultant_company_id || !newCompany.name.trim()) {
      setError('Firmenname ist erforderlich')
      return
    }

    setSaving(true)
    setError('')

    try {
      const { error: insertError } = await supabase
        .from('v7_client_companies')
        .insert({
          consultant_company_id: profile.consultant_company_id,
          name: newCompany.name.trim(),
          short_name: newCompany.short_name.trim() || null,
          city: newCompany.city.trim() || null,
          federal_state: newCompany.federal_state || null,
          contact_person: newCompany.contact_person.trim() || null,
          contact_email: newCompany.contact_email.trim() || null,
          contact_phone: newCompany.contact_phone.trim() || null,
          is_active: true
        })

      if (insertError) throw insertError

      setSuccess('Firma erfolgreich angelegt!')
      setShowNewCompanyModal(false)
      setNewCompany({
        name: '',
        short_name: '',
        city: '',
        federal_state: '',
        contact_person: '',
        contact_email: '',
        contact_phone: ''
      })
      
      // Daten neu laden
      loadData()

      setTimeout(() => setSuccess(''), 3000)

    } catch (err) {
      console.error('Fehler beim Anlegen:', err)
      setError('Fehler beim Anlegen der Firma')
    } finally {
      setSaving(false)
    }
  }

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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
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
      <header className="bg-gradient-to-r from-blue-700 to-blue-800 text-white shadow-lg">
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
                <h1 className="text-xl font-bold">Förderberatung</h1>
                <p className="text-blue-200 text-sm">ZIM / BMBF Projekte</p>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex items-center space-x-2">
              <span className="px-3 py-2 bg-white/20 rounded-lg text-sm font-medium">
                🏢 Firmen
              </span>
              <button
                onClick={() => router.push('/v7/berater/foerderung/import')}
                className="px-3 py-2 hover:bg-white/10 rounded-lg text-sm transition-colors"
              >
                📥 Import
              </button>
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
            <button onClick={() => router.push('/v7/berater')} className="hover:text-blue-600">
              Berater-Portal
            </button>
            <span className="mx-2">/</span>
            <span className="text-gray-900 font-medium">Förderberatung</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
            ✅ {success}
          </div>
        )}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
            ❌ {error}
          </div>
        )}

        {/* Titel & Aktionen */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              🏢 Kundenfirmen
            </h2>
            <p className="text-gray-500">{companies.length} Firmen verwaltet</p>
          </div>

          <div className="flex items-center gap-4 w-full sm:w-auto">
            {/* Suche */}
            <div className="relative flex-1 sm:w-64">
              <input
                type="text"
                placeholder="Firma suchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            </div>

            {/* Neue Firma Button */}
            <button
              onClick={() => setShowNewCompanyModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              <span>+</span>
              <span>Neue Firma</span>
            </button>
          </div>
        </div>

        {/* Firmen-Grid */}
        {filteredCompanies.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
            <span className="text-6xl mb-4 block">🏢</span>
            <h3 className="text-xl font-medium text-gray-900 mb-2">
              {searchTerm ? 'Keine Firmen gefunden' : 'Noch keine Firmen angelegt'}
            </h3>
            <p className="text-gray-500 mb-6">
              {searchTerm 
                ? 'Versuchen Sie einen anderen Suchbegriff'
                : 'Legen Sie Ihre erste Kunden-Firma an oder importieren Sie Daten aus einem ZIM-Antrag.'
              }
            </p>
            {!searchTerm && (
              <div className="flex justify-center gap-4">
                <button
                  onClick={() => setShowNewCompanyModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  + Neue Firma
                </button>
                <button
                  onClick={() => router.push('/v7/berater/foerderung/import')}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  📥 PDF Import
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCompanies.map((company) => {
              const stats = companyStats[company.id] || { employee_count: 0, project_count: 0 }
              
              return (
                <div
                  key={company.id}
                  onClick={() => router.push(`/v7/berater/foerderung/firma/${company.id}`)}
                  className="bg-white rounded-xl shadow-sm border hover:shadow-md hover:border-blue-300 transition-all cursor-pointer p-6"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-gray-900">{company.name}</h3>
                      {company.short_name && (
                        <p className="text-sm text-gray-500">{company.short_name}</p>
                      )}
                    </div>
                    <span className="text-2xl">🏢</span>
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

                  <div className="border-t pt-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">
                        👥 {stats.employee_count} MA
                      </span>
                      <span className="text-gray-500">
                        📁 {stats.project_count} Projekte
                      </span>
                    </div>
                  </div>

                  {company.contact_person && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-xs text-gray-400 flex items-center gap-1">
                        <span>👤</span>
                        {company.contact_person}
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* Modal: Neue Firma */}
      {showNewCompanyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h3 className="text-xl font-bold text-gray-900">Neue Firma anlegen</h3>
            </div>

            <div className="p-6 space-y-4">
              {/* Firmenname */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Firmenname *
                </label>
                <input
                  type="text"
                  value={newCompany.name}
                  onChange={(e) => setNewCompany(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="z.B. Musterfirma GmbH"
                />
              </div>

              {/* Kurzname */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kurzname
                </label>
                <input
                  type="text"
                  value={newCompany.short_name}
                  onChange={(e) => setNewCompany(prev => ({ ...prev, short_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="z.B. Muster"
                />
              </div>

              {/* Stadt & Bundesland */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stadt
                  </label>
                  <input
                    type="text"
                    value={newCompany.city}
                    onChange={(e) => setNewCompany(prev => ({ ...prev, city: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bundesland
                  </label>
                  <select
                    value={newCompany.federal_state}
                    onChange={(e) => setNewCompany(prev => ({ ...prev, federal_state: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Auswählen --</option>
                    {Object.entries(BUNDESLAND_NAMES).map(([code, name]) => (
                      <option key={code} value={code}>{name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Ansprechpartner */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ansprechpartner
                </label>
                <input
                  type="text"
                  value={newCompany.contact_person}
                  onChange={(e) => setNewCompany(prev => ({ ...prev, contact_person: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* E-Mail & Telefon */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    E-Mail
                  </label>
                  <input
                    type="email"
                    value={newCompany.contact_email}
                    onChange={(e) => setNewCompany(prev => ({ ...prev, contact_email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Telefon
                  </label>
                  <input
                    type="tel"
                    value={newCompany.contact_phone}
                    onChange={(e) => setNewCompany(prev => ({ ...prev, contact_phone: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setShowNewCompanyModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
              >
                Abbrechen
              </button>
              <button
                onClick={handleCreateCompany}
                disabled={saving || !newCompany.name.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Wird gespeichert...' : 'Firma anlegen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
