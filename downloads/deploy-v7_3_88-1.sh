#!/bin/bash
# ============================================================================
# PZE V7 - Deploy Script: Firmen-Detail-Seite Tabs Fix
# Version: 7.3.88-1
# Datum: 05. Februar 2026
# ============================================================================

cd ~/Documents/Dev/PZE

echo "=============================================="
echo "  PZE V7.3.88-1 - Tabs Fix Deploy"
echo "  Zeiterfassung + Berichte Tabs"
echo "=============================================="
echo ""

# Pruefen ob Download-Datei existiert
DOWNLOAD_DIR=~/Documents/Dev/PZE/downloads
SOURCE_FILE="$DOWNLOAD_DIR/v7-firma-detail-page-v7_3_88-1.tsx"

if [ ! -f "$SOURCE_FILE" ]; then
    echo "FEHLER: Datei nicht gefunden!"
    echo "Bitte erst herunterladen: $SOURCE_FILE"
    exit 1
fi

echo "1. Datei gefunden: v7-firma-detail-page-v7_3_88-1.tsx"
echo ""

# Backup erstellen
echo "2. Backup erstellen..."
BACKUP_DIR=~/Documents/Dev/PZE/backup-v7_3_88-1
mkdir -p "$BACKUP_DIR"
if [ -f "src/app/v7/berater/foerderung/firma/[id]/page.tsx" ]; then
    cp "src/app/v7/berater/foerderung/firma/[id]/page.tsx" "$BACKUP_DIR/"
    echo "   Backup: $BACKUP_DIR/page.tsx"
fi
echo ""

# Datei kopieren
echo "3. Datei installieren..."
cp "$SOURCE_FILE" "src/app/v7/berater/foerderung/firma/[id]/page.tsx"
echo "   -> src/app/v7/berater/foerderung/firma/[id]/page.tsx"
echo ""

# Build testen
echo "4. TypeScript Build testen..."
npm run build 2>&1 | head -30

if [ $? -eq 0 ]; then
    echo ""
    echo "=============================================="
    echo "  BUILD ERFOLGREICH"
    echo "=============================================="
    echo ""
    
    echo "5. Git Commit..."
    git add -A
    git status --short
    echo ""
    
    read -p "Commit durchfuehren? (j/n) " CONFIRM
    if [ "$CONFIRM" = "j" ]; then
        git commit -m "v7.3.88-1: Tabs Fix Berater-Firmenansicht

FIX:
- Zeiterfassung-Tab hinzugefuegt
- Berichte-Tab hinzugefuegt
- Navigation zu /v7/berater/foerderung/firma/[id]/zeiterfassung
- Navigation zu /v7/berater/foerderung/firma/[id]/berichte

Tabs jetzt: Firmendaten | Projekte | Mitarbeiter | Zeiterfassung | Berichte"
        
        echo ""
        read -p "Push zu v7-dev? (j/n) " PUSH
        if [ "$PUSH" = "j" ]; then
            git push origin v7-dev
            echo ""
            echo "Gepusht!"
            echo ""
            
            read -p "Merge zu main und Deploy? (j/n) " DEPLOY
            if [ "$DEPLOY" = "j" ]; then
                git checkout main
                git merge v7-dev
                git push origin main
                echo ""
                echo "=============================================="
                echo "  DEPLOYED!"
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
    echo "Backup wiederherstellen mit:"
    echo "  cp $BACKUP_DIR/page.tsx src/app/v7/berater/foerderung/firma/[id]/"
fi

echo ""
echo "Fertig!"
