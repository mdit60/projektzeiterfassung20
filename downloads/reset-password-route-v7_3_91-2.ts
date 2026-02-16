// src/app/api/v7/reset-password/route.ts
// ============================================================================
// PZE V7 - Passwort zuruecksetzen (Admin)
// ============================================================================
// Datum: 16. Februar 2026
// Version: 7.3.91-2
//
// v7.3.91-2: Robuste Version mit Fallback-Lookup ueber Email
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
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

    // 2. Auth-Token pruefen
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Nicht authentifiziert (kein Token).' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');

    // Admin Client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // 3. Token validieren - Admin getUser kann alle Tokens validieren
    const { data: { user: callerUser }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !callerUser) {
      console.error('Auth-Fehler:', authError?.message, 'User:', callerUser?.id);
      return NextResponse.json(
        { error: `Nicht authentifiziert: ${authError?.message || 'kein User'}` },
        { status: 401 }
      );
    }

    // 4. Berechtigung pruefen - zuerst ueber ID, dann Fallback ueber Email
    let callerRole: string | null = null;

    // Versuch 1: Lookup ueber ID
    const { data: profileById } = await supabaseAdmin
      .from('v7_user_profiles')
      .select('role')
      .eq('id', callerUser.id)
      .maybeSingle();

    if (profileById) {
      callerRole = profileById.role;
    } else {
      // Versuch 2: Fallback ueber Email
      console.log('Profil nicht ueber ID gefunden, versuche Email:', callerUser.email);
      const { data: profileByEmail } = await supabaseAdmin
        .from('v7_user_profiles')
        .select('role')
        .eq('email', callerUser.email)
        .maybeSingle();

      if (profileByEmail) {
        callerRole = profileByEmail.role;
      }
    }

    if (!callerRole) {
      console.error('Kein Profil gefunden fuer User:', callerUser.id, callerUser.email);
      return NextResponse.json(
        { error: `Benutzerprofil nicht gefunden (ID: ${callerUser.id}, Email: ${callerUser.email}).` },
        { status: 403 }
      );
    }

    if (!['system_admin', 'consultant'].includes(callerRole)) {
      return NextResponse.json(
        { error: 'Keine Berechtigung. Nur Berater koennen Passwoerter zuruecksetzen.' },
        { status: 403 }
      );
    }

    // 5. Passwort aendern via Admin API
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
    console.error('Unerwarteter Fehler:', err);
    return NextResponse.json(
      { error: 'Unerwarteter Serverfehler.' },
      { status: 500 }
    );
  }
}
