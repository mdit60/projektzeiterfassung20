// src/app/api/v7/resolve-username/route.ts
// ============================================================================
// PZE V7 - API-Route: Benutzername zu E-Mail aufloesen (fuer Login)
// ============================================================================
// Version: v1.0.0
// Datum: 05. Juli 2026
//
// Zweck:
//   Wird von der Login-Seite aufgerufen, WENN der Nutzer statt einer E-Mail
//   einen Benutzernamen eingegeben hat. Liefert NUR die zugehoerige E-Mail-
//   Adresse zurueck - keine weiteren Profildaten. Anschliessend laeuft der
//   normale Login (signInWithPassword) mit der aufgeloesten E-Mail weiter,
//   client-seitig auf der Login-Seite.
//
// Sicherheit:
//   - Diese Route ist bewusst OHNE Session-Pruefung, da sie VOR dem Login
//     aufgerufen wird (der Nutzer ist noch nicht angemeldet).
//   - Nutzt den Service-Role-Key NUR server-seitig, nie im Client.
//   - Gibt bei "nicht gefunden" absichtlich dieselbe generische Antwort wie
//     bei einem Serverfehler zurueck (kein Unterschied im Response-Code),
//     damit ueber diese Route nicht ausprobiert werden kann, welche
//     Benutzernamen existieren.
//   - Liefert ausschliesslich das Feld "email" - sonst nichts aus dem Profil.
//
// Request Body:
//   { username: string }
//
// Response (gefunden):
//   { success: true, email: string }
//
// Response (nicht gefunden / Fehler):
//   { success: false }
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const USERNAME_REGEX = /^[a-z0-9._-]{3,20}$/;

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const username = (body?.username || '').trim().toLowerCase();

    if (!username || !USERNAME_REGEX.test(username)) {
      return NextResponse.json({ success: false });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const { data: profile } = await supabaseAdmin
      .from('v7_user_profiles')
      .select('email')
      .eq('username', username)
      .maybeSingle();

    if (!profile?.email) {
      return NextResponse.json({ success: false });
    }

    return NextResponse.json({ success: true, email: profile.email });
  } catch (err) {
    console.error('[resolve-username] Fehler:', err);
    return NextResponse.json({ success: false });
  }
}
