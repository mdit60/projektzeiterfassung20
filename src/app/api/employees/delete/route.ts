// src/app/api/employees/delete/route.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { employeeId, checkOnly } = await request.json();

    if (!employeeId) {
      return NextResponse.json(
        { error: 'Mitarbeiter-ID fehlt' },
        { status: 400 }
      );
    }

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

    // Authentifizierung prüfen
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Nicht authentifiziert' },
        { status: 401 }
      );
    }

    // Admin-Rechte prüfen
    const { data: adminProfile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (adminProfile?.role !== 'company_admin') {
      return NextResponse.json(
        { error: 'Keine Berechtigung. Nur Company-Admins können Mitarbeiter löschen.' },
        { status: 403 }
      );
    }

    // ⭐ NEU: Prüfen ob Mitarbeiter gelöscht werden kann
    const { data: deleteCheck } = await supabase
      .rpc('can_delete_employee', { employee_id: employeeId });

    if (deleteCheck && deleteCheck.length > 0) {
      const check = deleteCheck[0];
      
      if (!check.can_delete) {
        return NextResponse.json({
          error: check.reason,
          canDelete: false,
          activeProjects: check.active_projects,
          totalAssignments: check.total_assignments,
          suggestion: check.active_projects > 0 
            ? 'Bitte zuerst Mitarbeiter von aktiven Projekten entfernen oder Projekte abschließen.'
            : 'Verwenden Sie stattdessen "Anonymisieren" um DSGVO-konform zu löschen.'
        }, { status: 400 });
      }
    }

    // ⭐ NEU: Wenn nur Check, hier beenden
    if (checkOnly) {
      return NextResponse.json({
        canDelete: true,
        message: 'Mitarbeiter kann sicher gelöscht werden'
      });
    }

    // Mitarbeiter-Daten laden
    const { data: employee } = await supabase
      .from('user_profiles')
      .select('user_id, name')
      .eq('id', employeeId)
      .single();

    if (!employee) {
      return NextResponse.json(
        { error: 'Mitarbeiter nicht gefunden' },
        { status: 404 }
      );
    }

    // ⭐ Nur löschen wenn KEINE Zuordnungen existieren
    // (wird durch ON DELETE RESTRICT automatisch verhindert)
    
    // 1. Profil löschen (CASCADE zu auth.users)
    const { error: profileError } = await supabase
      .from('user_profiles')
      .delete()
      .eq('id', employeeId);

    if (profileError) {
      // Wenn RESTRICT greift, bekommen wir hier einen Fehler
      if (profileError.code === '23503') { // Foreign key violation
        return NextResponse.json({
          error: 'Mitarbeiter kann nicht gelöscht werden: Hat noch Arbeitspaket-Zuordnungen',
          suggestion: 'Verwenden Sie "Anonymisieren" oder entfernen Sie zuerst alle Zuordnungen',
          canDelete: false
        }, { status: 400 });
      }
      
      throw profileError;
    }

    // 2. Auth-User mit Service Role Key löschen
    const supabaseAdmin = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    await supabaseAdmin.auth.admin.deleteUser(employee.user_id);

    return NextResponse.json({
      success: true,
      message: `${employee.name} wurde erfolgreich gelöscht`
    });

  } catch (error: any) {
    console.error('Error deleting employee:', error);
    return NextResponse.json(
      { error: error.message || 'Fehler beim Löschen des Mitarbeiters' },
      { status: 500 }
    );
  }
}