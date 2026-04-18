#!/bin/bash
# ============================================================
# PZE Deploy: FirmendatenCard v7.4.4-1 + Firma-Detail v7.4.4-3
# Firmendaten bearbeiten als Shared Component
# ============================================================
# Ausfuehren aus: ~/Documents/Dev/PZE/
# ============================================================

set -e

PROJECT_DIR="$HOME/Documents/Dev/PZE"
DOWNLOADS_DIR="$PROJECT_DIR/downloads"

SRC_CARD="$DOWNLOADS_DIR/FirmendatenCard-v7_4_4-1.tsx"
SRC_DETAIL="$DOWNLOADS_DIR/berater-firma-detail-page-v7_4_4-3.tsx"

DST_CARD="$PROJECT_DIR/src/components/shared/FirmendatenCard.tsx"
DST_DETAIL="$PROJECT_DIR/src/app/v7/berater/foerderung/firma/[id]/page.tsx"

echo "=== PZE Deploy: FirmendatenCard + Firma-Detail v7.4.4-3 ==="

# Quelldateien pruefen
if [ ! -f "$SRC_CARD" ]; then
  echo "FEHLER: Nicht gefunden: $SRC_CARD"
  exit 1
fi
if [ ! -f "$SRC_DETAIL" ]; then
  echo "FEHLER: Nicht gefunden: $SRC_DETAIL"
  exit 1
fi

# Zielverzeichnisse pruefen
if [ ! -d "$(dirname "$DST_CARD")" ]; then
  echo "FEHLER: Verzeichnis nicht gefunden: $(dirname "$DST_CARD")"
  exit 1
fi
if [ ! -d "$(dirname "$DST_DETAIL")" ]; then
  echo "FEHLER: Verzeichnis nicht gefunden: $(dirname "$DST_DETAIL")"
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

# Backups erstellen
cp "$DST_DETAIL" "$DST_DETAIL.bak"
echo "Backup erstellt: page.tsx.bak"

# Dateien kopieren
cp "$SRC_CARD" "$DST_CARD"
echo "Kopiert: FirmendatenCard.tsx -> components/shared/"

cp "$SRC_DETAIL" "$DST_DETAIL"
echo "Kopiert: berater-firma-detail-page -> foerderung/firma/[id]/page.tsx"

# Git commit auf v7-dev
git add "$DST_CARD"
git add "$DST_DETAIL"
git commit -m "v7.4.4-3: FirmendatenCard Shared Component + Berater Firma-Detail aktualisiert"
git push origin v7-dev
echo "v7-dev: push erfolgreich"

# Merge auf main (Produktion)
git checkout main
git merge v7-dev -m "v7.4.4-3: Merge v7-dev -> main"
git push origin main
echo "main: push erfolgreich"

# Zurueck auf v7-dev
git checkout v7-dev
echo "Zurueck auf v7-dev"

echo ""
echo "=== Deploy auf v7-dev + main (Produktion) erfolgreich ==="
echo "Vercel baut automatisch. Bitte testen unter: https://pze.itenion.com"
echo ""
