#!/bin/bash
# PZE v7.3.19 - Integration Script
# Datum: 20. Januar 2026
# 
# Dieses Script kopiert die neuen Seiten an die richtigen Stellen im Projekt.
# Ausführen aus dem Verzeichnis documents/dev/pze/

echo "=== PZE v7.3.19 Integration ==="
echo ""

# Projektseite (bereits vorhanden, aktualisieren falls neue Version)
if [ -f "downloads/page-firma-projekte-v7_3_18.tsx" ]; then
    echo "→ Aktualisiere Projekt-Seite..."
    cp downloads/page-firma-projekte-v7_3_18.tsx ../src/app/v7/firma/projekte/page.tsx
    echo "  ✓ src/app/v7/firma/projekte/page.tsx"
fi

# Mitarbeiter-Seite (NEU)
if [ -f "downloads/page-firma-mitarbeiter-v7_3_19.tsx" ]; then
    echo "→ Erstelle Mitarbeiter-Seite..."
    mkdir -p ../src/app/v7/firma/mitarbeiter
    cp downloads/page-firma-mitarbeiter-v7_3_19.tsx ../src/app/v7/firma/mitarbeiter/page.tsx
    echo "  ✓ src/app/v7/firma/mitarbeiter/page.tsx"
fi

# Berichte-Seite (NEU)
if [ -f "downloads/page-firma-berichte-v7_3_19.tsx" ]; then
    echo "→ Erstelle Berichte-Seite..."
    mkdir -p ../src/app/v7/firma/berichte
    cp downloads/page-firma-berichte-v7_3_19.tsx ../src/app/v7/firma/berichte/page.tsx
    echo "  ✓ src/app/v7/firma/berichte/page.tsx"
fi

echo ""
echo "=== Integration abgeschlossen ==="
echo ""
echo "Neue Routen verfügbar:"
echo "  - /v7/firma/mitarbeiter"
echo "  - /v7/firma/berichte"
echo ""
echo "Bitte 'npm run dev' neu starten, falls der Server läuft."
