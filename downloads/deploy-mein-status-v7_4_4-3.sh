#!/bin/bash
# ============================================================================
# PZE V7 - Deployment Script
# Datei: mein-status-page-v7_4_4-3.tsx
# Ziel:  src/app/v7/firma/mein-status/page.tsx
# Datum: 13. Maerz 2026
# ============================================================================
# ABLAUF:
#   1. Branch pruefen (muss v7-dev sein)
#   2. Datei aus downloads/ ins src/ kopieren
#   3. git add / commit / push -> v7-dev (Vercel Preview Auto-Deploy)
#   4. Merge in main + push -> Vercel Production Auto-Deploy
# ============================================================================

set -e  # Abbruch bei Fehler

PZE_DIR="$HOME/Documents/Dev/PZE"
DOWNLOADS_DIR="$PZE_DIR/downloads"
SRC_FILE="$DOWNLOADS_DIR/mein-status-page-v7_4_4-3.tsx"
TARGET_FILE="$PZE_DIR/src/app/v7/firma/mein-status/page.tsx"
COMMIT_MSG="v7.4.4-3: ZA-Ampel-Kachel in Mein-Status (Step 5 ZA-Modul)"

echo "============================================"
echo " PZE Deploy: mein-status-page v7.4.4-3"
echo "============================================"
echo ""

# ----------------------------------------------------------------------------
# 0. Projektverzeichnis wechseln
# ----------------------------------------------------------------------------
cd "$PZE_DIR" || { echo "FEHLER: Verzeichnis nicht gefunden: $PZE_DIR"; exit 1; }
echo "[0] Projektverzeichnis: $(pwd)"
echo ""

# ----------------------------------------------------------------------------
# 1. Git-Lock entfernen (falls vorhanden)
# ----------------------------------------------------------------------------
if [ -f ".git/index.lock" ]; then
  echo "[1] Git-Lock gefunden, wird entfernt..."
  rm -f .git/index.lock
fi

# ----------------------------------------------------------------------------
# 2. Branch pruefen - MUSS v7-dev sein
# ----------------------------------------------------------------------------
CURRENT_BRANCH=$(git branch --show-current)
echo "[2] Aktueller Branch: $CURRENT_BRANCH"

if [ "$CURRENT_BRANCH" != "v7-dev" ]; then
  echo ""
  echo "FEHLER: Falscher Branch! Erwartet: v7-dev  Aktuell: $CURRENT_BRANCH"
  echo "Bitte zuerst: git checkout v7-dev"
  exit 1
fi
echo "    Branch OK (v7-dev)"
echo ""

# ----------------------------------------------------------------------------
# 3. Quelldatei pruefen
# ----------------------------------------------------------------------------
echo "[3] Quelldatei pruefen..."
if [ ! -f "$SRC_FILE" ]; then
  echo "FEHLER: Quelldatei nicht gefunden:"
  echo "  $SRC_FILE"
  echo ""
  echo "Bitte Datei zuerst nach $DOWNLOADS_DIR kopieren."
  exit 1
fi
echo "    OK: $SRC_FILE"
echo ""

# ----------------------------------------------------------------------------
# 4. Zielverzeichnis sicherstellen
# ----------------------------------------------------------------------------
echo "[4] Zielverzeichnis sicherstellen..."
TARGET_DIR=$(dirname "$TARGET_FILE")
mkdir -p "$TARGET_DIR"
echo "    OK: $TARGET_DIR"
echo ""

# ----------------------------------------------------------------------------
# 5. Datei kopieren
# ----------------------------------------------------------------------------
echo "[5] Datei kopieren..."
cp "$SRC_FILE" "$TARGET_FILE"
echo "    $SRC_FILE"
echo "    -> $TARGET_FILE"
echo ""

# ----------------------------------------------------------------------------
# 6. Git: add + commit + push -> v7-dev
# ----------------------------------------------------------------------------
echo "[6] Git commit + push -> v7-dev ..."
git add "$TARGET_FILE"
git commit -m "$COMMIT_MSG"
git push origin v7-dev
echo ""
echo "    Vercel Preview-Deploy gestartet (automatisch)"
echo "    URL: https://projektzeiterfassung20-git-v7-dev-mdit60.vercel.app"
echo ""

# ----------------------------------------------------------------------------
# 7. Merge in main + push -> Production
# ----------------------------------------------------------------------------
echo "[7] Merge in main + push -> Production ..."
git checkout main
git merge v7-dev --no-edit
git push origin main
echo ""
echo "    Vercel Production-Deploy gestartet (automatisch)"
echo "    URL: https://pze.itenion.com"
echo ""

# ----------------------------------------------------------------------------
# 8. Zurueck zu v7-dev
# ----------------------------------------------------------------------------
git checkout v7-dev
echo "[8] Zurueck auf Branch: v7-dev"
echo ""

# ----------------------------------------------------------------------------
# FERTIG
# ----------------------------------------------------------------------------
echo "============================================"
echo " DEPLOYMENT ABGESCHLOSSEN"
echo "============================================"
echo ""
echo " Preview:    https://projektzeiterfassung20-git-v7-dev-mdit60.vercel.app/v7/firma/mein-status"
echo " Production: https://pze.itenion.com/v7/firma/mein-status"
echo ""
echo " Testen als: client_admin oder project_leader"
echo " -> ZA-Ampel-Kachel erscheint unterhalb der Projekt-Karten"
echo " -> Nur fuer ZIM-Projekte sichtbar"
echo " -> Nur fuer client_admin und project_leader sichtbar"
echo ""
