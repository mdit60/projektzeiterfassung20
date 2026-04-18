#!/bin/bash
# ============================================================================
# PZE Deploy Script - v7.3.91-2
# ============================================================================
# Datum: 15. Februar 2026
#
# Fix: TimesheetForm initialYear/initialMonth Props
# ============================================================================

set -e

PZE_DIR="$HOME/Documents/Dev/PZE"
DOWNLOADS="$PZE_DIR/downloads"

echo "============================================"
echo "PZE Deploy v7.3.91-2"
echo "============================================"
echo ""

cd "$PZE_DIR"

# Branch pruefen
CURRENT_BRANCH=$(git branch --show-current)
echo "Branch: $CURRENT_BRANCH"
if [ "$CURRENT_BRANCH" != "v7-dev" ]; then
  echo "WARNUNG: Wechsle auf v7-dev..."
  git checkout v7-dev
fi
echo ""

# TimesheetForm aktualisieren
echo "--- TimesheetForm v7.3.91 ---"
if [ -f "$DOWNLOADS/TimesheetForm-v7_3_91.tsx" ]; then
  cp "$DOWNLOADS/TimesheetForm-v7_3_91.tsx" "$PZE_DIR/src/components/shared/TimesheetForm.tsx"
  echo "  TimesheetForm-v7_3_91.tsx -> src/components/shared/TimesheetForm.tsx"
else
  echo "  FEHLER: TimesheetForm-v7_3_91.tsx nicht gefunden!"
  exit 1
fi

echo ""
echo "============================================"
echo "Fertig! Teste mit:"
echo "  1. http://localhost:3000/v7/firma/mein-status"
echo "  2. Klick auf roten Monat -> Zeiterfassung sollte"
echo "     den richtigen Monat vorausgewaehlt haben"
echo ""
echo "Dann committen:"
echo "  git add -A"
echo "  git commit -m 'v7.3.91: Mein Status + TimesheetForm initialYear/Month'"
echo "  git push origin v7-dev"
echo "============================================"
