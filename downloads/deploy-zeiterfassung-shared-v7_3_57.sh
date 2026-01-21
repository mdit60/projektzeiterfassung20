#!/bin/bash
# ============================================================================
# PZE V7.3.57 - Zeiterfassung Shared Component
# ============================================================================

DOWNLOADS_DIR="$HOME/Documents/dev/pze/downloads"
PROJECT_DIR="$HOME/Documents/Dev/PZE"
SHARED_DIR="$PROJECT_DIR/src/components/shared"
FIRMA_ZEITERFASSUNG_DIR="$PROJECT_DIR/src/app/v7/firma/zeiterfassung"
BERATER_ZEITERFASSUNG_DIR="$PROJECT_DIR/src/app/v7/berater/foerderung/firma/[id]/zeiterfassung"

echo ""
echo "================================================"
echo "  PZE V7.3.57 - Zeiterfassung Shared Component"
echo "================================================"
echo ""

# Verzeichnisse erstellen
mkdir -p "$SHARED_DIR"
mkdir -p "$FIRMA_ZEITERFASSUNG_DIR"
mkdir -p "$BERATER_ZEITERFASSUNG_DIR"

# 1. Shared Component
echo "1. Shared Component..."
if [ -f "$DOWNLOADS_DIR/TimesheetForm-v7_3_57.tsx" ]; then
    cp "$DOWNLOADS_DIR/TimesheetForm-v7_3_57.tsx" "$SHARED_DIR/TimesheetForm.tsx"
    echo "   OK: TimesheetForm.tsx"
else
    echo "   FEHLER: TimesheetForm-v7_3_57.tsx nicht gefunden!"
    exit 1
fi

# 2. Firmen-Portal Wrapper
echo ""
echo "2. Firmen-Portal..."
if [ -f "$DOWNLOADS_DIR/page-firma-zeiterfassung-v7_3_57.tsx" ]; then
    cp "$DOWNLOADS_DIR/page-firma-zeiterfassung-v7_3_57.tsx" "$FIRMA_ZEITERFASSUNG_DIR/page.tsx"
    echo "   OK: /v7/firma/zeiterfassung/page.tsx"
else
    echo "   FEHLER: page-firma-zeiterfassung-v7_3_57.tsx nicht gefunden!"
    exit 1
fi

# 3. Berater-Portal Wrapper
echo ""
echo "3. Berater-Portal..."
if [ -f "$DOWNLOADS_DIR/page-berater-zeiterfassung-v7_3_57.tsx" ]; then
    cp "$DOWNLOADS_DIR/page-berater-zeiterfassung-v7_3_57.tsx" "$BERATER_ZEITERFASSUNG_DIR/page.tsx"
    echo "   OK: /v7/berater/foerderung/firma/[id]/zeiterfassung/page.tsx"
else
    echo "   FEHLER: page-berater-zeiterfassung-v7_3_57.tsx nicht gefunden!"
    exit 1
fi

echo ""
echo "================================================"
echo "  FERTIG!"
echo "================================================"
echo ""
echo "SHARED COMPONENT:"
echo "  /src/components/shared/TimesheetForm.tsx"
echo ""
echo "PORTAL-SEITEN:"
echo "  Firma:   /v7/firma/zeiterfassung"
echo "  Berater: /v7/berater/foerderung/firma/[id]/zeiterfassung"
echo ""
echo "TESTEN:"
echo "  cd $PROJECT_DIR && pnpm dev"
echo ""
echo "  Firma:   http://localhost:3000/v7/firma/zeiterfassung"
echo "  Berater: http://localhost:3000/v7/berater/foerderung/firma/<ID>/zeiterfassung"
echo ""
