'use client';

// src/app/v7/berater/app/cockpit/page.tsx
// ============================================================================
// Version: 1.0.0
// Berater-App-Cockpit (neue Struktur)
//   - 4 Kacheln: Kundenfirmen (mit Firma-Dropdown), Netzwerk,
//                Kapazitaetsplanung, Forschungszulage
//   - Firmenwahl -> direkt zum Firmen-Cockpit /v7/berater/app/firma/[id]
//   - Nur zugaenglich im App-Modus (pze_mode='app')
//   - Kein Querlink zur alten Struktur
// ============================================================================

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import PortalHeader from '@/components/shared/PortalHeader';
import AppNav from '@/components/shared/AppNav';
import {
  Building2, Network, BarChart3, FlaskConical,
  ChevronDown, ChevronRight, Loader2, AlertCircle,
  CheckCircle, Clock,
} from 'lucide-react';

const PRIMARY = '#002451';

interface FirmaItem { id: string; name: string; }
interface TileStats {
  firmen: number;
  projekte: number;
  nwmAnzahl: number;
  offeneEA: number;
}

export default function BeraterAppCockpitPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: PRIMARY }} />
      </div>
    }>
      <BeraterAppCockpitInner />
    </Suspense>
  );
}

function BeraterAppCockpitInner() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading]               = useState(true);
  const [userName, setUserName]             = useState('');
  const [userRole, setUserRole]             = useState('');
  const [companyName, setCompanyName]       = useState('');
  const [alleFirmen, setAlleFirmen]         = useState<FirmaItem[]>([]);
  const [stats, setStats]                   = useState<TileStats>({ firmen: 0, projekte: 0, nwmAnzahl: 0, offeneEA: 0 });
  const [firmenDropdownOpen, setFirmenDropdownOpen] = useState(false);
  const [consultantCompanyId, setConsultantCompanyId] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/v7/login'); return; }

        const { data: profile } = await supabase
          .from('v7_user_profiles')
          .select('display_name, role, consultant_company_id')
          .eq('id', user.id)
          .single();

        if (!profile) { router.push('/v7/login'); return; }

        // Name
        const displayName = profile.display_name || user.email || '';
        const nameParts = displayName.includes(',')
          ? displayName.split(',').map((s: string) => s.trim())
          : displayName.split(' ');
        setUserName(nameParts[nameParts.length > 1 ? 1 : 0] || displayName);
        setUserRole(profile.role || '');
        setConsultantCompanyId(profile.consultant_company_id || '');

        if (profile.consultant_company_id) {
          // Beraterfirma-Name
          const { data: cc } = await supabase
            .from('v7_consultant_companies')
            .select('name')
            .eq('id', profile.consultant_company_id)
            .single();
          if (cc) setCompanyName(cc.name);

          // Alle Kundenfirmen
          const { data: firmen } = await supabase
            .from('v7_client_companies')
            .select('id, name')
            .eq('consultant_company_id', profile.consultant_company_id)
            .eq('is_active', true)
            .order('name');
          setAlleFirmen(firmen || []);

          const companyIds = (firmen || []).map(f => f.id);

          // Stats
          let projekteAnzahl = 0;
          let nwmAnzahl = 0;
          let offeneEA = 0;

          if (companyIds.length > 0) {
            const { count: pCount } = await supabase
              .from('v7_projects')
              .select('*', { count: 'exact', head: true })
              .in('client_company_id', companyIds)
              .eq('is_active', true);
            projekteAnzahl = pCount || 0;

            const { data: nwmProjects } = await supabase
              .from('v7_projects')
              .select('id')
              .in('client_company_id', companyIds)
              .eq('is_active', true)
              .eq('funding_format', 'ZIM_NETZWERK');
            nwmAnzahl = (nwmProjects || []).length;

            const { data: nwmEigenanteile } = await supabase
              .from('v7_netzwerk_eigenanteile')
              .select('id, status')
              .in('project_id', (nwmProjects || []).map((p: any) => p.id));
            offeneEA = (nwmEigenanteile || []).filter((ea: any) =>
              ea.status === 'offen' || !ea.status
            ).length;
          }

          setStats({
            firmen: companyIds.length,
            projekte: projekteAnzahl,
            nwmAnzahl,
            offeneEA,
          });
        }
      } catch (err) {
        console.error('App-Cockpit load error:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: PRIMARY }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PortalHeader
        portal="berater"
        companyName={companyName}
        userName={userName}
        userRole={userRole as any}
      />
      <AppNav userRole={userRole} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Begruessung */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Willkommen, {userName}!
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {companyName} · {stats.firmen} Kundenfirmen · {stats.projekte} Projekte
          </p>
        </div>

        {/* 4 Kacheln */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* KACHEL 1: Kundenfirmen mit Dropdown */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 relative">
            {/* Status-Badge */}
            <div className="absolute top-4 right-4">
              <span className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                <CheckCircle size={12} />
                Aktiv
              </span>
            </div>

            {/* Icon */}
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-4">
              <Building2 size={24} style={{ color: PRIMARY }} />
            </div>

            <h2 className="text-lg font-bold text-gray-900 mb-1">Kundenfirmen</h2>
            <p className="text-sm text-gray-500 mb-4">Alle Kundenfirmen und deren Projekte verwalten</p>

            {/* Stats */}
            <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
              <span className="flex items-center gap-1">
                <Building2 size={12} />
                <strong className="text-gray-700">{stats.firmen}</strong> Firmen
              </span>
              <span className="flex items-center gap-1">
                <BarChart3 size={12} />
                <strong className="text-gray-700">{stats.projekte}</strong> Projekte
              </span>
            </div>

            {/* Firma-Dropdown */}
            <div className="relative">
              <button
                onClick={() => setFirmenDropdownOpen(!firmenDropdownOpen)}
                className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium text-white rounded-lg transition-colors"
                style={{ backgroundColor: PRIMARY }}
              >
                <span>Firma auswählen</span>
                <ChevronDown
                  size={16}
                  className={`transition-transform ${firmenDropdownOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {firmenDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setFirmenDropdownOpen(false)}
                  />
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg border border-gray-200 shadow-lg z-20 max-h-64 overflow-y-auto">
                    {alleFirmen.map(firma => (
                      <button
                        key={firma.id}
                        onClick={() => {
                          setFirmenDropdownOpen(false);
                          router.push(`/v7/berater/app/firma/${firma.id}`);
                        }}
                        className="w-full flex items-center justify-between px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors text-left border-b border-gray-50 last:border-0"
                      >
                        <span>{firma.name}</span>
                        <ChevronRight size={14} className="text-gray-300" />
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* KACHEL 2: Netzwerkmanagement */}
          <button
            onClick={() => router.push('/v7/berater/netzwerk')}
            className="bg-white rounded-xl border border-gray-200 p-6 text-left hover:shadow-md transition-shadow relative"
          >
            <div className="absolute top-4 right-4">
              <span className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                <CheckCircle size={12} />
                Aktiv
              </span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-4">
              <Network size={24} style={{ color: PRIMARY }} />
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-1">Netzwerkmanagement</h2>
            <p className="text-sm text-gray-500 mb-4">ZIM-Netzwerke, Netzwerkpartner und Eigenanteile</p>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Network size={12} />
                <strong className="text-gray-700">{stats.nwmAnzahl}</strong> Netzwerke
              </span>
              {stats.offeneEA > 0 && (
                <span className="flex items-center gap-1 text-orange-600">
                  <AlertCircle size={12} />
                  <strong>{stats.offeneEA}</strong> EA offen
                </span>
              )}
            </div>
            <ChevronRight size={16} className="absolute bottom-6 right-6 text-gray-300" />
          </button>

          {/* KACHEL 3: Kapazitaetsplanung */}
          <button
            onClick={() => router.push('/v7/berater/multiprojekt')}
            className="bg-white rounded-xl border border-gray-200 p-6 text-left hover:shadow-md transition-shadow relative"
          >
            <div className="absolute top-4 right-4">
              <span className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                <CheckCircle size={12} />
                Aktiv
              </span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-4">
              <BarChart3 size={24} style={{ color: PRIMARY }} />
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-1">Kapazitaetsplanung</h2>
            <p className="text-sm text-gray-500">Freie Kapazitaeten ermitteln fuer neue FuE-Vorhaben</p>
            <ChevronRight size={16} className="absolute bottom-6 right-6 text-gray-300" />
          </button>

          {/* KACHEL 4: Forschungszulage */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 relative opacity-60">
            <div className="absolute top-4 right-4">
              <span className="flex items-center gap-1 text-xs font-medium text-yellow-600 bg-yellow-50 px-2 py-1 rounded-full">
                <Clock size={12} />
                In Vorbereitung
              </span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mb-4">
              <FlaskConical size={24} className="text-gray-400" />
            </div>
            <h2 className="text-lg font-bold text-gray-400 mb-1">Forschungszulage</h2>
            <p className="text-sm text-gray-400">Kommt bald</p>
          </div>

        </div>
      </main>
    </div>
  );
}
