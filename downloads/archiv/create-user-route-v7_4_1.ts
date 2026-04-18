// src/app/api/v7/create-user/route.ts
// ============================================================================
// PZE V7 - API Route: User erstellen (Server-seitig)
// ============================================================================
// Version: 7.4.1
// Datum: 26. Februar 2026
//
// Diese Route erstellt Auth-User ueber die Supabase Admin API.
// NUR server-seitig moeglich, da der Service Role Key benoetigt wird.
//
// Wird aufgerufen von:
//   - Foerderung-Seite (Neue Firma + Admin-User)
//   - EmployeeManagement (Login erstellen)
//
// WICHTIG: Der Service Role Key muss als Environment Variable gesetzt sein:
//   SUPABASE_SERVICE_ROLE_KEY (in Vercel UND lokal in .env.local)
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, display_name } = body;

    // Validierung
    if (!email || !password) {
      return NextResponse.json(
        { error: 'E-Mail und Passwort sind erforderlich' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Passwort muss mindestens 6 Zeichen haben' },
        { status: 400 }
      );
    }

    // Supabase Admin Client mit Service Role Key
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Fehlende Umgebungsvariablen: NEXT_PUBLIC_SUPABASE_URL oder SUPABASE_SERVICE_ROLE_KEY');
      return NextResponse.json(
        { error: 'Server-Konfigurationsfehler. Bitte Administrator kontaktieren.' },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // User erstellen ueber Admin API
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password: password,
      email_confirm: true, // Direkt bestaetigt, keine Bestaetigungs-E-Mail
      user_metadata: {
        display_name: display_name || email.split('@')[0],
      },
    });

    if (error) {
      console.error('Admin createUser Fehler:', error.message);

      // Spezifische Fehlermeldungen uebersetzen
      if (error.message.includes('already been registered') || error.message.includes('already exists')) {
        return NextResponse.json(
          { error: 'Diese E-Mail-Adresse ist bereits registriert.' },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    if (!data.user) {
      return NextResponse.json(
        { error: 'Benutzer konnte nicht erstellt werden.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
      },
    });

  } catch (err: any) {
    console.error('API create-user Fehler:', err);
    return NextResponse.json(
      { error: err.message || 'Unbekannter Fehler' },
      { status: 500 }
    );
  }
}
