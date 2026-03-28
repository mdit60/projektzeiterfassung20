'use client';

// src/app/v7/berater/netzwerk/page.tsx
// ============================================================================
// PZE V7 - NWM-Uebersichtsseite (Berater-Portal)
// ============================================================================
// Version: 7.4.5-1
// Datum: 26. Maerz 2026
//
// Zeigt alle ZIM_NETZWERK-Projekte aller Kunden des Beraters.
// Je Netzwerk: Status, Anzahl NP, Schnellzugriff-Buttons
// Klick auf Netzwerk: Auswahlmenue Einstellungen / Partner / Eigenanteile
// ============================================================================

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import PortalHeader from '@/components/shared/PortalHeader';
import PortalNav from '@/components/shared/PortalNav';
import {
  Network,
  Settings,
  Building2,
  CreditCard,
  ChevronRight,
  Search,
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { V7UserRole } from '@/types/v7-types';

// ============================================================================
// TYPEN
// ============================================================================

interface NWMNetzwerk {
  id: string;
  name: string;
  short_name: string | null;
  funding_reference: string | null;
  start_date: string | null;
  end_date: string | null;
  netzwerk_typ: string | null;
  netzwerk_phase: string | null;
  bewilligung_datum: string | null;
  client_company_id: string;
  client_company_name: string;
  partner_count: number;
  offene_ea: number;
}

interface UserProfile {
  id: string;
  email: string;
  role: V7UserRole;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  consultant_company_id: string | null;
}

// ============================================================================
// HILFSFUNKTIONEN
// ============================================================================

const fmtDate = (s: string | null) =>
  s ? new Date(s).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '--';

const getNetzwerkTypLabel = (typ: string | null) => {
  if (typ === 'national') return 'National';
  if (typ === 'international') return 'International';
  return null;
};

const getPhaseLabel = (phase: string | null) => {
  if (phase === 'phase1') return 'Phase 1';
  if (phase === 'phase2') return 'Phase 2';
  return null;
};

// ============================================================================
// KOMPONENTE
// ============================================================================

export default function BeraterNetzwerkPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [netzwerke, setNetzwerke] = useState<NWMNetzwerk[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // ---- Daten laden ----
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // User-Profil
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/v7/login'); return; }

        const { data: profile } = await supabase
          .from('v7_user_profiles')
          .select('id, email, role, display_name, first_name, last_name, consultant_company_id')
          .eq('id', user.id)
          .single();
        if (!profile) { router.push('/v7/login'); return; }
        setUserProfile(profile as UserProfile);

        // Alle Kundenfirmen des Beraters
        const { data: companies } = await supabase
          .from('v7_client_companies')
          .select('id, name')
          .eq('consultant_company_id', profile.consultant_company_id || '')
          .eq('is_active', true);

        const companyIds = (companies || []).map(c => c.id);
        const companyMap: Record<string, string> = {};
        (companies || []).forEach(c => { companyMap[c.id] = c.name; });

        if (companyIds.length === 0) {
          setNetzwerke([]);
          setLoading(false);
          return;
        }

        // Alle ZIM_NETZWERK-Projekte
        const { data: projects } = await supabase
          .from('v7_projects')
          .select('id, name, short_name, funding_reference, start_date, end_date, client_company_id, netzwerk_typ, netzwerk_phase, bewilligung_datum')
          .in('client_company_id', companyIds)
          .eq('is_active', true)
          .eq('funding_format', 'ZIM_NETZWERK')
          .order('name');

        if (!projects || projects.length === 0) {
          setNetzwerke([]);
          setLoading(false);
          return;
        }

        const projectIds = projects.map(p => p.id);

        // Netzwerkpartner-Anzahl
        const { data: partnerData } = await supabase
          .from('v7_netzwerk_partner')
          .select('project_id')
          .in('project_id', projectIds)
          .is('austritt_datum', null);

        const partnerCount: Record<string, number> = {};
        (partnerData || []).forEach(p => {
          partnerCount[p.project_id] = (partnerCount[p.project_id] || 0) + 1;
        });

        // Offene EA
        const { data: eaData } = await supabase
          .from('v7_netzwerk_eigenanteile')
          .select('project_id, status')
          .in('project_id', projectIds)
          .eq('status', 'offen');

        const offeneEA: Record<string, number> = {};
        (eaData || []).forEach(e => {
          offeneEA[e.project_id] = (offeneEA[e.project_id] || 0) + 1;
        });

        // Zusammenfuehren
        const result: NWMNetzwerk[] = (projects || []).map(p => ({
          id: p.id,
          name: p.name,
          short_name: p.short_name,
          funding_reference: p.funding_reference,
          start_date: p.start_date,
          end_date: p.end_date,
          netzwerk_typ: p.netzwerk_typ,
          netzwerk_phase: p.netzwerk_phase,
          bewilligung_datum: p.bewilligung_datum,
          client_company_id: p.client_company_id,
          client_company_name: companyMap[p.client_company_id] || '--',
          partner_count: partnerCount[p.id] || 0,
          offene_ea: offeneEA[p.id] || 0,
        }));

        setNetzwerke(result);
      } catch (err: any) {
        setError('Fehler beim Laden: ' + err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // ---- Navigation ----
  const navigateTo = (netzwerk: NWMNetzwerk, subTab: 'einstellungen' | 'partner' | 'eigenanteile') => {
    const url = `/v7/berater/foerderung/firma/${netzwerk.client_company_id}/projekt/${netzwerk.id}?nwmTab=${subTab}`;
    router.push(url);
  };

  // ---- Filter ----
  const filtered = netzwerke.filter(n =>
    n.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    n.client_company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (n.funding_reference || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const userName = userProfile?.display_name ||
    (userProfile?.first_name && userProfile?.last_name
      ? `${userProfile.last_name}, ${userProfile.first_name}`
      : userProfile?.email || '');

  // ============================================================================
  // RENDER
  // ============================================================================

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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      <PortalHeader
        portal="berater"
        userName={userName}
        userRole={userProfile?.role || 'consultant'}
        companyName=""
      />
      <PortalNav portal="berater" userRole={userProfile?.role || 'consultant'} />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">

        {/* Seiten-Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <button
              onClick={() => router.push('/v7/berater/dashboard')}
              className="flex items-center gap-1 text-gray-500 hover:text-gray-900 text-sm transition-colors"
            >
              <ArrowLeft size={16} />
              Dashboard
            </button>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
              <Network size={22} className="text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Netzwerkmanagement</h1>
              <p className="text-sm text-gray-500">
                {netzwerke.length} ZIM-Netzwerk{netzwerke.length !== 1 ? 'e' : ''} in Betreuung
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-red-700">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {/* Suchfeld */}
        {netzwerke.length > 0 && (
          <div className="relative mb-6">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Netzwerk, Firma oder FKZ suchen..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>
        )}

        {/* Leer-Zustand */}
        {netzwerke.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
            <Network size={48} className="mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Keine ZIM-Netzwerke</h3>
            <p className="text-gray-500 text-sm max-w-sm mx-auto">
              Es wurden noch keine ZIM_NETZWERK-Projekte fuer Ihre Kunden angelegt.
              Legen Sie ein neues Projekt mit Foerderformat "ZIM Netzwerk-Management" an.
            </p>
          </div>
        )}

        {/* Netzwerk-Liste */}
        {filtered.length > 0 && (
          <div className="space-y-3">
            {filtered.map(netzwerk => {
              const isExpanded = expandedId === netzwerk.id;
              const typLabel = getNetzwerkTypLabel(netzwerk.netzwerk_typ);
              const phaseLabel = getPhaseLabel(netzwerk.netzwerk_phase);
              const hatKonfiguration = !!(netzwerk.netzwerk_typ && netzwerk.bewilligung_datum);

              return (
                <div
                  key={netzwerk.id}
                  className={`bg-white rounded-xl border-2 transition-all duration-200 ${
                    isExpanded ? 'border-blue-300 shadow-md' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {/* Netzwerk-Zeile */}
                  <div
                    className="p-5 cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : netzwerk.id)}
                  >
                    <div className="flex items-start justify-between gap-4">

                      {/* Links: Info */}
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                          hatKonfiguration ? 'bg-blue-50' : 'bg-amber-50'
                        }`}>
                          <Network size={20} className={hatKonfiguration ? 'text-blue-600' : 'text-amber-500'} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-gray-900 text-sm">
                              {netzwerk.short_name || netzwerk.name}
                            </h3>
                            {typLabel && (
                              <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full font-medium">
                                {typLabel}
                              </span>
                            )}
                            {phaseLabel && (
                              <span className="text-xs px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full font-medium">
                                {phaseLabel}
                              </span>
                            )}
                            {!hatKonfiguration && (
                              <span className="text-xs px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full">
                                Konfiguration fehlt
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {netzwerk.client_company_name}
                            {netzwerk.funding_reference && (
                              <span className="ml-2 text-gray-400">FKZ: {netzwerk.funding_reference}</span>
                            )}
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5">
                            {fmtDate(netzwerk.start_date)} -- {fmtDate(netzwerk.end_date)}
                          </div>
                        </div>
                      </div>

                      {/* Rechts: Stats + Chevron */}
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Building2 size={13} className="text-gray-400" />
                            {netzwerk.partner_count} NP
                          </span>
                          {netzwerk.offene_ea > 0 && (
                            <span className="flex items-center gap-1 text-red-600 font-medium">
                              <Clock size={13} />
                              {netzwerk.offene_ea} EA offen
                            </span>
                          )}
                          {netzwerk.offene_ea === 0 && netzwerk.partner_count > 0 && (
                            <span className="flex items-center gap-1 text-green-600">
                              <CheckCircle size={13} />
                              EA ok
                            </span>
                          )}
                        </div>
                        <ChevronRight
                          size={18}
                          className={`text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Ausgeklapptes Auswahlmenue */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 px-5 py-4">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
                        Direktzugriff
                      </p>
                      <div className="grid grid-cols-3 gap-3">
                        {/* Einstellungen */}
                        <button
                          onClick={() => navigateTo(netzwerk, 'einstellungen')}
                          className="flex flex-col items-center gap-2 p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors group"
                        >
                          <div className="w-10 h-10 bg-gray-50 group-hover:bg-blue-100 rounded-lg flex items-center justify-center transition-colors">
                            <Settings size={20} className="text-gray-500 group-hover:text-blue-600" />
                          </div>
                          <div className="text-center">
                            <div className="text-sm font-medium text-gray-900 group-hover:text-blue-700">Einstellungen</div>
                            <div className="text-xs text-gray-400">Foerderparameter, Bankdaten</div>
                          </div>
                        </button>

                        {/* Netzwerkpartner */}
                        <button
                          onClick={() => navigateTo(netzwerk, 'partner')}
                          className="flex flex-col items-center gap-2 p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors group"
                        >
                          <div className="w-10 h-10 bg-gray-50 group-hover:bg-blue-100 rounded-lg flex items-center justify-center transition-colors">
                            <Building2 size={20} className="text-gray-500 group-hover:text-blue-600" />
                          </div>
                          <div className="text-center">
                            <div className="text-sm font-medium text-gray-900 group-hover:text-blue-700">Netzwerkpartner</div>
                            <div className="text-xs text-gray-400">
                              {netzwerk.partner_count} aktive Partner
                            </div>
                          </div>
                        </button>

                        {/* Eigenanteile */}
                        <button
                          onClick={() => navigateTo(netzwerk, 'eigenanteile')}
                          className="flex flex-col items-center gap-2 p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors group"
                        >
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                            netzwerk.offene_ea > 0
                              ? 'bg-red-50 group-hover:bg-red-100'
                              : 'bg-gray-50 group-hover:bg-blue-100'
                          }`}>
                            <CreditCard size={20} className={
                              netzwerk.offene_ea > 0
                                ? 'text-red-500 group-hover:text-red-600'
                                : 'text-gray-500 group-hover:text-blue-600'
                            } />
                          </div>
                          <div className="text-center">
                            <div className="text-sm font-medium text-gray-900 group-hover:text-blue-700">Eigenanteile</div>
                            <div className={`text-xs ${netzwerk.offene_ea > 0 ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                              {netzwerk.offene_ea > 0 ? `${netzwerk.offene_ea} offen` : 'Alles beglichen'}
                            </div>
                          </div>
                        </button>
                      </div>

                      {/* Link zum Gesamtprojekt */}
                      <div className="mt-3 pt-3 border-t border-gray-100 flex justify-end">
                        <button
                          onClick={() => router.push(`/v7/berater/foerderung/firma/${netzwerk.client_company_id}/projekt/${netzwerk.id}`)}
                          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-blue-600 transition-colors"
                        >
                          Zum Gesamtprojekt
                          <ChevronRight size={13} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {filtered.length === 0 && searchTerm && (
          <div className="text-center py-12 text-gray-400 text-sm">
            Keine Netzwerke gefunden fuer "{searchTerm}"
          </div>
        )}

      </main>

      <footer className="bg-white border-t mt-8">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <p className="text-center text-xs text-gray-400">
            PZE v7.4.5 &middot; Netzwerkmanagement
          </p>
        </div>
      </footer>

    </div>
  );
}
