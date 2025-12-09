// src/app/import/page.tsx
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
}

interface ProjectInfo {
  projectName: string;
  companyName: string;
  fundingReference: string;
  fileName: string;
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

const MONTH_ROW_OFFSET = 43;

// ============================================
// HAUPTKOMPONENTE
// ============================================

export default function ImportPage() {
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
  const [activeTab, setActiveTab] = useState<'import' | 'projects' | 'employees'>('projects');

  // Import States
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [projectInfo, setProjectInfo] = useState<ProjectInfo | null>(null);
  const [employeeSheets, setEmployeeSheets] = useState<EmployeeSheet[]>([]);
  const [extractedData, setExtractedData] = useState<ExtractedEmployee[]>([]);
  const [importStep, setImportStep] = useState<'upload' | 'preview' | 'done'>('upload');

  // Stammdaten (Standard-Werte)
  const [defaultWeeklyHours, setDefaultWeeklyHours] = useState(40);
  const [defaultAnnualLeave, setDefaultAnnualLeave] = useState(30);

  // Gespeicherte Daten
  const [savedTimesheets, setSavedTimesheets] = useState<ImportedTimesheet[]>([]);
  const [savedEmployees, setSavedEmployees] = useState<ImportEmployee[]>([]);

  // Auswertungs-States
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table');

  // Modals
  const [editingEmployee, setEditingEmployee] = useState<ImportEmployee | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{
    type: 'timesheet' | 'employee' | 'project';
    id?: string;
    employeeName?: string;
    projectName?: string;
  } | null>(null);

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
  // HILFSFUNKTIONEN
  // ============================================

  // Alle Projekte aus den Timesheets
  const projects = [...new Set(savedTimesheets.map(ts => ts.project_name))].sort();
  
  // Alle Mitarbeiter
  const employees = [...new Set(savedTimesheets.map(ts => ts.employee_name))].sort();

  // Timesheets für ein Projekt
  const getProjectTimesheets = (projectName: string) => 
    savedTimesheets.filter(ts => ts.project_name === projectName);

  // Timesheets für einen MA
  const getEmployeeTimesheets = (employeeName: string) =>
    savedTimesheets.filter(ts => ts.employee_name === employeeName);

  // MA-Einstellungen
  const getEmployeeSettings = (name: string) =>
    savedEmployees.find(e => e.name === name) || {
      weekly_hours: defaultWeeklyHours,
      annual_leave_days: defaultAnnualLeave
    };

  // Max monatliche Stunden
  const getMaxMonthlyHours = (weeklyHours: number) => (weeklyHours * 52) / 12;

  // Tage im Monat
  const getDaysInMonth = (year: number, month: number) => new Date(year, month, 0).getDate();

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

    if (!file.name.match(/\.xlsx?$/i)) {
      setError('Bitte nur Excel-Dateien (.xlsx) hochladen');
      setProcessing(false);
      return;
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const wb = XLSX.read(arrayBuffer, { type: 'array' });

      const info = extractProjectInfo(wb, file.name);
      setProjectInfo(info);

      const sheets = findEmployeeSheets(wb);
      setEmployeeSheets(sheets);

      if (sheets.length === 0) {
        setError('Keine Mitarbeiter-Blätter gefunden (Format: "[Name] J1")');
        setProcessing(false);
        return;
      }

      // Alle MA-Daten extrahieren
      const extracted: ExtractedEmployee[] = [];
      for (const sheet of sheets) {
        const data = extractEmployeeData(wb, sheet, info);
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

  function extractProjectInfo(wb: XLSX.WorkBook, fileName: string): ProjectInfo {
    let projectName = '', companyName = '', fundingReference = '';

    // Aus AP Übersicht
    if (wb.SheetNames.includes('AP Übersicht')) {
      const ws = wb.Sheets['AP Übersicht'];
      projectName = ws['B1']?.v?.toString() || '';
      fundingReference = ws['C2']?.v?.toString() || '';
      companyName = ws['B2']?.v?.toString() || '';
    }

    // Aus Nav
    if (wb.SheetNames.includes('Nav')) {
      const ws = wb.Sheets['Nav'];
      if (!projectName) projectName = ws['C3']?.v?.toString() || '';
    }

    // Aus Dateiname
    if (!projectName || !companyName) {
      const parts = fileName.replace(/\.xlsx?$/i, '').split('_');
      if (!projectName && parts[1]) projectName = parts[1];
      if (!companyName && parts[2]) companyName = parts[2];
    }

    // FKZ suchen
    if (!fundingReference) {
      for (const sheetName of wb.SheetNames) {
        const ws = wb.Sheets[sheetName];
        for (const cell of Object.values(ws)) {
          if (cell?.v) {
            const match = String(cell.v).match(/16K[NI]\d{5,6}/);
            if (match) {
              fundingReference = match[0];
              break;
            }
          }
        }
        if (fundingReference) break;
      }
    }

    return { projectName, companyName, fundingReference, fileName };
  }

  function findEmployeeSheets(wb: XLSX.WorkBook): EmployeeSheet[] {
    const sheets: EmployeeSheet[] = [];
    const pattern = /^(.+)\s+J(\d)$/;

    for (const sheetName of wb.SheetNames) {
      const match = sheetName.match(pattern);
      if (match) {
        const name = match[1].trim();
        if (name.includes('Ermittl') || name.includes('Auswertung') || /^MA\d+$/.test(name)) {
          continue;
        }

        // Vollständigen Namen aus Blatt extrahieren
        let fullName = name;
        const ws = wb.Sheets[sheetName];
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

        sheets.push({
          sheetName,
          employeeName: fullName,
          projectYear: parseInt(match[2]),
          selected: true
        });
      }
    }

    return sheets.sort((a, b) => 
      a.employeeName.localeCompare(b.employeeName) || a.projectYear - b.projectYear
    );
  }

  function extractEmployeeData(
    wb: XLSX.WorkBook, 
    sheet: EmployeeSheet,
    info: ProjectInfo
  ): Omit<ExtractedEmployee, 'imported'> | null {
    const summarySheet = `Ermittl.-Stunden J${sheet.projectYear}`;
    const summaryWs = wb.Sheets[summarySheet];
    const maWs = wb.Sheets[sheet.sheetName]; // MA-Blatt für Tagesdaten
    
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
        const dayColIndex = 3 + d; // Tag 1 = Spalte E = Index 4
        const dayCell = ws[XLSX.utils.encode_cell({ r: sumRowIndex, c: dayColIndex })];
        
        if (dayCell?.v !== undefined && dayCell?.v !== null) {
          const val = dayCell.v;
          if (typeof val === 'number' && val > 0) {
            dailyData[d] = { hours: val, absence: null };
          }
        }
      }
      
      // Wenn keine Daten in Summenzeile, summiere AP-Zeilen (20-31 für Jan)
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
        
        // Urlaub
        const urlaubCell = ws[XLSX.utils.encode_cell({ r: urlaubRowIndex, c: dayColIndex })];
        if (urlaubCell?.v) {
          const uVal = urlaubCell.v;
          if (uVal === 8 || String(uVal).toUpperCase().trim() === 'U') {
            dailyData[d] = { hours: 0, absence: 'U' };
            continue;
          }
        }
        
        // Krankheit
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

    // Weg 1: Aus Zusammenfassungs-Sheet (Monatssummen) + MA-Blatt (Tagesdaten)
    if (summaryWs && maWs) {
      // Finde MA-Zeile in Zusammenfassung
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

          // WICHTIG: Tagesdaten aus MA-Blatt laden!
          const dailyData = extractDailyDataFromSheet(maWs, m - 1);
          
          // Fallback: Wenn keine Tagesdaten aber Stunden vorhanden, gleichmäßig verteilen
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

    // Weg 2 (Fallback): Nur aus MA-Blatt lesen
    if (months.length === 0 && maWs) {
      for (let m = 0; m < 12; m++) {
        const sumRowIndex = 31 + (m * 43);
        const sumCell = maWs[XLSX.utils.encode_cell({ r: sumRowIndex, c: 35 })];
        const hours = typeof sumCell?.v === 'number' ? sumCell.v : 0;

        const dailyData = extractDailyDataFromSheet(maWs, m);
        
        // Fallback: gleichmäßig verteilen
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
              original_filename: projectInfo.fileName
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

    const timesheets = getProjectTimesheets(selectedProject);
    const employeeNames = [...new Set(timesheets.map(ts => ts.employee_name))];
    const fkz = timesheets[0]?.funding_reference || '';

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

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-2">📁 {selectedProject}</h2>
          <p className="text-gray-500">FKZ: {fkz}</p>
        </div>

        {/* Pro Mitarbeiter eine Tabelle */}
        {employeeNames.map(empName => {
          const empTimesheets = timesheets.filter(ts => ts.employee_name === empName)
            .sort((a, b) => a.year - b.year || a.month - b.month);
          const settings = getEmployeeSettings(empName);
          const maxMonthly = getMaxMonthlyHours(settings.weekly_hours);
          const totalUsed = empTimesheets.reduce((s, ts) => s + ts.total_billable_hours, 0);
          const totalFree = (maxMonthly * 12) - totalUsed;

          return (
            <div key={empName} className="bg-white rounded-lg shadow overflow-hidden">
              <div className="bg-gray-100 px-6 py-4 flex justify-between items-center">
                <div>
                  <h3 className="font-bold">👤 {empName}</h3>
                  <p className="text-sm text-gray-500">{settings.weekly_hours}h/Woche</p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-blue-600">{totalUsed.toFixed(0)}h genutzt</div>
                  <div className="text-sm text-green-600">{totalFree.toFixed(0)}h frei</div>
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
                    {empTimesheets.map(ts => (
                      <tr key={ts.id} className="border-b">
                        <td className="px-3 py-2">{MONTH_NAMES[ts.month - 1]} {ts.year}</td>
                        <td className="px-3 py-2 text-right">{ts.total_billable_hours.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right text-gray-500">{maxMonthly.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right text-green-600 font-bold">
                          {(maxMonthly - ts.total_billable_hours).toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-right text-orange-600">
                          {ts.total_absence_days || '-'}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            onClick={() => setShowDeleteConfirm({ type: 'timesheet', id: ts.id })}
                            className="text-red-500 hover:text-red-700"
                          >🗑️</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // ============================================
  // RENDER: MA-DETAIL MIT JAHRESÜBERSICHT
  // ============================================

  const renderEmployeeDetail = () => {
    if (!selectedEmployee) return null;

    const timesheets = getEmployeeTimesheets(selectedEmployee);
    const settings = getEmployeeSettings(selectedEmployee);
    const maxMonthly = getMaxMonthlyHours(settings.weekly_hours);
    const maxDaily = settings.weekly_hours / 5; // 8h bei 40h/Woche

    // Gruppiere nach Projekt
    const projectGroups: Record<string, ImportedTimesheet[]> = {};
    for (const ts of timesheets) {
      if (!projectGroups[ts.project_name]) projectGroups[ts.project_name] = [];
      projectGroups[ts.project_name].push(ts);
    }

    // Jahreskalender-Daten aufbauen (alle Projekte zusammen)
    // Format: yearData[month][day] = { used, free, projects, absence }
    const yearData: Record<number, Record<number, { 
      used: number; 
      free: number; 
      projects: Record<string, number>;
      absence: string | null;
    }>> = {};
    
    for (const ts of timesheets) {
      if (!yearData[ts.month]) yearData[ts.month] = {};
      
      // Tägliche Daten
      const daily = ts.daily_data || {};
      for (let day = 1; day <= 31; day++) {
        if (!yearData[ts.month][day]) {
          yearData[ts.month][day] = { used: 0, free: maxDaily, projects: {}, absence: null };
        }
        const dayData = daily[day.toString()] || daily[day];
        if (dayData) {
          if (dayData.hours) {
            yearData[ts.month][day].used += dayData.hours;
            yearData[ts.month][day].free = maxDaily - yearData[ts.month][day].used;
            yearData[ts.month][day].projects[ts.project_name] = 
              (yearData[ts.month][day].projects[ts.project_name] || 0) + dayData.hours;
          }
          if (dayData.absence) {
            yearData[ts.month][day].absence = dayData.absence;
          }
        }
      }
    }

    // Monats-Summen
    const monthlySums: { month: number; used: number; free: number }[] = [];
    for (let m = 1; m <= 12; m++) {
      const monthTimesheets = timesheets.filter(ts => ts.month === m);
      const used = monthTimesheets.reduce((s, ts) => s + ts.total_billable_hours, 0);
      monthlySums.push({ month: m, used, free: maxMonthly - used });
    }

    const totalUsed = timesheets.reduce((s, ts) => s + ts.total_billable_hours, 0);
    const totalFree = (maxMonthly * 12) - totalUsed;

    // Jahr ermitteln (aus ersten Timesheet oder aktuelles Jahr)
    const displayYear = timesheets[0]?.year || new Date().getFullYear();

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button onClick={() => setSelectedEmployee(null)} className="text-blue-600 hover:underline">
            ← Zurück zur Übersicht
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => setEditingEmployee({
                id: savedEmployees.find(e => e.name === selectedEmployee)?.id || '',
                company_id: profile!.company_id,
                name: selectedEmployee,
                weekly_hours: settings.weekly_hours,
                annual_leave_days: settings.annual_leave_days
              })}
              className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm"
            >
              ✏️ Stammdaten
            </button>
            <button
              onClick={() => setShowDeleteConfirm({ type: 'employee', employeeName: selectedEmployee })}
              className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm"
            >
              🗑️ Löschen
            </button>
          </div>
        </div>

        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-2">👤 {selectedEmployee}</h2>
          <p className="text-gray-500">{settings.weekly_hours}h/Woche • {settings.annual_leave_days} Urlaubstage</p>
          
          {/* Projekte des MA */}
          <div className="mt-4 flex flex-wrap gap-2">
            {Object.keys(projectGroups).map(proj => (
              <span key={proj} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                {proj}
              </span>
            ))}
          </div>
        </div>

        {/* Zusammenfassung */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-blue-600">{totalUsed.toFixed(0)}h</div>
            <div className="text-sm text-gray-600">Genutzt (alle Projekte)</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-green-600">{totalFree.toFixed(0)}h</div>
            <div className="text-sm text-gray-600">Frei verfügbar</div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-yellow-600">{maxMonthly.toFixed(0)}h</div>
            <div className="text-sm text-gray-600">Max. pro Monat</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-purple-600">{Object.keys(projectGroups).length}</div>
            <div className="text-sm text-gray-600">Projekte</div>
          </div>
        </div>

        {/* Ansicht-Umschalter */}
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('table')}
            className={`px-4 py-2 rounded ${viewMode === 'table' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            📊 Tabelle
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={`px-4 py-2 rounded ${viewMode === 'calendar' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            📅 Kalender (FZul)
          </button>
        </div>

        {/* Tabellen-Ansicht */}
        {viewMode === 'table' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-bold mb-4">📊 Monatsübersicht</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-3 py-2 text-left">Monat</th>
                  {Object.keys(projectGroups).map(p => (
                    <th key={p} className="px-3 py-2 text-right">{p}</th>
                  ))}
                  <th className="px-3 py-2 text-right font-bold">Gesamt</th>
                  <th className="px-3 py-2 text-right">Max</th>
                  <th className="px-3 py-2 text-right text-green-700">Frei</th>
                </tr>
              </thead>
              <tbody>
                {monthlySums.map(({ month, used, free }) => (
                  <tr key={month} className="border-b">
                    <td className="px-3 py-2 font-medium">{MONTH_NAMES[month - 1]}</td>
                    {Object.entries(projectGroups).map(([proj, tss]) => {
                      const monthTs = tss.find(ts => ts.month === month);
                      return (
                        <td key={proj} className="px-3 py-2 text-right">
                          {monthTs ? monthTs.total_billable_hours.toFixed(0) : '-'}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 text-right font-bold">{used > 0 ? used.toFixed(0) : '-'}</td>
                    <td className="px-3 py-2 text-right text-gray-500">{maxMonthly.toFixed(0)}</td>
                    <td className="px-3 py-2 text-right text-green-600 font-bold">{free.toFixed(0)}</td>
                  </tr>
                ))}
                <tr className="bg-gray-100 font-bold">
                  <td className="px-3 py-2">SUMME</td>
                  {Object.values(projectGroups).map((tss, i) => (
                    <td key={i} className="px-3 py-2 text-right">
                      {tss.reduce((s, ts) => s + ts.total_billable_hours, 0).toFixed(0)}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-right">{totalUsed.toFixed(0)}</td>
                  <td className="px-3 py-2 text-right text-gray-500">{(maxMonthly * 12).toFixed(0)}</td>
                  <td className="px-3 py-2 text-right text-green-600">{totalFree.toFixed(0)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* ============================================ */}
        {/* KALENDER-ANSICHT (FZul-Format) - ZWEI TABELLEN */}
        {/* Monate VERTIKAL (Zeilen), Tage HORIZONTAL (Spalten) */}
        {/* ============================================ */}
        {viewMode === 'calendar' && (
          <div className="space-y-8">
            
            {/* ========== KALENDER 1: GENUTZTE STUNDEN ========== */}
            <div className="bg-white rounded-lg shadow p-6 overflow-x-auto">
              <h3 className="font-bold mb-4 text-blue-800">
                📋 FZul-Übersicht "Genutzte Stunden" - {selectedEmployee} ({displayYear})
              </h3>
              
              {/* Legende Genutzt */}
              <div className="mb-4 flex flex-wrap gap-4 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 bg-blue-200 border"></div>
                  <span>Projektstunden</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 bg-blue-100 border"></div>
                  <span>U = Urlaub</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 bg-red-200 border"></div>
                  <span>K = Krank</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 bg-orange-200 border"></div>
                  <span>KA = Kurzarbeit</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 bg-gray-300 border"></div>
                  <span>- = nicht vorhanden</span>
                </div>
              </div>

              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-blue-50">
                    <th className="px-2 py-2 text-left sticky left-0 bg-blue-50 z-10 border font-bold min-w-[50px]">
                      Monat
                    </th>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                      <th key={day} className="px-0 py-2 text-center border font-medium w-[26px] min-w-[26px]">
                        {day}
                      </th>
                    ))}
                    <th className="px-2 py-2 text-center border font-bold bg-blue-100 min-w-[45px]">
                      Insg.
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {MONTH_SHORT.map((monthName, monthIndex) => {
                    const month = monthIndex + 1;
                    const daysInMonth = getDaysInMonth(displayYear, month);
                    let monthTotal = 0;
                    
                    return (
                      <tr key={month} className="border-b">
                        <td className="px-2 py-1 font-medium sticky left-0 bg-white z-10 border">
                          {monthName}
                        </td>
                        
                        {Array.from({ length: 31 }, (_, i) => i + 1).map(day => {
                          // Tag existiert nicht
                          if (day > daysInMonth) {
                            return (
                              <td key={day} className="px-0 py-1 text-center bg-gray-200 border text-gray-400 text-[10px]">
                                -
                              </td>
                            );
                          }
                          
                          const dayInfo = yearData[month]?.[day];
                          const used = dayInfo?.used || 0;
                          const absence = dayInfo?.absence;
                          
                          if (used > 0) monthTotal += used;
                          
                          // Fehlzeit
                          if (absence) {
                            let bgColor = 'bg-gray-100';
                            if (absence === 'U') bgColor = 'bg-blue-100';
                            else if (absence === 'K') bgColor = 'bg-red-200';
                            else if (absence === 'KA') bgColor = 'bg-orange-200';
                            else if (absence === 'S') bgColor = 'bg-purple-100';
                            else if (absence === 'F') bgColor = 'bg-gray-300';
                            
                            return (
                              <td key={day} className={`px-0 py-1 text-center ${bgColor} border font-bold text-[10px]`}>
                                {absence}
                              </td>
                            );
                          }
                          
                          // Stunden
                          return (
                            <td key={day} className={`px-0 py-1 text-center border text-[10px] ${used > 0 ? 'bg-blue-200 font-bold' : ''}`}>
                              {used > 0 ? used : '-'}
                            </td>
                          );
                        })}
                        
                        <td className="px-2 py-1 text-center font-bold bg-blue-100 border">
                          {monthTotal > 0 ? monthTotal.toFixed(0) : '0'}
                        </td>
                      </tr>
                    );
                  })}
                  
                  <tr className="bg-blue-200 font-bold">
                    <td className="px-2 py-2 sticky left-0 bg-blue-200 z-10 border">GESAMT</td>
                    <td colSpan={31} className="border"></td>
                    <td className="px-2 py-2 text-center border">{totalUsed.toFixed(0)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* ========== KALENDER 2: FREIE STUNDEN ========== */}
            <div className="bg-white rounded-lg shadow p-6 overflow-x-auto">
              <h3 className="font-bold mb-4 text-green-800">
                📊 FZul-Übersicht "Freie Projektstunden" - {selectedEmployee} ({displayYear})
              </h3>
              
              {/* Legende Frei */}
              <div className="mb-4 flex flex-wrap gap-4 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 bg-green-300 border"></div>
                  <span>Voll verfügbar ({maxDaily}h)</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 bg-yellow-200 border"></div>
                  <span>Teilweise verfügbar</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 bg-red-300 border"></div>
                  <span>Nicht verfügbar (0h)</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 bg-gray-300 border"></div>
                  <span>Fehlzeit/kein Tag</span>
                </div>
              </div>

              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-green-50">
                    <th className="px-2 py-2 text-left sticky left-0 bg-green-50 z-10 border font-bold min-w-[50px]">
                      Monat
                    </th>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                      <th key={day} className="px-0 py-2 text-center border font-medium w-[26px] min-w-[26px]">
                        {day}
                      </th>
                    ))}
                    <th className="px-2 py-2 text-center border font-bold bg-green-100 min-w-[45px]">
                      Insg.
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {MONTH_SHORT.map((monthName, monthIndex) => {
                    const month = monthIndex + 1;
                    const daysInMonth = getDaysInMonth(displayYear, month);
                    let monthFreeTotal = 0;
                    let workDaysInMonth = 0;
                    
                    // Arbeitstage zählen (Mo-Fr, ohne Feiertage - vereinfacht)
                    for (let d = 1; d <= daysInMonth; d++) {
                      const date = new Date(displayYear, month - 1, d);
                      if (date.getDay() !== 0 && date.getDay() !== 6) {
                        workDaysInMonth++;
                      }
                    }
                    
                    return (
                      <tr key={month} className="border-b">
                        <td className="px-2 py-1 font-medium sticky left-0 bg-white z-10 border">
                          {monthName}
                        </td>
                        
                        {Array.from({ length: 31 }, (_, i) => i + 1).map(day => {
                          // Tag existiert nicht
                          if (day > daysInMonth) {
                            return (
                              <td key={day} className="px-0 py-1 text-center bg-gray-200 border text-gray-400 text-[10px]">
                                -
                              </td>
                            );
                          }
                          
                          // Wochenende prüfen
                          const date = new Date(displayYear, month - 1, day);
                          const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                          
                          if (isWeekend) {
                            return (
                              <td key={day} className="px-0 py-1 text-center bg-gray-200 border text-gray-400 text-[10px]">
                                -
                              </td>
                            );
                          }
                          
                          const dayInfo = yearData[month]?.[day];
                          const used = dayInfo?.used || 0;
                          const absence = dayInfo?.absence;
                          
                          // Fehlzeit = nicht verfügbar
                          if (absence) {
                            return (
                              <td key={day} className="px-0 py-1 text-center bg-gray-300 border text-gray-500 text-[10px]">
                                {absence}
                              </td>
                            );
                          }
                          
                          // Freie Stunden berechnen
                          const free = maxDaily - used;
                          monthFreeTotal += free;
                          
                          // Farbkodierung
                          let bgColor = 'bg-green-300'; // Voll frei
                          if (free < maxDaily && free > 0) bgColor = 'bg-yellow-200'; // Teilweise
                          else if (free <= 0) bgColor = 'bg-red-300'; // Nicht verfügbar
                          
                          return (
                            <td key={day} className={`px-0 py-1 text-center ${bgColor} border font-bold text-[10px]`}>
                              {free > 0 ? free : '0'}
                            </td>
                          );
                        })}
                        
                        <td className="px-2 py-1 text-center font-bold bg-green-100 border">
                          {monthFreeTotal > 0 ? monthFreeTotal.toFixed(0) : '0'}
                        </td>
                      </tr>
                    );
                  })}
                  
                  <tr className="bg-green-200 font-bold">
                    <td className="px-2 py-2 sticky left-0 bg-green-200 z-10 border">GESAMT</td>
                    <td colSpan={31} className="border"></td>
                    <td className="px-2 py-2 text-center border">{totalFree.toFixed(0)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            {/* Debug-Info für daily_data */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-xs">
              <h4 className="font-bold text-yellow-800 mb-2">🔍 Debug: Geladene Tagesdaten</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {timesheets.slice(0, 4).map((ts, idx) => (
                  <div key={idx} className="bg-white p-2 rounded border">
                    <div className="font-medium">{MONTH_NAMES[ts.month - 1]} {ts.year}</div>
                    <div className="text-gray-500">
                      daily_data: {ts.daily_data ? Object.keys(ts.daily_data).length + ' Einträge' : 'KEINE'}
                    </div>
                    {ts.daily_data && (
                      <div className="text-[10px] text-gray-600 mt-1">
                        Keys: {Object.keys(ts.daily_data).slice(0, 5).join(', ')}...
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <p className="mt-2 text-yellow-700">
                Falls keine Tagesdaten angezeigt werden, sind die daily_data möglicherweise nicht korrekt importiert worden.
              </p>
            </div>
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
        {/* Titel */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">📥 Stundennachweis-Import</h1>
          <p className="text-gray-600">Projektabrechnungen importieren und Kapazitäten auswerten</p>
        </div>

        {/* Meldungen */}
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
          <nav className="flex gap-6">
            <button
              onClick={() => { setActiveTab('projects'); setSelectedProject(null); setSelectedEmployee(null); }}
              className={`px-1 py-3 border-b-2 font-medium ${
                activeTab === 'projects' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'
              }`}
            >
              📁 Projekte {projects.length > 0 && <span className="ml-1 text-xs bg-blue-100 px-2 py-0.5 rounded-full">{projects.length}</span>}
            </button>
            <button
              onClick={() => { setActiveTab('employees'); setSelectedProject(null); setSelectedEmployee(null); }}
              className={`px-1 py-3 border-b-2 font-medium ${
                activeTab === 'employees' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'
              }`}
            >
              👥 Mitarbeiter {employees.length > 0 && <span className="ml-1 text-xs bg-blue-100 px-2 py-0.5 rounded-full">{employees.length}</span>}
            </button>
            <button
              onClick={() => { setActiveTab('import'); setImportStep('upload'); }}
              className={`px-1 py-3 border-b-2 font-medium ${
                activeTab === 'import' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'
              }`}
            >
              ➕ Neuer Import
            </button>
          </nav>
        </div>

        {/* ============================================ */}
        {/* TAB: PROJEKTE */}
        {/* ============================================ */}
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

        {/* ============================================ */}
        {/* TAB: MITARBEITER */}
        {/* ============================================ */}
        {activeTab === 'employees' && !selectedEmployee && (
          <div className="space-y-4">
            {employees.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <span className="text-5xl">📭</span>
                <h2 className="text-xl font-bold mt-4">Keine Mitarbeiter</h2>
                <button
                  onClick={() => setActiveTab('import')}
                  className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  ➕ Import starten
                </button>
              </div>
            ) : (
              employees.map(emp => {
                const tss = getEmployeeTimesheets(emp);
                const settings = getEmployeeSettings(emp);
                const projs = [...new Set(tss.map(ts => ts.project_name))];
                const totalUsed = tss.reduce((s, ts) => s + ts.total_billable_hours, 0);
                const maxYearly = getMaxMonthlyHours(settings.weekly_hours) * 12;
                const totalFree = maxYearly - totalUsed;

                return (
                  <div
                    key={emp}
                    onClick={() => setSelectedEmployee(emp)}
                    className="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-lg transition-shadow"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-bold">👤 {emp}</h3>
                        <p className="text-gray-500 text-sm">{settings.weekly_hours}h/Woche</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {projs.map(p => (
                            <span key={p} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">{p}</span>
                          ))}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-blue-600">{totalUsed.toFixed(0)}h genutzt</div>
                        <div className="text-lg font-bold text-green-600">{totalFree.toFixed(0)}h frei</div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {activeTab === 'employees' && selectedEmployee && renderEmployeeDetail()}

        {/* ============================================ */}
        {/* TAB: NEUER IMPORT */}
        {/* ============================================ */}
        {activeTab === 'import' && (
          <>
            {/* UPLOAD */}
            {importStep === 'upload' && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-bold mb-4">Excel-Projektabrechnung hochladen</h2>

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

            {/* PREVIEW - ALLE MA */}
            {importStep === 'preview' && projectInfo && (
              <div className="space-y-6">
                {/* Projekt-Info */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-bold mb-4">📁 {projectInfo.projectName}</h2>
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
                            Projektjahr {emp.projectYear} • {emp.months.filter(m => m.billableHours > 0).length} Monate
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-blue-600">{emp.totalBillableHours.toFixed(0)}h</div>
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
                <div className="mt-6 flex justify-center gap-4">
                  <button
                    onClick={() => { setActiveTab('projects'); setImportStep('upload'); }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    📁 Zu Projekten
                  </button>
                  <button
                    onClick={() => { setActiveTab('employees'); setImportStep('upload'); }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    👥 Zu Mitarbeitern
                  </button>
                  <button
                    onClick={() => {
                      setWorkbook(null);
                      setProjectInfo(null);
                      setExtractedData([]);
                      setImportStep('upload');
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

        {/* ============================================ */}
        {/* MODAL: STAMMDATEN */}
        {/* ============================================ */}
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

        {/* ============================================ */}
        {/* MODAL: LÖSCHEN */}
        {/* ============================================ */}
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
      </main>
    </div>
  );
}