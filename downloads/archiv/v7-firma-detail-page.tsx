// src/app/v7/berater/foerderung/firma/[id]/page.tsx
// VERSION: v7.1.2 - Firmen-Detailseite für Förderberatung
// DATUM: 03. Januar 2026

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

// ============================================
// TYPEN
// ============================================

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
  internal_notes: string | null;
  is_active: boolean;
  created_at: string;
}

interface Project {
  id: string;
  name: string;
  short_name: string | null;
  funding_reference: string | null;
  funding_format: string;
  start_date: string | null;
  end_date: string | null;
  fzul_vorhaben_title: string | null;
  is_active: boolean;
}

interface Employee {
  id: string;
  display_name: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  position: string | null;
  qualification: string | null;
  weekly_hours: number | null;
  employment_start: string | null;
  employment_end: string | null;
  is_active: boolean;
}

interface WorkPackage {
  id: string;
  project_id: string;
  ap_number: number;
  ap_code: string | null;
  name: string;
  start_month: number | null;
  end_month: number | null;
  total_person_months: number | null;
  total_costs: number | null;
}

interface ProjectBudget {
  id: string;
  project_id: string;
  total_costs: number | null;
  personnel_costs: number | null;
  funding_rate: number | null;
  funding_amount: number | null;
  duration_months: number | null;
  total_person_months: number | null;
}

// ============================================
// BUNDESLÄNDER MAPPING
// ============================================

const BUNDESLAND_NAMES: Record<string, string> = {
  'DE-BW': 'Baden-Württemberg',
  'DE-BY': 'Bayern',
  'DE-BE': 'Berlin',
  'DE-BB': 'Brandenburg',
  'DE-HB': 'Bremen',
  'DE-HH': 'Hamburg',
  'DE-HE': 'Hessen',
  'DE-MV': 'Mecklenburg-Vorpommern',
  'DE-NI': 'Niedersachsen',
  'DE-NW': 'Nordrhein-Westfalen',
  'DE-RP': 'Rheinland-Pfalz',
  'DE-SL': 'Saarland',
  'DE-SN': 'Sachsen',
  'DE-ST': 'Sachsen-Anhalt',
  'DE-SH': 'Schleswig-Holstein',
  'DE-TH': 'Thüringen',
};

// ============================================
// KOMPONENTE
// ============================================

export default function FirmaDetailPage() {
  const router = useRouter();
  const params = useParams();
  const companyId = params.id as string;
  const supabase = createClient();

  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [company, setCompany] = useState<ClientCompany | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [workPackages, setWorkPackages] = useState<WorkPackage[]>([]);
  const [projectBudgets, setProjectBudgets] = useState<Record<string, ProjectBudget>>({});
  
  // Tab-State
  const [activeTab, setActiveTab] = useState<'overview' | 'projects' | 'employees' | 'workpackages'>('overview');
  
  // Expandierte Projekte für Arbeitspakete-Ansicht
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());

  // ============================================
  // DATEN LADEN
  // ============================================

  useEffect(() => {
    if (companyId) {
      loadAllData();
    }
  }, [companyId]);

  const loadAllData = async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Firma laden
      const { data: companyData, error: companyError } = await supabase
        .from('v7_client_companies')
        .select('*')
        .eq('id', companyId)
        .single();

      if (companyError) throw new Error(`Firma nicht gefunden: ${companyError.message}`);
      setCompany(companyData);

      // 2. Projekte laden
      const { data: projectsData, error: projectsError } = await supabase
        .from('v7_projects')
        .select('*')
        .eq('client_company_id', companyId)
        .eq('is_active', true)
        .order('start_date', { ascending: false });

      if (projectsError) throw new Error(`Projekte-Fehler: ${projectsError.message}`);
      setProjects(projectsData || []);

      // 3. Mitarbeiter laden
      const { data: employeesData, error: employeesError } = await supabase
        .from('v7_employees')
        .select('*')
        .eq('client_company_id', companyId)
        .eq('is_active', true)
        .order('display_name');

      if (employeesError) throw new Error(`Mitarbeiter-Fehler: ${employeesError.message}`);
      setEmployees(employeesData || []);

      // 4. Arbeitspakete laden (für alle Projekte dieser Firma)
      if (projectsData && projectsData.length > 0) {
        const projectIds = projectsData.map(p => p.id);
        
        const { data: wpData, error: wpError } = await supabase
          .from('v7_work_packages')
          .select('*')
          .in('project_id', projectIds)
          .eq('is_active', true)
          .order('ap_number');

        if (wpError) throw new Error(`Arbeitspakete-Fehler: ${wpError.message}`);
        setWorkPackages(wpData || []);

        // 5. Budgets laden
        const { data: budgetData, error: budgetError } = await supabase
          .from('v7_project_budget')
          .select('*')
          .in('project_id', projectIds);

        if (!budgetError && budgetData) {
          const budgetMap: Record<string, ProjectBudget> = {};
          budgetData.forEach(b => {
            budgetMap[b.project_id] = b;
          });
          setProjectBudgets(budgetMap);
        }
      }

    } catch (err: any) {
      console.error('Fehler beim Laden:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // HILFSFUNKTIONEN
  // ============================================

  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('de-DE');
  };

  const formatCurrency = (value: number | null): string => {
    if (value === null || value === undefined) return '-';
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number | null): string => {
    if (value === null || value === undefined) return '-';
    return `${value.toFixed(1)}%`;
  };

  const getFundingFormatBadge = (format: string) => {
    const styles: Record<string, string> = {
      'zim': 'bg-blue-100 text-blue-800',
      'bmbf': 'bg-purple-100 text-purple-800',
      'fzul': 'bg-green-100 text-green-800',
    };
    const labels: Record<string, string> = {
      'zim': 'ZIM',
      'bmbf': 'BMBF',
      'fzul': 'FZul',
    };
    const style = styles[format.toLowerCase()] || 'bg-gray-100 text-gray-800';
    const label = labels[format.toLowerCase()] || format;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${style}`}>
        {label}
      </span>
    );
  };

  const toggleProjectExpanded = (projectId: string) => {
    const newSet = new Set(expandedProjects);
    if (newSet.has(projectId)) {
      newSet.delete(projectId);
    } else {
      newSet.add(projectId);
    }
    setExpandedProjects(newSet);
  };

  const getWorkPackagesForProject = (projectId: string) => {
    return workPackages.filter(wp => wp.project_id === projectId);
  };

  // ============================================
  // RENDER: LOADING / ERROR
  // ============================================

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Lade Firmendaten...</p>
        </div>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Fehler</h2>
          <p className="text-gray-600 mb-6">{error || 'Firma nicht gefunden'}</p>
          <button
            onClick={() => router.push('/v7/berater/foerderung')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Zurück zur Übersicht
          </button>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER: HAUPTSEITE
  // ============================================

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/v7/berater/foerderung')}
                className="text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Zurück
              </button>
              <div className="h-6 w-px bg-gray-300"></div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{company.name}</h1>
                <p className="text-sm text-gray-500">
                  {company.city ? `${company.zip_code} ${company.city}` : 'Förderberatung'}
                  {company.federal_state && ` • ${BUNDESLAND_NAMES[company.federal_state] || company.federal_state}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href={`/v7/berater/foerderung/import?company=${companyId}`}
                className="px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 text-sm font-medium"
              >
                + Projekt importieren
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex gap-8">
            {[
              { id: 'overview', label: 'Übersicht', icon: '📊' },
              { id: 'projects', label: `Projekte (${projects.length})`, icon: '📁' },
              { id: 'employees', label: `Mitarbeiter (${employees.length})`, icon: '👥' },
              { id: 'workpackages', label: `Arbeitspakete (${workPackages.length})`, icon: '📋' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* ============================================ */}
        {/* TAB: ÜBERSICHT */}
        {/* ============================================ */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Statistik-Karten */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-3xl font-bold text-blue-600">{projects.length}</div>
                <div className="text-sm text-gray-500 mt-1">Förderprojekte</div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-3xl font-bold text-green-600">{employees.length}</div>
                <div className="text-sm text-gray-500 mt-1">Mitarbeiter</div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-3xl font-bold text-purple-600">{workPackages.length}</div>
                <div className="text-sm text-gray-500 mt-1">Arbeitspakete</div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-3xl font-bold text-amber-600">
                  {formatCurrency(
                    Object.values(projectBudgets).reduce((sum, b) => sum + (b.funding_amount || 0), 0)
                  )}
                </div>
                <div className="text-sm text-gray-500 mt-1">Fördervolumen gesamt</div>
              </div>
            </div>

            {/* Firmen-Details */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b">
                <h2 className="text-lg font-semibold text-gray-900">Firmendaten</h2>
              </div>
              <div className="p-6">
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Firmenname</dt>
                    <dd className="mt-1 text-sm text-gray-900">{company.name}</dd>
                  </div>
                  {company.short_name && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Kurzname</dt>
                      <dd className="mt-1 text-sm text-gray-900">{company.short_name}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Adresse</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {company.street && <div>{company.street}</div>}
                      {(company.zip_code || company.city) && (
                        <div>{company.zip_code} {company.city}</div>
                      )}
                      {!company.street && !company.zip_code && !company.city && '-'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Bundesland</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {company.federal_state ? BUNDESLAND_NAMES[company.federal_state] || company.federal_state : '-'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Ansprechpartner</dt>
                    <dd className="mt-1 text-sm text-gray-900">{company.contact_person || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">E-Mail</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {company.contact_email ? (
                        <a href={`mailto:${company.contact_email}`} className="text-blue-600 hover:underline">
                          {company.contact_email}
                        </a>
                      ) : '-'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Telefon</dt>
                    <dd className="mt-1 text-sm text-gray-900">{company.contact_phone || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Angelegt am</dt>
                    <dd className="mt-1 text-sm text-gray-900">{formatDate(company.created_at)}</dd>
                  </div>
                </dl>
                {company.internal_notes && (
                  <div className="mt-6 pt-6 border-t">
                    <dt className="text-sm font-medium text-gray-500 mb-2">Interne Notizen</dt>
                    <dd className="text-sm text-gray-700 bg-gray-50 p-3 rounded">{company.internal_notes}</dd>
                  </div>
                )}
              </div>
            </div>

            {/* Letzte Projekte */}
            {projects.length > 0 && (
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-gray-900">Aktuelle Projekte</h2>
                  <button
                    onClick={() => setActiveTab('projects')}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Alle anzeigen →
                  </button>
                </div>
                <div className="divide-y">
                  {projects.slice(0, 3).map(project => (
                    <div key={project.id} className="p-4 hover:bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">{project.name}</span>
                            {getFundingFormatBadge(project.funding_format)}
                          </div>
                          {project.funding_reference && (
                            <p className="text-sm text-gray-500 mt-1">FKZ: {project.funding_reference}</p>
                          )}
                        </div>
                        <div className="text-right text-sm text-gray-500">
                          {formatDate(project.start_date)} - {formatDate(project.end_date)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================ */}
        {/* TAB: PROJEKTE */}
        {/* ============================================ */}
        {activeTab === 'projects' && (
          <div className="space-y-4">
            {projects.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <div className="text-5xl mb-4">📁</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Keine Projekte vorhanden</h3>
                <p className="text-gray-500 mb-6">Importieren Sie einen ZIM-Antrag, um das erste Projekt anzulegen.</p>
                <Link
                  href={`/v7/berater/foerderung/import?company=${companyId}`}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  + Projekt importieren
                </Link>
              </div>
            ) : (
              projects.map(project => {
                const budget = projectBudgets[project.id];
                const wps = getWorkPackagesForProject(project.id);
                
                return (
                  <div key={project.id} className="bg-white rounded-lg shadow">
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <div className="flex items-center gap-3">
                            <h3 className="text-lg font-semibold text-gray-900">{project.name}</h3>
                            {getFundingFormatBadge(project.funding_format)}
                          </div>
                          {project.short_name && (
                            <p className="text-sm text-gray-500 mt-1">Kurzname: {project.short_name}</p>
                          )}
                        </div>
                        <div className="text-right">
                          {project.funding_reference && (
                            <div className="text-sm font-medium text-gray-900">FKZ: {project.funding_reference}</div>
                          )}
                          <div className="text-sm text-gray-500">
                            {formatDate(project.start_date)} - {formatDate(project.end_date)}
                          </div>
                        </div>
                      </div>

                      {/* Budget-Info */}
                      {budget && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg mb-4">
                          <div>
                            <div className="text-xs text-gray-500 uppercase">Gesamtkosten</div>
                            <div className="font-semibold text-gray-900">{formatCurrency(budget.total_costs)}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 uppercase">Förderung</div>
                            <div className="font-semibold text-green-600">{formatCurrency(budget.funding_amount)}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 uppercase">Förderquote</div>
                            <div className="font-semibold text-gray-900">{formatPercent(budget.funding_rate)}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 uppercase">Laufzeit</div>
                            <div className="font-semibold text-gray-900">{budget.duration_months || '-'} Monate</div>
                          </div>
                        </div>
                      )}

                      {/* Arbeitspakete-Kurzübersicht */}
                      {wps.length > 0 && (
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <span>📋 {wps.length} Arbeitspakete</span>
                          <span>•</span>
                          <span>
                            {wps.reduce((sum, wp) => sum + (wp.total_person_months || 0), 0).toFixed(1)} PM gesamt
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ============================================ */}
        {/* TAB: MITARBEITER */}
        {/* ============================================ */}
        {activeTab === 'employees' && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {employees.length === 0 ? (
              <div className="p-12 text-center">
                <div className="text-5xl mb-4">👥</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Keine Mitarbeiter vorhanden</h3>
                <p className="text-gray-500">Mitarbeiter werden beim Import von Projekten automatisch angelegt.</p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Position / Qualifikation
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Wochenstunden
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Beschäftigt seit
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {employees.map(emp => (
                    <tr key={emp.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{emp.display_name}</div>
                        {emp.email && <div className="text-sm text-gray-500">{emp.email}</div>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{emp.position || '-'}</div>
                        {emp.qualification && (
                          <div className="text-sm text-gray-500">{emp.qualification}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {emp.weekly_hours ? `${emp.weekly_hours} h` : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(emp.employment_start)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          emp.is_active && !emp.employment_end
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {emp.is_active && !emp.employment_end ? 'Aktiv' : 'Inaktiv'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ============================================ */}
        {/* TAB: ARBEITSPAKETE */}
        {/* ============================================ */}
        {activeTab === 'workpackages' && (
          <div className="space-y-4">
            {projects.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <div className="text-5xl mb-4">📋</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Keine Arbeitspakete vorhanden</h3>
                <p className="text-gray-500">Arbeitspakete werden beim Import von ZIM-Anträgen automatisch angelegt.</p>
              </div>
            ) : (
              projects.map(project => {
                const wps = getWorkPackagesForProject(project.id);
                const isExpanded = expandedProjects.has(project.id);

                if (wps.length === 0) return null;

                return (
                  <div key={project.id} className="bg-white rounded-lg shadow">
                    {/* Projekt-Header */}
                    <button
                      onClick={() => toggleProjectExpanded(project.id)}
                      className="w-full px-6 py-4 flex justify-between items-center hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <svg
                          className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        <div className="text-left">
                          <div className="font-medium text-gray-900">{project.name}</div>
                          {project.funding_reference && (
                            <div className="text-sm text-gray-500">FKZ: {project.funding_reference}</div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {getFundingFormatBadge(project.funding_format)}
                        <span className="text-sm text-gray-500">{wps.length} AP</span>
                      </div>
                    </button>

                    {/* Arbeitspakete-Liste */}
                    {isExpanded && (
                      <div className="border-t divide-y">
                        {wps.map(wp => (
                          <div key={wp.id} className="px-6 py-4 pl-14 hover:bg-gray-50">
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-800 text-sm font-medium">
                                    {wp.ap_code || `AP${wp.ap_number}`}
                                  </span>
                                  <span className="font-medium text-gray-900">{wp.name}</span>
                                </div>
                                {(wp.start_month || wp.end_month) && (
                                  <p className="text-sm text-gray-500 mt-1 ml-10">
                                    Monat {wp.start_month || '?'} - {wp.end_month || '?'}
                                  </p>
                                )}
                              </div>
                              <div className="text-right">
                                {wp.total_person_months && (
                                  <div className="text-sm font-medium text-gray-900">
                                    {wp.total_person_months} PM
                                  </div>
                                )}
                                {wp.total_costs && (
                                  <div className="text-sm text-gray-500">
                                    {formatCurrency(wp.total_costs)}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

      </main>
    </div>
  );
}
