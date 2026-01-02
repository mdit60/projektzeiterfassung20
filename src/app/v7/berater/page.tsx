// src/app/v7/berater/page.tsx
// Berater-Dashboard mit Auswahl Förderberatung / FZul-Beratung
// VERSION: v7.1.0
// DATUM: 02. Januar 2026

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

interface ConsultantCompany {
  id: string
  name: string
  short_name: string | null
}

export default function BeraterDashboard() {
  const router = useRouter()
  const supabase = createClient()
  
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [company, setCompany] = useState<ConsultantCompany | null>(null)
  const [clientCount, setClientCount] = useState(0)

  useEffect(() => {
    const loadData = async () => {
      try {
        // Session prüfen
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session) {
          router.push('/login')
          return
        }

        // Profil laden
        const { data: profileData, error: profileError } = await supabase
          .from('v7_user_profiles')
          .select('*')
          .eq('email', session.user.email)
          .maybeSingle()

        if (profileError || !profileData) {
          console.error('Profil nicht gefunden:', profileError)
          router.push('/dashboard') // Fallback zu V6
          return
        }

        // Rollen-Check
        if (profileData.role !== 'consultant' && profileData.role !== 'system_admin') {
          router.push('/v7/firma')
          return
        }

        setProfile(profileData)

        // Berater-Firma laden
        if (profileData.consultant_company_id) {
          const { data: companyData } = await supabase
            .from('v7_consultant_companies')
            .select('*')
            .eq('id', profileData.consultant_company_id)
            .single()

          if (companyData) {
            setCompany(companyData)
          }

          // Anzahl Kunden-Firmen
          const { count } = await supabase
            .from('v7_client_companies')
            .select('*', { count: 'exact', head: true })
            .eq('consultant_company_id', profileData.consultant_company_id)
            .eq('is_active', true)

          setClientCount(count || 0)
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
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-700 to-blue-800 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            {/* Logo & Titel */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center justify-center w-12 h-12 bg-white/20 rounded-xl">
                <span className="text-xl font-bold">V7</span>
              </div>
              <div>
                <h1 className="text-xl font-bold">Projektzeiterfassung</h1>
                <p className="text-blue-200 text-sm">Berater-Portal</p>
              </div>
            </div>

            {/* User Info */}
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="font-medium">{profile?.display_name || profile?.email}</p>
                <p className="text-blue-200 text-sm">{company?.name || 'Berater'}</p>
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
            Willkommen, {profile?.first_name || 'Berater'}!
          </h2>
          <p className="text-gray-600">
            Wählen Sie einen Bereich aus, um zu starten.
          </p>
          {clientCount > 0 && (
            <p className="text-sm text-gray-500 mt-2">
              Sie betreuen aktuell <span className="font-semibold text-blue-600">{clientCount}</span> Kunden-Firmen
            </p>
          )}
        </div>

        {/* Kacheln */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Förderberatung */}
          <button
            onClick={() => router.push('/v7/berater/foerderung')}
            className="group bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-8 text-left border-2 border-transparent hover:border-blue-500"
          >
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <svg className="w-8 h-8 text-blue-600 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600">
                  🏢 Förderberatung
                </h3>
                <p className="text-gray-600 mb-4">
                  ZIM, BMBF/KMU-innovativ Projektanträge verwalten. Firmen, Projekte, Mitarbeiter und Arbeitspakete anlegen.
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full">Unternehmen</span>
                  <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full">Projekte</span>
                  <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full">Mitarbeiter</span>
                  <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full">Berichte</span>
                </div>
              </div>
            </div>
            <div className="mt-6 flex items-center text-blue-600 font-medium">
              <span>Zum Bereich</span>
              <svg className="w-5 h-5 ml-2 group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </div>
          </button>

          {/* FZul-Beratung */}
          <button
            onClick={() => router.push('/v7/berater/fzul')}
            className="group bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-8 text-left border-2 border-transparent hover:border-green-500"
          >
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center group-hover:bg-green-600 group-hover:text-white transition-colors">
                <svg className="w-8 h-8 text-green-600 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-green-600">
                  📊 FZul-Beratung
                </h3>
                <p className="text-gray-600 mb-4">
                  Forschungszulage (§35a EStG) beantragen. Stundennachweise analysieren und verfügbare FuE-Zeiten ermitteln.
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="px-2 py-1 bg-green-50 text-green-700 text-xs rounded-full">Analyse</span>
                  <span className="px-2 py-1 bg-green-50 text-green-700 text-xs rounded-full">FZul Editor</span>
                  <span className="px-2 py-1 bg-green-50 text-green-700 text-xs rounded-full">Import</span>
                  <span className="px-2 py-1 bg-green-50 text-green-700 text-xs rounded-full">Archiv</span>
                </div>
              </div>
            </div>
            <div className="mt-6 flex items-center text-green-600 font-medium">
              <span>Zum Bereich</span>
              <svg className="w-5 h-5 ml-2 group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </div>
          </button>
        </div>

        {/* Quick Stats */}
        <div className="mt-16 text-center">
          <p className="text-sm text-gray-400">
            Projektzeiterfassung v7.1 · Berater-Portal · © {new Date().getFullYear()}
          </p>
        </div>
      </main>
    </div>
  )
}
