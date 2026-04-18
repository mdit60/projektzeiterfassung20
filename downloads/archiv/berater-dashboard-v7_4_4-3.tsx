'use client';

// src/app/v7/berater/dashboard/page.tsx
// ============================================================================
// PZE V7 - Berater-Dashboard
// ============================================================================
// Datum: 11. Februar 2026
// Version: 7.4.4-2
//
// Layout:
//   1. Kundenliste (Tabelle mit Suchfunktion)
//      Klick auf Firma -> Firmen-Detail-Seite
//   2. Sonstiges (firmenuebergreifend)
//      Netzwerk, Multiprojekt, FZul
//
// v7.4.4-3: Schnellzugriff-Buttons in Kundentabelle (Firma/Berichte/ZE/MA)
//            /v7/berater/berichte Redirect auf Dashboard
// v7.3.90-4: Kundenliste statt Kacheln (skaliert besser)
//            Suchfunktion fuer Firmennamen
//            ZIM-Import-Button entfernt (gehoert nicht aufs Dashboard)
//            Footer vereinheitlicht
// ============================================================================

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import PortalHeader from '@/components/shared/PortalHeader';
import PortalNav from '@/components/shared/PortalNav';
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
  Search,
  FileText,
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

interface ClientCompanyRow {
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
  const [userFirstName, setUserFirstName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState<V7UserRole>('consultant');
  const [consultantCompanyName, setConsultantCompanyName] = useState('');
  const [companies, setCompanies] = useState<ClientCompanyRow[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const colors = PORTAL_COLORS.berater;

  // ==========================================================================
  // DATEN LADEN
  // ==========================================================================

  useEffect(() => {
    async function loadData() {
      try {
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

          // Vorname fuer Begruessung
          if (profile.first_name) {
            setUserFirstName(profile.first_name);
          } else if (profile.display_name && profile.display_name.includes(',')) {
            setUserFirstName(profile.display_name.split(',')[1]?.trim() || '');
          } else {
            setUserFirstName(name.split(' ')[0] || '');
          }
          setUserRole((profile.role as V7UserRole) || 'consultant');

          if (profile.consultant_company_id) {
            const { data: cc } = await supabase
              .from('v7_consultant_companies')
              .select('name')
              .eq('id', profile.consultant_company_id)
              .single();
            if (cc) setConsultantCompanyName(cc.name);
          }
        }
        setUserEmail(user.email || '');

        // Kundenfirmen laden
        const { data: clientCompanies } = await supabase
          .from('v7_client_companies')
          .select('id, name, short_name, city, federal_state, is_active')
          .eq('is_active', true)
          .order('name');

        if (clientCompanies && clientCompanies.length > 0) {
          const companiesWithStats: ClientCompanyRow[] = await Promise.all(
            clientCompanies.map(async (company) => {
              const { count: pCount } = await supabase
                .from('v7_projects')
                .select('*', { count: 'exact', head: true })
                .eq('client_company_id', company.id);

              const { count: eCount } = await supabase
                .from('v7_employees')
                .select('*', { count: 'exact', head: true })
                .eq('client_company_id', company.id)
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
  // FILTER + WERKZEUGE
  // ==========================================================================

  const filteredCompanies = useMemo(() => {
    if (!searchTerm.trim()) return companies;
    const term = searchTerm.toLowerCase();
    return companies.filter((c) =>
      c.name.toLowerCase().includes(term)
      || (c.short_name && c.short_name.toLowerCase().includes(term))
      || (c.city && c.city.toLowerCase().includes(term))
    );
  }, [companies, searchTerm]);

  const beraterWerkzeuge = getBeraterWerkzeuge(userRole);
  const totalProjects = companies.reduce((sum, c) => sum + c.project_count, 0);

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

  return (
    <div className="min-h-screen bg-gray-50">
      <PortalHeader
        portal="berater"
        userRole={userRole}
        userName={userName}
        userEmail={userEmail}
        companyName={consultantCompanyName || 'PZE'}
      />

      <PortalNav
        portal="berater"
        userRole={userRole}
        currentPath="/v7/berater/dashboard"
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Willkommen */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Willkommen, {userFirstName || 'Berater'}!
          </h1>
          <p className="text-gray-500 mt-1">
            {companies.length} {companies.length === 1 ? 'Kundenfirma' : 'Kundenfirmen'} &middot; {totalProjects} {totalProjects === 1 ? 'Projekt' : 'Projekte'}
          </p>
        </div>

        {/* ================================================================ */}
        {/* KUNDENLISTE                                                      */}
        {/* ================================================================ */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Building2 size={20} className="text-sky-600" />
              <h2 className="text-lg font-semibold text-gray-800">
                Kundenuebersicht
              </h2>
            </div>
          </div>

          {/* Suchfeld */}
          {companies.length > 3 && (
            <div className="relative mb-4">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Firma suchen..."
                className="w-full sm:w-80 pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg
                           focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent
                           bg-white"
              />
            </div>
          )}

          {companies.length === 0 ? (
            <div className="bg-white rounded-xl border-2 border-dashed border-gray-200 p-12 text-center">
              <Building2 size={40} className="text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Noch keine Kundenfirmen angelegt</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                      Firma
                    </th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3 hidden sm:table-cell">
                      Ort
                    </th>
                    <th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                      Projekte
                    </th>
                    <th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                      Mitarbeiter
                    </th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3 hidden md:table-cell">Schnellzugriff</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredCompanies.map((company) => (
                    <tr
                      key={company.id}
                      className="hover:bg-sky-50 transition-colors"
                    >
                      {/* Firmenname - klickbar zur Detailseite */}
                      <td
                        className="px-4 py-3 cursor-pointer"
                        onClick={() => router.push(`/v7/berater/foerderung/firma/${company.id}`)}
                      >
                        <div className="font-medium text-gray-900 text-sm hover:text-sky-700 transition-colors">
                          {company.name}
                        </div>
                        {company.short_name && (
                          <div className="text-xs text-gray-400">{company.short_name}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 hidden sm:table-cell">
                        {company.city || '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1 text-sm text-gray-600">
                          <FolderKanban size={14} className="text-gray-400" />
                          {company.project_count}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1 text-sm text-gray-600">
                          <Users size={14} className="text-gray-400" />
                          {company.employee_count}
                        </span>
                      </td>
                      {/* Schnellzugriff-Buttons */}
                      <td className="px-4 py-3 hidden md:table-cell">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => router.push(`/v7/berater/foerderung/firma/${company.id}?tab=projekte`)}
                            title="Firma / Projekte"
                            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-sky-100 hover:text-sky-700 rounded transition-colors"
                          >
                            <FolderKanban size={12} />
                            Projekte
                          </button>
                          <button
                            onClick={() => router.push(`/v7/berater/foerderung/firma/${company.id}/berichte`)}
                            title="Berichte & Controlling"
                            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-green-100 hover:text-green-700 rounded transition-colors"
                          >
                            <BarChart3 size={12} />
                            Berichte
                          </button>
                          <button
                            onClick={() => router.push(`/v7/berater/foerderung/firma/${company.id}/zeiterfassung`)}
                            title="Zeiterfassungen"
                            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-purple-100 hover:text-purple-700 rounded transition-colors"
                          >
                            <Clock size={12} />
                            Zeiten
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredCompanies.length === 0 && searchTerm && (
                <div className="px-4 py-8 text-center text-sm text-gray-400">
                  Keine Firma gefunden fuer &quot;{searchTerm}&quot;
                </div>
              )}
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
                Sonstiges
              </h2>
              <span className="text-sm text-gray-400"></span>
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
                          In Vorbereitung
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
            PZE v7.4.4 &middot; {consultantCompanyName || 'PZE'}
          </p>
        </div>
      </footer>
    </div>
  );
}
