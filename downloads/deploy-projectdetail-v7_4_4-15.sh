#!/bin/bash
# ============================================================
# PZE Deploy: ProjectDetailPage v7.4.4-15
# ROOT CAUSE BEHOBEN:
# wpAssignmentsData Query mit !inner warf silent Exception
# => setTeamMembers wurde nie aufgerufen => teamMembers leer
# FIX: Alle !inner entfernt, wpAssignmentsData Query vereinfacht
# ============================================================
set -e
PROJECT_DIR="$HOME/Documents/Dev/PZE"
SRC="$PROJECT_DIR/downloads/ProjectDetailPage-v7_4_4-15.tsx"
DST="$PROJECT_DIR/src/components/shared/ProjectDetailPage.tsx"
echo "=== PZE Deploy: ProjectDetailPage v7.4.4-15 ==="
if [ ! -f "$SRC" ]; then echo "FEHLER: $SRC nicht gefunden"; exit 1; fi
cd "$PROJECT_DIR"
BRANCH=$(git branch --show-current)
if [ "$BRANCH" != "v7-dev" ]; then echo "WARNUNG: Nicht auf v7-dev!"; exit 1; fi
cp "$DST" "$DST.bak"
cp "$SRC" "$DST"
git add "$DST"
git commit -m "v7.4.4-15: FIX wpAssignmentsData !inner Exception - teamMembers korrekt geladen"
git push origin v7-dev
git checkout main
git merge v7-dev -m "v7.4.4-15: Merge v7-dev -> main"
git push origin main
git checkout v7-dev
echo "=== Deploy erfolgreich - Bitte testen: https://pze.itenion.com ==="
