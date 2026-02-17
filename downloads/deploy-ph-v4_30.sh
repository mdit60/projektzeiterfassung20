#!/bin/bash
# ============================================================================
# PZE Deploy Script - Pflichtenheft v4.30
# ============================================================================
set -e

PROJ_DIR="$HOME/Documents/Dev/PZE"
DL_DIR="$HOME/Documents/Dev/PZE/downloads"

echo "============================================"
echo "PZE Deploy: Pflichtenheft v4.30"
echo "============================================"

cd "$PROJ_DIR"

BRANCH=$(git branch --show-current)
echo "Aktueller Branch: $BRANCH"
if [ "$BRANCH" != "v7-dev" ]; then
    echo "WARNUNG: Nicht auf v7-dev! Wechsle..."
    git checkout v7-dev
fi

echo ""
echo "1. Kopiere Pflichtenheft v4.30..."
cp "$DL_DIR/PFLICHTENHEFT-v4_30.md" "$PROJ_DIR/docs/PFLICHTENHEFT-v4_30.md"
echo "   -> docs/PFLICHTENHEFT-v4_30.md"

echo ""
echo "2. Git commit..."
git add -A
git commit -m "docs: Pflichtenheft v4.30 - v7.3.92+93, Prod-DB, PDF-Export Fix"
git push origin v7-dev

echo ""
echo "COMMIT ABGESCHLOSSEN"
echo "============================================"
