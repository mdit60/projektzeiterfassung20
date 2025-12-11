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
  has_import_access?: boolean
}

interface Company {
  id: string
  name: string
}

function isAdminRole(role: string | undefined): boolean {
  if (!role) return false
  return role === 'admin' || role === 'company_admin'
}

function checkUnsavedChanges(): boolean {
  if (typeof window !== 'undefined' && (window as any).hasUnsavedChanges) {
    return window.confirm('Sie haben ungespeicherte Aenderungen. Ohne Speichern verlassen?')
  }
  return true
}

function isCompanyOwner(profile: UserProfile | null): boolean {
  if (!profile) return false
  if (!isAdminRole(profile.role)) return false
  
  const ownerTitles = [
    // Geschaeftsfuehrung
    'geschaeftsfuehrer', 'gf',
    'ceo', 'chief executive officer',
    'managing director',
    'vorstand', 'vorstandsvorsitzender',
    // Technische Leitung (C-Level)
    'cto', 'chief technology officer',
    // Kaufmaennische Leitung
    'cfo', 'chief financial officer',
    'kaufmaennischer leiter',
    'kaufmaennische leitung',
    'kfm. leiter', 'kfm leiter',
    'finanzleiter', 'finance director',
    'controller', 'head of finance',
    // Operative Leitung
    'coo', 'chief operating officer',
    'betriebsleiter', 'operations director',
    // Eigentuemer/Gesellschafter
    'inhaber', 'inhaberin',
    'owner', 'eigentuemer',
    'gesellschafter',
    // Prokura
    'prokurist', 'prokuristin',
    // Generelle Management-Bezeichnungen
    'general manager', 'direktor', 'director'
  ]
  
  // Normalisiere Umlaute fuer Vergleich
  const normalizeUmlauts = (str: string): string => {
    return str
      .replace(/\u00e4/g, 'ae').replace(/\u00f6/g, 'oe').replace(/\u00fc/g, 'ue')
      .replace(/\u00df/g, 'ss')
      .replace(/\u00c4/g, 'ae').replace(/\u00d6/g, 'oe').replace(/\u00dc/g, 'ue')
  }
  
  const position = normalizeUmlauts((profile.job_function || '').toLowerCase().trim())
  
  if (!position && isAdminRole(profile.role)) {
    return true
  }
  
  return ownerTitles.some(title => position.includes(title))
}

const navigationItems = [
  { name: 'Dashboard', href: '/dashboard', icon: 'H', adminOnly: false, ownerOnly: false },
  { name: 'Zeiterfassung', href: '/zeiterfassung', icon: 'Z', adminOnly: false, ownerOnly: false },
  { name: 'Projekte', href: '/projekte', icon: 'P', adminOnly: true, ownerOnly: false },
  { name: 'Mitarbeiter', href: '/mitarbeiter', icon: 'M', adminOnly: true, ownerOnly: false },
  { name: 'Berichte', href: '/berichte', icon: 'B', adminOnly: true, ownerOnly: false },
  { name: 'Unternehmen', href: '/unternehmen', icon: 'U', adminOnly: true, ownerOnly: true },
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
      if (!user) return

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
        setProfile(profileData)
        
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

  function formatUserName(): string {
    if (!profile) return ''
    if (profile.last_name && profile.first_name) {
      return `${profile.first_name} ${profile.last_name}`
    }
    if (profile.name) return profile.name
    return profile.email || ''
  }

  function getInitials(): string {
    const name = formatUserName()
    if (!name || name.length === 0) return '??'
    const parts = name.trim().split(' ')
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }

  function getRoleDisplay(): string {
    if (!profile) return ''
    if (profile.job_function) return profile.job_function
    if (isAdminRole(profile.role)) return 'Administrator'
    return 'Mitarbeiter'
  }

  const isAdmin = isAdminRole(profile?.role)
  const isOwner = isCompanyOwner(profile)

  const visibleNavItems = navigationItems.filter(item => {
    if (item.ownerOnly) return isOwner
    if (item.adminOnly) return isAdmin
    return true
  })

  function isActive(href: string): boolean {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname === href || pathname.startsWith(href + '/')
  }

  // Icon-Komponente
  const NavIcon = ({ type }: { type: string }) => {
    switch(type) {
      case 'H': return <span>&#x1F3E0;</span>; // Haus
      case 'Z': return <span>&#x23F1;</span>;  // Stoppuhr
      case 'P': return <span>&#x1F4C1;</span>; // Ordner
      case 'M': return <span>&#x1F465;</span>; // Personen
      case 'B': return <span>&#x1F4CA;</span>; // Diagramm
      case 'U': return <span>&#x1F3E2;</span>; // Gebaeude
      case 'A': return <span>&#x1F4C8;</span>; // Chart
      default: return <span>{type}</span>;
    }
  };

  if (loading) {
    return (
      <header className="bg-white border-b shadow-sm sticky top-0 z-50">
        <div className="max-w-[1800px] mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="animate-pulse flex items-center space-x-4">
              <div className="w-8 h-8 bg-gray-200 rounded"></div>
              <div className="h-6 w-40 bg-gray-200 rounded"></div>
            </div>
            <div className="animate-pulse flex space-x-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-10 w-24 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
            <div className="animate-pulse flex items-center space-x-3">
              <div className="h-10 w-32 bg-gray-200 rounded"></div>
              <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
            </div>
          </div>
        </div>
      </header>
    )
  }

  return (
    <header className="bg-white border-b shadow-sm sticky top-0 z-50">
      <div className="max-w-[1800px] mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Links: Logo + Firmenname */}
          <div className="flex items-center space-x-3 min-w-0">
            <span className="text-2xl flex-shrink-0">&#x23F1;</span>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-gray-900 truncate">
                Projektzeiterfassung
              </h1>
              {company && (
                <p className="text-xs text-gray-500 truncate">{company.name}</p>
              )}
            </div>
          </div>

          {/* Mitte: Navigation - Desktop */}
          <nav className="hidden md:flex items-center space-x-1">
            {visibleNavItems.map((item) => (
              <button
                key={item.href}
                onClick={() => {
                  if (checkUnsavedChanges()) {
                    router.push(item.href)
                  }
                }}
                className={`
                  flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium
                  transition-all duration-200
                  ${isActive(item.href)
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }
                `}
              >
                <span className="text-base"><NavIcon type={item.icon} /></span>
                <span>{item.name}</span>
              </button>
            ))}
          </nav>

          {/* Rechts: Analyse-Button + User Info + Logout */}
          <div className="flex items-center space-x-4">
            
            {/* Analyse-Button - nur fuer berechtigte Admins */}
            {profile?.has_import_access && (
              <button
                onClick={() => {
                  if (checkUnsavedChanges()) {
                    router.push('/import')
                  }
                }}
                className={`
                  hidden md:flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium
                  transition-all duration-200 border
                  ${isActive('/import')
                    ? 'bg-orange-100 text-orange-700 border-orange-300' 
                    : 'text-gray-500 border-gray-200 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200'
                  }
                `}
                title="Analyse-Modul (Import)"
              >
                <span className="text-base"><NavIcon type="A" /></span>
                <span>Analyse</span>
              </button>
            )}
            
            {/* User Info - Desktop */}
            <div className="hidden sm:flex items-center space-x-3">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900 truncate max-w-[150px]">
                  {formatUserName()}
                </p>
                <p className="text-xs text-gray-500">
                  {isOwner ? '* ' : isAdmin ? '# ' : ''}
                  {getRoleDisplay()}
                </p>
              </div>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                isOwner ? 'bg-purple-100' : isAdmin ? 'bg-blue-100' : 'bg-green-100'
              }`}>
                <span className={`font-semibold text-sm ${
                  isOwner ? 'text-purple-600' : isAdmin ? 'text-blue-600' : 'text-green-600'
                }`}>
                  {getInitials()}
                </span>
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-red-600 
                         hover:bg-red-50 rounded-lg transition-colors text-sm font-medium"
              title="Abmelden"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="hidden lg:inline">Abmelden</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden border-t bg-gray-50 px-4 py-2 overflow-x-auto">
        <div className="flex space-x-2">
          {visibleNavItems.map((item) => (
            <button
              key={item.href}
              onClick={() => {
                if (checkUnsavedChanges()) {
                  router.push(item.href)
                }
              }}
              className={`
                flex items-center space-x-1 px-3 py-2 rounded-lg text-sm whitespace-nowrap
                transition-colors
                ${isActive(item.href)
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white text-gray-600 border hover:bg-gray-100'
                }
              `}
            >
              <NavIcon type={item.icon} />
              <span>{item.name}</span>
            </button>
          ))}
          
          {/* Analyse-Button fuer Mobile */}
          {profile?.has_import_access && (
            <button
              onClick={() => {
                if (checkUnsavedChanges()) {
                  router.push('/import')
                }
              }}
              className={`
                flex items-center space-x-1 px-3 py-2 rounded-lg text-sm whitespace-nowrap
                transition-colors border
                ${isActive('/import')
                  ? 'bg-orange-100 text-orange-700 border-orange-300' 
                  : 'bg-white text-gray-500 border-gray-200 hover:bg-orange-50'
                }
              `}
            >
              <NavIcon type="A" />
              <span>Analyse</span>
            </button>
          )}
        </div>
      </div>
    </header>
  )
}