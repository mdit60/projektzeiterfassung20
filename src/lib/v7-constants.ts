// src/lib/v7-constants.ts
// ============================================================================
// PZE V7 - Gemeinsame Konstanten
// ============================================================================
// Datum: 21. Januar 2026
// Version: 7.3.42
// 
// Zentrale Konstantendefinitionen fuer beide Portale (Berater + Firma)
// ============================================================================

import { V7PortalType } from '@/types/v7-types';


// ============================================================================
// PORTAL-FARBEN
// ============================================================================

/**
 * Header-Farben nach Portal
 * Regel: Die Farbe zeigt WER eingeloggt ist, nicht welche Daten man sieht
 */
export const PORTAL_COLORS = {
  berater: {
    primary: '#0369a1',           // Sky-700
    primaryHover: '#0284c7',      // Sky-600
    headerBg: 'bg-sky-700',
    headerHover: 'hover:bg-sky-600',
    buttonBg: 'bg-sky-600',
    buttonHover: 'hover:bg-sky-700',
    textColor: 'text-sky-700',
    borderColor: 'border-sky-600',
    lightBg: 'bg-sky-50',
  },
  firma: {
    primary: '#65A655',           // Gruen (Custom)
    primaryHover: '#4d8a40',
    headerBg: 'bg-green-600',
    headerHover: 'hover:bg-green-700',
    buttonBg: 'bg-green-600',
    buttonHover: 'hover:bg-green-700',
    textColor: 'text-green-700',
    borderColor: 'border-green-600',
    lightBg: 'bg-green-50',
  },
} as const;

/**
 * Gibt Portal-Farben zurueck
 */
export function getPortalColors(portal: V7PortalType) {
  return PORTAL_COLORS[portal];
}


// ============================================================================
// STUNDEN-BERECHNUNG
// ============================================================================

/**
 * Stunden pro Personenmonat
 * Berechnung: 40h/Woche * 52 Wochen / 12 Monate = 173,33
 */
export const HOURS_PER_PM = 173.33;

/**
 * Standard-Wochenstunden (Vollzeit)
 */
export const DEFAULT_WEEKLY_HOURS = 40;

/**
 * Standard-Urlaubstage pro Jahr
 */
export const DEFAULT_ANNUAL_LEAVE_DAYS = 30;

/**
 * Wochen pro Jahr
 */
export const WEEKS_PER_YEAR = 52;

/**
 * Monate pro Jahr
 */
export const MONTHS_PER_YEAR = 12;

/**
 * Arbeitstage pro Woche (Standard)
 */
export const WORKDAYS_PER_WEEK = 5;

/**
 * Standard-Arbeitsstunden pro Tag
 */
export const HOURS_PER_WORKDAY = 8;


// ============================================================================
// KAPAZITAETS-SCHWELLWERTE
// ============================================================================

/**
 * Auslastungs-Schwellwerte fuer Ampelfarben
 */
export const CAPACITY_THRESHOLDS = {
  GREEN_MAX: 50,      // Bis 50% = gruen (viel Kapazitaet frei)
  YELLOW_MAX: 80,     // 51-80% = gelb (eingeschraenkte Kapazitaet)
  RED_MIN: 81,        // Ab 81% = rot (fast voll)
  FULL: 100,          // 100% = komplett ausgelastet
} as const;

/**
 * Gibt Ampelfarbe fuer Auslastung zurueck
 */
export function getCapacityColor(percentage: number): 'green' | 'yellow' | 'red' {
  if (percentage <= CAPACITY_THRESHOLDS.GREEN_MAX) return 'green';
  if (percentage <= CAPACITY_THRESHOLDS.YELLOW_MAX) return 'yellow';
  return 'red';
}

/**
 * Tailwind-Klassen fuer Kapazitaets-Anzeige
 */
export const CAPACITY_COLORS = {
  green: {
    bg: 'bg-green-500',
    text: 'text-green-700',
    lightBg: 'bg-green-100',
  },
  yellow: {
    bg: 'bg-yellow-500',
    text: 'text-yellow-700',
    lightBg: 'bg-yellow-100',
  },
  red: {
    bg: 'bg-red-500',
    text: 'text-red-700',
    lightBg: 'bg-red-100',
  },
} as const;


// ============================================================================
// PROJEKT-STATUS
// ============================================================================

/**
 * Projekt-Fortschritts-Schwellwerte
 */
export const PROJECT_STATUS_THRESHOLDS = {
  NOT_STARTED: 0,
  BEHIND_THRESHOLD: -10,    // Mehr als 10% unter Plan = behind
  AHEAD_THRESHOLD: 10,      // Mehr als 10% ueber Plan = ahead
  COMPLETED: 100,
} as const;

/**
 * Status-Labels fuer Projekte
 */
export const PROJECT_STATUS_LABELS = {
  not_started: 'Nicht gestartet',
  on_track: 'Im Plan',
  behind: 'Hinter Plan',
  ahead: 'Voraus',
  completed: 'Abgeschlossen',
} as const;

/**
 * Status-Farben fuer Projekte
 */
export const PROJECT_STATUS_COLORS = {
  not_started: { bg: 'bg-gray-100', text: 'text-gray-600', icon: '⚪' },
  on_track: { bg: 'bg-green-100', text: 'text-green-700', icon: '🟢' },
  behind: { bg: 'bg-red-100', text: 'text-red-700', icon: '🔴' },
  ahead: { bg: 'bg-blue-100', text: 'text-blue-700', icon: '🔵' },
  completed: { bg: 'bg-purple-100', text: 'text-purple-700', icon: '✅' },
} as const;


// ============================================================================
// DATUMS-FORMATE
// ============================================================================

/**
 * Standard-Datumsformat fuer Anzeige
 */
export const DATE_FORMAT_DISPLAY = 'dd.MM.yyyy';

/**
 * Datumsformat fuer API/DB
 */
export const DATE_FORMAT_ISO = 'yyyy-MM-dd';

/**
 * Monatsnamen (deutsch)
 */
export const MONTH_NAMES = [
  'Januar', 'Februar', 'Maerz', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
] as const;

/**
 * Monatsnamen kurz (deutsch)
 */
export const MONTH_NAMES_SHORT = [
  'Jan', 'Feb', 'Mrz', 'Apr', 'Mai', 'Jun',
  'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'
] as const;

/**
 * Wochentage (deutsch)
 */
export const WEEKDAY_NAMES = [
  'Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 
  'Donnerstag', 'Freitag', 'Samstag'
] as const;

/**
 * Wochentage kurz (deutsch)
 */
export const WEEKDAY_NAMES_SHORT = [
  'So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'
] as const;


// ============================================================================
// VALIDIERUNG
// ============================================================================

/**
 * Min/Max-Werte fuer Eingabefelder
 */
export const VALIDATION = {
  WEEKLY_HOURS_MIN: 1,
  WEEKLY_HOURS_MAX: 60,
  DAILY_HOURS_MIN: 0,
  DAILY_HOURS_MAX: 24,
  ANNUAL_LEAVE_MIN: 0,
  ANNUAL_LEAVE_MAX: 60,
  AP_NUMBER_MIN: 1,
  AP_NUMBER_MAX: 99,
  FUE_PERCENTAGE_MIN: 0,
  FUE_PERCENTAGE_MAX: 100,
  PM_MIN: 0,
  PM_MAX: 999,
} as const;

/**
 * Regex-Patterns fuer Validierung
 */
export const VALIDATION_PATTERNS = {
  // FKZ-Format: 16KN087520, 01LY1925A, etc.
  FUNDING_REFERENCE: /^[0-9]{2}[A-Z]{2,4}[0-9]{4,6}[A-Z]?$/,
  // PLZ: 5-stellig
  ZIP_CODE: /^[0-9]{5}$/,
  // E-Mail
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  // Telefon (flexibel)
  PHONE: /^[+0-9][0-9\s\-\/]{6,}$/,
} as const;


// ============================================================================
// PAGINATION
// ============================================================================

/**
 * Standard-Seitengroesse fuer Listen
 */
export const DEFAULT_PAGE_SIZE = 25;

/**
 * Verfuegbare Seitengroessen
 */
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;


// ============================================================================
// UI-TEXTE
// ============================================================================

/**
 * Allgemeine Button-Texte
 */
export const BUTTON_TEXTS = {
  SAVE: 'Speichern',
  CANCEL: 'Abbrechen',
  DELETE: 'Loeschen',
  EDIT: 'Bearbeiten',
  ADD: 'Hinzufuegen',
  CREATE: 'Anlegen',
  CLOSE: 'Schliessen',
  CONFIRM: 'Bestaetigen',
  BACK: 'Zurueck',
  NEXT: 'Weiter',
  SEARCH: 'Suchen',
  FILTER: 'Filtern',
  RESET: 'Zuruecksetzen',
  EXPORT: 'Exportieren',
  IMPORT: 'Importieren',
} as const;

/**
 * Bestaetigungs-Dialoge
 */
export const CONFIRM_MESSAGES = {
  DELETE_EMPLOYEE: 'Moechten Sie diesen Mitarbeiter wirklich loeschen?',
  DELETE_PROJECT: 'Moechten Sie dieses Projekt wirklich loeschen?',
  DELETE_WORKPACKAGE: 'Moechten Sie dieses Arbeitspaket wirklich loeschen?',
  UNSAVED_CHANGES: 'Sie haben ungespeicherte Aenderungen. Wirklich verlassen?',
  LOCK_TIMESHEET: 'Moechten Sie diesen Stundennachweis sperren? Dies kann nicht rueckgaengig gemacht werden.',
} as const;

/**
 * Erfolgs-Meldungen
 */
export const SUCCESS_MESSAGES = {
  SAVED: 'Erfolgreich gespeichert',
  CREATED: 'Erfolgreich angelegt',
  DELETED: 'Erfolgreich geloescht',
  UPDATED: 'Erfolgreich aktualisiert',
  IMPORTED: 'Import erfolgreich',
  EXPORTED: 'Export erfolgreich',
} as const;

/**
 * Fehler-Meldungen
 */
export const ERROR_MESSAGES = {
  GENERIC: 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.',
  NOT_FOUND: 'Der angeforderte Eintrag wurde nicht gefunden.',
  UNAUTHORIZED: 'Sie haben keine Berechtigung fuer diese Aktion.',
  VALIDATION: 'Bitte ueberpruefen Sie Ihre Eingaben.',
  NETWORK: 'Netzwerkfehler. Bitte ueberpruefen Sie Ihre Verbindung.',
  CAPACITY_EXCEEDED: 'Die monatliche Kapazitaet wuerde ueberschritten werden.',
  DUPLICATE: 'Ein Eintrag mit diesen Daten existiert bereits.',
} as const;


// ============================================================================
// API-ENDPOINTS (relativ)
// ============================================================================

/**
 * API-Routen
 */
export const API_ROUTES = {
  // Auth
  LOGIN: '/api/auth/login',
  LOGOUT: '/api/auth/logout',
  SESSION: '/api/auth/session',
  
  // Firmen
  COMPANIES: '/api/v7/companies',
  COMPANY: (id: string) => `/api/v7/companies/${id}`,
  
  // Mitarbeiter
  EMPLOYEES: '/api/v7/employees',
  EMPLOYEE: (id: string) => `/api/v7/employees/${id}`,
  EMPLOYEE_CAPACITY: (id: string) => `/api/v7/employees/${id}/capacity`,
  
  // Projekte
  PROJECTS: '/api/v7/projects',
  PROJECT: (id: string) => `/api/v7/projects/${id}`,
  PROJECT_TEAM: (id: string) => `/api/v7/projects/${id}/team`,
  PROJECT_WORKPACKAGES: (id: string) => `/api/v7/projects/${id}/workpackages`,
  
  // Arbeitspakete
  WORKPACKAGES: '/api/v7/workpackages',
  WORKPACKAGE: (id: string) => `/api/v7/workpackages/${id}`,
  
  // Zeiterfassung
  TIMESHEETS: '/api/v7/timesheets',
  TIMESHEET: (id: string) => `/api/v7/timesheets/${id}`,
  
  // Berichte
  REPORTS: '/api/v7/reports',
  REPORT_PROJECT: (id: string) => `/api/v7/reports/project/${id}`,
  REPORT_EMPLOYEE: (id: string) => `/api/v7/reports/employee/${id}`,
} as const;


// ============================================================================
// ICONS (Lucide-Namen)
// ============================================================================

/**
 * Standard-Icons fuer verschiedene Elemente
 */
export const ICONS = {
  // Navigation
  DASHBOARD: 'LayoutDashboard',
  COMPANY: 'Building2',
  PROJECT: 'FolderKanban',
  EMPLOYEE: 'Users',
  TIMESHEET: 'Clock',
  REPORT: 'BarChart3',
  SETTINGS: 'Settings',
  
  // Aktionen
  ADD: 'Plus',
  EDIT: 'Pencil',
  DELETE: 'Trash2',
  SAVE: 'Save',
  CANCEL: 'X',
  SEARCH: 'Search',
  FILTER: 'Filter',
  EXPORT: 'Download',
  IMPORT: 'Upload',
  
  // Status
  SUCCESS: 'CheckCircle',
  WARNING: 'AlertTriangle',
  ERROR: 'XCircle',
  INFO: 'Info',
  
  // Sonstiges
  CALENDAR: 'Calendar',
  PERSON: 'User',
  TEAM: 'Users',
  MONEY: 'Euro',
  HOURS: 'Clock',
  CHART: 'TrendingUp',
  LOCK: 'Lock',
  UNLOCK: 'Unlock',
} as const;


// ============================================================================
// ENDE
// ============================================================================
