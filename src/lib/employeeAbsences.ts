// src/lib/employeeAbsences.ts
// ============================================================================
// PZE V7 - Helfer: Zentrale Abwesenheiten als synthetische Timesheet-Zeilen
// ============================================================================
// Version: 1.0.0
// Datum: 24. Juni 2026
// Kontext: A-034 (zentrale, projektuebergreifende Abwesenheiten).
//
// Zweck:
//   Laedt Abwesenheiten (U/K/S) aus der zentralen Tabelle v7_employee_absences
//   und gibt sie als synthetische "Timesheet-Zeilen" zurueck, sodass die
//   bestehenden Lesepfade (StundennachweisMatrix, BerichtePage/useBerichteData,
//   Sammeldruck via buildStundennachweisSheetData) sie unveraendert wie bisher
//   verarbeiten koennen.
//
//   v7_employee_absences hat bewusst KEIN project_id (Abwesenheit ist
//   mitarbeiterbezogen). Die Zuordnung zu einem Projekt erfolgt hier ueber das
//   Zuordnungsfenster des MA (v7_project_assignments.assignment_start /
//   assignment_end) - eine Abwesenheit wirkt in einem Projekt nur, wenn das
//   Fenster den Tag einschliesst (Konzept ABWESENHEITEN-ZENTRAL v1.1 Paragraph 4.4).
//   Faellt ein MA-Tag in mehrere Projekte, entsteht je Projekt eine Zeile.
//
//   Die Zuordnungs-Regel liegt damit an EINER Stelle (kein Duplikat in den
//   einzelnen Lesekomponenten).
//
// Rueckgabe-Form: Superset der von den Verbrauchern benoetigten Felder
//   (Matrix-Status braucht project_id/employee_id/work_date/hours; der
//   Sheet-Builder braucht zusaetzlich absence_code/work_package_id/is_billable).
//   work_package_id ist immer null, is_billable immer false, day_type null.
// ============================================================================

import { createClient } from '@/lib/supabase/client';

// ----------------------------------------------------------------------------
// Rueckgabe-Typ
// ----------------------------------------------------------------------------
export interface AbsenceAsTimesheet {
  id: string;                 // synthetisch: 'abs:<absenceId>:<projectId>'
  project_id: string;
  employee_id: string;
  work_package_id: null;
  work_date: string;          // 'YYYY-MM-DD'
  hours: number;
  absence_code: string;       // 'U' | 'K' | 'S'
  is_billable: false;
  day_type: null;
  is_active: true;
  _synthetic: true;           // Marker, falls ein Verbraucher unterscheiden will
}

interface LoadOptions {
  employeeIds?: string[];     // optionale Eingrenzung auf bestimmte MA
  fromDate?: string;          // optional 'YYYY-MM-DD' (inklusive)
  toDate?: string;            // optional 'YYYY-MM-DD' (inklusive)
}

// ----------------------------------------------------------------------------
// Hauptfunktion
// ----------------------------------------------------------------------------
export async function loadEmployeeAbsencesAsTimesheets(
  projectIds: string[],
  opts: LoadOptions = {},
): Promise<AbsenceAsTimesheet[]> {
  if (!projectIds || projectIds.length === 0) return [];

  const supabase = createClient();
  const { employeeIds, fromDate, toDate } = opts;

  // 1) Zuordnungsfenster je (project, employee) der relevanten Projekte
  const { data: assignmentsData, error: asgError } = await supabase
    .from('v7_project_assignments')
    .select('project_id, employee_id, assignment_start, assignment_end')
    .in('project_id', projectIds)
    .eq('is_active', true);
  if (asgError) {
    console.error('loadEmployeeAbsencesAsTimesheets assignments error:', asgError);
    return [];
  }
  const assignments = (assignmentsData || []) as Array<{
    project_id: string;
    employee_id: string;
    assignment_start: string | null;
    assignment_end: string | null;
  }>;
  if (assignments.length === 0) return [];

  // Betroffene MA: explizit eingegrenzt oder aus den Zuordnungen abgeleitet
  const empFromAssignments = new Set(assignments.map((a) => a.employee_id));
  const empIds = (employeeIds && employeeIds.length > 0)
    ? employeeIds.filter((id) => empFromAssignments.has(id))
    : Array.from(empFromAssignments);
  if (empIds.length === 0) return [];

  // 2) Abwesenheiten der betroffenen MA laden
  let absQuery = supabase
    .from('v7_employee_absences')
    .select('id, employee_id, work_date, absence_code, hours')
    .eq('is_active', true)
    .in('employee_id', empIds)
    .limit(10000);
  if (fromDate) absQuery = absQuery.gte('work_date', fromDate);
  if (toDate) absQuery = absQuery.lte('work_date', toDate);

  const { data: absData, error: absError } = await absQuery;
  if (absError) {
    console.error('loadEmployeeAbsencesAsTimesheets absences error:', absError);
    return [];
  }
  const absences = (absData || []) as Array<{
    id: string;
    employee_id: string;
    work_date: string;
    absence_code: string;
    hours: number | null;
  }>;
  if (absences.length === 0) return [];

  // 3) Zuordnen: pro Abwesenheit alle Projekte, deren Fenster den Tag deckt.
  //    Datumsstrings im ISO-Format 'YYYY-MM-DD' sind lexikografisch vergleichbar.
  const out: AbsenceAsTimesheet[] = [];
  const seen = new Set<string>(); // Schutz gegen doppelte (absence, project)

  for (const a of absences) {
    const hours = typeof a.hours === 'number' ? a.hours : 0;
    for (const asg of assignments) {
      if (asg.employee_id !== a.employee_id) continue;
      const startOk = !asg.assignment_start || a.work_date >= asg.assignment_start;
      const endOk = !asg.assignment_end || a.work_date <= asg.assignment_end;
      if (!startOk || !endOk) continue;

      const id = `abs:${a.id}:${asg.project_id}`;
      if (seen.has(id)) continue; // MA mehrfach im selben Projekt -> nur einmal
      seen.add(id);

      out.push({
        id,
        project_id: asg.project_id,
        employee_id: a.employee_id,
        work_package_id: null,
        work_date: a.work_date,
        hours,
        absence_code: a.absence_code,
        is_billable: false,
        day_type: null,
        is_active: true,
        _synthetic: true,
      });
    }
  }

  return out;
}

// ============================================================================
// ENDE employeeAbsences v1.0.0
// ============================================================================
