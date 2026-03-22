#!/bin/bash
# ============================================================
# PZE Deploy: ProjectDetailPage v7.4.4-7
# FIX: WorkPackageTable prop wpAssignments -> assignments
# ============================================================
# Ausfuehren aus: ~/Documents/Dev/PZE/
# ============================================================

set -e

PROJECT_DIR="$HOME/Documents/Dev/PZE"
DOWNLOADS_DIR="$PROJECT_DIR/downloads"

SRC="$DOWNLOADS_DIR/ProjectDetailPage-v7_4_4-7.tsx"
DST="$PROJECT_DIR/src/components/shared/ProjectDetailPage.tsx"

echo "=== PZE Deploy: ProjectDetailPage v7.4.4-7 ==="

if [ ! -f "$SRC" ]; then
  echo "FEHLER: Nicht gefunden: $SRC"
  exit 1
fi

cd "$PROJECT_DIR"
BRANCH=$(git branch --show-current)
echo "Aktueller Branch: $BRANCH"
if [ "$BRANCH" != "v7-dev" ]; then
  echo "WARNUNG: Nicht auf v7-dev! Bitte Branch wechseln."
  exit 1
fi

cp "$DST" "$DST.bak"
echo "Backup erstellt"

cp "$SRC" "$DST"
echo "Kopiert: ProjectDetailPage.tsx -> components/shared/"

git add "$DST"
git commit -m "v7.4.4-7: FIX WorkPackageTable prop wpAssignments -> assignments"
git push origin v7-dev
echo "v7-dev: push erfolgreich"

git checkout main
git merge v7-dev -m "v7.4.4-7: Merge v7-dev -> main"
git push origin main
echo "main: push erfolgreich"

git checkout v7-dev
echo "Zurueck auf v7-dev"

echo ""
echo "=== Deploy erfolgreich ==="
echo "Bitte testen unter: https://pze.itenion.com"
echo ""
