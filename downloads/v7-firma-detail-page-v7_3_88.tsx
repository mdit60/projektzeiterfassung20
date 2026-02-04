// src/app/v7/berater/foerderung/firma/[id]/page.tsx
// ============================================================================
// PZE V7 - Berater-Portal Firmen-Ansicht (mit Shared Components)
// ============================================================================
// Datum: 05. Februar 2026
// Version: 7.3.88
//
// v7.3.88: NEU: Zeiterfassung + Berichte Tabs hinzugefuegt
// v7.3.57: Nutzt Shared Components
//
// URL: /v7/berater/foerderung/firma/[id]?tab=firmendaten|projekte|mitarbeiter|zeiterfassung|berichte
// ============================================================================

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  ArrowLeft,
  Building2,
  FolderKanban,
  Users,
  Clock,
  BarChart3,
  AlertCircle,
} from 'lucide-react';

import PortalHeader from '@/components/shared/PortalHeader';
import ProjectList, { Project } from '@/components/shared/ProjectList';
import CompanyDataView, { CompanyData } from '@/components/shared/CompanyDataView';
import EmployeeManagement from '@/components/shared/EmployeeManagement';

// ============================================================================
// TYPEN
// ============================================================================

interface UserProfile {
  id: string;
  email: string;
  role: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
}

type TabKey = 'firmendaten' | 'projekte' | 'mitarbeiter' | 'zeiterfassung' | 'berichte';

// ============================================================================
// KOMPONENTE
// ============================================================================

export default function BeraterFirmaAnsicht() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const companyId = params.id as string;
  const supabase = createClient();

  // Tab aus URL
  const tabParam = searchParams.get('tab') as TabKey | null;
  const activeTab: TabKey = tabParam && ['firmendaten', 'projekte', 'mitarbeiter', 'zeiterfassung', 'berichte'].includes(tabParam)
    ? tabParam
    : 'firmendaten';

  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);

  // ============================================================================
  // DATEN LADEN
  // ============================================================================

  useEffect(() => {
    if (companyId) loadData();
  }, [companyId]);

  const loadData = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        router.push('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('v7_user_profiles')
        .select('*')
        .eq('email', user.email)
        .maybeSingle();

      if (!profile || !['system_admin', 'consultant'].includes(profile.role)) {
        setError('Keine Berater-Berechtigung');
        setLoading(false);
        return;
      }
      setUserProfile(profile);

      // Firma laden
      const { data: companyData, error: companyError } = await supabase
        .from('v7_client_companies')
        .select('id, name, short_name, street, zip_code, city, federal_state, contact_person, contact_email, contact_phone, created_at')
        .eq('id', companyId)
        .single();

      if (companyError) {
        setError('Firma nicht gefunden');
        setLoading(false);
        return;
      }
      setCompany(companyData);

      // Projekte laden
      const { data: projectsData } = await supabase
        .from('v7_projects')
        .select('id, name, short_name, funding_reference, funding_format, start_date, end_date')
        .eq('client_company_id', companyId)
        .eq('is_active', true)
        .order('name');

      setProjects(projectsData || []);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // HILFSFUNKTIONEN
  // ============================================================================

  const getUserName = (): string => {
    if (userProfile?.display_name) return userProfile.display_name;
    if (userProfile?.first_name && userProfile?.last_name) {
      return `${userProfile.first_name} ${userProfile.last_name}`;
    }
    return userProfile?.email?.split('@')[0] || 'Berater';
  };

  const setTab = (tab: TabKey) => {
    router.push(`/v7/berater/foerderung/firma/${companyId}?tab=${tab}`);
  };

  const handleProjectClick = (projectId: string) => {
    router.push(`/v7/berater/foerderung/firma/${companyId}/projekt/${projectId}`);
  };

  const handleSaveCompany = async (data: CompanyData) => {
    const { error: updateError } = await supabase
      .from('v7_client_companies')
      .update({
        name: data.name,
        short_name: data.short_name,
        street: data.street,
        zip_code: data.zip_code,
        city: data.city,
        federal_state: data.federal_state,
        contact_person: data.contact_person,
        contact_email: data.contact_email,
        contact_phone: data.contact_phone,
        updated_at: new Date().toISOString(),
      })
      .eq('id', data.id);

    if (updateError) throw updateError;

    // Lokalen State aktualisieren
    setCompany(data);
  };

  // ============================================================================
  // TABS
  // ============================================================================

  const tabs: { key: TabKey; label: string; icon: React.ReactNode; count?: number }[] = [
    { key: 'firmendaten', label: 'Firmendaten', icon: <Building2 size={18} /> },
    { key: 'projekte', label: 'Projekte', icon: <FolderKanban size={18} />, count: projects.length },
    { key: 'mitarbeiter', label: 'Mitarbeiter', icon: <Users size={18} /> },
    { key: 'zeiterfassung', label: 'Zeiterfassung', icon: <Clock size={18} /> },
    { key: 'berichte', label: 'Berichte', icon: <BarChart3 size={18} /> },
  ];

  // ============================================================================
  // RENDER - LOADING / ERROR
  // ============================================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">{error || 'Firma nicht gefunden'}</p>
          <button
            onClick={() => router.push('/v7/berater/foerderung')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Zurueck zur Uebersicht
          </button>
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER - MAIN
  // ============================================================================

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <PortalHeader
        portal="berater"
        userName={getUserName()}
        userRole={userProfile?.role as any || 'consultant'}
        companyName={company.name}
      />

      {/* Sub-Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6">
            {/* Zurueck-Button */}
            <button
              onClick={() => router.push('/v7/berater/foerderung')}
              className="flex items-center gap-1 py-4 text-gray-500 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft size={18} />
              <span className="text-sm">Zurueck</span>
            </button>

            <div className="h-6 w-px bg-gray-200"></div>

            {/* Tabs */}
            <nav className="flex gap-1">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setTab(tab.key)}
                  className={`flex items-center gap-2 px-4 py-4 text-sm font-medium border-b-2 transition-colors
                    ${activeTab === tab.key
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                    }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span className="ml-1 px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">

        {/* TAB: FIRMENDATEN */}
        {activeTab === 'firmendaten' && (
          <CompanyDataView
            portal="berater"
            company={company}
            canEdit={true}
            onSave={handleSaveCompany}
          />
        )}

        {/* TAB: PROJEKTE */}
        {activeTab === 'projekte' && (
          <ProjectList
            portal="berater"
            projects={projects}
            onProjectClick={handleProjectClick}
            title={`${company.name} - Projekte`}
            showNewButton={false}
          />
        )}

        {/* TAB: MITARBEITER */}
        {activeTab === 'mitarbeiter' && (
          <EmployeeManagement
            portal="berater"
            companyId={company.id}
            canEdit={true}
            title={`${company.name} - Mitarbeiter`}
          />
        )}

        {/* TAB: ZEITERFASSUNG */}
        {activeTab === 'zeiterfassung' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Zeiterfassung - {company.name}
            </h2>
            <p className="text-gray-600 mb-6">
              Erfassen und verwalten Sie die Arbeitszeiten der Mitarbeiter fuer diese Firma.
            </p>
            <button
              onClick={() => router.push(`/v7/berater/foerderung/firma/${company.id}/zeiterfassung`)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Zeiterfassung oeffnen
            </button>
          </div>
        )}

        {/* TAB: BERICHTE */}
        {activeTab === 'berichte' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Berichte & Controlling - {company.name}
            </h2>
            <p className="text-gray-600 mb-6">
              Uebersicht ueber Projekte, Kosten und Zeiterfassungs-Status dieser Firma.
            </p>
            <button
              onClick={() => router.push(`/v7/berater/foerderung/firma/${company.id}/berichte`)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Berichte oeffnen
            </button>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <p className="text-center text-sm text-gray-500">
            PZE v7.3.88 | {company.name}
          </p>
        </div>
      </footer>
    </div>
  );
}
