// src/app/v7/berater/foerderung/firma/[id]/page.tsx
// ============================================================================
// PZE V7 - Berater-Portal Firmen-Ansicht (mit Tabs)
// ============================================================================
// Datum: 21. Januar 2026
// Version: 7.3.56
//
// KISS-Prinzip: Alles in einer Datei mit Tab-Parameter
// URL: /v7/berater/foerderung/firma/[id]?tab=firmendaten|projekte|mitarbeiter
//
// Tabs:
// - firmendaten (default): Firmen-Stammdaten anzeigen/bearbeiten
// - projekte: Projektliste mit Klick -> Projekt-Detail
// - mitarbeiter: Mitarbeiterliste
// ============================================================================

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
  ArrowLeft,
  Building2,
  FolderKanban,
  Users,
  ChevronRight,
  AlertCircle,
  Pencil,
  Save,
  X,
  Plus,
  Trash2,
  Search,
  MapPin,
  Phone,
  Mail,
  User,
} from 'lucide-react';

import PortalHeader from '@/components/shared/PortalHeader';

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

interface ClientCompany {
  id: string;
  name: string;
  short_name: string | null;
  street: string | null;
  zip_code: string | null;
  city: string | null;
  federal_state: string | null;
  contact_person: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  created_at: string;
}

interface Project {
  id: string;
  name: string;
  short_name: string | null;
  funding_reference: string | null;
  funding_format: string | null;
  start_date: string | null;
  end_date: string | null;
}

interface Employee {
  id: string;
  display_name: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  position_title: string | null;
  qualification: string | null;
  weekly_hours: number | null;
  employment_start: string | null;
}

// ============================================================================
// KONSTANTEN
// ============================================================================

const BUNDESLAENDER = [
  { code: 'DE-BW', name: 'Baden-Wuerttemberg' },
  { code: 'DE-BY', name: 'Bayern' },
  { code: 'DE-BE', name: 'Berlin' },
  { code: 'DE-BB', name: 'Brandenburg' },
  { code: 'DE-HB', name: 'Bremen' },
  { code: 'DE-HH', name: 'Hamburg' },
  { code: 'DE-HE', name: 'Hessen' },
  { code: 'DE-MV', name: 'Mecklenburg-Vorpommern' },
  { code: 'DE-NI', name: 'Niedersachsen' },
  { code: 'DE-NW', name: 'Nordrhein-Westfalen' },
  { code: 'DE-RP', name: 'Rheinland-Pfalz' },
  { code: 'DE-SL', name: 'Saarland' },
  { code: 'DE-SN', name: 'Sachsen' },
  { code: 'DE-ST', name: 'Sachsen-Anhalt' },
  { code: 'DE-SH', name: 'Schleswig-Holstein' },
  { code: 'DE-TH', name: 'Thueringen' },
];

const BUNDESLAND_NAMES: Record<string, string> = Object.fromEntries(
  BUNDESLAENDER.map(bl => [bl.code, bl.name])
);

type TabKey = 'firmendaten' | 'projekte' | 'mitarbeiter';

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
  const activeTab: TabKey = tabParam && ['firmendaten', 'projekte', 'mitarbeiter'].includes(tabParam) 
    ? tabParam 
    : 'firmendaten';

  // State - Basis
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [company, setCompany] = useState<ClientCompany | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  // State - Firmendaten bearbeiten
  const [editingCompany, setEditingCompany] = useState(false);
  const [companyForm, setCompanyForm] = useState<Partial<ClientCompany>>({});

  // State - Suche
  const [searchTerm, setSearchTerm] = useState('');

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

      const { data: companyData, error: companyError } = await supabase
        .from('v7_client_companies')
        .select('*')
        .eq('id', companyId)
        .single();

      if (companyError) {
        setError('Firma nicht gefunden');
        setLoading(false);
        return;
      }
      setCompany(companyData);

      const { data: projectsData } = await supabase
        .from('v7_projects')
        .select('id, name, short_name, funding_reference, funding_format, start_date, end_date')
        .eq('client_company_id', companyId)
        .eq('is_active', true)
        .order('start_date', { ascending: false });

      setProjects(projectsData || []);

      const { data: employeesData } = await supabase
        .from('v7_employees')
        .select('id, display_name, first_name, last_name, email, position_title, qualification, weekly_hours, employment_start')
        .eq('client_company_id', companyId)
        .eq('is_active', true)
        .order('display_name');

      setEmployees(employeesData || []);

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

  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('de-DE');
  };

  const getFundingFormatLabel = (format: string | null): string => {
    const formats: Record<string, string> = {
      'ZIM': 'ZIM',
      'ZIM_KOOP': 'ZIM Koop',
      'ZIM_NETZWERK': 'Netzwerk',
      'ZIM_DS': 'ZIM DS',
      'BMBF': 'BMBF',
      'BMBF_DS': 'BMBF DS',
    };
    return formats[format || ''] || format || '-';
  };

  const setTab = (tab: TabKey) => {
    router.push(`/v7/berater/foerderung/firma/${companyId}?tab=${tab}`);
  };

  // ============================================================================
  // FIRMENDATEN BEARBEITEN
  // ============================================================================

  const startEditCompany = () => {
    if (company) {
      setCompanyForm({ ...company });
      setEditingCompany(true);
    }
  };

  const cancelEditCompany = () => {
    setEditingCompany(false);
    setCompanyForm({});
  };

  const saveCompany = async () => {
    if (!company || !companyForm.name?.trim()) return;

    setSaving(true);
    try {
      const { error: updateError } = await supabase
        .from('v7_client_companies')
        .update({
          name: companyForm.name?.trim(),
          short_name: companyForm.short_name?.trim() || null,
          street: companyForm.street?.trim() || null,
          zip_code: companyForm.zip_code?.trim() || null,
          city: companyForm.city?.trim() || null,
          federal_state: companyForm.federal_state || null,
          contact_person: companyForm.contact_person?.trim() || null,
          contact_email: companyForm.contact_email?.trim() || null,
          contact_phone: companyForm.contact_phone?.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', company.id);

      if (updateError) throw updateError;

      setCompany({ ...company, ...companyForm } as ClientCompany);
      setEditingCompany(false);
    } catch (err: any) {
      alert('Fehler: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // ============================================================================
  // FILTER
  // ============================================================================

  const filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.funding_reference?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredEmployees = employees.filter(e =>
    e.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ============================================================================
  // TABS
  // ============================================================================

  const tabs: { key: TabKey; label: string; icon: React.ReactNode; count?: number }[] = [
    { key: 'firmendaten', label: 'Firmendaten', icon: <Building2 size={18} /> },
    { key: 'projekte', label: 'Projekte', icon: <FolderKanban size={18} />, count: projects.length },
    { key: 'mitarbeiter', label: 'Mitarbeiter', icon: <Users size={18} />, count: employees.length },
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

        {/* ============================================ */}
        {/* TAB: FIRMENDATEN */}
        {/* ============================================ */}
        {activeTab === 'firmendaten' && (
          <div className="space-y-6">
            {/* Firmenname Header */}
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900">{company.name}</h1>
              {!editingCompany && (
                <button
                  onClick={startEditCompany}
                  className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Pencil size={18} />
                  Bearbeiten
                </button>
              )}
            </div>

            {/* Firmendaten Card */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              {editingCompany ? (
                /* Bearbeitungsmodus */
                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Firmenname *</label>
                      <input
                        type="text"
                        value={companyForm.name || ''}
                        onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Kurzname</label>
                      <input
                        type="text"
                        value={companyForm.short_name || ''}
                        onChange={(e) => setCompanyForm({ ...companyForm, short_name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Strasse</label>
                      <input
                        type="text"
                        value={companyForm.street || ''}
                        onChange={(e) => setCompanyForm({ ...companyForm, street: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">PLZ</label>
                      <input
                        type="text"
                        value={companyForm.zip_code || ''}
                        onChange={(e) => setCompanyForm({ ...companyForm, zip_code: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Stadt</label>
                      <input
                        type="text"
                        value={companyForm.city || ''}
                        onChange={(e) => setCompanyForm({ ...companyForm, city: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Bundesland</label>
                      <select
                        value={companyForm.federal_state || ''}
                        onChange={(e) => setCompanyForm({ ...companyForm, federal_state: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">-- Bitte waehlen --</option>
                        {BUNDESLAENDER.map(bl => (
                          <option key={bl.code} value={bl.code}>{bl.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Ansprechpartner</label>
                      <input
                        type="text"
                        value={companyForm.contact_person || ''}
                        onChange={(e) => setCompanyForm({ ...companyForm, contact_person: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">E-Mail</label>
                      <input
                        type="email"
                        value={companyForm.contact_email || ''}
                        onChange={(e) => setCompanyForm({ ...companyForm, contact_email: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                      <input
                        type="tel"
                        value={companyForm.contact_phone || ''}
                        onChange={(e) => setCompanyForm({ ...companyForm, contact_phone: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <button
                      onClick={cancelEditCompany}
                      className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      Abbrechen
                    </button>
                    <button
                      onClick={saveCompany}
                      disabled={saving || !companyForm.name?.trim()}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                      <Save size={18} />
                      Speichern
                    </button>
                  </div>
                </div>
              ) : (
                /* Anzeigemodus */
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex items-start gap-3">
                      <Building2 className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div>
                        <div className="text-sm text-gray-500">Firma</div>
                        <div className="font-medium text-gray-900">{company.name}</div>
                        {company.short_name && (
                          <div className="text-sm text-gray-500">({company.short_name})</div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div>
                        <div className="text-sm text-gray-500">Adresse</div>
                        <div className="font-medium text-gray-900">
                          {company.street || '-'}<br />
                          {company.zip_code} {company.city}
                        </div>
                        {company.federal_state && (
                          <div className="text-sm text-gray-500">
                            {BUNDESLAND_NAMES[company.federal_state] || company.federal_state}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <User className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div>
                        <div className="text-sm text-gray-500">Ansprechpartner</div>
                        <div className="font-medium text-gray-900">{company.contact_person || '-'}</div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div>
                        <div className="text-sm text-gray-500">E-Mail</div>
                        {company.contact_email ? (
                          <a href={`mailto:${company.contact_email}`} className="font-medium text-blue-600 hover:underline">
                            {company.contact_email}
                          </a>
                        ) : (
                          <div className="font-medium text-gray-900">-</div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div>
                        <div className="text-sm text-gray-500">Telefon</div>
                        <div className="font-medium text-gray-900">{company.contact_phone || '-'}</div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Building2 className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div>
                        <div className="text-sm text-gray-500">Angelegt am</div>
                        <div className="font-medium text-gray-900">{formatDate(company.created_at)}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================ */}
        {/* TAB: PROJEKTE */}
        {/* ============================================ */}
        {activeTab === 'projekte' && (
          <div className="space-y-4">
            {/* Header mit Suche */}
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900">{company.name} - Projekte</h1>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Suchen..."
                  className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64"
                />
              </div>
            </div>

            {/* Projektliste */}
            {filteredProjects.length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                <FolderKanban className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">
                  {searchTerm ? 'Keine Projekte gefunden' : 'Noch keine Projekte vorhanden'}
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Projekt</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Format</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">FKZ</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Laufzeit</th>
                      <th className="px-6 py-3 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredProjects.map((project) => (
                      <tr
                        key={project.id}
                        onClick={() => router.push(`/v7/berater/foerderung/firma/${companyId}/projekt/${project.id}`)}
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900">{project.name}</div>
                          {project.short_name && (
                            <div className="text-sm text-gray-500">{project.short_name}</div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {project.funding_format && (
                            <span className="inline-flex px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-700">
                              {getFundingFormatLabel(project.funding_format)}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          {project.funding_reference || '-'}
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          {formatDate(project.start_date)} - {formatDate(project.end_date)}
                        </td>
                        <td className="px-6 py-4">
                          <ChevronRight size={18} className="text-gray-400" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ============================================ */}
        {/* TAB: MITARBEITER */}
        {/* ============================================ */}
        {activeTab === 'mitarbeiter' && (
          <div className="space-y-4">
            {/* Header mit Suche */}
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900">{company.name} - Mitarbeiter</h1>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Suchen..."
                  className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64"
                />
              </div>
            </div>

            {/* Mitarbeiterliste */}
            {filteredEmployees.length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">
                  {searchTerm ? 'Keine Mitarbeiter gefunden' : 'Noch keine Mitarbeiter vorhanden'}
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Position</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Qualifikation</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Std./Woche</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Seit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredEmployees.map((emp) => (
                      <tr key={emp.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900">{emp.display_name}</div>
                          {emp.email && (
                            <div className="text-sm text-gray-500">{emp.email}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          {emp.position_title || '-'}
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          {emp.qualification || '-'}
                        </td>
                        <td className="px-6 py-4 text-right text-gray-600">
                          {emp.weekly_hours || 40} h
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          {formatDate(emp.employment_start)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <p className="text-center text-sm text-gray-500">
            PZE v7.3.56 | {company.name}
          </p>
        </div>
      </footer>
    </div>
  );
}
