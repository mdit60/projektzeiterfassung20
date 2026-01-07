// src/app/v7/firma/page.tsx
// VERSION: v7.3.2 - Firmen-Dashboard mit erweiterten Firmendaten & Logo-Upload
// DATUM: 06. Januar 2026

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

// ============================================
// FARBEN
// ============================================
const COLORS = {
  firmenPortal: '#65A655', // Cubintec-Grün
  beraterPortal: '#0369a1', // Dunkelblau
};

// ============================================
// TYPEN
// ============================================

interface UserProfile {
  id: string;
  email: string;
  role: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  client_company_id: string | null;
}

interface ClientCompany {
  id: string;
  name: string;
  short_name: string | null;
  legal_name: string | null;
  street: string | null;
  zip_code: string | null;
  city: string | null;
  federal_state: string | null;
  contact_person: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  vat_id: string | null;
  website: string | null;
  logo_url: string | null;
}

interface DashboardStats {
  projectCount: number;
  employeeCount: number;
  workPackageCount: number;
  timesheetEntriesThisMonth: number;
}

interface CompanyFormData {
  name: string;
  legal_name: string;
  street: string;
  zip_code: string;
  city: string;
  vat_id: string;
  website: string;
  contact_person: string;
  contact_email: string;
  contact_phone: string;
}

// ============================================
// KOMPONENTE
// ============================================

export default function FirmaDashboard() {
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [company, setCompany] = useState<ClientCompany | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    projectCount: 0,
    employeeCount: 0,
    workPackageCount: 0,
    timesheetEntriesThisMonth: 0,
  });

  // Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [formData, setFormData] = useState<CompanyFormData>({
    name: '',
    legal_name: '',
    street: '',
    zip_code: '',
    city: '',
    vat_id: '',
    website: '',
    contact_person: '',
    contact_email: '',
    contact_phone: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Logo Upload State
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [newLogoFile, setNewLogoFile] = useState<File | null>(null);

  // ============================================
  // AUTH & DATEN LADEN
  // ============================================

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  const checkAuthAndLoadData = async () => {
    try {
      // Auth prüfen
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        router.push('/login');
        return;
      }

      // Profil laden
      const { data: profile, error: profileError } = await supabase
        .from('v7_user_profiles')
        .select('*')
        .eq('email', user.email)
        .maybeSingle();

      if (profileError || !profile) {
        setError('Kein Profil gefunden. Bitte Administrator kontaktieren.');
        setLoading(false);
        return;
      }

      // Prüfen ob Firmen-Rolle
      if (profile.role === 'consultant' || profile.role === 'system_admin') {
        router.push('/v7/berater');
        return;
      }

      // Prüfen ob Firma zugeordnet
      if (!profile.client_company_id) {
        setError('Keine Firma zugeordnet. Bitte Administrator kontaktieren.');
        setLoading(false);
        return;
      }

      setUserProfile(profile);

      // Firma laden
      await loadCompany(profile.client_company_id);

      // Statistiken laden
      await loadStats(profile.client_company_id, profile.role, profile.id);

    } catch (err: any) {
      console.error('Fehler:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadCompany = async (companyId: string) => {
    const { data: companyData, error: companyError } = await supabase
      .from('v7_client_companies')
      .select('*')
      .eq('id', companyId)
      .single();

    if (companyError || !companyData) {
      setError('Firma nicht gefunden.');
      return;
    }

    setCompany(companyData);
  };

  const loadStats = async (companyId: string, role: string, userId: string) => {
    // Projekte zählen
    const { count: projectCount } = await supabase
      .from('v7_projects')
      .select('*', { count: 'exact', head: true })
      .eq('client_company_id', companyId)
      .eq('is_active', true);

    // Mitarbeiter zählen
    const { count: employeeCount } = await supabase
      .from('v7_employees')
      .select('*', { count: 'exact', head: true })
      .eq('client_company_id', companyId)
      .eq('is_active', true);

    // Arbeitspakete zählen (über Projekte)
    const { data: projects } = await supabase
      .from('v7_projects')
      .select('id')
      .eq('client_company_id', companyId)
      .eq('is_active', true);

    let workPackageCount = 0;
    if (projects && projects.length > 0) {
      const projectIds = projects.map(p => p.id);
      const { count } = await supabase
        .from('v7_work_packages')
        .select('*', { count: 'exact', head: true })
        .in('project_id', projectIds)
        .eq('is_active', true);
      workPackageCount = count || 0;
    }

    // Zeiteinträge diesen Monat
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const lastOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    let timesheetQuery = supabase
      .from('v7_timesheets')
      .select('*', { count: 'exact', head: true })
      .gte('work_date', firstOfMonth)
      .lte('work_date', lastOfMonth)
      .eq('is_active', true);

    // Mitarbeiter sehen nur eigene Einträge
    if (role === 'client_user' || role === 'employee') {
      const { data: employee } = await supabase
        .from('v7_employees')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (employee) {
        timesheetQuery = timesheetQuery.eq('employee_id', employee.id);
      }
    }

    const { count: timesheetCount } = await timesheetQuery;

    setStats({
      projectCount: projectCount || 0,
      employeeCount: employeeCount || 0,
      workPackageCount: workPackageCount,
      timesheetEntriesThisMonth: timesheetCount || 0,
    });
  };

  // ============================================
  // MODAL FUNKTIONEN
  // ============================================

  const openEditModal = () => {
    if (!company) return;
    
    setFormData({
      name: company.name || '',
      legal_name: company.legal_name || '',
      street: company.street || '',
      zip_code: company.zip_code || '',
      city: company.city || '',
      vat_id: company.vat_id || '',
      website: company.website || '',
      contact_person: company.contact_person || '',
      contact_email: company.contact_email || '',
      contact_phone: company.contact_phone || '',
    });
    setLogoPreview(company.logo_url);
    setNewLogoFile(null);
    setFormError(null);
    setSuccessMessage(null);
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setFormError(null);
    setSuccessMessage(null);
    setLogoPreview(null);
    setNewLogoFile(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validierung
    const allowedTypes = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setFormError('Nur PNG, JPG, SVG oder WebP Dateien erlaubt');
      return;
    }

    if (file.size > 2 * 1024 * 1024) { // 2MB
      setFormError('Logo darf maximal 2MB groß sein');
      return;
    }

    setNewLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
    setFormError(null);
  };

  const uploadLogo = async (): Promise<string | null> => {
    if (!newLogoFile || !company) return company?.logo_url || null;

    setUploadingLogo(true);
    try {
      const fileExt = newLogoFile.name.split('.').pop();
      const fileName = `${company.id}-${Date.now()}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('company-logos')
        .upload(filePath, newLogoFile, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) {
        console.error('Upload-Fehler:', uploadError);
        throw uploadError;
      }

      // Public URL holen
      const { data: { publicUrl } } = supabase.storage
        .from('company-logos')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (err: any) {
      console.error('Logo-Upload fehlgeschlagen:', err);
      setFormError(`Logo-Upload fehlgeschlagen: ${err.message}`);
      return company?.logo_url || null;
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSave = async () => {
    if (!company) return;

    if (!formData.name.trim()) {
      setFormError('Firmenname ist erforderlich');
      return;
    }

    setSaving(true);
    setFormError(null);

    try {
      // Logo hochladen falls neu
      let logoUrl = company.logo_url;
      if (newLogoFile) {
        logoUrl = await uploadLogo();
      }

      // Firmendaten speichern
      const { error: updateError } = await supabase
        .from('v7_client_companies')
        .update({
          name: formData.name.trim(),
          legal_name: formData.legal_name.trim() || null,
          street: formData.street.trim() || null,
          zip_code: formData.zip_code.trim() || null,
          city: formData.city.trim() || null,
          vat_id: formData.vat_id.trim() || null,
          website: formData.website.trim() || null,
          contact_person: formData.contact_person.trim() || null,
          contact_email: formData.contact_email.trim() || null,
          contact_phone: formData.contact_phone.trim() || null,
          logo_url: logoUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', company.id);

      if (updateError) {
        setFormError(updateError.message);
        return;
      }

      setSuccessMessage('Firmendaten gespeichert!');
      
      // Firma neu laden
      await loadCompany(company.id);

      // Modal nach kurzer Verzögerung schließen
      setTimeout(() => {
        closeEditModal();
      }, 1500);

    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  // ============================================
  // RENDER: LOADING
  // ============================================

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Wird geladen...</p>
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
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Fehler</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/login')}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Zurück zum Login
          </button>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER: DASHBOARD
  // ============================================

  const isAdmin = userProfile?.role === 'client_admin' || userProfile?.role === 'project_leader';
  const userName = userProfile?.display_name || userProfile?.first_name || userProfile?.email?.split('@')[0] || 'Benutzer';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header style={{ backgroundColor: COLORS.firmenPortal }} className="shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-4">
              <div className="bg-white rounded-lg px-3 py-1.5 text-sm font-bold" style={{ color: COLORS.firmenPortal }}>
                PZE
              </div>
              <div>
                <h1 className="text-lg font-semibold text-white">Firmen-Portal</h1>
                <p className="text-sm text-green-100">{company?.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-white">{userName}</p>
                <p className="text-xs text-green-100">
                  {isAdmin ? 'Administrator' : 'Mitarbeiter'}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-green-100 hover:text-white hover:bg-green-700 rounded-lg transition-colors"
                title="Abmelden"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Willkommen */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">
            Willkommen, {userName}!
          </h2>
          <p className="text-gray-600 mt-1">
            {isAdmin 
              ? 'Verwalten Sie Projekte, Mitarbeiter und Zeiterfassung.' 
              : 'Erfassen Sie hier Ihre Arbeitszeiten.'}
          </p>
        </div>

        {/* Statistik-Karten */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Projekte</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.projectCount}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">📁</span>
              </div>
            </div>
          </div>

          {isAdmin && (
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Mitarbeiter</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{stats.employeeCount}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">👥</span>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Arbeitspakete</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.workPackageCount}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">📦</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Einträge (Monat)</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.timesheetEntriesThisMonth}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">⏱️</span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation-Kacheln */}
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Bereiche</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link href="/v7/firma/zeiterfassung" className="block">
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md hover:border-green-200 transition-all cursor-pointer">
              <div className="flex items-start space-x-4">
                <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center">
                  <span className="text-3xl">⏱️</span>
                </div>
                <div className="flex-1">
                  <h4 className="text-lg font-semibold text-gray-900">Zeiterfassung</h4>
                  <p className="text-sm text-gray-500 mt-1">
                    {isAdmin ? 'Arbeitszeiten aller Mitarbeiter verwalten' : 'Eigene Arbeitszeiten erfassen'}
                  </p>
                </div>
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>

          {isAdmin && (
            <Link href="/v7/firma/projekte" className="block">
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md hover:border-green-200 transition-all cursor-pointer">
                <div className="flex items-start space-x-4">
                  <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center">
                    <span className="text-3xl">📁</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-lg font-semibold text-gray-900">Projekte</h4>
                    <p className="text-sm text-gray-500 mt-1">
                      Projekte und Arbeitspakete verwalten
                    </p>
                  </div>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>
          )}

          {isAdmin && (
            <Link href="/v7/firma/mitarbeiter" className="block">
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md hover:border-green-200 transition-all cursor-pointer">
                <div className="flex items-start space-x-4">
                  <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center">
                    <span className="text-3xl">👥</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-lg font-semibold text-gray-900">Mitarbeiter</h4>
                    <p className="text-sm text-gray-500 mt-1">
                      Mitarbeiter verwalten und einladen
                    </p>
                  </div>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>
          )}

          {isAdmin && (
            <Link href="/v7/firma/berichte" className="block">
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md hover:border-green-200 transition-all cursor-pointer">
                <div className="flex items-start space-x-4">
                  <div className="w-14 h-14 bg-orange-100 rounded-xl flex items-center justify-center">
                    <span className="text-3xl">📊</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-lg font-semibold text-gray-900">Berichte</h4>
                    <p className="text-sm text-gray-500 mt-1">
                      Auswertungen und Exporte
                    </p>
                  </div>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>
          )}
        </div>

        {/* ============================================ */}
        {/* FIRMENDATEN - 3-Spalten-Layout (nur Admin) */}
        {/* ============================================ */}
        {isAdmin && company && (
          <div className="mt-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Firmendaten</h3>
              <button
                onClick={openEditModal}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                Bearbeiten
              </button>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-100">
                {/* Spalte 1: Logo */}
                <div className="p-6 flex items-center justify-center bg-gray-50">
                  {company.logo_url ? (
                    <img 
                      src={company.logo_url} 
                      alt={`${company.name} Logo`}
                      className="max-h-24 max-w-full object-contain"
                    />
                  ) : (
                    <div className="text-center text-gray-400">
                      <svg className="w-16 h-16 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      <p className="text-sm">Kein Logo</p>
                    </div>
                  )}
                </div>

                {/* Spalte 2: Firmendaten */}
                <div className="p-6">
                  <p className="font-semibold text-gray-900 text-lg">
                    {company.legal_name || company.name}
                  </p>
                  {company.legal_name && company.name !== company.legal_name && (
                    <p className="text-sm text-gray-500 mb-2">({company.name})</p>
                  )}
                  <p className="text-gray-600 mt-2">
                    {company.street || '-'}
                  </p>
                  <p className="text-gray-600">
                    {company.zip_code} {company.city}
                  </p>
                  {company.vat_id && (
                    <p className="text-gray-500 text-sm mt-3">
                      USt-ID: {company.vat_id}
                    </p>
                  )}
                </div>

                {/* Spalte 3: Ansprechpartner */}
                <div className="p-6">
                  <p className="font-medium text-gray-900">
                    {company.contact_person || '-'}
                  </p>
                  {company.contact_email && (
                    <p className="text-gray-600 mt-1">
                      <a href={`mailto:${company.contact_email}`} className="hover:text-green-600">
                        {company.contact_email}
                      </a>
                    </p>
                  )}
                  {company.contact_phone && (
                    <p className="text-gray-600 mt-1">
                      <a href={`tel:${company.contact_phone}`} className="hover:text-green-600">
                        {company.contact_phone}
                      </a>
                    </p>
                  )}
                  {company.website && (
                    <p className="text-gray-600 mt-1">
                      <a 
                        href={company.website.startsWith('http') ? company.website : `https://${company.website}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="hover:text-green-600"
                      >
                        {company.website.replace(/^https?:\/\//, '')}
                      </a>
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Hinweis für normale Mitarbeiter */}
        {!isAdmin && (
          <div className="mt-8 bg-green-50 border border-green-100 rounded-xl p-6">
            <div className="flex items-start space-x-3">
              <span className="text-2xl">💡</span>
              <div>
                <h4 className="font-medium text-green-900">Tipp</h4>
                <p className="text-sm text-green-700 mt-1">
                  Erfassen Sie Ihre Arbeitszeiten regelmäßig über den Bereich "Zeiterfassung". 
                  Bei Fragen wenden Sie sich an Ihren Projektleiter.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ============================================ */}
      {/* MODAL: Firmendaten bearbeiten */}
      {/* ============================================ */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                Firmendaten bearbeiten
              </h3>
              <button
                onClick={closeEditModal}
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
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {successMessage}
                </div>
              )}

              {/* Fehlermeldung */}
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {formError}
                </div>
              )}

              {/* Logo Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Firmenlogo
                </label>
                <div className="flex items-center gap-4">
                  <div className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50 overflow-hidden">
                    {logoPreview ? (
                      <img 
                        src={logoPreview} 
                        alt="Logo Vorschau"
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/svg+xml,image/webp"
                      onChange={handleLogoSelect}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
                    >
                      Logo auswählen
                    </button>
                    <p className="text-xs text-gray-500 mt-1">
                      PNG, JPG, SVG oder WebP. Max. 2MB.
                    </p>
                  </div>
                </div>
              </div>

              {/* Firmendaten */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Firmenname (Kurzform) *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Muster GmbH"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vollständiger Firmenname (juristisch)
                  </label>
                  <input
                    type="text"
                    name="legal_name"
                    value={formData.legal_name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Muster Gesellschaft mit beschränkter Haftung"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Straße und Hausnummer
                  </label>
                  <input
                    type="text"
                    name="street"
                    value={formData.street}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Musterstadt"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    USt-ID
                  </label>
                  <input
                    type="text"
                    name="vat_id"
                    value={formData.vat_id}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="DE123456789"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Website
                  </label>
                  <input
                    type="text"
                    name="website"
                    value={formData.website}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="www.firma.de"
                  />
                </div>
              </div>

              {/* Ansprechpartner */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Ansprechpartner</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      name="contact_person"
                      value={formData.contact_person}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Max Mustermann"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      E-Mail
                    </label>
                    <input
                      type="email"
                      name="contact_email"
                      value={formData.contact_email}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="kontakt@firma.de"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="+49 123 456789"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
              <button
                onClick={closeEditModal}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100"
                disabled={saving}
              >
                Abbrechen
              </button>
              <button
                onClick={handleSave}
                disabled={saving || uploadingLogo || !!successMessage}
                className="px-4 py-2 text-white rounded-lg hover:opacity-90 disabled:bg-gray-400 flex items-center gap-2"
                style={{ backgroundColor: COLORS.firmenPortal }}
              >
                {saving || uploadingLogo ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    {uploadingLogo ? 'Logo wird hochgeladen...' : 'Speichern...'}
                  </>
                ) : (
                  'Speichern'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-sm text-gray-500">
            Projektzeiterfassung v7.3 · Firmen-Portal · © {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
}