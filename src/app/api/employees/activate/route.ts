// ==================================================
// Datei: src/app/api/employees/activate/route.ts
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
        { error: 'Keine Berechtigung. Nur Admins können Mitarbeiter aktivieren.' },
        { status: 403 }
      );
    }

    // Mitarbeiter aktivieren
    const { data: employee, error } = await supabase
      .from('user_profiles')
      .update({ 
        is_active: true,
        deactivated_at: null
      })
      .eq('id', employeeId)
      .eq('company_id', adminProfile.company_id)
      .select('name')
      .single();

    if (error) {
      throw error;
    }

    if (!employee) {
      return NextResponse.json(
        { error: 'Mitarbeiter nicht gefunden' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `${employee.name} wurde aktiviert`
    });

  } catch (error: any) {
    console.error('Error activating employee:', error);
    return NextResponse.json(
      { error: error.message || 'Fehler beim Aktivieren des Mitarbeiters' },
      { status: 500 }
    );
  }
}