// src/app/api/time-entries/route.ts
// API für Zeiterfassung - GET (laden) und POST (erstellen)

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// GET: Zeiteinträge laden
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const start_date = searchParams.get('start_date');
    const end_date = searchParams.get('end_date');
    const user_profile_id = searchParams.get('user_profile_id');
    
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

    // Auth prüfen
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // User Profile laden
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id, role, company_id')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Query bauen
    let query = supabase
      .from('time_entries')
      .select(`
        *,
        project:projects(id, name, color, project_number),
        employee:user_profiles!time_entries_user_profile_id_fkey(id, name, email)
      `)
      .eq('company_id', profile.company_id);

    // Mitarbeiter sieht nur eigene, Admin/Manager sieht alle oder gefiltert
    if (profile.role === 'employee') {
      query = query.eq('user_profile_id', profile.id);
    } else if (user_profile_id) {
      // Admin/Manager kann nach bestimmtem Mitarbeiter filtern
      query = query.eq('user_profile_id', user_profile_id);
    }

    // Datum-Filter
    if (start_date) {
      query = query.gte('entry_date', start_date);
    }
    if (end_date) {
      query = query.lte('entry_date', end_date);
    }

    query = query.order('entry_date', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('Error loading time entries:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Summen berechnen
    const summary = {
      total_hours: data.reduce((sum, entry) => sum + parseFloat(entry.hours), 0),
      project_hours: data
        .filter(e => e.category === 'project_work')
        .reduce((sum, entry) => sum + parseFloat(entry.hours), 0),
      non_billable_hours: data
        .filter(e => e.category === 'non_billable')
        .reduce((sum, entry) => sum + parseFloat(entry.hours), 0),
      vacation_hours: data
        .filter(e => e.category === 'vacation')
        .reduce((sum, entry) => sum + parseFloat(entry.hours), 0),
      sick_hours: data
        .filter(e => e.category === 'sick_leave')
        .reduce((sum, entry) => sum + parseFloat(entry.hours), 0),
      other_hours: data
        .filter(e => e.category === 'other_absence')
        .reduce((sum, entry) => sum + parseFloat(entry.hours), 0),
    };

    return NextResponse.json({ 
      success: true, 
      data, 
      summary,
      count: data.length
    });

  } catch (error: any) {
    console.error('Error in GET /api/time-entries:', error);
    return NextResponse.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
}

// POST: Neuen Zeiteintrag erstellen
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
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

    // Auth prüfen
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Profile laden
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id, company_id, role')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Validierung
    const { 
      entry_date, 
      project_id, 
      work_package_code,
      work_package_description,
      hours, 
      category,
      notes,
      start_time,
      end_time,
      break_minutes
    } = body;

    if (!entry_date || !hours || !category) {
      return NextResponse.json({ 
        error: 'Missing required fields: entry_date, hours, category' 
      }, { status: 400 });
    }

    // Stunden-Validierung
    const hoursNum = parseFloat(hours);
    if (isNaN(hoursNum) || hoursNum < 0 || hoursNum > 24) {
      return NextResponse.json({ 
        error: 'Hours must be between 0 and 24' 
      }, { status: 400 });
    }

    // Kategorie-Validierung
    const validCategories = [
      'project_work', 
      'non_billable', 
      'time_compensation',
      'vacation', 
      'sick_leave', 
      'other_absence',
      'unpaid_absence'
    ];
    if (!validCategories.includes(category)) {
      return NextResponse.json({ 
        error: 'Invalid category' 
      }, { status: 400 });
    }

    // Projekt-Pflicht bei Projektarbeit
    if ((category === 'project_work' || category === 'non_billable') && !project_id) {
      return NextResponse.json({ 
        error: 'Project is required for project_work and non_billable categories' 
      }, { status: 400 });
    }

    // Eintrag erstellen
    const { data, error } = await supabase
      .from('time_entries')
      .insert([{
        user_profile_id: profile.id,
        company_id: profile.company_id,
        entry_date,
        project_id: project_id || null,
        work_package_code: work_package_code || null,
        work_package_description: work_package_description || null,
        hours: hoursNum,
        category,
        notes: notes || null,
        start_time: start_time || null,
        end_time: end_time || null,
        break_minutes: break_minutes || 0,
        status: 'draft',
        created_by: user.id
      }])
      .select(`
        *,
        project:projects(id, name, color),
        employee:user_profiles!time_entries_user_profile_id_fkey(id, name)
      `)
      .single();

    if (error) {
      console.error('Error creating time entry:', error);
      
      // Duplikat-Fehler freundlich behandeln
      if (error.code === '23505') {
        return NextResponse.json({ 
          error: 'Ein Eintrag für dieses Datum, Projekt und Arbeitspaket existiert bereits' 
        }, { status: 400 });
      }
      
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      data,
      message: 'Zeiteintrag erfolgreich erstellt'
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error in POST /api/time-entries:', error);
    return NextResponse.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
}