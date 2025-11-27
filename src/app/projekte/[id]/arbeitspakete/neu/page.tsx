// src/app/projekte/[id]/arbeitspakete/neu/page.tsx
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

interface EmployeeAssignment {
  user_profile_id: string;
  employee_number: number;
  person_months: number;
}

export default function NewWorkPackagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [project, setProject] = useState<any>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    package_number: '',
    name: '',
    start_date: '',
    end_date: ''
  });

  const [assignments, setAssignments] = useState<EmployeeAssignment[]>([]);

  useEffect(() => {
    loadData();
  }, [projectId]);

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

      // Mitarbeiter der Firma laden
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

  const addEmployee = () => {
    const nextNumber = assignments.length + 1;
    setAssignments([
      ...assignments,
      {
        user_profile_id: '',
        employee_number: nextNumber,
        person_months: 0
      }
    ]);
  };

  const removeEmployee = (index: number) => {
    const newAssignments = assignments.filter((_, i) => i !== index);
    // Nummern neu durchnummerieren
    newAssignments.forEach((a, i) => {
      a.employee_number = i + 1;
    });
    setAssignments(newAssignments);
  };

  const updateAssignment = (index: number, field: string, value: any) => {
    const newAssignments = [...assignments];
    (newAssignments[index] as any)[field] = value;
    setAssignments(newAssignments);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      // Validierung
      if (!formData.package_number.trim()) {
        throw new Error('Arbeitspaket-Nummer ist erforderlich');
      }
      if (!formData.name.trim()) {
        throw new Error('Arbeitspaket-Name ist erforderlich');
      }

      // Prüfen ob Nummer bereits existiert
      const { data: existingWP } = await supabase
        .from('work_packages')
        .select('id')
        .eq('project_id', projectId)
        .eq('package_number', formData.package_number)
        .maybeSingle();

      if (existingWP) {
        throw new Error('Diese Arbeitspaket-Nummer existiert bereits');
      }

      // Arbeitspaket erstellen
      const { data: workPackage, error: wpError } = await supabase
        .from('work_packages')
        .insert([{
          project_id: projectId,
          package_number: formData.package_number,
          name: formData.name,
          start_date: formData.start_date || null,
          end_date: formData.end_date || null,
          created_by: user.id
        }])
        .select()
        .single();

      if (wpError || !workPackage) {
        throw new Error('Fehler beim Erstellen des Arbeitspakets');
      }

      // Mitarbeiter-Zuordnungen erstellen
      if (assignments.length > 0) {
        const validAssignments = assignments.filter(a => 
          a.user_profile_id && a.person_months > 0
        );

        if (validAssignments.length > 0) {
          const assignmentsToInsert = validAssignments.map(a => ({
            work_package_id: workPackage.id,
            user_profile_id: a.user_profile_id,
            employee_number: a.employee_number,
            person_months: a.person_months,
            assigned_by: user.id
          }));

          const { error: assignError } = await supabase
            .from('work_package_assignments')
            .insert(assignmentsToInsert);

          if (assignError) {
            console.error('Error creating assignments:', assignError);
            // Nicht abbrechen, Arbeitspaket wurde bereits erstellt
          }
        }
      }

      // Zurück zum Projekt
      router.push(`/projekte/${projectId}?tab=workpackages`);

    } catch (error: any) {
      console.error('Error:', error);
      setError(error.message || 'Fehler beim Erstellen des Arbeitspakets');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="text-lg font-medium text-gray-900 mb-2">Laden...</div>
          <div className="text-sm text-gray-600">Daten werden geladen</div>
        </div>
      </div>
    );
  }

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
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Neues Arbeitspaket</h1>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Grunddaten */}
            <div className="border-b border-gray-200 pb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Grunddaten</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Arbeitspaket-Nummer *
                  </label>
                  <input
                    type="text"
                    value={formData.package_number}
                    onChange={(e) => setFormData({ ...formData, package_number: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="z.B. 1, 2.1, 2.3.1"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Format: 1 oder 2.1 oder 2.3.1</p>
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
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="z.B. Analyse der bestehenden Kontaktgeometrien"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Startdatum
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Enddatum
                  </label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* Mitarbeiter-Zuordnung */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Mitarbeiter-Zuordnung</h2>
                <button
                  type="button"
                  onClick={addEmployee}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium text-sm"
                >
                  + Mitarbeiter hinzufügen
                </button>
              </div>

              {assignments.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <p className="text-gray-600">Noch keine Mitarbeiter zugeordnet</p>
                  <p className="text-sm text-gray-500 mt-1">Klicken Sie auf "Mitarbeiter hinzufügen"</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {assignments.map((assignment, index) => (
                    <div key={index} className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-center w-10 h-10 bg-blue-100 text-blue-800 rounded-full font-semibold">
                        {assignment.employee_number}
                      </div>
                      
                      <div className="flex-1">
                        <select
                          value={assignment.user_profile_id}
                          onChange={(e) => updateAssignment(index, 'user_profile_id', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          required
                        >
                          <option value="">Mitarbeiter auswählen...</option>
                          {employees.map((emp) => (
                            <option key={emp.id} value={emp.id}>
                              {emp.name} ({emp.email})
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
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="PM"
                          required
                        />
                        <p className="text-xs text-gray-500 mt-1">Personenmonate</p>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeEmployee(index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        title="Entfernen"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}

                  <div className="flex justify-end pt-2">
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Gesamt PM</p>
                      <p className="text-xl font-bold text-gray-900">
                        {assignments.reduce((sum, a) => sum + (a.person_months || 0), 0).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => router.push(`/projekte/${projectId}?tab=workpackages`)}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
                disabled={saving}
              >
                Abbrechen
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:bg-gray-400"
              >
                {saving ? 'Wird erstellt...' : 'Arbeitspaket erstellen'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}