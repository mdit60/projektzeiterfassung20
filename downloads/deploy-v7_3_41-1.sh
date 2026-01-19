#!/bin/bash
# ============================================
# DEPLOYMENT SCRIPT v7.3.41-1
# Einheitliches Tabellen-Design
# ============================================

echo "=== PZE V7.3.41-1 Deployment ==="
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
cp -v "$DL/v7-firma-detail-page-v7_3_41-1.tsx" src/app/v7/berater/foerderung/firma/\[id\]/page.tsx

echo ""
echo "2. Build testen..."
npm run build

if [ $? -eq 0 ]; then
    echo ""
    echo "=== BUILD ERFOLGREICH ==="
    echo ""
    echo "Änderungen in v7.3.41-1:"
    echo "  - Mitarbeiter-Tabelle im gleichen Stil wie Arbeitspakete"
    echo "  - Einheitliches UI-Design mit border, Header, Trennlinien"
    echo ""
    echo "3. Deployment mit:"
    echo "   git add . && git commit -m \"v7.3.41-1: Einheitliches Tabellen-Design\" && git push"
    echo ""
    echo "=== FERTIG ==="
else
    echo ""
    echo "=== BUILD FEHLGESCHLAGEN ==="
    echo "Bitte Fehler prüfen und beheben."
    exit 1
fi
