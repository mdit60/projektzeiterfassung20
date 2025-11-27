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

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
    }

    const { data: adminProfile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!adminProfile || (adminProfile.role !== 'company_admin' && adminProfile.role !== 'manager')) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
    }

    const body = await request.json();
    const { employeeId } = body;

    if (!employeeId) {
      return NextResponse.json({ error: 'Mitarbeiter-ID fehlt' }, { status: 400 });
    }

    // Aktivieren
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        is_active: true,
        deactivated_at: null,
        deactivated_by: null
      })
      .eq('id', employeeId);

    if (updateError) {
      return NextResponse.json({ error: 'Fehler beim Aktivieren' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Mitarbeiter wurde aktiviert' 
    });

  } catch (error: any) {
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }
}