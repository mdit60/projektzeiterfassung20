// src/app/v7/berater/foerderung/page.tsx
// VERSION: v7.1.3 - Firmenübersicht mit CRUD (Anlegen/Bearbeiten/Löschen)
// DATUM: 03. Januar 2026

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
  created_at: string;
  project_count?: number;
  employee_count?: number;
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

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingCompany, setEditingCompany] = useState<ClientCompany | null>(null);
  const [formData, setFormData] = useState<CompanyFormData>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete Confirmation State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<ClientCompany | null>(null);

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

    const { data: companiesData, error: companiesError } = await supabase
      .from('v7_client_companies')
      .select('*')
      .eq('consultant_company_id', consultantCompanyId)
      .eq('is_active', true)
      .order('name');

    if (companiesError) {
      console.error('Firmen-Fehler:', companiesError);
      return;
    }

    const companiesWithCounts = await Promise.all(
      (companiesData || []).map(async (company) => {
        const { count: projectCount } = await supabase
          .from('v7_projects')
          .select('*', { count: 'exact', head: true })
          .eq('client_company_id', company.id)
          .eq('is_active', true);

        const { count: employeeCount } = await supabase
          .from('v7_employees')
          .select('*', { count: 'exact', head: true })
          .eq('client_company_id', company.id)
          .eq('is_active', true);

        return {
          ...company,
          project_count: projectCount || 0,
          employee_count: employeeCount || 0,
        };
      })
    );

    setCompanies(companiesWithCounts);
  };

  // ============================================
  // CRUD FUNKTIONEN
  // ============================================

  const openCreateModal = () => {
    setModalMode('create');
    setEditingCompany(null);
    setFormData(EMPTY_FORM);
    setFormError(null);
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
    });
    setFormError(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCompany(null);
    setFormData(EMPTY_FORM);
    setFormError(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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
        const { error: insertError } = await supabase
          .from('v7_client_companies')
          .insert({
            ...companyData,
            consultant_company_id: userProfile.consultant_company_id,
            is_active: true,
          });

        if (insertError) {
          if (insertError.code === '23505') {
            setFormError('Eine Firma mit diesem Namen existiert bereits');
          } else {
            setFormError(insertError.message);
          }
          return;
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
      }

      closeModal();
      await loadCompanies(userProfile.consultant_company_id);

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
      // Soft Delete - nur is_active auf false setzen
      const { error: deleteError } = await supabase
        .from('v7_client_companies')
        .update({ is_active: false, updated_at: new Date().toISOString() })
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

  // ============================================
  // FILTER
  // ============================================

  const filteredCompanies = companies.filter(company => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      company.name.toLowerCase().includes(search) ||
      (company.short_name && company.short_name.toLowerCase().includes(search)) ||
      (company.city && company.city.toLowerCase().includes(search))
    );
  });

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
      <header className="bg-[#002451] shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-4">
              <div className="bg-white rounded-lg px-3 py-1.5 text-sm font-bold text-[#002451]">
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
            <p className="text-gray-500">{companies.length} Firmen</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl font-bold text-blue-600">{companies.length}</div>
            <div className="text-sm text-gray-500 mt-1">Kundenfirmen</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl font-bold text-green-600">
              {companies.reduce((sum, c) => sum + (c.project_count || 0), 0)}
            </div>
            <div className="text-sm text-gray-500 mt-1">Förderprojekte gesamt</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl font-bold text-purple-600">
              {companies.reduce((sum, c) => sum + (c.employee_count || 0), 0)}
            </div>
            <div className="text-sm text-gray-500 mt-1">Mitarbeiter gesamt</div>
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
                <p className="text-gray-500">Keine Firma gefunden für "{searchTerm}"</p>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCompanies.map(company => (
              <div
                key={company.id}
                className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow relative group"
              >
                {/* Edit/Delete Buttons */}
                <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => openEditModal(company, e)}
                    className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded text-gray-600"
                    title="Bearbeiten"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => openDeleteConfirm(company, e)}
                    className="p-1.5 bg-gray-100 hover:bg-red-100 rounded text-gray-600 hover:text-red-600"
                    title="Löschen"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>

                <Link
                  href={`/v7/berater/foerderung/firma/${company.id}`}
                  className="block p-6"
                >
                  <div className="flex justify-between items-start mb-3 pr-16">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{company.name}</h3>
                      {company.short_name && (
                        <p className="text-sm text-gray-500">{company.short_name}</p>
                      )}
                    </div>
                  </div>

                  <div className="text-sm text-gray-500 mb-4 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {company.federal_state && (
                      <span>{BUNDESLAND_NAMES[company.federal_state] || company.federal_state}</span>
                    )}
                    {!company.federal_state && <span className="text-gray-400">Kein Bundesland</span>}
                  </div>

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
            ))}
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
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {formError}
                </div>
              )}

              {/* Firmenname */}
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
                    placeholder="GmbH / UG / AG..."
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
                    placeholder="Kürzel"
                  />
                </div>
              </div>

              {/* Adresse */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Straße
                </label>
                <input
                  type="text"
                  name="street"
                  value={formData.street}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Straße und Hausnummer"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                    placeholder="Ort"
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
                    <option value="">-- Auswählen --</option>
                    {BUNDESLAENDER.map(bl => (
                      <option key={bl.code} value={bl.code}>{bl.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Ansprechpartner */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ansprechpartner
                  </label>
                  <input
                    type="text"
                    name="contact_person"
                    value={formData.contact_person}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Name"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="email@firma.de"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Telefon
                  </label>
                  <input
                    type="tel"
                    name="contact_phone"
                    value={formData.contact_phone}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="+49..."
                  />
                </div>
              </div>

              {/* Notizen */}
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
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Abbrechen
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {saving && (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                )}
                {modalMode === 'create' ? 'Anlegen' : 'Speichern'}
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
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 text-center">
              <div className="text-red-500 text-5xl mb-4">🗑️</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Firma löschen?
              </h3>
              <p className="text-gray-600 mb-2">
                Möchten Sie <strong>{companyToDelete.name}</strong> wirklich löschen?
              </p>
              {((companyToDelete.project_count || 0) > 0 || (companyToDelete.employee_count || 0) > 0) && (
                <p className="text-amber-600 text-sm mb-4">
                  ⚠️ Diese Firma hat {companyToDelete.project_count} Projekt(e) und {companyToDelete.employee_count} Mitarbeiter.
                </p>
              )}
              <p className="text-gray-500 text-sm">
                Die Firma wird deaktiviert und kann später wiederhergestellt werden.
              </p>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t bg-gray-50">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setCompanyToDelete(null);
                }}
                className="flex-1 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Abbrechen
              </button>
              <button
                onClick={handleDelete}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {saving ? 'Lösche...' : 'Löschen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
