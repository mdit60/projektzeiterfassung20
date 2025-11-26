'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

export default function MitarbeiterDetailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const employeeId = searchParams.get('id');

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentProfile, setCurrentProfile] = useState<any>(null);
  const [employee, setEmployee] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    role: 'employee',
    date_of_birth: '',
    education: '',
    job_title: '',
    annual_salary: '',
    bonus_payments: '',
    weekly_hours: '40',
    part_time_factor: '1.0',
    phone: '',
    address_street: '',
    address_house_number: '',
    address_zip: '',
    address_city: '',
    employment_start_date: '',
    employment_end_date: '',
    notes: ''
  });

  useEffect(() => {
    if (!employeeId) {
      router.push('/mitarbeiter');
      return;
    }
    loadData();
  }, [employeeId]);

  const loadData = async () => {
    try {
      // 1. Current User laden
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setCurrentUser(user);

      // 2. Current User Profil laden
      const { data: currentProfileData } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!currentProfileData) {
        setError('Ihr Profil konnte nicht geladen werden');
        return;
      }

      setCurrentProfile(currentProfileData);

      // 3. Berechtigung prüfen - Nur Admin und Manager dürfen Mitarbeiter bearbeiten
      if (currentProfileData.role !== 'company_admin' && currentProfileData.role !== 'manager') {
        setError('Keine Berechtigung. Nur Admins und Manager können Mitarbeiter bearbeiten.');
        setTimeout(() => router.push('/dashboard'), 2000);
        return;
      }

      // 4. Mitarbeiter laden
      const { data: employeeData, error: employeeError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', employeeId)
        .eq('company_id', currentProfileData.company_id)
        .single();

      if (employeeError || !employeeData) {
        setError('Mitarbeiter nicht gefunden');
        setTimeout(() => router.push('/mitarbeiter'), 2000);
        return;
      }

      setEmployee(employeeData);

      // Formular befüllen
      setFormData({
        first_name: employeeData.first_name || '',
        last_name: employeeData.last_name || '',
        email: employeeData.email || '',
        role: employeeData.role || 'employee',
        date_of_birth: employeeData.date_of_birth || '',
        education: employeeData.education || '',
        job_title: employeeData.job_title || '',
        annual_salary: employeeData.annual_salary?.toString() || '',
        bonus_payments: employeeData.bonus_payments?.toString() || '',
        weekly_hours: employeeData.weekly_hours?.toString() || '40',
        part_time_factor: employeeData.part_time_factor?.toString() || '1.0',
        phone: employeeData.phone || '',
        address_street: employeeData.address_street || '',
        address_house_number: employeeData.address_house_number || '',
        address_zip: employeeData.address_zip || '',
        address_city: employeeData.address_city || '',
        employment_start_date: employeeData.employment_start_date || '',
        employment_end_date: employeeData.employment_end_date || '',
        notes: employeeData.notes || ''
      });

    } catch (error: any) {
      console.error('Error loading data:', error);
      setError('Fehler beim Laden der Daten');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      // Validierung
      if (!formData.first_name.trim() || !formData.last_name.trim()) {
        throw new Error('Vor- und Nachname sind erforderlich');
      }

      // Anzeigename zusammensetzen
      const displayName = `${formData.first_name} ${formData.last_name}`;

      // Daten aktualisieren
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          name: displayName,
          first_name: formData.first_name,
          last_name: formData.last_name,
          role: formData.role,
          date_of_birth: formData.date_of_birth || null,
          education: formData.education || null,
          job_title: formData.job_title || null,
          annual_salary: formData.annual_salary ? parseFloat(formData.annual_salary) : null,
          bonus_payments: formData.bonus_payments ? parseFloat(formData.bonus_payments) : null,
          weekly_hours: formData.weekly_hours ? parseFloat(formData.weekly_hours) : 40,
          part_time_factor: formData.part_time_factor ? parseFloat(formData.part_time_factor) : 1.0,
          phone: formData.phone || null,
          address_street: formData.address_street || null,
          address_house_number: formData.address_house_number || null,
          address_zip: formData.address_zip || null,
          address_city: formData.address_city || null,
          employment_start_date: formData.employment_start_date || null,
          employment_end_date: formData.employment_end_date || null,
          notes: formData.notes || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', employeeId);

      if (updateError) {
        throw updateError;
      }

      setSuccess('Mitarbeiterdaten erfolgreich aktualisiert!');
      
      // Nach 2 Sekunden zurück zur Liste
      setTimeout(() => {
        router.push('/mitarbeiter');
      }, 2000);

    } catch (error: any) {
      console.error('Error saving:', error);
      setError(error.message || 'Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="text-lg font-medium text-gray-900 mb-2">Laden...</div>
          <div className="text-sm text-gray-600">Mitarbeiterdaten werden geladen</div>
        </div>
      </div>
    );
  }

  if (error && !employee) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
          <div className="text-red-600 text-center">
            <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h2 className="text-xl font-bold mb-2">Fehler</h2>
            <p className="text-gray-700">{error}</p>
          </div>
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
                onClick={() => router.push('/mitarbeiter')}
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="font-medium">Zurück zur Mitarbeiter-Liste</span>
              </button>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-600">{currentProfile?.name}</span>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Mitarbeiter bearbeiten
          </h1>
          <p className="text-gray-600">
            {employee?.name || 'Mitarbeiterdaten verwalten'}
          </p>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center">
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>{success}</span>
          </div>
        )}

        {/* Error Message */}
        {error && employee && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-8">
          {/* Persönliche Daten */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
              Persönliche Daten
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Vorname *
                </label>
                <input
                  type="text"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nachname *
                </label>
                <input
                  type="text"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Geburtsdatum
                </label>
                <input
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  E-Mail
                </label>
                <input
                  type="email"
                  value={formData.email}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100"
                  disabled
                  title="E-Mail kann nicht geändert werden"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Telefon
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="+49 123 456789"
                />
              </div>
            </div>
          </div>

          {/* Berufliche Daten */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
              Berufliche Daten
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rolle
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={currentProfile?.role !== 'company_admin'}
                >
                  <option value="employee">Mitarbeiter</option>
                  <option value="manager">Manager</option>
                  {currentProfile?.role === 'company_admin' && (
                    <option value="company_admin">Administrator</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Position / Berufsbezeichnung
                </label>
                <input
                  type="text"
                  value={formData.job_title}
                  onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="z.B. Softwareentwickler"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ausbildung / Qualifikation
                </label>
                <input
                  type="text"
                  value={formData.education}
                  onChange={(e) => setFormData({ ...formData, education: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="z.B. Bachelor Informatik"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Eintrittsdatum
                </label>
                <input
                  type="date"
                  value={formData.employment_start_date}
                  onChange={(e) => setFormData({ ...formData, employment_start_date: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Austrittsdatum <span className="text-gray-500">(optional)</span>
                </label>
                <input
                  type="date"
                  value={formData.employment_end_date}
                  onChange={(e) => setFormData({ ...formData, employment_end_date: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Arbeitszeit & Gehalt */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
              Arbeitszeit & Vergütung
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Wochenstunden
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.weekly_hours}
                  onChange={(e) => setFormData({ ...formData, weekly_hours: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="40"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Teilzeitfaktor
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={formData.part_time_factor}
                  onChange={(e) => setFormData({ ...formData, part_time_factor: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="1.0 = Vollzeit, 0.5 = Halbtags"
                />
                <p className="mt-1 text-xs text-gray-500">
                  1.0 = Vollzeit, 0.5 = 50% Teilzeit
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Jahresgehalt (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.annual_salary}
                  onChange={(e) => setFormData({ ...formData, annual_salary: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="50000.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sonderzahlungen (€/Jahr)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.bonus_payments}
                  onChange={(e) => setFormData({ ...formData, bonus_payments: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="5000.00"
                />
                <p className="mt-1 text-xs text-gray-500">
                  z.B. Weihnachtsgeld, Urlaubsgeld, Boni
                </p>
              </div>
            </div>
          </div>

          {/* Adresse */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
              Adresse <span className="text-sm font-normal text-gray-500">(optional)</span>
            </h2>
            <div className="grid grid-cols-1 gap-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Straße
                  </label>
                  <input
                    type="text"
                    value={formData.address_street}
                    onChange={(e) => setFormData({ ...formData, address_street: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nr.
                  </label>
                  <input
                    type="text"
                    value={formData.address_house_number}
                    onChange={(e) => setFormData({ ...formData, address_house_number: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    PLZ
                  </label>
                  <input
                    type="text"
                    value={formData.address_zip}
                    onChange={(e) => setFormData({ ...formData, address_zip: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ort
                  </label>
                  <input
                    type="text"
                    value={formData.address_city}
                    onChange={(e) => setFormData({ ...formData, address_city: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Notizen */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
              Notizen <span className="text-sm font-normal text-gray-500">(optional)</span>
            </h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Interne Notizen
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Interne Notizen zum Mitarbeiter..."
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => router.push('/mitarbeiter')}
              className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:bg-gray-400"
            >
              {saving ? 'Speichern...' : 'Änderungen speichern'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}