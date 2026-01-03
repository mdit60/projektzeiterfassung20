// src/app/v7/berater/foerderung/page.tsx
// Förderberatung - Firmenübersicht
// VERSION: v7.1.1
// DATUM: 02. Januar 2026

'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

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
  const supabase = createClient()

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
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            {/* Logo & Titel */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-10 h-10 bg-white/20 rounded-lg">
                <span className="text-sm font-bold">PZE</span>
              </div>
              <div>
                <h1 className="text-lg font-bold">Förderberatung</h1>
                <p className="text-blue-200 text-xs">ZIM / BMBF Projekte</p>
              </div>
            </div>

            {/* Zurück & User */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/v7/berater')}
                className="text-blue-200 hover:text-white text-sm flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Zurück
              </button>
              <span className="text-white/30">|</span>
              <span className="text-sm">{profile?.display_name}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
            <h2 className="text-2xl font-bold text-gray-900">Kundenfirmen</h2>
            <p className="text-gray-500">{companies.length} Firmen</p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Suche */}
            <div className="relative flex-1 sm:w-56">
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

            {/* Import Button */}
            <button
              onClick={() => router.push('/v7/berater/foerderung/import')}
              className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Import
            </button>

            {/* Neue Firma Button */}
            <button
              onClick={() => setShowNewCompanyModal(true)}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Neue Firma
            </button>
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
              {searchTerm ? 'Keine Firmen gefunden' : 'Noch keine Firmen angelegt'}
            </h3>
            <p className="text-gray-500 mb-6 text-sm">
              {searchTerm 
                ? 'Versuchen Sie einen anderen Suchbegriff'
                : 'Legen Sie Ihre erste Kunden-Firma an oder importieren Sie aus einem ZIM-Antrag.'
              }
            </p>
            {!searchTerm && (
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => setShowNewCompanyModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                >
                  + Neue Firma
                </button>
                <button
                  onClick={() => router.push('/v7/berater/foerderung/import')}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                >
                  PDF Import
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCompanies.map((company) => {
              const stats = companyStats[company.id] || { employee_count: 0, project_count: 0 }
              
              return (
                <div
                  key={company.id}
                  onClick={() => router.push(`/v7/berater/foerderung/firma/${company.id}`)}
                  className="bg-white rounded-lg shadow-sm border hover:shadow-md hover:border-blue-300 transition-all cursor-pointer p-5"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">{company.name}</h3>
                      {company.short_name && (
                        <p className="text-sm text-gray-500">{company.short_name}</p>
                      )}
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

                  <div className="flex gap-4 text-sm text-gray-500 pt-3 border-t">
                    <span>{stats.employee_count} MA</span>
                    <span>{stats.project_count} Projekte</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* Modal: Neue Firma */}
      {showNewCompanyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900">Neue Firma</h3>
              <button
                onClick={() => setShowNewCompanyModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Firmenname */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Firmenname *
                </label>
                <input
                  type="text"
                  value={newCompany.name}
                  onChange={(e) => setNewCompany(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="z.B. Muster"
                />
              </div>

              {/* Stadt & Bundesland */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stadt
                  </label>
                  <input
                    type="text"
                    value={newCompany.city}
                    onChange={(e) => setNewCompany(prev => ({ ...prev, city: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bundesland
                  </label>
                  <select
                    value={newCompany.federal_state}
                    onChange={(e) => setNewCompany(prev => ({ ...prev, federal_state: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="">-- Wählen --</option>
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              {/* E-Mail & Telefon */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    E-Mail
                  </label>
                  <input
                    type="email"
                    value={newCompany.contact_email}
                    onChange={(e) => setNewCompany(prev => ({ ...prev, contact_email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="p-5 border-t bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setShowNewCompanyModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 text-sm"
              >
                Abbrechen
              </button>
              <button
                onClick={handleCreateCompany}
                disabled={saving || !newCompany.name.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
              >
                {saving ? 'Speichern...' : 'Anlegen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
