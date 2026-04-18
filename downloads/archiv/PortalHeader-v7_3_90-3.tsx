'use client';

// src/components/shared/PortalHeader.tsx
// ============================================================================
// PZE V7 - Gemeinsamer Portal-Header
// ============================================================================
// Datum: 11. Februar 2026
// Version: 7.3.90-3
//
// Wird von beiden Portalen genutzt:
// - Berater-Portal: Blauer Header (#002451)
// - Firmen-Portal: Gruener Header (#65A655)
//
// v7.3.90-3: PZE-Logo-Platzhalter wiederhergestellt (keine Firmen-Initialen)
//            Unterzeile "Berater-Portal"/"Firmen-Portal" entfernt
//            Nur noch: [PZE-Logo] Firmenname ... Username v Abmelden
// v7.3.89: Klick auf Logo/Firmenname -> Dashboard
// v7.3.86: userRole akzeptiert V7UserRole | V7EmployeePortalRole | string
// ============================================================================

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  LogOut,
  ChevronDown,
  User,
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

  const colors = PORTAL_COLORS[portal];

  // Logout-Handler
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const dashboardHref = portal === 'berater' ? '/v7/berater/dashboard' : '/v7/firma/dashboard';

  return (
    <header
      className={`${colors.headerBg} text-white shadow-lg`}
      style={{ backgroundColor: colors.primary }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14">

          {/* Logo + Firmenname - KLICKBAR zum Dashboard */}
          <Link href={dashboardHref} className="flex items-center space-x-3 hover:opacity-90 transition-opacity cursor-pointer">
            {/* PZE-Logo Platzhalter */}
            <div className="h-9 w-9 bg-white/20 rounded-lg flex items-center justify-center text-sm font-bold">
              PZE
            </div>

            {/* Firmenname (ohne Unterzeile) */}
            <div className="hidden sm:block">
              <div className="text-lg font-semibold leading-tight">
                {companyName || 'PZE'}
              </div>
            </div>
          </Link>

          {/* Benutzer-Menu */}
          <div className="flex items-center space-x-4">
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
