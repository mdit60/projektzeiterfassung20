// src/app/api/parse-zim/route.ts
// Next.js API Route fuer ZIM PDF Parsing
// VERSION: v7.3.62 - Ruft Railway Python Parser auf
// DATUM: 21. Januar 2026

import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // Umgebungsvariable pruefen
    const parserUrl = process.env.ZIM_PARSER_URL
    
    if (!parserUrl) {
      console.error('ZIM_PARSER_URL nicht konfiguriert')
      return NextResponse.json(
        { success: false, error: 'ZIM Parser nicht konfiguriert. Bitte ZIM_PARSER_URL in .env.local setzen.' },
        { status: 500 }
      )
    }

    // FormData vom Request holen
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

    console.log(`Sende PDF an Railway Parser: ${parserUrl}/parse`)
    console.log(`Dateiname: ${file.name}, Groesse: ${file.size} bytes`)

    // Neue FormData fuer Railway erstellen
    const railwayFormData = new FormData()
    railwayFormData.append('file', file)

    // Railway Parser aufrufen - Endpoint ist /parse (nicht /parse-zim!)
    const response = await fetch(`${parserUrl}/parse`, {
      method: 'POST',
      body: railwayFormData,
    })

    console.log(`Railway Response Status: ${response.status}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Railway Parser Fehler:', errorText)
      return NextResponse.json(
        { success: false, error: `Parser-Fehler: ${errorText}` },
        { status: response.status }
      )
    }

    // Erfolgreiche Antwort vom Parser
    const parserResult = await response.json()
    console.log('Parser Ergebnis erhalten:', {
      projekt: parserResult.projekt?.kurzname,
      mitarbeiter: parserResult.mitarbeiter?.length,
      arbeitspakete: parserResult.arbeitspakete?.length
    })

    // Antwort an Frontend weiterleiten
    return NextResponse.json({
      success: true,
      data: parserResult
    })

  } catch (error) {
    console.error('API Route Fehler:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: `Verbindungsfehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}` 
      },
      { status: 500 }
    )
  }
}
