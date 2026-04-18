'use client';

// src/app/v7/firma/dashboard/page.tsx
// ============================================================================
// PZE V7 - Firmen-Dashboard (Modul-Kacheln)
// ============================================================================
// Datum: 10. Februar 2026
// Version: 7.3.90-1
//
// Dashboard fuer das Firmen-Portal mit Modul-Kacheln.
// Zeigt nur die Module, die fuer die jeweilige Firmen-Rolle sichtbar sind.
//
// Rollen-Verhalten:
// - client_admin: Sieht alle Firmen-Module
// - project_leader: Sieht Projektmodul, Arbeitszeit, Berichte
// - employee: Sieht Projektmodul (nur eigene), Arbeitszeit
//
// Header-Farbe: Immer gruen (#65A655) = "Ich bin Firmenmitarbeiter"
// ============================================================================

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import PortalHeader from '@/components/shared/PortalHeader';
import {
  FolderKanban,
  Clock,
  Receipt,
  FileCheck,
  Scale,
  Layers,
  Calculator,
  Network,
  FlaskConical,
  BarChart3,
  CheckCircle,
  CalendarClock,
  Loader2,
  Users,
  Building2,
} from 'lucide-react';

import {
  V7UserRole,
  V7EmployeePortalRole,
} from '@/types/v7-types';
import { PORTAL_COLORS } from '@/lib/v7-constants';
import {
  getVisibleModules,
  getModuleStats,
  V7ModuleDefinition,
} from '@/lib/v7-module-config';

// ============================================================================
// ICON-MAPPING
// ============================================================================

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  FolderKanban,
  Clock,
  Receipt,
  FileCheck,
  Scale,
  Layers,
  Calculator,
  Network,
  FlaskConical,
  BarChart3,
};

function getModuleIcon(iconName: string) {
  return ICON_MAP[iconName] || FolderKanban;
}

// ============================================================================
// KOMPONENTE
// ============================================================================

export default function FirmaDashboardPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState<V7UserRole>('client_admin');
  const [portalRole, setPortalRole] = useState<V7EmployeePortalRole>('client_admin');
  const [companyName, setCompanyName] = useState('');
  const [employeeCount, setEmployeeCount] = useState(0);
  const [projectCount, setProjectCount] = useState(0);

  const colors = PORTAL_COLORS.firma;

  // ==========================================================================
  // DATEN LADEN
  // ==========================================================================

  useEffect(() => {
    async function loadData() {
      try {
        // User laden
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login');
          return;
        }

        // Profil laden
        const { data: profile } = await supabase
          .from('v7_user_profiles')
          .select('display_name, first_name, last_name, role, client_company_id')
          .eq('id', user.id)
          .single();

        if (!profile) {
          router.push('/login');
          return;
        }

        const name = profile.display_name
          || [profile.first_name, profile.last_name].filter(Boolean).join(' ')
          || user.email
          || '';
        setUserName(name);
        setUserEmail(user.email || '');
        setUserRole((profile.role as V7UserRole) || 'client_admin');

        // Firma laden
        const companyId = profile.client_company_id;
        if (companyId) {
          const { data: company } = await supabase
            .from('v7_client_companies')
            .select('name')
            .eq('id', companyId)
            .single();

          if (company) {
            setCompanyName(company.name || '');
          }

          // Mitarbeiter-Anzahl
          const { count: eCount } = await supabase
            .from('v7_employees')
            .select('*', { count: 'exact', head: true })
            .eq('company_id', companyId);
          setEmployeeCount(eCount || 0);

          // Projekte-Anzahl
          const { count: pCount } = await supabase
            .from('v7_projects')
            .select('*', { count: 'exact', head: true })
            .eq('company_id', companyId);
          setProjectCount(pCount || 0);
        }

        // Portal-Rolle ermitteln (aus v7_employees)
        if (profile.role === 'client_admin') {
          setPortalRole('client_admin');
        } else if (profile.role === 'client_user' && companyId) {
          const { data: emp } = await supabase
            .from('v7_employees')
            .select('portal_role')
            .eq('user_id', user.id)
            .eq('company_id', companyId)
            .single();

          if (emp?.portal_role) {
            setPortalRole(emp.portal_role as V7EmployeePortalRole);
          }
        }

      } catch (err) {
        console.error('Dashboard-Fehler:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // ==========================================================================
  // MODULE FILTERN
  // ==========================================================================

  const visibleModules = getVisibleModules('firma', userRole, portalRole);
  const moduleStats = getModuleStats('firma', userRole, portalRole);

  const phase1Modules = visibleModules.filter((m) => m.phase === 1);
  const phase2Modules = visibleModules.filter((m) => m.phase === 2);

  // ==========================================================================
  // KACHEL-KLICK
  // ==========================================================================

  function handleModuleClick(mod: V7ModuleDefinition) {
    const config = mod.firma;
    if (config.status === 'active' && config.href) {
      router.push(config.href);
    }
  }

  // ==========================================================================
  // RENDER
  // ==========================================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-green-600" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <PortalHeader
        portal="firma"
        userRole={userRole}
        portalRole={portalRole}
        userName={userName}
        userEmail={userEmail}
        companyName={companyName}
      />

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Willkommen + Statistiken */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Willkommen, {userName.split(' ')[0] || 'Benutzer'}!
          </h1>
          <div className="flex items-center gap-4 mt-2">
            <span className="inline-flex items-center gap-1.5 text-sm text-gray-500">
              <Building2 size={14} />
              {companyName}
            </span>
            <span className="inline-flex items-center gap-1.5 text-sm text-gray-500">
              <Users size={14} />
              {employeeCount} {employeeCount === 1 ? 'Mitarbeiter' : 'Mitarbeiter'}
            </span>
            <span className="inline-flex items-center gap-1.5 text-sm text-gray-500">
              <FolderKanban size={14} />
              {projectCount} {projectCount === 1 ? 'Projekt' : 'Projekte'}
            </span>
          </div>
        </div>

        {/* Phase 1 - Pflichtmodule */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="inline-block w-3 h-3 rounded-full bg-green-500" />
            <h2 className="text-lg font-semibold text-gray-800">
              Foerderabrechnung
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {phase1Modules.map((mod) => (
              <ModuleCard
                key={mod.id}
                module={mod}
                portal="firma"
                portalColors={colors}
                onClick={() => handleModuleClick(mod)}
              />
            ))}
          </div>
        </section>

        {/* Phase 2 - Zusatzmodule (nur wenn sichtbar) */}
        {phase2Modules.length > 0 && (
          <section className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <span className="inline-block w-3 h-3 rounded-full bg-yellow-400" />
              <h2 className="text-lg font-semibold text-gray-800">
                Zusatzmodule
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {phase2Modules.map((mod) => (
                <ModuleCard
                  key={mod.id}
                  module={mod}
                  portal="firma"
                  portalColors={colors}
                  onClick={() => handleModuleClick(mod)}
                />
              ))}
            </div>
          </section>
        )}

      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-8">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <p className="text-center text-xs text-gray-400">
            PZE v7.3.90 &middot; Firmen-Portal &middot; {companyName}
          </p>
        </div>
      </footer>
    </div>
  );
}

// ============================================================================
// MODUL-KACHEL KOMPONENTE
// ============================================================================

interface ModuleCardProps {
  module: V7ModuleDefinition;
  portal: 'berater' | 'firma';
  portalColors: typeof PORTAL_COLORS.firma;
  onClick: () => void;
}

function ModuleCard({ module, portal, portalColors, onClick }: ModuleCardProps) {
  const config = module[portal];
  const isActive = config.status === 'active';
  const IconComponent = getModuleIcon(module.icon);

  return (
    <button
      onClick={onClick}
      disabled={!isActive}
      className={`
        relative group text-left w-full rounded-xl border-2 p-5
        transition-all duration-200
        ${isActive
          ? 'bg-white border-gray-200 hover:border-green-400 hover:shadow-lg cursor-pointer'
          : 'bg-gray-50 border-gray-200 border-dashed cursor-default opacity-75'
        }
      `}
    >
      {/* Status-Badge */}
      <div className="absolute top-3 right-3">
        {isActive ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
            <CheckCircle size={12} />
            Aktiv
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
            <CalendarClock size={12} />
            {config.plannedRelease || 'Geplant'}
          </span>
        )}
      </div>

      {/* Icon */}
      <div
        className={`
          w-12 h-12 rounded-lg flex items-center justify-center mb-3
          ${isActive
            ? 'bg-green-50 text-green-600 group-hover:bg-green-100'
            : 'bg-gray-100 text-gray-400'
          }
        `}
      >
        <IconComponent size={24} />
      </div>

      {/* Name */}
      <h3 className={`font-semibold text-sm mb-1 ${isActive ? 'text-gray-900' : 'text-gray-500'}`}>
        {module.name}
      </h3>

      {/* Beschreibung */}
      <p className={`text-xs leading-relaxed ${isActive ? 'text-gray-500' : 'text-gray-400'}`}>
        {config.description}
      </p>

      {/* Phase-Indikator */}
      <div className="mt-3 pt-2 border-t border-gray-100">
        <span className="text-[10px] text-gray-400 uppercase tracking-wider">
          Phase {module.phase}
        </span>
      </div>
    </button>
  );
}

// ============================================================================
// ENDE
// ============================================================================
