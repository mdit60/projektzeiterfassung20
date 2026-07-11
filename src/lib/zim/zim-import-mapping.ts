// ============================================================================
// PZE V7 - ZIM Import Mapping (Vertrag -> DB-Nutzdaten)
// ============================================================================
// Reine, testbare Abbildung: aus dem extrahierten Vertrag entstehen die
// Nutzdaten fuer Projekt, Mitarbeiter (Identitaet), Projektzuordnungen und
// den Arbeitsplan (packages fuer die arbeitsplan-import-Route).
//
// Wichtig: Der Stundensatz wird exakt nach der PZE-Formel berechnet
//   hourly_rate = (monthly_gross_salary * 12 + additional_salary_components)
//                 / (personal_weekly_hours * 52)   [2 Nachkommastellen]
// pWAZ = teilzeitfaktor * bWAZ (company_weekly_hours).
//
// project_id und employee_id werden erst zur Laufzeit gesetzt (nach den
// Inserts); dieses Modul liefert alles Uebrige deterministisch.
// ASCII-only Quelldatei.
// ============================================================================

import type { Contract } from './zim-antrag-extraktor';

export interface MaEntscheidung {
  ma_nr: string;
  entscheidung: 'neu' | 'verknuepfen';
  employee_id?: string | null;   // bei 'verknuepfen': ID des bestehenden MA
}

export interface MappingOptions {
  companyId: string;
  companyWeeklyHours: number;     // bWAZ (Default 40)
  entscheidungen: MaEntscheidung[];
  fundingFormat?: string | null;  // ueberschreibt Vorbelegung aus format
  shortName?: string | null;
  fundingReference?: string | null;
}

export interface ProjectPayload {
  client_company_id: string;
  name: string;
  short_name: string | null;
  funding_format: string | null;
  funding_reference: string | null;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
  pm_basis_weekly_hours: number | null;
  is_active: boolean;
}

export interface EmployeePayload {
  ma_nr: string;                  // Antrags-MA-Nr (zur spaeteren Zuordnung)
  client_company_id: string;
  display_name: string;
  first_name: string | null;
  last_name: string | null;
  qualification: string | null;
  position_title: string | null;
  weekly_hours: number | null;
  is_active: boolean;
}

export interface AssignmentPayload {
  ma_nr: string;                  // = employee_number; employee_id spaeter gesetzt
  employee_id: string | null;     // bei 'verknuepfen' bereits bekannt
  employee_number: number;
  monthly_gross_salary: number | null;
  additional_salary_components: number | null;
  personal_weekly_hours: number | null;
  company_weekly_hours: number | null;
  hourly_rate: number | null;
  hourly_rate_approved: number | null;
  role_in_project: string | null;
  assignment_start: string | null;
  assignment_end: string | null;
  is_active: boolean;
}

export interface PackagePayload {
  ap_code: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  is_technical: boolean;
  assignments: { employee_number: number; planned_pm: number }[];
  total_pm: number;
}

export interface ImportPayload {
  project: ProjectPayload;
  employeesToCreate: EmployeePayload[];   // nur die 'neu'-MA
  assignments: AssignmentPayload[];       // alle MA (neu + verknuepft)
  packages: PackagePayload[];
}

const round2 = (x: number) => Math.round(x * 100) / 100;

// Stundensatz exakt nach PZE-Formel (calcHourlyRate in ProjectTeamManager)
export function calcHourlyRate(monthly: number | null, additional: number | null, pWAZ: number | null): number | null {
  const m = monthly ?? 0;
  const a = additional ?? 0;
  const h = pWAZ ?? 0;
  if (m > 0 && h > 0) return round2((m * 12 + a) / (h * 52));
  return null;
}

export function buildImportPayload(contract: Contract, opts: MappingOptions): ImportPayload {
  const contractBWAZ = (contract.projekt as any).bwaz as number | null | undefined;
  const bWAZ = (contractBWAZ && contractBWAZ > 0) ? contractBWAZ : (opts.companyWeeklyHours > 0 ? opts.companyWeeklyHours : 40);
  const decMap = new Map<string, MaEntscheidung>();
  for (const d of opts.entscheidungen) decMap.set(d.ma_nr, d);

  // --- Projekt ---
  const project: ProjectPayload = {
    client_company_id: opts.companyId,
    name: contract.projekt.titel || '',
    short_name: opts.shortName ?? ((contract.projekt as any).akronym || null),
    funding_format: opts.fundingFormat ?? (contract.ist_durchfuehrbarkeitsstudie ? 'ZIM_DS' : 'ZIM'),
    funding_reference: opts.fundingReference ?? null, // FKZ nicht im Antrag
    start_date: contract.projekt.laufzeit_von,
    end_date: contract.projekt.laufzeit_bis,
    notes: contract.projekt.antragsteller ? `Antragsteller: ${contract.projekt.antragsteller}` : null,
    pm_basis_weekly_hours: (contract.projekt as any).pm_basis_weekly_hours ?? bWAZ,
    is_active: true,
  };

  // --- Mitarbeiter + Zuordnungen ---
  const employeesToCreate: EmployeePayload[] = [];
  const assignments: AssignmentPayload[] = [];

  for (const ma of contract.mitarbeiter) {
    const dec = decMap.get(ma.ma_nr) || { ma_nr: ma.ma_nr, entscheidung: 'neu' as const };
    const maBWAZ = (ma.company_weekly_hours ?? bWAZ) as number;
    const pWAZ = ma.personal_weekly_hours ?? (ma.teilzeitfaktor != null ? round2(ma.teilzeitfaktor * maBWAZ) : maBWAZ);
    const monthly = ma.monatsbrutto;                 // tatsaechliches Monatsbrutto (aus Extraktor)
    const additional = 0;
    const hourly = ma.stundensatz ?? calcHourlyRate(monthly, additional, pWAZ);

    if (dec.entscheidung === 'neu') {
      const display = `${ma.vorname} ${ma.nachname}`.trim() || ma.nachname;
      employeesToCreate.push({
        ma_nr: ma.ma_nr,
        client_company_id: opts.companyId,
        display_name: display,
        first_name: ma.vorname || null,
        last_name: ma.nachname || null,
        qualification: ma.qualifikation || null,
        position_title: ma.berufsbezeichnung || null,
        weekly_hours: pWAZ,
        is_active: true,
      });
    }

    assignments.push({
      ma_nr: ma.ma_nr,
      employee_id: dec.entscheidung === 'verknuepfen' ? (dec.employee_id ?? null) : null,
      employee_number: Number(ma.ma_nr),
      monthly_gross_salary: monthly,
      additional_salary_components: additional,
      personal_weekly_hours: pWAZ,
      company_weekly_hours: maBWAZ,
      hourly_rate: hourly,
      hourly_rate_approved: null, // bewilligter Satz kommt erst aus dem Bescheid
      role_in_project: null,
      assignment_start: contract.projekt.laufzeit_von,
      assignment_end: contract.projekt.laufzeit_bis,
      is_active: true,
    });
  }

  // --- Arbeitsplan (packages fuer arbeitsplan-import JSON-Eingang) ---
  const packages: PackagePayload[] = contract.arbeitspakete.map((ap) => ({
    ap_code: ap.ap_code,
    name: ap.name,
    start_date: ap.start_date,
    end_date: ap.end_date,
    is_technical: ap.is_technical === true,
    assignments: ap.zuordnungen.map((z) => ({ employee_number: Number(z.ma_nr), planned_pm: z.planned_pm })),
    total_pm: ap.planned_pm,
  }));

  return { project, employeesToCreate, assignments, packages };
}
