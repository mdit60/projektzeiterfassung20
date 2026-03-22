#!/bin/bash
# ============================================================
# PZE Deploy: ProjectDetailPage v7.4.4-6
# FIX: ProjectTeamManager Props korrigiert
#      companyId -> clientCompanyId
#      onTeamChanged -> onTeamChange
#      isAdmin -> canEdit
# ============================================================
# Ausfuehren aus: ~/Documents/Dev/PZE/
# ============================================================

set -e

PROJECT_DIR="$HOME/Documents/Dev/PZE"
DOWNLOADS_DIR="$PROJECT_DIR/downloads"

SRC="$DOWNLOADS_DIR/ProjectDetailPage-v7_4_4-6.tsx"
DST="$PROJECT_DIR/src/components/shared/ProjectDetailPage.tsx"

echo "=== PZE Deploy: ProjectDetailPage v7.4.4-6 ==="

# Quelldatei pruefen
if [ ! -f "$SRC" ]; then
  echo "FEHLER: Nicht gefunden: $SRC"
  exit 1
fi

# Zielverzeichnis pruefen
if [ ! -d "$(dirname "$DST")" ]; then
  echo "FEHLER: Verzeichnis nicht gefunden: $(dirname "$DST")"
  exit 1
fi

# Branch pruefen
cd "$PROJECT_DIR"
BRANCH=$(git branch --show-current)
echo "Aktueller Branch: $BRANCH"
if [ "$BRANCH" != "v7-dev" ]; then
  echo "WARNUNG: Nicht auf v7-dev! Bitte Branch wechseln und erneut ausfuehren."
  exit 1
fi

# Backup
cp "$DST" "$DST.bak"
echo "Backup erstellt: ProjectDetailPage.tsx.bak"

# Datei kopieren
cp "$SRC" "$DST"
echo "Kopiert: ProjectDetailPage.tsx -> components/shared/"

# Git commit auf v7-dev
git add "$DST"
git commit -m "v7.4.4-6: FIX ProjectTeamManager Props (clientCompanyId, onTeamChange, canEdit)"
git push origin v7-dev
echo "v7-dev: push erfolgreich"

# Merge auf main (Produktion)
git checkout main
git merge v7-dev -m "v7.4.4-6: Merge v7-dev -> main"
git push origin main
echo "main: push erfolgreich"

# Zurueck auf v7-dev
git checkout v7-dev
echo "Zurueck auf v7-dev"

echo ""
echo "=== Deploy auf v7-dev + main (Produktion) erfolgreich ==="
echo "Vercel baut automatisch. Bitte testen unter: https://pze.itenion.com"
echo ""
