#!/bin/bash
# ============================================================================
# PZE V7 - Git-Sicherung
# Version: v7.3.88-11
# Datum: 08. Februar 2026
# ============================================================================

echo "=== PZE V7 Git-Sicherung ==="
echo "Datum: $(date '+%d.%m.%Y %H:%M')"
echo ""

cd ~/Documents/Dev/PZE || exit 1

# KRITISCH: Branch pruefen!
CURRENT_BRANCH=$(git branch --show-current)
echo "Aktueller Branch: $CURRENT_BRANCH"

if [ "$CURRENT_BRANCH" != "v7-dev" ]; then
    echo ""
    echo "!!! WARNUNG: Du bist auf Branch '$CURRENT_BRANCH', NICHT auf v7-dev !!!"
    echo "Wechsle zu v7-dev..."
    rm -f .git/index.lock
    git stash 2>/dev/null
    git checkout v7-dev
    if [ $? -ne 0 ]; then
        echo "FEHLER: Konnte nicht zu v7-dev wechseln!"
        echo "Versuche: rm -f .git/index.lock && git checkout -f v7-dev"
        exit 1
    fi
    echo "Gewechselt zu v7-dev"
fi

# Lock-Datei sicherheitshalber loeschen
rm -f .git/index.lock

# Backup erstellen
BACKUP_DIR="backups/$(date '+%Y%m%d_%H%M%S')"
echo ""
echo "=== Backup nach $BACKUP_DIR ==="
mkdir -p "$BACKUP_DIR/shared"
mkdir -p "$BACKUP_DIR/pages/berater"
mkdir -p "$BACKUP_DIR/pages/firma"
mkdir -p "$BACKUP_DIR/api"

cp src/components/shared/*.tsx "$BACKUP_DIR/shared/" 2>/dev/null
echo "Shared Components gesichert: $(ls $BACKUP_DIR/shared/*.tsx 2>/dev/null | wc -l | tr -d ' ') Dateien"

cp src/app/v7/berater/foerderung/firma/\[id\]/page.tsx "$BACKUP_DIR/pages/berater/firma-detail-page.tsx" 2>/dev/null
cp src/app/v7/berater/foerderung/firma/\[id\]/berichte/page.tsx "$BACKUP_DIR/pages/berater/berichte-page.tsx" 2>/dev/null
cp src/app/v7/berater/foerderung/firma/\[id\]/zeiterfassung/page.tsx "$BACKUP_DIR/pages/berater/zeiterfassung-page.tsx" 2>/dev/null
cp src/app/v7/berater/foerderung/page.tsx "$BACKUP_DIR/pages/berater/foerderung-page.tsx" 2>/dev/null
cp src/app/v7/firma/zeiterfassung/page.tsx "$BACKUP_DIR/pages/firma/zeiterfassung-page.tsx" 2>/dev/null
cp src/app/v7/firma/berichte/page.tsx "$BACKUP_DIR/pages/firma/berichte-page.tsx" 2>/dev/null
echo "Pages gesichert"

cp src/app/api/v7/arbeitsplan-import/route.ts "$BACKUP_DIR/api/arbeitsplan-import.ts" 2>/dev/null
cp src/app/api/v7/arbeitsplan-vorlage/route.ts "$BACKUP_DIR/api/arbeitsplan-vorlage.ts" 2>/dev/null
cp src/app/api/parse-zim/route.ts "$BACKUP_DIR/api/parse-zim.ts" 2>/dev/null
echo "API-Routen gesichert"

# Alles committen und pushen
echo ""
echo "=== Commit und Push ==="
git add -A

if git diff --cached --quiet; then
    echo "Keine Aenderungen zum Committen."
else
    git commit -m "v7.3.88-11: Sicherung - Vercel-Fix, Null-Safety, Branch-Sync"
    git push
fi

echo ""
echo "=== Fertig ==="
echo "Branch: $(git branch --show-current)"
echo "Letzter Commit: $(git log --oneline -1)"
echo ""
echo "Vercel: https://projektzeiterfassung20-git-v7-dev-martin-ds-projects-5cb70f89.vercel.app"
