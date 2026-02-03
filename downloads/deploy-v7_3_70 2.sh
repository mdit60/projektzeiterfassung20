#!/bin/bash
# ============================================================================
# PZE V7 Deployment Script - v7.3.70
# ============================================================================
# Datum: 23. Januar 2026
#
# FIXES:
# 1. TimesheetForm: AP-Spalte zentriert, nur Nummern
# 2. TimesheetForm: "Speichern" Option im Zurück-Dialog
# 3. TimesheetForm: Feiertage auf Wochenenden werden nicht mehr gezählt
# 4. TimesheetForm: Feiertags-Summe korrekt berechnet
# 5. Parser: Kurzname aus Projekttitel extrahieren (Teil vor dem Doppelpunkt)
# 6. Zeiterfassung: Projekte aus v7_work_package_assignments laden
# ============================================================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo "=========================================="
echo "PZE V7 Deployment - v7.3.70"
echo "=========================================="
echo ""

if [ ! -d "src/app/v7" ]; then
    echo -e "${RED}FEHLER: Bitte im Projekt-Root ausfuehren${NC}"
    exit 1
fi

DOWNLOAD_DIR="$HOME/Documents/Dev/PZE/downloads"

echo -n "1. TimesheetForm - Alle Fixes... "
if [ -f "$DOWNLOAD_DIR/TimesheetForm-v7_3_68.tsx" ]; then
    cp "$DOWNLOAD_DIR/TimesheetForm-v7_3_68.tsx" "src/components/shared/TimesheetForm.tsx"
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}FEHLT${NC}"
fi

echo -n "2. ZIM Parser - Kurzname Fix... "
if [ -f "$DOWNLOAD_DIR/route-v7_3_69.ts" ]; then
    cp "$DOWNLOAD_DIR/route-v7_3_69.ts" "src/app/api/parse-zim/route.ts"
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${YELLOW}UEBERSPRUNGEN${NC}"
fi

echo -n "3. Zeiterfassung (Firma) - WP Assignments... "
if [ -f "$DOWNLOAD_DIR/page-firma-zeiterfassung-v7_3_67.tsx" ]; then
    cp "$DOWNLOAD_DIR/page-firma-zeiterfassung-v7_3_67.tsx" "src/app/v7/firma/zeiterfassung/page.tsx"
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${YELLOW}UEBERSPRUNGEN${NC}"
fi

echo ""
echo "=========================================="
echo -e "${GREEN}Deployment abgeschlossen!${NC}"
echo "=========================================="
echo ""
echo -e "${YELLOW}Aenderungen v7.3.70:${NC}"
echo ""
echo "  TimesheetForm:"
echo "    - AP-Spalte und lfd.Nr. zentriert"
echo "    - Zurueck-Dialog hat jetzt 'Speichern' Option"
echo "    - Feiertage auf Sa/So werden nicht mehr gezaehlt"
echo "    - Feiertags-Summe (Sonstige Ausfallzeiten) korrekt"
echo ""
echo "  Parser:"
echo "    - Kurzname aus Teil vor ':' extrahiert"
echo ""
echo "Naechste Schritte:"
echo "  npm run dev"
echo ""
