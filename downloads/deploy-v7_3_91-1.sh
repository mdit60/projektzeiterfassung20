#!/bin/bash
# ============================================================
# PZE v7.3.91-1 Deployment: Firmendaten-Bearbeiten Fix
# Datum: 16. Februar 2026
# ============================================================

set -e

DOWNLOADS="$HOME/Documents/Dev/PZE/downloads"
PROJECT="$HOME/Documents/Dev/PZE"

echo "=== PZE v7.3.91-1: Firmendaten-Bearbeiten ==="
echo ""

# Datei kopieren
echo "1. Datei kopieren..."
cp "$DOWNLOADS/v7-firma-detail-page-v7_3_91-1.tsx" \
   "$PROJECT/src/app/v7/berater/foerderung/firma/[id]/page.tsx"

echo "   -> page.tsx aktualisiert"

# Build testen
echo ""
echo "2. Build testen..."
cd "$PROJECT"
pnpm build

if [ $? -eq 0 ]; then
  echo ""
  echo "=== Build erfolgreich! ==="
  echo ""
  echo "3. Git commit..."
  git add -A
  git commit -m "v7.3.91-1: Firmendaten-Bearbeiten implementiert (war nur TODO)"
  git push origin v7-dev
  
  echo ""
  echo "=== Deployment abgeschlossen ==="
  echo "   Teste auf v7-dev Preview URL"
  echo ""
  echo "   Fuer Production (main):"
  echo "   git checkout main && git merge v7-dev && git push origin main && git checkout v7-dev"
else
  echo ""
  echo "!!! BUILD FEHLER - nicht committen !!!"
fi
