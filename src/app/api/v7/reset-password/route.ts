// src/app/api/v7/reset-password/route.ts
// ============================================================================
// PZE V7 - Passwort zuruecksetzen (Admin)
// ============================================================================
// Datum: 16. Februar 2026
// Version: 7.3.91-1
//
// Ermoeglicht Beratern (system_admin, consultant) das Zuruecksetzen
// von Passwoertern fuer Firmen-Mitarbeiter.
//
// POST Request:
// - Body: { userId: string, newPassword: string }
// - Erfordert authentifizierten Benutzer mit system_admin/consultant Rolle
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase Admin Client mit Service Role Key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  try {
    // 1. Request Body lesen
    const { userId, newPassword } = await request.json();

    if (!userId || !newPassword) {
      return NextResponse.json(
        { error: 'userId und newPassword sind erforderlich.' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Passwort muss mindestens 6 Zeichen lang sein.' },
        { status: 400 }
      );
    }

    // 2. Authentifizierung pruefen - Token aus Header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Nicht authentifiziert.' },
        { status: 401 }
      );
    }

    // Normalen Supabase Client fuer Auth-Check erstellen
    const { createClient: createBrowserClient } = await import('@supabase/supabase-js');
    const supabaseAuth = createBrowserClient(
      supabaseUrl,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: callerUser }, error: authError } = await supabaseAuth.auth.getUser(token);

    if (authError || !callerUser) {
      return NextResponse.json(
        { error: 'Nicht authentifiziert.' },
        { status: 401 }
      );
    }

    // 3. Berechtigung pruefen - nur system_admin und consultant duerfen PW aendern
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { data: callerProfile } = await supabaseAdmin
      .from('v7_user_profiles')
      .select('role')
      .eq('id', callerUser.id)
      .single();

    if (!callerProfile || !['system_admin', 'consultant'].includes(callerProfile.role)) {
      return NextResponse.json(
        { error: 'Keine Berechtigung. Nur Berater koennen Passwoerter zuruecksetzen.' },
        { status: 403 }
      );
    }

    // 4. Passwort aendern via Admin API
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );

    if (updateError) {
      console.error('Fehler beim Passwort-Reset:', updateError);
      return NextResponse.json(
        { error: `Fehler: ${updateError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Passwort erfolgreich zurueckgesetzt.'
    });

  } catch (err: unknown) {
    console.error('Unerwarteter Fehler beim Passwort-Reset:', err);
    return NextResponse.json(
      { error: 'Unerwarteter Serverfehler.' },
      { status: 500 }
    );
  }
}
