'use client';

// src/components/shared/PortalNav.tsx
// ============================================================================
// PZE V7 - Portal-Navigation (unterhalb Header)
// ============================================================================
// Datum: 03. Februar 2026
// Version: 7.3.86-3
//
// Navigationszeile unter dem Header:
// - Rollenbasierte Menuepunkte
// - Aktiver Punkt hervorgehoben
// - Responsive (Mobile: horizontal scrollbar)
//
// v7.3.86-3: Umlaute korrigiert (Foerderung -> Förderung)
// ============================================================================

import Link from 'next/link';
import {
  Building2,
  FolderKanban,
  Users,
  Clock,
  BarChart3,
  Upload,
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
  { key: 'foerderung', label: 'Förderung', href: '/v7/berater/foerderung', icon: <Building2 size={18} /> },
  { key: 'import', label: 'Import', href: '/v7/berater/import', icon: <Upload size={18} /> },
  { key: 'berichte', label: 'Berichte', href: '/v7/berater/berichte', icon: <BarChart3 size={18} /> },
];

const NAV_BERATER_ADMIN: NavItem[] = [
  { key: 'admin', label: 'Administration', href: '/v7/berater/admin', icon: <Settings size={18} /> },
];

// Firmen-Portal Navigation fuer client_admin (Geschaeftsfuehrer)
const NAV_FIRMA_ADMIN: NavItem[] = [
  { key: 'firmendaten', label: 'Firmendaten', href: '/v7/firma/firmendaten', icon: <Building2 size={18} /> },
  { key: 'projekte', label: 'Projekte', href: '/v7/firma/projekte', icon: <FolderKanban size={18} /> },
  { key: 'mitarbeiter', label: 'Mitarbeiter', href: '/v7/firma/mitarbeiter', icon: <Users size={18} /> },
  { key: 'zeiterfassung', label: 'Zeiterfassung', href: '/v7/firma/zeiterfassung', icon: <Clock size={18} /> },
  { key: 'berichte', label: 'Berichte', href: '/v7/firma/berichte', icon: <BarChart3 size={18} /> },
];

// Firmen-Portal Navigation fuer project_leader (Projektleiter)
const NAV_FIRMA_PROJECT_LEADER: NavItem[] = [
  { key: 'meine-projekte', label: 'Meine Projekte', href: '/v7/firma/meine-projekte', icon: <FolderKanban size={18} /> },
  { key: 'zeiterfassung', label: 'Zeiterfassung', href: '/v7/firma/zeiterfassung', icon: <Clock size={18} /> },
  { key: 'mein-status', label: 'Mein Status', href: '/v7/firma/mein-status', icon: <BarChart3 size={18} /> },
];

// Firmen-Portal Navigation fuer employee (Mitarbeiter)
const NAV_FIRMA_EMPLOYEE: NavItem[] = [
  { key: 'meine-projekte', label: 'Meine Projekte', href: '/v7/firma/meine-projekte', icon: <FolderKanban size={18} /> },
  { key: 'meine-zeiterfassung', label: 'Meine Zeiterfassung', href: '/v7/firma/meine-zeiterfassung', icon: <Clock size={18} /> },
  { key: 'mein-status', label: 'Mein Status', href: '/v7/firma/mein-status', icon: <BarChart3 size={18} /> },
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
    // Berater-Portal
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
  // Exakte Uebereinstimmung oder Unterseite
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
    <nav className="bg-white border-b border-gray-200 shadow-sm">
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
                    ? `border-current text-green-600`
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
