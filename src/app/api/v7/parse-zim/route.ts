// ============================================================================
// PZE V7 - API-Route: POST /api/v7/parse-zim
// ============================================================================
// Duenne Next.js-Huelle um parse-zim-core. Nimmt eine hochgeladene PDF
// (multipart/form-data, Feld "file") und liefert den extrahierten Vertrag
// oder einen sprechenden Fehler.
// WICHTIG: Node-Runtime (crypto/zlib) -- NICHT Edge.
// ASCII-only Quelldatei.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { pdfToResult } from '@/lib/zim/parse-zim-core';

export const runtime = 'nodejs';
export const maxDuration = 30;

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB Schutzgrenze

export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, code: 'KEIN_UPLOAD', meldung: 'Es konnte keine Datei entgegengenommen werden.' }, { status: 400 });
  }

  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, code: 'LEER', meldung: 'Es wurde keine Datei empfangen.' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ ok: false, code: 'ZU_GROSS', meldung: 'Die Datei ist zu gross (max. 25 MB).' }, { status: 413 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const result = pdfToResult(bytes);

  if (result.ok) {
    return NextResponse.json({ ok: true, contract: result.contract, warnung: result.warnung }, { status: 200 });
  }
  return NextResponse.json({ ok: false, code: result.code, meldung: result.meldung }, { status: result.httpStatus });
}
