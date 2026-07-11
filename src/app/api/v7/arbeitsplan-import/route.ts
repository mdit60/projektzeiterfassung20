// src/app/api/v7/arbeitsplan-import/route.ts
// ============================================================================
// PZE V7 - Arbeitsplan Excel-Import
// ============================================================================
// Datum: 06. Februar 2026
// Version: 7.3.90
//
// v7.3.90 NEU: JSON-Eingang (Content-Type application/json) mit bereits geparsten
//              Arbeitspaketen (packages) fuer den PDF-Antragsimport. Der Excel-Pfad
//              (formData) bleibt unveraendert. Gemeinsames Backend fuer beide Frontends.
//              JSON-Pakete werden durch dieselbe parseAPNumber() normalisiert, damit die
//              AP-Nummerierung identisch zum Excel-Import ist.
//
// v7.3.89 NEU: is_technical Spalte fuer ZIM-Durchfuehrbarkeitsstudien
//              Spalte E = "T" (Technisch: X oder leer)
//
// Importiert Arbeitspakete aus einer Excel-Datei
// - Neue APs werden angelegt
// - Bestehende APs werden aktualisiert (Matching ueber AP-Nr.)
// - APs werden NICHT automatisch geloescht
//
// Excel-Vorlage Spalten:
// A: AP-Nr. (1, 1.1, 2, etc.)
// B: Beschreibung
// C: von (Datum)
// D: bis (Datum)
// E: T (Technisch: X = ja, leer = nein) - NEU!
// F+: MA-Spalten (PM-Werte)
// Letzte: Summe (wird ignoriert)
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
  is_technical: boolean;  // NEU: Technisches AP
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
  is_technical: boolean | null;  // NEU
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
  
  // Unternummern zusammenfuegen: "1.3" -> 13, "1.2.1" -> 121
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
    
    // Format: TT.MM.JJ (zweistelliges Jahr)
    const match2 = value.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2})$/);
    if (match2) {
      const [, day, month, shortYear] = match2;
      const year = parseInt(shortYear) > 50 ? `19${shortYear}` : `20${shortYear}`;
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

/**
 * Parst "Technisch" Flag aus Excel-Zelle
 * X, x, 1, true, ja, yes -> true
 * Alles andere -> false
 */
function parseTechnical(value: any): boolean {
  if (value === null || value === undefined || value === '') return false;
  
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  
  if (typeof value === 'string') {
    const cleaned = value.trim().toLowerCase();
    return cleaned === 'x' || cleaned === '1' || cleaned === 'true' || 
           cleaned === 'ja' || cleaned === 'yes' || cleaned === 't';
  }
  
  return false;
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
  
  // Team-Map fuer schnellen Lookup
  const teamByNumber = new Map<number, TeamMember>();
  teamMembers.forEach(tm => {
    if (tm.employee_number) {
      teamByNumber.set(tm.employee_number, tm);
    }
  });
  
  // Header analysieren (Zeile 1-3)
  // NEUE Spalten-Struktur:
  // A=AP-Nr, B=Beschreibung, C=von, D=bis, E=Technisch (T), F...=MA-PM, letzte=Summe
  const headerRow1 = worksheet.getRow(1);
  const maColumns: number[] = []; // Spaltenindizes fuer MA-PM
  let technicalColumn: number | null = null;
  
  headerRow1.eachCell((cell, colNumber) => {
    const value = cell.value?.toString() || '';
    if (value.startsWith('MA-Nr') || value.match(/^MA\s*\d/i)) {
      maColumns.push(colNumber);
    }
    // Technisch-Spalte erkennen
    if (value === 'T' || value.toLowerCase() === 'technisch' || value.toLowerCase() === 'tech') {
      technicalColumn = colNumber;
    }
  });
  
  // Falls keine explizite T-Spalte gefunden, pruefen ob Spalte E "T" heisst (Zeile 3)
  if (technicalColumn === null) {
    const headerRow3 = worksheet.getRow(3);
    headerRow3.eachCell((cell, colNumber) => {
      const value = cell.value?.toString() || '';
      if (value === 'T' || value.toLowerCase() === 'technisch') {
        technicalColumn = colNumber;
      }
    });
  }
  
  if (maColumns.length === 0) {
    errors.push('Keine MA-Spalten gefunden. Bitte korrekte Vorlage verwenden.');
    return { packages, errors, warnings };
  }
  
  // Info ueber gefundene Struktur
  if (technicalColumn) {
    warnings.push(`Technisch-Spalte gefunden (Spalte ${technicalColumn})`);
  } else {
    warnings.push('Keine Technisch-Spalte (T) gefunden - alle APs werden als nicht-technisch importiert');
  }
  
  // Datenzeilen lesen (ab Zeile 4)
  for (let rowNum = 4; rowNum <= worksheet.rowCount; rowNum++) {
    const row = worksheet.getRow(rowNum);
    
    // AP-Nr. (Spalte A)
    const apNrValue = row.getCell(1).value;
    if (!apNrValue) continue; // Leere Zeile ueberspringen
    
    const apNrStr = apNrValue.toString().trim();
    if (!apNrStr) continue;
    
    // Beispielzeile ueberspringen
    const beschreibung = row.getCell(2).value?.toString() || '';
    if (beschreibung.toLowerCase().includes('beispiel') && beschreibung.toLowerCase().includes('loeschen')) {
      continue;
    }
    // Deutsche Umlaute auch pruefen
    if (beschreibung.toLowerCase().includes('beispiel') && beschreibung.toLowerCase().includes('löschen')) {
      continue;
    }
    
    // AP-Nummer parsen
    const parsed = parseAPNumber(apNrStr);
    if (!parsed) {
      // Hinweis-Zeilen am Ende der Vorlage ignorieren (keine Warnung erzeugen)
      const isHinweisZeile = apNrStr.startsWith('-') || 
                            apNrStr.startsWith('Hinweise') ||
                            apNrStr.startsWith('Projekt:') ||
                            apNrStr.startsWith('FKZ:') ||
                            apNrStr.startsWith('Team:') ||
                            apNrStr.toLowerCase().includes('summe');
      if (!isHinweisZeile) {
        warnings.push(`Zeile ${rowNum}: Ungueltige AP-Nr. "${apNrStr}" - uebersprungen`);
      }
      continue;
    }
    
    // Daten extrahieren
    const name = beschreibung || `Arbeitspaket ${apNrStr}`;
    const startDate = parseDate(row.getCell(3).value);
    const endDate = parseDate(row.getCell(4).value);
    
    // NEU: Technisch-Flag (Spalte E oder erkannte Spalte)
    let isTechnical = false;
    if (technicalColumn) {
      isTechnical = parseTechnical(row.getCell(technicalColumn).value);
    } else {
      // Fallback: Spalte 5 pruefen (falls keine Header-Erkennung)
      isTechnical = parseTechnical(row.getCell(5).value);
    }
    
    // MA-Zuordnungen
    const assignments: { employee_number: number; planned_pm: number }[] = [];
    
    maColumns.forEach((colIdx, maIdx) => {
      const pm = parsePM(row.getCell(colIdx).value);
      if (pm > 0) {
        const employeeNumber = maIdx + 1; // MA-Nr entspricht der Reihenfolge
        
        // Pruefen ob MA im Team existiert
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
      is_technical: isTechnical,  // NEU
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
  
  // Bestehende APs laden - NEU: is_technical mitlesen
  const { data: existingAPs, error: loadError } = await supabase
    .from('v7_work_packages')
    .select('id, ap_number, ap_sub_number, name, start_date, end_date, total_person_months, is_technical')
    .eq('project_id', projectId)
    .eq('is_active', true);
  
  if (loadError) {
    errors.push(`Fehler beim Laden bestehender Arbeitspakete: ${loadError.message}`);
    return { success: false, parsed: packages, newAPs: [], updateAPs: [], unchangedAPs: [], errors, warnings };
  }
  
  // Map fuer schnellen Lookup: "ap_number-ap_sub_number" -> ExistingWP
  const existingMap = new Map<string, ExistingWorkPackage>();
  (existingAPs || []).forEach((ap: any) => {
    const key = `${ap.ap_number}-${ap.ap_sub_number ?? 'null'}`;
    existingMap.set(key, {
      ...ap,
      planned_pm: ap.total_person_months // Feld-Mapping
    });
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
      // Bestehendes AP - Aenderungen pruefen
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
      // NEU: Technisch-Flag pruefen
      const existingTech = existing.is_technical ?? false;
      if (existingTech !== pkg.is_technical) {
        changes.push(`Technisch: ${existingTech ? 'Ja' : 'Nein'} → ${pkg.is_technical ? 'Ja' : 'Nein'}`);
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
      // UPDATE bestehendes AP - NEU: is_technical mitupdaten
      const { error: updateError } = await supabase
        .from('v7_work_packages')
        .update({
          name: pkg.name,
          start_date: pkg.start_date,
          end_date: pkg.end_date,
          total_person_months: pkg.total_pm,
          is_technical: pkg.is_technical,  // NEU
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
      // INSERT neues AP - NEU: is_technical setzen
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
          total_person_months: pkg.total_pm,
          is_technical: pkg.is_technical,  // NEU
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
      
      // Pruefen ob Assignment existiert
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
            planned_person_months: assignment.planned_pm,
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
            planned_person_months: assignment.planned_pm,
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
    const contentType = request.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');

    let projectId = '';
    let mode = 'preview';
    let file: File | null = null;
    let packages: ParsedWorkPackage[] | null = null;
    let warnings: string[] = [];

    if (isJson) {
      // NEU v7.3.90: Bereits geparste Arbeitspakete (z.B. aus dem PDF-Antragsimport).
      const body = await request.json();
      projectId = body.projectId;
      mode = body.mode || 'preview';
      if (!projectId) {
        return NextResponse.json({ error: 'projectId fehlt' }, { status: 400 });
      }
      if (!Array.isArray(body.packages)) {
        return NextResponse.json({ error: 'Keine Arbeitspakete (packages) uebergeben' }, { status: 400 });
      }
      // Normalisierung ueber dieselbe parseAPNumber() wie beim Excel-Import,
      // damit ap_number/ap_sub_number/ap_code identisch erzeugt werden.
      packages = (body.packages as any[]).map((p) => {
        const parsed = parseAPNumber(p.ap_code ?? p.ap_number);
        const assignments = Array.isArray(p.assignments)
          ? p.assignments
              .filter((a: any) => a && a.employee_number != null && a.planned_pm != null)
              .map((a: any) => ({ employee_number: Number(a.employee_number), planned_pm: Number(a.planned_pm) }))
          : [];
        const total_pm = typeof p.total_pm === 'number'
          ? p.total_pm
          : assignments.reduce((sum: number, a: any) => sum + (Number(a.planned_pm) || 0), 0);
        return {
          ap_number: parsed ? parsed.ap_number : Number(p.ap_number),
          ap_sub_number: parsed ? parsed.ap_sub_number : (p.ap_sub_number ?? null),
          ap_code: parsed ? parsed.ap_code : String(p.ap_code ?? ''),
          name: String(p.name ?? ''),
          start_date: p.start_date ?? null,
          end_date: p.end_date ?? null,
          is_technical: !!p.is_technical,
          assignments,
          total_pm,
        } as ParsedWorkPackage;
      });
    } else {
      const formData = await request.formData();
      file = formData.get('file') as File;
      projectId = formData.get('projectId') as string;
      mode = (formData.get('mode') as string) || 'preview';

      if (!file) {
        return NextResponse.json({ error: 'Keine Datei hochgeladen' }, { status: 400 });
      }
      if (!projectId) {
        return NextResponse.json({ error: 'projectId fehlt' }, { status: 400 });
      }
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
        { error: 'Kein Team definiert. Bitte zuerst Mitarbeiter zum Projektteam hinzufuegen.' },
        { status: 400 }
      );
    }

    const teamMembers: TeamMember[] = teamData;

    // Arbeitspakete beschaffen: aus Excel parsen ODER (JSON) direkt uebernehmen
    if (!isJson) {
      const buffer = Buffer.from(await file!.arrayBuffer());
      const parsedExcel = await parseExcel(buffer, teamMembers);
      packages = parsedExcel.packages;
      warnings = parsedExcel.warnings;

      if (parsedExcel.errors.length > 0) {
        return NextResponse.json({
          success: false,
          errors: parsedExcel.errors,
          warnings,
        }, { status: 400 });
      }
    }

    if (!packages || packages.length === 0) {
      return NextResponse.json({
        success: false,
        errors: ['Keine Arbeitspakete gefunden'],
        warnings,
      }, { status: 400 });
    }

    if (mode === 'preview') {
      // Vorschau generieren
      const preview = await generatePreview(projectId, packages, supabase);
      preview.warnings.push(...warnings);
      return NextResponse.json(preview);
    } else {
      // Import ausfuehren
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
