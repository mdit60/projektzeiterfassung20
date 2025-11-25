// src/app/dashboard/page.tsx
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (!user || userError) {
    redirect('/login');
  }

  const { data: companyUser, error: companyUserError } = await supabase
    .from('company_users')
    .select(`
      id,
      role,
      company_id,
      companies (
        name,
        city,
        state_code
      )
    `)
    .eq('user_id', user.id)
    .single();

  if (companyUserError || !companyUser) {
    console.error('Company-User nicht gefunden:', companyUserError);
    return (
      <div style={{ padding: 40 }}>
        <h1>Fehler</h1>
        <p>Keine Firmenzuordnung gefunden.</p>
      </div>
    );
  }

  const company = Array.isArray(companyUser.companies) 
    ? companyUser.companies[0] 
    : companyUser.companies;

  async function handleLogout() {
    'use server';
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect('/login');
  }

  return (
    <div style={{ padding: 40 }}>
      <h1>Willkommen!</h1>
      
      <div style={{ marginTop: 20, padding: 20, backgroundColor: '#f5f5f5', borderRadius: 8 }}>
        <p><strong>Email:</strong> {user.email}</p>
        <p><strong>Rolle:</strong> {companyUser.role}</p>
        <p><strong>Firma:</strong> {company?.name}</p>
        <p><strong>Standort:</strong> {company?.city}</p>
      </div>

      <div style={{ marginTop: 30 }}>
        {companyUser.role === 'company_admin' ? (
          <div>
            <h2>Admin-Bereich</h2>
            <ul>
              <li>Mitarbeiterverwaltung</li>
              <li>Projektverwaltung</li>
              <li>Zeitenübersicht</li>
            </ul>
          </div>
        ) : (
          <div>
            <h2>Mitarbeiter-Bereich</h2>
            <ul>
              <li>Meine Projekte</li>
              <li>Zeiterfassung</li>
            </ul>
          </div>
        )}
      </div>

      <form action={handleLogout} style={{ marginTop: 30 }}>
        <button
          type="submit"
          style={{
            padding: '10px 20px',
            backgroundColor: '#000',
            color: '#fff',
            border: 0,
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Logout
        </button>
      </form>
    </div>
  );
}