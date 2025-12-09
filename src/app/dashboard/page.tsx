// src/app/dashboard/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Header from '@/components/Header'

interface DashboardStats {
  activeProjects: number
  totalEmployees: number
  hoursThisMonth: number
  pendingTimeEntries: number
}

interface UserProfile {
  id: string
  name?: string
  first_name?: string
  last_name?: string
  email: string
  role: string
  company_id: string
}

export default function DashboardPage() {
  const supabase = createClient()
  
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [stats, setStats] = useState<DashboardStats>({
    activeProjects: 0,
    totalEmployees: 0,
    hoursThisMonth: 0,
    pendingTimeEntries: 0
  })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Profil laden
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileData) {
        setProfile(profileData)
        
        // Stats nur für Admins laden
        if (profileData.role === 'admin') {
          await loadAdminStats(profileData.company_id)
        } else {
          await loadUserStats(user.id, profileData.company_id)
        }
      }
    } catch (error) {
      console.error('Error loading dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadAdminStats(companyId: string) {
    // Aktive Projekte
    const { count: projectCount } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('status', 'active')

    // Mitarbeiter
    const { count: employeeCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('is_active', true)

    // Stunden diesen Monat
    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

    const { data: timeEntries } = await supabase
      .from('time_entries')
      .select('hours')
      .eq('company_id', companyId)
      .gte('date', firstDay)
      .lte('date', lastDay)

    const totalHours = timeEntries?.reduce((sum, entry) => sum + (entry.hours || 0), 0) || 0

    setStats({
      activeProjects: projectCount || 0,
      totalEmployees: employeeCount || 0,
      hoursThisMonth: Math.round(totalHours),
      pendingTimeEntries: 0
    })
  }

  async function loadUserStats(userId: string, companyId: string) {
    // Nur eigene Stunden diesen Monat
    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

    const { data: timeEntries } = await supabase
      .from('time_entries')
      .select('hours')
      .eq('employee_id', userId)
      .gte('date', firstDay)
      .lte('date', lastDay)

    const totalHours = timeEntries?.reduce((sum, entry) => sum + (entry.hours || 0), 0) || 0

    // Zugewiesene Projekte
    const { count: projectCount } = await supabase
      .from('project_assignments')
      .select('*', { count: 'exact', head: true })
      .eq('employee_id', userId)

    setStats({
      activeProjects: projectCount || 0,
      totalEmployees: 0,
      hoursThisMonth: Math.round(totalHours),
      pendingTimeEntries: 0
    })
  }

  // Formatiere Monatsnamen
  function getCurrentMonthName(): string {
    const months = [
      'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
      'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
    ]
    return months[new Date().getMonth()]
  }

  const isAdmin = profile?.role === 'admin'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Komponente */}
      <Header />

      {/* Content */}
      <main className="max-w-[1800px] mx-auto px-6 lg:px-8 py-8">
        {/* Seitentitel */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            {isAdmin ? 'Dashboard' : 'Mein Bereich'}
          </h1>
          <p className="text-gray-500 mt-1">
            {isAdmin 
              ? 'Übersicht über alle Projekte und Mitarbeiter'
              : 'Übersicht über deine Zeiterfassung'
            }
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white p-6 rounded-xl shadow-sm border animate-pulse">
                <div className="h-4 w-24 bg-gray-200 rounded mb-3"></div>
                <div className="h-8 w-16 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Statistik-Karten */}
            <div className={`grid gap-6 ${isAdmin ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 md:grid-cols-2'}`}>
              
              {/* Projekte */}
              <div className="bg-white p-6 rounded-xl shadow-sm border hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">
                      {isAdmin ? 'Aktive Projekte' : 'Meine Projekte'}
                    </p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">
                      {stats.activeProjects}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <span className="text-2xl">📁</span>
                  </div>
                </div>
              </div>

              {/* Mitarbeiter - nur Admin */}
              {isAdmin && (
                <div className="bg-white p-6 rounded-xl shadow-sm border hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Mitarbeiter</p>
                      <p className="text-3xl font-bold text-gray-900 mt-1">
                        {stats.totalEmployees}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                      <span className="text-2xl">👥</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Stunden diesen Monat */}
              <div className="bg-white p-6 rounded-xl shadow-sm border hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">
                      Stunden ({getCurrentMonthName()})
                    </p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">
                      {stats.hoursThisMonth}h
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                    <span className="text-2xl">⏱️</span>
                  </div>
                </div>
              </div>

              {/* Schnellzugriff */}
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-xl shadow-sm text-white hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-100">Schnellzugriff</p>
                    <button 
                      onClick={() => window.location.href = '/zeiterfassung'}
                      className="text-lg font-semibold mt-1 hover:underline"
                    >
                      → Zeiten erfassen
                    </button>
                  </div>
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <span className="text-2xl">✏️</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Weitere Inhalte für Admins */}
            {isAdmin && (
              <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Schnellzugriffe */}
                <div className="bg-white p-6 rounded-xl shadow-sm border">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    Schnellzugriffe
                  </h2>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => window.location.href = '/projekte'}
                      className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-left"
                    >
                      <span className="text-2xl">📁</span>
                      <div>
                        <p className="font-medium text-gray-900">Projekte</p>
                        <p className="text-xs text-gray-500">Verwalten</p>
                      </div>
                    </button>
                    <button
                      onClick={() => window.location.href = '/mitarbeiter'}
                      className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-left"
                    >
                      <span className="text-2xl">👥</span>
                      <div>
                        <p className="font-medium text-gray-900">Mitarbeiter</p>
                        <p className="text-xs text-gray-500">Team verwalten</p>
                      </div>
                    </button>
                    <button
                      onClick={() => window.location.href = '/berichte'}
                      className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-left"
                    >
                      <span className="text-2xl">📊</span>
                      <div>
                        <p className="font-medium text-gray-900">Berichte</p>
                        <p className="text-xs text-gray-500">Auswertungen</p>
                      </div>
                    </button>
                    <button
                      onClick={() => window.location.href = '/einstellungen'}
                      className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-left"
                    >
                      <span className="text-2xl">⚙️</span>
                      <div>
                        <p className="font-medium text-gray-900">Einstellungen</p>
                        <p className="text-xs text-gray-500">Firmendaten</p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Info-Box */}
                <div className="bg-white p-6 rounded-xl shadow-sm border">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    Hinweise
                  </h2>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                      <span className="text-blue-600">ℹ️</span>
                      <div>
                        <p className="text-sm font-medium text-blue-900">Tipp</p>
                        <p className="text-xs text-blue-700">
                          Nutze die Navigation oben, um schnell zwischen den Bereichen zu wechseln.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3 p-3 bg-amber-50 rounded-lg">
                      <span className="text-amber-600">📋</span>
                      <div>
                        <p className="text-sm font-medium text-amber-900">Berichte</p>
                        <p className="text-xs text-amber-700">
                          FZul-Jahresberichte und ZIM-Monatsnachweise findest du unter Berichte.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Info für User */}
            {!isAdmin && (
              <div className="mt-8">
                <div className="bg-white p-6 rounded-xl shadow-sm border">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    Deine Aufgaben
                  </h2>
                  <div className="flex items-start space-x-3 p-4 bg-blue-50 rounded-lg">
                    <span className="text-2xl">⏱️</span>
                    <div>
                      <p className="font-medium text-blue-900">Zeiterfassung</p>
                      <p className="text-sm text-blue-700 mt-1">
                        Trage deine Arbeitszeiten regelmäßig in der Zeiterfassung ein. 
                        Wähle das passende Projekt und Arbeitspaket aus.
                      </p>
                      <button
                        onClick={() => window.location.href = '/zeiterfassung'}
                        className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                      >
                        Zur Zeiterfassung
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}