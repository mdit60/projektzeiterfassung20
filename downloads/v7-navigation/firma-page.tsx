// src/app/v7/firma/page.tsx
// Firmen-Dashboard für Projektleiter und Mitarbeiter
// VERSION: v7.1.0
// DATUM: 02. Januar 2026

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

interface UserProfile {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  display_name: string | null
  role: string
  client_company_id: string | null
}

interface ClientCompany {
  id: string
  name: string
  short_name: string | null
}

export default function FirmaDashboard() {
  const router = useRouter()
  const supabase = createClientComponentClient()
  
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [company, setCompany] = useState<ClientCompany | null>(null)

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
          // Fallback zu V6 wenn kein V7-Profil
          router.push('/dashboard')
          return
        }

        // Berater -> Berater-Dashboard
        if (profileData.role === 'consultant' || profileData.role === 'system_admin') {
          router.push('/v7/berater')
          return
        }

        setProfile(profileData)

        // Firma laden
        if (profileData.client_company_id) {
          const { data: companyData } = await supabase
            .from('v7_client_companies')
            .select('*')
            .eq('id', profileData.client_company_id)
            .single()

          if (companyData) {
            setCompany(companyData)
          }
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

  // Rollen-basierte Anzeige
  const isProjectLeader = profile?.role === 'project_leader' || profile?.role === 'client_admin'
  const isEmployee = profile?.role === 'employee' || profile?.role === 'client_user'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-indigo-700 to-indigo-800 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center justify-center w-12 h-12 bg-white/20 rounded-xl">
                <span className="text-xl font-bold">V7</span>
              </div>
              <div>
                <h1 className="text-xl font-bold">Projektzeiterfassung</h1>
                <p className="text-indigo-200 text-sm">{company?.name || 'Firmen-Portal'}</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="font-medium">{profile?.display_name || profile?.email}</p>
                <p className="text-indigo-200 text-sm">
                  {isProjectLeader ? 'Projektleiter' : 'Mitarbeiter'}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                title="Abmelden"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Begrüßung */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Willkommen, {profile?.first_name || 'Benutzer'}!
          </h2>
          <p className="text-gray-600">
            {company?.name || 'Ihr Firmen-Portal'}
          </p>
        </div>

        {/* Projektleiter-Ansicht */}
        {isProjectLeader && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <button
              onClick={() => router.push('/v7/firma/unternehmen')}
              className="bg-white rounded-xl shadow-sm border hover:shadow-md hover:border-indigo-300 transition-all p-6 text-left"
            >
              <span className="text-3xl mb-3 block">🏢</span>
              <h3 className="font-bold text-gray-900 mb-2">Unternehmen</h3>
              <p className="text-sm text-gray-500">Firmendaten verwalten</p>
            </button>

            <button
              onClick={() => router.push('/v7/firma/projekte')}
              className="bg-white rounded-xl shadow-sm border hover:shadow-md hover:border-indigo-300 transition-all p-6 text-left"
            >
              <span className="text-3xl mb-3 block">📁</span>
              <h3 className="font-bold text-gray-900 mb-2">Projekte</h3>
              <p className="text-sm text-gray-500">FuE-Projekte verwalten</p>
            </button>

            <button
              onClick={() => router.push('/v7/firma/mitarbeiter')}
              className="bg-white rounded-xl shadow-sm border hover:shadow-md hover:border-indigo-300 transition-all p-6 text-left"
            >
              <span className="text-3xl mb-3 block">👥</span>
              <h3 className="font-bold text-gray-900 mb-2">Mitarbeiter</h3>
              <p className="text-sm text-gray-500">Team verwalten</p>
            </button>

            <button
              onClick={() => router.push('/v7/firma/zeiterfassung')}
              className="bg-white rounded-xl shadow-sm border hover:shadow-md hover:border-indigo-300 transition-all p-6 text-left"
            >
              <span className="text-3xl mb-3 block">⏱️</span>
              <h3 className="font-bold text-gray-900 mb-2">Zeiterfassung</h3>
              <p className="text-sm text-gray-500">Stunden erfassen</p>
            </button>

            <button
              onClick={() => router.push('/v7/firma/berichte')}
              className="bg-white rounded-xl shadow-sm border hover:shadow-md hover:border-indigo-300 transition-all p-6 text-left"
            >
              <span className="text-3xl mb-3 block">📊</span>
              <h3 className="font-bold text-gray-900 mb-2">Berichte</h3>
              <p className="text-sm text-gray-500">Auswertungen & Export</p>
            </button>
          </div>
        )}

        {/* Mitarbeiter-Ansicht (nur Zeiterfassung) */}
        {isEmployee && (
          <div className="max-w-lg mx-auto">
            <div className="bg-white rounded-xl shadow-lg p-8 text-center">
              <span className="text-6xl mb-4 block">⏱️</span>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Ihre Zeiterfassung</h3>
              <p className="text-gray-600 mb-6">
                Erfassen Sie Ihre Arbeitsstunden für die zugewiesenen Projekte.
              </p>
              <button
                onClick={() => router.push('/v7/firma/zeiterfassung')}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Zur Zeiterfassung
              </button>
            </div>
          </div>
        )}

        {/* Hinweis: Coming Soon */}
        <div className="mt-16 text-center">
          <div className="inline-block bg-yellow-50 border border-yellow-200 rounded-lg px-6 py-4">
            <span className="text-2xl mr-2">🚧</span>
            <span className="text-yellow-800">
              Diese Seite wird noch entwickelt. Die vollständige Funktionalität folgt in Kürze.
            </span>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-400">
            Projektzeiterfassung v7.1 · Firmen-Portal · © {new Date().getFullYear()}
          </p>
        </div>
      </main>
    </div>
  )
}
