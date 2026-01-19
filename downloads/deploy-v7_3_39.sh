#!/bin/bash
# ============================================
# DEPLOYMENT SCRIPT v7.3.39
# Hierarchische AP-Nummern (1.1, 1.2, 2, etc.)
# ============================================

echo "=== PZE V7.3.39 Deployment ==="
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

# Import-Seite
cp -v "$DL/page-v7-import-v7_3_39.tsx" src/app/v7/berater/foerderung/import/page.tsx

# Projekt-Seite
cp -v "$DL/page-firma-projekte-v7_3_39.tsx" src/app/v7/firma/projekte/page.tsx

echo ""
echo "2. Build testen..."
npm run build

if [ $? -eq 0 ]; then
    echo ""
    echo "=== BUILD ERFOLGREICH ==="
    echo ""
    echo "3. Deployment mit:"
    echo "   git add . && git commit -m \"v7.3.39: Hierarchische AP-Nummern\" && git push"
    echo ""
    echo "=== FERTIG ==="
else
    echo ""
    echo "=== BUILD FEHLGESCHLAGEN ==="
    echo "Bitte Fehler prüfen und beheben."
    exit 1
fi
