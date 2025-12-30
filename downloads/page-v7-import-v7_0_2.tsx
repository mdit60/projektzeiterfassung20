// src/app/v7/import/page.tsx
// V7 Import-Seite - VERSION 7.0.2
// DATUM: 30. Dezember 2024
// NEU: Arbeitspakete, Budget, AP-MA-Zuordnungen
'use client'

import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// ============================================
// TYPES
// ============================================

interface ZimProjekt {
  name: string
  kurzname: string
  fkz: string
  start: string
  ende: string
  foerderquote: number
  gesamtkosten: number
  zuwendung: number
  gesamt_pm: number
  gesamt_pk: number
  laufzeit_monate: number
}

interface ZimAntragsteller {
  firma: string
  rechtsform: string
  strasse: string
  plz: string
  ort: string
  bundesland: string
  website: string
  ansprechpartner_name: string
  ansprechpartner_funktion: string
  ansprechpartner_telefon: string
  ansprechpartner_email: string
}

interface ZimMitarbeiter {
  ma_nr: number
  nachname: string
  vorname: string
  qualifikation: string
  qualifikation_gruppe: number
  geburtsdatum: string
  funktion: string
  angestellt_seit: string
  jahresbrutto: number
  stundensatz: number
  wochenstunden: number
  teilzeitfaktor: number
  pm_gesamt: number
  kosten_gesamt: number
  pm_pro_jahr: Record<number, number>
}

interface ZimArbeitspaket {
  ap_nummer: number
  ap_code: string
  name: string
  start_monat: number | null
  ende_monat: number | null
  gesamt_pm: number
  mitarbeiter_zuordnungen: Array<{
    ma_nr: number
    pm: number
  }>
}

interface ZimBudget {
  gesamtkosten: number
  personalkosten: number
  materialkosten: number
  fremdleistungen: number
  gemeinkosten: number
  foerderquote: number
  foerdersumme: number
  eigenanteil: number
  laufzeit_monate: number
  gesamt_pm: number
}

interface ZimAntrag {
  projekt: ZimProjekt
  antragsteller: ZimAntragsteller
  budget: ZimBudget
  mitarbeiter: ZimMitarbeiter[]
  arbeitspakete: ZimArbeitspaket[]
  parse_datum: string
  quell_datei: string
  statistik: {
    anzahl_mitarbeiter: number
    anzahl_arbeitspakete: number
    gesamt_pm: number
    gesamt_pk: number
    laufzeit_monate: number
  }
}

type Tab = 'zim-pdf' | 'stundennachweis' | 'manuell'

interface ImportState {
  loading: boolean
  error: string
  success: string
}

// Bundesländer-Mapping
const BUNDESLAENDER: Record<string, string> = {
  'BW': 'Baden-Württemberg',
  'BY': 'Bayern',
  'BE': 'Berlin',
  'BB': 'Brandenburg',
  'HB': 'Bremen',
  'HH': 'Hamburg',
  'HE': 'Hessen',
  'MV': 'Mecklenburg-Vorpommern',
  'NI': 'Niedersachsen',
  'NW': 'Nordrhein-Westfalen',
  'RP': 'Rheinland-Pfalz',
  'SL': 'Saarland',
  'SN': 'Sachsen',
  'ST': 'Sachsen-Anhalt',
  'SH': 'Schleswig-Holstein',
  'TH': 'Thüringen',
}

// ============================================
// HELPER FUNCTIONS
// ============================================

// Bundesland-Code extrahieren (z.B. "Schleswig-Holstein" -> "DE-SH")
function extractBundeslandCode(bundesland: string): string {
  if (!bundesland) return 'DE-XX'
  
  const mapping: Record<string, string> = {
    'baden-württemberg': 'DE-BW',
    'bayern': 'DE-BY',
    'berlin': 'DE-BE',
    'brandenburg': 'DE-BB',
    'bremen': 'DE-HB',
    'hamburg': 'DE-HH',
    'hessen': 'DE-HE',
    'mecklenburg-vorpommern': 'DE-MV',
    'niedersachsen': 'DE-NI',
    'nordrhein-westfalen': 'DE-NW',
    'rheinland-pfalz': 'DE-RP',
    'saarland': 'DE-SL',
    'sachsen': 'DE-SN',
    'sachsen-anhalt': 'DE-ST',
    'schleswig-holstein': 'DE-SH',
    'thüringen': 'DE-TH',
  }
  
  const normalized = bundesland.toLowerCase().trim()
  return mapping[normalized] || `DE-${bundesland.substring(0, 2).toUpperCase()}`
}

// Deutsches Datum zu ISO konvertieren
function parseGermanDate(dateStr: string): string | null {
  if (!dateStr) return null
  
  // Format: DD.MM.YYYY -> YYYY-MM-DD
  const match = dateStr.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
  if (match) {
    const [, day, month, year] = match
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }
  
  // Falls bereits ISO-Format
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return dateStr
  }
  
  return null
}

// Datum formatieren für Anzeige
function formatDate(dateStr: string): string {
  if (!dateStr) return '-'
  // Falls ISO-Format, zu deutschem Format
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [year, month, day] = dateStr.split('-')
    return `${day}.${month}.${year}`
  }
  return dateStr
}

// Währung formatieren
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('de-DE', { 
    style: 'currency', 
    currency: 'EUR' 
  }).format(value)
}

// ============================================
// COMPONENT
// ============================================

export default function V7ImportPage() {
  const router = useRouter()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const jsonInputRef = useRef<HTMLInputElement>(null)

  // State
  const [activeTab, setActiveTab] = useState<Tab>('zim-pdf')
  const [state, setState] = useState<ImportState>({ loading: false, error: '', success: '' })
  
  // ZIM-PDF State
  const [parsedData, setParsedData] = useState<ZimAntrag | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  // ============================================
  // PDF UPLOAD - ruft /api/parse-zim auf
  // ============================================

  const handlePdfUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setSelectedFile(file)
    setState({ loading: true, error: '', success: '' })
    setParsedData(null)

    try {
      // PDF an Server-API senden
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/parse-zim', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Parsing fehlgeschlagen')
      }

      setParsedData(result.data)
      setState({ 
        loading: false, 
        error: '', 
        success: `PDF "${file.name}" erfolgreich analysiert!` 
      })
    } catch (err) {
      const error = err as Error
      setState({ 
        loading: false, 
        error: `PDF-Analyse fehlgeschlagen: ${error.message}`, 
        success: '' 
      })
    }
  }, [])

  // ============================================
  // JSON UPLOAD (Fallback)
  // ============================================

  const handleJsonUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setState({ loading: true, error: '', success: '' })

    try {
      const text = await file.text()
      const data = JSON.parse(text) as ZimAntrag

      if (!data.projekt || !data.antragsteller || !data.mitarbeiter) {
        throw new Error('Ungültiges JSON-Format')
      }

      setParsedData(data)
      setState({ loading: false, error: '', success: 'JSON erfolgreich geladen!' })
    } catch (err) {
      const error = err as Error
      setState({ loading: false, error: error.message, success: '' })
    }
  }, [])

  // ============================================
  // IMPORT IN DATENBANK - VERSION 7.0.2
  // Mit Arbeitspaketen, Budget und AP-MA-Zuordnungen
  // ============================================

  const handleImportToDatabase = useCallback(async () => {
    if (!parsedData) return

    setState({ loading: true, error: '', success: '' })

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Nicht angemeldet')

      // Hole consultant_company_id aus v7_user_profiles
      const { data: userProfile, error: profileError } = await supabase
        .from('v7_user_profiles')
        .select('consultant_company_id')
        .eq('email', user.email)
        .maybeSingle()

      if (profileError) {
        console.error('Profil-Fehler:', profileError)
        throw new Error('Fehler beim Laden des Benutzerprofils')
      }

      if (!userProfile?.consultant_company_id) {
        throw new Error('Kein Berater-Unternehmen zugeordnet. Bitte Administrator kontaktieren.')
      }

      const consultantCompanyId = userProfile.consultant_company_id
      const quellDatei = parsedData.quell_datei || 'Unbekannt'

      // ============================================
      // 1. FIRMA prüfen/anlegen (v7_client_companies)
      // ============================================
      
      const { data: existingCompany } = await supabase
        .from('v7_client_companies')
        .select('id')
        .eq('name', parsedData.antragsteller.firma)
        .eq('consultant_company_id', consultantCompanyId)
        .maybeSingle()

      let companyId: string

      if (existingCompany) {
        companyId = existingCompany.id
        console.log('Bestehende Firma gefunden:', companyId)
      } else {
        const { data: newCompany, error: companyError } = await supabase
          .from('v7_client_companies')
          .insert({
            consultant_company_id: consultantCompanyId,
            name: parsedData.antragsteller.firma,
            short_name: parsedData.projekt.kurzname || null,
            street: parsedData.antragsteller.strasse || null,
            zip_code: parsedData.antragsteller.plz || null,
            city: parsedData.antragsteller.ort || null,
            federal_state: extractBundeslandCode(parsedData.antragsteller.bundesland),
            contact_person: parsedData.antragsteller.ansprechpartner_name || null,
            contact_email: parsedData.antragsteller.ansprechpartner_email || null,
            contact_phone: parsedData.antragsteller.ansprechpartner_telefon || null,
            is_active: true,
          })
          .select('id')
          .single()

        if (companyError) {
          console.error('Firma-Fehler:', companyError)
          throw new Error(`Firma konnte nicht angelegt werden: ${companyError.message}`)
        }
        companyId = newCompany.id
        console.log('Neue Firma angelegt:', companyId)
      }

      // ============================================
      // 2. PROJEKT prüfen/anlegen (v7_projects)
      // ============================================
      
      const { data: existingProject } = await supabase
        .from('v7_projects')
        .select('id')
        .eq('client_company_id', companyId)
        .eq('funding_reference', parsedData.projekt.fkz)
        .maybeSingle()

      let projectId: string

      if (existingProject) {
        projectId = existingProject.id
        console.log('Bestehendes Projekt gefunden:', projectId)
      } else {
        const { data: newProject, error: projectError } = await supabase
          .from('v7_projects')
          .insert({
            client_company_id: companyId,
            name: parsedData.projekt.name,
            short_name: parsedData.projekt.kurzname || null,
            funding_reference: parsedData.projekt.fkz || null,
            funding_format: 'ZIM',
            start_date: parseGermanDate(parsedData.projekt.start),
            end_date: parseGermanDate(parsedData.projekt.ende),
            source_filename: quellDatei,
            imported_at: new Date().toISOString(),
            notes: `Laufzeit: ${parsedData.projekt.laufzeit_monate} Monate`,
            is_active: true,
          })
          .select('id')
          .single()

        if (projectError) {
          console.error('Projekt-Fehler:', projectError)
          throw new Error(`Projekt konnte nicht angelegt werden: ${projectError.message}`)
        }
        projectId = newProject.id
        console.log('Neues Projekt angelegt:', projectId)
      }

      // ============================================
      // 3. BUDGET anlegen (v7_project_budget)
      // ============================================
      
      if (parsedData.budget) {
        const { error: budgetError } = await supabase
          .from('v7_project_budget')
          .upsert({
            project_id: projectId,
            total_costs: parsedData.budget.gesamtkosten,
            personnel_costs: parsedData.budget.personalkosten,
            material_costs: parsedData.budget.materialkosten,
            subcontract_costs: parsedData.budget.fremdleistungen,
            overhead_costs: parsedData.budget.gemeinkosten,
            funding_rate: parsedData.budget.foerderquote,
            funding_amount: parsedData.budget.foerdersumme,
            own_contribution: parsedData.budget.eigenanteil,
            duration_months: parsedData.budget.laufzeit_monate,
            total_person_months: parsedData.budget.gesamt_pm,
            source_filename: quellDatei,
            imported_at: new Date().toISOString(),
          }, {
            onConflict: 'project_id'
          })

        if (budgetError) {
          console.warn('Budget-Warnung:', budgetError.message)
        } else {
          console.log('Budget gespeichert')
        }
      }

      // ============================================
      // 4. MITARBEITER anlegen (v7_employees)
      // ============================================
      
      // Map: ma_nr -> employee_id (für AP-Zuordnungen)
      const maIdMap: Map<number, string> = new Map()
      let importedEmployees = 0
      let assignedEmployees = 0

      for (const ma of parsedData.mitarbeiter) {
        const displayName = `${ma.nachname}, ${ma.vorname}`
        
        const { data: existingEmployee } = await supabase
          .from('v7_employees')
          .select('id')
          .eq('client_company_id', companyId)
          .eq('display_name', displayName)
          .maybeSingle()

        let employeeId: string

        if (existingEmployee) {
          employeeId = existingEmployee.id
          console.log('Bestehender MA gefunden:', displayName)
        } else {
          const { data: newEmployee, error: employeeError } = await supabase
            .from('v7_employees')
            .insert({
              client_company_id: companyId,
              first_name: ma.vorname,
              last_name: ma.nachname,
              display_name: displayName,
              name: `${ma.vorname} ${ma.nachname}`,
              email: null,
              qualification: ma.qualifikation || null,
              position_title: ma.funktion || null,
              position: ma.funktion || null,
              employment_start: parseGermanDate(ma.angestellt_seit),
              entry_date: parseGermanDate(ma.angestellt_seit),
              weekly_hours: ma.wochenstunden || 40,
              annual_leave_days: 30,
              notes: `Qual.Grp: ${ma.qualifikation_gruppe}, Stundensatz: ${ma.stundensatz}€`,
              is_active: true,
            })
            .select('id')
            .single()

          if (employeeError) {
            console.error('Mitarbeiter-Fehler:', employeeError, 'für', displayName)
            continue
          }
          employeeId = newEmployee.id
          importedEmployees++
          console.log('Neuer MA angelegt:', displayName)
        }

        // MA-Nr zu ID mappen
        maIdMap.set(ma.ma_nr, employeeId)

        // MA-Projekt-Zuordnung (v7_project_assignments)
        const { error: assignError } = await supabase
          .from('v7_project_assignments')
          .upsert({
            project_id: projectId,
            employee_id: employeeId,
            role_in_project: ma.funktion || 'Projektmitarbeiter',
            fue_percentage: 100.00,
            assignment_start: parseGermanDate(parsedData.projekt.start),
            assignment_end: parseGermanDate(parsedData.projekt.ende),
            is_active: true,
          }, {
            onConflict: 'project_id,employee_id'
          })

        if (assignError) {
          console.warn('Zuordnung-Warnung:', assignError.message)
        } else {
          assignedEmployees++
        }
      }

      // ============================================
      // 5. ARBEITSPAKETE anlegen (v7_work_packages)
      // ============================================
      
      let importedWorkPackages = 0
      let importedWpAssignments = 0

      const arbeitspaketeArray = parsedData.arbeitspakete || []
      
      for (const ap of arbeitspaketeArray) {
        // Arbeitspaket anlegen oder finden
        const { data: existingWp } = await supabase
          .from('v7_work_packages')
          .select('id')
          .eq('project_id', projectId)
          .eq('ap_number', ap.ap_nummer)
          .maybeSingle()

        let workPackageId: string

        if (existingWp) {
          workPackageId = existingWp.id
          console.log('Bestehendes AP gefunden:', ap.ap_code)
        } else {
          const { data: newWp, error: wpError } = await supabase
            .from('v7_work_packages')
            .insert({
              project_id: projectId,
              ap_number: ap.ap_nummer,
              ap_code: ap.ap_code,
              name: ap.name,
              start_month: ap.start_monat,
              end_month: ap.ende_monat,
              total_person_months: ap.gesamt_pm,
              source_filename: quellDatei,
              imported_at: new Date().toISOString(),
              is_active: true,
            })
            .select('id')
            .single()

          if (wpError) {
            console.error('AP-Fehler:', wpError, 'für', ap.ap_code)
            continue
          }
          workPackageId = newWp.id
          importedWorkPackages++
          console.log('Neues AP angelegt:', ap.ap_code, ap.name)
        }

        // ============================================
        // 6. AP-MA-ZUORDNUNGEN (v7_work_package_assignments)
        // ============================================
        
        const zuordnungen = ap.mitarbeiter_zuordnungen || []
        
        for (const zuordnung of zuordnungen) {
          const employeeId = maIdMap.get(zuordnung.ma_nr)
          
          if (!employeeId) {
            console.warn(`MA ${zuordnung.ma_nr} nicht gefunden für AP ${ap.ap_code}`)
            continue
          }

          // Stundensatz des MA finden
          const ma = parsedData.mitarbeiter.find(m => m.ma_nr === zuordnung.ma_nr)
          const stundensatz = ma?.stundensatz || 0

          const { error: wpaError } = await supabase
            .from('v7_work_package_assignments')
            .upsert({
              work_package_id: workPackageId,
              employee_id: employeeId,
              planned_person_months: zuordnung.pm,
              planned_hours: zuordnung.pm * 140, // 1 PM = 140 Stunden
              hourly_rate: stundensatz,
              planned_costs: zuordnung.pm * 140 * stundensatz,
              source_filename: quellDatei,
              imported_at: new Date().toISOString(),
              is_active: true,
            }, {
              onConflict: 'work_package_id,employee_id'
            })

          if (wpaError) {
            console.warn('AP-Zuordnung-Warnung:', wpaError.message)
          } else {
            importedWpAssignments++
          }
        }
      }

      // ============================================
      // ERFOLG
      // ============================================
      
      setState({
        loading: false,
        error: '',
        success: `✅ Import erfolgreich!\n` +
          `• Firma: "${parsedData.antragsteller.firma}"\n` +
          `• Projekt: "${parsedData.projekt.kurzname || parsedData.projekt.name}" (${parsedData.projekt.fkz})\n` +
          `• ${importedEmployees} neue Mitarbeiter, ${assignedEmployees} Projektzuordnungen\n` +
          `• ${importedWorkPackages} Arbeitspakete, ${importedWpAssignments} AP-Zuordnungen`
      })

      // Reset nach 10 Sekunden
      setTimeout(() => {
        setParsedData(null)
        setSelectedFile(null)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      }, 10000)

    } catch (err) {
      const error = err as Error
      console.error('Import-Fehler:', error)
      setState({ loading: false, error: `Import fehlgeschlagen: ${error.message}`, success: '' })
    }
  }, [parsedData, supabase])

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">V7 Import</h1>
              <p className="text-sm text-gray-500">Projekte, Firmen und Mitarbeiter importieren</p>
            </div>
            <button
              onClick={() => router.push('/v7')}
              className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              ← Zurück zur Übersicht
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        
        {/* Status Messages */}
        {state.error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 whitespace-pre-line">{state.error}</p>
          </div>
        )}
        {state.success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-700 whitespace-pre-line">{state.success}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6">
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
            <button
              onClick={() => setActiveTab('zim-pdf')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'zim-pdf'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              📄 ZIM-Antrag (PDF)
            </button>
            <button
              onClick={() => setActiveTab('stundennachweis')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'stundennachweis'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              📊 Stundennachweis
            </button>
            <button
              onClick={() => setActiveTab('manuell')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'manuell'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              ✏️ Manuell
            </button>
          </div>
        </div>

        {/* TAB: ZIM-PDF */}
        {activeTab === 'zim-pdf' && (
          <div className="space-y-6">
            {/* Upload Area */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="font-medium text-gray-900 mb-4">📄 ZIM-Förderantrag hochladen</h3>
              <p className="text-gray-500 mb-6">
                Laden Sie einen ausgefüllten ZIM-Förderantrag (PDF) hoch. Das System extrahiert automatisch:
                Projektdaten, Antragsteller, Mitarbeiter, Budget und <strong>Arbeitspakete mit MA-Zuordnungen</strong>.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                {/* PDF Upload */}
                <label className="flex-1 cursor-pointer">
                  <div className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    state.loading ? 'bg-gray-50 border-gray-300' : 'border-blue-300 hover:border-blue-400 hover:bg-blue-50'
                  }`}>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf"
                      onChange={handlePdfUpload}
                      disabled={state.loading}
                      className="hidden"
                    />
                    <span className="text-4xl mb-2 block">📄</span>
                    <p className="font-medium text-gray-900">
                      {state.loading ? 'Analysiere...' : 'PDF hochladen'}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {selectedFile ? selectedFile.name : 'ZIM-Antrag (ausgefüllt)'}
                    </p>
                  </div>
                </label>

                {/* JSON Upload (Fallback) */}
                <label className="flex-1 cursor-pointer">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 hover:bg-gray-50 transition-colors">
                    <input
                      ref={jsonInputRef}
                      type="file"
                      accept=".json"
                      onChange={handleJsonUpload}
                      disabled={state.loading}
                      className="hidden"
                    />
                    <span className="text-4xl mb-2 block">📋</span>
                    <p className="font-medium text-gray-900">JSON laden</p>
                    <p className="text-sm text-gray-500 mt-1">Bereits extrahierte Daten</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Parsed Data Preview */}
            {parsedData && (
              <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-4">
                  <h3 className="font-bold text-lg">
                    Vorschau: {parsedData.projekt.kurzname || parsedData.projekt.name}
                  </h3>
                  <p className="text-blue-100 text-sm">
                    FKZ: {parsedData.projekt.fkz || '-'} | 
                    {parsedData.statistik?.anzahl_mitarbeiter || parsedData.mitarbeiter.length} MA | 
                    {parsedData.statistik?.anzahl_arbeitspakete || parsedData.arbeitspakete?.length || 0} APs
                  </p>
                </div>

                <div className="p-6 space-y-6">
                  
                  {/* Projekt */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                      <span className="mr-2">📋</span> Projekt
                    </h4>
                    <div className="grid md:grid-cols-3 gap-4 text-sm bg-gray-50 p-4 rounded-lg">
                      <div>
                        <span className="text-gray-500 block">Name:</span>
                        <p className="font-medium">{parsedData.projekt.name || '-'}</p>
                      </div>
                      <div>
                        <span className="text-gray-500 block">Laufzeit:</span>
                        <p className="font-medium">
                          {formatDate(parsedData.projekt.start)} - {formatDate(parsedData.projekt.ende)}
                          {parsedData.projekt.laufzeit_monate > 0 && (
                            <span className="text-gray-500 ml-1">
                              ({parsedData.projekt.laufzeit_monate} Monate)
                            </span>
                          )}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500 block">Förderquote:</span>
                        <p className="font-medium">{parsedData.projekt.foerderquote}%</p>
                      </div>
                      <div>
                        <span className="text-gray-500 block">Gesamtkosten:</span>
                        <p className="font-medium">{formatCurrency(parsedData.projekt.gesamtkosten)}</p>
                      </div>
                      <div>
                        <span className="text-gray-500 block">Zuwendung:</span>
                        <p className="font-medium text-green-600">{formatCurrency(parsedData.projekt.zuwendung)}</p>
                      </div>
                      <div>
                        <span className="text-gray-500 block">Personenmonate:</span>
                        <p className="font-medium">{parsedData.projekt.gesamt_pm?.toFixed(1) || '0'} PM</p>
                      </div>
                    </div>
                  </div>

                  {/* Antragsteller */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                      <span className="mr-2">🏢</span> Antragsteller
                    </h4>
                    <div className="grid md:grid-cols-2 gap-4 text-sm bg-gray-50 p-4 rounded-lg">
                      <div>
                        <span className="text-gray-500 block">Firma:</span>
                        <p className="font-medium">
                          {parsedData.antragsteller.firma} 
                          {parsedData.antragsteller.rechtsform && ` (${parsedData.antragsteller.rechtsform})`}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500 block">Adresse:</span>
                        <p className="font-medium">
                          {parsedData.antragsteller.strasse}, {parsedData.antragsteller.plz} {parsedData.antragsteller.ort}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500 block">Ansprechpartner:</span>
                        <p className="font-medium">{parsedData.antragsteller.ansprechpartner_name}</p>
                      </div>
                      <div>
                        <span className="text-gray-500 block">E-Mail:</span>
                        <p className="font-medium">{parsedData.antragsteller.ansprechpartner_email}</p>
                      </div>
                    </div>
                  </div>

                  {/* Budget */}
                  {parsedData.budget && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                        <span className="mr-2">💰</span> Budget
                      </h4>
                      <div className="grid md:grid-cols-4 gap-4 text-sm bg-gray-50 p-4 rounded-lg">
                        <div>
                          <span className="text-gray-500 block">Personalkosten:</span>
                          <p className="font-medium">{formatCurrency(parsedData.budget.personalkosten)}</p>
                        </div>
                        <div>
                          <span className="text-gray-500 block">Materialkosten:</span>
                          <p className="font-medium">{formatCurrency(parsedData.budget.materialkosten)}</p>
                        </div>
                        <div>
                          <span className="text-gray-500 block">Fremdleistungen:</span>
                          <p className="font-medium">{formatCurrency(parsedData.budget.fremdleistungen)}</p>
                        </div>
                        <div>
                          <span className="text-gray-500 block">Gemeinkosten:</span>
                          <p className="font-medium">{formatCurrency(parsedData.budget.gemeinkosten)}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Mitarbeiter */}
                  {parsedData.mitarbeiter.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                        <span className="mr-2">👥</span> Mitarbeiter ({parsedData.mitarbeiter.length})
                      </h4>
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="px-3 py-2 text-left">Nr.</th>
                              <th className="px-3 py-2 text-left">Name</th>
                              <th className="px-3 py-2 text-left">Qualifikation</th>
                              <th className="px-3 py-2 text-right">Stundensatz</th>
                              <th className="px-3 py-2 text-right">PM</th>
                              <th className="px-3 py-2 text-right">Kosten</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {parsedData.mitarbeiter.map((ma) => (
                              <tr key={ma.ma_nr} className="hover:bg-gray-50">
                                <td className="px-3 py-2 font-medium">{ma.ma_nr}</td>
                                <td className="px-3 py-2">{ma.vorname} {ma.nachname}</td>
                                <td className="px-3 py-2">
                                  <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs mr-2">
                                    Grp {ma.qualifikation_gruppe}
                                  </span>
                                  {ma.qualifikation}
                                </td>
                                <td className="px-3 py-2 text-right">{ma.stundensatz?.toFixed(2) || '0.00'} €</td>
                                <td className="px-3 py-2 text-right">{ma.pm_gesamt?.toFixed(1) || '0'}</td>
                                <td className="px-3 py-2 text-right">{formatCurrency(ma.kosten_gesamt || 0)}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-gray-100 font-medium">
                            <tr>
                              <td colSpan={4} className="px-3 py-2">Gesamt</td>
                              <td className="px-3 py-2 text-right">
                                {parsedData.mitarbeiter.reduce((sum, ma) => sum + (ma.pm_gesamt || 0), 0).toFixed(1)}
                              </td>
                              <td className="px-3 py-2 text-right">
                                {formatCurrency(parsedData.mitarbeiter.reduce((sum, ma) => sum + (ma.kosten_gesamt || 0), 0))}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Arbeitspakete - NEU! */}
                  {parsedData.arbeitspakete && Array.isArray(parsedData.arbeitspakete) && parsedData.arbeitspakete.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                        <span className="mr-2">📦</span> Arbeitspakete ({parsedData.arbeitspakete.length})
                      </h4>
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="px-3 py-2 text-left">AP</th>
                              <th className="px-3 py-2 text-left">Bezeichnung</th>
                              <th className="px-3 py-2 text-center">Zeitraum (PM)</th>
                              <th className="px-3 py-2 text-right">Gesamt PM</th>
                              <th className="px-3 py-2 text-left">MA-Zuordnungen</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {parsedData.arbeitspakete.map((ap) => (
                              <tr key={ap.ap_nummer} className="hover:bg-gray-50">
                                <td className="px-3 py-2 font-medium">
                                  <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">
                                    {ap.ap_code}
                                  </span>
                                </td>
                                <td className="px-3 py-2">{ap.name}</td>
                                <td className="px-3 py-2 text-center">
                                  {ap.start_monat && ap.ende_monat 
                                    ? `M${ap.start_monat} - M${ap.ende_monat}`
                                    : '-'
                                  }
                                </td>
                                <td className="px-3 py-2 text-right font-medium">
                                  {ap.gesamt_pm?.toFixed(1) || '0'}
                                </td>
                                <td className="px-3 py-2">
                                  <div className="flex flex-wrap gap-1">
                                    {(ap.mitarbeiter_zuordnungen || []).map((z, idx) => {
                                      const ma = parsedData.mitarbeiter.find(m => m.ma_nr === z.ma_nr)
                                      return (
                                        <span 
                                          key={idx}
                                          className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs"
                                          title={ma ? `${ma.vorname} ${ma.nachname}` : `MA ${z.ma_nr}`}
                                        >
                                          MA{z.ma_nr}: {z.pm}PM
                                        </span>
                                      )
                                    })}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-gray-100 font-medium">
                            <tr>
                              <td colSpan={3} className="px-3 py-2">Gesamt</td>
                              <td className="px-3 py-2 text-right">
                                {parsedData.arbeitspakete.reduce((sum, ap) => sum + (ap.gesamt_pm || 0), 0).toFixed(1)}
                              </td>
                              <td className="px-3 py-2 text-gray-500">
                                {parsedData.arbeitspakete.reduce((sum, ap) => sum + (ap.mitarbeiter_zuordnungen?.length || 0), 0)} Zuordnungen
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Import Button */}
                  <div className="flex justify-end pt-4 border-t">
                    <button
                      onClick={handleImportToDatabase}
                      disabled={state.loading}
                      className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 font-medium text-lg transition-colors"
                    >
                      {state.loading ? (
                        <span className="flex items-center">
                          <svg className="animate-spin -ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Importiere...
                        </span>
                      ) : (
                        '✅ In Datenbank importieren'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB: Stundennachweis */}
        {activeTab === 'stundennachweis' && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="font-medium text-gray-900 mb-4">📊 Stundennachweis importieren</h3>
            <p className="text-gray-500 mb-6">
              Importiere Stundenerfassungen aus Excel-Dateien.
            </p>
            <div className="bg-gray-50 rounded-lg p-8 text-center">
              <span className="text-4xl mb-4 block">🚧</span>
              <p className="text-gray-600">Wird in Phase 2 implementiert</p>
            </div>
          </div>
        )}

        {/* TAB: Manuell */}
        {activeTab === 'manuell' && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="font-medium text-gray-900 mb-4">✏️ Manuelle Eingabe</h3>
            <p className="text-gray-500 mb-6">
              Lege Firmen, Projekte und Mitarbeiter manuell an.
            </p>
            <div className="grid md:grid-cols-3 gap-4">
              <button
                onClick={() => router.push('/v7?new=company')}
                className="p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors text-center"
              >
                <span className="text-3xl mb-2 block">🏢</span>
                <span className="font-medium text-gray-900">Neue Firma</span>
              </button>
              <button
                onClick={() => router.push('/v7')}
                className="p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-400 hover:bg-green-50 transition-colors text-center"
              >
                <span className="text-3xl mb-2 block">📁</span>
                <span className="font-medium text-gray-900">Neues Projekt</span>
              </button>
              <button
                onClick={() => router.push('/v7')}
                className="p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-400 hover:bg-purple-50 transition-colors text-center"
              >
                <span className="text-3xl mb-2 block">👤</span>
                <span className="font-medium text-gray-900">Neuer Mitarbeiter</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
