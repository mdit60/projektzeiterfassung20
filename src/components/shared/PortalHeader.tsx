'use client';

// src/components/shared/PortalHeader.tsx
// ============================================================================
// PZE - Gemeinsamer Portal-Header
// ============================================================================
// Version: 7.3.95-12
// v7.3.95-12: FIX: Config-Query auf korrekte Spalten (key/value statt config_key/config_value).
//   FIX: Cockpit-Modus fuer Nicht-system_admin automatisch aus DB-Config synchronisieren.
//   Wenn cockpit_berater_enabled=true, wird localStorage pze_mode='app' gesetzt.
//   Berater muessen sich nicht um den Modus kuemmern - Admin entscheidet.
// v7.3.95-11: Ansicht-Wechsler im User-Dropdown (nur system_admin)
//   - "Klassische Ansicht" / "Neue App-Struktur" umschalten via localStorage pze_mode
//   - Aktive Ansicht mit Haken markiert
//   PortalHeader laedt role SELBST aus v7_user_profiles (gleicher DB-Fetch)
//   -> Rolle ist auf ALLEN Seiten identisch, unabhaengig von Props
//   -> userRole + portalRole Props werden fuer Anzeige ignoriert (nur noch
//      als Fallback wenn DB-Fetch noch nicht abgeschlossen)
//
// v7.3.95-9: system_admin Vorrang in Rollenhierarchie
// v7.3.95-8: DB-Query fix (consultant_company_id), Rollenbezeichnungen DE
// v7.3.95-7: usePathname() fuer Versionsanzeige; Berater-Firma aus DB
// v7.3.95-6: Header-Redesign 3-Spalten, volle Breite, Rollenanzeige
// v7.3.95-5: Home-Button entfernt
// v7.3.95-2: Passwort-aendern wiederhergestellt
// v7.3.95:   print:hidden
// ============================================================================

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  LogOut,
  ChevronDown,
  User,
  KeyRound,
  Check,
  AlertCircle,
  Monitor,
  Layers,
} from 'lucide-react';

import { V7PortalType, V7UserRole, V7EmployeePortalRole } from '@/types/v7-types';
import { PORTAL_COLORS } from '@/lib/v7-constants';

// ============================================================================
// TYPEN
// ============================================================================

type UserRoleType = V7UserRole | V7EmployeePortalRole | string;

interface PortalHeaderProps {
  portal: V7PortalType;
  userRole: UserRoleType;
  portalRole?: V7EmployeePortalRole;
  userName: string;
  userEmail?: string;
  companyName?: string;        // Firmen-Portal: eingeloggte Firma | Berater-Portal: wird ignoriert
  companyLogo?: string | null; // Abwaertskompatibilitaet - wird nicht gerendert
  currentPath?: string;        // Abwaertskompatibilitaet - usePathname() wird bevorzugt
  hideNavigation?: boolean;
}

// ============================================================================
// HILFSFUNKTION: Rollenbezeichnung (DE)
// ============================================================================

function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    system_admin:   'System Administrator',
    consultant:     'Berater',
    berater:        'Berater',
    client_admin:   'Administrator',
    project_leader: 'Projektkoordinator',
    employee:       'Mitarbeiter',
  };
  return labels[role] || role;
}

// ============================================================================
// KOMPONENTE
// ============================================================================

export default function PortalHeader({
  portal,
  userRole,
  portalRole,
  userName,
  userEmail,
  companyName,
  companyLogo,
  currentPath,
  hideNavigation = false,
}: PortalHeaderProps) {
  const router   = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  const [userMenuOpen, setUserMenuOpen]                 = useState(false);
  const [cockpitGlobalEnabled, setCockpitGlobalEnabled] = useState(false);
  const [beraterCompanyName, setBeraterCompanyName]     = useState<string>('');
  const [userRoleFromDB, setUserRoleFromDB]             = useState<string>('');
  const [pzeMode, setPzeMode]                           = useState<string>('classic');

  // Passwort-aendern State
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [newPassword, setNewPassword]               = useState('');
  const [confirmPassword, setConfirmPassword]       = useState('');
  const [passwordError, setPasswordError]           = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess]       = useState(false);
  const [changingPassword, setChangingPassword]     = useState(false);

  const colors = PORTAL_COLORS[portal];

  // ------------------------------------------------------------------
  // Einmalig beim Mount:
  //   1. Cockpit global aktiv? (fuer Versionsanzeige)
  //   2. Berater-Portal: eigene Firma aus v7_consultant_companies laden
  // ------------------------------------------------------------------
  useEffect(() => {
    // pze_mode aus localStorage lesen
    const stored = localStorage.getItem('pze_mode');
    if (stored === 'classic' || stored === 'app') setPzeMode(stored);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Cockpit-Config (FIX v7.3.95-12: korrekte Spalten key/value)
        const { data: configData } = await supabase
          .from('v7_system_config')
          .select('value')
          .eq('key', 'cockpit_berater_enabled')
          .single();
        const cockpitEnabled = configData?.value === 'true';
        if (cockpitEnabled) {
          setCockpitGlobalEnabled(true);
        }

        // 2. User-Rolle + ggf. Berater-Firma aus v7_user_profiles
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('v7_user_profiles')
            .select('role, consultant_company_id')
            .eq('id', user.id)
            .single();

          // Rolle aus DB speichern - unabhaengig von Portal
          if (profile?.role) {
            setUserRoleFromDB(profile.role);
          }

          // v7.3.95-12: Fuer Nicht-system_admin: pze_mode aus DB-Config synchronisieren.
          // Admin entscheidet, Berater landet automatisch im Cockpit.
          if (profile?.role && profile.role !== 'system_admin' && portal === 'berater') {
            const newMode = cockpitEnabled ? 'app' : 'classic';
            localStorage.setItem('pze_mode', newMode);
            setPzeMode(newMode);
          }

          // Berater-Firma nur fuer Berater-Portal
          if (portal === 'berater' && profile?.consultant_company_id) {
            const { data: cc } = await supabase
              .from('v7_consultant_companies')
              .select('name')
              .eq('id', profile.consultant_company_id)
              .single();
            if (cc?.name) {
              setBeraterCompanyName(cc.name);
            }
          }
        }
      } catch {
        // Fehler ignorieren
      }
    };
    fetchData();
  }, [portal]); // eslint-disable-line react-hooks/exhaustive-deps

  // ------------------------------------------------------------------
  // Versionslogik via usePathname() - kein Prop-Drilling noetig
  //   V8-C: cockpit global aktiv ODER URL enthaelt /cockpit
  //   V7:   sonst
  // ------------------------------------------------------------------
  const activePath     = pathname || currentPath || '';
  const isV8C          = cockpitGlobalEnabled || activePath.includes('/cockpit');
  const productVersion = isV8C ? 'V8-C' : 'V7';

  // ------------------------------------------------------------------
  // Firmenname Mitte:
  //   Berater-Portal: immer eigene Firma aus DB (nie companyName-Prop)
  //   Firmen-Portal:  companyName-Prop
  // ------------------------------------------------------------------
  const displayCompany = portal === 'berater'
    ? beraterCompanyName            // Cubintec GmbH - niemals Kundenfirma
    : (companyName || 'PZE');

  const portalTitle   = portal === 'berater' ? 'Berater-Portal' : 'Firmen-Portal';
  const dashboardHref = portal === 'berater' ? '/v7/berater/dashboard' : '/v7/firma/dashboard';

  // Rollenbezeichnung vollstaendig aus DB - Props nur als Fallback waehrend Laden
  //   Hierarchie: system_admin > consultant > client_admin > project_leader > employee
  const effectiveRole = userRoleFromDB || (userRole as string);
  const displayRole = effectiveRole === 'system_admin'
    ? 'System Administrator'
    : getRoleLabel(effectiveRole);

  // ------------------------------------------------------------------
  // Handler
  // ------------------------------------------------------------------

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handlePasswordChange = async () => {
    setPasswordError(null);
    setPasswordSuccess(false);

    if (newPassword.length < 6) {
      setPasswordError('Passwort muss mindestens 6 Zeichen lang sein.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwoerter stimmen nicht ueberein.');
      return;
    }

    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        setPasswordError(error.message);
      } else {
        setPasswordSuccess(true);
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => {
          setShowPasswordChange(false);
          setPasswordSuccess(false);
        }, 3000);
      }
    } catch (err: any) {
      setPasswordError(err.message || 'Ein Fehler ist aufgetreten.');
    } finally {
      setChangingPassword(false);
    }
  };

  const openPasswordChange = () => {
    setUserMenuOpen(false);
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError(null);
    setPasswordSuccess(false);
    setShowPasswordChange(true);
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <>
      {/* ================================================================ */}
      {/* HEADER                                                            */}
      {/* ================================================================ */}
      <header
        className="text-white shadow-lg print:hidden w-full"
        style={{ backgroundColor: colors.primary }}
      >
        <div className="w-full px-6">
          <div className="grid grid-cols-3 items-center h-16">

            {/* -------------------------------------------------------- */}
            {/* LINKS: PZE-Block + Version + Copyright                    */}
            {/* -------------------------------------------------------- */}
            <div className="flex items-center space-x-3">

              {/* PZE-Kasten */}
              <div
                className="rounded px-3 py-1 flex items-center justify-center"
                style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
              >
                <span className="text-white font-bold text-lg tracking-wide">PZE</span>
              </div>

              {/* Version + Copyright */}
              <div>
                <div className="text-white font-semibold text-sm leading-tight">
                  {productVersion}
                </div>
                <div className="text-xs leading-tight" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  &copy; Cubintec
                </div>
              </div>

            </div>

            {/* -------------------------------------------------------- */}
            {/* MITTE: Firma + Portal-Typ (klickbar zum Dashboard)        */}
            {/* -------------------------------------------------------- */}
            <Link
              href={dashboardHref}
              className="flex flex-col items-center hover:opacity-90 transition-opacity cursor-pointer"
            >
              <div className="text-white font-semibold text-base leading-tight truncate max-w-xs text-center">
                {displayCompany}
              </div>
              <div
                className="text-xs leading-tight text-center"
                style={{ color: 'rgba(255,255,255,0.7)' }}
              >
                {portalTitle}
              </div>
            </Link>

            {/* -------------------------------------------------------- */}
            {/* RECHTS: User + Rolle + Dropdown                           */}
            {/* -------------------------------------------------------- */}
            <div className="flex items-center justify-end">
              <div className="relative">

                {/* User-Button */}
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm transition-colors duration-150"
                  style={{ backgroundColor: userMenuOpen ? 'rgba(255,255,255,0.1)' : 'transparent' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = userMenuOpen ? 'rgba(255,255,255,0.1)' : 'transparent')}
                >
                  <User size={16} />
                  <span className="hidden sm:inline text-white">
                    {userName}
                  </span>
                  <span
                    className="hidden sm:inline text-sm"
                    style={{ color: 'rgba(255,255,255,0.7)' }}
                  >
                    &nbsp;| {displayRole}
                  </span>
                  <ChevronDown
                    size={14}
                    className={`transition-transform ${userMenuOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {/* Dropdown-Menu */}
                {userMenuOpen && (
                  <>
                    {/* Backdrop */}
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setUserMenuOpen(false)}
                    />

                    {/* Menu */}
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg z-20 py-1">

                      {/* User-Info */}
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-900">{userName}</p>
                        {userEmail && (
                          <p className="text-xs text-gray-500 truncate">{userEmail}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">{displayRole}</p>
                      </div>

                      {/* Ansicht wechseln (nur system_admin) */}
                      {effectiveRole === 'system_admin' && (
                        <>
                          <div className="px-4 py-2 border-t border-gray-100">
                            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Ansicht</p>
                            <button
                              onClick={() => {
                                localStorage.setItem('pze_mode', 'classic');
                                setUserMenuOpen(false);
                                router.push('/v7/berater/dashboard');
                              }}
                              className="w-full flex items-center justify-between px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors"
                            >
                              <span className="flex items-center gap-2">
                                <Monitor size={14} />
                                Klassische Ansicht
                              </span>
                              {pzeMode === 'classic' && <Check size={14} className="text-blue-600" />}
                            </button>
                            <button
                              onClick={() => {
                                localStorage.setItem('pze_mode', 'app');
                                setUserMenuOpen(false);
                                router.push('/v7/berater/app/cockpit');
                              }}
                              className="w-full flex items-center justify-between px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors"
                            >
                              <span className="flex items-center gap-2">
                                <Layers size={14} />
                                Neue App-Struktur
                              </span>
                              {pzeMode === 'app' && <Check size={14} className="text-blue-600" />}
                            </button>
                          </div>
                        </>
                      )}

                      {/* Passwort aendern */}
                      <button
                        onClick={openPasswordChange}
                        className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        <KeyRound size={16} />
                        <span>Passwort aendern</span>
                      </button>

                      {/* Abmelden */}
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        <LogOut size={16} />
                        <span>Abmelden</span>
                      </button>

                    </div>
                  </>
                )}

              </div>
            </div>

          </div>
        </div>
      </header>

      {/* ================================================================ */}
      {/* MODAL: Passwort aendern                                          */}
      {/* ================================================================ */}
      {showPasswordChange && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">

            <div className="flex justify-between items-center px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <KeyRound size={20} />
                Passwort aendern
              </h3>
              <button
                onClick={() => setShowPasswordChange(false)}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                &times;
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">

              {passwordError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
                  <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              {passwordSuccess && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
                  <Check size={16} className="mt-0.5 flex-shrink-0" />
                  <span>Passwort erfolgreich geaendert!</span>
                </div>
              )}

              {!passwordSuccess && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Neues Passwort <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Mindestens 6 Zeichen"
                      autoComplete="new-password"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Passwort bestaetigen <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Passwort wiederholen"
                      autoComplete="new-password"
                    />
                  </div>
                </>
              )}

            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
              <button
                onClick={() => setShowPasswordChange(false)}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {passwordSuccess ? 'Schliessen' : 'Abbrechen'}
              </button>
              {!passwordSuccess && (
                <button
                  onClick={handlePasswordChange}
                  disabled={changingPassword || !newPassword || !confirmPassword}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {changingPassword ? 'Wird geaendert...' : 'Passwort aendern'}
                </button>
              )}
            </div>

          </div>
        </div>
      )}
    </>
  );
}

// ============================================================================
// ENDE PortalHeader v7.3.95-8
// ============================================================================
