#!/bin/bash
# ============================================================================
# PZE V7.3.59 - Rollenbasierte Ansichten + Portal-Rolle UI
# ============================================================================

DOWNLOADS_DIR="$HOME/Documents/dev/pze/downloads"
PROJECT_DIR="$HOME/Documents/Dev/PZE"
SHARED_DIR="$PROJECT_DIR/src/components/shared"
FIRMA_DASHBOARD_DIR="$PROJECT_DIR/src/app/v7/firma/dashboard"
FIRMA_ZEITERFASSUNG_DIR="$PROJECT_DIR/src/app/v7/firma/zeiterfassung"
BERATER_ZEITERFASSUNG_DIR="$PROJECT_DIR/src/app/v7/berater/foerderung/firma/[id]/zeiterfassung"

echo ""
echo "================================================"
echo "  PZE V7.3.59 - Rollenbasierte Ansichten"
echo "================================================"
echo ""

mkdir -p "$SHARED_DIR"
mkdir -p "$FIRMA_DASHBOARD_DIR"
mkdir -p "$FIRMA_ZEITERFASSUNG_DIR"
mkdir -p "$BERATER_ZEITERFASSUNG_DIR"

echo "1. EmployeeManagement (mit Portal-Rolle)..."
cp "$DOWNLOADS_DIR/EmployeeManagement-v7_3_59.tsx" "$SHARED_DIR/EmployeeManagement.tsx" && echo "   OK" || exit 1

echo "2. Firmen-Dashboard..."
cp "$DOWNLOADS_DIR/v7-firma-dashboard-v7_3_59.tsx" "$FIRMA_DASHBOARD_DIR/page.tsx" && echo "   OK" || exit 1

echo "3. Firma-Zeiterfassung..."
cp "$DOWNLOADS_DIR/page-firma-zeiterfassung-v7_3_59.tsx" "$FIRMA_ZEITERFASSUNG_DIR/page.tsx" && echo "   OK" || exit 1

echo "4. Berater-Zeiterfassung..."
cp "$DOWNLOADS_DIR/page-berater-zeiterfassung-v7_3_59.tsx" "$BERATER_ZEITERFASSUNG_DIR/page.tsx" && echo "   OK" || exit 1

echo ""
echo "FERTIG!"
echo ""
echo "NEU: Portal-Rolle in Mitarbeiter-Verwaltung editierbar!"
echo "  -> Mitarbeiter bearbeiten -> Dropdown Portal-Rolle"
echo ""
