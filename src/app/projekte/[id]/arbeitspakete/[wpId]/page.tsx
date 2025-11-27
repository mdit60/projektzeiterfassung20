// src/app/projekte/[id]/arbeitspakete/[wpId]/page.tsx
'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface WorkPackage {
  id: string;
  package_number: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

interface Assignment {
  id: string;
  user_profile_id: string;
  employee_number: number;
  person_months: number;
  user_profiles: {
    name: string;
    email: string;
  };
}

export default function WorkPackageDetailPage({ 
  params 
}: { 
  params: Promise<{ id: string; wpId: string }> 
}) {
  const { id: projectId, wpId } = use(params);
  
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [project, setProject] = useState<any>(null);
  const [workPackage, setWorkPackage] = useState<WorkPackage | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [editData, setEditData] = useState({
    package_number: '',
    name: '',
    start_date: '',
    end_date: ''
  });

  const [editAssignments, setEditAssignments] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, [wpId]);

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

      // Projekt laden
      const { data: projectData } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .eq('company_id', profileData.company_id)
        .single();

      if (!projectData) {
        setError('Projekt nicht gefunden');
        return;
      }
      setProject(projectData);

      // Arbeitspaket laden
      const { data: wpData, error: wpError } = await supabase
        .from('work_packages')
        .select('*')
        .eq('id', wpId)
        .eq('project_id', projectId)
        .single();

      if (wpError || !wpData) {
        setError('Arbeitspaket nicht gefunden');
        return;
      }

      setWorkPackage(wpData);
      setEditData({
        package_number: wpData.package_number || '',
        name: wpData.name || '',
        start_date: wpData.start_date || '',
        end_date: wpData.end_date || ''
      });

      // Zuordnungen laden
      const { data: assignmentsData } = await supabase
        .from('work_package_assignments')
        .select('*, user_profiles(name, email)')
        .eq('work_package_id', wpId)
        .order('employee_number');

      setAssignments(assignmentsData || []);
      setEditAssignments(assignmentsData || []);

      // Alle Mitarbeiter laden
      const { data: employeesData } = await supabase
        .from('user_profiles')
        .select('id, name, email, role')
        .eq('company_id', profileData.company_id)
        .eq('is_active', true)
        .order('name');

      setEmployees(employeesData || []);

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
      if (!editData.package_number.trim()) {
        throw new Error('Arbeitspaket-Nummer ist erforderlich');
      }
      if (!editData.name.trim()) {
        throw new Error('Arbeitspaket-Name ist erforderlich');
      }

      // Arbeitspaket aktualisieren
      const { error: updateError } = await supabase
        .from('work_packages')
        .update({
          package_number: editData.package_number,
          name: editData.name,
          start_date: editData.start_date || null,
          end_date: editData.end_date || null
        })
        .eq('id', wpId);

      if (updateError) {
        throw new Error('Fehler beim Speichern des Arbeitspakets');
      }

      // Alte Zuordnungen löschen
      await supabase
        .from('work_package_assignments')
        .delete()
        .eq('work_package_id', wpId);

      // Neue Zuordnungen erstellen
      const validAssignments = editAssignments.filter(a => 
        a.user_profile_id && a.person_months > 0
      );

      if (validAssignments.length > 0) {
        const assignmentsToInsert = validAssignments.map(a => ({
          work_package_id: wpId,
          user_profile_id: a.user_profile_id,
          employee_number: a.employee_number,
          person_months: a.person_months,
          assigned_by: user.id
        }));

        const { error: assignError } = await supabase
          .from('work_package_assignments')
          .insert(assignmentsToInsert);

        if (assignError) {
          throw new Error('Fehler beim Speichern der Mitarbeiter-Zuordnungen');
        }
      }

      setSuccess('Arbeitspaket erfolgreich gespeichert!');
      setEditing(false);
      loadData();

    } catch (error: any) {
      setError(error.message || 'Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Möchten Sie dieses Arbeitspaket wirklich löschen?')) return;

    try {
      const { error: deleteError } = await supabase
        .from('work_packages')
        .delete()
        .eq('id', wpId);

      if (deleteError) throw new Error('Fehler beim Löschen');

      router.push(`/projekte/${projectId}?tab=workpackages`);
    } catch (error: any) {
      setError(error.message || 'Fehler beim Löschen');
    }
  };

  const addEmployee = () => {
    const nextNumber = editAssignments.length + 1;
    setEditAssignments([
      ...editAssignments,
      {
        user_profile_id: '',
        employee_number: nextNumber,
        person_months: 0
      }
    ]);
  };

  const removeEmployee = (index: number) => {
    const newAssignments = editAssignments.filter((_, i) => i !== index);
    newAssignments.forEach((a, i) => {
      a.employee_number = i + 1;
    });
    setEditAssignments(newAssignments);
  };

  const updateAssignment = (index: number, field: string, value: any) => {
    const newAssignments = [...editAssignments];
    (newAssignments[index] as any)[field] = value;
    setEditAssignments(newAssignments);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="text-lg font-medium text-gray-900 mb-2">Laden...</div>
          <div className="text-sm text-gray-600">Arbeitspaket wird geladen</div>
        </div>
      </div>
    );
  }

  if (!workPackage) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="text-lg font-medium text-red-600 mb-2">Arbeitspaket nicht gefunden</div>
          <button
            onClick={() => router.push(`/projekte/${projectId}?tab=workpackages`)}
            className="text-blue-600 hover:text-blue-700"
          >
            Zurück zur Übersicht
          </button>
        </div>
      </div>
    );
  }

  const totalPM = assignments.reduce((sum, a) => sum + (a.person_months || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => router.push(`/projekte/${projectId}?tab=workpackages`)}
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="font-medium">Zurück zu {project?.name}</span>
              </button>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-600">{profile?.name}</span>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center mb-2">
                <span className="text-sm font-mono text-gray-500 bg-gray-100 px-3 py-1 rounded mr-3">
                  {workPackage.package_number}
                </span>
                <h1 className="text-2xl font-bold text-gray-900">{workPackage.name}</h1>
              </div>
              {workPackage.start_date && workPackage.end_date && (
                <p className="text-gray-600 mt-2">
                  {new Date(workPackage.start_date).toLocaleDateString('de-DE')} - {new Date(workPackage.end_date).toLocaleDateString('de-DE')}
                </p>
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

        {/* Messages */}
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
          /* Edit Mode */
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Arbeitspaket bearbeiten</h2>

            <div className="space-y-6">
              {/* Grunddaten */}
              <div className="border-b border-gray-200 pb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Grunddaten</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Arbeitspaket-Nummer *
                    </label>
                    <input
                      type="text"
                      value={editData.package_number}
                      onChange={(e) => setEditData({ ...editData, package_number: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Projekt
                    </label>
                    <input
                      type="text"
                      value={project?.name || ''}
                      disabled
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Arbeitspaket-Name *
                    </label>
                    <input
                      type="text"
                      value={editData.name}
                      onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Startdatum
                    </label>
                    <input
                      type="date"
                      value={editData.start_date}
                      onChange={(e) => setEditData({ ...editData, start_date: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Enddatum
                    </label>
                    <input
                      type="date"
                      value={editData.end_date}
                      onChange={(e) => setEditData({ ...editData, end_date: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>
              </div>

              {/* Mitarbeiter */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Mitarbeiter-Zuordnung</h3>
                  <button
                    type="button"
                    onClick={addEmployee}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium text-sm"
                  >
                    + Mitarbeiter hinzufügen
                  </button>
                </div>

                <div className="space-y-3">
                  {editAssignments.map((assignment, index) => (
                    <div key={index} className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-center w-10 h-10 bg-blue-100 text-blue-800 rounded-full font-semibold">
                        {assignment.employee_number}
                      </div>
                      
                      <div className="flex-1">
                        <select
                          value={assignment.user_profile_id}
                          onChange={(e) => updateAssignment(index, 'user_profile_id', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                          required
                        >
                          <option value="">Mitarbeiter auswählen...</option>
                          {employees.map((emp) => (
                            <option key={emp.id} value={emp.id}>
                              {emp.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="w-32">
                        <input
                          type="number"
                          step="0.25"
                          min="0"
                          value={assignment.person_months}
                          onChange={(e) => updateAssignment(index, 'person_months', parseFloat(e.target.value) || 0)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                          placeholder="PM"
                          required
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => removeEmployee(index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}

                  {editAssignments.length > 0 && (
                    <div className="flex justify-end pt-2">
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Gesamt PM</p>
                        <p className="text-xl font-bold text-gray-900">
                          {editAssignments.reduce((sum, a) => sum + (a.person_months || 0), 0).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                <button
                  onClick={() => {
                    setEditing(false);
                    setEditAssignments(assignments);
                    setError('');
                  }}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
                  disabled={saving}
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:bg-gray-400"
                >
                  {saving ? 'Wird gespeichert...' : 'Speichern'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* View Mode */
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Zugewiesene Mitarbeiter</h2>

            {assignments.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Noch keine Mitarbeiter zugeordnet</p>
            ) : (
              <>
                <div className="space-y-3 mb-6">
                  {assignments.map((assignment) => (
                    <div key={assignment.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <div className="flex items-center justify-center w-10 h-10 bg-blue-100 text-blue-800 rounded-full font-semibold mr-4">
                          {assignment.employee_number}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{assignment.user_profiles.name}</p>
                          <p className="text-sm text-gray-600">{assignment.user_profiles.email}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Personenmonate</p>
                        <p className="text-lg font-bold text-gray-900">{assignment.person_months}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-gray-200 pt-4 flex justify-end">
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Gesamt PM</p>
                    <p className="text-2xl font-bold text-gray-900">{totalPM.toFixed(2)}</p>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}