// ============================================================================
// PZE V7 - API-Route: POST /api/v7/import-antrag-neu
// ============================================================================
// Uebernahme eines ZIM-Antrags in ein NEUES Projekt (Einstiegspunkt 1).
//
// Ablauf:
//  1) Kern ATOMAR via RPC v7_import_projekt_team: Projekt + neue Mitarbeiter +
//     Team. Schlaegt etwas fehl, rollt Postgres alles automatisch zurueck.
//  2) Arbeitsplan ueber die bestehende Route /api/v7/arbeitsplan-import (JSON).
//  3) Scheitert Schritt 2, wird der Kern per RPC v7_cleanup_projekt kompensiert
//     (Projekt + Zuordnungen + Arbeitspakete + neue Mitarbeiter entfernt).
//
// WICHTIG: Node-Runtime (Service-Key). ASCII-only Quelldatei.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const maxDuration = 30;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Ungueltige Anfrage (kein JSON).' }, { status: 400 });
  }

  const project = body?.project;
  const employeesToCreate = Array.isArray(body?.employeesToCreate) ? body.employeesToCreate : [];
  const assignments = Array.isArray(body?.assignments) ? body.assignments : null;
  const packages = Array.isArray(body?.packages) ? body.packages : [];

  if (!project || !project.name || !assignments) {
    return NextResponse.json({ ok: false, error: 'Unvollstaendige Uebernahme-Daten.' }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // 1) Kern atomar anlegen
  const { data: coreData, error: coreErr } = await supabase.rpc('v7_import_projekt_team', {
    p_project: project,
    p_employees: employeesToCreate,
    p_assignments: assignments,
  });

  if (coreErr || !coreData || !coreData.project_id) {
    return NextResponse.json(
      { ok: false, error: coreErr?.message || 'Projekt-/Team-Anlage fehlgeschlagen.' },
      { status: 500 }
    );
  }

  const projectId: string = coreData.project_id;
  const newEmployeeIds: string[] = coreData.new_employee_ids || [];

  // 2) Arbeitsplan ueber die bestehende Import-Route
  try {
    const origin = req.nextUrl.origin;
    const res = await fetch(`${origin}/api/v7/arbeitsplan-import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, mode: 'import', packages }),
    });
    const impl = await res.json();
    if (!res.ok || impl.error) {
      throw new Error(impl.error || 'Arbeitsplan-Import fehlgeschlagen.');
    }

    return NextResponse.json({ ok: true, projectId });
  } catch (e: any) {
    // 3) Kompensation: den bereits angelegten Kern wieder entfernen
    try {
      await supabase.rpc('v7_cleanup_projekt', { p_project_id: projectId, p_employee_ids: newEmployeeIds });
    } catch { /* Best-Effort */ }
    return NextResponse.json(
      { ok: false, error: `Arbeitsplan-Import fehlgeschlagen (Uebernahme zurueckgerollt): ${e.message}` },
      { status: 500 }
    );
  }
}
