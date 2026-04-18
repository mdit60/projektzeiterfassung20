'use client';

// src/components/shared/PortalHeader.tsx
// ============================================================================
// PZE V7 - Gemeinsamer Portal-Header
// ============================================================================
// Datum: 18. Februar 2026
// Version: 7.3.95-3
//
// Wird von beiden Portalen genutzt:
// - Berater-Portal: Blauer Header (#002451)
// - Firmen-Portal: Gruener Header (#65A655)
//
// v7.3.95-2: Passwort-aendern Funktion wiederhergestellt (war in v7.3.91-1,
//            ging bei v7.3.95 Print-Fix verloren)
// v7.3.95: print:hidden hinzugefuegt - Header beim Drucken ausblenden
// v7.3.89: Klick auf Firmenname/Portal-Titel fuehrt zum Dashboard
//          Berater -> /v7/berater/dashboard, Firma -> /v7/firma/dashboard
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
  Check,
  AlertCircle,
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
  companyName?: string;
  companyLogo?: string | null;
  currentPath?: string;
  hideNavigation?: boolean;
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

  // Passwort-aendern State
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const colors = PORTAL_COLORS[portal];

  // Logout-Handler
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  // Passwort-aendern Handler
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
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        setPasswordError(error.message);
      } else {
        setPasswordSuccess(true);
        setNewPassword('');
        setConfirmPassword('');
        // Nach 3 Sekunden Dialog schliessen
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

  // Portal-Titel
  const portalTitle = portal === 'berater' ? 'Berater-Portal' : 'Firmen-Portal';
  const dashboardHref = portal === 'berater' ? '/v7/berater/dashboard' : '/v7/firma/dashboard';

  return (
    <>
      <header
        className={`${colors.headerBg} text-white shadow-lg print:hidden`}
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
                <div className="text-xs text-white/70">
                  {portalTitle}
                </div>
              </div>
            </Link>

            {/* Benutzer-Menu */}
            <div className="flex items-center space-x-4">
              {/* User Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
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
                      onClick={() => setUserMenuOpen(false)}
                    />
                    
                    {/* Menu */}
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg z-20 py-1">
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
                      <button
                        onClick={openPasswordChange}
                        className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-gray-700
                                   hover:bg-gray-100 transition-colors"
                      >
                        <KeyRound size={16} />
                        <span>Passwort aendern</span>
                      </button>

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

      {/* ================================================================ */}
      {/* MODAL: Passwort aendern */}
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
// ENDE
// ============================================================================
