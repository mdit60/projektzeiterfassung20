// ========================================
// Datei: src/app/projekte/[id]/page.tsx
// Projekt-Detail mit Arbeitspaketen und MA-Zuordnung (PM)
// ========================================

'use client';

import React, { useEffect, useState, use } from 'react';
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
  estimated_hours: number;
  budget: number;
  hourly_rate: number;
  client_name: string;
  client_contact: string;
  color: string;
  company_id: string;
}

interface WorkPackage {
  id: string;
  code: string;
  description: string;
  category: string;
  estimated_hours: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  display_order: number;
  assignments: Array<{
    id: string;
    person_months: number;
    user_profile: {
      id: string;
      name: string;
      email: string;
    };
  }>;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  weekly_hours_contract?: number;
  qualification?: string;
  qualification_group?: string;
  project_employee_number?: number;
}

interface ProjectAssignment {
  id: string;
  user_profile_id: string;
  project_employee_number: number;
}

interface Anlage62Data {
  ma_nr: number;
  qual_gruppe: string;
  ma_name: string;
  qualifikation: string;
  user_profile_id: string;
  pm_kosten: number;
  teilzeit_faktor: number;
  year: number;
  person_monate: number;
  personalkosten: number;
}

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // States
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [workPackages, setWorkPackages] = useState<WorkPackage[]>([]);
  const [companyEmployees, setCompanyEmployees] = useState<UserProfile[]>([]);
  const [projectAssignments, setProjectAssignments] = useState<ProjectAssignment[]>([]);
  const [anlage62Data, setAnlage62Data] = useState<Anlage62Data[]>([]);
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState<'arbeitspakete' | 'projektmitarbeiter' | 'anlage62'>('arbeitspakete');

  // Modal States
  const [showAPModal, setShowAPModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [editingAP, setEditingAP] = useState<WorkPackage | null>(null);
  const [selectedAPForAssign, setSelectedAPForAssign] = useState<WorkPackage | null>(null);

  // Arbeitspaket Form
  const [apForm, setApForm] = useState({
    code: '',
    description: '',
    category: 'project_work',
    estimated_hours: '',
    start_date: '',
    end_date: ''
  });

  // Zuordnung Form
  const [assignments, setAssignments] = useState<{[key: string]: { selected: boolean; pm: string }}>({});

  // Projekt Form
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    project_number: '',
    status: 'active',
    start_date: '',
    end_date: '',
    estimated_hours: '',
    budget: '',
    hourly_rate: '',
    client_name: '',
    client_contact: '',
    color: '#3B82F6'
  });

  useEffect(() => {
    loadData();
  }, [resolvedParams.id]);

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

      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', resolvedParams.id)
        .single();

      if (projectError) {
        setError('Projekt nicht gefunden');
        return;
      }

      setProject(projectData);
      setFormData({
        name: projectData.name || '',
        description: projectData.description || '',
        project_number: projectData.project_number || '',
        status: projectData.status || 'active',
        start_date: projectData.start_date || '',
        end_date: projectData.end_date || '',
        estimated_hours: projectData.estimated_hours?.toString() || '',
        budget: projectData.budget?.toString() || '',
        hourly_rate: projectData.hourly_rate?.toString() || '',
        client_name: projectData.client_name || '',
        client_contact: projectData.client_contact || '',
        color: projectData.color || '#3B82F6'
      });

      // Arbeitspakete laden
      await loadWorkPackages(resolvedParams.id);

      // Projekt-Zuordnungen laden (für MA-Nummern)
      const { data: projectAssignData } = await supabase
        .from('project_assignments')
        .select('id, user_profile_id, project_employee_number')
        .eq('project_id', resolvedParams.id)
        .order('project_employee_number');

      setProjectAssignments(projectAssignData || []);

      // Mitarbeiter der Firma laden (mit Wochenstunden für PM-Berechnung)
      // Sortiert nach Projekt-MA-Nummer falls vorhanden
      const { data: employeesData } = await supabase
        .from('user_profiles')
        .select('id, name, email, role, weekly_hours_contract, qualification, qualification_group')
        .eq('company_id', projectData.company_id)
        .eq('is_active', true)
        .order('name');

      // MA mit Projekt-Nummer anreichern und sortieren
      const employeesWithNumber = (employeesData || []).map(emp => {
        const assignment = projectAssignData?.find(pa => pa.user_profile_id === emp.id);
        return {
          ...emp,
          project_employee_number: assignment?.project_employee_number
        };
      }).sort((a, b) => {
        // Erst nach Projekt-Nummer sortieren (falls vorhanden)
        if (a.project_employee_number && b.project_employee_number) {
          return a.project_employee_number - b.project_employee_number;
        }
        if (a.project_employee_number) return -1;
        if (b.project_employee_number) return 1;
        // Dann nach Name
        return a.name.localeCompare(b.name);
      });

      setCompanyEmployees(employeesWithNumber);

      // Anlage 6.2 Daten laden
      await loadAnlage62Data(resolvedParams.id);

    } catch (error: any) {
      console.error('Error loading data:', error);
      setError('Fehler beim Laden der Daten');
    } finally {
      setLoading(false);
    }
  };

  const loadWorkPackages = async (projectId: string) => {
    try {
      setLoadingPackages(true);

      const { data, error } = await supabase
        .from('work_packages')
        .select(`
          *,
          assignments:work_package_assignments(
            id,
            person_months,
            user_profile:user_profiles(id, name, email)
          )
        `)
        .eq('project_id', projectId)
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;

      setWorkPackages(data || []);
    } catch (error) {
      console.error('Error loading work packages:', error);
    } finally {
      setLoadingPackages(false);
    }
  };

  const loadAnlage62Data = async (projectId: string) => {
    // Immer manuell berechnen (View ist nicht zuverlässig)
    await loadAnlage62DataManual(projectId);
  };

  const loadAnlage62DataManual = async (projectId: string) => {
    try {
      // Alle Arbeitspakete mit Zuordnungen und Zeitraum laden
      const { data: wpData } = await supabase
        .from('work_packages')
        .select(`
          id, start_date, end_date,
          assignments:work_package_assignments(
            person_months,
            user_profile_id
          )
        `)
        .eq('project_id', projectId);

      // Projekt-Zuordnungen für MA-Nummern
      const { data: paData } = await supabase
        .from('project_assignments')
        .select('user_profile_id, project_employee_number')
        .eq('project_id', projectId);

      // Alle beteiligten User-IDs sammeln
      const userIds = new Set<string>();
      wpData?.forEach(wp => {
        wp.assignments?.forEach((a: any) => {
          if (a.user_profile_id) userIds.add(a.user_profile_id);
        });
      });

      if (userIds.size === 0) {
        setAnlage62Data([]);
        return;
      }

      // User-Profile laden
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('id, name, first_name, last_name, qualification, qualification_group, weekly_hours_contract, weekly_hours_company')
        .in('id', Array.from(userIds));

      // Gehaltsdaten laden
      const { data: salaries } = await supabase
        .from('salary_components')
        .select('user_profile_id, year, monthly_personnel_cost, hourly_rate')
        .in('user_profile_id', Array.from(userIds));

      // PM pro User und Jahr aggregieren
      // Wichtig: Jahr wird aus dem AP-Zeitraum abgeleitet
      const pmByUserYear: { [key: string]: number } = {};

      wpData?.forEach(wp => {
        if (!wp.assignments || wp.assignments.length === 0) return;

        // Jahr aus Start- oder Enddatum ableiten
        let wpYear: number;
        
        if (wp.start_date) {
          wpYear = new Date(wp.start_date).getFullYear();
        } else if (wp.end_date) {
          wpYear = new Date(wp.end_date).getFullYear();
        } else {
          wpYear = new Date().getFullYear();
        }

        // Prüfen ob AP über Jahreswechsel geht
        const startYear = wp.start_date ? new Date(wp.start_date).getFullYear() : wpYear;
        const endYear = wp.end_date ? new Date(wp.end_date).getFullYear() : wpYear;

        wp.assignments?.forEach((a: any) => {
          if (!a.person_months || a.person_months <= 0) return;

          if (startYear === endYear) {
            // AP innerhalb eines Jahres - alle PM zu diesem Jahr
            const key = `${a.user_profile_id}_${startYear}`;
            pmByUserYear[key] = (pmByUserYear[key] || 0) + a.person_months;
          } else {
            // AP über mehrere Jahre - PM anteilig aufteilen
            // Berechne Monate pro Jahr
            const startDate = new Date(wp.start_date);
            const endDate = new Date(wp.end_date);
            const totalMonths = (endYear - startYear) * 12 + (endDate.getMonth() - startDate.getMonth()) + 1;

            for (let year = startYear; year <= endYear; year++) {
              let monthsInYear: number;
              
              if (year === startYear) {
                // Erste Jahr: ab Startmonat bis Dezember
                monthsInYear = 12 - startDate.getMonth();
              } else if (year === endYear) {
                // Letztes Jahr: Januar bis Endmonat
                monthsInYear = endDate.getMonth() + 1;
              } else {
                // Mittlere Jahre: volles Jahr
                monthsInYear = 12;
              }

              // Anteil der PM für dieses Jahr
              const pmForYear = (a.person_months * monthsInYear) / totalMonths;
              const key = `${a.user_profile_id}_${year}`;
              pmByUserYear[key] = (pmByUserYear[key] || 0) + pmForYear;
            }
          }
        });
      });

      // Für jeden User und Jahr einen Eintrag erstellen
      const result: Anlage62Data[] = [];

      Object.entries(pmByUserYear).forEach(([key, pm]) => {
        const [userId, yearStr] = key.split('_');
        const year = parseInt(yearStr);
        const profile = profiles?.find(p => p.id === userId);
        const salary = salaries?.find(s => s.user_profile_id === userId && s.year === year);
        const pa = paData?.find(p => p.user_profile_id === userId);

        if (profile && pm > 0) {
          const pmKosten = salary?.monthly_personnel_cost || 0;
          const teilzeitFaktor = (profile.weekly_hours_contract || 40) / (profile.weekly_hours_company || 40);

          result.push({
            ma_nr: pa?.project_employee_number || 99,
            qual_gruppe: profile.qualification_group || 'A',
            ma_name: profile.last_name && profile.first_name 
              ? `${profile.last_name}, ${profile.first_name}` 
              : profile.name,
            qualifikation: profile.qualification || '',
            user_profile_id: userId,
            pm_kosten: pmKosten,
            teilzeit_faktor: teilzeitFaktor,
            year: year,
            person_monate: Math.round(pm * 100) / 100, // Auf 2 Nachkommastellen runden
            personalkosten: Math.round(pm * pmKosten)
          });
        }
      });

      // Sortieren nach MA-Nr, dann Jahr
      result.sort((a, b) => {
        if (a.ma_nr !== b.ma_nr) return a.ma_nr - b.ma_nr;
        return a.year - b.year;
      });

      setAnlage62Data(result);
    } catch (error) {
      console.error('Error calculating Anlage 6.2 data:', error);
    }
  };

  // ============ PROJEKTMITARBEITER VERWALTUNG ============

  const handleUpdateProjectEmployeeNumber = async (userProfileId: string, newNumber: number) => {
    try {
      if (!newNumber || newNumber < 1) return;

      const { error } = await supabase
        .from('project_assignments')
        .update({ project_employee_number: newNumber })
        .eq('project_id', resolvedParams.id)
        .eq('user_profile_id', userProfileId);

      if (error) throw error;

      // Local state aktualisieren
      setCompanyEmployees(prev => prev.map(emp => 
        emp.id === userProfileId 
          ? { ...emp, project_employee_number: newNumber }
          : emp
      ));

      setProjectAssignments(prev => prev.map(pa =>
        pa.user_profile_id === userProfileId
          ? { ...pa, project_employee_number: newNumber }
          : pa
      ));

      // Anlage 6.2 neu laden
      await loadAnlage62Data(resolvedParams.id);

    } catch (error: any) {
      console.error('Error updating employee number:', error);
      setError('Fehler beim Aktualisieren der MA-Nummer');
    }
  };

  const handleUpdateQualificationGroup = async (userProfileId: string, group: string) => {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ qualification_group: group })
        .eq('id', userProfileId);

      if (error) throw error;

      // Local state aktualisieren
      setCompanyEmployees(prev => prev.map(emp => 
        emp.id === userProfileId 
          ? { ...emp, qualification_group: group }
          : emp
      ));

      // Anlage 6.2 neu laden
      await loadAnlage62Data(resolvedParams.id);

      setSuccess('Qualifikationsgruppe aktualisiert');
      setTimeout(() => setSuccess(''), 2000);

    } catch (error: any) {
      console.error('Error updating qualification group:', error);
      setError('Fehler beim Aktualisieren der Qualifikationsgruppe');
    }
  };

  const handleRemoveFromProject = async (userProfileId: string) => {
    if (!confirm('Mitarbeiter wirklich aus dem Projekt entfernen? Alle Arbeitspaket-Zuordnungen werden gelöscht.')) {
      return;
    }

    try {
      // Alle work_package_assignments für diesen MA in diesem Projekt löschen
      const wpIds = workPackages.map(wp => wp.id);
      
      if (wpIds.length > 0) {
        const { error: wpaError } = await supabase
          .from('work_package_assignments')
          .delete()
          .eq('user_profile_id', userProfileId)
          .in('work_package_id', wpIds);

        if (wpaError) throw wpaError;
      }

      // project_assignment löschen
      const { error: paError } = await supabase
        .from('project_assignments')
        .delete()
        .eq('project_id', resolvedParams.id)
        .eq('user_profile_id', userProfileId);

      if (paError) throw paError;

      // Daten neu laden
      await loadData();

      setSuccess('Mitarbeiter aus Projekt entfernt');
      setTimeout(() => setSuccess(''), 2000);

    } catch (error: any) {
      console.error('Error removing from project:', error);
      setError('Fehler beim Entfernen des Mitarbeiters');
    }
  };

  // ============ PROJEKT CRUD ============

  const handleSaveProject = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      if (!formData.name.trim()) {
        throw new Error('Projektname ist erforderlich');
      }

      const { error: updateError } = await supabase
        .from('projects')
        .update({
          name: formData.name,
          description: formData.description || null,
          project_number: formData.project_number || null,
          status: formData.status,
          start_date: formData.start_date || null,
          end_date: formData.end_date || null,
          estimated_hours: formData.estimated_hours ? parseFloat(formData.estimated_hours) : null,
          budget: formData.budget ? parseFloat(formData.budget) : null,
          hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : null,
          client_name: formData.client_name || null,
          client_contact: formData.client_contact || null,
          color: formData.color,
          updated_at: new Date().toISOString()
        })
        .eq('id', resolvedParams.id);

      if (updateError) throw updateError;

      setSuccess('Projekt erfolgreich gespeichert!');
      setEditMode(false);
      loadData();

      setTimeout(() => setSuccess(''), 3000);

    } catch (error: any) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!confirm('Möchten Sie dieses Projekt wirklich löschen? Alle Arbeitspakete werden ebenfalls gelöscht.')) return;

    try {
      setSaving(true);
      setError('');

      const { error: deleteError } = await supabase
        .from('projects')
        .delete()
        .eq('id', resolvedParams.id);

      if (deleteError) throw deleteError;

      router.push('/projekte');

    } catch (error: any) {
      setError(error.message);
      setSaving(false);
    }
  };

  // ============ ARBEITSPAKET CRUD ============

  const openAPModal = (ap?: WorkPackage) => {
    if (ap) {
      setEditingAP(ap);
      setApForm({
        code: ap.code,
        description: ap.description,
        category: ap.category || 'project_work',
        estimated_hours: ap.estimated_hours?.toString() || '',
        start_date: ap.start_date || '',
        end_date: ap.end_date || ''
      });
    } else {
      setEditingAP(null);
      setApForm({
        code: '',
        description: '',
        category: 'project_work',
        estimated_hours: '',
        start_date: '',
        end_date: ''
      });
    }
    setShowAPModal(true);
  };

  const handleSaveAP = async () => {
    try {
      setSaving(true);
      setError('');

      if (!apForm.code.trim() || !apForm.description.trim()) {
        throw new Error('AP-Nummer und Beschreibung sind erforderlich');
      }

      const apData = {
        code: apForm.code.trim(),
        description: apForm.description.trim(),
        category: apForm.category,
        estimated_hours: apForm.estimated_hours ? parseFloat(apForm.estimated_hours) : null,
        start_date: apForm.start_date || null,
        end_date: apForm.end_date || null,
        updated_at: new Date().toISOString()
      };

      if (editingAP) {
        // Update
        const { error } = await supabase
          .from('work_packages')
          .update(apData)
          .eq('id', editingAP.id);

        if (error) throw error;
        setSuccess('Arbeitspaket aktualisiert!');
      } else {
        // Insert
        const maxOrder = Math.max(0, ...workPackages.map(wp => wp.display_order || 0));
        const { error } = await supabase
          .from('work_packages')
          .insert({
            ...apData,
            project_id: resolvedParams.id,
            company_id: project?.company_id,
            is_active: true,
            display_order: maxOrder + 1
          });

        if (error) throw error;
        setSuccess('Arbeitspaket erstellt!');
      }

      setShowAPModal(false);
      await loadWorkPackages(resolvedParams.id);
      setTimeout(() => setSuccess(''), 3000);

    } catch (error: any) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAP = async (ap: WorkPackage) => {
    if (!confirm(`Arbeitspaket "${ap.code}" wirklich löschen?`)) return;

    try {
      setSaving(true);
      setError('');

      // Soft delete
      const { error } = await supabase
        .from('work_packages')
        .update({ is_active: false })
        .eq('id', ap.id);

      if (error) throw error;

      setSuccess('Arbeitspaket gelöscht!');
      await loadWorkPackages(resolvedParams.id);
      setTimeout(() => setSuccess(''), 3000);

    } catch (error: any) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  };

  // ============ MITARBEITER ZUORDNUNG ============

  const openAssignModal = (ap: WorkPackage) => {
    setSelectedAPForAssign(ap);
    
    // Bestehende Zuordnungen laden
    const initialAssignments: {[key: string]: { selected: boolean; pm: string }} = {};
    companyEmployees.forEach(emp => {
      const existing = ap.assignments?.find(a => a.user_profile?.id === emp.id);
      initialAssignments[emp.id] = {
        selected: !!existing,
        pm: existing?.person_months?.toString() || ''
      };
    });
    setAssignments(initialAssignments);
    setShowAssignModal(true);
  };

  const handleSaveAssignments = async () => {
    if (!selectedAPForAssign) return;

    try {
      setSaving(true);
      setError('');

      // Alle bestehenden Zuordnungen für dieses AP löschen
      const { error: deleteError } = await supabase
        .from('work_package_assignments')
        .delete()
        .eq('work_package_id', selectedAPForAssign.id);

      if (deleteError) throw deleteError;

      // Neue Zuordnungen erstellen
      const newAssignments = Object.entries(assignments)
        .filter(([_, value]) => value.selected)
        .map(([userId, value]) => ({
          work_package_id: selectedAPForAssign.id,
          user_profile_id: userId,
          person_months: value.pm ? parseFloat(value.pm) : null
        }));

      if (newAssignments.length > 0) {
        const { error: insertError } = await supabase
          .from('work_package_assignments')
          .insert(newAssignments);

        if (insertError) throw insertError;
      }

      setSuccess('Zuordnungen gespeichert!');
      setShowAssignModal(false);
      await loadWorkPackages(resolvedParams.id);
      setTimeout(() => setSuccess(''), 3000);

    } catch (error: any) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  };

  // ============ HELPERS ============

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; text: string }> = {
      active: { color: 'bg-green-100 text-green-800', text: 'Aktiv' },
      completed: { color: 'bg-blue-100 text-blue-800', text: 'Abgeschlossen' },
      on_hold: { color: 'bg-yellow-100 text-yellow-800', text: 'Pausiert' },
      archived: { color: 'bg-gray-100 text-gray-800', text: 'Archiviert' }
    };
    const badge = badges[status] || badges.active;
    return <span className={`px-3 py-1 rounded-full text-sm font-medium ${badge.color}`}>{badge.text}</span>;
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      'project_work': 'Förderfähig',
      'non_billable': 'Nicht förderfähig',
      'overhead': 'Overhead'
    };
    return labels[category] || category;
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
            className="text-blue-600 hover:text-blue-800"
          >
            Zurück zur Übersicht
          </button>
        </div>
      </div>
    );
  }

  const isAdmin = profile?.role === 'company_admin';
  const isManager = profile?.role === 'manager';
  const canEdit = isAdmin || isManager;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-white shadow-sm border-b">
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
                Zurück zu Projekte
              </button>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">{profile?.name}</span>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
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
            {success}
          </div>
        )}

        {/* Projekt-Header */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div
                  className="w-16 h-16 rounded-lg flex items-center justify-center text-white text-2xl font-bold"
                  style={{ backgroundColor: project.color }}
                >
                  {project.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
                  {project.project_number && (
                    <p className="text-sm text-gray-500">Projektnummer: {project.project_number}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-3">
                {getStatusBadge(project.status)}
                {canEdit && !editMode && (
                  <>
                    <button
                      onClick={() => setEditMode(true)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Bearbeiten
                    </button>
                    <button
                      onClick={handleDeleteProject}
                      disabled={saving}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                      Löschen
                    </button>
                  </>
                )}
                {canEdit && editMode && (
                  <>
                    <button
                      onClick={() => setEditMode(false)}
                      disabled={saving}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Abbrechen
                    </button>
                    <button
                      onClick={handleSaveProject}
                      disabled={saving}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
                    >
                      {saving ? 'Speichert...' : 'Speichern'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Projekt-Details */}
          <div className="px-6 py-6">
            {editMode ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Projektname *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Projektnummer</label>
                    <input
                      type="text"
                      value={formData.project_number}
                      onChange={(e) => setFormData({ ...formData, project_number: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2"
                    >
                      <option value="active">Aktiv</option>
                      <option value="completed">Abgeschlossen</option>
                      <option value="on_hold">Pausiert</option>
                      <option value="archived">Archiviert</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Farbe</label>
                    <input
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="w-full h-10 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Startdatum</label>
                    <input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Enddatum</label>
                    <input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Budget (€)</label>
                    <input
                      type="number"
                      value={formData.budget}
                      onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Stundensatz (€)</label>
                    <input
                      type="number"
                      value={formData.hourly_rate}
                      onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Kunde</label>
                    <input
                      type="text"
                      value={formData.client_name}
                      onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Kundenkontakt</label>
                    <input
                      type="text"
                      value={formData.client_contact}
                      onChange={(e) => setFormData({ ...formData, client_contact: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Beschreibung</label>
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {project.description && (
                  <div className="md:col-span-2 lg:col-span-3">
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Beschreibung</h3>
                    <p className="text-gray-900">{project.description}</p>
                  </div>
                )}
                {project.start_date && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Startdatum</h3>
                    <p className="text-gray-900">{new Date(project.start_date).toLocaleDateString('de-DE')}</p>
                  </div>
                )}
                {project.end_date && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Enddatum</h3>
                    <p className="text-gray-900">{new Date(project.end_date).toLocaleDateString('de-DE')}</p>
                  </div>
                )}
                {project.budget && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Budget</h3>
                    <p className="text-gray-900">{project.budget.toLocaleString('de-DE')} €</p>
                  </div>
                )}
                {project.hourly_rate && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Stundensatz</h3>
                    <p className="text-gray-900">{project.hourly_rate} €/h</p>
                  </div>
                )}
                {project.client_name && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Kunde</h3>
                    <p className="text-gray-900">{project.client_name}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Arbeitspakete & Anlage 6.2 Sektion */}
        <div className="bg-white rounded-lg shadow">
          {/* Tab-Navigation */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex space-x-4">
                <button
                  onClick={() => setActiveTab('arbeitspakete')}
                  className={`px-4 py-2 font-medium rounded-lg transition-colors ${
                    activeTab === 'arbeitspakete'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  📦 Arbeitspakete ({workPackages.length})
                </button>
                <button
                  onClick={() => setActiveTab('projektmitarbeiter')}
                  className={`px-4 py-2 font-medium rounded-lg transition-colors ${
                    activeTab === 'projektmitarbeiter'
                      ? 'bg-purple-100 text-purple-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  👥 Projektmitarbeiter ({projectAssignments.length})
                </button>
                <button
                  onClick={() => setActiveTab('anlage62')}
                  className={`px-4 py-2 font-medium rounded-lg transition-colors ${
                    activeTab === 'anlage62'
                      ? 'bg-amber-100 text-amber-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  📊 Anlage 6.2
                </button>
              </div>
              {activeTab === 'arbeitspakete' && canEdit && (
                <button
                  onClick={() => openAPModal()}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Neues Arbeitspaket
                </button>
              )}
            </div>
          </div>

          {/* Tab: Arbeitspakete */}
          {activeTab === 'arbeitspakete' && (
          <div className="px-6 py-6">
            {loadingPackages ? (
              <div className="text-center py-8 text-gray-500">
                Arbeitspakete werden geladen...
              </div>
            ) : workPackages.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <p className="text-gray-600 font-medium mb-2">Keine Arbeitspakete vorhanden</p>
                <p className="text-sm text-gray-500 mb-4">Erstellen Sie Arbeitspakete für dieses Projekt</p>
                {canEdit && (
                  <button
                    onClick={() => openAPModal()}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Erstes Arbeitspaket erstellen
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">AP-Nr</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Beschreibung</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kategorie</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Zeitraum</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mitarbeiter</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Geplant</th>
                        {canEdit && (
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Aktionen</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {workPackages.map((wp) => (
                        <tr key={wp.id} className="hover:bg-gray-50">
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className="font-mono font-bold text-blue-600">{wp.code}</span>
                          </td>
                          <td className="px-4 py-4">
                            <div className="text-sm text-gray-900 max-w-xs truncate" title={wp.description}>
                              {wp.description}
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              wp.category === 'project_work' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {getCategoryLabel(wp.category)}
                            </span>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                            {wp.start_date && wp.end_date ? (
                              <div className="text-xs">
                                {new Date(wp.start_date).toLocaleDateString('de-DE')} -<br/>
                                {new Date(wp.end_date).toLocaleDateString('de-DE')}
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-4">
                            {wp.assignments && wp.assignments.length > 0 ? (
                              <div className="space-y-1">
                                {wp.assignments.map((a, idx) => (
                                  <div key={idx} className="flex items-center text-xs">
                                    <div
                                      className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white flex items-center justify-center text-xs font-bold mr-2"
                                      title={a.user_profile?.name}
                                    >
                                      {a.user_profile?.name?.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="text-gray-700">{a.user_profile?.name?.split(' ')[0]}</span>
                                    {a.person_months && (
                                      <span className="ml-2 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                                        {a.person_months} PM
                                      </span>
                                    )}
                                  </div>
                                ))}
                                {canEdit && (
                                  <button
                                    onClick={() => openAssignModal(wp)}
                                    className="text-blue-600 hover:text-blue-800 text-xs mt-1"
                                  >
                                    Bearbeiten
                                  </button>
                                )}
                              </div>
                            ) : (
                              canEdit ? (
                                <button
                                  onClick={() => openAssignModal(wp)}
                                  className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                                >
                                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                  </svg>
                                  Zuordnen
                                </button>
                              ) : (
                                <span className="text-xs text-gray-400">Keine</span>
                              )
                            )}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-right text-sm">
                            {wp.estimated_hours ? (
                              <span className="font-medium text-gray-900">{wp.estimated_hours}h</span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          {canEdit && (
                            <td className="px-4 py-4 whitespace-nowrap text-right text-sm">
                              <button
                                onClick={() => openAPModal(wp)}
                                className="text-blue-600 hover:text-blue-800 mr-3"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => handleDeleteAP(wp)}
                                className="text-red-600 hover:text-red-800"
                              >
                                🗑️
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Statistik */}
                <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="text-sm text-blue-600 font-medium">Arbeitspakete</div>
                    <div className="text-2xl font-bold text-blue-900">{workPackages.length}</div>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-4">
                    <div className="text-sm text-amber-600 font-medium">Geplante PM (gesamt)</div>
                    <div className="text-2xl font-bold text-amber-900">
                      {workPackages.reduce((sum, wp) => 
                        sum + (wp.assignments?.reduce((aSum, a) => aSum + (a.person_months || 0), 0) || 0), 0
                      ).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} PM
                    </div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="text-sm text-green-600 font-medium">Geschätzte Stunden</div>
                    <div className="text-2xl font-bold text-green-900">
                      {workPackages.reduce((sum, wp) => sum + (wp.estimated_hours || 0), 0).toLocaleString('de-DE')}h
                    </div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4">
                    <div className="text-sm text-purple-600 font-medium">Zugewiesene Mitarbeiter</div>
                    <div className="text-2xl font-bold text-purple-900">
                      {new Set(workPackages.flatMap(wp => wp.assignments?.map(a => a.user_profile?.id) || [])).size}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
          )}

          {/* Tab: Projektmitarbeiter - MA-Nummern verwalten */}
          {activeTab === 'projektmitarbeiter' && (
            <div className="px-6 py-6">
              <div className="mb-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <h3 className="font-medium text-purple-800 mb-1">👥 Projektmitarbeiter verwalten</h3>
                <p className="text-sm text-purple-700">
                  Hier können Sie die Nummern und Qualifikationsgruppen der Projektmitarbeiter für die ZIM-Anträge festlegen.
                </p>
              </div>

              {projectAssignments.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <div className="text-4xl mb-4">👥</div>
                  <p className="text-lg font-medium mb-2">Noch keine Projektmitarbeiter</p>
                  <p className="text-sm">
                    Weisen Sie Mitarbeiter in den Arbeitspaketen zu,<br />
                    um sie hier zu verwalten.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">MA-Nr.</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qual.</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qualifikation</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Gesamt PM</th>
                        {canEdit && (
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Aktionen</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {companyEmployees
                        .filter(emp => emp.project_employee_number)
                        .sort((a, b) => (a.project_employee_number || 99) - (b.project_employee_number || 99))
                        .map((emp) => {
                          // PM-Summe aus Anlage 6.2 Daten nehmen (dort ist die Berechnung korrekt)
                          const empPM = anlage62Data
                            .filter(a => a.user_profile_id === emp.id)
                            .reduce((sum, a) => sum + a.person_monate, 0);

                          return (
                            <tr key={emp.id} className="hover:bg-gray-50">
                              <td className="px-4 py-4">
                                {canEdit ? (
                                  <input
                                    type="number"
                                    min="1"
                                    value={emp.project_employee_number || ''}
                                    onChange={(e) => handleUpdateProjectEmployeeNumber(emp.id, parseInt(e.target.value))}
                                    className="w-16 border rounded px-2 py-1 text-center font-bold text-blue-700"
                                  />
                                ) : (
                                  <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-full font-bold">
                                    {emp.project_employee_number}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-4">
                                {canEdit ? (
                                  <select
                                    value={emp.qualification_group || 'A'}
                                    onChange={(e) => handleUpdateQualificationGroup(emp.id, e.target.value)}
                                    className="border rounded px-2 py-1 font-medium"
                                  >
                                    <option value="A">A</option>
                                    <option value="B">B</option>
                                    <option value="C">C</option>
                                  </select>
                                ) : (
                                  <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-800 rounded font-medium">
                                    {emp.qualification_group || 'A'}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-4">
                                <div className="font-medium text-gray-900">{emp.name}</div>
                                <div className="text-xs text-gray-500">{emp.email}</div>
                              </td>
                              <td className="px-4 py-4 text-sm text-gray-600">
                                {emp.qualification || '-'}
                              </td>
                              <td className="px-4 py-4 text-right">
                                <span className="font-medium text-gray-900">{empPM.toFixed(1)} PM</span>
                              </td>
                              {canEdit && (
                                <td className="px-4 py-4 text-right">
                                  <button
                                    onClick={() => handleRemoveFromProject(emp.id)}
                                    className="text-red-600 hover:text-red-800 text-sm"
                                    title="Aus Projekt entfernen"
                                  >
                                    🗑️ Entfernen
                                  </button>
                                </td>
                              )}
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Legende */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg text-sm text-gray-600">
                <p className="font-medium mb-2">Qualifikationsgruppen (ZIM):</p>
                <ul className="space-y-1 ml-4">
                  <li><span className="font-medium">A:</span> Mitarbeiter mit Hoch- und Fachhochschulabschluss</li>
                  <li><span className="font-medium">B:</span> Mitarbeiter mit anderen staatlichen Abschlüssen (z.B. Techniker, Meister)</li>
                  <li><span className="font-medium">C:</span> Facharbeiter in einem anerkannten Ausbildungsberuf</li>
                </ul>
              </div>
            </div>
          )}

          {/* Tab: Anlage 6.2 - Personalkosten */}
          {activeTab === 'anlage62' && (
            <div className="px-6 py-6">
              <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <h3 className="font-medium text-amber-800 mb-1">📊 ZIM Anlage 6.2 - Planung der Personalkapazität</h3>
                <p className="text-sm text-amber-700">
                  Übersicht aller Projektmitarbeiter mit PM-Kosten, Personenmonaten pro Jahr und berechneten Personalkosten
                </p>
              </div>

              {anlage62Data.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <div className="text-4xl mb-4">📊</div>
                  <p className="text-lg font-medium mb-2">Noch keine Daten vorhanden</p>
                  <p className="text-sm">
                    Weisen Sie Mitarbeitern Personenmonate in den Arbeitspaketen zu,<br />
                    um die Personalkosten-Übersicht zu sehen.
                  </p>
                </div>
              ) : (
                <>
                  {/* Anlage 6.2 Tabelle */}
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nr.</th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qual.</th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mitarbeiter / Qualifikation</th>
                          <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">PM-Kosten</th>
                          <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">TZ-Faktor</th>
                          <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">Jahr</th>
                          <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">PM</th>
                          <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Pers.-Kosten</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {(() => {
                          // Gruppiere nach MA
                          const groupedByMA: { [key: string]: Anlage62Data[] } = {};
                          anlage62Data.forEach(row => {
                            const key = row.user_profile_id;
                            if (!groupedByMA[key]) groupedByMA[key] = [];
                            groupedByMA[key].push(row);
                          });

                          const rows: React.ReactNode[] = [];
                          let totalPM = 0;
                          let totalKosten = 0;

                          Object.entries(groupedByMA).forEach(([userId, maRows]) => {
                            const firstRow = maRows[0];
                            const maTotalPM = maRows.reduce((s, r) => s + r.person_monate, 0);
                            const maTotalKosten = maRows.reduce((s, r) => s + r.personalkosten, 0);
                            totalPM += maTotalPM;
                            totalKosten += maTotalKosten;

                            // Zeilen für jeden Jahr
                            maRows.forEach((row, idx) => {
                              rows.push(
                                <tr key={`${userId}-${row.year}`} className={idx === 0 ? 'border-t-2 border-gray-300' : ''}>
                                  {idx === 0 && (
                                    <>
                                      <td rowSpan={maRows.length + 1} className="px-3 py-2 text-sm font-bold text-blue-700 align-top">
                                        {row.ma_nr}
                                      </td>
                                      <td rowSpan={maRows.length + 1} className="px-3 py-2 align-top">
                                        <span className="inline-flex items-center justify-center w-7 h-7 bg-blue-100 text-blue-800 rounded font-medium text-sm">
                                          {row.qual_gruppe || 'A'}
                                        </span>
                                      </td>
                                      <td rowSpan={maRows.length + 1} className="px-3 py-2 align-top">
                                        <div className="font-medium text-gray-900">{row.ma_name}</div>
                                        <div className="text-xs text-gray-500">{row.qualifikation}</div>
                                      </td>
                                      <td rowSpan={maRows.length + 1} className="px-3 py-2 text-right text-sm align-top">
                                        {row.pm_kosten.toLocaleString('de-DE')} €
                                      </td>
                                      <td rowSpan={maRows.length + 1} className="px-3 py-2 text-right text-sm align-top">
                                        {row.teilzeit_faktor.toFixed(3)}
                                      </td>
                                    </>
                                  )}
                                  <td className="px-3 py-2 text-center text-sm">
                                    <span className="text-gray-500">{idx + 1}. Jahr</span>
                                    <span className="ml-2 font-medium">{row.year}</span>
                                  </td>
                                  <td className="px-3 py-2 text-right text-sm font-medium">
                                    {row.person_monate > 0 ? row.person_monate.toFixed(1) : '-'}
                                  </td>
                                  <td className="px-3 py-2 text-right text-sm">
                                    {row.personalkosten > 0 ? row.personalkosten.toLocaleString('de-DE') + ' €' : '-'}
                                  </td>
                                </tr>
                              );
                            });

                            // Gesamt-Zeile pro MA
                            rows.push(
                              <tr key={`${userId}-total`} className="bg-gray-50">
                                <td className="px-3 py-2 text-center text-sm font-medium text-gray-700">gesamt</td>
                                <td className="px-3 py-2 text-right text-sm font-bold text-gray-900">
                                  {maTotalPM.toFixed(1)}
                                </td>
                                <td className="px-3 py-2 text-right text-sm font-bold text-gray-900">
                                  {maTotalKosten.toLocaleString('de-DE')} €
                                </td>
                              </tr>
                            );
                          });

                          // Gesamtsumme
                          rows.push(
                            <tr key="grand-total" className="bg-amber-100 border-t-2 border-amber-400">
                              <td colSpan={5} className="px-3 py-3 text-right font-bold text-amber-800">
                                GESAMT
                              </td>
                              <td className="px-3 py-3"></td>
                              <td className="px-3 py-3 text-right font-bold text-amber-900 text-lg">
                                {totalPM.toFixed(1)} PM
                              </td>
                              <td className="px-3 py-3 text-right font-bold text-amber-900 text-lg">
                                {totalKosten.toLocaleString('de-DE')} €
                              </td>
                            </tr>
                          );

                          return rows;
                        })()}
                      </tbody>
                    </table>
                  </div>

                  {/* Legende */}
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg text-sm text-gray-600">
                    <p className="font-medium mb-2">Qualifikationsgruppen (ZIM):</p>
                    <ul className="space-y-1 ml-4">
                      <li><span className="font-medium">A:</span> Mitarbeiter mit Hoch- und Fachhochschulabschluss</li>
                      <li><span className="font-medium">B:</span> Mitarbeiter mit anderen staatlichen Abschlüssen (z.B. Techniker, Meister)</li>
                      <li><span className="font-medium">C:</span> Facharbeiter in einem anerkannten Ausbildungsberuf</li>
                    </ul>
                    <p className="mt-3 text-xs text-gray-500">
                      Je Projektmitarbeiter können pro Kalenderjahr maximal 10,5 PM eingeplant werden.<br />
                      Für Teilzeitbeschäftigte verringern sich die maximal planbaren PM entsprechend dem Teilzeitfaktor.
                    </p>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* AP Modal */}
      {showAPModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {editingAP ? 'Arbeitspaket bearbeiten' : 'Neues Arbeitspaket'}
            </h3>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">AP-Nummer *</label>
                  <input
                    type="text"
                    value={apForm.code}
                    onChange={(e) => setApForm({ ...apForm, code: e.target.value })}
                    placeholder="z.B. AP1.1"
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kategorie</label>
                  <select
                    value={apForm.category}
                    onChange={(e) => setApForm({ ...apForm, category: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    <option value="project_work">Förderfähig</option>
                    <option value="non_billable">Nicht förderfähig</option>
                    <option value="overhead">Overhead</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Beschreibung *</label>
                <textarea
                  rows={2}
                  value={apForm.description}
                  onChange={(e) => setApForm({ ...apForm, description: e.target.value })}
                  placeholder="Beschreibung des Arbeitspakets"
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Geplante Stunden</label>
                  <input
                    type="number"
                    value={apForm.estimated_hours}
                    onChange={(e) => setApForm({ ...apForm, estimated_hours: e.target.value })}
                    placeholder="z.B. 160"
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Startdatum</label>
                  <input
                    type="date"
                    value={apForm.start_date}
                    onChange={(e) => setApForm({ ...apForm, start_date: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Enddatum</label>
                  <input
                    type="date"
                    value={apForm.end_date}
                    onChange={(e) => setApForm({ ...apForm, end_date: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowAPModal(false)}
                disabled={saving}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Abbrechen
              </button>
              <button
                onClick={handleSaveAP}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
              >
                {saving ? 'Speichert...' : (editingAP ? 'Aktualisieren' : 'Erstellen')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Zuordnung Modal */}
      {showAssignModal && selectedAPForAssign && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Mitarbeiter zuordnen
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {selectedAPForAssign.code} - {selectedAPForAssign.description}
            </p>

            <div className="mb-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
              <strong>💡 Hinweis:</strong> Personenmonate (PM) werden basierend auf den individuellen Wochenstunden 
              des Mitarbeiters in Stunden umgerechnet. (1 PM = Wochenstunden × 52 / 12)
            </div>

            <div className="space-y-3">
              {companyEmployees.map((emp) => {
                const weeklyHours = emp.weekly_hours_contract || 40;
                const hoursPerPM = (weeklyHours * 52) / 12;
                const pmValue = parseFloat(assignments[emp.id]?.pm || '0') || 0;
                const calculatedHours = pmValue * hoursPerPM;
                
                return (
                  <div key={emp.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center flex-1">
                      <input
                        type="checkbox"
                        checked={assignments[emp.id]?.selected || false}
                        onChange={(e) => setAssignments({
                          ...assignments,
                          [emp.id]: { ...assignments[emp.id], selected: e.target.checked }
                        })}
                        className="w-5 h-5 text-blue-600 rounded mr-3 flex-shrink-0"
                      />
                      {/* MA-Nummer Badge */}
                      {emp.project_employee_number && (
                        <span className="inline-flex items-center justify-center w-7 h-7 bg-blue-600 text-white rounded-full font-bold text-sm mr-3 flex-shrink-0">
                          {emp.project_employee_number}
                        </span>
                      )}
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900">{emp.name}</div>
                        <div className="text-xs text-gray-500">
                          {weeklyHours}h/Woche • 1 PM = {hoursPerPM.toFixed(0)}h
                        </div>
                      </div>
                    </div>
                    {assignments[emp.id]?.selected && (
                      <div className="flex items-center space-x-2 flex-shrink-0 ml-4">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          placeholder="0"
                          value={assignments[emp.id]?.pm || ''}
                          onChange={(e) => setAssignments({
                            ...assignments,
                            [emp.id]: { ...assignments[emp.id], pm: e.target.value }
                          })}
                          className="w-16 border rounded px-2 py-1 text-sm text-right"
                        />
                        <span className="text-sm text-gray-600 w-8">PM</span>
                        <span className="text-sm text-gray-400">=</span>
                        <span className="text-sm font-medium text-blue-700 w-16 text-right">
                          {calculatedHours.toFixed(0)} h
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {companyEmployees.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                Keine Mitarbeiter verfügbar
              </div>
            )}

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowAssignModal(false)}
                disabled={saving}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Abbrechen
              </button>
              <button
                onClick={handleSaveAssignments}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
              >
                {saving ? 'Speichert...' : 'Zuordnungen speichern'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}