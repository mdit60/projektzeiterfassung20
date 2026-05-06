'use client';

// src/components/shared/PortalNav.tsx
// ============================================================================
// PZE V7 - Portal-Navigation
// ============================================================================
// Version: 7.4.4-12
// v7.4.4-12: Berater-Nav: "Zeiterfassungen" entfernt (fuehrt zu 404, kein
//   sinnvoller Anwendungsfall im Berater-Portal)
// v7.4.4-10: Dateinamen ohne Versionsnummer (stabile URLs, kein Code-Deploy bei neuem PDF)
// v7.4.4-9: Anleitungen-Download steuerbar ueber v7_system_config
//   - manuals_enabled aus Supabase gelesen (key='manuals_enabled')
//   - true  -> rollenabhaengige PDF-Links sichtbar
//   - false -> "Wird aktualisiert"-Hinweis wie bisher
//   - Default-State false (sicher: kein defekter Link beim Laden)
// v7.4.4-8: Anleitungen vorerst gesperrt (hardcoded)
// v7.4.4-7: FIX Hilfe-Dropdown sichtbar
// v7.4.4-5: Hilfe-Dropdown + MA-Navigation vereinfacht
// v7.4.4-4: Kundenfirmen-Link immer sichtbar im Berater-Portal
// v7.4.4-3: Berater-Nav kontextsensitiv
// ============================================================================

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  BarChart3,
  Building2,
  Clock,
  FolderKanban,
  Settings,
  Users,
  Network,
  HelpCircle,
  Download,
  Mail,
  ChevronDown,
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

// ============================================================================
// PORTAL-FARBEN
// ============================================================================

const PORTAL_COLORS = {
  berater: { primary: '#002451', hover: '#001a3a' },
  firma:   { primary: '#65A655', hover: '#4d8a3f' },
};

// ============================================================================
// BERATER-NAVIGATION
// ============================================================================

const NAV_BERATER: NavItem[] = [
  { key: 'foerderung',    label: 'Kundenfirmen',       href: '/v7/berater/foerderung',    icon: <Building2 size={18} /> },
  { key: 'netzwerk',      label: 'Netzwerk',           href: '/v7/berater/netzwerk',      icon: <Network size={18} /> },
  { key: 'multiprojekt',  label: 'Kapazitaetsplanung', href: '/v7/berater/multiprojekt',  icon: <BarChart3 size={18} /> },
  { key: 'admin',         label: 'Administration',     href: '/v7/berater/admin',         icon: <Settings size={18} />, isAdmin: true },
];

// ============================================================================
// FIRMEN-PORTAL NAVIGATION - KUMULATIV
// ============================================================================

const NAV_FIRMA_PL_BASE: NavItem[] = [
  { key: 'mein-status',         label: 'Mein Status',         href: '/v7/firma/mein-status',   icon: <BarChart3 size={18} /> },
  { key: 'meine-zeiterfassung', label: 'Meine Zeiterfassung', href: '/v7/firma/zeiterfassung', icon: <Clock size={18} /> },
];

const NAV_FIRMA_PL_EXTRAS: NavItem[] = [
  { key: 'meine-projekte', label: 'Meine Projekte', href: '/v7/firma/projekte',  icon: <FolderKanban size={18} /> },
  { key: 'berichte',       label: 'Berichte',       href: '/v7/firma/berichte',  icon: <BarChart3 size={18} /> },
];

const NAV_FIRMA_ADMIN_EXTRAS: NavItem[] = [
  { key: 'mitarbeiter', label: 'Mitarbeiter', href: '/v7/firma/mitarbeiter', icon: <Users size={18} /> },
  { key: 'firmendaten', label: 'Firmendaten', href: '/v7/firma/firmendaten', icon: <Building2 size={18} /> },
];

// ============================================================================
// MANUAL-PFADE je Rolle
// ============================================================================

// Mitarbeiter (employee) hat keine eigene Anleitung - nur FAQ (immer sichtbar)
const MANUAL_BY_ROLE: Record<string, { label: string; href: string }> = {
  client_admin:   { label: 'Anleitung Firmen-Administrator', href: '/manuals/PZE-Anleitung-Firmen-Administrator.pdf' },
  project_leader: { label: 'Anleitung Projektleiter',        href: '/manuals/PZE-Anleitung-Projektleiter.pdf' },
};

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

  if (effectiveRole === 'employee') return [];

  const items = [...NAV_FIRMA_PL_BASE];
  if (effectiveRole === 'project_leader' || effectiveRole === 'client_admin') {
    items.push(...NAV_FIRMA_PL_EXTRAS);
  }
  if (effectiveRole === 'client_admin') {
    items.push(...NAV_FIRMA_ADMIN_EXTRAS);
  }
  return items;
}

// ============================================================================
// HILFE-DROPDOWN KOMPONENTE
// ============================================================================

function HilfeDropdown({
  portalRole,
  primaryColor,
  manualsEnabled,
}: {
  portalRole: string;
  primaryColor: string;
  manualsEnabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const manual = MANUAL_BY_ROLE[portalRole] ?? null;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative ml-auto">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-4 py-3 text-sm font-medium text-gray-600 hover:text-gray-900 border-b-2 border-transparent hover:border-gray-300 transition-colors whitespace-nowrap"
      >
        <HelpCircle size={18} />
        <span>Hilfe</span>
        <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-xl z-[200] py-1">

          {/* Benutzerhandbuch -- nur wenn Rolle eine Anleitung hat */}
          {manual && (
            manualsEnabled ? (
              <a
                href={manual.href}
                download
                onClick={() => setOpen(false)}
                className="flex items-start gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors"
              >
                <span className="text-gray-400 mt-0.5 shrink-0"><Download size={14} /></span>
                <span className="flex flex-col min-w-0">
                  <span className="text-sm font-medium text-gray-800">{manual.label}</span>
                  <span className="text-xs text-gray-500">als PDF herunterladen</span>
                </span>
              </a>
            ) : (
              <div className="px-4 py-2.5 border-b border-gray-100">
                <div className="flex items-start gap-3">
                  <span className="text-amber-400 mt-0.5 shrink-0">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="12" y1="8" x2="12" y2="12"/>
                      <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                  </span>
                  <span className="flex flex-col min-w-0">
                    <span className="text-sm font-medium text-gray-700">Benutzerhandbuch</span>
                    <span className="text-xs text-amber-600">Wird aktualisiert -- in Kuerze wieder verfuegbar</span>
                  </span>
                </div>
              </div>
            )
          )}

          {/* FAQ Zeiterfassung -- immer verfuegbar */}
          <a
            href="/manuals/PZE-FAQ-Zeiterfassung-v1.pdf"
            download
            onClick={() => setOpen(false)}
            className="flex items-start gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors"
          >
            <span className="text-gray-400 mt-0.5 shrink-0"><Download size={14} /></span>
            <span className="flex flex-col min-w-0">
              <span className="text-sm font-medium text-gray-800">FAQ Zeiterfassung</span>
              <span className="text-xs text-gray-500">als PDF herunterladen</span>
            </span>
          </a>

          {/* Trennlinie + Kontakt */}
          <div className="my-1 border-t border-gray-100" />
          <a
            href="mailto:m.ditscherlein@cubintec.com"
            onClick={() => setOpen(false)}
            className="flex items-start gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors"
          >
            <span className="text-gray-400 mt-0.5 shrink-0"><Mail size={14} /></span>
            <span className="flex flex-col min-w-0">
              <span className="text-sm font-medium text-gray-800">Kontakt & Support</span>
              <span className="text-xs text-gray-500">Cubintec GmbH</span>
            </span>
          </a>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// HAUPTKOMPONENTE
// ============================================================================

export default function PortalNav({
  portal,
  userRole,
  portalRole,
}: {
  portal: PortalType;
  userRole: string;
  portalRole?: string;
}) {
  const colors = PORTAL_COLORS[portal];
  const pathname = usePathname();
  const navItems = getNavItems(portal, userRole, portalRole);

  const effectiveRole = (userRole === 'client_admin' || portalRole === 'client_admin')
    ? 'client_admin'
    : (portalRole || 'employee');

  const showHilfe = portal === 'firma';

  // -- manuals_enabled aus v7_system_config ----------------------------------
  const [manualsEnabled, setManualsEnabled] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('v7_system_config')
      .select('value')
      .eq('key', 'manuals_enabled')
      .single()
      .then(({ data }) => {
        if (data?.value === 'true') setManualsEnabled(true);
      });
  }, []);

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center py-1 -mb-px overflow-visible">
          {navItems.map((item) => {
            if (portal === 'berater' && pathname) {
              if (item.key === 'foerderung') {
                if (pathname === '/v7/berater/foerderung') return null;
              } else {
                if (pathname.startsWith(item.href)) return null;
              }
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

          {showHilfe && (
            <HilfeDropdown
              portalRole={effectiveRole}
              primaryColor={colors.primary}
              manualsEnabled={manualsEnabled}
            />
          )}
        </div>
      </div>
    </nav>
  );
}

// ============================================================================
// ENDE
// ============================================================================
