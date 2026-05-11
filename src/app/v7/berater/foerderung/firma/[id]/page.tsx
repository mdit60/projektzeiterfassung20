'use client';

// ============================================================================
// BERATER-PORTAL: Firmen-Detail-Seite
// Version: 7.4.4-5
// v7.4.4-5: openNew aus searchParams lesen, an EmployeeManagement weitergeben
//
// Route: /v7/berater/foerderung/firma/[id]
//
// TABS: Firmendaten | Projekte | Mitarbeiter | Zeiterfassung | Berichte
//
// v7.4.4-4: handleBack -> Kundenfirmen-Liste (/berater/foerderung) statt Dashboard
//            Zurueck-Button Label: "Kundenfirmen" (war: "Zurueck")
// v7.4.4-3: Firmendaten-Tab ersetzt durch FirmendatenCard (Shared Component)
//            Bearbeiten-Modal jetzt funktional fuer alle Berater-Rollen
// FIX v7.4.4-2: firmaName -> companyName (Header zeigt jetzt Firmenname)
// FIX v7.4.4-1: handleBack -> Dashboard statt Kundenfirmen-Liste
// FIX v7.3.88-9: onUpdate entfernt (nicht im EmployeeManagement Interface)
// FIX v7.3.88-8: canEdit=true an EmployeeManagement uebergeben (Bearbeiten-Buttons)
// FIX v7.3.88-5: Bei tab=berichte oder tab=zeiterfassung zur separaten Seite weiterleiten
// FIX v7.3.88-3: CompanyDataView ersetzt durch inline Firmendaten
// ============================================================================

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import PortalHeader from '@/components/shared/PortalHeader';
import ProjectList from '@/components/shared/ProjectList';
import EmployeeManagement from '@/components/shared/EmployeeManagement';
import FirmendatenCard from '@/components/shared/FirmendatenCard';
import {
  ArrowLeft,
  Building2,
  FolderKanban,
  Users,
  Clock,
  BarChart3,
} from 'lucide-react';

// ============================================================================
// TYPEN
// ============================================================================

type TabKey = 'firmendaten' | 'projekte' | 'mitarbeiter' | 'zeiterfassung' | 'berichte';

interface TabConfig {
  key: TabKey;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  isExternal?: boolean;
}

interface ClientCompany {
  id: string;
  name: string;
}

// ============================================================================
// KOMPONENTE
// ============================================================================

export default function BeraterFirmaDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const firmaId = params.id as string;

  const tabFromUrl = searchParams.get('tab') as TabKey | null;
  const openNew = searchParams.get('openNew') === 'true';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [firmaName, setFirmaName] = useState('');
  const [projectCount, setProjectCount] = useState(0);
  const [employeeCount, setEmployeeCount] = useState(0);
  const [userDisplayName, setUserDisplayName] = useState('');

  const [activeTab, setActiveTab] = useState<TabKey>(() => {
    if (tabFromUrl === 'zeiterfassung' || tabFromUrl === 'berichte') {
      return 'firmendaten';
    }
    return tabFromUrl || 'firmendaten';
  });

  const tabs: TabConfig[] = [
    { key: 'firmendaten', label: 'Firmendaten', icon: <Building2 className="w-4 h-4" /> },
    { key: 'projekte', label: 'Projekte', icon: <FolderKanban className="w-4 h-4" />, badge: projectCount },
    { key: 'mitarbeiter', label: 'Mitarbeiter', icon: <Users className="w-4 h-4" />, badge: employeeCount },
    { key: 'zeiterfassung', label: 'Zeiterfassung', icon: <Clock className="w-4 h-4" />, isExternal: true },
    { key: 'berichte', label: 'Berichte', icon: <BarChart3 className="w-4 h-4" />, isExternal: true },
  ];

  // Weiterleitung fuer externe Tabs
  useEffect(() => {
    if (tabFromUrl === 'zeiterfassung') {
      router.replace(`/v7/berater/foerderung/firma/${firmaId}/zeiterfassung`);
    } else if (tabFromUrl === 'berichte') {
      router.replace(`/v7/berater/foerderung/firma/${firmaId}/berichte`);
    }
  }, [tabFromUrl, firmaId, router]);

  useEffect(() => {
    loadData();
  }, [firmaId]);

  // ==========================================================================
  // DATEN LADEN
  // ==========================================================================

  async function loadData() {
    try {
      setLoading(true);
      const supabase = createClient();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('v7_user_profiles')
        .select('display_name, email, role')
        .eq('id', user.id)
        .single();

      if (!profile || (profile.role !== 'consultant' && profile.role !== 'system_admin')) {
        router.push('/v7/berater');
        return;
      }
      setUserDisplayName(profile.display_name || profile.email || '');

      // Nur Name laden fuer Header (Rest uebernimmt FirmendatenCard)
      const { data: firmaData, error: firmaError } = await supabase
        .from('v7_client_companies')
        .select('id, name')
        .eq('id', firmaId)
        .single();

      if (firmaError || !firmaData) {
        setError('Firma nicht gefunden');
        return;
      }
      setFirmaName(firmaData.name);

      // Zaehler laden
      const { count: pCount } = await supabase
        .from('v7_projects')
        .select('*', { count: 'exact', head: true })
        .eq('client_company_id', firmaId);
      setProjectCount(pCount || 0);

      const { count: eCount } = await supabase
        .from('v7_employees')
        .select('*', { count: 'exact', head: true })
        .eq('client_company_id', firmaId)
        .eq('is_active', true);
      setEmployeeCount(eCount || 0);

    } catch (err) {
      console.error('Fehler beim Laden:', err);
      setError('Fehler beim Laden der Daten');
    } finally {
      setLoading(false);
    }
  }

  // ==========================================================================
  // NAVIGATION
  // ==========================================================================

  const handleBack = () => {
    router.push('/v7/berater/foerderung');
  };

  const handleTabChange = (tab: TabKey) => {
    if (tab === 'zeiterfassung') {
      router.push(`/v7/berater/foerderung/firma/${firmaId}/zeiterfassung`);
      return;
    }
    if (tab === 'berichte') {
      router.push(`/v7/berater/foerderung/firma/${firmaId}/berichte`);
      return;
    }
    setActiveTab(tab);
    window.history.pushState({}, '', `/v7/berater/foerderung/firma/${firmaId}?tab=${tab}`);
  };

  // ==========================================================================
  // RENDER: LOADING / ERROR
  // ==========================================================================

  if (tabFromUrl === 'zeiterfassung' || tabFromUrl === 'berichte') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#002451]"></div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PortalHeader
          portal="berater"
          companyName="Laden..."
          userName=""
          userRole="consultant"
        />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#002451]"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PortalHeader
          portal="berater"
          companyName="Fehler"
          userName=""
          userRole="consultant"
        />
        <div className="max-w-4xl mx-auto p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            {error}
          </div>
          <button
            onClick={handleBack}
            className="mt-4 text-[#002451] hover:underline flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Zurueck
          </button>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // RENDER: HAUPTANSICHT
  // ==========================================================================

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header - IMMER BLAU (Berater-Portal) */}
      <PortalHeader
        portal="berater"
        companyName={firmaName}
        userName={userDisplayName}
        userRole="consultant"
      />

      {/* Tab-Navigation */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6 overflow-x-auto">

            {/* Zurueck-Button */}
            <button
              onClick={handleBack}
              className="flex items-center gap-2 py-4 text-gray-600 hover:text-[#002451] whitespace-nowrap"
            >
              <ArrowLeft className="w-4 h-4" />
              Kundenfirmen
            </button>

            {/* Tabs */}
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={`flex items-center gap-2 py-4 border-b-2 whitespace-nowrap transition-colors ${
                  activeTab === tab.key && !tab.isExternal
                    ? 'border-[#002451] text-[#002451]'
                    : 'border-transparent text-gray-600 hover:text-[#002451] hover:border-gray-300'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="ml-1 px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab-Inhalt */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* FIRMENDATEN - Shared Component */}
        {activeTab === 'firmendaten' && (
          <FirmendatenCard
            firmaId={firmaId}
            portal="berater"
            canEdit={true}
          />
        )}

        {/* PROJEKTE */}
        {activeTab === 'projekte' && (
          <ProjectList
            companyId={firmaId}
            portal="berater"
          />
        )}

        {/* MITARBEITER */}
        {activeTab === 'mitarbeiter' && (
          <EmployeeManagement
            companyId={firmaId}
            portal="berater"
            canEdit={true}
            openNew={openNew}
          />
        )}

      </div>
    </div>
  );
}
