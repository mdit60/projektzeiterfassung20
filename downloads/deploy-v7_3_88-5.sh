#!/bin/bash
# ============================================================================
# PZE V7 - Deploy Tab-Redirect-Fix
# Version: 7.3.88-5
# Datum: 06. Februar 2026
# FIX: Bei tab=berichte/zeiterfassung zur separaten Seite weiterleiten
# ============================================================================

cd ~/Documents/Dev/PZE

echo "=============================================="
echo "  PZE V7.3.88-5 - Tab Redirect Fix"
echo "=============================================="
echo ""

SOURCE_FILE=~/Documents/Dev/PZE/downloads/v7-firma-detail-page-v7_3_88-5.tsx

if [ ! -f "$SOURCE_FILE" ]; then
    echo "FEHLER: Datei nicht gefunden!"
    echo "Bitte erst herunterladen: $SOURCE_FILE"
    exit 1
fi

echo "1. Datei installieren..."
cp "$SOURCE_FILE" "src/app/v7/berater/foerderung/firma/[id]/page.tsx"
echo "   OK"
echo ""

echo "2. Build testen..."
npm run build 2>&1 | tail -20

if [ $? -eq 0 ]; then
    echo ""
    echo "BUILD OK"
    echo ""
    
    git add -A
    git commit -m "v7.3.88-5: Tab-Redirect Fix

FIX: Bei tab=berichte oder tab=zeiterfassung in URL:
- Automatische Weiterleitung zur separaten Seite
- Kein leerer Inhalt mehr nach 'Zurueck zur Firmenuebersicht'"
    
    git push origin main
    
    echo ""
    echo "DEPLOYED!"
else
    echo "BUILD FEHLER"
fi
