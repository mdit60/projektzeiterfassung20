// src/app/v7/berater/page.tsx
// Berater-Dashboard - Aufgeraeumt
// VERSION: v7.3.84
// DATUM: 24. Januar 2026
//
// FIX: Projekt-Zaehlung Query korrigiert (JOIN-Filter funktionierte nicht)
//      Loesung: Erst Client-IDs holen, dann Projekte zaehlen

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface UserProfile {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  display_name: string | null
  role: string
  consultant_company_id: string | null
}

interface Stats {
  clientCount: number
  projectCount: number
  fzulProjectCount: number
}

export default function BeraterDashboard() {
  const router = useRouter()
  const supabase = createClient()
  
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [stats, setStats] = useState<Stats>({ clientCount: 0, projectCount: 0, fzulProjectCount: 0 })

  useEffect(() => {
    const loadData = async () => {
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

        if (!profileData) {
          router.push('/dashboard')
          return
        }

        if (profileData.role !== 'consultant' && profileData.role !== 'system_admin') {
          router.push('/v7/firma')
          return
        }

        setProfile(profileData)

        // Statistiken laden
        if (profileData.consultant_company_id) {
          // Schritt 1: Alle Client-Companies des Beraters holen
          const { data: clientCompanies } = await supabase
            .from('v7_client_companies')
            .select('id')
            .eq('consultant_company_id', profileData.consultant_company_id)
            .eq('is_active', true)

          const clientCount = clientCompanies?.length || 0
          const clientIds = clientCompanies?.map(c => c.id) || []

          let projectCount = 0
          let fzulCount = 0

          if (clientIds.length > 0) {
            // Schritt 2: Foerderprojekte zaehlen (ZIM inkl. Varianten, BMBF_KMU - alles ausser FZUL)
            const { count: foerderCount } = await supabase
              .from('v7_projects')
              .select('*', { count: 'exact', head: true })
              .in('client_company_id', clientIds)
              .in('funding_format', ['ZIM', 'ZIM_DS', 'ZIM_EINZEL', 'ZIM_KOOP', 'ZIM_NETZWERK', 'BMBF_KMU', 'OTHER'])
              .eq('is_active', true)

            projectCount = foerderCount || 0

            // Schritt 3: FZul-Projekte zaehlen
            const { count: fzulProjectCount } = await supabase
              .from('v7_projects')
              .select('*', { count: 'exact', head: true })
              .in('client_company_id', clientIds)
              .eq('funding_format', 'FZUL')
              .eq('is_active', true)

            fzulCount = fzulProjectCount || 0
          }

          setStats({
            clientCount: clientCount,
            projectCount: projectCount,
            fzulProjectCount: fzulCount
          })
        }

      } catch (error) {
        console.error('Fehler beim Laden:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [router, supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Wird geladen...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Ein einziger, klarer Header */}
      <header className="bg-[#0369a1] text-white shadow-lg">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            {/* Logo & Titel */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-10 h-10 bg-white/20 rounded-lg">
                <span className="text-sm font-bold">PZE</span>
              </div>
              <div>
                <h1 className="text-lg font-bold">Berater-Portal</h1>
                <p className="text-blue-200 text-xs">v7</p>
              </div>
            </div>

            {/* User Info & Logout */}
            <div className="flex items-center space-x-4">
              <span className="text-sm">{profile?.display_name || profile?.email}</span>
              <button
                onClick={handleLogout}
                className="text-blue-200 hover:text-white text-sm flex items-center gap-1"
                title="Abmelden"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Abmelden
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Begruessung */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Willkommen, {profile?.first_name || 'Berater'}!
          </h2>
        </div>

        {/* Statistiken */}
        <div className="flex justify-center gap-8 mb-12">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">{stats.clientCount}</div>
            <div className="text-sm text-gray-500">Kunden</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">{stats.projectCount}</div>
            <div className="text-sm text-gray-500">Foerderprojekte</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">{stats.fzulProjectCount}</div>
            <div className="text-sm text-gray-500">FZul-Projekte</div>
          </div>
        </div>

        {/* Kacheln */}
        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* Foerderberatung */}
          <button
            onClick={() => router.push('/v7/berater/foerderung')}
            className="group bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 p-6 text-left border-2 border-transparent hover:border-blue-400"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-600 transition-colors">
                <svg className="w-6 h-6 text-blue-600 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600">
                  Foerderberatung
                </h3>
                <p className="text-sm text-gray-500">ZIM, BMBF/KMU-innovativ</p>
              </div>
            </div>
            <p className="text-gray-600 text-sm mb-4">
              Projektantraege verwalten. Firmen, Projekte, Mitarbeiter und Arbeitspakete anlegen.
            </p>
            <div className="flex items-center text-blue-600 text-sm font-medium">
              <span>Oeffnen</span>
              <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>

          {/* FZul-Beratung */}
          <button
            onClick={() => router.push('/v7/berater/fzul')}
            className="group bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 p-6 text-left border-2 border-transparent hover:border-green-400"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-600 transition-colors">
                <svg className="w-6 h-6 text-green-600 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 group-hover:text-green-600">
                  FZul-Beratung
                </h3>
                <p className="text-sm text-gray-500">Forschungszulage Paragraph 35a EStG</p>
              </div>
            </div>
            <p className="text-gray-600 text-sm mb-4">
              Stundennachweise analysieren und verfuegbare FuE-Zeiten ermitteln.
            </p>
            <div className="flex items-center text-green-600 text-sm font-medium">
              <span>Oeffnen</span>
              <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        </div>

        {/* Footer */}
        <div className="mt-16 text-center">
          <p className="text-xs text-gray-400">
            Projektzeiterfassung v7.3.84
          </p>
        </div>
      </main>
    </div>
  )
}
