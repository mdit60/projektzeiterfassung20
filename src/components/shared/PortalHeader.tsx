'use client';

// src/components/shared/PortalHeader.tsx
// ============================================================================
// PZE V7 - Gemeinsamer Portal-Header
// ============================================================================
// Datum: 21. Januar 2026
// Version: 7.3.42
//
// Wird von beiden Portalen genutzt:
// - Berater-Portal: Blauer Header (#0369a1)
// - Firmen-Portal: Gruener Header (#65A655)
// ============================================================================

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  LayoutDashboard,
  Building2,
  FolderKanban,
  Users,
  Clock,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Upload,
  User,
  FileText,
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

interface PortalHeaderProps {
  portal: V7PortalType;
  userRole: V7UserRole;
  portalRole?: V7EmployeePortalRole;
  userName: string;
  userEmail: string;
  companyName?: string;
  companyLogo?: string | null;
  currentPath?: string;
  hideNavigation?: boolean;  // NEU: Navigation ausblenden (z.B. auf Firmen-Detailseiten)
}

// ============================================================================
// NAVIGATION KONFIGURATION
// ============================================================================

const NAV_BERATER: NavItem[] = [
  { key: 'foerderung', label: 'Foerderung', href: '/v7/berater/foerderung', icon: <Building2 size={18} /> },
  { key: 'import', label: 'Import', href: '/v7/berater/import', icon: <Upload size={18} /> },
  { key: 'berichte', label: 'Berichte', href: '/v7/berater/berichte', icon: <BarChart3 size={18} /> },
];

const NAV_BERATER_ADMIN: NavItem[] = [
  { key: 'admin', label: 'Administration', href: '/v7/berater/admin', icon: <Settings size={18} /> },
];

// Navigation fuer client_admin (Geschaeftsfuehrer)
const NAV_FIRMA_ADMIN: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', href: '/v7/firma/dashboard', icon: <LayoutDashboard size={18} /> },
  { key: 'firmendaten', label: 'Firmendaten', href: '/v7/firma/firmendaten', icon: <Building2 size={18} /> },
  { key: 'projekte', label: 'Projekte', href: '/v7/firma/projekte', icon: <FolderKanban size={18} /> },
  { key: 'mitarbeiter', label: 'Mitarbeiter', href: '/v7/firma/mitarbeiter', icon: <Users size={18} /> },
  { key: 'zeiterfassung', label: 'Zeiterfassung', href: '/v7/firma/zeiterfassung', icon: <Clock size={18} /> },
  { key: 'berichte', label: 'Berichte', href: '/v7/firma/berichte', icon: <BarChart3 size={18} /> },
];

// Navigation fuer project_leader (Projektleiter)
const NAV_FIRMA_PROJECT_LEADER: NavItem[] = [
  { key: 'meine-projekte', label: 'Meine Projekte', href: '/v7/firma/meine-projekte', icon: <FolderKanban size={18} /> },
  { key: 'zeiterfassung', label: 'Zeiterfassung', href: '/v7/firma/zeiterfassung', icon: <Clock size={18} /> },
  { key: 'mein-status', label: 'Mein Status', href: '/v7/firma/mein-status', icon: <BarChart3 size={18} /> },
];

// Navigation fuer employee (Mitarbeiter)
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const colors = PORTAL_COLORS[portal];
  const navItems = hideNavigation ? [] : getNavItems(portal, userRole, portalRole);

  // Logout-Handler
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  // Portal-Titel
  const portalTitle = portal === 'berater' ? 'Berater-Portal' : 'Firmen-Portal';

  return (
    <header
      className={`${colors.headerBg} text-white shadow-lg`}
      style={{ backgroundColor: colors.primary }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo / Firmenname */}
          <div className="flex items-center space-x-4">
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
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className={`
                  flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium
                  transition-colors duration-150
                  ${isActiveLink(item.href, currentPath)
                    ? 'bg-white/20 text-white'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                  }
                `}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>

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
                      <p className="text-xs text-gray-500 truncate">{userEmail}</p>
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

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-md hover:bg-white/10"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-white/20">
          <div className="px-4 py-3 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`
                  flex items-center space-x-3 px-3 py-2 rounded-md text-base
                  ${isActiveLink(item.href, currentPath)
                    ? 'bg-white/20 text-white'
                    : 'text-white/80 hover:bg-white/10'
                  }
                `}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}

// ============================================================================
// ENDE
// ============================================================================
