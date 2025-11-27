import { createClient } from '@supabase/supabase-js';
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
    }

    // 2. Admin-Profil laden (nur Company Admin darf löschen!)
    const { data: adminProfile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!adminProfile || adminProfile.role !== 'company_admin') {
      return NextResponse.json({ error: 'Keine Berechtigung. Nur Company-Admins können Mitarbeiter löschen.' }, { status: 403 });
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

    // 5. Sich selbst kann man nicht löschen
    if (employee.user_id === user.id) {
      return NextResponse.json({ error: 'Sie können sich nicht selbst löschen' }, { status: 400 });
    }

    console.log('🗑️ Deleting employee:', employee.email);

    // 6. Profil löschen
    const { error: profileDeleteError } = await supabase
      .from('user_profiles')
      .delete()
      .eq('id', employeeId);

    if (profileDeleteError) {
      console.error('Error deleting profile:', profileDeleteError);
      return NextResponse.json({ error: 'Fehler beim Löschen des Profils' }, { status: 500 });
    }

    console.log('✅ Profile deleted');

    // 7. User aus Auth löschen (nur mit Service Role Key möglich!)
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }
      );

      const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(employee.user_id);

      if (authDeleteError) {
        console.error('Error deleting auth user:', authDeleteError);
        // Profil ist schon gelöscht, Auth-User bleibt halt
        return NextResponse.json({ 
          success: true, 
          message: 'Mitarbeiter wurde gelöscht (Auth-User konnte nicht gelöscht werden)',
          warning: 'Auth-User konnte nicht gelöscht werden'
        });
      }

      console.log('✅ Auth user deleted');
    } else {
      console.warn('⚠️ Service Role Key not found - auth user not deleted');
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Mitarbeiter wurde vollständig gelöscht' 
    });

  } catch (error: any) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }
}