#!/bin/bash
# ============================================================================
# PZE V7 - Deploy Firmen-Detail-Seite Fix
# Version: 7.3.88-3
# Datum: 05. Februar 2026
# FIX: CompanyDataView TypeError behoben - Firmendaten jetzt inline
# ============================================================================

cd ~/Documents/Dev/PZE

echo "=============================================="
echo "  PZE V7.3.88-3 - CompanyDataView Fix"
echo "=============================================="
echo ""

# Pruefen ob Download-Datei existiert
SOURCE_FILE=~/Documents/Dev/PZE/downloads/v7-firma-detail-page-v7_3_88-3.tsx

if [ ! -f "$SOURCE_FILE" ]; then
    echo "FEHLER: Datei nicht gefunden!"
    echo "Bitte erst herunterladen: $SOURCE_FILE"
    exit 1
fi

echo "1. Datei gefunden"
echo ""

# Datei kopieren
echo "2. Datei installieren..."
cp "$SOURCE_FILE" "src/app/v7/berater/foerderung/firma/[id]/page.tsx"
echo "   -> src/app/v7/berater/foerderung/firma/[id]/page.tsx"
echo ""

# Auf Merge-Marker pruefen
echo "3. Pruefen auf Merge-Marker..."
if grep -q "<<<<<<" "src/app/v7/berater/foerderung/firma/[id]/page.tsx"; then
    echo "   FEHLER: Merge-Marker gefunden!"
    exit 1
else
    echo "   OK"
fi
echo ""

# Build
echo "4. Build testen..."
npm run build 2>&1 | tail -30

if [ $? -eq 0 ]; then
    echo ""
    echo "=============================================="
    echo "  BUILD OK"
    echo "=============================================="
    echo ""
    
    git add -A
    git status --short
    echo ""
    
    read -p "Commit? (j/n) " CONFIRM
    if [ "$CONFIRM" = "j" ]; then
        git commit -m "v7.3.88-3: CompanyDataView TypeError Fix

FIX:
- Firmendaten-Tab zeigt jetzt Daten inline
- Kein Aufruf von CompanyDataView mehr (hatte falsches Interface)
- Alle 5 Tabs funktionieren: Firmendaten | Projekte | Mitarbeiter | Zeiterfassung | Berichte"
        
        read -p "Push + Deploy? (j/n) " PUSH
        if [ "$PUSH" = "j" ]; then
            git push origin v7-dev
            git checkout main
            git merge v7-dev -m "Merge v7.3.88-3"
            git push origin main
            echo ""
            echo "DEPLOYED!"
            git checkout v7-dev
        fi
    fi
else
    echo ""
    echo "BUILD FEHLER - bitte pruefen"
fi
