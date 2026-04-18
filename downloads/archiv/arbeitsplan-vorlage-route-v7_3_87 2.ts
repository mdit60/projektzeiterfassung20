// src/app/api/v7/arbeitsplan-vorlage/route.ts
// ============================================================================
// PZE V7 - Arbeitsplan Excel-Vorlage Generator
// ============================================================================
// Datum: 03. Februar 2026
// Version: 7.3.87
//
// Generiert eine projektspezifische Excel-Vorlage für den Arbeitsplan-Import
// Die MA-Spalten werden aus dem Projektteam generiert (Name + lfd. Nr.)
//
// Query-Parameter:
// - projectId: Projekt-ID (required)
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import ExcelJS from 'exceljs';

// Supabase Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

interface TeamMember {
  employee_number: number;
  first_name: string | null;
  last_name: string | null;
  display_name: string;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId ist erforderlich' },
        { status: 400 }
      );
    }

    // Supabase Client erstellen
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Projekt laden
    const { data: project, error: projectError } = await supabase
      .from('v7_projects')
      .select('id, name, short_name, funding_reference')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Projekt nicht gefunden' },
        { status: 404 }
      );
    }

    // Team laden (sortiert nach employee_number)
    const { data: teamData, error: teamError } = await supabase
      .from('v7_project_assignments')
      .select(`
        employee_number,
        employee:v7_employees(first_name, last_name, display_name)
      `)
      .eq('project_id', projectId)
      .eq('is_active', true)
      .not('employee_number', 'is', null)
      .order('employee_number', { ascending: true });

    if (teamError) {
      console.error('Team-Fehler:', teamError);
      return NextResponse.json(
        { error: 'Fehler beim Laden des Teams' },
        { status: 500 }
      );
    }

    // Team-Daten aufbereiten
    const team: TeamMember[] = (teamData || []).map((t: any) => ({
      employee_number: t.employee_number,
      first_name: t.employee?.first_name || null,
      last_name: t.employee?.last_name || null,
      display_name: t.employee?.display_name || 'Unbekannt',
    }));

    if (team.length === 0) {
      return NextResponse.json(
        { error: 'Kein Team definiert. Bitte zuerst Mitarbeiter zum Projektteam hinzufügen.' },
        { status: 400 }
      );
    }

    // Workbook erstellen
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'PZE V7';
    workbook.created = new Date();

    // Arbeitsblatt erstellen
    const worksheet = workbook.addWorksheet('Arbeitsplan', {
      views: [{ state: 'frozen', xSplit: 2, ySplit: 3 }] // Erste 2 Spalten + 3 Header-Zeilen fixieren
    });

    // Spaltenbreiten definieren
    const baseColumns = [
      { width: 10 },  // AP-Nr.
      { width: 40 },  // Kurzbeschreibung
      { width: 12 },  // von
      { width: 12 },  // bis
    ];
    
    // MA-Spalten
    const maColumns = team.map(() => ({ width: 12 }));
    
    // Summe-Spalte
    const sumColumn = [{ width: 14 }];

    worksheet.columns = [...baseColumns, ...maColumns, ...sumColumn].map((col, idx) => ({
      ...col,
      key: `col_${idx}`,
    }));

    // ========================================
    // HEADER ZEILE 1: Spaltenüberschriften
    // ========================================
    const headerRow1 = worksheet.getRow(1);
    headerRow1.values = [
      'AP-Nr.',
      'Kurzbeschreibung',
      'von',
      'bis',
      ...team.map(m => `MA-Nr ${m.employee_number}`),
      'AP',
    ];
    headerRow1.font = { bold: true };
    headerRow1.alignment = { horizontal: 'center', vertical: 'middle' };

    // ========================================
    // HEADER ZEILE 2: MA-Namen (V.Nachname)
    // ========================================
    const headerRow2 = worksheet.getRow(2);
    const maNames = team.map(m => {
      const initial = m.first_name ? `${m.first_name.charAt(0)}.` : '';
      return `${initial}${m.last_name || m.display_name}`;
    });
    headerRow2.values = [
      '',
      '',
      '',
      '',
      ...maNames,
      'Summe',
    ];
    headerRow2.font = { bold: true };
    headerRow2.alignment = { horizontal: 'center', vertical: 'middle' };

    // ========================================
    // HEADER ZEILE 3: PM
    // ========================================
    const headerRow3 = worksheet.getRow(3);
    headerRow3.values = [
      '',
      '',
      '',
      '',
      ...team.map(() => 'PM'),
      'PM',
    ];
    headerRow3.font = { bold: true };
    headerRow3.alignment = { horizontal: 'center', vertical: 'middle' };

    // Header-Zeilen formatieren
    [headerRow1, headerRow2, headerRow3].forEach((row, rowIdx) => {
      row.eachCell((cell, colNumber) => {
        // Hintergrundfarbe
        if (colNumber <= 4) {
          // Basis-Spalten: hellgrau
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE0E0E0' },
          };
        } else if (colNumber === 4 + team.length + 1) {
          // Summe-Spalte: hellblau
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFDBEAFE' },
          };
        } else {
          // MA-Spalten: hellgelb
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFFDE7' },
          };
        }

        // Rahmen
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: rowIdx === 2 ? { style: 'medium' } : { style: 'thin' },
          right: { style: 'thin' },
        };
      });
    });

    // Zellen zusammenführen für "AP-Nr." und "Kurzbeschreibung"
    worksheet.mergeCells('A1:A3');
    worksheet.mergeCells('B1:B3');
    worksheet.mergeCells('C1:C3');
    worksheet.mergeCells('D1:D3');

    // Alignment für zusammengeführte Zellen
    ['A1', 'B1', 'C1', 'D1'].forEach(addr => {
      const cell = worksheet.getCell(addr);
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    });

    // ========================================
    // BEISPIELZEILE (wird vom User gelöscht)
    // ========================================
    const exampleRow = worksheet.getRow(4);
    const exampleValues: (string | number | Date | null)[] = [
      '1.1',
      'Beispiel-Arbeitspaket (diese Zeile löschen)',
      new Date(2026, 4, 1),  // 01.05.2026
      new Date(2026, 6, 30), // 30.07.2026
    ];
    
    // PM-Werte für Beispiel
    team.forEach((_, idx) => {
      exampleValues.push(idx === 0 ? 1.5 : (idx === 1 ? 0.5 : null));
    });
    
    // Summe (wird durch Formel ersetzt)
    exampleValues.push(2.0);
    
    exampleRow.values = exampleValues;
    exampleRow.font = { italic: true, color: { argb: 'FF666666' } };
    exampleRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFFDE7' },
    };

    // ========================================
    // DATENZEILEN (leer, mit Formeln)
    // ========================================
    for (let row = 5; row <= 50; row++) {
      const dataRow = worksheet.getRow(row);
      
      // Datumsformat für von/bis
      worksheet.getCell(`C${row}`).numFmt = 'DD.MM.YYYY';
      worksheet.getCell(`D${row}`).numFmt = 'DD.MM.YYYY';
      
      // Zahlenformat für PM-Spalten
      for (let i = 0; i < team.length; i++) {
        const col = String.fromCharCode(69 + i); // E, F, G, ...
        worksheet.getCell(`${col}${row}`).numFmt = '0.00';
      }
      
      // Summen-Formel
      const sumCol = String.fromCharCode(69 + team.length); // Nach den MA-Spalten
      const pmCols: string[] = [];
      for (let i = 0; i < team.length; i++) {
        const col = String.fromCharCode(69 + i);
        pmCols.push(`${col}${row}`);
      }
      
      const sumCell = worksheet.getCell(`${sumCol}${row}`);
      sumCell.value = { formula: `SUM(${pmCols.join(',')})` };
      sumCell.numFmt = '0.00';
      sumCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF5F5F5' },
      };
    }

    // ========================================
    // HINWEISE
    // ========================================
    const hinweisStartRow = 53;
    worksheet.getCell(`A${hinweisStartRow}`).value = 'Hinweise:';
    worksheet.getCell(`A${hinweisStartRow}`).font = { bold: true };
    
    const hinweise = [
      '- AP-Nr.: Format 1, 1.1, 2.1.3 etc. (entsprechend Anlage 6.2 des Antrags)',
      '- von/bis: Datum im Format TT.MM.JJJJ',
      '- PM: Personenmonate als Dezimalzahl (z.B. 1,5)',
      '- AP Summe PM: Wird automatisch berechnet',
      '- Leere PM-Zellen werden als 0 interpretiert',
      '- Die gelbe Beispielzeile vor dem Upload löschen!',
      '',
      `Projekt: ${project.short_name || project.name}`,
      `FKZ: ${project.funding_reference || '-'}`,
      `Team: ${team.map(m => `MA${m.employee_number}`).join(', ')}`,
    ];
    
    hinweise.forEach((text, idx) => {
      worksheet.getCell(`A${hinweisStartRow + 1 + idx}`).value = text;
    });

    // ========================================
    // Excel generieren
    // ========================================
    const buffer = await workbook.xlsx.writeBuffer();

    // Dateiname
    const safeName = (project.short_name || project.name || 'Projekt')
      .replace(/[^a-zA-Z0-9äöüÄÖÜß\-_]/g, '_')
      .substring(0, 30);
    const filename = `Arbeitsplan_${safeName}.xlsx`;

    // Response
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });

  } catch (error) {
    console.error('Fehler beim Generieren der Vorlage:', error);
    return NextResponse.json(
      { error: 'Fehler beim Generieren der Excel-Vorlage' },
      { status: 500 }
    );
  }
}
