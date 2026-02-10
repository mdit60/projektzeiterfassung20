#!/bin/bash
# ============================================================================
# PZE V7 - Modul-Dashboard Integration
# Version: 7.3.90-1
# Datum: 10. Februar 2026
#
# Installiert:
#   1. v7-module-config.ts     -> src/lib/v7-module-config.ts (NEU)
#   2. berater-dashboard.tsx   -> src/app/v7/berater/dashboard/page.tsx (ERSETZT Redirect)
#   3. firma-dashboard.tsx     -> src/app/v7/firma/dashboard/page.tsx (NEU oder ERSETZT)
#
# ============================================================================

set -e

cd ~/Documents/Dev/PZE

echo "=============================================="
echo "  PZE V7.3.90-1 - Modul-Dashboard"
echo "=============================================="
echo ""

# ============================================================================
# 0. Branch pruefen
# ============================================================================

CURRENT_BRANCH=$(git branch --show-current)
echo "Aktueller Branch: $CURRENT_BRANCH"

if [ "$CURRENT_BRANCH" != "v7-dev" ]; then
    echo ""
    echo "WARNUNG: Du bist NICHT auf v7-dev!"
    read -p "Trotzdem fortfahren? (j/n) " BRANCH_CONFIRM
    if [ "$BRANCH_CONFIRM" != "j" ]; then
        echo "Abbruch."
        exit 1
    fi
fi
echo ""

# ============================================================================
# 1. Download-Dateien pruefen
# ============================================================================

DOWNLOAD_DIR="$HOME/Documents/Dev/PZE/downloads"

FILE_CONFIG="$DOWNLOAD_DIR/v7-module-config-v7_3_90-1.ts"
FILE_BERATER="$DOWNLOAD_DIR/berater-dashboard-v7_3_90-1.tsx"
FILE_FIRMA="$DOWNLOAD_DIR/firma-dashboard-v7_3_90-1.tsx"

echo "1. Pruefe Download-Dateien..."

MISSING=0
for F in "$FILE_CONFIG" "$FILE_BERATER" "$FILE_FIRMA"; do
    if [ -f "$F" ]; then
        echo "   OK: $(basename $F)"
    else
        echo "   FEHLER: $(basename $F) nicht gefunden!"
        MISSING=1
    fi
done

if [ $MISSING -eq 1 ]; then
    echo ""
    echo "Bitte alle drei Dateien nach $DOWNLOAD_DIR herunterladen!"
    exit 1
fi
echo ""

# ============================================================================
# 2. Backup erstellen
# ============================================================================

echo "2. Backup erstellen..."
BACKUP_DIR="backup-v7_3_90"
mkdir -p "$BACKUP_DIR"

# Berater-Dashboard (alter Redirect)
if [ -f "src/app/v7/berater/dashboard/page.tsx" ]; then
    cp "src/app/v7/berater/dashboard/page.tsx" "$BACKUP_DIR/berater-dashboard-OLD.tsx"
    echo "   Gesichert: berater/dashboard/page.tsx"
fi

# Firma-Dashboard (falls vorhanden)
if [ -f "src/app/v7/firma/dashboard/page.tsx" ]; then
    cp "src/app/v7/firma/dashboard/page.tsx" "$BACKUP_DIR/firma-dashboard-OLD.tsx"
    echo "   Gesichert: firma/dashboard/page.tsx"
fi

echo "   Backup in: $BACKUP_DIR/"
echo ""

# ============================================================================
# 3. Verzeichnisse sicherstellen
# ============================================================================

echo "3. Verzeichnisse pruefen..."
mkdir -p src/lib
mkdir -p src/app/v7/berater/dashboard
mkdir -p src/app/v7/firma/dashboard
echo "   OK"
echo ""

# ============================================================================
# 4. Dateien installieren
# ============================================================================

echo "4. Dateien installieren..."

cp "$FILE_CONFIG" "src/lib/v7-module-config.ts"
echo "   -> src/lib/v7-module-config.ts (NEU)"

cp "$FILE_BERATER" "src/app/v7/berater/dashboard/page.tsx"
echo "   -> src/app/v7/berater/dashboard/page.tsx (ERSETZT Redirect)"

cp "$FILE_FIRMA" "src/app/v7/firma/dashboard/page.tsx"
echo "   -> src/app/v7/firma/dashboard/page.tsx"

echo ""

# ============================================================================
# 5. Merge-Marker pruefen
# ============================================================================

echo "5. Pruefe auf Merge-Marker..."
MERGE_ERR=0
for TARGET in "src/lib/v7-module-config.ts" "src/app/v7/berater/dashboard/page.tsx" "src/app/v7/firma/dashboard/page.tsx"; do
    if grep -q "<<<<<<" "$TARGET" 2>/dev/null; then
        echo "   FEHLER: Merge-Marker in $TARGET!"
        MERGE_ERR=1
    fi
done

if [ $MERGE_ERR -eq 1 ]; then
    echo "   Abbruch wegen Merge-Markern!"
    exit 1
fi
echo "   OK - keine Merge-Marker"
echo ""

# ============================================================================
# 6. Build testen
# ============================================================================

echo "6. Build testen..."
echo ""
pnpm run build 2>&1 | tail -40

if [ $? -eq 0 ]; then
    echo ""
    echo "=============================================="
    echo "  BUILD ERFOLGREICH"
    echo "=============================================="
    echo ""

    # Git Status
    echo "7. Git-Status:"
    git add -A
    git status --short
    echo ""

    # Commit anbieten
    read -p "Commit erstellen? (j/n) " COMMIT_CONFIRM
    if [ "$COMMIT_CONFIRM" = "j" ]; then
        git commit -m "v7.3.90-1: Modul-Dashboard fuer beide Portale

NEU: Modul-basierte Dashboard-Architektur
- v7-module-config.ts: Zentrale Modul-Konfiguration (10 Module)
  - Phase 1: Projektmodul, Arbeitszeit, ZA, VN, AGVO/BWA
  - Phase 2: Multiprojekt, De-minimis, Netzwerk, FZul
  - Uebergreifend: Berichte
  - Status pro Portal: active / coming_soon / hidden
  - Rollen-basierte Sichtbarkeit

- Berater-Dashboard: Kachel-Uebersicht (ERSETZT Redirect)
  - 10 Module in blauem Portal
  - Phase 1 (Foerderabrechnung) + Phase 2 (Zusatzmodule) getrennt
  - Aktive Module klickbar, geplante mit Release-Zeitpunkt
  - Statistiken: Firmen, Projekte, aktive Module

- Firmen-Dashboard: Kachel-Uebersicht (NEU)
  - 7 Module in gruenem Portal (inkl. De-minimis)
  - Rollen-Filter: client_admin sieht alles, employee nur eigene
  - Firmen-Statistiken: MA-Anzahl, Projekte"

        echo ""
        echo "Commit erstellt!"
        echo ""

        read -p "Push auf v7-dev? (j/n) " PUSH_CONFIRM
        if [ "$PUSH_CONFIRM" = "j" ]; then
            git push origin v7-dev
            echo ""
            echo "Gepusht auf v7-dev!"
            echo "Vercel deployed automatisch."
        fi
    fi
else
    echo ""
    echo "=============================================="
    echo "  BUILD FEHLER - bitte pruefen!"
    echo "=============================================="
    echo ""
    echo "Backup wiederherstellen:"
    echo "  cp $BACKUP_DIR/berater-dashboard-OLD.tsx src/app/v7/berater/dashboard/page.tsx"
    echo "  rm src/lib/v7-module-config.ts"
    if [ -f "$BACKUP_DIR/firma-dashboard-OLD.tsx" ]; then
        echo "  cp $BACKUP_DIR/firma-dashboard-OLD.tsx src/app/v7/firma/dashboard/page.tsx"
    else
        echo "  rm src/app/v7/firma/dashboard/page.tsx"
    fi
fi

echo ""
echo "Fertig!"
