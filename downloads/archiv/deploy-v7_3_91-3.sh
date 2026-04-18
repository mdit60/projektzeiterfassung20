#!/bin/bash
# ============================================================================
# PZE Deploy Script - v7.3.91-3
# ============================================================================
# Datum: 15. Februar 2026
# Fix: Zurueck-Button in Zeiterfassung fuehrt zur Ausgangsseite
# ============================================================================

set -e

PZE_DIR="$HOME/Documents/Dev/PZE"
DOWNLOADS="$PZE_DIR/downloads"

echo "============================================"
echo "PZE Deploy v7.3.91-3"
echo "============================================"

cd "$PZE_DIR"

# Branch pruefen
CURRENT_BRANCH=$(git branch --show-current)
echo "Branch: $CURRENT_BRANCH"
if [ "$CURRENT_BRANCH" != "v7-dev" ]; then
  echo "Wechsle auf v7-dev..."
  git checkout v7-dev
fi
echo ""

# 1. Mein Status Seite (mit returnUrl)
echo "--- mein-status-page-v7_3_91.tsx ---"
mkdir -p "$PZE_DIR/src/app/v7/firma/mein-status"
cp "$DOWNLOADS/mein-status-page-v7_3_91.tsx" "$PZE_DIR/src/app/v7/firma/mein-status/page.tsx"
echo "  -> src/app/v7/firma/mein-status/page.tsx"

# 2. TimesheetForm (initialYear/Month Props)
echo "--- TimesheetForm-v7_3_91.tsx ---"
cp "$DOWNLOADS/TimesheetForm-v7_3_91.tsx" "$PZE_DIR/src/components/shared/TimesheetForm.tsx"
echo "  -> src/components/shared/TimesheetForm.tsx"

# 3. Zeiterfassung-Seite (returnUrl onBack)
echo "--- zeiterfassung-page-v7_3_91.tsx ---"
cp "$DOWNLOADS/zeiterfassung-page-v7_3_91.tsx" "$PZE_DIR/src/app/v7/firma/zeiterfassung/page.tsx"
echo "  -> src/app/v7/firma/zeiterfassung/page.tsx"

echo ""
echo "============================================"
echo "Fertig! Teste:"
echo "  1. Mein Status -> Klick auf roten Monat"
echo "  2. Zeiterfassung oeffnet mit richtigem Monat"
echo "  3. Zurueck-Button -> landet wieder bei Mein Status"
echo ""
echo "Dann committen:"
echo "  git add -A"
echo "  git commit -m 'v7.3.91: Mein Status + returnUrl Navigation'"
echo "  git push origin v7-dev"
echo "============================================"
