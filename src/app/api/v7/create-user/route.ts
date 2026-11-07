// src/app/api/v7/create-user/route.ts
// ============================================================================
// PZE V7 - API Route: User erstellen (Server-seitig)
// ============================================================================
// Version: 7.4.1-2
// Datum: 06. November 2026
//
// AENDERUNG v7.4.1-2 (SICHERHEIT, Befund K5 aus BEFUNDE-SICHERHEIT-PHASE0):
//   Die Route war ohne Anmeldepruefung aufrufbar und legte mit dem
//   Service-Role-Key bestaetigte Benutzerkonten an. Damit konnte jeder im
//   Internet die abgeschaltete Selbstregistrierung umgehen.
//   Neu:
//   - Aufrufer muss angemeldet sein (Session-Cookie), sonst 401.
//   - Aufrufer muss Rolle system_admin oder consultant haben, sonst 403.
//   - client_company_id ist jetzt PFLICHT (keine Konten ohne Firma mehr).
//   - Firma muss existieren; consultant darf nur fuer Firmen der eigenen
//     Beraterfirma anlegen (consultant_company_id), sonst 403.
//   - invited_by wird serverseitig auf den Aufrufer gesetzt (Body-Wert
//     wird ignoriert).
//   - portal_role nur aus fester Liste (client_admin, project_leader,
//     employee), Standard client_admin.
//   Aufrufer im Frontend (berater/foerderung/page.tsx) bleibt unveraendert:
//   er sendet bereits client_company_id und laeuft mit Berater-Session.
//
// v7.4.1-1: Profil + Employee-Insert ebenfalls server-seitig (Service Role Key)
// v7.4.1:   Nur Auth-User erstellen
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const ALLOWED_CALLER_ROLES = ['system_admin', 'consultant'];
const ALLOWED_PORTAL_ROLES = ['client_admin', 'project_leader', 'employee'];

export async function POST(request: NextRequest) {
  try {
    // -- SCHRITT 0: Aufrufer authentifizieren (Session aus Cookie) ----------
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
      return NextResponse.json(
        { error: 'Nicht authentifiziert', code: 'UNAUTHORIZED' },
        { status: 401 }
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

    // Aufrufer-Rolle ueber Service-Client lesen (unabhaengig von RLS)
    const { data: callerProfile } = await supabaseAdmin
      .from('v7_user_profiles')
      .select('id, role, consultant_company_id')
      .eq('id', callerUser.id)
      .maybeSingle();

    if (!callerProfile || !ALLOWED_CALLER_ROLES.includes(callerProfile.role)) {
      return NextResponse.json(
        { error: 'Keine Berechtigung. Nur Berater koennen Benutzer anlegen.', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    // -- Request-Body validieren ---------------------------------------------
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Ungueltiger Request-Body' }, { status: 400 });
    }

    const {
      email,
      password,
      display_name,
      client_company_id,
      first_name,
      last_name,
      portal_role,
    } = body || {};

    if (!email || !password) {
      return NextResponse.json(
        { error: 'E-Mail und Passwort sind erforderlich' },
        { status: 400 }
      );
    }

    if (!client_company_id) {
      return NextResponse.json(
        { error: 'Firma (client_company_id) ist erforderlich' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Passwort muss mindestens 6 Zeichen haben' },
        { status: 400 }
      );
    }

    const effectivePortalRole = portal_role || 'client_admin';
    if (!ALLOWED_PORTAL_ROLES.includes(effectivePortalRole)) {
      return NextResponse.json(
        { error: 'Ungueltige Portal-Rolle' },
        { status: 400 }
      );
    }

    // -- Firma pruefen: existiert und gehoert (bei consultant) zur eigenen Beraterfirma
    const { data: company } = await supabaseAdmin
      .from('v7_client_companies')
      .select('id, consultant_company_id')
      .eq('id', client_company_id)
      .maybeSingle();

    if (!company) {
      return NextResponse.json(
        { error: 'Firma nicht gefunden' },
        { status: 404 }
      );
    }

    if (
      callerProfile.role === 'consultant' &&
      (!callerProfile.consultant_company_id ||
        company.consultant_company_id !== callerProfile.consultant_company_id)
    ) {
      return NextResponse.json(
        { error: 'Keine Berechtigung fuer diese Firma', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    // -- SCHRITT 1: Auth-User erstellen ----------------------------------------
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
    const effectiveDisplayName = display_name || email.split('@')[0];

    // -- SCHRITT 2: v7_user_profiles anlegen (Service Role umgeht RLS) ---------
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
        invited_by: callerProfile.id,
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

    // -- SCHRITT 3: v7_employees anlegen (Service Role umgeht RLS) -------------
    const { error: employeeError } = await supabaseAdmin
      .from('v7_employees')
      .insert({
        client_company_id,
        user_id: newUserId,
        first_name: first_name || null,
        last_name: last_name || null,
        display_name: effectiveDisplayName,
        email: email.trim().toLowerCase(),
        portal_role: effectivePortalRole,
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
