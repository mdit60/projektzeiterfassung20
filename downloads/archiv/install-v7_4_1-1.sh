#!/bin/bash
# PZE v7.4.1-1 - Hotfix: UPSERT statt INSERT fuer v7_user_profiles
set -e
PZE_DIR="$HOME/Documents/Dev/pze"
DOWNLOAD_DIR="$HOME/Documents/Dev/pze/downloads"

echo "=== PZE v7.4.1-1 Hotfix ==="

cp "$DOWNLOAD_DIR/foerderung-page-v7_4_1-1.tsx" \
   "$PZE_DIR/src/app/v7/berater/foerderung/page.tsx"
echo "[1/3] Foerderung-Seite aktualisiert"

cd "$PZE_DIR"
git add -A
git commit -m "v7.4.1-1: UPSERT fuer v7_user_profiles (Trigger-Kompatibilitaet)"
echo "[2/3] Git commit erstellt"

git push origin main
git push origin v7-dev
echo "[3/3] Push auf main + v7-dev"

echo ""
echo "=== Fertig! Warte auf Vercel Deployment ==="
