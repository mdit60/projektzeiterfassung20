'use client';

// src/app/v7/berater/dashboard/page.tsx
// ============================================================================
// PZE V7 - Berater-Dashboard
// ============================================================================
// Version: 7.4.4-6
// Datum: 26. Maerz 2026
//
// v7.4.4-6: Komplett neu - 4 Hauptkacheln statt Kundenliste
//   - Kundenfirmen: Klick -> /v7/berater/foerderung
//   - Netzwerkmanagement: Klick -> /v7/berater/netzwerk (Live: Anzahl NWM + offene EA)
//   - Multiprojekt-Tool: in Vorbereitung
//   - Forschungszulage: in Vorbereitung
//   Kundenliste entfaellt (eigene Seite /v7/berater/foerderung)
// ============================================================================

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import PortalHeader from '@/components/shared/PortalHeader';
import PortalNav from '@/components/shared/PortalNav';
import {
  Building2,
  Network,
  Layers,
  FlaskConical,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  Clock,
  Users,
  FolderKanban,
} from 'lucide-react';
import { V7UserRole } from '@/types/v7-types';

// ============================================================================
// TYPEN
// ============================================================================

interface DashboardStats {
  kundenAnzahl: number;
  projekteAnzahl: number;
  nwmAnzahl: number;
  offeneEA: number;
  consultantCompanyId: string | null;
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
  const [userRole, setUserRole] = useState<V7UserRole>('consultant');
  const [consultantCompanyName, setConsultantCompanyName] = useState('');
  const [stats, setStats] = useState<DashboardStats>({
    kundenAnzahl: 0,
    projekteAnzahl: 0,
    nwmAnzahl: 0,
    offeneEA: 0,
    consultantCompanyId: null,
  });

  // ==========================================================================
  // DATEN LADEN
  // ==========================================================================

  useEffect(() => {
    async function loadData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/login'); return; }

        const { data: profile } = await supabase
          .from('v7_user_profiles')
          .select('display_name, first_name, last_name, role, consultant_company_id')
          .eq('id', user.id)
          .single();

        if (profile) {
          const name = profile.display_name
            || [profile.first_name, profile.last_name].filter(Boolean).join(' ')
            || user.email || '';
          setUserName(name);
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

            // Kunden + Projekte zaehlen
            const { data: companies } = await supabase
              .from('v7_client_companies')
              .select('id')
              .eq('consultant_company_id', profile.consultant_company_id)
              .eq('is_active', true);

            const companyIds = (companies || []).map(c => c.id);
            const kundenAnzahl = companyIds.length;

            let projekteAnzahl = 0;
            let nwmAnzahl = 0;
            let offeneEA = 0;

            if (companyIds.length > 0) {
              // Alle Projekte
              const { count: pCount } = await supabase
                .from('v7_projects')
                .select('*', { count: 'exact', head: true })
                .in('client_company_id', companyIds)
                .eq('is_active', true);
              projekteAnzahl = pCount || 0;

              // NWM-Projekte
              const { data: nwmProjects } = await supabase
                .from('v7_projects')
                .select('id')
                .in('client_company_id', companyIds)
                .eq('is_active', true)
                .eq('funding_format', 'ZIM_NETZWERK');
              nwmAnzahl = (nwmProjects || []).length;

              // Offene EA
              if (nwmAnzahl > 0) {
                const nwmIds = (nwmProjects || []).map(p => p.id);
                const { count: eaCount } = await supabase
                  .from('v7_netzwerk_eigenanteile')
                  .select('*', { count: 'exact', head: true })
                  .in('project_id', nwmIds)
                  .eq('status', 'offen');
                offeneEA = eaCount || 0;
              }
            }

            setStats({
              kundenAnzahl,
              projekteAnzahl,
              nwmAnzahl,
              offeneEA,
              consultantCompanyId: profile.consultant_company_id,
            });
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
  // RENDER
  // ==========================================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PortalHeader portal="berater" userName="" userRole="consultant" companyName="" hideNavigation />
        <div className="flex items-center justify-center h-64">
          <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  const kacheln = [
    {
      id: 'kunden',
      titel: 'Kundenfirmen',
      beschreibung: 'Alle Kundenfirmen und deren Projekte verwalten',
      icon: Building2,
      iconBg: 'bg-sky-50',
      iconColor: 'text-sky-600',
      borderHover: 'hover:border-sky-400',
      status: 'active' as const,
      href: '/v7/berater/foerderung',
      stats: [
        { label: 'Firmen', wert: String(stats.kundenAnzahl), icon: Building2 },
        { label: 'Projekte', wert: String(stats.projekteAnzahl), icon: FolderKanban },
      ],
    },
    {
      id: 'netzwerk',
      titel: 'Netzwerkmanagement',
      beschreibung: 'ZIM-Netzwerke, Netzwerkpartner und Eigenanteile',
      icon: Network,
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
      borderHover: 'hover:border-blue-400',
      status: 'active' as const,
      href: '/v7/berater/netzwerk',
      stats: [
        { label: 'Netzwerke', wert: String(stats.nwmAnzahl), icon: Network },
        {
          label: stats.offeneEA > 0 ? 'EA offen' : 'EA ok',
          wert: stats.offeneEA > 0 ? String(stats.offeneEA) : null,
          icon: stats.offeneEA > 0 ? AlertCircle : CheckCircle,
          color: stats.offeneEA > 0 ? 'text-red-600' : 'text-green-600',
        },
      ],
    },
    {
      id: 'multiprojekt',
      titel: 'Multiprojekt-Tool',
      beschreibung: '173h-Pruefung: MA-Abgrenzung ueber alle Projekte',
      icon: Layers,
      iconBg: 'bg-gray-100',
      iconColor: 'text-gray-400',
      borderHover: '',
      status: 'coming_soon' as const,
      href: null,
      stats: [],
    },
    {
      id: 'fzul',
      titel: 'Forschungszulage',
      beschreibung: 'Verfuegbare FuE-Kapazitaeten fuer FZul-Antraege',
      icon: FlaskConical,
      iconBg: 'bg-gray-100',
      iconColor: 'text-gray-400',
      borderHover: '',
      status: 'coming_soon' as const,
      href: null,
      stats: [],
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      <PortalHeader
        portal="berater"
        userName={userName}
        userRole={userRole}
        companyName={consultantCompanyName}
      />
      <PortalNav portal="berater" userRole={userRole} />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">

        {/* Begruessung */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Willkommen{userFirstName ? `, ${userFirstName}` : ''}!
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {consultantCompanyName && (
              <span className="font-medium text-gray-700">{consultantCompanyName} &middot; </span>
            )}
            {stats.kundenAnzahl} Kundenfirmen &middot; {stats.projekteAnzahl} Projekte
          </p>
        </div>

        {/* 4 Hauptkacheln */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {kacheln.map(kachel => {
            const IconComponent = kachel.icon;
            const isActive = kachel.status === 'active';

            return (
              <button
                key={kachel.id}
                onClick={() => isActive && kachel.href ? router.push(kachel.href) : undefined}
                disabled={!isActive}
                className={`
                  relative text-left w-full rounded-2xl border-2 p-6
                  transition-all duration-200
                  ${isActive
                    ? `bg-white border-gray-200 ${kachel.borderHover} hover:shadow-lg cursor-pointer`
                    : 'bg-gray-50 border-gray-200 border-dashed cursor-default opacity-60'
                  }
                `}
              >
                {/* Status-Badge */}
                <div className="absolute top-4 right-4">
                  {isActive ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                      <CheckCircle size={11} />
                      Aktiv
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      <Clock size={11} />
                      In Vorbereitung
                    </span>
                  )}
                </div>

                {/* Icon */}
                <div className={`w-14 h-14 ${kachel.iconBg} rounded-xl flex items-center justify-center mb-4`}>
                  <IconComponent size={28} className={kachel.iconColor} />
                </div>

                {/* Titel + Beschreibung */}
                <h3 className={`text-lg font-semibold mb-1 ${isActive ? 'text-gray-900' : 'text-gray-500'}`}>
                  {kachel.titel}
                </h3>
                <p className={`text-sm leading-relaxed mb-4 ${isActive ? 'text-gray-500' : 'text-gray-400'}`}>
                  {kachel.beschreibung}
                </p>

                {/* Live-Stats */}
                {isActive && kachel.stats.length > 0 && (
                  <div className="flex items-center gap-4 pt-4 border-t border-gray-100">
                    {kachel.stats.map((stat, idx) => {
                      const StatIcon = stat.icon;
                      return (
                        <div key={idx} className="flex items-center gap-1.5">
                          <StatIcon size={14} className={stat.color || 'text-gray-400'} />
                          <span className={`text-sm font-semibold ${stat.color || 'text-gray-700'}`}>
                            {stat.wert ?? ''}
                          </span>
                          <span className="text-xs text-gray-400">{stat.label}</span>
                        </div>
                      );
                    })}
                    <ChevronRight size={16} className="text-gray-300 ml-auto" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

      </main>

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
