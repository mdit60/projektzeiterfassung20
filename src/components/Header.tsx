// src/components/Header.tsx
'use client'

import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useState, useEffect } from 'react'

interface UserProfile {
  id: string
  user_id: string
  name?: string
  first_name?: string
  last_name?: string
  email: string
  role: string
  job_function?: string
  company_id: string
  has_import_access?: boolean  // NEU: Import-Berechtigung
}

interface Company {
  id: string
  name: string
}

// Hilfsfunktion: Ist der User ein Admin?
function isAdminRole(role: string | undefined): boolean {
  if (!role) return false
  return role === 'admin' || role === 'company_admin'
}

// Hilfsfunktion: Prüft auf ungespeicherte Änderungen vor Navigation
function checkUnsavedChanges(): boolean {
  if (typeof window !== 'undefined' && (window as any).hasUnsavedChanges) {
    return window.confirm('Sie haben ungespeicherte Änderungen. Ohne Speichern verlassen?')
  }
  return true
}

// Hilfsfunktion: Ist der User Geschäftsführer/Inhaber/Management?
// Prüft ob die Position typische Management-Bezeichnungen enthält
function isCompanyOwner(profile: UserProfile | null): boolean {
  if (!profile) return false
  if (!isAdminRole(profile.role)) return false
  
  // Management-Positionen mit Zugriff auf Unternehmensdaten
  const ownerTitles = [
    // Geschäftsführung
    'geschäftsführer', 'geschaeftsfuehrer', 'gf',
    'ceo', 'chief executive officer',
    'managing director',
    'vorstand', 'vorstandsvorsitzender',
    // Technische Leitung (C-Level)
    'cto', 'chief technology officer',
    // Kaufmännische Leitung
    'cfo', 'chief financial officer',
    'kaufmännischer leiter', 'kaufmaennischer leiter',
    'kaufmännische leitung', 'kaufmaennische leitung',
    'kfm. leiter', 'kfm leiter',
    'finanzleiter', 'finance director',
    'controller', 'head of finance',
    // Operative Leitung
    'coo', 'chief operating officer',
    'betriebsleiter', 'operations director',
    // Eigentümer/Gesellschafter
    'inhaber', 'inhaberin',
    'owner', 'eigentümer', 'eigentuemer',
    'gesellschafter', 'geschäftsführender gesellschafter',
    // Prokura
    'prokurist', 'prokuristin',
    // Generelle Management-Bezeichnungen
    'general manager', 'direktor', 'director'
  ]
  
  const position = (profile.job_function || '').toLowerCase().trim()
  
  // Wenn keine Position gesetzt ist, geben wir trotzdem Zugriff für Admins
  // (Fallback für bestehende Accounts ohne Position)
  if (!position && isAdminRole(profile.role)) {
    return true // TODO: Später einschränken wenn alle Positionen gepflegt sind
  }
  
  return ownerTitles.some(title => position.includes(title))
}

// Navigation Items mit Rollen-Berechtigung
const navigationItems = [
  { 
    name: 'Dashboard', 
    href: '/dashboard', 
    icon: '🏠',
    adminOnly: false,
    ownerOnly: false,
    importOnly: false,
  },
  { 
    name: 'Zeiterfassung', 
    href: '/zeiterfassung', 
    icon: '⏱️',
    adminOnly: false,
    ownerOnly: false,
    importOnly: false,
  },
  { 
    name: 'Projekte', 
    href: '/projekte', 
    icon: '📁',
    adminOnly: true,
    ownerOnly: false,
    importOnly: false,
  },
  { 
    name: 'Mitarbeiter', 
    href: '/mitarbeiter', 
    icon: '👥',
    adminOnly: true,
    ownerOnly: false,
    importOnly: false,
  },
  { 
    name: 'Berichte', 
    href: '/berichte', 
    icon: '📊',
    adminOnly: true,
    ownerOnly: false,
    importOnly: false,
  },
  { 
    name: 'Unternehmen', 
    href: '/unternehmen', 
    icon: '🏢',
    adminOnly: true,
    ownerOnly: true, // Nur für Geschäftsführer!
    importOnly: false,
  },
  // NEU: Import-Modul (nur für User mit has_import_access)
  { 
    name: 'Import', 
    href: '/import', 
    icon: '📥',
    adminOnly: false,  // Wird durch importOnly gesteuert
    ownerOnly: false,
    importOnly: true,  // Nur für User mit Import-Berechtigung!
  },
]

export default function Header() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [company, setCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUserData()
  }, [])

  async function loadUserData() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.log('Header: Kein User gefunden')
        return
      }

      // user_profiles Tabelle mit user_id - inkl. has_import_access
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (profileError) {
        console.error('Header: Fehler beim Laden des Profils:', profileError)
        return
      }

      if (profileData) {
        console.log('Header: Profil geladen:', profileData.name, 'Rolle:', profileData.role, 'Position:', profileData.job_function, 'Import-Zugang:', profileData.has_import_access)
        setProfile(profileData)
        
        // Firma laden
        if (profileData.company_id) {
          const { data: companyData } = await supabase
            .from('companies')
            .select('id, name')
            .eq('id', profileData.company_id)
            .single()
            
          if (companyData) {
            setCompany(companyData)
          }
        }
      }
    } catch (error) {
      console.error('Header: Unerwarteter Fehler:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleLogout() {
    if (!checkUnsavedChanges()) return
    await supabase.auth.signOut()
    router.push('/login')
  }

  // Formatiere Benutzername
  function formatUserName(): string {
    if (!profile) return ''
    if (profile.last_name && profile.first_name) {
      return `${profile.first_name} ${profile.last_name}`
    }
    if (profile.name) return profile.name
    return profile.email.split('@')[0]
  }
  
  // Formatiere Position für Anzeige
  function formatPosition(): string {
    if (!profile) return ''
    return profile.job_function || ''
  }

  // Initialen für Avatar
  function getInitials(): string {
    if (!profile) return '?'
    if (profile.first_name && profile.last_name) {
      return `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase()
    }
    if (profile.name) {
      const parts = profile.name.split(' ')
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
      }
      return profile.name.substring(0, 2).toUpperCase()
    }
    return profile.email.substring(0, 2).toUpperCase()
  }

  // Navigiere mit Prüfung auf ungespeicherte Änderungen
  function handleNavigation(href: string) {
    if (!checkUnsavedChanges()) return
    router.push(href)
  }

  // Filter Navigation basierend auf Benutzerrolle
  const filteredNavigation = navigationItems.filter(item => {
    // Import-Only Items: Nur wenn has_import_access = true
    if (item.importOnly) {
      return profile?.has_import_access === true
    }
    // Owner-Only Items: Nur für Geschäftsführer
    if (item.ownerOnly) {
      return isCompanyOwner(profile)
    }
    // Admin-Only Items: Für Admins
    if (item.adminOnly) {
      return isAdminRole(profile?.role)
    }
    // Alle anderen Items: Für alle sichtbar
    return true
  })

  if (loading) {
    return (
      <header className="bg-slate-800 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">⏱️</span>
              <span className="font-bold text-lg">Projektzeiterfassung</span>
            </div>
          </div>
        </div>
      </header>
    )
  }

  return (
    <header className="bg-slate-800 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo und Firmenname */}
          <div className="flex items-center space-x-3">
            <span className="text-2xl">⏱️</span>
            <div>
              <span className="font-bold text-lg">Projektzeiterfassung</span>
              {company && (
                <span className="text-slate-400 text-sm ml-2">{company.name}</span>
              )}
            </div>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {filteredNavigation.map(item => {
              const isActive = pathname === item.href || 
                (item.href !== '/dashboard' && pathname?.startsWith(item.href))
              
              return (
                <button
                  key={item.href}
                  onClick={() => handleNavigation(item.href)}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-slate-700 text-white'
                      : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  <span className="mr-1">{item.icon}</span>
                  {item.name}
                </button>
              )
            })}
          </nav>

          {/* User-Bereich */}
          <div className="flex items-center space-x-4">
            {/* User Info */}
            <div className="hidden sm:flex items-center space-x-3">
              <div className="text-right">
                <div className="text-sm font-medium">{formatUserName()}</div>
                <div className="text-xs text-slate-400">
                  {formatPosition() || (isAdminRole(profile?.role) ? 'Projektleiter' : 'Mitarbeiter')}
                </div>
              </div>
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-sm font-bold">
                {getInitials()}
              </div>
            </div>

            {/* Abmelden Button */}
            <button
              onClick={handleLogout}
              className="flex items-center space-x-1 px-3 py-2 rounded-md text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
            >
              <span>🚪</span>
              <span className="hidden sm:inline">Abmelden</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden border-t border-slate-700">
        <div className="px-2 py-2 space-y-1">
          {filteredNavigation.map(item => {
            const isActive = pathname === item.href || 
              (item.href !== '/dashboard' && pathname?.startsWith(item.href))
            
            return (
              <button
                key={item.href}
                onClick={() => handleNavigation(item.href)}
                className={`block w-full text-left px-3 py-2 rounded-md text-sm font-medium ${
                  isActive
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <span className="mr-2">{item.icon}</span>
                {item.name}
              </button>
            )
          })}
        </div>
      </div>
    </header>
  )
}