// src/types/v7-types.ts
// ============================================================================
// PZE V7 - TypeScript Interfaces
// ============================================================================
// Datum: 21. Dezember 2025
// Version: 7.0
// 
// Diese Datei enthält alle TypeScript-Typen für die V7-Datenbankstruktur.
// Die Typen entsprechen 1:1 den Tabellen in Supabase.
// ============================================================================


// ============================================================================
// ENUM-TYPEN
// ============================================================================

/**
 * Benutzerrollen im System
 */
export type V7UserRole = 
  | 'system_admin'   // Cubintec: Vollzugriff (Martin)
  | 'consultant'     // Cubintec: Berater
  | 'client_admin'   // Kundenfirma: Projektmanager
  | 'client_user';   // Kundenfirma: Mitarbeiter

/**
 * Datenquellen für Zeiterfassung
 */
export type V7DataSource = 
  | 'import'         // Excel-Import durch Berater
  | 'manual';        // Manuelle Eingabe im ZE-Modul

/**
 * Förderformate
 */
export type V7FundingFormat = 
  | 'ZIM'            // Zentrales Innovationsprogramm Mittelstand
  | 'BMBF_KMU'       // BMBF KMU-innovativ
  | 'FZUL'           // Forschungszulage
  | 'OTHER';         // Sonstige

/**
 * Tagestypen für Zeiterfassung
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
 * Tagescode für FZul (Kurzform)
 */
export type V7DayCode = 'A' | 'U' | 'K' | 'F' | 'W' | 'S' | 'KA';


// ============================================================================
// BENUTZER UND ROLLEN
// ============================================================================

/**
 * Benutzerprofil (v7_user_profiles)
 */
export interface V7UserProfile {
  id: string;                              // UUID, entspricht auth.users.id
  email: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  role: V7UserRole;
  consultant_company_id: string | null;    // UUID, für Cubintec-MA
  client_company_id: string | null;        // UUID, für Kunden-MA
  is_active: boolean;
  invited_by: string | null;               // UUID
  invited_at: string | null;               // ISO DateTime
  created_at: string;                      // ISO DateTime
  updated_at: string;                      // ISO DateTime
}

/**
 * Benutzerprofil für Formulare (ohne auto-generierte Felder)
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
 * Benutzerprofil für Updates (alle Felder optional)
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
// FIRMENSTRUKTUR
// ============================================================================

/**
 * Kundenfirma (v7_client_companies)
 */
export interface V7ClientCompany {
  id: string;                              // UUID
  consultant_company_id: string;           // UUID, Verweis auf Cubintec
  name: string;
  short_name: string | null;
  street: string | null;
  zip_code: string | null;
  city: string | null;
  federal_state: string;                   // z.B. 'DE-BW', 'DE-NW'
  contact_person: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  internal_notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Kundenfirma für Formulare
 */
export interface V7ClientCompanyInsert {
  consultant_company_id: string;
  name: string;
  short_name?: string | null;
  street?: string | null;
  zip_code?: string | null;
  city?: string | null;
  federal_state: string;
  contact_person?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  internal_notes?: string | null;
  is_active?: boolean;
}

/**
 * Kundenfirma für Updates
 */
export interface V7ClientCompanyUpdate {
  name?: string;
  short_name?: string | null;
  street?: string | null;
  zip_code?: string | null;
  city?: string | null;
  federal_state?: string;
  contact_person?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  internal_notes?: string | null;
  is_active?: boolean;
}

/**
 * Berater-Autorisierung (v7_consultant_access) - Phase 2
 */
export interface V7ConsultantAccess {
  id: string;
  consultant_user_id: string;              // UUID
  client_company_id: string;               // UUID
  authorized_by: string | null;            // UUID
  authorized_at: string;
  valid_from: string;                      // Date
  valid_until: string | null;              // Date
  can_view: boolean;
  can_edit: boolean;
  can_export: boolean;
  is_active: boolean;
  created_at: string;
}


// ============================================================================
// MITARBEITER
// ============================================================================

/**
 * Mitarbeiter (v7_employees)
 */
export interface V7Employee {
  id: string;                              // UUID
  client_company_id: string;               // UUID
  user_id: string | null;                  // UUID, falls MA sich einloggen kann
  display_name: string;                    // "Müller, Hans"
  first_name: string | null;
  last_name: string | null;
  weekly_hours: number;                    // z.B. 40.0
  annual_leave_days: number;               // z.B. 30
  position_title: string | null;
  qualification: string | null;
  employment_start: string | null;         // Date
  employment_end: string | null;           // Date
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Mitarbeiter für Formulare
 */
export interface V7EmployeeInsert {
  client_company_id: string;
  user_id?: string | null;
  display_name: string;
  first_name?: string | null;
  last_name?: string | null;
  weekly_hours?: number;
  annual_leave_days?: number;
  position_title?: string | null;
  qualification?: string | null;
  employment_start?: string | null;
  employment_end?: string | null;
  notes?: string | null;
  is_active?: boolean;
}

/**
 * Mitarbeiter für Updates
 */
export interface V7EmployeeUpdate {
  user_id?: string | null;
  display_name?: string;
  first_name?: string | null;
  last_name?: string | null;
  weekly_hours?: number;
  annual_leave_days?: number;
  position_title?: string | null;
  qualification?: string | null;
  employment_start?: string | null;
  employment_end?: string | null;
  notes?: string | null;
  is_active?: boolean;
}


// ============================================================================
// PROJEKTE
// ============================================================================

/**
 * Projekt (v7_projects)
 */
export interface V7Project {
  id: string;                              // UUID
  client_company_id: string;               // UUID
  name: string;
  short_name: string | null;
  funding_reference: string;               // FKZ
  funding_format: V7FundingFormat;
  start_date: string | null;               // Date
  end_date: string | null;                 // Date
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
 * Projekt für Formulare
 */
export interface V7ProjectInsert {
  client_company_id: string;
  name: string;
  short_name?: string | null;
  funding_reference: string;
  funding_format?: V7FundingFormat;
  start_date?: string | null;
  end_date?: string | null;
  fzul_vorhaben_title?: string | null;
  fzul_vorhaben_id?: string | null;
  source_filename?: string | null;
  imported_at?: string | null;
  notes?: string | null;
  is_active?: boolean;
}

/**
 * Projekt für Updates
 */
export interface V7ProjectUpdate {
  name?: string;
  short_name?: string | null;
  funding_reference?: string;
  funding_format?: V7FundingFormat;
  start_date?: string | null;
  end_date?: string | null;
  fzul_vorhaben_title?: string | null;
  fzul_vorhaben_id?: string | null;
  notes?: string | null;
  is_active?: boolean;
}

/**
 * Projekt-Zuordnung (v7_project_assignments)
 */
export interface V7ProjectAssignment {
  id: string;                              // UUID
  project_id: string;                      // UUID
  employee_id: string;                     // UUID
  role_in_project: string | null;
  fue_percentage: number;                  // 0-100
  assignment_start: string | null;         // Date
  assignment_end: string | null;           // Date
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Projekt-Zuordnung für Formulare
 */
export interface V7ProjectAssignmentInsert {
  project_id: string;
  employee_id: string;
  role_in_project?: string | null;
  fue_percentage?: number;
  assignment_start?: string | null;
  assignment_end?: string | null;
  is_active?: boolean;
}


// ============================================================================
// ZEITERFASSUNG
// ============================================================================

/**
 * Timesheet-Eintrag (v7_timesheets)
 */
export interface V7Timesheet {
  id: string;                              // UUID
  employee_id: string;                     // UUID
  project_id: string;                      // UUID
  work_date: string;                       // Date (YYYY-MM-DD)
  hours: number;                           // z.B. 8.00
  day_type: V7DayType;
  data_source: V7DataSource;               // 'import' | 'manual'
  // Import-spezifisch
  source_filename: string | null;
  source_row: number | null;
  imported_at: string | null;
  imported_by: string | null;              // UUID
  // Manuell-spezifisch
  entered_by: string | null;               // UUID
  entered_at: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Timesheet für Import
 */
export interface V7TimesheetImport {
  employee_id: string;
  project_id: string;
  work_date: string;
  hours: number;
  day_type?: V7DayType;
  data_source: 'import';
  source_filename: string;
  source_row?: number;
  imported_at?: string;
  imported_by: string;
}

/**
 * Timesheet für manuelle Eingabe
 */
export interface V7TimesheetManual {
  employee_id: string;
  project_id: string;
  work_date: string;
  hours: number;
  day_type?: V7DayType;
  data_source: 'manual';
  entered_by: string;
  entered_at?: string;
  description?: string | null;
}

/**
 * Timesheet für Updates
 */
export interface V7TimesheetUpdate {
  hours?: number;
  day_type?: V7DayType;
  description?: string | null;
  is_active?: boolean;
}

/**
 * Daten-Vollständigkeit (v7_data_completion)
 */
export interface V7DataCompletion {
  id: string;                              // UUID
  client_company_id: string;               // UUID
  year: number;
  data_source: V7DataSource;
  is_complete: boolean;
  is_released: boolean;
  released_by: string | null;              // UUID
  released_at: string | null;
  preferred_for_analysis: boolean;
  preferred_set_by: string | null;         // UUID
  preferred_set_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Ergebnis der Konfliktprüfung (v7_check_data_conflict Funktion)
 */
export interface V7DataConflictResult {
  has_import_data: boolean;
  has_manual_data: boolean;
  has_conflict: boolean;
  import_complete: boolean;
  manual_complete: boolean;
  preferred_source: V7DataSource | null;
}


// ============================================================================
// FZUL-STUNDENNACHWEISE
// ============================================================================

/**
 * FZul-Timesheet-Eintrag (v7_fzul_timesheets)
 */
export interface V7FzulTimesheet {
  id: string;                              // UUID
  employee_id: string;                     // UUID
  client_company_id: string;               // UUID
  year: number;
  month: number;                           // 1-12
  day: number;                             // 1-31
  available_hours: number;                 // Soll-Stunden
  booked_hours: number;                    // FuE-Stunden
  day_code: V7DayCode;                     // A, U, K, F, W, S, KA
  based_on_source: V7DataSource | null;
  is_edited: boolean;
  edited_by: string | null;                // UUID
  created_at: string;
  updated_at: string;
}

/**
 * FZul-Timesheet für Formulare
 */
export interface V7FzulTimesheetInsert {
  employee_id: string;
  client_company_id: string;
  year: number;
  month: number;
  day: number;
  available_hours?: number;
  booked_hours?: number;
  day_code?: V7DayCode;
  based_on_source?: V7DataSource | null;
  is_edited?: boolean;
  edited_by?: string | null;
}

/**
 * FZul-Timesheet für Updates
 */
export interface V7FzulTimesheetUpdate {
  available_hours?: number;
  booked_hours?: number;
  day_code?: V7DayCode;
  is_edited?: boolean;
  edited_by?: string | null;
}


// ============================================================================
// ARCHIV
// ============================================================================

/**
 * Archiv-Eintrag (v7_archive)
 */
export interface V7Archive {
  id: string;                              // UUID
  client_company_id: string;               // UUID
  employee_id: string | null;              // UUID
  file_type: 'pdf' | 'excel';
  file_name: string;
  file_data: string | null;                // Base64 encoded
  file_size: number | null;
  year: number | null;
  based_on_source: V7DataSource | null;
  generated_by: string | null;             // UUID
  notes: string | null;
  created_at: string;
}

/**
 * Archiv für Formulare
 */
export interface V7ArchiveInsert {
  client_company_id: string;
  employee_id?: string | null;
  file_type: 'pdf' | 'excel';
  file_name: string;
  file_data?: string | null;
  file_size?: number | null;
  year?: number | null;
  based_on_source?: V7DataSource | null;
  generated_by?: string | null;
  notes?: string | null;
}


// ============================================================================
// HILFSFUNKTIONEN UND KONSTANTEN
// ============================================================================

/**
 * Deutsche Bundesländer mit ISO-Codes
 */
export const V7_FEDERAL_STATES = {
  'DE-BW': 'Baden-Württemberg',
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
  'DE-TH': 'Thüringen',
} as const;

export type V7FederalStateCode = keyof typeof V7_FEDERAL_STATES;

/**
 * Rollen-Labels für Anzeige
 */
export const V7_ROLE_LABELS: Record<V7UserRole, string> = {
  system_admin: 'System-Administrator',
  consultant: 'Berater',
  client_admin: 'Projektmanager',
  client_user: 'Mitarbeiter',
};

/**
 * Datenquellen-Labels für Anzeige
 */
export const V7_DATA_SOURCE_LABELS: Record<V7DataSource, string> = {
  import: 'Excel-Import',
  manual: 'Manuelle Eingabe',
};

/**
 * Förderformat-Labels für Anzeige
 */
export const V7_FUNDING_FORMAT_LABELS: Record<V7FundingFormat, string> = {
  ZIM: 'ZIM (Zentrales Innovationsprogramm Mittelstand)',
  BMBF_KMU: 'BMBF KMU-innovativ',
  FZUL: 'Forschungszulage',
  OTHER: 'Sonstige',
};

/**
 * Tagestyp-Labels für Anzeige
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


// ============================================================================
// ZUSAMMENGESETZTE TYPEN (für Views/Joins)
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
 * Timesheet mit Mitarbeiter- und Projektdaten
 */
export interface V7TimesheetWithDetails extends V7Timesheet {
  employee: V7Employee;
  project: V7Project;
}

/**
 * Kundenfirma mit Statistiken
 */
export interface V7ClientCompanyWithStats extends V7ClientCompany {
  employee_count: number;
  project_count: number;
  total_hours: number;
}