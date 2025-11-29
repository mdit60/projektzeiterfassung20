// ========================================
// Datei: src/app/api/payment-requests/route.ts
// API für Zahlungsanforderungen (CRUD + Berechnung)
// ========================================

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Supabase Admin Client (mit Service Role Key)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ============================================
// INTERFACES
// ============================================

interface CalculationRequest {
  project_id: string;
  period_start: string;
  period_end: string;
}

interface PaymentRequestItem {
  user_profile_id: string;
  employee_number: number;
  employee_name: string;
  qualification_group: string;
  hours_by_month: Record<string, number>;
  total_hours: number;
  hourly_rate: number;
  total_costs: number;
  validation_warnings?: string[];
}

interface CalculationResult {
  items: PaymentRequestItem[];
  totals: {
    personnel_hours: number;
    personnel_costs: number;
    overhead_costs: number;
    third_party_costs: number;
    total_eligible_costs: number;
    funding_rate: number;
    requested_amount: number;
  };
  warnings: string[];
  period: {
    start: string;
    end: string;
    months: string[];
  };
}

// ============================================
// GET - Liste aller ZAs für ein Projekt
// ============================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');
    const zaId = searchParams.get('id');

    // Einzelne ZA mit Details laden
    if (zaId) {
      const { data: za, error: zaError } = await supabaseAdmin
        .from('payment_requests')
        .select(`
          *,
          project:projects (
            name,
            funding_reference,
            funding_rate,
            overhead_rate
          )
        `)
        .eq('id', zaId)
        .single();

      if (zaError) throw zaError;

      // Items laden
      const { data: items, error: itemsError } = await supabaseAdmin
        .from('payment_request_items')
        .select('*')
        .eq('payment_request_id', zaId)
        .order('employee_number');

      if (itemsError) throw itemsError;

      return NextResponse.json({
        success: true,
        data: { ...za, items }
      });
    }

    // Liste für Projekt laden
    if (projectId) {
      const { data, error } = await supabaseAdmin
        .from('payment_requests')
        .select('*')
        .eq('project_id', projectId)
        .order('request_number', { ascending: false });

      if (error) throw error;

      return NextResponse.json({
        success: true,
        data
      });
    }

    return NextResponse.json(
      { success: false, error: 'project_id oder id Parameter erforderlich' },
      { status: 400 }
    );

  } catch (error: any) {
    console.error('GET payment-requests error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// ============================================
// POST - Neue ZA erstellen oder berechnen
// ============================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    // Berechnung durchführen (ohne Speichern)
    if (action === 'calculate') {
      const result = await calculatePaymentRequest(body);
      return NextResponse.json({
        success: true,
        data: result
      });
    }

    // ZA erstellen und speichern
    if (action === 'create') {
      const result = await createPaymentRequest(body);
      return NextResponse.json({
        success: true,
        data: result
      });
    }

    return NextResponse.json(
      { success: false, error: 'Unbekannte Aktion' },
      { status: 400 }
    );

  } catch (error: any) {
    console.error('POST payment-requests error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// ============================================
// PATCH - ZA aktualisieren (Status, Beträge)
// ============================================

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID erforderlich' },
        { status: 400 }
      );
    }

    // Erlaubte Felder für Update
    const allowedFields = [
      'status',
      'approved_amount',
      'paid_amount',
      'deductions',
      'notes',
      'submitted_at',
      'approved_at',
      'paid_at',
      'third_party_costs',
      'rd_contract_costs',
      'temp_personnel_costs'
    ];

    const sanitizedUpdates: Record<string, any> = {};
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        sanitizedUpdates[field] = updates[field];
      }
    }

    // Automatische Timestamps bei Statusänderungen
    if (updates.status === 'submitted' && !updates.submitted_at) {
      sanitizedUpdates.submitted_at = new Date().toISOString();
    }
    if (updates.status === 'approved' && !updates.approved_at) {
      sanitizedUpdates.approved_at = new Date().toISOString();
    }
    if (updates.status === 'paid' && !updates.paid_at) {
      sanitizedUpdates.paid_at = new Date().toISOString();
    }

    sanitizedUpdates.updated_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from('payment_requests')
      .update(sanitizedUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data
    });

  } catch (error: any) {
    console.error('PATCH payment-requests error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// ============================================
// DELETE - ZA löschen (nur Entwürfe)
// ============================================

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID erforderlich' },
        { status: 400 }
      );
    }

    // Prüfen ob ZA im Draft-Status ist
    const { data: za, error: fetchError } = await supabaseAdmin
      .from('payment_requests')
      .select('status')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    if (za.status !== 'draft') {
      return NextResponse.json(
        { success: false, error: 'Nur Entwürfe können gelöscht werden' },
        { status: 400 }
      );
    }

    // Items löschen
    await supabaseAdmin
      .from('payment_request_items')
      .delete()
      .eq('payment_request_id', id);

    // ZA löschen
    const { error: deleteError } = await supabaseAdmin
      .from('payment_requests')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    return NextResponse.json({
      success: true,
      message: 'Zahlungsanforderung gelöscht'
    });

  } catch (error: any) {
    console.error('DELETE payment-requests error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// ============================================
// HELPER: Berechnung durchführen
// ============================================

async function calculatePaymentRequest(params: CalculationRequest): Promise<CalculationResult> {
  const { project_id, period_start, period_end } = params;
  const warnings: string[] = [];

  // 1. Projekt-Daten laden
  const { data: project, error: projectError } = await supabaseAdmin
    .from('projects')
    .select('*, company_id')
    .eq('id', project_id)
    .single();

  if (projectError) throw projectError;

  // 2. Projekt-Zuordnungen laden (für MA-Nummern)
  const { data: projectAssignments } = await supabaseAdmin
    .from('project_assignments')
    .select('user_profile_id, project_employee_number')
    .eq('project_id', project_id);

  const assignmentMap: Record<string, number> = {};
  (projectAssignments || []).forEach(pa => {
    assignmentMap[pa.user_profile_id] = pa.project_employee_number;
  });

  // 3. Zeiteinträge laden
  const { data: timeEntries, error: teError } = await supabaseAdmin
    .from('time_entries')
    .select(`
      id,
      user_profile_id,
      entry_date,
      hours,
      category
    `)
    .eq('project_id', project_id)
    .eq('category', 'project_work')
    .gte('entry_date', period_start)
    .lte('entry_date', period_end);

  if (teError) throw teError;

  // 4. User-Profile laden
  const userIds = [...new Set((timeEntries || []).map(te => te.user_profile_id))];
  
  const { data: userProfiles } = await supabaseAdmin
    .from('user_profiles')
    .select('id, name, first_name, last_name, qualification_group, weekly_hours_contract')
    .in('id', userIds);

  const userMap: Record<string, any> = {};
  (userProfiles || []).forEach(up => {
    userMap[up.id] = up;
  });

  // 5. Gehaltsdaten laden
  const startYear = new Date(period_start).getFullYear();
  const endYear = new Date(period_end).getFullYear();
  const years = [];
  for (let y = startYear; y <= endYear; y++) years.push(y);

  const { data: salaryData } = await supabaseAdmin
    .from('salary_components')
    .select('user_profile_id, year, hourly_rate')
    .in('user_profile_id', userIds)
    .in('year', years);

  // Stundensatz-Map: userId -> year -> rate
  const salaryMap: Record<string, Record<number, number>> = {};
  (salaryData || []).forEach(s => {
    if (!salaryMap[s.user_profile_id]) salaryMap[s.user_profile_id] = {};
    salaryMap[s.user_profile_id][s.year] = Number(s.hourly_rate);
  });

  // 6. Stunden pro MA und Monat aggregieren
  const employeeData: Record<string, {
    hours_by_month: Record<string, number>;
    total_hours: number;
  }> = {};

  (timeEntries || []).forEach(entry => {
    const upId = entry.user_profile_id;
    const monthKey = entry.entry_date.substring(0, 7); // YYYY-MM
    const hours = Number(entry.hours);

    if (!employeeData[upId]) {
      employeeData[upId] = {
        hours_by_month: {},
        total_hours: 0
      };
    }

    if (!employeeData[upId].hours_by_month[monthKey]) {
      employeeData[upId].hours_by_month[monthKey] = 0;
    }

    employeeData[upId].hours_by_month[monthKey] += hours;
    employeeData[upId].total_hours += hours;
  });

  // 7. Items erstellen mit Validierung
  const items: PaymentRequestItem[] = [];
  const allMonths = new Set<string>();

  for (const [userId, data] of Object.entries(employeeData)) {
    const user = userMap[userId];
    const weeklyHours = user?.weekly_hours_contract || 40;
    
    // Max-Stunden pro Monat berechnen: (Wochenstunden × 52) / 12
    const maxHoursPerMonth = (weeklyHours * 52) / 12;
    
    // Stundensatz ermitteln (aus dem Hauptjahr)
    const mainYear = new Date(period_start).getFullYear();
    const hourlyRate = salaryMap[userId]?.[mainYear] || 50;

    const itemWarnings: string[] = [];

    // Validierung: Max-Stunden pro Monat
    for (const [month, hours] of Object.entries(data.hours_by_month)) {
      allMonths.add(month);
      if (hours > maxHoursPerMonth) {
        const warning = `${user?.name || 'MA'}: ${month} hat ${hours.toFixed(1)}h, max. ${maxHoursPerMonth.toFixed(1)}h erlaubt`;
        itemWarnings.push(warning);
        warnings.push(warning);
      }
    }

    // Name formatieren
    let employeeName = user?.name || 'Unbekannt';
    if (user?.last_name && user?.first_name) {
      employeeName = `${user.last_name}, ${user.first_name}`;
    }

    items.push({
      user_profile_id: userId,
      employee_number: assignmentMap[userId] || 0,
      employee_name: employeeName,
      qualification_group: user?.qualification_group || 'C',
      hours_by_month: data.hours_by_month,
      total_hours: data.total_hours,
      hourly_rate: hourlyRate,
      total_costs: data.total_hours * hourlyRate,
      validation_warnings: itemWarnings.length > 0 ? itemWarnings : undefined
    });
  }

  // Nach MA-Nummer sortieren
  items.sort((a, b) => a.employee_number - b.employee_number);

  // 8. Summen berechnen
  const personnel_hours = items.reduce((sum, i) => sum + i.total_hours, 0);
  const personnel_costs = items.reduce((sum, i) => sum + i.total_costs, 0);
  const overhead_rate = project.overhead_rate || 0;
  const overhead_costs = personnel_costs * (overhead_rate / 100);
  const third_party_costs = 0; // Manuell ergänzbar
  const total_eligible_costs = personnel_costs + overhead_costs + third_party_costs;
  const funding_rate = project.funding_rate || 50;
  const requested_amount = total_eligible_costs * (funding_rate / 100);

  // Monate sortieren
  const sortedMonths = Array.from(allMonths).sort();

  return {
    items,
    totals: {
      personnel_hours,
      personnel_costs,
      overhead_costs,
      third_party_costs,
      total_eligible_costs,
      funding_rate,
      requested_amount
    },
    warnings,
    period: {
      start: period_start,
      end: period_end,
      months: sortedMonths
    }
  };
}

// ============================================
// HELPER: ZA erstellen und speichern
// ============================================

async function createPaymentRequest(params: any) {
  const {
    project_id,
    period_start,
    period_end,
    items,
    totals,
    status = 'draft',
    notes
  } = params;

  // 1. Projekt laden für company_id
  const { data: project } = await supabaseAdmin
    .from('projects')
    .select('company_id, funding_rate')
    .eq('id', project_id)
    .single();

  if (!project) throw new Error('Projekt nicht gefunden');

  // 2. Nächste ZA-Nummer ermitteln
  const { data: nextNumResult } = await supabaseAdmin
    .rpc('get_next_za_number', { p_project_id: project_id });

  const requestNumber = nextNumResult || 1;

  // 3. Payment Request erstellen
  const { data: newPR, error: prError } = await supabaseAdmin
    .from('payment_requests')
    .insert([{
      company_id: project.company_id,
      project_id,
      request_number: requestNumber,
      period_start,
      period_end,
      personnel_costs: totals.personnel_costs,
      personnel_hours: totals.personnel_hours,
      overhead_costs: totals.overhead_costs,
      third_party_costs: totals.third_party_costs || 0,
      total_eligible_costs: totals.total_eligible_costs,
      funding_rate_applied: project.funding_rate || 50,
      requested_amount: totals.requested_amount,
      status,
      notes,
      calculated_at: new Date().toISOString()
    }])
    .select()
    .single();

  if (prError) throw prError;

  // 4. Items erstellen
  if (items && items.length > 0) {
    const itemsToInsert = items.map((item: PaymentRequestItem) => ({
      payment_request_id: newPR.id,
      user_profile_id: item.user_profile_id,
      employee_number: item.employee_number,
      employee_name: item.employee_name,
      qualification_group: item.qualification_group,
      hours_by_month: item.hours_by_month,
      total_hours: item.total_hours,
      hourly_rate: item.hourly_rate,
      total_costs: item.total_costs
    }));

    const { error: itemsError } = await supabaseAdmin
      .from('payment_request_items')
      .insert(itemsToInsert);

    if (itemsError) throw itemsError;
  }

  return {
    id: newPR.id,
    request_number: requestNumber,
    status: newPR.status
  };
}