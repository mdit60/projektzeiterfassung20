#!/bin/bash
# ============================================================================
# PZE V7.3.59 - Rollenbasierte Ansichten + Suspense Fix
# ============================================================================
# Aenderungen:
# - Dashboard zeigt unterschiedliche Inhalte je nach Rolle
# - Navigation wird rollenbasiert eingeschraenkt
# - Zeiterfassung: MA/Projektleiter sehen nur relevante Daten
# - FIX: useSearchParams in Suspense Boundary gewrapped (Next.js 15)
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

# Verzeichnisse erstellen
mkdir -p "$FIRMA_DASHBOARD_DIR"
mkdir -p "$FIRMA_ZEITERFASSUNG_DIR"
mkdir -p "$BERATER_ZEITERFASSUNG_DIR"

# 1. Dashboard
echo "1. Firmen-Dashboard (rollenbasiert)..."
if [ -f "$DOWNLOADS_DIR/v7-firma-dashboard-v7_3_59.tsx" ]; then
    cp "$DOWNLOADS_DIR/v7-firma-dashboard-v7_3_59.tsx" "$FIRMA_DASHBOARD_DIR/page.tsx"
    echo "   OK: /v7/firma/dashboard/page.tsx"
else
    echo "   FEHLER: v7-firma-dashboard-v7_3_59.tsx nicht gefunden!"
    exit 1
fi

# 2. Firma-Zeiterfassung
echo ""
echo "2. Firma-Zeiterfassung (rollenbasiert + Suspense)..."
if [ -f "$DOWNLOADS_DIR/page-firma-zeiterfassung-v7_3_59.tsx" ]; then
    cp "$DOWNLOADS_DIR/page-firma-zeiterfassung-v7_3_59.tsx" "$FIRMA_ZEITERFASSUNG_DIR/page.tsx"
    echo "   OK: /v7/firma/zeiterfassung/page.tsx"
else
    echo "   FEHLER: page-firma-zeiterfassung-v7_3_59.tsx nicht gefunden!"
    exit 1
fi

# 3. Berater-Zeiterfassung
echo ""
echo "3. Berater-Zeiterfassung (Suspense Fix)..."
if [ -f "$DOWNLOADS_DIR/page-berater-zeiterfassung-v7_3_59.tsx" ]; then
    cp "$DOWNLOADS_DIR/page-berater-zeiterfassung-v7_3_59.tsx" "$BERATER_ZEITERFASSUNG_DIR/page.tsx"
    echo "   OK: /v7/berater/foerderung/firma/[id]/zeiterfassung/page.tsx"
else
    echo "   FEHLER: page-berater-zeiterfassung-v7_3_59.tsx nicht gefunden!"
    exit 1
fi

echo ""
echo "================================================"
echo "  FERTIG!"
echo "================================================"
echo ""
echo "FIXES:"
echo "  - useSearchParams() in Suspense Boundary (Next.js 15 Requirement)"
echo ""
echo "ROLLENBASIERTE ANSICHTEN:"
echo ""
echo "  client_admin (Firmen-Admin):"
echo "    - Sieht: Firmendaten, Projekte, Mitarbeiter, Zeiterfassung"
echo "    - Kann: Alles bearbeiten"
echo ""
echo "  project_leader (Projektleiter):"
echo "    - Sieht: Zugeordnete Projekte, Zeiterfassung"
echo "    - Kann: Stunden der Projekt-MA erfassen"
echo ""
echo "  employee (Mitarbeiter):"
echo "    - Sieht: Nur Zeiterfassung"
echo "    - Kann: Nur eigene Stunden erfassen"
echo ""
echo "TESTEN:"
echo "  cd $PROJECT_DIR && pnpm dev"
echo ""
