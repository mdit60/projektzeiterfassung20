#!/bin/bash
# ============================================================================
# PZE Deploy Script - Berater-Verwaltung v7.3.94
# ============================================================================
set -e

PROJ_DIR="$HOME/Documents/Dev/PZE"
DL_DIR="$HOME/Documents/Dev/PZE/downloads"

echo "============================================"
echo "PZE Deploy: Berater-Verwaltung v7.3.94"
echo "============================================"

cd "$PROJ_DIR"

BRANCH=$(git branch --show-current)
echo "Aktueller Branch: $BRANCH"
if [ "$BRANCH" != "v7-dev" ]; then
    echo "Wechsle auf v7-dev..."
    git checkout v7-dev
fi

echo ""
echo "1. Kopiere ConsultantManagement..."
cp "$DL_DIR/ConsultantManagement-v7_3_94.tsx" "$PROJ_DIR/src/components/shared/ConsultantManagement.tsx"
echo "   -> src/components/shared/ConsultantManagement.tsx"

echo ""
echo "2. Erstelle Admin-Seite Verzeichnis..."
mkdir -p "$PROJ_DIR/src/app/v7/berater/admin"

echo ""
echo "3. Kopiere Admin-Seite..."
cp "$DL_DIR/berater-admin-page-v7_3_94.tsx" "$PROJ_DIR/src/app/v7/berater/admin/page.tsx"
echo "   -> src/app/v7/berater/admin/page.tsx"

echo ""
echo "4. Build testen..."
pnpm build

if [ $? -eq 0 ]; then
    echo ""
    echo "BUILD ERFOLGREICH!"
    echo ""
    echo "5. Git commit..."
    git add -A
    git commit -m "v7.3.94: Berater-Verwaltung (system_admin) - ConsultantManagement + Admin-Seite"
    git push origin v7-dev
    echo ""
    echo "DEPLOY ABGESCHLOSSEN - Vercel deployed automatisch"
else
    echo "BUILD FEHLGESCHLAGEN!"
    exit 1
fi
