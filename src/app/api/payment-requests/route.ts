import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// ============================================================
// TYPES
// ============================================================

interface TimeEntryRow {
  user_profile_id: string
  month: string
  hours: number
}

interface EmployeeData {
  id: string
  first_name: string
  last_name: string
  qualification_group: string | null
}

interface SalaryData {
  user_profile_id: string
  hourly_rate: number
  year: number
}

interface HoursByMonth {
  [month: string]: number
}

interface PaymentRequestItem {
  user_profile_id: string
  employee_name: string
  qualification_group: string | null
  hours_by_month: HoursByMonth
  total_hours: number
  hourly_rate: number
  total_costs: number
}

interface CalculationResult {
  items: PaymentRequestItem[]
  summary: {
    total_hours: number
    personnel_costs: number
    overhead_costs: number
    total_eligible_costs: number
    requested_amount: number
  }
  months: string[]
}

// ============================================================
// GET - Zahlungsanforderungen für ein Projekt laden
// ============================================================

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const paymentRequestId = searchParams.get('id')

    // Einzelne ZA laden
    if (paymentRequestId) {
      const { data: paymentRequest, error } = await supabase
        .from('payment_requests')
        .select(`
          *,
          payment_request_items (*)
        `)
        .eq('id', paymentRequestId)
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json(paymentRequest)
    }

    // Alle ZAs für ein Projekt laden
    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId ist erforderlich' },
        { status: 400 }
      )
    }

    const { data: paymentRequests, error } = await supabase
      .from('payment_requests')
      .select(`
        *,
        payment_request_items (*)
      `)
      .eq('project_id', projectId)
      .order('request_number', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(paymentRequests)

  } catch (error) {
    console.error('GET payment-requests error:', error)
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}

// ============================================================
// POST - Neue Zahlungsanforderung erstellen
// ============================================================

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const { 
      projectId, 
      periodStart, 
      periodEnd,
      action = 'calculate' // 'calculate' oder 'save'
    } = body

    if (!projectId || !periodStart || !periodEnd) {
      return NextResponse.json(
        { error: 'projectId, periodStart und periodEnd sind erforderlich' },
        { status: 400 }
      )
    }

    // 1. Projektdaten laden (für Fördersatz, Gemeinkosten etc.)
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Projekt nicht gefunden' },
        { status: 404 }
      )
    }

    // 2. Berechnung durchführen
    const calculation = await calculatePaymentRequest(
      supabase,
      projectId,
      periodStart,
      periodEnd,
      project.funding_rate || 50,
      project.overhead_rate || 0
    )

    // Nur berechnen, nicht speichern
    if (action === 'calculate') {
      return NextResponse.json({
        calculation,
        project: {
          name: project.name,
          funding_reference: project.funding_reference,
          funding_rate: project.funding_rate,
          overhead_rate: project.overhead_rate
        }
      })
    }

    // 3. Speichern wenn action === 'save'
    
    // Nächste ZA-Nummer ermitteln
    const { data: existingRequests } = await supabase
      .from('payment_requests')
      .select('request_number')
      .eq('project_id', projectId)
      .order('request_number', { ascending: false })
      .limit(1)

    const nextNumber = existingRequests && existingRequests.length > 0
      ? parseInt(existingRequests[0].request_number) + 1
      : 1

    // ZA erstellen
    const { data: newRequest, error: insertError } = await supabase
      .from('payment_requests')
      .insert({
        project_id: projectId,
        request_number: nextNumber.toString(),
        period_start: periodStart,
        period_end: periodEnd,
        personnel_hours: calculation.summary.total_hours,
        personnel_costs: calculation.summary.personnel_costs,
        overhead_costs: calculation.summary.overhead_costs,
        total_eligible_costs: calculation.summary.total_eligible_costs,
        requested_amount: calculation.summary.requested_amount,
        status: 'draft',
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json(
        { error: 'Fehler beim Erstellen: ' + insertError.message },
        { status: 500 }
      )
    }

    // Items (MA-Positionen) erstellen
    const itemsToInsert = calculation.items.map(item => ({
      payment_request_id: newRequest.id,
      user_profile_id: item.user_profile_id,
      employee_name: item.employee_name,
      qualification_group: item.qualification_group,
      hours_by_month: item.hours_by_month,
      total_hours: item.total_hours,
      hourly_rate: item.hourly_rate,
      total_costs: item.total_costs
    }))

    if (itemsToInsert.length > 0) {
      const { error: itemsError } = await supabase
        .from('payment_request_items')
        .insert(itemsToInsert)

      if (itemsError) {
        console.error('Fehler beim Erstellen der Items:', itemsError)
      }
    }

    return NextResponse.json({
      success: true,
      paymentRequest: newRequest,
      calculation
    })

  } catch (error) {
    console.error('POST payment-requests error:', error)
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}

// ============================================================
// PUT - Zahlungsanforderung aktualisieren
// ============================================================

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json(
        { error: 'id ist erforderlich' },
        { status: 400 }
      )
    }

    // Erlaubte Felder für Update
    const allowedFields = [
      'status',
      'submitted_at',
      'approved_at',
      'approved_amount',
      'paid_at',
      'paid_amount',
      'notes',
      'rejection_reason'
    ]

    const filteredUpdates: Record<string, unknown> = {}
    for (const key of allowedFields) {
      if (key in updates) {
        filteredUpdates[key] = updates[key]
      }
    }

    // Status-spezifische Timestamps automatisch setzen
    if (filteredUpdates.status === 'submitted' && !filteredUpdates.submitted_at) {
      filteredUpdates.submitted_at = new Date().toISOString()
    }
    if (filteredUpdates.status === 'approved' && !filteredUpdates.approved_at) {
      filteredUpdates.approved_at = new Date().toISOString()
    }
    if (filteredUpdates.status === 'paid' && !filteredUpdates.paid_at) {
      filteredUpdates.paid_at = new Date().toISOString()
    }

    filteredUpdates.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('payment_requests')
      .update(filteredUpdates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: 'Fehler beim Aktualisieren: ' + error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, paymentRequest: data })

  } catch (error) {
    console.error('PUT payment-requests error:', error)
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}

// ============================================================
// DELETE - Zahlungsanforderung löschen
// ============================================================

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'id ist erforderlich' },
        { status: 400 }
      )
    }

    // Prüfen ob ZA existiert und Status erlaubt Löschen
    const { data: existing, error: fetchError } = await supabase
      .from('payment_requests')
      .select('status')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: 'Zahlungsanforderung nicht gefunden' },
        { status: 404 }
      )
    }

    // Nur Entwürfe dürfen gelöscht werden
    if (existing.status !== 'draft') {
      return NextResponse.json(
        { error: 'Nur Entwürfe können gelöscht werden' },
        { status: 400 }
      )
    }

    // Items zuerst löschen (wegen FK)
    await supabase
      .from('payment_request_items')
      .delete()
      .eq('payment_request_id', id)

    // ZA löschen
    const { error: deleteError } = await supabase
      .from('payment_requests')
      .delete()
      .eq('id', id)

    if (deleteError) {
      return NextResponse.json(
        { error: 'Fehler beim Löschen: ' + deleteError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('DELETE payment-requests error:', error)
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}

// ============================================================
// HELPER: Berechnung durchführen
// ============================================================

async function calculatePaymentRequest(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: string,
  periodStart: string,
  periodEnd: string,
  fundingRate: number,
  overheadRate: number
): Promise<CalculationResult> {
  
  // 1. Alle time_entries für das Projekt im Zeitraum laden
  //    Nur category = 'project_work' (förderfähige Arbeit)
  const { data: timeEntries, error: timeError } = await supabase
    .from('time_entries')
    .select('user_profile_id, entry_date, hours')
    .eq('project_id', projectId)
    .eq('category', 'project_work')
    .gte('entry_date', periodStart)
    .lte('entry_date', periodEnd)

  if (timeError) {
    console.error('Fehler beim Laden der time_entries:', timeError)
    throw new Error('Fehler beim Laden der Zeiteinträge')
  }

  // 2. Gruppieren nach Mitarbeiter und Monat
  const employeeHours: Map<string, HoursByMonth> = new Map()
  const monthsSet: Set<string> = new Set()

  for (const entry of timeEntries || []) {
    const month = entry.entry_date.substring(0, 7) // "2025-01"
    monthsSet.add(month)

    if (!employeeHours.has(entry.user_profile_id)) {
      employeeHours.set(entry.user_profile_id, {})
    }

    const hours = employeeHours.get(entry.user_profile_id)!
    hours[month] = (hours[month] || 0) + entry.hours
  }

  const months = Array.from(monthsSet).sort()
  const employeeIds = Array.from(employeeHours.keys())

  if (employeeIds.length === 0) {
    return {
      items: [],
      summary: {
        total_hours: 0,
        personnel_costs: 0,
        overhead_costs: 0,
        total_eligible_costs: 0,
        requested_amount: 0
      },
      months: []
    }
  }

  // 3. Mitarbeiterdaten laden
  const { data: employees, error: empError } = await supabase
    .from('user_profiles')
    .select('id, first_name, last_name, qualification_group')
    .in('id', employeeIds)

  if (empError) {
    console.error('Fehler beim Laden der Mitarbeiter:', empError)
    throw new Error('Fehler beim Laden der Mitarbeiterdaten')
  }

  const employeeMap = new Map<string, EmployeeData>()
  for (const emp of employees || []) {
    employeeMap.set(emp.id, emp)
  }

  // 4. Stundensätze aus salary_components laden
  //    Wir brauchen die Stundensätze für die Jahre im Zeitraum
  const startYear = parseInt(periodStart.substring(0, 4))
  const endYear = parseInt(periodEnd.substring(0, 4))
  const years = []
  for (let y = startYear; y <= endYear; y++) {
    years.push(y)
  }

  const { data: salaries, error: salError } = await supabase
    .from('salary_components')
    .select('user_profile_id, hourly_rate, year')
    .in('user_profile_id', employeeIds)
    .in('year', years)

  if (salError) {
    console.error('Fehler beim Laden der Gehaltsdaten:', salError)
  }

  // Map: employee_id -> year -> hourly_rate
  const salaryMap = new Map<string, Map<number, number>>()
  for (const sal of salaries || []) {
    if (!salaryMap.has(sal.user_profile_id)) {
      salaryMap.set(sal.user_profile_id, new Map())
    }
    salaryMap.get(sal.user_profile_id)!.set(sal.year, sal.hourly_rate)
  }

  // 5. Items (Positionen) erstellen
  const items: PaymentRequestItem[] = []
  let totalHours = 0
  let totalCosts = 0

  for (const [employeeId, hoursByMonth] of employeeHours) {
    const employee = employeeMap.get(employeeId)
    if (!employee) continue

    const empTotalHours = Object.values(hoursByMonth).reduce((a, b) => a + b, 0)
    
    // Durchschnittlichen Stundensatz berechnen (falls mehrere Jahre)
    // Vereinfachung: Wir nehmen den Stundensatz des ersten Jahres im Zeitraum
    const empSalaries = salaryMap.get(employeeId)
    let hourlyRate = 0
    if (empSalaries) {
      // Bevorzuge das Jahr mit den meisten Stunden
      hourlyRate = empSalaries.get(startYear) || empSalaries.get(endYear) || 0
    }

    const empTotalCosts = empTotalHours * hourlyRate

    items.push({
      user_profile_id: employeeId,
      employee_name: `${employee.last_name}, ${employee.first_name}`,
      qualification_group: employee.qualification_group,
      hours_by_month: hoursByMonth,
      total_hours: empTotalHours,
      hourly_rate: hourlyRate,
      total_costs: empTotalCosts
    })

    totalHours += empTotalHours
    totalCosts += empTotalCosts
  }

  // Nach Name sortieren
  items.sort((a, b) => a.employee_name.localeCompare(b.employee_name))

  // 6. Zusammenfassung berechnen
  const overheadCosts = totalCosts * (overheadRate / 100)
  const totalEligibleCosts = totalCosts + overheadCosts
  const requestedAmount = totalEligibleCosts * (fundingRate / 100)

  return {
    items,
    summary: {
      total_hours: Math.round(totalHours * 100) / 100,
      personnel_costs: Math.round(totalCosts * 100) / 100,
      overhead_costs: Math.round(overheadCosts * 100) / 100,
      total_eligible_costs: Math.round(totalEligibleCosts * 100) / 100,
      requested_amount: Math.round(requestedAmount * 100) / 100
    },
    months
  }
}