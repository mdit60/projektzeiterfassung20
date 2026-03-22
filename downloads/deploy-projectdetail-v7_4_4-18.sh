#!/bin/bash
# ============================================================
# PZE Deploy: ProjectDetailPage v7.4.4-18
# SAUBERER NEUAUFBAU auf Basis v7_4_4-5
# Fix 1: Profil per user.id (statt user.email) => ROOT CAUSE
# Fix 2: v7_employees!inner => v7_employees
# Fix 3: wpAssignmentsData ohne !inner und join-filter
# Fix 4: ProjectTeamManager Props korrekt
# Fix 5: WorkPackageTable Props korrekt
# ============================================================
set -e
PROJECT_DIR="$HOME/Documents/Dev/PZE"
SRC="$PROJECT_DIR/downloads/ProjectDetailPage-v7_4_4-18.tsx"
DST="$PROJECT_DIR/src/components/shared/ProjectDetailPage.tsx"
echo "=== PZE Deploy: ProjectDetailPage v7.4.4-18 - FINALER FIX ==="
if [ ! -f "$SRC" ]; then echo "FEHLER: $SRC nicht gefunden"; exit 1; fi
cd "$PROJECT_DIR"
BRANCH=$(git branch --show-current)
echo "Branch: $BRANCH"
if [ "$BRANCH" != "v7-dev" ]; then echo "WARNUNG: Nicht auf v7-dev!"; exit 1; fi
cp "$DST" "$DST.bak"
cp "$SRC" "$DST"
git add "$DST"
git commit -m "v7.4.4-18: ROOT CAUSE FIX - Profil per user.id + alle Props korrekt"
git push origin v7-dev
echo "v7-dev: OK"
git checkout main
git merge v7-dev -m "v7.4.4-18: Merge v7-dev -> main"
git push origin main
echo "main: OK"
git checkout v7-dev
echo ""
echo "=== Deploy erfolgreich ==="
echo "Bitte testen: https://pze.itenion.com"
