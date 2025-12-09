// src/app/berichte/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Header from '@/components/Header'

// Types
interface UserProfile {
  id: string
  name: string
  first_name: string
  last_name: string
  email: string
  role: string
  weekly_hours: number
  is_active: boolean
  company_id: string
}

interface Project {
  id: string
  name: string
  short_name: string
  funding_reference: string
  funding_rate: number
  overhead_rate: number
  status: string
}

interface Company {
  id: string
  name: string
  state_code: string
}

// Hilfsfunktion für Namen-Formatierung (Nachname, Vorname)
function formatEmployeeName(emp: UserProfile): string {
  if (emp.last_name && emp.first_name) {
    return `${emp.last_name}, ${emp.first_name}`;
  } else if (emp.name) {
    // Name splitten: "Vorname Nachname" → "Nachname, Vorname"
    const parts = emp.name.split(' ');
    if (parts.length >= 2) {
      return `${parts[parts.length - 1]}, ${parts.slice(0, -1).join(' ')}`;
    }
    return emp.name;
  }
  return emp.email || 'Unbekannt';
}

export default function BerichtePage() {
  const supabase = createClient()
  
  // State
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  // Data
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null)
  const [company, setCompany] = useState<Company | null>(null)
  const [employees, setEmployees] = useState<UserProfile[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  
  // Form State für FZul Export
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedEmployee, setSelectedEmployee] = useState<string>('')
  const [selectedProject, setSelectedProject] = useState<string>('')
  const [kurzbezeichnungVorhaben, setKurzbezeichnungVorhaben] = useState('')
  const [vorhabenId, setVorhabenId] = useState('')
  const [kurzbezeichnungFueTaetigkeit, setKurzbezeichnungFueTaetigkeit] = useState('')
  const [monateFue, setMonateFue] = useState(12)
  
  // Form State für ZIM Stundennachweis
  const [zimProject, setZimProject] = useState<string>('')
  const [zimEmployee, setZimEmployee] = useState<string>('')
  const [zimMonth, setZimMonth] = useState(new Date().getMonth() + 1)
  const [zimYear, setZimYear] = useState(new Date().getFullYear())
  
  // Form State für Zahlungsanforderung
  const [zaProject, setZaProject] = useState<string>('')
  const [zaPeriodStart, setZaPeriodStart] = useState('')
  const [zaPeriodEnd, setZaPeriodEnd] = useState('')
  
  // Aktiver Tab
  const [activeTab, setActiveTab] = useState<'fzul' | 'zim' | 'zahlungsanforderung' | 'uebersicht'>('fzul')
  
  // Jahre für Dropdown (5 Jahre zurück bis aktuelles Jahr)
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 6 }, (_, i) => currentYear - 5 + i).reverse()
  const months = [
    { value: 1, label: 'Januar' },
    { value: 2, label: 'Februar' },
    { value: 3, label: 'März' },
    { value: 4, label: 'April' },
    { value: 5, label: 'Mai' },
    { value: 6, label: 'Juni' },
    { value: 7, label: 'Juli' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'Oktober' },
    { value: 11, label: 'November' },
    { value: 12, label: 'Dezember' },
  ]
  
  // Daten laden
  useEffect(() => {
    loadData()
  }, [])
  
  // Wenn Projekt ausgewählt wird, Felder vorausfüllen
  useEffect(() => {
    if (selectedProject) {
      const project = projects.find(p => p.id === selectedProject)
      if (project) {
        setKurzbezeichnungVorhaben(project.name)
        setVorhabenId(project.funding_reference || '')
      }
    }
  }, [selectedProject, projects])
  
  // Hilfsfunktion für lokales Datum (ohne Zeitzonen-Shift)
  const formatDateLocal = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  
  // Standard-Zeitraum für ZA setzen (letztes Quartal)
  useEffect(() => {
    const now = new Date()
    const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 - 3, 1)
    const quarterEnd = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 0)
    
    setZaPeriodStart(formatDateLocal(quarterStart))
    setZaPeriodEnd(formatDateLocal(quarterEnd))
  }, [])
  
  async function loadData() {
    try {
      setLoading(true)
      
      // Auth User laden
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        setError('Nicht authentifiziert')
        return
      }
      
      // User Profile laden
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()
      
      if (profileError || !profile) {
        setError('Profil nicht gefunden')
        return
      }
      
      setCurrentUser(profile)
      setSelectedEmployee(profile.id)
      setZimEmployee(profile.id)
      
      // Company laden
      const { data: companyData } = await supabase
        .from('companies')
        .select('*')
        .eq('id', profile.company_id)
        .single()
      
      if (companyData) {
        setCompany(companyData)
      }
      
      // Mitarbeiter laden (nur für Admins)
      if (profile.role === 'admin' || profile.role === 'company_admin') {
        const { data: employeesData } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('company_id', profile.company_id)
          .eq('is_active', true)
          .order('last_name')
        
        if (employeesData) {
          setEmployees(employeesData)
        }
      } else {
        // Normaler Mitarbeiter sieht nur sich selbst
        setEmployees([profile])
      }
      
      // Projekte laden
      const { data: projectsData } = await supabase
        .from('projects')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('name')
      
      if (projectsData) {
        setProjects(projectsData)
      }
      
    } catch (err) {
      setError('Fehler beim Laden der Daten')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }
  
  // FZul Export durchführen
  async function handleFzulExport() {
    if (!selectedEmployee) {
      setError('Bitte wählen Sie einen Mitarbeiter aus')
      return
    }
    
    try {
      setExporting(true)
      setError(null)
      setSuccess(null)
      
      const response = await fetch('/api/reports/fzul-stundennachweis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: selectedEmployee,
          projectId: selectedProject || null,
          year: selectedYear,
          kurzbezeichnungVorhaben,
          vorhabenId,
          kurzbezeichnungFueTaetigkeit,
          monateFue
        }),
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unbekannter Fehler' }))
        console.error('API Error:', errorData)
        throw new Error(errorData.details || errorData.error || 'Export fehlgeschlagen')
      }
      
      // Blob erstellen und Download triggern
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      
      // Filename aus Header oder generieren
      const contentDisposition = response.headers.get('Content-Disposition')
      let filename = `FZul_Stundennachweis_${selectedYear}.pdf`
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/)
        if (match) {
          filename = match[1]
        }
      }
      
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      
      setSuccess(`Export erfolgreich: ${filename}`)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export fehlgeschlagen')
      console.error(err)
    } finally {
      setExporting(false)
    }
  }
  
  // ZIM Monatsbericht Export
  async function handleZimExport() {
    if (!zimEmployee || !zimProject) {
      setError('Bitte wählen Sie Mitarbeiter und Projekt aus')
      return
    }
    
    try {
      setExporting(true)
      setError(null)
      setSuccess(null)
      
      const response = await fetch('/api/reports/monthly-timesheet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: zimEmployee,
          projectId: zimProject,
          year: zimYear,
          month: zimMonth
        }),
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unbekannter Fehler' }))
        throw new Error(errorData.details || errorData.error || 'Export fehlgeschlagen')
      }
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      
      const contentDisposition = response.headers.get('Content-Disposition')
      let filename = `ZIM_Stundennachweis_${zimYear}-${String(zimMonth).padStart(2, '0')}.pdf`
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/)
        if (match) filename = match[1]
      }
      
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      
      setSuccess(`Export erfolgreich: ${filename}`)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export fehlgeschlagen')
      console.error(err)
    } finally {
      setExporting(false)
    }
  }
  
  // Zahlungsanforderung PDF Export
  async function handleZaExport() {
    if (!zaProject || !zaPeriodStart || !zaPeriodEnd) {
      setError('Bitte wählen Sie Projekt und Zeitraum aus')
      return
    }
    
    try {
      setExporting(true)
      setError(null)
      setSuccess(null)
      
      const response = await fetch('/api/payment-requests/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: zaProject,
          periodStart: zaPeriodStart,
          periodEnd: zaPeriodEnd
        }),
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unbekannter Fehler' }))
        console.error('API Error:', errorData)
        throw new Error(errorData.details || errorData.error || 'Export fehlgeschlagen')
      }
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      
      const contentDisposition = response.headers.get('Content-Disposition')
      let filename = `Zahlungsanforderung_${zaPeriodStart}_${zaPeriodEnd}.pdf`
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/)
        if (match) filename = match[1]
      }
      
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      
      setSuccess(`Export erfolgreich: ${filename}`)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export fehlgeschlagen')
      console.error(err)
    } finally {
      setExporting(false)
    }
  }
  
  // Projekte mit Förderkennzeichen filtern
  const fundingProjects = projects.filter(p => p.funding_reference)
  
  // Ausgewähltes ZA-Projekt Details
  const selectedZaProject = projects.find(p => p.id === zaProject)
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Lade Daten...</p>
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header-Komponente */}
      <Header />
      
      <main className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Seiten-Titel */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">📊 Berichte</h1>
          <p className="text-gray-600 mt-1">Stundennachweise und Zahlungsanforderungen exportieren</p>
        </div>

        {/* Fehler/Erfolg Meldungen */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <svg className="w-5 h-5 text-red-400 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className="text-red-700">{error}</p>
              <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        )}
        
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex">
              <svg className="w-5 h-5 text-green-400 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <p className="text-green-700">{success}</p>
              <button onClick={() => setSuccess(null)} className="ml-auto text-green-400 hover:text-green-600">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        )}
        
        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-sm border mb-6">
          <div className="border-b">
            <nav className="flex -mb-px overflow-x-auto">
              <button
                onClick={() => setActiveTab('fzul')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === 'fzul'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>FZul Stundennachweis</span>
                </div>
                <span className="text-xs text-gray-400 block mt-1">Jährlich / BMF</span>
              </button>
              
              <button
                onClick={() => setActiveTab('zim')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === 'zim'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>ZIM Stundennachweis</span>
                </div>
                <span className="text-xs text-gray-400 block mt-1">Monatlich</span>
              </button>
              
              <button
                onClick={() => setActiveTab('zahlungsanforderung')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === 'zahlungsanforderung'
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span>Zahlungsanforderung</span>
                </div>
                <span className="text-xs text-green-500 block mt-1">NEU ✨</span>
              </button>
              
              <button
                onClick={() => setActiveTab('uebersicht')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === 'uebersicht'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                  </svg>
                  <span>Übersicht</span>
                </div>
                <span className="text-xs text-gray-400 block mt-1">Auswertungen</span>
              </button>
            </nav>
          </div>
        </div>
        
        {/* Tab Content */}
        {activeTab === 'fzul' && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900">FZul Stundennachweis exportieren</h2>
              <p className="text-sm text-gray-500 mt-1">
                Jährlicher Stundennachweis für die steuerliche Förderung von Forschung und Entwicklung (FuE) gemäß BMF-Vorgaben.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Linke Spalte */}
              <div className="space-y-4">
                {/* Jahr */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Wirtschaftsjahr *
                  </label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {years.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
                
                {/* Mitarbeiter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mitarbeiter *
                  </label>
                  <select
                    value={selectedEmployee}
                    onChange={(e) => setSelectedEmployee(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">-- Mitarbeiter auswählen --</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {formatEmployeeName(emp)}
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Projekt (optional) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Projekt (optional)
                  </label>
                  <select
                    value={selectedProject}
                    onChange={(e) => setSelectedProject(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">-- Alle Projekte --</option>
                    {projects.map(proj => (
                      <option key={proj.id} value={proj.id}>
                        {proj.name} {proj.short_name && `(${proj.short_name})`}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Leer lassen für alle FuE-Stunden
                  </p>
                </div>
                
                {/* Monate FuE */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Monate FuE-Tätigkeit
                  </label>
                  <select
                    value={monateFue}
                    onChange={(e) => setMonateFue(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                      <option key={m} value={m}>{m} Monat{m > 1 ? 'e' : ''}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              {/* Rechte Spalte */}
              <div className="space-y-4">
                {/* Kurzbezeichnung Vorhaben */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kurzbezeichnung des FuE-Vorhabens
                  </label>
                  <input
                    type="text"
                    value={kurzbezeichnungVorhaben}
                    onChange={(e) => setKurzbezeichnungVorhaben(e.target.value)}
                    placeholder="z.B. Entwicklung innovativer Sensortechnologie"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                {/* Vorhaben-ID */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vorhaben-ID des FuE-Vorhabens
                  </label>
                  <input
                    type="text"
                    value={vorhabenId}
                    onChange={(e) => setVorhabenId(e.target.value)}
                    placeholder="z.B. FZul-2024-12345"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                {/* Kurzbezeichnung FuE-Tätigkeit */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kurzbezeichnung der FuE-Tätigkeit
                  </label>
                  <input
                    type="text"
                    value={kurzbezeichnungFueTaetigkeit}
                    onChange={(e) => setKurzbezeichnungFueTaetigkeit(e.target.value)}
                    placeholder="z.B. Softwareentwicklung, Konstruktion"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
            
            {/* Export Button */}
            <div className="mt-8 pt-6 border-t flex justify-end">
              <button
                onClick={handleFzulExport}
                disabled={exporting || !selectedEmployee}
                className={`inline-flex items-center px-6 py-3 rounded-lg font-medium text-white transition-colors ${
                  exporting || !selectedEmployee
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {exporting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Exportiere...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    PDF herunterladen
                  </>
                )}
              </button>
            </div>
          </div>
        )}
        
        {activeTab === 'zim' && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900">ZIM Stundennachweis exportieren</h2>
              <p className="text-sm text-gray-500 mt-1">
                Monatlicher Stundennachweis für ZIM-Förderprojekte (Zentrales Innovationsprogramm Mittelstand).
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                {/* Projekt (nur mit Förderkennzeichen) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Projekt *
                  </label>
                  <select
                    value={zimProject}
                    onChange={(e) => setZimProject(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">-- Projekt auswählen --</option>
                    {fundingProjects.map(proj => (
                      <option key={proj.id} value={proj.id}>
                        {proj.name} ({proj.funding_reference})
                      </option>
                    ))}
                  </select>
                  {fundingProjects.length === 0 && (
                    <p className="text-xs text-orange-600 mt-1">
                      Keine Projekte mit Förderkennzeichen vorhanden
                    </p>
                  )}
                </div>
                
                {/* Mitarbeiter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mitarbeiter *
                  </label>
                  <select
                    value={zimEmployee}
                    onChange={(e) => setZimEmployee(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">-- Mitarbeiter auswählen --</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {formatEmployeeName(emp)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="space-y-4">
                {/* Monat/Jahr */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Monat *
                    </label>
                    <select
                      value={zimMonth}
                      onChange={(e) => setZimMonth(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {months.map(m => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Jahr *
                    </label>
                    <select
                      value={zimYear}
                      onChange={(e) => setZimYear(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {years.map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                {/* Info */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-xs text-blue-700">
                    Der Stundennachweis enthält alle Arbeitspakete des Projekts mit den erfassten Stunden pro Tag.
                    Feiertage werden automatisch markiert.
                  </p>
                </div>
              </div>
            </div>
            
            {/* Export Button */}
            <div className="mt-8 pt-6 border-t flex justify-end">
              <button
                onClick={handleZimExport}
                disabled={exporting || !zimEmployee || !zimProject}
                className={`inline-flex items-center px-6 py-3 rounded-lg font-medium text-white transition-colors ${
                  exporting || !zimEmployee || !zimProject
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {exporting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Exportiere...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    PDF herunterladen
                  </>
                )}
              </button>
            </div>
          </div>
        )}
        
        {/* ZAHLUNGSANFORDERUNG TAB */}
        {activeTab === 'zahlungsanforderung' && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Zahlungsanforderung (Anlage 1a + 1b)</h2>
              <p className="text-sm text-gray-500 mt-1">
                PDF-Export der Anlagen zur Zahlungsanforderung für ZIM-Förderprojekte.
                Berechnet automatisch Personalstunden und -kosten aus den erfassten Zeiten.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Linke Spalte */}
              <div className="space-y-4">
                {/* Projekt */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Projekt *
                  </label>
                  <select
                    value={zaProject}
                    onChange={(e) => setZaProject(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="">-- Projekt auswählen --</option>
                    {fundingProjects.map(proj => (
                      <option key={proj.id} value={proj.id}>
                        {proj.name} ({proj.funding_reference})
                      </option>
                    ))}
                  </select>
                  {fundingProjects.length === 0 && (
                    <p className="text-xs text-orange-600 mt-1">
                      ⚠️ Keine Projekte mit Förderkennzeichen vorhanden. Bitte zuerst ein Projekt mit Förderdaten anlegen.
                    </p>
                  )}
                </div>
                
                {/* Zeitraum */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Zeitraum von *
                    </label>
                    <input
                      type="date"
                      value={zaPeriodStart}
                      onChange={(e) => setZaPeriodStart(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Zeitraum bis *
                    </label>
                    <input
                      type="date"
                      value={zaPeriodEnd}
                      onChange={(e) => setZaPeriodEnd(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                </div>
                
                {/* Schnellauswahl Quartal */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Schnellauswahl
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[1, 2, 3, 4].map(q => {
                      const year = currentYear
                      const startMonth = (q - 1) * 3
                      const start = new Date(year, startMonth, 1)
                      const end = new Date(year, startMonth + 3, 0)
                      return (
                        <button
                          key={q}
                          type="button"
                          onClick={() => {
                            setZaPeriodStart(formatDateLocal(start))
                            setZaPeriodEnd(formatDateLocal(end))
                          }}
                          className="px-3 py-1 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          Q{q}/{year}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
              
              {/* Rechte Spalte - Projekt-Info */}
              <div className="space-y-4">
                {selectedZaProject ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-green-800 mb-3">📋 Projektdaten</h4>
                    <dl className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-green-700">Förderkennzeichen:</dt>
                        <dd className="font-medium text-green-900">{selectedZaProject.funding_reference}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-green-700">Fördersatz:</dt>
                        <dd className="font-medium text-green-900">{selectedZaProject.funding_rate || 50} %</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-green-700">Übrige Kosten:</dt>
                        <dd className="font-medium text-green-900">{selectedZaProject.overhead_rate || 0} %</dd>
                      </div>
                    </dl>
                  </div>
                ) : (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <p className="text-sm text-gray-500 text-center py-4">
                      Wählen Sie ein Projekt aus, um die Förderdaten anzuzeigen.
                    </p>
                  </div>
                )}
                
                {/* Info-Box */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-blue-800 mb-2">ℹ️ Was wird exportiert?</h4>
                  <ul className="text-xs text-blue-700 space-y-1">
                    <li>• <strong>Anlage 1a:</strong> Personenstunden pro Mitarbeiter und Monat</li>
                    <li>• <strong>Anlage 1b:</strong> Personalkosten (Stunden × Stundensatz)</li>
                    <li>• Automatische Berechnung aus erfassten Zeiten</li>
                    <li>• Stundensätze aus Mitarbeiter-Gehaltsdaten</li>
                  </ul>
                </div>
              </div>
            </div>
            
            {/* Export Button */}
            <div className="mt-8 pt-6 border-t flex justify-end">
              <button
                onClick={handleZaExport}
                disabled={exporting || !zaProject || !zaPeriodStart || !zaPeriodEnd}
                className={`inline-flex items-center px-6 py-3 rounded-lg font-medium text-white transition-colors ${
                  exporting || !zaProject || !zaPeriodStart || !zaPeriodEnd
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {exporting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Berechne &amp; Exportiere...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    PDF herunterladen (Anlage 1a + 1b)
                  </>
                )}
              </button>
            </div>
          </div>
        )}
        
        {activeTab === 'uebersicht' && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Auswertungen & Übersichten</h3>
              <p className="text-gray-500 mb-4">
                Grafische Auswertungen, Projekt-Fortschritte und Mitarbeiter-Auslastung werden in Kürze verfügbar sein.
              </p>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                🚧 In Entwicklung
              </span>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}