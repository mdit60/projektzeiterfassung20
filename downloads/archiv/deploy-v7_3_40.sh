#!/bin/bash
# ============================================
# DEPLOYMENT SCRIPT v7.3.40
# Berater-Detailseite komplett bereinigt
# ============================================

echo "=== PZE V7.3.40 Deployment ==="
echo ""

# Prüfen ob wir im richtigen Verzeichnis sind
if [ ! -f "package.json" ]; then
    echo "FEHLER: package.json nicht gefunden!"
    echo "Bitte ins Projektverzeichnis wechseln."
    exit 1
fi

# Download-Verzeichnis
DL="downloads"

echo "1. Dateien kopieren..."

# Berater Firmen-Detailseite
cp -v "$DL/v7-firma-detail-page-v7_3_40.tsx" src/app/v7/berater/foerderung/firma/\[id\]/page.tsx

echo ""
echo "2. Build testen..."
npm run build

if [ $? -eq 0 ]; then
    echo ""
    echo "=== BUILD ERFOLGREICH ==="
    echo ""
    echo "3. Deployment mit:"
    echo "   git add . && git commit -m \"v7.3.40: Berater-Detailseite UTF-8 und Icons fix\" && git push"
    echo ""
    echo "=== FERTIG ==="
else
    echo ""
    echo "=== BUILD FEHLGESCHLAGEN ==="
    echo "Bitte Fehler prüfen und beheben."
    exit 1
fi
