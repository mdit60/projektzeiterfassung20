// ========================================
// Datei: src/app/register/page.tsx
// ========================================

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();

  // Step 1: Admin-Daten, Step 2: Firmendaten
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Admin-Daten (Step 1)
  const [adminData, setAdminData] = useState({
    name: '',
    email: '',
    password: '',
    passwordConfirm: ''
  });

  // Firmendaten (Step 2)
  const [companyData, setCompanyData] = useState({
    name: '',
    street: '',
    houseNumber: '',
    zip: '',
    city: '',
    stateCode: 'DE-BW',
    legalForm: 'GmbH',
    vatId: '',
    email: '',
    website: ''
  });

  const germanStates = [
    { code: 'DE-BW', name: 'Baden-WÃƒÂ¼rttemberg' },
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
    { code: 'DE-TH', name: 'ThÃƒÂ¼ringen' }
  ];

  const legalForms = ['GmbH', 'UG', 'AG', 'GbR', 'OHG', 'KG', 'e.K.', 'Einzelunternehmen', 'Sonstige'];

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validierung
    if (!adminData.name.trim() || !adminData.email.trim() || !adminData.password.trim()) {
      setError('Bitte fÃƒÂ¼llen Sie alle Pflichtfelder aus');
      return;
    }

    if (adminData.password.length < 6) {
      setError('Passwort muss mindestens 6 Zeichen lang sein');
      return;
    }

    if (adminData.password !== adminData.passwordConfirm) {
      setError('PasswÃƒÂ¶rter stimmen nicht ÃƒÂ¼berein');
      return;
    }

    // Email-Format prÃƒÂ¼fen
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(adminData.email)) {
      setError('Bitte geben Sie eine gÃƒÂ¼ltige E-Mail-Adresse ein');
      return;
    }

    setStep(2);
  };

  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validierung
      if (!companyData.name.trim() || !companyData.street.trim() || 
          !companyData.houseNumber.trim() || !companyData.zip.trim() || 
          !companyData.city.trim()) {
        throw new Error('Bitte fÃƒÂ¼llen Sie alle Pflichtfelder aus');
      }

      console.log('Ã°Å¸Å¡ Starting registration process...');

      // 1. PrÃƒÂ¼fen ob Firma bereits existiert
      const { data: existingCompany } = await supabase
        .from('companies')
        .select('id')
        .ilike('name', companyData.name.trim())
        .maybeSingle();

      if (existingCompany) {
        throw new Error('Eine Firma mit diesem Namen existiert bereits. Bitte wÃƒÂ¤hlen Sie einen anderen Namen.');
      }

      // 2. User in Supabase Auth erstellen
      console.log('Ã°Å¸ Creating auth user...');
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: adminData.email,
        password: adminData.password,
        options: {
          data: {
            name: adminData.name
          }
        }
      });

      if (authError) {
        console.error('Ã¢ÂÅ’ Auth error:', authError);
        throw new Error(authError.message);
      }

      if (!authData.user) {
        throw new Error('Benutzer konnte nicht erstellt werden');
      }

      console.log('Ã¢Å“ Auth user created:', authData.user.id);

      // 3. Warten bis Session aktiv ist
      console.log('Ã¢ÂÂ³ Waiting for session...');
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 4. Firma erstellen
      console.log('Ã°Å¸ÂÂ¢ Creating company...');
      const { data: newCompany, error: companyError } = await supabase
        .from('companies')
        .insert([{
          name: companyData.name.trim(),
          street: companyData.street.trim(),
          house_number: companyData.houseNumber.trim(),
          zip: companyData.zip.trim(),
          city: companyData.city.trim(),
          state_code: companyData.stateCode,
          country: 'DE',
          legal_form: companyData.legalForm,
          vat_id: companyData.vatId.trim() || null,
          email: companyData.email.trim() || null,
          website: companyData.website.trim() || null,
          admin_id: authData.user.id
        }])
        .select()
        .single();

      if (companyError) {
        console.error('Ã¢ÂÅ’ Company error:', companyError);
        throw new Error('Firma konnte nicht erstellt werden: ' + companyError.message);
      }

      console.log('Ã¢Å“ Company created:', newCompany.id);

      // 5. User-Profil erstellen
      console.log('Ã°Å¸ Creating user profile...');
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert([{
          user_id: authData.user.id,
          company_id: newCompany.id,
          role: 'admin',
          name: adminData.name.trim(),
          email: adminData.email.toLowerCase(),
          is_active: true
        }]);

      if (profileError) {
        console.error('Ã¢ÂÅ’ Profile error:', profileError);
        throw new Error('Benutzerprofil konnte nicht erstellt werden: ' + profileError.message);
      }

      console.log('Ã¢Å“ Profile created!');
      console.log('Ã°Å¸Å½ Registration complete! Redirecting to dashboard...');

      // 6. Weiterleitung zum Dashboard
      router.push('/dashboard');

    } catch (err: any) {
      console.error('Ã¢ÂÅ’ Registration error:', err);
      setError(err.message || 'Ein Fehler ist aufgetreten');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Projektzeiterfassung
          </h1>
          <p className="text-gray-600">
            {step === 1 ? 'Administrator-Account erstellen' : 'Firmendaten eingeben'}
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="flex items-center justify-center mb-8">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
          }`}>
            1
          </div>
          <div className={`w-24 h-1 ${step >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`} />
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
          }`}>
            2
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Step 1: Admin-Daten */}
        {step === 1 && (
          <form onSubmit={handleStep1Submit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ihr Name *
              </label>
              <input
                type="text"
                value={adminData.name}
                onChange={(e) => setAdminData({ ...adminData, name: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Max Mustermann"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                E-Mail-Adresse *
              </label>
              <input
                type="email"
                value={adminData.email}
                onChange={(e) => setAdminData({ ...adminData, email: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="ihre@email.de"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Passwort *
              </label>
              <input
                type="password"
                value={adminData.password}
                onChange={(e) => setAdminData({ ...adminData, password: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Mindestens 6 Zeichen"
                required
                minLength={6}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Passwort bestÃƒÂ¤tigen *
              </label>
              <input
                type="password"
                value={adminData.passwordConfirm}
                onChange={(e) => setAdminData({ ...adminData, passwordConfirm: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Passwort wiederholen"
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Weiter zu Firmendaten
            </button>

            <p className="text-center text-sm text-gray-600">
              Bereits registriert?{' '}
              <a href="/login" className="text-blue-600 hover:underline">
                Jetzt anmelden
              </a>
            </p>
          </form>
        )}

        {/* Step 2: Firmendaten */}
        {step === 2 && (
          <form onSubmit={handleStep2Submit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Firmenname *
                </label>
                <input
                  type="text"
                  value={companyData.name}
                  onChange={(e) => setCompanyData({ ...companyData, name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Muster GmbH"
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  StraÃƒÅ¸e *
                </label>
                <input
                  type="text"
                  value={companyData.street}
                  onChange={(e) => setCompanyData({ ...companyData, street: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="MusterstraÃƒÅ¸e"
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hausnummer *
                </label>
                <input
                  type="text"
                  value={companyData.houseNumber}
                  onChange={(e) => setCompanyData({ ...companyData, houseNumber: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="123"
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  PLZ *
                </label>
                <input
                  type="text"
                  value={companyData.zip}
                  onChange={(e) => setCompanyData({ ...companyData, zip: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="12345"
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Stadt *
                </label>
                <input
                  type="text"
                  value={companyData.city}
                  onChange={(e) => setCompanyData({ ...companyData, city: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Musterstadt"
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bundesland *
                </label>
                <select
                  value={companyData.stateCode}
                  onChange={(e) => setCompanyData({ ...companyData, stateCode: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  disabled={loading}
                >
                  {germanStates.map(state => (
                    <option key={state.code} value={state.code}>{state.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rechtsform *
                </label>
                <select
                  value={companyData.legalForm}
                  onChange={(e) => setCompanyData({ ...companyData, legalForm: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  disabled={loading}
                >
                  {legalForms.map(form => (
                    <option key={form} value={form}>{form}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  USt-ID (optional)
                </label>
                <input
                  type="text"
                  value={companyData.vatId}
                  onChange={(e) => setCompanyData({ ...companyData, vatId: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="DE123456789"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Firmen-E-Mail (optional)
                </label>
                <input
                  type="email"
                  value={companyData.email}
                  onChange={(e) => setCompanyData({ ...companyData, email: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="info@firma.de"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Website (optional)
                </label>
                <input
                  type="url"
                  value={companyData.website}
                  onChange={(e) => setCompanyData({ ...companyData, website: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://www.firma.de"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                disabled={loading}
              >
                ZurÃƒÂ¼ck
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:bg-gray-400"
              >
                {loading ? 'Wird registriert...' : 'Firma registrieren'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}