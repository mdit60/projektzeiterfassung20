#!/bin/bash
# ============================================================================
# PZE V7 Git-Sicherung und Vercel Deployment - v7.3.74
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
# - ZIM Parser v7.3.74: 
#   - Deutsches Datum (TT.MM.JJJJ) -> ISO (JJJJ-MM-TT) Konvertierung
#   - Kurzname aus Projekttitel (vor dem Doppelpunkt)
#   - DS-Format Laufzeit-Extraktion
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
echo "Version: v7.3.74"
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

echo -n "  ZIM Parser v7.3.74... "
if [ -f "$DOWNLOAD_DIR/route-v7_3_74.ts" ]; then
    cp "$DOWNLOAD_DIR/route-v7_3_74.ts" "src/app/api/parse-zim/route.ts"
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
git commit -m "v7.3.74: Zeiterfassung + Parser Fixes

Zeiterfassung (TimesheetForm v7.3.73):
- Fehlzeiten-Eingabe: U (Urlaub), K (Krankheit), S (Sonderurlaub)
- Case-insensitive Eingabe (u = U)
- Anzeige in AP-Zeile (blau) + Zaehlung in Fehlzeiten-Sektion
- DB-Constraint beachtet (work_package_id = NULL bei Fehlzeiten)
- Feiertage nur auf Werktagen gezaehlt
- Zurueck-Dialog mit Speichern-Option
- Fehlerbehandlung beim Speichern

ZIM Parser (v7.3.74):
- Deutsches Datum (01.05.2023) -> ISO (2023-05-01) Konvertierung
- Kurzname aus Projekttitel extrahiert (Teil vor Doppelpunkt)
- DS-Format: Laufzeit-Extraktion hinzugefuegt

Weitere Fixes:
- V6 Legacy User Linking (EmployeeManagement v7.3.66)
- Projekte aus WP-Assignments laden (v7.3.67)
- Pflichtenheft v4.19"

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
echo "Zusammenfassung v7.3.74:"
echo ""
echo "  Zeiterfassung:"
echo "    - Fehlzeiten U/K/S komplett"
echo "    - Feiertage korrekt berechnet"
echo "    - Speichern/Laden funktioniert"
echo ""
echo "  ZIM Parser:"
echo "    - Datumskonvertierung DE -> ISO"
echo "    - Kurzname-Extraktion"
echo ""
echo "  Pflichtenheft v4.19"
echo ""
