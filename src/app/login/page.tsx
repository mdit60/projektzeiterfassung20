// src/app/login/page.tsx
// VERSION: v7.3.85 - Login mit Auto-Profil-Erstellung
// DATUM: 24. Januar 2026
//
// NEU: Wenn User sich einloggt und kein v7_user_profiles Eintrag existiert,
// aber ein passender v7_employees Eintrag gefunden wird:
// - Legt automatisch das Profil an
// - Verknuepft Employee mit User
// - Leitet zum Firmen-Portal weiter

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
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
            router.push('/v7/berater');
          } else {
            router.push('/v7/firma');
          }
        } else {
          // Kein V7-Profil -> Pruefen ob Employee existiert und Profil automatisch anlegen
          const { data: employee } = await supabase
            .from('v7_employees')
            .select('id, display_name, client_company_id, portal_role')
            .eq('email', data.user.email!.toLowerCase())
            .eq('is_active', true)
            .maybeSingle();
          
          if (employee) {
            // Employee gefunden -> Profil anlegen und verknuepfen
            // Mapping: portal_role -> v7_user_role ENUM
            // employee/project_leader -> client_user, client_admin -> client_admin
            const roleMapping: Record<string, string> = {
              'employee': 'client_user',
              'project_leader': 'client_user',
              'client_admin': 'client_admin',
            };
            const newRole = roleMapping[employee.portal_role || 'employee'] || 'client_user';
            
            // Profil anlegen
            const { error: profileError } = await supabase
              .from('v7_user_profiles')
              .insert({
                id: data.user.id,
                email: data.user.email!.toLowerCase(),
                display_name: employee.display_name,
                role: newRole,
                client_company_id: employee.client_company_id,
                is_active: true,
              });
            
            if (!profileError) {
              // Employee mit User verknuepfen
              await supabase
                .from('v7_employees')
                .update({ 
                  user_id: data.user.id,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', employee.id);
              
              // Redirect zum Firmen-Portal
              router.push('/v7/firma');
            } else {
              console.error('Profil anlegen fehlgeschlagen:', profileError);
              setError('Profil konnte nicht angelegt werden. Bitte Administrator kontaktieren.');
            }
          } else {
            // Kein Employee gefunden -> nicht freigeschaltet
            setError('Ihr Konto ist noch nicht fuer V7 freigeschaltet. Bitte wenden Sie sich an Ihren Administrator.');
          }
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
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
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
                E-Mail
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="name@firma.de"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Passwort
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
              />
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

          <div className="mt-6 text-center">
            <Link href="/register" className="text-sm text-blue-600 hover:text-blue-800">
              Noch kein Konto? Jetzt registrieren
            </Link>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-gray-500">
          Projektzeiterfassung v7.1 Â· Â© {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
