import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
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

    // 1. Current User prüfen
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
    }

    // 2. Admin-Profil laden
    const { data: adminProfile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!adminProfile || (adminProfile.role !== 'company_admin' && adminProfile.role !== 'manager')) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
    }

    // 3. Request-Daten
    const body = await request.json();
    const { employeeId } = body;

    if (!employeeId) {
      return NextResponse.json({ error: 'Mitarbeiter-ID fehlt' }, { status: 400 });
    }

    // 4. Mitarbeiter laden
    const { data: employee } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', employeeId)
      .eq('company_id', adminProfile.company_id)
      .single();

    if (!employee) {
      return NextResponse.json({ error: 'Mitarbeiter nicht gefunden' }, { status: 404 });
    }

    // 5. Sich selbst kann man nicht deaktivieren
    if (employee.user_id === user.id) {
      return NextResponse.json({ error: 'Sie können sich nicht selbst deaktivieren' }, { status: 400 });
    }

    // 6. Deaktivieren
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        is_active: false,
        deactivated_at: new Date().toISOString(),
        deactivated_by: user.id
      })
      .eq('id', employeeId);

    if (updateError) {
      console.error('Error deactivating employee:', updateError);
      return NextResponse.json({ error: 'Fehler beim Deaktivieren' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Mitarbeiter wurde deaktiviert' 
    });

  } catch (error: any) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }
}