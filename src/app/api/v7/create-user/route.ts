// src/app/api/v7/create-user/route.ts
// ============================================================================
// PZE V7 - API Route: User erstellen (Server-seitig)
// ============================================================================
// Version: 7.4.1-1
// v7.4.1-1: Profil + Employee-Insert ebenfalls server-seitig (Service Role Key)
//   - Optionale Parameter: client_company_id, first_name, last_name,
//     portal_role, invited_by
//   - Wenn client_company_id uebergeben: alle 3 Schritte in einem Aufruf
//   - Behebt RLS-Fehler bei Firmenanlage (Berater-Client darf kein Profil anlegen)
//   - Rollback: Auth-User wird geloescht wenn Profil oder Employee fehlschlaegt
// Version: 7.4.1
//   - Nur Auth-User erstellen
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      email,
      password,
      display_name,
      // v7.4.1-1: Optionale Parameter fuer vollstaendige Firmen-Admin-Anlage
      client_company_id,
      first_name,
      last_name,
      portal_role,
      invited_by,
    } = body;

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

    // ── SCHRITT 1: Auth-User erstellen ────────────────────────────────────────
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password: password,
      email_confirm: true,
      user_metadata: {
        display_name: display_name || email.split('@')[0],
      },
    });

    if (error) {
      console.error('Admin createUser Fehler:', error.message);
      if (error.message.includes('already been registered') || error.message.includes('already exists')) {
        return NextResponse.json(
          { error: 'Diese E-Mail-Adresse ist bereits registriert.' },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (!data.user) {
      return NextResponse.json(
        { error: 'Benutzer konnte nicht erstellt werden.' },
        { status: 500 }
      );
    }

    const newUserId = data.user.id;

    // ── SCHRITT 2+3: Nur wenn client_company_id uebergeben ───────────────────
    if (client_company_id) {
      const effectiveDisplayName = display_name || email.split('@')[0];

      // SCHRITT 2: v7_user_profiles anlegen (Service Role umgeht RLS)
      const { error: profileError } = await supabaseAdmin
        .from('v7_user_profiles')
        .upsert({
          id: newUserId,
          email: email.trim().toLowerCase(),
          first_name: first_name || null,
          last_name: last_name || null,
          display_name: effectiveDisplayName,
          role: 'client_user',
          client_company_id,
          is_active: true,
          invited_by: invited_by || null,
          invited_at: new Date().toISOString(),
        }, { onConflict: 'id' });

      if (profileError) {
        console.error('Profil-Fehler:', profileError.message);
        // Rollback: Auth-User loeschen
        await supabaseAdmin.auth.admin.deleteUser(newUserId);
        return NextResponse.json(
          { error: `Profil-Erstellung fehlgeschlagen: ${profileError.message}`, code: 'PROFILE_ERROR' },
          { status: 500 }
        );
      }

      // SCHRITT 3: v7_employees anlegen (Service Role umgeht RLS)
      const { error: employeeError } = await supabaseAdmin
        .from('v7_employees')
        .insert({
          client_company_id,
          user_id: newUserId,
          first_name: first_name || null,
          last_name: last_name || null,
          display_name: effectiveDisplayName,
          email: email.trim().toLowerCase(),
          portal_role: portal_role || 'client_admin',
          is_active: true,
        });

      if (employeeError) {
        console.error('Employee-Fehler:', employeeError.message);
        // Rollback: Profil + Auth-User loeschen
        await supabaseAdmin.from('v7_user_profiles').delete().eq('id', newUserId);
        await supabaseAdmin.auth.admin.deleteUser(newUserId);
        return NextResponse.json(
          { error: `Mitarbeiter-Eintrag fehlgeschlagen: ${employeeError.message}`, code: 'EMPLOYEE_ERROR' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      user: {
        id: newUserId,
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
