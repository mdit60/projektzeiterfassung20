// src/types/v7-types.ts
// ============================================================================
// PZE V7 - TypeScript Interfaces
// ============================================================================
// Datum: 14. Juli 2026
// Version: 7.4.9-4
//
// v7.4.9-4: Foerderformat-Label BMBF_KMU -> 'KMU-innovativ' (Label + Short),
//   ministeriums-neutral (vorher 'BMBF KMU-innovativ').
// v7.4.9-3: FZul-Fix - DB-Enum-Werte 'ZIM' und 'ZIM_DS' ergaenzt (Typ-Union,
//           Label-/Short-Maps, V7_PUBLIC_FUNDING_FORMATS). Ursache: Alt-Projekte
//           mit generischem funding_format 'ZIM' (z.B. HEATS/AS System) wurden
//           im Multiprojekt-/FZul-Import nicht als gefoerdert erkannt, weil
//           V7_PUBLIC_FUNDING_FORMATS 'ZIM' nicht enthielt -> alle MA fielen in
//           Gruppe B, gefoerdert_hours=0, voller FZul-Vorschlag. Rein additiv.
// v7.4.9-2: GF-Erkennung (50%-Regel) toleranter gemacht + echte Umlaute im UI.
//           - POSITION_OPTIONS: GF-Rollen jetzt mit echten Umlauten
//             (Gesch\u00e4ftsf\u00fchrer / Gesellschafter-Gesch\u00e4ftsf\u00fchrer),
//             als \\u-Escapes geschrieben -> Quelle bleibt ASCII, UI zeigt Umlaut.
//           - Neu: normalizePositionTitle(), GF_POSITIONS_NORMALIZED,
//             istGeschaeftsfuehrerTitle(), canonicalPositionTitle().
//           - istGeschaeftsfuehrer() erkennt jetzt beide Schreibweisen
//             (Umlaut + ae/ue) UND die weibliche Form ("...in"). Bestehende
//             DB-Werte muessen NICHT korrigiert werden.
//           - GF_POSITIONS (ASCII) bleibt als Export erhalten (Abwaertskompat.).
//
// v7.4.9-1: Teilzeit-Erfassung erweitert:
//           - V7EmployeeHoursHistory: days_per_week + hours_per_day
//           - Insert/Update entsprechend erweitert
//           - weekly_hours = days_per_week * hours_per_day (berechnet)
//
//           - V7FzulVorhaben Interface + Insert/Update
//           - V7FzulTimesheet Interface + Insert/Update
//           - V7FzulDayType, V7FzulStatus Typen
//           - V7FzulJahresberechnung (Berechnungsergebnis fuer Export)
//
// v7.4.7-1: Arbeitszeitgrenzen Phase 1:
//           - V7EmployeeHoursHistory Interface + Insert/Update
//           - V7Employee.position_title um Dropdown-Werte erweitert
//           - Konstanten POSITION_OPTIONS, GF_POSITIONS
//           - Konstanten MONATSGRENZE_VOLLZEIT, TAGESGRENZE_PT, GF_PROJEKT_FAKTOR
//           - Helper istGeschaeftsfuehrer()
// v7.4.6-1: holiday_region in V7ClientCompany fuer kommunale Feiertags-Sonderfaelle
// v7.4.0: V7_NAV_BERATER um 'Zeiterfassungen' (/v7/berater/timesheets) erweitert
// v7.3.86: employee_number zu V7Employee hinzugefuegt (optional)
// ============================================================================


// ============================================================================
// PORTAL-KONFIGURATION
// ============================================================================

/**
 * Portal-Typ: Berater oder Firma
 */
export type V7PortalType = 'berater' | 'firma';

/**
 * Portal-Konfiguration fuer Komponenten
 */
export interface V7PortalConfig {
  portal: V7PortalType;
  primaryColor: string;           // '#0369a1' (blau) oder '#65A655' (gruen)
  headerBgClass: string;          // Tailwind-Klasse fuer Header
  canEditCompany: boolean;        // Firmendaten bearbeiten?
  canSeeAllCompanies: boolean;    // Alle Firmen sehen? (nur Berater)
  canManageUsers: boolean;        // Benutzer verwalten?
}

/**
 * Vordefinierte Portal-Konfigurationen
 */
export const V7_PORTAL_CONFIGS: Record<V7PortalType, V7PortalConfig> = {
  berater: {
    portal: 'berater',
    primaryColor: '#0369a1',
    headerBgClass: 'bg-sky-700',
    canEditCompany: true,
    canSeeAllCompanies: true,
    canManageUsers: true,
  },
  firma: {
    portal: 'firma',
    primaryColor: '#65A655',
    headerBgClass: 'bg-green-600',
    canEditCompany: false,  // Abhaengig von Rolle
    canSeeAllCompanies: false,
    canManageUsers: false,  // Abhaengig von Rolle
  },
};


// ============================================================================
// BENUTZER-ROLLEN
// ============================================================================

/**
 * Login-Rollen (in v7_user_profiles.role)
 * Bestimmt Portal-Zugang und Grundberechtigungen
 */
export type V7UserRole = 
  | 'system_admin'   // Cubintec: Vollzugriff + kann system_admin/consultant anlegen
  | 'consultant'     // Cubintec: Berater, kann Kunden betreuen
  | 'client_admin'   // Kundenfirma: Vollzugriff auf eigene Firma
  | 'client_user';   // Kundenfirma: Berechtigungen via portal_role

/**
 * Firmen-Portal-Rollen (in v7_employees.portal_role)
 * Nur relevant fuer client_user, bestimmt Berechtigungen im Firmenportal
 */
export type V7EmployeePortalRole = 
  | 'client_admin'     // Firmen-Administrator (Vollzugriff)
  | 'project_leader'   // Kann Projektleiter fuer Projekte sein
  | 'employee';        // Nur eigene Zeiterfassung

/**
 * Rollen-Labels fuer Anzeige
 */
export const V7_ROLE_LABELS: Record<V7UserRole, string> = {
  system_admin: 'System-Administrator',
  consultant: 'Berater',
  client_admin: 'Firmen-Administrator',
  client_user: 'Firmen-Benutzer',
};

/**
 * Portal-Rollen-Labels fuer Anzeige
 */
export const V7_PORTAL_ROLE_LABELS: Record<V7EmployeePortalRole, string> = {
  client_admin: 'Administrator',
  project_leader: 'Projektleiter',
  employee: 'Mitarbeiter',
};

/**
 * Wer kann wen anlegen?
 */
export const V7_ROLE_CAN_CREATE: Record<V7UserRole, V7UserRole[]> = {
  system_admin: ['system_admin', 'consultant', 'client_admin', 'client_user'],
  consultant: ['client_admin', 'client_user'],
  client_admin: ['client_user'],
  client_user: [],
};


// ============================================================================
// FOERDERFORMATE (erweitert)
// ============================================================================

/**
 * Foerderformate mit Unterkategorien
 */
export type V7FundingFormat = 
  // ZIM-Programme
  | 'ZIM_EINZEL'           // ZIM Einzelprojekt
  | 'ZIM_KOOP'             // ZIM Kooperationsprojekt
  | 'ZIM_NETZWERK'         // ZIM Netzwerkprojekt
  | 'ZIM_DURCHFUEHRBARKEIT' // ZIM Durchfuehrbarkeitsstudie
  | 'ZIM'                  // ZIM (allgemein / Alt-Projekte vor Differenzierung)
  | 'ZIM_DS'               // ZIM Durchfuehrbarkeitsstudie (DB-Kurzform)
  // BMBF-Programme
  | 'BMBF_KMU'             // BMBF KMU-innovativ
  | 'BMBF_VERBUND'         // BMBF Verbundprojekt
  // Forschungszulage
  | 'FZUL'                 // Forschungszulage (SS35a EStG)
  // Sonstige
  | 'LANDES_FOERDERUNG'    // Landesfoerderprogramme
  | 'EU_FOERDERUNG'        // EU-Foerderprogramme
  | 'OTHER';               // Sonstige

/**
 * Foerderformat-Labels fuer Anzeige
 */
export const V7_FUNDING_FORMAT_LABELS: Record<V7FundingFormat, string> = {
  ZIM_EINZEL: 'ZIM Einzelprojekt',
  ZIM_KOOP: 'ZIM Kooperationsprojekt',
  ZIM_NETZWERK: 'ZIM Netzwerkprojekt',
  ZIM_DURCHFUEHRBARKEIT: 'ZIM Durchfuehrbarkeitsstudie',
  ZIM: 'ZIM (allgemein)',
  ZIM_DS: 'ZIM Durchfuehrbarkeitsstudie',
  BMBF_KMU: 'KMU-innovativ',
  BMBF_VERBUND: 'BMBF Verbundprojekt',
  FZUL: 'Forschungszulage',
  LANDES_FOERDERUNG: 'Landesfoerderung',
  EU_FOERDERUNG: 'EU-Foerderung',
  OTHER: 'Sonstige',
};

/**
 * Foerderformate die oeffentlich gefoerdert sind (relevant fuer FZul-Ausschluss)
 */
export const V7_PUBLIC_FUNDING_FORMATS: V7FundingFormat[] = [
  'ZIM_EINZEL',
  'ZIM_KOOP',
  'ZIM_NETZWERK',
  'ZIM_DURCHFUEHRBARKEIT',
  'ZIM',
  'ZIM_DS',
  'BMBF_KMU',
  'BMBF_VERBUND',
  'LANDES_FOERDERUNG',
  'EU_FOERDERUNG',
];

/**
 * Kurzbezeichnungen fuer kompakte Anzeige
 */
export const V7_FUNDING_FORMAT_SHORT: Record<V7FundingFormat, string> = {
  ZIM_EINZEL: 'ZIM Einzel',
  ZIM_KOOP: 'ZIM Koop',
  ZIM_NETZWERK: 'ZIM Netzwerk',
  ZIM_DURCHFUEHRBARKEIT: 'ZIM DFS',
  ZIM: 'ZIM',
  ZIM_DS: 'ZIM DFS',
  BMBF_KMU: 'KMU-innov.',
  BMBF_VERBUND: 'BMBF Verbund',
  FZUL: 'FZul',
  LANDES_FOERDERUNG: 'Land',
  EU_FOERDERUNG: 'EU',
  OTHER: 'Sonst.',
};


// ============================================================================
// KONSTANTEN
// ============================================================================

/**
 * Stunden pro Personenmonat (PM)
 * Standard: 40h/Woche * 52 Wochen / 12 Monate = 173,33 h
 */
export const V7_HOURS_PER_PM = 173.33;

/**
 * Wochen pro Jahr (fuer Berechnungen)
 */
export const V7_WEEKS_PER_YEAR = 52;

/**
 * Monate pro Jahr
 */
export const V7_MONTHS_PER_YEAR = 12;

/**
 * Berechnet Monatsstunden aus Wochenstunden
 */
export function calculateMonthlyHours(weeklyHours: number): number {
  return (weeklyHours * V7_WEEKS_PER_YEAR) / V7_MONTHS_PER_YEAR;
}

/**
 * Berechnet PM aus Stunden
 */
export function hoursToPM(hours: number): number {
  return hours / V7_HOURS_PER_PM;
}

/**
 * Berechnet Stunden aus PM
 */
export function pmToHours(pm: number): number {
  return pm * V7_HOURS_PER_PM;
}


// ============================================================================
// BUNDESLAENDER
// ============================================================================

/**
 * Deutsche Bundeslaender mit ISO-Codes
 */
export const V7_FEDERAL_STATES = {
  'DE-BW': 'Baden-Wuerttemberg',
  'DE-BY': 'Bayern',
  'DE-BE': 'Berlin',
  'DE-BB': 'Brandenburg',
  'DE-HB': 'Bremen',
  'DE-HH': 'Hamburg',
  'DE-HE': 'Hessen',
  'DE-MV': 'Mecklenburg-Vorpommern',
  'DE-NI': 'Niedersachsen',
  'DE-NW': 'Nordrhein-Westfalen',
  'DE-RP': 'Rheinland-Pfalz',
  'DE-SL': 'Saarland',
  'DE-SN': 'Sachsen',
  'DE-ST': 'Sachsen-Anhalt',
  'DE-SH': 'Schleswig-Holstein',
  'DE-TH': 'Thueringen',
} as const;

export type V7FederalStateCode = keyof typeof V7_FEDERAL_STATES;

/**
 * Bundeslaender als Array fuer Dropdowns
 */
export const V7_FEDERAL_STATES_LIST = Object.entries(V7_FEDERAL_STATES).map(
  ([code, name]) => ({ code: code as V7FederalStateCode, name })
);


// ============================================================================
// TAGESTYPEN UND FEHLZEITEN
// ============================================================================

/**
 * Tagestypen fuer Zeiterfassung
 */
export type V7DayType = 
  | 'work'           // Arbeitstag
  | 'weekend'        // Wochenende
  | 'holiday'        // Feiertag
  | 'vacation'       // Urlaub
  | 'sick'           // Krank
  | 'special_leave'  // Sonderurlaub
  | 'short_time';    // Kurzarbeit

/**
 * Tagescode fuer FZul (Kurzform)
 */
export type V7DayCode = 'A' | 'U' | 'K' | 'F' | 'W' | 'S' | 'KA';

/**
 * Tagestyp-Labels fuer Anzeige
 */
export const V7_DAY_TYPE_LABELS: Record<V7DayType, string> = {
  work: 'Arbeitstag',
  weekend: 'Wochenende',
  holiday: 'Feiertag',
  vacation: 'Urlaub',
  sick: 'Krank',
  special_leave: 'Sonderurlaub',
  short_time: 'Kurzarbeit',
};

/**
 * Mapping DayType zu DayCode
 */
export const V7_DAY_TYPE_TO_CODE: Record<V7DayType, V7DayCode> = {
  work: 'A',
  weekend: 'W',
  holiday: 'F',
  vacation: 'U',
  sick: 'K',
  special_leave: 'S',
  short_time: 'KA',
};

/**
 * Fehlzeit-Typen (reduzieren verfuegbare Kapazitaet)
 */
export const V7_ABSENCE_TYPES: V7DayType[] = [
  'vacation',
  'sick',
  'special_leave',
  'short_time',
];


// ============================================================================
// DATENQUELLEN
// ============================================================================

/**
 * Datenquellen fuer Zeiterfassung
 */
export type V7DataSource = 
  | 'import'         // Excel/PDF-Import durch Berater
  | 'manual';        // Manuelle Eingabe im ZE-Modul

/**
 * Datenquellen-Labels fuer Anzeige
 */
export const V7_DATA_SOURCE_LABELS: Record<V7DataSource, string> = {
  import: 'Import',
  manual: 'Manuelle Eingabe',
};


// ============================================================================
// INTERFACES: BENUTZER
// ============================================================================

/**
 * Benutzerprofil (v7_user_profiles)
 */
export interface V7UserProfile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  role: V7UserRole;
  consultant_company_id: string | null;
  client_company_id: string | null;
  is_active: boolean;
  invited_by: string | null;
  invited_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Benutzerprofil fuer Formulare
 */
export interface V7UserProfileInsert {
  id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  display_name?: string | null;
  role?: V7UserRole;
  consultant_company_id?: string | null;
  client_company_id?: string | null;
  is_active?: boolean;
  invited_by?: string | null;
  invited_at?: string | null;
}

/**
 * Benutzerprofil fuer Updates
 */
export interface V7UserProfileUpdate {
  email?: string;
  first_name?: string | null;
  last_name?: string | null;
  display_name?: string | null;
  role?: V7UserRole;
  consultant_company_id?: string | null;
  client_company_id?: string | null;
  is_active?: boolean;
}


// ============================================================================
// INTERFACES: FIRMEN
// ============================================================================

/**
 * Beraterfirma (v7_consultant_companies)
 */
export interface V7ConsultantCompany {
  id: string;
  name: string;
  short_name: string | null;
  street: string | null;
  zip_code: string | null;
  city: string | null;
  federal_state: string | null;
  contact_person: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  website: string | null;
  tax_id: string | null;
  internal_notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Kundenfirma (v7_client_companies)
 */
export interface V7ClientCompany {
  id: string;
  consultant_company_id: string;
  name: string;
  short_name: string | null;
  street: string | null;
  zip_code: string | null;
  city: string | null;
  federal_state: string;
  holiday_region: string | null;  // v7.4.6: kommunaler Feiertags-Override
  contact_person: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  internal_notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Kundenfirma fuer Formulare
 */
export interface V7ClientCompanyInsert {
  consultant_company_id: string;
  name: string;
  short_name?: string | null;
  street?: string | null;
  zip_code?: string | null;
  city?: string | null;
  federal_state: string;
  holiday_region?: string | null;  // v7.4.6
  contact_person?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  internal_notes?: string | null;
  is_active?: boolean;
}

/**
 * Kundenfirma fuer Updates
 */
export interface V7ClientCompanyUpdate {
  name?: string;
  short_name?: string | null;
  street?: string | null;
  zip_code?: string | null;
  city?: string | null;
  federal_state?: string;
  holiday_region?: string | null;  // v7.4.6
  contact_person?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  internal_notes?: string | null;
  is_active?: boolean;
}


// ============================================================================
// INTERFACES: MITARBEITER
// ============================================================================

/**
 * Mitarbeiter (v7_employees)
 */
export interface V7Employee {
  id: string;
  client_company_id: string;
  user_id: string | null;
  display_name: string;
  first_name: string | null;
  last_name: string | null;
  name: string | null;
  email: string | null;
  weekly_hours: number;
  annual_leave_days: number;
  position_title: string | null;
  position: string | null;
  qualification: string | null;
  employment_start: string | null;
  employment_end: string | null;
  entry_date: string | null;
  exit_date: string | null;
  portal_role: V7EmployeePortalRole;  // Portal-Berechtigung
  employee_number?: number | null;    // NEU v7.3.86: Optionale MA-Nummer (fallback aus project_assignments)
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Mitarbeiter fuer Formulare
 */
export interface V7EmployeeInsert {
  client_company_id: string;
  user_id?: string | null;
  display_name: string;
  first_name?: string | null;
  last_name?: string | null;
  name?: string | null;
  email?: string | null;
  weekly_hours?: number;
  annual_leave_days?: number;
  position_title?: string | null;
  position?: string | null;
  qualification?: string | null;
  employment_start?: string | null;
  employment_end?: string | null;
  entry_date?: string | null;
  exit_date?: string | null;
  portal_role?: V7EmployeePortalRole;
  notes?: string | null;
  is_active?: boolean;
}

/**
 * Mitarbeiter fuer Updates
 */
export interface V7EmployeeUpdate {
  user_id?: string | null;
  display_name?: string;
  first_name?: string | null;
  last_name?: string | null;
  name?: string | null;
  email?: string | null;
  weekly_hours?: number;
  annual_leave_days?: number;
  position_title?: string | null;
  position?: string | null;
  qualification?: string | null;
  employment_start?: string | null;
  employment_end?: string | null;
  entry_date?: string | null;
  exit_date?: string | null;
  portal_role?: V7EmployeePortalRole;
  notes?: string | null;
  is_active?: boolean;
}

/**
 * Mitarbeiter mit Kapazitaetsinformationen
 */
export interface V7EmployeeWithCapacity extends V7Employee {
  monthly_hours_available: number;  // Berechnet aus weekly_hours
  hours_booked_current_month: number;
  hours_remaining_current_month: number;
  capacity_percentage: number;      // 0-100
}


// ============================================================================
// INTERFACES: PROJEKTE
// ============================================================================

/**
 * Projekt (v7_projects)
 */
export interface V7Project {
  id: string;
  client_company_id: string;
  name: string;
  short_name: string | null;
  funding_reference: string | null;
  funding_format: V7FundingFormat | null;
  start_date: string | null;
  end_date: string | null;
  total_budget_hours: number | null;      // Gesamtstunden lt. Antrag
  total_budget_pm: number | null;         // Gesamt-PM lt. Antrag
  fzul_vorhaben_title: string | null;
  fzul_vorhaben_id: string | null;
  source_filename: string | null;
  imported_at: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Projekt fuer Formulare
 */
export interface V7ProjectInsert {
  client_company_id: string;
  name: string;
  short_name?: string | null;
  funding_reference?: string | null;
  funding_format?: V7FundingFormat | null;
  start_date?: string | null;
  end_date?: string | null;
  total_budget_hours?: number | null;
  total_budget_pm?: number | null;
  fzul_vorhaben_title?: string | null;
  fzul_vorhaben_id?: string | null;
  source_filename?: string | null;
  imported_at?: string | null;
  notes?: string | null;
  is_active?: boolean;
}

/**
 * Projekt fuer Updates
 */
export interface V7ProjectUpdate {
  name?: string;
  short_name?: string | null;
  funding_reference?: string | null;
  funding_format?: V7FundingFormat | null;
  start_date?: string | null;
  end_date?: string | null;
  total_budget_hours?: number | null;
  total_budget_pm?: number | null;
  fzul_vorhaben_title?: string | null;
  fzul_vorhaben_id?: string | null;
  notes?: string | null;
  is_active?: boolean;
}

/**
 * Projekt mit Fortschritts-Statistik
 */
export interface V7ProjectWithProgress extends V7Project {
  hours_planned: number;
  hours_booked: number;
  hours_billed: number;
  hours_remaining: number;
  progress_percentage: number;
  team_count: number;
}


// ============================================================================
// INTERFACES: PROJEKT-ZUORDNUNG
// ============================================================================

/**
 * Projekt-Zuordnung (v7_project_assignments)
 */
export interface V7ProjectAssignment {
  id: string;
  project_id: string;
  employee_id: string;
  role_in_project: string | null;     // Fachliche Rolle: Entwickler, PM, etc.
  is_project_leader: boolean;          // NEU: Projektleiter fuer dieses Projekt?
  fue_percentage: number;
  assignment_start: string | null;
  assignment_end: string | null;
  planned_hours: number | null;        // Geplante Stunden fuer diesen MA
  planned_pm: number | null;           // Geplante PM fuer diesen MA
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Projekt-Zuordnung fuer Formulare
 */
export interface V7ProjectAssignmentInsert {
  project_id: string;
  employee_id: string;
  role_in_project?: string | null;
  is_project_leader?: boolean;
  fue_percentage?: number;
  assignment_start?: string | null;
  assignment_end?: string | null;
  planned_hours?: number | null;
  planned_pm?: number | null;
  is_active?: boolean;
}

/**
 * Projekt-Zuordnung fuer Updates
 */
export interface V7ProjectAssignmentUpdate {
  role_in_project?: string | null;
  is_project_leader?: boolean;
  fue_percentage?: number;
  assignment_start?: string | null;
  assignment_end?: string | null;
  planned_hours?: number | null;
  planned_pm?: number | null;
  is_active?: boolean;
}

/**
 * Projekt-Zuordnung mit erweiterten Daten
 */
export interface V7ProjectAssignmentWithDetails extends V7ProjectAssignment {
  employee: V7Employee;
  project: V7Project;
  hours_booked: number;
  hours_remaining: number;
}


// ============================================================================
// INTERFACES: ARBEITSPAKETE
// ============================================================================

/**
 * Arbeitspaket (v7_work_packages)
 */
export interface V7WorkPackage {
  id: string;
  project_id: string;
  parent_id: string | null;           // Fuer hierarchische APs (AP1 -> AP1.1)
  ap_number: number;                  // Hauptnummer: 1, 2, 3
  ap_sub_number: number | null;       // Unternummer: 1, 2 (fuer AP1.1, AP1.2)
  name: string;
  description: string | null;
  planned_hours: number | null;
  planned_pm: number | null;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Arbeitspaket fuer Formulare
 */
export interface V7WorkPackageInsert {
  project_id: string;
  parent_id?: string | null;
  ap_number: number;
  ap_sub_number?: number | null;
  name: string;
  description?: string | null;
  planned_hours?: number | null;
  planned_pm?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  is_active?: boolean;
}

/**
 * Arbeitspaket fuer Updates
 */
export interface V7WorkPackageUpdate {
  parent_id?: string | null;
  ap_number?: number;
  ap_sub_number?: number | null;
  name?: string;
  description?: string | null;
  planned_hours?: number | null;
  planned_pm?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  is_active?: boolean;
}

/**
 * Arbeitspaket mit Fortschritt
 */
export interface V7WorkPackageWithProgress extends V7WorkPackage {
  hours_booked: number;
  hours_remaining: number;
  progress_percentage: number;
  assigned_employees: number;
  // Formatierte AP-Nummer: "AP1" oder "AP1.1"
  ap_code: string;
}

/**
 * Generiert AP-Code aus Nummer und Unternummer
 */
export function formatAPCode(apNumber: number, apSubNumber: number | null): string {
  if (apSubNumber === null || apSubNumber === 0) {
    return `AP${apNumber}`;
  }
  return `AP${apNumber}.${apSubNumber}`;
}


// ============================================================================
// INTERFACES: ZEITERFASSUNG
// ============================================================================

/**
 * Timesheet (v7_timesheets)
 */
export interface V7Timesheet {
  id: string;
  employee_id: string;
  project_id: string;
  work_package_id: string | null;
  year: number;
  month: number;
  daily_data: Record<string, number | string>;  // {"1": 8, "2": "U", ...}
  total_hours: number;
  total_fue_hours: number | null;
  notes: string | null;
  is_locked: boolean;
  locked_at: string | null;
  locked_by: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Timesheet fuer Formulare
 */
export interface V7TimesheetInsert {
  employee_id: string;
  project_id: string;
  work_package_id?: string | null;
  year: number;
  month: number;
  daily_data?: Record<string, number | string>;
  total_hours?: number;
  total_fue_hours?: number | null;
  notes?: string | null;
  is_locked?: boolean;
}

/**
 * Timesheet fuer Updates
 */
export interface V7TimesheetUpdate {
  daily_data?: Record<string, number | string>;
  total_hours?: number;
  total_fue_hours?: number | null;
  notes?: string | null;
  is_locked?: boolean;
  locked_at?: string | null;
  locked_by?: string | null;
}


// ============================================================================
// INTERFACES: KAPAZITAETS-MANAGEMENT
// ============================================================================

/**
 * Monatliche Kapazitaet eines Mitarbeiters
 */
export interface V7EmployeeMonthlyCapacity {
  employee_id: string;
  employee_name: string;
  year: number;
  month: number;
  weekly_hours: number;
  monthly_hours_available: number;    // Basis-Kapazitaet
  absence_hours: number;              // Fehlzeiten (Urlaub, Krank, etc.)
  net_hours_available: number;        // Nach Abzug Fehlzeiten
  hours_booked_total: number;         // Alle Projekte
  hours_booked_funded: number;        // Nur gefoerderte Projekte
  hours_available_for_fzul: number;   // Frei fuer FZul
  hours_remaining: number;            // Noch buchbar
  is_overbooked: boolean;
}

/**
 * Projekt-Buchungen eines Mitarbeiters im Monat
 */
export interface V7EmployeeProjectBooking {
  project_id: string;
  project_name: string;
  funding_format: V7FundingFormat | null;
  is_publicly_funded: boolean;
  hours_booked: number;
}

/**
 * Soll-Ist-Vergleich fuer ein Projekt
 */
export interface V7ProjectBudgetStatus {
  project_id: string;
  project_name: string;
  funding_format: V7FundingFormat | null;
  // Gesamt
  hours_planned: number;
  hours_booked: number;
  hours_billed: number;
  hours_remaining: number;
  // PM-Werte
  pm_planned: number;
  pm_booked: number;
  pm_remaining: number;
  // Prozent
  progress_percentage: number;
  // Status
  status: 'on_track' | 'behind' | 'ahead' | 'completed' | 'not_started';
}


// ============================================================================
// ZUSAMMENGESETZTE TYPEN
// ============================================================================

/**
 * Mitarbeiter mit Firmendaten
 */
export interface V7EmployeeWithCompany extends V7Employee {
  company: V7ClientCompany;
}

/**
 * Projekt mit Firmendaten
 */
export interface V7ProjectWithCompany extends V7Project {
  company: V7ClientCompany;
}

/**
 * Projekt mit Projektleiter
 */
export interface V7ProjectWithLeader extends V7Project {
  project_leader_id: string | null;
  project_leader_name: string | null;
  project_leader_email: string | null;
}

/**
 * Kundenfirma mit Statistiken
 */
export interface V7ClientCompanyWithStats extends V7ClientCompany {
  employee_count: number;
  project_count: number;
  active_project_count: number;
}


// ============================================================================
// NAVIGATION UND UI
// ============================================================================

/**
 * Navigations-Item
 */
export interface V7NavItem {
  key: string;
  label: string;
  href: string;
  icon?: string;
  roles: V7UserRole[];              // Welche Login-Rollen sehen das?
  portalRoles?: V7EmployeePortalRole[];  // Welche Portal-Rollen sehen das?
}

/**
 * Vordefinierte Navigation fuer Berater-Portal
 */
export const V7_NAV_BERATER: V7NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', href: '/v7/berater/dashboard', roles: ['system_admin', 'consultant'] },
  { key: 'foerderung', label: 'Foerderung', href: '/v7/berater/foerderung', roles: ['system_admin', 'consultant'] },
  { key: 'import', label: 'Import', href: '/v7/berater/import', roles: ['system_admin', 'consultant'] },
  { key: 'berichte', label: 'Berichte', href: '/v7/berater/berichte', roles: ['system_admin', 'consultant'] },
  { key: 'timesheets', label: 'Zeiterfassungen', href: '/v7/berater/timesheets', roles: ['system_admin', 'consultant'] },
  { key: 'admin', label: 'Administration', href: '/v7/berater/admin', roles: ['system_admin'] },
];

/**
 * Vordefinierte Navigation fuer Firmen-Portal
 */
export const V7_NAV_FIRMA: V7NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', href: '/v7/firma/dashboard', roles: ['client_admin', 'client_user'], portalRoles: ['client_admin'] },
  { key: 'firmendaten', label: 'Firmendaten', href: '/v7/firma/firmendaten', roles: ['client_admin', 'client_user'], portalRoles: ['client_admin'] },
  { key: 'projekte', label: 'Projekte', href: '/v7/firma/projekte', roles: ['client_admin', 'client_user'], portalRoles: ['client_admin'] },
  { key: 'meine-projekte', label: 'Meine Projekte', href: '/v7/firma/meine-projekte', roles: ['client_user'], portalRoles: ['project_leader', 'employee'] },
  { key: 'mitarbeiter', label: 'Mitarbeiter', href: '/v7/firma/mitarbeiter', roles: ['client_admin', 'client_user'], portalRoles: ['client_admin'] },
  { key: 'zeiterfassung', label: 'Zeiterfassung', href: '/v7/firma/zeiterfassung', roles: ['client_admin', 'client_user'], portalRoles: ['client_admin', 'project_leader'] },
  { key: 'meine-zeiterfassung', label: 'Meine Zeiterfassung', href: '/v7/firma/meine-zeiterfassung', roles: ['client_user'], portalRoles: ['project_leader', 'employee'] },
  { key: 'mein-status', label: 'Mein Status', href: '/v7/firma/mein-status', roles: ['client_user'], portalRoles: ['project_leader', 'employee'] },
  { key: 'berichte', label: 'Berichte', href: '/v7/firma/berichte', roles: ['client_admin', 'client_user'], portalRoles: ['client_admin', 'project_leader'] },
];


// ============================================================================
// ARBEITSZEITGRENZEN (v7.4.7)
// ============================================================================
// Siehe KONZEPT-ARBEITSZEITGRENZEN-v1_3.md fuer Hintergrund und Herleitung.
//
// Drei Grenzen:
// 1. Monatsgrenze:  173,33 h x (weekly_hours / 40)   -- weich (Warnung)
// 2. GF-Anteil:     50% der Monatsgrenze fuer Projektstunden -- weich (Warnung)
// 3. Tagesgrenze:   9 h (Projekt + Sonstige)         -- hart (Sperre)
// ============================================================================

/**
 * Monatliche Maximalstunden-Grenze bei Vollzeit (40h/Woche).
 * Entspricht 2080 h Jahresarbeitszeit / 12 Monate.
 * Gilt in JEDEM Monat identisch, unabhaengig von Arbeitstagen.
 */
export const MONATSGRENZE_VOLLZEIT = 173.33;

/**
 * Tagesgrenze fuer projektbezogene und sonstige Arbeitszeit (h).
 * Vorgabe Projekttraeger ZIM: Stunden darueber werden gekappt.
 * HART durchgesetzt (Speichern blockiert).
 */
export const TAGESGRENZE_PT = 9;

/**
 * Maximaler Anteil der Projektzeit an der Gesamtarbeitszeit
 * fuer Geschaeftsfuehrer (50% gemaess ZIM-Richtlinie).
 */
export const GF_PROJEKT_FAKTOR = 0.5;

/**
 * Referenz fuer die Teilzeit-Berechnung: Standard-Wochenstunden Vollzeit.
 */
export const VOLLZEIT_WOCHENSTUNDEN = 40;

/**
 * Standardrollen fuer das Feld position_title in der Mitarbeiter-Verwaltung.
 * Dropdown-Werte. "Sonstige" triggert ein zusaetzliches Freitext-Feld.
 *
 * v7.4.9-2: Deutsche Software -> echte Umlaute im UI. Die Umlaute stehen als
 * \u-Escapes im Quellcode, damit die Datei ASCII-rein bleibt (grep-Pruefung).
 * Zur Laufzeit rendert das Dropdown dann korrekt "Geschaeftsfuehrer" mit
 * echten Umlauten. Zuordnung: \u00e4 = a-Umlaut, \u00f6 = o-Umlaut,
 * \u00fc = u-Umlaut.
 */
export const POSITION_OPTIONS = [
  'Gesch\u00e4ftsf\u00fchrer',
  'Gesellschafter-Gesch\u00e4ftsf\u00fchrer',
  'Prokurist',
  'Abteilungsleiter',
  'Projektleiter',
  'Mitarbeiter',
  'Sonstige',
] as const;

export type PositionOption = typeof POSITION_OPTIONS[number];

/**
 * ALT (v7.4.7): Position-Werte in ASCII-Schreibweise. NICHT mehr fuer den
 * GF-Vergleich verwenden -- exakter Match scheiterte an Umlaut-/ASCII-Mischung
 * in der DB. Bleibt nur aus Abwaertskompatibilitaet exportiert.
 * Fuer die GF-Pruefung ausschliesslich istGeschaeftsfuehrerTitle() benutzen.
 */
export const GF_POSITIONS: readonly string[] = [
  'Geschaeftsfuehrer',
  'Gesellschafter-Geschaeftsfuehrer',
] as const;

/**
 * Normalisiert einen position_title fuer robusten Vergleich:
 * trimmen, klein schreiben, Umlaute/ss vereinheitlichen (ae/oe/ue/ss).
 * Damit sind "Gesch\u00e4ftsf\u00fchrer" und "Geschaeftsfuehrer" gleichwertig.
 */
export function normalizePositionTitle(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\u00e4/g, 'ae')
    .replace(/\u00f6/g, 'oe')
    .replace(/\u00fc/g, 'ue')
    .replace(/\u00df/g, 'ss');
}

/**
 * GF-ausloesende Positionen in normalisierter Form. Deckt beide Schreibweisen
 * (Umlaut + ASCII) sowie die weibliche Form ("...in") ab.
 * Bewusst NICHT enthalten: "GF", "Geschaeftsfuehrung" (siehe Konzept v1.3, 3.1).
 */
export const GF_POSITIONS_NORMALIZED: readonly string[] = [
  'geschaeftsfuehrer',
  'geschaeftsfuehrerin',
  'gesellschafter-geschaeftsfuehrer',
  'gesellschafter-geschaeftsfuehrerin',
];

/**
 * Prueft anhand eines rohen position_title-Strings, ob die 50%-GF-Regel greift.
 * Toleriert Umlaut-/ASCII-Schreibweise, Gross-/Kleinschreibung und die
 * weibliche Form. Zentrale Funktion -- ueberall statt eigenem String-Match
 * verwenden.
 *
 * @param positionTitle roher Wert aus v7_employees.position_title
 * @returns true, wenn der Wert als Geschaeftsfuehrer(in) gilt
 */
export function istGeschaeftsfuehrerTitle(
  positionTitle: string | null | undefined
): boolean {
  if (!positionTitle) return false;
  return GF_POSITIONS_NORMALIZED.includes(normalizePositionTitle(positionTitle));
}

/**
 * Bildet einen gespeicherten position_title auf den kanonischen Dropdown-Wert
 * (mit echten Umlauten) ab, sofern er normalisiert einer POSITION_OPTIONS-Rolle
 * entspricht. Andernfalls wird der Rohwert unveraendert zurueckgegeben (z.B.
 * "Gesch\u00e4ftsf\u00fchrerin" -> bleibt Freitext, wird aber weiter als GF erkannt).
 * So wandern Alt-Werte beim naechsten Speichern sanft auf die Umlaut-Schreibweise,
 * ohne dass Bestandsdaten manuell korrigiert werden muessen.
 */
export function canonicalPositionTitle(raw: string | null | undefined): string {
  if (!raw) return '';
  const norm = normalizePositionTitle(raw);
  const match = POSITION_OPTIONS.find(opt => normalizePositionTitle(opt) === norm);
  return match ?? raw;
}

/**
 * Prueft, ob ein Mitarbeiter als Geschaeftsfuehrer(in) gilt (50%-Regel).
 * Abgeleitet aus position_title, nicht separat gespeichert.
 *
 * @param employee Mitarbeiter-Datensatz
 * @returns true wenn position_title (tolerant) einer GF-Rolle entspricht
 */
export function istGeschaeftsfuehrer(
  employee: Pick<V7Employee, 'position_title'>
): boolean {
  return istGeschaeftsfuehrerTitle(employee.position_title);
}

/**
 * Berechnet die Monatsgrenze fuer einen Mitarbeiter mit gegebenen 
 * Wochenstunden (linear zu Vollzeit-Grenze 173,33).
 * 
 * @param weeklyHours Wochenstunden des Mitarbeiters (aus Historie)
 * @returns Monatliche Maximalstunden
 */
export function berechneMonatsgrenze(weeklyHours: number): number {
  return MONATSGRENZE_VOLLZEIT * (weeklyHours / VOLLZEIT_WOCHENSTUNDEN);
}

/**
 * Berechnet die GF-Projektstunden-Grenze (50% der Monatsgrenze).
 * Nur relevant wenn istGeschaeftsfuehrer() true ist.
 */
export function berechneGfProjektgrenze(weeklyHours: number): number {
  return berechneMonatsgrenze(weeklyHours) * GF_PROJEKT_FAKTOR;
}


// ============================================================================
// TEILZEIT-HISTORIE (v7.4.7)
// ============================================================================

/**
 * Eintrag in der Wochenstunden-Historie eines Mitarbeiters.
 * Tabelle: v7_employee_hours_history
 * 
 * Ein neuer Eintrag wird angelegt, wenn sich der Teilzeitfaktor aendert
 * (z.B. Wechsel von Vollzeit auf Teilzeit, Elternzeit etc.).
 * gueltig_ab sollte idR der 1. eines Monats sein.
 */
export interface V7EmployeeHoursHistory {
  id: string;
  employee_id: string;
  weekly_hours: number;           // Berechnet: days_per_week * hours_per_day
  days_per_week: number | null;   // Arbeitstage pro Woche (z.B. 3)
  hours_per_day: number | null;   // Arbeitsstunden pro Tag (z.B. 8.0)
  gueltig_ab: string;        // ISO-Date, YYYY-MM-DD
  created_at: string;
  created_by: string | null;
  notiz: string | null;
}

export interface V7EmployeeHoursHistoryInsert {
  employee_id: string;
  weekly_hours: number;           // = days_per_week * hours_per_day
  days_per_week?: number | null;
  hours_per_day?: number | null;
  gueltig_ab: string;
  notiz?: string | null;
}

export interface V7EmployeeHoursHistoryUpdate {
  weekly_hours?: number;
  days_per_week?: number | null;
  hours_per_day?: number | null;
  gueltig_ab?: string;
  notiz?: string | null;
}


// ============================================================================
// FZUL-MODUL / MULTIPROJEKT-TOOL (v7.4.8)
// ============================================================================

/**
 * Status eines FZul-Vorhabens
 */
export type V7FzulStatus = 'entwurf' | 'abgeschlossen';

/**
 * Tagestyp im FZul-Timesheet
 */
export type V7FzulDayType = 'workday' | 'weekend' | 'holiday';

/**
 * FZul-Vorhaben (v7_fzul_vorhaben)
 * Pro Firma, FuE-Thema und Wirtschaftsjahr ein Eintrag.
 * Wird vom Berater angelegt.
 */
export interface V7FzulVorhaben {
  id: string;
  client_company_id: string;
  created_by: string | null;
  title: string;
  vorhaben_id: string | null;        // BSFZ-Bescheinigungsnummer (optional)
  wirtschaftsjahr: number;
  start_monat: number;               // 1-12
  ende_monat: number;                // 1-12
  bundesland: string | null;
  status: V7FzulStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface V7FzulVorhabenInsert {
  client_company_id: string;
  created_by?: string | null;
  title: string;
  vorhaben_id?: string | null;
  wirtschaftsjahr: number;
  start_monat?: number;
  ende_monat?: number;
  bundesland?: string | null;
  status?: V7FzulStatus;
  notes?: string | null;
}

export interface V7FzulVorhabenUpdate {
  title?: string;
  vorhaben_id?: string | null;
  wirtschaftsjahr?: number;
  start_monat?: number;
  ende_monat?: number;
  bundesland?: string | null;
  status?: V7FzulStatus;
  notes?: string | null;
}

/**
 * FZul-Vorhaben mit angereicherten Anzeigedaten (JOIN mit client_companies)
 */
export interface V7FzulVorhabenWithCompany extends V7FzulVorhaben {
  company_name: string;
  company_short_name: string | null;
  ma_count: number;                  // Anzahl zugeordneter Mitarbeiter
}

/**
 * FZul-Timesheet - tagesweise Stunden pro MA und Vorhaben (v7_fzul_timesheets)
 */
export interface V7FzulTimesheet {
  id: string;
  vorhaben_id: string;
  employee_id: string;
  work_date: string;                 // ISO-Date YYYY-MM-DD

  // Stunden-Felder
  fue_hours: number;                 // FZul-Stunden (editierbar)
  gefoerdert_hours: number;          // Aus gefoerderten Projekten (read-only)
  verfuegbar_hours: number;          // Tagesarbeitszeit - gefoerdert_hours (read-only)

  // MA-spezifisch
  taetigkeitsbezeichnung: string | null;

  // Tagestyp
  day_type: V7FzulDayType;
  holiday_label: string | null;

  // Abwesenheiten
  urlaub_hours: number;
  krank_hours: number;
  sonderurlaub_hours: number;

  // Metadaten
  notes: string | null;
  locked: boolean;
  created_at: string;
  updated_at: string;
}

export interface V7FzulTimesheetInsert {
  vorhaben_id: string;
  employee_id: string;
  work_date: string;
  fue_hours?: number;
  gefoerdert_hours?: number;
  verfuegbar_hours?: number;
  taetigkeitsbezeichnung?: string | null;
  day_type?: V7FzulDayType;
  holiday_label?: string | null;
  urlaub_hours?: number;
  krank_hours?: number;
  sonderurlaub_hours?: number;
  notes?: string | null;
  locked?: boolean;
}

export interface V7FzulTimesheetUpdate {
  fue_hours?: number;
  taetigkeitsbezeichnung?: string | null;
  urlaub_hours?: number;
  krank_hours?: number;
  sonderurlaub_hours?: number;
  notes?: string | null;
  locked?: boolean;
}

/**
 * Ergebnis der Jahresarbeitszeit-Berechnung pro MA (fuer Export und Vorschau)
 * Berechnung gemaess BSFZ-Formular (SS35a EStG / FZulG)
 */
export interface V7FzulJahresberechnung {
  employee_id: string;
  employee_name: string;
  taetigkeitsbezeichnung: string | null;
  weekly_hours: number;

  // Abschnitt 1: Massgebliche Jahresarbeitszeit
  jahresarbeitsstunden: number;       // weekly_hours * 52
  urlaub_tage: number;
  urlaub_stunden: number;
  krank_tage: number;
  krank_stunden: number;
  sonderurlaub_tage: number;
  sonderurlaub_stunden: number;
  feiertag_tage: number;
  feiertag_stunden: number;
  jahresarbeitszeit_massgeblich: number;  // Nach Abzuegen

  // Kuerung bei unterjaehrigem Vorhaben
  monate_aktiv: number;               // start_monat bis ende_monat
  jahresarbeitszeit_gekuerzt: number; // * (monate_aktiv / 12)

  // Abschnitt 2: FuE-Anteil
  fue_stunden_gesamt: number;         // Summe fue_hours
  fue_anteil: number;                 // fue_stunden / jahresarbeitszeit_gekuerzt (max 1.0)
  hoechstgrenze: number;              // (monate_aktiv / 12) * 2080

  // Warnungen
  anteil_ueberschritten: boolean;     // fue_anteil > 1.0 vor Kappung
  hoechstgrenze_ueberschritten: boolean;
}

/**
 * MA-Zeile in der Vorhaben-Uebersicht (Tab 1)
 */
export interface V7FzulMaUebersicht {
  employee_id: string;
  display_name: string;
  taetigkeitsbezeichnung: string | null;
  weekly_hours: number;
  hat_gefoerderte_projekte: boolean;  // Gruppe A oder B

  // Aggregierte Werte aus v7_fzul_timesheets
  gefoerdert_stunden_gesamt: number;
  fue_stunden_gesamt: number;
  verfuegbar_stunden_gesamt: number;

  // Status
  timesheet_vorhanden: boolean;       // Import bereits durchgefuehrt?
  locked: boolean;
}


// ============================================================================
// ENDE
// ============================================================================
