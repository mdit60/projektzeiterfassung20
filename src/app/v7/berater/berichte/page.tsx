// src/app/v7/berater/berichte/page.tsx
// ============================================================================
// PZE V7 - Berichte Uebersicht (Berater-Portal - Firmenauswahl)
// ============================================================================
// Version: 7.4.4-1
// Datum: 10. Maerz 2026
//
// Neue Seite: Berater klickt "Berichte" in der Nav ->
// sieht Firmenauswahl -> klickt Firma -> geht zu firmenspez. Berichte-Seite
// ============================================================================

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import PortalHeader from '@/components/shared/PortalHeader';
import PortalNav from '@/components/shared/PortalNav';
import { BarChart3, ChevronRight, FolderKanban, Users } from 'lucide-react';

interface UserProfile {
  id: string;
  email: string;
  display_name: string | null;
  role: string;
}

interface Company {
  id: string;
  name: string;
  short_name: string | null;
  city: string | null;
}

interface CompanyStats {
  company: Company;
  projectCount: number;
  employeeCount: number;
}

export default function BeraterBerichteUebersichtPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [companyStats, setCompanyStats] = useState<CompanyStats[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/v7/login'); return; }

        const { data: profile, error: profileError } = await supabase
          .from('v7_user_profiles')
          .select('id, email, display_name, role')
          .eq('email', user.email)
          .maybeSingle();

        if (profileError || !profile) { setError('Kein Benutzerprofil gefunden'); return; }
        if (profile.role !== 'consultant' && profile.role !== 'system_admin') {
          router.push('/v7/login'); return;
        }
        setUserProfile(profile);

        // Alle Kundenfirmen laden
        const { data: companies, error: compError } = await supabase
          .from('v7_client_companies')
          .select('id, name, short_name, city')
          .eq('is_active', true)
          .order('name');

        if (compError || !companies) { setError('Firmen konnten nicht geladen werden'); return; }

        // Projektanzahl je Firma
        const statsPromises = companies.map(async (c) => {
          const { count: projectCount } = await supabase
            .from('v7_projects')
            .select('id', { count: 'exact', head: true })
            .eq('client_company_id', c.id)
            .eq('is_active', true);

          const { count: employeeCount } = await supabase
            .from('v7_employees')
            .select('id', { count: 'exact', head: true })
            .eq('client_company_id', c.id)
            .eq('is_active', true);

          return {
            company: c,
            projectCount: projectCount || 0,
            employeeCount: employeeCount || 0,
          };
        });

        const stats = await Promise.all(statsPromises);
        setCompanyStats(stats);

      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Lade...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PortalHeader portal="berater" userProfile={userProfile} />
      <PortalNav portal="berater" activeKey="berichte" userProfile={userProfile} />

      <main className="max-w-4xl mx-auto px-4 py-8">

        {/* Seitentitel */}
        <div className="mb-8 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Berichte & Controlling</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Firma auswaehlen um Berichte, Personalkosten und Zahlungsanforderungen aufzurufen
            </p>
          </div>
        </div>

        {/* Firmen-Kacheln */}
        {companyStats.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            Keine aktiven Kundenfirmen gefunden.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {companyStats.map(({ company, projectCount, employeeCount }) => (
              <button
                key={company.id}
                onClick={() => router.push(`/v7/berater/foerderung/firma/${company.id}/berichte`)}
                className="bg-white rounded-lg shadow hover:shadow-md border border-gray-200 hover:border-blue-300 transition-all p-5 text-left flex items-center justify-between group"
              >
                <div className="flex items-center gap-4">
                  {/* Firmen-Avatar */}
                  <div className="w-11 h-11 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {(company.short_name || company.name).substring(0, 2).toUpperCase()}
                  </div>

                  {/* Firmenname + Ort */}
                  <div>
                    <div className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
                      {company.name}
                    </div>
                    {company.short_name && (
                      <div className="text-xs text-gray-400">{company.short_name}</div>
                    )}
                    {company.city && (
                      <div className="text-xs text-gray-500 mt-0.5">{company.city}</div>
                    )}
                  </div>
                </div>

                {/* Rechte Seite: Badges + Pfeil */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <FolderKanban className="w-3.5 h-3.5" />
                    <span>{projectCount} {projectCount === 1 ? 'Projekt' : 'Projekte'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Users className="w-3.5 h-3.5" />
                    <span>{employeeCount} {employeeCount === 1 ? 'Mitarbeiter' : 'Mitarbeiter'}</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-blue-500 transition-colors" />
                </div>
              </button>
            ))}
          </div>
        )}

      </main>

      <footer className="text-center py-4 text-sm text-gray-500 mt-8">
        PZE v7.4.4 &middot; Berater-Portal
      </footer>
    </div>
  );
}
