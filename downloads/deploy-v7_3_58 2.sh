#!/bin/bash
# ============================================================================
# PZE V7.3.58 - Zeiterfassung mit Projekt-Link
# ============================================================================
# Aenderungen:
# - Zeiterfassung-Tab in Projekt-Detail oeffnet Zeiterfassung
# - URL-Parameter ?projekt=<id> waehlt Projekt vor
# ============================================================================

DOWNLOADS_DIR="$HOME/Documents/dev/pze/downloads"
PROJECT_DIR="$HOME/Documents/Dev/PZE"
SHARED_DIR="$PROJECT_DIR/src/components/shared"
FIRMA_ZEITERFASSUNG_DIR="$PROJECT_DIR/src/app/v7/firma/zeiterfassung"
BERATER_ZEITERFASSUNG_DIR="$PROJECT_DIR/src/app/v7/berater/foerderung/firma/[id]/zeiterfassung"

echo ""
echo "================================================"
echo "  PZE V7.3.58 - Zeiterfassung mit Projekt-Link"
echo "================================================"
echo ""

# Verzeichnisse erstellen
mkdir -p "$SHARED_DIR"
mkdir -p "$FIRMA_ZEITERFASSUNG_DIR"
mkdir -p "$BERATER_ZEITERFASSUNG_DIR"

# 1. Shared Components
echo "1. Shared Components..."

if [ -f "$DOWNLOADS_DIR/TimesheetForm-v7_3_58.tsx" ]; then
    cp "$DOWNLOADS_DIR/TimesheetForm-v7_3_58.tsx" "$SHARED_DIR/TimesheetForm.tsx"
    echo "   OK: TimesheetForm.tsx"
else
    echo "   FEHLER: TimesheetForm-v7_3_58.tsx nicht gefunden!"
    exit 1
fi

if [ -f "$DOWNLOADS_DIR/ProjectDetailPage-v7_3_58.tsx" ]; then
    cp "$DOWNLOADS_DIR/ProjectDetailPage-v7_3_58.tsx" "$SHARED_DIR/ProjectDetailPage.tsx"
    echo "   OK: ProjectDetailPage.tsx (mit Zeiterfassung-Link)"
else
    echo "   FEHLER: ProjectDetailPage-v7_3_58.tsx nicht gefunden!"
    exit 1
fi

# 2. Firmen-Portal
echo ""
echo "2. Firmen-Portal..."
if [ -f "$DOWNLOADS_DIR/page-firma-zeiterfassung-v7_3_58.tsx" ]; then
    cp "$DOWNLOADS_DIR/page-firma-zeiterfassung-v7_3_58.tsx" "$FIRMA_ZEITERFASSUNG_DIR/page.tsx"
    echo "   OK: /v7/firma/zeiterfassung/page.tsx"
else
    echo "   FEHLER: page-firma-zeiterfassung-v7_3_58.tsx nicht gefunden!"
    exit 1
fi

# 3. Berater-Portal
echo ""
echo "3. Berater-Portal..."
if [ -f "$DOWNLOADS_DIR/page-berater-zeiterfassung-v7_3_58.tsx" ]; then
    cp "$DOWNLOADS_DIR/page-berater-zeiterfassung-v7_3_58.tsx" "$BERATER_ZEITERFASSUNG_DIR/page.tsx"
    echo "   OK: /v7/berater/foerderung/firma/[id]/zeiterfassung/page.tsx"
else
    echo "   FEHLER: page-berater-zeiterfassung-v7_3_58.tsx nicht gefunden!"
    exit 1
fi

echo ""
echo "================================================"
echo "  FERTIG!"
echo "================================================"
echo ""
echo "AENDERUNGEN V7.3.58:"
echo "  - Zeiterfassung-Tab zeigt Button statt Placeholder"
echo "  - Klick oeffnet Zeiterfassung mit Projekt vorausgewaehlt"
echo "  - URL-Parameter ?projekt=<id> wird unterstuetzt"
echo ""
echo "TESTEN:"
echo "  cd $PROJECT_DIR && pnpm dev"
echo ""
echo "  1. Firma: Projekt oeffnen -> Tab Zeiterfassung -> Button klicken"
echo "  2. Berater: Firma -> Projekt -> Tab Zeiterfassung -> Button klicken"
echo ""
