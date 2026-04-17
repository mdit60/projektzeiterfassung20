// src/app/api/v7/create-employee-login/route.ts
// ============================================================================
// PZE V7 - Atomare API-Route: MA-Login erstellen
// ============================================================================
// Version: v7.3.95-2
// Datum: 17. April 2026
//
// AENDERUNG v7.3.95-2:
//   BUG FIX: "duplicate key value violates unique constraint v7_user_profiles_pkey"
//   Ursache: Supabase kann beim Auth-User-Anlegen automatisch ein leeres
//   v7_user_profiles-Profil erstellen (Trigger oder Race Condition).
//   Fix: INSERT -> UPSERT (on_conflict: id) fuer v7_user_profiles.
//   So wird ein bereits vorhandenes (leeres) Profil korrekt befuellt
//   statt einen Duplikat-Fehler auszuloesen.
//
// Zweck:
//   Erstellt einen vollstaendigen MA-Login in einem atomaren Server-Aufruf.
//   Alle 3 Schritte (Auth + Profil + Employee-Verknuepfung) werden ausgefuehrt
//   oder bei Fehler vollstaendig zurueckgerollt.
//
// Gilt fuer ALLE Wege:
//   - Berater legt MA an (Berater-Portal)
//   - Firmen-Admin legt MA an (Firmen-Portal)
//
// Sicherheit:
//   - Authentifizierung: Nur eingeloggte Benutzer mit Rolle consultant oder
//     client_user (portal_role client_admin) duerfen diese Route aufrufen
//   - Service Role Key nur server-seitig, nie im Client
//
// Request Body:
//   {
//     employee_id: string       // UUID des v7_employees-Eintrags
//     email: string             // E-Mail-Adresse des MA
//     password: string          // Initiales Passwort (min. 6 Zeichen)
//     display_name: string      // Anzeigename
//     first_name?: string       // Vorname (optional)
//     last_name?: string        // Nachname (optional)
//     client_company_id: string // UUID der Firma
//     portal_role: string       // 'client_admin' | 'project_leader' | 'employee'
//   }
//
// Response (Erfolg):
//   { success: true, user_id: string, message: string }
//
// Response (Fehler):
//   { success: false, error: string, code?: string }
//
// Fehler-Codes:
//   ALREADY_REGISTERED  - E-Mail existiert bereits in auth.users
//   EMPLOYEE_NOT_FOUND  - employee_id existiert nicht
//   ALREADY_LINKED      - Employee hat bereits einen user_id
//   VALIDATION_ERROR    - Pflichtfelder fehlen oder ungueltig
//   AUTH_ERROR          - Supabase Auth Fehler
//   PROFILE_ERROR       - v7_user_profiles Upsert fehlgeschlagen
//   LINK_ERROR          - v7_employees Update fehlgeschlagen
//   UNAUTHORIZED        - Aufrufer hat keine Berechtigung
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// ============================================================================
// TYPEN
// ============================================================================

interface CreateEmployeeLoginRequest {
  employee_id: string;
  email: string;
  password: string;
  display_name: string;
  first_name?: string;
  last_name?: string;
  client_company_id: string;
  portal_role: 'client_admin' | 'project_leader' | 'employee';
}

interface CreateEmployeeLoginResponse {
  success: boolean;
  user_id?: string;
  message?: string;
  error?: string;
  code?: string;
}

// ============================================================================
// HILFSFUNKTIONEN
// ============================================================================

function errorResponse(
  error: string,
  code: string,
  status: number = 400
): NextResponse<CreateEmployeeLoginResponse> {
  return NextResponse.json({ success: false, error, code }, { status });
}

// ============================================================================
// POST HANDLER
// ============================================================================

export async function POST(
  request: NextRequest
): Promise<NextResponse<CreateEmployeeLoginResponse>> {

  // --------------------------------------------------------------------------
  // 1. Aufrufer authentifizieren (normaler Supabase-Client mit Session)
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

  // Aufrufer-Rolle pruefen
  const { data: callerProfile } = await supabaseAuth
    .from('v7_user_profiles')
    .select('role, client_company_id')
    .eq('id', callerUser.id)
    .single();

  if (!callerProfile) {
    return errorResponse('Aufrufer-Profil nicht gefunden', 'UNAUTHORIZED', 401);
  }

  const allowedRoles = ['system_admin', 'consultant', 'client_user'];
  if (!allowedRoles.includes(callerProfile.role)) {
    return errorResponse('Keine Berechtigung', 'UNAUTHORIZED', 403);
  }

  // --------------------------------------------------------------------------
  // 2. Request-Body validieren
  // --------------------------------------------------------------------------
  let body: CreateEmployeeLoginRequest;
  try {
    body = await request.json();
  } catch {
    return errorResponse('Ungueltiger Request-Body', 'VALIDATION_ERROR');
  }

  const { employee_id, email, password, display_name, first_name, last_name, client_company_id, portal_role } = body;

  if (!employee_id || !email || !password || !display_name || !client_company_id || !portal_role) {
    return errorResponse(
      'Pflichtfelder fehlen: employee_id, email, password, display_name, client_company_id, portal_role',
      'VALIDATION_ERROR'
    );
  }

  if (password.length < 6) {
    return errorResponse('Passwort muss mindestens 6 Zeichen haben', 'VALIDATION_ERROR');
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return errorResponse('Ungueltige E-Mail-Adresse', 'VALIDATION_ERROR');
  }

  // client_user darf nur MA in der eigenen Firma anlegen
  if (callerProfile.role === 'client_user') {
    if (callerProfile.client_company_id !== client_company_id) {
      return errorResponse('Keine Berechtigung fuer diese Firma', 'UNAUTHORIZED', 403);
    }
  }

  // --------------------------------------------------------------------------
  // 3. Admin-Client mit Service Role Key (server-seitig, sicher)
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

  // --------------------------------------------------------------------------
  // 4. Vorpruefungen (vor jeder DB-Aenderung)
  // --------------------------------------------------------------------------

  // 4a. Employee existiert und gehoert zur richtigen Firma?
  const { data: employee, error: empCheckError } = await supabaseAdmin
    .from('v7_employees')
    .select('id, user_id, client_company_id, display_name')
    .eq('id', employee_id)
    .single();

  if (empCheckError || !employee) {
    return errorResponse(`Mitarbeiter nicht gefunden: ${employee_id}`, 'EMPLOYEE_NOT_FOUND');
  }

  if (employee.client_company_id !== client_company_id) {
    return errorResponse('Mitarbeiter gehoert nicht zu dieser Firma', 'VALIDATION_ERROR');
  }

  // 4b. Employee bereits verknuepft?
  if (employee.user_id) {
    return errorResponse(
      `${employee.display_name} hat bereits einen Login (user_id: ${employee.user_id})`,
      'ALREADY_LINKED'
    );
  }

  // 4c. E-Mail bereits registriert?
  // Supabase Admin API: listUsers hat Paginierung - bei vielen Usern nur erste Seite
  // Sicherer: getUserByEmail (falls verfuegbar) oder filter
  const { data: existingUsersData } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  const emailAlreadyExists = existingUsersData?.users?.some(
    (u) => u.email?.toLowerCase() === email.toLowerCase()
  );

  if (emailAlreadyExists) {
    return errorResponse(
      `E-Mail ${email} ist bereits registriert. Bitte "Verknuepfen" verwenden.`,
      'ALREADY_REGISTERED'
    );
  }

  // --------------------------------------------------------------------------
  // 5. Atomare Ausfuehrung: Auth + Profil + Employee-Verknuepfung
  //    Bei jedem Fehler: Rollback der bereits ausgefuehrten Schritte
  // --------------------------------------------------------------------------

  let newUserId: string | null = null;
  let profileCreated = false;

  try {

    // SCHRITT 1: Auth-User anlegen
    const { data: authData, error: authCreateError } = await supabaseAdmin.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password,
      email_confirm: true, // Direkt bestaetigt, keine Bestaetigungs-E-Mail
      user_metadata: {
        display_name,
      },
    });

    if (authCreateError || !authData.user) {
      return errorResponse(
        `Auth-User konnte nicht erstellt werden: ${authCreateError?.message || 'Unbekannt'}`,
        'AUTH_ERROR'
      );
    }

    newUserId = authData.user.id;

    // SCHRITT 2: v7_user_profiles anlegen oder aktualisieren
    // WICHTIG: UPSERT statt INSERT!
    // Supabase kann beim createUser automatisch ein leeres Profil per Trigger anlegen.
    // Mit upsert wird dieses leere Profil korrekt befuellt statt einen
    // "duplicate key"-Fehler auszuloesen.
    const { error: profileError } = await supabaseAdmin
      .from('v7_user_profiles')
      .upsert(
        {
          id: newUserId,
          email: email.toLowerCase().trim(),
          display_name,
          first_name: first_name?.trim() || null,
          last_name: last_name?.trim() || null,
          role: 'client_user',             // IMMER client_user - Portal-Rolle kommt aus v7_employees
          client_company_id,
          is_active: true,
        },
        {
          onConflict: 'id',   // Bei vorhandenem Profil: updaten statt Fehler
        }
      );

    if (profileError) {
      // Rollback: Auth-User loeschen
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      return errorResponse(
        `Profil konnte nicht erstellt werden: ${profileError.message}`,
        'PROFILE_ERROR'
      );
    }

    profileCreated = true;

    // SCHRITT 3: v7_employees.user_id verknuepfen
    const { error: linkError } = await supabaseAdmin
      .from('v7_employees')
      .update({
        user_id: newUserId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', employee_id);

    if (linkError) {
      // Rollback: Profil loeschen + Auth-User loeschen
      await supabaseAdmin
        .from('v7_user_profiles')
        .delete()
        .eq('id', newUserId);
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      return errorResponse(
        `Employee-Verknuepfung fehlgeschlagen: ${linkError.message}`,
        'LINK_ERROR'
      );
    }

    // --------------------------------------------------------------------------
    // 6. Vollstaendigkeitspruefung (Selbsttest)
    // --------------------------------------------------------------------------
    const { data: verification } = await supabaseAdmin
      .from('v7_user_profiles')
      .select('id, role, client_company_id, is_active')
      .eq('id', newUserId)
      .single();

    if (!verification || !verification.client_company_id) {
      // Sollte nie passieren - aber wenn doch: Rollback
      await supabaseAdmin.from('v7_user_profiles').delete().eq('id', newUserId);
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      return errorResponse(
        'Interner Fehler: Profil-Verifikation fehlgeschlagen (client_company_id fehlt)',
        'PROFILE_ERROR'
      );
    }

    // --------------------------------------------------------------------------
    // 7. Erfolg
    // --------------------------------------------------------------------------
    return NextResponse.json({
      success: true,
      user_id: newUserId,
      message: `Login fuer ${display_name} erfolgreich erstellt`,
    });

  } catch (unexpectedError: any) {
    // Unerwarteter Fehler: Rollback was moeglich ist
    if (newUserId) {
      if (profileCreated) {
        await supabaseAdmin.from('v7_user_profiles').delete().eq('id', newUserId);
      }
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
    }

    console.error('[create-employee-login] Unerwarteter Fehler:', unexpectedError);
    return errorResponse(
      `Unerwarteter Fehler: ${unexpectedError?.message || 'Unbekannt'}`,
      'AUTH_ERROR',
      500
    );
  }
}
