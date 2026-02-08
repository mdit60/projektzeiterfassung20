// src/app/v7/import/page.tsx
// V7 Import-Seite mit Tabs: ZIM-PDF, Stundennachweis, Manuell
'use client'

import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { 
  ZimAntrag, 
  ZimProjekt, 
  ZimAntragsteller, 
  ZimMitarbeiter,
  ParseResult 
} from '@/lib/parsers/zim-pdf-types'
import { QUALIFIKATIONSGRUPPEN, BUNDESLAENDER } from '@/lib/parsers/zim-pdf-types'

// ============================================
// TYPES
// ============================================

type Tab = 'zim-pdf' | 'stundennachweis' | 'manuell'

interface ImportState {
  loading: boolean
  error: string
  success: string
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
  // ZIM PDF IMPORT
  // ============================================

  const handleJsonUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setState({ loading: true, error: '', success: '' })

    try {
      const text = await file.text()
      const data = JSON.parse(text) as ZimAntrag

      // Validierung
      if (!data.projekt || !data.antragsteller || !data.mitarbeiter) {
        throw new Error('Ungültiges JSON-Format. Erwarte: projekt, antragsteller, mitarbeiter')
      }

      setParsedData(data)
      setState({ loading: false, error: '', success: 'JSON erfolgreich geladen!' })
    } catch (err) {
      const error = err as Error
      setState({ loading: false, error: error.message, success: '' })
    }
  }, [])

  const handlePdfUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setSelectedFile(file)
    setState({ loading: false, error: '', success: '' })

    // Info: PDF muss mit Python-Skript lokal geparst werden
    setState({
      loading: false,
      error: '',
      success: `PDF "${file.name}" ausgewählt. Bitte mit Python-Skript parsen und JSON hochladen.`
    })
  }, [])

  const handleImportToDatabase = useCallback(async () => {
    if (!parsedData) return

    setState({ loading: true, error: '', success: '' })

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Nicht angemeldet')

      // 1. Prüfe ob Firma bereits existiert
      const { data: existingCompany } = await supabase
        .from('v7_client_companies')
        .select('id')
        .eq('name', parsedData.antragsteller.firma)
        .single()

      let companyId: string

      if (existingCompany) {
        companyId = existingCompany.id
      } else {
        // 2. Firma anlegen
        const { data: newCompany, error: companyError } = await supabase
          .from('v7_client_companies')
          .insert({
            consultant_id: user.id,
            name: parsedData.antragsteller.firma,
            legal_form: parsedData.antragsteller.rechtsform,
            street: parsedData.antragsteller.strasse,
            postal_code: parsedData.antragsteller.plz,
            city: parsedData.antragsteller.ort,
            federal_state: extractBundeslandCode(parsedData.antragsteller.bundesland),
            website: parsedData.antragsteller.website,
            contact_name: parsedData.antragsteller.ansprechpartner_name,
            contact_email: parsedData.antragsteller.ansprechpartner_email,
            contact_phone: parsedData.antragsteller.ansprechpartner_telefon,
          })
          .select('id')
          .single()

        if (companyError) throw companyError
        companyId = newCompany.id
      }

      // 3. Projekt anlegen
      const { data: newProject, error: projectError } = await supabase
        .from('v7_projects')
        .insert({
          company_id: companyId,
          name: parsedData.projekt.name,
          short_name: parsedData.projekt.kurzname,
          funding_reference: parsedData.projekt.fkz,
          funding_format: 'ZIM',
          start_date: parsedData.projekt.start,
          end_date: parsedData.projekt.ende,
          funding_rate: parsedData.projekt.foerderquote,
          total_budget: parsedData.projekt.gesamtkosten,
          funding_amount: parsedData.projekt.zuwendung,
          total_person_months: parsedData.projekt.gesamt_pm,
          is_active: true,
        })
        .select('id')
        .single()

      if (projectError) throw projectError

      // 4. Mitarbeiter anlegen
      for (const ma of parsedData.mitarbeiter) {
        // Prüfe ob MA bereits existiert
        const displayName = `${ma.nachname}, ${ma.vorname}`
        const { data: existingEmployee } = await supabase
          .from('v7_employees')
          .select('id')
          .eq('company_id', companyId)
          .eq('display_name', displayName)
          .single()

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
              email: '', // Aus PDF nicht verfügbar
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

        // 5. MA-Projekt-Zuordnung
        await supabase
          .from('v7_project_employees')
          .upsert({
            project_id: newProject.id,
            employee_id: employeeId,
            planned_person_months: ma.pm_gesamt,
            planned_costs: ma.kosten_gesamt,
          }, {
            onConflict: 'project_id,employee_id'
          })
      }

      setState({
        loading: false,
        error: '',
        success: `Import erfolgreich! Firma "${parsedData.antragsteller.firma}", Projekt "${parsedData.projekt.kurzname}" und ${parsedData.mitarbeiter.length} Mitarbeiter angelegt.`
      })

      // Reset nach Erfolg
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
    // "SH Schleswig-Holstein" -> "DE-SH"
    const match = bundesland.match(/^([A-Z]{2})\s/)
    if (match) {
      return `DE-${match[1]}`
    }
    // Fallback: Suche nach Bundesland-Name
    for (const [code, name] of Object.entries(BUNDESLAENDER)) {
      if (bundesland.includes(name)) {
        return `DE-${code}`
      }
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
              <p className="text-sm text-gray-500">Projekte und Stundenerfassungen importieren</p>
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
              { id: 'zim-pdf', label: '📄 ZIM-Projektantrag', desc: 'PDF/JSON Import' },
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
            {state.error}
          </div>
        )}
        {state.success && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            {state.success}
          </div>
        )}

        {/* TAB: ZIM-PDF */}
        {activeTab === 'zim-pdf' && (
          <div className="space-y-6">
            {/* Info-Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 mb-2">📋 ZIM-Förderantrag importieren</h3>
              <p className="text-sm text-blue-700 mb-3">
                Importiere Projektdaten, Mitarbeiter und Personalkosten aus einem ZIM-Förderantrag.
              </p>
              <div className="text-sm text-blue-600 space-y-1">
                <p><strong>Option 1:</strong> JSON-Datei hochladen (vom Python-Parser erstellt)</p>
                <p><strong>Option 2:</strong> PDF hochladen und lokal mit Python parsen</p>
              </div>
            </div>

            {/* Upload-Bereiche */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* JSON Upload */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="font-medium text-gray-900 mb-4 flex items-center">
                  <span className="text-green-500 mr-2">✅</span>
                  JSON hochladen (empfohlen)
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  Lade eine JSON-Datei hoch, die mit dem Python-Parser erstellt wurde.
                </p>
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
                  className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors"
                >
                  {state.loading ? 'Lädt...' : 'JSON-Datei auswählen'}
                </button>
                <div className="mt-4 p-3 bg-gray-50 rounded text-xs text-gray-600 font-mono">
                  <p className="font-semibold mb-1">Python-Parser Befehl:</p>
                  <code>python scripts/zim-pdf-parser.py antrag.pdf -o json -s output.json</code>
                </div>
              </div>

              {/* PDF Upload (Info) */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="font-medium text-gray-900 mb-4 flex items-center">
                  <span className="text-amber-500 mr-2">⚠️</span>
                  PDF hochladen (lokal parsen)
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  ZIM-PDFs verwenden XFA-Format, das nicht im Browser geparst werden kann.
                  Nutze den Python-Parser lokal.
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
                  className="w-full px-4 py-3 bg-amber-100 text-amber-800 rounded-lg hover:bg-amber-200 transition-colors"
                >
                  PDF auswählen (nur Vorschau)
                </button>
                {selectedFile && (
                  <p className="mt-2 text-sm text-gray-600">
                    Ausgewählt: {selectedFile.name}
                  </p>
                )}
              </div>
            </div>

            {/* Parsed Data Preview */}
            {parsedData && (
              <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-4">
                  <h3 className="font-bold text-lg">Vorschau: {parsedData.projekt.kurzname}</h3>
                  <p className="text-blue-100 text-sm">FKZ: {parsedData.projekt.fkz}</p>
                </div>

                <div className="p-6 space-y-6">
                  {/* Projekt */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                      <span className="mr-2">📋</span> Projekt
                    </h4>
                    <div className="grid md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Name:</span>
                        <p className="font-medium">{parsedData.projekt.name}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Laufzeit:</span>
                        <p className="font-medium">
                          {formatDate(parsedData.projekt.start)} - {formatDate(parsedData.projekt.ende)}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500">Förderquote:</span>
                        <p className="font-medium">{parsedData.projekt.foerderquote}%</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Gesamtkosten:</span>
                        <p className="font-medium">{formatCurrency(parsedData.projekt.gesamtkosten)}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Zuwendung:</span>
                        <p className="font-medium text-green-600">{formatCurrency(parsedData.projekt.zuwendung)}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Personenmonate:</span>
                        <p className="font-medium">{parsedData.projekt.gesamt_pm.toFixed(1)} PM</p>
                      </div>
                    </div>
                  </div>

                  {/* Antragsteller */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                      <span className="mr-2">🏢</span> Antragsteller
                    </h4>
                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Firma:</span>
                        <p className="font-medium">
                          {parsedData.antragsteller.firma} ({parsedData.antragsteller.rechtsform})
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500">Adresse:</span>
                        <p className="font-medium">
                          {parsedData.antragsteller.strasse}, {parsedData.antragsteller.plz} {parsedData.antragsteller.ort}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500">Ansprechpartner:</span>
                        <p className="font-medium">{parsedData.antragsteller.ansprechpartner_name}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">E-Mail:</span>
                        <p className="font-medium">{parsedData.antragsteller.ansprechpartner_email}</p>
                      </div>
                    </div>
                  </div>

                  {/* Mitarbeiter */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                      <span className="mr-2">👥</span> Mitarbeiter ({parsedData.mitarbeiter.length})
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead className="bg-gray-50">
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
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">
                                  Grp {ma.qualifikation_gruppe}
                                </span>
                                <span className="ml-2 text-gray-500">{ma.qualifikation}</span>
                              </td>
                              <td className="px-3 py-2 text-right">{ma.stundensatz.toFixed(2)} €</td>
                              <td className="px-3 py-2 text-right">{ma.pm_gesamt.toFixed(1)}</td>
                              <td className="px-3 py-2 text-right">{formatCurrency(ma.kosten_gesamt)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-gray-100">
                          <tr>
                            <td colSpan={4} className="px-3 py-2 font-medium">Gesamt</td>
                            <td className="px-3 py-2 text-right font-bold">
                              {parsedData.mitarbeiter.reduce((sum, ma) => sum + ma.pm_gesamt, 0).toFixed(1)}
                            </td>
                            <td className="px-3 py-2 text-right font-bold">
                              {formatCurrency(parsedData.mitarbeiter.reduce((sum, ma) => sum + ma.kosten_gesamt, 0))}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>

                  {/* Import Button */}
                  <div className="flex justify-end pt-4 border-t">
                    <button
                      onClick={handleImportToDatabase}
                      disabled={state.loading}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium transition-colors"
                    >
                      {state.loading ? (
                        <span className="flex items-center">
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Importiere...
                        </span>
                      ) : (
                        '🚀 In Datenbank importieren'
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
              Importiere Stundenerfassungen aus Excel-Dateien (wie in V6).
            </p>
            <div className="bg-gray-50 rounded-lg p-8 text-center">
              <span className="text-4xl mb-4 block">🚧</span>
              <p className="text-gray-600">Wird in Phase 2 implementiert</p>
              <p className="text-sm text-gray-400 mt-2">
                Verwendet den bestehenden ZIM-Excel-Parser aus V6
              </p>
            </div>
          </div>
        )}

        {/* TAB: Manuell */}
        {activeTab === 'manuell' && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="font-medium text-gray-900 mb-4">✏️ Manuelle Eingabe</h3>
            <p className="text-gray-500 mb-6">
              Lege Firmen, Projekte und Mitarbeiter manuell an (für BMBF/KMU-Innovativ).
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
                <span className="block text-xs text-gray-400 mt-1">Wähle zuerst eine Firma</span>
              </button>
              <button
                onClick={() => router.push('/v7')}
                className="p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-400 hover:bg-purple-50 transition-colors text-center"
              >
                <span className="text-3xl mb-2 block">👤</span>
                <span className="font-medium text-gray-900">Neuer Mitarbeiter</span>
                <span className="block text-xs text-gray-400 mt-1">Wähle zuerst eine Firma</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}