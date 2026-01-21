// src/app/v7/firma/projekte/neu/page.tsx
// ============================================================================
// PZE V7 - Neues Projekt anlegen (Firmen-Portal)
// MIT PDF-IMPORT OPTION
// ============================================================================
// Datum: 21. Januar 2026
// Version: 7.3.44
// ============================================================================
// FEATURES:
// - Tab-Auswahl: Manuell vs. Projektantrag hochladen
// - PDF-Upload mit ZIM-Parser-Service
// - Automatische Extraktion aller Projektdaten
// - Vollstaendiges manuelles Formular als Alternative
// ============================================================================

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  ArrowLeft,
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
  Euro,
  Loader2,
} from 'lucide-react';

// Komponenten
import PortalHeader from '@/components/shared/PortalHeader';

// Types
import { V7UserRole, V7EmployeePortalRole, V7Employee, V7ClientCompany } from '@/types/v7-types';

// ============================================================================
// KONSTANTEN
// ============================================================================

const HOURS_PER_PM = 173.33;

// ZIM Parser Microservice URL
const ZIM_PARSER_URL = process.env.NEXT_PUBLIC_ZIM_PARSER_URL || 'https://web-production-e2e1.up.railway.app';

const FUNDING_FORMATS = [
  { value: 'ZIM', label: 'ZIM Einzelprojekt' },
  { value: 'ZIM_KOOP', label: 'ZIM Kooperationsprojekt' },
  { value: 'ZIM_NETZWERK', label: 'ZIM Netzwerk-Management' },
  { value: 'ZIM_DS', label: 'ZIM Durchfuehrbarkeitsstudie' },
  { value: 'BMBF', label: 'BMBF Foerderung' },
  { value: 'BMBF_DS', label: 'BMBF Durchfuehrbarkeitsstudie' },
];

// ============================================================================
// TYPEN - ZIM Parser Response
// ============================================================================

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
  website: string;
  ansprechpartner_name: string;
  ansprechpartner_funktion: string;
  ansprechpartner_telefon: string;
  ansprechpartner_email: string;
}

interface ZimMitarbeiter {
  ma_nr: number;
  nachname: string;
  vorname: string;
  qualifikation: string;
  qualifikation_gruppe: number;
  geburtsdatum: string;
  funktion: string;
  angestellt_seit: string;
  jahresbrutto: number;
  stundensatz: number;
  wochenstunden: number;
  teilzeitfaktor: number;
  pm_gesamt: number;
  kosten_gesamt: number;
  pm_pro_jahr: Record<number, number>;
}

interface ZimArbeitspaket {
  ap_nummer: number;
  ap_code: string;
  name: string;
  start_monat: number | null;
  ende_monat: number | null;
  gesamt_pm: number;
  mitarbeiter_zuordnungen: Array<{
    ma_nr: number;
    pm: number;
  }>;
}

interface ZimStatistik {
  anzahl_mitarbeiter: number;
  anzahl_arbeitspakete: number;
  gesamt_pm: number;
  gesamt_kosten: number;
}

interface ZimAntrag {
  projekt: ZimProjekt;
  antragsteller: ZimAntragsteller;
  mitarbeiter: ZimMitarbeiter[];
  arbeitspakete: ZimArbeitspaket[];
  statistik: ZimStatistik;
}

// ============================================================================
// TYPEN - Komponente
// ============================================================================

interface UserProfile {
  id: string;
  email: string;
  role: V7UserRole;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  client_company_id: string | null;
}

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

interface NormalizedAP {
  ap_number: number;
  ap_sub_number: number;
  ap_code: string;
  name: string;
  start_month: number | null;
  end_month: number | null;
  total_pm: number;
  assignments: Array<{
    ma_nr: number;
    pm: number;
  }>;
}

// ============================================================================
// HILFSFUNKTIONEN
// ============================================================================

function parseApCode(code: string): { main: number; sub: number } {
  // "AP1" -> { main: 1, sub: 0 }
  // "AP1.1" -> { main: 1, sub: 1 }
  // "AP2.3" -> { main: 2, sub: 3 }
  const match = code.match(/AP?(\d+)(?:\.(\d+))?/i);
  if (match) {
    return {
      main: parseInt(match[1], 10),
      sub: match[2] ? parseInt(match[2], 10) : 0
    };
  }
  return { main: 0, sub: 0 };
}

function normalizeArbeitspakete(aps: ZimArbeitspaket[]): NormalizedAP[] {
  return aps.map(ap => {
    const parsed = parseApCode(ap.ap_code || `AP${ap.ap_nummer}`);
    return {
      ap_number: parsed.main,
      ap_sub_number: parsed.sub,
      ap_code: ap.ap_code || `AP${ap.ap_nummer}`,
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

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  // Format: "01.01.2025" -> "2025-01-01"
  if (dateStr.includes('.')) {
    const parts = dateStr.split('.');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
  }
  return dateStr;
}

function detectFundingFormat(projektName: string, fkz: string): string {
  const fkzLower = fkz.toLowerCase();
  const nameLower = projektName.toLowerCase();
  
  if (nameLower.includes('durchfuehrbarkeit') || nameLower.includes('machbarkeit')) {
    return 'ZIM_DS';
  }
  if (nameLower.includes('netzwerk') || nameLower.includes('management')) {
    return 'ZIM_NETZWERK';
  }
  if (nameLower.includes('kooperation')) {
    return 'ZIM_KOOP';
  }
  // Standard ZIM
  if (fkzLower.startsWith('16kn') || fkzLower.startsWith('kk')) {
    return 'ZIM';
  }
  // BMBF
  if (fkzLower.startsWith('01') || fkzLower.startsWith('02')) {
    return 'BMBF';
  }
  return 'ZIM';
}

// ============================================================================
// KOMPONENTE
// ============================================================================

export default function NeuesProjekt() {
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Base State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [employee, setEmployee] = useState<V7Employee | null>(null);
  const [company, setCompany] = useState<V7ClientCompany | null>(null);
  
  // Tab State
  const [activeTab, setActiveTab] = useState<'upload' | 'manuell'>('upload');
  
  // Form State (manuell)
  const [formData, setFormData] = useState<ProjectFormData>(EMPTY_FORM);
  
  // PDF Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parsedData, setParsedData] = useState<ZimAntrag | null>(null);
  const [normalizedAPs, setNormalizedAPs] = useState<NormalizedAP[]>([]);
  const [importing, setImporting] = useState(false);

  // ============================================================================
  // DATEN LADEN
  // ============================================================================

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        router.push('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('v7_user_profiles')
        .select('*')
        .eq('email', user.email)
        .maybeSingle();

      if (!profile || !profile.client_company_id) {
        setError('Kein Zugriff');
        setLoading(false);
        return;
      }

      // Nur client_admin darf Projekte anlegen
      if (profile.role !== 'client_admin') {
        setError('Keine Berechtigung zum Anlegen von Projekten');
        setLoading(false);
        return;
      }

      setUserProfile(profile);

      const { data: companyData } = await supabase
        .from('v7_client_companies')
        .select('*')
        .eq('id', profile.client_company_id)
        .single();

      if (companyData) setCompany(companyData);

      const { data: employeeData } = await supabase
        .from('v7_employees')
        .select('*')
        .eq('client_company_id', profile.client_company_id)
        .eq('email', user.email)
        .maybeSingle();

      if (employeeData) setEmployee(employeeData);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // PDF UPLOAD & PARSING
  // ============================================================================

  const handlePdfUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setError(null);
    setSuccess(null);
    setParsedData(null);
    setNormalizedAPs([]);
    setParsing(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      console.log('Sende PDF an Parser-Service:', ZIM_PARSER_URL);
      
      const response = await fetch(`${ZIM_PARSER_URL}/parse`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Parser-Service Fehler: ${response.status} - ${errorText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.detail || result.error || 'Parsing fehlgeschlagen');
      }

      setParsedData(result.data);
      setNormalizedAPs(normalizeArbeitspakete(result.data.arbeitspakete || []));
      setSuccess(`PDF "${file.name}" erfolgreich analysiert! (${result.data.statistik?.anzahl_mitarbeiter || 0} MA, ${result.data.statistik?.anzahl_arbeitspakete || 0} AP)`);
      
    } catch (err: any) {
      console.error('PDF-Upload Fehler:', err);
      setError(`PDF-Analyse fehlgeschlagen: ${err.message}. Stelle sicher, dass es sich um ein ausgefuelltes ZIM-Antragsformular (XFA-PDF) handelt.`);
    } finally {
      setParsing(false);
    }
  }, []);

  // ============================================================================
  // IMPORT AUS PARSED DATA
  // ============================================================================

  const handleImportFromPdf = async () => {
    if (!parsedData || !company) return;

    setImporting(true);
    setError(null);

    try {
      const projekt = parsedData.projekt;
      const mitarbeiter = parsedData.mitarbeiter || [];
      
      // 1. Projekt anlegen
      const fundingFormat = detectFundingFormat(projekt.name || '', projekt.fkz || '');
      
      const { data: newProject, error: projectError } = await supabase
        .from('v7_projects')
        .insert({
          client_company_id: company.id,
          name: projekt.name || 'Neues Projekt',
          short_name: projekt.kurzname || null,
          funding_format: fundingFormat,
          funding_reference: projekt.fkz || null,
          start_date: formatDate(projekt.start) || null,
          end_date: formatDate(projekt.ende) || null,
          source_filename: selectedFile?.name || null,
          imported_at: new Date().toISOString(),
          notes: `Importiert aus ZIM-Antrag am ${new Date().toLocaleDateString('de-DE')}`,
          is_active: true,
        })
        .select()
        .single();

      if (projectError) throw projectError;
      if (!newProject) throw new Error('Projekt konnte nicht angelegt werden');

      // 2. Mitarbeiter anlegen (falls nicht vorhanden)
      const mitarbeiterMap = new Map<number, string>(); // ma_nr -> employee_id
      
      for (const ma of mitarbeiter) {
        // Pruefen ob Mitarbeiter bereits existiert
        const displayName = `${ma.nachname}, ${ma.vorname}`;
        const { data: existing } = await supabase
          .from('v7_employees')
          .select('id')
          .eq('client_company_id', company.id)
          .eq('display_name', displayName)
          .maybeSingle();

        if (existing) {
          mitarbeiterMap.set(ma.ma_nr, existing.id);
        } else {
          // Neuen Mitarbeiter anlegen
          const { data: newEmployee, error: empError } = await supabase
            .from('v7_employees')
            .insert({
              client_company_id: company.id,
              display_name: displayName,
              first_name: ma.vorname,
              last_name: ma.nachname,
              name: `${ma.vorname} ${ma.nachname}`,
              qualification: ma.qualifikation,
              position_title: ma.funktion,
              weekly_hours: ma.wochenstunden || 40,
              hourly_rate: ma.stundensatz || null,
              is_active: true,
            })
            .select()
            .single();

          if (empError) {
            console.error('Mitarbeiter-Fehler:', empError);
          } else if (newEmployee) {
            mitarbeiterMap.set(ma.ma_nr, newEmployee.id);
          }
        }
      }

      // 3. Arbeitspakete anlegen
      for (const ap of normalizedAPs) {
        const { data: newWP, error: wpError } = await supabase
          .from('v7_work_packages')
          .insert({
            project_id: newProject.id,
            ap_number: ap.ap_number,
            ap_sub_number: ap.ap_sub_number,
            ap_code: ap.ap_code,
            name: ap.name,
            start_month: ap.start_month,
            end_month: ap.end_month,
            total_person_months: ap.total_pm,
            is_active: true,
          })
          .select()
          .single();

        if (wpError) {
          console.error('AP-Fehler:', wpError);
          continue;
        }

        // 4. AP-Zuordnungen anlegen
        if (newWP && ap.assignments.length > 0) {
          for (const assignment of ap.assignments) {
            const employeeId = mitarbeiterMap.get(assignment.ma_nr);
            if (!employeeId) continue;

            // Stundensatz aus Mitarbeiter holen
            const maData = mitarbeiter.find(m => m.ma_nr === assignment.ma_nr);
            const hourlyRate = maData?.stundensatz || 50;
            const plannedHours = assignment.pm * HOURS_PER_PM;
            const plannedCosts = plannedHours * hourlyRate;

            await supabase
              .from('v7_work_package_assignments')
              .insert({
                work_package_id: newWP.id,
                employee_id: employeeId,
                planned_person_months: assignment.pm,
                planned_hours: Math.round(plannedHours * 100) / 100,
                hourly_rate: hourlyRate,
                planned_costs: Math.round(plannedCosts * 100) / 100,
                is_active: true,
              });
          }
        }
      }

      // Erfolg - zur Projekt-Detailseite navigieren
      setSuccess('Projekt erfolgreich importiert!');
      
      setTimeout(() => {
        router.push(`/v7/firma/projekte/${newProject.id}`);
      }, 1000);

    } catch (err: any) {
      console.error('Import-Fehler:', err);
      setError(`Import fehlgeschlagen: ${err.message}`);
    } finally {
      setImporting(false);
    }
  };

  // ============================================================================
  // MANUELLES SPEICHERN
  // ============================================================================

  const handleSaveManual = async () => {
    if (!formData.name.trim()) {
      setError('Bitte geben Sie einen Projektnamen ein');
      return;
    }

    if (!company) return;

    setSaving(true);
    setError(null);

    try {
      const { data: newProject, error: insertError } = await supabase
        .from('v7_projects')
        .insert({
          client_company_id: company.id,
          name: formData.name.trim(),
          short_name: formData.short_name.trim() || null,
          funding_format: formData.funding_format || null,
          funding_reference: formData.funding_reference.trim() || null,
          start_date: formData.start_date || null,
          end_date: formData.end_date || null,
          notes: formData.notes.trim() || null,
          is_active: true,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      router.push(`/v7/firma/projekte/${newProject.id}`);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // ============================================================================
  // RESET
  // ============================================================================

  const handleReset = () => {
    setSelectedFile(null);
    setParsedData(null);
    setNormalizedAPs([]);
    setError(null);
    setSuccess(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // ============================================================================
  // HILFSFUNKTIONEN UI
  // ============================================================================

  const getUserName = (): string => {
    if (userProfile?.display_name) return userProfile.display_name;
    if (userProfile?.first_name && userProfile?.last_name) {
      return `${userProfile.first_name} ${userProfile.last_name}`;
    }
    return userProfile?.email?.split('@')[0] || 'Benutzer';
  };

  const getPortalRole = (): V7EmployeePortalRole => {
    if (userProfile?.role === 'client_admin') return 'client_admin';
    if (employee?.portal_role) return employee.portal_role;
    return 'employee';
  };

  // ============================================================================
  // RENDER - LOADING / ERROR
  // ============================================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-green-200 border-t-green-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error && !company) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/v7/firma/projekte')}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Zurueck zur Liste
          </button>
        </div>
      </div>
    );
  }

  const userName = getUserName();
  const portalRole = getPortalRole();

  // ============================================================================
  // RENDER - MAIN
  // ============================================================================

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <PortalHeader
        portal="firma"
        userName={userName}
        userRole={portalRole}
        companyName={company?.name || 'Firma'}
      />

      {/* Sub-Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/v7/firma/projekte')}
              className="flex items-center gap-1 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft size={20} />
              <span className="text-sm">Projekte</span>
            </button>
            <div className="h-6 w-px bg-gray-300"></div>
            <h1 className="text-xl font-bold text-gray-900">Neues Projekt anlegen</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        
        {/* Tab-Auswahl */}
        <div className="bg-gray-100 p-1 rounded-lg mb-6 flex">
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'upload'
                ? 'bg-white text-green-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Upload size={18} />
            Projektantrag hochladen
          </button>
          <button
            onClick={() => setActiveTab('manuell')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'manuell'
                ? 'bg-white text-green-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Edit3 size={18} />
            Manuell anlegen
          </button>
        </div>

        {/* Fehlermeldung */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <span className="text-red-800">{error}</span>
          </div>
        )}

        {/* Erfolgsmeldung */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <span className="text-green-800">{success}</span>
          </div>
        )}

        {/* ================================================================ */}
        {/* TAB: Projektantrag hochladen */}
        {/* ================================================================ */}
        {activeTab === 'upload' && (
          <div className="space-y-6">
            
            {/* Info-Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                <FileText size={18} />
                ZIM-Foerderantrag importieren
              </h3>
              <p className="text-sm text-blue-700 mb-3">
                Laden Sie einen ausgefuellten ZIM-Foerderantrag (PDF) hoch. Alle Daten werden automatisch extrahiert:
              </p>
              <ul className="text-sm text-blue-600 space-y-1 ml-4 list-disc">
                <li>Projektdaten (Name, Kurzname, FKZ, Laufzeit)</li>
                <li>Mitarbeiter aus Anlage 6.1/6.2</li>
                <li>Arbeitspakete mit MA-Zuordnungen</li>
                <li>Budget und Personenmonate</li>
              </ul>
            </div>

            {/* Upload-Bereich - nur wenn keine Daten geparst */}
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
                      : 'border-green-300 hover:border-green-400 hover:bg-green-50'
                  }`}
                >
                  {parsing ? (
                    <>
                      <Loader2 className="w-12 h-12 text-green-500 mx-auto mb-4 animate-spin" />
                      <p className="text-lg font-medium text-gray-900">Analysiere PDF...</p>
                      <p className="text-sm text-gray-500 mt-2">Bitte warten</p>
                    </>
                  ) : (
                    <>
                      <Upload className="w-12 h-12 text-green-500 mx-auto mb-4" />
                      <p className="text-lg font-medium text-gray-900">ZIM-Antrag PDF hochladen</p>
                      <p className="text-sm text-gray-500 mt-2">
                        Klicken oder Datei hierher ziehen
                      </p>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Vorschau der geparsten Daten */}
            {parsedData && (
              <div className="space-y-4">
                
                {/* Projekt-Zusammenfassung */}
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <FolderKanban size={20} className="text-green-600" />
                    Projektdaten
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Projektname:</span>
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
                      <span className="text-gray-500">Foerderquote:</span>
                      <p className="font-medium">{parsedData.projekt?.foerderquote || 0}%</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Laufzeit:</span>
                      <p className="font-medium">
                        {parsedData.projekt?.start || '-'} bis {parsedData.projekt?.ende || '-'}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Gesamt-PM:</span>
                      <p className="font-medium">{parsedData.projekt?.gesamt_pm?.toFixed(2) || '-'}</p>
                    </div>
                  </div>
                </div>

                {/* Antragsteller */}
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Building2 size={20} className="text-green-600" />
                    Antragsteller
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Firma:</span>
                      <p className="font-medium">{parsedData.antragsteller?.firma || '-'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Ort:</span>
                      <p className="font-medium">
                        {parsedData.antragsteller?.plz} {parsedData.antragsteller?.ort}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Ansprechpartner:</span>
                      <p className="font-medium">{parsedData.antragsteller?.ansprechpartner_name || '-'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">E-Mail:</span>
                      <p className="font-medium">{parsedData.antragsteller?.ansprechpartner_email || '-'}</p>
                    </div>
                  </div>
                </div>

                {/* Mitarbeiter */}
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Users size={20} className="text-green-600" />
                    Mitarbeiter ({parsedData.mitarbeiter?.length || 0})
                  </h3>
                  {parsedData.mitarbeiter && parsedData.mitarbeiter.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left">
                            <th className="pb-2 font-medium text-gray-500">Nr.</th>
                            <th className="pb-2 font-medium text-gray-500">Name</th>
                            <th className="pb-2 font-medium text-gray-500">Qualifikation</th>
                            <th className="pb-2 font-medium text-gray-500 text-right">PM</th>
                            <th className="pb-2 font-medium text-gray-500 text-right">EUR/h</th>
                          </tr>
                        </thead>
                        <tbody>
                          {parsedData.mitarbeiter.map((ma, idx) => (
                            <tr key={idx} className="border-b last:border-0">
                              <td className="py-2 text-gray-500">{ma.ma_nr}</td>
                              <td className="py-2 font-medium">{ma.nachname}, {ma.vorname}</td>
                              <td className="py-2 text-gray-600">{ma.qualifikation}</td>
                              <td className="py-2 text-right">{ma.pm_gesamt?.toFixed(2)}</td>
                              <td className="py-2 text-right">{ma.stundensatz?.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-gray-500 italic">Keine Mitarbeiter gefunden</p>
                  )}
                </div>

                {/* Arbeitspakete */}
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Calendar size={20} className="text-green-600" />
                    Arbeitspakete ({normalizedAPs.length})
                  </h3>
                  {normalizedAPs.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left">
                            <th className="pb-2 font-medium text-gray-500">AP</th>
                            <th className="pb-2 font-medium text-gray-500">Bezeichnung</th>
                            <th className="pb-2 font-medium text-gray-500">Monat</th>
                            <th className="pb-2 font-medium text-gray-500 text-right">PM</th>
                            <th className="pb-2 font-medium text-gray-500 text-right">MA</th>
                          </tr>
                        </thead>
                        <tbody>
                          {normalizedAPs.map((ap, idx) => (
                            <tr key={idx} className="border-b last:border-0">
                              <td className="py-2 font-mono text-green-700">{ap.ap_code}</td>
                              <td className="py-2 font-medium">{ap.name}</td>
                              <td className="py-2 text-gray-600">
                                {ap.start_month && ap.end_month 
                                  ? `${ap.start_month}-${ap.end_month}`
                                  : '-'
                                }
                              </td>
                              <td className="py-2 text-right">{ap.total_pm.toFixed(2)}</td>
                              <td className="py-2 text-right">{ap.assignments.length}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-gray-500 italic">Keine Arbeitspakete gefunden</p>
                  )}
                </div>

                {/* Aktions-Buttons */}
                <div className="flex justify-between items-center pt-4">
                  <button
                    onClick={handleReset}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Anderes PDF waehlen
                  </button>
                  <button
                    onClick={handleImportFromPdf}
                    disabled={importing}
                    className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg
                               hover:bg-green-700 transition-colors disabled:opacity-50 font-medium"
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
        {/* TAB: Manuell anlegen */}
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg
                             focus:outline-none focus:ring-2 focus:ring-green-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg
                             focus:outline-none focus:ring-2 focus:ring-green-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg
                             focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">-- Bitte waehlen --</option>
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg
                             focus:outline-none focus:ring-2 focus:ring-green-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg
                             focus:outline-none focus:ring-2 focus:ring-green-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg
                             focus:outline-none focus:ring-2 focus:ring-green-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg
                             focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-200">
              <button
                onClick={() => router.push('/v7/firma/projekte')}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700
                           hover:bg-gray-50 transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={handleSaveManual}
                disabled={saving || !formData.name.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg
                           hover:bg-green-700 transition-colors disabled:opacity-50"
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

      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <p className="text-center text-sm text-gray-500">
            PZE v7.3.44 - Firmen-Portal
          </p>
        </div>
      </footer>
    </div>
  );
}
