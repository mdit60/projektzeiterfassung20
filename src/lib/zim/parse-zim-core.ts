// ============================================================================
// PZE V7 - parse-zim Core (Validierung + Fehlerklassifizierung)
// ============================================================================
// Reine Logik ohne Next.js-Abhaengigkeit, damit sie isoliert testbar ist.
// Nimmt PDF-Bytes, liefert entweder den Vertrag oder einen sprechenden Fehler.
// ASCII-only Quelldatei.
// ============================================================================

import { extractDatasetsXml, parseAntrag, type Contract } from './zim-antrag-extraktor';

export type ParseZimResult =
  | { ok: true; contract: Contract; warnung: string | null }
  | { ok: false; code: string; meldung: string; httpStatus: number };

// Deutsche Klartext-Meldungen je Fehlercode (fuer die UI)
const MELDUNGEN: Record<string,string> = {
  LEER:              'Es wurde keine Datei empfangen.',
  KEIN_PDF:          'Die hochgeladene Datei ist keine PDF-Datei.',
  KEIN_XFA:          'In der PDF wurden keine ZIM-Antragsdaten gefunden. Bitte laden Sie das originale, ausfuellbare Antragsformular hoch (kein Ausdruck oder Scan).',
  EXTRAKTION_FEHLER: 'Die PDF konnte nicht gelesen werden. Moeglicherweise ist die Datei beschaedigt oder verwendet ein nicht unterstuetztes Verschluesselungs-/Formularverfahren.',
  KEIN_ARBEITSPLAN:  'Aus dem Antrag konnte kein Arbeitsplan extrahiert werden (keine Arbeitspakete gefunden).',
  PARSE_FEHLER:      'Die Antragsdaten konnten nicht ausgewertet werden.',
};

function pdfHeaderOk(bytes: Uint8Array): boolean {
  // %PDF- irgendwo in den ersten 1024 Bytes (manche Dateien haben ein Praeamble)
  const n = Math.min(bytes.length, 1024);
  for (let i = 0; i + 5 <= n; i++) {
    if (bytes[i]===0x25 && bytes[i+1]===0x50 && bytes[i+2]===0x44 && bytes[i+3]===0x46 && bytes[i+4]===0x2d) return true;
  }
  return false;
}

const err = (code: string, httpStatus: number): ParseZimResult =>
  ({ ok: false, code, meldung: MELDUNGEN[code] || 'Unbekannter Fehler.', httpStatus });

export function pdfToResult(bytes: Uint8Array): ParseZimResult {
  if (!bytes || bytes.length === 0) return err('LEER', 400);
  if (!pdfHeaderOk(bytes))         return err('KEIN_PDF', 400);

  // 1) XFA-datasets extrahieren
  let datasets: Buffer;
  try {
    datasets = extractDatasetsXml(bytes);
  } catch (e: any) {
    const msg = String(e?.message || e);
    // Fehlt das XFA/datasets-Paket -> es ist kein (ausfuellbares) ZIM-Formular
    if (/datasets|XFA|AcroForm/i.test(msg)) return err('KEIN_XFA', 422);
    return err('EXTRAKTION_FEHLER', 422);
  }

  // 2) Parsen
  let contract: Contract;
  try {
    contract = parseAntrag(datasets);
  } catch {
    return err('PARSE_FEHLER', 422);
  }

  if (!contract.arbeitspakete || contract.arbeitspakete.length === 0) return err('KEIN_ARBEITSPLAN', 422);

  // 3) Kontrollsummen-Selbstcheck: kein Fehler, aber Warnung fuer die Vorschau
  const warnung = contract.kontrollsummen_pruefung?.status === 'ok'
    ? null
    : 'Die extrahierten Personenmonate stimmen nicht mit den Kontrollsummen (Anlage 5) des Antrags ueberein. Bitte pruefen Sie die Werte vor der Uebernahme.';

  return { ok: true, contract, warnung };
}
