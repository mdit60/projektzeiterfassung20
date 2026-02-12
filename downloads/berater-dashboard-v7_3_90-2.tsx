'use client';

// src/app/v7/berater/dashboard/page.tsx
// ============================================================================
// PZE V7 - Berater-Dashboard
// ============================================================================
// Datum: 11. Februar 2026
// Version: 7.3.90-2
//
// Layout:
//   1. Kundenfirmen-Kacheln (oben) - Klick oeffnet Firmen-Detail-Seite
//      Jede Kachel zeigt: Firmenname, Anzahl Projekte, Anzahl MA, Status
//   2. Berater-Werkzeuge (unten) - Firmenuebergreifende Tools
//      Netzwerk, Multiprojekt, FZul
//
// Header-Farbe: Immer blau = "Ich bin Berater"
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
  Building2,
  Users,
  ChevronRight,
  Upload,
  AlertCircle,
} from 'lucide-react';

import { V7UserRole } from '@/types/v7-types';
import { PORTAL_COLORS } from '@/lib/v7-constants';
import {
  getBeraterWerkzeuge,
  V7ModuleDefinition,
} from '@/lib/v7-module-config';

// ============================================================================
// ICON-MAPPING
// ============================================================================

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  FolderKanban, Clock, Receipt, FileCheck, Scale,
  Layers, Calculator, Network, FlaskConical, BarChart3,
};

function getModuleIcon(iconName: string) {
  return ICON_MAP[iconName] || FolderKanban;
}

// ============================================================================
// TYPEN
// ============================================================================

interface ClientCompanyCard {
  id: string;
  name: string;
  short_name: string | null;
  city: string | null;
  federal_state: string | null;
  project_count: number;
  employee_count: number;
  is_active: boolean;
}

// ============================================================================
// KOMPONENTE
// ============================================================================

export default function BeraterDashboardPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState<V7UserRole>('consultant');
  const [consultantCompanyName, setConsultantCompanyName] = useState('');
  const [companies, setCompanies] = useState<ClientCompanyCard[]>([]);

  const colors = PORTAL_COLORS.berater;

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
          .select('display_name, first_name, last_name, role, consultant_company_id')
          .eq('id', user.id)
          .single();

        if (profile) {
          const name = profile.display_name
            || [profile.first_name, profile.last_name].filter(Boolean).join(' ')
            || user.email
            || '';
          setUserName(name);
          setUserRole((profile.role as V7UserRole) || 'consultant');

          // Berater-Firma laden
          if (profile.consultant_company_id) {
            const { data: consultantCompany } = await supabase
              .from('v7_consultant_companies')
              .select('name')
              .eq('id', profile.consultant_company_id)
              .single();
            if (consultantCompany) {
              setConsultantCompanyName(consultantCompany.name);
            }
          }
        }
        setUserEmail(user.email || '');

        // Kundenfirmen laden mit Statistiken
        const { data: clientCompanies } = await supabase
          .from('v7_client_companies')
          .select('id, name, short_name, city, federal_state, is_active')
          .eq('is_active', true)
          .order('name');

        if (clientCompanies && clientCompanies.length > 0) {
          // Fuer jede Firma: Projekte und MA zaehlen
          const companiesWithStats: ClientCompanyCard[] = await Promise.all(
            clientCompanies.map(async (company) => {
              const { count: pCount } = await supabase
                .from('v7_projects')
                .select('*', { count: 'exact', head: true })
                .eq('company_id', company.id);

              const { count: eCount } = await supabase
                .from('v7_employees')
                .select('*', { count: 'exact', head: true })
                .eq('company_id', company.id)
                .eq('is_active', true);

              return {
                ...company,
                project_count: pCount || 0,
                employee_count: eCount || 0,
              };
            })
          );
          setCompanies(companiesWithStats);
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
  // BERATER-WERKZEUGE
  // ==========================================================================

  const beraterWerkzeuge = getBeraterWerkzeuge(userRole);

  // ==========================================================================
  // RENDER
  // ==========================================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-sky-600" size={40} />
      </div>
    );
  }

  const totalProjects = companies.reduce((sum, c) => sum + c.project_count, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <PortalHeader
        portal="berater"
        userRole={userRole}
        userName={userName}
        userEmail={userEmail}
        companyName={consultantCompanyName || 'PZE'}
      />

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Willkommen */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Willkommen, {userName.split(' ')[0] || 'Berater'}!
          </h1>
          <p className="text-gray-500 mt-1">
            {companies.length} {companies.length === 1 ? 'Kundenfirma' : 'Kundenfirmen'} &middot; {totalProjects} {totalProjects === 1 ? 'Projekt' : 'Projekte'}
          </p>
        </div>

        {/* ================================================================ */}
        {/* KUNDENFIRMEN                                                     */}
        {/* ================================================================ */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <Building2 size={20} className="text-sky-600" />
              <h2 className="text-lg font-semibold text-gray-800">
                Meine Kunden
              </h2>
            </div>
            <button
              onClick={() => router.push('/v7/berater/foerderung/import')}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm
                         bg-sky-50 text-sky-700 rounded-lg hover:bg-sky-100 transition-colors"
            >
              <Upload size={14} />
              ZIM-Import
            </button>
          </div>

          {companies.length === 0 ? (
            <div className="bg-white rounded-xl border-2 border-dashed border-gray-200 p-12 text-center">
              <Building2 size={40} className="text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 mb-2">Noch keine Kundenfirmen angelegt</p>
              <button
                onClick={() => router.push('/v7/berater/foerderung/import')}
                className="text-sm text-sky-600 hover:text-sky-700 font-medium"
              >
                Erste Firma per ZIM-Import anlegen
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {companies.map((company) => (
                <button
                  key={company.id}
                  onClick={() => router.push(`/v7/berater/foerderung/firma/${company.id}`)}
                  className="group text-left bg-white rounded-xl border border-gray-200
                             hover:border-sky-400 hover:shadow-lg p-5
                             transition-all duration-200 cursor-pointer"
                >
                  {/* Firmenname */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-sky-50 rounded-lg flex items-center justify-center
                                      text-sky-600 font-bold text-sm group-hover:bg-sky-100 transition-colors">
                        {(company.short_name || company.name).substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 text-sm leading-tight">
                          {company.name}
                        </h3>
                        {company.city && (
                          <p className="text-xs text-gray-400 mt-0.5">{company.city}</p>
                        )}
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-gray-300 group-hover:text-sky-400 transition-colors mt-1" />
                  </div>

                  {/* Statistiken */}
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="inline-flex items-center gap-1">
                      <FolderKanban size={12} />
                      {company.project_count} {company.project_count === 1 ? 'Projekt' : 'Projekte'}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Users size={12} />
                      {company.employee_count} MA
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* ================================================================ */}
        {/* BERATER-WERKZEUGE                                                */}
        {/* ================================================================ */}
        {beraterWerkzeuge.length > 0 && (
          <section className="mb-10">
            <div className="flex items-center gap-3 mb-5">
              <Layers size={20} className="text-sky-600" />
              <h2 className="text-lg font-semibold text-gray-800">
                Berater-Werkzeuge
              </h2>
              <span className="text-sm text-gray-400">Firmenuebergreifende Analysen</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {beraterWerkzeuge.map((mod) => {
                const config = mod.berater;
                const isActive = config.status === 'active';
                const IconComponent = getModuleIcon(mod.icon);

                return (
                  <button
                    key={mod.id}
                    onClick={() => isActive && config.href ? router.push(config.href) : undefined}
                    disabled={!isActive}
                    className={`
                      relative group text-left w-full rounded-xl border-2 p-5
                      transition-all duration-200
                      ${isActive
                        ? 'bg-white border-gray-200 hover:border-sky-400 hover:shadow-lg cursor-pointer'
                        : 'bg-gray-50 border-gray-200 border-dashed cursor-default opacity-70'
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
                    <div className={`
                      w-12 h-12 rounded-lg flex items-center justify-center mb-3
                      ${isActive
                        ? 'bg-sky-50 text-sky-600 group-hover:bg-sky-100'
                        : 'bg-gray-100 text-gray-400'
                      }
                    `}>
                      <IconComponent size={24} />
                    </div>

                    {/* Name + Beschreibung */}
                    <h3 className={`font-semibold text-sm mb-1 ${isActive ? 'text-gray-900' : 'text-gray-500'}`}>
                      {mod.name}
                    </h3>
                    <p className={`text-xs leading-relaxed ${isActive ? 'text-gray-500' : 'text-gray-400'}`}>
                      {config.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>
        )}

      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-8">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <p className="text-center text-xs text-gray-400">
            PZE v7.3.90 &middot; Berater-Portal &middot; {consultantCompanyName || 'PZE'}
          </p>
        </div>
      </footer>
    </div>
  );
}

// ============================================================================
// ENDE
// ============================================================================
