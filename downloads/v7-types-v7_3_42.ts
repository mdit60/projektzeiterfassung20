// src/types/v7-types.ts
// ============================================================================
// PZE V7 - TypeScript Interfaces
// ============================================================================
// Datum: 21. Januar 2026
// Version: 7.3.42
// 
// Diese Datei enthaelt alle TypeScript-Typen fuer die V7-Datenbankstruktur.
// Erweitert um Portal-Rollen und Kapazitaetsmanagement.
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
  // BMBF-Programme
  | 'BMBF_KMU'             // BMBF KMU-innovativ
  | 'BMBF_VERBUND'         // BMBF Verbundprojekt
  // Forschungszulage
  | 'FZUL'                 // Forschungszulage (§35a EStG)
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
  BMBF_KMU: 'BMBF KMU-innovativ',
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
  BMBF_KMU: 'BMBF KMU',
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
  portal_role: V7EmployeePortalRole;  // NEU: Portal-Berechtigung
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
// ENDE
// ============================================================================
