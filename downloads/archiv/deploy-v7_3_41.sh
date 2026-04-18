#!/bin/bash
# ============================================
# DEPLOYMENT SCRIPT v7.3.41
# Finale bereinigte Version - Berater-Detailseite
# ============================================

echo "=== PZE V7.3.41 Deployment ==="
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
cp -v "$DL/v7-firma-detail-page-v7_3_41.tsx" src/app/v7/berater/foerderung/firma/\[id\]/page.tsx

echo ""
echo "2. Build testen..."
npm run build

if [ $? -eq 0 ]; then
    echo ""
    echo "=== BUILD ERFOLGREICH ==="
    echo ""
    echo "Änderungen in v7.3.41:"
    echo "  - Tabellen-Layout für Arbeitspakete (AP | Bezeichnung | PM | +Hinzufügen)"
    echo "  - AP-Code korrekt angezeigt (AP1.1, AP1.2 statt nur AP1)"
    echo "  - Sortierung nach ap_number + ap_sub_number"
    echo "  - Mitarbeiter-Icons permanent sichtbar"
    echo "  - UTF-8 sauber"
    echo ""
    echo "3. Deployment mit:"
    echo "   git add . && git commit -m \"v7.3.41: Finale bereinigte Berater-Detailseite\" && git push"
    echo ""
    echo "=== FERTIG ==="
else
    echo ""
    echo "=== BUILD FEHLGESCHLAGEN ==="
    echo "Bitte Fehler prüfen und beheben."
    exit 1
fi
