#!/bin/bash
# ============================================================================
# PZE V7 - Deployment Script
# Datei: ZAPanel-v7_4_4-17.tsx
# Ziel:  src/components/shared/ZAPanel.tsx
# Datum: 13. Maerz 2026
# ============================================================================

set -e

PZE_DIR="$HOME/Documents/Dev/PZE"
DOWNLOADS_DIR="$PZE_DIR/downloads"
SRC_FILE="$DOWNLOADS_DIR/ZAPanel-v7_4_4-17.tsx"
TARGET_FILE="$PZE_DIR/src/components/shared/ZAPanel.tsx"
COMMIT_MSG="v7.4.4-17: ZA Status-Workflow (Entwurf -> Eingereicht -> Bewilligt)"

echo "============================================"
echo " PZE Deploy: ZAPanel v7.4.4-17"
echo "============================================"
echo ""

cd "$PZE_DIR" || { echo "FEHLER: Verzeichnis nicht gefunden: $PZE_DIR"; exit 1; }
echo "[0] Projektverzeichnis: $(pwd)"
echo ""

[ -f ".git/index.lock" ] && rm -f .git/index.lock

CURRENT_BRANCH=$(git branch --show-current)
echo "[1] Branch: $CURRENT_BRANCH"
if [ "$CURRENT_BRANCH" != "v7-dev" ]; then
  echo "FEHLER: Falscher Branch! Erwartet: v7-dev"
  exit 1
fi
echo "    OK"
echo ""

echo "[2] Quelldatei pruefen..."
if [ ! -f "$SRC_FILE" ]; then
  echo "FEHLER: $SRC_FILE nicht gefunden"
  exit 1
fi
echo "    OK: $SRC_FILE"
echo ""

echo "[3] Datei kopieren..."
cp "$SRC_FILE" "$TARGET_FILE"
echo "    -> $TARGET_FILE"
echo ""

echo "[4] Git commit + push -> v7-dev ..."
git add "$TARGET_FILE"
git commit -m "$COMMIT_MSG"
git push origin v7-dev
echo "    Vercel Preview-Deploy gestartet"
echo ""

echo "[5] Merge in main + push -> Production ..."
git checkout main
git merge v7-dev --no-edit
git push origin main
echo "    Vercel Production-Deploy gestartet"
echo ""

git checkout v7-dev
echo "[6] Zurueck auf Branch: v7-dev"
echo ""

echo "============================================"
echo " DEPLOYMENT ABGESCHLOSSEN"
echo "============================================"
echo ""
echo " Testen: https://pze.itenion.com/v7/firma/berichte"
echo " -> ZA oeffnen -> gespeicherte ZA auswaehlen"
echo " -> Status-Badge in ZA-Liste sichtbar"
echo " -> Status-Steuerblock unterhalb Speichern-Button"
echo " -> Buttons: Eingereicht / Bewilligt / Zurueck zu Entwurf"
echo ""
