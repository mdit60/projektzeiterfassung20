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
    draft: 'Entwurf',
    calculated: 'Berechnet',
    submitted: 'Eingereicht',
    in_review: 'In Prüfung',
    approved: 'Bewilligt',
    paid: 'Ausgezahlt',
    rejected: 'Abgelehnt',
    partial: 'Teilweise',
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

  // Forms
  const [apForm, setApForm] = useState({
    code: '',
    description: '',
    category: 'project_work',
    estimated_hours: '',
    start_date: '',
    end_date: ''
  });

  const [assignments, setAssignments] = useState<{[key: string]: { selected: boolean; pm: string }}>({});

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

      await loadWorkPackages(resolvedParams.id);

      const { data: projectAssignData } = await supabase
        .from('project_assignments')
        .select('id, user_profile_id, project_employee_number')
        .eq('project_id', resolvedParams.id)
        .order('project_employee_number');

      setProjectAssignments(projectAssignData || []);

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

      await loadAnlage62Data(resolvedParams.id);

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
      const { data: nextNumData } = await supabase
        .rpc('get_next_za_number', { p_project_id: project.id });
      
      const requestNumber = nextNumData || 1;

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
    return <span className={`px-3 py-1.5 rounded-full text-base font-medium ${badge.color}`}>{badge.text}</span>;
  };

  // ============================================
  // COMPUTED VALUES
  // ============================================

  const isAdmin = profile?.role === 'admin';
  const isManager = false;
  const canEdit = isAdmin || isManager;

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
          <div className="text-xl font-medium text-gray-900 mb-2">Laden...</div>
          <div className="text-base text-gray-600">Projekt wird geladen</div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="text-xl font-medium text-red-600 mb-2">Projekt nicht gefunden</div>
          <button
            onClick={() => router.push('/projekte')}
            className="text-blue-600 hover:text-blue-800 text-lg"
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
      {/* ============================================ */}
      {/* STICKY HEADER - bleibt beim Scrollen oben */}
      {/* ============================================ */}
      <div className="sticky top-0 z-40 bg-gray-50">
        {/* Navigation */}
        <nav className="bg-white shadow-sm border-b">
          <div className="max-w-[1800px] mx-auto px-6 lg:px-8">
            <div className="flex justify-between h-14">
              <div className="flex items-center">
                <button
                  onClick={() => router.push('/projekte')}
                  className="flex items-center text-gray-600 hover:text-gray-900 text-base"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Zurück zu Projekte
                </button>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-base text-gray-600">{profile?.name}</span>
              </div>
            </div>
          </div>
        </nav>

        {/* Projekt-Header - Kompakt */}
        <div className="bg-white border-b shadow-sm">
          <div className="max-w-[1800px] mx-auto px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center text-white text-xl font-bold"
                  style={{ backgroundColor: project.color }}
                >
                  {project.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center space-x-3">
                    <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
                    {project.funding_reference && (
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded text-sm font-medium">
                        {project.funding_reference}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                    {project.start_date && <span>Start: {formatDate(project.start_date)}</span>}
                    {project.end_date && <span>Ende: {formatDate(project.end_date)}</span>}
                    {project.client_name && <span>Kunde: {project.client_name}</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                {getStatusBadge(project.status)}
                {canEdit && !editMode && (
                  <>
                    <button
                      onClick={() => setEditMode(true)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
                    >
                      ✏️ Bearbeiten
                    </button>
                    <button
                      onClick={handleDeleteProject}
                      disabled={saving}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium transition-colors"
                    >
                      🗑️ Löschen
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tab-Navigation - Sticky */}
        <div className="bg-white border-b">
          <div className="max-w-[1800px] mx-auto px-6 lg:px-8 py-3">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setActiveTab('arbeitspakete')}
                className={`px-4 py-2 font-medium rounded-lg transition-colors text-sm ${
                  activeTab === 'arbeitspakete'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                📦 Arbeitspakete ({workPackages.length})
              </button>
              <button
                onClick={() => setActiveTab('projektmitarbeiter')}
                className={`px-4 py-2 font-medium rounded-lg transition-colors text-sm ${
                  activeTab === 'projektmitarbeiter'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                👥 Projektmitarbeiter ({projectAssignments.length})
              </button>
              <button
                onClick={() => setActiveTab('anlage5')}
                className={`px-4 py-2 font-medium rounded-lg transition-colors text-sm ${
                  activeTab === 'anlage5'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                📋 Anlage 5
              </button>
              <button
                onClick={() => setActiveTab('anlage62')}
                className={`px-4 py-2 font-medium rounded-lg transition-colors text-sm ${
                  activeTab === 'anlage62'
                    ? 'bg-amber-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                📊 Anlage 6.2
              </button>
              <button
                onClick={() => setActiveTab('foerderung')}
                className={`px-4 py-2 font-medium rounded-lg transition-colors text-sm ${
                  activeTab === 'foerderung'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                💰 Förderung
              </button>
              <button
                onClick={() => setActiveTab('zahlungsanforderungen')}
                className={`px-4 py-2 font-medium rounded-lg transition-colors text-sm ${
                  activeTab === 'zahlungsanforderungen'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                💳 Zahlungsanforderungen ({paymentRequests.length})
              </button>
            </div>
          </div>
        </div>

        {/* Sticky Spaltenüberschriften für Arbeitspakete */}
        {activeTab === 'arbeitspakete' && workPackages.length > 0 && (
          <div className="bg-white border-b shadow-sm">
            <div className="max-w-[1800px] mx-auto px-6 lg:px-8">
              {/* Header mit Buttons */}
              <div className="flex justify-between items-center py-3 border-b">
                <h3 className="text-lg font-semibold text-gray-900">Arbeitspakete</h3>
                {canEdit && (
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => setShowDeleteAllAPModal(true)} 
                      className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 flex items-center text-sm font-medium transition-colors"
                    >
                      🗑️ Alle löschen
                    </button>
                    <button 
                      onClick={() => setShowImportModal(true)} 
                      className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center text-sm font-medium transition-colors"
                    >
                      📥 Excel-Import
                    </button>
                    <button 
                      onClick={() => openAPModal()} 
                      className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center text-sm font-medium transition-colors"
                    >
                      + Neues Arbeitspaket
                    </button>
                  </div>
                )}
              </div>
              {/* Spaltenüberschriften */}
              <div className="flex items-center py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                <div className="w-20 flex-shrink-0">AP-Nr</div>
                <div className="flex-1 min-w-0">Beschreibung</div>
                <div className="w-44 flex-shrink-0">Zeitraum</div>
                <div className="w-40 flex-shrink-0">Mitarbeiter</div>
                <div className="w-24 flex-shrink-0 text-right">PM</div>
                <div className="w-24 flex-shrink-0 text-right">Stunden</div>
                {canEdit && <div className="w-20 flex-shrink-0 text-center">Aktionen</div>}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ============================================ */}
      {/* MAIN CONTENT - Scrollbar */}
      {/* ============================================ */}
      <div className={`max-w-[1800px] mx-auto px-6 lg:px-8 py-6 ${activeTab === 'arbeitspakete' && workPackages.length > 0 ? 'pb-28' : ''}`}>
        {/* Messages */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-base">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center text-base">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {success}
          </div>
        )}

        {/* TAB CONTENT */}
        <div className="bg-white rounded-xl shadow">

          {/* ========== TAB: ARBEITSPAKETE ========== */}
          {activeTab === 'arbeitspakete' && (
            <div className="p-6">
              {loadingPackages ? (
                <div className="text-center py-12 text-gray-500 text-lg">Arbeitspakete werden geladen...</div>
              ) : workPackages.length === 0 ? (
                <>
                  {/* Header mit Buttons NUR wenn keine Arbeitspakete */}
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Arbeitspakete</h3>
                    {canEdit && (
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => setShowImportModal(true)} 
                          className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center text-sm font-medium transition-colors"
                        >
                          📥 Excel-Import
                        </button>
                        <button 
                          onClick={() => openAPModal()} 
                          className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center text-sm font-medium transition-colors"
                        >
                          + Neues Arbeitspaket
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="text-center py-16">
                    <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    <p className="text-gray-500 font-medium text-lg">Keine Arbeitspakete vorhanden</p>
                    <p className="text-gray-400 mt-2">Nutzen Sie die Buttons oben um Arbeitspakete anzulegen</p>
                  </div>
                </>
              ) : (
                <>
                  {/* Zeilen - Header ist im Sticky-Bereich */}
                  <div className="divide-y divide-gray-200">
                    {workPackages.map((wp) => (
                      <div key={wp.id} className="py-4 hover:bg-gray-50 -mx-6 px-6">
                        {/* Erste Zeile mit AP-Daten */}
                        <div className="flex items-start">
                          <div className="w-20 flex-shrink-0">
                            <span className="font-mono font-bold text-blue-600 text-base">{wp.code}</span>
                          </div>
                          <div className="flex-1 min-w-0 pr-4">
                            <div className="text-sm text-gray-900">{wp.description}</div>
                          </div>
                          <div className="w-44 flex-shrink-0 text-sm text-gray-600">
                            {wp.start_date && wp.end_date ? (
                              <span>{formatDate(wp.start_date)} – {formatDate(wp.end_date)}</span>
                            ) : '-'}
                          </div>
                          {/* Mitarbeiter-Bereich */}
                          <div className="w-40 flex-shrink-0"></div>
                          <div className="w-24 flex-shrink-0"></div>
                          <div className="w-24 flex-shrink-0"></div>
                          {canEdit && (
                            <div className="w-20 flex-shrink-0 flex justify-center space-x-1">
                              <button 
                                onClick={() => openAPModal(wp)} 
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                title="Bearbeiten"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button 
                                onClick={() => handleDeleteAP(wp)} 
                                className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="Löschen"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          )}
                        </div>
                        {/* Mitarbeiter-Zeilen */}
                        {wp.assignments && wp.assignments.length > 0 ? (
                          <div className="mt-2">
                            {wp.assignments.map((a, idx) => {
                              const hoursPerPM = (40 * 52) / 12;
                              const plannedHours = (a.person_months || 0) * hoursPerPM;
                              const fullName = a.user_profile?.name || '';
                              const nameParts = fullName.split(' ');
                              const formattedName = nameParts.length >= 2 
                                ? `${nameParts[nameParts.length - 1]}, ${nameParts.slice(0, -1).join(' ')}`
                                : fullName;
                              return (
                                <div key={idx} className="flex items-center text-sm py-0.5">
                                  <div className="w-20 flex-shrink-0"></div>
                                  <div className="flex-1 min-w-0"></div>
                                  <div className="w-44 flex-shrink-0"></div>
                                  <div className="w-40 flex-shrink-0 text-gray-800">{formattedName}</div>
                                  <div className="w-24 flex-shrink-0 text-right text-blue-700 font-medium">{a.person_months || '-'}</div>
                                  <div className="w-24 flex-shrink-0 text-right text-gray-600">{a.person_months ? Math.round(plannedHours) : '-'}</div>
                                  {canEdit && <div className="w-20 flex-shrink-0"></div>}
                                </div>
                              );
                            })}
                            {canEdit && (
                              <div className="flex items-center mt-1">
                                <div className="w-20 flex-shrink-0"></div>
                                <div className="flex-1 min-w-0"></div>
                                <div className="w-44 flex-shrink-0"></div>
                                <div className="w-40 flex-shrink-0">
                                  <button 
                                    onClick={() => openAssignModal(wp)} 
                                    className="px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-xs font-medium transition-colors"
                                  >
                                    ✏️ Zuordnung bearbeiten
                                  </button>
                                </div>
                                <div className="w-24 flex-shrink-0"></div>
                                <div className="w-24 flex-shrink-0"></div>
                                <div className="w-20 flex-shrink-0"></div>
                              </div>
                            )}
                          </div>
                        ) : canEdit ? (
                          <div className="flex items-center mt-2">
                            <div className="w-20 flex-shrink-0"></div>
                            <div className="flex-1 min-w-0"></div>
                            <div className="w-44 flex-shrink-0"></div>
                            <div className="w-40 flex-shrink-0">
                              <button 
                                onClick={() => openAssignModal(wp)} 
                                className="px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 rounded text-sm font-medium transition-colors"
                              >
                                + Mitarbeiter zuordnen
                              </button>
                            </div>
                            <div className="w-24 flex-shrink-0"></div>
                            <div className="w-24 flex-shrink-0"></div>
                            <div className="w-20 flex-shrink-0"></div>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ========== TAB: PROJEKTMITARBEITER ========== */}
          {activeTab === 'projektmitarbeiter' && (
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg flex-1 mr-4">
                  <h3 className="font-semibold text-purple-800 mb-1">👥 Projektmitarbeiter verwalten</h3>
                  <p className="text-sm text-purple-700">MA-Nummern und Qualifikationsgruppen für ZIM-Anträge festlegen.</p>
                </div>
                {canEdit && (
                  <select
                    className="border-2 border-gray-300 rounded-lg px-3 py-2 text-sm font-medium min-w-[220px]"
                    defaultValue=""
                    onChange={async (e) => {
                      const userId = e.target.value;
                      if (!userId) return;
                      
                      const maxNum = projectAssignments.reduce((max, pa) => Math.max(max, pa.project_employee_number || 0), 0);
                      
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
                        const { data: projectAssignData } = await supabase
                          .from('project_assignments')
                          .select('id, user_profile_id, project_employee_number')
                          .eq('project_id', resolvedParams.id)
                          .order('project_employee_number');
                        setProjectAssignments(projectAssignData || []);
                        
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
                )}
              </div>

              {projectAssignments.length === 0 ? (
                <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-xl">
                  <p className="font-medium text-lg">Noch keine Projektmitarbeiter</p>
                  <p className="mt-2">Wählen Sie oben Mitarbeiter aus.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">MA-Nr.</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Qual.</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Name</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Qualifikation</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Gesamt PM</th>
                        {canEdit && <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Aktionen</th>}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {companyEmployees.filter(emp => emp.project_employee_number).sort((a, b) => (a.project_employee_number || 99) - (b.project_employee_number || 99)).map((emp) => {
                        const empPM = anlage62Data.filter(a => a.user_profile_id === emp.id).reduce((sum, a) => sum + a.person_monate, 0);
                        return (
                          <tr key={emp.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              {canEdit ? (
                                <input 
                                  type="number" 
                                  min="1" 
                                  value={emp.project_employee_number || ''} 
                                  onChange={(e) => handleUpdateProjectEmployeeNumber(emp.id, parseInt(e.target.value))} 
                                  className="w-16 border rounded px-2 py-1 text-center font-bold text-blue-700" 
                                />
                              ) : (
                                <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-full font-bold">{emp.project_employee_number}</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {canEdit ? (
                                <select 
                                  value={emp.qualification_group || 'A'} 
                                  onChange={(e) => handleUpdateQualificationGroup(emp.id, e.target.value)} 
                                  className="border rounded px-2 py-1 font-medium text-sm"
                                >
                                  <option value="A">A</option>
                                  <option value="B">B</option>
                                  <option value="C">C</option>
                                </select>
                              ) : (
                                <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-800 rounded font-medium">{emp.qualification_group || 'A'}</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-medium text-gray-900">{emp.name}</div>
                              <div className="text-xs text-gray-500">{emp.email}</div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">{emp.qualification || '-'}</td>
                            <td className="px-4 py-3 text-right">
                              <span className="font-bold text-gray-900">{empPM.toFixed(1)} PM</span>
                            </td>
                            {canEdit && (
                              <td className="px-4 py-3 text-center">
                                <button 
                                  onClick={() => handleRemoveFromProject(emp.id)} 
                                  className="px-2 py-1 text-red-600 hover:bg-red-50 rounded text-sm font-medium transition-colors"
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

              <div className="mt-6 p-4 bg-gray-50 rounded-lg text-sm text-gray-600">
                <p className="font-semibold mb-2">Qualifikationsgruppen (ZIM):</p>
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
            <div className="p-6">
              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="font-semibold text-green-800 mb-1">📋 ZIM Anlage 5 - Kontrollsummen</h3>
                <p className="text-sm text-green-700">Übersicht der Personenmonate je Arbeitspaket und je Mitarbeiter</p>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* a) PM je Arbeitspaket */}
                <div className="lg:col-span-1">
                  <h4 className="font-semibold text-gray-900 mb-3">a) PM je Arbeitspaket</h4>
                  <table className="min-w-full divide-y divide-gray-200 border rounded-lg overflow-hidden text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-gray-600">AP Nr.</th>
                        <th className="px-3 py-2 text-right font-semibold text-gray-600">PM</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {workPackages.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true })).map(wp => {
                        const totalPM = wp.assignments?.reduce((sum, a) => sum + (a.person_months || 0), 0) || 0;
                        return (
                          <tr key={wp.id} className="hover:bg-gray-50">
                            <td className="px-3 py-2 font-medium">{wp.code}</td>
                            <td className="px-3 py-2 text-right">{totalPM > 0 ? totalPM.toFixed(2) : '-'}</td>
                          </tr>
                        );
                      })}
                      <tr className="bg-gray-100 font-bold">
                        <td className="px-3 py-3">Summe</td>
                        <td className="px-3 py-3 text-right">
                          {workPackages.reduce((sum, wp) => sum + (wp.assignments?.reduce((s, a) => s + (a.person_months || 0), 0) || 0), 0).toFixed(0)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* b) PM je Mitarbeiter */}
                <div className="lg:col-span-2">
                  <h4 className="font-semibold text-gray-900 mb-3">b) PM je Mitarbeiter</h4>
                  <table className="min-w-full divide-y divide-gray-200 border rounded-lg overflow-hidden text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-gray-600">MA Nr.</th>
                        <th className="px-3 py-2 text-right font-semibold text-gray-600">PM</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-600">beteiligt an AP</th>
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
                                <tr key={maId} className="hover:bg-gray-50">
                                  <td className="px-3 py-2 font-medium">{data.maNum}</td>
                                  <td className="px-3 py-2 text-right">{data.pm > 0 ? data.pm.toFixed(1) : '-'}</td>
                                  <td className="px-3 py-2 text-gray-600">{data.aps.sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).join('; ') || '-'}</td>
                                </tr>
                              );
                            })}
                            <tr className="bg-gray-100 font-bold">
                              <td className="px-3 py-3">Summe</td>
                              <td className="px-3 py-3 text-right">{totalPM.toFixed(0)}</td>
                              <td className="px-3 py-3"></td>
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
            <div className="p-6">
              <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <h3 className="font-semibold text-amber-800 mb-1">📊 ZIM Anlage 6.2 - Planung der Personalkapazität</h3>
                <p className="text-sm text-amber-700">PM-Kosten, Personenmonate pro Jahr und Personalkosten</p>
              </div>

              {anlage62Data.length === 0 ? (
                <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-xl">
                  <p>Noch keine Daten. Weisen Sie MA Personenmonate in den Arbeitspaketen zu.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 border rounded-lg overflow-hidden text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-3 text-left font-semibold text-gray-600">Nr.</th>
                        <th className="px-3 py-3 text-left font-semibold text-gray-600">Qual.</th>
                        <th className="px-3 py-3 text-left font-semibold text-gray-600">Mitarbeiter</th>
                        <th className="px-3 py-3 text-right font-semibold text-gray-600">PM-Kosten</th>
                        <th className="px-3 py-3 text-right font-semibold text-gray-600">TZ-Faktor</th>
                        <th className="px-3 py-3 text-center font-semibold text-gray-600">Jahr</th>
                        <th className="px-3 py-3 text-right font-semibold text-gray-600">PM</th>
                        <th className="px-3 py-3 text-right font-semibold text-gray-600">Pers.-Kosten</th>
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
                          const maTotalPM = maRows.reduce((s, r) => s + r.person_monate, 0);
                          const maTotalKosten = maRows.reduce((s, r) => s + r.personalkosten, 0);
                          totalPM += maTotalPM;
                          totalKosten += maTotalKosten;
                          maRows.forEach((row, idx) => {
                            rows.push(
                              <tr key={`${userId}-${row.year}`} className={idx === 0 ? 'border-t-2 border-gray-300' : ''}>
                                {idx === 0 && (
                                  <>
                                    <td rowSpan={maRows.length + 1} className="px-3 py-2 font-bold text-blue-700 align-top">{row.ma_nr}</td>
                                    <td rowSpan={maRows.length + 1} className="px-3 py-2 align-top"><span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-medium">{row.qual_gruppe || 'A'}</span></td>
                                    <td rowSpan={maRows.length + 1} className="px-3 py-2 align-top"><div className="font-medium">{row.ma_name}</div><div className="text-xs text-gray-500">{row.qualifikation}</div></td>
                                    <td rowSpan={maRows.length + 1} className="px-3 py-2 text-right align-top">{row.pm_kosten.toLocaleString('de-DE')} €</td>
                                    <td rowSpan={maRows.length + 1} className="px-3 py-2 text-right align-top">{row.teilzeit_faktor.toFixed(3)}</td>
                                  </>
                                )}
                                <td className="px-3 py-2 text-center"><span className="text-gray-500 text-xs">{idx + 1}. Jahr</span> {row.year}</td>
                                <td className="px-3 py-2 text-right font-medium">{row.person_monate > 0 ? row.person_monate.toFixed(1) : '-'}</td>
                                <td className="px-3 py-2 text-right">{row.personalkosten > 0 ? `${row.personalkosten.toLocaleString('de-DE')} €` : '-'}</td>
                              </tr>
                            );
                          });
                          rows.push(
                            <tr key={`${userId}-total`} className="bg-gray-50">
                              <td className="px-3 py-2 text-center font-semibold text-gray-700">gesamt</td>
                              <td className="px-3 py-2 text-right font-bold">{maTotalPM.toFixed(1)}</td>
                              <td className="px-3 py-2 text-right font-bold">{maTotalKosten.toLocaleString('de-DE')} €</td>
                            </tr>
                          );
                        });
                        rows.push(
                          <tr key="grand-total" className="bg-amber-100 border-t-2 border-amber-400">
                            <td colSpan={5} className="px-3 py-3 text-right font-bold text-amber-800">GESAMT</td>
                            <td className="px-3 py-3"></td>
                            <td className="px-3 py-3 text-right font-bold text-amber-900 text-lg">{totalPM.toFixed(1)} PM</td>
                            <td className="px-3 py-3 text-right font-bold text-amber-900 text-lg">{totalKosten.toLocaleString('de-DE')} €</td>
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
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">💰 Fördermittel-Einstellungen</h2>
                {canEdit && !foerderEditMode && (
                  <button 
                    onClick={() => setFoerderEditMode(true)} 
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                  >
                    ✏️ Bearbeiten
                  </button>
                )}
              </div>

              {foerderEditMode ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Förderprogramm</label>
                      <select 
                        value={foerderFormData.funding_program} 
                        onChange={(e) => setFoerderFormData({ ...foerderFormData, funding_program: e.target.value })} 
                        className="w-full border rounded-lg px-3 py-2 text-sm"
                      >
                        <option value="">-- Kein Förderprogramm --</option>
                        <option value="ZIM">ZIM - Zentrales Innovationsprogramm Mittelstand</option>
                        <option value="FZul">FZul - Forschungszulage</option>
                        <option value="BAFA">BAFA - Bundesamt für Wirtschaft</option>
                        <option value="other">Sonstiges</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Förderkennzeichen</label>
                      <input type="text" value={foerderFormData.funding_reference} onChange={(e) => setFoerderFormData({ ...foerderFormData, funding_reference: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="z.B. 16KN123456" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Bewilligte Fördersumme (EUR)</label>
                      <input type="number" value={foerderFormData.funding_amount} onChange={(e) => setFoerderFormData({ ...foerderFormData, funding_amount: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Fördersatz (%)</label>
                      <input type="number" value={foerderFormData.funding_rate} onChange={(e) => setFoerderFormData({ ...foerderFormData, funding_rate: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" min="0" max="100" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Gemeinkostenpauschale (%)</label>
                      <input type="number" value={foerderFormData.overhead_rate} onChange={(e) => setFoerderFormData({ ...foerderFormData, overhead_rate: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" min="0" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Zuwendungsbescheid vom</label>
                      <input type="date" value={foerderFormData.funding_approval_date} onChange={(e) => setFoerderFormData({ ...foerderFormData, funding_approval_date: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Bewilligungszeitraum von</label>
                      <input type="date" value={foerderFormData.funding_start_date} onChange={(e) => setFoerderFormData({ ...foerderFormData, funding_start_date: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Bewilligungszeitraum bis</label>
                      <input type="date" value={foerderFormData.funding_end_date} onChange={(e) => setFoerderFormData({ ...foerderFormData, funding_end_date: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-3 pt-4 border-t">
                    <button onClick={() => setFoerderEditMode(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium">Abbrechen</button>
                    <button onClick={handleSaveFoerderung} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 text-sm font-medium">{saving ? 'Speichern...' : '💾 Speichern'}</button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {project.funding_amount && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div className="bg-blue-50 rounded-xl p-4">
                        <div className="text-xs text-blue-600 font-medium">Bewilligt</div>
                        <div className="text-xl font-bold text-blue-900 mt-1">{formatCurrency(fundingStatus.approved)}</div>
                      </div>
                      <div className="bg-green-50 rounded-xl p-4">
                        <div className="text-xs text-green-600 font-medium">Ausgezahlt</div>
                        <div className="text-xl font-bold text-green-900 mt-1">{formatCurrency(fundingStatus.paid)}</div>
                      </div>
                      <div className="bg-yellow-50 rounded-xl p-4">
                        <div className="text-xs text-yellow-600 font-medium">In Prüfung</div>
                        <div className="text-xl font-bold text-yellow-900 mt-1">{formatCurrency(fundingStatus.pending)}</div>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-4">
                        <div className="text-xs text-gray-600 font-medium">Verfügbar</div>
                        <div className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(fundingStatus.available)}</div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-xs text-gray-500">Förderprogramm</div>
                      <div className="font-medium mt-1">{getFundingProgramLabel(project.funding_program)}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-xs text-gray-500">Förderkennzeichen</div>
                      <div className="font-medium mt-1">{project.funding_reference || '-'}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-xs text-gray-500">Bewilligte Fördersumme</div>
                      <div className="font-medium mt-1">{formatCurrency(project.funding_amount)}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-xs text-gray-500">Fördersatz</div>
                      <div className="font-medium mt-1">{project.funding_rate ? `${project.funding_rate}%` : '-'}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-xs text-gray-500">Gemeinkostenpauschale</div>
                      <div className="font-medium mt-1">{project.overhead_rate ? `${project.overhead_rate}%` : '-'}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-xs text-gray-500">Bewilligungszeitraum</div>
                      <div className="font-medium mt-1">
                        {project.funding_start_date && project.funding_end_date 
                          ? `${formatDate(project.funding_start_date)} – ${formatDate(project.funding_end_date)}` 
                          : '-'}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========== TAB: ZAHLUNGSANFORDERUNGEN ========== */}
          {activeTab === 'zahlungsanforderungen' && (
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">💳 Zahlungsanforderungen</h2>
                {canEdit && project.funding_program && (
                  <button 
                    onClick={() => setShowZAModal(true)} 
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center text-sm font-medium"
                  >
                    + Neue Zahlungsanforderung
                  </button>
                )}
              </div>

              {!project.funding_program && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                  <p className="text-yellow-800 text-sm">⚠️ Bitte konfigurieren Sie zuerst die Förderdetails im Tab "Förderung".</p>
                </div>
              )}

              {paymentRequests.length === 0 ? (
                <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-xl">
                  <p className="font-medium">Noch keine Zahlungsanforderungen</p>
                  <p className="text-sm mt-1">Erstellen Sie eine neue ZA basierend auf erfassten Zeiten.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 border rounded-lg overflow-hidden text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-gray-600">Nr.</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-600">Zeitraum</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-600">Stunden</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-600">Personalkosten</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-600">Angefordert</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-600">Status</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-600">Ausgezahlt</th>
                        <th className="px-4 py-3 text-center font-semibold text-gray-600">Aktionen</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {paymentRequests.map((pr) => (
                        <tr key={pr.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedZaId(pr.id)}>
                          <td className="px-4 py-3 font-bold text-gray-900">ZA-{pr.request_number}</td>
                          <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatDate(pr.period_start)} – {formatDate(pr.period_end)}</td>
                          <td className="px-4 py-3 text-right text-gray-600">{pr.personnel_hours?.toFixed(1)}h</td>
                          <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(pr.personnel_costs)}</td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatCurrency(pr.requested_amount)}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getZAStatusColor(pr.status)}`}>
                              {getZAStatusLabel(pr.status)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-green-600 font-semibold">{pr.paid_amount ? formatCurrency(pr.paid_amount) : '-'}</td>
                          <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-center space-x-1">
                              <button onClick={() => setSelectedZaId(pr.id)} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="Details">👁️</button>
                              {pr.status === 'draft' && canEdit && (
                                <button onClick={() => handleDeleteZA(pr.id)} className="p-1 text-red-600 hover:bg-red-50 rounded" title="Löschen">🗑️</button>
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

      {/* ========== STICKY FOOTER - Statistik ========== */}
      {activeTab === 'arbeitspakete' && workPackages.length > 0 && (
        <div className="sticky bottom-0 z-30 bg-white border-t shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
          <div className="max-w-[1800px] mx-auto px-6 lg:px-8 py-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded-lg p-3 flex items-center justify-between">
                <div>
                  <div className="text-xs text-blue-600 font-medium">Arbeitspakete</div>
                  <div className="text-xl font-bold text-blue-900">{workPackages.length}</div>
                </div>
                <span className="text-2xl">📦</span>
              </div>
              <div className="bg-amber-50 rounded-lg p-3 flex items-center justify-between">
                <div>
                  <div className="text-xs text-amber-600 font-medium">Geplante PM</div>
                  <div className="text-xl font-bold text-amber-900">
                    {workPackages.reduce((sum, wp) => sum + (wp.assignments?.reduce((s, a) => s + (a.person_months || 0), 0) || 0), 0).toFixed(1)} PM
                  </div>
                </div>
                <span className="text-2xl">📊</span>
              </div>
              <div className="bg-green-50 rounded-lg p-3 flex items-center justify-between">
                <div>
                  <div className="text-xs text-green-600 font-medium">Geplante Stunden</div>
                  <div className="text-xl font-bold text-green-900">
                    {Math.round(workPackages.reduce((sum, wp) => sum + (wp.assignments?.reduce((s, a) => s + (a.person_months || 0), 0) || 0), 0) * (40 * 52 / 12))}h
                  </div>
                </div>
                <span className="text-2xl">⏱️</span>
              </div>
              <div className="bg-purple-50 rounded-lg p-3 flex items-center justify-between">
                <div>
                  <div className="text-xs text-purple-600 font-medium">Mitarbeiter</div>
                  <div className="text-xl font-bold text-purple-900">
                    {new Set(workPackages.flatMap(wp => wp.assignments?.map(a => a.user_profile?.id) || [])).size}
                  </div>
                </div>
                <span className="text-2xl">👥</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========== MODALS ========== */}

      {/* AP Modal */}
      {showAPModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">{editingAP ? '✏️ Arbeitspaket bearbeiten' : '➕ Neues Arbeitspaket'}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">AP-Nummer *</label>
                <input type="text" value={apForm.code} onChange={(e) => setApForm({ ...apForm, code: e.target.value })} placeholder="z.B. AP1.1" className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Beschreibung *</label>
                <textarea rows={2} value={apForm.description} onChange={(e) => setApForm({ ...apForm, description: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Geplante Stunden</label>
                  <input type="number" value={apForm.estimated_hours} onChange={(e) => setApForm({ ...apForm, estimated_hours: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Startdatum</label>
                  <input type="date" value={apForm.start_date} onChange={(e) => setApForm({ ...apForm, start_date: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Enddatum</label>
                  <input type="date" value={apForm.end_date} onChange={(e) => setApForm({ ...apForm, end_date: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button onClick={() => setShowAPModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium">Abbrechen</button>
              <button onClick={handleSaveAP} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 text-sm font-medium">{saving ? 'Speichert...' : (editingAP ? '💾 Aktualisieren' : '➕ Erstellen')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Zuordnung Modal */}
      {showAssignModal && selectedAPForAssign && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-900 mb-2">👥 Mitarbeiter zuordnen</h3>
            <p className="text-sm text-gray-500 mb-4">{selectedAPForAssign.code} – {selectedAPForAssign.description}</p>
            
            {companyEmployees.filter(emp => emp.project_employee_number).length === 0 ? (
              <div className="text-center py-8 bg-yellow-50 rounded-xl">
                <p className="text-yellow-800 font-medium">Keine Projektmitarbeiter vorhanden</p>
                <p className="text-sm text-yellow-700 mt-1">Bitte zuerst im Tab "Projektmitarbeiter" Mitarbeiter zuordnen.</p>
              </div>
            ) : (
              <>
                <div className="mb-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
                  <strong>💡 Hinweis:</strong> 1 PM = Wochenstunden × 52 / 12
                </div>
                <div className="space-y-2">
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
                            <input 
                              type="checkbox" 
                              checked={assignments[emp.id]?.selected || false} 
                              onChange={(e) => setAssignments({ ...assignments, [emp.id]: { ...assignments[emp.id], selected: e.target.checked } })} 
                              className="w-5 h-5 text-blue-600 rounded mr-3" 
                            />
                            <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-full font-bold mr-3 text-sm">{emp.project_employee_number}</span>
                            <div>
                              <div className="font-medium text-gray-900 text-sm">{emp.name}</div>
                              <div className="text-xs text-gray-500">{weeklyHours}h/Woche • Qual. {emp.qualification_group || 'A'}</div>
                            </div>
                          </div>
                          {assignments[emp.id]?.selected && (
                            <div className="flex items-center space-x-2 ml-4">
                              <input 
                                type="number" 
                                step="0.25" 
                                min="0" 
                                value={assignments[emp.id]?.pm || ''} 
                                onChange={(e) => setAssignments({ ...assignments, [emp.id]: { ...assignments[emp.id], pm: e.target.value } })} 
                                className="w-16 border rounded px-2 py-1 text-sm text-right" 
                                placeholder="0" 
                              />
                              <span className="text-sm text-gray-600">PM</span>
                              <span className="text-gray-400">=</span>
                              <span className="text-sm font-bold text-blue-700 w-16 text-right">{calculatedHours.toFixed(0)} h</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </>
            )}
            <div className="flex justify-end space-x-3 mt-6">
              <button onClick={() => setShowAssignModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium">Abbrechen</button>
              <button onClick={handleSaveAssignments} disabled={saving || companyEmployees.filter(emp => emp.project_employee_number).length === 0} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 text-sm font-medium">{saving ? 'Speichert...' : '💾 Zuordnungen speichern'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete All AP Modal */}
      {showDeleteAllAPModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">🗑️ Alle Arbeitspakete löschen?</h3>
            <div className="mb-6 p-4 bg-red-50 rounded-lg">
              <p className="text-sm text-red-800">
                <strong>{workPackages.length} Arbeitspakete</strong> werden unwiderruflich gelöscht.
              </p>
            </div>
            <div className="flex space-x-3">
              <button onClick={() => setShowDeleteAllAPModal(false)} disabled={deletingAllAP} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium text-sm">Abbrechen</button>
              <button
                onClick={async () => {
                  setDeletingAllAP(true);
                  try {
                    const { error } = await supabase.from('work_packages').delete().eq('project_id', project!.id);
                    if (error) throw error;
                    setSuccess(`${workPackages.length} Arbeitspakete gelöscht`);
                    setShowDeleteAllAPModal(false);
                    loadWorkPackages(project!.id);
                  } catch (err: any) {
                    setError(`Fehler: ${err.message}`);
                  } finally {
                    setDeletingAllAP(false);
                  }
                }}
                disabled={deletingAllAP}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium text-sm disabled:bg-gray-400"
              >
                {deletingAllAP ? 'Wird gelöscht...' : '🗑️ Alle löschen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ZA Detail Modal Placeholder */}
      {selectedZaId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">ZA Details</h3>
            <p className="text-gray-600">ZA ID: {selectedZaId}</p>
            <div className="flex justify-end mt-6">
              <button onClick={() => setSelectedZaId(null)} className="px-4 py-2 bg-gray-200 rounded-lg text-sm font-medium">Schließen</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}