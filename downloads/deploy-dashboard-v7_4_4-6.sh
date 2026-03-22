#!/bin/bash
# ============================================================
# PZE Deploy: Berater-Dashboard v7.4.4-6
# Neue Firma Modal
# ============================================================
# Ausfuehren aus: ~/Documents/Dev/PZE/
# ============================================================

set -e

PROJECT_DIR="$HOME/Documents/Dev/PZE"
DOWNLOADS_DIR="$PROJECT_DIR/downloads"
TARGET="$PROJECT_DIR/src/app/v7/berater/dashboard/page.tsx"
SOURCE="$DOWNLOADS_DIR/berater-dashboard-page-v7_4_4-6.tsx"

echo "=== PZE Deploy: Berater-Dashboard v7.4.4-6 ==="

# Pruefen ob Quelldatei vorhanden
if [ ! -f "$SOURCE" ]; then
  echo "FEHLER: Quelldatei nicht gefunden: $SOURCE"
  exit 1
fi

# Pruefen ob Zielverzeichnis existiert
if [ ! -d "$(dirname "$TARGET")" ]; then
  echo "FEHLER: Zielverzeichnis nicht gefunden: $(dirname "$TARGET")"
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

# Backup der alten Datei
cp "$TARGET" "$TARGET.bak"
echo "Backup erstellt: page.tsx.bak"

# Datei kopieren
cp "$SOURCE" "$TARGET"
echo "Datei kopiert nach: $TARGET"

# Commit auf v7-dev
git add "$TARGET"
git commit -m "v7.4.4-6: Neue Firma Modal im Berater-Dashboard"
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
