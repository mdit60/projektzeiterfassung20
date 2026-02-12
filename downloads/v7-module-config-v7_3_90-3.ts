// src/lib/v7-module-config.ts
// ============================================================================
// PZE V7 - Modul-Konfiguration
// ============================================================================
// Datum: 12. Februar 2026
// Version: 7.3.90-3
//
// v7.3.90-3: Rollenfix: project_leader sieht Projekte + Berichte
// v7.3.90-2: Verstaendliche Modulnamen, Rollen-Filter
//
// Zentrale Definition aller PZE-Module.
//
// ROLLEN-MATRIX (Firmen-Portal):
//
//   Modul              | client_admin | project_leader | employee
//   -------------------|:------------:|:--------------:|:--------:
//   Projekte           |     Ja       |      Ja        |   Nein
//   Zeiterfassung      |     Ja       |      Ja        |    Ja
//   Berichte           |     Ja       |      Ja        |   Nein
//   ZA, VN, AGVO, DM   |     Ja       |     Nein       |   Nein
//
// ============================================================================

import { V7PortalType, V7UserRole, V7EmployeePortalRole } from '@/types/v7-types';

// ============================================================================
// MODUL-STATUS
// ============================================================================

export type V7ModuleStatus = 'active' | 'coming_soon' | 'hidden';

// ============================================================================
// MODUL-KATEGORIE
// ============================================================================

export type V7ModuleCategory = 'kundenmodul' | 'beraterwerkzeug';

// ============================================================================
// MODUL-ID
// ============================================================================

export type V7ModuleId =
  | 'projekte'
  | 'zeiterfassung'
  | 'zahlungsanforderung'
  | 'verwendungsnachweis'
  | 'agvo_bwa'
  | 'deminimis'
  | 'netzwerk'
  | 'multiprojekt'
  | 'fzul'
  | 'berichte';

// ============================================================================
// MODUL-DEFINITION
// ============================================================================

export interface V7ModulePortalConfig {
  visible: boolean;
  status: V7ModuleStatus;
  href: string;
  roles: V7UserRole[];
  portalRoles?: V7EmployeePortalRole[];
  description: string;
  plannedRelease?: string;
}

export interface V7ModuleDefinition {
  id: V7ModuleId;
  name: string;
  icon: string;
  category: V7ModuleCategory;
  sortOrder: number;
  berater: V7ModulePortalConfig;
  firma: V7ModulePortalConfig;
}

// ============================================================================
// MODUL-DEFINITIONEN
// ============================================================================

export const V7_MODULES: V7ModuleDefinition[] = [
  // ========================================================================
  // KUNDENMODULE (im Firmenkontext, beide Portale)
  // ========================================================================
  {
    id: 'projekte',
    name: 'Projekte',
    icon: 'FolderKanban',
    category: 'kundenmodul',
    sortOrder: 1,
    berater: {
      visible: true,
      status: 'active',
      href: '',
      roles: ['system_admin', 'consultant'],
      description: 'Foerderprojekte und Arbeitspakete verwalten',
    },
    firma: {
      visible: true,
      status: 'active',
      href: '/v7/firma/projekte',
      roles: ['client_admin', 'client_user'],
      portalRoles: ['client_admin', 'project_leader'],
      description: 'Foerderprojekte und Arbeitspakete',
    },
  },
  {
    id: 'zeiterfassung',
    name: 'Zeiterfassung',
    icon: 'Clock',
    category: 'kundenmodul',
    sortOrder: 2,
    berater: {
      visible: true,
      status: 'active',
      href: '',
      roles: ['system_admin', 'consultant'],
      description: 'Stundennachweise pruefen und freigeben',
    },
    firma: {
      visible: true,
      status: 'active',
      href: '/v7/firma/zeiterfassung',
      roles: ['client_admin', 'client_user'],
      portalRoles: ['client_admin', 'project_leader', 'employee'],
      description: 'Stunden erfassen und Nachweise erstellen',
    },
  },
  {
    id: 'zahlungsanforderung',
    name: 'Zahlungsanforderung',
    icon: 'Receipt',
    category: 'kundenmodul',
    sortOrder: 3,
    berater: {
      visible: true,
      status: 'coming_soon',
      href: '',
      roles: ['system_admin', 'consultant'],
      description: 'Zahlungsanforderungen fuer Projekttraeger erstellen',
      plannedRelease: 'Q2/2026',
    },
    firma: {
      visible: true,
      status: 'coming_soon',
      href: '',
      roles: ['client_admin'],
      portalRoles: ['client_admin'],
      description: 'Zahlungsanforderungen einsehen und freigeben',
      plannedRelease: 'Q2/2026',
    },
  },
  {
    id: 'verwendungsnachweis',
    name: 'Verwendungsnachweis',
    icon: 'FileCheck',
    category: 'kundenmodul',
    sortOrder: 4,
    berater: {
      visible: true,
      status: 'coming_soon',
      href: '',
      roles: ['system_admin', 'consultant'],
      description: 'Zahlungsmaessige und sachliche Nachweise',
      plannedRelease: 'Q3/2026',
    },
    firma: {
      visible: true,
      status: 'coming_soon',
      href: '',
      roles: ['client_admin'],
      portalRoles: ['client_admin'],
      description: 'Belege und Dokumente bereitstellen',
      plannedRelease: 'Q3/2026',
    },
  },
  {
    id: 'agvo_bwa',
    name: 'AGVO / BWA',
    icon: 'Scale',
    category: 'kundenmodul',
    sortOrder: 5,
    berater: {
      visible: true,
      status: 'coming_soon',
      href: '',
      roles: ['system_admin', 'consultant'],
      description: 'Beihilfeberechnung und BWA-Analyse',
      plannedRelease: 'Q3/2026',
    },
    firma: {
      visible: true,
      status: 'coming_soon',
      href: '',
      roles: ['client_admin'],
      portalRoles: ['client_admin'],
      description: 'BWA-Daten fuer die Beihilfeberechnung liefern',
      plannedRelease: 'Q3/2026',
    },
  },
  {
    id: 'deminimis',
    name: 'De-Minimis Beihilfen',
    icon: 'Calculator',
    category: 'kundenmodul',
    sortOrder: 6,
    berater: {
      visible: true,
      status: 'coming_soon',
      href: '',
      roles: ['system_admin', 'consultant'],
      description: 'Beihilfe-Pruefung und Restfoerderfaehigkeit',
      plannedRelease: 'Q3/2026',
    },
    firma: {
      visible: true,
      status: 'coming_soon',
      href: '',
      roles: ['client_admin'],
      portalRoles: ['client_admin'],
      description: 'Bescheide erfassen, Restfoerderfaehigkeit pruefen',
      plannedRelease: 'Q3/2026',
    },
  },

  // ========================================================================
  // UEBERGREIFEND
  // ========================================================================
  {
    id: 'berichte',
    name: 'Berichte',
    icon: 'BarChart3',
    category: 'kundenmodul',
    sortOrder: 10,
    berater: {
      visible: true,
      status: 'active',
      href: '/v7/berater/berichte',
      roles: ['system_admin', 'consultant'],
      description: 'Firmenuebergreifende Auswertungen',
    },
    firma: {
      visible: true,
      status: 'active',
      href: '/v7/firma/berichte',
      roles: ['client_admin', 'client_user'],
      portalRoles: ['client_admin', 'project_leader'],
      description: 'Projekt-Statistiken und MA-Auslastung',
    },
  },

  // ========================================================================
  // BERATER-WERKZEUGE (nur Berater-Portal, firmenuebergreifend)
  // ========================================================================
  {
    id: 'netzwerk',
    name: 'Netzwerkmanagement',
    icon: 'Network',
    category: 'beraterwerkzeug',
    sortOrder: 7,
    berater: {
      visible: true,
      status: 'coming_soon',
      href: '',
      roles: ['system_admin', 'consultant'],
      description: 'ZIM-Netzwerke, Mitglieder und Projekte verwalten',
      plannedRelease: 'Q4/2026',
    },
    firma: {
      visible: false,
      status: 'hidden',
      href: '',
      roles: [],
      description: '',
    },
  },
  {
    id: 'multiprojekt',
    name: 'Multiprojekt-Tool',
    icon: 'Layers',
    category: 'beraterwerkzeug',
    sortOrder: 8,
    berater: {
      visible: true,
      status: 'coming_soon',
      href: '',
      roles: ['system_admin', 'consultant'],
      description: '173h-Pruefung: MA-Abgrenzung ueber alle Projekte',
      plannedRelease: 'Q2/2026',
    },
    firma: {
      visible: false,
      status: 'hidden',
      href: '',
      roles: [],
      description: '',
    },
  },
  {
    id: 'fzul',
    name: 'Forschungszulage',
    icon: 'FlaskConical',
    category: 'beraterwerkzeug',
    sortOrder: 9,
    berater: {
      visible: true,
      status: 'coming_soon',
      href: '',
      roles: ['system_admin', 'consultant'],
      description: 'Verfuegbare FuE-Kapazitaeten fuer FZul-Antraege ermitteln',
      plannedRelease: 'Q2/2026',
    },
    firma: {
      visible: false,
      status: 'hidden',
      href: '',
      roles: [],
      description: '',
    },
  },
];

// ============================================================================
// HILFSFUNKTIONEN
// ============================================================================

/**
 * Gibt die sichtbaren Module eines Portals zurueck, gefiltert nach Rolle.
 */
export function getVisibleModules(
  portal: V7PortalType,
  userRole: V7UserRole,
  portalRole?: V7EmployeePortalRole
): V7ModuleDefinition[] {
  return V7_MODULES
    .filter((mod) => {
      const config = mod[portal];
      if (!config.visible) return false;
      if (config.status === 'hidden') return false;
      if (!config.roles.includes(userRole)) return false;

      // Portal-Rollen-Check (nur Firmen-Portal)
      if (portal === 'firma' && config.portalRoles && portalRole) {
        if (!config.portalRoles.includes(portalRole)) return false;
      }

      return true;
    })
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * Gibt nur Kundenmodule zurueck (fuer Firmen-Dashboard)
 */
export function getKundenmodule(
  portal: V7PortalType,
  userRole: V7UserRole,
  portalRole?: V7EmployeePortalRole
): V7ModuleDefinition[] {
  return getVisibleModules(portal, userRole, portalRole)
    .filter((m) => m.category === 'kundenmodul');
}

/**
 * Gibt nur Berater-Werkzeuge zurueck (fuer Berater-Dashboard unten)
 */
export function getBeraterWerkzeuge(
  userRole: V7UserRole
): V7ModuleDefinition[] {
  return getVisibleModules('berater', userRole)
    .filter((m) => m.category === 'beraterwerkzeug');
}

/**
 * Gibt ein einzelnes Modul per ID zurueck
 */
export function getModuleById(id: V7ModuleId): V7ModuleDefinition | undefined {
  return V7_MODULES.find((mod) => mod.id === id);
}

// ============================================================================
// ENDE
// ============================================================================
