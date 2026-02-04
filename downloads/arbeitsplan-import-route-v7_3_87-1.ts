// src/app/api/v7/arbeitsplan-import/route.ts
// ============================================================================
// PZE V7 - Arbeitsplan Excel-Import
// ============================================================================
// Datum: 03. Februar 2026
// Version: 7.3.87
//
// Importiert Arbeitspakete aus einer Excel-Datei
// - Neue APs werden angelegt
// - Bestehende APs werden aktualisiert (Matching über AP-Nr.)
// - APs werden NICHT automatisch gelöscht
//
// POST Request:
// - FormData mit 'file' (Excel) und 'projectId'
// - Optional: 'mode' = 'preview' | 'import' (default: preview)
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import ExcelJS from 'exceljs';

// Supabase Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// ============================================================================
// TYPEN
// ============================================================================

interface ParsedWorkPackage {
  ap_number: number;
  ap_sub_number: number | null;
  ap_code: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  assignments: {
    employee_number: number;
    planned_pm: number;
  }[];
  total_pm: number;
}

interface TeamMember {
  id: string;
  employee_id: string;
  employee_number: number;
}

interface ExistingWorkPackage {
  id: string;
  ap_number: number;
  ap_sub_number: number | null;
  name: string;
  start_date: string | null;
  end_date: string | null;
  planned_pm: number | null;
}

interface ImportPreviewResult {
  success: boolean;
  parsed: ParsedWorkPackage[];
  newAPs: ParsedWorkPackage[];
  updateAPs: {
    existing: ExistingWorkPackage;
    updated: ParsedWorkPackage;
    changes: string[];
  }[];
  unchangedAPs: string[];
  errors: string[];
  warnings: string[];
}

interface ImportResult {
  success: boolean;
  created: number;
  updated: number;
  assignmentsCreated: number;
  assignmentsUpdated: number;
  errors: string[];
}

// ============================================================================
// HELPER FUNKTIONEN
// ============================================================================

/**
 * Parst AP-Nummer String zu ap_number und ap_sub_number
 * "1" -> { ap_number: 1, ap_sub_number: null }
 * "1.1" -> { ap_number: 1, ap_sub_number: 1 }
 * "2.1.3" -> { ap_number: 2, ap_sub_number: 13 }
 */
function parseAPNumber(apStr: any): { ap_number: number; ap_sub_number: number | null; ap_code: string } | null {
  if (apStr === null || apStr === undefined) return null;
  
  // Zahl direkt verarbeiten
  if (typeof apStr === 'number') {
    if (Number.isInteger(apStr)) {
      return { ap_number: apStr, ap_sub_number: null, ap_code: `AP${apStr}` };
    }
    // Dezimalzahl wie 1.1 -> ap_number: 1, ap_sub_number: 1
    const str = apStr.toString();
    const parts = str.split('.');
    const mainNum = parseInt(parts[0]);
    const subNum = parseInt(parts[1]);
    if (!isNaN(mainNum) && !isNaN(subNum)) {
      return { ap_number: mainNum, ap_sub_number: subNum, ap_code: `AP${str}` };
    }
    return { ap_number: Math.floor(apStr), ap_sub_number: null, ap_code: `AP${Math.floor(apStr)}` };
  }
  
  // String verarbeiten
  const cleaned = apStr.toString().trim();
  if (!cleaned) return null;
  
  const parts = cleaned.split('.');
  
  if (parts.length === 1) {
    // Nur Hauptnummer: "1", "2"
    const num = parseInt(parts[0]);
    if (isNaN(num)) return null;
    return { ap_number: num, ap_sub_number: null, ap_code: `AP${num}` };
  }
  
  // Mit Unternummer: "1.1", "2.1.3"
  const mainNum = parseInt(parts[0]);
  if (isNaN(mainNum)) return null;
  
  // Unternummern zusammenfügen: "1.3" -> 13, "1.2.1" -> 121
  const subParts = parts.slice(1).join('');
  const subNum = parseInt(subParts);
  if (isNaN(subNum)) return null;
  
  return { 
    ap_number: mainNum, 
    ap_sub_number: subNum, 
    ap_code: `AP${cleaned}` 
  };
}

/**
 * Parst Datum aus Excel-Zelle
 */
function parseDate(value: any): string | null {
  if (!value) return null;
  
  // Excel Date object
  if (value instanceof Date) {
    return value.toISOString().split('T')[0];
  }
  
  // ExcelJS kann Dates auch als Object mit formula/result liefern
  if (typeof value === 'object' && value !== null) {
    if (value.result instanceof Date) {
      return value.result.toISOString().split('T')[0];
    }
    if (value.text) {
      value = value.text;
    }
  }
  
  // String verarbeiten
  if (typeof value === 'string') {
    // Format: "2026-05-01 00:00:00" (Excel datetime string)
    if (value.match(/^\d{4}-\d{2}-\d{2}/)) {
      return value.substring(0, 10);
    }
    
    // Format: TT.MM.JJJJ
    const match = value.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (match) {
      const [, day, month, year] = match;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }
  
  // Zahl (Excel serial date)
  if (typeof value === 'number') {
    // Excel serial date to JS Date
    const excelEpoch = new Date(1899, 11, 30);
    const jsDate = new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000);
    return jsDate.toISOString().split('T')[0];
  }
  
  return null;
}

/**
 * Parst PM-Wert aus Excel-Zelle
 */
function parsePM(value: any): number {
  if (value === null || value === undefined || value === '') return 0;
  
  if (typeof value === 'number') return value;
  
  if (typeof value === 'string') {
    // Komma durch Punkt ersetzen
    const cleaned = value.replace(',', '.').trim();
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }
  
  return 0;
}

// ============================================================================
// EXCEL PARSER
// ============================================================================

async function parseExcel(
  buffer: Buffer, 
  teamMembers: TeamMember[]
): Promise<{ packages: ParsedWorkPackage[]; errors: string[]; warnings: string[] }> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  
  const worksheet = workbook.getWorksheet(1);
  if (!worksheet) {
    return { packages: [], errors: ['Keine Arbeitsmappe gefunden'], warnings: [] };
  }
  
  const packages: ParsedWorkPackage[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Team-Map für schnellen Lookup
  const teamByNumber = new Map<number, TeamMember>();
  teamMembers.forEach(tm => {
    if (tm.employee_number) {
      teamByNumber.set(tm.employee_number, tm);
    }
  });
  
  // Header analysieren (Zeile 1-3)
  // Spalten: A=AP-Nr, B=Beschreibung, C=von, D=bis, E...=MA-PM, letzte=Summe
  const headerRow1 = worksheet.getRow(1);
  const maColumns: number[] = []; // Spaltenindizes für MA-PM
  
  headerRow1.eachCell((cell, colNumber) => {
    const value = cell.value?.toString() || '';
    if (value.startsWith('MA-Nr')) {
      maColumns.push(colNumber);
    }
  });
  
  if (maColumns.length === 0) {
    errors.push('Keine MA-Spalten gefunden. Bitte korrekte Vorlage verwenden.');
    return { packages, errors, warnings };
  }
  
  // Datenzeilen lesen (ab Zeile 4)
  for (let rowNum = 4; rowNum <= worksheet.rowCount; rowNum++) {
    const row = worksheet.getRow(rowNum);
    
    // AP-Nr. (Spalte A)
    const apNrValue = row.getCell(1).value;
    if (!apNrValue) continue; // Leere Zeile überspringen
    
    const apNrStr = apNrValue.toString().trim();
    if (!apNrStr) continue;
    
    // Beispielzeile überspringen
    const beschreibung = row.getCell(2).value?.toString() || '';
    if (beschreibung.toLowerCase().includes('beispiel') && beschreibung.toLowerCase().includes('löschen')) {
      continue;
    }
    
    // AP-Nummer parsen
    const parsed = parseAPNumber(apNrStr);
    if (!parsed) {
      warnings.push(`Zeile ${rowNum}: Ungültige AP-Nr. "${apNrStr}" - übersprungen`);
      continue;
    }
    
    // Daten extrahieren
    const name = beschreibung || `Arbeitspaket ${apNrStr}`;
    const startDate = parseDate(row.getCell(3).value);
    const endDate = parseDate(row.getCell(4).value);
    
    // MA-Zuordnungen
    const assignments: { employee_number: number; planned_pm: number }[] = [];
    
    maColumns.forEach((colIdx, maIdx) => {
      const pm = parsePM(row.getCell(colIdx).value);
      if (pm > 0) {
        const employeeNumber = maIdx + 1; // MA-Nr entspricht der Reihenfolge
        
        // Prüfen ob MA im Team existiert
        if (!teamByNumber.has(employeeNumber)) {
          warnings.push(`Zeile ${rowNum}: MA-Nr ${employeeNumber} ist nicht im Projektteam`);
        } else {
          assignments.push({ employee_number: employeeNumber, planned_pm: pm });
        }
      }
    });
    
    // Summe berechnen
    const totalPM = assignments.reduce((sum, a) => sum + a.planned_pm, 0);
    
    packages.push({
      ap_number: parsed.ap_number,
      ap_sub_number: parsed.ap_sub_number,
      ap_code: parsed.ap_code,
      name,
      start_date: startDate,
      end_date: endDate,
      assignments,
      total_pm: totalPM,
    });
  }
  
  return { packages, errors, warnings };
}

// ============================================================================
// PREVIEW FUNKTION
// ============================================================================

async function generatePreview(
  projectId: string,
  packages: ParsedWorkPackage[],
  supabase: any
): Promise<ImportPreviewResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Bestehende APs laden
  const { data: existingAPs, error: loadError } = await supabase
    .from('v7_work_packages')
    .select('id, ap_number, ap_sub_number, name, start_date, end_date, planned_pm')
    .eq('project_id', projectId)
    .eq('is_active', true);
  
  if (loadError) {
    errors.push('Fehler beim Laden bestehender Arbeitspakete');
    return { success: false, parsed: packages, newAPs: [], updateAPs: [], unchangedAPs: [], errors, warnings };
  }
  
  // Map für schnellen Lookup: "ap_number-ap_sub_number" -> ExistingWP
  const existingMap = new Map<string, ExistingWorkPackage>();
  (existingAPs || []).forEach((ap: ExistingWorkPackage) => {
    const key = `${ap.ap_number}-${ap.ap_sub_number ?? 'null'}`;
    existingMap.set(key, ap);
  });
  
  const newAPs: ParsedWorkPackage[] = [];
  const updateAPs: { existing: ExistingWorkPackage; updated: ParsedWorkPackage; changes: string[] }[] = [];
  const unchangedAPs: string[] = [];
  
  packages.forEach(pkg => {
    const key = `${pkg.ap_number}-${pkg.ap_sub_number ?? 'null'}`;
    const existing = existingMap.get(key);
    
    if (!existing) {
      // Neues AP
      newAPs.push(pkg);
    } else {
      // Bestehendes AP - Änderungen prüfen
      const changes: string[] = [];
      
      if (existing.name !== pkg.name) {
        changes.push(`Name: "${existing.name}" → "${pkg.name}"`);
      }
      if (existing.start_date !== pkg.start_date) {
        changes.push(`Start: ${existing.start_date || '-'} → ${pkg.start_date || '-'}`);
      }
      if (existing.end_date !== pkg.end_date) {
        changes.push(`Ende: ${existing.end_date || '-'} → ${pkg.end_date || '-'}`);
      }
      if ((existing.planned_pm || 0) !== pkg.total_pm) {
        changes.push(`PM: ${existing.planned_pm || 0} → ${pkg.total_pm}`);
      }
      
      if (changes.length > 0) {
        updateAPs.push({ existing, updated: pkg, changes });
      } else {
        unchangedAPs.push(pkg.ap_code);
      }
    }
  });
  
  return {
    success: true,
    parsed: packages,
    newAPs,
    updateAPs,
    unchangedAPs,
    errors,
    warnings,
  };
}

// ============================================================================
// IMPORT FUNKTION
// ============================================================================

async function executeImport(
  projectId: string,
  packages: ParsedWorkPackage[],
  teamMembers: TeamMember[],
  supabase: any
): Promise<ImportResult> {
  const errors: string[] = [];
  let created = 0;
  let updated = 0;
  let assignmentsCreated = 0;
  let assignmentsUpdated = 0;
  
  // Team-Map
  const teamByNumber = new Map<number, TeamMember>();
  teamMembers.forEach(tm => {
    if (tm.employee_number) {
      teamByNumber.set(tm.employee_number, tm);
    }
  });
  
  // Bestehende APs laden
  const { data: existingAPs } = await supabase
    .from('v7_work_packages')
    .select('id, ap_number, ap_sub_number')
    .eq('project_id', projectId)
    .eq('is_active', true);
  
  const existingMap = new Map<string, string>(); // key -> id
  (existingAPs || []).forEach((ap: any) => {
    const key = `${ap.ap_number}-${ap.ap_sub_number ?? 'null'}`;
    existingMap.set(key, ap.id);
  });
  
  for (const pkg of packages) {
    const key = `${pkg.ap_number}-${pkg.ap_sub_number ?? 'null'}`;
    const existingId = existingMap.get(key);
    
    let workPackageId: string;
    
    if (existingId) {
      // UPDATE bestehendes AP
      const { error: updateError } = await supabase
        .from('v7_work_packages')
        .update({
          name: pkg.name,
          start_date: pkg.start_date,
          end_date: pkg.end_date,
          planned_pm: pkg.total_pm,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingId);
      
      if (updateError) {
        errors.push(`Fehler beim Update von ${pkg.ap_code}: ${updateError.message}`);
        continue;
      }
      
      workPackageId = existingId;
      updated++;
    } else {
      // INSERT neues AP
      const { data: newAP, error: insertError } = await supabase
        .from('v7_work_packages')
        .insert({
          project_id: projectId,
          ap_number: pkg.ap_number,
          ap_sub_number: pkg.ap_sub_number,
          ap_code: pkg.ap_code,
          name: pkg.name,
          start_date: pkg.start_date,
          end_date: pkg.end_date,
          planned_pm: pkg.total_pm,
          is_active: true,
        })
        .select('id')
        .single();
      
      if (insertError || !newAP) {
        errors.push(`Fehler beim Anlegen von ${pkg.ap_code}: ${insertError?.message}`);
        continue;
      }
      
      workPackageId = newAP.id;
      created++;
    }
    
    // MA-Zuordnungen verarbeiten
    for (const assignment of pkg.assignments) {
      const teamMember = teamByNumber.get(assignment.employee_number);
      if (!teamMember) continue;
      
      // Prüfen ob Assignment existiert
      const { data: existingAssignment } = await supabase
        .from('v7_work_package_assignments')
        .select('id')
        .eq('work_package_id', workPackageId)
        .eq('employee_id', teamMember.employee_id)
        .maybeSingle();
      
      if (existingAssignment) {
        // UPDATE
        const { error } = await supabase
          .from('v7_work_package_assignments')
          .update({
            planned_pm: assignment.planned_pm,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingAssignment.id);
        
        if (!error) assignmentsUpdated++;
      } else {
        // INSERT
        const { error } = await supabase
          .from('v7_work_package_assignments')
          .insert({
            work_package_id: workPackageId,
            employee_id: teamMember.employee_id,
            planned_pm: assignment.planned_pm,
            is_active: true,
          });
        
        if (!error) assignmentsCreated++;
      }
    }
  }
  
  return {
    success: errors.length === 0,
    created,
    updated,
    assignmentsCreated,
    assignmentsUpdated,
    errors,
  };
}

// ============================================================================
// API HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const projectId = formData.get('projectId') as string;
    const mode = (formData.get('mode') as string) || 'preview';
    
    if (!file) {
      return NextResponse.json({ error: 'Keine Datei hochgeladen' }, { status: 400 });
    }
    
    if (!projectId) {
      return NextResponse.json({ error: 'projectId fehlt' }, { status: 400 });
    }
    
    // Supabase Client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Team laden
    const { data: teamData, error: teamError } = await supabase
      .from('v7_project_assignments')
      .select('id, employee_id, employee_number')
      .eq('project_id', projectId)
      .eq('is_active', true)
      .not('employee_number', 'is', null);
    
    if (teamError || !teamData || teamData.length === 0) {
      return NextResponse.json(
        { error: 'Kein Team definiert. Bitte zuerst Mitarbeiter zum Projektteam hinzufügen.' },
        { status: 400 }
      );
    }
    
    const teamMembers: TeamMember[] = teamData;
    
    // Excel parsen
    const buffer = Buffer.from(await file.arrayBuffer());
    const { packages, errors: parseErrors, warnings } = await parseExcel(buffer, teamMembers);
    
    if (parseErrors.length > 0) {
      return NextResponse.json({ 
        success: false, 
        errors: parseErrors, 
        warnings 
      }, { status: 400 });
    }
    
    if (packages.length === 0) {
      return NextResponse.json({ 
        success: false, 
        errors: ['Keine Arbeitspakete in der Datei gefunden'], 
        warnings 
      }, { status: 400 });
    }
    
    if (mode === 'preview') {
      // Vorschau generieren
      const preview = await generatePreview(projectId, packages, supabase);
      preview.warnings.push(...warnings);
      return NextResponse.json(preview);
    } else {
      // Import ausführen
      const result = await executeImport(projectId, packages, teamMembers, supabase);
      return NextResponse.json(result);
    }
    
  } catch (error: any) {
    console.error('Import-Fehler:', error);
    return NextResponse.json(
      { error: `Fehler beim Import: ${error.message}` },
      { status: 500 }
    );
  }
}
