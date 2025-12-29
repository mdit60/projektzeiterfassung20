// src/app/v7/import/page.tsx
// V7 Import-Seite - PDF wird serverseitig geparst
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

interface ZimAntrag {
  projekt: ZimProjekt
  antragsteller: ZimAntragsteller
  mitarbeiter: ZimMitarbeiter[]
  arbeitspakete: Array<{
    ap_nr: string
    beschreibung: string
    von: string
    bis: string
    ma_nr: number
    pm: number
  }>
  parse_datum: string
  quell_datei: string
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
  // IMPORT IN DATENBANK
  // ============================================

  const handleImportToDatabase = useCallback(async () => {
    if (!parsedData) return

    setState({ loading: true, error: '', success: '' })

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Nicht angemeldet')

      // Hole die consultant_company_id des eingeloggten Users
      const { data: userProfile } = await supabase
        .from('v7_user_profiles')
        .select('consultant_company_id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!userProfile?.consultant_company_id) {
        throw new Error('Kein Berater-Unternehmen zugeordnet')
      }

      // 1. Firma prüfen/anlegen
      const { data: existingCompany } = await supabase
        .from('v7_client_companies')
        .select('id')
        .eq('name', parsedData.antragsteller.firma)
        .maybeSingle()

      let companyId: string

      if (existingCompany) {
        companyId = existingCompany.id
      } else {
        const { data: newCompany, error: companyError } = await supabase
          .from('v7_client_companies')
          .insert({
            consultant_company_id: userProfile.consultant_company_id,
            name: parsedData.antragsteller.firma,
            short_name: parsedData.projekt.kurzname,
            street: parsedData.antragsteller.strasse,
            zip_code: parsedData.antragsteller.plz,
            city: parsedData.antragsteller.ort,
            federal_state: extractBundeslandCode(parsedData.antragsteller.bundesland),
            contact_person: parsedData.antragsteller.ansprechpartner_name,
            contact_email: parsedData.antragsteller.ansprechpartner_email,
            contact_phone: parsedData.antragsteller.ansprechpartner_telefon,
          })
          .select('id')
          .single()

        if (companyError) throw companyError
        companyId = newCompany.id
      }

      // 2. Projekt anlegen
      const { data: newProject, error: projectError } = await supabase
        .from('v7_projects')
        .insert({
          company_id: companyId,
          name: parsedData.projekt.name,
          short_name: parsedData.projekt.kurzname,
          funding_reference: parsedData.projekt.fkz,
          funding_type: 'ZIM',
          start_date: parsedData.projekt.start,
          end_date: parsedData.projekt.ende,
          funding_rate: parsedData.projekt.foerderquote,
          total_cost: parsedData.projekt.gesamtkosten,
          funding_amount: parsedData.projekt.zuwendung,
          total_person_months: parsedData.projekt.gesamt_pm,
          is_active: true,
        })
        .select('id')
        .single()

      if (projectError) throw projectError

      // 3. Mitarbeiter anlegen
      for (const ma of parsedData.mitarbeiter) {
        const displayName = `${ma.nachname}, ${ma.vorname}`
        const { data: existingEmployee } = await supabase
          .from('v7_employees')
          .select('id')
          .eq('company_id', companyId)
          .eq('display_name', displayName)
          .maybeSingle()

        let employeeId: string

        if (existingEmployee) {
          employeeId = existingEmployee.id
        } else {
          const { data: newEmployee, error: employeeError } = await supabase
            .from('v7_employees')
            .insert({
              company_id: companyId,
              first_name: ma.vorname,
              last_name: ma.nachname,
              display_name: displayName,
              email: '',
              qualification: ma.qualifikation,
              qualification_group: ma.qualifikation_gruppe,
              birth_date: ma.geburtsdatum || null,
              position_title: ma.funktion || null,
              employment_start: ma.angestellt_seit || null,
              annual_salary: ma.jahresbrutto,
              hourly_rate: ma.stundensatz,
              weekly_hours: ma.wochenstunden,
              part_time_factor: ma.teilzeitfaktor,
            })
            .select('id')
            .single()

          if (employeeError) throw employeeError
          employeeId = newEmployee.id
        }

        // 4. MA-Projekt-Zuordnung
        await supabase
          .from('v7_project_assignments')
          .upsert({
            project_id: newProject.id,
            employee_id: employeeId,
            planned_pm: ma.pm_gesamt,
            planned_costs: ma.kosten_gesamt,
          }, {
            onConflict: 'project_id,employee_id'
          })
      }

      setState({
        loading: false,
        error: '',
        success: `Import erfolgreich! Firma "${parsedData.antragsteller.firma}", Projekt "${parsedData.projekt.kurzname}" und ${parsedData.mitarbeiter.length} Mitarbeiter importiert.`
      })

      // Reset
      setTimeout(() => {
        setParsedData(null)
        setSelectedFile(null)
      }, 3000)

    } catch (err) {
      const error = err as Error
      setState({ loading: false, error: `Import fehlgeschlagen: ${error.message}`, success: '' })
    }
  }, [parsedData, supabase])

  // ============================================
  // HELPERS
  // ============================================

  function extractBundeslandCode(bundesland: string): string {
    const match = bundesland.match(/^([A-Z]{2})\s/)
    if (match) return `DE-${match[1]}`
    for (const [code, name] of Object.entries(BUNDESLAENDER)) {
      if (bundesland.includes(name)) return `DE-${code}`
    }
    return 'DE-XX'
  }

  function formatCurrency(value: number): string {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value)
  }

  function formatDate(dateStr: string): string {
    if (!dateStr) return '-'
    try {
      return new Date(dateStr).toLocaleDateString('de-DE')
    } catch {
      return dateStr
    }
  }

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Import</h1>
              <p className="text-sm text-gray-500">Projekte und Daten importieren</p>
            </div>
            <button
              onClick={() => router.push('/v7')}
              className="px-4 py-2 text-gray-600 hover:text-gray-900"
            >
              ← Zurück
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6">
          <nav className="flex space-x-8">
            {[
              { id: 'zim-pdf', label: '📄 ZIM-Projektantrag', desc: 'PDF Import' },
              { id: 'stundennachweis', label: '📊 Stundennachweis', desc: 'Excel Import' },
              { id: 'manuell', label: '✏️ Manuell', desc: 'Direkteingabe' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as Tab)}
                className={`
                  py-4 px-1 border-b-2 font-medium text-sm transition-colors
                  ${activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <span className="block">{tab.label}</span>
                <span className="block text-xs font-normal text-gray-400">{tab.desc}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Status Messages */}
        {state.error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            ❌ {state.error}
          </div>
        )}
        {state.success && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            ✅ {state.success}
          </div>
        )}

        {/* TAB: ZIM-PDF */}
        {activeTab === 'zim-pdf' && (
          <div className="space-y-6">
            {/* Info-Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 mb-2">📋 ZIM-Förderantrag importieren</h3>
              <p className="text-sm text-blue-700 mb-3">
                Lade einen ausgefüllten ZIM-Förderantrag (PDF) hoch. Die Daten werden automatisch extrahiert.
              </p>
              <div className="text-sm text-blue-600 space-y-1">
                <p><strong>Unterstützt:</strong> Einzelprojekt, Kooperationsprojekt, Durchführbarkeitsstudie, Innovationsnetzwerk</p>
                <p><strong>Extrahiert:</strong> Projekt, Firma, Mitarbeiter (Anlage 6.1/6.2), Arbeitspakete</p>
              </div>
            </div>

            {/* Upload-Bereich */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="font-medium text-gray-900 mb-4 flex items-center">
                <span className="text-blue-500 mr-2">📄</span>
                PDF hochladen
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Wähle einen ausgefüllten ZIM-Förderantrag aus. Die Analyse erfolgt automatisch.
              </p>
              
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handlePdfUpload}
                className="hidden"
              />
              
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={state.loading}
                className="w-full px-4 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors text-lg font-medium"
              >
                {state.loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    PDF wird analysiert...
                  </span>
                ) : (
                  '📄 PDF-Datei auswählen'
                )}
              </button>
              
              {selectedFile && !state.loading && (
                <p className="mt-3 text-sm text-gray-600 text-center">
                  Ausgewählt: <strong>{selectedFile.name}</strong>
                </p>
              )}

              {/* JSON Fallback */}
              <div className="mt-6 pt-6 border-t">
                <details className="text-sm">
                  <summary className="text-gray-500 cursor-pointer hover:text-gray-700">
                    Alternative: JSON-Datei hochladen (Fallback)
                  </summary>
                  <div className="mt-3 p-4 bg-gray-50 rounded-lg">
                    <p className="text-gray-600 mb-3">
                      Falls die PDF-Analyse nicht funktioniert, kannst du das lokale Python-Skript nutzen:
                    </p>
                    <code className="block bg-gray-800 text-green-400 p-3 rounded text-xs mb-3">
                      python3 scripts/zim-pdf-parser.py antrag.pdf -o json -s output.json
                    </code>
                    <input
                      ref={jsonInputRef}
                      type="file"
                      accept=".json"
                      onChange={handleJsonUpload}
                      className="hidden"
                    />
                    <button
                      onClick={() => jsonInputRef.current?.click()}
                      disabled={state.loading}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
                    >
                      JSON-Datei auswählen
                    </button>
                  </div>
                </details>
              </div>
            </div>

            {/* Parsed Data Preview */}
            {parsedData && (
              <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-4">
                  <h3 className="font-bold text-lg">Vorschau: {parsedData.projekt.kurzname || parsedData.projekt.name}</h3>
                  <p className="text-blue-100 text-sm">FKZ: {parsedData.projekt.fkz || '-'}</p>
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
                          {parsedData.antragsteller.firma} ({parsedData.antragsteller.rechtsform})
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
