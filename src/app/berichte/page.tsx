// src/app/berichte/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

// Types
interface UserProfile {
  id: string
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
  status: string
}

interface Company {
  id: string
  name: string
  state_code: string
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
  
  // Form State für ZIM Export
  const [zimEmployee, setZimEmployee] = useState<string>('')
  const [zimProject, setZimProject] = useState<string>('')
  const [zimYear, setZimYear] = useState(new Date().getFullYear())
  const [zimMonth, setZimMonth] = useState(new Date().getMonth() + 1)
  
  // Aktiver Tab
  const [activeTab, setActiveTab] = useState<'fzul' | 'zim' | 'uebersicht'>('fzul')
  
  // Jahre für Dropdown (5 Jahre zurück bis aktuelles Jahr)
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 6 }, (_, i) => currentYear - 5 + i).reverse()
  
  // Monate für Dropdown
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
  
  // Projekte mit Förderkennzeichen filtern
  const fundedProjects = projects.filter(p => p.funding_reference && p.funding_reference.trim() !== '')
  
  // Daten laden
  useEffect(() => {
    loadData()
  }, [])
  
  // Wenn Projekt ausgewählt wird, Felder vorausfüllen (FZul)
  useEffect(() => {
    if (selectedProject) {
      const project = projects.find(p => p.id === selectedProject)
      if (project) {
        setKurzbezeichnungVorhaben(project.name)
        setVorhabenId(project.funding_reference || '')
      }
    }
  }, [selectedProject, projects])
  
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
      
      // Mitarbeiter laden (nur für Admins/Manager)
      if (profile.role === 'company_admin' || profile.role === 'manager') {
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
  
  // ZIM Export durchführen
  async function handleZimExport() {
    if (!zimEmployee) {
      setError('Bitte wählen Sie einen Mitarbeiter aus')
      return
    }
    if (!zimProject) {
      setError('Bitte wählen Sie ein Projekt aus')
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
      let filename = `Stundennachweis_${zimYear}-${String(zimMonth).padStart(2, '0')}.pdf`
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
  
  // Monat vor/zurück navigieren
  function navigateMonth(direction: 'prev' | 'next') {
    if (direction === 'prev') {
      if (zimMonth === 1) {
        setZimMonth(12)
        setZimYear(zimYear - 1)
      } else {
        setZimMonth(zimMonth - 1)
      }
    } else {
      if (zimMonth === 12) {
        setZimMonth(1)
        setZimYear(zimYear + 1)
      } else {
        setZimMonth(zimMonth + 1)
      }
    }
  }
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Lade Daten...</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="text-gray-500 hover:text-gray-700">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Berichte</h1>
                <p className="text-sm text-gray-500">{company?.name}</p>
              </div>
            </div>
          </div>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Fehler/Erfolg Meldungen */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <svg className="w-5 h-5 text-red-400 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className="text-red-700">{error}</p>
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
            </div>
          </div>
        )}
        
        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-sm border mb-6">
          <div className="border-b">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('fzul')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
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
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
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
                onClick={() => setActiveTab('uebersicht')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
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
        
        {/* Tab Content: FZul */}
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
                    Jahr <span className="text-red-500">*</span>
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
                    Mitarbeiter <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedEmployee}
                    onChange={(e) => setSelectedEmployee(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Bitte wählen...</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.last_name}, {emp.first_name}
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
                    <option value="">Alle Projekte</option>
                    {projects.map(proj => (
                      <option key={proj.id} value={proj.id}>
                        {proj.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Optional: Nur Stunden eines bestimmten Projekts exportieren
                  </p>
                </div>
                
                {/* Monate FuE */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Monate mit FuE-Tätigkeit
                  </label>
                  <select
                    value={monateFue}
                    onChange={(e) => setMonateFue(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                      <option key={m} value={m}>{m} {m === 1 ? 'Monat' : 'Monate'}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              {/* Rechte Spalte */}
              <div className="space-y-4">
                {/* Kurzbezeichnung Vorhaben */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kurzbezeichnung des Vorhabens
                  </label>
                  <input
                    type="text"
                    value={kurzbezeichnungVorhaben}
                    onChange={(e) => setKurzbezeichnungVorhaben(e.target.value)}
                    placeholder="z.B. KI-basierte Prozessoptimierung"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                {/* Vorhaben-ID */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vorhaben-ID / Förderkennzeichen
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
                
                {/* Info Box */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-blue-800 mb-2">ℹ️ Hinweis</h4>
                  <p className="text-xs text-blue-700">
                    Der Export erstellt einen Stundennachweis im BMF-konformen Format für die Forschungszulage. 
                    Das PDF enthält eine Jahresübersicht mit allen 12 Monaten, automatisch berechneten 
                    Arbeitsstunden und den erforderlichen Unterschriftsfeldern.
                  </p>
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
        
        {/* Tab Content: ZIM */}
        {activeTab === 'zim' && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900">ZIM Stundennachweis exportieren</h2>
              <p className="text-sm text-gray-500 mt-1">
                Monatlicher Stundennachweis für ZIM-Förderprojekte und andere Förderprogramme mit Förderkennzeichen.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Linke Spalte */}
              <div className="space-y-4">
                {/* Mitarbeiter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mitarbeiter <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={zimEmployee}
                    onChange={(e) => setZimEmployee(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Bitte wählen...</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.last_name}, {emp.first_name}
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Projekt */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Förderprojekt <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={zimProject}
                    onChange={(e) => setZimProject(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Bitte wählen...</option>
                    {fundedProjects.length > 0 ? (
                      fundedProjects.map(proj => (
                        <option key={proj.id} value={proj.id}>
                          {proj.name} ({proj.funding_reference})
                        </option>
                      ))
                    ) : (
                      <option value="" disabled>Keine Projekte mit Förderkennzeichen vorhanden</option>
                    )}
                  </select>
                  {fundedProjects.length === 0 && (
                    <p className="text-xs text-amber-600 mt-1">
                      ⚠️ Es sind keine Projekte mit Förderkennzeichen vorhanden. 
                      Bitte fügen Sie ein Förderkennzeichen zu einem Projekt hinzu.
                    </p>
                  )}
                </div>
              </div>
              
              {/* Rechte Spalte */}
              <div className="space-y-4">
                {/* Monat/Jahr Auswahl */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Berichtszeitraum <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => navigateMonth('prev')}
                      className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                      title="Vorheriger Monat"
                    >
                      <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    
                    <select
                      value={zimMonth}
                      onChange={(e) => setZimMonth(Number(e.target.value))}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {months.map(m => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                    
                    <select
                      value={zimYear}
                      onChange={(e) => setZimYear(Number(e.target.value))}
                      className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {years.map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                    
                    <button
                      onClick={() => navigateMonth('next')}
                      className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                      title="Nächster Monat"
                    >
                      <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                {/* Info Box */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-blue-800 mb-2">ℹ️ Hinweis</h4>
                  <p className="text-xs text-blue-700">
                    Der Stundennachweis enthält alle erfassten Arbeitspakete des Mitarbeiters für das 
                    gewählte Projekt im Berichtsmonat. Urlaubs- und Krankheitstage sowie Feiertage 
                    werden automatisch berücksichtigt.
                  </p>
                </div>
                
                {/* Projekt-Info wenn ausgewählt */}
                {zimProject && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-800 mb-2">Ausgewähltes Projekt</h4>
                    {(() => {
                      const proj = fundedProjects.find(p => p.id === zimProject)
                      return proj ? (
                        <div className="text-xs text-gray-600 space-y-1">
                          <p><span className="font-medium">Name:</span> {proj.name}</p>
                          <p><span className="font-medium">Förderkennzeichen:</span> {proj.funding_reference}</p>
                        </div>
                      ) : null
                    })()}
                  </div>
                )}
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
        
        {/* Tab Content: Übersicht */}
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