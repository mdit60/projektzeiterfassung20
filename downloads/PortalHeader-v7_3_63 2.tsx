'use client';

// src/components/shared/PortalHeader.tsx
// ============================================================================
// PZE V7 - Portal-Header (schlank)
// ============================================================================
// Datum: 21. Januar 2026
// Version: 7.3.63
//
// Minimaler Header:
// Links:  PZE-Logo + Firmenname (klickbar -> Dashboard)
// Rechts: Username + Rolle + Abmelden
//
// FIX v7.3.63: userRole akzeptiert jetzt string ODER V7EmployeePortalRole
// ============================================================================

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { LogOut } from 'lucide-react';

import { V7PortalType, V7EmployeePortalRole } from '@/types/v7-types';
import { PORTAL_COLORS } from '@/lib/v7-constants';

// ============================================================================
// TYPEN
// ============================================================================

interface PortalHeaderProps {
  portal: V7PortalType;
  userName: string;
  userRole: V7EmployeePortalRole | string;  // Akzeptiert beides!
  companyName: string;
}

// ============================================================================
// HILFSFUNKTIONEN
// ============================================================================

function getRoleLabel(role: V7EmployeePortalRole | string): string {
  switch (role) {
    case 'client_admin':
      return 'Firmen-Admin';
    case 'project_leader':
      return 'Projektleiter';
    case 'employee':
      return 'Mitarbeiter';
    case 'system_admin':
      return 'System-Admin';
    case 'consultant':
      return 'Berater';
    default:
      // Falls bereits ein lesbarer String uebergeben wird, diesen zurueckgeben
      return role || 'Benutzer';
  }
}

// ============================================================================
// KOMPONENTE
// ============================================================================

export default function PortalHeader({
  portal,
  userName,
  userRole,
  companyName,
}: PortalHeaderProps) {
  const router = useRouter();
  const supabase = createClient();
  const colors = PORTAL_COLORS[portal];
  const dashboardUrl = portal === 'berater' ? '/v7/berater/dashboard' : '/v7/firma/dashboard';

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <header style={{ backgroundColor: colors.primary }} className="text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Links: Logo + Firmenname */}
          <Link href={dashboardUrl} className="flex items-center gap-3 hover:opacity-90 transition-opacity">
            <div className="flex items-center justify-center w-10 h-10 bg-white/20 rounded-lg">
              <span className="text-lg font-bold">PZE</span>
            </div>
            <span className="text-xl font-semibold">{companyName}</span>
          </Link>

          {/* Rechts: User-Info + Logout */}
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="font-medium">{userName}</div>
              <div className="text-sm opacity-80">{getRoleLabel(userRole)}</div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              title="Abmelden"
            >
              <LogOut size={18} />
              <span className="hidden sm:inline">Abmelden</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
