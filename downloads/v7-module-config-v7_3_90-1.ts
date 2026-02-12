// src/lib/v7-module-config.ts
// ============================================================================
// PZE V7 - Modul-Konfiguration
// ============================================================================
// Datum: 10. Februar 2026
// Version: 7.3.90-1
//
// Zentrale Definition aller PZE-Module fuer das Kachel-Dashboard.
// Bestimmt welche Module in welchem Portal sichtbar sind,
// welchen Status sie haben (aktiv/coming-soon) und wohin sie verlinken.
//
// Architektur-Prinzip:
//   - Module sind die zentrale UI-Einheit
//   - Beide Portale (Berater/Firma) nutzen dieselbe Modul-Liste
//   - Sichtbarkeit wird per Portal und Rolle gesteuert
//   - Status steuert ob Kachel klickbar oder "Demnaechst" ist
// ============================================================================

import { V7PortalType, V7UserRole, V7EmployeePortalRole } from '@/types/v7-types';

// ============================================================================
// MODUL-STATUS
// ============================================================================

/**
 * Status eines Moduls
 * - active: Modul ist implementiert und nutzbar (Kachel klickbar)
 * - coming_soon: Modul geplant, Kachel sichtbar aber nicht klickbar
 * - hidden: Modul nicht sichtbar (fuer spaetere Erweiterungen)
 */
export type V7ModuleStatus = 'active' | 'coming_soon' | 'hidden';

// ============================================================================
// MODUL-PHASE
// ============================================================================

/**
 * Phasen-Zuordnung (Phase 1 = Pflicht, Phase 2 = Zusatz)
 */
export type V7ModulePhase = 1 | 2;

// ============================================================================
// MODUL-ID
// ============================================================================

/**
 * Eindeutige Modul-IDs
 */
export type V7ModuleId =
  // Phase 1 - Pflichtmodule
  | 'projekt'
  | 'arbeitszeit'
  | 'zahlungsanforderung'
  | 'verwendungsnachweis'
  | 'agvo_bwa'
  // Phase 2 - Zusatzmodule
  | 'multiprojekt'
  | 'deminimis'
  | 'netzwerk'
  | 'fzul'
  // Uebergreifend
  | 'berichte';

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
  /** Ziel-Route wenn aktiv (Portal-Prefix wird automatisch ergaenzt) */
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
  /** Anzeigename */
  name: string;
  /** Untertitel / Kurzbeschreibung */
  subtitle: string;
  /** Lucide-Icon-Name */
  icon: string;
  /** Phase (1 = Pflicht, 2 = Zusatz) */
  phase: V7ModulePhase;
  /** Sortierung innerhalb der Phase */
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
  // PHASE 1 - PFLICHTMODULE
  // ========================================================================
  {
    id: 'projekt',
    name: 'Projektmodul',
    subtitle: 'Projekte, Arbeitspakete, Teams',
    icon: 'FolderKanban',
    phase: 1,
    sortOrder: 1,
    berater: {
      visible: true,
      status: 'active',
      href: '/v7/berater/foerderung',
      roles: ['system_admin', 'consultant'],
      description: 'Alle Firmen und Projekte verwalten',
    },
    firma: {
      visible: true,
      status: 'active',
      href: '/v7/firma/projekte',
      roles: ['client_admin', 'client_user'],
      portalRoles: ['client_admin', 'project_leader', 'employee'],
      description: 'Eigene Projekte und Mitarbeiter',
    },
  },
  {
    id: 'arbeitszeit',
    name: 'Arbeitszeitmodul',
    subtitle: 'Zeiterfassung, Stundennachweise',
    icon: 'Clock',
    phase: 1,
    sortOrder: 2,
    berater: {
      visible: true,
      status: 'active',
      href: '/v7/berater/foerderung',
      roles: ['system_admin', 'consultant'],
      description: 'Zeiterfassung aller Firmen pruefen',
    },
    firma: {
      visible: true,
      status: 'active',
      href: '/v7/firma/zeiterfassung',
      roles: ['client_admin', 'client_user'],
      portalRoles: ['client_admin', 'project_leader', 'employee'],
      description: 'Stunden erfassen und Nachweise drucken',
    },
  },
  {
    id: 'zahlungsanforderung',
    name: 'Zahlungsanforderung',
    subtitle: 'ZA erstellen und einreichen',
    icon: 'Receipt',
    phase: 1,
    sortOrder: 3,
    berater: {
      visible: true,
      status: 'coming_soon',
      href: '',
      roles: ['system_admin', 'consultant'],
      description: 'Zahlungsanforderungen fuer Projekttraeger',
      plannedRelease: 'Q2/2026',
    },
    firma: {
      visible: true,
      status: 'coming_soon',
      href: '',
      roles: ['client_admin', 'client_user'],
      portalRoles: ['client_admin'],
      description: 'Zahlungsanforderungen einsehen',
      plannedRelease: 'Q2/2026',
    },
  },
  {
    id: 'verwendungsnachweis',
    name: 'Verwendungsnachweis',
    subtitle: 'Zahlungsmaessiger & sachlicher Nachweis',
    icon: 'FileCheck',
    phase: 1,
    sortOrder: 4,
    berater: {
      visible: true,
      status: 'coming_soon',
      href: '',
      roles: ['system_admin', 'consultant'],
      description: 'Verwendungsnachweise erstellen',
      plannedRelease: 'Q3/2026',
    },
    firma: {
      visible: true,
      status: 'coming_soon',
      href: '',
      roles: ['client_admin', 'client_user'],
      portalRoles: ['client_admin'],
      description: 'Dokumente bereitstellen',
      plannedRelease: 'Q3/2026',
    },
  },
  {
    id: 'agvo_bwa',
    name: 'AGVO / BWA',
    subtitle: 'Beihilfeberechnung, BWA-Analyse',
    icon: 'Scale',
    phase: 1,
    sortOrder: 5,
    berater: {
      visible: true,
      status: 'coming_soon',
      href: '',
      roles: ['system_admin', 'consultant'],
      description: 'AGVO-Beihilfeberechnung und BWA-Analyse',
      plannedRelease: 'Q3/2026',
    },
    firma: {
      visible: true,
      status: 'coming_soon',
      href: '',
      roles: ['client_admin'],
      portalRoles: ['client_admin'],
      description: 'BWA-Daten bereitstellen',
      plannedRelease: 'Q3/2026',
    },
  },

  // ========================================================================
  // PHASE 2 - ZUSATZMODULE
  // ========================================================================
  {
    id: 'multiprojekt',
    name: 'Multiprojekt-Tool',
    subtitle: '173h-Pruefung, Ampellogik',
    icon: 'Layers',
    phase: 2,
    sortOrder: 6,
    berater: {
      visible: true,
      status: 'coming_soon',
      href: '',
      roles: ['system_admin', 'consultant'],
      description: 'MA-Abgrenzung ueber alle Firmen, keine Doppelvergabe',
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
    id: 'deminimis',
    name: 'De-minimis',
    subtitle: 'Restfoerderfaehigkeit berechnen',
    icon: 'Calculator',
    phase: 2,
    sortOrder: 7,
    berater: {
      visible: true,
      status: 'coming_soon',
      href: '',
      roles: ['system_admin', 'consultant'],
      description: 'Aggregierte Sicht, Pruefung pro Firma',
      plannedRelease: 'Q3/2026',
    },
    firma: {
      visible: true,
      status: 'coming_soon',
      href: '',
      roles: ['client_admin', 'client_user'],
      portalRoles: ['client_admin'],
      description: 'Bescheide erfassen, Restfoerderfaehigkeit sehen',
      plannedRelease: 'Q3/2026',
    },
  },
  {
    id: 'netzwerk',
    name: 'Netzwerkmanagement',
    subtitle: 'Netzwerkprojekte, Mitglieder',
    icon: 'Network',
    phase: 2,
    sortOrder: 8,
    berater: {
      visible: true,
      status: 'coming_soon',
      href: '',
      roles: ['system_admin', 'consultant'],
      description: 'Netzwerkprojekte und Mitglieder verwalten',
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
    id: 'fzul',
    name: 'FZul-Modul',
    subtitle: 'Forschungszulage, Kapazitaetsanalyse',
    icon: 'FlaskConical',
    phase: 2,
    sortOrder: 9,
    berater: {
      visible: true,
      status: 'coming_soon',
      href: '',
      roles: ['system_admin', 'consultant'],
      description: 'FZul-Analyse, Stundennachweis, PDF-Archiv',
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

  // ========================================================================
  // UEBERGREIFEND
  // ========================================================================
  {
    id: 'berichte',
    name: 'Berichte',
    subtitle: 'Statistiken und Auswertungen',
    icon: 'BarChart3',
    phase: 1,
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
];

// ============================================================================
// HILFSFUNKTIONEN
// ============================================================================

/**
 * Gibt die Module zurueck, die in einem bestimmten Portal sichtbar sind.
 * Filtert nach Portal, Rolle und Portal-Rolle.
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

      // Rollen-Check
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
 * Gibt ein einzelnes Modul per ID zurueck
 */
export function getModuleById(id: V7ModuleId): V7ModuleDefinition | undefined {
  return V7_MODULES.find((mod) => mod.id === id);
}

/**
 * Gibt die Portal-spezifische Konfiguration eines Moduls zurueck
 */
export function getModulePortalConfig(
  id: V7ModuleId,
  portal: V7PortalType
): V7ModulePortalConfig | undefined {
  const mod = getModuleById(id);
  if (!mod) return undefined;
  return mod[portal];
}

/**
 * Zaehlt aktive vs. geplante Module fuer ein Portal
 */
export function getModuleStats(
  portal: V7PortalType,
  userRole: V7UserRole,
  portalRole?: V7EmployeePortalRole
): { total: number; active: number; comingSoon: number } {
  const modules = getVisibleModules(portal, userRole, portalRole);
  const active = modules.filter((m) => m[portal].status === 'active').length;
  const comingSoon = modules.filter((m) => m[portal].status === 'coming_soon').length;
  return { total: modules.length, active, comingSoon };
}

// ============================================================================
// ENDE
// ============================================================================
