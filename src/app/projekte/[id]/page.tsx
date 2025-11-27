// src/app/projekte/[id]/page.tsx
'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: 'active' | 'completed' | 'archived' | 'on_hold';
  start_date: string | null;
  end_date: string | null;
  budget: number | null;
  estimated_hours: number | null;
  hourly_rate: number | null;
  color: string;
  client_name: string | null;
  client_contact: string | null;
  project_number: string | null;
  created_at: string;
}

interface Assignment {
  id: string;
  user_profile_id: string;
  role: string | null;
  assigned_at: string;
  user_profiles: {
    name: string;
    email: string;
  };
}

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [editData, setEditData] = useState({
    name: '',
    description: '',
    client_name: '',
    client_contact: '',
    project_number: '',
    start_date: '',
    end_date: '',
    budget: '',
    estimated_hours: '',
    hourly_rate: '',
    color: '#3B82F6',
    status: 'active'
  });

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);

      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!profileData) {
        setError('Profil konnte nicht geladen werden');
        return;
      }
      setProfile(profileData);

      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .eq('company_id', profileData.company_id)
        .single();

      if (projectError || !projectData) {
        console.error('Project load error:', projectError);
        setError('Projekt nicht gefunden');
        return;
      }

      setProject(projectData);
      setEditData({
        name: projectData.name || '',
        description: projectData.description || '',
        client_name: projectData.client_name || '',
        client_contact: projectData.client_contact || '',
        project_number: projectData.project_number || '',
        start_date: projectData.start_date || '',
        end_date: projectData.end_date || '',
        budget: projectData.budget?.toString() || '',
        estimated_hours: projectData.estimated_hours?.toString() || '',
        hourly_rate: projectData.hourly_rate?.toString() || '',
        color: projectData.color || '#3B82F6',
        status: projectData.status || 'active'
      });

      const { data: assignmentsData } = await supabase
        .from('project_assignments')
        .select('*, user_profiles(name, email)')
        .eq('project_id', id);

      setAssignments(assignmentsData || []);

    } catch (error: any) {
      console.error('Error loading data:', error);
      setError('Fehler beim Laden der Daten');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      if (!editData.name.trim()) {
        throw new Error('Projektname ist erforderlich');
      }

      const { error: updateError } = await supabase
        .from('projects')
        .update({
          name: editData.name,
          description: editData.description || null,
          client_name: editData.client_name || null,
          client_contact: editData.client_contact || null,
          project_number: editData.project_number || null,
          start_date: editData.start_date || null,
          end_date: editData.end_date || null,
          budget: editData.budget ? parseFloat(editData.budget) : null,
          estimated_hours: editData.estimated_hours ? parseFloat(editData.estimated_hours) : null,
          hourly_rate: editData.hourly_rate ? parseFloat(editData.hourly_rate) : null,
          color: editData.color,
          status: editData.status
        })
        .eq('id', id);

      if (updateError) {
        throw new Error('Fehler beim Speichern');
      }

      setSuccess('Projekt wurde erfolgreich gespeichert!');
      setEditing(false);
      loadData();

    } catch (error: any) {
      setError(error.message || 'Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Möchten Sie dieses Projekt wirklich löschen?')) return;

    try {
      const { error: deleteError } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);

      if (deleteError) throw new Error('Fehler beim Löschen');

      router.push('/projekte');
    } catch (error: any) {
      setError(error.message || 'Fehler beim Löschen');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'archived': return 'bg-gray-100 text-gray-800';
      case 'on_hold': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Aktiv';
      case 'completed': return 'Abgeschlossen';
      case 'archived': return 'Archiviert';
      case 'on_hold': return 'Pausiert';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="text-lg font-medium text-gray-900 mb-2">Laden...</div>
          <div className="text-sm text-gray-600">Projekt wird geladen</div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="text-lg font-medium text-red-600 mb-2">Projekt nicht gefunden</div>
          <button
            onClick={() => router.push('/projekte')}
            className="text-blue-600 hover:text-blue-700"
          >
            Zurück zur Übersicht
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/projekte')}
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="font-medium">Zurück zu Projekte</span>
              </button>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-600">{profile?.name}</span>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center mb-2">
                <div
                  className="w-4 h-4 rounded mr-3"
                  style={{ backgroundColor: project.color }}
                />
                <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
                <span className={`ml-4 px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(project.status)}`}>
                  {getStatusText(project.status)}
                </span>
              </div>
              {project.description && (
                <p className="text-gray-600 mt-2">{project.description}</p>
              )}
            </div>

            {(profile?.role === 'company_admin' || profile?.role === 'manager') && !editing && (
              <div className="flex space-x-2">
                <button
                  onClick={() => setEditing(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
                >
                  Bearbeiten
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium"
                >
                  Löschen
                </button>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center">
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>{success}</span>
          </div>
        )}

        {editing ? (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Projekt bearbeiten</h2>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Projektname *</label>
                  <input
                    type="text"
                    value={editData.name}
                    onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Beschreibung</label>
                  <textarea
                    value={editData.description}
                    onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Projektnummer</label>
                  <input
                    type="text"
                    value={editData.project_number}
                    onChange={(e) => setEditData({ ...editData, project_number: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="P-2024-001"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={editData.status}
                    onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="active">Aktiv</option>
                    <option value="on_hold">Pausiert</option>
                    <option value="completed">Abgeschlossen</option>
                    <option value="archived">Archiviert</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Kunde</label>
                  <input
                    type="text"
                    value={editData.client_name}
                    onChange={(e) => setEditData({ ...editData, client_name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Kundenkontakt</label>
                  <input
                    type="text"
                    value={editData.client_contact}
                    onChange={(e) => setEditData({ ...editData, client_contact: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="Email oder Telefon"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Startdatum</label>
                  <input
                    type="date"
                    value={editData.start_date}
                    onChange={(e) => setEditData({ ...editData, start_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Enddatum</label>
                  <input
                    type="date"
                    value={editData.end_date}
                    onChange={(e) => setEditData({ ...editData, end_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Budget (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editData.budget}
                    onChange={(e) => setEditData({ ...editData, budget: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Stundensatz (€/h)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editData.hourly_rate}
                    onChange={(e) => setEditData({ ...editData, hourly_rate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Geschätzte Stunden</label>
                  <input
                    type="number"
                    step="0.5"
                    value={editData.estimated_hours}
                    onChange={(e) => setEditData({ ...editData, estimated_hours: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Farbe</label>
                  <input
                    type="color"
                    value={editData.color}
                    onChange={(e) => setEditData({ ...editData, color: e.target.value })}
                    className="w-full h-10 px-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => {
                    setEditing(false);
                    setError('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
                  disabled={saving}
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:bg-gray-400"
                >
                  {saving ? 'Wird gespeichert...' : 'Speichern'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Projektdetails</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {project.project_number && (
                <div>
                  <span className="text-sm text-gray-500">Projektnummer</span>
                  <p className="text-gray-900 font-medium">{project.project_number}</p>
                </div>
              )}

              {project.client_name && (
                <div>
                  <span className="text-sm text-gray-500">Kunde</span>
                  <p className="text-gray-900 font-medium">{project.client_name}</p>
                </div>
              )}

              {project.client_contact && (
                <div>
                  <span className="text-sm text-gray-500">Kundenkontakt</span>
                  <p className="text-gray-900 font-medium">{project.client_contact}</p>
                </div>
              )}

              {project.start_date && (
                <div>
                  <span className="text-sm text-gray-500">Startdatum</span>
                  <p className="text-gray-900 font-medium">
                    {new Date(project.start_date).toLocaleDateString('de-DE')}
                  </p>
                </div>
              )}

              {project.end_date && (
                <div>
                  <span className="text-sm text-gray-500">Enddatum</span>
                  <p className="text-gray-900 font-medium">
                    {new Date(project.end_date).toLocaleDateString('de-DE')}
                  </p>
                </div>
              )}

              {project.budget && (
                <div>
                  <span className="text-sm text-gray-500">Budget</span>
                  <p className="text-gray-900 font-medium">{project.budget.toLocaleString('de-DE')} €</p>
                </div>
              )}

              {project.hourly_rate && (
                <div>
                  <span className="text-sm text-gray-500">Stundensatz</span>
                  <p className="text-gray-900 font-medium">{project.hourly_rate.toLocaleString('de-DE')} €/h</p>
                </div>
              )}

              {project.estimated_hours && (
                <div>
                  <span className="text-sm text-gray-500">Geschätzte Stunden</span>
                  <p className="text-gray-900 font-medium">{project.estimated_hours}h</p>
                </div>
              )}

              <div>
                <span className="text-sm text-gray-500">Erstellt am</span>
                <p className="text-gray-900 font-medium">
                  {new Date(project.created_at).toLocaleDateString('de-DE')}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Zugewiesene Mitarbeiter</h2>
          
          {assignments.length === 0 ? (
            <p className="text-gray-500 text-sm">Noch keine Mitarbeiter zugewiesen</p>
          ) : (
            <div className="space-y-3">
              {assignments.map((assignment) => (
                <div key={assignment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{assignment.user_profiles.name}</p>
                    <p className="text-sm text-gray-600">{assignment.user_profiles.email}</p>
                  </div>
                  {assignment.role && (
                    <span className="text-sm text-gray-500">{assignment.role}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}