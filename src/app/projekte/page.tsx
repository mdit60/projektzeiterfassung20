'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

interface Project {
  id: string;
  name: string;
  description: string;
  project_number: string;
  status: string;
  start_date: string;
  end_date: string;
  color: string;
  funding_reference?: string;
  funding_program?: string;
}

interface UserProfile {
  id: string;
  name: string;
  role: string;
  company_id: string;
}

export default function ProjectsPage() {
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newProject, setNewProject] = useState({
    name: '',
    project_number: '',
    description: '',
    color: '#3B82F6'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!profileData) {
        setError('Profil nicht gefunden');
        return;
      }

      setProfile(profileData);

      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .eq('company_id', profileData.company_id)
        .order('name');

      if (projectsError) throw projectsError;

      setProjects(projectsData || []);

    } catch (error: any) {
      console.error('Error loading data:', error);
      setError('Fehler beim Laden der Daten');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async () => {
    if (!newProject.name.trim()) {
      setError('Projektname ist erforderlich');
      return;
    }

    try {
      setSaving(true);
      setError('');

      const { data, error: insertError } = await supabase
        .from('projects')
        .insert({
          name: newProject.name.trim(),
          project_number: newProject.project_number.trim() || null,
          description: newProject.description.trim() || null,
          color: newProject.color,
          company_id: profile?.company_id,
          status: 'active'
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setShowNewModal(false);
      setNewProject({ name: '', project_number: '', description: '', color: '#3B82F6' });
      
      // Direkt zur neuen Projekt-Seite navigieren
      router.push(`/projekte/${data.id}`);

    } catch (error: any) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; text: string }> = {
      active: { color: 'bg-green-100 text-green-800', text: 'Aktiv' },
      completed: { color: 'bg-blue-100 text-blue-800', text: 'Abgeschlossen' },
      on_hold: { color: 'bg-yellow-100 text-yellow-800', text: 'Pausiert' },
      archived: { color: 'bg-gray-100 text-gray-800', text: 'Archiviert' }
    };
    const badge = badges[status] || badges.active;
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>{badge.text}</span>;
  };

  const canEdit = profile?.role === 'company_admin' || profile?.role === 'manager';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="text-lg font-medium text-gray-900 mb-2">Laden...</div>
          <div className="text-sm text-gray-600">Projekte werden geladen</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/dashboard')}
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Dashboard
              </button>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">{profile?.name}</span>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Projekte</h1>
            <p className="text-gray-600 mt-1">{projects.length} Projekte</p>
          </div>
          {canEdit && (
            <button
              onClick={() => setShowNewModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Neues Projekt
            </button>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Projekt-Liste */}
        {projects.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-lg shadow">
            <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            <p className="text-gray-500 font-medium">Keine Projekte vorhanden</p>
            <p className="text-gray-400 text-sm mt-1">Erstellen Sie Ihr erstes Projekt</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <div
                key={project.id}
                onClick={() => router.push(`/projekte/${project.id}`)}
                className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer overflow-hidden"
              >
                <div 
                  className="h-2"
                  style={{ backgroundColor: project.color || '#3B82F6' }}
                />
                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold mr-3"
                        style={{ backgroundColor: project.color || '#3B82F6' }}
                      >
                        {project.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{project.name}</h3>
                        {project.project_number && (
                          <p className="text-sm text-gray-500">#{project.project_number}</p>
                        )}
                      </div>
                    </div>
                    {getStatusBadge(project.status)}
                  </div>

                  {project.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{project.description}</p>
                  )}

                  <div className="flex flex-wrap gap-2 mt-3">
                    {project.funding_reference && (
                      <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-medium">
                        {project.funding_reference}
                      </span>
                    )}
                    {project.funding_program && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                        {project.funding_program}
                      </span>
                    )}
                  </div>

                  {(project.start_date || project.end_date) && (
                    <div className="mt-4 pt-3 border-t text-xs text-gray-500">
                      {project.start_date && (
                        <span>{new Date(project.start_date).toLocaleDateString('de-DE')}</span>
                      )}
                      {project.start_date && project.end_date && <span> - </span>}
                      {project.end_date && (
                        <span>{new Date(project.end_date).toLocaleDateString('de-DE')}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Neues Projekt Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Neues Projekt erstellen</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Projektname *</label>
                <input
                  type="text"
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="z.B. Website Redesign"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Projektnummer</label>
                <input
                  type="text"
                  value={newProject.project_number}
                  onChange={(e) => setNewProject({ ...newProject, project_number: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="z.B. P-2024-001"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Beschreibung</label>
                <textarea
                  rows={3}
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Farbe</label>
                <input
                  type="color"
                  value={newProject.color}
                  onChange={(e) => setNewProject({ ...newProject, color: e.target.value })}
                  className="w-full h-10 border rounded-lg"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowNewModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Abbrechen
              </button>
              <button
                onClick={handleCreateProject}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
              >
                {saving ? 'Erstellt...' : 'Projekt erstellen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}