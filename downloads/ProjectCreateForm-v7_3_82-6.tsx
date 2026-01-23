// src/components/shared/ProjectCreateForm.tsx
// ============================================================================
// PZE V7 - Shared Project Create Form Component
// ============================================================================
// Datum: 21. Januar 2026
// Version: 7.3.57
//
// Wird von beiden Portalen genutzt:
// - Firmen-Portal: /v7/firma/projekte/neu
// - Berater-Portal: /v7/berater/foerderung/firma/[id]/projekt/neu
//
// Features:
// - Manuelles Formular
// - PDF-Import (ZIM-Antrag)
// - Portal-abhaengige Farben
// ============================================================================

'use client';

import React, { useState, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Save,
  AlertCircle,
  FileText,
  Edit3,
  Upload,
  CheckCircle,
  Users,
  FolderKanban,
  Building2,
  Calendar,
  Loader2,
  X,
} from 'lucide-react';

// ============================================================================
// KONSTANTEN
// ============================================================================

const HOURS_PER_PM = 173.33;

// ZIM Parser wird ueber lokale API-Route aufgerufen

const FUNDING_FORMATS = [
  { value: '', label: '-- Bitte waehlen --' },
  { value: 'ZIM', label: 'ZIM Einzelprojekt' },
  { value: 'ZIM_KOOP', label: 'ZIM Kooperationsprojekt' },
  { value: 'ZIM_NETZWERK', label: 'ZIM Netzwerk-Management' },
  { value: 'ZIM_DS', label: 'ZIM Durchfuehrbarkeitsstudie' },
  { value: 'BMBF', label: 'BMBF Foerderung' },
  { value: 'BMBF_DS', label: 'BMBF Durchfuehrbarkeitsstudie' },
];

// ============================================================================
// TYPEN
// ============================================================================

interface ProjectFormData {
  name: string;
  short_name: string;
  funding_format: string;
  funding_reference: string;
  start_date: string;
  end_date: string;
  notes: string;
}

const EMPTY_FORM: ProjectFormData = {
  name: '',
  short_name: '',
  funding_format: '',
  funding_reference: '',
  start_date: '',
  end_date: '',
  notes: '',
};

// ZIM Parser Types
interface ZimProjekt {
  name: string;
  kurzname: string;
  fkz: string;
  start: string;
  ende: string;
  foerderquote: number;
  gesamtkosten: number;
  zuwendung: number;
  gesamt_pm: number;
  gesamt_pk: number;
}

interface ZimAntragsteller {
  firma: string;
  rechtsform: string;
  strasse: string;
  plz: string;
  ort: string;
  bundesland: string;
  ansprechpartner_name: string;
  ansprechpartner_email: string;
}

interface ZimMitarbeiter {
  ma_nr: number;
  nachname: string;
  vorname: string;
  qualifikation: string;
  stundensatz: number;
  wochenstunden: number;
  pm_gesamt: number;
}

interface ZimArbeitspaket {
  ap_nummer: number;
  ap_code: string;
  name: string;
  start_monat: number | null;
  ende_monat: number | null;
  gesamt_pm: number;
  mitarbeiter_zuordnungen: Array<{ ma_nr: number; pm: number }>;
}

interface ZimAntrag {
  projekt: ZimProjekt;
  antragsteller: ZimAntragsteller;
  mitarbeiter: ZimMitarbeiter[];
  arbeitspakete: ZimArbeitspaket[];
}

interface NormalizedAP {
  ap_number: number;
  ap_sub_number: number;
  ap_code: string;
  name: string;
  start_month: number | null;
  end_month: number | null;
  total_pm: number;
  assignments: Array<{ ma_nr: number; pm: number }>;
}

interface ProjectCreateFormProps {
  portal: 'berater' | 'firma';
  companyId: string;
  companyName: string;
  onSuccess: (projectId: string) => void;
  onCancel: () => void;
}

// ============================================================================
// FARBEN
// ============================================================================

const PORTAL_COLORS = {
  berater: {
    button: 'bg-blue-600 hover:bg-blue-700',
    buttonLight: 'bg-blue-50 text-blue-700 hover:bg-blue-100',
    focus: 'focus:ring-blue-500',
    text: 'text-blue-600',
    border: 'border-blue-200',
    bg: 'bg-blue-50',
    activeTab: 'bg-white text-blue-700 shadow-sm',
    tabBg: 'bg-blue-100',
    spinner: 'border-blue-200 border-t-blue-600',
    icon: 'text-blue-600',
  },
  firma: {
    button: 'bg-green-600 hover:bg-green-700',
    buttonLight: 'bg-green-50 text-green-700 hover:bg-green-100',
    focus: 'focus:ring-green-500',
    text: 'text-green-600',
    border: 'border-green-200',
    bg: 'bg-green-50',
    activeTab: 'bg-white text-green-700 shadow-sm',
    tabBg: 'bg-green-100',
    spinner: 'border-green-200 border-t-green-600',
    icon: 'text-green-600',
  },
};

// ============================================================================
// HILFSFUNKTIONEN
// ============================================================================

function parseApCode(code: string): { main: number; sub: number } {
  const match = code.match(/AP?(\d+)(?:\.(\d+))?/i);
  if (match) {
    return {
      main: parseInt(match[1], 10),
      sub: match[2] ? parseInt(match[2], 10) : 0
    };
  }
  return { main: 0, sub: 0 };
}

function normalizeAPs(arbeitspakete: ZimArbeitspaket[]): NormalizedAP[] {
  return arbeitspakete.map(ap => {
    const parsed = parseApCode(ap.ap_code);
    return {
      ap_number: parsed.main,
      ap_sub_number: parsed.sub,
      ap_code: ap.ap_code,
      name: ap.name,
      start_month: ap.start_monat,
      end_month: ap.ende_monat,
      total_pm: ap.gesamt_pm,
      assignments: ap.mitarbeiter_zuordnungen || []
    };
  }).sort((a, b) => {
    if (a.ap_number !== b.ap_number) return a.ap_number - b.ap_number;
    return a.ap_sub_number - b.ap_sub_number;
  });
}

// ============================================================================
// KOMPONENTE
// ============================================================================

export default function ProjectCreateForm({
  portal,
  companyId,
  companyName,
  onSuccess,
  onCancel,
}: ProjectCreateFormProps) {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const colors = PORTAL_COLORS[portal];

  // State
  const [activeTab, setActiveTab] = useState<'upload' | 'manuell'>('upload');
  const [formData, setFormData] = useState<ProjectFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<ZimAntrag | null>(null);
  const [normalizedAPs, setNormalizedAPs] = useState<NormalizedAP[]>([]);

  // ============================================================================
  // PDF UPLOAD & PARSING
  // ============================================================================

  const handlePdfUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setParsing(true);
    setError(null);
    setParsedData(null);

    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);

      const response = await fetch("/api/parse-zim", {
        method: 'POST',
        body: formDataUpload,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Parser-Fehler: ${errorText}`);
      }

      const data: ZimAntrag = await response.json();
      setParsedData(data);

      if (data.arbeitspakete) {
        setNormalizedAPs(normalizeAPs(data.arbeitspakete));
      }

    } catch (err: any) {
      setError(err.message || 'Fehler beim Parsen der PDF');
    } finally {
      setParsing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, []);

  const resetUpload = () => {
    setParsedData(null);
    setNormalizedAPs([]);
    setError(null);
  };

  // ============================================================================
  // IMPORT
  // ============================================================================

  const handleImport = async () => {
    if (!parsedData) return;

    setImporting(true);
    setError(null);

    try {
      // 1. Projekt anlegen
      const { data: newProject, error: projectError } = await supabase
        .from('v7_projects')
        .insert({
          client_company_id: companyId,
          name: parsedData.projekt.name,
          short_name: parsedData.projekt.kurzname || null,
          funding_format: 'ZIM',
          funding_reference: parsedData.projekt.fkz || null,
          start_date: parsedData.projekt.start || null,
          end_date: parsedData.projekt.ende || null,
          notes: `Foerderquote: ${parsedData.projekt.foerderquote}%, Gesamtkosten: ${parsedData.projekt.gesamtkosten}EUR, Zuwendung: ${parsedData.projekt.zuwendung}EUR, PM: ${parsedData.projekt.gesamt_pm}`,
          is_active: true,
        })
        .select('id')
        .single();

      if (projectError) throw projectError;

      const projectId = newProject.id;

      // 2. Mitarbeiter anlegen (nur wenn noch nicht vorhanden)
      const employeeIdMap: Record<number, string> = {};

      for (const ma of parsedData.mitarbeiter || []) {
        const displayName = `${ma.nachname}, ${ma.vorname}`.trim();
        console.log(`[Import] Suche Mitarbeiter: "${displayName}" (MA ${ma.ma_nr})`);

        // Pruefen ob Mitarbeiter existiert - flexibleres Matching
        // Versuche erst exakten Match, dann nach last_name + first_name
        let employeeId: string | null = null;
        
        // 1. Exakter display_name Match
        const { data: exactMatch } = await supabase
          .from('v7_employees')
          .select('id, display_name')
          .eq('client_company_id', companyId)
          .eq('display_name', displayName)
          .maybeSingle();

        if (exactMatch) {
          employeeId = exactMatch.id;
          console.log(`[Import] Exakter Match gefunden: ${exactMatch.display_name}`);
        } else {
          // 2. Versuche Match über first_name + last_name
          const { data: nameMatch } = await supabase
            .from('v7_employees')
            .select('id, display_name, first_name, last_name')
            .eq('client_company_id', companyId)
            .ilike('last_name', ma.nachname.trim())
            .ilike('first_name', ma.vorname.trim())
            .maybeSingle();

          if (nameMatch) {
            employeeId = nameMatch.id;
            console.log(`[Import] Name-Match gefunden: ${nameMatch.display_name}`);
          }
        }

        if (employeeId) {
          employeeIdMap[ma.ma_nr] = employeeId;
        } else {
          // Mitarbeiter existiert nicht - neu anlegen
          console.log(`[Import] Lege neuen Mitarbeiter an: ${displayName}`);
          const { data: newEmp, error: empError } = await supabase
            .from('v7_employees')
            .insert({
              client_company_id: companyId,
              display_name: displayName,
              first_name: ma.vorname,
              last_name: ma.nachname,
              qualification: ma.qualifikation || null,
              weekly_hours: ma.wochenstunden || 40,
              is_active: true,
            })
            .select('id')
            .single();

          if (empError) {
            console.error('[Import] Mitarbeiter-Fehler:', empError);
          } else {
            employeeIdMap[ma.ma_nr] = newEmp.id;
            console.log(`[Import] Neuer Mitarbeiter angelegt: ${newEmp.id}`);
          }
        }
      }
      
      console.log('[Import] EmployeeIdMap:', employeeIdMap);

      // 3. Arbeitspakete anlegen
      for (const ap of normalizedAPs) {
        // ap_code generieren: AP1, AP2.1, AP4.3 etc.
        const apCode = ap.ap_sub_number > 0 
          ? `AP${ap.ap_number}.${ap.ap_sub_number}` 
          : `AP${ap.ap_number}`;
        
        const { data: newWP, error: wpError } = await supabase
          .from('v7_work_packages')
          .insert({
            project_id: projectId,
            ap_number: ap.ap_number,
            ap_code: apCode,
            name: ap.name,
            start_month: ap.start_month,
            end_month: ap.end_month,
            total_person_months: ap.total_pm,
            is_active: true,
          })
          .select('id')
          .single();

        if (wpError) {
          console.error('[Import] AP-Fehler:', wpError);
          continue;
        }
        
        console.log(`[Import] AP angelegt: ${apCode} - ${ap.name.substring(0, 30)}...`);

        // 4. Zuordnungen (Assignments)
        console.log(`[Import] AP ${ap.ap_code}: ${ap.assignments?.length || 0} Zuordnungen`);
        for (const assignment of ap.assignments || []) {
          const employeeId = employeeIdMap[assignment.ma_nr];
          console.log(`[Import]   Zuordnung MA ${assignment.ma_nr} -> Employee ${employeeId || 'NICHT GEFUNDEN'}`);
          if (!employeeId) {
            console.warn(`[Import]   WARNUNG: Keine Employee-ID fuer MA ${assignment.ma_nr}`);
            continue;
          }

          // Stundensatz aus Mitarbeiterdaten holen
          const maData = parsedData.mitarbeiter.find(m => m.ma_nr === assignment.ma_nr);
          const hourlyRate = maData?.stundensatz || 0;

          const { error: assignError } = await supabase
            .from('v7_project_assignments')
            .insert({
              work_package_id: newWP.id,
              employee_id: employeeId,
              planned_pm: assignment.pm,
              hourly_rate: hourlyRate,
            });
          
          if (assignError) {
            console.error(`[Import]   Zuordnungs-Fehler:`, assignError);
          } else {
            console.log(`[Import]   Zuordnung erstellt: WP ${newWP.id} <- MA ${assignment.ma_nr} (${assignment.pm} PM)`);
          }
        }
      }

      setSuccess('Projekt erfolgreich importiert!');
      setTimeout(() => {
        onSuccess(projectId);
      }, 1000);

    } catch (err: any) {
      setError(err.message || 'Fehler beim Import');
    } finally {
      setImporting(false);
    }
  };

  // ============================================================================
  // MANUELL SPEICHERN
  // ============================================================================

  const handleSaveManual = async () => {
    if (!formData.name.trim()) {
      setError('Projektname ist erforderlich');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const { data: newProject, error: insertError } = await supabase
        .from('v7_projects')
        .insert({
          client_company_id: companyId,
          name: formData.name.trim(),
          short_name: formData.short_name.trim() || null,
          funding_format: formData.funding_format || null,
          funding_reference: formData.funding_reference.trim() || null,
          start_date: formData.start_date || null,
          end_date: formData.end_date || null,
          notes: formData.notes.trim() || null,
          is_active: true,
        })
        .select('id')
        .single();

      if (insertError) throw insertError;

      setSuccess('Projekt erfolgreich angelegt!');
      setTimeout(() => {
        onSuccess(newProject.id);
      }, 1000);

    } catch (err: any) {
      setError(err.message || 'Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="space-y-6">
      {/* Tab-Auswahl */}
      <div className={`flex gap-2 p-1 ${colors.tabBg} rounded-lg`}>
        <button
          onClick={() => { setActiveTab('upload'); setError(null); }}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'upload' ? colors.activeTab : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Upload size={18} />
          PDF importieren
        </button>
        <button
          onClick={() => { setActiveTab('manuell'); setError(null); }}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'manuell' ? colors.activeTab : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Edit3 size={18} />
          Manuell anlegen
        </button>
      </div>

      {/* Meldungen */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <span className="text-red-800">{error}</span>
        </div>
      )}

      {success && (
        <div className={`p-4 ${colors.bg} border ${colors.border} rounded-lg flex items-start gap-3`}>
          <CheckCircle className={`w-5 h-5 ${colors.text} flex-shrink-0 mt-0.5`} />
          <span className={colors.text.replace('text-', 'text-').replace('600', '800')}>{success}</span>
        </div>
      )}

      {/* ================================================================ */}
      {/* TAB: PDF IMPORT */}
      {/* ================================================================ */}
      {activeTab === 'upload' && (
        <div className="space-y-6">
          {/* Info-Box */}
          <div className={`${colors.bg} border ${colors.border} rounded-lg p-4`}>
            <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
              <FileText size={18} className={colors.icon} />
              ZIM-Foerderantrag importieren
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              Laden Sie einen ausgefuellten ZIM-Foerderantrag (PDF) hoch. Alle Daten werden automatisch extrahiert:
            </p>
            <ul className="text-sm text-gray-500 space-y-1 ml-4 list-disc">
              <li>Projektdaten (Name, Kurzname, FKZ, Laufzeit)</li>
              <li>Mitarbeiter aus Anlage 6.1/6.2</li>
              <li>Arbeitspakete mit MA-Zuordnungen</li>
            </ul>
          </div>

          {/* Upload-Bereich */}
          {!parsedData && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handlePdfUpload}
                disabled={parsing}
                className="hidden"
              />

              <div
                onClick={() => !parsing && fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
                  parsing
                    ? 'bg-gray-50 border-gray-300 cursor-wait'
                    : `${colors.border} hover:${colors.bg}`
                }`}
              >
                {parsing ? (
                  <>
                    <Loader2 className={`w-12 h-12 ${colors.icon} mx-auto mb-4 animate-spin`} />
                    <p className="text-lg font-medium text-gray-900">Analysiere PDF...</p>
                    <p className="text-sm text-gray-500 mt-2">Bitte warten</p>
                  </>
                ) : (
                  <>
                    <Upload className={`w-12 h-12 ${colors.icon} mx-auto mb-4`} />
                    <p className="text-lg font-medium text-gray-900">ZIM-Antrag PDF hochladen</p>
                    <p className="text-sm text-gray-500 mt-2">Klicken oder Datei hierher ziehen</p>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Vorschau */}
          {parsedData && (
            <div className="space-y-4">
              {/* Header mit Reset */}
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-gray-900">Importvorschau</h3>
                <button
                  onClick={resetUpload}
                  className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                >
                  <X size={16} />
                  Zuruecksetzen
                </button>
              </div>

              {/* Projektdaten */}
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <FolderKanban size={18} className={colors.icon} />
                  Projektdaten
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Name:</span>
                    <p className="font-medium">{parsedData.projekt?.name || '-'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Kurzname:</span>
                    <p className="font-medium">{parsedData.projekt?.kurzname || '-'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">FKZ:</span>
                    <p className="font-medium">{parsedData.projekt?.fkz || '-'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Laufzeit:</span>
                    <p className="font-medium">
                      {parsedData.projekt?.start || '-'} bis {parsedData.projekt?.ende || '-'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Mitarbeiter */}
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <Users size={18} className={colors.icon} />
                  Mitarbeiter ({parsedData.mitarbeiter?.length || 0})
                </h4>
                {parsedData.mitarbeiter && parsedData.mitarbeiter.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left">
                          <th className="pb-2 font-medium text-gray-500">Nr.</th>
                          <th className="pb-2 font-medium text-gray-500">Name</th>
                          <th className="pb-2 font-medium text-gray-500">Qualifikation</th>
                          <th className="pb-2 font-medium text-gray-500 text-right">PM</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedData.mitarbeiter.slice(0, 10).map((ma, idx) => (
                          <tr key={idx} className="border-b last:border-0">
                            <td className="py-2 text-gray-500">{ma.ma_nr}</td>
                            <td className="py-2 font-medium">{ma.nachname}, {ma.vorname}</td>
                            <td className="py-2 text-gray-600">{ma.qualifikation}</td>
                            <td className="py-2 text-right">{ma.pm_gesamt?.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {parsedData.mitarbeiter.length > 10 && (
                      <p className="text-sm text-gray-500 mt-2">
                        ... und {parsedData.mitarbeiter.length - 10} weitere
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500 italic">Keine Mitarbeiter gefunden</p>
                )}
              </div>

              {/* Arbeitspakete */}
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <Calendar size={18} className={colors.icon} />
                  Arbeitspakete ({normalizedAPs.length})
                </h4>
                {normalizedAPs.length > 0 ? (
                  <div className="space-y-2">
                    {normalizedAPs.slice(0, 10).map((ap, idx) => (
                      <div key={idx} className="flex justify-between items-center py-2 border-b last:border-0">
                        <div>
                          <span className="font-medium">{ap.ap_code}</span>
                          <span className="text-gray-600 ml-2">{ap.name}</span>
                        </div>
                        <span className="text-gray-500">{ap.total_pm?.toFixed(2)} PM</span>
                      </div>
                    ))}
                    {normalizedAPs.length > 10 && (
                      <p className="text-sm text-gray-500">
                        ... und {normalizedAPs.length - 10} weitere
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500 italic">Keine Arbeitspakete gefunden</p>
                )}
              </div>

              {/* Import Button */}
              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={onCancel}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700
                             hover:bg-gray-50 transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleImport}
                  disabled={importing}
                  className={`flex items-center gap-2 px-4 py-2 text-white rounded-lg
                             transition-colors disabled:opacity-50 ${colors.button}`}
                >
                  {importing ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Importiere...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={18} />
                      Projekt importieren
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================================================================ */}
      {/* TAB: MANUELL */}
      {/* ================================================================ */}
      {activeTab === 'manuell' && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Projektname */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Projektname *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="z.B. Entwicklung innovativer Drucktechnologie"
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg
                           focus:outline-none focus:ring-2 ${colors.focus}`}
                autoFocus
              />
            </div>

            {/* Kurzname */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Kurzname / Akronym
              </label>
              <input
                type="text"
                value={formData.short_name}
                onChange={(e) => setFormData({ ...formData, short_name: e.target.value })}
                placeholder="z.B. DigiTrans"
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg
                           focus:outline-none focus:ring-2 ${colors.focus}`}
              />
            </div>

            {/* Foerderprogramm */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Foerderprogramm
              </label>
              <select
                value={formData.funding_format}
                onChange={(e) => setFormData({ ...formData, funding_format: e.target.value })}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg
                           focus:outline-none focus:ring-2 ${colors.focus}`}
              >
                {FUNDING_FORMATS.map(ff => (
                  <option key={ff.value} value={ff.value}>{ff.label}</option>
                ))}
              </select>
            </div>

            {/* FKZ */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Foerderkennzeichen (FKZ)
              </label>
              <input
                type="text"
                value={formData.funding_reference}
                onChange={(e) => setFormData({ ...formData, funding_reference: e.target.value })}
                placeholder="z.B. 16KN087502"
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg
                           focus:outline-none focus:ring-2 ${colors.focus}`}
              />
            </div>

            {/* Startdatum */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Projektstart
              </label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg
                           focus:outline-none focus:ring-2 ${colors.focus}`}
              />
            </div>

            {/* Enddatum */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Projektende
              </label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg
                           focus:outline-none focus:ring-2 ${colors.focus}`}
              />
            </div>

            {/* Notizen */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notizen
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                placeholder="Optionale Notizen zum Projekt..."
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg
                           focus:outline-none focus:ring-2 ${colors.focus}`}
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-200">
            <button
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700
                         hover:bg-gray-50 transition-colors"
            >
              Abbrechen
            </button>
            <button
              onClick={handleSaveManual}
              disabled={saving || !formData.name.trim()}
              className={`flex items-center gap-2 px-4 py-2 text-white rounded-lg
                         transition-colors disabled:opacity-50 ${colors.button}`}
            >
              {saving ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Speichern...
                </>
              ) : (
                <>
                  <Save size={18} />
                  Projekt anlegen
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
