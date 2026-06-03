// src/components/shared/EmployeeManagement.tsx
// ============================================================================
// PZE V7 - Shared Employee Management Component
// ============================================================================
// Version: 7.3.95-18
// v7.3.95-18: E-Mail-Bestaetigungsfeld bei Neuanlage (Schutz gegen Tippfehler).
//   Zweites Feld "E-Mail bestaetigen" nur bei modalMode='create'. Live-Hinweis
//   bei Abweichung (kleingeschrieben+getrimmt), "Anlegen" gesperrt bis identisch,
//   harte Pruefung in handleSave.
// v7.3.95-17: modalOnly + onClose Props
//   - modalOnly=true: rendert NUR das Modal, keine Liste/Header
//   - onClose(): wird bei Abbrechen UND nach erfolgreichem Anlegen aufgerufen
//   - Fuer Inline-Verwendung in FirmaCockpit (App-Struktur)
// v7.3.95-15: Teilzeit-Erfassung: days_per_week + hours_per_day. weekly_hours berechnet.
// v7.3.95-14: Verwaiste Login-User (ohne v7_employees) in Mitarbeiterliste anzeigen
// v7.3.95-13: Tailwind-v4-Syntax-Modernisierung (2 Stellen). Keine
//   funktionale Aenderung - nur Syntax fuer Tailwind v4 angepasst:
//   - flex-shrink-0 -> shrink-0 (Kurzform-Utility seit Tailwind v3.3)
//   - z-[60] -> z-60 (Standard-Utility-Klasse seit Tailwind v4)
//   Die VSCode Tailwind-IntelliSense hatte beide als Modernisierungs-
//   Vorschlaege markiert.
// v7.3.95-12: UI-Feinschliff. Historie-Tabelle: feste Spaltenbreiten, damit
//   Stundenwert und Notiz nicht mehr aneinander kleben. Kopfzeile klarer
//   ("Gueltig ab", "Std./Wo.", "Notiz").
// v7.3.95-11: UI-Feinschliff. Auto-generierte Notiz-Texte werden in der
//   Historie-Tabelle ausgeblendet (Anzeige "-" wie bei leerer Notiz).
//   Betrifft drei Marker-Strings aus Migration und Create-Flow.
// v7.3.95-10: BUGFIX in handleDeleteHistoryEntry + konsistente Anzeige.
//   Beim Loeschen des aktuell wirksamen Eintrags wurde das Alt-Feld
//   v7_employees.weekly_hours faelschlich auf einen zukuenftigen
//   History-Eintrag gesetzt (Fallback || verbleibend[0]).
//   Fix 1: Alt-Feld wird NUR aktualisiert, wenn nach dem Loeschen ein
//          Eintrag mit gueltig_ab <= heute existiert. Sonst unveraendert.
//   Fix 2: getCurrentHistoryEntry() liefert null statt Zukunftseintrag,
//          wenn alle Eintraege in der Zukunft liegen.
//   Neu:   getNextFutureEntry() - zeigt anstehenden Wechsel als Hinweis
//          "Ab TT.MM.JJJJ: X h/Woche" (gelb) unter dem aktuellen Wert.
// v7.3.95-9: PHASE 2 Arbeitszeitgrenzen - Teilzeit-Historie-UI.
//   Basiert auf v7.3.95-8 (Phase 1), nur punktuelle Ergaenzungen.
//   - Edit-Modal: "Wochenstunden (pWAZ)"-Feld wird durch Historie-Block ersetzt.
//     Anzeige "Aktuell: X h/Woche (seit TT.MM.JJJJ)" + aufklappbare Historie.
//   - Historie-Tabelle: gueltig_ab | Wochenstunden | Notiz | Loeschen
//   - "+ Neuen Eintrag hinzufuegen"-Sub-Modal mit Datum/Stunden/Notiz
//     + Validierung gueltig_ab.getDate() === 1 (weiche Warnung).
//   - Create-Modal: Zahlenfeld bleibt wie bisher. Beim Anlegen wird zusaetzlich
//     automatisch ein History-Eintrag (gueltig_ab = employment_start oder heute,
//     weekly_hours = Feldwert) erzeugt.
//   - Alt-Feld v7_employees.weekly_hours wird synchronisiert, wenn ein neuer
//     History-Eintrag mit gueltig_ab <= heute angelegt oder der aktuell
//     wirksame Eintrag geloescht wird.
//   Siehe KONZEPT-ARBEITSZEITGRENZEN-v1_3.md Phase 2.
// v7.3.95-8: PHASE 1 Arbeitszeitgrenzen auf Basis der echten v7.3.95-7.
//   Forward-Fix nach versehentlichem Ueberschreiben in Session 24.
//   - position_title als Dropdown mit Sonstige-Fallback
//   - GF-Hinweis bei Auswahl Geschaeftsfuehrer / Gesellschafter-Geschaeftsfuehrer
//   - State sonstigeAktiv fuer korrekte Dropdown-Anzeige bei Sonstige-Auswahl
//   - Ausgeschieden-Feature (isEmpActive) und employment_end-Sync BLEIBEN.
//   Siehe KONZEPT-ARBEITSZEITGRENZEN-v1_3.md.
// v7.3.95-7:
//   1. Status-Anzeige: "Ausgeschieden" wenn employment_end in der Vergangenheit
//      (zusaetzlich zu "Inaktiv" bei manuellem is_active=false)
//      Helper-Funktion isEmpActive(emp) steuert alle Status-Checks.
//   2. employment_end -> assignment_end automatisch uebertragen:
//      Wenn employment_end gesetzt wird und kleiner als bestehendes assignment_end
//      (oder assignment_end leer), werden alle Projektteam-Eintraege dieses MA
//      automatisch auf employment_end gekappt.
// v7.3.95-5: 'Student' zur QUALIFICATION_OPTIONS Liste hinzugefuegt
// v7.3.95-4: REFACTOR: handleCreateLogin auf atomare API-Route /api/v7/create-employee-login
//   umgestellt. Alle 3 Schritte (Auth + Profil + Employee) server-seitig und atomar.
//   createUserProfile() und linkEmployeeToUser() entfernt (nicht mehr benoetigt).
// v7.3.95-3: BUG FIX Login-Erstellung:
//   1. createUserProfile: role war 'employee' statt 'client_user' -> Login-Schleife
//   2. handleLinkExistingUser: Feldname 'company_id' -> 'client_company_id' -> NULL in DB
// v7.3.95-2: NEU: Passwort zuruecksetzen fuer MA mit Login (Schluessel-Icon)
//
// Wird von beiden Portalen genutzt:
// - Firmen-Portal: /v7/firma/mitarbeiter
// - Berater-Portal: /v7/berater/foerderung/firma/[id]?tab=mitarbeiter
//
// Volle CRUD-Funktionalitaet:
// - Liste mit Suche
// - Anlegen
// - Bearbeiten
// - Deaktivieren/Reaktivieren
// - Portal-Rolle zuweisen (employee/project_leader/client_admin)
// - Login erstellen (NEU: Erkennt bereits registrierte Benutzer)
//
// AENDERUNGEN v7.3.95:
// - ENTFERNT: Gesamter "Persoenliche Daten (Anlage 6.1)" Bereich aus Formular
//   Grund: Lfd. Nr., Stundensatz, Jahresbrutto sind PROJEKTSPEZIFISCH
//   und gehoeren in den ProjectTeamManager (Projekt > Team > Bearbeiten)
// - ENTFERNT: employee_number, hourly_rate, annual_salary, company_weekly_hours,
//   birth_date, education_degree, education_year aus Formular
// - BEIBEHALTEN: Position, Qualifikation, pWAZ, Portal-Rolle (firmenweit korrekt)
// - Sortierung weiterhin alphabetisch nach display_name (firmenweit sinnvoll)
//
// AENDERUNGEN v7.3.89-1:
// - FIX: Login-Verknuepfung dreht sich nicht mehr im Kreis
//
// Props:
// - portal: 'berater' | 'firma'
// - companyId: string
// - canEdit: boolean
// - title?: string
// ============================================================================

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
// v7.3.95-8: Phase 1 - Position-Dropdown-Konstanten aus zentralem Types-Modul
// v7.3.95-9: Phase 2 - V7EmployeeHoursHistory-Interface fuer Teilzeit-Historie
import {
  POSITION_OPTIONS,
  GF_POSITIONS,
  V7EmployeeHoursHistory,
} from '@/types/v7-types';
import {
  Users,
  Search,
  Plus,
  Pencil,
  UserX,
  RefreshCw,
  X,
  Save,
  KeyRound,
  Link2,
  Check,
  Trash2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

// ============================================================================
// TYPEN
// ============================================================================

export interface Employee {
  id: string;
  display_name: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  position_title: string | null;
  qualification: string | null;
  weekly_hours: number | null;
  employment_start: string | null;
  employment_end: string | null;
  is_active: boolean;
  portal_role: string | null;
  user_id: string | null;
  // NEU: Aus JOIN mit v7_user_profiles
  has_login?: boolean;
  // v7.3.95-14: User mit Login aber ohne v7_employees-Eintrag
  is_orphan?: boolean;
}

interface EmployeeFormData {
  display_name: string;
  first_name: string;
  last_name: string;
  email: string;
  position_title: string;
  qualification: string;
  weekly_hours: string;
  employment_start: string;
  employment_end: string;
  portal_role: string;
}

interface EmployeeManagementProps {
  portal: 'berater' | 'firma';
  companyId: string;
  canEdit: boolean;
  title?: string;
  openNew?: boolean; // Wenn true: Neuer-Mitarbeiter-Modal direkt oeffnen
  firmaName?: string; // Firmenname fuer Modal-Header
  modalOnly?: boolean; // Wenn true: NUR Modal rendern, keine Liste/Header
  onClose?: () => void; // Callback bei Modal-Schliessung (Abbrechen oder nach Anlegen)
}

// Cache fuer registrierte E-Mails
interface RegisteredUser {
  id: string;
  email: string;
  display_name: string | null;
}

// ============================================================================
// KONSTANTEN
// ============================================================================

const EMPTY_FORM: EmployeeFormData = {
  display_name: '',
  first_name: '',
  last_name: '',
  email: '',
  position_title: '',
  qualification: '',
  weekly_hours: '40',
  employment_start: '',
  employment_end: '',
  portal_role: 'employee',
};

const QUALIFICATION_OPTIONS = [
  'keine Ausbildung',
  'Student',
  'Berufsausbildung',
  'Meister/Techniker',
  'Bachelor',
  'Master/Diplom',
  'Promotion',
];

// Helper: MA gilt als aktiv wenn is_active=true UND employment_end nicht ueberschritten
function isEmpActive(emp: { is_active: boolean; employment_end: string | null }): boolean {
  if (!emp.is_active) return false;
  if (!emp.employment_end) return true;
  const today = new Date().toISOString().split('T')[0];
  return emp.employment_end >= today;
}

const PORTAL_ROLE_OPTIONS = [
  { value: 'employee', label: 'Mitarbeiter', description: 'Kann nur eigene Zeiterfassung sehen' },
  { value: 'project_leader', label: 'Projektleiter', description: 'Kann zugeordnete Projekte und deren MA sehen' },
  { value: 'client_admin', label: 'Administrator', description: 'Voller Zugriff auf alle Firmendaten' },
];

const PORTAL_COLORS = {
  berater: {
    button: 'bg-blue-600 hover:bg-blue-700',
    focus: 'focus:ring-blue-500',
    badge: 'bg-blue-100 text-blue-800',
    text: 'text-blue-600',
    hover: 'hover:text-blue-900',
  },
  firma: {
    button: 'bg-green-600 hover:bg-green-700',
    focus: 'focus:ring-green-500',
    badge: 'bg-green-100 text-green-800',
    text: 'text-green-600',
    hover: 'hover:text-green-900',
  },
};

// ============================================================================
// KOMPONENTE
// ============================================================================

export default function EmployeeManagement({
  portal,
  companyId,
  canEdit,
  title = 'Mitarbeiter',
  openNew = false,
  firmaName = '',
  modalOnly = false,
  onClose,
}: EmployeeManagementProps) {
  const supabase = createClient();
  const colors = PORTAL_COLORS[portal];

  // State - Daten
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showInactive, setShowInactive] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // NEU: Cache fuer registrierte User-Profiles (Email -> User)
  const [registeredEmails, setRegisteredEmails] = useState<Map<string, RegisteredUser>>(new Map());

  // State - Modal
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState<EmployeeFormData>(EMPTY_FORM);
  const [emailConfirm, setEmailConfirm] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  // v7.3.95-9: Merkt sich ob User im Position-Dropdown "Sonstige" gewaehlt hat.
  // Brauchen wir, weil position_title dann '' wird und sonst nicht zu
  // unterscheiden waere von "noch nicht gewaehlt".
  const [sonstigeAktiv, setSonstigeAktiv] = useState(false);

  // v7.3.95-9: Phase 2 - Teilzeit-Historie
  // Liste der History-Eintraege fuer den gerade bearbeiteten MA (sortiert: neuester zuerst)
  const [hoursHistory, setHoursHistory] = useState<V7EmployeeHoursHistory[]>([]);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  // Sub-Modal "Neuer History-Eintrag"
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyForm, setHistoryForm] = useState({
    gueltig_ab: '',
    days_per_week: '5',
    hours_per_day: '8',
    notiz: '',
  });
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyWarning, setHistoryWarning] = useState<string | null>(null);
  const [historySaving, setHistorySaving] = useState(false);

  // State - Delete Confirm
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);

  // State - Login erstellen Modal
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginEmployee, setLoginEmployee] = useState<Employee | null>(null);
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [creatingLogin, setCreatingLogin] = useState(false);
  
  // NEU: Modus fuer Login-Modal (create = neuen User, link = existierenden verknuepfen)
  const [loginMode, setLoginMode] = useState<'create' | 'link'>('create');
  const [existingUserId, setExistingUserId] = useState<string | null>(null);

  // State - Passwort zuruecksetzen
  const [showResetPwModal, setShowResetPwModal] = useState(false);
  const [resetPwEmployee, setResetPwEmployee] = useState<Employee | null>(null);
  const [resetPwPassword, setResetPwPassword] = useState('');
  const [resetPwError, setResetPwError] = useState<string | null>(null);
  const [resetPwSuccess, setResetPwSuccess] = useState(false);
  const [resettingPw, setResettingPw] = useState(false);

  // ============================================================================
  // DATEN LADEN
  // ============================================================================

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    try {
      // Mitarbeiter laden
      let query = supabase
        .from('v7_employees')
        .select('id, display_name, first_name, last_name, email, position_title, qualification, weekly_hours, employment_start, employment_end, is_active, portal_role, user_id')
        .eq('client_company_id', companyId)
        .order('display_name');

      if (!showInactive) {
        query = query.eq('is_active', true);
      }

      const { data: employeesData, error } = await query;
      if (error) throw error;
      
      // NEU: Alle E-Mails sammeln und pruefen welche bereits registriert sind
      const emails = (employeesData || [])
        .filter(e => e.email)
        .map(e => e.email!.toLowerCase());
      
      if (emails.length > 0) {
        // Alle User-Profiles fuer diese E-Mails laden
        const { data: profiles } = await supabase
          .from('v7_user_profiles')
          .select('id, email, display_name')
          .in('email', emails);
        
        // Map erstellen: email -> user
        const emailMap = new Map<string, RegisteredUser>();
        (profiles || []).forEach(p => {
          if (p.email) {
            emailMap.set(p.email.toLowerCase(), {
              id: p.id,
              email: p.email,
              display_name: p.display_name,
            });
          }
        });
        setRegisteredEmails(emailMap);
        
        // has_login Flag setzen basierend auf user_id ODER existierendem Profile
        const enrichedEmployees = (employeesData || []).map(emp => ({
          ...emp,
          has_login: !!(emp.user_id || (emp.email && emailMap.has(emp.email.toLowerCase()))),
          is_orphan: false,
        }));

        // v7.3.95-14: Verwaiste User ermitteln:
        // v7_user_profiles mit client_company_id die KEINEN v7_employees-Eintrag haben
        const { data: orphanProfiles } = await supabase
          .from('v7_user_profiles')
          .select('id, email, display_name, first_name, last_name')
          .eq('client_company_id', companyId);

        const employeeEmails = new Set(
          (employeesData || []).map(e => e.email?.toLowerCase()).filter(Boolean)
        );
        const orphans: Employee[] = (orphanProfiles || [])
          .filter(p => p.email && !employeeEmails.has(p.email.toLowerCase()))
          .map(p => ({
            id: p.id, // user_profiles.id als temporaere ID
            display_name: p.display_name || p.email || '--',
            first_name: p.first_name || null,
            last_name: p.last_name || null,
            email: p.email,
            position_title: null,
            qualification: null,
            weekly_hours: null,
            employment_start: null,
            employment_end: null,
            is_active: true,
            portal_role: null,
            user_id: p.id,
            has_login: true,
            is_orphan: true,
          }));

        setEmployees([...enrichedEmployees, ...orphans]);
      } else {
        setEmployees(employeesData || []);
      }
      
    } catch (err) {
      console.error('Fehler beim Laden:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase, companyId, showInactive]);

  useEffect(() => {
    if (companyId) loadEmployees();
  }, [companyId, loadEmployees]);

  // Auto-open: wenn openNew=true, Modal nach Laden oeffnen
  useEffect(() => {
    if (openNew && canEdit) {
      setShowModal(true);
    }
  }, [openNew, canEdit]);

  // ============================================================================
  // PASSWORT ZURUECKSETZEN
  // ============================================================================

  const openResetPwModal = (emp: Employee) => {
    setResetPwEmployee(emp);
    setResetPwPassword('');
    setResetPwError(null);
    setResetPwSuccess(false);
    setShowResetPwModal(true);
  };

  const handleResetPw = async () => {
    if (!resetPwEmployee || !resetPwPassword || resetPwPassword.length < 6) {
      setResetPwError('Passwort muss mindestens 6 Zeichen lang sein.');
      return;
    }
    setResettingPw(true);
    setResetPwError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setResetPwError('Nicht eingeloggt.'); return; }
      const response = await fetch('/api/v7/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          userId: resetPwEmployee.user_id,
          newPassword: resetPwPassword,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        setResetPwError(result.error || 'Fehler beim Zuruecksetzen.');
      } else {
        setResetPwSuccess(true);
        setResetPwPassword('');
      }
    } catch (err: any) {
      setResetPwError('Unerwarteter Fehler: ' + err.message);
    } finally {
      setResettingPw(false);
    }
  };

  // ============================================================================
  // TEILZEIT-HISTORIE (v7.3.95-9, Phase 2)
  // ============================================================================

  /**
   * Laedt die History-Eintraege eines Mitarbeiters, sortiert nach gueltig_ab DESC
   * (neuester Eintrag oben).
   */
  const loadHoursHistory = async (employeeId: string) => {
    setHistoryLoading(true);
    try {
      const { data, error } = await supabase
        .from('v7_employee_hours_history')
        .select('id, employee_id, weekly_hours, gueltig_ab, created_at, created_by, notiz')
        .eq('employee_id', employeeId)
        .order('gueltig_ab', { ascending: false });
      if (error) throw error;
      setHoursHistory(data || []);
    } catch (err) {
      console.error('Fehler beim Laden der Wochenstunden-Historie:', err);
      setHoursHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  /**
   * Gibt den aktuell wirksamen History-Eintrag zurueck (groesstes gueltig_ab
   * das <= heute ist).
   *
   * v7.3.95-10: Gibt null zurueck, wenn KEIN Eintrag <= heute existiert
   * (z.B. MA noch nicht gestartet, alle Eintraege liegen in der Zukunft).
   * Frueher: Fallback auf hoursHistory[0] - das hat Zukunftseintraege
   * faelschlich als "aktuell" angezeigt und beim Loeschen auch falsch
   * ins Alt-Feld geschrieben.
   */
  const getCurrentHistoryEntry = (): V7EmployeeHoursHistory | null => {
    if (hoursHistory.length === 0) return null;
    const today = new Date().toISOString().split('T')[0];
    // hoursHistory ist DESC sortiert -> erster Treffer = groesstes gueltig_ab <= heute
    return hoursHistory.find(h => h.gueltig_ab <= today) || null;
  };

  /**
   * Gibt den naechsten Zukunfts-Eintrag zurueck (kleinstes gueltig_ab > heute).
   * Fuer informative Anzeige "ab TT.MM.JJJJ: X h/Woche".
   */
  const getNextFutureEntry = (): V7EmployeeHoursHistory | null => {
    if (hoursHistory.length === 0) return null;
    const today = new Date().toISOString().split('T')[0];
    // DESC-sortierte Liste nach asc filtern
    const zukunft = hoursHistory.filter(h => h.gueltig_ab > today);
    if (zukunft.length === 0) return null;
    // kleinstes Datum = letztes in DESC-Liste
    return zukunft[zukunft.length - 1];
  };

  const openHistoryModal = () => {
    // Vorschlag: naechster Monatserster
    const now = new Date();
    const naechsterMonat = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const vorschlagDatum = naechsterMonat.toISOString().split('T')[0];
    // Vorschlag: aktueller Historieeintrag oder Defaults
    const current = getCurrentHistoryEntry();
    const vorschlagTage = current?.days_per_week != null ? current.days_per_week.toString() : '5';
    const vorschlagStdTag = current?.hours_per_day != null ? current.hours_per_day.toString() : '8';
    setHistoryForm({
      gueltig_ab: vorschlagDatum,
      days_per_week: vorschlagTage,
      hours_per_day: vorschlagStdTag,
      notiz: '',
    });
    setHistoryError(null);
    setHistoryWarning(null);
    setShowHistoryModal(true);
  };

  const closeHistoryModal = () => {
    setShowHistoryModal(false);
    setHistoryError(null);
    setHistoryWarning(null);
    setHistorySaving(false);
  };

  /**
   * Prueft die Eingaben. Harte Fehler verhindern das Speichern, weiche
   * Warnungen muessen nur beim zweiten Klick uebersteuert werden.
   * Rueckgabe: 'hard' | 'soft' | 'ok'
   */
  const validateHistoryForm = (): 'hard' | 'soft' | 'ok' => {
    setHistoryError(null);
    setHistoryWarning(null);
    const datum = historyForm.gueltig_ab;
    if (!datum) {
      setHistoryError('Bitte ein Gueltig-ab-Datum angeben.');
      return 'hard';
    }
    const tage = parseInt(historyForm.days_per_week);
    const stdTag = parseFloat(historyForm.hours_per_day.replace(',', '.'));
    if (isNaN(tage) || tage < 1 || tage > 7) {
      setHistoryError('Arbeitstage muessen zwischen 1 und 7 liegen.');
      return 'hard';
    }
    if (isNaN(stdTag) || stdTag <= 0 || stdTag > 24) {
      setHistoryError('Stunden pro Tag muessen zwischen 0 und 24 liegen.');
      return 'hard';
    }
    // Duplikatspruefung
    if (hoursHistory.some(h => h.gueltig_ab === datum)) {
      setHistoryError('Fuer dieses Datum gibt es bereits einen Eintrag.');
      return 'hard';
    }
    // Weiche Warnung: Nicht Monats-Erster
    const datumObj = new Date(datum + 'T00:00:00');
    if (datumObj.getDate() !== 1) {
      setHistoryWarning(
        'Das Datum ist nicht der 1. eines Monats. Teilzeit-Wechsel erfolgen '
        + 'i.d.R. zum Monatsersten. Moechten Sie trotzdem speichern?'
      );
      return 'soft';
    }
    return 'ok';
  };

  const handleSaveHistoryEntry = async (force: boolean = false) => {
    if (!editingEmployee) return;
    const status = validateHistoryForm();
    if (status === 'hard') return;
    if (status === 'soft' && !force) return;

    setHistorySaving(true);
    try {
      const tage = parseInt(historyForm.days_per_week);
      const stdTag = parseFloat(historyForm.hours_per_day.replace(',', '.'));
      const wochenstunden = Math.round(tage * stdTag * 100) / 100;
      const insertData = {
        employee_id: editingEmployee.id,
        weekly_hours: wochenstunden,
        days_per_week: tage,
        hours_per_day: stdTag,
        gueltig_ab: historyForm.gueltig_ab,
        notiz: historyForm.notiz.trim() || null,
      };
      const { error } = await supabase
        .from('v7_employee_hours_history')
        .insert(insertData);
      if (error) throw error;

      // v7_employees.weekly_hours + days_per_week + hours_per_day synchronisieren
      const today = new Date().toISOString().split('T')[0];
      if (historyForm.gueltig_ab <= today) {
        const neuerEintragIstAktuell = !hoursHistory.some(
          h => h.gueltig_ab > historyForm.gueltig_ab && h.gueltig_ab <= today
        );
        if (neuerEintragIstAktuell) {
          await supabase
            .from('v7_employees')
            .update({
              weekly_hours: wochenstunden,
              days_per_week: tage,
              hours_per_day: stdTag,
              updated_at: new Date().toISOString(),
            })
            .eq('id', editingEmployee.id);
          setFormData(prev => ({ ...prev, weekly_hours: wochenstunden.toString() }));
        }
      }

      // History neu laden
      await loadHoursHistory(editingEmployee.id);
      // Liste oben auch aktualisieren (weekly_hours koennte sich geaendert haben)
      await loadEmployees();
      closeHistoryModal();
    } catch (err: any) {
      console.error('Fehler beim Speichern des History-Eintrags:', err);
      setHistoryError(err.message || 'Fehler beim Speichern.');
      setHistorySaving(false);
    }
  };

  const handleDeleteHistoryEntry = async (entry: V7EmployeeHoursHistory) => {
    if (!editingEmployee) return;
    // Letzten Eintrag nicht loeschen (sonst kein Ankerwert)
    if (hoursHistory.length <= 1) {
      alert('Der letzte Eintrag kann nicht geloescht werden.');
      return;
    }
    if (!window.confirm(
      `Eintrag vom ${formatDateDE(entry.gueltig_ab)} (${entry.weekly_hours} h) wirklich loeschen?`
    )) {
      return;
    }
    try {
      const { error } = await supabase
        .from('v7_employee_hours_history')
        .delete()
        .eq('id', entry.id);
      if (error) throw error;

      // Falls der geloeschte Eintrag der aktuell wirksame war,
      // Alt-Feld auf neuen aktuell wirksamen Eintrag setzen.
      // v7.3.95-10 FIX: Kein Fallback auf verbleibend[0]. Wenn nach dem
      // Loeschen KEIN Eintrag mit gueltig_ab <= heute existiert (z.B. alle
      // verbleibenden Eintraege liegen in der Zukunft), bleibt das Alt-Feld
      // unveraendert - sonst wuerde ein Zukunftswert faelschlich als
      // "aktuell" gelten.
      const today = new Date().toISOString().split('T')[0];
      const current = getCurrentHistoryEntry();
      if (current && current.id === entry.id) {
        // Der aktuell wirksame Eintrag wird geloescht.
        // hoursHistory ist DESC sortiert -> .find nimmt den groessten
        // gueltig_ab, der <= heute ist.
        const verbleibend = hoursHistory.filter(h => h.id !== entry.id);
        const neuAktiv = verbleibend.find(h => h.gueltig_ab <= today);
        if (neuAktiv) {
          await supabase
            .from('v7_employees')
            .update({
              weekly_hours: neuAktiv.weekly_hours,
              updated_at: new Date().toISOString(),
            })
            .eq('id', editingEmployee.id);
          setFormData(prev => ({ ...prev, weekly_hours: neuAktiv.weekly_hours.toString() }));
        }
        // else: Kein wirksamer Eintrag mehr vorhanden - Alt-Feld
        // bleibt unveraendert. Die Historie-Anzeige zeigt dann
        // ggf. "Aktuell: (letzter vor heute existiert nicht)" bzw.
        // rutscht auf den fruehesten Zukunftseintrag nur fuer Anzeige
        // ueber getCurrentHistoryEntry() - das darf das Alt-Feld
        // aber nicht beeinflussen.
      }

      await loadHoursHistory(editingEmployee.id);
      await loadEmployees();
    } catch (err: any) {
      console.error('Fehler beim Loeschen:', err);
      alert('Fehler beim Loeschen: ' + (err.message || 'Unbekannt'));
    }
  };

  // Helfer: Datum DE formatieren (TT.MM.JJJJ)
  const formatDateDE = (iso: string): string => {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    return `${d}.${m}.${y}`;
  };

  // v7.3.95-11: Auto-/Migrations-Notizen, die in der UI ausgeblendet werden.
  // Der Text bleibt in der DB als Audit-Spur ("woher kommt der Wert"),
  // ist aber fuer Admins irrelevant und verstopft nur die Tabelle.
  const AUTO_NOTIZ_TEXTE = [
    'Initialimport aus v7_employees.weekly_hours (v7.4.7)',
    'Initialimport aus Alt-Feld',
    'Initialeintrag beim Anlegen',
  ];
  const isAutoNotiz = (notiz: string | null): boolean => {
    if (!notiz) return false;
    return AUTO_NOTIZ_TEXTE.includes(notiz.trim());
  };

  // ============================================================================
  // MODAL FUNKTIONEN
  // ============================================================================

  const openCreateModal = () => {
    setModalMode('create');
    setEditingEmployee(null);
    setFormData(EMPTY_FORM);
    setEmailConfirm('');
    setFormError(null);
    setSonstigeAktiv(false);  // v7.3.95-8
    // v7.3.95-9: Phase 2 - History-State zuruecksetzen
    setHoursHistory([]);
    setHistoryExpanded(false);
    setShowModal(true);
  };

  const openEditModal = (emp: Employee) => {
    setModalMode('edit');
    setEditingEmployee(emp);
    setFormData({
      display_name: emp.display_name || '',
      first_name: emp.first_name || '',
      last_name: emp.last_name || '',
      email: emp.email || '',
      position_title: emp.position_title || '',
      qualification: emp.qualification || '',
      weekly_hours: emp.weekly_hours?.toString() || '40',
      employment_start: emp.employment_start || '',
      employment_end: emp.employment_end || '',
      portal_role: emp.portal_role || 'employee',
    });
    setEmailConfirm('');
    // v7.3.95-8: sonstigeAktiv true, wenn position_title nicht in Standardrollen
    // ist (d.h. Freitext-Altbestand wie "Entwickler", "GF" usw.).
    const pt = emp.position_title || '';
    const istStandard =
      pt !== '' &&
      POSITION_OPTIONS.includes(pt as (typeof POSITION_OPTIONS)[number]) &&
      pt !== 'Sonstige';
    setSonstigeAktiv(pt !== '' && !istStandard);
    setFormError(null);
    // v7.3.95-9: Phase 2 - History-Eintraege fuer diesen MA laden
    setHoursHistory([]);
    setHistoryExpanded(false);
    loadHoursHistory(emp.id);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingEmployee(null);
    setFormData(EMPTY_FORM);
    setEmailConfirm('');
    setFormError(null);
    setSonstigeAktiv(false);  // v7.3.95-8
    // v7.3.95-9: Phase 2 - History-State zuruecksetzen
    setHoursHistory([]);
    setHistoryExpanded(false);
    // v7.3.95-17: onClose Callback (fuer modalOnly / Inline-Cockpit)
    if (onClose) onClose();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Auto-generate display_name from first + last name
    if (name === 'first_name' || name === 'last_name') {
      const firstName = name === 'first_name' ? value : formData.first_name;
      const lastName = name === 'last_name' ? value : formData.last_name;
      if (firstName || lastName) {
        setFormData(prev => ({
          ...prev,
          [name]: value,
          display_name: `${lastName}${lastName && firstName ? ', ' : ''}${firstName}`.trim(),
        }));
      }
    }
  };

  const validateForm = (): boolean => {
    if (!formData.display_name.trim()) {
      setFormError('Name ist ein Pflichtfeld.');
      return false;
    }
    if (formData.email && !formData.email.includes('@')) {
      setFormError('Bitte eine gueltige E-Mail-Adresse eingeben.');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    // v7.3.95-18: Bei Neuanlage E-Mail-Bestaetigung pruefen (Tippfehler-Schutz)
    if (modalMode === 'create' && formData.email.trim()) {
      if (formData.email.trim().toLowerCase() !== emailConfirm.trim().toLowerCase()) {
        setFormError('Die E-Mail-Adressen stimmen nicht ueberein. Bitte pruefen.');
        return;
      }
    }

    setSaving(true);
    setFormError(null);

    try {
      const saveData = {
        display_name: formData.display_name.trim(),
        first_name: formData.first_name.trim() || null,
        last_name: formData.last_name.trim() || null,
        email: formData.email.trim() || null,
        position_title: formData.position_title.trim() || null,
        qualification: formData.qualification || null,
        weekly_hours: formData.weekly_hours ? parseFloat(formData.weekly_hours.replace(',', '.')) : null,
        employment_start: formData.employment_start || null,
        employment_end: formData.employment_end || null,
        portal_role: formData.portal_role || 'employee',
        updated_at: new Date().toISOString(),
      };

      if (modalMode === 'create') {
        // v7.3.95-9: Phase 2 - insert gibt die neue MA-ID zurueck, damit wir
        // anschliessend den initialen History-Eintrag anlegen koennen.
        const { data: inserted, error } = await supabase
          .from('v7_employees')
          .insert({
            ...saveData,
            client_company_id: companyId,
            is_active: true,
          })
          .select('id')
          .single();

        if (error) throw error;

        // Initialen History-Eintrag anlegen (Anker-Wert).
        // gueltig_ab = employment_start wenn gesetzt, sonst heute.
        // Fehler werden nur geloggt, nicht als Save-Fehler gewertet,
        // damit der MA nicht ohne Anker bleibt, aber Create trotzdem
        // als erfolgreich gilt.
        if (inserted?.id && saveData.weekly_hours) {
          const gueltigAb = saveData.employment_start
            || new Date().toISOString().split('T')[0];
          const { error: histErr } = await supabase
            .from('v7_employee_hours_history')
            .insert({
              employee_id: inserted.id,
              weekly_hours: saveData.weekly_hours,
              gueltig_ab: gueltigAb,
              notiz: 'Initialeintrag beim Anlegen',
            });
          if (histErr) {
            console.warn('History-Initialeintrag konnte nicht angelegt werden:', histErr);
          }
        }
      } else if (editingEmployee) {
        const { error } = await supabase
          .from('v7_employees')
          .update(saveData)
          .eq('id', editingEmployee.id);

        if (error) throw error;

        // Automatisch alle Projektteam-Eintraege kappen wenn employment_end gesetzt
        if (saveData.employment_end) {
          const { data: assignments } = await supabase
            .from('v7_project_assignments')
            .select('id, assignment_end')
            .eq('employee_id', editingEmployee.id);

          if (assignments && assignments.length > 0) {
            const toUpdate = assignments.filter(a =>
              !a.assignment_end || a.assignment_end > saveData.employment_end!
            );
            if (toUpdate.length > 0) {
              await supabase
                .from('v7_project_assignments')
                .update({ assignment_end: saveData.employment_end })
                .in('id', toUpdate.map((a: { id: string }) => a.id));
            }
          }
        }
      }

      closeModal();
      await loadEmployees();
    } catch (err: any) {
      console.error('Fehler beim Speichern:', err);
      setFormError(err.message || 'Fehler beim Speichern.');
    } finally {
      setSaving(false);
    }
  };

  // ============================================================================
  // DELETE FUNKTIONEN
  // ============================================================================

  const confirmDelete = (emp: Employee) => {
    setEmployeeToDelete(emp);
    setShowDeleteConfirm(true);
  };

  const handleDelete = async () => {
    if (!employeeToDelete) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('v7_employees')
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', employeeToDelete.id);

      if (error) throw error;

      setShowDeleteConfirm(false);
      setEmployeeToDelete(null);
      await loadEmployees();
    } catch (err) {
      console.error('Fehler beim Deaktivieren:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleReactivate = async (emp: Employee) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('v7_employees')
        .update({
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', emp.id);

      if (error) throw error;
      await loadEmployees();
    } catch (err) {
      console.error('Fehler beim Reaktivieren:', err);
    } finally {
      setSaving(false);
    }
  };

  // ============================================================================
  // LOGIN FUNKTIONEN (ERWEITERT)
  // ============================================================================

  const openLoginModal = (emp: Employee) => {
    if (!emp.email) {
      alert('Mitarbeiter hat keine E-Mail-Adresse.');
      return;
    }
    
    // Pruefen ob E-Mail bereits registriert ist
    const existingUser = registeredEmails.get(emp.email.toLowerCase());
    
    if (existingUser) {
      // E-Mail ist bereits registriert -> Verknuepfungs-Modus
      setLoginMode('link');
      setExistingUserId(existingUser.id);
    } else {
      // Neuen Login erstellen
      setLoginMode('create');
      setExistingUserId(null);
    }
    
    setLoginEmployee(emp);
    setLoginPassword('');
    setLoginError(null);
    setShowLoginModal(true);
  };

  const closeLoginModal = () => {
    setShowLoginModal(false);
    setLoginEmployee(null);
    setLoginPassword('');
    setLoginError(null);
    setLoginMode('create');
    setExistingUserId(null);
  };

  // NEU: Bestehenden User mit Mitarbeiter verknuepfen
  const handleLinkExistingUser = async () => {
    if (!loginEmployee) return;
    
    setCreatingLogin(true);
    setLoginError(null);
    
    try {
      let userId = existingUserId;
      
      // Falls wir keine User-ID haben, versuchen wir es nochmal ueber signIn
      if (!userId && loginPassword) {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: loginEmployee.email!,
          password: loginPassword,
        });
        
        if (signInError) {
          setLoginError('Passwort ist falsch. Bitte korrektes Passwort eingeben um den Login zu verknuepfen.');
          return;
        }
        
        if (signInData?.user) {
          userId = signInData.user.id;
        }
      }
      
      if (!userId) {
        setLoginError('User-ID konnte nicht ermittelt werden. Bitte pruefen Sie das Passwort.');
        return;
      }
      
      // Pruefen ob v7_user_profiles existiert, wenn nicht erstellen
      const { data: existingProfile } = await supabase
        .from('v7_user_profiles')
        .select('id')
        .eq('id', userId)
        .maybeSingle();
      
      if (!existingProfile) {
        // Profil erstellen fuer V6-Altdaten
        await supabase.from('v7_user_profiles').insert({
          id: userId,
          email: loginEmployee.email!.toLowerCase(),
          display_name: loginEmployee.display_name,
          role: 'client_user',
          client_company_id: companyId,
          is_active: true,
        });
      }
      
      // Mitarbeiter mit bestehendem User verknuepfen
      const { error } = await supabase
        .from('v7_employees')
        .update({ 
          user_id: userId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', loginEmployee.id);
      
      if (error) throw error;
      
      closeLoginModal();
      await loadEmployees();
      alert(`Mitarbeiter ${loginEmployee.display_name} wurde mit dem bestehenden Login verknuepft.`);
      
    } catch (err: any) {
      console.error('Fehler beim Verknuepfen:', err);
      setLoginError(err.message || 'Ein Fehler ist aufgetreten.');
    } finally {
      setCreatingLogin(false);
    }
  };

  const handleCreateLogin = async () => {
    if (!loginEmployee || !loginEmployee.email) return;

    if (loginPassword.length < 6) {
      setLoginError('Passwort muss mindestens 6 Zeichen haben.');
      return;
    }

    setCreatingLogin(true);
    setLoginError(null);

    try {
      // Atomarer Server-Aufruf: Auth + Profil + Employee-Verknuepfung in einem Schritt
      const response = await fetch('/api/v7/create-employee-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: loginEmployee.id,
          email: loginEmployee.email,
          password: loginPassword,
          display_name: loginEmployee.display_name,
          first_name: loginEmployee.first_name || undefined,
          last_name: loginEmployee.last_name || undefined,
          client_company_id: companyId,
          portal_role: loginEmployee.portal_role || 'employee',
        }),
      });

      const result = await response.json();

      if (!result.success) {
        // E-Mail bereits registriert -> auf Verknuepfungs-Modus wechseln
        if (result.code === 'ALREADY_REGISTERED') {
          setLoginMode('link');
          setLoginError(
            'Diese E-Mail ist bereits registriert. ' +
            'Bitte "Verknuepfen" verwenden um den bestehenden Login mit diesem Mitarbeiter zu verbinden.'
          );
          // User-ID aus v7_user_profiles laden fuer den Verknuepfungs-Dialog
          const { data: existingProfile } = await supabase
            .from('v7_user_profiles')
            .select('id')
            .eq('email', loginEmployee.email.toLowerCase())
            .maybeSingle();
          if (existingProfile) {
            setExistingUserId(existingProfile.id);
          }
          return;
        }
        setLoginError(result.error || 'Ein Fehler ist aufgetreten.');
        return;
      }

      closeLoginModal();
      await loadEmployees();
      alert(
        `Login erstellt fuer ${loginEmployee.display_name}!\n\n` +
        `E-Mail: ${loginEmployee.email}\n` +
        `Passwort: ${loginPassword}`
      );

    } catch (err: any) {
      console.error('Fehler beim Login erstellen:', err);
      setLoginError(err.message || 'Ein Fehler ist aufgetreten.');
    } finally {
      setCreatingLogin(false);
    }
  };

  // ============================================================================
  // HILFSFUNKTIONEN
  // ============================================================================

  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('de-DE');
  };

  // Filter
  const filteredEmployees = employees.filter(e =>
    e.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (e.email && e.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (e.position_title && e.position_title.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const activeCount = employees.filter(e => isEmpActive(e)).length;
  const inactiveCount = employees.filter(e => !isEmpActive(e)).length;

  // ============================================================================
  // RENDER - LOADING
  // ============================================================================

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-gray-600"></div>
      </div>
    );
  }

  // ============================================================================
  // RENDER - HAUPT
  // ============================================================================

  // modalOnly-Modus: nichts rendern wenn Modal geschlossen
  if (modalOnly && !showModal) return null;

  return (
    <div className={modalOnly ? '' : 'space-y-6'}>
      {/* Header + Liste: nur wenn NICHT modalOnly */}
      {!modalOnly && (<>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-6 w-6 text-gray-600" />
            {title}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {activeCount} aktiv{inactiveCount > 0 && `, ${inactiveCount} inaktiv`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Suche */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 ${colors.focus} w-48`}
            />
          </div>

          {/* Inaktive anzeigen */}
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            Inaktive
          </label>

          {/* Neu-Button */}
          {canEdit && (
            <button
              onClick={openCreateModal}
              className={`flex items-center gap-2 px-4 py-2 text-white rounded-lg ${colors.button}`}
            >
              <Plus size={18} />
              Neu
            </button>
          )}
        </div>
      </div>

      {/* Tabelle */}
      {filteredEmployees.length === 0 ? (
        <div className="bg-white rounded-xl border p-8 text-center text-gray-500">
          {searchTerm ? 'Keine Mitarbeiter gefunden.' : 'Noch keine Mitarbeiter erfasst.'}
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Mitarbeiter</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Position</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Rolle</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Std./Woche</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                  {canEdit && (
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Aktionen</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredEmployees.map((emp) => (
                  <tr
                    key={emp.id}
                    className={`hover:bg-gray-50 ${!isEmpActive(emp) ? 'opacity-50' : ''} ${emp.is_orphan ? 'bg-amber-50' : ''}`}
                  >
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900 flex items-center gap-2">
                        {emp.display_name}
                        {emp.is_orphan && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-700">
                            (!) Nur Login
                          </span>
                        )}
                      </div>
                      {emp.email && (
                        <div className="text-sm text-gray-500">{emp.email}</div>
                      )}
                      {emp.is_orphan && (
                        <div className="text-xs text-amber-600 mt-0.5">
                          Login vorhanden, aber kein Mitarbeiter-Eintrag. Bitte Rolle und Position ergaenzen.
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      {emp.position_title || '-'}
                    </td>
                    <td className="px-6 py-4">
                      {emp.portal_role === 'client_admin' && (
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-700">
                          Admin
                        </span>
                      )}
                      {emp.portal_role === 'project_leader' && (
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                          Projektleiter
                        </span>
                      )}
                      {(!emp.portal_role || emp.portal_role === 'employee') && (
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
                          Mitarbeiter
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      {emp.weekly_hours ? `${emp.weekly_hours} h` : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        {isEmpActive(emp) ? (
                          <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                            Aktiv
                          </span>
                        ) : emp.is_active && emp.employment_end ? (
                          <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-700">
                            Ausgeschieden {formatDate(emp.employment_end)}
                          </span>
                        ) : (
                          <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-200 text-gray-600">
                            Inaktiv
                          </span>
                        )}
                        {/* NEU: Login-Status basierend auf has_login Flag */}
                        {emp.has_login ? (
                          <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                            Login
                          </span>
                        ) : emp.email ? (
                          <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-700">
                            Kein Login
                          </span>
                        ) : null}
                      </div>
                    </td>
                    {canEdit && (
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          {/* Login erstellen/verknuepfen - nur wenn noch nicht verknuepft und E-Mail vorhanden */}
                          {!emp.user_id && emp.email && isEmpActive(emp) && (
                            <button
                              onClick={() => openLoginModal(emp)}
                              className={`p-1.5 rounded ${
                                registeredEmails.has(emp.email.toLowerCase()) 
                                  ? 'text-blue-600 hover:text-blue-800' 
                                  : 'text-orange-600 hover:text-orange-800'
                              }`}
                              title={registeredEmails.has(emp.email.toLowerCase()) 
                                ? 'Login verknuepfen (bereits registriert)' 
                                : 'Login erstellen'
                              }
                            >
                              {registeredEmails.has(emp.email.toLowerCase()) 
                                ? <Link2 size={18} /> 
                                : <KeyRound size={18} />
                              }
                            </button>
                          )}
                          {/* Passwort zuruecksetzen - nur wenn MA bereits Login hat */}
                          {emp.user_id && isEmpActive(emp) && (
                            <button
                              onClick={() => openResetPwModal(emp)}
                              className="p-1.5 text-amber-600 hover:text-amber-800 rounded"
                              title="Passwort zuruecksetzen"
                            >
                              <KeyRound size={18} />
                            </button>
                          )}
                          <button
                            onClick={() => openEditModal(emp)}
                            className={`p-1.5 ${colors.text} ${colors.hover} rounded`}
                            title="Bearbeiten"
                          >
                            <Pencil size={18} />
                          </button>
                          {emp.is_active ? (
                            <button
                              onClick={() => confirmDelete(emp)}
                              className="p-1.5 text-red-600 hover:text-red-900 rounded"
                              title="Deaktivieren"
                            >
                              <UserX size={18} />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleReactivate(emp)}
                              className="p-1.5 text-blue-600 hover:text-blue-900 rounded"
                              title="Reaktivieren"
                            >
                              <RefreshCw size={18} />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Anzahl */}
      <div className="text-sm text-gray-500">
        {filteredEmployees.length} {filteredEmployees.length === 1 ? 'Mitarbeiter' : 'Mitarbeiter'}
      </div>
      </>)}

      {/* ================================================================ */}
      {/* MODAL: Mitarbeiter erstellen/bearbeiten */}
      {/* ================================================================ */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center px-6 py-4 border-b sticky top-0 bg-white">
              <h3 className="text-lg font-semibold text-gray-900">
                {modalMode === 'create'
                  ? (firmaName ? `Neuer Mitarbeiter fuer ${firmaName}` : 'Neuer Mitarbeiter')
                  : 'Mitarbeiter bearbeiten'}
              </h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <div className="px-6 py-4 space-y-6">
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {formError}
                </div>
              )}

              {/* Name */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nachname</label>
                  <input
                    type="text"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 ${colors.focus}`}
                    placeholder="z.B. Mueller"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vorname</label>
                  <input
                    type="text"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 ${colors.focus}`}
                    placeholder="z.B. Max"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Anzeigename <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="display_name"
                  value={formData.display_name}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 ${colors.focus}`}
                  placeholder="z.B. Mueller, Max"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Wird automatisch aus Vor- und Nachname erzeugt, kann aber angepasst werden.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-Mail</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 ${colors.focus}`}
                  placeholder="z.B. max.mueller@firma.de"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Erforderlich fuer Portal-Login.
                </p>
              </div>

              {/* E-Mail bestaetigen (nur Neuanlage, Tippfehler-Schutz) - v7.3.95-18 */}
              {modalMode === 'create' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">E-Mail bestaetigen</label>
                  <input
                    type="email"
                    value={emailConfirm}
                    onChange={(e) => setEmailConfirm(e.target.value)}
                    onPaste={(e) => e.preventDefault()}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 ${
                      emailConfirm.trim() && formData.email.trim().toLowerCase() !== emailConfirm.trim().toLowerCase()
                        ? 'border-red-400 focus:ring-red-200'
                        : `border-gray-300 ${colors.focus}`
                    }`}
                    placeholder="E-Mail zur Sicherheit erneut eingeben"
                  />
                  {emailConfirm.trim() && formData.email.trim().toLowerCase() !== emailConfirm.trim().toLowerCase() && (
                    <p className="text-xs text-red-600 mt-1">E-Mail-Adressen stimmen nicht ueberein.</p>
                  )}
                </div>
              )}

              {/* Portal-Rolle */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Portal-Rolle</label>
                <div className="space-y-2">
                  {PORTAL_ROLE_OPTIONS.map(opt => (
                    <label
                      key={opt.value}
                      className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                        formData.portal_role === opt.value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="portal_role"
                        value={opt.value}
                        checked={formData.portal_role === opt.value}
                        onChange={handleInputChange}
                        className="mt-0.5"
                      />
                      <div>
                        <div className="font-medium text-gray-900">{opt.label}</div>
                        <div className="text-sm text-gray-500">{opt.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Weitere Felder */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Position/Funktion</label>
                  {/* v7.3.95-8: Phase 1 - Dropdown mit Sonstige-Fallback */}
                  {(() => {
                    // Ableitung: Welchen Dropdown-Wert anzeigen?
                    // - Leerer aktuellerWert + sonstigeAktiv=false -> "-- Bitte waehlen --"
                    // - Leerer aktuellerWert + sonstigeAktiv=true  -> "Sonstige" + leeres Freitext
                    // - Standardrolle aus POSITION_OPTIONS         -> direkt anzeigen
                    // - Freitext-Alt-Wert (nicht in Liste)         -> "Sonstige" + Freitext mit Alt-Wert
                    const aktuellerWert = formData.position_title || '';
                    const istStandardRolle =
                      aktuellerWert !== '' &&
                      POSITION_OPTIONS.includes(aktuellerWert as (typeof POSITION_OPTIONS)[number]) &&
                      aktuellerWert !== 'Sonstige';
                    let dropdownValue: string;
                    if (istStandardRolle) {
                      dropdownValue = aktuellerWert;
                    } else if (aktuellerWert !== '' || sonstigeAktiv) {
                      dropdownValue = 'Sonstige';
                    } else {
                      dropdownValue = '';
                    }
                    const zeigeFreitext = dropdownValue === 'Sonstige';
                    const istGF = GF_POSITIONS.includes(aktuellerWert);

                    const handleDropdownChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
                      const neu = e.target.value;
                      if (neu === 'Sonstige') {
                        setSonstigeAktiv(true);
                        setFormData(prev => ({ ...prev, position_title: '' }));
                      } else {
                        setSonstigeAktiv(false);
                        setFormData(prev => ({ ...prev, position_title: neu }));
                      }
                    };

                    const handleFreitextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
                      setFormData(prev => ({ ...prev, position_title: e.target.value }));
                    };

                    return (
                      <>
                        <select
                          value={dropdownValue}
                          onChange={handleDropdownChange}
                          className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 ${colors.focus}`}
                        >
                          <option value="">-- Bitte waehlen --</option>
                          {POSITION_OPTIONS.map(p => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                        {zeigeFreitext && (
                          <input
                            type="text"
                            value={aktuellerWert}
                            onChange={handleFreitextChange}
                            placeholder="Bitte eigene Bezeichnung eintragen"
                            className={`mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 ${colors.focus}`}
                          />
                        )}
                        {istGF && (
                          <div className="mt-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-900">
                            Bei Geschaeftsfuehrern gilt die 50%-Regel fuer Projektzeit (ZIM-Richtlinie).
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Qualifikation</label>
                  <select
                    name="qualification"
                    value={formData.qualification}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 ${colors.focus}`}
                  >
                    <option value="">-- Bitte waehlen --</option>
                    {QUALIFICATION_OPTIONS.map(q => (
                      <option key={q} value={q}>{q}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Wochenstunden und Beschaeftigt seit/bis */}
              {/* v7.3.95-9: Phase 2 - Im Create-Modus weiterhin einfaches Feld.
                  Im Edit-Modus wird das Feld zum Historie-Block (aktueller Wert +
                  aufklappbare Historie + "Neuer Eintrag"). */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Wochenstunden (pWAZ) <span className="text-red-500">*</span>
                  </label>
                  {modalMode === 'create' ? (
                    <>
                      <input
                        type="number"
                        name="weekly_hours"
                        value={formData.weekly_hours}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 ${colors.focus}`}
                        min="0"
                        max="60"
                        step="0.5"
                      />
                      <p className="text-xs text-gray-500 mt-1">Persoenliche Wochenarbeitszeit lt. Vertrag</p>
                    </>
                  ) : (
                    (() => {
                      const current = getCurrentHistoryEntry();
                      const nextFuture = getNextFutureEntry();
                      return (
                        <div className="border border-gray-300 rounded-lg bg-gray-50">
                          <div className="flex items-center justify-between px-3 py-2">
                            <div className="text-sm text-gray-900">
                              {historyLoading ? (
                                <span className="text-gray-500">Laden...</span>
                              ) : current ? (
                                <>
                                  <strong>
                                    {current.days_per_week != null && current.hours_per_day != null
                                      ? `${current.days_per_week}T x ${String(current.hours_per_day).replace('.', ',')}h = ${current.weekly_hours} h/Woche`
                                      : `${current.weekly_hours} h/Woche`}
                                  </strong>
                                  <span className="text-gray-500 ml-2">
                                    (seit {formatDateDE(current.gueltig_ab)})
                                  </span>
                                  {nextFuture && (
                                    <div className="text-xs text-amber-700 mt-0.5">
                                      Ab {formatDateDE(nextFuture.gueltig_ab)}: {nextFuture.weekly_hours} h/Woche
                                    </div>
                                  )}
                                </>
                              ) : nextFuture ? (
                                <>
                                  <span className="text-gray-500">Noch nicht aktiv.</span>
                                  <div className="text-xs text-gray-700 mt-0.5">
                                    Ab {formatDateDE(nextFuture.gueltig_ab)}: {nextFuture.weekly_hours} h/Woche
                                  </div>
                                </>
                              ) : (
                                <span className="text-gray-500">
                                  Keine Historie vorhanden (Alt-Feld: {formData.weekly_hours} h)
                                </span>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => setHistoryExpanded(e => !e)}
                              className="text-xs text-gray-600 hover:text-gray-900 flex items-center gap-1"
                            >
                              Historie
                              {historyExpanded
                                ? <ChevronUp size={14} />
                                : <ChevronDown size={14} />}
                            </button>
                          </div>
                          {historyExpanded && (
                            <div className="border-t border-gray-200 bg-white px-3 py-2">
                              {hoursHistory.length === 0 ? (
                                <p className="text-xs text-gray-500 py-2">
                                  Keine Eintraege.
                                </p>
                              ) : (
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="text-gray-600 border-b">
                                      <th className="text-left py-1 pr-2 font-semibold w-24">Gueltig ab</th>
                                      <th className="text-right py-1 pr-2 font-semibold w-12">T/Wo.</th>
                                      <th className="text-right py-1 pr-2 font-semibold w-12">h/Tag</th>
                                      <th className="text-right py-1 pr-4 font-semibold w-16">h/Wo.</th>
                                      <th className="text-left py-1 font-semibold">Notiz</th>
                                      <th className="w-8"></th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {hoursHistory.map(h => (
                                      <tr key={h.id} className="border-b last:border-b-0">
                                        <td className="py-1 pr-2">{formatDateDE(h.gueltig_ab)}</td>
                                        <td className="py-1 pr-2 text-right tabular-nums">
                                          {h.days_per_week ?? '-'}
                                        </td>
                                        <td className="py-1 pr-2 text-right tabular-nums">
                                          {h.hours_per_day != null ? h.hours_per_day.toString().replace('.', ',') : '-'}
                                        </td>
                                        <td className="py-1 pr-4 text-right tabular-nums font-medium">{h.weekly_hours}</td>
                                        <td className="py-1 text-gray-600">
                                          {isAutoNotiz(h.notiz) ? '-' : (h.notiz || '-')}
                                        </td>
                                        <td className="py-1 text-right">
                                          {canEdit && hoursHistory.length > 1 && (
                                            <button
                                              type="button"
                                              onClick={() => handleDeleteHistoryEntry(h)}
                                              className="text-red-600 hover:text-red-800"
                                              title="Eintrag loeschen"
                                            >
                                              <Trash2 size={14} />
                                            </button>
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}
                              {canEdit && (
                                <button
                                  type="button"
                                  onClick={openHistoryModal}
                                  className={`mt-2 text-xs ${colors.text} ${colors.hover} flex items-center gap-1`}
                                >
                                  <Plus size={14} />
                                  Neuen Eintrag hinzufuegen
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })()
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Beschaeftigt seit</label>
                  <input
                    type="date"
                    name="employment_start"
                    value={formData.employment_start}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 ${colors.focus}`}
                  />
                </div>
              </div>

              {/* Beschaeftigt bis */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Beschaeftigt bis</label>
                <input
                  type="date"
                  name="employment_end"
                  value={formData.employment_end}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 ${colors.focus}`}
                />
                <p className="text-xs text-gray-500 mt-1">Leer lassen wenn noch beschaeftigt</p>
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Abbrechen
              </button>
              <button
                onClick={handleSave}
                disabled={
                  saving ||
                  (modalMode === 'create' && !!formData.email.trim() &&
                    formData.email.trim().toLowerCase() !== emailConfirm.trim().toLowerCase())
                }
                className={`px-4 py-2 text-white rounded-lg disabled:opacity-50 flex items-center gap-2 ${colors.button}`}
              >
                {saving && <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>}
                <Save size={18} />
                {modalMode === 'create' ? 'Anlegen' : 'Speichern'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* MODAL: Deaktivieren bestaetigen */}
      {/* ================================================================ */}
      {showDeleteConfirm && employeeToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <UserX className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Mitarbeiter deaktivieren?</h3>
                  <p className="text-gray-500 mt-1">
                    Moechten Sie <strong>{employeeToDelete.display_name}</strong> wirklich deaktivieren?
                  </p>
                  <p className="text-sm text-gray-400 mt-2">
                    Der Mitarbeiter wird nicht geloescht und kann spaeter reaktiviert werden.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
              <button
                onClick={() => { setShowDeleteConfirm(false); setEmployeeToDelete(null); }}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Abbrechen
              </button>
              <button
                onClick={handleDelete}
                disabled={saving}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                Deaktivieren
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* MODAL: Login erstellen / verknuepfen */}
      {/* ================================================================ */}
      {showLoginModal && loginEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="flex justify-between items-center px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                {loginMode === 'link' ? 'Login verknuepfen' : 'Login erstellen'}
              </h3>
              <button onClick={closeLoginModal} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              {loginError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {loginError}
                </div>
              )}

              {/* Modus: Verknuepfen (bereits registriert) */}
              {loginMode === 'link' ? (
                <>
                  <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg text-sm">
                    <strong>Bereits registriert:</strong> Diese E-Mail-Adresse hat bereits einen Login. 
                    Klicken Sie auf &quot;Verknuepfen&quot; um den bestehenden Login mit diesem Mitarbeiter zu verbinden.
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mitarbeiter</label>
                    <div className="px-3 py-2 bg-gray-100 rounded-lg text-gray-700">
                      {loginEmployee.display_name}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">E-Mail</label>
                    <div className="px-3 py-2 bg-gray-100 rounded-lg text-gray-700">
                      {loginEmployee.email}
                    </div>
                  </div>

                  {!existingUserId && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Passwort des bestehenden Logins <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 ${colors.focus}`}
                        placeholder="Bestehendes Passwort eingeben"
                        autoComplete="new-password"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Das Passwort wird benoetigt um die Verknuepfung herzustellen.
                      </p>
                    </div>
                  )}

                  {existingUserId && (
                    <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
                      <Check size={18} className="mt-0.5 shrink-0" />
                      <div>
                        Der Mitarbeiter kann sich mit seinen bestehenden Zugangsdaten einloggen.
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* Modus: Neuen Login erstellen */}
                  <div className="bg-orange-50 border border-orange-200 text-orange-800 px-4 py-3 rounded-lg text-sm">
                    <strong>Test-Modus:</strong> Es wird keine E-Mail versendet. 
                    Der Mitarbeiter kann sich direkt mit diesen Zugangsdaten einloggen.
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mitarbeiter</label>
                    <div className="px-3 py-2 bg-gray-100 rounded-lg text-gray-700">
                      {loginEmployee.display_name}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">E-Mail</label>
                    <div className="px-3 py-2 bg-gray-100 rounded-lg text-gray-700">
                      {loginEmployee.email}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Portal-Rolle</label>
                    <div className="px-3 py-2 bg-gray-100 rounded-lg">
                      {loginEmployee.portal_role === 'client_admin' && (
                        <span className="text-purple-700">Administrator</span>
                      )}
                      {loginEmployee.portal_role === 'project_leader' && (
                        <span className="text-blue-700">Projektleiter</span>
                      )}
                      {(!loginEmployee.portal_role || loginEmployee.portal_role === 'employee') && (
                        <span className="text-gray-700">Mitarbeiter</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Passwort <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 ${colors.focus}`}
                      placeholder="Mind. 6 Zeichen"
                      autoComplete="new-password"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Dieses Passwort muss dem Mitarbeiter mitgeteilt werden.
                    </p>
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
              <button
                onClick={closeLoginModal}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Abbrechen
              </button>
              
              {loginMode === 'link' ? (
                <button
                  onClick={handleLinkExistingUser}
                  disabled={creatingLogin}
                  className={`px-4 py-2 text-white rounded-lg disabled:opacity-50 flex items-center gap-2 bg-blue-600 hover:bg-blue-700`}
                >
                  {creatingLogin ? 'Verknuepfe...' : (
                    <>
                      <Link2 size={18} />
                      Verknuepfen
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={handleCreateLogin}
                  disabled={creatingLogin || !loginPassword}
                  className={`px-4 py-2 text-white rounded-lg disabled:opacity-50 ${colors.button}`}
                >
                  {creatingLogin ? 'Erstelle...' : 'Login erstellen'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {/* ================================================================ */}
      {/* MODAL: Passwort zuruecksetzen */}
      {/* ================================================================ */}
      {showResetPwModal && resetPwEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="flex justify-between items-center px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Passwort zuruecksetzen</h3>
              <button onClick={() => setShowResetPwModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              {resetPwSuccess ? (
                <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg p-4 text-green-700">
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <div className="font-medium">Passwort erfolgreich zurueckgesetzt!</div>
                    <div className="text-sm mt-1">Das neue Passwort wurde gesetzt. Bitte teile es dem Mitarbeiter mit.</div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
                    Passwort fuer <span className="font-medium">{resetPwEmployee.display_name}</span> zuruecksetzen.
                    Das neue Passwort muss dem Mitarbeiter mitgeteilt werden.
                  </div>
                  {resetPwError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                      {resetPwError}
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Neues Passwort <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={resetPwPassword}
                      onChange={e => setResetPwPassword(e.target.value)}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 ${colors.focus}`}
                      placeholder="Mind. 6 Zeichen"
                      autoComplete="new-password"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Empfehlung: Mindestens 8 Zeichen mit Gross-/Kleinbuchstaben und Zahlen.
                    </p>
                  </div>
                </>
              )}
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
              <button
                onClick={() => setShowResetPwModal(false)}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {resetPwSuccess ? 'Schliessen' : 'Abbrechen'}
              </button>
              {!resetPwSuccess && (
                <button
                  onClick={handleResetPw}
                  disabled={resettingPw || !resetPwPassword || resetPwPassword.length < 6}
                  className={`px-4 py-2 text-white rounded-lg disabled:opacity-50 ${colors.button}`}
                >
                  {resettingPw ? 'Setze zurueck...' : 'Passwort setzen'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* MODAL: Neuer History-Eintrag (v7.3.95-9, Phase 2)             */}
      {/* ================================================================ */}
      {showHistoryModal && editingEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="flex justify-between items-center px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                Wochenstunden-Eintrag hinzufuegen
              </h3>
              <button onClick={closeHistoryModal} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              {historyError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {historyError}
                </div>
              )}
              {historyWarning && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg text-sm">
                  {historyWarning}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gueltig ab <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={historyForm.gueltig_ab}
                  onChange={e => {
                    setHistoryForm(p => ({ ...p, gueltig_ab: e.target.value }));
                    setHistoryError(null);
                    setHistoryWarning(null);
                  }}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 ${colors.focus}`}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Empfohlen: 1. eines Monats.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tage/Woche <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={historyForm.days_per_week}
                    onChange={e => {
                      setHistoryForm(p => ({ ...p, days_per_week: e.target.value }));
                      setHistoryError(null);
                    }}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 ${colors.focus}`}
                    min="1" max="7" step="1"
                    placeholder="5"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stunden/Tag <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={historyForm.hours_per_day}
                    onChange={e => {
                      setHistoryForm(p => ({ ...p, hours_per_day: e.target.value }));
                      setHistoryError(null);
                    }}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 ${colors.focus}`}
                    min="0.5" max="24" step="0.5"
                    placeholder="8"
                  />
                </div>
              </div>
              {/* Berechnete Wochenstunden als Info */}
              {(() => {
                const t = parseInt(historyForm.days_per_week);
                const h = parseFloat(historyForm.hours_per_day.replace(',', '.'));
                const w = !isNaN(t) && !isNaN(h) ? t * h : null;
                return w !== null ? (
                  <div className="text-sm text-gray-600 bg-gray-50 rounded px-3 py-2">
                    = <strong>{w.toFixed(2).replace('.', ',')} h/Woche</strong>
                    {' '}(Teilzeitfaktor: {(w / 40 * 100).toFixed(0)}%)
                  </div>
                ) : null;
              })()}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notiz (optional)
                </label>
                <input
                  type="text"
                  value={historyForm.notiz}
                  onChange={e => setHistoryForm(p => ({ ...p, notiz: e.target.value }))}
                  placeholder="z.B. Elternzeit, Wechsel auf Teilzeit"
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 ${colors.focus}`}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
              <button
                onClick={closeHistoryModal}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Abbrechen
              </button>
              <button
                onClick={() => handleSaveHistoryEntry(!!historyWarning)}
                disabled={historySaving}
                className={`px-4 py-2 text-white rounded-lg disabled:opacity-50 flex items-center gap-2 ${colors.button}`}
              >
                {historySaving && (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                )}
                <Save size={18} />
                {historyWarning ? 'Trotzdem speichern' : 'Speichern'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
