// ========================================
// Datei: src/app/projekte/[id]/page.tsx
// Projekt-Detail mit Arbeitspaketen, MA-Zuordnung, Anlage 5, Anlage 6.2,
// Förderung und Zahlungsanforderungen
// MERGED VERSION - Enthält alle bestehenden Features + ZA
// ========================================

'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

// ============================================
// INTERFACES
// ============================================

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
  // Förderfelder
  funding_program?: string;
  funding_reference?: string;
  funding_amount?: number;
  funding_rate?: number;
  overhead_rate?: number;
  funding_approval_date?: string;
  funding_start_date?: string;
  funding_end_date?: string;
  project_manager?: string;
  project_manager_phone?: string;
  project_manager_email?: string;
  cost_plan?: CostPlan;
}

interface CostPlan {
  personnel_costs_planned?: number;
  overhead_costs_planned?: number;
  third_party_costs_planned?: number;
  fue_contracts_planned?: number;
  temp_personnel_planned?: number;
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

interface PaymentRequest {
  id: string;
  project_id: string;
  request_number: number;
  period_start: string;
  period_end: string;
  personnel_costs: number;
  personnel_hours: number;
  overhead_costs: number;
  third_party_costs: number;
  total_eligible_costs: number;
  funding_rate_applied: number;
  requested_amount: number;
  approved_amount: number | null;
  paid_amount: number | null;
  status: 'draft' | 'calculated' | 'submitted' | 'in_review' | 'approved' | 'paid' | 'rejected' | 'partial';
  submitted_at: string | null;
  approved_at: string | null;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
}

interface PaymentRequestItem {
  id?: string;
  payment_request_id?: string;
  user_profile_id: string;
  employee_number: number;
  employee_name: string;
  qualification_group: string;
  hours_by_month: Record<string, number>;
  total_hours: number;
  hourly_rate: number;
  total_costs: number;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

const formatCurrency = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined) return '-';
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);
};

const formatDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('de-DE');
};

const getZAStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-800',
    calculated: 'bg-blue-100 text-blue-800',
    submitted: 'bg-yellow-100 text-yellow-800',
    in_review: 'bg-orange-100 text-orange-800',
    approved: 'bg-green-100 text-green-800',
    paid: 'bg-emerald-100 text-emerald-800',
    rejected: 'bg-red-100 text-red-800',
    partial: 'bg-purple-100 text-purple-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};

const getZAStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    draft: ' Entwurf',
    calculated: ' Berechnet',
    submitted: ' Eingereicht',
    in_review: '³ In Prüfung',
    approved: '… Bewilligt',
    paid: ' Ausgezahlt',
    rejected: 'Œ Abgelehnt',
    partial: ' Teilweise',
  };
  return labels[status] || status;
};

const getFundingProgramLabel = (program: string | null | undefined): string => {
  const labels: Record<string, string> = {
    ZIM: 'ZIM - Zentrales Innovationsprogramm Mittelstand',
    FZul: 'FZul - Forschungszulage',
    BAFA: 'BAFA - Bundesamt für Wirtschaft',
    other: 'Sonstiges Förderprogramm',
  };
  return program ? labels[program] || program : '-';
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const supabase = createClient();

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
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState<'arbeitspakete' | 'projektmitarbeiter' | 'anlage5' | 'anlage62' | 'foerderung' | 'zahlungsanforderungen'>('arbeitspakete');

  // Modal States
  const [showAPModal, setShowAPModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showZAModal, setShowZAModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showDeleteAllAPModal, setShowDeleteAllAPModal] = useState(false);
  const [deletingAllAP, setDeletingAllAP] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const [editingAP, setEditingAP] = useState<WorkPackage | null>(null);
  const [selectedAPForAssign, setSelectedAPForAssign] = useState<WorkPackage | null>(null);
  const [selectedZaId, setSelectedZaId] = useState<string | null>(null);

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

  // Förder-Form
  const [foerderFormData, setFoerderFormData] = useState({
    funding_program: '',
    funding_reference: '',
    funding_amount: '',
    funding_rate: '',
    overhead_rate: '',
    funding_approval_date: '',
    funding_start_date: '',
    funding_end_date: '',
    project_manager: '',
    project_manager_phone: '',
    project_manager_email: '',
    cost_plan: {} as CostPlan
  });
  const [foerderEditMode, setFoerderEditMode] = useState(false);

  // ZA Creation State
  const [zaFormData, setZaFormData] = useState({
    period_start: '',
    period_end: '',
  });
  const [zaCalculation, setZaCalculation] = useState<{
    items: PaymentRequestItem[];
    totals: {
      personnel_hours: number;
      personnel_costs: number;
      overhead_costs: number;
      total_eligible_costs: number;
      requested_amount: number;
    };
  } | null>(null);
  const [zaCalculating, setZaCalculating] = useState(false);

  useEffect(() => {
    loadData();
  }, [resolvedParams.id]);

  // ============================================
  // DATA LOADING
  // ============================================

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

      // Förder-Daten initialisieren
      setFoerderFormData({
        funding_program: projectData.funding_program || '',
        funding_reference: projectData.funding_reference || '',
        funding_amount: projectData.funding_amount?.toString() || '',
        funding_rate: projectData.funding_rate?.toString() || '',
        overhead_rate: projectData.overhead_rate?.toString() || '',
        funding_approval_date: projectData.funding_approval_date || '',
        funding_start_date: projectData.funding_start_date || '',
        funding_end_date: projectData.funding_end_date || '',
        project_manager: projectData.project_manager || '',
        project_manager_phone: projectData.project_manager_phone || '',
        project_manager_email: projectData.project_manager_email || '',
        cost_plan: projectData.cost_plan || {}
      });

      // Arbeitspakete laden
      await loadWorkPackages(resolvedParams.id);

      // Projekt-Zuordnungen laden
      const { data: projectAssignData } = await supabase
        .from('project_assignments')
        .select('id, user_profile_id, project_employee_number')
        .eq('project_id', resolvedParams.id)
        .order('project_employee_number');

      setProjectAssignments(projectAssignData || []);

      // Mitarbeiter der Firma laden
      const { data: employeesData } = await supabase
        .from('user_profiles')
        .select('id, name, email, role, weekly_hours_contract, qualification, qualification_group')
        .eq('company_id', projectData.company_id)
        .eq('is_active', true)
        .order('name');

      const employeesWithNumber = (employeesData || []).map(emp => {
        const assignment = projectAssignData?.find(pa => pa.user_profile_id === emp.id);
        return {
          ...emp,
          project_employee_number: assignment?.project_employee_number
        };
      }).sort((a, b) => {
        if (a.project_employee_number && b.project_employee_number) {
          return a.project_employee_number - b.project_employee_number;
        }
        if (a.project_employee_number) return -1;
        if (b.project_employee_number) return 1;
        return a.name.localeCompare(b.name);
      });

      setCompanyEmployees(employeesWithNumber);

      // Anlage 6.2 Daten laden
      await loadAnlage62Data(resolvedParams.id);

      // Zahlungsanforderungen laden
      const { data: prData } = await supabase
        .from('payment_requests')
        .select('*')
        .eq('project_id', resolvedParams.id)
        .order('request_number', { ascending: false });

      setPaymentRequests(prData || []);

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
    try {
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

      const { data: paData } = await supabase
        .from('project_assignments')
        .select('user_profile_id, project_employee_number')
        .eq('project_id', projectId);

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

      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('id, name, first_name, last_name, qualification, qualification_group, weekly_hours_contract, weekly_hours_company')
        .in('id', Array.from(userIds));

      const { data: salaries } = await supabase
        .from('salary_components')
        .select('user_profile_id, year, monthly_personnel_cost, hourly_rate')
        .in('user_profile_id', Array.from(userIds));

      const pmByUserYear: { [key: string]: number } = {};

      wpData?.forEach(wp => {
        if (!wp.assignments || wp.assignments.length === 0) return;

        let wpYear: number;
        
        if (wp.start_date) {
          wpYear = new Date(wp.start_date).getFullYear();
        } else if (wp.end_date) {
          wpYear = new Date(wp.end_date).getFullYear();
        } else {
          wpYear = new Date().getFullYear();
        }

        const startYear = wp.start_date ? new Date(wp.start_date).getFullYear() : wpYear;
        const endYear = wp.end_date ? new Date(wp.end_date).getFullYear() : wpYear;

        wp.assignments?.forEach((a: any) => {
          if (!a.person_months || a.person_months <= 0) return;

          if (startYear === endYear) {
            const key = `${a.user_profile_id}_${startYear}`;
            pmByUserYear[key] = (pmByUserYear[key] || 0) + a.person_months;
          } else {
            const startDate = new Date(wp.start_date);
            const endDate = new Date(wp.end_date);
            const totalMonths = (endYear - startYear) * 12 + (endDate.getMonth() - startDate.getMonth()) + 1;

            for (let year = startYear; year <= endYear; year++) {
              let monthsInYear: number;
              
              if (year === startYear) {
                monthsInYear = 12 - startDate.getMonth();
              } else if (year === endYear) {
                monthsInYear = endDate.getMonth() + 1;
              } else {
                monthsInYear = 12;
              }

              const pmForYear = (a.person_months * monthsInYear) / totalMonths;
              const key = `${a.user_profile_id}_${year}`;
              pmByUserYear[key] = (pmByUserYear[key] || 0) + pmForYear;
            }
          }
        });
      });

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
            person_monate: Math.round(pm * 100) / 100,
            personalkosten: Math.round(pm * pmKosten)
          });
        }
      });

      result.sort((a, b) => {
        if (a.ma_nr !== b.ma_nr) return a.ma_nr - b.ma_nr;
        return a.year - b.year;
      });

      setAnlage62Data(result);
    } catch (error) {
      console.error('Error calculating Anlage 6.2 data:', error);
    }
  };

  // ============================================
  // PROJEKTMITARBEITER VERWALTUNG
  // ============================================

  const handleUpdateProjectEmployeeNumber = async (userProfileId: string, newNumber: number) => {
    try {
      if (!newNumber || newNumber < 1) return;

      const { error } = await supabase
        .from('project_assignments')
        .update({ project_employee_number: newNumber })
        .eq('project_id', resolvedParams.id)
        .eq('user_profile_id', userProfileId);

      if (error) throw error;

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

      setCompanyEmployees(prev => prev.map(emp => 
        emp.id === userProfileId 
          ? { ...emp, qualification_group: group }
          : emp
      ));

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
      const wpIds = workPackages.map(wp => wp.id);
      
      if (wpIds.length > 0) {
        const { error: wpaError } = await supabase
          .from('work_package_assignments')
          .delete()
          .eq('user_profile_id', userProfileId)
          .in('work_package_id', wpIds);

        if (wpaError) throw wpaError;
      }

      const { error: paError } = await supabase
        .from('project_assignments')
        .delete()
        .eq('project_id', resolvedParams.id)
        .eq('user_profile_id', userProfileId);

      if (paError) throw paError;

      await loadData();

      setSuccess('Mitarbeiter aus Projekt entfernt');
      setTimeout(() => setSuccess(''), 2000);

    } catch (error: any) {
      console.error('Error removing from project:', error);
      setError('Fehler beim Entfernen des Mitarbeiters');
    }
  };

  // ============================================
  // PROJEKT CRUD
  // ============================================

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

  // ============================================
  // FÖRDERUNG SPEICHERN
  // ============================================

  const handleSaveFoerderung = async () => {
    try {
      setSaving(true);
      setError('');

      const { error: updateError } = await supabase
        .from('projects')
        .update({
          funding_program: foerderFormData.funding_program || null,
          funding_reference: foerderFormData.funding_reference || null,
          funding_amount: foerderFormData.funding_amount ? parseFloat(foerderFormData.funding_amount) : null,
          funding_rate: foerderFormData.funding_rate ? parseFloat(foerderFormData.funding_rate) : null,
          overhead_rate: foerderFormData.overhead_rate ? parseFloat(foerderFormData.overhead_rate) : null,
          funding_approval_date: foerderFormData.funding_approval_date || null,
          funding_start_date: foerderFormData.funding_start_date || null,
          funding_end_date: foerderFormData.funding_end_date || null,
          project_manager: foerderFormData.project_manager || null,
          project_manager_phone: foerderFormData.project_manager_phone || null,
          project_manager_email: foerderFormData.project_manager_email || null,
          cost_plan: Object.keys(foerderFormData.cost_plan).length > 0 ? foerderFormData.cost_plan : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', resolvedParams.id);

      if (updateError) throw updateError;

      setSuccess('Förderdetails gespeichert!');
      setFoerderEditMode(false);
      loadData();

      setTimeout(() => setSuccess(''), 3000);

    } catch (error: any) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  };

  // ============================================
  // ARBEITSPAKET CRUD
  // ============================================

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
        const { error } = await supabase
          .from('work_packages')
          .update(apData)
          .eq('id', editingAP.id);

        if (error) throw error;
        setSuccess('Arbeitspaket aktualisiert!');
      } else {
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
      await loadAnlage62Data(resolvedParams.id);
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

      const { error } = await supabase
        .from('work_packages')
        .update({ is_active: false })
        .eq('id', ap.id);

      if (error) throw error;

      setSuccess('Arbeitspaket gelöscht!');
      await loadWorkPackages(resolvedParams.id);
      await loadAnlage62Data(resolvedParams.id);
      setTimeout(() => setSuccess(''), 3000);

    } catch (error: any) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  };

  // ============================================
  // MITARBEITER ZUORDNUNG
  // ============================================

  const openAssignModal = (ap: WorkPackage) => {
    setSelectedAPForAssign(ap);
    
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

      const { error: deleteError } = await supabase
        .from('work_package_assignments')
        .delete()
        .eq('work_package_id', selectedAPForAssign.id);

      if (deleteError) throw deleteError;

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
      await loadAnlage62Data(resolvedParams.id);
      setTimeout(() => setSuccess(''), 3000);

    } catch (error: any) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  };

  // ============================================
  // ZAHLUNGSANFORDERUNGEN
  // ============================================

  const handleCalculateZA = async () => {
    if (!zaFormData.period_start || !zaFormData.period_end || !project) {
      setError('Bitte Start- und Enddatum angeben');
      return;
    }

    setZaCalculating(true);
    setError('');

    try {
      // Get assigned user IDs first
      const assignedUserIds = new Set<string>();
      const assignmentMap: Record<string, number> = {};
      projectAssignments.forEach(pa => {
        assignmentMap[pa.user_profile_id] = pa.project_employee_number;
        assignedUserIds.add(pa.user_profile_id);
      });

      if (assignedUserIds.size === 0) {
        setError('Keine Projektmitarbeiter zugeordnet');
        setZaCalculating(false);
        return;
      }

      // Get time entries for period - nur für zugeordnete MA
      const { data: timeEntries, error: teError } = await supabase
        .from('time_entries')
        .select(`
          *,
          user_profile:user_profiles (
            id,
            name,
            qualification_group
          )
        `)
        .eq('project_id', project.id)
        .eq('category', 'project_work')
        .gte('entry_date', zaFormData.period_start)
        .lte('entry_date', zaFormData.period_end)
        .in('user_profile_id', Array.from(assignedUserIds));

      if (teError) throw teError;

      // Group by employee and month
      const employeeData: Record<string, {
        user_profile_id: string;
        name: string;
        qualification_group: string;
        hours_by_month: Record<string, number>;
        total_hours: number;
      }> = {};

      (timeEntries || []).forEach((entry: any) => {
        const upId = entry.user_profile_id;
        const monthKey = entry.entry_date.substring(0, 7);

        if (!employeeData[upId]) {
          employeeData[upId] = {
            user_profile_id: upId,
            name: entry.user_profile?.name || 'Unbekannt',
            qualification_group: entry.user_profile?.qualification_group || 'C',
            hours_by_month: {},
            total_hours: 0,
          };
        }

        if (!employeeData[upId].hours_by_month[monthKey]) {
          employeeData[upId].hours_by_month[monthKey] = 0;
        }

        employeeData[upId].hours_by_month[monthKey] += Number(entry.hours);
        employeeData[upId].total_hours += Number(entry.hours);
      });

      // Get salary data for hourly rates
      const year = new Date(zaFormData.period_start).getFullYear();
      const userIds = Object.keys(employeeData);

      const { data: salaryData } = await supabase
        .from('salary_components')
        .select('user_profile_id, hourly_rate')
        .in('user_profile_id', userIds.length > 0 ? userIds : ['none'])
        .eq('year', year);

      const salaryMap: Record<string, number> = {};
      (salaryData || []).forEach((s: any) => {
        salaryMap[s.user_profile_id] = Number(s.hourly_rate) || 50;
      });

      // Build items
      const items: PaymentRequestItem[] = Object.values(employeeData)
        .filter(emp => assignedUserIds.has(emp.user_profile_id))
        .map(emp => ({
          user_profile_id: emp.user_profile_id,
          employee_number: assignmentMap[emp.user_profile_id] || 0,
          employee_name: emp.name,
          qualification_group: emp.qualification_group,
          hours_by_month: emp.hours_by_month,
          total_hours: emp.total_hours,
          hourly_rate: salaryMap[emp.user_profile_id] || 50,
          total_costs: emp.total_hours * (salaryMap[emp.user_profile_id] || 50),
        }));

      // Calculate totals
      const personnel_hours = items.reduce((sum, i) => sum + i.total_hours, 0);
      const personnel_costs = items.reduce((sum, i) => sum + i.total_costs, 0);
      const overhead_rate = project.overhead_rate || 0;
      const overhead_costs = personnel_costs * (overhead_rate / 100);
      const total_eligible_costs = personnel_costs + overhead_costs;
      const funding_rate = project.funding_rate || 50;
      const requested_amount = total_eligible_costs * (funding_rate / 100);

      setZaCalculation({
        items: items.sort((a, b) => a.employee_number - b.employee_number),
        totals: {
          personnel_hours,
          personnel_costs,
          overhead_costs,
          total_eligible_costs,
          requested_amount,
        },
      });

    } catch (err: any) {
      setError(err.message);
    } finally {
      setZaCalculating(false);
    }
  };

  const handleSaveZA = async (asDraft: boolean = true) => {
    if (!zaCalculation || !project) return;

    setSaving(true);
    setError('');

    try {
      // Get next ZA number
      const { data: nextNumData } = await supabase
        .rpc('get_next_za_number', { p_project_id: project.id });
      
      const requestNumber = nextNumData || 1;

      // Create payment request
      const { data: newPR, error: prError } = await supabase
        .from('payment_requests')
        .insert([{
          company_id: project.company_id,
          project_id: project.id,
          request_number: requestNumber,
          period_start: zaFormData.period_start,
          period_end: zaFormData.period_end,
          personnel_costs: zaCalculation.totals.personnel_costs,
          personnel_hours: zaCalculation.totals.personnel_hours,
          overhead_costs: zaCalculation.totals.overhead_costs,
          total_eligible_costs: zaCalculation.totals.total_eligible_costs,
          funding_rate_applied: project.funding_rate || 50,
          requested_amount: zaCalculation.totals.requested_amount,
          status: asDraft ? 'draft' : 'calculated',
          calculated_at: new Date().toISOString(),
        }])
        .select()
        .single();

      if (prError) throw prError;

      // Create items
      const itemsToInsert = zaCalculation.items.map(item => ({
        payment_request_id: newPR.id,
        user_profile_id: item.user_profile_id,
        employee_number: item.employee_number,
        employee_name: item.employee_name,
        qualification_group: item.qualification_group,
        hours_by_month: item.hours_by_month,
        total_hours: item.total_hours,
        hourly_rate: item.hourly_rate,
        total_costs: item.total_costs,
      }));

      const { error: itemsError } = await supabase
        .from('payment_request_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      setSuccess(`Zahlungsanforderung Nr. ${requestNumber} erstellt`);
      setShowZAModal(false);
      setZaFormData({ period_start: '', period_end: '' });
      setZaCalculation(null);
      loadData();

    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteZA = async (zaId: string) => {
    if (!confirm('Zahlungsanforderung wirklich löschen?')) return;

    try {
      await supabase.from('payment_request_items').delete().eq('payment_request_id', zaId);
      const { error } = await supabase.from('payment_requests').delete().eq('id', zaId);

      if (error) throw error;
      setSuccess('Zahlungsanforderung gelöscht');
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // ============================================
  // HELPER FUNCTIONS
  // ============================================

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

  // ============================================
  // COMPUTED VALUES
  // ============================================

  const isAdmin = profile?.role === 'admin';
  const isManager = false; // Rolle existiert nicht mehr
  const canEdit = isAdmin || isManager;

  // Funding status calculation
  const fundingStatus = {
    approved: project?.funding_amount || 0,
    requested: paymentRequests
      .filter(pr => ['submitted', 'in_review', 'approved', 'paid', 'partial'].includes(pr.status))
      .reduce((sum, pr) => sum + (pr.requested_amount || 0), 0),
    paid: paymentRequests
      .filter(pr => ['paid', 'partial'].includes(pr.status))
      .reduce((sum, pr) => sum + (pr.paid_amount || 0), 0),
    pending: paymentRequests
      .filter(pr => ['submitted', 'in_review'].includes(pr.status))
      .reduce((sum, pr) => sum + (pr.requested_amount || 0), 0),
    available: 0,
  };
  fundingStatus.available = fundingStatus.approved - fundingStatus.paid - fundingStatus.pending;

  // ============================================
  // RENDER - Loading & Error States
  // ============================================

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

  // ============================================
  // RENDER - Main Content
  // ============================================

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
                  <div className="flex items-center space-x-3 mt-1">
                    {project.project_number && (
                      <span className="text-sm text-gray-500">#{project.project_number}</span>
                    )}
                    {project.funding_reference && (
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded text-sm font-medium">
                         {project.funding_reference}
                      </span>
                    )}
                  </div>
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

          {/* Projekt-Details - View/Edit Mode */}
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Budget (EUR)</label>
                    <input
                      type="number"
                      value={formData.budget}
                      onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Stundensatz (EUR)</label>
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
                    <p className="text-gray-900">{project.budget.toLocaleString('de-DE')} EUR</p>
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

        {/* ============================================ */}
        {/* TABS SECTION */}
        {/* ============================================ */}
        <div className="bg-white rounded-lg shadow">
          {/* Tab-Navigation */}
          <div className="px-4 py-4 border-b border-gray-200">
            <div className="flex flex-wrap gap-2 mb-3">
              <button
                onClick={() => setActiveTab('arbeitspakete')}
                className={`px-4 py-2 font-medium rounded-lg transition-colors whitespace-nowrap ${
                  activeTab === 'arbeitspakete'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                 Arbeitspakete ({workPackages.length})
              </button>
              <button
                onClick={() => setActiveTab('projektmitarbeiter')}
                className={`px-4 py-2 font-medium rounded-lg transition-colors whitespace-nowrap ${
                  activeTab === 'projektmitarbeiter'
                    ? 'bg-purple-100 text-purple-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                 Projektmitarbeiter ({projectAssignments.length})
              </button>
              <button
                onClick={() => setActiveTab('anlage5')}
                className={`px-4 py-2 font-medium rounded-lg transition-colors whitespace-nowrap ${
                  activeTab === 'anlage5'
                    ? 'bg-green-100 text-green-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                 Anlage 5
              </button>
              <button
                onClick={() => setActiveTab('anlage62')}
                className={`px-4 py-2 font-medium rounded-lg transition-colors whitespace-nowrap ${
                  activeTab === 'anlage62'
                    ? 'bg-amber-100 text-amber-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                 Anlage 6.2
              </button>
              <button
                onClick={() => setActiveTab('foerderung')}
                className={`px-4 py-2 font-medium rounded-lg transition-colors whitespace-nowrap ${
                  activeTab === 'foerderung'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                 Förderung
              </button>
              <button
                onClick={() => setActiveTab('zahlungsanforderungen')}
                className={`px-4 py-2 font-medium rounded-lg transition-colors whitespace-nowrap ${
                  activeTab === 'zahlungsanforderungen'
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                 Zahlungsanforderungen ({paymentRequests.length})
              </button>
            </div>
          </div>

          {/* TAB CONTENT */}

          {/* ========== TAB: ARBEITSPAKETE ========== */}
          {activeTab === 'arbeitspakete' && (
            <div className="px-4 py-6">
              {/* Header mit Buttons */}
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Arbeitspakete</h3>
                {canEdit && (
                  <div className="flex space-x-2">
                    {workPackages.length > 0 && (
                      <button onClick={() => setShowDeleteAllAPModal(true)} className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 flex items-center">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        Alle löschen
                      </button>
                    )}
                    <button onClick={() => setShowImportModal(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                      Excel-Import
                    </button>
                    <button onClick={() => openAPModal()} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                      Neues Arbeitspaket
                    </button>
                  </div>
                )}
              </div>
              {loadingPackages ? (
                <div className="text-center py-8 text-gray-500">Arbeitspakete werden geladen...</div>
              ) : workPackages.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  <p className="text-gray-500 font-medium">Keine Arbeitspakete vorhanden</p>
                  <p className="text-gray-400 text-sm mt-1">Nutzen Sie die Buttons oben um Arbeitspakete anzulegen</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto -mx-4">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-24">AP-Nr</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Beschreibung</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-36">Zeitraum</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-44">Mitarbeiter</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase w-24">Geplant</th>
                          {canEdit && <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase w-24">Aktionen</th>}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {workPackages.map((wp) => (
                          <tr key={wp.id} className="hover:bg-gray-50">
                            <td className="px-4 py-4"><span className="font-mono font-bold text-blue-600">{wp.code}</span></td>
                            <td className="px-4 py-4"><div className="text-sm text-gray-900">{wp.description}</div></td>
                            <td className="px-4 py-4 text-sm text-gray-500">
                              {wp.start_date && wp.end_date ? (
                                <div className="text-xs">{formatDate(wp.start_date)} - {formatDate(wp.end_date)}</div>
                              ) : '-'}
                            </td>
                            <td className="px-4 py-4">
                              {wp.assignments && wp.assignments.length > 0 ? (
                                <div className="space-y-1">
                                  {wp.assignments.map((a, idx) => (
                                    <div key={idx} className="flex items-center text-xs">
                                      <span className="text-gray-700">{a.user_profile?.name?.split(' ')[0]}</span>
                                      {a.person_months && <span className="ml-2 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">{a.person_months} PM</span>}
                                    </div>
                                  ))}
                                  {canEdit && <button onClick={() => openAssignModal(wp)} className="text-blue-600 hover:text-blue-800 text-xs">Bearbeiten</button>}
                                </div>
                              ) : canEdit ? (
                                <button onClick={() => openAssignModal(wp)} className="text-blue-600 hover:text-blue-800 text-sm">+ Zuordnen</button>
                              ) : '-'}
                            </td>
                            <td className="px-4 py-4 text-right text-sm">{wp.estimated_hours ? `${wp.estimated_hours}h` : '-'}</td>
                            {canEdit && (
                              <td className="px-4 py-4 text-right text-sm">
                                <button onClick={() => openAPModal(wp)} className="text-blue-600 hover:text-blue-800 mr-3">ï¸</button>
                                <button onClick={() => handleDeleteAP(wp)} className="text-red-600 hover:text-red-800"></button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 px-4">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="text-sm text-blue-600 font-medium">Arbeitspakete</div>
                      <div className="text-2xl font-bold text-blue-900">{workPackages.length}</div>
                    </div>
                    <div className="bg-amber-50 rounded-lg p-4">
                      <div className="text-sm text-amber-600 font-medium">Geplante PM</div>
                      <div className="text-2xl font-bold text-amber-900">
                        {workPackages.reduce((sum, wp) => sum + (wp.assignments?.reduce((s, a) => s + (a.person_months || 0), 0) || 0), 0).toFixed(1)} PM
                      </div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4">
                      <div className="text-sm text-green-600 font-medium">Geplante Stunden</div>
                      <div className="text-2xl font-bold text-green-900">
                        {Math.round(workPackages.reduce((sum, wp) => sum + (wp.assignments?.reduce((s, a) => s + (a.person_months || 0), 0) || 0), 0) * (40 * 52 / 12))}h
                      </div>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4">
                      <div className="text-sm text-purple-600 font-medium">Mitarbeiter</div>
                      <div className="text-2xl font-bold text-purple-900">
                        {new Set(workPackages.flatMap(wp => wp.assignments?.map(a => a.user_profile?.id) || [])).size}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ========== TAB: PROJEKTMITARBEITER ========== */}
          {activeTab === 'projektmitarbeiter' && (
            <div className="px-6 py-6">
              <div className="flex justify-between items-start mb-4">
                <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg flex-1 mr-4">
                  <h3 className="font-medium text-purple-800 mb-1"> Projektmitarbeiter verwalten</h3>
                  <p className="text-sm text-purple-700">Nummern und Qualifikationsgruppen für ZIM-Anträge festlegen.</p>
                </div>
                {canEdit && (
                  <div className="flex items-center space-x-2">
                    <select
                      id="addEmployeeSelect"
                      className="border rounded-lg px-3 py-2 text-sm"
                      defaultValue=""
                      onChange={async (e) => {
                        const userId = e.target.value;
                        if (!userId) return;
                        
                        // Höchste bestehende MA-Nummer finden
                        const maxNum = projectAssignments.reduce((max, pa) => Math.max(max, pa.project_employee_number || 0), 0);
                        
                        // Neuen Eintrag erstellen
                        const { error } = await supabase
                          .from('project_assignments')
                          .insert({
                            project_id: resolvedParams.id,
                            user_profile_id: userId,
                            project_employee_number: maxNum + 1
                          });
                        
                        if (error) {
                          setError(`Fehler: ${error.message}`);
                        } else {
                          setSuccess('Mitarbeiter hinzugefügt');
                          // Neu laden
                          const { data: projectAssignData } = await supabase
                            .from('project_assignments')
                            .select('id, user_profile_id, project_employee_number')
                            .eq('project_id', resolvedParams.id)
                            .order('project_employee_number');
                          setProjectAssignments(projectAssignData || []);
                          
                          // companyEmployees aktualisieren
                          const updatedEmployees = companyEmployees.map(emp => {
                            const assignment = projectAssignData?.find(pa => pa.user_profile_id === emp.id);
                            return { ...emp, project_employee_number: assignment?.project_employee_number };
                          });
                          setCompanyEmployees(updatedEmployees);
                          
                          setTimeout(() => setSuccess(''), 3000);
                        }
                        e.target.value = '';
                      }}
                    >
                      <option value="">+ Mitarbeiter hinzufügen...</option>
                      {companyEmployees
                        .filter(emp => !emp.project_employee_number)
                        .map(emp => (
                          <option key={emp.id} value={emp.id}>{emp.name}</option>
                        ))
                      }
                    </select>
                  </div>
                )}
              </div>
              {projectAssignments.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <p className="font-medium">Noch keine Projektmitarbeiter</p>
                  <p className="text-sm mt-1">Wählen Sie oben Mitarbeiter aus, um sie dem Projekt zuzuordnen.</p>
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
                        {canEdit && <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Aktionen</th>}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {companyEmployees.filter(emp => emp.project_employee_number).sort((a, b) => (a.project_employee_number || 99) - (b.project_employee_number || 99)).map((emp) => {
                        const empPM = anlage62Data.filter(a => a.user_profile_id === emp.id).reduce((sum, a) => sum + a.person_monate, 0);
                        return (
                          <tr key={emp.id} className="hover:bg-gray-50">
                            <td className="px-4 py-4">
                              {canEdit ? (
                                <input type="number" min="1" value={emp.project_employee_number || ''} onChange={(e) => handleUpdateProjectEmployeeNumber(emp.id, parseInt(e.target.value))} className="w-16 border rounded px-2 py-1 text-center font-bold text-blue-700" />
                              ) : (
                                <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-full font-bold">{emp.project_employee_number}</span>
                              )}
                            </td>
                            <td className="px-4 py-4">
                              {canEdit ? (
                                <select value={emp.qualification_group || 'A'} onChange={(e) => handleUpdateQualificationGroup(emp.id, e.target.value)} className="border rounded px-2 py-1 font-medium">
                                  <option value="A">A</option>
                                  <option value="B">B</option>
                                  <option value="C">C</option>
                                </select>
                              ) : (
                                <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-800 rounded font-medium">{emp.qualification_group || 'A'}</span>
                              )}
                            </td>
                            <td className="px-4 py-4"><div className="font-medium text-gray-900">{emp.name}</div><div className="text-xs text-gray-500">{emp.email}</div></td>
                            <td className="px-4 py-4 text-sm text-gray-600">{emp.qualification || '-'}</td>
                            <td className="px-4 py-4 text-right"><span className="font-medium text-gray-900">{empPM.toFixed(1)} PM</span></td>
                            {canEdit && (
                              <td className="px-4 py-4 text-right">
                                <button onClick={() => handleRemoveFromProject(emp.id)} className="text-red-600 hover:text-red-800 text-sm"> Entfernen</button>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg text-sm text-gray-600">
                <p className="font-medium mb-2">Qualifikationsgruppen (ZIM):</p>
                <ul className="space-y-1 ml-4">
                  <li><strong>A:</strong> Mitarbeiter mit Hoch- und Fachhochschulabschluss</li>
                  <li><strong>B:</strong> Mitarbeiter mit anderen staatlichen Abschlüssen</li>
                  <li><strong>C:</strong> Facharbeiter in einem anerkannten Ausbildungsberuf</li>
                </ul>
              </div>
            </div>
          )}

          {/* ========== TAB: ANLAGE 5 ========== */}
          {activeTab === 'anlage5' && (
            <div className="px-6 py-6">
              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="font-medium text-green-800 mb-1"> ZIM Anlage 5 - Kontrollsummen</h3>
                <p className="text-sm text-green-700">Übersicht der Personenmonate je Arbeitspaket und je Mitarbeiter</p>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1">
                  <h4 className="font-medium text-gray-900 mb-4">a) PM je Arbeitspaket</h4>
                  <table className="min-w-full divide-y divide-gray-200 border">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">AP Nr.</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">PM</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {workPackages.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true })).map(wp => {
                        const totalPM = wp.assignments?.reduce((sum, a) => sum + (a.person_months || 0), 0) || 0;
                        return (
                          <tr key={wp.id}>
                            <td className="px-4 py-2 text-sm font-medium">{wp.code}</td>
                            <td className="px-4 py-2 text-sm text-right">{totalPM > 0 ? totalPM.toFixed(2) : '-'}</td>
                          </tr>
                        );
                      })}
                      <tr className="bg-gray-100 font-bold">
                        <td className="px-4 py-3 text-sm">Summe</td>
                        <td className="px-4 py-3 text-sm text-right">
                          {workPackages.reduce((sum, wp) => sum + (wp.assignments?.reduce((s, a) => s + (a.person_months || 0), 0) || 0), 0).toFixed(0)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="lg:col-span-2">
                  <h4 className="font-medium text-gray-900 mb-4">b) PM je Mitarbeiter</h4>
                  <table className="min-w-full divide-y divide-gray-200 border">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">MA Nr.</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">PM</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">beteiligt an AP</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {(() => {
                        const pmByMA: { [key: string]: { pm: number; aps: string[]; maNum: number } } = {};
                        workPackages.forEach(wp => {
                          wp.assignments?.forEach(a => {
                            const maId = a.user_profile?.id;
                            if (!maId) return;
                            if (!pmByMA[maId]) {
                              const emp = companyEmployees.find(e => e.id === maId);
                              pmByMA[maId] = { pm: 0, aps: [], maNum: emp?.project_employee_number || 99 };
                            }
                            pmByMA[maId].pm += a.person_months || 0;
                            if (a.person_months && !pmByMA[maId].aps.includes(wp.code)) pmByMA[maId].aps.push(wp.code);
                          });
                        });
                        const sortedMAs = Object.entries(pmByMA).sort((a, b) => a[1].maNum - b[1].maNum);
                        let totalPM = 0;
                        return (
                          <>
                            {sortedMAs.map(([maId, data]) => {
                              totalPM += data.pm;
                              return (
                                <tr key={maId}>
                                  <td className="px-4 py-2 text-sm font-medium">{data.maNum}</td>
                                  <td className="px-4 py-2 text-sm text-right">{data.pm > 0 ? data.pm.toFixed(1) : '-'}</td>
                                  <td className="px-4 py-2 text-sm text-gray-600">{data.aps.sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).join('; ') || '-'}</td>
                                </tr>
                              );
                            })}
                            <tr className="bg-gray-100 font-bold">
                              <td className="px-4 py-3 text-sm">Summe</td>
                              <td className="px-4 py-3 text-sm text-right">{totalPM.toFixed(0)}</td>
                              <td className="px-4 py-3"></td>
                            </tr>
                          </>
                        );
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========== TAB: ANLAGE 6.2 ========== */}
          {activeTab === 'anlage62' && (
            <div className="px-6 py-6">
              <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <h3 className="font-medium text-amber-800 mb-1"> ZIM Anlage 6.2 - Planung der Personalkapazität</h3>
                <p className="text-sm text-amber-700">PM-Kosten, Personenmonate pro Jahr und Personalkosten</p>
              </div>
              {anlage62Data.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p>Noch keine Daten. Weisen Sie MA Personenmonate in den Arbeitspaketen zu.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nr.</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qual.</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mitarbeiter</th>
                        <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">PM-Kosten</th>
                        <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">TZ-Faktor</th>
                        <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">Jahr</th>
                        <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">PM</th>
                        <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Pers.-Kosten</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {(() => {
                        const groupedByMA: { [key: string]: Anlage62Data[] } = {};
                        anlage62Data.forEach(row => {
                          if (!groupedByMA[row.user_profile_id]) groupedByMA[row.user_profile_id] = [];
                          groupedByMA[row.user_profile_id].push(row);
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
                          maRows.forEach((row, idx) => {
                            rows.push(
                              <tr key={`${userId}-${row.year}`} className={idx === 0 ? 'border-t-2 border-gray-300' : ''}>
                                {idx === 0 && (
                                  <>
                                    <td rowSpan={maRows.length + 1} className="px-3 py-2 text-sm font-bold text-blue-700 align-top">{row.ma_nr}</td>
                                    <td rowSpan={maRows.length + 1} className="px-3 py-2 align-top"><span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">{row.qual_gruppe || 'A'}</span></td>
                                    <td rowSpan={maRows.length + 1} className="px-3 py-2 align-top"><div className="font-medium">{row.ma_name}</div><div className="text-xs text-gray-500">{row.qualifikation}</div></td>
                                    <td rowSpan={maRows.length + 1} className="px-3 py-2 text-right text-sm align-top">{row.pm_kosten.toLocaleString('de-DE')} EUR</td>
                                    <td rowSpan={maRows.length + 1} className="px-3 py-2 text-right text-sm align-top">{row.teilzeit_faktor.toFixed(3)}</td>
                                  </>
                                )}
                                <td className="px-3 py-2 text-center text-sm"><span className="text-gray-500">{idx + 1}. Jahr</span> {row.year}</td>
                                <td className="px-3 py-2 text-right text-sm font-medium">{row.person_monate > 0 ? row.person_monate.toFixed(1) : '-'}</td>
                                <td className="px-3 py-2 text-right text-sm">{row.personalkosten > 0 ? `${row.personalkosten.toLocaleString('de-DE')} EUR` : '-'}</td>
                              </tr>
                            );
                          });
                          rows.push(
                            <tr key={`${userId}-total`} className="bg-gray-50">
                              <td className="px-3 py-2 text-center text-sm font-medium text-gray-700">gesamt</td>
                              <td className="px-3 py-2 text-right text-sm font-bold">{maTotalPM.toFixed(1)}</td>
                              <td className="px-3 py-2 text-right text-sm font-bold">{maTotalKosten.toLocaleString('de-DE')} EUR</td>
                            </tr>
                          );
                        });
                        rows.push(
                          <tr key="grand-total" className="bg-amber-100 border-t-2 border-amber-400">
                            <td colSpan={5} className="px-3 py-3 text-right font-bold text-amber-800">GESAMT</td>
                            <td className="px-3 py-3"></td>
                            <td className="px-3 py-3 text-right font-bold text-amber-900 text-lg">{totalPM.toFixed(1)} PM</td>
                            <td className="px-3 py-3 text-right font-bold text-amber-900 text-lg">{totalKosten.toLocaleString('de-DE')} EUR</td>
                          </tr>
                        );
                        return rows;
                      })()}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ========== TAB: FÖRDERUNG ========== */}
          {activeTab === 'foerderung' && (
            <div className="px-6 py-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold"> Fördermittel-Einstellungen</h2>
                {canEdit && !foerderEditMode && (
                  <button onClick={() => setFoerderEditMode(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Bearbeiten</button>
                )}
              </div>

              {foerderEditMode ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Förderprogramm</label>
                      <select value={foerderFormData.funding_program} onChange={(e) => setFoerderFormData({ ...foerderFormData, funding_program: e.target.value })} className="w-full border rounded-lg px-3 py-2">
                        <option value="">-- Kein Förderprogramm --</option>
                        <option value="ZIM">ZIM - Zentrales Innovationsprogramm Mittelstand</option>
                        <option value="FZul">FZul - Forschungszulage</option>
                        <option value="BAFA">BAFA - Bundesamt für Wirtschaft</option>
                        <option value="other">Sonstiges</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Förderkennzeichen</label>
                      <input type="text" value={foerderFormData.funding_reference} onChange={(e) => setFoerderFormData({ ...foerderFormData, funding_reference: e.target.value })} className="w-full border rounded-lg px-3 py-2" placeholder="z.B. 16KN123456" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Bewilligte Fördersumme (EUR)</label>
                      <input type="number" value={foerderFormData.funding_amount} onChange={(e) => setFoerderFormData({ ...foerderFormData, funding_amount: e.target.value })} className="w-full border rounded-lg px-3 py-2" step="0.01" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Fördersatz (%)</label>
                      <input type="number" value={foerderFormData.funding_rate} onChange={(e) => setFoerderFormData({ ...foerderFormData, funding_rate: e.target.value })} className="w-full border rounded-lg px-3 py-2" min="0" max="100" step="0.1" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Gemeinkostenpauschale (%)</label>
                      <input type="number" value={foerderFormData.overhead_rate} onChange={(e) => setFoerderFormData({ ...foerderFormData, overhead_rate: e.target.value })} className="w-full border rounded-lg px-3 py-2" min="0" step="0.1" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Zuwendungsbescheid vom</label>
                      <input type="date" value={foerderFormData.funding_approval_date} onChange={(e) => setFoerderFormData({ ...foerderFormData, funding_approval_date: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Bewilligungszeitraum von</label>
                      <input type="date" value={foerderFormData.funding_start_date} onChange={(e) => setFoerderFormData({ ...foerderFormData, funding_start_date: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Bewilligungszeitraum bis</label>
                      <input type="date" value={foerderFormData.funding_end_date} onChange={(e) => setFoerderFormData({ ...foerderFormData, funding_end_date: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
                    </div>
                  </div>
                  <div className="border-t pt-6">
                    <h3 className="text-md font-medium text-gray-900 mb-4">Projektleiter / Ansprechpartner</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                        <input type="text" value={foerderFormData.project_manager} onChange={(e) => setFoerderFormData({ ...foerderFormData, project_manager: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                        <input type="tel" value={foerderFormData.project_manager_phone} onChange={(e) => setFoerderFormData({ ...foerderFormData, project_manager_phone: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">E-Mail</label>
                        <input type="email" value={foerderFormData.project_manager_email} onChange={(e) => setFoerderFormData({ ...foerderFormData, project_manager_email: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
                      </div>
                    </div>
                  </div>
                  <div className="border-t pt-6">
                    <h3 className="text-md font-medium text-gray-900 mb-4"> Gesamtvorkalkulation (Kostenplan)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">1. Personalkosten (Nr. 5.3.1 a)</label>
                        <input type="number" value={foerderFormData.cost_plan?.personnel_costs_planned || ''} onChange={(e) => setFoerderFormData({ ...foerderFormData, cost_plan: { ...foerderFormData.cost_plan, personnel_costs_planned: e.target.value ? Number(e.target.value) : undefined } })} className="w-full border rounded-lg px-3 py-2" step="0.01" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">2. Übrige Kosten (Nr. 5.3.1 c)</label>
                        <input type="number" value={foerderFormData.cost_plan?.overhead_costs_planned || ''} onChange={(e) => setFoerderFormData({ ...foerderFormData, cost_plan: { ...foerderFormData.cost_plan, overhead_costs_planned: e.target.value ? Number(e.target.value) : undefined } })} className="w-full border rounded-lg px-3 py-2" step="0.01" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">3. Projektbez. Aufträge an Dritte (Nr. 5.3.1 b)</label>
                        <input type="number" value={foerderFormData.cost_plan?.third_party_costs_planned || ''} onChange={(e) => setFoerderFormData({ ...foerderFormData, cost_plan: { ...foerderFormData.cost_plan, third_party_costs_planned: e.target.value ? Number(e.target.value) : undefined } })} className="w-full border rounded-lg px-3 py-2" step="0.01" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">4. FuE-Aufträge (Nr. 5.3.1 b)</label>
                        <input type="number" value={foerderFormData.cost_plan?.fue_contracts_planned || ''} onChange={(e) => setFoerderFormData({ ...foerderFormData, cost_plan: { ...foerderFormData.cost_plan, fue_contracts_planned: e.target.value ? Number(e.target.value) : undefined } })} className="w-full border rounded-lg px-3 py-2" step="0.01" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">5. Zeitweilige Aufnahmen (Nr. 5.3.1 b)</label>
                        <input type="number" value={foerderFormData.cost_plan?.temp_personnel_planned || ''} onChange={(e) => setFoerderFormData({ ...foerderFormData, cost_plan: { ...foerderFormData.cost_plan, temp_personnel_planned: e.target.value ? Number(e.target.value) : undefined } })} className="w-full border rounded-lg px-3 py-2" step="0.01" />
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-4 pt-4 border-t">
                    <button onClick={() => setFoerderEditMode(false)} className="px-4 py-2 border border-gray-300 rounded-lg">Abbrechen</button>
                    <button onClick={handleSaveFoerderung} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400">{saving ? 'Speichern...' : 'Speichern'}</button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {project.funding_amount && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                      <div className="bg-blue-50 rounded-lg p-4"><div className="text-sm text-blue-600 font-medium">Bewilligt</div><div className="text-xl font-bold text-blue-900">{formatCurrency(fundingStatus.approved)}</div></div>
                      <div className="bg-green-50 rounded-lg p-4"><div className="text-sm text-green-600 font-medium">Ausgezahlt</div><div className="text-xl font-bold text-green-900">{formatCurrency(fundingStatus.paid)}</div></div>
                      <div className="bg-yellow-50 rounded-lg p-4"><div className="text-sm text-yellow-600 font-medium">In Prüfung</div><div className="text-xl font-bold text-yellow-900">{formatCurrency(fundingStatus.pending)}</div></div>
                      <div className="bg-gray-50 rounded-lg p-4"><div className="text-sm text-gray-600 font-medium">Verfügbar</div><div className="text-xl font-bold text-gray-900">{formatCurrency(fundingStatus.available)}</div></div>
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gray-50 rounded-lg p-4"><div className="text-sm text-gray-500">Förderprogramm</div><div className="font-medium">{getFundingProgramLabel(project.funding_program)}</div></div>
                    <div className="bg-gray-50 rounded-lg p-4"><div className="text-sm text-gray-500">Förderkennzeichen</div><div className="font-medium">{project.funding_reference || '-'}</div></div>
                    <div className="bg-gray-50 rounded-lg p-4"><div className="text-sm text-gray-500">Bewilligte Fördersumme</div><div className="font-medium">{formatCurrency(project.funding_amount)}</div></div>
                    <div className="bg-gray-50 rounded-lg p-4"><div className="text-sm text-gray-500">Fördersatz</div><div className="font-medium">{project.funding_rate ? `${project.funding_rate}%` : '-'}</div></div>
                    <div className="bg-gray-50 rounded-lg p-4"><div className="text-sm text-gray-500">Gemeinkostenpauschale</div><div className="font-medium">{project.overhead_rate ? `${project.overhead_rate}%` : '-'}</div></div>
                    <div className="bg-gray-50 rounded-lg p-4"><div className="text-sm text-gray-500">Zuwendungsbescheid vom</div><div className="font-medium">{formatDate(project.funding_approval_date)}</div></div>
                    <div className="bg-gray-50 rounded-lg p-4"><div className="text-sm text-gray-500">Bewilligungszeitraum</div><div className="font-medium">{project.funding_start_date && project.funding_end_date ? `${formatDate(project.funding_start_date)} - ${formatDate(project.funding_end_date)}` : '-'}</div></div>
                  </div>
                  {project.project_manager && (
                    <div className="border-t pt-6 mt-6">
                      <h3 className="text-md font-medium text-gray-900 mb-4">Projektleiter</h3>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="font-medium">{project.project_manager}</div>
                        {project.project_manager_phone && <div className="text-sm text-gray-600 mt-1"> {project.project_manager_phone}</div>}
                        {project.project_manager_email && <div className="text-sm text-gray-600">‰ï¸ {project.project_manager_email}</div>}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ========== TAB: ZAHLUNGSANFORDERUNGEN ========== */}
          {activeTab === 'zahlungsanforderungen' && (
            <div className="px-6 py-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold"> Zahlungsanforderungen</h2>
                {canEdit && project.funding_program && (
                  <button onClick={() => setShowZAModal(true)} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    Neue Zahlungsanforderung
                  </button>
                )}
              </div>

              {!project.funding_program && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                  <p className="text-yellow-800">ï¸ Bitte konfigurieren Sie zuerst die Förderdetails im Tab "Förderung".</p>
                </div>
              )}

              {project.funding_amount && (
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 mb-6">
                  <h3 className="font-medium text-gray-900 mb-4">Fördermittel-Status</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div><div className="text-sm text-gray-500">Bewilligt</div><div className="text-lg font-bold text-blue-600">{formatCurrency(fundingStatus.approved)}</div></div>
                    <div><div className="text-sm text-gray-500">Ausgezahlt</div><div className="text-lg font-bold text-green-600">{formatCurrency(fundingStatus.paid)}</div></div>
                    <div><div className="text-sm text-gray-500">In Prüfung</div><div className="text-lg font-bold text-yellow-600">{formatCurrency(fundingStatus.pending)}</div></div>
                    <div><div className="text-sm text-gray-500">Verfügbar</div><div className="text-lg font-bold text-gray-900">{formatCurrency(fundingStatus.available)}</div></div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div className="flex h-3 rounded-full overflow-hidden">
                      <div className="bg-green-500" style={{ width: `${(fundingStatus.paid / fundingStatus.approved) * 100}%` }} />
                      <div className="bg-yellow-400" style={{ width: `${(fundingStatus.pending / fundingStatus.approved) * 100}%` }} />
                    </div>
                  </div>
                </div>
              )}

              {paymentRequests.length === 0 ? (
                <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg">
                  <p className="text-lg">Noch keine Zahlungsanforderungen</p>
                  <p className="text-sm mt-2">Erstellen Sie eine neue ZA basierend auf erfassten Zeiten.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nr.</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Zeitraum</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Stunden</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Personalkosten</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Angefordert</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ausgezahlt</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Aktionen</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {paymentRequests.map((pr) => (
                        <tr key={pr.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedZaId(pr.id)}>
                          <td className="px-4 py-3 font-medium text-gray-900">ZA-{pr.request_number}</td>
                          <td className="px-4 py-3 text-gray-600">{formatDate(pr.period_start)} - {formatDate(pr.period_end)}</td>
                          <td className="px-4 py-3 text-right text-gray-600">{pr.personnel_hours?.toFixed(1)}h</td>
                          <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(pr.personnel_costs)}</td>
                          <td className="px-4 py-3 text-right font-medium text-gray-900">{formatCurrency(pr.requested_amount)}</td>
                          <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs font-medium ${getZAStatusColor(pr.status)}`}>{getZAStatusLabel(pr.status)}</span></td>
                          <td className="px-4 py-3 text-right text-green-600 font-medium">{pr.paid_amount ? formatCurrency(pr.paid_amount) : '-'}</td>
                          <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-end space-x-2">
                              <button onClick={() => setSelectedZaId(pr.id)} className="text-blue-600 hover:text-blue-800 p-1" title="Details">ï¸</button>
                              {pr.status === 'draft' && canEdit && (
                                <button onClick={() => handleDeleteZA(pr.id)} className="text-red-600 hover:text-red-800 p-1" title="Löschen"></button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* ========== MODALS ========== */}

      {/* AP Modal */}
      {showAPModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">{editingAP ? 'Arbeitspaket bearbeiten' : 'Neues Arbeitspaket'}</h3>
            <div className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">AP-Nummer *</label><input type="text" value={apForm.code} onChange={(e) => setApForm({ ...apForm, code: e.target.value })} placeholder="z.B. AP1.1" className="w-full border rounded-lg px-3 py-2" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Beschreibung *</label><textarea rows={2} value={apForm.description} onChange={(e) => setApForm({ ...apForm, description: e.target.value })} className="w-full border rounded-lg px-3 py-2" /></div>
              <div className="grid grid-cols-3 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Geplante Stunden</label><input type="number" value={apForm.estimated_hours} onChange={(e) => setApForm({ ...apForm, estimated_hours: e.target.value })} className="w-full border rounded-lg px-3 py-2" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Startdatum</label><input type="date" value={apForm.start_date} onChange={(e) => setApForm({ ...apForm, start_date: e.target.value })} className="w-full border rounded-lg px-3 py-2" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Enddatum</label><input type="date" value={apForm.end_date} onChange={(e) => setApForm({ ...apForm, end_date: e.target.value })} className="w-full border rounded-lg px-3 py-2" /></div>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button onClick={() => setShowAPModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Abbrechen</button>
              <button onClick={handleSaveAP} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400">{saving ? 'Speichert...' : (editingAP ? 'Aktualisieren' : 'Erstellen')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Zuordnung Modal */}
      {showAssignModal && selectedAPForAssign && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Mitarbeiter zuordnen</h3>
            <p className="text-sm text-gray-500 mb-4">{selectedAPForAssign.code} - {selectedAPForAssign.description}</p>
            
            {/* Nur Projekt-MA anzeigen */}
            {companyEmployees.filter(emp => emp.project_employee_number).length === 0 ? (
              <div className="text-center py-8 bg-yellow-50 rounded-lg">
                <p className="text-yellow-800 font-medium">Keine Projektmitarbeiter vorhanden</p>
                <p className="text-sm text-yellow-700 mt-1">Bitte zuerst im Tab "Projektmitarbeiter" Mitarbeiter dem Projekt zuordnen.</p>
              </div>
            ) : (
              <>
                <div className="mb-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-800"><strong> Hinweis:</strong> 1 PM = Wochenstunden × 52 / 12</div>
                <div className="space-y-3">
                  {companyEmployees
                    .filter(emp => emp.project_employee_number)
                    .sort((a, b) => (a.project_employee_number || 99) - (b.project_employee_number || 99))
                    .map((emp) => {
                      const weeklyHours = emp.weekly_hours_contract || 40;
                      const hoursPerPM = (weeklyHours * 52) / 12;
                      const pmValue = parseFloat(assignments[emp.id]?.pm || '0') || 0;
                      const calculatedHours = pmValue * hoursPerPM;
                      return (
                        <div key={emp.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center flex-1">
                            <input type="checkbox" checked={assignments[emp.id]?.selected || false} onChange={(e) => setAssignments({ ...assignments, [emp.id]: { ...assignments[emp.id], selected: e.target.checked } })} className="w-5 h-5 text-blue-600 rounded mr-3" />
                            <span className="inline-flex items-center justify-center w-7 h-7 bg-blue-600 text-white rounded-full font-bold text-sm mr-3">{emp.project_employee_number}</span>
                            <div><div className="font-medium text-gray-900">{emp.name}</div><div className="text-xs text-gray-500">{weeklyHours}h/Woche ¢ Qual. {emp.qualification_group || 'A'}</div></div>
                          </div>
                          {assignments[emp.id]?.selected && (
                            <div className="flex items-center space-x-2 ml-4">
                              <input type="number" step="0.25" min="0" value={assignments[emp.id]?.pm || ''} onChange={(e) => setAssignments({ ...assignments, [emp.id]: { ...assignments[emp.id], pm: e.target.value } })} className="w-16 border rounded px-2 py-1 text-sm text-right" placeholder="0" />
                              <span className="text-sm text-gray-600">PM</span>
                              <span className="text-sm text-gray-400">=</span>
                              <span className="text-sm font-medium text-blue-700 w-16 text-right">{calculatedHours.toFixed(0)} h</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </>
            )}
            <div className="flex justify-end space-x-3 mt-6">
              <button onClick={() => setShowAssignModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Abbrechen</button>
              <button onClick={handleSaveAssignments} disabled={saving || companyEmployees.filter(emp => emp.project_employee_number).length === 0} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400">{saving ? 'Speichert...' : 'Zuordnungen speichern'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete All AP Confirm Modal */}
      {showDeleteAllAPModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Alle Arbeitspakete löschen?</h3>
                <p className="text-sm text-gray-600">Diese Aktion kann nicht rückgängig gemacht werden</p>
              </div>
            </div>

            <div className="mb-6 p-4 bg-red-50 rounded-lg">
              <p className="text-sm text-red-800">
                <strong>{workPackages.length} Arbeitspakete</strong> werden unwiderruflich gelöscht, 
                inklusive aller Mitarbeiter-Zuordnungen.
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeleteAllAPModal(false)}
                disabled={deletingAllAP}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
              >
                Abbrechen
              </button>
              <button
                onClick={async () => {
                  setDeletingAllAP(true);
                  try {
                    // Alle APs des Projekts löschen
                    const { error } = await supabase
                      .from('work_packages')
                      .delete()
                      .eq('project_id', project!.id);
                    
                    if (error) throw error;
                    
                    setSuccess(`${workPackages.length} Arbeitspakete gelöscht`);
                    setShowDeleteAllAPModal(false);
                    loadWorkPackages(project!.id);
                  } catch (err: any) {
                    setError(`Fehler beim Löschen: ${err.message}`);
                  } finally {
                    setDeletingAllAP(false);
                  }
                }}
                disabled={deletingAllAP}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium disabled:bg-gray-400"
              >
                {deletingAllAP ? 'Wird gelöscht...' : 'Alle löschen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Excel Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900">Arbeitspakete aus Excel importieren</h3>
              <button onClick={() => { setShowImportModal(false); setImportFile(null); setImportPreview([]); }} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
            </div>
            <div className="p-6">
              {/* Datei-Upload */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Excel-Datei auswählen</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setImportFile(file);
                        setImportPreview([]);
                        // Vorschau laden
                        const formData = new FormData();
                        formData.append('file', file);
                        formData.append('projectId', project?.id || '');
                        formData.append('previewOnly', 'true');
                        try {
                          const res = await fetch('/api/work-packages/import', { method: 'POST', body: formData });
                          const data = await res.json();
                          if (data.success && data.workPackages) {
                            setImportPreview(data.workPackages);
                          } else {
                            setError(data.error || 'Fehler beim Lesen der Datei');
                          }
                        } catch (err) {
                          setError('Fehler beim Lesen der Datei');
                        }
                      }
                    }}
                    className="hidden"
                    id="excel-upload"
                  />
                  <label htmlFor="excel-upload" className="cursor-pointer">
                    <svg className="w-12 h-12 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    {importFile ? (
                      <p className="text-blue-600 font-medium">{importFile.name}</p>
                    ) : (
                      <p className="text-gray-600">Klicken zum Auswählen oder Datei hierher ziehen</p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">Excel-Dateien (.xlsx, .xls)</p>
                  </label>
                </div>
              </div>

              {/* Format-Hinweis */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h4 className="font-medium text-gray-900 mb-2">Erwartetes Format:</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>¢ <strong>Spalte A:</strong> Nr. (z.B. 1, 2, 3.1, 3.1.1)</p>
                  <p>¢ <strong>Spalte B:</strong> Arbeitspaket-Beschreibung</p>
                  <p>¢ <strong>Spalte C:</strong> Startdatum (von)</p>
                  <p>¢ <strong>Spalte D:</strong> Enddatum (bis)</p>
                  <p className="text-xs text-gray-500 mt-2">Header in Zeile 2-3, Daten ab Zeile 4</p>
                </div>
              </div>

              {/* Vorschau */}
              {importPreview.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-medium text-gray-900 mb-3">Vorschau ({importPreview.length} Arbeitspakete)</h4>
                  <div className="max-h-64 overflow-y-auto border rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Nr.</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Beschreibung</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Von</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Bis</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {importPreview.map((wp, idx) => (
                          <tr key={idx} className={!wp.start_date ? 'bg-yellow-50' : ''}>
                            <td className="px-3 py-2 text-sm font-mono font-bold text-blue-600">{wp.code}</td>
                            <td className="px-3 py-2 text-sm text-gray-900">{wp.description}</td>
                            <td className="px-3 py-2 text-sm text-gray-600">{wp.start_date ? new Date(wp.start_date).toLocaleDateString('de-DE') : '-'}</td>
                            <td className="px-3 py-2 text-sm text-gray-600">{wp.end_date ? new Date(wp.end_date).toLocaleDateString('de-DE') : '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    <span className="inline-block w-3 h-3 bg-yellow-50 border mr-1"></span>
                    Gelb = Übergeordnetes AP ohne eigene Zeitplanung
                  </p>
                </div>
              )}

              {/* Buttons */}
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => { setShowImportModal(false); setImportFile(null); setImportPreview([]); }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Abbrechen
                </button>
                <button
                  onClick={async () => {
                    if (!importFile || importPreview.length === 0) return;
                    setImporting(true);
                    const formData = new FormData();
                    formData.append('file', importFile);
                    formData.append('projectId', project?.id || '');
                    formData.append('previewOnly', 'false');
                    try {
                      const res = await fetch('/api/work-packages/import', { method: 'POST', body: formData });
                      const data = await res.json();
                      if (data.success) {
                        setSuccess(`${data.imported} Arbeitspakete importiert${data.skipped > 0 ? `, ${data.skipped} übersprungen (existieren bereits)` : ''}`);
                        setShowImportModal(false);
                        setImportFile(null);
                        setImportPreview([]);
                        loadWorkPackages(project!.id);
                      } else {
                        setError(data.error || 'Import fehlgeschlagen');
                      }
                    } catch (err) {
                      setError('Fehler beim Import');
                    } finally {
                      setImporting(false);
                    }
                  }}
                  disabled={!importFile || importPreview.length === 0 || importing}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center"
                >
                  {importing ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Importiere...
                    </>
                  ) : (
                    `${importPreview.length} Arbeitspakete importieren`
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ZA Erstellung Modal */}
      {showZAModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900">Neue Zahlungsanforderung erstellen</h3>
              <button onClick={() => { setShowZAModal(false); setZaFormData({ period_start: '', period_end: '' }); setZaCalculation(null); }} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
            </div>
            <div className="p-6">
              <div className="bg-blue-50 rounded-lg p-4 mb-6">
                <h4 className="font-medium text-blue-900 mb-4">Abrechnungszeitraum</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Von</label><input type="date" value={zaFormData.period_start} onChange={(e) => setZaFormData({ ...zaFormData, period_start: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Bis</label><input type="date" value={zaFormData.period_end} onChange={(e) => setZaFormData({ ...zaFormData, period_end: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
                </div>
                <button onClick={handleCalculateZA} disabled={zaCalculating || !zaFormData.period_start || !zaFormData.period_end} className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:bg-gray-400">
                  {zaCalculating ? ' Berechne...' : ' Kosten berechnen'}
                </button>
              </div>

              {zaCalculation && (
                <>
                  <div className="mb-6">
                    <h4 className="font-medium text-gray-900 mb-3"> Anlage 1a - Personenstunden</h4>
                    <div className="overflow-x-auto border rounded-lg">
                      <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium text-gray-500">Nr.</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-500">Mitarbeiter</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-500">Gruppe</th>
                            {zaCalculation.items.length > 0 && Object.keys(zaCalculation.items[0].hours_by_month).sort().map(month => (
                              <th key={month} className="px-3 py-2 text-right font-medium text-gray-500">{new Date(month + '-01').toLocaleDateString('de-DE', { month: 'short', year: '2-digit' })}</th>
                            ))}
                            <th className="px-3 py-2 text-right font-medium text-gray-900 bg-gray-100">Sum Stunden</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {zaCalculation.items.map((item, idx) => (
                            <tr key={item.user_profile_id}>
                              <td className="px-3 py-2">{item.employee_number || idx + 1}</td>
                              <td className="px-3 py-2">{item.employee_name}</td>
                              <td className="px-3 py-2"><span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">{item.qualification_group}</span></td>
                              {Object.keys(item.hours_by_month).sort().map(month => (
                                <td key={month} className="px-3 py-2 text-right text-gray-600">{item.hours_by_month[month].toFixed(1)}</td>
                              ))}
                              <td className="px-3 py-2 text-right font-medium bg-gray-50">{item.total_hours.toFixed(1)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-gray-100">
                          <tr>
                            <td colSpan={3} className="px-3 py-2 font-medium">Gesamt</td>
                            {zaCalculation.items.length > 0 && Object.keys(zaCalculation.items[0].hours_by_month).sort().map(month => {
                              const monthTotal = zaCalculation.items.reduce((sum, item) => sum + (item.hours_by_month[month] || 0), 0);
                              return <td key={month} className="px-3 py-2 text-right font-medium">{monthTotal.toFixed(1)}</td>;
                            })}
                            <td className="px-3 py-2 text-right font-bold">{zaCalculation.totals.personnel_hours.toFixed(1)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>

                  <div className="mb-6">
                    <h4 className="font-medium text-gray-900 mb-3"> Anlage 1b - Personalkosten</h4>
                    <div className="overflow-x-auto border rounded-lg">
                      <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium text-gray-500">Nr.</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-500">Mitarbeiter</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-500">Gruppe</th>
                            <th className="px-3 py-2 text-right font-medium text-gray-500">Stunden</th>
                            <th className="px-3 py-2 text-right font-medium text-gray-500">Stundensatz</th>
                            <th className="px-3 py-2 text-right font-medium text-gray-900 bg-gray-100">Personalkosten</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {zaCalculation.items.map((item, idx) => (
                            <tr key={item.user_profile_id}>
                              <td className="px-3 py-2">{item.employee_number || idx + 1}</td>
                              <td className="px-3 py-2">{item.employee_name}</td>
                              <td className="px-3 py-2"><span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">{item.qualification_group}</span></td>
                              <td className="px-3 py-2 text-right">{item.total_hours.toFixed(1)}</td>
                              <td className="px-3 py-2 text-right">{formatCurrency(item.hourly_rate)}</td>
                              <td className="px-3 py-2 text-right font-medium bg-gray-50">{formatCurrency(item.total_costs)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-gray-100">
                          <tr>
                            <td colSpan={3} className="px-3 py-2 font-medium">Gesamt</td>
                            <td className="px-3 py-2 text-right font-medium">{zaCalculation.totals.personnel_hours.toFixed(1)}h</td>
                            <td></td>
                            <td className="px-3 py-2 text-right font-bold">{formatCurrency(zaCalculation.totals.personnel_costs)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-6">
                    <h4 className="font-medium text-gray-900 mb-4"> Zusammenfassung</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between"><span className="text-gray-600">Personalkosten</span><span className="font-medium">{formatCurrency(zaCalculation.totals.personnel_costs)}</span></div>
                      {(project.overhead_rate || 0) > 0 && <div className="flex justify-between"><span className="text-gray-600">+ Gemeinkostenzuschlag ({project.overhead_rate}%)</span><span className="font-medium">{formatCurrency(zaCalculation.totals.overhead_costs)}</span></div>}
                      <div className="flex justify-between border-t pt-2"><span className="font-medium text-gray-900">= Zuwendungsfähige Kosten</span><span className="font-bold text-gray-900">{formatCurrency(zaCalculation.totals.total_eligible_costs)}</span></div>
                      <div className="flex justify-between text-sm text-gray-500"><span>× Fördersatz ({project.funding_rate || 50}%)</span></div>
                      <div className="flex justify-between text-lg border-t pt-2"><span className="font-bold text-green-700">= Angeforderte Zuwendung</span><span className="font-bold text-green-700 text-xl">{formatCurrency(zaCalculation.totals.requested_amount)}</span></div>
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex justify-end space-x-3">
              <button onClick={() => { setShowZAModal(false); setZaFormData({ period_start: '', period_end: '' }); setZaCalculation(null); }} className="px-4 py-2 border border-gray-300 rounded-lg">Abbrechen</button>
              {zaCalculation && (
                <>
                  <button onClick={() => handleSaveZA(true)} disabled={saving} className="px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50">Als Entwurf speichern</button>
                  <button onClick={() => handleSaveZA(false)} disabled={saving} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:bg-gray-400">{saving ? 'Speichern...' : 'Speichern & Berechnen'}</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ZA Detail Modal */}
      {selectedZaId && (
        <ZADetailModal zaId={selectedZaId} supabase={supabase} onClose={() => setSelectedZaId(null)} onUpdate={loadData} canEdit={canEdit} formatCurrency={formatCurrency} formatDate={formatDate} />
      )}

    </div>
  );
}

// ============================================
// ZA DETAIL MODAL COMPONENT
// ============================================

interface ZADetailModalProps {
  zaId: string;
  supabase: any;
  onClose: () => void;
  onUpdate: () => void;
  canEdit: boolean;
  formatCurrency: (amount: number | null | undefined) => string;
  formatDate: (dateStr: string | null | undefined) => string;
}

function ZADetailModal({ zaId, supabase, onClose, onUpdate, canEdit, formatCurrency, formatDate }: ZADetailModalProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [za, setZa] = useState<any>(null);
  const [months, setMonths] = useState<string[]>([]);

  useEffect(() => { loadZA(); }, [zaId]);

  const loadZA = async () => {
    try {
      setLoading(true);
      const { data: zaData } = await supabase.from('payment_requests').select(`*, project:projects (name, funding_reference, funding_rate, overhead_rate)`).eq('id', zaId).single();
      const { data: items } = await supabase.from('payment_request_items').select('*').eq('payment_request_id', zaId).order('employee_number');
      const fullZa = { ...zaData, items: items || [] };
      setZa(fullZa);
      const allMonths = new Set<string>();
      (items || []).forEach((item: any) => Object.keys(item.hours_by_month || {}).forEach(m => allMonths.add(m)));
      setMonths(Array.from(allMonths).sort());
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };

  const getZAStatusConfig = (status: string) => {
    const configs: Record<string, { color: string; label: string; next: string[] }> = {
      draft: { color: 'bg-gray-100 text-gray-800', label: ' Entwurf', next: ['submitted'] },
      calculated: { color: 'bg-blue-100 text-blue-800', label: ' Berechnet', next: ['submitted'] },
      submitted: { color: 'bg-yellow-100 text-yellow-800', label: ' Eingereicht', next: ['draft', 'in_review', 'approved'] },
      in_review: { color: 'bg-orange-100 text-orange-800', label: '³ In Prüfung', next: ['draft', 'approved', 'rejected'] },
      approved: { color: 'bg-green-100 text-green-800', label: '… Bewilligt', next: ['paid'] },
      paid: { color: 'bg-emerald-100 text-emerald-800', label: ' Ausgezahlt', next: [] },
      rejected: { color: 'bg-red-100 text-red-800', label: 'Œ Abgelehnt', next: ['draft'] },
      partial: { color: 'bg-purple-100 text-purple-800', label: ' Teilweise', next: ['paid'] },
    };
    return configs[status] || configs.draft;
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!za) return;
    setSaving(true);
    try {
      const updates: any = { status: newStatus, updated_at: new Date().toISOString() };
      if (newStatus === 'draft') { updates.submitted_at = null; updates.approved_at = null; updates.paid_at = null; }
      if (newStatus === 'submitted') updates.submitted_at = new Date().toISOString();
      if (newStatus === 'approved') { updates.approved_at = new Date().toISOString(); updates.approved_amount = za.requested_amount; }
      if (newStatus === 'paid') { updates.paid_at = new Date().toISOString(); updates.paid_amount = za.approved_amount || za.requested_amount; }
      await supabase.from('payment_requests').update(updates).eq('id', za.id);
      setSuccess(`Status geändert`);
      loadZA();
      onUpdate();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) { setError(err.message); } finally { setSaving(false); }
  };

  if (loading) return <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"><div className="bg-white rounded-lg p-8 text-center"><p>Lade Details...</p></div></div>;
  if (!za) return <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"><div className="bg-white rounded-lg p-8"><p className="text-red-600">ZA nicht gefunden</p><button onClick={onClose} className="mt-4 px-4 py-2 bg-gray-200 rounded-lg">Schließen</button></div></div>;

  const statusConfig = getZAStatusConfig(za.status);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">Zahlungsanforderung Nr. {za.request_number}</h2>
            <p className="text-blue-100 text-sm">{za.project?.name} ¢ {za.project?.funding_reference}</p>
          </div>
          <button onClick={onClose} className="text-white hover:text-blue-200 text-2xl">×</button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}
          {success && <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">{success}</div>}

          <div className="bg-gray-50 rounded-lg p-4 mb-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <span className={`px-4 py-2 rounded-full text-lg font-medium ${statusConfig.color}`}>{statusConfig.label}</span>
              <div className="text-sm text-gray-500">
                {za.submitted_at && <div>Eingereicht: {formatDate(za.submitted_at)}</div>}
                {za.approved_at && <div>Bewilligt: {formatDate(za.approved_at)}</div>}
                {za.paid_at && <div>Ausgezahlt: {formatDate(za.paid_at)}</div>}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {canEdit && statusConfig.next.length > 0 && statusConfig.next.map(action => {
                const actionConfig = getZAStatusConfig(action);
                return (
                  <button key={action} onClick={() => handleStatusChange(action)} disabled={saving}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium ${action === 'rejected' ? 'bg-red-100 text-red-700' : action === 'paid' ? 'bg-green-600 text-white' : action === 'draft' ? 'bg-gray-200 text-gray-700' : 'bg-blue-100 text-blue-700'}`}>
                    {action === 'draft' ? ' Zurück zu ' : '-> '}{actionConfig.label.replace(/[³…Œ]/, '').trim()}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4"><div className="text-sm text-blue-600">Zeitraum</div><div className="font-medium text-blue-900">{formatDate(za.period_start)} - {formatDate(za.period_end)}</div></div>
            <div className="bg-purple-50 rounded-lg p-4"><div className="text-sm text-purple-600">Stunden</div><div className="font-bold text-xl text-purple-900">{za.personnel_hours?.toFixed(1)}h</div></div>
            <div className="bg-amber-50 rounded-lg p-4"><div className="text-sm text-amber-600">Personalkosten</div><div className="font-bold text-xl text-amber-900">{formatCurrency(za.personnel_costs)}</div></div>
            <div className="bg-green-50 rounded-lg p-4"><div className="text-sm text-green-600">Angefordert</div><div className="font-bold text-xl text-green-900">{formatCurrency(za.requested_amount)}</div></div>
          </div>

          <div className="mb-6">
            <h3 className="font-medium text-gray-900 mb-3"> Anlage 1a - Stunden</h3>
            <div className="overflow-x-auto border rounded-lg">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-500">Nr.</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500">Mitarbeiter</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500">Gruppe</th>
                    {months.map(month => <th key={month} className="px-3 py-2 text-right font-medium text-gray-500">{new Date(month + '-01').toLocaleDateString('de-DE', { month: 'short', year: '2-digit' })}</th>)}
                    <th className="px-3 py-2 text-right font-medium text-gray-900 bg-gray-100">Sum</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {(za.items || []).map((item: any, idx: number) => (
                    <tr key={idx}><td className="px-3 py-2 font-medium">{item.employee_number || idx + 1}</td><td className="px-3 py-2">{item.employee_name}</td><td className="px-3 py-2"><span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">{item.qualification_group}</span></td>
                      {months.map(month => <td key={month} className="px-3 py-2 text-right text-gray-600">{(item.hours_by_month?.[month] || 0).toFixed(1)}</td>)}
                      <td className="px-3 py-2 text-right font-medium bg-gray-50">{item.total_hours.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-100"><tr><td colSpan={3} className="px-3 py-2 font-medium">Gesamt</td>{months.map(month => { const total = (za.items || []).reduce((sum: number, item: any) => sum + (item.hours_by_month?.[month] || 0), 0); return <td key={month} className="px-3 py-2 text-right font-medium">{total.toFixed(1)}</td>; })}<td className="px-3 py-2 text-right font-bold">{za.personnel_hours?.toFixed(1)}h</td></tr></tfoot>
              </table>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-6">
              <h4 className="font-medium text-gray-900 mb-4"> Kostenübersicht</h4>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span>Personalkosten</span><span className="font-medium">{formatCurrency(za.personnel_costs)}</span></div>
                {za.overhead_costs > 0 && <div className="flex justify-between text-gray-600"><span>+ Gemeinkostenzuschlag</span><span>{formatCurrency(za.overhead_costs)}</span></div>}
                <div className="border-t pt-2 flex justify-between font-medium"><span>= Zuwendungsfähige Kosten</span><span>{formatCurrency(za.total_eligible_costs)}</span></div>
                <div className="flex justify-between text-gray-500"><span>× Fördersatz ({za.funding_rate_applied}%)</span></div>
                <div className="border-t pt-2 flex justify-between text-lg"><span className="font-bold text-green-700">= Angeforderte Zuwendung</span><span className="font-bold text-green-700">{formatCurrency(za.requested_amount)}</span></div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-6">
              <h4 className="font-medium text-gray-900 mb-4"> Bewilligung & Auszahlung</h4>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span>Bewilligter Betrag</span><span className="font-medium">{formatCurrency(za.approved_amount)}</span></div>
                <div className="flex justify-between"><span>Ausgezahlter Betrag</span><span className="font-bold text-green-700">{formatCurrency(za.paid_amount)}</span></div>
              </div>
            </div>
          </div>
        </div>
        <div className="border-t px-6 py-4 bg-gray-50 flex justify-end space-x-3">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100">Schließen</button>
        </div>
      </div>
    </div>
  );
}