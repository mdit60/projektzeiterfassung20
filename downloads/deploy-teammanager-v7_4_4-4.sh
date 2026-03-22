#!/bin/bash
# ============================================================
# PZE Deploy: ProjectTeamManager v7.4.4-4
# - AddMemberDialog: vollstaendige Anlage-6.1-Felder, zweispaltig
# - EditMemberDialog: max-w-2xl, scrollbar (nicht mehr abgeschnitten)
# - handleAddMember: speichert alle Anlage-6.1-Felder
# ============================================================
# Ausfuehren aus: ~/Documents/Dev/PZE/
# ============================================================

set -e

PROJECT_DIR="$HOME/Documents/Dev/PZE"
DOWNLOADS_DIR="$PROJECT_DIR/downloads"
SRC="$DOWNLOADS_DIR/ProjectTeamManager-v7_4_4-4.tsx"
DST="$PROJECT_DIR/src/components/shared/ProjectTeamManager.tsx"

echo "=== PZE Deploy: ProjectTeamManager v7.4.4-4 ==="

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
echo "Kopiert: ProjectTeamManager.tsx -> components/shared/"

git add "$DST"
git commit -m "v7.4.4-4: AddMemberDialog Anlage-6.1 zweispaltig + EditDialog fix"
git push origin v7-dev
echo "v7-dev: push erfolgreich"

git checkout main
git merge v7-dev -m "v7.4.4-4: Merge v7-dev -> main"
git push origin main
echo "main: push erfolgreich"

git checkout v7-dev
echo "Zurueck auf v7-dev"

echo ""
echo "=== Deploy erfolgreich ==="
echo "Bitte testen unter: https://pze.itenion.com"
echo ""
