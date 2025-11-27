import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    
    // 1. Regular Supabase Client für Auth-Check
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

    // 2. Current User prüfen (Admin muss eingeloggt sein)
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Nicht authentifiziert' },
        { status: 401 }
      );
    }

    // 3. Profil des eingeloggten Users laden
    const { data: adminProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profileError || !adminProfile) {
      return NextResponse.json(
        { error: 'Profil nicht gefunden' },
        { status: 403 }
      );
    }

    // 4. Berechtigung prüfen
    if (adminProfile.role !== 'company_admin' && adminProfile.role !== 'manager') {
      return NextResponse.json(
        { error: 'Keine Berechtigung. Nur Admins und Manager können Mitarbeiter erstellen.' },
        { status: 403 }
      );
    }

    // 5. Request-Daten holen
    const body = await request.json();
    const { name, email, password, role } = body;

    // 6. Validierung
    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { error: 'Fehlende Pflichtfelder' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Passwort muss mindestens 6 Zeichen lang sein' },
        { status: 400 }
      );
    }

    // 7. Prüfe ob Email bereits existiert
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('email')
      .eq('email', email.toLowerCase())
      .eq('company_id', adminProfile.company_id)
      .maybeSingle();

    if (existingProfile) {
      return NextResponse.json(
        { error: 'Ein Mitarbeiter mit dieser E-Mail existiert bereits' },
        { status: 409 }
      );
    }

    console.log('🚀 Creating employee via Service Role API...');

    // 8. Supabase Admin Client mit Service Role Key
    // WICHTIG: Service Role Key darf NIEMALS im Frontend verwendet werden!
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found in environment');
      return NextResponse.json(
        { error: 'Server-Konfigurationsfehler. Bitte Administrator kontaktieren.' },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!, // Service Role Key - nur server-side!
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // 9. User über Admin API erstellen (ändert KEINE Browser-Session!)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Email als bestätigt markieren
      user_metadata: {
        name: name,
        role: role
      }
    });

    if (authError) {
      console.error('❌ Auth error:', authError);
      return NextResponse.json(
        { error: `Fehler beim Erstellen des Accounts: ${authError.message}` },
        { status: 500 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'User konnte nicht erstellt werden' },
        { status: 500 }
      );
    }

    console.log('✅ User created via Admin API:', authData.user.id);

    // 10. Profil erstellen (mit regular Client)
    const { error: profileInsertError } = await supabase
      .from('user_profiles')
      .insert([{
        user_id: authData.user.id,
        company_id: adminProfile.company_id,
        role: role,
        name: name,
        email: email.toLowerCase()
      }]);

    if (profileInsertError) {
      console.error('❌ Profile error:', profileInsertError);
      
      // Cleanup: User löschen wenn Profil nicht erstellt werden konnte
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      
      return NextResponse.json(
        { error: 'Fehler beim Erstellen des Profils' },
        { status: 500 }
      );
    }

    console.log('✅ Profile created');

    return NextResponse.json({
      success: true,
      user: {
        id: authData.user.id,
        email: email,
        name: name,
        role: role
      }
    });

  } catch (error: any) {
    console.error('❌ Server error:', error);
    return NextResponse.json(
      { error: error.message || 'Interner Serverfehler' },
      { status: 500 }
    );
  }
}