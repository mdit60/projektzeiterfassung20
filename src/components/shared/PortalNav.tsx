'use client';

// src/components/shared/PortalNav.tsx
// ============================================================================
// PZE V7 - Portal-Navigation
// ============================================================================
// Datum: 24. April 2026
// Version: 7.4.4-3
//
// v7.4.4-3: Berater-Nav kontextsensitiv: aktive Seite wird ausgeblendet.
//           Neue Links: Kundenfirmen, Netzwerk, Kapazitaetsplanung.
//           usePathname() intern — kein currentPath-Prop mehr noetig.
//           Administration bleibt immer ganz rechts (nur system_admin).
// v7.4.4-2: Administration-Link ganz rechts (ml-auto)
// v7.4.4-1: Kunden + Berichte aus Berater-Nav entfernt (Schnellzugriff im Dashboard)
// v7.3.95-2: "Import" aus Berater-Navigation entfernt
// v7.3.95: print:hidden hinzugefuegt
// v7.3.92: Kumulative Rollen, Employee/PL/Admin-Navigation
// ============================================================================

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  Building2,
  Clock,
  FolderKanban,
  Settings,
  Users,
  Network,
} from 'lucide-react';

// ============================================================================
// TYPEN
// ============================================================================

type PortalType = 'berater' | 'firma';
type UserRole = 'system_admin' | 'consultant' | 'client_user';
type PortalRole = 'client_admin' | 'project_leader' | 'employee';

interface NavItem {
  key: string;
  label: string;
  href: string;
  icon: React.ReactNode;
  isAdmin?: boolean;
}

interface PortalNavProps {
  portal: PortalType;
  userRole: UserRole | string;
  portalRole?: PortalRole | string;
  currentPath?: string; // bleibt fuer Abwaertskompatibilitaet, wird nicht mehr benoetigt
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
// Alle vier Hauptbereiche + Administration ganz rechts.
// Aktive Seite wird ausgeblendet (kontextsensitiv).
// ============================================================================

const NAV_BERATER: NavItem[] = [
  { key: 'timesheets',   label: 'Zeiterfassungen',   href: '/v7/berater/timesheets',   icon: <Clock size={18} /> },
  { key: 'foerderung',   label: 'Kundenfirmen',       href: '/v7/berater/foerderung',   icon: <Building2 size={18} /> },
  { key: 'netzwerk',     label: 'Netzwerk',           href: '/v7/berater/netzwerk',     icon: <Network size={18} /> },
  { key: 'multiprojekt', label: 'Kapazitaetsplanung', href: '/v7/berater/multiprojekt', icon: <BarChart3 size={18} /> },
  { key: 'admin',        label: 'Administration',     href: '/v7/berater/admin',        icon: <Settings size={18} />, isAdmin: true },
];

// ============================================================================
// FIRMEN-PORTAL NAVIGATION - KUMULATIV
// ============================================================================

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
    return NAV_BERATER.filter(item => {
      if (item.isAdmin) return userRole === 'system_admin';
      return true;
    });
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

// ============================================================================
// KOMPONENTE
// ============================================================================

export default function PortalNav({
  portal,
  userRole,
  portalRole,
}: PortalNavProps) {
  const colors = PORTAL_COLORS[portal];
  const pathname = usePathname();
  const navItems = getNavItems(portal, userRole, portalRole);

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center overflow-x-auto py-1 -mb-px">
          {navItems.map((item) => {
            // Aktive Seite ausblenden (kontextsensitiv) -- nur im Berater-Portal
            if (portal === 'berater' && pathname && pathname.startsWith(item.href)) {
              return null;
            }

            const isActive = pathname
              ? pathname === item.href || pathname.startsWith(item.href + '/')
              : false;

            return (
              <Link
                key={item.key}
                href={item.href}
                className={[
                  'flex items-center space-x-2 px-4 py-3 text-sm font-medium',
                  'border-b-2 transition-colors duration-150 whitespace-nowrap',
                  item.isAdmin ? 'ml-auto' : '',
                  isActive
                    ? 'border-current'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300',
                ].join(' ')}
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
