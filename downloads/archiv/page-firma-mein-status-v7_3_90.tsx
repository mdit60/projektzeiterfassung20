// src/app/v7/firma/mein-status/page.tsx
// ============================================================================
// PZE V7 - Mein Status (Platzhalter)
// ============================================================================
// Datum: 12. Februar 2026
// Version: 7.3.90
//
// Platzhalter-Seite fuer "Mein Status".
// Zeigt spaeter: Eigene Zeiterfassungs-Statistik, offene Monate, etc.
// ============================================================================

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import PortalHeader from '@/components/shared/PortalHeader';
import PortalNav from '@/components/shared/PortalNav';
import { BarChart3, CalendarClock } from 'lucide-react';

type PortalRole = 'client_admin' | 'project_leader' | 'employee';

export default function MeinStatusPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [portalRole, setPortalRole] = useState<PortalRole>('employee');

  useEffect(() => {
    async function loadData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login');
          return;
        }

        const { data: profile } = await supabase
          .from('v7_user_profiles')
          .select('display_name, role, client_company_id')
          .eq('id', user.id)
          .single();

        if (!profile || !profile.client_company_id) {
          router.push('/login');
          return;
        }

        setUserName(profile.display_name || user.email || '');
        setUserEmail(user.email || '');

        const { data: company } = await supabase
          .from('v7_client_companies')
          .select('name')
          .eq('id', profile.client_company_id)
          .single();

        if (company) setCompanyName(company.name || '');

        // Portal-Rolle ermitteln
        if (profile.role === 'client_admin') {
          setPortalRole('client_admin');
        } else {
          const { data: emp } = await supabase
            .from('v7_employees')
            .select('portal_role')
            .eq('user_id', user.id)
            .eq('client_company_id', profile.client_company_id)
            .single();
          if (emp?.portal_role) {
            setPortalRole(emp.portal_role as PortalRole);
          }
        }
      } catch (err) {
        console.error('MeinStatus-Fehler:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-green-200 border-t-green-600 rounded-full animate-spin" />
      </div>
    );
  }

  const userRole = portalRole === 'client_admin' ? 'client_admin' : 'client_user';

  return (
    <div className="min-h-screen bg-gray-50">
      <PortalHeader
        portal="firma"
        userRole={userRole}
        portalRole={portalRole}
        userName={userName}
        userEmail={userEmail}
        companyName={companyName}
      />
      <PortalNav
        portal="firma"
        userRole={userRole}
        portalRole={portalRole}
        currentPath="/v7/firma/mein-status"
      />

      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded-xl border-2 border-dashed border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <BarChart3 className="w-8 h-8 text-amber-500" />
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Mein Status</h2>
          <p className="text-gray-500 mb-4">
            Hier sehen Sie kuenftig Ihre persoenliche Zeiterfassungs-Statistik,
            offene Monate und Projekt-Uebersichten.
          </p>
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-600 bg-amber-50 px-3 py-1 rounded-full">
            <CalendarClock size={14} />
            In Entwicklung
          </span>
        </div>
      </main>

      <footer className="bg-white border-t mt-8">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <p className="text-center text-xs text-gray-400">
            PZE v7.3.90 | {companyName}
          </p>
        </div>
      </footer>
    </div>
  );
}
