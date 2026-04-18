'use client';

// src/components/shared/PortalNav.tsx
// ============================================================================
// PZE V7 - Portal-Navigation (rollenbasiert)
// ============================================================================
// Datum: 21. Januar 2026
// Version: 7.3.42
//
// Navigation unter dem Header, abhaengig von der Rolle:
//
// Firmen-Admin:     Firmendaten | Projekte | Mitarbeiter
// Projektleiter:    Meine Projekte | Mein Team
// Mitarbeiter:      Meine Projekte | Meine Zeiterfassung
//
// Berater:          Kunden | Import | Berichte (+ Admin fuer system_admin)
// ============================================================================

import Link from 'next/link';
import {
  Building2,
  FolderKanban,
  Users,
  Clock,
  Upload,
  BarChart3,
  Settings,
} from 'lucide-react';

import { V7PortalType, V7UserRole, V7EmployeePortalRole } from '@/types/v7-types';
import { PORTAL_COLORS } from '@/lib/v7-constants';

// ============================================================================
// TYPEN
// ============================================================================

interface NavItem {
  key: string;
  label: string;
  href: string;
  icon: React.ReactNode;
}

interface PortalNavProps {
  portal: V7PortalType;
  userRole: V7UserRole;
  portalRole?: V7EmployeePortalRole;
  currentPath?: string;
}

// ============================================================================
// NAVIGATION KONFIGURATION
// ============================================================================

// Berater-Portal Navigation
const NAV_BERATER: NavItem[] = [
  { key: 'kunden', label: 'Kunden', href: '/v7/berater/foerderung', icon: <Building2 size={18} /> },
  { key: 'import', label: 'Import', href: '/v7/berater/import', icon: <Upload size={18} /> },
  { key: 'berichte', label: 'Berichte', href: '/v7/berater/berichte', icon: <BarChart3 size={18} /> },
];

const NAV_BERATER_ADMIN: NavItem[] = [
  { key: 'admin', label: 'Administration', href: '/v7/berater/admin', icon: <Settings size={18} /> },
];

// Firmen-Portal: Firmen-Admin
const NAV_FIRMA_ADMIN: NavItem[] = [
  { key: 'firmendaten', label: 'Firmendaten', href: '/v7/firma/firmendaten', icon: <Building2 size={18} /> },
  { key: 'projekte', label: 'Projekte', href: '/v7/firma/projekte', icon: <FolderKanban size={18} /> },
  { key: 'mitarbeiter', label: 'Mitarbeiter', href: '/v7/firma/mitarbeiter', icon: <Users size={18} /> },
];

// Firmen-Portal: Projektleiter
const NAV_FIRMA_PROJECT_LEADER: NavItem[] = [
  { key: 'meine-projekte', label: 'Meine Projekte', href: '/v7/firma/meine-projekte', icon: <FolderKanban size={18} /> },
  { key: 'mein-team', label: 'Mein Team', href: '/v7/firma/mein-team', icon: <Users size={18} /> },
];

// Firmen-Portal: Mitarbeiter
const NAV_FIRMA_EMPLOYEE: NavItem[] = [
  { key: 'meine-projekte', label: 'Meine Projekte', href: '/v7/firma/meine-projekte', icon: <FolderKanban size={18} /> },
  { key: 'meine-zeiterfassung', label: 'Meine Zeiterfassung', href: '/v7/firma/meine-zeiterfassung', icon: <Clock size={18} /> },
];

// ============================================================================
// HILFSFUNKTIONEN
// ============================================================================

function getNavItems(
  portal: V7PortalType,
  userRole: V7UserRole,
  portalRole?: V7EmployeePortalRole
): NavItem[] {
  if (portal === 'berater') {
    const items = [...NAV_BERATER];
    if (userRole === 'system_admin') {
      items.push(...NAV_BERATER_ADMIN);
    }
    return items;
  } else {
    // Firmen-Portal
    if (userRole === 'client_admin' || portalRole === 'client_admin') {
      return NAV_FIRMA_ADMIN;
    } else if (portalRole === 'project_leader') {
      return NAV_FIRMA_PROJECT_LEADER;
    } else {
      return NAV_FIRMA_EMPLOYEE;
    }
  }
}

function isActiveLink(href: string, currentPath?: string): boolean {
  if (!currentPath) return false;
  return currentPath === href || currentPath.startsWith(href + '/');
}

// ============================================================================
// KOMPONENTE
// ============================================================================

export default function PortalNav({
  portal,
  userRole,
  portalRole,
  currentPath,
}: PortalNavProps) {
  const colors = PORTAL_COLORS[portal];
  const navItems = getNavItems(portal, userRole, portalRole);

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center space-x-1 overflow-x-auto -mb-px">
          {navItems.map((item) => {
            const isActive = isActiveLink(item.href, currentPath);
            
            return (
              <Link
                key={item.key}
                href={item.href}
                className={`
                  flex items-center space-x-2 px-4 py-3 text-sm font-medium
                  border-b-2 transition-colors whitespace-nowrap
                  ${isActive
                    ? 'border-current'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                  }
                `}
                style={isActive ? { color: colors.primary, borderColor: colors.primary } : {}}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

// ============================================================================
// ENDE
// ============================================================================
