// src/app/v7/berater/foerderung/page.tsx
// VERSION: v7.3.0 - Firmenübersicht mit Status, GF-Anlage und Einladungssystem
// DATUM: 06. Januar 2026

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

// ============================================
// TYPEN
// ============================================

interface ClientCompany {
  id: string;
  consultant_company_id: string;
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
  status: 'invited' | 'registered' | 'active' | 'inactive';
  onboarding_type: 'by_consultant' | 'self_registration' | null;
  invited_at: string | null;
  registered_at: string | null;
  invitation_token: string | null;
  created_at: string;
  project_count?: number;
  employee_count?: number;
  admin_user?: {
    email: string;
    display_name: string | null;
  } | null;
}

interface UserProfile {
  id: string;
  email: string;
  role: string;
  consultant_company_id: string | null;
  display_name: string | null;
}

interface CompanyFormData {
  name: string;
  short_name: string;
  street: string;
  zip_code: string;
  city: string;
  federal_state: string;
  contact_person: string;
  contact_email: string;
  contact_phone: string;
  internal_notes: string;
  // Neu: GF-Daten
  create_admin: boolean;
  admin_email: string;
  admin_first_name: string;
  admin_last_name: string;
}

const EMPTY_FORM: CompanyFormData = {
  name: '',
  short_name: '',
  street: '',
  zip_code: '',
  city: '',
  federal_state: '',
  contact_person: '',
  contact_email: '',
  contact_phone: '',
  internal_notes: '',
  create_admin: true,
  admin_email: '',
  admin_first_name: '',
  admin_last_name: '',
};

// ============================================
// BUNDESLÄNDER
// ============================================

const BUNDESLAENDER = [
  { code: 'DE-BW', name: 'Baden-Württemberg' },
  { code: 'DE-BY', name: 'Bayern' },
  { code: 'DE-BE', name: 'Berlin' },
  { code: 'DE-BB', name: 'Brandenburg' },
  { code: 'DE-HB', name: 'Bremen' },
  { code: 'DE-HH', name: 'Hamburg' },
  { code: 'DE-HE', name: 'Hessen' },
  { code: 'DE-MV', name: 'Mecklenburg-Vorpommern' },
  { code: 'DE-NI', name: 'Niedersachsen' },
  { code: 'DE-NW', name: 'Nordrhein-Westfalen' },
  { code: 'DE-RP', name: 'Rheinland-Pfalz' },
  { code: 'DE-SL', name: 'Saarland' },
  { code: 'DE-SN', name: 'Sachsen' },
  { code: 'DE-ST', name: 'Sachsen-Anhalt' },
  { code: 'DE-SH', name: 'Schleswig-Holstein' },
  { code: 'DE-TH', name: 'Thüringen' },
];

const BUNDESLAND_NAMES: Record<string, string> = Object.fromEntries(
  BUNDESLAENDER.map(b => [b.code, b.name])
);

// Status-Konfiguration
const STATUS_CONFIG = {
  invited: { label: 'Eingeladen', color: 'yellow', icon: '🟡' },
  registered: { label: 'Registriert', color: 'orange', icon: '🟠' },
  active: { label: 'Aktiv', color: 'green', icon: '🟢' },
  inactive: { label: 'Inaktiv', color: 'gray', icon: '⚫' },
};

// Festes Entwicklungs-Passwort
const DEV_PASSWORD = 'Test1234!';

// ============================================
// KOMPONENTE
// ============================================

export default function FoerderungPage() {
  const router = useRouter();
  const supabase = createClient();

  // State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [companies, setCompanies] = useState<ClientCompany[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingCompany, setEditingCompany] = useState<ClientCompany | null>(null);
  const [formData, setFormData] = useState<CompanyFormData>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Delete Confirmation State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<ClientCompany | null>(null);

  // Invitation Link Modal
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteCompany, setInviteCompany] = useState<ClientCompany | null>(null);

  // ============================================
  // AUTH & DATEN LADEN
  // ============================================

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  const checkAuthAndLoadData = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        router.push('/login');
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('v7_user_profiles')
        .select('*')
        .eq('email', user.email)
        .maybeSingle();

      if (profileError || !profile) {
        setError('Kein V7-Profil gefunden. Bitte Administrator kontaktieren.');
        setLoading(false);
        return;
      }

      if (profile.role !== 'consultant' && profile.role !== 'system_admin') {
        router.push('/v7/firma');
        return;
      }

      setUserProfile(profile);
      await loadCompanies(profile.consultant_company_id);

    } catch (err: any) {
      console.error('Auth-Fehler:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadCompanies = async (consultantCompanyId: string | null) => {
    if (!consultantCompanyId) {
      setCompanies([]);
      return;
    }

    // Firmen laden (inkl. inaktive für Statusanzeige)
    const { data: companiesData, error: companiesError } = await supabase
      .from('v7_client_companies')
      .select('*')
      .eq('consultant_company_id', consultantCompanyId)
      .order('name');

    if (companiesError) {
      console.error('Firmen-Fehler:', companiesError);
      return;
    }

    // Erweiterte Daten laden
    const companiesWithData = await Promise.all(
      (companiesData || []).map(async (company) => {
        // Projekte zählen
        const { count: projectCount } = await supabase
          .from('v7_projects')
          .select('*', { count: 'exact', head: true })
          .eq('client_company_id', company.id)
          .eq('is_active', true);

        // Mitarbeiter zählen
        const { count: employeeCount } = await supabase
          .from('v7_employees')
          .select('*', { count: 'exact', head: true })
          .eq('client_company_id', company.id)
          .eq('is_active', true);

        // Admin-User finden
        const { data: adminUser } = await supabase
          .from('v7_user_profiles')
          .select('email, display_name')
          .eq('client_company_id', company.id)
          .eq('role', 'client_admin')
          .maybeSingle();

        return {
          ...company,
          status: company.status || 'active',
          project_count: projectCount || 0,
          employee_count: employeeCount || 0,
          admin_user: adminUser,
        };
      })
    );

    setCompanies(companiesWithData);
  };

  // ============================================
  // CRUD FUNKTIONEN
  // ============================================

  const openCreateModal = () => {
    setModalMode('create');
    setEditingCompany(null);
    setFormData(EMPTY_FORM);
    setFormError(null);
    setSuccessMessage(null);
    setShowModal(true);
  };

  const openEditModal = (company: ClientCompany, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setModalMode('edit');
    setEditingCompany(company);
    setFormData({
      name: company.name || '',
      short_name: company.short_name || '',
      street: company.street || '',
      zip_code: company.zip_code || '',
      city: company.city || '',
      federal_state: company.federal_state || '',
      contact_person: company.contact_person || '',
      contact_email: company.contact_email || '',
      contact_phone: company.contact_phone || '',
      internal_notes: company.internal_notes || '',
      create_admin: false,
      admin_email: '',
      admin_first_name: '',
      admin_last_name: '',
    });
    setFormError(null);
    setSuccessMessage(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCompany(null);
    setFormData(EMPTY_FORM);
    setFormError(null);
    setSuccessMessage(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setFormError('Firmenname ist erforderlich');
      return;
    }

    if (!userProfile?.consultant_company_id) {
      setFormError('Keine Berater-Firma zugeordnet');
      return;
    }

    // Validierung für Admin-Erstellung
    if (modalMode === 'create' && formData.create_admin) {
      if (!formData.admin_email.trim()) {
        setFormError('E-Mail des Administrators ist erforderlich');
        return;
      }
      if (!formData.admin_email.includes('@')) {
        setFormError('Ungültige E-Mail-Adresse');
        return;
      }
    }

    setSaving(true);
    setFormError(null);

    try {
      const companyData = {
        name: formData.name.trim(),
        short_name: formData.short_name.trim() || null,
        street: formData.street.trim() || null,
        zip_code: formData.zip_code.trim() || null,
        city: formData.city.trim() || null,
        federal_state: formData.federal_state || null,
        contact_person: formData.contact_person.trim() || null,
        contact_email: formData.contact_email.trim() || null,
        contact_phone: formData.contact_phone.trim() || null,
        internal_notes: formData.internal_notes.trim() || null,
        updated_at: new Date().toISOString(),
      };

      if (modalMode === 'create') {
        // 1. Firma anlegen
        const { data: newCompany, error: insertError } = await supabase
          .from('v7_client_companies')
          .insert({
            ...companyData,
            consultant_company_id: userProfile.consultant_company_id,
            is_active: true,
            status: formData.create_admin ? 'active' : 'invited',
            onboarding_type: 'by_consultant',
            invited_at: new Date().toISOString(),
            registered_at: formData.create_admin ? new Date().toISOString() : null,
          })
          .select()
          .single();

        if (insertError) {
          if (insertError.code === '23505') {
            setFormError('Eine Firma mit diesem Namen existiert bereits');
          } else {
            setFormError(insertError.message);
          }
          return;
        }

        // 2. Admin-User anlegen (falls gewünscht)
        if (formData.create_admin && newCompany) {
          // Supabase Auth User erstellen
          const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: formData.admin_email.trim(),
            password: DEV_PASSWORD,
            email_confirm: true,
          });

          // Falls admin.createUser nicht verfügbar (Client-seitig), alternativer Ansatz
          if (authError && authError.message.includes('not authorized')) {
            // Fallback: User über signUp erstellen
            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
              email: formData.admin_email.trim(),
              password: DEV_PASSWORD,
            });

            if (signUpError) {
              // Firma wurde erstellt, aber User nicht
              setFormError(`Firma erstellt, aber User-Erstellung fehlgeschlagen: ${signUpError.message}`);
              await loadCompanies(userProfile.consultant_company_id);
              return;
            }

            // V7 User Profile erstellen
            if (signUpData.user) {
              const { error: profileError } = await supabase
                .from('v7_user_profiles')
                .insert({
                  id: signUpData.user.id,
                  email: formData.admin_email.trim(),
                  first_name: formData.admin_first_name.trim() || null,
                  last_name: formData.admin_last_name.trim() || null,
                  display_name: formData.admin_first_name.trim() && formData.admin_last_name.trim()
                    ? `${formData.admin_first_name.trim()} ${formData.admin_last_name.trim()}`
                    : formData.admin_email.split('@')[0],
                  role: 'client_admin',
                  client_company_id: newCompany.id,
                  is_active: true,
                  invited_by: userProfile.id,
                  invited_at: new Date().toISOString(),
                });

              if (profileError) {
                console.error('Profil-Fehler:', profileError);
                setFormError(`Firma und Auth-User erstellt, aber Profil-Erstellung fehlgeschlagen: ${profileError.message}`);
                await loadCompanies(userProfile.consultant_company_id);
                return;
              }
            }
          } else if (authError) {
            setFormError(`Firma erstellt, aber User-Erstellung fehlgeschlagen: ${authError.message}`);
            await loadCompanies(userProfile.consultant_company_id);
            return;
          } else if (authData?.user) {
            // V7 User Profile erstellen (Admin-API Variante)
            const { error: profileError } = await supabase
              .from('v7_user_profiles')
              .insert({
                id: authData.user.id,
                email: formData.admin_email.trim(),
                first_name: formData.admin_first_name.trim() || null,
                last_name: formData.admin_last_name.trim() || null,
                display_name: formData.admin_first_name.trim() && formData.admin_last_name.trim()
                  ? `${formData.admin_first_name.trim()} ${formData.admin_last_name.trim()}`
                  : formData.admin_email.split('@')[0],
                role: 'client_admin',
                client_company_id: newCompany.id,
                is_active: true,
                invited_by: userProfile.id,
                invited_at: new Date().toISOString(),
              });

            if (profileError) {
              console.error('Profil-Fehler:', profileError);
            }
          }

          setSuccessMessage(
            `Firma "${formData.name}" wurde angelegt. ` +
            `Admin ${formData.admin_email} kann sich mit Passwort "${DEV_PASSWORD}" anmelden.`
          );
        } else {
          setSuccessMessage(`Firma "${formData.name}" wurde angelegt.`);
        }

      } else if (modalMode === 'edit' && editingCompany) {
        const { error: updateError } = await supabase
          .from('v7_client_companies')
          .update(companyData)
          .eq('id', editingCompany.id);

        if (updateError) {
          setFormError(updateError.message);
          return;
        }
        setSuccessMessage('Änderungen gespeichert.');
      }

      await loadCompanies(userProfile.consultant_company_id);

      // Modal nach kurzer Verzögerung schließen (damit Erfolgsmeldung sichtbar ist)
      setTimeout(() => {
        closeModal();
      }, 2000);

    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const openDeleteConfirm = (company: ClientCompany, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCompanyToDelete(company);
    setShowDeleteConfirm(true);
  };

  const handleDelete = async () => {
    if (!companyToDelete || !userProfile?.consultant_company_id) return;

    setSaving(true);

    try {
      const { error: deleteError } = await supabase
        .from('v7_client_companies')
        .update({ 
          is_active: false, 
          status: 'inactive',
          updated_at: new Date().toISOString() 
        })
        .eq('id', companyToDelete.id);

      if (deleteError) {
        setError(deleteError.message);
        return;
      }

      setShowDeleteConfirm(false);
      setCompanyToDelete(null);
      await loadCompanies(userProfile.consultant_company_id);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Einladungslink generieren
  const generateInviteLink = (company: ClientCompany) => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    return `${baseUrl}/register?invite=${company.invitation_token}`;
  };

  const copyInviteLink = (company: ClientCompany) => {
    const link = generateInviteLink(company);
    navigator.clipboard.writeText(link);
    setInviteCompany(company);
    setShowInviteModal(true);
  };

  // Firma aktivieren (manuell)
  const activateCompany = async (company: ClientCompany, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const { error } = await supabase
      .from('v7_client_companies')
      .update({ 
        status: 'active',
        registered_at: new Date().toISOString(),
        updated_at: new Date().toISOString() 
      })
      .eq('id', company.id);

    if (!error && userProfile?.consultant_company_id) {
      await loadCompanies(userProfile.consultant_company_id);
    }
  };

  // ============================================
  // FILTER
  // ============================================

  const filteredCompanies = companies.filter(company => {
    // Status-Filter
    if (statusFilter !== 'all' && company.status !== statusFilter) {
      return false;
    }
    // Inaktive ausblenden außer explizit gewählt
    if (statusFilter === 'all' && company.status === 'inactive') {
      return false;
    }
    // Suchfilter
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      company.name.toLowerCase().includes(search) ||
      (company.short_name && company.short_name.toLowerCase().includes(search)) ||
      (company.city && company.city.toLowerCase().includes(search)) ||
      (company.admin_user?.email && company.admin_user.email.toLowerCase().includes(search))
    );
  });

  // Statistiken nach Status
  const statusCounts = {
    all: companies.filter(c => c.status !== 'inactive').length,
    active: companies.filter(c => c.status === 'active').length,
    invited: companies.filter(c => c.status === 'invited').length,
    registered: companies.filter(c => c.status === 'registered').length,
    inactive: companies.filter(c => c.status === 'inactive').length,
  };

  // ============================================
  // RENDER: LOADING
  // ============================================

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Lade Daten...</p>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER: ERROR
  // ============================================

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Fehler</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/login')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Zurück zum Login
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
      <header className="bg-[#0369a1] shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-4">
              <div className="bg-white rounded-lg px-3 py-1.5 text-sm font-bold text-[#0369a1]">
                PZE
              </div>
              <div>
                <h1 className="text-lg font-semibold text-white">Förderberatung</h1>
                <p className="text-sm text-blue-200">ZIM / BMBF Projekte</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/v7/berater')}
                className="text-blue-200 hover:text-white text-sm flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Zurück
              </button>
              <span className="text-white text-sm">{userProfile?.display_name}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Titel und Aktionen */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Kundenfirmen</h2>
            <p className="text-gray-500">{statusCounts.all} Firmen ({statusCounts.active} aktiv)</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* Status-Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="all">Alle aktiven ({statusCounts.all})</option>
              <option value="active">🟢 Aktiv ({statusCounts.active})</option>
              <option value="invited">🟡 Eingeladen ({statusCounts.invited})</option>
              <option value="registered">🟠 Registriert ({statusCounts.registered})</option>
              <option value="inactive">⚫ Inaktiv ({statusCounts.inactive})</option>
            </select>
            {/* Suchfeld */}
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Suchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm w-48"
              />
            </div>
            {/* Import Button */}
            <Link
              href="/v7/berater/foerderung/import"
              className="px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Import
            </Link>
            {/* Neue Firma Button */}
            <button
              onClick={openCreateModal}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Neue Firma
            </button>
          </div>
        </div>

        {/* Statistik */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl font-bold text-blue-600">{statusCounts.active}</div>
            <div className="text-sm text-gray-500 mt-1">🟢 Aktive Firmen</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl font-bold text-yellow-600">{statusCounts.invited}</div>
            <div className="text-sm text-gray-500 mt-1">🟡 Eingeladen (warten)</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl font-bold text-green-600">
              {companies.reduce((sum, c) => sum + (c.project_count || 0), 0)}
            </div>
            <div className="text-sm text-gray-500 mt-1">📁 Projekte gesamt</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl font-bold text-purple-600">
              {companies.reduce((sum, c) => sum + (c.employee_count || 0), 0)}
            </div>
            <div className="text-sm text-gray-500 mt-1">👥 Mitarbeiter gesamt</div>
          </div>
        </div>

        {/* Firmenliste */}
        {filteredCompanies.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            {companies.length === 0 ? (
              <>
                <div className="text-5xl mb-4">🏢</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Keine Kundenfirmen vorhanden</h3>
                <p className="text-gray-500 mb-6">
                  Legen Sie eine neue Firma an oder importieren Sie einen ZIM-Antrag.
                </p>
                <div className="flex justify-center gap-3">
                  <button
                    onClick={openCreateModal}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    + Neue Firma
                  </button>
                  <Link
                    href="/v7/berater/foerderung/import"
                    className="inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Import
                  </Link>
                </div>
              </>
            ) : (
              <>
                <div className="text-5xl mb-4">🔍</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Keine Treffer</h3>
                <p className="text-gray-500">Keine Firma gefunden für die gewählten Filter</p>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCompanies.map(company => {
              const statusInfo = STATUS_CONFIG[company.status] || STATUS_CONFIG.active;
              
              return (
                <div
                  key={company.id}
                  className={`bg-white rounded-lg shadow hover:shadow-lg transition-shadow relative group ${
                    company.status === 'inactive' ? 'opacity-60' : ''
                  }`}
                >
                  {/* Status Badge */}
                  <div className="absolute top-3 left-3">
                    <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                      company.status === 'active' ? 'bg-green-100 text-green-800' :
                      company.status === 'invited' ? 'bg-yellow-100 text-yellow-800' :
                      company.status === 'registered' ? 'bg-orange-100 text-orange-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {statusInfo.icon} {statusInfo.label}
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {/* Einladungslink kopieren */}
                    {(company.status === 'invited' || company.status === 'active') && company.invitation_token && (
                      <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); copyInviteLink(company); }}
                        className="p-1.5 bg-gray-100 hover:bg-blue-100 rounded text-gray-600 hover:text-blue-600"
                        title="Einladungslink kopieren"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                        </svg>
                      </button>
                    )}
                    {/* Aktivieren */}
                    {(company.status === 'invited' || company.status === 'registered') && (
                      <button
                        onClick={(e) => activateCompany(company, e)}
                        className="p-1.5 bg-gray-100 hover:bg-green-100 rounded text-gray-600 hover:text-green-600"
                        title="Aktivieren"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                    )}
                    {/* Bearbeiten */}
                    <button
                      onClick={(e) => openEditModal(company, e)}
                      className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded text-gray-600"
                      title="Bearbeiten"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    {/* Löschen */}
                    <button
                      onClick={(e) => openDeleteConfirm(company, e)}
                      className="p-1.5 bg-gray-100 hover:bg-red-100 rounded text-gray-600 hover:text-red-600"
                      title="Deaktivieren"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>

                  <Link
                    href={`/v7/berater/foerderung/firma/${company.id}`}
                    className="block p-6 pt-12"
                  >
                    <div className="mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">{company.name}</h3>
                      {company.short_name && (
                        <p className="text-sm text-gray-500">{company.short_name}</p>
                      )}
                    </div>

                    {/* Admin-User */}
                    {company.admin_user && (
                      <div className="text-sm text-gray-600 mb-2 flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span>{company.admin_user.display_name || company.admin_user.email}</span>
                      </div>
                    )}

                    {/* Ort/Bundesland */}
                    <div className="text-sm text-gray-500 mb-4 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {company.city && <span>{company.city}</span>}
                      {company.city && company.federal_state && <span>·</span>}
                      {company.federal_state && (
                        <span>{BUNDESLAND_NAMES[company.federal_state] || company.federal_state}</span>
                      )}
                      {!company.city && !company.federal_state && <span className="text-gray-400">Kein Ort</span>}
                    </div>

                    {/* Onboarding-Info */}
                    {company.onboarding_type && (
                      <div className="text-xs text-gray-400 mb-3">
                        {company.onboarding_type === 'by_consultant' ? '📋 Vom Berater angelegt' : '🔗 Selbst-Registrierung'}
                        {company.registered_at && (
                          <span> · {new Date(company.registered_at).toLocaleDateString('de-DE')}</span>
                        )}
                      </div>
                    )}

                    <div className="border-t pt-4 flex gap-6 text-sm">
                      <div>
                        <span className="text-gray-400">{company.employee_count} MA</span>
                      </div>
                      <div>
                        <span className="text-gray-400">{company.project_count} Projekte</span>
                      </div>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ============================================ */}
      {/* MODAL: Firma anlegen/bearbeiten */}
      {/* ============================================ */}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                {modalMode === 'create' ? 'Neue Firma anlegen' : 'Firma bearbeiten'}
              </h3>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-4 space-y-6">
              {/* Erfolgsmeldung */}
              {successMessage && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                  ✅ {successMessage}
                </div>
              )}

              {/* Fehlermeldung */}
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {formError}
                </div>
              )}

              {/* Firmendaten */}
              <div>
                <h4 className="font-medium text-gray-900 mb-4">Firmendaten</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Firmenname *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Muster GmbH"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Kurzname
                    </label>
                    <input
                      type="text"
                      name="short_name"
                      value={formData.short_name}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Muster"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Straße
                    </label>
                    <input
                      type="text"
                      name="street"
                      value={formData.street}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Musterstraße 123"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      PLZ
                    </label>
                    <input
                      type="text"
                      name="zip_code"
                      value={formData.zip_code}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="12345"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Stadt
                    </label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Musterstadt"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bundesland
                    </label>
                    <select
                      name="federal_state"
                      value={formData.federal_state}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Bitte wählen...</option>
                      {BUNDESLAENDER.map(bl => (
                        <option key={bl.code} value={bl.code}>{bl.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Ansprechpartner */}
              <div>
                <h4 className="font-medium text-gray-900 mb-4">Ansprechpartner (Kontakt)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      name="contact_person"
                      value={formData.contact_person}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Max Mustermann"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Telefon
                    </label>
                    <input
                      type="text"
                      name="contact_phone"
                      value={formData.contact_phone}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="+49 123 456789"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      E-Mail
                    </label>
                    <input
                      type="email"
                      name="contact_email"
                      value={formData.contact_email}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="kontakt@firma.de"
                    />
                  </div>
                </div>
              </div>

              {/* Admin-User anlegen (nur bei Neuanlage) */}
              {modalMode === 'create' && (
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      name="create_admin"
                      id="create_admin"
                      checked={formData.create_admin}
                      onChange={handleInputChange}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <label htmlFor="create_admin" className="font-medium text-blue-900 cursor-pointer">
                        Administrator-Zugang erstellen
                      </label>
                      <p className="text-sm text-blue-700 mt-1">
                        Erstellt einen Login für den Firmen-Admin (z.B. Geschäftsführer).
                        Passwort: <code className="bg-blue-100 px-1 rounded">{DEV_PASSWORD}</code>
                      </p>
                    </div>
                  </div>

                  {formData.create_admin && (
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-blue-900 mb-1">
                          Admin E-Mail *
                        </label>
                        <input
                          type="email"
                          name="admin_email"
                          value={formData.admin_email}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                          placeholder="gf@firma.de"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-blue-900 mb-1">
                          Vorname
                        </label>
                        <input
                          type="text"
                          name="admin_first_name"
                          value={formData.admin_first_name}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                          placeholder="Max"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-blue-900 mb-1">
                          Nachname
                        </label>
                        <input
                          type="text"
                          name="admin_last_name"
                          value={formData.admin_last_name}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                          placeholder="Mustermann"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Interne Notizen */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Interne Notizen
                </label>
                <textarea
                  name="internal_notes"
                  value={formData.internal_notes}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Nur für Berater sichtbar..."
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
              <button
                onClick={closeModal}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100"
                disabled={saving}
              >
                Abbrechen
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !!successMessage}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Speichern...
                  </>
                ) : (
                  'Speichern'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* MODAL: Löschen bestätigen */}
      {/* ============================================ */}

      {showDeleteConfirm && companyToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Firma deaktivieren?</h3>
            <p className="text-gray-600 mb-6">
              Möchten Sie die Firma <strong>"{companyToDelete.name}"</strong> wirklich deaktivieren?
              Die Daten bleiben erhalten und können später wiederhergestellt werden.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setShowDeleteConfirm(false); setCompanyToDelete(null); }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100"
                disabled={saving}
              >
                Abbrechen
              </button>
              <button
                onClick={handleDelete}
                disabled={saving}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400"
              >
                {saving ? 'Wird deaktiviert...' : 'Deaktivieren'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* MODAL: Einladungslink */}
      {/* ============================================ */}

      {showInviteModal && inviteCompany && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Einladungslink kopiert! ✅</h3>
            <p className="text-gray-600 mb-4">
              Der Einladungslink für <strong>"{inviteCompany.name}"</strong> wurde in die Zwischenablage kopiert.
            </p>
            <div className="bg-gray-100 rounded-lg p-3 mb-4 break-all text-sm font-mono">
              {generateInviteLink(inviteCompany)}
            </div>
            <p className="text-sm text-gray-500 mb-6">
              Senden Sie diesen Link an den Firmen-Administrator. Nach der Registrierung erscheint die Firma als "Registriert".
            </p>
            <div className="flex justify-end">
              <button
                onClick={() => { setShowInviteModal(false); setInviteCompany(null); }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
