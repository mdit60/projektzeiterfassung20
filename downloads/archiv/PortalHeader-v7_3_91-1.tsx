'use client';

// src/components/shared/PortalHeader.tsx
// ============================================================================
// PZE V7 - Gemeinsamer Portal-Header
// ============================================================================
// Datum: 16. Februar 2026
// Version: 7.3.91-1
//
// v7.3.91-1: Passwort aendern im User-Dropdown-Menue
//            Inline-Formular mit neuem Passwort + Bestaetigungsfeld
//            Erfolgs-/Fehlermeldungen direkt im Dropdown
// v7.3.89: Klick auf Firmenname/Portal-Titel fuehrt zum Dashboard
// v7.3.86: userRole akzeptiert jetzt V7UserRole | V7EmployeePortalRole | string
// ============================================================================

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  LogOut,
  ChevronDown,
  User,
  KeyRound,
  Eye,
  EyeOff,
  Check,
  X,
} from 'lucide-react';

import { V7PortalType, V7UserRole, V7EmployeePortalRole } from '@/types/v7-types';
import { PORTAL_COLORS } from '@/lib/v7-constants';

// ============================================================================
// TYPEN
// ============================================================================

// userRole kann V7UserRole, V7EmployeePortalRole oder beliebiger String sein
type UserRoleType = V7UserRole | V7EmployeePortalRole | string;

interface PortalHeaderProps {
  portal: V7PortalType;
  userRole: UserRoleType;
  portalRole?: V7EmployeePortalRole;
  userName: string;
  userEmail?: string;
  companyName?: string;
  companyLogo?: string | null;
  currentPath?: string;
  hideNavigation?: boolean;     // Beibehalten fuer Interface-Kompatibilitaet
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
  const router = useRouter();
  const supabase = createClient();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Passwort-Aendern State
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPw, setShowNewPw] = useState(false);
  const [pwChanging, setPwChanging] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState(false);

  const colors = PORTAL_COLORS[portal];

  // Logout-Handler
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  // Passwort aendern Handler
  const handleChangePassword = async () => {
    setPwError(null);
    setPwSuccess(false);

    // Validierung
    if (newPassword.length < 6) {
      setPwError('Passwort muss mindestens 6 Zeichen lang sein.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError('Passwoerter stimmen nicht ueberein.');
      return;
    }

    setPwChanging(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        setPwError(error.message);
      } else {
        setPwSuccess(true);
        setNewPassword('');
        setConfirmPassword('');
        // Nach 2 Sekunden Formular schliessen
        setTimeout(() => {
          setShowPasswordForm(false);
          setPwSuccess(false);
        }, 2000);
      }
    } catch (err: unknown) {
      setPwError('Unerwarteter Fehler beim Aendern des Passworts.');
    } finally {
      setPwChanging(false);
    }
  };

  // Passwort-Formular zuruecksetzen
  const resetPasswordForm = () => {
    setShowPasswordForm(false);
    setNewPassword('');
    setConfirmPassword('');
    setPwError(null);
    setPwSuccess(false);
    setShowNewPw(false);
  };

  // Portal-Titel
  const portalTitle = portal === 'berater' ? 'Berater-Portal' : 'Firmen-Portal';
  const dashboardHref = portal === 'berater' ? '/v7/berater/dashboard' : '/v7/firma/dashboard';

  return (
    <header
      className={`${colors.headerBg} text-white shadow-lg`}
      style={{ backgroundColor: colors.primary }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo / Firmenname - KLICKBAR zum Dashboard */}
          <Link href={dashboardHref} className="flex items-center space-x-4 hover:opacity-90 transition-opacity cursor-pointer">
            {/* Firmenlogo oder Initialen */}
            {companyLogo ? (
              <img
                src={companyLogo}
                alt={companyName || 'Logo'}
                className="h-10 w-auto bg-white rounded p-1"
              />
            ) : (
              <div className="h-10 w-10 bg-white/20 rounded flex items-center justify-center text-lg font-bold">
                {companyName ? companyName.substring(0, 2).toUpperCase() : 'PZ'}
              </div>
            )}
            
            {/* Firmenname / Portal-Titel */}
            <div className="hidden sm:block">
              <div className="text-lg font-semibold">
                {companyName || 'PZE'}
              </div>
            </div>
          </Link>

          {/* Benutzer-Menu */}
          <div className="flex items-center space-x-4">
            {/* User Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setUserMenuOpen(!userMenuOpen);
                  if (userMenuOpen) resetPasswordForm();
                }}
                className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm
                           hover:bg-white/10 transition-colors duration-150"
              >
                <User size={18} />
                <span className="hidden sm:inline">{userName}</span>
                <ChevronDown size={16} className={`transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              {userMenuOpen && (
                <>
                  {/* Backdrop */}
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => {
                      setUserMenuOpen(false);
                      resetPasswordForm();
                    }}
                  />
                  
                  {/* Menu */}
                  <div className="absolute right-0 mt-2 w-72 bg-white rounded-md shadow-lg z-20 py-1">
                    {/* User Info */}
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">{userName}</p>
                      {userEmail && (
                        <p className="text-xs text-gray-500 truncate">{userEmail}</p>
                      )}
                      {companyName && (
                        <p className="text-xs text-gray-500 mt-1">{companyName}</p>
                      )}
                    </div>

                    {/* Passwort aendern */}
                    {!showPasswordForm ? (
                      <button
                        onClick={() => setShowPasswordForm(true)}
                        className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-gray-700
                                   hover:bg-gray-100 transition-colors"
                      >
                        <KeyRound size={16} />
                        <span>Passwort aendern</span>
                      </button>
                    ) : (
                      <div className="px-4 py-3 border-b border-gray-100">
                        <div className="flex justify-between items-center mb-3">
                          <p className="text-sm font-medium text-gray-900">Passwort aendern</p>
                          <button
                            onClick={resetPasswordForm}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <X size={16} />
                          </button>
                        </div>

                        {/* Erfolg */}
                        {pwSuccess && (
                          <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2 mb-3 text-xs">
                            <Check size={14} />
                            Passwort erfolgreich geaendert!
                          </div>
                        )}

                        {/* Fehler */}
                        {pwError && (
                          <div className="text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2 mb-3 text-xs">
                            {pwError}
                          </div>
                        )}

                        {!pwSuccess && (
                          <>
                            {/* Neues Passwort */}
                            <div className="mb-2">
                              <label className="block text-xs text-gray-600 mb-1">Neues Passwort</label>
                              <div className="relative">
                                <input
                                  type={showNewPw ? 'text' : 'password'}
                                  value={newPassword}
                                  onChange={(e) => setNewPassword(e.target.value)}
                                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                                  placeholder="Mind. 6 Zeichen"
                                  autoComplete="new-password"
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowNewPw(!showNewPw)}
                                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                  {showNewPw ? <EyeOff size={14} /> : <Eye size={14} />}
                                </button>
                              </div>
                            </div>

                            {/* Passwort bestaetigen */}
                            <div className="mb-3">
                              <label className="block text-xs text-gray-600 mb-1">Passwort bestaetigen</label>
                              <input
                                type={showNewPw ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                                placeholder="Passwort wiederholen"
                                autoComplete="new-password"
                              />
                            </div>

                            {/* Speichern Button */}
                            <button
                              onClick={handleChangePassword}
                              disabled={pwChanging || !newPassword || !confirmPassword}
                              className="w-full px-3 py-1.5 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              {pwChanging ? 'Speichere...' : 'Passwort speichern'}
                            </button>
                          </>
                        )}
                      </div>
                    )}
                    
                    {/* Logout */}
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-gray-700
                                 hover:bg-gray-100 transition-colors"
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
  );
}

// ============================================================================
// ENDE
// ============================================================================
