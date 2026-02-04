#!/bin/bash
# ============================================================================
# PZE V7 - Fix Merge Conflicts + Deploy
# Version: 7.3.88-2
# Datum: 05. Februar 2026
# ============================================================================

cd ~/Documents/Dev/PZE

echo "=============================================="
echo "  PZE V7.3.88-2 - Merge Conflict Fix"
echo "=============================================="
echo ""

# 1. Merge-Konflikt Status pruefen
echo "1. Git Status pruefen..."
git status
echo ""

# 2. Merge abbrechen falls aktiv
echo "2. Eventuellen Merge abbrechen..."
git merge --abort 2>/dev/null || echo "   Kein aktiver Merge"
echo ""

# 3. Alle lokalen Aenderungen verwerfen fuer die konfliktbehaftete Datei
echo "3. Konfliktdatei zuruecksetzen..."
git checkout HEAD -- src/app/v7/berater/foerderung/firma/\[id\]/page.tsx 2>/dev/null || echo "   Datei wird neu erstellt"
echo ""

# 4. Pruefen ob Download-Datei existiert
DOWNLOAD_DIR=~/Documents/Dev/PZE/downloads
SOURCE_FILE="$DOWNLOAD_DIR/v7-firma-detail-page-v7_3_88-2.tsx"

if [ ! -f "$SOURCE_FILE" ]; then
    echo "FEHLER: Datei nicht gefunden!"
    echo "Bitte erst herunterladen: $SOURCE_FILE"
    exit 1
fi

echo "4. Datei gefunden: v7-firma-detail-page-v7_3_88-2.tsx"
echo ""

# 5. Verzeichnis sicherstellen
echo "5. Verzeichnis pruefen..."
mkdir -p src/app/v7/berater/foerderung/firma/\[id\]
echo ""

# 6. Datei kopieren (ERSETZT komplett!)
echo "6. Neue Datei installieren (ersetzt komplett)..."
cp "$SOURCE_FILE" "src/app/v7/berater/foerderung/firma/[id]/page.tsx"
echo "   -> src/app/v7/berater/foerderung/firma/[id]/page.tsx"
echo ""

# 7. Pruefen auf Merge-Marker
echo "7. Pruefen auf Merge-Marker..."
if grep -q "<<<<<<" "src/app/v7/berater/foerderung/firma/[id]/page.tsx"; then
    echo "   FEHLER: Merge-Marker noch vorhanden!"
    exit 1
else
    echo "   OK - Keine Merge-Marker"
fi
echo ""

# 8. Build testen
echo "8. TypeScript Build testen..."
npm run build 2>&1 | head -40

if [ $? -eq 0 ]; then
    echo ""
    echo "=============================================="
    echo "  BUILD ERFOLGREICH"
    echo "=============================================="
    echo ""
    
    echo "9. Git Commit..."
    git add -A
    git status --short
    echo ""
    
    read -p "Commit durchfuehren? (j/n) " CONFIRM
    if [ "$CONFIRM" = "j" ]; then
        git commit -m "v7.3.88-2: Merge-Konflikt behoben, Tabs komplett

FIX:
- Merge-Konflikte in Firmen-Detail-Seite behoben
- Datei komplett neu erstellt (sauber)
- Alle 5 Tabs: Firmendaten | Projekte | Mitarbeiter | Zeiterfassung | Berichte
- Zeiterfassung/Berichte navigieren zu separaten Seiten"
        
        echo ""
        read -p "Push zu v7-dev? (j/n) " PUSH
        if [ "$PUSH" = "j" ]; then
            git push origin v7-dev
            echo ""
            echo "Gepusht zu v7-dev!"
            echo ""
            
            read -p "Merge zu main und Deploy zu Vercel? (j/n) " DEPLOY
            if [ "$DEPLOY" = "j" ]; then
                git checkout main
                git merge v7-dev -m "Merge v7-dev: v7.3.88-2 Tabs Fix"
                git push origin main
                echo ""
                echo "=============================================="
                echo "  DEPLOYED ZU VERCEL!"
                echo "=============================================="
                git checkout v7-dev
            fi
        fi
    fi
else
    echo ""
    echo "=============================================="
    echo "  BUILD FEHLGESCHLAGEN"
    echo "=============================================="
    echo ""
    echo "Bitte Fehler oben pruefen!"
fi

echo ""
echo "Fertig!"
