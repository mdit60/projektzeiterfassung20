'use client';

// src/components/shared/PortalHeader.tsx
// ============================================================================
// PZE V7 - Portal-Header (schlank)
// ============================================================================
// Datum: 21. Januar 2026
// Version: 7.3.42
//
// Minimaler Header:
// Links:  PZE-Logo + Firmenname (klickbar -> Dashboard)
// Rechts: Username + Rolle + Abmelden
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
  userRole: V7EmployeePortalRole;
  companyName: string;
}

// ============================================================================
// HILFSFUNKTIONEN
// ============================================================================

function getRoleLabel(role: V7EmployeePortalRole): string {
  switch (role) {
    case 'client_admin':
      return 'Firmen-Admin';
    case 'project_leader':
      return 'Projektleiter';
    case 'employee':
      return 'Mitarbeiter';
    default:
      return 'Benutzer';
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

  // Logout-Handler
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <header
      className="text-white shadow-lg"
      style={{ backgroundColor: colors.primary }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14">
          
          {/* Links: Logo + Firmenname */}
          <Link 
            href={dashboardUrl} 
            className="flex items-center space-x-3 hover:opacity-90 transition-opacity"
          >
            {/* PZE Logo */}
            <div className="h-8 w-12 bg-white rounded flex items-center justify-center">
              <span className="text-sm font-bold" style={{ color: colors.primary }}>PZE</span>
            </div>
            
            {/* Firmenname */}
            <span className="text-lg font-semibold hidden sm:inline">
              {companyName}
            </span>
          </Link>

          {/* Rechts: User + Rolle + Abmelden */}
          <div className="flex items-center space-x-4">
            {/* User Info */}
            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium">{userName}</div>
              <div className="text-xs text-white/70">{getRoleLabel(userRole)}</div>
            </div>
            
            {/* Mobile: Nur Name */}
            <span className="text-sm font-medium sm:hidden">{userName}</span>

            {/* Abmelden Button */}
            <button
              onClick={handleLogout}
              className="flex items-center space-x-1 px-3 py-1.5 rounded
                         bg-white/10 hover:bg-white/20 transition-colors text-sm"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Abmelden</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

// ============================================================================
// ENDE
// ============================================================================
