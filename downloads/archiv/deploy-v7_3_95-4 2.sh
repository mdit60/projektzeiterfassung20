#!/bin/bash
# ============================================================
# PZE Deploy v7.3.95-4
# ============================================================
# mein-status-page: Ampel-Fix + Manual-Download
#   1. Ampel: Gruen = alle Arbeitstage (statt 80%)
#   2. Orange = "In Bearbeitung" (statt "Teilweise erfasst")
#   3. Rollenbasierter PDF-Download fuer Benutzerhandbuch
# ============================================================

set -e

PROJECT_DIR="$HOME/Documents/Dev/PZE"
DOWNLOADS_DIR="$HOME/Documents/Dev/PZE/downloads"

echo "=== PZE Deploy v7.3.95-4 ==="
echo ""

# 0. Branch pruefen
cd "$PROJECT_DIR"
CURRENT_BRANCH=$(git branch --show-current)
echo "Aktueller Branch: $CURRENT_BRANCH"
if [ "$CURRENT_BRANCH" != "v7-dev" ]; then
  echo "FEHLER: Nicht auf v7-dev! Wechsle..."
  git checkout v7-dev
fi
echo ""

# 1. Pruefen ob manuals-Verzeichnis existiert
if [ ! -d "$PROJECT_DIR/public/manuals" ]; then
  echo "FEHLER: public/manuals Verzeichnis nicht gefunden!"
  exit 1
fi
echo "public/manuals/ vorhanden:"
ls -la "$PROJECT_DIR/public/manuals/"
echo ""

# 2. Datei kopieren
echo "1. mein-status-page-v7_3_95-3.tsx -> src/app/v7/firma/mein-status/page.tsx"
cp "$DOWNLOADS_DIR/mein-status-page-v7_3_95-3.tsx" "$PROJECT_DIR/src/app/v7/firma/mein-status/page.tsx"

echo ""
echo "=== Datei kopiert ==="
echo ""

# 3. Build testen
echo "2. Build testen..."
pnpm build

echo ""
echo "=== Build erfolgreich ==="
echo ""

# 4. Git commit & push v7-dev
echo "3. Git commit & push v7-dev..."
git add -A
git status
git commit -m "v7.3.95-4: Mein Status - Ampel-Fix (100% statt 80%), In Bearbeitung, Manual-Download"
git push origin v7-dev

echo ""
echo "=== v7-dev deployed ==="
echo ""

# 5. Merge auf main
echo "4. Merge auf main fuer Production..."
git checkout main
git merge v7-dev -m "Merge v7-dev: v7.3.95-4 Mein Status Ampel + Manual-Download"
git push origin main

echo ""
echo "=== main/Production deployed ==="
echo ""

# 6. Zurueck auf v7-dev
git checkout v7-dev

echo ""
echo "========================================="
echo "  Deploy v7.3.95-4 KOMPLETT"
echo "========================================="
echo ""
echo "Aenderungen:"
echo "  1. Ampel: Gruen = alle Arbeitstage haben Eintraege"
echo "  2. Orange = In Bearbeitung"
echo "  3. Manual-Download je nach Rolle (MA/PL/Admin)"
echo ""
echo "Deployed auf: v7-dev + main (pze.itenion.com)"
echo "Aktueller Branch: $(git branch --show-current)"
