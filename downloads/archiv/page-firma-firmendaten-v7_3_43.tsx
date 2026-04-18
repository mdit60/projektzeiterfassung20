// src/app/v7/firma/firmendaten/page.tsx
// ============================================================================
// PZE V7 - Firmendaten (Firmen-Portal)
// ============================================================================
// Datum: 21. Januar 2026
// Version: 7.3.43
//
// Zeigt Stammdaten der eigenen Firma an
// client_admin kann Daten bearbeiten
// ============================================================================

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  User,
  Pencil,
  Save,
  X,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';

// Komponenten
import PortalHeader from '@/components/shared/PortalHeader';
import PortalNav from '@/components/shared/PortalNav';

// Types
import { V7UserRole, V7EmployeePortalRole, V7Employee, V7ClientCompany } from '@/types/v7-types';

// ============================================================================
// BUNDESLAENDER
// ============================================================================

const BUNDESLAENDER = [
  'Baden-Wuerttemberg',
  'Bayern',
  'Berlin',
  'Brandenburg',
  'Bremen',
  'Hamburg',
  'Hessen',
  'Mecklenburg-Vorpommern',
  'Niedersachsen',
  'Nordrhein-Westfalen',
  'Rheinland-Pfalz',
  'Saarland',
  'Sachsen',
  'Sachsen-Anhalt',
  'Schleswig-Holstein',
  'Thueringen',
];

// ============================================================================
// TYPEN
// ============================================================================

interface UserProfile {
  id: string;
  email: string;
  role: V7UserRole;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  client_company_id: string | null;
}

interface CompanyData {
  id: string;
  name: string;
  short_name: string | null;
  street: string | null;
  zip_code: string | null;
  city: string | null;
  federal_state: string | null;
  contact_person: string | null;
  contact_email: string | null;
  contact_phone: string | null;
}

// ============================================================================
// KOMPONENTE
// ============================================================================

export default function Firmendaten() {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  // State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [employee, setEmployee] = useState<V7Employee | null>(null);
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<CompanyData | null>(null);

  // ============================================================================
  // DATEN LADEN
  // ============================================================================

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        router.push('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('v7_user_profiles')
        .select('*')
        .eq('email', user.email)
        .maybeSingle();

      if (!profile || !profile.client_company_id) {
        setError('Kein Zugriff auf das Firmen-Portal');
        setLoading(false);
        return;
      }

      setUserProfile(profile);

      const { data: companyData } = await supabase
        .from('v7_client_companies')
        .select('id, name, short_name, street, zip_code, city, federal_state, contact_person, contact_email, contact_phone')
        .eq('id', profile.client_company_id)
        .single();

      if (companyData) {
        setCompany(companyData);
        setEditData(companyData);
      }

      const { data: employeeData } = await supabase
        .from('v7_employees')
        .select('*')
        .eq('client_company_id', profile.client_company_id)
        .eq('email', user.email)
        .maybeSingle();

      if (employeeData) setEmployee(employeeData);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // SPEICHERN
  // ============================================================================

  const handleSave = async () => {
    if (!editData || !company) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const { error: updateError } = await supabase
        .from('v7_client_companies')
        .update({
          name: editData.name,
          short_name: editData.short_name,
          street: editData.street,
          zip_code: editData.zip_code,
          city: editData.city,
          federal_state: editData.federal_state,
          contact_person: editData.contact_person,
          contact_email: editData.contact_email,
          contact_phone: editData.contact_phone,
        })
        .eq('id', company.id);

      if (updateError) throw updateError;

      setCompany(editData);
      setIsEditing(false);
      setSuccess('Firmendaten erfolgreich gespeichert');
      
      // Erfolgsmeldung nach 3 Sekunden ausblenden
      setTimeout(() => setSuccess(null), 3000);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditData(company);
    setIsEditing(false);
    setError(null);
  };

  // ============================================================================
  // HILFSFUNKTIONEN
  // ============================================================================

  const getUserName = (): string => {
    if (userProfile?.display_name) return userProfile.display_name;
    if (userProfile?.first_name && userProfile?.last_name) {
      return `${userProfile.first_name} ${userProfile.last_name}`;
    }
    return userProfile?.email?.split('@')[0] || 'Benutzer';
  };

  const getPortalRole = (): V7EmployeePortalRole => {
    if (userProfile?.role === 'client_admin') return 'client_admin';
    if (employee?.portal_role) return employee.portal_role;
    return 'employee';
  };

  const canEdit = (): boolean => {
    return userProfile?.role === 'client_admin' || employee?.portal_role === 'client_admin';
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-green-200 border-t-green-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error && !company) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  const userName = getUserName();
  const portalRole = getPortalRole();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <PortalHeader
        portal="firma"
        userName={userName}
        userRole={portalRole}
        companyName={company?.name || 'Firma'}
      />

      {/* Navigation */}
      <PortalNav
        portal="firma"
        userRole={userProfile?.role || 'client_user'}
        portalRole={portalRole}
        currentPath={pathname}
      />

      {/* Content */}
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Firmendaten</h1>
          
          {canEdit() && !isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg
                         hover:bg-green-700 transition-colors text-sm font-medium"
            >
              <Pencil size={18} />
              Bearbeiten
            </button>
          )}
        </div>

        {/* Erfolgsmeldung */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-green-800">{success}</span>
          </div>
        )}

        {/* Fehlermeldung */}
        {error && company && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span className="text-red-800">{error}</span>
          </div>
        )}

        {/* Firmendaten Card */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          
          {isEditing ? (
            // BEARBEITEN MODUS
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Firmenname */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Firmenname *
                  </label>
                  <input
                    type="text"
                    value={editData?.name || ''}
                    onChange={(e) => setEditData({ ...editData!, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg
                               focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>

                {/* Kurzname */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kurzname
                  </label>
                  <input
                    type="text"
                    value={editData?.short_name || ''}
                    onChange={(e) => setEditData({ ...editData!, short_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg
                               focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                {/* Bundesland */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bundesland
                  </label>
                  <select
                    value={editData?.federal_state || ''}
                    onChange={(e) => setEditData({ ...editData!, federal_state: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg
                               focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">-- Bitte waehlen --</option>
                    {BUNDESLAENDER.map(bl => (
                      <option key={bl} value={bl}>{bl}</option>
                    ))}
                  </select>
                </div>

                {/* Strasse */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Strasse
                  </label>
                  <input
                    type="text"
                    value={editData?.street || ''}
                    onChange={(e) => setEditData({ ...editData!, street: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg
                               focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                {/* PLZ */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    PLZ
                  </label>
                  <input
                    type="text"
                    value={editData?.zip_code || ''}
                    onChange={(e) => setEditData({ ...editData!, zip_code: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg
                               focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                {/* Ort */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ort
                  </label>
                  <input
                    type="text"
                    value={editData?.city || ''}
                    onChange={(e) => setEditData({ ...editData!, city: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg
                               focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                {/* Trennlinie */}
                <div className="md:col-span-2 border-t border-gray-200 pt-6 mt-2">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Ansprechpartner</h3>
                </div>

                {/* Ansprechpartner */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={editData?.contact_person || ''}
                    onChange={(e) => setEditData({ ...editData!, contact_person: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg
                               focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                {/* Telefon */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Telefon
                  </label>
                  <input
                    type="tel"
                    value={editData?.contact_phone || ''}
                    onChange={(e) => setEditData({ ...editData!, contact_phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg
                               focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                {/* E-Mail */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    E-Mail
                  </label>
                  <input
                    type="email"
                    value={editData?.contact_email || ''}
                    onChange={(e) => setEditData({ ...editData!, contact_email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg
                               focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-200">
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700
                             hover:bg-gray-50 transition-colors"
                  disabled={saving}
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !editData?.name}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg
                             hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Speichern...
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      Speichern
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            // ANZEIGE MODUS
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* Linke Spalte: Adresse */}
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                      <Building2 size={16} />
                      Firmenname
                    </div>
                    <p className="text-lg font-medium text-gray-900">{company?.name}</p>
                    {company?.short_name && (
                      <p className="text-sm text-gray-500">({company.short_name})</p>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                      <MapPin size={16} />
                      Adresse
                    </div>
                    <p className="text-gray-900">
                      {company?.street || '-'}
                    </p>
                    <p className="text-gray-900">
                      {company?.zip_code} {company?.city}
                    </p>
                    {company?.federal_state && (
                      <p className="text-sm text-gray-500">{company.federal_state}</p>
                    )}
                  </div>
                </div>

                {/* Rechte Spalte: Kontakt */}
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                      <User size={16} />
                      Ansprechpartner
                    </div>
                    <p className="text-gray-900">{company?.contact_person || '-'}</p>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                      <Phone size={16} />
                      Telefon
                    </div>
                    <p className="text-gray-900">{company?.contact_phone || '-'}</p>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                      <Mail size={16} />
                      E-Mail
                    </div>
                    {company?.contact_email ? (
                      <a 
                        href={`mailto:${company.contact_email}`}
                        className="text-green-600 hover:underline"
                      >
                        {company.contact_email}
                      </a>
                    ) : (
                      <p className="text-gray-900">-</p>
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>

      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <p className="text-center text-sm text-gray-500">
            PZE v7.3.43 - Firmen-Portal
          </p>
        </div>
      </footer>
    </div>
  );
}
