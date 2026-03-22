#!/bin/bash
# ============================================================
# PZE Deploy: ProjectDetailPage v7.4.4-8 + ProjectTeamManager v7.4.4-2
# FIX 1: teamMembers-Query neq false (neu angelegte MA sichtbar)
# FIX 2: WorkPackageTable alle Props korrekt
# FIX 3: EditMemberDialog zweispaltig (nicht mehr abgeschnitten)
# ============================================================
# Ausfuehren aus: ~/Documents/Dev/PZE/
# ============================================================

set -e

PROJECT_DIR="$HOME/Documents/Dev/PZE"
DOWNLOADS_DIR="$PROJECT_DIR/downloads"

SRC_DETAIL="$DOWNLOADS_DIR/ProjectDetailPage-v7_4_4-8.tsx"
SRC_TEAM="$DOWNLOADS_DIR/ProjectTeamManager-v7_4_4-2.tsx"

DST_DETAIL="$PROJECT_DIR/src/components/shared/ProjectDetailPage.tsx"
DST_TEAM="$PROJECT_DIR/src/components/shared/ProjectTeamManager.tsx"

echo "=== PZE Deploy: ProjectDetailPage v7.4.4-8 + ProjectTeamManager v7.4.4-2 ==="

if [ ! -f "$SRC_DETAIL" ]; then
  echo "FEHLER: Nicht gefunden: $SRC_DETAIL"
  exit 1
fi
if [ ! -f "$SRC_TEAM" ]; then
  echo "FEHLER: Nicht gefunden: $SRC_TEAM"
  exit 1
fi

cd "$PROJECT_DIR"
BRANCH=$(git branch --show-current)
echo "Aktueller Branch: $BRANCH"
if [ "$BRANCH" != "v7-dev" ]; then
  echo "WARNUNG: Nicht auf v7-dev! Bitte Branch wechseln."
  exit 1
fi

cp "$DST_DETAIL" "$DST_DETAIL.bak"
cp "$DST_TEAM" "$DST_TEAM.bak"
echo "Backups erstellt"

cp "$SRC_DETAIL" "$DST_DETAIL"
echo "Kopiert: ProjectDetailPage.tsx"

cp "$SRC_TEAM" "$DST_TEAM"
echo "Kopiert: ProjectTeamManager.tsx"

git add "$DST_DETAIL"
git add "$DST_TEAM"
git commit -m "v7.4.4-8: FIX teamMembers-Query + WorkPackageTable Props + EditDialog zweispaltig"
git push origin v7-dev
echo "v7-dev: push erfolgreich"

git checkout main
git merge v7-dev -m "v7.4.4-8: Merge v7-dev -> main"
git push origin main
echo "main: push erfolgreich"

git checkout v7-dev
echo "Zurueck auf v7-dev"

echo ""
echo "=== Deploy erfolgreich ==="
echo "Bitte testen unter: https://pze.itenion.com"
echo ""
