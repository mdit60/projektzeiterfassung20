#!/bin/bash
# ============================================================================
# PZE Deploy Script - TimesheetForm v7.3.93
# ============================================================================
set -e

PROJ_DIR="$HOME/Documents/Dev/PZE"
DL_DIR="$HOME/Documents/Dev/PZE/downloads"

echo "============================================"
echo "PZE Deploy: TimesheetForm v7.3.93"
echo "============================================"

cd "$PROJ_DIR"

BRANCH=$(git branch --show-current)
echo "Aktueller Branch: $BRANCH"
if [ "$BRANCH" != "v7-dev" ]; then
    echo "WARNUNG: Nicht auf v7-dev! Wechsle..."
    git checkout v7-dev
fi

echo ""
echo "1. Kopiere TimesheetForm v7.3.93..."
cp "$DL_DIR/TimesheetForm-v7_3_93.tsx" "$PROJ_DIR/src/components/shared/TimesheetForm.tsx"
echo "   -> src/components/shared/TimesheetForm.tsx"

echo ""
echo "2. Build testen..."
pnpm build

if [ $? -eq 0 ]; then
    echo ""
    echo "BUILD ERFOLGREICH!"
    echo ""
    echo "3. Git commit..."
    git add -A
    git commit -m "v7.3.93: Fix PDF-Export (neuer Tab) + read-only Dropdowns in Stundennachweis-Vorschau"
    git push origin v7-dev
    echo ""
    echo "DEPLOY ABGESCHLOSSEN - Vercel deployed automatisch"
else
    echo "BUILD FEHLGESCHLAGEN!"
    exit 1
fi
