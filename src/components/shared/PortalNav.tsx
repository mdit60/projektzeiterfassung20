// src/components/shared/PortalNav.tsx
// ============================================================================
// PZE V7 - Portal-Navigation
// ============================================================================
// Datum: 23. Februar 2026
// Version: 7.4.0
//
// v7.4.0: NAV_BERATER um 'Zeiterfassungen' (/v7/berater/timesheets) erweitert
// v7.3.95-2: "Import" aus Berater-Navigation entfernt
// v7.3.95: print:hidden hinzugefuegt
// v7.3.92: Kumulative Rollen, Employee/PL/Admin-Navigation
// ============================================================================

'use client';

import React from 'react';
import Link from 'next/link';
import {
  BarChart3,
  Building2,
  Clock,
  FolderKanban,
  Settings,
  Users,
} from 'lucide-react';

// ============================================================================
// TYPEN
// ============================================================================

type PortalType = 'berater' | 'firma';
type UserRole = 'system_admin' | 'consultant' | 'client_admin' | 'client_user';
type PortalRole = 'client_admin' | 'project_leader' | 'employee';

interface NavItem {
  key: string;
  label: string;
  href: string;
  icon: React.ReactNode;
}

interface PortalNavProps {
  portal: PortalType;
  userRole: UserRole | string;
  portalRole?: PortalRole | string;
  currentPath?: string;
}

// ============================================================================
// PORTAL-FARBEN
// ============================================================================

const PORTAL_COLORS = {
  berater: { primary: '#002451' },
  firma: { primary: '#65A655' },
};

// ============================================================================
// BERATER-PORTAL NAVIGATION
// ============================================================================

const NAV_BERATER: NavItem[] = [
  { key: 'kunden',      label: 'Kunden',          href: '/v7/berater/foerderung',  icon: <Building2 size={18} /> },
  { key: 'berichte',    label: 'Berichte',         href: '/v7/berater/berichte',    icon: <BarChart3 size={18} /> },
  { key: 'timesheets',  label: 'Zeiterfassungen',  href: '/v7/berater/timesheets',  icon: <Clock size={18} /> },
];

const NAV_BERATER_ADMIN: NavItem[] = [
  { key: 'admin', label: 'Administration', href: '/v7/berater/admin', icon: <Settings size={18} /> },
];

// ============================================================================
// FIRMEN-PORTAL NAVIGATION - KUMULATIV
// ============================================================================
//
// Employee:        Mein Status | Meine Zeiterfassung
// Project Leader:  + Meine Projekte | Zeiterfassung | Berichte
// Client Admin:    + Mitarbeiter | Firmendaten
//

const NAV_FIRMA_BASE: NavItem[] = [
  { key: 'mein-status',         label: 'Mein Status',         href: '/v7/firma/mein-status',    icon: <BarChart3 size={18} /> },
  { key: 'meine-zeiterfassung', label: 'Meine Zeiterfassung', href: '/v7/firma/zeiterfassung',  icon: <Clock size={18} /> },
];

const NAV_FIRMA_PL_EXTRAS: NavItem[] = [
  { key: 'meine-projekte', label: 'Meine Projekte', href: '/v7/firma/projekte',  icon: <FolderKanban size={18} /> },
  { key: 'berichte',       label: 'Berichte',        href: '/v7/firma/berichte', icon: <BarChart3 size={18} /> },
];

const NAV_FIRMA_ADMIN_EXTRAS: NavItem[] = [
  { key: 'mitarbeiter', label: 'Mitarbeiter', href: '/v7/firma/mitarbeiter',  icon: <Users size={18} /> },
  { key: 'firmendaten', label: 'Firmendaten', href: '/v7/firma/firmendaten',  icon: <Building2 size={18} /> },
];

// ============================================================================
// HILFSFUNKTIONEN
// ============================================================================

function getNavItems(
  portal: PortalType,
  userRole: string,
  portalRole?: string
): NavItem[] {
  if (portal === 'berater') {
    const items = [...NAV_BERATER];
    if (userRole === 'system_admin') {
      items.push(...NAV_BERATER_ADMIN);
    }
    return items;
  }

  // Firmen-Portal: Kumulative Navigation
  const effectiveRole = (userRole === 'client_admin' || portalRole === 'client_admin')
    ? 'client_admin'
    : (portalRole || 'employee');

  const items = [...NAV_FIRMA_BASE];

  if (effectiveRole === 'project_leader' || effectiveRole === 'client_admin') {
    items.push(...NAV_FIRMA_PL_EXTRAS);
  }

  if (effectiveRole === 'client_admin') {
    items.push(...NAV_FIRMA_ADMIN_EXTRAS);
  }

  return items;
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
    <nav className="bg-white border-b border-gray-200 shadow-sm print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center space-x-1 overflow-x-auto py-1 -mb-px">
          {navItems.map((item) => {
            const isActive = isActiveLink(item.href, currentPath);

            return (
              <Link
                key={item.key}
                href={item.href}
                className={`
                  flex items-center space-x-2 px-4 py-3 text-sm font-medium
                  border-b-2 transition-colors duration-150 whitespace-nowrap
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
