#!/bin/bash
# ============================================================================
# PZE V7 - Dashboard v3 + Header-Fix
# Version: 7.3.90-3
# Datum: 11. Februar 2026
# ============================================================================

set -e
cd ~/Documents/Dev/PZE

echo "=============================================="
echo "  PZE V7.3.90-3 - Dashboard v3 + Header-Fix"
echo "=============================================="
echo ""

CURRENT_BRANCH=$(git branch --show-current)
echo "Branch: $CURRENT_BRANCH"
if [ "$CURRENT_BRANCH" != "v7-dev" ]; then
    echo "WARNUNG: Nicht auf v7-dev!"
    read -p "Trotzdem fortfahren? (j/n) " BC
    if [ "$BC" != "j" ]; then exit 1; fi
fi
echo ""

DL="$HOME/Documents/Dev/PZE/downloads"
F1="$DL/PortalHeader-v7_3_90-3.tsx"
F2="$DL/berater-dashboard-v7_3_90-3.tsx"
F3="$DL/firma-dashboard-v7_3_90-3.tsx"
F4="$DL/v7-module-config-v7_3_90-2.ts"
F5="$DL/berater-page-redirect-v7_3_90-1.tsx"

echo "1. Pruefe Downloads..."
MISSING=0
for F in "$F1" "$F2" "$F3" "$F4" "$F5"; do
    if [ -f "$F" ]; then
        echo "   OK: $(basename $F)"
    else
        echo "   FEHLT: $(basename $F)"
        MISSING=1
    fi
done
if [ $MISSING -eq 1 ]; then
    echo "Bitte alle Dateien herunterladen!"
    exit 1
fi
echo ""

echo "2. Backup..."
BK="backup-v7_3_90-3"
mkdir -p "$BK"
[ -f "src/components/shared/PortalHeader.tsx" ] && cp "src/components/shared/PortalHeader.tsx" "$BK/"
[ -f "src/app/v7/berater/page.tsx" ] && cp "src/app/v7/berater/page.tsx" "$BK/berater-page.tsx"
[ -f "src/app/v7/berater/dashboard/page.tsx" ] && cp "src/app/v7/berater/dashboard/page.tsx" "$BK/berater-dashboard.tsx"
[ -f "src/app/v7/firma/dashboard/page.tsx" ] && cp "src/app/v7/firma/dashboard/page.tsx" "$BK/firma-dashboard.tsx"
[ -f "src/lib/v7-module-config.ts" ] && cp "src/lib/v7-module-config.ts" "$BK/"
echo "   -> $BK/"
echo ""

mkdir -p src/lib
mkdir -p src/components/shared
mkdir -p src/app/v7/berater/dashboard
mkdir -p src/app/v7/firma/dashboard

echo "3. Dateien installieren..."
cp "$F1" "src/components/shared/PortalHeader.tsx"
echo "   -> PortalHeader.tsx (PZE-Logo, keine Unterzeile)"
cp "$F2" "src/app/v7/berater/dashboard/page.tsx"
echo "   -> Berater-Dashboard (Kundenliste + Suche)"
cp "$F3" "src/app/v7/firma/dashboard/page.tsx"
echo "   -> Firmen-Dashboard (Footer fix)"
cp "$F4" "src/lib/v7-module-config.ts"
echo "   -> Modul-Config"
cp "$F5" "src/app/v7/berater/page.tsx"
echo "   -> Berater Redirect"
echo ""

echo "4. Merge-Marker-Check..."
for T in "src/components/shared/PortalHeader.tsx" "src/app/v7/berater/dashboard/page.tsx" "src/app/v7/firma/dashboard/page.tsx" "src/lib/v7-module-config.ts" "src/app/v7/berater/page.tsx"; do
    if grep -q "<<<<<<" "$T" 2>/dev/null; then
        echo "   FEHLER in $T!"
        exit 1
    fi
done
echo "   OK"
echo ""

echo "5. Cache loeschen..."
rm -rf .next
echo "   OK"
echo ""

echo "6. Build..."
echo ""
pnpm run build 2>&1 | tail -40

if [ $? -eq 0 ]; then
    echo ""
    echo "=============================================="
    echo "  BUILD ERFOLGREICH"
    echo "=============================================="
    echo ""
    git add -A
    git status --short
    echo ""

    read -p "Commit? (j/n) " CC
    if [ "$CC" = "j" ]; then
        git commit -m "v7.3.90-3: Dashboard v3 + Header-Fix

PortalHeader (v7.3.90-3):
- PZE-Logo-Platzhalter wiederhergestellt
- Unterzeile Berater-Portal/Firmen-Portal entfernt
- Nur: [PZE] Firmenname ... Username Abmelden

Berater-Dashboard (v7.3.90-3):
- Kundenliste statt Kacheln (skaliert besser)
- Suchfunktion fuer Firmennamen
- ZIM-Import-Button entfernt
- Footer einheitlich: PZE v7.3.90 + Firmenname

Firmen-Dashboard (v7.3.90-3):
- Footer vereinheitlicht (gleich wie Berater)"

        echo ""
        read -p "Push auf v7-dev? (j/n) " PC
        if [ "$PC" = "j" ]; then
            git push origin v7-dev
            echo "Gepusht!"
        fi
    fi
else
    echo ""
    echo "BUILD FEHLER!"
    echo "Restore: cp $BK/* zurueck kopieren"
fi
echo ""
echo "Fertig!"
