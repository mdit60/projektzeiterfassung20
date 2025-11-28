// src/app/api/employees/anonymize/route.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { employeeId, reason } = await request.json();

    if (!employeeId) {
      return NextResponse.json(
        { error: 'Mitarbeiter-ID fehlt' },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    // Authentifizierung prüfen
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Nicht authentifiziert' },
        { status: 401 }
      );
    }

    // Admin-Rechte prüfen
    const { data: adminProfile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (adminProfile?.role !== 'company_admin') {
      return NextResponse.json(
        { error: 'Keine Berechtigung. Nur Company-Admins können Mitarbeiter anonymisieren.' },
        { status: 403 }
      );
    }

    // Mitarbeiter-Daten laden (vor Anonymisierung)
    const { data: employee } = await supabase
      .from('user_profiles')
      .select('user_id, name, email')
      .eq('id', employeeId)
      .single();

    if (!employee) {
      return NextResponse.json(
        { error: 'Mitarbeiter nicht gefunden' },
        { status: 404 }
      );
    }

    // Prüfen ob bereits anonymisiert
    if (employee.name.startsWith('Ehemaliger Mitarbeiter')) {
      return NextResponse.json(
        { error: 'Mitarbeiter wurde bereits anonymisiert' },
        { status: 400 }
      );
    }

    // Anonymisierung durchführen
    const { data: result, error: anonymizeError } = await supabase
      .rpc('anonymize_employee', { 
        employee_id: employeeId,
        reason: reason || 'DSGVO-Löschungsanfrage'
      });

    if (anonymizeError) {
      throw anonymizeError;
    }

    // Auth-User mit Service Role Key löschen
    const supabaseAdmin = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    await supabaseAdmin.auth.admin.deleteUser(employee.user_id);

    return NextResponse.json({
      success: true,
      message: `${employee.name} wurde erfolgreich anonymisiert`,
      details: {
        originalName: employee.name,
        originalEmail: employee.email,
        anonymizedAt: new Date().toISOString(),
        reason: reason || 'DSGVO-Löschungsanfrage',
        note: 'Projektdaten und Arbeitspakete bleiben erhalten'
      }
    });

  } catch (error: any) {
    console.error('Error anonymizing employee:', error);
    return NextResponse.json(
      { error: error.message || 'Fehler beim Anonymisieren des Mitarbeiters' },
      { status: 500 }
    );
  }
}