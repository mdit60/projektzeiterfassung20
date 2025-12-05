// ========================================
// Datei: src/app/einstellungen/page.tsx
// ========================================

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function EinstellungenPage() {
  const router = useRouter();
  const supabase = createClient();

  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    street: '',
    house_number: '',
    zip: '',
    city: '',
    state_code: '',
    legal_form: '',
    trade_register_city: '',
    trade_register_number: '',
    vat_id: '',
    email: '',
    website: '',
    num_employees: '',
    annual_revenue: '',
    balance_sheet_total: '',
    industry_wz_code: '',
    industry_description: ''
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        // 1. User laden
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login');
          return;
        }
        setUser(user);

        // 2. Profil laden
        const { data: profileData, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (profileError || !profileData) {
          setError('Profil konnte nicht geladen werden');
          return;
        }

        setProfile(profileData);

        // 3. Prüfen ob User Admin ist (geändert von company_admin zu admin)
        if (profileData.role !== 'admin') {
          setError('Keine Berechtigung. Nur Admins können Firmendaten bearbeiten.');
          setTimeout(() => router.push('/dashboard'), 2000);
          return;
        }

        // 4. Company laden
        const { data: companyData, error: companyError } = await supabase
          .from('companies')
          .select('*')
          .eq('id', profileData.company_id)
          .single();

        if (companyError || !companyData) {
          setError('Firmendaten konnten nicht geladen werden');
          return;
        }

        setCompany(companyData);

        // Formular mit Company-Daten befüllen
        setFormData({
          name: companyData.name || '',
          street: companyData.street || '',
          house_number: companyData.house_number || '',
          zip: companyData.zip || '',
          city: companyData.city || '',
          state_code: companyData.state_code || '',
          legal_form: companyData.legal_form || '',
          trade_register_city: companyData.trade_register_city || '',
          trade_register_number: companyData.trade_register_number || '',
          vat_id: companyData.vat_id || '',
          email: companyData.email || '',
          website: companyData.website || '',
          num_employees: companyData.num_employees?.toString() || '',
          annual_revenue: companyData.annual_revenue?.toString() || '',
          balance_sheet_total: companyData.balance_sheet_total?.toString() || '',
          industry_wz_code: companyData.industry_wz_code || '',
          industry_description: companyData.industry_description || ''
        });

      } catch (error: any) {
        console.error('Error loading data:', error);
        setError('Fehler beim Laden der Daten');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [supabase, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      // Validierung
      if (!formData.name.trim()) {
        throw new Error('Firmenname ist erforderlich');
      }

      // Prüfe ob ein anderes Unternehmen bereits diesen Namen hat
      const { data: existingCompany } = await supabase
        .from('companies')
        .select('id, name')
        .ilike('name', formData.name)
        .neq('id', company.id)
        .maybeSingle();

      if (existingCompany) {
        throw new Error(`Der Firmenname "${formData.name}" wird bereits verwendet.`);
      }

      // Daten aktualisieren
      const { error: updateError } = await supabase
        .from('companies')
        .update({
          name: formData.name,
          street: formData.street,
          house_number: formData.house_number,
          zip: formData.zip,
          city: formData.city,
          state_code: formData.state_code,
          legal_form: formData.legal_form || null,
          trade_register_city: formData.trade_register_city || null,
          trade_register_number: formData.trade_register_number || null,
          vat_id: formData.vat_id || null,
          email: formData.email || null,
          website: formData.website || null,
          num_employees: formData.num_employees ? parseInt(formData.num_employees) : null,
          annual_revenue: formData.annual_revenue ? parseFloat(formData.annual_revenue) : null,
          balance_sheet_total: formData.balance_sheet_total ? parseFloat(formData.balance_sheet_total) : null,
          industry_wz_code: formData.industry_wz_code || null,
          industry_description: formData.industry_description || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', company.id);

      if (updateError) {
        throw updateError;
      }

      setSuccess('Firmendaten erfolgreich aktualisiert!');
      
      // Nach 2 Sekunden zurück zum Dashboard
      setTimeout(() => {
        router.push('/dashboard');
        router.refresh();
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
          <div className="text-sm text-gray-600">Daten werden geladen</div>
        </div>
      </div>
    );
  }

  if (error && !company) {
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
                onClick={() => router.push('/dashboard')}
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="font-medium">Zurück zum Dashboard</span>
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Firmendaten bearbeiten</h1>
          <p className="text-gray-600">Aktualisieren Sie die Informationen zu Ihrem Unternehmen</p>
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
        {error && company && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-8">
          {/* Grunddaten */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
              Grunddaten
            </h2>
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Firmenname *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rechtsform
                  </label>
                  <select
                    value={formData.legal_form}
                    onChange={(e) => setFormData({ ...formData, legal_form: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Bitte auswählen</option>
                    <option value="GmbH">GmbH</option>
                    <option value="GmbH & Co. KG">GmbH & Co. KG</option>
                    <option value="UG">UG (haftungsbeschränkt)</option>
                    <option value="UG & Co. KG">UG (haftungsbeschränkt) & Co. KG</option>
                    <option value="AG">AG</option>
                    <option value="KG">KG</option>
                    <option value="OHG">OHG</option>
                    <option value="GbR">GbR</option>
                    <option value="Einzelunternehmen">Einzelunternehmen</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    USt-ID
                  </label>
                  <input
                    type="text"
                    value={formData.vat_id}
                    onChange={(e) => setFormData({ ...formData, vat_id: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="DE123456789"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Adresse */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
              Adresse
            </h2>
            <div className="grid grid-cols-1 gap-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Straße *
                  </label>
                  <input
                    type="text"
                    value={formData.street}
                    onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nr. *
                  </label>
                  <input
                    type="text"
                    value={formData.house_number}
                    onChange={(e) => setFormData({ ...formData, house_number: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    PLZ *
                  </label>
                  <input
                    type="text"
                    value={formData.zip}
                    onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ort *
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bundesland *
                </label>
                <select
                  value={formData.state_code}
                  onChange={(e) => setFormData({ ...formData, state_code: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Bitte auswählen</option>
                  <option value="DE-BW">Baden-Württemberg</option>
                  <option value="DE-BY">Bayern</option>
                  <option value="DE-BE">Berlin</option>
                  <option value="DE-BB">Brandenburg</option>
                  <option value="DE-HB">Bremen</option>
                  <option value="DE-HH">Hamburg</option>
                  <option value="DE-HE">Hessen</option>
                  <option value="DE-MV">Mecklenburg-Vorpommern</option>
                  <option value="DE-NI">Niedersachsen</option>
                  <option value="DE-NW">Nordrhein-Westfalen</option>
                  <option value="DE-RP">Rheinland-Pfalz</option>
                  <option value="DE-SL">Saarland</option>
                  <option value="DE-SN">Sachsen</option>
                  <option value="DE-ST">Sachsen-Anhalt</option>
                  <option value="DE-SH">Schleswig-Holstein</option>
                  <option value="DE-TH">Thüringen</option>
                </select>
              </div>
            </div>
          </div>

          {/* Kontaktdaten */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
              Kontaktdaten
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  E-Mail
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="info@firma.de"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Website
                </label>
                <input
                  type="text"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="www.firma.de"
                />
              </div>
            </div>
          </div>

          {/* Handelsregister (Optional) */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
              Handelsregister <span className="text-sm font-normal text-gray-500">(optional)</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Registergericht
                </label>
                <input
                  type="text"
                  value={formData.trade_register_city}
                  onChange={(e) => setFormData({ ...formData, trade_register_city: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="z.B. München"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Handelsregisternummer
                </label>
                <input
                  type="text"
                  value={formData.trade_register_number}
                  onChange={(e) => setFormData({ ...formData, trade_register_number: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="HRB 123456"
                />
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
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