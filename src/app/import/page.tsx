// src/app/import/page.tsx
// VERSION: v4.8 - Jahres-Kacheln zeigen gebucht + verfügbar
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

// ============================================
// KONSTANTEN
// ============================================

const MONTH_NAMES = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

const MONTH_SHORT = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

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

// ============================================
// BLACKLIST FÜR TECHNISCHE SHEETS
// ============================================
// Diese Regex matcht alle Sheet-Namen, die NICHT importiert werden sollen:
// - Ermittl* (Ermittl.-Stunden)
// - Auswertung*
// - Nav*
// - PK* (Personalkosten: PK Q1, PK Q2, etc.)
// - ZAZK* (Zahlungsanforderung)
// - ZNZK* (Zahlungsnachweise)
// - Planung*
// - Übersicht
// - ZA (Zahlungsanforderung)
// - MA + Zahl (MA6, MA 10, etc. - Platzhalter)
const SHEET_BLACKLIST_PATTERN = /^(Ermittl|Auswertung|Nav|PK|ZAZK|ZNZK|Planung|Übersicht|ZA|MA\s*\d+)/i;

// ============================================
// HAUPTKOMPONENTE
// ============================================

export default function ImportPage() {
  // VERSION CHECK - in Browser-Konsole sichtbar
  console.log('[Import] Version v4.8 - Jahres-Kacheln mit gebucht/frei');
  
  const router = useRouter();
  const supabase = createClient();

  // Auth & Access
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [processing, setProcessing] = useState(false);

  // Navigation
  const [activeTab, setActiveTab] = useState<'import' | 'projects'>('projects');

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

  // Gespeicherte Daten
  const [savedTimesheets, setSavedTimesheets] = useState<ImportedTimesheet[]>([]);
  const [savedEmployees, setSavedEmployees] = useState<ImportEmployee[]>([]);

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
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!profileData) {
        setError('Profil nicht gefunden');
        setLoading(false);
        return;
      }

      // DEBUG: E-Mail in Konsole anzeigen
      console.log('[Import] Profil-E-Mail:', profileData.email);
      
      setProfile(profileData);
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
    } catch (err) {
      console.error(err);
    }
  }

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

      setAdminUsers(admins?.map(a => ({
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
  // FORMAT-ERKENNUNG
  // ============================================

  function detectFormat(wb: XLSX.WorkBook): FundingFormat {
    // 1. BMBF/KMU-innovativ: Hat "Nav" Sheet mit FKZ beginnend mit "01"
    if (wb.SheetNames.includes('Nav')) {
      const navSheet = wb.Sheets['Nav'];
      // FKZ in B6 prüfen
      const fkzCell = navSheet['B6']?.v?.toString() || '';
      if (fkzCell.match(/^01[A-Z]{2}\d/)) {
        return 'BMBF_KMU';
      }
    }

    // 2. ZIM: Hat "AP Übersicht" oder Sheets mit Arbeitspaketen (AP1, AP2, etc.)
    if (wb.SheetNames.includes('AP Übersicht')) {
      return 'ZIM';
    }

    // Arbeitspakete in Sheets suchen
    for (const sheetName of wb.SheetNames) {
      const ws = wb.Sheets[sheetName];
      // Erste 50 Zeilen durchsuchen
      for (let row = 1; row <= 50; row++) {
        const cellA = ws[XLSX.utils.encode_cell({ r: row - 1, c: 0 })]?.v?.toString() || '';
        if (cellA.match(/^AP\s?\d/i)) {
          return 'ZIM';
        }
      }
    }

    // 3. FKZ-Muster prüfen (16K... = ZIM, 01... = BMBF)
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

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

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

      // Format erkennen
      const detectedFormat = detectFormat(wb);
      setSelectedFormat(detectedFormat);

      // Projektinfo extrahieren (formatabhängig)
      const info = extractProjectInfo(wb, file.name, detectedFormat);
      setProjectInfo(info);

      // Mitarbeiter-Sheets finden
      const sheets = findEmployeeSheets(wb, detectedFormat);
      setEmployeeSheets(sheets);

      if (sheets.length === 0) {
        setError('Keine Mitarbeiter-Blätter gefunden (Format: "[Name] J1-J4")');
        setProcessing(false);
        return;
      }

      // Daten extrahieren (formatabhängig)
      const extracted: ExtractedEmployee[] = [];
      for (const sheet of sheets) {
        const data = extractEmployeeData(wb, sheet, info, detectedFormat);
        if (data) {
          extracted.push({ ...data, imported: false });
        }
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
  // PROJEKT-INFO EXTRAHIEREN (Multi-Format)
  // ============================================

  function extractProjectInfo(wb: XLSX.WorkBook, fileName: string, format: FundingFormat): ProjectInfo {
    let projectName = '', companyName = '', fundingReference = '';

    if (format === 'BMBF_KMU') {
      // BMBF: Aus Nav-Sheet lesen
      if (wb.SheetNames.includes('Nav')) {
        const navWs = wb.Sheets['Nav'];
        
        // B4: Projektname (kann sehr lang sein)
        projectName = navWs['B4']?.v?.toString() || '';
        
        // B6: FKZ (z.B. "01LY1925A")
        fundingReference = navWs['B6']?.v?.toString() || '';
        
        // B7: Unternehmen (z.B. "STOMA GmbH")
        companyName = navWs['B7']?.v?.toString() || '';
      }

      // Fallback: Projektname aus erstem MA-Sheet (A8)
      if (!projectName) {
        for (const sheetName of wb.SheetNames) {
          if (sheetName.match(/\s+J[1-4]$/)) {
            const ws = wb.Sheets[sheetName];
            projectName = ws['A8']?.v?.toString() || '';
            if (projectName) break;
          }
        }
      }
    } else {
      // ZIM: Aus AP Übersicht
      if (wb.SheetNames.includes('AP Übersicht')) {
        const ws = wb.Sheets['AP Übersicht'];
        projectName = ws['B1']?.v?.toString() || '';
        fundingReference = ws['C2']?.v?.toString() || '';
        companyName = ws['B2']?.v?.toString() || '';
      }

      // Aus Nav (falls vorhanden)
      if (wb.SheetNames.includes('Nav') && !projectName) {
        const ws = wb.Sheets['Nav'];
        projectName = ws['C3']?.v?.toString() || '';
      }
    }

    // Aus Dateiname (Fallback)
    if (!projectName || !companyName) {
      const parts = fileName.replace(/\.xlsx?$/i, '').split('_');
      if (!projectName && parts[1]) projectName = parts[1];
      if (!companyName && parts[2]) companyName = parts[2];
    }

    // FKZ suchen (falls noch nicht gefunden)
    if (!fundingReference) {
      const fkzPatterns = [
        /16K[NI]\d{5,6}/,           // ZIM
        /01[A-Z]{2}\d{4,6}[A-Z]?/,  // BMBF
      ];
      
      outer:
      for (const sheetName of wb.SheetNames) {
        const ws = wb.Sheets[sheetName];
        for (const cellRef of Object.keys(ws)) {
          if (cellRef.startsWith('!')) continue;
          const val = String(ws[cellRef]?.v || '');
          for (const pattern of fkzPatterns) {
            const match = val.match(pattern);
            if (match) {
              fundingReference = match[0];
              break outer;
            }
          }
        }
      }
    }

    return { projectName, companyName, fundingReference, fileName, format };
  }

  // ============================================
  // MITARBEITER-SHEETS FINDEN (Multi-Format)
  // ============================================

  function findEmployeeSheets(wb: XLSX.WorkBook, format: FundingFormat): EmployeeSheet[] {
    const sheets: EmployeeSheet[] = [];
    
    // NUR Sheets mit Pattern "[Name] J1" bis "[Name] J4" importieren
    // J1-J4 = Projektjahr 1-4 (max. 4 Jahre Projektlaufzeit)
    const pattern = /^(.+)\s+J([1-4])$/;

    console.log('[Import] Suche Mitarbeiter-Sheets...');

    for (const sheetName of wb.SheetNames) {
      const match = sheetName.match(pattern);
      if (match) {
        const name = match[1].trim();
        
        // ROBUSTE BLACKLIST-PRÜFUNG mit Regex
        if (SHEET_BLACKLIST_PATTERN.test(name)) {
          console.log(`[Import] ❌ Sheet ignoriert: "${sheetName}" (Blacklist-Match)`);
          continue;
        }

        console.log(`[Import] ✅ Sheet akzeptiert: "${sheetName}"`);

        // Vollständigen Namen aus Blatt extrahieren
        let fullName = name;
        const ws = wb.Sheets[sheetName];

        if (format === 'BMBF_KMU') {
          // BMBF: Name in J11 (0-basiert: Zeile 10, Spalte 9)
          const nameCell = ws[XLSX.utils.encode_cell({ r: 10, c: 9 })]?.v?.toString() || '';
          if (nameCell && !nameCell.includes('[')) {
            // Ignoriere Template-Text "[Name, Vorname]"
            fullName = nameCell.trim();
          }
        } else {
          // ZIM: Name irgendwo mit Komma suchen
          for (const cellRef of Object.keys(ws)) {
            if (cellRef.startsWith('!')) continue;
            const val = ws[cellRef]?.v?.toString() || '';
            if (val.includes(',') && val.split(',').length === 2) {
              const parts = val.split(',');
              if (parts[0].trim().toLowerCase().includes(name.toLowerCase())) {
                fullName = val.trim();
                break;
              }
            }
          }
        }

        sheets.push({
          sheetName,
          employeeName: fullName,
          projectYear: parseInt(match[2]),
          selected: true
        });
      }
    }

    console.log(`[Import] Gefunden: ${sheets.length} Mitarbeiter-Sheets`);

    return sheets.sort((a, b) => 
      a.employeeName.localeCompare(b.employeeName) || a.projectYear - b.projectYear
    );
  }

  // ============================================
  // MITARBEITER-DATEN EXTRAHIEREN (Multi-Format)
  // ============================================

  function extractEmployeeData(
    wb: XLSX.WorkBook, 
    sheet: EmployeeSheet,
    info: ProjectInfo,
    format: FundingFormat
  ): Omit<ExtractedEmployee, 'imported'> | null {
    
    if (format === 'BMBF_KMU') {
      return extractBMBFData(wb, sheet, info);
    } else {
      return extractZIMData(wb, sheet, info);
    }
  }

  // ============================================
  // BMBF/KMU-INNOVATIV PARSER
  // ============================================

  function extractBMBFData(
    wb: XLSX.WorkBook,
    sheet: EmployeeSheet,
    info: ProjectInfo
  ): Omit<ExtractedEmployee, 'imported'> | null {
    const maWs = wb.Sheets[sheet.sheetName];
    if (!maWs) return null;

    const months: MonthData[] = [];
    let totalBillable = 0, totalAbsence = 0;

    // NEUER ANSATZ: Suche nach "Vorhabenbezogen" in Spalte A
    // - Vorhabenbezogen-Zeile: Projektstunden in Spalten B-AF (1-31)
    // - 4 Zeilen darunter: Fehlzeiten
    // - 6 Zeilen darüber: Monat/Jahr (als Excel-Datum oder Text)

    console.log(`[BMBF-Parser] Analysiere Sheet: ${sheet.sheetName}`);

    // Hilfsfunktion: Excel-Datum zu Jahr/Monat konvertieren
    function excelDateToYearMonth(excelDate: number): { year: number; month: number } {
      const date = new Date((excelDate - 25569) * 86400 * 1000);
      return { year: date.getFullYear(), month: date.getMonth() + 1 };
    }

    // Hilfsfunktion: Monat aus Text extrahieren (z.B. "01 / 2021" oder "Januar 2021")
    function parseMonthFromText(text: string): { year: number; month: number } | null {
      // Format "01 / 2021" oder "01/2021"
      const slashMatch = text.match(/(\d{1,2})\s*\/\s*(\d{4})/);
      if (slashMatch) {
        return { month: parseInt(slashMatch[1]), year: parseInt(slashMatch[2]) };
      }
      
      // Format "Januar 2021" etc.
      const monthNames: Record<string, number> = {
        'januar': 1, 'februar': 2, 'märz': 3, 'april': 4, 'mai': 5, 'juni': 6,
        'juli': 7, 'august': 8, 'september': 9, 'oktober': 10, 'november': 11, 'dezember': 12
      };
      const textLower = text.toLowerCase();
      for (const [name, num] of Object.entries(monthNames)) {
        if (textLower.includes(name)) {
          const yearMatch = text.match(/(\d{4})/);
          if (yearMatch) {
            return { month: num, year: parseInt(yearMatch[1]) };
          }
        }
      }
      
      return null;
    }

    // Alle Zeilen durchsuchen wo "Vorhabenbezogen" in Spalte A steht
    const vorhabenbezogenRows: number[] = [];
    
    // Sheet-Range ermitteln
    const range = XLSX.utils.decode_range(maWs['!ref'] || 'A1:AG500');
    
    for (let r = range.s.r; r <= range.e.r; r++) {
      const cellA = maWs[XLSX.utils.encode_cell({ r, c: 0 })];
      const cellVal = cellA?.v?.toString().trim().toLowerCase() || '';
      
      if (cellVal === 'vorhabenbezogen') {
        vorhabenbezogenRows.push(r);
        console.log(`[BMBF-Parser] Gefunden: "Vorhabenbezogen" in Zeile ${r + 1}`);
      }
    }

    console.log(`[BMBF-Parser] ${vorhabenbezogenRows.length} Monatsblöcke gefunden`);

    // Für jede gefundene "Vorhabenbezogen"-Zeile die Daten extrahieren
    for (const projectRow of vorhabenbezogenRows) {
      const absenceRow = projectRow + 4;  // Fehlzeiten 4 Zeilen darunter
      const dateRow = projectRow - 6;     // Datum 6 Zeilen darüber

      // Jahr und Monat ermitteln
      let year = 2020 + sheet.projectYear - 1;  // Fallback aus Projektjahr
      let month = 1;

      // Versuche Datum aus Zelle zu lesen
      const dateCell = maWs[XLSX.utils.encode_cell({ r: dateRow, c: 0 })];
      if (dateCell?.v) {
        if (typeof dateCell.v === 'number') {
          // Excel-Datum
          const parsed = excelDateToYearMonth(dateCell.v);
          if (parsed.year >= 2015 && parsed.year <= 2030) {
            year = parsed.year;
            month = parsed.month;
          }
        } else if (typeof dateCell.v === 'string') {
          // Text wie "01 / 2021"
          const parsed = parseMonthFromText(dateCell.v);
          if (parsed) {
            year = parsed.year;
            month = parsed.month;
          }
        }
      }

      console.log(`[BMBF-Parser] Monat: ${month}/${year} (projectRow=${projectRow + 1}, dateRow=${dateRow + 1})`);

      const dailyData: MonthData['dailyData'] = {};
      let monthHours = 0;
      let monthAbsence = 0;

      // Tageswerte lesen (Spalten B=1 bis AF=31)
      for (let d = 1; d <= 31; d++) {
        const colIndex = d; // B=1, C=2, ... AF=31
        
        // Projektstunden aus "Vorhabenbezogen"-Zeile
        const hourCell = maWs[XLSX.utils.encode_cell({ r: projectRow, c: colIndex })];
        if (hourCell?.v !== undefined && hourCell?.v !== null) {
          const cellVal = hourCell.v;
          // "x" oder leere Zellen ignorieren
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

        // Fehlzeiten aus Zeile 4 unter "Vorhabenbezogen"
        const absenceCell = maWs[XLSX.utils.encode_cell({ r: absenceRow, c: colIndex })];
        if (absenceCell?.v !== undefined && absenceCell?.v !== null) {
          const absVal = absenceCell.v;
          
          if (typeof absVal === 'number' && absVal >= 4) {
            // Stundenwert als Fehlzeit (z.B. 8 = ganzer Tag)
            if (!dailyData[d] || dailyData[d].hours === 0) {
              dailyData[d] = { hours: 0, absence: 'F' };
            }
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

      // Monatssumme aus AG-Spalte (Index 32) als Prüfung
      const sumCell = maWs[XLSX.utils.encode_cell({ r: projectRow, c: 32 })];
      const excelSum = (sumCell?.v && typeof sumCell.v === 'number') ? sumCell.v : 0;
      
      console.log(`[BMBF-Parser] ${month}/${year}: berechnet=${monthHours.toFixed(2)}h, Excel-Summe=${excelSum}h, Tage=${Object.keys(dailyData).length}`);

      // Falls unsere Berechnung abweicht, Excel-Summe als Fallback
      if (monthHours === 0 && excelSum > 0) {
        monthHours = excelSum;
        console.log(`[BMBF-Parser] Verwende Excel-Summe als Fallback`);
      }

      months.push({
        month,
        year,
        billableHours: monthHours,
        absenceHours: monthAbsence,
        dailyData
      });

      totalBillable += monthHours;
      totalAbsence += monthAbsence;
    }

    console.log(`[BMBF-Parser] ${sheet.employeeName}: ${months.length} Monate, ${totalBillable.toFixed(0)}h gesamt`);

    return {
      employeeName: sheet.employeeName,
      projectYear: sheet.projectYear,
      months,
      totalBillableHours: totalBillable,
      totalAbsenceHours: totalAbsence
    };
  }

  // ============================================
  // ZIM PARSER (bestehende Logik)
  // ============================================

  function extractZIMData(
    wb: XLSX.WorkBook, 
    sheet: EmployeeSheet,
    info: ProjectInfo
  ): Omit<ExtractedEmployee, 'imported'> | null {
    const summarySheet = `Ermittl.-Stunden J${sheet.projectYear}`;
    const summaryWs = wb.Sheets[summarySheet];
    const maWs = wb.Sheets[sheet.sheetName];
    
    const months: MonthData[] = [];
    let totalBillable = 0, totalAbsence = 0;
    const year = new Date().getFullYear();

    // Hilfsfunktion: Tagesdaten aus MA-Blatt lesen
    const extractDailyDataFromSheet = (ws: XLSX.WorkSheet, monthIndex: number): MonthData['dailyData'] => {
      const dailyData: MonthData['dailyData'] = {};
      if (!ws) return dailyData;
      
      // Summenzeile für diesen Monat: Zeile 32 für Jan (Index 31), +43 pro Monat
      const sumRowIndex = 31 + (monthIndex * 43);
      
      // Tageswerte aus Summenzeile lesen (Spalte E=4 bis AI=34)
      for (let d = 1; d <= 31; d++) {
        const dayColIndex = 3 + d;
        const dayCell = ws[XLSX.utils.encode_cell({ r: sumRowIndex, c: dayColIndex })];
        
        if (dayCell?.v !== undefined && dayCell?.v !== null) {
          const val = dayCell.v;
          if (typeof val === 'number' && val > 0) {
            dailyData[d] = { hours: val, absence: null };
          }
        }
      }
      
      // Wenn keine Daten in Summenzeile, summiere AP-Zeilen
      if (Object.keys(dailyData).length === 0) {
        const apStartRow = 19 + (monthIndex * 43);
        const apEndRow = 30 + (monthIndex * 43);
        
        for (let d = 1; d <= 31; d++) {
          const dayColIndex = 3 + d;
          let dayTotal = 0;
          
          for (let apRow = apStartRow; apRow <= apEndRow; apRow++) {
            const apCell = ws[XLSX.utils.encode_cell({ r: apRow, c: dayColIndex })];
            if (apCell?.v && typeof apCell.v === 'number') {
              dayTotal += apCell.v;
            }
          }
          
          if (dayTotal > 0) {
            dailyData[d] = { hours: dayTotal, absence: null };
          }
        }
      }
      
      // Fehlzeiten lesen
      const urlaubRowIndex = 34 + (monthIndex * 43);
      const krankRowIndex = 35 + (monthIndex * 43);
      
      for (let d = 1; d <= 31; d++) {
        const dayColIndex = 3 + d;
        
        const urlaubCell = ws[XLSX.utils.encode_cell({ r: urlaubRowIndex, c: dayColIndex })];
        if (urlaubCell?.v) {
          const uVal = urlaubCell.v;
          if (uVal === 8 || String(uVal).toUpperCase().trim() === 'U') {
            dailyData[d] = { hours: 0, absence: 'U' };
            continue;
          }
        }
        
        const krankCell = ws[XLSX.utils.encode_cell({ r: krankRowIndex, c: dayColIndex })];
        if (krankCell?.v) {
          const kVal = krankCell.v;
          if (kVal === 8 || String(kVal).toUpperCase().trim() === 'K') {
            dailyData[d] = { hours: 0, absence: 'K' };
            continue;
          }
        }
      }
      
      return dailyData;
    };

    // Weg 1: Aus Zusammenfassungs-Sheet + MA-Blatt
    if (summaryWs && maWs) {
      let row = -1;
      for (let r = 1; r <= 100; r++) {
        const cell = summaryWs[XLSX.utils.encode_cell({ r: r - 1, c: 0 })];
        if (cell?.v?.toString().includes(sheet.employeeName.split(',')[0])) {
          row = r;
          break;
        }
      }

      if (row > 0) {
        for (let m = 1; m <= 12; m++) {
          const hoursCell = summaryWs[XLSX.utils.encode_cell({ r: row, c: m })];
          const hours = typeof hoursCell?.v === 'number' ? hoursCell.v : 0;

          const absenceCell = summaryWs[XLSX.utils.encode_cell({ r: row + 3, c: m })];
          const absence = typeof absenceCell?.v === 'number' ? absenceCell.v : 0;

          const dailyData = extractDailyDataFromSheet(maWs, m - 1);
          
          // Fallback: gleichmäßig verteilen
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
                if (date.getDay() !== 0 && date.getDay() !== 6) {
                  dailyData[d] = { hours: Math.round(hoursPerDay * 10) / 10, absence: null };
                }
              }
            }
          }

          months.push({
            month: m,
            year,
            billableHours: hours,
            absenceHours: absence,
            dailyData
          });

          totalBillable += hours;
          totalAbsence += absence;
        }
      }
    }

    // Weg 2 (Fallback): Nur aus MA-Blatt
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
              if (date.getDay() !== 0 && date.getDay() !== 6) {
                dailyData[d] = { hours: Math.round(hoursPerDay * 10) / 10, absence: null };
              }
            }
          }
        }

        months.push({
          month: m + 1,
          year,
          billableHours: hours,
          absenceHours: 0,
          dailyData
        });

        totalBillable += hours;
      }
    }

    return {
      employeeName: sheet.employeeName,
      projectYear: sheet.projectYear,
      months,
      totalBillableHours: totalBillable,
      totalAbsenceHours: totalAbsence
    };
  }

  // ============================================
  // FORMAT WECHSELN UND NEU PARSEN
  // ============================================

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
        if (data) {
          extracted.push({ ...data, imported: false });
        }
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

      for (const emp of extractedData) {
        // MA-Stammdaten
        await supabase.from('import_employees').upsert({
          company_id: profile.company_id,
          name: emp.employeeName,
          weekly_hours: defaultWeeklyHours,
          annual_leave_days: defaultAnnualLeave,
          updated_at: new Date().toISOString()
        }, { onConflict: 'company_id,name' });

        // Monatsdaten
        for (const month of emp.months) {
          if (month.billableHours > 0 || Object.keys(month.dailyData).length > 0) {
            await supabase.from('imported_timesheets').upsert({
              company_id: profile.company_id,
              uploaded_by: profile.id,
              employee_name: emp.employeeName,
              project_name: projectInfo.projectName,
              funding_reference: projectInfo.fundingReference,
              year: month.year,
              month: month.month,
              daily_data: month.dailyData,
              total_billable_hours: month.billableHours,
              total_absence_days: Math.round(month.absenceHours / 8),
              original_filename: projectInfo.fileName,
            }, { onConflict: 'company_id,employee_name,project_name,year,month' });
          }
        }

        importCount++;
      }

      setSuccess(`${importCount} Mitarbeiter erfolgreich importiert!`);
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
            <p className="text-gray-600 mt-2">Sie haben keine Berechtigung für das Import-Modul.</p>
            <p className="text-gray-500 text-sm mt-4">Bitten Sie einen Administrator mit Import-Berechtigung, Ihnen Zugang zu gewähren.</p>
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
    const employeeNames = [...new Set(allTimesheets.map(ts => ts.employee_name))];
    const fkz = allTimesheets[0]?.funding_reference || '';
    
    // Verfügbare Jahre ermitteln
    const availableYears = [...new Set(allTimesheets.map(ts => ts.year))].sort((a, b) => a - b);
    
    // Wenn kein Jahr ausgewählt, erstes verfügbares Jahr nehmen
    const displayYear = selectedYear && availableYears.includes(selectedYear) 
      ? selectedYear 
      : availableYears[0] || new Date().getFullYear();
    
    // Timesheets nach Jahr filtern
    const timesheets = allTimesheets.filter(ts => ts.year === displayYear);
    
    // Mitarbeiter die in diesem Jahr Daten haben
    const employeesInYear = [...new Set(timesheets.map(ts => ts.employee_name))];
    
    // Hilfsfunktion: Arbeitstage im Jahr zählen (ohne WE)
    const getWorkdaysInYear = (year: number): number => {
      let workdays = 0;
      for (let m = 0; m < 12; m++) {
        const daysInMonth = new Date(year, m + 1, 0).getDate();
        for (let d = 1; d <= daysInMonth; d++) {
          const date = new Date(year, m, d);
          const dayOfWeek = date.getDay();
          if (dayOfWeek !== 0 && dayOfWeek !== 6) workdays++;
        }
      }
      return workdays;
    };
    
    // Gesamtstunden pro Jahr berechnen (gebucht + verfügbar)
    const yearTotals = availableYears.map(year => {
      const yearTimesheets = allTimesheets.filter(ts => ts.year === year);
      const yearEmployees = [...new Set(yearTimesheets.map(ts => ts.employee_name))];
      const usedHours = yearTimesheets.reduce((s, ts) => s + ts.total_billable_hours, 0);
      
      // Verfügbare Stunden = (Arbeitstage * max Stunden/Tag) für alle MA
      const workdays = getWorkdaysInYear(year);
      let maxHours = 0;
      for (const empName of yearEmployees) {
        const settings = getEmployeeSettings(empName);
        const maxDaily = settings.weekly_hours / 5;
        maxHours += workdays * maxDaily;
      }
      
      return {
        year,
        usedHours,
        freeHours: maxHours - usedHours,
        maxHours
      };
    });
    const totalAllYears = allTimesheets.reduce((s, ts) => s + ts.total_billable_hours, 0);
    const totalMaxAllYears = yearTotals.reduce((s, yt) => s + yt.maxHours, 0);
    const totalFreeAllYears = totalMaxAllYears - totalAllYears;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button onClick={() => setSelectedProject(null)} className="text-blue-600 hover:underline">
            ← Zurück zur Übersicht
          </button>
          <button
            onClick={() => setShowDeleteConfirm({ type: 'project', projectName: selectedProject })}
            className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm"
          >
            🗑️ Projekt löschen
          </button>
        </div>

        {/* Projekt-Header mit Jahresauswahl */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold mb-2">📁 {selectedProject}</h2>
              <p className="text-gray-500">FKZ: {fkz}</p>
              <p className="text-sm text-gray-400 mt-1">
                {employeeNames.length} Mitarbeiter • {availableYears.length > 0 ? `${availableYears[0]} - ${availableYears[availableYears.length - 1]}` : ''}
              </p>
            </div>
            
            {/* Jahresauswahl - nur Dropdown */}
            {availableYears.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Jahr:</span>
                <select
                  value={displayYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="px-4 py-2 border rounded-lg bg-white font-medium text-lg"
                >
                  {availableYears.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          
          {/* Jahresübersicht */}
          <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-3">
            {yearTotals.map(({ year, usedHours, freeHours }) => (
              <div 
                key={year} 
                className={`p-3 rounded-lg text-center cursor-pointer transition-colors ${
                  year === displayYear 
                    ? 'bg-blue-100 border-2 border-blue-500' 
                    : 'bg-gray-50 hover:bg-gray-100'
                }`}
                onClick={() => setSelectedYear(year)}
              >
                <div className="text-sm text-gray-600 font-medium">{year}</div>
                <div className="font-bold text-blue-600">{usedHours.toFixed(0)}h</div>
                <div className="text-xs text-green-600">{freeHours.toFixed(0)}h frei</div>
              </div>
            ))}
            <div className="p-3 rounded-lg text-center bg-purple-50">
              <div className="text-sm text-gray-600 font-medium">Gesamt</div>
              <div className="font-bold text-purple-600">{totalAllYears.toFixed(0)}h</div>
              <div className="text-xs text-green-600">{totalFreeAllYears.toFixed(0)}h frei</div>
            </div>
          </div>
        </div>

        {/* Ansichts-Toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('table')}
            className={`px-4 py-2 rounded ${viewMode === 'table' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            📊 Monatstabelle
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={`px-4 py-2 rounded ${viewMode === 'calendar' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            📅 FZul-Kalender
          </button>
        </div>

        {/* Mitarbeiter-Liste für ausgewähltes Jahr */}
        {viewMode === 'table' && employeesInYear.map(empName => {
          const empTimesheets = timesheets.filter(ts => ts.employee_name === empName)
            .sort((a, b) => a.month - b.month);
          const settings = getEmployeeSettings(empName);
          const maxMonthly = getMaxMonthlyHours(settings.weekly_hours);
          const yearUsed = empTimesheets.reduce((s, ts) => s + ts.total_billable_hours, 0);
          const yearMax = maxMonthly * 12;
          const yearFree = yearMax - yearUsed;

          return (
            <div key={empName} className="bg-white rounded-lg shadow overflow-hidden">
              <div className="bg-gray-100 px-6 py-4 flex justify-between items-center">
                <div className="flex-1">
                  <h3 className="font-bold">👤 {empName}</h3>
                  <p className="text-sm text-gray-500">{settings.weekly_hours}h/Woche</p>
                </div>
                <div className="flex-1 text-center">
                  <div className="text-2xl font-bold text-gray-700">{displayYear}</div>
                </div>
                <div className="flex-1 text-right">
                  <div className="text-lg font-bold">
                    <span className="text-blue-600">{yearUsed.toFixed(0)}h</span>
                    <span className="text-gray-400 mx-1">/</span>
                    <span className="text-green-600">{yearFree.toFixed(0)}h frei</span>
                  </div>
                  <div className="text-xs text-gray-500">gebucht / verfügbar</div>
                </div>
              </div>

              <div className="p-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-3 py-2 text-left">Monat</th>
                      <th className="px-3 py-2 text-right">Stunden</th>
                      <th className="px-3 py-2 text-right">Max</th>
                      <th className="px-3 py-2 text-right text-green-700">Frei</th>
                      <th className="px-3 py-2 text-right">Fehltage</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Alle 12 Monate anzeigen, auch leere */}
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(month => {
                      const ts = empTimesheets.find(t => t.month === month);
                      const hours = ts?.total_billable_hours || 0;
                      const absenceDays = ts?.total_absence_days || 0;
                      
                      return (
                        <tr key={month} className={`border-b ${hours === 0 ? 'text-gray-400' : ''}`}>
                          <td className="px-3 py-2">{MONTH_NAMES[month - 1]}</td>
                          <td className="px-3 py-2 text-right">{hours > 0 ? hours.toFixed(2) : '-'}</td>
                          <td className="px-3 py-2 text-right text-gray-500">{maxMonthly.toFixed(2)}</td>
                          <td className="px-3 py-2 text-right text-green-600 font-bold">
                            {(maxMonthly - hours).toFixed(2)}
                          </td>
                          <td className="px-3 py-2 text-right text-orange-600">
                            {absenceDays > 0 ? absenceDays : '-'}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {ts && (
                              <button
                                onClick={() => setShowDeleteConfirm({ type: 'timesheet', id: ts.id })}
                                className="text-red-500 hover:text-red-700"
                              >🗑️</button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {/* Jahres-Summenzeile */}
                    <tr className="bg-blue-50 font-bold">
                      <td className="px-3 py-2">Summe</td>
                      <td className="px-3 py-2 text-right text-blue-600">{yearUsed.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right text-gray-500">{yearMax.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right text-green-600">{yearFree.toFixed(2)}</td>
                      <td className="px-3 py-2"></td>
                      <td className="px-3 py-2"></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}

        {/* Kalender-Ansicht für ausgewähltes Jahr */}
        {viewMode === 'calendar' && employeesInYear.map(empName => {
          const empTimesheets = timesheets.filter(ts => ts.employee_name === empName);
          const settings = getEmployeeSettings(empName);
          const maxDaily = settings.weekly_hours / 5;
          const yearUsed = empTimesheets.reduce((s, ts) => s + ts.total_billable_hours, 0);

          // Tagesansicht aufbauen
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
                if (data.hours) dayData[ts.month][day].hours += data.hours;
                if (data.absence) dayData[ts.month][day].absence = data.absence;
              }
            }
          }

          return (
            <div key={empName} className="bg-white rounded-lg shadow overflow-hidden">
              <div className="bg-gray-100 px-6 py-4 flex justify-between items-center">
                <div className="flex-1">
                  <h3 className="font-bold">👤 {empName}</h3>
                  <p className="text-sm text-gray-500">{settings.weekly_hours}h/Woche • Max {maxDaily}h/Tag</p>
                </div>
                <div className="flex-1 text-center">
                  <div className="text-2xl font-bold text-gray-700">{displayYear}</div>
                </div>
                <div className="flex-1 text-right">
                  <div className="text-lg font-bold">
                    <span className="text-blue-600">{yearUsed.toFixed(0)}h</span>
                    <span className="text-gray-400 mx-1">/</span>
                    <span className="text-green-600">{(() => {
                      // Verfügbare Stunden berechnen (nur Arbeitstage)
                      let availableHours = 0;
                      for (let m = 1; m <= 12; m++) {
                        const daysInMonth = getDaysInMonth(displayYear, m);
                        for (let d = 1; d <= daysInMonth; d++) {
                          const date = new Date(displayYear, m - 1, d);
                          const dayOfWeek = date.getDay();
                          if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Kein WE
                            const data = dayData[m]?.[d];
                            if (!data?.absence) {
                              availableHours += maxDaily - (data?.hours || 0);
                            }
                          }
                        }
                      }
                      return availableHours.toFixed(0);
                    })()}h frei</span>
                  </div>
                  <div className="text-xs text-gray-500">gebucht / verfügbar</div>
                </div>
              </div>

              <div className="p-4 overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-2 py-1 border text-left w-24">Monat</th>
                      {Array.from({ length: 31 }, (_, i) => (
                        <th key={i} className="px-1 py-1 border text-center w-8">{i + 1}</th>
                      ))}
                      <th className="px-2 py-1 border text-center w-16 bg-blue-50">Genutzt</th>
                      <th className="px-2 py-1 border text-center w-16 bg-green-50">Frei</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(month => {
                      const daysInMonth = getDaysInMonth(displayYear, month);
                      const monthTs = empTimesheets.find(t => t.month === month);
                      const monthHours = monthTs?.total_billable_hours || 0;
                      
                      // Verfügbare Stunden im Monat berechnen (nur Arbeitstage)
                      let monthFree = 0;
                      for (let d = 1; d <= daysInMonth; d++) {
                        const date = new Date(displayYear, month - 1, d);
                        const dayOfWeek = date.getDay();
                        if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Kein WE
                          const data = dayData[month]?.[d];
                          if (!data?.absence) {
                            monthFree += maxDaily - (data?.hours || 0);
                          }
                        }
                      }

                      return (
                        <tr key={month}>
                          <td className="px-2 py-1 border font-medium bg-gray-50">
                            {MONTH_NAMES[month - 1].substring(0, 3)}
                          </td>
                          {Array.from({ length: 31 }, (_, d) => d + 1).map(day => {
                            const data = dayData[month]?.[day];
                            const isValidDay = day <= daysInMonth;
                            
                            if (!isValidDay) {
                              return <td key={day} className="px-1 py-1 border bg-gray-100"></td>;
                            }

                            // Wochenende prüfen
                            const date = new Date(displayYear, month - 1, day);
                            const dayOfWeek = date.getDay();
                            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                            
                            if (isWeekend) {
                              return <td key={day} className="px-1 py-1 border bg-gray-200 text-gray-400 text-center">-</td>;
                            }

                            // AMPEL-LOGIK: Verfügbarkeit anzeigen
                            // Grün = voll verfügbar (8h)
                            // Gelb = teilverfügbar (zeigt freie Stunden)
                            // Rot = belegt (0h frei)
                            // Orange = Abwesenheit (ohne Text)
                            // Grau = Wochenende/Feiertag
                            
                            let bgColor = 'bg-green-200';  // Default: voll verfügbar
                            let textColor = 'text-green-800';
                            let content: string = maxDaily.toString();  // Zeigt verfügbare Stunden
                            
                            if (data?.absence) {
                              // Abwesenheit - nur orange, kein Text
                              bgColor = 'bg-orange-200';
                              textColor = 'text-orange-800';
                              content = '';
                            } else if (data?.hours > 0) {
                              const freeHours = maxDaily - data.hours;
                              
                              if (freeHours <= 0) {
                                // Voll belegt
                                bgColor = 'bg-red-300';
                                textColor = 'text-red-900 font-bold';
                                content = '0';
                              } else if (freeHours < maxDaily) {
                                // Teilverfügbar
                                bgColor = 'bg-yellow-200';
                                textColor = 'text-yellow-800';
                                content = freeHours.toFixed(1).replace('.0', '');
                              }
                            }

                            return (
                              <td 
                                key={day} 
                                className={`px-1 py-1 border text-center ${bgColor} ${textColor}`}
                                title={`${day}. ${MONTH_NAMES[month - 1]}: ${data?.hours || 0}h genutzt, ${maxDaily - (data?.hours || 0)}h frei`}
                              >
                                {content}
                              </td>
                            );
                          })}
                          <td className="px-2 py-1 border text-center font-bold bg-blue-50 text-blue-700">
                            {monthHours > 0 ? monthHours.toFixed(0) : '-'}
                          </td>
                          <td className="px-2 py-1 border text-center font-bold bg-green-50 text-green-700">
                            {monthFree > 0 ? monthFree.toFixed(0) : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                
                {/* Legende - Ampel für Verfügbarkeit */}
                <div className="mt-3 flex gap-6 text-xs items-center">
                  <span className="font-medium text-gray-600">Verfügbarkeit:</span>
                  <span className="flex items-center gap-1">
                    <span className="w-4 h-4 bg-green-200 border rounded"></span> 
                    <span>Frei ({maxDaily}h)</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-4 h-4 bg-yellow-200 border rounded"></span> 
                    <span>Teilweise</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-4 h-4 bg-red-300 border rounded"></span> 
                    <span>Belegt</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-4 h-4 bg-orange-200 border rounded"></span> 
                    <span>Abwesend</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-4 h-4 bg-gray-200 border rounded"></span> 
                    <span>Wochenende</span>
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {employeesInYear.length === 0 && (
          <div className="bg-yellow-50 p-6 rounded-lg text-center">
            <p className="text-yellow-700">Keine Daten für {displayYear} vorhanden.</p>
            <p className="text-sm text-gray-500 mt-2">
              Verfügbare Jahre: {availableYears.join(', ')}
            </p>
          </div>
        )}
      </div>
    );
  };


  // ============================================
  // RENDER: HAUPTSEITE
  // ============================================

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">📥 Stundennachweis-Import</h1>
          <p className="text-gray-600">Projektabrechnungen importieren und Kapazitäten auswerten</p>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex justify-between">
            {error}
            <button onClick={() => setError('')}>×</button>
          </div>
        )}
        {success && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex justify-between">
            {success}
            <button onClick={() => setSuccess('')}>×</button>
          </div>
        )}

        {/* Tab-Navigation */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="flex justify-between items-center">
            <div className="flex gap-6">
              <button
                onClick={() => { setActiveTab('projects'); setSelectedProject(null); setSelectedEmployee(null); }}
                className={`px-1 py-3 border-b-2 font-medium ${
                  activeTab === 'projects' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'
                }`}
              >
                📁 Projekte {projects.length > 0 && <span className="ml-1 text-xs bg-blue-100 px-2 py-0.5 rounded-full">{projects.length}</span>}
              </button>
              <button
                onClick={() => { setActiveTab('import'); setImportStep('upload'); }}
                className={`px-1 py-3 border-b-2 font-medium ${
                  activeTab === 'import' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'
                }`}
              >
                ➕ Neuer Import
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

        {/* TAB: PROJEKTE */}
        {activeTab === 'projects' && !selectedProject && (
          <div className="space-y-4">
            {projects.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <span className="text-5xl">📭</span>
                <h2 className="text-xl font-bold mt-4">Keine Projekte</h2>
                <p className="text-gray-600 mt-2">Importieren Sie eine Excel-Datei</p>
                <button
                  onClick={() => setActiveTab('import')}
                  className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
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
                  <div
                    key={proj}
                    onClick={() => setSelectedProject(proj)}
                    className="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-lg transition-shadow"
                  >
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
            {/* UPLOAD */}
            {importStep === 'upload' && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-bold mb-4">Excel-Projektabrechnung hochladen</h2>
                
                {/* Unterstützte Formate */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium text-gray-700 mb-2">Unterstützte Formate:</h3>
                  <div className="flex flex-wrap gap-2">
                    <span className={`px-3 py-1 rounded-full border text-sm ${FORMAT_INFO.ZIM.color}`}>
                      {FORMAT_INFO.ZIM.name}
                    </span>
                    <span className={`px-3 py-1 rounded-full border text-sm ${FORMAT_INFO.BMBF_KMU.color}`}>
                      {FORMAT_INFO.BMBF_KMU.name}
                    </span>
                    <span className={`px-3 py-1 rounded-full border text-sm ${FORMAT_INFO.FZUL.color}`}>
                      {FORMAT_INFO.FZUL.name} (geplant)
                    </span>
                  </div>
                </div>

                <div
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                    isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'
                  }`}
                >
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileInput}
                    className="hidden"
                    id="file-upload"
                  />
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

            {/* PREVIEW */}
            {importStep === 'preview' && projectInfo && (
              <div className="space-y-6">
                {/* Projekt-Info mit Format-Badge */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex justify-between items-start mb-4">
                    <h2 className="text-lg font-bold">📁 {projectInfo.projectName}</h2>
                    {/* Format-Badge */}
                    <span className={`px-3 py-1 rounded-full border text-sm font-medium ${FORMAT_INFO[projectInfo.format].color}`}>
                      {FORMAT_INFO[projectInfo.format].name}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Firma:</span>
                      <p className="font-medium">{projectInfo.companyName || '-'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">FKZ:</span>
                      <p className="font-medium">{projectInfo.fundingReference || '-'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Datei:</span>
                      <p className="font-medium truncate">{projectInfo.fileName}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Mitarbeiter:</span>
                      <p className="font-medium">{extractedData.length} gefunden</p>
                    </div>
                  </div>

                  {/* Format-Auswahl falls falsch erkannt */}
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm text-gray-500 mb-2">Format falsch erkannt? Manuell auswählen:</p>
                    <div className="flex gap-2">
                      {(['ZIM', 'BMBF_KMU'] as FundingFormat[]).map(fmt => (
                        <button
                          key={fmt}
                          onClick={() => reprocessWithFormat(fmt)}
                          disabled={processing}
                          className={`px-3 py-1 rounded border text-sm ${
                            selectedFormat === fmt 
                              ? FORMAT_INFO[fmt].color + ' font-bold'
                              : 'bg-white text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          {FORMAT_INFO[fmt].name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Standard-Werte */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h3 className="font-bold text-yellow-800 mb-3">⚙️ Standard-Stammdaten (für alle MA)</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Wochenarbeitszeit</label>
                      <input
                        type="number"
                        value={defaultWeeklyHours}
                        onChange={(e) => setDefaultWeeklyHours(parseFloat(e.target.value) || 40)}
                        className="w-24 border rounded px-3 py-2"
                      />
                      <span className="ml-2 text-gray-500">h</span>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Jahresurlaub</label>
                      <input
                        type="number"
                        value={defaultAnnualLeave}
                        onChange={(e) => setDefaultAnnualLeave(parseInt(e.target.value) || 30)}
                        className="w-24 border rounded px-3 py-2"
                      />
                      <span className="ml-2 text-gray-500">Tage</span>
                    </div>
                  </div>
                </div>

                {/* MA-Übersicht */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="bg-gray-100 px-6 py-4">
                    <h3 className="font-bold">👥 Erkannte Mitarbeiter ({extractedData.length})</h3>
                  </div>
                  <div className="divide-y">
                    {extractedData.map((emp, idx) => (
                      <div key={idx} className="px-6 py-4 flex justify-between items-center">
                        <div>
                          <div className="font-medium">{emp.employeeName}</div>
                          <div className="text-sm text-gray-500">
                            Projektjahr {emp.projectYear} • {emp.months.filter(m => m.billableHours > 0).length} Monate mit Daten
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-blue-600">{emp.totalBillableHours.toFixed(0)}h</div>
                          {emp.totalAbsenceHours > 0 && (
                            <div className="text-sm text-orange-600">{(emp.totalAbsenceHours / 8).toFixed(0)} Fehltage</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Aktionen */}
                <div className="flex justify-between">
                  <button
                    onClick={() => {
                      setWorkbook(null);
                      setProjectInfo(null);
                      setExtractedData([]);
                      setImportStep('upload');
                      setSelectedFormat(null);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    ← Andere Datei
                  </button>
                  <button
                    onClick={importAllEmployees}
                    disabled={processing}
                    className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-bold"
                  >
                    {processing ? 'Importiert...' : `✅ Alle ${extractedData.length} MA importieren`}
                  </button>
                </div>
              </div>
            )}

            {/* DONE */}
            {importStep === 'done' && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
                <span className="text-5xl">✅</span>
                <h2 className="text-xl font-bold text-green-800 mt-4">Import abgeschlossen!</h2>
                <p className="text-green-600 mt-2">{extractedData.length} Mitarbeiter wurden importiert.</p>
                {projectInfo && (
                  <p className="text-gray-500 text-sm mt-1">
                    Format: {FORMAT_INFO[projectInfo.format].name}
                  </p>
                )}
                <div className="mt-6 flex justify-center gap-4">
                  <button
                    onClick={() => { setActiveTab('projects'); setImportStep('upload'); }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    📁 Zu Projekten
                  </button>
                  <button
                    onClick={() => {
                      setWorkbook(null);
                      setProjectInfo(null);
                      setExtractedData([]);
                      setImportStep('upload');
                      setSelectedFormat(null);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    ➕ Weitere Datei
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* MODAL: STAMMDATEN */}
        {editingEmployee && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
              <h3 className="text-lg font-bold mb-4">✏️ Stammdaten: {editingEmployee.name}</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Wochenarbeitszeit</label>
                  <input
                    type="number"
                    value={editingEmployee.weekly_hours}
                    onChange={(e) => setEditingEmployee({
                      ...editingEmployee,
                      weekly_hours: parseFloat(e.target.value) || 40
                    })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Jahresurlaub (Tage)</label>
                  <input
                    type="number"
                    value={editingEmployee.annual_leave_days}
                    onChange={(e) => setEditingEmployee({
                      ...editingEmployee,
                      annual_leave_days: parseInt(e.target.value) || 30
                    })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button onClick={() => setEditingEmployee(null)} className="px-4 py-2 border rounded-lg">
                  Abbrechen
                </button>
                <button onClick={saveEmployeeSettings} className="px-4 py-2 bg-blue-600 text-white rounded-lg">
                  Speichern
                </button>
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
                <button onClick={() => setShowDeleteConfirm(null)} className="px-4 py-2 border rounded-lg">
                  Abbrechen
                </button>
                <button onClick={handleDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg">
                  Löschen
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: BERECHTIGUNGEN */}
        {showAccessModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold">🔐 Import-Berechtigungen verwalten</h3>
                <button 
                  onClick={() => setShowAccessModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-xl"
                >
                  ×
                </button>
              </div>

              <p className="text-gray-600 mb-4">
                Wählen Sie aus, welche Administratoren Zugriff auf das Import-Modul haben sollen:
              </p>

              {loadingAdmins ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-3 text-gray-500">Lade Benutzer...</span>
                </div>
              ) : adminUsers.length === 0 ? (
                <div className="py-8 text-center text-gray-500">
                  Keine Administratoren gefunden
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {adminUsers.map(admin => (
                    <label 
                      key={admin.id}
                      className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                        admin.has_import_access 
                          ? 'border-green-300 bg-green-50' 
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={admin.has_import_access}
                        onChange={() => toggleAdminAccess(admin.id)}
                        className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
                      />
                      <div className="ml-4 flex-1">
                        <div className="font-medium">{admin.name}</div>
                        <div className="text-sm text-gray-500">{admin.email}</div>
                      </div>
                      {admin.has_import_access && (
                        <span className="text-green-600 text-sm font-medium">✓ Berechtigt</span>
                      )}
                    </label>
                  ))}
                </div>
              )}

              <div className="mt-6 pt-4 border-t flex justify-between items-center">
                <p className="text-sm text-gray-500">
                  {adminUsers.filter(a => a.has_import_access).length} von {adminUsers.length} Admins berechtigt
                </p>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setShowAccessModal(false)} 
                    className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                  >
                    Abbrechen
                  </button>
                  <button 
                    onClick={saveAccessChanges}
                    disabled={savingAccess}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {savingAccess ? 'Speichert...' : 'Speichern'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}