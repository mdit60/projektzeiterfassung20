#!/bin/bash
# ============================================================================
# PZE V7.3.57 - Zeiterfassung Integration
# ============================================================================

DOWNLOADS_DIR="$HOME/Documents/dev/pze/downloads"
PROJECT_DIR="$HOME/Documents/Dev/PZE"
ZEITERFASSUNG_DIR="$PROJECT_DIR/src/app/v7/firma/zeiterfassung"

echo ""
echo "================================================"
echo "  PZE V7.3.57 - Zeiterfassung Integration"
echo "================================================"
echo ""

# Verzeichnis erstellen falls nicht vorhanden
mkdir -p "$ZEITERFASSUNG_DIR"

# Datei kopieren
if [ -f "$DOWNLOADS_DIR/page-zeiterfassung-v7_3_57.tsx" ]; then
    cp "$DOWNLOADS_DIR/page-zeiterfassung-v7_3_57.tsx" "$ZEITERFASSUNG_DIR/page.tsx"
    echo "OK: /v7/firma/zeiterfassung/page.tsx"
else
    echo "FEHLER: page-zeiterfassung-v7_3_57.tsx nicht gefunden!"
    exit 1
fi

echo ""
echo "================================================"
echo "  FERTIG!"
echo "================================================"
echo ""
echo "Zeiterfassung ist jetzt erreichbar unter:"
echo "  http://localhost:3000/v7/firma/zeiterfassung"
echo ""
echo "Teste mit:"
echo "  cd $PROJECT_DIR && pnpm dev"
echo ""
