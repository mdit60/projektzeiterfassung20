// src/app/import/page.tsx
// VERSION: v6.3d - Projekt-Ansicht: "Im FZul-Editor öffnen" Button + Fixes
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Header from '@/components/Header';
import * as XLSX from 'xlsx';

// ============================================
// INTERFACES
// ============================================

interface UserProfile {
  id: string;
  user_id: string;
  name?: string;
  email: string;
  role: string;
  company_id: string;
  has_import_access?: boolean;
  is_super_admin?: boolean;
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  has_import_access: boolean;
}

// Förderprogramm-Typen
type FundingFormat = 'ZIM' | 'BMBF_KMU' | 'FZUL' | 'UNKNOWN';

interface ProjectInfo {
  projectName: string;
  companyName: string;
  fundingReference: string;
  fileName: string;
  format: FundingFormat;
}

interface EmployeeSheet {
  sheetName: string;
  employeeName: string;
  projectYear: number;
  selected: boolean;
}

interface MonthData {
  month: number;
  year: number;
  billableHours: number;
  absenceHours: number;
  dailyData: { [day: number]: { hours: number; absence: string | null } };
}

interface ExtractedEmployee {
  employeeName: string;
  projectYear: number;
  months: MonthData[];
  totalBillableHours: number;
  totalAbsenceHours: number;
  imported: boolean;
}

// Datenbank-Typen
interface ImportedTimesheet {
  id: string;
  company_id: string;
  employee_name: string;
  project_name: string;
  funding_reference: string;
  year: number;
  month: number;
  daily_data: Record<string, { hours: number; absence: string | null }>;
  total_billable_hours: number;
  total_absence_days: number;
  original_filename: string;
  created_at: string;
  funding_format?: FundingFormat;
}

interface ImportEmployee {
  id: string;
  company_id: string;
  name: string;
  weekly_hours: number;
  annual_leave_days: number;
}

// NEU v6.0: FZul-spezifische Interfaces
interface FzulEmployeeSettings {
  id: string;
  company_id: string;
  employee_name: string;
  weekly_hours: number;
  annual_leave_days: number;
  federal_state: string;
  position_title?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface FzulPdfArchive {
  id: string;
  company_id: string;
  timesheet_id: string;
  filename: string;
  file_size?: number;
  employee_name: string;
  year: number;
  project_short_name?: string;
  project_id?: string;
  created_by?: string;
  created_at: string;
}

// NEU v6.1: FZul Editor Interfaces
interface FzulDayData {
  available: number;       // Verfügbare Stunden (8h oder 0 bei WE/Feiertag)
  projects: Record<string, { hours: number; name: string; fkz?: string }>;
  total_used: number;      // Summe aller Projektstunden
  free: number;            // Verfügbar - Genutzt
  type: 'workday' | 'weekend' | 'holiday' | 'leave' | 'sick' | 'other';
  holiday_name?: string;   // Name des Feiertags
  note?: string;
  edited?: boolean;        // Manuell bearbeitet?
}

interface FzulTimesheet {
  id?: string;
  company_id: string;
  employee_name: string;
  year: number;
  daily_data: Record<string, FzulDayData>;  // Key: "2024-01-15"
  monthly_summaries: Record<string, { available: number; used: number; free: number; leave: number; sick: number }>;
  source_projects: Array<{ id: string; name: string; fkz: string; hours: number; months: string }>;
  status: 'draft' | 'verified' | 'exported';
  created_at?: string;
  updated_at?: string;
  // Editierbare Header-Felder
  project_title?: string;     // Kurzbezeichnung des FuE-Vorhabens (editierbar)
  project_fkz?: string;       // Vorhaben-ID (editierbar)
  position_title?: string;    // Kurzbezeichnung der FuE-Tätigkeit (editierbar)
  // NEU: Jahresarbeitszeit-Berechnung (Block 1 im FZul-Formular)
  yearly_calculation: {
    weekly_hours: number;           // Wöchentliche Arbeitszeit (z.B. 40)
    vacation_days_contract: number; // Vertraglich vereinbarter Urlaubsanspruch (z.B. 24)
    sick_days: number;              // Krankheitstage (automatisch aus Kalender)
    special_leave_days: number;     // Sonderurlaub (manuell)
    holiday_count: number;          // Gesetzliche Feiertage (automatisch aus Kalender)
    short_time_days: number;        // Kurzarbeit, Erziehungsurlaub u.ä. (manuell)
    yearly_factor: number;          // Unterjähriger Faktor (x/12), Standard 1.0
  };
}

interface FzulProjectSummary {
  project_id: string;
  project_name: string;
  fkz: string;
  total_hours: number;
  month_range: string;  // "Jan - Jun 2024"
  months: number[];
}

// ============================================
// KONSTANTEN
// ============================================

const MONTH_NAMES = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

const MONTH_SHORT = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

// Bundesländer mit Codes
const BUNDESLAENDER = [
  { code: 'DE-BW', name: 'Baden-Württemberg' },
  { code: 'DE-BY', name: 'Bayern' },
  { code: 'DE-BE', name: 'Berlin' },
  { code: 'DE-BB', name: 'Brandenburg' },
  { code: 'DE-HB', name: 'Bremen' },
  { code: 'DE-HH', name: 'Hamburg' },
  { code: 'DE-HE', name: 'Hessen' },
  { code: 'DE-MV', name: 'Mecklenburg-Vorpommern' },
  { code: 'DE-NI', name: 'Niedersachsen' },
  { code: 'DE-NW', name: 'Nordrhein-Westfalen' },
  { code: 'DE-RP', name: 'Rheinland-Pfalz' },
  { code: 'DE-SL', name: 'Saarland' },
  { code: 'DE-SN', name: 'Sachsen' },
  { code: 'DE-ST', name: 'Sachsen-Anhalt' },
  { code: 'DE-SH', name: 'Schleswig-Holstein' },
  { code: 'DE-TH', name: 'Thüringen' },
];

// NEU v6.0: Bundesländer für FZul (kurze Codes)
const FEDERAL_STATES: Record<string, string> = {
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
  'TH': 'Thüringen'
};

// Format-Beschreibungen
const FORMAT_INFO: Record<FundingFormat, { name: string; color: string; description: string }> = {
  'ZIM': { 
    name: 'ZIM', 
    color: 'bg-blue-100 text-blue-800 border-blue-300',
    description: 'Zentrales Innovationsprogramm Mittelstand'
  },
  'BMBF_KMU': { 
    name: 'BMBF/KMU-innovativ', 
    color: 'bg-purple-100 text-purple-800 border-purple-300',
    description: 'Bundesministerium für Bildung und Forschung'
  },
  'FZUL': { 
    name: 'Forschungszulage', 
    color: 'bg-green-100 text-green-800 border-green-300',
    description: 'Steuerliche Forschungsförderung'
  },
  'UNKNOWN': { 
    name: 'Unbekannt', 
    color: 'bg-gray-100 text-gray-800 border-gray-300',
    description: 'Format nicht erkannt'
  }
};

// BLACKLIST FÜR TECHNISCHE SHEETS
const SHEET_BLACKLIST_PATTERN = /^(Ermittl|Auswertung|Nav|PK|ZAZK|ZNZK|Planung|Übersicht|Uebersicht|AP|ZA|MA\s*\d+)/i;

// ============================================
// HAUPTKOMPONENTE
// ============================================

export default function ImportPage() {
  // VERSION CHECK - in Browser-Konsole sichtbar
  console.log('[Import] Version v6.3d - Projekt → FZul-Editor Direktlink');
  
  const router = useRouter();
  const supabase = createClient();

  // Auth & Access
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [processing, setProcessing] = useState(false);

  // Navigation - NEU v6.0: erweitert für FZul-Tabs
  const [activeTab, setActiveTab] = useState<'import' | 'projects' | 'fzul-employees' | 'fzul-editor' | 'fzul-archive'>('projects');

  // Import States
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [projectInfo, setProjectInfo] = useState<ProjectInfo | null>(null);
  const [employeeSheets, setEmployeeSheets] = useState<EmployeeSheet[]>([]);
  const [extractedData, setExtractedData] = useState<ExtractedEmployee[]>([]);
  const [importStep, setImportStep] = useState<'upload' | 'preview' | 'done'>('upload');

  // Format-Override (falls Auto-Erkennung falsch)
  const [selectedFormat, setSelectedFormat] = useState<FundingFormat | null>(null);

  // Stammdaten (Standard-Werte)
  const [defaultWeeklyHours, setDefaultWeeklyHours] = useState(40);
  const [defaultAnnualLeave, setDefaultAnnualLeave] = useState(30);
  const [importStateCode, setImportStateCode] = useState('DE-NW');

  // Gespeicherte Daten
  const [savedTimesheets, setSavedTimesheets] = useState<ImportedTimesheet[]>([]);
  const [savedEmployees, setSavedEmployees] = useState<ImportEmployee[]>([]);
  
  // Feiertage aus Datenbank
  const [companyStateCode, setCompanyStateCode] = useState<string>('DE-NW');
  const [holidayDates, setHolidayDates] = useState<Set<string>>(new Set());

  // Auswertungs-States
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table');

  // Modals
  const [editingEmployee, setEditingEmployee] = useState<ImportEmployee | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{
    type: 'timesheet' | 'employee' | 'project';
    id?: string;
    employeeName?: string;
    projectName?: string;
  } | null>(null);

  // Berechtigungs-Modal States
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(false);
  const [savingAccess, setSavingAccess] = useState(false);

  // Drag & Drop
  const [isDragging, setIsDragging] = useState(false);

  // NEU v6.0: FZul MA-Stammdaten States
  const [fzulEmployees, setFzulEmployees] = useState<FzulEmployeeSettings[]>([]);
  const [loadingFzulEmployees, setLoadingFzulEmployees] = useState(false);
  const [showFzulEmployeeModal, setShowFzulEmployeeModal] = useState(false);
  const [editingFzulEmployee, setEditingFzulEmployee] = useState<FzulEmployeeSettings | null>(null);
  const [fzulEmployeeForm, setFzulEmployeeForm] = useState({
    employee_name: '',
    weekly_hours: 40,
    annual_leave_days: 30,
    position_title: '',
    notes: '',
    is_active: true
  });
  
  // NEU v6.0: Firmen-Bundesland bearbeiten
  const [showCompanyStateModal, setShowCompanyStateModal] = useState(false);
  const [newCompanyStateCode, setNewCompanyStateCode] = useState('DE-NW');
  const [savingFzulEmployee, setSavingFzulEmployee] = useState(false);

  // FZul PDF-Archiv States
  const [fzulPdfs, setFzulPdfs] = useState<FzulPdfArchive[]>([]);
  const [loadingPdfs, setLoadingPdfs] = useState(false);

  // FZul Editor States
  const [fzulSelectedEmployee, setFzulSelectedEmployee] = useState<string | null>(null);
  const [fzulSelectedYear, setFzulSelectedYear] = useState<number>(new Date().getFullYear());
  const [fzulTimesheet, setFzulTimesheet] = useState<FzulTimesheet | null>(null);
  const [fzulProjectSummaries, setFzulProjectSummaries] = useState<FzulProjectSummary[]>([]);
  const [fzulLoading, setFzulLoading] = useState(false);
  const [fzulHasImportData, setFzulHasImportData] = useState(false);
  const [fzulEditModal, setFzulEditModal] = useState<{ date: string; data: FzulDayData } | null>(null);
  // NEU: Inline-Edit
  const [fzulEditingCell, setFzulEditingCell] = useState<string | null>(null); // dateStr der Zelle die gerade editiert wird
  const [fzulEditValue, setFzulEditValue] = useState<string>('');
  // NEU: Speicher-Feedback-Modal
  const [showSaveSuccessModal, setShowSaveSuccessModal] = useState(false);
  const [savingFzul, setSavingFzul] = useState(false);

  // ============================================
  // INITIALISIERUNG
  // ============================================

  useEffect(() => {
    checkAccess();
  }, []);

  useEffect(() => {
    if (hasAccess && profile) {
      loadSavedData();
    }
  }, [hasAccess, profile]);

  async function checkAccess() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('*, companies(id, name, state_code)')
        .eq('user_id', user.id)
        .single();

      if (!profileData) {
        setError('Profil nicht gefunden');
        setLoading(false);
        return;
      }

      console.log('[Import] Profil-E-Mail:', profileData.email);
      
      setProfile(profileData);
      
      const stateCode = (profileData.companies as any)?.state_code || 'DE-NW';
      setCompanyStateCode(stateCode);
      console.log('[Import] Bundesland:', stateCode);
      
      await loadHolidays(stateCode);
      
      setHasAccess(profileData.has_import_access || false);
      if (!profileData.has_import_access) {
        setError('Kein Zugang zu diesem Modul');
      }
    } catch (err) {
      console.error(err);
      setError('Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  }

  async function loadHolidays(stateCode: string) {
    try {
      const { data: holidaysData } = await supabase
        .from('public_holidays')
        .select('holiday_date, name, state_code, is_regional_only')
        .eq('country', 'DE')
        .gte('holiday_date', '2020-01-01')
        .lte('holiday_date', '2030-12-31');

      const filteredHolidays = (holidaysData || []).filter(h =>
        h.state_code === null || h.state_code === stateCode
      );

      const holidaySet = new Set<string>();
      for (const h of filteredHolidays) {
        holidaySet.add(h.holiday_date);
      }
      
      setHolidayDates(holidaySet);
      console.log('[Import] Feiertage geladen:', holidaySet.size);
    } catch (err) {
      console.error('[Import] Fehler beim Laden der Feiertage:', err);
    }
  }

  async function loadSavedData() {
    if (!profile) return;

    try {
      const { data: timesheets } = await supabase
        .from('imported_timesheets')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('employee_name')
        .order('project_name')
        .order('year')
        .order('month');

      setSavedTimesheets(timesheets || []);

      const { data: employees } = await supabase
        .from('import_employees')
        .select('*')
        .eq('company_id', profile.company_id);

      setSavedEmployees(employees || []);
      
      // NEU v6.0: FZul-Daten laden
      await loadFzulEmployees();
      await loadFzulPdfs();
    } catch (err) {
      console.error(err);
    }
  }

  // ============================================
  // NEU v6.0: FZUL MA-STAMMDATEN FUNKTIONEN
  // ============================================

  async function loadFzulEmployees() {
    if (!profile) return;
    
    setLoadingFzulEmployees(true);
    try {
      const { data, error } = await supabase
        .from('fzul_employee_settings')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('employee_name');

      if (error) throw error;
      setFzulEmployees(data || []);
    } catch (err) {
      console.error('Fehler beim Laden der FZul-MA-Daten:', err);
    } finally {
      setLoadingFzulEmployees(false);
    }
  }

  async function loadFzulPdfs() {
    if (!profile) return;
    
    setLoadingPdfs(true);
    try {
      const { data, error } = await supabase
        .from('fzul_pdf_archive')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('year', { ascending: false })
        .order('employee_name');

      if (error) throw error;
      setFzulPdfs(data || []);
    } catch (err) {
      console.error('Fehler beim Laden der FZul-PDFs:', err);
    } finally {
      setLoadingPdfs(false);
    }
  }

  function openNewFzulEmployeeModal() {
    setEditingFzulEmployee(null);
    setFzulEmployeeForm({
      employee_name: '',
      weekly_hours: 40,
      annual_leave_days: 30,
      position_title: '',
      notes: '',
      is_active: true
    });
    setShowFzulEmployeeModal(true);
  }

  function openEditFzulEmployeeModal(emp: FzulEmployeeSettings) {
    setEditingFzulEmployee(emp);
    setFzulEmployeeForm({
      employee_name: emp.employee_name,
      weekly_hours: emp.weekly_hours,
      annual_leave_days: emp.annual_leave_days,
      position_title: emp.position_title || '',
      notes: emp.notes || '',
      is_active: emp.is_active
    });
    setShowFzulEmployeeModal(true);
  }

  async function saveFzulEmployee() {
    if (!profile || !fzulEmployeeForm.employee_name.trim()) {
      setError('Bitte geben Sie einen Mitarbeiternamen ein');
      return;
    }

    setSavingFzulEmployee(true);
    try {
      if (editingFzulEmployee) {
        const { error } = await supabase
          .from('fzul_employee_settings')
          .update({
            employee_name: fzulEmployeeForm.employee_name.trim(),
            weekly_hours: fzulEmployeeForm.weekly_hours,
            annual_leave_days: fzulEmployeeForm.annual_leave_days,
            position_title: fzulEmployeeForm.position_title || null,
            notes: fzulEmployeeForm.notes || null,
            is_active: fzulEmployeeForm.is_active
          })
          .eq('id', editingFzulEmployee.id);

        if (error) throw error;
        setSuccess('Mitarbeiter aktualisiert');
      } else {
        const { error } = await supabase
          .from('fzul_employee_settings')
          .insert({
            company_id: profile.company_id,
            employee_name: fzulEmployeeForm.employee_name.trim(),
            weekly_hours: fzulEmployeeForm.weekly_hours,
            annual_leave_days: fzulEmployeeForm.annual_leave_days,
            federal_state: companyStateCode.replace('DE-', ''), // Firmen-Bundesland als Default
            position_title: fzulEmployeeForm.position_title || null,
            notes: fzulEmployeeForm.notes || null,
            is_active: fzulEmployeeForm.is_active
          });

        if (error) {
          if (error.code === '23505') {
            setError('Ein Mitarbeiter mit diesem Namen existiert bereits');
            return;
          }
          throw error;
        }
        setSuccess('Mitarbeiter angelegt');
      }

      setShowFzulEmployeeModal(false);
      await loadFzulEmployees();
    } catch (err) {
      console.error('Fehler beim Speichern:', err);
      setError('Fehler beim Speichern: ' + (err as Error).message);
    } finally {
      setSavingFzulEmployee(false);
    }
  }

  async function deleteFzulEmployee(emp: FzulEmployeeSettings) {
    if (!confirm(`Mitarbeiter "${emp.employee_name}" wirklich löschen?`)) return;

    try {
      const { error } = await supabase
        .from('fzul_employee_settings')
        .delete()
        .eq('id', emp.id);

      if (error) throw error;
      setSuccess('Mitarbeiter gelöscht');
      await loadFzulEmployees();
    } catch (err) {
      console.error('Fehler beim Löschen:', err);
      setError('Fehler beim Löschen: ' + (err as Error).message);
    }
  }

  async function importEmployeeNamesFromTimesheets() {
    if (!profile) return;

    const importedNames = [...new Set(savedTimesheets.map(ts => ts.employee_name))];
    const existingNames = fzulEmployees.map(e => e.employee_name);
    const newNames = importedNames.filter(name => !existingNames.includes(name));

    if (newNames.length === 0) {
      setSuccess('Alle Mitarbeiter sind bereits angelegt');
      return;
    }

    try {
      const { error } = await supabase
        .from('fzul_employee_settings')
        .insert(
          newNames.map(name => ({
            company_id: profile.company_id,
            employee_name: name,
            weekly_hours: 40,
            annual_leave_days: 30,
            federal_state: companyStateCode.replace('DE-', ''), // Firmen-Bundesland
            is_active: true
          }))
        );

      if (error) throw error;
      setSuccess(`${newNames.length} Mitarbeiter aus Import übernommen`);
      await loadFzulEmployees();
    } catch (err) {
      console.error('Fehler beim Importieren:', err);
      setError('Fehler beim Importieren: ' + (err as Error).message);
    }
  }

  // NEU v6.0: Firmen-Bundesland ändern
  async function saveCompanyState() {
    if (!profile) return;

    try {
      const { error } = await supabase
        .from('companies')
        .update({ state_code: newCompanyStateCode })
        .eq('id', profile.company_id);

      if (error) throw error;
      
      setCompanyStateCode(newCompanyStateCode);
      setImportStateCode(newCompanyStateCode);
      await loadHolidays(newCompanyStateCode);
      setShowCompanyStateModal(false);
      setSuccess('Firmen-Bundesland aktualisiert');
    } catch (err) {
      console.error('Fehler beim Speichern:', err);
      setError('Fehler beim Speichern: ' + (err as Error).message);
    }
  }

  function openCompanyStateModal() {
    setNewCompanyStateCode(companyStateCode);
    setShowCompanyStateModal(true);
  }

  // ============================================
  // FZUL EDITOR FUNKTIONEN (NEU v6.1)
  // ============================================

  // Prüfen ob Import-Daten für MA+Jahr vorhanden sind
  async function checkFzulImportData(employeeName: string, year: number) {
    if (!profile) return;
    
    const { data, error } = await supabase
      .from('imported_timesheets')
      .select('id, project_name, funding_reference, year, month')
      .eq('company_id', profile.company_id)
      .eq('employee_name', employeeName)
      .eq('year', year);
    
    if (error) {
      console.error('Fehler beim Prüfen der Import-Daten:', error);
      return;
    }
    
    setFzulHasImportData((data?.length || 0) > 0);
    
    // Projekt-Zusammenfassung erstellen
    if (data && data.length > 0) {
      const projectMap = new Map<string, FzulProjectSummary>();
      
      data.forEach(ts => {
        const key = ts.funding_reference || ts.project_name;
        if (!projectMap.has(key)) {
          projectMap.set(key, {
            project_id: key,
            project_name: ts.project_name,
            fkz: ts.funding_reference,
            total_hours: 0,
            month_range: '',
            months: []
          });
        }
        const summary = projectMap.get(key)!;
        if (!summary.months.includes(ts.month)) {
          summary.months.push(ts.month);
        }
      });
      
      // Monatsbereiche formatieren
      const summaries = Array.from(projectMap.values()).map(s => {
        s.months.sort((a, b) => a - b);
        const firstMonth = MONTH_SHORT[s.months[0] - 1];
        const lastMonth = MONTH_SHORT[s.months[s.months.length - 1] - 1];
        s.month_range = s.months.length === 1 ? firstMonth : `${firstMonth} - ${lastMonth}`;
        return s;
      });
      
      setFzulProjectSummaries(summaries);
    } else {
      setFzulProjectSummaries([]);
    }
  }

  // Hilfsfunktion: Typ des Tages ermitteln
  function getDayType(dateStr: string, holidays: Set<string>): 'workday' | 'weekend' | 'holiday' {
    const date = new Date(dateStr);
    const dayOfWeek = date.getDay();
    
    if (dayOfWeek === 0 || dayOfWeek === 6) return 'weekend';
    if (holidays.has(dateStr)) return 'holiday';
    return 'workday';
  }

  // Hilfsfunktion: Verfügbare Stunden pro Tag
  function getAvailableHours(dateStr: string, weeklyHours: number, holidays: Set<string>): number {
    const dayType = getDayType(dateStr, holidays);
    if (dayType !== 'workday') return 0;
    return weeklyHours / 5; // Tagesstunden aus Wochenstunden
  }

  // Feiertags-Namen ermitteln
  function getHolidayName(dateStr: string, holidays: Set<string>): string | undefined {
    if (!holidays.has(dateStr)) return undefined;
    // Vereinfacht - könnte erweitert werden für volle Namen
    return 'Feiertag';
  }

  // Daten aus Import laden und aggregieren
  async function loadFzulFromImport() {
    if (!profile || !fzulSelectedEmployee) return;
    
    setFzulLoading(true);
    try {
      // 1. MA-Stammdaten laden
      const employeeSettings = fzulEmployees.find(e => e.employee_name === fzulSelectedEmployee);
      const weeklyHours = employeeSettings?.weekly_hours || 40;
      const annualLeaveDays = employeeSettings?.annual_leave_days || 30;
      const positionTitle = employeeSettings?.position_title || '';
      
      // 2. Alle Import-Daten für MA + Jahr laden
      const { data: imports, error } = await supabase
        .from('imported_timesheets')
        .select('*')
        .eq('company_id', profile.company_id)
        .eq('employee_name', fzulSelectedEmployee)
        .eq('year', fzulSelectedYear);
      
      if (error) throw error;
      
      // 3. Feiertage für das Jahr berechnen
      const holidays = getGermanHolidays(fzulSelectedYear, companyStateCode);
      
      // 4. Tagesgenaue Daten aggregieren
      const dailyData: Record<string, FzulDayData> = {};
      const projectTotals: Record<string, { hours: number; name: string; fkz: string; months: Set<number> }> = {};
      
      // Erst alle Tage des Jahres initialisieren
      for (let month = 0; month < 12; month++) {
        const daysInMonth = new Date(fzulSelectedYear, month + 1, 0).getDate();
        for (let day = 1; day <= daysInMonth; day++) {
          const dateStr = `${fzulSelectedYear}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
          const dayType = getDayType(dateStr, holidays);
          
          dailyData[dateStr] = {
            available: getAvailableHours(dateStr, weeklyHours, holidays),
            projects: {},
            total_used: 0,
            free: getAvailableHours(dateStr, weeklyHours, holidays),
            type: dayType,
            holiday_name: dayType === 'holiday' ? getHolidayName(dateStr, holidays) : undefined
          };
        }
      }
      
      // 5. Import-Daten eintragen
      if (imports && imports.length > 0) {
        for (const imp of imports) {
          const projectKey = imp.funding_reference || imp.project_name;
          
          // Projekt-Totals tracken
          if (!projectTotals[projectKey]) {
            projectTotals[projectKey] = {
              hours: 0,
              name: imp.project_name,
              fkz: imp.funding_reference || '',
              months: new Set()
            };
          }
          projectTotals[projectKey].months.add(imp.month);
          
          // Tagesstunden aus daily_data extrahieren
          const monthStr = imp.month.toString().padStart(2, '0');
          
          if (imp.daily_data) {
            for (const [dayKey, dayData] of Object.entries(imp.daily_data)) {
              const dayNum = parseInt(dayKey);
              if (isNaN(dayNum) || dayNum < 1 || dayNum > 31) continue;
              
              const dateStr = `${fzulSelectedYear}-${monthStr}-${dayNum.toString().padStart(2, '0')}`;
              
              if (!dailyData[dateStr]) continue;
              
              const hours = (dayData as { hours: number; absence?: string }).hours || 0;
              const absence = (dayData as { hours: number; absence?: string }).absence;
              
              if (hours > 0) {
                // Projektstunden eintragen
                if (!dailyData[dateStr].projects[projectKey]) {
                  dailyData[dateStr].projects[projectKey] = { hours: 0, name: imp.project_name, fkz: imp.funding_reference };
                }
                dailyData[dateStr].projects[projectKey].hours += hours;
                dailyData[dateStr].total_used += hours;
                projectTotals[projectKey].hours += hours;
              }
              
              // Abwesenheit markieren
              if (absence) {
                if (absence === 'U' || absence.toLowerCase().includes('urlaub')) {
                  dailyData[dateStr].type = 'leave';
                } else if (absence === 'K' || absence.toLowerCase().includes('krank')) {
                  dailyData[dateStr].type = 'sick';
                } else if (absence !== 'F') {
                  dailyData[dateStr].type = 'other';
                  dailyData[dateStr].note = absence;
                }
              }
            }
          }
        }
      }
      
      // 6. Freie Stunden berechnen
      for (const dateStr in dailyData) {
        const day = dailyData[dateStr];
        day.free = Math.max(0, day.available - day.total_used);
      }
      
      // 7. Monatssummen berechnen
      const monthlySummaries: Record<string, { available: number; used: number; free: number; leave: number; sick: number }> = {};
      
      for (let month = 1; month <= 12; month++) {
        const monthStr = month.toString().padStart(2, '0');
        monthlySummaries[monthStr] = { available: 0, used: 0, free: 0, leave: 0, sick: 0 };
        
        const daysInMonth = new Date(fzulSelectedYear, month, 0).getDate();
        for (let day = 1; day <= daysInMonth; day++) {
          const dateStr = `${fzulSelectedYear}-${monthStr}-${day.toString().padStart(2, '0')}`;
          const dayData = dailyData[dateStr];
          if (!dayData) continue;
          
          monthlySummaries[monthStr].available += dayData.available;
          monthlySummaries[monthStr].used += dayData.total_used;
          monthlySummaries[monthStr].free += dayData.free;
          if (dayData.type === 'leave') monthlySummaries[monthStr].leave++;
          if (dayData.type === 'sick') monthlySummaries[monthStr].sick++;
        }
      }
      
      // 8. Projekt-Summaries aktualisieren
      const projectSummaries: FzulProjectSummary[] = Object.entries(projectTotals).map(([key, data]) => {
        const monthsArr = Array.from(data.months).sort((a, b) => a - b);
        const firstMonth = MONTH_SHORT[monthsArr[0] - 1];
        const lastMonth = MONTH_SHORT[monthsArr[monthsArr.length - 1] - 1];
        return {
          project_id: key,
          project_name: data.name,
          fkz: data.fkz,
          total_hours: data.hours,
          month_range: monthsArr.length === 1 ? firstMonth : `${firstMonth} - ${lastMonth}`,
          months: monthsArr
        };
      });
      setFzulProjectSummaries(projectSummaries);
      
      // 9. Timesheet erstellen
      const timesheet: FzulTimesheet = {
        company_id: profile.company_id,
        employee_name: fzulSelectedEmployee,
        year: fzulSelectedYear,
        daily_data: dailyData,
        monthly_summaries: monthlySummaries,
        source_projects: projectSummaries.map(p => ({
          id: p.project_id,
          name: p.project_name,
          fkz: p.fkz,
          hours: p.total_hours,
          months: p.month_range
        })),
        status: 'draft',
        // Editierbare Header-Felder (initial aus Projekten)
        project_title: projectSummaries.map(p => p.project_name).join('; '),
        project_fkz: projectSummaries.map(p => p.fkz).filter(Boolean).join('; '),
        position_title: positionTitle,
        // Jahresarbeitszeit-Berechnung initialisieren
        yearly_calculation: {
          weekly_hours: weeklyHours,
          vacation_days_contract: annualLeaveDays, // Aus MA-Stammdaten
          sick_days: Object.values(dailyData).filter(d => d.type === 'sick').length,
          special_leave_days: Object.values(dailyData).filter(d => d.type === 'other').length,
          holiday_count: holidays.size, // Direkt aus Feiertagstabelle (Set hat .size)
          short_time_days: 0, // Manuell einzutragen
          yearly_factor: 1.0  // Standard: volles Jahr
        }
      };
      
      setFzulTimesheet(timesheet);
      setSuccess(`Daten für ${fzulSelectedEmployee} (${fzulSelectedYear}) geladen`);
      
    } catch (err) {
      console.error('Fehler beim Laden der FZul-Daten:', err);
      setError('Fehler beim Laden: ' + (err as Error).message);
    } finally {
      setFzulLoading(false);
    }
  }

  // FZul Timesheet in Datenbank speichern
  async function saveFzulTimesheet() {
    if (!profile || !fzulTimesheet) return;
    
    setSavingFzul(true);
    try {
      console.log('Speichere FZul Timesheet:', {
        company_id: profile.company_id,
        employee_name: fzulTimesheet.employee_name,
        year: fzulTimesheet.year
      });
      
      const { data, error } = await supabase
        .from('fzul_timesheets')
        .upsert({
          company_id: profile.company_id,
          employee_name: fzulTimesheet.employee_name,
          year: fzulTimesheet.year,
          daily_data: fzulTimesheet.daily_data,
          monthly_summaries: fzulTimesheet.monthly_summaries,
          source_projects: fzulTimesheet.source_projects,
          yearly_calculation: fzulTimesheet.yearly_calculation,
          project_title: fzulTimesheet.project_title || '',
          project_fkz: fzulTimesheet.project_fkz || '',
          position_title: fzulTimesheet.position_title || '',
          status: fzulTimesheet.status,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'company_id,employee_name,year'
        })
        .select()
        .single();
      
      if (error) {
        console.error('Supabase Fehler:', JSON.stringify(error, null, 2));
        throw new Error(error.message || error.code || 'Unbekannter Datenbankfehler');
      }
      
      console.log('Gespeichert:', data);
      
      // MA-Stammdaten synchronisieren (Wochenstunden + Urlaubstage)
      const { error: employeeError } = await supabase
        .from('fzul_employee_settings')
        .update({
          weekly_hours: fzulTimesheet.yearly_calculation.weekly_hours,
          annual_leave_days: fzulTimesheet.yearly_calculation.vacation_days_contract,
          updated_at: new Date().toISOString()
        })
        .eq('company_id', profile.company_id)
        .eq('employee_name', fzulTimesheet.employee_name);
      
      if (employeeError) {
        console.warn('MA-Stammdaten konnten nicht aktualisiert werden:', employeeError);
      } else {
        // Lokalen State aktualisieren
        setFzulEmployees(prev => prev.map(emp => 
          emp.employee_name === fzulTimesheet.employee_name 
            ? { 
                ...emp, 
                weekly_hours: fzulTimesheet.yearly_calculation.weekly_hours,
                annual_leave_days: fzulTimesheet.yearly_calculation.vacation_days_contract,
                position_title: fzulTimesheet.position_title || emp.position_title
              }
            : emp
        ));
      }
      
      // Position auch in MA-Stammdaten speichern
      if (fzulTimesheet.position_title) {
        await supabase
          .from('fzul_employee_settings')
          .update({ position_title: fzulTimesheet.position_title })
          .eq('company_id', profile.company_id)
          .eq('employee_name', fzulTimesheet.employee_name);
      }
      
      setFzulTimesheet({ ...fzulTimesheet, id: data.id });
      setSavingFzul(false);
      setShowSaveSuccessModal(true); // Erfolgs-Modal anzeigen
    } catch (err: any) {
      console.error('Fehler beim Speichern (vollständig):', err);
      const errorMsg = err?.message || err?.code || JSON.stringify(err) || 'Unbekannter Fehler';
      setError('Fehler beim Speichern: ' + errorMsg);
      setSavingFzul(false);
    }
  }

  // Tag im Editor bearbeiten
  function openFzulDayEditor(dateStr: string) {
    if (!fzulTimesheet) return;
    const dayData = fzulTimesheet.daily_data[dateStr];
    if (!dayData) return;
    setFzulEditModal({ date: dateStr, data: { ...dayData } });
  }

  // NEU: Inline-Edit starten
  function startInlineEdit(dateStr: string) {
    if (!fzulTimesheet) return;
    const dayData = fzulTimesheet.daily_data[dateStr];
    if (!dayData || dayData.type === 'weekend' || dayData.type === 'holiday') return;
    
    setFzulEditingCell(dateStr);
    // Aktuellen Wert als String setzen (Komma für deutsche Notation)
    if (dayData.type === 'leave') {
      setFzulEditValue('U');
    } else if (dayData.type === 'sick') {
      setFzulEditValue('K');
    } else if (dayData.type === 'other') {
      setFzulEditValue('S');
    } else {
      // Dezimalstellen nur anzeigen wenn nötig
      setFzulEditValue(dayData.free % 1 === 0 ? dayData.free.toString() : dayData.free.toFixed(2).replace('.', ','));
    }
  }

  // NEU: Inline-Edit speichern
  function saveInlineEdit() {
    if (!fzulEditingCell || !fzulTimesheet) {
      setFzulEditingCell(null);
      return;
    }
    
    const value = fzulEditValue.trim().toUpperCase();
    const dayData = fzulTimesheet.daily_data[fzulEditingCell];
    if (!dayData) {
      setFzulEditingCell(null);
      return;
    }
    
    const updatedTimesheet = { ...fzulTimesheet };
    const updatedDay = { ...dayData, edited: true };
    
    if (value === 'U' || value === 'UR' || value === 'URLAUB') {
      updatedDay.type = 'leave';
      updatedDay.free = 0;
      updatedDay.total_used = 0;
    } else if (value === 'K' || value === 'KR' || value === 'KRANK') {
      updatedDay.type = 'sick';
      updatedDay.free = 0;
      updatedDay.total_used = 0;
    } else if (value === 'S' || value === 'A' || value === 'AB' || value === 'ABWESEND' || value === 'SONSTIGE') {
      updatedDay.type = 'other';
      updatedDay.free = 0;
      updatedDay.total_used = 0;
    } else {
      // Zahl = freie Stunden (keine Beschränkung, 2 Dezimalstellen)
      const numValue = parseFloat(value.replace(',', '.'));
      if (!isNaN(numValue) && numValue >= 0) {
        updatedDay.type = 'workday';
        updatedDay.free = Math.round(numValue * 100) / 100; // 2 Dezimalstellen
        updatedDay.total_used = Math.max(0, updatedDay.available - updatedDay.free);
      }
    }
    
    updatedTimesheet.daily_data[fzulEditingCell] = updatedDay;
    
    // Monatssummen aktualisieren
    const month = fzulEditingCell.slice(5, 7);
    const daysInMonth = new Date(fzulSelectedYear, parseInt(month), 0).getDate();
    updatedTimesheet.monthly_summaries[month] = { available: 0, used: 0, free: 0, leave: 0, sick: 0 };
    
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${fzulSelectedYear}-${month}-${d.toString().padStart(2, '0')}`;
      const dd = updatedTimesheet.daily_data[dateStr];
      if (!dd) continue;
      
      updatedTimesheet.monthly_summaries[month].available += dd.available;
      updatedTimesheet.monthly_summaries[month].used += dd.total_used;
      updatedTimesheet.monthly_summaries[month].free += dd.free;
      if (dd.type === 'leave') updatedTimesheet.monthly_summaries[month].leave++;
      if (dd.type === 'sick') updatedTimesheet.monthly_summaries[month].sick++;
    }
    
    // AUTOMATISCH: Krankheitstage und Sonderurlaub in yearly_calculation aktualisieren
    let totalSickDays = 0;
    let totalOtherDays = 0;
    Object.values(updatedTimesheet.daily_data).forEach(d => {
      if (d.type === 'sick') totalSickDays++;
      if (d.type === 'other') totalOtherDays++;
    });
    updatedTimesheet.yearly_calculation = {
      ...updatedTimesheet.yearly_calculation,
      sick_days: totalSickDays,
      special_leave_days: totalOtherDays
    };
    
    setFzulTimesheet(updatedTimesheet);
    setFzulEditingCell(null);
    setFzulEditValue('');
  }

  // NEU: Inline-Edit abbrechen
  function cancelInlineEdit() {
    setFzulEditingCell(null);
    setFzulEditValue('');
  }

  // NEU: Tastatur-Handler für Inline-Edit
  function handleInlineKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      saveInlineEdit();
    } else if (e.key === 'Escape') {
      cancelInlineEdit();
    }
  }

  function saveFzulDayEdit() {
    if (!fzulEditModal || !fzulTimesheet) return;
    
    const updatedTimesheet = { ...fzulTimesheet };
    updatedTimesheet.daily_data[fzulEditModal.date] = {
      ...fzulEditModal.data,
      edited: true
    };
    
    // Freie Stunden neu berechnen
    const day = updatedTimesheet.daily_data[fzulEditModal.date];
    day.free = Math.max(0, day.available - day.total_used);
    
    // Monatssummen aktualisieren
    const month = fzulEditModal.date.slice(5, 7);
    const daysInMonth = new Date(fzulSelectedYear, parseInt(month), 0).getDate();
    updatedTimesheet.monthly_summaries[month] = { available: 0, used: 0, free: 0, leave: 0, sick: 0 };
    
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${fzulSelectedYear}-${month}-${d.toString().padStart(2, '0')}`;
      const dayData = updatedTimesheet.daily_data[dateStr];
      if (!dayData) continue;
      
      updatedTimesheet.monthly_summaries[month].available += dayData.available;
      updatedTimesheet.monthly_summaries[month].used += dayData.total_used;
      updatedTimesheet.monthly_summaries[month].free += dayData.free;
      if (dayData.type === 'leave') updatedTimesheet.monthly_summaries[month].leave++;
      if (dayData.type === 'sick') updatedTimesheet.monthly_summaries[month].sick++;
    }
    
    setFzulTimesheet(updatedTimesheet);
    setFzulEditModal(null);
  }

  // Effect: Bei MA/Jahr-Änderung Import-Daten prüfen
  useEffect(() => {
    if (fzulSelectedEmployee && fzulSelectedYear) {
      checkFzulImportData(fzulSelectedEmployee, fzulSelectedYear);
      setFzulTimesheet(null); // Reset bei Wechsel
    }
  }, [fzulSelectedEmployee, fzulSelectedYear]);

  // ============================================
  // BERECHTIGUNGS-FUNKTIONEN
  // ============================================

  async function loadAdminUsers() {
    if (!profile) return;
    
    setLoadingAdmins(true);
    try {
      const { data: admins, error: adminsError } = await supabase
        .from('user_profiles')
        .select('id, name, email, has_import_access')
        .eq('company_id', profile.company_id)
        .eq('role', 'admin')
        .eq('is_active', true)
        .order('name');

      if (adminsError) throw adminsError;

      setAdminUsers(admins?.map((a: { id: string; name?: string; email: string; has_import_access?: boolean }) => ({
        id: a.id,
        name: a.name || a.email,
        email: a.email,
        has_import_access: a.has_import_access || false
      })) || []);
    } catch (err) {
      console.error('Fehler beim Laden der Admins:', err);
      setError('Fehler beim Laden der Benutzer');
    } finally {
      setLoadingAdmins(false);
    }
  }

  function toggleAdminAccess(adminId: string) {
    setAdminUsers(prev => prev.map(admin => 
      admin.id === adminId 
        ? { ...admin, has_import_access: !admin.has_import_access }
        : admin
    ));
  }

  async function saveAccessChanges() {
    setSavingAccess(true);
    try {
      for (const admin of adminUsers) {
        await supabase
          .from('user_profiles')
          .update({ has_import_access: admin.has_import_access })
          .eq('id', admin.id);
      }

      setSuccess('Berechtigungen gespeichert');
      setShowAccessModal(false);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Fehler beim Speichern:', err);
      setError('Fehler beim Speichern der Berechtigungen');
    } finally {
      setSavingAccess(false);
    }
  }

  function openAccessModal() {
    setShowAccessModal(true);
    loadAdminUsers();
  }

  // ============================================
  // HILFSFUNKTIONEN
  // ============================================

  const projects = [...new Set(savedTimesheets.map(ts => ts.project_name))].sort();
  const employees = [...new Set(savedTimesheets.map(ts => ts.employee_name))].sort();

  const getProjectTimesheets = (projectName: string) => 
    savedTimesheets.filter(ts => ts.project_name === projectName);

  const getEmployeeTimesheets = (employeeName: string) =>
    savedTimesheets.filter(ts => ts.employee_name === employeeName);

  const getAvailableYears = (employeeName: string): number[] => {
    const timesheets = getEmployeeTimesheets(employeeName);
    const years = [...new Set(timesheets.map(ts => ts.year))].sort((a, b) => a - b);
    return years;
  };

  const getEmployeeSettings = (name: string) =>
    savedEmployees.find(e => e.name === name) || {
      weekly_hours: defaultWeeklyHours,
      annual_leave_days: defaultAnnualLeave
    };

  const getMaxMonthlyHours = (weeklyHours: number) => (weeklyHours * 52) / 12;
  const getDaysInMonth = (year: number, month: number) => new Date(year, month, 0).getDate();

  // ============================================
  // DEUTSCHE FEIERTAGE (bundesweit)
  // ============================================
  
  const getEasterSunday = (year: number): Date => {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(year, month - 1, day);
  };
  
  const getGermanHolidays = (year: number, stateCode?: string): Set<string> => {
    const state = stateCode || companyStateCode || 'DE-NW';
    const holidays = new Set<string>();
    const easter = getEasterSunday(year);
    
    const formatDate = (d: Date): string => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };
    
    const addDays = (d: Date, days: number): string => {
      const r = new Date(d);
      r.setDate(d.getDate() + days);
      return formatDate(r);
    };
    
    // Bundesweite Feiertage
    holidays.add(`${year}-01-01`);
    holidays.add(addDays(easter, -2));
    holidays.add(addDays(easter, 1));
    holidays.add(`${year}-05-01`);
    holidays.add(addDays(easter, 39));
    holidays.add(addDays(easter, 50));
    holidays.add(`${year}-10-03`);
    holidays.add(`${year}-12-25`);
    holidays.add(`${year}-12-26`);
    
    // Landesspezifische Feiertage
    if (['DE-BW', 'DE-BY', 'DE-ST'].includes(state)) holidays.add(`${year}-01-06`);
    if (['DE-BE', 'DE-MV'].includes(state)) holidays.add(`${year}-03-08`);
    if (['DE-BW', 'DE-BY', 'DE-HE', 'DE-NW', 'DE-RP', 'DE-SL'].includes(state)) holidays.add(addDays(easter, 60));
    if (['DE-SL'].includes(state)) holidays.add(`${year}-08-15`);
    if (['DE-TH'].includes(state)) holidays.add(`${year}-09-20`);
    if (['DE-BB', 'DE-HB', 'DE-HH', 'DE-MV', 'DE-NI', 'DE-SN', 'DE-ST', 'DE-SH', 'DE-TH'].includes(state)) holidays.add(`${year}-10-31`);
    if (['DE-BW', 'DE-BY', 'DE-NW', 'DE-RP', 'DE-SL'].includes(state)) holidays.add(`${year}-11-01`);
    if (['DE-SN'].includes(state)) {
      const nov23 = new Date(year, 10, 23);
      const dayOfWeek = nov23.getDay();
      const daysBack = (dayOfWeek + 7 - 3) % 7;
      const bussUndBettag = new Date(nov23);
      bussUndBettag.setDate(nov23.getDate() - (daysBack === 0 ? 7 : daysBack));
      holidays.add(formatDate(bussUndBettag));
    }
    
    return holidays;
  };
  
  const isHoliday = (year: number, month: number, day: number): boolean => {
    const holidays = getGermanHolidays(year);
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return holidays.has(dateStr);
  };

  // ============================================
  // FZul Excel Export (via API für Formatierung)
  // ============================================
  
  const exportFzulExcel = async (
    empName: string, 
    year: number, 
    empTimesheets: ImportedTimesheet[],
    settings: { weekly_hours: number; annual_leave_days: number }
  ) => {
    const dayData: Record<number, Record<number, { hours: number; absence: string | null }>> = {};
    for (let m = 1; m <= 12; m++) {
      dayData[m] = {};
      for (let d = 1; d <= 31; d++) {
        dayData[m][d] = { hours: 0, absence: null };
      }
    }
    
    for (const ts of empTimesheets) {
      const daily = ts.daily_data || {};
      for (const [dayStr, data] of Object.entries(daily)) {
        const day = parseInt(dayStr);
        if (day >= 1 && day <= 31 && dayData[ts.month]) {
          if (typeof data === 'object' && data !== null) {
            if ((data as { hours?: number }).hours) dayData[ts.month][day].hours = (data as { hours: number }).hours;
            if ((data as { absence?: string }).absence) dayData[ts.month][day].absence = (data as { absence: string }).absence;
          }
        }
      }
    }
    
    const yearHolidays = getGermanHolidays(year);
    const holidaysArray = Array.from(yearHolidays);
    
    try {
      const response = await fetch('/api/export/fzul', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empName, year, dayData, settings, holidays: holidaysArray })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Export fehlgeschlagen');
      }
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      const contentDisposition = response.headers.get('Content-Disposition');
      let fileName = `FZul_Export_${year}.xlsx`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match) fileName = match[1];
      }
      
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      console.log('[Export] FZul Excel erfolgreich exportiert');
      
    } catch (error) {
      console.error('[Export] Fehler:', error);
      alert('Export fehlgeschlagen: ' + (error instanceof Error ? error.message : 'Unbekannter Fehler'));
    }
  };

  // ============================================
  // FORMAT-ERKENNUNG
  // ============================================

  function detectFormat(wb: XLSX.WorkBook): FundingFormat {
    if (wb.SheetNames.includes('Nav')) {
      const navSheet = wb.Sheets['Nav'];
      const fkzCell = navSheet['B6']?.v?.toString() || '';
      if (fkzCell.match(/^01[A-Z]{2}\d/)) return 'BMBF_KMU';
    }
    if (wb.SheetNames.includes('AP Übersicht')) return 'ZIM';
    for (const sheetName of wb.SheetNames) {
      const ws = wb.Sheets[sheetName];
      for (let row = 1; row <= 50; row++) {
        const cellA = ws[XLSX.utils.encode_cell({ r: row - 1, c: 0 })]?.v?.toString() || '';
        if (cellA.match(/^AP\s?\d/i)) return 'ZIM';
      }
    }
    for (const sheetName of wb.SheetNames) {
      const ws = wb.Sheets[sheetName];
      for (const cellRef of Object.keys(ws)) {
        if (cellRef.startsWith('!')) continue;
        const val = ws[cellRef]?.v?.toString() || '';
        if (val.match(/16K[NI]\d{5,6}/)) return 'ZIM';
        if (val.match(/01[A-Z]{2}\d{4,6}[A-Z]?/)) return 'BMBF_KMU';
      }
    }
    return 'UNKNOWN';
  }

  // ============================================
  // EXCEL VERARBEITUNG
  // ============================================

  const handleDragEnter = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); }, []);
  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); }, []);
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) handleFile(files[0]);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) handleFile(e.target.files[0]);
  };

  async function handleFile(file: File) {
    setError('');
    setProcessing(true);
    setSelectedFormat(null);

    if (!file.name.match(/\.xlsx?$/i)) {
      setError('Bitte nur Excel-Dateien (.xlsx) hochladen');
      setProcessing(false);
      return;
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const wb = XLSX.read(arrayBuffer, { type: 'array' });
      const detectedFormat = detectFormat(wb);
      setSelectedFormat(detectedFormat);
      const info = extractProjectInfo(wb, file.name, detectedFormat);
      setProjectInfo(info);
      const sheets = findEmployeeSheets(wb, detectedFormat);
      setEmployeeSheets(sheets);

      if (sheets.length === 0) {
        setError('Keine Mitarbeiter-Blätter gefunden (Format: "[Name] J1-J4")');
        setProcessing(false);
        return;
      }

      const extracted: ExtractedEmployee[] = [];
      for (const sheet of sheets) {
        const data = extractEmployeeData(wb, sheet, info, detectedFormat);
        if (data) extracted.push({ ...data, imported: false });
      }

      setExtractedData(extracted);
      setWorkbook(wb);
      setImportStep('preview');
    } catch (err) {
      console.error(err);
      setError('Excel konnte nicht gelesen werden');
    } finally {
      setProcessing(false);
    }
  }

  // ============================================
  // PROJEKT-INFO EXTRAHIEREN
  // ============================================

  function extractProjectInfo(wb: XLSX.WorkBook, fileName: string, format: FundingFormat): ProjectInfo {
    let projectName = '', companyName = '', fundingReference = '';

    if (format === 'BMBF_KMU' && wb.SheetNames.includes('Nav')) {
      const navWs = wb.Sheets['Nav'];
      projectName = navWs['B4']?.v?.toString() || '';
      fundingReference = navWs['B6']?.v?.toString() || '';
      companyName = navWs['B7']?.v?.toString() || '';
    } else if (wb.SheetNames.includes('AP Übersicht')) {
      const ws = wb.Sheets['AP Übersicht'];
      projectName = ws['B1']?.v?.toString() || '';
      fundingReference = ws['C2']?.v?.toString() || '';
      companyName = ws['B2']?.v?.toString() || '';
    }

    if (!projectName || !companyName) {
      const parts = fileName.replace(/\.xlsx?$/i, '').split('_');
      if (!projectName && parts[1]) projectName = parts[1];
      if (!companyName && parts[2]) companyName = parts[2];
    }

    if (!fundingReference) {
      const fkzPatterns = [/16K[NI]\d{5,6}/, /01[A-Z]{2}\d{4,6}[A-Z]?/];
      outer: for (const sheetName of wb.SheetNames) {
        const ws = wb.Sheets[sheetName];
        for (const cellRef of Object.keys(ws)) {
          if (cellRef.startsWith('!')) continue;
          const val = String(ws[cellRef]?.v || '');
          for (const pattern of fkzPatterns) {
            const match = val.match(pattern);
            if (match) { fundingReference = match[0]; break outer; }
          }
        }
      }
    }
    return { projectName, companyName, fundingReference, fileName, format };
  }

  // ============================================
  // MITARBEITER-SHEETS FINDEN
  // ============================================

  function findEmployeeSheets(wb: XLSX.WorkBook, format: FundingFormat): EmployeeSheet[] {
    const sheets: EmployeeSheet[] = [];
    const pattern = /^(.+)\s+J([1-4])$/;
    const tempSheets: { sheetName: string; baseName: string; projectYear: number }[] = [];

    for (const sheetName of wb.SheetNames) {
      const match = sheetName.match(pattern);
      if (match) {
        const baseName = match[1].trim();
        if (SHEET_BLACKLIST_PATTERN.test(baseName)) continue;
        tempSheets.push({ sheetName, baseName, projectYear: parseInt(match[2]) });
      }
    }

    const nameCache = new Map<string, string>();
    tempSheets.sort((a, b) => a.projectYear - b.projectYear);

    for (const temp of tempSheets) {
      const normalizedBase = temp.baseName.toLowerCase().replace(/\s+/g, "");
      let fullName: string | undefined = nameCache.get(normalizedBase);
      
      if (!fullName) {
        fullName = temp.baseName;
        const ws = wb.Sheets[temp.sheetName];

        if (format === 'BMBF_KMU') {
          const nameCell = ws[XLSX.utils.encode_cell({ r: 10, c: 9 })]?.v?.toString() || '';
          if (nameCell && !nameCell.includes('[') && nameCell.length > 2) fullName = nameCell.trim();
        } else {
          for (const cellRef of Object.keys(ws)) {
            if (cellRef.startsWith('!')) continue;
            const val = ws[cellRef]?.v?.toString() || '';
            if (val.includes(',') && val.split(',').length === 2) {
              const parts = val.split(',');
              const baseNameParts = temp.baseName.split(',').map((p: string) => p.trim().toLowerCase());
              const foundNameParts = parts.map((p: string) => p.trim().toLowerCase());
              const nachnameMatch = foundNameParts[0] === baseNameParts[0];
              const vornameMatch = baseNameParts.length < 2 || foundNameParts.length < 2 || foundNameParts[1].startsWith(baseNameParts[1]);
              if (nachnameMatch && vornameMatch) { fullName = val.trim(); break; }
            }
          }
        }
        nameCache.set(normalizedBase, fullName || temp.baseName);
      }

      sheets.push({ sheetName: temp.sheetName, employeeName: fullName || temp.baseName, projectYear: temp.projectYear, selected: true });
    }

    return sheets.sort((a, b) => a.employeeName.localeCompare(b.employeeName) || a.projectYear - b.projectYear);
  }

  // ============================================
  // MITARBEITER-DATEN EXTRAHIEREN
  // ============================================

  function extractEmployeeData(wb: XLSX.WorkBook, sheet: EmployeeSheet, info: ProjectInfo, format: FundingFormat): Omit<ExtractedEmployee, 'imported'> | null {
    if (format === 'BMBF_KMU') return extractBMBFData(wb, sheet, info);
    return extractZIMData(wb, sheet, info);
  }

  // ============================================
  // BMBF/KMU-INNOVATIV PARSER
  // ============================================

  function extractBMBFData(wb: XLSX.WorkBook, sheet: EmployeeSheet, info: ProjectInfo): Omit<ExtractedEmployee, 'imported'> | null {
    const maWs = wb.Sheets[sheet.sheetName];
    if (!maWs) return null;

    const months: MonthData[] = [];
    let totalBillable = 0, totalAbsence = 0;

    function excelDateToYearMonth(excelDate: number): { year: number; month: number } {
      const date = new Date((excelDate - 25569) * 86400 * 1000);
      return { year: date.getFullYear(), month: date.getMonth() + 1 };
    }

    function parseMonthFromText(text: string): { year: number; month: number } | null {
      const slashMatch = text.match(/(\d{1,2})\s*\/\s*(\d{4})/);
      if (slashMatch) return { month: parseInt(slashMatch[1]), year: parseInt(slashMatch[2]) };
      
      const monthNames: Record<string, number> = {
        'januar': 1, 'februar': 2, 'märz': 3, 'april': 4, 'mai': 5, 'juni': 6,
        'juli': 7, 'august': 8, 'september': 9, 'oktober': 10, 'november': 11, 'dezember': 12
      };
      const textLower = text.toLowerCase();
      for (const [name, num] of Object.entries(monthNames)) {
        if (textLower.includes(name)) {
          const yearMatch = text.match(/(\d{4})/);
          if (yearMatch) return { month: num, year: parseInt(yearMatch[1]) };
        }
      }
      return null;
    }

    const vorhabenbezogenRows: number[] = [];
    const range = XLSX.utils.decode_range(maWs['!ref'] || 'A1:AG500');
    
    for (let r = range.s.r; r <= range.e.r; r++) {
      const cellA = maWs[XLSX.utils.encode_cell({ r, c: 0 })];
      const cellVal = cellA?.v?.toString().trim().toLowerCase() || '';
      if (cellVal === 'vorhabenbezogen') vorhabenbezogenRows.push(r);
    }

    for (const projectRow of vorhabenbezogenRows) {
      const absenceRow = projectRow + 4;
      const dateRow = projectRow - 6;

      let year = 2020 + sheet.projectYear - 1;
      let month = 1;

      const dateCell = maWs[XLSX.utils.encode_cell({ r: dateRow, c: 0 })];
      if (dateCell?.v) {
        if (typeof dateCell.v === 'number') {
          const parsed = excelDateToYearMonth(dateCell.v);
          if (parsed.year >= 2015 && parsed.year <= 2030) { year = parsed.year; month = parsed.month; }
        } else if (typeof dateCell.v === 'string') {
          const parsed = parseMonthFromText(dateCell.v);
          if (parsed) { year = parsed.year; month = parsed.month; }
        }
      }

      const dailyData: MonthData['dailyData'] = {};
      let monthHours = 0, monthAbsence = 0;

      for (let d = 1; d <= 31; d++) {
        const colIndex = d;
        const hourCell = maWs[XLSX.utils.encode_cell({ r: projectRow, c: colIndex })];
        if (hourCell?.v !== undefined && hourCell?.v !== null) {
          const cellVal = hourCell.v;
          if (typeof cellVal === 'number' && cellVal > 0) {
            dailyData[d] = { hours: cellVal, absence: null };
            monthHours += cellVal;
          } else if (typeof cellVal === 'string') {
            const parsed = parseFloat(cellVal.replace(',', '.'));
            if (!isNaN(parsed) && parsed > 0) {
              dailyData[d] = { hours: parsed, absence: null };
              monthHours += parsed;
            }
          }
        }

        const absenceCell = maWs[XLSX.utils.encode_cell({ r: absenceRow, c: colIndex })];
        if (absenceCell?.v !== undefined && absenceCell?.v !== null) {
          const absVal = absenceCell.v;
          if (typeof absVal === 'number' && absVal >= 4) {
            if (!dailyData[d] || dailyData[d].hours === 0) dailyData[d] = { hours: 0, absence: 'F' };
            monthAbsence += absVal;
          } else if (typeof absVal === 'string') {
            const code = absVal.toUpperCase().trim();
            if (['U', 'K', 'KA', 'S', 'F'].includes(code)) {
              dailyData[d] = { hours: 0, absence: code };
              monthAbsence += 8;
            }
          }
        }
      }

      const sumCell = maWs[XLSX.utils.encode_cell({ r: projectRow, c: 32 })];
      const excelSum = (sumCell?.v && typeof sumCell.v === 'number') ? sumCell.v : 0;
      if (monthHours === 0 && excelSum > 0) monthHours = excelSum;

      months.push({ month, year, billableHours: monthHours, absenceHours: monthAbsence, dailyData });
      totalBillable += monthHours;
      totalAbsence += monthAbsence;
    }

    return { employeeName: sheet.employeeName, projectYear: sheet.projectYear, months, totalBillableHours: totalBillable, totalAbsenceHours: totalAbsence };
  }

  // ============================================
  // ZIM PARSER
  // ============================================

  function extractZIMData(wb: XLSX.WorkBook, sheet: EmployeeSheet, info: ProjectInfo): Omit<ExtractedEmployee, 'imported'> | null {
    const summarySheet = `Ermittl.-Stunden J${sheet.projectYear}`;
    const summaryWs = wb.Sheets[summarySheet];
    const maWs = wb.Sheets[sheet.sheetName];
    
    const months: MonthData[] = [];
    let totalBillable = 0, totalAbsence = 0;
    const year = new Date().getFullYear();

    const extractDailyDataFromSheet = (ws: XLSX.WorkSheet, monthIndex: number): MonthData['dailyData'] => {
      const dailyData: MonthData['dailyData'] = {};
      if (!ws) return dailyData;
      
      const sumRowIndex = 31 + (monthIndex * 43);
      for (let d = 1; d <= 31; d++) {
        const dayColIndex = 3 + d;
        const dayCell = ws[XLSX.utils.encode_cell({ r: sumRowIndex, c: dayColIndex })];
        if (dayCell?.v !== undefined && dayCell?.v !== null) {
          const val = dayCell.v;
          if (typeof val === 'number' && val > 0) dailyData[d] = { hours: val, absence: null };
        }
      }
      
      if (Object.keys(dailyData).length === 0) {
        const apStartRow = 19 + (monthIndex * 43);
        const apEndRow = 30 + (monthIndex * 43);
        for (let d = 1; d <= 31; d++) {
          const dayColIndex = 3 + d;
          let dayTotal = 0;
          for (let apRow = apStartRow; apRow <= apEndRow; apRow++) {
            const apCell = ws[XLSX.utils.encode_cell({ r: apRow, c: dayColIndex })];
            if (apCell?.v && typeof apCell.v === 'number') dayTotal += apCell.v;
          }
          if (dayTotal > 0) dailyData[d] = { hours: dayTotal, absence: null };
        }
      }
      
      const urlaubRowIndex = 34 + (monthIndex * 43);
      const krankRowIndex = 35 + (monthIndex * 43);
      for (let d = 1; d <= 31; d++) {
        const dayColIndex = 3 + d;
        const urlaubCell = ws[XLSX.utils.encode_cell({ r: urlaubRowIndex, c: dayColIndex })];
        if (urlaubCell?.v) {
          const uVal = urlaubCell.v;
          if (uVal === 8 || String(uVal).toUpperCase().trim() === 'U') { dailyData[d] = { hours: 0, absence: 'U' }; continue; }
        }
        const krankCell = ws[XLSX.utils.encode_cell({ r: krankRowIndex, c: dayColIndex })];
        if (krankCell?.v) {
          const kVal = krankCell.v;
          if (kVal === 8 || String(kVal).toUpperCase().trim() === 'K') { dailyData[d] = { hours: 0, absence: 'K' }; continue; }
        }
      }
      return dailyData;
    };

    if (summaryWs && maWs) {
      let row = -1;
      for (let r = 1; r <= 100; r++) {
        const cell = summaryWs[XLSX.utils.encode_cell({ r: r - 1, c: 0 })];
        if (cell?.v?.toString().includes(sheet.employeeName.split(',')[0])) { row = r; break; }
      }

      if (row > 0) {
        for (let m = 1; m <= 12; m++) {
          const hoursCell = summaryWs[XLSX.utils.encode_cell({ r: row, c: m })];
          const hours = typeof hoursCell?.v === 'number' ? hoursCell.v : 0;
          const absenceCell = summaryWs[XLSX.utils.encode_cell({ r: row + 3, c: m })];
          const absence = typeof absenceCell?.v === 'number' ? absenceCell.v : 0;
          const dailyData = extractDailyDataFromSheet(maWs, m - 1);
          
          if (Object.keys(dailyData).length === 0 && hours > 0) {
            const daysInMonth = new Date(year, m, 0).getDate();
            let workDays = 0;
            for (let d = 1; d <= daysInMonth; d++) {
              const date = new Date(year, m - 1, d);
              if (date.getDay() !== 0 && date.getDay() !== 6) workDays++;
            }
            if (workDays > 0) {
              const hoursPerDay = hours / workDays;
              for (let d = 1; d <= daysInMonth; d++) {
                const date = new Date(year, m - 1, d);
                if (date.getDay() !== 0 && date.getDay() !== 6) dailyData[d] = { hours: Math.round(hoursPerDay * 10) / 10, absence: null };
              }
            }
          }

          months.push({ month: m, year, billableHours: hours, absenceHours: absence, dailyData });
          totalBillable += hours;
          totalAbsence += absence;
        }
      }
    }

    if (months.length === 0 && maWs) {
      for (let m = 0; m < 12; m++) {
        const sumRowIndex = 31 + (m * 43);
        const sumCell = maWs[XLSX.utils.encode_cell({ r: sumRowIndex, c: 35 })];
        const hours = typeof sumCell?.v === 'number' ? sumCell.v : 0;
        const dailyData = extractDailyDataFromSheet(maWs, m);
        
        if (Object.keys(dailyData).length === 0 && hours > 0) {
          const daysInMonth = new Date(year, m + 1, 0).getDate();
          let workDays = 0;
          for (let d = 1; d <= daysInMonth; d++) {
            const date = new Date(year, m, d);
            if (date.getDay() !== 0 && date.getDay() !== 6) workDays++;
          }
          if (workDays > 0) {
            const hoursPerDay = hours / workDays;
            for (let d = 1; d <= daysInMonth; d++) {
              const date = new Date(year, m, d);
              if (date.getDay() !== 0 && date.getDay() !== 6) dailyData[d] = { hours: Math.round(hoursPerDay * 10) / 10, absence: null };
            }
          }
        }

        months.push({ month: m + 1, year, billableHours: hours, absenceHours: 0, dailyData });
        totalBillable += hours;
      }
    }

    return { employeeName: sheet.employeeName, projectYear: sheet.projectYear, months, totalBillableHours: totalBillable, totalAbsenceHours: totalAbsence };
  }

  function reprocessWithFormat(newFormat: FundingFormat) {
    if (!workbook || !projectInfo) return;
    setProcessing(true);
    setSelectedFormat(newFormat);
    try {
      const info = extractProjectInfo(workbook, projectInfo.fileName, newFormat);
      setProjectInfo(info);
      const sheets = findEmployeeSheets(workbook, newFormat);
      setEmployeeSheets(sheets);
      const extracted: ExtractedEmployee[] = [];
      for (const sheet of sheets) {
        const data = extractEmployeeData(workbook, sheet, info, newFormat);
        if (data) extracted.push({ ...data, imported: false });
      }
      setExtractedData(extracted);
    } catch (err) {
      console.error(err);
      setError('Fehler beim Neuverarbeiten');
    } finally {
      setProcessing(false);
    }
  }

  // ============================================
  // IMPORT (ALLE MA AUF EINMAL)
  // ============================================

  async function importAllEmployees() {
    if (!profile || !projectInfo || extractedData.length === 0) return;

    setProcessing(true);
    setError('');

    try {
      let importCount = 0;
      let baseCalendarYear: number | null = null;
      let baseProjectYear: number | null = null;
      
      for (const emp of extractedData) {
        for (const month of emp.months) {
          if (month.year && month.billableHours > 0) {
            if (!baseCalendarYear) { baseCalendarYear = month.year; baseProjectYear = emp.projectYear; }
            break;
          }
        }
        if (baseCalendarYear) break;
      }
      
      if (!baseCalendarYear) { baseCalendarYear = new Date().getFullYear(); baseProjectYear = 1; }

      for (const emp of extractedData) {
        await supabase.from('import_employees').upsert({
          company_id: profile.company_id,
          name: emp.employeeName,
          weekly_hours: defaultWeeklyHours,
          annual_leave_days: defaultAnnualLeave,
          updated_at: new Date().toISOString()
        }, { onConflict: 'company_id,name' });

        const yearOffset = emp.projectYear - (baseProjectYear || 1);
        const calendarYear = (baseCalendarYear || new Date().getFullYear()) + yearOffset;

        const monthsMap = new Map<number, typeof emp.months[0]>();
        for (const month of emp.months) monthsMap.set(month.month, month);
        
        for (let m = 1; m <= 12; m++) {
          const existingMonth = monthsMap.get(m);
          await supabase.from('imported_timesheets').upsert({
            company_id: profile.company_id,
            uploaded_by: profile.id,
            employee_name: emp.employeeName,
            project_name: projectInfo.projectName,
            funding_reference: projectInfo.fundingReference,
            year: existingMonth?.year || calendarYear,
            month: m,
            daily_data: existingMonth?.dailyData || {},
            total_billable_hours: existingMonth?.billableHours || 0,
            total_absence_days: Math.round((existingMonth?.absenceHours || 0) / 8),
            original_filename: projectInfo.fileName,
          }, { onConflict: 'company_id,employee_name,project_name,year,month' });
        }
        importCount++;
      }

      setSuccess(`${importCount} Mitarbeiter erfolgreich importiert (je 12 Monate)!`);
      setImportStep('done');
      loadSavedData();
    } catch (err) {
      console.error(err);
      setError('Import fehlgeschlagen');
    } finally {
      setProcessing(false);
    }
  }

  // ============================================
  // LÖSCHEN
  // ============================================

  async function handleDelete() {
    if (!showDeleteConfirm || !profile) return;

    try {
      if (showDeleteConfirm.type === 'timesheet' && showDeleteConfirm.id) {
        await supabase.from('imported_timesheets').delete().eq('id', showDeleteConfirm.id);
      } else if (showDeleteConfirm.type === 'project' && showDeleteConfirm.projectName) {
        await supabase.from('imported_timesheets').delete()
          .eq('company_id', profile.company_id)
          .eq('project_name', showDeleteConfirm.projectName);
      } else if (showDeleteConfirm.type === 'employee' && showDeleteConfirm.employeeName) {
        await supabase.from('imported_timesheets').delete()
          .eq('company_id', profile.company_id)
          .eq('employee_name', showDeleteConfirm.employeeName);
        await supabase.from('import_employees').delete()
          .eq('company_id', profile.company_id)
          .eq('name', showDeleteConfirm.employeeName);
      }

      setSuccess('Gelöscht');
      setShowDeleteConfirm(null);
      setSelectedProject(null);
      setSelectedEmployee(null);
      loadSavedData();
    } catch (err) {
      console.error(err);
      setError('Löschen fehlgeschlagen');
    }
  }

  // ============================================
  // STAMMDATEN SPEICHERN
  // ============================================

  async function saveEmployeeSettings() {
    if (!editingEmployee || !profile) return;

    try {
      await supabase.from('import_employees').upsert({
        ...editingEmployee,
        company_id: profile.company_id,
        updated_at: new Date().toISOString()
      });

      setSuccess('Gespeichert');
      setEditingEmployee(null);
      loadSavedData();
    } catch (err) {
      console.error(err);
      setError('Speichern fehlgeschlagen');
    }
  }

  // ============================================
  // RENDER: LOADING / KEIN ZUGANG
  // ============================================

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <span className="text-4xl">🔒</span>
            <h2 className="text-xl font-bold text-red-800 mt-4">Kein Zugang</h2>
            <p className="text-gray-600 mt-2">Sie haben keine Berechtigung für das Analyse-Modul.</p>
            <p className="text-gray-500 text-sm mt-4">Bitten Sie einen Administrator mit Analyse-Berechtigung, Ihnen Zugang zu gewähren.</p>
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER: PROJEKT-DETAIL
  // ============================================

  const renderProjectDetail = () => {
    if (!selectedProject) return null;

    const allTimesheets = getProjectTimesheets(selectedProject);
    const allEmployeeNames = [...new Set(allTimesheets.map(ts => ts.employee_name))];
    const fkz = allTimesheets[0]?.funding_reference || '';
    
    const availableYears = [...new Set(allTimesheets.map(ts => ts.year))].sort((a, b) => a - b);
    const displayYear = selectedYear && availableYears.includes(selectedYear) 
      ? selectedYear : availableYears[0] || new Date().getFullYear();
    const timesheets = allTimesheets.filter(ts => ts.year === displayYear);
    const employeesInYear = allEmployeeNames;
    const displayEmployee = selectedEmployee && employeesInYear.includes(selectedEmployee)
      ? selectedEmployee : employeesInYear[0] || null;
    
    const getWorkdaysInYear = (year: number): number => {
      let workdays = 0;
      const holidays = getGermanHolidays(year);
      for (let m = 0; m < 12; m++) {
        const daysInMonth = new Date(year, m + 1, 0).getDate();
        for (let d = 1; d <= daysInMonth; d++) {
          const date = new Date(year, m, d);
          const dayOfWeek = date.getDay();
          const dateStr = `${year}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidays.has(dateStr)) workdays++;
        }
      }
      return workdays;
    };

    const getWorkdaysInMonth = (year: number, month: number): number => {
      let workdays = 0;
      const holidays = getGermanHolidays(year);
      const daysInMonth = new Date(year, month, 0).getDate();
      for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(year, month - 1, d);
        const dayOfWeek = date.getDay();
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidays.has(dateStr)) workdays++;
      }
      return workdays;
    };
    
    const yearTotals = availableYears.map(year => {
      const yearTimesheets = allTimesheets.filter(ts => ts.year === year);
      const usedHours = yearTimesheets.reduce((s, ts) => s + ts.total_billable_hours, 0);
      const workdays = getWorkdaysInYear(year);
      let maxHours = 0;
      for (const empName of allEmployeeNames) {
        const settings = getEmployeeSettings(empName);
        const maxDaily = settings.weekly_hours / 5;
        maxHours += workdays * maxDaily;
      }
      return { year, usedHours, freeHours: maxHours - usedHours, maxHours, hasData: usedHours > 0 };
    });
    const totalAllYears = allTimesheets.reduce((s, ts) => s + ts.total_billable_hours, 0);
    const totalMaxAllYears = yearTotals.reduce((s, yt) => s + yt.maxHours, 0);
    const totalFreeAllYears = totalMaxAllYears - totalAllYears;

    // Funktion zum Rendern der Monatstabelle für einen MA
    const renderMonthTable = (empName: string) => {
      const empTimesheets = timesheets.filter(ts => ts.employee_name === empName).sort((a, b) => a.month - b.month);
      const settings = getEmployeeSettings(empName);
      const maxDaily = settings.weekly_hours / 5;
      const yearUsed = empTimesheets.reduce((s, ts) => s + ts.total_billable_hours, 0);
      
      const holidays = getGermanHolidays(displayYear);
      const tableDayData: Record<number, Record<number, { hours: number; absence: string | null }>> = {};
      for (let m = 1; m <= 12; m++) {
        tableDayData[m] = {};
        for (let d = 1; d <= 31; d++) tableDayData[m][d] = { hours: 0, absence: null };
      }
      for (const ts of empTimesheets) {
        const daily = ts.daily_data || {};
        for (const [dayStr, data] of Object.entries(daily)) {
          const day = parseInt(dayStr);
          if (day >= 1 && day <= 31 && tableDayData[ts.month]) {
            if ((data as any).hours) tableDayData[ts.month][day].hours += (data as any).hours;
            if ((data as any).absence) tableDayData[ts.month][day].absence = (data as any).absence;
          }
        }
      }
      
      let yearFree = 0;
      for (let m = 1; m <= 12; m++) {
        const daysInMonth = getDaysInMonth(displayYear, m);
        for (let d = 1; d <= daysInMonth; d++) {
          const date = new Date(displayYear, m - 1, d);
          const dayOfWeek = date.getDay();
          const dateStr = `${displayYear}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidays.has(dateStr)) {
            const data = tableDayData[m]?.[d];
            if (!data?.absence) yearFree += maxDaily - (data?.hours || 0);
          }
        }
      }

      return (
        <div className="bg-white rounded-lg shadow overflow-hidden h-full flex flex-col">
          <div className="bg-gray-100 px-3 py-2 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-sm">📊 Monatstabelle</h3>
              <p className="text-xs text-gray-500">{settings.weekly_hours}h/Woche</p>
            </div>
            <div className="text-right">
              <span className="text-blue-600 font-bold">{yearUsed.toFixed(0)}h</span>
              <span className="text-gray-400 mx-1">/</span>
              <span className="text-green-600 font-bold">{yearFree.toFixed(0)}h frei</span>
            </div>
          </div>
          <div className="p-1 flex-1">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-1 py-1 text-left">Monat</th>
                  <th className="px-1 py-1 text-right">Std</th>
                  <th className="px-1 py-1 text-right text-green-700">Frei</th>
                  <th className="px-1 py-1 text-right">Fehl</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 12 }, (_, i) => i + 1).map(month => {
                  const ts = empTimesheets.find(t => t.month === month);
                  const hours = ts?.total_billable_hours || 0;
                  const absenceDays = ts?.total_absence_days || 0;
                  
                  const daysInMonth = getDaysInMonth(displayYear, month);
                  let monthFree = 0;
                  for (let d = 1; d <= daysInMonth; d++) {
                    const date = new Date(displayYear, month - 1, d);
                    const dayOfWeek = date.getDay();
                    const dateStr = `${displayYear}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                    if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidays.has(dateStr)) {
                      const data = tableDayData[month]?.[d];
                      if (!data?.absence) monthFree += maxDaily - (data?.hours || 0);
                    }
                  }
                  
                  return (
                    <tr key={month} className={`border-b ${hours === 0 ? 'text-gray-400' : ''}`}>
                      <td className="px-1 py-0.5">{MONTH_NAMES[month - 1].substring(0, 3)}</td>
                      <td className="px-1 py-0.5 text-right">{hours > 0 ? hours.toFixed(1) : '-'}</td>
                      <td className="px-1 py-0.5 text-right text-green-600">{monthFree.toFixed(1)}</td>
                      <td className="px-1 py-0.5 text-right text-orange-600">{absenceDays > 0 ? absenceDays : '-'}</td>
                    </tr>
                  );
                })}
                <tr className="bg-blue-50 font-bold">
                  <td className="px-1 py-0.5">Σ</td>
                  <td className="px-1 py-0.5 text-right text-blue-600">{yearUsed.toFixed(1)}</td>
                  <td className="px-1 py-0.5 text-right text-green-600">{yearFree.toFixed(1)}</td>
                  <td className="px-1 py-0.5"></td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="px-2 py-2 border-t mt-auto">
            <button
              onClick={() => exportFzulExcel(empName, displayYear, empTimesheets, settings)}
              className="w-full px-2 py-1.5 bg-green-600 text-white text-xs rounded hover:bg-green-700 flex items-center justify-center gap-1"
            >
              📥 Excel
            </button>
          </div>
        </div>
      );
    };

    // Funktion zum Rendern des FZul-Kalenders für einen MA
    const renderCalendar = (empName: string) => {
      const empTimesheets = timesheets.filter(ts => ts.employee_name === empName);
      const settings = getEmployeeSettings(empName);
      const maxDaily = settings.weekly_hours / 5;
      const yearUsed = empTimesheets.reduce((s, ts) => s + ts.total_billable_hours, 0);
      const holidays = getGermanHolidays(displayYear);

      const dayData: Record<number, Record<number, { hours: number; absence: string | null }>> = {};
      for (let m = 1; m <= 12; m++) {
        dayData[m] = {};
        for (let d = 1; d <= 31; d++) dayData[m][d] = { hours: 0, absence: null };
      }
      for (const ts of empTimesheets) {
        const daily = ts.daily_data || {};
        for (const [dayStr, data] of Object.entries(daily)) {
          const day = parseInt(dayStr);
          if (day >= 1 && day <= 31 && dayData[ts.month]) {
            if ((data as any).hours) dayData[ts.month][day].hours += (data as any).hours;
            if ((data as any).absence) dayData[ts.month][day].absence = (data as any).absence;
          }
        }
      }

      let availableHours = 0;
      for (let m = 1; m <= 12; m++) {
        const daysInMonth = getDaysInMonth(displayYear, m);
        for (let d = 1; d <= daysInMonth; d++) {
          const date = new Date(displayYear, m - 1, d);
          const dayOfWeek = date.getDay();
          const dateStr = `${displayYear}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidays.has(dateStr)) {
            const data = dayData[m]?.[d];
            if (!data?.absence) availableHours += maxDaily - (data?.hours || 0);
          }
        }
      }

      return (
        <div className="bg-white rounded-lg shadow overflow-hidden flex-1 flex flex-col">
          <div className="bg-gray-100 px-3 py-3 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-sm">📅 FZul-Kalender {displayYear}</h3>
              <p className="text-xs text-gray-500">{settings.weekly_hours}h/Woche • Max {maxDaily}h/Tag</p>
            </div>
            <div className="text-right">
              <span className="text-blue-600 font-bold">{yearUsed.toFixed(0)}h</span>
              <span className="text-gray-400 mx-1">/</span>
              <span className="text-green-600 font-bold">{availableHours.toFixed(0)}h frei</span>
            </div>
          </div>
          <div className="p-1 pt-3 overflow-x-auto flex-1">
            <table className="text-xs border-collapse w-full">
              <thead>
                <tr>
                  <th className="px-1 py-1 border bg-gray-50 sticky left-0">Mon</th>
                  {Array.from({ length: 31 }, (_, d) => d + 1).map(day => (
                    <th key={day} className="px-0 py-1 border bg-gray-50 w-5 text-center text-[10px]">{day}</th>
                  ))}
                  <th className="px-1 py-1 border bg-gray-100 text-blue-700">Σ</th>
                  <th className="px-1 py-1 border bg-gray-100 text-green-700">Frei</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 12 }, (_, i) => i + 1).map(month => {
                  const daysInMonth = getDaysInMonth(displayYear, month);
                  const monthTs = empTimesheets.find(t => t.month === month);
                  const monthHours = monthTs?.total_billable_hours || 0;
                  
                  let monthFree = 0;
                  for (let d = 1; d <= daysInMonth; d++) {
                    const date = new Date(displayYear, month - 1, d);
                    const dayOfWeek = date.getDay();
                    const dateStr = `${displayYear}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                    if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidays.has(dateStr)) {
                      const data = dayData[month]?.[d];
                      if (!data?.absence) monthFree += maxDaily - (data?.hours || 0);
                    }
                  }

                  return (
                    <tr key={month}>
                      <td className="px-1 py-1 border font-medium bg-gray-50 sticky left-0">
                        {MONTH_NAMES[month - 1].substring(0, 3)}
                      </td>
                      {Array.from({ length: 31 }, (_, d) => d + 1).map(day => {
                        const data = dayData[month]?.[day];
                        const isValidDay = day <= daysInMonth;
                        
                        if (!isValidDay) return <td key={day} className="border bg-gray-100"></td>;
                        
                        const date = new Date(displayYear, month - 1, day);
                        const dayOfWeek = date.getDay();
                        const dateStr = `${displayYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                        const isHoliday = holidays.has(dateStr);
                        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                        const isSunday = dayOfWeek === 0;
                        
                        let bgColor = 'bg-green-100';
                        let textColor = 'text-gray-600';
                        let content = '';
                        
                        if (isWeekend) {
                          bgColor = 'bg-gray-200';
                          textColor = isSunday ? 'text-red-400' : 'text-gray-400';
                          content = '-';
                        } else if (isHoliday) {
                          bgColor = 'bg-red-100';
                          textColor = 'text-red-600';
                          content = 'F';
                        } else if (data?.absence) {
                          bgColor = 'bg-yellow-100';
                          textColor = 'text-yellow-700';
                          content = data.absence.charAt(0).toUpperCase();
                        } else {
                          const freeHours = maxDaily - (data?.hours || 0);
                          if (freeHours <= 0) {
                            bgColor = 'bg-red-200';
                            textColor = 'text-red-800';
                            content = (data?.hours || 0).toString();
                          } else if (freeHours < maxDaily) {
                            bgColor = 'bg-yellow-100';
                            textColor = 'text-yellow-800';
                            content = freeHours.toFixed(1).replace('.0', '');
                          } else {
                            bgColor = 'bg-green-100';
                            textColor = 'text-green-700';
                            content = maxDaily.toString();
                          }
                        }
                        
                        return (
                          <td key={day} className={`border text-center w-5 h-5 text-[10px] ${bgColor} ${textColor}`}
                              title={`${day}. ${MONTH_NAMES[month - 1]}: ${data?.hours || 0}h genutzt`}>
                            {content}
                          </td>
                        );
                      })}
                      <td className="px-1 py-1 border bg-blue-50 text-blue-700 font-bold text-center">
                        {monthHours > 0 ? monthHours.toFixed(0) : '-'}
                      </td>
                      <td className="px-1 py-1 border bg-green-50 text-green-700 font-bold text-center">
                        {monthFree > 0 ? monthFree.toFixed(0) : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-gray-600">
              <span className="flex items-center gap-0.5"><span className="w-2 h-2 bg-green-100 border"></span>Frei</span>
              <span className="flex items-center gap-0.5"><span className="w-2 h-2 bg-yellow-100 border"></span>Teil</span>
              <span className="flex items-center gap-0.5"><span className="w-2 h-2 bg-red-200 border"></span>Voll</span>
              <span className="flex items-center gap-0.5"><span className="w-2 h-2 bg-gray-200 border"></span>WE</span>
              <span className="flex items-center gap-0.5"><span className="w-2 h-2 bg-red-100 border"></span>Feiertag</span>
            </div>
          </div>
        </div>
      );
    };

    return (
      <div className="flex flex-col h-full overflow-hidden">
        {/* HEADER (fix, nicht scrollbar) */}
        <div className="bg-gray-50 pb-4 space-y-4 flex-shrink-0">
          {/* Zurück + Löschen */}
          <div className="flex items-center justify-between">
            <button onClick={() => { setSelectedProject(null); setSelectedEmployee(null); }} className="text-blue-600 hover:underline">
              ← Zurück zur Übersicht
            </button>
            <button
              onClick={() => setShowDeleteConfirm({ type: 'project', projectName: selectedProject })}
              className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm"
            >
              🗑️ Projekt löschen
            </button>
          </div>

          {/* Projekt-Info + Jahre */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h2 className="text-lg font-bold">📁 {selectedProject}</h2>
                <p className="text-sm text-gray-500">FKZ: {fkz} • {allEmployeeNames.length} MA • {availableYears[0]}-{availableYears[availableYears.length - 1]}</p>
              </div>
            </div>
            
            {/* Jahresübersicht - kompakter */}
            <div className="flex flex-wrap gap-2 mb-3 items-center">
              {yearTotals.map(({ year, usedHours, freeHours }) => (
                <button 
                  key={year} 
                  className={`px-3 py-2 rounded text-center text-sm transition-colors ${
                    year === displayYear ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                  onClick={() => setSelectedYear(year)}
                >
                  <div className="font-bold">{year}</div>
                  <div className="text-xs opacity-80">{usedHours.toFixed(0)}h / {freeHours.toFixed(0)}h</div>
                </button>
              ))}
              <div className="px-3 py-2 rounded text-center text-sm bg-purple-100">
                <div className="font-bold text-purple-700">Gesamt</div>
                <div className="text-xs text-purple-600">{totalAllYears.toFixed(0)}h / {totalFreeAllYears.toFixed(0)}h</div>
              </div>
              
              {/* Bundesland-Auswahl - zeigt Firmen-Bundesland */}
              <div className="ml-auto flex items-center gap-2 px-3 py-1 bg-yellow-100 rounded border border-yellow-300">
                <span className="text-xs text-yellow-800">🏴 {BUNDESLAENDER.find(bl => bl.code === companyStateCode)?.name || companyStateCode}</span>
                <button onClick={openCompanyStateModal} className="text-xs text-yellow-700 hover:text-yellow-900 underline">
                  ändern
                </button>
              </div>
            </div>

            {/* Mitarbeiter-Buttons */}
            <div className="flex flex-wrap gap-2 items-center">
              {employeesInYear.map(empName => {
                const empTs = timesheets.filter(ts => ts.employee_name === empName);
                const empHours = empTs.reduce((s, ts) => s + ts.total_billable_hours, 0);
                return (
                  <button
                    key={empName}
                    onClick={() => setSelectedEmployee(empName)}
                    className={`px-3 py-2 rounded text-sm transition-colors ${
                      empName === displayEmployee ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    <span className="font-medium">👤 {empName}</span>
                    <span className="ml-2 text-xs opacity-80">{empHours.toFixed(0)}h</span>
                  </button>
                );
              })}
              
              {/* NEU: Direkt zum FZul-Editor mit aktueller Auswahl */}
              {displayEmployee && (
                <button
                  onClick={() => {
                    setFzulSelectedEmployee(displayEmployee);
                    setFzulSelectedYear(displayYear);
                    setActiveTab('fzul-editor');
                  }}
                  className="ml-auto px-4 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 flex items-center gap-2"
                >
                  📝 Im FZul-Editor öffnen
                </button>
              )}
            </div>
          </div>
        </div>

        {/* SCROLLABLE CONTENT - Monatstabelle + Kalender nebeneinander */}
        <div className="flex-1 overflow-auto pr-2">
          {displayEmployee && (
            <div className="flex gap-2 items-stretch">
              {/* Monatstabelle - schmal links */}
              <div className="w-56 flex-shrink-0">
                {renderMonthTable(displayEmployee)}
              </div>
              
              {/* Kalender - Rest des Platzes */}
              <div className="flex-1 min-w-0">
                {renderCalendar(displayEmployee)}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ============================================
  // RENDER: HAUPTSEITE
  // ============================================

  return (
    <div className="h-screen bg-gray-50 overflow-hidden flex flex-col">
      <Header />

      <main className="flex-1 overflow-hidden max-w-7xl mx-auto px-4 py-4 w-full flex flex-col">
        <div className="mb-4 flex-shrink-0">
          <h1 className="text-2xl font-bold text-gray-800">📊 Analyse - Stundennachweise</h1>
          <p className="text-gray-600">Projektabrechnungen importieren und Kapazitäten auswerten</p>
        </div>

        {error && (
          <div className="mb-4 flex-shrink-0 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex justify-between">
            {error}
            <button onClick={() => setError('')}>×</button>
          </div>
        )}
        {success && (
          <div className="mb-4 flex-shrink-0 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex justify-between">
            {success}
            <button onClick={() => setSuccess('')}>×</button>
          </div>
        )}

        {/* Tab-Navigation - NEU v6.0: erweitert */}
        <div className="mb-4 border-b border-gray-200 flex-shrink-0">
          <nav className="flex justify-between items-center">
            <div className="flex gap-4">
              <button
                onClick={() => { setActiveTab('projects'); setSelectedProject(null); setSelectedEmployee(null); }}
                className={`px-1 py-3 border-b-2 font-medium text-sm ${
                  activeTab === 'projects' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'
                }`}
              >
                📁 Projekte {projects.length > 0 && <span className="ml-1 text-xs bg-blue-100 px-2 py-0.5 rounded-full">{projects.length}</span>}
              </button>
              <button
                onClick={() => { setActiveTab('import'); setImportStep('upload'); }}
                className={`px-1 py-3 border-b-2 font-medium text-sm ${
                  activeTab === 'import' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'
                }`}
              >
                ➕ Import
              </button>
              
              {/* NEU v6.0: FZul-Tabs */}
              <div className="border-l border-gray-300 mx-2"></div>
              <button
                onClick={() => setActiveTab('fzul-employees')}
                className={`px-1 py-3 border-b-2 font-medium text-sm ${
                  activeTab === 'fzul-employees' ? 'border-green-600 text-green-600' : 'border-transparent text-gray-500'
                }`}
              >
                👥 FZul MA-Stammdaten
              </button>
              <button
                onClick={() => setActiveTab('fzul-editor')}
                className={`px-1 py-3 border-b-2 font-medium text-sm ${
                  activeTab === 'fzul-editor' ? 'border-green-600 text-green-600' : 'border-transparent text-gray-500'
                }`}
              >
                📝 FZul Editor
              </button>
              <button
                onClick={() => setActiveTab('fzul-archive')}
                className={`px-1 py-3 border-b-2 font-medium text-sm ${
                  activeTab === 'fzul-archive' ? 'border-green-600 text-green-600' : 'border-transparent text-gray-500'
                }`}
              >
                📄 PDF-Archiv {fzulPdfs.length > 0 && <span className="ml-1 text-xs bg-green-100 px-2 py-0.5 rounded-full">{fzulPdfs.length}</span>}
              </button>
            </div>

            {/* Berechtigungen nur für Super-Admin */}
            {profile?.email?.toLowerCase() === 'm.ditscherlein@cubintec.com' && (
              <button
                onClick={openAccessModal}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2 text-sm font-medium"
              >
                🔐 Berechtigungen
              </button>
            )}
          </nav>
        </div>

        {/* TAB CONTENT */}
        <div className="flex-1 overflow-hidden">
          
          {/* TAB: PROJEKTE */}
          {activeTab === 'projects' && !selectedProject && (
            <div className="space-y-4 overflow-auto h-full">
              {projects.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-12 text-center">
                  <span className="text-5xl">📭</span>
                  <h2 className="text-xl font-bold mt-4">Keine Projekte</h2>
                  <p className="text-gray-600 mt-2">Importieren Sie eine Excel-Datei</p>
                  <button onClick={() => setActiveTab('import')} className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    ➕ Import starten
                  </button>
                </div>
              ) : (
                projects.map(proj => {
                  const tss = getProjectTimesheets(proj);
                  const emps = [...new Set(tss.map(ts => ts.employee_name))];
                  const totalHours = tss.reduce((s, ts) => s + ts.total_billable_hours, 0);
                  const fkz = tss[0]?.funding_reference || '';
                  return (
                    <div key={proj} onClick={() => setSelectedProject(proj)}
                         className="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-lg transition-shadow">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-lg font-bold">📁 {proj}</h3>
                          <p className="text-gray-500 text-sm">FKZ: {fkz}</p>
                          <p className="text-gray-500 text-sm mt-1">{emps.length} Mitarbeiter</p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-blue-600">{totalHours.toFixed(0)}h</div>
                          <div className="text-sm text-gray-500">Gesamtstunden</div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {activeTab === 'projects' && selectedProject && renderProjectDetail()}

          {/* TAB: NEUER IMPORT */}
          {activeTab === 'import' && (
            <>
              {importStep === 'upload' && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-bold mb-4">Excel-Projektabrechnung hochladen</h2>
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-medium text-gray-700 mb-2">Unterstützte Formate:</h3>
                    <div className="flex flex-wrap gap-2">
                      <span className={`px-3 py-1 rounded-full border text-sm ${FORMAT_INFO.ZIM.color}`}>{FORMAT_INFO.ZIM.name}</span>
                      <span className={`px-3 py-1 rounded-full border text-sm ${FORMAT_INFO.BMBF_KMU.color}`}>{FORMAT_INFO.BMBF_KMU.name}</span>
                      <span className={`px-3 py-1 rounded-full border text-sm ${FORMAT_INFO.FZUL.color}`}>{FORMAT_INFO.FZUL.name} (geplant)</span>
                    </div>
                  </div>
                  <div
                    onDragEnter={handleDragEnter} onDragLeave={handleDragLeave} onDragOver={handleDragOver} onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                      isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'
                    }`}
                  >
                    <input type="file" accept=".xlsx,.xls" onChange={handleFileInput} className="hidden" id="file-upload" />
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <div className="text-5xl mb-4">📊</div>
                      <p className="text-lg font-medium">Excel-Datei hier ablegen oder klicken</p>
                      <p className="text-sm text-gray-500 mt-2">Projektabrechnung_[Projekt]_[Firma].xlsx</p>
                    </label>
                  </div>
                  {processing && (
                    <div className="mt-4 text-center text-blue-600">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 inline-block mr-2"></div>
                      Wird verarbeitet...
                    </div>
                  )}
                </div>
              )}

              {importStep === 'preview' && projectInfo && (
                <div className="space-y-6 overflow-auto h-full">
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex justify-between items-start mb-4">
                      <h2 className="text-lg font-bold">📁 {projectInfo.projectName}</h2>
                      <span className={`px-3 py-1 rounded-full border text-sm font-medium ${FORMAT_INFO[projectInfo.format].color}`}>
                        {FORMAT_INFO[projectInfo.format].name}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div><span className="text-gray-500">Firma:</span><p className="font-medium">{projectInfo.companyName || '-'}</p></div>
                      <div><span className="text-gray-500">FKZ:</span><p className="font-medium">{projectInfo.fundingReference || '-'}</p></div>
                      <div><span className="text-gray-500">Datei:</span><p className="font-medium truncate">{projectInfo.fileName}</p></div>
                      <div><span className="text-gray-500">Mitarbeiter:</span><p className="font-medium">{extractedData.length} gefunden</p></div>
                    </div>
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm text-gray-500 mb-2">Format falsch erkannt? Manuell auswählen:</p>
                      <div className="flex gap-2">
                        {(['ZIM', 'BMBF_KMU'] as FundingFormat[]).map(fmt => (
                          <button key={fmt} onClick={() => reprocessWithFormat(fmt)} disabled={processing}
                            className={`px-3 py-1 rounded border text-sm ${selectedFormat === fmt ? FORMAT_INFO[fmt].color + ' font-bold' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                            {FORMAT_INFO[fmt].name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h3 className="font-bold text-yellow-800 mb-3">⚙️ Standard-Stammdaten (für alle MA)</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Wochenarbeitszeit</label>
                        <input type="number" value={defaultWeeklyHours} onChange={(e) => setDefaultWeeklyHours(parseFloat(e.target.value) || 40)} className="w-24 border rounded px-3 py-2" />
                        <span className="ml-2 text-gray-500">h</span>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Jahresurlaub</label>
                        <input type="number" value={defaultAnnualLeave} onChange={(e) => setDefaultAnnualLeave(parseInt(e.target.value) || 30)} className="w-24 border rounded px-3 py-2" />
                        <span className="ml-2 text-gray-500">Tage</span>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">🏴 Firmen-Bundesland</label>
                        <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded font-medium text-blue-800">
                          {BUNDESLAENDER.find(bl => bl.code === companyStateCode)?.name || companyStateCode}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Änderbar in MA-Stammdaten</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="bg-gray-100 px-6 py-4"><h3 className="font-bold">👥 Erkannte Mitarbeiter ({extractedData.length})</h3></div>
                    <div className="divide-y">
                      {extractedData.map((emp, idx) => (
                        <div key={idx} className="px-6 py-4 flex justify-between items-center">
                          <div>
                            <div className="font-medium">{emp.employeeName}</div>
                            <div className="text-sm text-gray-500">Projektjahr {emp.projectYear} • {emp.months.filter(m => m.billableHours > 0).length} Monate mit Daten</div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-blue-600">{emp.totalBillableHours.toFixed(0)}h</div>
                            {emp.totalAbsenceHours > 0 && <div className="text-sm text-orange-600">{(emp.totalAbsenceHours / 8).toFixed(0)} Fehltage</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <button onClick={() => { setWorkbook(null); setProjectInfo(null); setExtractedData([]); setImportStep('upload'); setSelectedFormat(null); }}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">← Andere Datei</button>
                    <button onClick={importAllEmployees} disabled={processing}
                      className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-bold">
                      {processing ? 'Importiert...' : `✅ Alle ${extractedData.length} MA importieren`}
                    </button>
                  </div>
                </div>
              )}

              {importStep === 'done' && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
                  <span className="text-5xl">✅</span>
                  <h2 className="text-xl font-bold text-green-800 mt-4">Import abgeschlossen!</h2>
                  <p className="text-green-600 mt-2">{extractedData.length} Mitarbeiter wurden importiert.</p>
                  <div className="mt-6 flex justify-center gap-4">
                    <button onClick={() => { setActiveTab('projects'); setImportStep('upload'); }} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">📁 Zu Projekten</button>
                    <button onClick={() => { setWorkbook(null); setProjectInfo(null); setExtractedData([]); setImportStep('upload'); setSelectedFormat(null); }}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">➕ Weitere Datei</button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* NEU v6.0: TAB FZUL MA-STAMMDATEN */}
          {activeTab === 'fzul-employees' && (
            <div className="space-y-4 overflow-auto h-full">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h2 className="text-lg font-bold">👥 FZul Mitarbeiter-Stammdaten</h2>
                    <p className="text-sm text-gray-500">Wochenarbeitszeit und Urlaubstage für FZul-Berechnung</p>
                  </div>
                  <div className="flex gap-2">
                    {savedTimesheets.length > 0 && (
                      <button onClick={importEmployeeNamesFromTimesheets}
                        className="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg hover:bg-yellow-200 text-sm">
                        📥 Aus Import übernehmen
                      </button>
                    )}
                    <button onClick={openNewFzulEmployeeModal}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                      ➕ Neuer Mitarbeiter
                    </button>
                  </div>
                </div>

                {/* Firmen-Bundesland Info */}
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex justify-between items-center">
                  <div>
                    <span className="text-sm text-blue-800">
                      🏴 <strong>Firmen-Bundesland:</strong> {BUNDESLAENDER.find(bl => bl.code === companyStateCode)?.name || companyStateCode}
                    </span>
                    <p className="text-xs text-blue-600 mt-1">Gilt für alle Mitarbeiter (Feiertage werden nach Firmenstandort berechnet)</p>
                  </div>
                  <button onClick={openCompanyStateModal} className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm">
                    ✏️ Ändern
                  </button>
                </div>

                {loadingFzulEmployees ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
                  </div>
                ) : fzulEmployees.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <span className="text-4xl">👥</span>
                    <p className="mt-4">Noch keine Mitarbeiter angelegt</p>
                    <p className="text-sm mt-2">Klicken Sie auf "Neuer Mitarbeiter" oder importieren Sie aus bestehenden Daten</p>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="px-4 py-3 text-left">Name</th>
                        <th className="px-4 py-3 text-center">Wochenstunden</th>
                        <th className="px-4 py-3 text-center">Urlaub</th>
                        <th className="px-4 py-3 text-center">Position</th>
                        <th className="px-4 py-3 text-center">Status</th>
                        <th className="px-4 py-3 text-right">Aktionen</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fzulEmployees.map(emp => (
                        <tr key={emp.id} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium">{emp.employee_name}</td>
                          <td className="px-4 py-3 text-center">{emp.weekly_hours}h</td>
                          <td className="px-4 py-3 text-center">{emp.annual_leave_days} Tage</td>
                          <td className="px-4 py-3 text-center text-sm text-gray-500">{emp.position_title || '-'}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-1 rounded text-xs ${emp.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                              {emp.is_active ? 'Aktiv' : 'Inaktiv'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button onClick={() => openEditFzulEmployeeModal(emp)} className="text-blue-600 hover:underline text-sm mr-3">Bearbeiten</button>
                            <button onClick={() => deleteFzulEmployee(emp)} className="text-red-600 hover:underline text-sm">Löschen</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* NEU v6.0: TAB FZUL EDITOR */}
          {activeTab === 'fzul-editor' && (
            <div className="overflow-auto h-full">
              {fzulEmployees.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-6 text-center py-12 text-gray-500">
                  <span className="text-4xl">📝</span>
                  <p className="mt-4">Bitte legen Sie zuerst Mitarbeiter an</p>
                  <button onClick={() => setActiveTab('fzul-employees')} className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                    👥 Zu MA-Stammdaten
                  </button>
                </div>
              ) : !fzulTimesheet ? (
                <div className="bg-white rounded-lg shadow p-6 space-y-4">
                  <h2 className="text-lg font-bold">📝 FZul Online-Editor</h2>
                  {/* MA + Jahr Auswahl */}
                  <div className="flex gap-4 items-end">
                    <div>
                      <label className="block text-xs font-medium mb-1">Mitarbeiter</label>
                      <select value={fzulSelectedEmployee || ''} onChange={(e) => setFzulSelectedEmployee(e.target.value || null)}
                        className="border rounded px-3 py-1.5 text-sm">
                        <option value="">-- Wählen --</option>
                        {fzulEmployees.filter(e => e.is_active).map(emp => (
                          <option key={emp.id} value={emp.employee_name}>{emp.employee_name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Jahr</label>
                      <select value={fzulSelectedYear} onChange={(e) => setFzulSelectedYear(parseInt(e.target.value))}
                        className="border rounded px-3 py-1.5 text-sm">
                        {[2020, 2021, 2022, 2023, 2024, 2025, 2026].map(y => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </div>
                    {fzulSelectedEmployee && fzulProjectSummaries.length > 0 && (
                      <button onClick={loadFzulFromImport} disabled={fzulLoading}
                        className="px-4 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 text-sm">
                        {fzulLoading ? '⏳ Lädt...' : '📥 Daten laden'}
                      </button>
                    )}
                  </div>
                  {fzulSelectedEmployee && fzulProjectSummaries.length > 0 && (
                    <div className="text-sm text-green-700 bg-green-50 p-2 rounded">
                      ✅ {fzulProjectSummaries.length} Projekt(e) verfügbar: {fzulProjectSummaries.map(p => p.fkz || p.project_name).join(', ')}
                    </div>
                  )}
                  {fzulSelectedEmployee && !fzulHasImportData && !fzulLoading && (
                    <div className="text-sm text-orange-700 bg-orange-50 p-2 rounded">
                      ⚠️ Keine Import-Daten für {fzulSelectedEmployee} ({fzulSelectedYear})
                    </div>
                  )}
                </div>
              ) : (
                /* ========== BMF-KONFORMES LAYOUT ========== */
                <div className="bg-white text-xs">
                  {/* HEADER - Gelber Balken mit Zurück-Button */}
                  <div className="bg-amber-200 border border-amber-400 p-2 flex justify-between items-center">
                    <div className="font-bold text-sm">
                      Steuerliche Förderung von Forschung und Entwicklung (FuE) – Stundenaufzeichnung für FuE-Tätigkeiten in einem begünstigten FuE-Vorhaben
                    </div>
                    <button 
                      onClick={() => setFzulTimesheet(null)}
                      className="px-2 py-1 bg-amber-100 hover:bg-amber-300 rounded text-xs border border-amber-400">
                      ← Zurück zur Auswahl
                    </button>
                  </div>

                  {/* Projekt-Info + Jahr/Bundesland - EDITIERBAR */}
                  <table className="w-full border-collapse border border-gray-400 text-xs">
                    <tbody>
                      <tr>
                        <td className="border border-gray-400 p-1 w-48 bg-gray-50">Kurzbezeichnung des FuE-Vorhabens:</td>
                        <td className="border border-gray-400 p-0" colSpan={2}>
                          <input 
                            type="text"
                            value={fzulTimesheet.project_title || ''}
                            onChange={(e) => setFzulTimesheet({...fzulTimesheet, project_title: e.target.value})}
                            className="w-full px-1 py-0.5 border-0 text-xs"
                            placeholder="Projektbezeichnung eingeben..."
                          />
                        </td>
                        <td className="border border-gray-400 p-1 w-24 bg-gray-50 text-right">Wirtschaftsjahr:</td>
                        <td className="border border-gray-400 p-1 w-20 font-bold text-center bg-amber-50">{fzulSelectedYear}</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-400 p-1 bg-gray-50">Vorhaben-ID des FuE-Vorhabens:</td>
                        <td className="border border-gray-400 p-0" colSpan={2}>
                          <input 
                            type="text"
                            value={fzulTimesheet.project_fkz || ''}
                            onChange={(e) => setFzulTimesheet({...fzulTimesheet, project_fkz: e.target.value})}
                            className="w-full px-1 py-0.5 border-0 text-xs"
                            placeholder="FKZ / Vorhaben-ID eingeben..."
                          />
                        </td>
                        <td className="border border-gray-400 p-1 bg-gray-50 text-right">Bundesland:</td>
                        <td className="border border-gray-400 p-1 text-center bg-amber-50">
                          {BUNDESLAENDER.find(bl => bl.code === companyStateCode)?.name || companyStateCode}
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Mitarbeiter-Zeile - FuE-Tätigkeit EDITIERBAR */}
                  <table className="w-full border-collapse border border-gray-400 text-xs mt-1">
                    <tbody>
                      <tr className="bg-gray-50">
                        <td className="border border-gray-400 p-1 w-16">Name:</td>
                        <td className="border border-gray-400 p-1 w-32 font-medium">
                          {fzulTimesheet.employee_name.split(',')[0] || fzulTimesheet.employee_name}
                        </td>
                        <td className="border border-gray-400 p-1 w-20">Vorname:</td>
                        <td className="border border-gray-400 p-1 w-32 font-medium">
                          {fzulTimesheet.employee_name.split(',')[1]?.trim() || ''}
                        </td>
                        <td className="border border-gray-400 p-1">Kurzbezeichnung der FuE-Tätigkeit:</td>
                        <td className="border border-gray-400 p-0 w-32">
                          <input 
                            type="text"
                            value={fzulTimesheet.position_title || ''}
                            onChange={(e) => setFzulTimesheet({...fzulTimesheet, position_title: e.target.value})}
                            className="w-full px-1 py-0.5 border-0 text-xs font-medium"
                            placeholder="z.B. Entwickler"
                          />
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  {/* KALENDER - Kompakt */}
                  <div className="mt-1 border border-gray-400">
                    <div className="bg-amber-100 p-1 text-xs font-medium border-b border-gray-400">
                      Dokumentation der Arbeitsstunden für FuE-Tätigkeiten im FuE-Vorhaben je Arbeitstag
                    </div>
                    <div className="overflow-x-auto">
                      <table className="border-collapse text-xs" style={{ fontSize: '10px', tableLayout: 'fixed' }}>
                        <thead>
                          <tr className="bg-amber-50">
                            <th className="border border-gray-300 p-0.5 w-16 min-w-[64px] text-left">Monat</th>
                            {Array.from({ length: 31 }, (_, i) => (
                              <th key={i} className="border border-gray-300 p-0.5 w-7 min-w-[28px] max-w-[28px] text-center">{i + 1}</th>
                            ))}
                            <th className="border border-gray-300 p-0.5 w-12 min-w-[48px] text-center bg-amber-100">insg.</th>
                            <th className="border border-gray-300 p-0.5 w-16 min-w-[64px] text-center">Bestätigung</th>
                          </tr>
                        </thead>
                        <tbody>
                          {['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'].map((monthName, monthIdx) => {
                            const monthNum = (monthIdx + 1).toString().padStart(2, '0');
                            const daysInMonth = new Date(fzulSelectedYear, monthIdx + 1, 0).getDate();
                            const summary = fzulTimesheet.monthly_summaries[monthNum] || { free: 0 };
                            
                            return (
                              <tr key={monthIdx}>
                                <td className="border border-gray-300 p-0.5 font-medium bg-gray-50 w-16 min-w-[64px]">{monthName}</td>
                                {Array.from({ length: 31 }, (_, dayIdx) => {
                                  const dayNum = dayIdx + 1;
                                  if (dayNum > daysInMonth) {
                                    return <td key={dayIdx} className="border border-gray-300 p-0.5 bg-gray-100 w-7 min-w-[28px] max-w-[28px]"></td>;
                                  }
                                  
                                  const dateStr = `${fzulSelectedYear}-${monthNum}-${dayNum.toString().padStart(2, '0')}`;
                                  const dayData = fzulTimesheet.daily_data[dateStr];
                                  if (!dayData) return <td key={dayIdx} className="border border-gray-300 p-0.5 w-7 min-w-[28px] max-w-[28px]"></td>;
                                  
                                  const isEditing = fzulEditingCell === dateStr;
                                  
                                  // Farben wie BMF-Original
                                  let bgColor = '';
                                  let textColor = '';
                                  // Stunden auf max 2 Dezimalstellen runden für Anzeige
                                  const roundedFree = Math.round(dayData.free * 100) / 100;
                                  let displayText: string = roundedFree > 0 
                                    ? (roundedFree % 1 === 0 ? roundedFree.toString() : roundedFree.toFixed(1))
                                    : '';
                                  
                                  if (dayData.type === 'weekend') {
                                    bgColor = 'bg-orange-200';
                                    textColor = 'text-orange-700';
                                    displayText = 'So';
                                  } else if (dayData.type === 'holiday') {
                                    bgColor = 'bg-orange-300';
                                    textColor = 'text-orange-800';
                                    displayText = 'Feie';
                                  } else if (dayData.type === 'leave') {
                                    bgColor = 'bg-blue-100';
                                    textColor = 'text-blue-700';
                                    displayText = 'U';
                                  } else if (dayData.type === 'sick') {
                                    bgColor = 'bg-yellow-100';
                                    textColor = 'text-yellow-700';
                                    displayText = 'K';
                                  } else if (dayData.type === 'other') {
                                    bgColor = 'bg-gray-200';
                                    textColor = 'text-gray-600';
                                    displayText = 'S';
                                  }
                                  
                                  const isClickable = dayData.type !== 'weekend' && dayData.type !== 'holiday';
                                  const editedStyle = dayData.edited ? 'ring-1 ring-purple-400' : '';
                                  
                                  if (isEditing) {
                                    return (
                                      <td key={dayIdx} className="border border-gray-300 p-0 w-7 min-w-[28px] max-w-[28px]">
                                        <input type="text" value={fzulEditValue}
                                          onChange={(e) => setFzulEditValue(e.target.value)}
                                          onKeyDown={handleInlineKeyDown}
                                          onBlur={saveInlineEdit}
                                          autoFocus
                                          className="w-full h-full text-center text-xs border-2 border-green-500 outline-none"
                                          style={{ fontSize: '10px', padding: '1px', width: '28px' }}
                                        />
                                      </td>
                                    );
                                  }
                                  
                                  return (
                                    <td key={dayIdx} 
                                      className={`border border-gray-300 p-0.5 text-center w-7 min-w-[28px] max-w-[28px] overflow-hidden ${bgColor} ${textColor} ${editedStyle} ${isClickable ? 'cursor-pointer hover:bg-green-100' : ''}`}
                                      onClick={() => isClickable && startInlineEdit(dateStr)}
                                      title={dayData.type === 'holiday' ? dayData.holiday_name : undefined}>
                                      {displayText}
                                    </td>
                                  );
                                })}
                                <td className="border border-gray-300 p-0.5 text-center font-medium bg-amber-50 w-12 min-w-[48px]">
                                  {(() => {
                                    const rounded = Math.round(summary.free * 100) / 100;
                                    return rounded > 0 ? (rounded % 1 === 0 ? rounded.toString() : rounded.toFixed(1)) : '';
                                  })()}
                                </td>
                                <td className="border border-gray-300 p-0.5 text-center text-gray-400 text-xs w-16 min-w-[64px]">Unterschrift</td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="bg-amber-100 font-bold">
                            <td className="border border-gray-400 p-1 text-right" colSpan={32}>
                              Summe der Arbeitsstunden für FuE-Tätigkeiten im FuE-Vorhaben:
                            </td>
                            <td className="border border-gray-400 p-1 text-center text-green-700">
                              {(() => {
                                const total = Object.values(fzulTimesheet.monthly_summaries).reduce((sum, m) => sum + m.free, 0);
                                const rounded = Math.round(total * 100) / 100;
                                return rounded.toFixed(2).replace('.', ',');
                              })()}
                            </td>
                            <td className="border border-gray-400 p-1"></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>

                  {/* BLOCK 1: Ermittlung der Jahresarbeitszeit - Kompakt */}
                  <table className="w-full border-collapse border border-gray-400 text-xs mt-2">
                    <thead>
                      <tr className="bg-amber-200">
                        <th className="border border-gray-400 p-1 text-left" colSpan={7}>
                          1. Ermittlung der maßgeblichen vereinbarten Jahresarbeitszeit
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-gray-300 p-1">wöchentliche Arbeitszeit:</td>
                        <td className="border border-gray-300 p-1 w-16">
                          <input type="number" step="0.5" value={fzulTimesheet.yearly_calculation.weekly_hours}
                            onChange={(e) => setFzulTimesheet({...fzulTimesheet, yearly_calculation: {...fzulTimesheet.yearly_calculation, weekly_hours: parseFloat(e.target.value) || 0}})}
                            className="w-12 border rounded px-1 py-0.5 text-center text-xs" />
                        </td>
                        <td className="border border-gray-300 p-1">Stunden</td>
                        <td className="border border-gray-300 p-1 text-right" colSpan={2}>Jahresarbeitsstunden (wöchentl. × 52)</td>
                        <td className="border border-gray-300 p-1 w-16 text-right font-bold">{Math.round(fzulTimesheet.yearly_calculation.weekly_hours * 52)}</td>
                        <td className="border border-gray-300 p-1">Stunden</td>
                      </tr>
                      <tr className="text-gray-600"><td className="p-0.5 text-xs" colSpan={7}>Abzgl.</td></tr>
                      {[
                        { label: 'Arbeitsvertraglich vereinbarter Urlaubsanspruch', key: 'vacation_days_contract', editable: true },
                        { label: 'Krankheitstage', key: 'sick_days', editable: true, bg: 'bg-orange-50' },
                        { label: 'Sonderurlaub', key: 'special_leave_days', editable: true },
                        { label: 'Gesetzliche Feiertage', key: 'holiday_count', editable: false, bg: 'bg-red-50' },
                        { label: 'Kurzarbeit, Erziehungsurlaub u. ä.', key: 'short_time_days', editable: true },
                      ].map((row, idx) => {
                        const val = (fzulTimesheet.yearly_calculation as any)[row.key] || 0;
                        const hoursPerDay = fzulTimesheet.yearly_calculation.weekly_hours / 5;
                        return (
                          <tr key={idx} className={row.bg || ''}>
                            <td className="border border-gray-300 p-1 pl-4">{row.label}</td>
                            <td className="border border-gray-300 p-1">
                              {row.editable ? (
                                <input type="number" value={val}
                                  onChange={(e) => setFzulTimesheet({...fzulTimesheet, yearly_calculation: {...fzulTimesheet.yearly_calculation, [row.key]: parseInt(e.target.value) || 0}})}
                                  className={`w-12 border rounded px-1 py-0.5 text-center text-xs ${row.bg || ''}`} />
                              ) : (
                                <span className="w-12 inline-block text-center font-medium">{val}</span>
                              )}
                            </td>
                            <td className="border border-gray-300 p-1">Tage ×</td>
                            <td className="border border-gray-300 p-1 w-10 text-center">{hoursPerDay.toFixed(1)}</td>
                            <td className="border border-gray-300 p-1">Stunden =</td>
                            <td className="border border-gray-300 p-1 text-right">{Math.round(val * hoursPerDay)}</td>
                            <td className="border border-gray-300 p-1">Stunden</td>
                          </tr>
                        );
                      })}
                      <tr className="bg-amber-100 font-bold">
                        <td className="border border-gray-400 p-1" colSpan={5}>= Maßgebliche vereinbarte Jahresarbeitszeit</td>
                        <td className="border border-gray-400 p-1 text-right">
                          {(() => {
                            const yc = fzulTimesheet.yearly_calculation;
                            const hpd = yc.weekly_hours / 5;
                            const ded = (yc.vacation_days_contract + yc.sick_days + yc.special_leave_days + yc.holiday_count + yc.short_time_days) * hpd;
                            return Math.round((yc.weekly_hours * 52) - ded);
                          })()}
                        </td>
                        <td className="border border-gray-400 p-1">Stunden</td>
                      </tr>
                      <tr className="text-xs text-gray-500 italic">
                        <td className="border border-gray-300 p-1 pl-4" colSpan={2}>Ggf. Kürzung bei unterjährigem Beginn/Ende (×/12)</td>
                        <td className="border border-gray-300 p-1">
                          <input type="number" step="0.001" min="0" max="1" value={fzulTimesheet.yearly_calculation.yearly_factor}
                            onChange={(e) => setFzulTimesheet({...fzulTimesheet, yearly_calculation: {...fzulTimesheet.yearly_calculation, yearly_factor: parseFloat(e.target.value) || 1}})}
                            className="w-14 border rounded px-1 py-0.5 text-center text-xs" />
                        </td>
                        <td className="border border-gray-300 p-1" colSpan={2}></td>
                        <td className="border border-gray-300 p-1 text-right">
                          {(() => {
                            const yc = fzulTimesheet.yearly_calculation;
                            const hpd = yc.weekly_hours / 5;
                            const ded = (yc.vacation_days_contract + yc.sick_days + yc.special_leave_days + yc.holiday_count + yc.short_time_days) * hpd;
                            return Math.round(((yc.weekly_hours * 52) - ded) * yc.yearly_factor);
                          })()}
                        </td>
                        <td className="border border-gray-300 p-1">Stunden</td>
                      </tr>
                    </tbody>
                  </table>

                  {/* BLOCK 2: Anteil FuE-Tätigkeiten - Kompakt */}
                  <table className="w-full border-collapse border border-gray-400 text-xs mt-2">
                    <thead>
                      <tr className="bg-amber-200">
                        <th className="border border-gray-400 p-1 text-left" colSpan={4}>
                          2. Ermittlung des Anteils der Arbeitszeit für FuE-Tätigkeiten im FuE-Vorhaben
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-gray-300 p-1">Summe der Arbeitsstunden für FuE-Tätigkeiten</td>
                        <td className="border border-gray-300 p-1 w-20 text-right font-bold text-green-700">
                          {Math.round(Object.values(fzulTimesheet.monthly_summaries).reduce((sum, m) => sum + m.free, 0))}
                        </td>
                        <td className="border border-gray-300 p-1" colSpan={2}>Stunden</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 p-1">/  Maßgebliche vereinbarte Jahresarbeitszeit (ggf. gekürzt)</td>
                        <td className="border border-gray-300 p-1 text-right">
                          {(() => {
                            const yc = fzulTimesheet.yearly_calculation;
                            const hpd = yc.weekly_hours / 5;
                            const ded = (yc.vacation_days_contract + yc.sick_days + yc.special_leave_days + yc.holiday_count + yc.short_time_days) * hpd;
                            return Math.round(((yc.weekly_hours * 52) - ded) * yc.yearly_factor);
                          })()}
                        </td>
                        <td className="border border-gray-300 p-1" colSpan={2}>Stunden</td>
                      </tr>
                      <tr className="bg-green-100 font-bold">
                        <td className="border border-gray-400 p-1">= Anteil der Arbeitszeit für FuE-Tätigkeiten im FuE-Vorhaben</td>
                        <td className="border border-gray-400 p-1 text-right text-green-700 text-base">
                          {(() => {
                            const yc = fzulTimesheet.yearly_calculation;
                            const hpd = yc.weekly_hours / 5;
                            const ded = (yc.vacation_days_contract + yc.sick_days + yc.special_leave_days + yc.holiday_count + yc.short_time_days) * hpd;
                            const eff = ((yc.weekly_hours * 52) - ded) * yc.yearly_factor;
                            const fue = Object.values(fzulTimesheet.monthly_summaries).reduce((sum, m) => sum + m.free, 0);
                            return eff > 0 ? (Math.round((fue / eff) * 100) / 100).toFixed(2) : '0.00';
                          })()}
                        </td>
                        <td className="border border-gray-400 p-1" colSpan={2}></td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Zusatz Eigenforschung + Aktionen */}
                  <div className="mt-2 p-2 bg-gray-50 border border-gray-300 text-xs flex justify-between items-start">
                    <div>
                      <div className="font-medium mb-1">Zusätzlich bei Eigenforschung:</div>
                      <div>förderfähige Arbeitsstunden insgesamt: <strong>{Math.round(Object.values(fzulTimesheet.monthly_summaries).reduce((sum, m) => sum + m.free, 0))}</strong> Std.</div>
                      <div>Höchstgrenze: <strong>{Math.round(fzulTimesheet.yearly_calculation.weekly_hours * 52)}</strong> Std.</div>
                    </div>
                    <div className="flex gap-2">
                      <span className={`px-2 py-1 rounded text-xs ${fzulTimesheet.status === 'draft' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                        {fzulTimesheet.status === 'draft' ? 'Entwurf' : 'Gespeichert'}
                      </span>
                      <button 
                        onClick={saveFzulTimesheet} 
                        disabled={savingFzul}
                        className={`px-3 py-1 rounded text-xs flex items-center gap-1 ${
                          savingFzul 
                            ? 'bg-gray-400 cursor-not-allowed' 
                            : 'bg-blue-600 hover:bg-blue-700'
                        } text-white`}>
                        {savingFzul ? (
                          <>
                            <span className="animate-spin">⏳</span> Speichert...
                          </>
                        ) : (
                          <>💾 Speichern</>
                        )}
                      </button>
                      <button className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 opacity-50" disabled>
                        📄 PDF
                      </button>
                    </div>
                  </div>

                  {/* Eingabe-Hinweis */}
                  <div className="mt-1 p-1 bg-blue-50 border border-blue-200 text-xs text-blue-800">
                    💡 Zelle klicken → Stunden (z.B. 4) oder U/K/S eingeben → Enter
                  </div>
                </div>
              )}
            </div>
          )}

          {/* NEU v6.0: TAB PDF-ARCHIV */}
          {activeTab === 'fzul-archive' && (
            <div className="space-y-4 overflow-auto h-full">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h2 className="text-lg font-bold">📄 FZul PDF-Archiv</h2>
                    <p className="text-sm text-gray-500">Generierte Stundennachweise</p>
                  </div>
                </div>

                {loadingPdfs ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
                  </div>
                ) : fzulPdfs.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <span className="text-4xl">📄</span>
                    <p className="mt-4">Noch keine PDFs generiert</p>
                    <p className="text-sm mt-2">Erstellen Sie Stundennachweise im FZul-Editor</p>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="px-4 py-3 text-left">Dateiname</th>
                        <th className="px-4 py-3 text-center">Mitarbeiter</th>
                        <th className="px-4 py-3 text-center">Jahr</th>
                        <th className="px-4 py-3 text-center">Erstellt am</th>
                        <th className="px-4 py-3 text-right">Aktionen</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fzulPdfs.map(pdf => (
                        <tr key={pdf.id} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium">{pdf.filename}</td>
                          <td className="px-4 py-3 text-center">{pdf.employee_name}</td>
                          <td className="px-4 py-3 text-center">{pdf.year}</td>
                          <td className="px-4 py-3 text-center text-sm text-gray-500">
                            {new Date(pdf.created_at).toLocaleDateString('de-DE')}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button className="text-blue-600 hover:underline text-sm mr-3">📥 Download</button>
                            <button className="text-red-600 hover:underline text-sm">🗑️ Löschen</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

        {/* MODAL: STAMMDATEN */}
        {editingEmployee && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
              <h3 className="text-lg font-bold mb-4">✏️ Stammdaten: {editingEmployee.name}</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Wochenarbeitszeit</label>
                  <input type="number" value={editingEmployee.weekly_hours}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, weekly_hours: parseFloat(e.target.value) || 40 })}
                    className="w-full border rounded px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Jahresurlaub (Tage)</label>
                  <input type="number" value={editingEmployee.annual_leave_days}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, annual_leave_days: parseInt(e.target.value) || 30 })}
                    className="w-full border rounded px-3 py-2" />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button onClick={() => setEditingEmployee(null)} className="px-4 py-2 border rounded-lg">Abbrechen</button>
                <button onClick={saveEmployeeSettings} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Speichern</button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: LÖSCHEN */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
              <h3 className="text-lg font-bold text-red-800 mb-4">🗑️ Löschen bestätigen</h3>
              <p className="text-gray-600">
                {showDeleteConfirm.type === 'timesheet' && 'Diesen Monatseintrag löschen?'}
                {showDeleteConfirm.type === 'project' && `Projekt "${showDeleteConfirm.projectName}" mit allen Daten löschen?`}
                {showDeleteConfirm.type === 'employee' && `MA "${showDeleteConfirm.employeeName}" mit allen Daten löschen?`}
              </p>
              <div className="mt-6 flex justify-end gap-3">
                <button onClick={() => setShowDeleteConfirm(null)} className="px-4 py-2 border rounded-lg">Abbrechen</button>
                <button onClick={handleDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg">Löschen</button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: BERECHTIGUNGEN */}
        {showAccessModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold">🔐 Analyse-Berechtigungen verwalten</h3>
                <button onClick={() => setShowAccessModal(false)} className="text-gray-500 hover:text-gray-700 text-xl">×</button>
              </div>
              <p className="text-gray-600 mb-4">Wählen Sie aus, welche Administratoren Zugriff auf das Import-Modul haben sollen:</p>
              {loadingAdmins ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-3 text-gray-500">Lade Benutzer...</span>
                </div>
              ) : adminUsers.length === 0 ? (
                <div className="py-8 text-center text-gray-500">Keine Administratoren gefunden</div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {adminUsers.map(admin => (
                    <label key={admin.id}
                      className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                        admin.has_import_access ? 'border-green-300 bg-green-50' : 'border-gray-200 hover:bg-gray-50'
                      }`}>
                      <input type="checkbox" checked={admin.has_import_access} onChange={() => toggleAdminAccess(admin.id)}
                        className="w-5 h-5 text-green-600 rounded focus:ring-green-500" />
                      <div className="ml-4 flex-1">
                        <div className="font-medium">{admin.name}</div>
                        <div className="text-sm text-gray-500">{admin.email}</div>
                      </div>
                      {admin.has_import_access && <span className="text-green-600 text-sm font-medium">✓ Berechtigt</span>}
                    </label>
                  ))}
                </div>
              )}
              <div className="mt-6 pt-4 border-t flex justify-between items-center">
                <p className="text-sm text-gray-500">{adminUsers.filter(a => a.has_import_access).length} von {adminUsers.length} Admins berechtigt</p>
                <div className="flex gap-3">
                  <button onClick={() => setShowAccessModal(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Abbrechen</button>
                  <button onClick={saveAccessChanges} disabled={savingAccess}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                    {savingAccess ? 'Speichert...' : 'Speichern'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* NEU v6.0: MODAL FZUL MITARBEITER */}
        {showFzulEmployeeModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold">
                  {editingFzulEmployee ? '✏️ Mitarbeiter bearbeiten' : '➕ Neuer Mitarbeiter'}
                </h3>
                <button onClick={() => setShowFzulEmployeeModal(false)} className="text-gray-500 hover:text-gray-700 text-xl">×</button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Name *</label>
                  <input type="text" value={fzulEmployeeForm.employee_name}
                    onChange={(e) => setFzulEmployeeForm({ ...fzulEmployeeForm, employee_name: e.target.value })}
                    className="w-full border rounded px-3 py-2" placeholder="Nachname, Vorname" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Wochenstunden</label>
                    <input type="number" value={fzulEmployeeForm.weekly_hours}
                      onChange={(e) => setFzulEmployeeForm({ ...fzulEmployeeForm, weekly_hours: parseFloat(e.target.value) || 40 })}
                      className="w-full border rounded px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Urlaubstage</label>
                    <input type="number" value={fzulEmployeeForm.annual_leave_days}
                      onChange={(e) => setFzulEmployeeForm({ ...fzulEmployeeForm, annual_leave_days: parseInt(e.target.value) || 30 })}
                      className="w-full border rounded px-3 py-2" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Position/Funktion</label>
                  <input type="text" value={fzulEmployeeForm.position_title}
                    onChange={(e) => setFzulEmployeeForm({ ...fzulEmployeeForm, position_title: e.target.value })}
                    className="w-full border rounded px-3 py-2" placeholder="z.B. Entwickler, Projektleiter" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Notizen</label>
                  <textarea value={fzulEmployeeForm.notes}
                    onChange={(e) => setFzulEmployeeForm({ ...fzulEmployeeForm, notes: e.target.value })}
                    className="w-full border rounded px-3 py-2" rows={2} placeholder="Interne Bemerkungen" />
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="is_active" checked={fzulEmployeeForm.is_active}
                    onChange={(e) => setFzulEmployeeForm({ ...fzulEmployeeForm, is_active: e.target.checked })}
                    className="w-4 h-4 text-green-600 rounded" />
                  <label htmlFor="is_active" className="text-sm">Aktiver Mitarbeiter</label>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end gap-3">
                <button onClick={() => setShowFzulEmployeeModal(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">
                  Abbrechen
                </button>
                <button onClick={saveFzulEmployee} disabled={savingFzulEmployee}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
                  {savingFzulEmployee ? 'Speichert...' : 'Speichern'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* NEU: SPEICHER-ERFOLGS-MODAL */}
        {showSaveSuccessModal && fzulTimesheet && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
              <div className="text-center">
                <div className="text-5xl mb-4">✅</div>
                <h3 className="text-lg font-bold text-green-700 mb-2">Erfolgreich gespeichert!</h3>
                <p className="text-sm text-gray-600 mb-6">
                  Die Daten für <strong>{fzulTimesheet.employee_name}</strong> ({fzulTimesheet.year}) wurden gespeichert.
                </p>
                
                <div className="flex gap-3 justify-center">
                  <button 
                    onClick={() => setShowSaveSuccessModal(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
                    Weiter bearbeiten
                  </button>
                  <button 
                    onClick={() => {
                      setShowSaveSuccessModal(false);
                      // TODO: PDF-Export aufrufen
                      alert('PDF-Export wird noch implementiert...');
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2">
                    📄 PDF erstellen
                  </button>
                </div>
                
                <p className="text-xs text-gray-400 mt-4">
                  Das PDF kann auch später im PDF-Archiv abgerufen werden.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* NEU v6.0: MODAL FIRMEN-BUNDESLAND */}
        {showCompanyStateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold">🏴 Firmen-Bundesland ändern</h3>
                <button onClick={() => setShowCompanyStateModal(false)} className="text-gray-500 hover:text-gray-700 text-xl">×</button>
              </div>
              
              <p className="text-sm text-gray-600 mb-4">
                Das Bundesland bestimmt die Feiertage für alle Mitarbeiter des Unternehmens.
              </p>
              
              <div>
                <label className="block text-sm font-medium mb-1">Bundesland *</label>
                <select value={newCompanyStateCode}
                  onChange={(e) => setNewCompanyStateCode(e.target.value)}
                  className="w-full border rounded px-3 py-2">
                  {BUNDESLAENDER.map(bl => (
                    <option key={bl.code} value={bl.code}>{bl.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="mt-6 flex justify-end gap-3">
                <button onClick={() => setShowCompanyStateModal(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">
                  Abbrechen
                </button>
                <button onClick={saveCompanyState}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  Speichern
                </button>
              </div>
            </div>
          </div>
        )}

        </div>{/* Ende Tab-Content Container */}
      </main>
    </div>
  );
}