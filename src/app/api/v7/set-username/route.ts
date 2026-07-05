// src/app/api/v7/set-username/route.ts
// ============================================================================
// PZE V7 - API-Route: Eigenen Benutzernamen setzen/aendern
// ============================================================================
// Version: v1.0.0
// Datum: 05. Juli 2026
//
// Zweck:
//   Erlaubt einem eingeloggten Nutzer, seinen eigenen Benutzernamen zu setzen
//   oder zu aendern - analog zum bestehenden "Passwort aendern" im
//   PortalHeader. Aufgerufen aus dem User-Menue (Klick auf eigenen Namen).
//
// Sicherheit:
//   - Nur die Session des aufrufenden Nutzers wird verwendet, um dessen
//     eigene ID zu ermitteln (auth.uid() aus dem Cookie) - es kann NIEMALS
//     der Benutzername eines anderen Nutzers gesetzt werden.
//   - Service-Role-Key wird nur fuer die Eindeutigkeitspruefung und das
//     Update selbst verwendet, server-seitig, nie im Client.
//
// Request Body:
//   { username: string }   // 3-20 Zeichen, a-z 0-9 . _ -
//
// Response (Erfolg):
//   { success: true, username: string }
//
// Response (Fehler):
//   { success: false, error: string, code?: string }
//
// Fehler-Codes:
//   UNAUTHORIZED     - Nicht eingeloggt
//   USERNAME_FORMAT  - Format ungueltig
//   USERNAME_TAKEN   - Bereits vergeben
//   UPDATE_ERROR     - DB-Fehler beim Speichern
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const USERNAME_REGEX = /^[a-z0-9._-]{3,20}$/;

function errorResponse(error: string, code: string, status: number = 400) {
  return NextResponse.json({ success: false, error, code }, { status });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  // --------------------------------------------------------------------------
  // 1. Aufrufer authentifizieren (Session-Cookie)
  // --------------------------------------------------------------------------
  const cookieStore = await cookies();

  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component - ignorieren
          }
        },
      },
    }
  );

  const { data: { user: callerUser }, error: authError } = await supabaseAuth.auth.getUser();

  if (authError || !callerUser) {
    return errorResponse('Nicht authentifiziert', 'UNAUTHORIZED', 401);
  }

  // --------------------------------------------------------------------------
  // 2. Request-Body validieren
  // --------------------------------------------------------------------------
  let body: { username?: string };
  try {
    body = await request.json();
  } catch {
    return errorResponse('Ungueltiger Request-Body', 'USERNAME_FORMAT');
  }

  const username = (body.username || '').trim().toLowerCase();

  if (!USERNAME_REGEX.test(username)) {
    return errorResponse(
      'Benutzername ungueltig: 3-20 Zeichen, nur Kleinbuchstaben, Ziffern, Punkt, Unterstrich, Bindestrich erlaubt',
      'USERNAME_FORMAT'
    );
  }

  // --------------------------------------------------------------------------
  // 3. Admin-Client fuer Eindeutigkeitspruefung + Update
  // --------------------------------------------------------------------------
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

  // 3a. Bereits von einem ANDEREN Nutzer vergeben?
  const { data: existing } = await supabaseAdmin
    .from('v7_user_profiles')
    .select('id')
    .eq('username', username)
    .maybeSingle();

  if (existing && existing.id !== callerUser.id) {
    return errorResponse(`Benutzername "${username}" ist bereits vergeben`, 'USERNAME_TAKEN');
  }

  // 3b. Eigenes Profil aktualisieren
  const { error: updateError } = await supabaseAdmin
    .from('v7_user_profiles')
    .update({ username })
    .eq('id', callerUser.id);

  if (updateError) {
    // Race-Condition-Absicherung ueber DB-Unique-Index
    if ((updateError as any).code === '23505') {
      return errorResponse(`Benutzername "${username}" ist bereits vergeben`, 'USERNAME_TAKEN');
    }
    return errorResponse(`Benutzername konnte nicht gespeichert werden: ${updateError.message}`, 'UPDATE_ERROR');
  }

  return NextResponse.json({ success: true, username });
}
