// src/app/api/parse-zim/route.ts
// ============================================================================
// PZE V7 - ZIM PDF Parser API Route
// ============================================================================
// Version: 7.3.64
// Datum: 22. Januar 2026
//
// Ruft den Railway Python-Service auf fuer robustes PDF-Parsing
// Railway Service URL: https://web-production-e2e1.up.railway.app
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'

// Hardcoded URL da Environment Variable Probleme macht
const RAILWAY_SERVICE_URL = 'https://web-production-e2e1.up.railway.app'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'Keine Datei hochgeladen' },
        { status: 400 }
      )
    }

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json(
        { success: false, error: 'Datei muss eine PDF sein' },
        { status: 400 }
      )
    }

    console.log('=== ZIM Parser API v7.3.64 ===')
    console.log('Datei:', file.name, 'Groesse:', file.size)
    console.log('Sende an Railway:', RAILWAY_SERVICE_URL)

    // File in ArrayBuffer umwandeln und als Blob neu erstellen
    const bytes = await file.arrayBuffer()
    const blob = new Blob([bytes], { type: 'application/pdf' })

    // FormData fuer Railway Service erstellen
    const railwayFormData = new FormData()
    railwayFormData.append('file', blob, file.name)

    // Railway Service aufrufen
    const response = await fetch(RAILWAY_SERVICE_URL + '/parse', {
      method: 'POST',
      body: railwayFormData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Railway Error:', response.status, errorText)
      
      let errorMessage = 'PDF-Parsing fehlgeschlagen'
      try {
        const errorJson = JSON.parse(errorText)
        errorMessage = errorJson.detail || errorJson.error || errorMessage
      } catch {
        errorMessage = errorText || errorMessage
      }
      
      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: response.status }
      )
    }

    const result = await response.json()
    
    console.log('Railway Response erfolgreich!')
    console.log('Projekt:', result.data?.projekt?.name?.substring(0, 50) || '(kein Name)')
    console.log('APs:', result.data?.statistik?.anzahl_arbeitspakete || 0)

    // Erfolgreiche Antwort weiterleiten
    if (result.success && result.data) {
      return NextResponse.json({
        success: true,
        projekt: result.data.projekt,
        antragsteller: result.data.antragsteller,
        budget: result.data.budget,
        mitarbeiter: result.data.mitarbeiter || [],
        arbeitspakete: result.data.arbeitspakete || [],
        parse_datum: result.data.parse_datum,
        quell_datei: result.data.quell_datei,
        format_erkannt: result.data.format_erkannt,
        statistik: result.data.statistik
      })
    } else {
      return NextResponse.json(
        { success: false, error: result.error || 'Unbekannter Fehler beim Parsing' },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('API Route Error:', error)
    
    return NextResponse.json(
      { success: false, error: 'Fehler: ' + (error instanceof Error ? error.message : 'Unbekannter Fehler') },
      { status: 500 }
    )
  }
}
