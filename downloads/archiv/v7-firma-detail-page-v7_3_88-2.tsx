'use client';

// ============================================================================
// BERATER-PORTAL: Firmen-Detail-Seite
// Version: 7.3.88-2
// Datum: 05. Februar 2026
// 
// Route: /v7/berater/foerderung/firma/[id]
// 
// TABS: Firmendaten | Projekte | Mitarbeiter | Zeiterfassung | Berichte
// ============================================================================

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import PortalHeader from '@/components/shared/PortalHeader';
import CompanyDataView from '@/components/shared/CompanyDataView';
import ProjectList from '@/components/shared/ProjectList';
import EmployeeManagement from '@/components/shared/EmployeeManagement';
import { 
  ArrowLeft, 
  Building2, 
  FolderKanban, 
  Users,
  Clock,
  BarChart3
} from 'lucide-react';

// Tab-Definition
type TabKey = 'firmendaten' | 'projekte' | 'mitarbeiter' | 'zeiterfassung' | 'berichte';

interface TabConfig {
  key: TabKey;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

export default function BeraterFirmaDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const firmaId = params.id as string;
  
  // Tab aus URL oder default
  const tabFromUrl = searchParams.get('tab') as TabKey | null;
  const [activeTab, setActiveTab] = useState<TabKey>(tabFromUrl || 'firmendaten');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [firma, setFirma] = useState<any>(null);
  const [projectCount, setProjectCount] = useState(0);
  const [employeeCount, setEmployeeCount] = useState(0);
  const [userProfile, setUserProfile] = useState<any>(null);

  // Tabs Konfiguration - ALLE 5 TABS
  const tabs: TabConfig[] = [
    { key: 'firmendaten', label: 'Firmendaten', icon: <Building2 className="w-4 h-4" /> },
    { key: 'projekte', label: 'Projekte', icon: <FolderKanban className="w-4 h-4" />, badge: projectCount },
    { key: 'mitarbeiter', label: 'Mitarbeiter', icon: <Users className="w-4 h-4" />, badge: employeeCount },
    { key: 'zeiterfassung', label: 'Zeiterfassung', icon: <Clock className="w-4 h-4" /> },
    { key: 'berichte', label: 'Berichte', icon: <BarChart3 className="w-4 h-4" /> },
  ];

  useEffect(() => {
    loadData();
  }, [firmaId]);

  // Tab-Wechsel mit URL-Update
  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab);
    
    // Fuer Zeiterfassung und Berichte: Navigation zu separaten Seiten
    if (tab === 'zeiterfassung') {
      router.push(`/v7/berater/foerderung/firma/${firmaId}/zeiterfassung`);
      return;
    }
    if (tab === 'berichte') {
      router.push(`/v7/berater/foerderung/firma/${firmaId}/berichte`);
      return;
    }
    
    // URL aktualisieren fuer andere Tabs
    const newUrl = `/v7/berater/foerderung/firma/${firmaId}?tab=${tab}`;
    window.history.pushState({}, '', newUrl);
  };

  async function loadData() {
    try {
      setLoading(true);
      const supabase = createClient();

      // User-Profil laden
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('v7_user_profiles')
        .select('*')
        .eq('email', user.email)
        .single();

      if (!profile || (profile.role !== 'consultant' && profile.role !== 'system_admin')) {
        router.push('/v7/berater');
        return;
      }
      setUserProfile(profile);

      // Firmendaten laden
      const { data: firmaData, error: firmaError } = await supabase
        .from('v7_client_companies')
        .select('*')
        .eq('id', firmaId)
        .single();

      if (firmaError || !firmaData) {
        setError('Firma nicht gefunden');
        return;
      }
      setFirma(firmaData);

      // Projekt-Anzahl laden
      const { count: pCount } = await supabase
        .from('v7_projects')
        .select('*', { count: 'exact', head: true })
        .eq('client_company_id', firmaId);
      setProjectCount(pCount || 0);

      // Mitarbeiter-Anzahl laden
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

  // Zurueck zur Firmenliste
  const handleBack = () => {
    router.push('/v7/berater/foerderung');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PortalHeader 
          portal="berater"
          firmaName="Laden..."
          userName=""
          userRole="consultant"
        />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#002451]"></div>
        </div>
      </div>
    );
  }

  if (error || !firma) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PortalHeader 
          portal="berater"
          firmaName="Fehler"
          userName=""
          userRole="consultant"
        />
        <div className="max-w-4xl mx-auto p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            {error || 'Firma nicht gefunden'}
          </div>
          <button
            onClick={handleBack}
            className="mt-4 text-[#002451] hover:underline flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Zurueck zur Firmenliste
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - IMMER BLAU (Berater-Portal) */}
      <PortalHeader 
        portal="berater"
        firmaName={firma.name}
        userName={userProfile?.display_name || userProfile?.email || ''}
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
              Zurueck
            </button>

            {/* Tabs */}
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={`flex items-center gap-2 py-4 border-b-2 whitespace-nowrap transition-colors ${
                  activeTab === tab.key
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
        {activeTab === 'firmendaten' && (
          <CompanyDataView 
            companyId={firmaId}
            portal="berater"
            onUpdate={loadData}
          />
        )}

        {activeTab === 'projekte' && (
          <ProjectList 
            companyId={firmaId}
            portal="berater"
          />
        )}

        {activeTab === 'mitarbeiter' && (
          <EmployeeManagement
            companyId={firmaId}
            portal="berater"
            onUpdate={loadData}
          />
        )}
      </div>
    </div>
  );
}
