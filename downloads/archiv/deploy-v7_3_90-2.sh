#!/bin/bash
# ============================================================================
# PZE V7 - Modul-Dashboard v2 Integration
# Version: 7.3.90-2
# Datum: 11. Februar 2026
#
# Installiert:
#   1. v7-module-config.ts        -> src/lib/v7-module-config.ts
#   2. berater-dashboard.tsx      -> src/app/v7/berater/dashboard/page.tsx
#   3. firma-dashboard.tsx        -> src/app/v7/firma/dashboard/page.tsx
#   4. berater-page-redirect.tsx  -> src/app/v7/berater/page.tsx
#
# ============================================================================

set -e

cd ~/Documents/Dev/PZE

echo "=============================================="
echo "  PZE V7.3.90-2 - Modul-Dashboard v2"
echo "=============================================="
echo ""

# Branch pruefen
CURRENT_BRANCH=$(git branch --show-current)
echo "Branch: $CURRENT_BRANCH"
if [ "$CURRENT_BRANCH" != "v7-dev" ]; then
    echo "WARNUNG: Nicht auf v7-dev!"
    read -p "Trotzdem fortfahren? (j/n) " BC
    if [ "$BC" != "j" ]; then exit 1; fi
fi
echo ""

# Download-Dateien pruefen
DL="$HOME/Documents/Dev/PZE/downloads"

F1="$DL/v7-module-config-v7_3_90-2.ts"
F2="$DL/berater-dashboard-v7_3_90-2.tsx"
F3="$DL/firma-dashboard-v7_3_90-2.tsx"
F4="$DL/berater-page-redirect-v7_3_90-1.tsx"

echo "1. Pruefe Downloads..."
MISSING=0
for F in "$F1" "$F2" "$F3" "$F4"; do
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

# Backup
echo "2. Backup..."
BK="backup-v7_3_90-2"
mkdir -p "$BK"
[ -f "src/app/v7/berater/page.tsx" ] && cp "src/app/v7/berater/page.tsx" "$BK/"
[ -f "src/app/v7/berater/dashboard/page.tsx" ] && cp "src/app/v7/berater/dashboard/page.tsx" "$BK/berater-dashboard.tsx"
[ -f "src/app/v7/firma/dashboard/page.tsx" ] && cp "src/app/v7/firma/dashboard/page.tsx" "$BK/firma-dashboard.tsx"
[ -f "src/lib/v7-module-config.ts" ] && cp "src/lib/v7-module-config.ts" "$BK/"
echo "   -> $BK/"
echo ""

# Verzeichnisse
mkdir -p src/lib
mkdir -p src/app/v7/berater/dashboard
mkdir -p src/app/v7/firma/dashboard

# Installieren
echo "3. Dateien installieren..."
cp "$F1" "src/lib/v7-module-config.ts"
echo "   -> src/lib/v7-module-config.ts"
cp "$F2" "src/app/v7/berater/dashboard/page.tsx"
echo "   -> src/app/v7/berater/dashboard/page.tsx"
cp "$F3" "src/app/v7/firma/dashboard/page.tsx"
echo "   -> src/app/v7/firma/dashboard/page.tsx"
cp "$F4" "src/app/v7/berater/page.tsx"
echo "   -> src/app/v7/berater/page.tsx (Redirect)"
echo ""

# Merge-Marker
echo "4. Merge-Marker-Check..."
for T in "src/lib/v7-module-config.ts" "src/app/v7/berater/dashboard/page.tsx" "src/app/v7/firma/dashboard/page.tsx" "src/app/v7/berater/page.tsx"; do
    if grep -q "<<<<<<" "$T" 2>/dev/null; then
        echo "   FEHLER in $T!"
        exit 1
    fi
done
echo "   OK"
echo ""

# .next Cache loeschen fuer sauberen Build
echo "5. Cache loeschen..."
rm -rf .next
echo "   OK"
echo ""

# Build
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
        git commit -m "v7.3.90-2: Modul-Dashboard v2

Berater-Dashboard (komplett ueberarbeitet):
- Oben: Kundenfirmen-Kacheln mit Live-Statistiken
  (Name, Stadt, Projekte, MA-Anzahl)
- Klick auf Firma -> Firmen-Detail-Seite
- Unten: Berater-Werkzeuge (Netzwerk, Multiprojekt, FZul)
- ZIM-Import Button direkt erreichbar
- Firmenname dynamisch aus v7_consultant_companies

Firmen-Dashboard (Benennung ueberarbeitet):
- Verstaendliche Modulnamen statt Konzeptbegriffe
- PHASE-Labels entfernt
- Kunden-User sieht NUR Zeiterfassung
- Kunden-Admin sieht alle 6 Kundenmodule

Modul-Config (neue Architektur):
- Kategorie: kundenmodul vs. beraterwerkzeug
- Berichte: Kein eigenes Modul (ist Tab in Projekt/Firma)
- Rollen gemaess Konzept-Skizze"

        echo ""
        read -p "Push auf v7-dev? (j/n) " PC
        if [ "$PC" = "j" ]; then
            git push origin v7-dev
            echo "Gepusht! Vercel deployed automatisch."
        fi
    fi
else
    echo ""
    echo "BUILD FEHLER!"
    echo "Restore: cp $BK/* zurueck kopieren"
fi

echo ""
echo "Fertig!"
