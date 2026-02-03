#!/bin/bash
# ============================================================================
# PZE V7 Git-Sicherung und Vercel Deployment - v7.3.73
# ============================================================================
# Datum: 23. Januar 2026
#
# AENDERUNGEN seit v7.3.62:
# - TimesheetForm v7.3.73: Fehlzeiten (U/K/S) komplett implementiert
#   - DB-Constraint Fix (work_package_id = NULL bei Fehlzeiten)
#   - Fehlzeiten werden in richtiger Zeile angezeigt
#   - Feiertage nur auf Werktagen gezaehlt
#   - Speichern mit Fehlerbehandlung
#   - Zurueck-Dialog mit Speichern-Option
#   - AP-Spalte zentriert
# - EmployeeManagement v7.3.66: V6 Legacy User Linking
# - Zeiterfassung v7.3.67: Projekte aus WP-Assignments laden
# - ZIM Parser v7.3.69: Kurzname aus Projekttitel extrahieren
# - Pflichtenheft v4.19
# ============================================================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo "=========================================="
echo -e "${BLUE}PZE V7 Git-Sicherung + Vercel${NC}"
echo "Version: v7.3.73"
echo "=========================================="
echo ""

# Pruefe ob im richtigen Verzeichnis
if [ ! -d "src/app/v7" ]; then
    echo -e "${RED}FEHLER: Bitte im PZE Projekt-Root ausfuehren${NC}"
    exit 1
fi

DOWNLOAD_DIR="$HOME/Documents/Dev/PZE/downloads"

# ============================================================================
# SCHRITT 1: Dateien kopieren
# ============================================================================
echo -e "${YELLOW}SCHRITT 1: Dateien aktualisieren${NC}"
echo ""

echo -n "  TimesheetForm v7.3.73... "
if [ -f "$DOWNLOAD_DIR/TimesheetForm-v7_3_73.tsx" ]; then
    cp "$DOWNLOAD_DIR/TimesheetForm-v7_3_73.tsx" "src/components/shared/TimesheetForm.tsx"
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}FEHLT${NC}"
    exit 1
fi

echo -n "  EmployeeManagement v7.3.66... "
if [ -f "$DOWNLOAD_DIR/EmployeeManagement-v7_3_66.tsx" ]; then
    cp "$DOWNLOAD_DIR/EmployeeManagement-v7_3_66.tsx" "src/components/shared/EmployeeManagement.tsx"
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${YELLOW}UEBERSPRUNGEN${NC}"
fi

echo -n "  Zeiterfassung (Firma) v7.3.67... "
if [ -f "$DOWNLOAD_DIR/page-firma-zeiterfassung-v7_3_67.tsx" ]; then
    cp "$DOWNLOAD_DIR/page-firma-zeiterfassung-v7_3_67.tsx" "src/app/v7/firma/zeiterfassung/page.tsx"
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${YELLOW}UEBERSPRUNGEN${NC}"
fi

echo -n "  ZIM Parser v7.3.69... "
if [ -f "$DOWNLOAD_DIR/route-v7_3_69.ts" ]; then
    cp "$DOWNLOAD_DIR/route-v7_3_69.ts" "src/app/api/parse-zim/route.ts"
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${YELLOW}UEBERSPRUNGEN${NC}"
fi

echo -n "  Pflichtenheft v4.19... "
if [ -f "$DOWNLOAD_DIR/PFLICHTENHEFT-v4_19.md" ]; then
    cp "$DOWNLOAD_DIR/PFLICHTENHEFT-v4_19.md" "docs/PFLICHTENHEFT-v4_19.md"
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${YELLOW}UEBERSPRUNGEN${NC}"
fi

echo ""

# ============================================================================
# SCHRITT 2: Git Status
# ============================================================================
echo -e "${YELLOW}SCHRITT 2: Git Status${NC}"
echo ""

git status --short

echo ""

# ============================================================================
# SCHRITT 3: Git Add und Commit
# ============================================================================
echo -e "${YELLOW}SCHRITT 3: Git Commit${NC}"
echo ""

git add -A
git commit -m "v7.3.73: Zeiterfassung Fehlzeiten (U/K/S) komplett

Neue Features:
- Fehlzeiten-Eingabe: U (Urlaub), K (Krankheit), S (Sonderurlaub)
- Case-insensitive Eingabe (u = U)
- Anzeige in AP-Zeile (blau) + Zaehlung in Fehlzeiten-Sektion
- DB-Constraint beachtet (work_package_id = NULL bei Fehlzeiten)
- Feiertage nur auf Werktagen gezaehlt
- Zurueck-Dialog mit Speichern-Option
- Fehlerbehandlung beim Speichern

Fixes:
- Fehlzeiten werden nach Speichern/Laden in richtiger Zeile angezeigt
- Feiertage auf Sa/So werden nicht mehr als Ausfallzeit gezaehlt
- V6 Legacy User Linking funktioniert
- ZIM Parser extrahiert Kurzname aus Projekttitel

Dateien:
- TimesheetForm.tsx (v7.3.73)
- EmployeeManagement.tsx (v7.3.66)
- page-firma-zeiterfassung.tsx (v7.3.67)
- route.ts/parse-zim (v7.3.69)
- PFLICHTENHEFT-v4_19.md"

echo ""
echo -e "${GREEN}Git Commit erfolgreich!${NC}"
echo ""

# ============================================================================
# SCHRITT 4: Push zu GitHub (triggert Vercel)
# ============================================================================
echo -e "${YELLOW}SCHRITT 4: Push zu GitHub (Vercel Deployment)${NC}"
echo ""

read -p "Jetzt zu GitHub pushen und Vercel Deployment starten? (j/n): " PUSH_CONFIRM

if [ "$PUSH_CONFIRM" = "j" ] || [ "$PUSH_CONFIRM" = "J" ]; then
    git push origin v7-dev
    echo ""
    echo -e "${GREEN}Push erfolgreich! Vercel Deployment gestartet.${NC}"
    echo ""
    echo "Vercel Dashboard: https://vercel.com/dashboard"
    echo "PZE App: https://pze-v7.vercel.app (oder deine Domain)"
else
    echo ""
    echo -e "${YELLOW}Push uebersprungen. Manuell pushen mit:${NC}"
    echo "  git push origin v7-dev"
fi

echo ""
echo "=========================================="
echo -e "${GREEN}FERTIG!${NC}"
echo "=========================================="
echo ""
echo "Zusammenfassung v7.3.73:"
echo "  - Zeiterfassung mit Fehlzeiten (U/K/S)"
echo "  - Feiertage korrekt berechnet"
echo "  - Speichern/Laden funktioniert"
echo "  - Pflichtenheft v4.19"
echo ""
