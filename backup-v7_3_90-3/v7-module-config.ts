// src/lib/v7-module-config.ts
// ============================================================================
// PZE V7 - Modul-Konfiguration
// ============================================================================
// Datum: 11. Februar 2026
// Version: 7.3.90-2
//
// Zentrale Definition aller PZE-Module.
//
// ARCHITEKTUR (gemaess Konzept-Skizze):
//
//   Berater-Dashboard
//   |-- Kundenverwaltung (Firmenkacheln -> Firmen-Detail-Seite)
//   |   Module im Firmenkontext:
//   |   - Projekte, Zeiterfassung, Zahlungsanforderung
//   |   - Verwendungsnachweis, AGVO/BWA, De-Minimis
//   |
//   +-- Berater-Werkzeuge (firmenuebergreifend)
//       - Netzwerkmanagement
//       - Multiprojekt-Tool (173h-Pruefung)
//       - FZul (basiert auf Multiprojekt-Ergebnissen)
//
//   Firmen-Dashboard
//   |-- Kunden-Admin: Sieht alle Module (Projekte bis De-Minimis)
//   +-- Kunden-User: Sieht NUR Zeiterfassung
//
//   Berichte: Kein eigenes Modul!
//   -> Auf Projektebene: Tab in Projekt-Detail
//   -> Auf Firmenebene: Tab in Firmen-Detail
//
// ============================================================================

import { V7PortalType, V7UserRole, V7EmployeePortalRole } from '@/types/v7-types';

// ============================================================================
// MODUL-STATUS
// ============================================================================

/**
 * Status eines Moduls
 * - active: Modul ist implementiert und nutzbar
 * - coming_soon: Modul geplant, Kachel sichtbar aber nicht klickbar
 * - hidden: Modul nicht sichtbar
 */
export type V7ModuleStatus = 'active' | 'coming_soon' | 'hidden';

// ============================================================================
// MODUL-KATEGORIE
// ============================================================================

/**
 * Kategorie bestimmt die Platzierung im Berater-Dashboard
 * - kundenmodul: Erscheint im Firmenkontext (Firmen-Detail-Seite)
 * - beraterwerkzeug: Erscheint unter "Berater-Werkzeuge" im Dashboard
 */
export type V7ModuleCategory = 'kundenmodul' | 'beraterwerkzeug';

// ============================================================================
// MODUL-ID
// ============================================================================

/**
 * Eindeutige Modul-IDs
 */
export type V7ModuleId =
  // Kundenmodule (beide Portale, im Firmenkontext)
  | 'projekte'
  | 'zeiterfassung'
  | 'zahlungsanforderung'
  | 'verwendungsnachweis'
  | 'agvo_bwa'
  | 'deminimis'
  // Berater-Werkzeuge (nur Berater-Portal, firmenuebergreifend)
  | 'netzwerk'
  | 'multiprojekt'
  | 'fzul';

// ============================================================================
// MODUL-DEFINITION
// ============================================================================

/**
 * Portal-spezifische Modul-Konfiguration
 */
export interface V7ModulePortalConfig {
  /** Ist dieses Modul in diesem Portal sichtbar? */
  visible: boolean;
  /** Status in diesem Portal */
  status: V7ModuleStatus;
  /** Ziel-Route wenn aktiv */
  href: string;
  /** Welche Login-Rollen sehen dieses Modul? */
  roles: V7UserRole[];
  /** Welche Portal-Rollen sehen dieses Modul? (nur Firmen-Portal) */
  portalRoles?: V7EmployeePortalRole[];
  /** Kurzbeschreibung fuer dieses Portal */
  description: string;
  /** Geplanter Zeitpunkt (nur bei coming_soon) */
  plannedRelease?: string;
}

/**
 * Vollstaendige Modul-Definition
 */
export interface V7ModuleDefinition {
  /** Eindeutige Modul-ID */
  id: V7ModuleId;
  /** Anzeigename fuer Benutzer */
  name: string;
  /** Lucide-Icon-Name */
  icon: string;
  /** Kategorie: Kundenmodul oder Berater-Werkzeug */
  category: V7ModuleCategory;
  /** Sortierung innerhalb der Kategorie */
  sortOrder: number;
  /** Portal-spezifische Konfiguration */
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
      href: '',  // Berater geht ueber Firmenkachel -> Firmen-Detail
      roles: ['system_admin', 'consultant'],
      description: 'Foerderprojekte und Arbeitspakete verwalten',
    },
    firma: {
      visible: true,
      status: 'active',
      href: '/v7/firma/projekte',
      roles: ['client_admin', 'client_user'],
      portalRoles: ['client_admin'],
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
      // ALLE Firmen-Rollen sehen Zeiterfassung!
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
