// src/app/api/work-packages/import/route.ts
// 
// WICHTIG: Vor Verwendung xlsx installieren:
// npm install xlsx
//
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface ImportedWorkPackage {
  code: string;
  description: string;
  start_date: string | null;
  end_date: string | null;
  category: string;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const projectId = formData.get('projectId') as string;
    const previewOnly = formData.get('previewOnly') === 'true';

    if (!file) {
      return NextResponse.json({ error: 'Keine Datei hochgeladen' }, { status: 400 });
    }

    if (!projectId) {
      return NextResponse.json({ error: 'Projekt-ID fehlt' }, { status: 400 });
    }

    // Excel-Datei lesen - OHNE automatische Datumskonvertierung
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: false, raw: true });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // In JSON konvertieren mit raw values
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null, raw: true }) as any[][];

    // Arbeitspakete extrahieren (ab Zeile 4, da Zeile 1=Titel, 2-3=Header)
    const workPackages: ImportedWorkPackage[] = [];
    
    // Excel Serial Date zu ISO String konvertieren
    const excelDateToISO = (serial: number): string => {
      // Excel verwendet 1900-01-01 als Tag 1, aber hat einen Bug bei 1900 (29.02.1900 existiert nicht)
      // JavaScript Date: Millisekunden seit 1970-01-01
      const utcDays = Math.floor(serial - 25569);
      const date = new Date(utcDays * 86400 * 1000);
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const day = String(date.getUTCDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    for (let i = 3; i < jsonData.length; i++) {
      const row = jsonData[i];
      
      // Leere Zeilen überspringen
      if (!row || !row[0]) continue;
      
      const code = String(row[0]).trim();
      const description = row[1] ? String(row[1]).trim() : '';
      
      // Datum konvertieren
      let startDate: string | null = null;
      let endDate: string | null = null;
      
      if (row[2] && typeof row[2] === 'number') {
        startDate = excelDateToISO(row[2]);
      }
      
      if (row[3] && typeof row[3] === 'number') {
        endDate = excelDateToISO(row[3]);
      }
      
      // Nur APs mit Beschreibung hinzufügen
      if (description) {
        workPackages.push({
          code,
          description,
          start_date: startDate,
          end_date: endDate,
          category: 'project_work' // Förderfähig
        });
      }
    }

    if (workPackages.length === 0) {
      return NextResponse.json({ error: 'Keine Arbeitspakete in der Datei gefunden' }, { status: 400 });
    }

    // Nur Vorschau? Dann hier zurückgeben
    if (previewOnly) {
      return NextResponse.json({ 
        success: true, 
        preview: true,
        workPackages,
        count: workPackages.length
      });
    }

    // Prüfen ob APs mit diesen Codes bereits existieren
    const { data: existingAPs } = await supabaseAdmin
      .from('work_packages')
      .select('code')
      .eq('project_id', projectId);

    const existingCodes = new Set((existingAPs || []).map(ap => ap.code));
    
    // Neue APs filtern (keine Duplikate)
    const newWorkPackages = workPackages.filter(wp => !existingCodes.has(wp.code));
    const skippedCount = workPackages.length - newWorkPackages.length;

    if (newWorkPackages.length === 0) {
      return NextResponse.json({ 
        error: 'Alle Arbeitspakete existieren bereits',
        skipped: skippedCount 
      }, { status: 400 });
    }

    // company_id vom Projekt holen
    const { data: projectData, error: projectError } = await supabaseAdmin
      .from('projects')
      .select('company_id')
      .eq('id', projectId)
      .single();

    if (projectError || !projectData) {
      return NextResponse.json({ error: 'Projekt nicht gefunden' }, { status: 404 });
    }

    // APs in Datenbank einfügen
    const { data: insertedAPs, error: insertError } = await supabaseAdmin
      .from('work_packages')
      .insert(
        newWorkPackages.map(wp => ({
          project_id: projectId,
          company_id: projectData.company_id,
          code: wp.code,
          description: wp.description,
          start_date: wp.start_date,
          end_date: wp.end_date,
          category: wp.category
        }))
      )
      .select();

    if (insertError) {
      console.error('Insert error:', insertError);
      return NextResponse.json({ error: `Fehler beim Speichern: ${insertError.message}` }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      imported: insertedAPs?.length || 0,
      skipped: skippedCount,
      workPackages: insertedAPs
    });

  } catch (error: any) {
    console.error('Import error:', error);
    return NextResponse.json({ error: `Import-Fehler: ${error.message}` }, { status: 500 });
  }
}