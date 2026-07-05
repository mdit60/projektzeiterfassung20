'use client';

// src/components/shared/MitarbeiterModal.tsx
// ============================================================================
// SHARED COMPONENT: MitarbeiterModal
// Version: 1.0.3-3
// v1.0.3-3: NEU: Optionales Feld "Benutzername" im "Login erstellen"-Bereich
//   (nur wenn noch kein Login vorhanden ist). Wird an
//   /api/v7/create-employee-login uebergeben. HINWEIS: Analoge Ergaenzung
//   gehoert auch in EmployeeManagement (siehe REGEL zu parallelen
//   Login-Dialog-Aenderungen) - dort ebenfalls nachgezogen.
// v1.0.3-2: GF-Erkennung + Position-Dropdown an v7-types 7.4.9-2 angeglichen.
//   - Dropdown zeigt GF-Rollen jetzt mit echten Umlauten (POSITION_OPTIONS).
//   - GF-Warnhinweis erscheint jetzt tolerant (Umlaut/ASCII + weibliche Form)
//     via istGeschaeftsfuehrerTitle().
//   - Beim Bearbeiten wird ein gespeicherter position_title ueber
//     canonicalPositionTitle() auf den Umlaut-Dropdown-Wert abgebildet; nicht
//     abbildbare Werte (z.B. "Geschaeftsfuehrerin") bleiben als Freitext
//     erhalten. Bestandsdaten muessen NICHT korrigiert werden.
//   - Hinweistext der GF-Warnung in korrektem Deutsch (echte Umlaute).
// v1.0.3: Login-Erstellung im Cockpit ergaenzt. Im Passwort-Modus zeigt das
//   Modal bei MA OHNE Portal-Login (keine user_id) statt der Sackgassen-Meldung
//   ein "Login erstellen"-Formular (E-Mail + Portal-Rolle read-only, Passwort).
//   Ruft die bestehende atomare Route /api/v7/create-employee-login auf.
//   Fall ALREADY_REGISTERED wird abgefangen und als Hinweis angezeigt
//   (Verknuepfen erfolgt weiterhin ueber Firmendaten > Mitarbeiter).
//   So macht das Schluessel-Icon im Cockpit automatisch das Richtige:
//   kein Login -> anlegen, Login vorhanden -> Passwort zuruecksetzen.
// v1.0.2: E-Mail-Bestaetigungsfeld bei Neuanlage (Schutz gegen Tippfehler).
//   Zweites Feld "E-Mail bestaetigen" nur in mode='new'. Live-Hinweis bei
//   Abweichung (kleingeschrieben+getrimmt), "Anlegen" gesperrt bis identisch,
//   harte Pruefung in handleSave.
// v1.0.1: Gehaltsfelder ergaenzt (Anlage 6.1 Stundensatzberechnung)
//   monthly_salary, annual_bonus, company_weekly_hours, hourly_rate
//   Live-Berechnung: Jahresbrutto, Jahresarbeitsstd., Teilzeitfaktor, Stundensatz
// Leichtgewichtiges Modal fuer MA-Verwaltung direkt im Cockpit.
// Ersetzt EmployeeManagement-Abhaengigkeit im FirmaCockpit.
// Modi: 'new' (Anlegen), 'edit' (Bearbeiten), 'password' (PW-Reset)
// ============================================================================

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { X, Save, KeyRound, AlertCircle } from 'lucide-react';
import {
  POSITION_OPTIONS,
  canonicalPositionTitle,
  istGeschaeftsfuehrerTitle,
} from '@/types/v7-types';

// ============================================================================
// KONSTANTEN
// ============================================================================

const QUALIFICATION_OPTIONS = [
  'keine Ausbildung',
  'Student',
  'Berufsausbildung',
  'Meister/Techniker',
  'Bachelor',
  'Master/Diplom',
  'Promotion',
];

const PORTAL_ROLES = [
  { value: 'employee', label: 'Mitarbeiter', description: 'Kann nur eigene Zeiterfassung sehen' },
  { value: 'project_leader', label: 'Projektkoordinator', description: 'Kann zugeordnete Projekte und deren MA sehen' },
  { value: 'client_admin', label: 'Administrator', description: 'Voller Zugriff auf alle Firmendaten' },
];

interface EmployeeFormData {
  first_name: string;
  last_name: string;
  display_name: string;
  email: string;
  portal_role: string;
  position_title: string;
  qualification: string;
  weekly_hours: string;
  company_weekly_hours: string;
  monthly_salary: string;
  annual_bonus: string;
  employment_start: string;
  employment_end: string;
}

const EMPTY_FORM: EmployeeFormData = {
  first_name: '',
  last_name: '',
  display_name: '',
  email: '',
  portal_role: 'employee',
  position_title: '',
  qualification: '',
  weekly_hours: '40',
  company_weekly_hours: '40',
  monthly_salary: '',
  annual_bonus: '0',
  employment_start: '',
  employment_end: '',
};

// ============================================================================
// PROPS
// ============================================================================

interface MitarbeiterModalProps {
  mode: 'new' | 'edit' | 'password';
  firmaId: string;
  firmaName: string;
  employeeId?: string;
  onClose: () => void;
  onSaved: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function MitarbeiterModal({
  mode,
  firmaId,
  firmaName,
  employeeId,
  onClose,
  onSaved,
}: MitarbeiterModalProps) {
  const [form, setForm] = useState<EmployeeFormData>(EMPTY_FORM);
  const [emailConfirm, setEmailConfirm] = useState('');
  const [sonstigeAktiv, setSonstigeAktiv] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Passwort-Reset State
  const [newPassword, setNewPassword] = useState('');
  const [newUsername, setNewUsername] = useState(''); // v1.0.3-3
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState(false);
  const [empUserId, setEmpUserId] = useState<string | null>(null);
  const [empName, setEmpName] = useState('');

  // Login-Erstellung (v1.0.3) - Daten des MA aus loadEmployee
  const [empEmail, setEmpEmail] = useState('');
  const [empPortalRole, setEmpPortalRole] = useState('employee');
  const [empFirstName, setEmpFirstName] = useState('');
  const [empLastName, setEmpLastName] = useState('');
  const [creatingLogin, setCreatingLogin] = useState(false);

  // ========================================================================
  // DATEN LADEN (Edit + Password Mode)
  // ========================================================================

  useEffect(() => {
    if ((mode === 'edit' || mode === 'password') && employeeId) {
      loadEmployee(employeeId);
    }
  }, [mode, employeeId]);

  async function loadEmployee(empId: string) {
    const supabase = createClient();
    const { data, error: err } = await supabase
      .from('v7_employees')
      .select('*')
      .eq('id', empId)
      .single();

    if (err || !data) {
      setError('Mitarbeiter konnte nicht geladen werden.');
      return;
    }

    setEmpName(data.display_name || '');
    setEmpUserId(data.user_id || null);
    // v1.0.3: Daten fuer Login-Erstellung im Passwort-Modus mitnehmen
    setEmpEmail(data.email || '');
    setEmpPortalRole(data.portal_role || 'employee');
    setEmpFirstName(data.first_name || '');
    setEmpLastName(data.last_name || '');

    if (mode === 'edit') {
      // v1.0.3-2: gespeicherten Wert auf kanonischen Umlaut-Dropdown-Wert
      // abbilden (Umlaut/ASCII toleriert). Passt er zu keiner Standardrolle
      // (z.B. weibliche Form), bleibt er als Freitext ("Sonstige").
      const kanonisch = canonicalPositionTitle(data.position_title);
      const isSonstige = !!data.position_title
        && !POSITION_OPTIONS.includes(kanonisch as any);
      setSonstigeAktiv(isSonstige);

      setForm({
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        display_name: data.display_name || '',
        email: data.email || '',
        portal_role: data.portal_role || 'employee',
        position_title: kanonisch,
        qualification: data.qualification || '',
        weekly_hours: data.weekly_hours != null ? String(data.weekly_hours) : '40',
        company_weekly_hours: data.company_weekly_hours != null ? String(data.company_weekly_hours) : '40',
        monthly_salary: data.monthly_salary != null ? String(data.monthly_salary).replace('.', ',') : '',
        annual_bonus: data.annual_bonus != null ? String(data.annual_bonus).replace('.', ',') : '0',
        employment_start: data.employment_start || '',
        employment_end: data.employment_end || '',
      });
    }
  }

  // ========================================================================
  // FORM HANDLING
  // ========================================================================

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setForm(prev => {
      const updated = { ...prev, [name]: value };

      // Auto-Anzeigename
      if (name === 'first_name' || name === 'last_name') {
        const ln = name === 'last_name' ? value : prev.last_name;
        const fn = name === 'first_name' ? value : prev.first_name;
        if (ln || fn) {
          updated.display_name = ln && fn ? ln + ', ' + fn : (ln || fn);
        }
      }

      return updated;
    });

    // Position Sonstige
    if (name === 'position_title') {
      if (value === 'Sonstige') {
        setSonstigeAktiv(true);
        setForm(prev => ({ ...prev, position_title: '' }));
      } else {
        setSonstigeAktiv(false);
      }
    }
  }

  function handleRoleChange(role: string) {
    setForm(prev => ({ ...prev, portal_role: role }));
  }

  // ========================================================================
  // SPEICHERN
  // ========================================================================

  async function handleSave() {
    setError(null);

    if (!form.display_name.trim()) {
      setError('Anzeigename ist erforderlich.');
      return;
    }

    // v1.0.2: Bei Neuanlage E-Mail-Bestaetigung pruefen (Tippfehler-Schutz)
    if (mode === 'new' && form.email.trim()) {
      if (form.email.trim().toLowerCase() !== emailConfirm.trim().toLowerCase()) {
        setError('Die E-Mail-Adressen stimmen nicht ueberein. Bitte pruefen.');
        return;
      }
    }

    const weeklyHours = parseFloat(form.weekly_hours.replace(',', '.'));
    if (isNaN(weeklyHours) || weeklyHours <= 0) {
      setError('Bitte gueltige Wochenstunden eingeben.');
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const payload: Record<string, any> = {
      display_name: form.display_name.trim(),
      first_name: form.first_name.trim() || null,
      last_name: form.last_name.trim() || null,
      email: form.email.trim() || null,
      portal_role: form.portal_role,
      position_title: form.position_title.trim() || null,
      qualification: form.qualification || null,
      weekly_hours: weeklyHours,
      company_weekly_hours: parseFloat(form.company_weekly_hours.replace(',', '.')) || 40,
      monthly_salary: form.monthly_salary ? parseFloat(form.monthly_salary.replace(',', '.')) : null,
      annual_bonus: form.annual_bonus ? parseFloat(form.annual_bonus.replace(',', '.')) : 0,
      employment_start: form.employment_start || null,
      employment_end: form.employment_end || null,
    };

    // Stundensatz berechnen wenn Gehaltsdaten vorhanden
    if (payload.monthly_salary && weeklyHours > 0) {
      const jahresbrutto = payload.monthly_salary * 12 + (payload.annual_bonus || 0);
      const jahresstunden = weeklyHours * 52;
      payload.hourly_rate = Math.round((jahresbrutto / jahresstunden) * 100) / 100;
    } else {
      payload.hourly_rate = null;
    }

    try {
      if (mode === 'new') {
        payload.client_company_id = firmaId;
        payload.is_active = true;
        const { error: insertErr } = await supabase
          .from('v7_employees')
          .insert(payload);
        if (insertErr) throw insertErr;
      } else if (mode === 'edit' && employeeId) {
        const { error: updateErr } = await supabase
          .from('v7_employees')
          .update(payload)
          .eq('id', employeeId);
        if (updateErr) throw updateErr;
      }

      setSuccess(true);
      setTimeout(() => {
        onSaved();
        onClose();
      }, 500);
    } catch (err: any) {
      setError(err.message || 'Fehler beim Speichern.');
    } finally {
      setLoading(false);
    }
  }

  // ========================================================================
  // PASSWORT RESET
  // ========================================================================

  async function handlePasswordReset() {
    setPwError(null);
    if (!newPassword || newPassword.length < 6) {
      setPwError('Passwort muss mindestens 6 Zeichen lang sein.');
      return;
    }
    if (!empUserId) {
      setPwError('Kein Login vorhanden. Bitte zuerst Login erstellen (Mitarbeiterverwaltung).');
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Nicht angemeldet');

      const response = await fetch('/api/v7/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + session.access_token,
        },
        body: JSON.stringify({
          userId: empUserId,
          newPassword: newPassword,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Fehler beim Zuruecksetzen');
      }

      setPwSuccess(true);
      setTimeout(() => onClose(), 1500);
    } catch (err: any) {
      setPwError(err.message || 'Fehler beim Passwort-Reset.');
    } finally {
      setLoading(false);
    }
  }

  // ========================================================================
  // LOGIN ERSTELLEN (v1.0.3)
  // ========================================================================
  // Ruft die atomare Route /api/v7/create-employee-login auf. Diese erstellt
  // Auth-User + Profil + Verknuepfung in einem Schritt (oder rollt zurueck).

  async function handleCreateLogin() {
    setPwError(null);

    if (!empEmail) {
      setPwError('Fuer den Login wird eine E-Mail-Adresse benoetigt. Bitte zuerst ueber "Bearbeiten" eine E-Mail eintragen.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setPwError('Passwort muss mindestens 6 Zeichen lang sein.');
      return;
    }
    if (!employeeId) {
      setPwError('Mitarbeiter-ID fehlt.');
      return;
    }

    setCreatingLogin(true);
    try {
      const response = await fetch('/api/v7/create-employee-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: employeeId,
          email: empEmail,
          password: newPassword,
          display_name: empName,
          first_name: empFirstName || undefined,
          last_name: empLastName || undefined,
          client_company_id: firmaId,
          portal_role: empPortalRole || 'employee',
          username: newUsername.trim() || undefined, // v1.0.3-3
        }),
      });

      const result = await response.json();

      if (!result.success) {
        if (result.code === 'ALREADY_REGISTERED') {
          setPwError(
            'Diese E-Mail ist bereits registriert. Den bestehenden Login bitte ueber ' +
            'Firmendaten > Mitarbeiter mit diesem Mitarbeiter verknuepfen.'
          );
        } else {
          setPwError(result.error || 'Login konnte nicht erstellt werden.');
        }
        return;
      }

      setPwSuccess(true);
      setTimeout(() => {
        onSaved();
        onClose();
      }, 1500);
    } catch (err: any) {
      setPwError(err.message || 'Fehler beim Erstellen des Logins.');
    } finally {
      setCreatingLogin(false);
    }
  }

  // ========================================================================
  // GF-WARNUNG
  // ========================================================================

  // v1.0.3-2: tolerant (Umlaut/ASCII + weibliche Form)
  const isGF = istGeschaeftsfuehrerTitle(form.position_title);

  // ========================================================================
  // RENDER
  // ========================================================================

  const title = mode === 'new'
    ? 'Neuer Mitarbeiter fuer ' + firmaName
    : mode === 'edit'
      ? 'Mitarbeiter bearbeiten'
      : empUserId
        ? 'Passwort zuruecksetzen'
        : 'Login erstellen';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-y-auto"
        style={{ maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{title}</h2>
            {mode === 'edit' && <p className="text-sm text-gray-500">{form.display_name}</p>}
            {mode === 'password' && <p className="text-sm text-gray-500">{empName}</p>}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 p-1">
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">

          {/* ============================================================ */}
          {/* PASSWORT-MODUS                                               */}
          {/* ============================================================ */}
          {mode === 'password' && (
            <>
              {!empUserId && (
                <>
                  {/* v1.0.3: Kein Login vorhanden -> Login erstellen statt Sackgasse */}
                  {!empEmail ? (
                    <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                      <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                      Fuer einen Portal-Login wird eine E-Mail-Adresse benoetigt. Bitte zuerst ueber &quot;Bearbeiten&quot; eine E-Mail hinterlegen.
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                        <KeyRound size={16} className="mt-0.5 flex-shrink-0" />
                        Dieser Mitarbeiter hat noch keinen Portal-Login. Lege hier ein Passwort fest, um den Login zu erstellen.
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Mitarbeiter</label>
                        <div className="px-3 py-2 bg-gray-100 rounded-lg text-sm text-gray-700">{empName}</div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">E-Mail</label>
                        <div className="px-3 py-2 bg-gray-100 rounded-lg text-sm text-gray-700">{empEmail}</div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Portal-Rolle</label>
                        <div className="px-3 py-2 bg-gray-100 rounded-lg text-sm text-gray-700">
                          {empPortalRole === 'client_admin'
                            ? 'Administrator'
                            : empPortalRole === 'project_leader'
                              ? 'Projektkoordinator'
                              : 'Mitarbeiter'}
                        </div>
                        <p className="text-xs text-gray-400 mt-1">Aenderbar ueber &quot;Bearbeiten&quot;.</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Passwort</label>
                        <input
                          type="text"
                          value={newPassword}
                          onChange={e => setNewPassword(e.target.value)}
                          placeholder="Mindestens 6 Zeichen"
                          autoComplete="new-password"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                        />
                        <p className="text-xs text-gray-400 mt-1">Dieses Passwort muss dem Mitarbeiter mitgeteilt werden (kein E-Mail-Versand).</p>
                      </div>

                      {/* v1.0.3-3: Optionaler Benutzername als Alternative zur E-Mail beim Login */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Benutzername (optional)</label>
                        <input
                          type="text"
                          value={newUsername}
                          onChange={e => setNewUsername(e.target.value)}
                          placeholder="z.B. m.mustermann"
                          autoComplete="username"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                        />
                        <p className="text-xs text-gray-400 mt-1">3-20 Zeichen, Kleinbuchstaben/Ziffern/._-. Alternative zur E-Mail beim Anmelden.</p>
                      </div>

                      {pwError && <p className="text-sm text-red-600">{pwError}</p>}
                      {pwSuccess && <p className="text-sm text-green-600">Login erfolgreich erstellt!</p>}
                    </>
                  )}
                </>
              )}
              {empUserId && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Neues Passwort</label>
                    <input
                      type="text"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="Mindestens 6 Zeichen"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                    />
                  </div>
                  {pwError && <p className="text-sm text-red-600">{pwError}</p>}
                  {pwSuccess && <p className="text-sm text-green-600">Passwort erfolgreich geaendert!</p>}
                </>
              )}
            </>
          )}

          {/* ============================================================ */}
          {/* NEU / BEARBEITEN FORMULAR                                    */}
          {/* ============================================================ */}
          {(mode === 'new' || mode === 'edit') && (
            <>
              {/* Name */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nachname</label>
                  <input name="last_name" value={form.last_name} onChange={handleChange}
                    placeholder="z.B. Mueller" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vorname</label>
                  <input name="first_name" value={form.first_name} onChange={handleChange}
                    placeholder="z.B. Max" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400" />
                </div>
              </div>

              {/* Anzeigename */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Anzeigename <span className="text-red-500">*</span>
                </label>
                <input name="display_name" value={form.display_name} onChange={handleChange}
                  placeholder="z.B. Mueller, Max" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400" />
                <p className="text-xs text-gray-400 mt-1">Wird automatisch aus Vor- und Nachname erzeugt, kann aber angepasst werden.</p>
              </div>

              {/* E-Mail */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-Mail</label>
                <input name="email" type="email" value={form.email} onChange={handleChange}
                  placeholder="z.B. max.mueller@firma.de" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400" />
                <p className="text-xs text-gray-400 mt-1">Erforderlich fuer Portal-Login.</p>
              </div>

              {/* E-Mail bestaetigen (nur Neuanlage, Tippfehler-Schutz) - v1.0.2 */}
              {mode === 'new' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">E-Mail bestaetigen</label>
                  <input
                    type="email"
                    value={emailConfirm}
                    onChange={(e) => setEmailConfirm(e.target.value)}
                    onPaste={(e) => e.preventDefault()}
                    placeholder="E-Mail zur Sicherheit erneut eingeben"
                    className={[
                      'w-full border rounded-lg px-3 py-2 text-sm focus:ring-2',
                      emailConfirm.trim() && form.email.trim().toLowerCase() !== emailConfirm.trim().toLowerCase()
                        ? 'border-red-400 focus:ring-red-200 focus:border-red-400'
                        : 'border-gray-300 focus:ring-blue-200 focus:border-blue-400',
                    ].join(' ')}
                  />
                  {emailConfirm.trim() && form.email.trim().toLowerCase() !== emailConfirm.trim().toLowerCase() && (
                    <p className="text-xs text-red-600 mt-1">E-Mail-Adressen stimmen nicht ueberein.</p>
                  )}
                </div>
              )}

              {/* Portal-Rolle */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Portal-Rolle</label>
                <div className="space-y-2">
                  {PORTAL_ROLES.map(role => (
                    <label
                      key={role.value}
                      className={[
                        'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                        form.portal_role === role.value
                          ? 'border-blue-400 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300',
                      ].join(' ')}
                    >
                      <input
                        type="radio"
                        name="portal_role"
                        value={role.value}
                        checked={form.portal_role === role.value}
                        onChange={() => handleRoleChange(role.value)}
                        className="mt-0.5"
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-900">{role.label}</span>
                        <p className="text-xs text-gray-500">{role.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>


              {/* ============================================================ */}
              {/* ANLAGE 6.1 - STUNDENSATZBERECHNUNG                          */}
              {/* ============================================================ */}
              <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-600">
                  Anlage 6.1 - Stundensatzberechnung
                </h3>

                {/* Monatsbruttolohn */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fix-Monatsbruttolohn (EUR)</label>
                  <input name="monthly_salary" type="text" value={form.monthly_salary} onChange={handleChange}
                    placeholder="z.B. 4200" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400" />
                  <p className="text-xs text-gray-400 mt-1">Fix-Monatsbruttolohn lt. Arbeitsvertrag</p>
                </div>

                {/* Sonderzahlungen */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Weitere fixe Gehaltsbestandteile (EUR/Jahr)</label>
                  <input name="annual_bonus" type="text" value={form.annual_bonus} onChange={handleChange}
                    placeholder="0" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400" />
                  <p className="text-xs text-gray-400 mt-1">Anlage 6.1a: Weihnachtsgeld, Urlaubsgeld etc. (oft 0)</p>
                </div>

                {/* Jahresbrutto (berechnet) */}
                {form.monthly_salary && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 text-sm font-medium text-blue-900">
                    = Jahresbrutto: <strong>{(() => {
                      const ms = parseFloat(form.monthly_salary.replace(',', '.')) || 0;
                      const ab = parseFloat(form.annual_bonus.replace(',', '.')) || 0;
                      return ((ms * 12 + ab)).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                    })()}</strong> EUR
                  </div>
                )}

                {/* pWAZ + bWAZ */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">pWAZ (Std.)</label>
                    <input name="weekly_hours" type="number" step="0.5" min="1" max="45"
                      value={form.weekly_hours} onChange={handleChange}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400" />
                    <p className="text-xs text-gray-400 mt-1">lt. Arbeitsvertrag</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">bWAZ (Std.)</label>
                    <input name="company_weekly_hours" type="number" step="0.5" min="1" max="45"
                      value={form.company_weekly_hours} onChange={handleChange}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400" />
                    <p className="text-xs text-gray-400 mt-1">Betriebsueblich (Vollzeit)</p>
                  </div>
                </div>

                {/* Berechnete Werte */}
                {form.monthly_salary && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-sm text-gray-700 space-y-1">
                    {(() => {
                      const pWAZ = parseFloat(form.weekly_hours) || 40;
                      const bWAZ = parseFloat(form.company_weekly_hours) || 40;
                      const ms = parseFloat(form.monthly_salary.replace(',', '.')) || 0;
                      const ab = parseFloat(form.annual_bonus.replace(',', '.')) || 0;
                      const jahresbrutto = ms * 12 + ab;
                      const jahresstunden = pWAZ * 52;
                      const teilzeitfaktor = bWAZ > 0 ? pWAZ / bWAZ : 1;
                      const stundensatz = jahresstunden > 0 ? jahresbrutto / jahresstunden : 0;
                      return (
                        <>
                          <div className="flex justify-between">
                            <span>Jahresarbeitsstd. (pWAZ x 52):</span>
                            <span className="font-medium">{jahresstunden.toLocaleString('de-DE')}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Teilzeitfaktor (pWAZ/bWAZ):</span>
                            <span className="font-medium">{teilzeitfaktor.toLocaleString('de-DE', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}

                {/* Stundensatz (berechnet) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stundensatz (EUR/h)</label>
                  <input
                    type="text"
                    readOnly
                    value={(() => {
                      const pWAZ = parseFloat(form.weekly_hours) || 0;
                      const ms = parseFloat((form.monthly_salary || '0').replace(',', '.')) || 0;
                      const ab = parseFloat((form.annual_bonus || '0').replace(',', '.')) || 0;
                      if (!ms || !pWAZ) return '';
                      const jahresbrutto = ms * 12 + ab;
                      const stundensatz = jahresbrutto / (pWAZ * 52);
                      return stundensatz.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                    })()}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-700"
                  />
                  <p className="text-xs text-gray-400 mt-1">Spalte 3: (Monatslohn x 12 + Fixbestandteile) / (pWAZ x 52)</p>
                </div>
              </div>

              {/* Position + Qualifikation (Original) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Position/Funktion</label>
                  {sonstigeAktiv ? (
                    <input
                      name="position_title"
                      value={form.position_title}
                      onChange={handleChange}
                      placeholder="Position eingeben"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                    />
                  ) : (
                    <select
                      name="position_title"
                      value={form.position_title}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                    >
                      <option value="">-- Bitte waehlen --</option>
                      {POSITION_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Qualifikation</label>
                  <select
                    name="qualification"
                    value={form.qualification}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                  >
                    <option value="">-- Bitte waehlen --</option>
                    {QUALIFICATION_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* GF-Warnung */}
              {isGF && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                  <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                  Gesch&auml;ftsf&uuml;hrer unterliegen der 50%-Regel: Maximal 50% der Wochenarbeitszeit darf als f&ouml;rderbare Projektzeit angerechnet werden.
                </div>
              )}

              {/* Beschaeftigungszeitraum */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Beschaeftigt seit</label>
                  <input
                    name="employment_start"
                    type="date"
                    value={form.employment_start}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Beschaeftigt bis</label>
                  <input
                    name="employment_end"
                    type="date"
                    value={form.employment_end}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                  />
                  <p className="text-xs text-gray-400 mt-1">Leer lassen wenn noch beschaeftigt</p>
                </div>
              </div>

              {/* Fehler */}
              {error && <p className="text-sm text-red-600">{error}</p>}
              {success && <p className="text-sm text-green-600">Erfolgreich gespeichert!</p>}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            Abbrechen
          </button>

          {mode === 'password' && empUserId && (
            <button
              onClick={handlePasswordReset}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg disabled:opacity-50 transition-colors"
            >
              <KeyRound size={16} />
              {loading ? 'Wird gespeichert...' : 'Passwort setzen'}
            </button>
          )}

          {mode === 'password' && !empUserId && empEmail && (
            <button
              onClick={handleCreateLogin}
              disabled={creatingLogin}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50 transition-colors"
              style={{ backgroundColor: '#002451' }}
            >
              <KeyRound size={16} />
              {creatingLogin ? 'Wird erstellt...' : 'Login erstellen'}
            </button>
          )}

          {(mode === 'new' || mode === 'edit') && (
            <button
              onClick={handleSave}
              disabled={
                loading ||
                (mode === 'new' && !!form.email.trim() &&
                  form.email.trim().toLowerCase() !== emailConfirm.trim().toLowerCase())
              }
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50 transition-colors"
              style={{ backgroundColor: '#002451' }}
            >
              <Save size={16} />
              {loading ? 'Wird gespeichert...' : mode === 'new' ? 'Anlegen' : 'Speichern'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
