'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Schritt 1: User-Daten
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [adminName, setAdminName] = useState('');

  // Schritt 2: Firmendaten
  const [companyData, setCompanyData] = useState({
    name: '',
    street: '',
    house_number: '',
    zip: '',
    city: '',
    state_code: '',
    legal_form: '',
    vat_id: '',
    email: '',
    website: ''
  });

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      console.log('Starting registration...');

      // 1. User in Supabase Auth registrieren
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: adminName,
            role: 'company_admin'
          }
        }
      });

      if (authError) {
        console.error('Auth error:', authError);
        throw authError;
      }

      if (!authData.user) {
        throw new Error('Registrierung fehlgeschlagen - kein User erstellt');
      }

      console.log('User created:', authData.user.id);

      // 2. Company erstellen
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .insert([{
          name: companyData.name,
          street: companyData.street,
          house_number: companyData.house_number,
          zip: companyData.zip,
          city: companyData.city,
          state_code: companyData.state_code,
          country: 'DE',
          legal_form: companyData.legal_form || null,
          vat_id: companyData.vat_id || null,
          email: companyData.email || null,
          website: companyData.website || null,
          admin_id: authData.user.id
        }])
        .select()
        .single();

      if (companyError) {
        console.error('Company error:', companyError);
        throw companyError;
      }

      console.log('Company created:', company.id);

      // 3. User-Profil als Company-Admin erstellen
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert([{
          user_id: authData.user.id,
          company_id: company.id,
          role: 'company_admin',
          name: adminName,
          email: email
        }]);

      if (profileError) {
        console.error('Profile error:', profileError);
        throw profileError;
      }

      console.log('Profile created successfully');

      // 4. Auto-Login (User ist bereits eingeloggt nach signUp)
      console.log('Registration complete! Redirecting to dashboard...');
      
      // Kurz warten damit die Session gesetzt wird
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      router.push('/dashboard');
      router.refresh();

    } catch (error: any) {
      console.error('Registration error:', error);
      setError(error.message || 'Registrierung fehlgeschlagen');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Firma registrieren
          </h1>
          <p className="text-gray-600">
            Erstellen Sie Ihren Company-Admin Account und registrieren Sie Ihre Firma
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className={`text-sm font-medium ${step >= 1 ? 'text-green-600' : 'text-gray-400'}`}>
              1. Admin-Account
            </span>
            <span className={`text-sm font-medium ${step >= 2 ? 'text-green-600' : 'text-gray-400'}`}>
              2. Firmendaten
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-green-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(step / 2) * 100}%` }}
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister}>
          {/* Schritt 1: Admin-Daten */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ihr Name *
                </label>
                <input
                  type="text"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Max Mustermann"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  E-Mail *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="max@firma.de"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Passwort *
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Mindestens 6 Zeichen"
                  required
                  minLength={6}
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  if (email && password && adminName) {
                    setStep(2);
                  } else {
                    setError('Bitte füllen Sie alle Felder aus');
                  }
                }}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition-colors"
              >
                Weiter zu Firmendaten
              </button>
            </div>
          )}

          {/* Schritt 2: Firmendaten */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Firmenname *
                </label>
                <input
                  type="text"
                  value={companyData.name}
                  onChange={(e) => setCompanyData({ ...companyData, name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Straße *
                  </label>
                  <input
                    type="text"
                    value={companyData.street}
                    onChange={(e) => setCompanyData({ ...companyData, street: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nr. *
                  </label>
                  <input
                    type="text"
                    value={companyData.house_number}
                    onChange={(e) => setCompanyData({ ...companyData, house_number: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    PLZ *
                  </label>
                  <input
                    type="text"
                    value={companyData.zip}
                    onChange={(e) => setCompanyData({ ...companyData, zip: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ort *
                  </label>
                  <input
                    type="text"
                    value={companyData.city}
                    onChange={(e) => setCompanyData({ ...companyData, city: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bundesland *
                </label>
                <select
                  value={companyData.state_code}
                  onChange={(e) => setCompanyData({ ...companyData, state_code: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rechtsform
                </label>
                <select
                  value={companyData.legal_form}
                  onChange={(e) => setCompanyData({ ...companyData, legal_form: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="">Bitte auswählen</option>
                  <option value="GmbH">GmbH</option>
                  <option value="UG">UG (haftungsbeschränkt)</option>
                  <option value="AG">AG</option>
                  <option value="KG">KG</option>
                  <option value="OHG">OHG</option>
                  <option value="GbR">GbR</option>
                  <option value="Einzelunternehmen">Einzelunternehmen</option>
                </select>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 rounded-lg transition-colors"
                >
                  Zurück
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:bg-gray-400"
                >
                  {loading ? 'Erstelle Account...' : 'Firma registrieren'}
                </button>
              </div>
            </div>
          )}
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          Bereits registriert?{' '}
          <button
            onClick={() => router.push('/login')}
            className="text-green-600 hover:text-green-700 font-semibold"
          >
            Zum Login
          </button>
        </div>
      </div>
    </div>
  );
}