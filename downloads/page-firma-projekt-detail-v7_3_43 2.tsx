// src/app/v7/firma/projekte/[id]/page.tsx
// ============================================================================
// PZE V7 - Projekt-Detail (Firmen-Portal)
// ============================================================================
// Datum: 21. Januar 2026
// Version: 7.3.43
//
// FIXES:
// - Arbeitspakete: total_person_months statt planned_pm
// - Stunden: Berechnung aus PM * 173.33
// - Team-Mitglieder aus work_package_assignments laden
// - Foerderformat -> Foerderprogramm
// - Bearbeiten Button (Grundfunktion)
// ============================================================================

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  ArrowLeft,
  FolderKanban,
  Package,
  Users,
  Clock,
  AlertCircle,
  Pencil,
  X,
  Save,
} from 'lucide-react';

// Komponenten
import PortalHeader from '@/components/shared/PortalHeader';

// Types
import { V7UserRole, V7EmployeePortalRole, V7Employee, V7ClientCompany } from '@/types/v7-types';

// Konstante: Stunden pro PM
const HOURS_PER_PM = 173.33;

// ============================================================================
// TYPEN
// ============================================================================

interface UserProfile {
  id: string;
  email: string;
  role: V7UserRole;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  client_company_id: string | null;
}

interface Project {
  id: string;
  name: string;
  short_name: string | null;
  funding_format: string | null;
  funding_reference: string | null;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
  is_active: boolean;
}

interface WorkPackage {
  id: string;
  ap_number: number;
  ap_sub_number: number | null;
  name: string;
  total_person_months: number | null;
  total_costs: number | null;
}

interface TeamMember {
  employee_id: string;
  employee_name: string;
  total_pm: number;
}

type TabKey = 'uebersicht' | 'arbeitspakete' | 'team' | 'zeiterfassung';

// ============================================================================
// KOMPONENTE
// ============================================================================

export default function ProjektDetail() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;
  const supabase = createClient();

  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [employee, setEmployee] = useState<V7Employee | null>(null);
  const [company, setCompany] = useState<V7ClientCompany | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [workPackages, setWorkPackages] = useState<WorkPackage[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>('uebersicht');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [saving, setSaving] = useState(false);

  // ============================================================================
  // DATEN LADEN
  // ============================================================================

  useEffect(() => {
    loadData();
  }, [projectId]);

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

      if (!profile || !profile.client_company_id) {
        setError('Kein Zugriff');
        setLoading(false);
        return;
      }

      setUserProfile(profile);

      const { data: companyData } = await supabase
        .from('v7_client_companies')
        .select('*')
        .eq('id', profile.client_company_id)
        .single();

      if (companyData) setCompany(companyData);

      const { data: employeeData } = await supabase
        .from('v7_employees')
        .select('*')
        .eq('client_company_id', profile.client_company_id)
        .eq('email', user.email)
        .maybeSingle();

      if (employeeData) setEmployee(employeeData);

      // Projekt laden
      const { data: projectData, error: projectError } = await supabase
        .from('v7_projects')
        .select('*')
        .eq('id', projectId)
        .eq('client_company_id', profile.client_company_id)
        .single();

      if (projectError || !projectData) {
        setError('Projekt nicht gefunden');
        setLoading(false);
        return;
      }

      setProject(projectData);

      // Arbeitspakete laden - KORRIGIERT: total_person_months
      const { data: wpData } = await supabase
        .from('v7_work_packages')
        .select('id, ap_number, ap_sub_number, name, total_person_months, total_costs')
        .eq('project_id', projectId)
        .eq('is_active', true)
        .order('ap_number')
        .order('ap_sub_number');

      if (wpData) setWorkPackages(wpData);

      // Team laden aus work_package_assignments
      const { data: teamData } = await supabase
        .from('v7_work_package_assignments')
        .select(`
          employee_id,
          planned_person_months,
          v7_employees!inner(display_name),
          v7_work_packages!inner(project_id)
        `)
        .eq('v7_work_packages.project_id', projectId)
        .eq('is_active', true);

      if (teamData) {
        // Gruppieren nach Mitarbeiter
        const teamMap = new Map<string, { name: string; pm: number }>();
        teamData.forEach((item: any) => {
          const empId = item.employee_id;
          const empName = item.v7_employees?.display_name || 'Unbekannt';
          const pm = item.planned_person_months || 0;
          
          if (teamMap.has(empId)) {
            const existing = teamMap.get(empId)!;
            existing.pm += pm;
          } else {
            teamMap.set(empId, { name: empName, pm: pm });
          }
        });
        
        const members: TeamMember[] = [];
        teamMap.forEach((value, key) => {
          members.push({
            employee_id: key,
            employee_name: value.name,
            total_pm: value.pm
          });
        });
        setTeamMembers(members);
      }

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // PROJEKT SPEICHERN
  // ============================================================================

  const handleSaveProject = async () => {
    if (!editProject || !project) return;
    
    setSaving(true);
    try {
      const { error: updateError } = await supabase
        .from('v7_projects')
        .update({
          name: editProject.name,
          short_name: editProject.short_name,
          funding_format: editProject.funding_format,
          funding_reference: editProject.funding_reference,
          notes: editProject.notes,
        })
        .eq('id', project.id);

      if (updateError) throw updateError;

      setProject(editProject);
      setShowEditModal(false);
    } catch (err: any) {
      alert('Fehler beim Speichern: ' + err.message);
    } finally {
      setSaving(false);
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
    return userProfile?.email?.split('@')[0] || 'Benutzer';
  };

  const getPortalRole = (): V7EmployeePortalRole => {
    if (userProfile?.role === 'client_admin') return 'client_admin';
    if (employee?.portal_role) return employee.portal_role;
    return 'employee';
  };

  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('de-DE');
  };

  const formatAPCode = (apNumber: number, apSubNumber: number | null): string => {
    if (apSubNumber === null || apSubNumber === 0) {
      return `AP${apNumber}`;
    }
    return `AP${apNumber}.${apSubNumber}`;
  };

  const getTotalPM = (): number => {
    return workPackages.reduce((sum, wp) => sum + (wp.total_person_months || 0), 0);
  };

  const getTotalHours = (): number => {
    return getTotalPM() * HOURS_PER_PM;
  };

  const getTeamTotalPM = (): number => {
    return teamMembers.reduce((sum, tm) => sum + tm.total_pm, 0);
  };

  // ============================================================================
  // TABS
  // ============================================================================

  const tabs: { key: TabKey; label: string; icon: React.ReactNode; count?: number }[] = [
    { key: 'uebersicht', label: 'Uebersicht', icon: <FolderKanban size={18} /> },
    { key: 'arbeitspakete', label: 'Arbeitspakete', icon: <Package size={18} />, count: workPackages.length },
    { key: 'team', label: 'Team', icon: <Users size={18} />, count: teamMembers.length },
    { key: 'zeiterfassung', label: 'Zeiterfassung', icon: <Clock size={18} /> },
  ];

  // ============================================================================
  // RENDER
  // ============================================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-green-200 border-t-green-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">{error || 'Projekt nicht gefunden'}</p>
          <button
            onClick={() => router.push('/v7/firma/projekte')}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Zurueck zur Liste
          </button>
        </div>
      </div>
    );
  }

  const userName = getUserName();
  const portalRole = getPortalRole();
  const isAdmin = portalRole === 'client_admin';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <PortalHeader
        portal="firma"
        userName={userName}
        userRole={portalRole}
        companyName={company?.name || 'Firma'}
      />

      {/* Projekt-Header mit Zurueck-Button */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/v7/firma/projekte')}
                className="flex items-center gap-1 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft size={20} />
                <span className="text-sm">Projekte</span>
              </button>
              <div className="h-6 w-px bg-gray-300"></div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{project.name}</h1>
                <div className="flex items-center gap-3 text-sm text-gray-500">
                  {project.funding_format && (
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">
                      {project.funding_format}
                    </span>
                  )}
                  {project.funding_reference && (
                    <span>FKZ: {project.funding_reference}</span>
                  )}
                </div>
              </div>
            </div>
            
            {isAdmin && (
              <button
                onClick={() => {
                  setEditProject({ ...project });
                  setShowEditModal(true);
                }}
                className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 
                           hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Pencil size={18} />
                <span className="hidden sm:inline text-sm">Bearbeiten</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Projekt-Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center space-x-1 overflow-x-auto -mb-px">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 
                           transition-colors whitespace-nowrap
                           ${activeTab === tab.key
                             ? 'border-green-600 text-green-600'
                             : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                           }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`ml-1 px-2 py-0.5 text-xs rounded-full
                    ${activeTab === tab.key ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        
        {/* Tab: Uebersicht */}
        {activeTab === 'uebersicht' && (
          <div className="space-y-6">
            {/* Stammdaten */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Projektdaten</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="text-sm text-gray-500 mb-1">Projektname</div>
                  <div className="text-gray-900">{project.name}</div>
                </div>
                {project.short_name && (
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Kurzname</div>
                    <div className="text-gray-900">{project.short_name}</div>
                  </div>
                )}
                <div>
                  <div className="text-sm text-gray-500 mb-1">Foerderprogramm</div>
                  <div className="text-gray-900">{project.funding_format || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">Foerderkennzeichen (FKZ)</div>
                  <div className="text-gray-900">{project.funding_reference || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">Laufzeit</div>
                  <div className="text-gray-900">
                    {formatDate(project.start_date)} - {formatDate(project.end_date)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">Geplante PM gesamt</div>
                  <div className="text-gray-900">{getTotalPM().toFixed(2)} PM</div>
                </div>
              </div>
              {project.notes && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="text-sm text-gray-500 mb-1">Notizen</div>
                  <div className="text-gray-900 whitespace-pre-wrap">{project.notes}</div>
                </div>
              )}
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Package className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{workPackages.length}</div>
                    <div className="text-sm text-gray-500">Arbeitspakete</div>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Users className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{teamMembers.length}</div>
                    <div className="text-sm text-gray-500">Teammitglieder</div>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Clock className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{getTotalPM().toFixed(1)}</div>
                    <div className="text-sm text-gray-500">PM geplant</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Arbeitspakete */}
        {activeTab === 'arbeitspakete' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Arbeitspakete</h2>
              {isAdmin && (
                <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white 
                                   rounded-lg hover:bg-green-700 transition-colors text-sm">
                  + AP hinzufuegen
                </button>
              )}
            </div>

            {workPackages.length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Keine Arbeitspakete vorhanden</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">AP</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Bezeichnung</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">PM</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Stunden</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {workPackages.map((wp) => (
                      <tr key={wp.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <span className="font-mono text-sm font-medium text-green-600">
                            {formatAPCode(wp.ap_number, wp.ap_sub_number)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-900">{wp.name}</td>
                        <td className="px-4 py-3 text-right text-gray-600">
                          {wp.total_person_months?.toFixed(2) || '-'}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600">
                          {wp.total_person_months 
                            ? Math.round(wp.total_person_months * HOURS_PER_PM)
                            : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t border-gray-200">
                    <tr>
                      <td className="px-4 py-3 font-semibold text-gray-900" colSpan={2}>Gesamt</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">
                        {getTotalPM().toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">
                        {Math.round(getTotalHours())}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab: Team */}
        {activeTab === 'team' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Team</h2>
              {isAdmin && (
                <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white 
                                   rounded-lg hover:bg-green-700 transition-colors text-sm">
                  + Mitarbeiter zuordnen
                </button>
              )}
            </div>

            {teamMembers.length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Keine Mitarbeiter zugeordnet</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Mitarbeiter</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">PM gesamt</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Stunden</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {teamMembers.map((tm) => (
                      <tr key={tm.employee_id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-900">{tm.employee_name}</td>
                        <td className="px-4 py-3 text-right text-gray-600">
                          {tm.total_pm.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600">
                          {Math.round(tm.total_pm * HOURS_PER_PM)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t border-gray-200">
                    <tr>
                      <td className="px-4 py-3 font-semibold text-gray-900">Gesamt</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">
                        {getTeamTotalPM().toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">
                        {Math.round(getTeamTotalPM() * HOURS_PER_PM)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab: Zeiterfassung */}
        {activeTab === 'zeiterfassung' && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Zeiterfassung</h2>
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
              <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Zeiterfassung wird in der naechsten Version implementiert</p>
            </div>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <p className="text-center text-sm text-gray-500">
            PZE v7.3.43 - Firmen-Portal
          </p>
        </div>
      </footer>

      {/* Bearbeiten Modal */}
      {showEditModal && editProject && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Projekt bearbeiten</h3>
              <button onClick={() => setShowEditModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X size={20} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Projektname *</label>
                <input
                  type="text"
                  value={editProject.name}
                  onChange={(e) => setEditProject({ ...editProject, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kurzname</label>
                <input
                  type="text"
                  value={editProject.short_name || ''}
                  onChange={(e) => setEditProject({ ...editProject, short_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Foerderprogramm</label>
                <select
                  value={editProject.funding_format || ''}
                  onChange={(e) => setEditProject({ ...editProject, funding_format: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  <option value="">-- Bitte waehlen --</option>
                  <option value="ZIM">ZIM Einzelprojekt</option>
                  <option value="ZIM_KOOP">ZIM Kooperationsprojekt</option>
                  <option value="ZIM_NETZWERK">ZIM Netzwerk</option>
                  <option value="BMBF">BMBF</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">FKZ</label>
                <input
                  type="text"
                  value={editProject.funding_reference || ''}
                  onChange={(e) => setEditProject({ ...editProject, funding_reference: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notizen</label>
                <textarea
                  value={editProject.notes || ''}
                  onChange={(e) => setEditProject({ ...editProject, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-4 border-t">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Abbrechen
              </button>
              <button
                onClick={handleSaveProject}
                disabled={saving || !editProject.name}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg 
                           hover:bg-green-700 disabled:opacity-50"
              >
                {saving ? 'Speichern...' : <><Save size={18} /> Speichern</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
