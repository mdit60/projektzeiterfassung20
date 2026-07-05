// src/app/login/page.tsx
// VERSION: v7.3.90-8 - Login akzeptiert E-Mail ODER Benutzername
// DATUM: 05. Juli 2026
// v7.3.90-8: NEU: Eingabefeld akzeptiert zusaetzlich zur E-Mail auch einen
//   Benutzernamen. Enthaelt die Eingabe kein "@", wird sie ueber
//   /api/v7/resolve-username in die hinterlegte E-Mail aufgeloest, bevor
//   signInWithPassword aufgerufen wird. Bei nicht gefundenem Benutzernamen
//   erscheint dieselbe generische Fehlermeldung wie bei falschem Passwort
//   (kein Hinweis, ob der Benutzername existiert).
// v7.3.90-7: FIX: Fuer Nicht-system_admin wird pze_mode aus v7_system_config
//   (cockpit_berater_enabled) gelesen und in localStorage gesetzt.
//   Berater landen automatisch im Cockpit wenn Admin es freigibt.
// v7.3.90-6: Login-Redirect: pze_mode='app' -> App-Cockpit
// v7.3.90-5: FIX: Fragment-Wrapper damit PortalFooter valides JSX-Sibling ist
// v7.3.90-4: Footer ersetzt durch PortalFooter (fixed, navy, print:hidden)
// v7.3.90-3: Footer PZE Projektzeiterfassung + Impressum/AGB
// v7.3.90-2: Passwort-Sichtbarkeit Toggle (Augensymbol)

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import PortalFooter from '@/components/shared/PortalFooter';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // v7.3.90-8: Enthaelt die Eingabe kein "@", wird sie als Benutzername
      // behandelt und zuerst in die hinterlegte E-Mail aufgeloest.
      let loginEmail = email.trim();
      if (!loginEmail.includes('@')) {
        const resolveResponse = await fetch('/api/v7/resolve-username', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: loginEmail }),
        });
        const resolveResult = await resolveResponse.json();
        if (!resolveResult.success || !resolveResult.email) {
          throw new Error('Login fehlgeschlagen. Bitte Zugangsdaten pruefen.');
        }
        loginEmail = resolveResult.email;
      }

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password,
      });

      if (signInError) throw signInError;

      if (data.user) {
        // Rollenbasierter Redirect
        const { data: profile } = await supabase
          .from('v7_user_profiles')
          .select('role, consultant_company_id, client_company_id')
          .eq('email', data.user.email)
          .maybeSingle();

        if (profile) {
          // V7-Profil vorhanden
          if (profile.role === 'consultant' || profile.role === 'system_admin') {
            // v7.3.90-7: Cockpit-Modus aus DB-Config bestimmen
            let isAppMode = false;

            if (profile.role === 'system_admin') {
              // system_admin: localStorage-Switcher hat Vorrang
              isAppMode = typeof window !== 'undefined' && localStorage.getItem('pze_mode') === 'app';
            } else {
              // consultant: DB-Config entscheidet, localStorage wird synchronisiert
              const { data: configData } = await supabase
                .from('v7_system_config')
                .select('value')
                .eq('key', 'cockpit_berater_enabled')
                .single();
              isAppMode = configData?.value === 'true';
              if (typeof window !== 'undefined') {
                localStorage.setItem('pze_mode', isAppMode ? 'app' : 'classic');
              }
            }

            router.push(isAppMode ? '/v7/berater/app/cockpit' : '/v7/berater');
          } else {
            router.push('/v7/firma');
          }
        } else {
          // Kein V7-Profil -> V6 Dashboard (Fallback)
          router.push('/dashboard');
        }
      }
    } catch (error: any) {
      console.error('Login error:', error);
      setError(error.message || 'Login fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 text-white text-2xl font-bold rounded-xl mb-4">
            PZE
          </div>
          <h2 className="text-3xl font-bold text-gray-900">
            Projektzeiterfassung
          </h2>
          <p className="mt-2 text-gray-600">
            Melden Sie sich an
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <form className="space-y-6" onSubmit={handleLogin}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                E-Mail oder Benutzername
              </label>
              <input
                id="email"
                name="email"
                type="text"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="name@firma.de oder Benutzername"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Passwort
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Passwort eingeben"
                />
                <button
                  type="button"
                  onMouseDown={() => setShowPassword(true)}
                  onMouseUp={() => setShowPassword(false)}
                  onMouseLeave={() => setShowPassword(false)}
                  onTouchStart={() => setShowPassword(true)}
                  onTouchEnd={() => setShowPassword(false)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600 focus:outline-none"
                  tabIndex={-1}
                  aria-label="Passwort anzeigen (gedrueckt halten)"
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Wird angemeldet...
                </span>
              ) : (
                'Anmelden'
              )}
            </button>
          </form>
        </div>

        {/* Footer - PortalFooter (fixed, navy, print:hidden) */}
      </div>
    </div>
    <PortalFooter />
    </>
  );
}
