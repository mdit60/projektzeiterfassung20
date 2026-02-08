// src/app/api/v7/arbeitsplan-vorlage/route.ts
// ============================================================================
// PZE V7 - Arbeitsplan Excel-Vorlage Download
// ============================================================================
// Datum: 06. Februar 2026
// Version: 7.3.89
//
// v7.3.89 NEU: "T" Spalte fuer Technisch (ZIM-Durchfuehrbarkeitsstudien)
//
// Generiert eine projektspezifische Excel-Vorlage mit:
// - Metadaten (Projekt-ID, FKZ, Name)
// - Team-Mitglieder als Spalten
// - Spalte fuer "Technisch" (T)
// - Beispielzeile (gelb)
// - Hinweise zur Formatierung
//
// GET Request:
// - ?projectId=xxx
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import ExcelJS from 'exceljs';

// Supabase Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// ============================================================================
// API HANDLER
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    
    if (!projectId) {
      return NextResponse.json({ error: 'projectId fehlt' }, { status: 400 });
    }
    
    // Supabase Client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Projektdaten laden
    const { data: project, error: projectError } = await supabase
      .from('v7_projects')
      .select('id, name, short_name, funding_reference, funding_format')
      .eq('id', projectId)
      .single();
    
    if (projectError || !project) {
      return NextResponse.json({ error: 'Projekt nicht gefunden' }, { status: 404 });
    }
    
    // Team laden (mit employee_number)
    const { data: teamData, error: teamError } = await supabase
      .from('v7_project_assignments')
      .select(`
        id,
        employee_id,
        employee_number,
        employee:v7_employees (
          id,
          first_name,
          last_name,
          display_name
        )
      `)
      .eq('project_id', projectId)
      .eq('is_active', true)
      .not('employee_number', 'is', null)
      .order('employee_number', { ascending: true });
    
    if (teamError) {
      return NextResponse.json({ error: 'Fehler beim Laden des Teams' }, { status: 500 });
    }
    
    const team = teamData || [];
    
    // Bestehende APs laden (falls vorhanden)
    const { data: existingAPs } = await supabase
      .from('v7_work_packages')
      .select('id, ap_number, ap_sub_number, ap_code, name, start_date, end_date, total_person_months, is_technical')
      .eq('project_id', projectId)
      .eq('is_active', true)
      .order('ap_number', { ascending: true })
      .order('ap_sub_number', { ascending: true, nullsFirst: true });
    
    // AP-Assignments laden
    const { data: assignments } = await supabase
      .from('v7_work_package_assignments')
      .select('work_package_id, employee_id, planned_person_months')
      .in('work_package_id', (existingAPs || []).map(ap => ap.id))
      .eq('is_active', true);
    
    // Assignments als Map: workPackageId -> employeeId -> PM
    const assignmentMap = new Map<string, Map<string, number>>();
    (assignments || []).forEach(a => {
      if (!assignmentMap.has(a.work_package_id)) {
        assignmentMap.set(a.work_package_id, new Map());
      }
      assignmentMap.get(a.work_package_id)!.set(a.employee_id, a.planned_person_months || 0);
    });
    
    // Excel-Workbook erstellen
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'PZE V7';
    workbook.created = new Date();
    
    const worksheet = workbook.addWorksheet('Arbeitsplan');
    
    // Spaltenbreiten definieren
    // A: AP-Nr (8), B: Beschreibung (40), C: von (12), D: bis (12), E: T (5), F+: MA (10), Letzte: Summe (10)
    const columnWidths = [8, 40, 12, 12, 5];
    team.forEach(() => columnWidths.push(10));
    columnWidths.push(10); // Summe
    
    worksheet.columns = columnWidths.map((width, idx) => ({ width }));
    
    // ============================================================================
    // ZEILE 1: Metadaten
    // ============================================================================
    const row1 = worksheet.getRow(1);
    row1.getCell(1).value = `Projekt: ${project.name}`;
    row1.getCell(1).font = { bold: true, size: 11 };
    worksheet.mergeCells(1, 1, 1, 4);
    
    row1.getCell(5).value = 'T';
    row1.getCell(5).font = { bold: true, size: 10 };
    row1.getCell(5).alignment = { horizontal: 'center' };
    
    // MA-Spalten Header (Zeile 1): "MA-Nr X"
    team.forEach((member: any, idx: number) => {
      const col = 6 + idx;
      row1.getCell(col).value = `MA-Nr ${member.employee_number}`;
      row1.getCell(col).font = { bold: true, size: 9 };
      row1.getCell(col).alignment = { horizontal: 'center' };
    });
    
    // Summe-Spalte Header
    const sumCol = 6 + team.length;
    row1.getCell(sumCol).value = 'Summe';
    row1.getCell(sumCol).font = { bold: true, size: 10 };
    row1.getCell(sumCol).alignment = { horizontal: 'center' };
    
    // ============================================================================
    // ZEILE 2: Weitere Metadaten
    // ============================================================================
    const row2 = worksheet.getRow(2);
    row2.getCell(1).value = `FKZ: ${project.funding_reference || '-'}`;
    row2.getCell(1).font = { size: 10, color: { argb: 'FF666666' } };
    worksheet.mergeCells(2, 1, 2, 4);
    
    // MA-Namen (Zeile 2)
    team.forEach((member: any, idx: number) => {
      const col = 6 + idx;
      const emp = member.employee as any;
      let displayName = emp?.display_name || 'MA';
      // Kuerzen: "Max Mustermann" -> "M. Mustermann"
      if (emp?.first_name && emp?.last_name) {
        displayName = `${emp.first_name.charAt(0)}. ${emp.last_name}`;
      }
      row2.getCell(col).value = displayName;
      row2.getCell(col).font = { size: 9, color: { argb: 'FF666666' } };
      row2.getCell(col).alignment = { horizontal: 'center' };
    });
    
    // ============================================================================
    // ZEILE 3: Spalten-Header
    // ============================================================================
    const row3 = worksheet.getRow(3);
    row3.getCell(1).value = 'AP';
    row3.getCell(2).value = 'Beschreibung';
    row3.getCell(3).value = 'von';
    row3.getCell(4).value = 'bis';
    row3.getCell(5).value = 'T';  // NEU: Technisch
    
    // MA-Spalten: PM
    team.forEach((member: any, idx: number) => {
      row3.getCell(6 + idx).value = 'PM';
    });
    row3.getCell(sumCol).value = 'PM';
    
    // Header-Styling
    row3.eachCell((cell) => {
      cell.font = { bold: true, size: 10 };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };
      cell.border = {
        bottom: { style: 'thin', color: { argb: 'FF999999' } }
      };
      cell.alignment = { horizontal: 'center' };
    });
    row3.getCell(2).alignment = { horizontal: 'left' };
    
    // ============================================================================
    // ZEILE 4: Beispielzeile (gelb - soll geloescht werden)
    // ============================================================================
    const row4 = worksheet.getRow(4);
    row4.getCell(1).value = '1';
    row4.getCell(2).value = '(Beispiel - diese Zeile vor Upload loeschen!)';
    row4.getCell(3).value = '01.01.2025';
    row4.getCell(4).value = '31.12.2025';
    row4.getCell(5).value = 'X';  // NEU: Technisch = Ja
    
    team.forEach((member: any, idx: number) => {
      row4.getCell(6 + idx).value = idx === 0 ? 0.5 : '';
    });
    
    // Summenformel
    if (team.length > 0) {
      const firstMACol = String.fromCharCode(70); // F
      const lastMACol = String.fromCharCode(70 + team.length - 1);
      row4.getCell(sumCol).value = { formula: `SUM(${firstMACol}4:${lastMACol}4)` };
    }
    
    // Gelber Hintergrund fuer Beispielzeile
    row4.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFF2CC' }
      };
      cell.font = { italic: true, color: { argb: 'FF996600' } };
    });
    
    // ============================================================================
    // ZEILE 5+: Bestehende APs (falls vorhanden)
    // ============================================================================
    let currentRow = 5;
    
    (existingAPs || []).forEach((ap: any) => {
      const row = worksheet.getRow(currentRow);
      
      // AP-Nummer formatieren
      let apNr = ap.ap_number.toString();
      if (ap.ap_sub_number !== null) {
        apNr += '.' + ap.ap_sub_number;
      }
      
      row.getCell(1).value = apNr;
      row.getCell(2).value = ap.name;
      row.getCell(3).value = ap.start_date ? formatDateDE(ap.start_date) : '';
      row.getCell(4).value = ap.end_date ? formatDateDE(ap.end_date) : '';
      row.getCell(5).value = ap.is_technical ? 'X' : '';  // NEU: Technisch
      
      // MA-Zuordnungen
      const apAssignments = assignmentMap.get(ap.id);
      team.forEach((member: any, idx: number) => {
        const pm = apAssignments?.get(member.employee_id) || 0;
        row.getCell(6 + idx).value = pm > 0 ? pm : '';
      });
      
      // Summenformel
      if (team.length > 0) {
        const firstMACol = String.fromCharCode(70); // F
        const lastMACol = String.fromCharCode(70 + team.length - 1);
        row.getCell(sumCol).value = { formula: `SUM(${firstMACol}${currentRow}:${lastMACol}${currentRow})` };
      }
      
      currentRow++;
    });
    
    // Falls keine bestehenden APs, leere Zeilen fuer manuelle Eingabe
    if (!existingAPs || existingAPs.length === 0) {
      for (let i = 0; i < 10; i++) {
        const row = worksheet.getRow(currentRow);
        row.getCell(1).value = '';
        row.getCell(2).value = '';
        row.getCell(3).value = '';
        row.getCell(4).value = '';
        row.getCell(5).value = '';
        
        // Summenformel
        if (team.length > 0) {
          const firstMACol = String.fromCharCode(70);
          const lastMACol = String.fromCharCode(70 + team.length - 1);
          row.getCell(sumCol).value = { formula: `SUM(${firstMACol}${currentRow}:${lastMACol}${currentRow})` };
        }
        
        currentRow++;
      }
    }
    
    // ============================================================================
    // SUMMENZEILE
    // ============================================================================
    currentRow += 1; // Leerzeile
    const sumRow = worksheet.getRow(currentRow);
    sumRow.getCell(1).value = 'Summe';
    sumRow.getCell(1).font = { bold: true };
    sumRow.getCell(2).value = 'PM';
    sumRow.getCell(2).font = { bold: true };
    
    // Summen pro MA-Spalte
    team.forEach((member: any, idx: number) => {
      const col = 6 + idx;
      const colLetter = String.fromCharCode(69 + idx + 1); // F, G, H, ...
      sumRow.getCell(col).value = { formula: `SUM(${colLetter}5:${colLetter}${currentRow - 2})` };
      sumRow.getCell(col).font = { bold: true };
    });
    
    // Gesamt-Summe
    sumRow.getCell(sumCol).value = { formula: `SUM(${String.fromCharCode(69 + team.length + 1)}5:${String.fromCharCode(69 + team.length + 1)}${currentRow - 2})` };
    sumRow.getCell(sumCol).font = { bold: true };
    
    // Summenzeile Styling
    sumRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD9EAD3' }  // Hellgruen
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF999999' } }
      };
    });
    
    // ============================================================================
    // HINWEISE (unten)
    // ============================================================================
    currentRow += 3;
    const hinweisStart = currentRow;
    
    const hinweise = [
      'Hinweise:',
      '- AP-Nr.: Format 1, 1.1, 2.1.3 etc. (entsprechend Anlage 6.2 des Antrags)',
      '- von/bis: Datum im Format TT.MM.JJJJ',
      '- T: "X" fuer technisches AP (ZIM-Durchfuehrbarkeitsstudie), leer fuer nicht-technisch',
      '- PM: Personenmonate als Dezimalzahl (z.B. 1,5)',
      '- AP Summe PM: Wird automatisch berechnet',
      '- Leere PM-Zellen werden als 0 interpretiert',
      '- Die gelbe Beispielzeile vor dem Upload loeschen!',
      '',
      `Projekt: ${project.name}`,
      `FKZ: ${project.funding_reference || '-'}`,
      `Foerderformat: ${project.funding_format || '-'}`,
      `Team: ${team.length} Mitarbeiter`,
    ];
    
    hinweise.forEach((text, idx) => {
      const row = worksheet.getRow(hinweisStart + idx);
      row.getCell(1).value = text;
      row.getCell(1).font = { 
        size: 9, 
        color: { argb: 'FF666666' },
        bold: idx === 0
      };
      worksheet.mergeCells(hinweisStart + idx, 1, hinweisStart + idx, 6);
    });
    
    // ============================================================================
    // EXCEL-DATEI GENERIEREN
    // ============================================================================
    const buffer = await workbook.xlsx.writeBuffer();
    
    // Dateiname
    const projectShortName = project.short_name || project.name.substring(0, 20).replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `Arbeitsplan_${projectShortName}.xlsx`;
    
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
    
  } catch (error: any) {
    console.error('Vorlage-Fehler:', error);
    return NextResponse.json(
      { error: `Fehler beim Erstellen der Vorlage: ${error.message}` },
      { status: 500 }
    );
  }
}

// ============================================================================
// HILFSFUNKTIONEN
// ============================================================================

function formatDateDE(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}
