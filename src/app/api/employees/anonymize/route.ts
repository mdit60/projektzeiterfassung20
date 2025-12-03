// ==================================================
// Datei: src/app/api/employees/anonymize/route.ts
// Rolle: admin (statt company_admin)
// ==================================================

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { employeeId } = await request.json();

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

    // Admin-Rechte prüfen - GEÄNDERT: admin statt company_admin
    const { data: adminProfile } = await supabase
      .from('user_profiles')
      .select('role, company_id')
      .eq('user_id', user.id)
      .single();

    if (adminProfile?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Keine Berechtigung. Nur Admins können Mitarbeiter anonymisieren.' },
        { status: 403 }
      );
    }

    // Mitarbeiter-Daten laden
    const { data: employee } = await supabase
      .from('user_profiles')
      .select('user_id, name, email')
      .eq('id', employeeId)
      .eq('company_id', adminProfile.company_id)
      .single();

    if (!employee) {
      return NextResponse.json(
        { error: 'Mitarbeiter nicht gefunden' },
        { status: 404 }
      );
    }

    // Anonymisierte Daten generieren
    const anonymizedId = `anon_${Date.now()}`;
    const anonymizedEmail = `${anonymizedId}@deleted.local`;

    // Mitarbeiter anonymisieren (DSGVO-konform)
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        name: 'Gelöschter Mitarbeiter',
        first_name: null,
        last_name: null,
        email: anonymizedEmail,
        phone: null,
        birth_date: null,
        street: null,
        house_number: null,
        postal_code: null,
        city: null,
        country: null,
        qualification: null,
        job_function: null,
        department: null,
        personnel_number: null,
        is_active: false,
        deactivated_at: new Date().toISOString(),
        is_anonymized: true,
        anonymized_at: new Date().toISOString()
      })
      .eq('id', employeeId);

    if (updateError) {
      throw updateError;
    }

    // Auth-User deaktivieren (Login verhindern)
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

    // E-Mail ändern damit Login nicht mehr möglich
    await supabaseAdmin.auth.admin.updateUserById(employee.user_id, {
      email: anonymizedEmail,
      email_confirm: true
    });

    return NextResponse.json({
      success: true,
      message: `${employee.name} wurde DSGVO-konform anonymisiert. Zeiterfassungsdaten bleiben erhalten.`
    });

  } catch (error: any) {
    console.error('Error anonymizing employee:', error);
    return NextResponse.json(
      { error: error.message || 'Fehler beim Anonymisieren des Mitarbeiters' },
      { status: 500 }
    );
  }
}