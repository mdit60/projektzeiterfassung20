// src/app/v7/firmen/[id]/page.tsx
// VERSION: v7.0.3 - Korrigiert für v7_projects DB-Schema
'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

// ============================================
// INTERFACES - angepasst an DB-Schema
// ============================================

interface ClientCompany {
  id: string;
  consultant_id: string;
  name: string;
  short_name?: string;
  federal_state: string;
  street?: string;
  zip_code?: string;
  city?: string;
  contact_person?: string;
  contact_email?: string;
  contact_phone?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
}

interface Employee {
  id: string;
  client_company_id: string;
  display_name: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  weekly_hours: number;
  annual_leave_days: number;
  employment_start?: string;
  employment_end?: string;
  position_title?: string;
  is_active: boolean;
  created_at: string;
}

interface Project {
  id: string;
  client_company_id: string;
  name: string;
  short_name?: string;
  funding_reference?: string;
  funding_format?: string;
  start_date?: string;
  end_date?: string;
  is_active: boolean;
  fzul_vorhaben_title?: string;
  fzul_vorhaben_id?: string;
  notes?: string;
  created_at: string;
}

// Bundesländer
const FEDERAL_STATES: Record<string, string> = {
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
  'DE-TH': 'Thüringen'
};

// ============================================
// HAUPTKOMPONENTE
// ============================================

export default function FirmaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: firmaId } = use(params);
  const router = useRouter();
  const supabase = createClient();

  // States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [firma, setFirma] = useState<ClientCompany | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  
  const [activeTab, setActiveTab] = useState<'overview' | 'employees' | 'projects' | 'fzul'>('overview');
  
  // Modals
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  
  // Formulare
  const [employeeForm, setEmployeeForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    weekly_hours: 40,
    annual_leave_days: 30,
    position_title: '',
    is_active: true
  });
  
  const [projectForm, setProjectForm] = useState({
    name: '',
    short_name: '',
    funding_reference: '',
    funding_format: 'ZIM',
    start_date: '',
    end_date: '',
    is_active: true,
    fzul_vorhaben_title: '',
    fzul_vorhaben_id: '',
    notes: ''
  });

  // ============================================
  // DATEN LADEN
  // ============================================

  useEffect(() => {
    loadData();
  }, [firmaId]);

  async function loadData() {
    setLoading(true);
    try {
      // Firma laden
      const { data: firmaData, error: firmaError } = await supabase
        .from('v7_client_companies')
        .select('*')
        .eq('id', firmaId)
        .single();
      
      if (firmaError) throw firmaError;
      setFirma(firmaData);
      
      // Mitarbeiter laden
      const { data: empData } = await supabase
        .from('v7_employees')
        .select('*')
        .eq('client_company_id', firmaId)
        .order('display_name');
      
      setEmployees(empData || []);
      
      // Projekte laden
      const { data: projData } = await supabase
        .from('v7_projects')
        .select('*')
        .eq('client_company_id', firmaId)
        .order('name');
      
      setProjects(projData || []);
      
    } catch (err) {
      console.error('Fehler beim Laden:', err);
      setError('Firma konnte nicht geladen werden');
    } finally {
      setLoading(false);
    }
  }

  // ============================================
  // MITARBEITER CRUD
  // ============================================

  function openNewEmployeeModal() {
    setEditingEmployee(null);
    setEmployeeForm({
      first_name: '',
      last_name: '',
      email: '',
      weekly_hours: 40,
      annual_leave_days: 30,
      position_title: '',
      is_active: true
    });
    setShowEmployeeModal(true);
  }

  function openEditEmployeeModal(emp: Employee) {
    setEditingEmployee(emp);
    setEmployeeForm({
      first_name: emp.first_name || '',
      last_name: emp.last_name || '',
      email: emp.email || '',
      weekly_hours: emp.weekly_hours,
      annual_leave_days: emp.annual_leave_days,
      position_title: emp.position_title || '',
      is_active: emp.is_active
    });
    setShowEmployeeModal(true);
  }

  async function saveEmployee() {
    if (!employeeForm.last_name.trim()) {
      setError('Bitte Nachname eingeben');
      return;
    }

    // display_name im Format "Nachname, Vorname"
    const displayName = employeeForm.first_name 
      ? `${employeeForm.last_name.trim()}, ${employeeForm.first_name.trim()}`
      : employeeForm.last_name.trim();

    try {
      if (editingEmployee) {
        const { error } = await supabase
          .from('v7_employees')
          .update({
            display_name: displayName,
            first_name: employeeForm.first_name.trim() || null,
            last_name: employeeForm.last_name.trim(),
            email: employeeForm.email.trim() || null,
            weekly_hours: employeeForm.weekly_hours,
            annual_leave_days: employeeForm.annual_leave_days,
            position_title: employeeForm.position_title.trim() || null,
            is_active: employeeForm.is_active,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingEmployee.id);
        
        if (error) throw error;
        setSuccess('Mitarbeiter aktualisiert');
      } else {
        const { error } = await supabase
          .from('v7_employees')
          .insert({
            client_company_id: firmaId,
            display_name: displayName,
            first_name: employeeForm.first_name.trim() || null,
            last_name: employeeForm.last_name.trim(),
            email: employeeForm.email.trim() || null,
            weekly_hours: employeeForm.weekly_hours,
            annual_leave_days: employeeForm.annual_leave_days,
            position_title: employeeForm.position_title.trim() || null,
            is_active: employeeForm.is_active
          });
        
        if (error) throw error;
        setSuccess('Mitarbeiter angelegt');
      }

      setShowEmployeeModal(false);
      loadData();
    } catch (err: any) {
      console.error('Fehler:', err);
      setError(err.message || 'Fehler beim Speichern');
    }
  }

  async function deleteEmployee(emp: Employee) {
    if (!confirm(`Mitarbeiter "${emp.display_name}" wirklich löschen?`)) return;
    
    try {
      const { error } = await supabase
        .from('v7_employees')
        .delete()
        .eq('id', emp.id);
      
      if (error) throw error;
      setSuccess('Mitarbeiter gelöscht');
      loadData();
    } catch (err: any) {
      setError(err.message || 'Fehler beim Löschen');
    }
  }

  // ============================================
  // PROJEKTE CRUD
  // ============================================

  function openNewProjectModal() {
    setEditingProject(null);
    setProjectForm({
      name: '',
      short_name: '',
      funding_reference: '',
      funding_format: 'ZIM',
      start_date: '',
      end_date: '',
      is_active: true,
      fzul_vorhaben_title: '',
      fzul_vorhaben_id: '',
      notes: ''
    });
    setShowProjectModal(true);
  }

  function openEditProjectModal(proj: Project) {
    setEditingProject(proj);
    setProjectForm({
      name: proj.name,
      short_name: proj.short_name || '',
      funding_reference: proj.funding_reference || '',
      funding_format: proj.funding_format || 'ZIM',
      start_date: proj.start_date || '',
      end_date: proj.end_date || '',
      is_active: proj.is_active,
      fzul_vorhaben_title: proj.fzul_vorhaben_title || '',
      fzul_vorhaben_id: proj.fzul_vorhaben_id || '',
      notes: proj.notes || ''
    });
    setShowProjectModal(true);
  }

  async function saveProject() {
    if (!projectForm.name.trim()) {
      setError('Bitte Projektname eingeben');
      return;
    }

    try {
      if (editingProject) {
        const { error } = await supabase
          .from('v7_projects')
          .update({
            name: projectForm.name.trim(),
            short_name: projectForm.short_name.trim() || null,
            funding_reference: projectForm.funding_reference.trim() || null,
            funding_format: projectForm.funding_format || null,
            start_date: projectForm.start_date || null,
            end_date: projectForm.end_date || null,
            is_active: projectForm.is_active,
            fzul_vorhaben_title: projectForm.fzul_vorhaben_title.trim() || null,
            fzul_vorhaben_id: projectForm.fzul_vorhaben_id.trim() || null,
            notes: projectForm.notes.trim() || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingProject.id);
        
        if (error) throw error;
        setSuccess('Projekt aktualisiert');
      } else {
        const { error } = await supabase
          .from('v7_projects')
          .insert({
            client_company_id: firmaId,
            name: projectForm.name.trim(),
            short_name: projectForm.short_name.trim() || null,
            funding_reference: projectForm.funding_reference.trim() || null,
            funding_format: projectForm.funding_format || null,
            start_date: projectForm.start_date || null,
            end_date: projectForm.end_date || null,
            is_active: projectForm.is_active,
            fzul_vorhaben_title: projectForm.fzul_vorhaben_title.trim() || null,
            fzul_vorhaben_id: projectForm.fzul_vorhaben_id.trim() || null,
            notes: projectForm.notes.trim() || null
          });
        
        if (error) throw error;
        setSuccess('Projekt angelegt');
      }

      setShowProjectModal(false);
      loadData();
    } catch (err: any) {
      console.error('Fehler:', err);
      setError(err.message || 'Fehler beim Speichern');
    }
  }

  async function deleteProject(proj: Project) {
    if (!confirm(`Projekt "${proj.name}" wirklich löschen?`)) return;
    
    try {
      const { error } = await supabase
        .from('v7_projects')
        .delete()
        .eq('id', proj.id);
      
      if (error) throw error;
      setSuccess('Projekt gelöscht');
      loadData();
    } catch (err: any) {
      setError(err.message || 'Fehler beim Löschen');
    }
  }

  // ============================================
  // RENDER
  // ============================================

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!firma) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Firma nicht gefunden</p>
        <Link href="/v7" className="text-blue-600 hover:underline mt-4 block">
          ← Zurück zur Übersicht
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Notifications */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex justify-between">
          {error}
          <button onClick={() => setError('')}>✕</button>
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex justify-between">
          {success}
          <button onClick={() => setSuccess('')}>✕</button>
        </div>
      )}

      {/* Firma Header */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">🏢 {firma.name}</h1>
            {firma.short_name && <p className="text-gray-500">{firma.short_name}</p>}
            <p className="text-gray-600 mt-1">
              📍 {FEDERAL_STATES[firma.federal_state] || firma.federal_state}
              {firma.city && ` • ${firma.city}`}
            </p>
            {firma.contact_person && (
              <p className="text-gray-500 text-sm mt-2">
                👤 {firma.contact_person}
                {firma.contact_email && ` • ${firma.contact_email}`}
              </p>
            )}
          </div>
          <div className="text-right">
            <div className="flex gap-4 text-sm">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{employees.length}</div>
                <div className="text-gray-500">Mitarbeiter</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{projects.length}</div>
                <div className="text-gray-500">Projekte</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-4">
          {[
            { id: 'overview', label: '📊 Übersicht' },
            { id: 'employees', label: '👥 Mitarbeiter', count: employees.length },
            { id: 'projects', label: '📁 Projekte', count: projects.length },
            { id: 'fzul', label: '📝 FZul-Editor' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className="ml-2 bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow-sm border">
        
        {/* ÜBERSICHT TAB */}
        {activeTab === 'overview' && (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Firma-Details */}
              <div>
                <h3 className="font-bold text-gray-900 mb-4">Firmendaten</h3>
                <dl className="space-y-2 text-sm">
                  <div className="flex">
                    <dt className="w-32 text-gray-500">Name:</dt>
                    <dd className="font-medium">{firma.name}</dd>
                  </div>
                  <div className="flex">
                    <dt className="w-32 text-gray-500">Kurzname:</dt>
                    <dd>{firma.short_name || '-'}</dd>
                  </div>
                  <div className="flex">
                    <dt className="w-32 text-gray-500">Bundesland:</dt>
                    <dd>{FEDERAL_STATES[firma.federal_state] || firma.federal_state}</dd>
                  </div>
                  {firma.city && (
                    <div className="flex">
                      <dt className="w-32 text-gray-500">Ort:</dt>
                      <dd>{firma.zip_code} {firma.city}</dd>
                    </div>
                  )}
                </dl>
              </div>
              
              {/* Kontakt */}
              <div>
                <h3 className="font-bold text-gray-900 mb-4">Ansprechpartner</h3>
                <dl className="space-y-2 text-sm">
                  <div className="flex">
                    <dt className="w-32 text-gray-500">Name:</dt>
                    <dd>{firma.contact_person || '-'}</dd>
                  </div>
                  <div className="flex">
                    <dt className="w-32 text-gray-500">E-Mail:</dt>
                    <dd>{firma.contact_email || '-'}</dd>
                  </div>
                  <div className="flex">
                    <dt className="w-32 text-gray-500">Telefon:</dt>
                    <dd>{firma.contact_phone || '-'}</dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-blue-600">{employees.filter(e => e.is_active).length}</div>
                <div className="text-sm text-blue-700">Aktive MA</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-green-600">{projects.filter(p => p.is_active).length}</div>
                <div className="text-sm text-green-700">Laufende Projekte</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-purple-600">
                  {employees.reduce((sum, e) => sum + e.weekly_hours, 0)}h
                </div>
                <div className="text-sm text-purple-700">Wochenstunden ges.</div>
              </div>
              <div className="bg-orange-50 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-orange-600">0</div>
                <div className="text-sm text-orange-700">Importierte Monate</div>
              </div>
            </div>
          </div>
        )}

        {/* MITARBEITER TAB */}
        {activeTab === 'employees' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-900">👥 Mitarbeiter ({employees.length})</h3>
              <button
                onClick={openNewEmployeeModal}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
              >
                + Neuer Mitarbeiter
              </button>
            </div>

            {employees.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <div className="text-4xl mb-4">👥</div>
                <p>Noch keine Mitarbeiter angelegt</p>
                <button
                  onClick={openNewEmployeeModal}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Ersten Mitarbeiter anlegen
                </button>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="px-4 py-3 text-left text-sm font-medium">Name</th>
                    <th className="px-4 py-3 text-center text-sm font-medium">Wochenstunden</th>
                    <th className="px-4 py-3 text-center text-sm font-medium">Urlaub</th>
                    <th className="px-4 py-3 text-center text-sm font-medium">Position</th>
                    <th className="px-4 py-3 text-center text-sm font-medium">Status</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Aktionen</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map(emp => (
                    <tr key={emp.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{emp.display_name}</td>
                      <td className="px-4 py-3 text-center">{emp.weekly_hours}h</td>
                      <td className="px-4 py-3 text-center">{emp.annual_leave_days} Tage</td>
                      <td className="px-4 py-3 text-center text-gray-500">{emp.position_title || '-'}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded text-xs ${
                          emp.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {emp.is_active ? 'Aktiv' : 'Inaktiv'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button 
                          onClick={() => openEditEmployeeModal(emp)}
                          className="text-blue-600 hover:underline text-sm mr-3"
                        >
                          Bearbeiten
                        </button>
                        <button 
                          onClick={() => deleteEmployee(emp)}
                          className="text-red-600 hover:underline text-sm"
                        >
                          Löschen
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* PROJEKTE TAB */}
        {activeTab === 'projects' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-900">📁 Projekte ({projects.length})</h3>
              <button
                onClick={openNewProjectModal}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
              >
                + Neues Projekt
              </button>
            </div>

            {projects.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <div className="text-4xl mb-4">📁</div>
                <p>Noch keine Projekte angelegt</p>
                <button
                  onClick={openNewProjectModal}
                  className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Erstes Projekt anlegen
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {projects.map(proj => (
                  <div key={proj.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-gray-900">{proj.name}</h4>
                        {proj.short_name && <p className="text-gray-500 text-sm">{proj.short_name}</p>}
                        <div className="flex gap-4 mt-2 text-sm">
                          {proj.funding_reference && (
                            <span className="text-blue-600">FKZ: {proj.funding_reference}</span>
                          )}
                          {proj.funding_format && (
                            <span className={`px-2 py-0.5 rounded text-xs ${
                              proj.funding_format === 'ZIM' ? 'bg-blue-100 text-blue-800' :
                              proj.funding_format === 'BMBF_KMU' ? 'bg-purple-100 text-purple-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {proj.funding_format}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-1 rounded text-xs ${
                          proj.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {proj.is_active ? 'Laufend' : 'Abgeschlossen'}
                        </span>
                        <button 
                          onClick={() => openEditProjectModal(proj)}
                          className="text-blue-600 hover:underline text-sm"
                        >
                          Bearbeiten
                        </button>
                        <button 
                          onClick={() => deleteProject(proj)}
                          className="text-red-600 hover:underline text-sm"
                        >
                          Löschen
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* FZUL TAB */}
        {activeTab === 'fzul' && (
          <div className="p-6 text-center py-12">
            <div className="text-4xl mb-4">📝</div>
            <h3 className="font-bold text-gray-900 mb-2">FZul-Editor</h3>
            <p className="text-gray-500 mb-6">
              Hier können Sie die Forschungszulage-Stundennachweise bearbeiten.
            </p>
            <p className="text-orange-600 text-sm">
              ⚠️ FZul-Editor wird in der nächsten Version implementiert.
            </p>
          </div>
        )}
      </div>

      {/* MITARBEITER MODAL */}
      {showEmployeeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">
              {editingEmployee ? '✏️ Mitarbeiter bearbeiten' : '➕ Neuer Mitarbeiter'}
            </h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Nachname *</label>
                  <input
                    type="text"
                    value={employeeForm.last_name}
                    onChange={e => setEmployeeForm({...employeeForm, last_name: e.target.value})}
                    className="w-full border rounded px-3 py-2"
                    placeholder="Mustermann"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Vorname</label>
                  <input
                    type="text"
                    value={employeeForm.first_name}
                    onChange={e => setEmployeeForm({...employeeForm, first_name: e.target.value})}
                    className="w-full border rounded px-3 py-2"
                    placeholder="Max"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">E-Mail</label>
                <input
                  type="email"
                  value={employeeForm.email}
                  onChange={e => setEmployeeForm({...employeeForm, email: e.target.value})}
                  className="w-full border rounded px-3 py-2"
                  placeholder="m.mustermann@firma.de"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Wochenstunden</label>
                  <input
                    type="number"
                    value={employeeForm.weekly_hours}
                    onChange={e => setEmployeeForm({...employeeForm, weekly_hours: parseFloat(e.target.value) || 40})}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Urlaubstage</label>
                  <input
                    type="number"
                    value={employeeForm.annual_leave_days}
                    onChange={e => setEmployeeForm({...employeeForm, annual_leave_days: parseInt(e.target.value) || 30})}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Position</label>
                <input
                  type="text"
                  value={employeeForm.position_title}
                  onChange={e => setEmployeeForm({...employeeForm, position_title: e.target.value})}
                  className="w-full border rounded px-3 py-2"
                  placeholder="z.B. Entwickler"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="emp_active"
                  checked={employeeForm.is_active}
                  onChange={e => setEmployeeForm({...employeeForm, is_active: e.target.checked})}
                  className="w-4 h-4"
                />
                <label htmlFor="emp_active" className="text-sm">Aktiver Mitarbeiter</label>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowEmployeeModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Abbrechen
              </button>
              <button
                onClick={saveEmployee}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Speichern
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PROJEKT MODAL */}
      {showProjectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">
              {editingProject ? '✏️ Projekt bearbeiten' : '➕ Neues Projekt'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Projektname *</label>
                <input
                  type="text"
                  value={projectForm.name}
                  onChange={e => setProjectForm({...projectForm, name: e.target.value})}
                  className="w-full border rounded px-3 py-2"
                  placeholder="z.B. KI-EasyMold"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Kurzname</label>
                  <input
                    type="text"
                    value={projectForm.short_name}
                    onChange={e => setProjectForm({...projectForm, short_name: e.target.value})}
                    className="w-full border rounded px-3 py-2"
                    placeholder="KI-EM"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Förderkennzeichen</label>
                  <input
                    type="text"
                    value={projectForm.funding_reference}
                    onChange={e => setProjectForm({...projectForm, funding_reference: e.target.value})}
                    className="w-full border rounded px-3 py-2"
                    placeholder="16KN087520"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Förderprogramm</label>
                  <select
                    value={projectForm.funding_format}
                    onChange={e => setProjectForm({...projectForm, funding_format: e.target.value})}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="ZIM">ZIM</option>
                    <option value="BMBF_KMU">BMBF/KMU-innovativ</option>
                    <option value="FZUL">Forschungszulage</option>
                    <option value="OTHER">Sonstige</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Status</label>
                  <select
                    value={projectForm.is_active ? 'active' : 'completed'}
                    onChange={e => setProjectForm({...projectForm, is_active: e.target.value === 'active'})}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="active">Laufend</option>
                    <option value="completed">Abgeschlossen</option>
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Startdatum</label>
                  <input
                    type="date"
                    value={projectForm.start_date}
                    onChange={e => setProjectForm({...projectForm, start_date: e.target.value})}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Enddatum</label>
                  <input
                    type="date"
                    value={projectForm.end_date}
                    onChange={e => setProjectForm({...projectForm, end_date: e.target.value})}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
              </div>
              
              <div className="border-t pt-4 mt-4">
                <h4 className="font-medium text-gray-700 mb-3">FZul-Vorhaben (optional)</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Vorhaben-Titel</label>
                    <input
                      type="text"
                      value={projectForm.fzul_vorhaben_title}
                      onChange={e => setProjectForm({...projectForm, fzul_vorhaben_title: e.target.value})}
                      className="w-full border rounded px-3 py-2"
                      placeholder="lt. Bescheinigung"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Vorhaben-ID</label>
                    <input
                      type="text"
                      value={projectForm.fzul_vorhaben_id}
                      onChange={e => setProjectForm({...projectForm, fzul_vorhaben_id: e.target.value})}
                      className="w-full border rounded px-3 py-2"
                      placeholder="z.B. FZ-12345"
                    />
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Notizen</label>
                <textarea
                  value={projectForm.notes}
                  onChange={e => setProjectForm({...projectForm, notes: e.target.value})}
                  className="w-full border rounded px-3 py-2"
                  rows={2}
                  placeholder="Interne Bemerkungen..."
                />
              </div>
            </div>
            
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowProjectModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Abbrechen
              </button>
              <button
                onClick={saveProject}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Speichern
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}