#!/bin/bash
# ============================================================================
# PZE V7 Deployment Script - v7.3.68
# ============================================================================
# Datum: 23. Januar 2026
#
# FIXES:
# - Zeiterfassung: Projekte aus v7_work_package_assignments laden
# - TimesheetForm: AP-Spalte breiter (50px) damit AP-Code sichtbar
# ============================================================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo "=========================================="
echo "PZE V7 Deployment - v7.3.68"
echo "=========================================="
echo ""

if [ ! -d "src/app/v7" ]; then
    echo -e "${RED}FEHLER: Bitte im Projekt-Root ausfuehren${NC}"
    exit 1
fi

DOWNLOAD_DIR="$HOME/Documents/Dev/PZE/downloads"

echo -n "1. Zeiterfassung (Firma) - WP Assignments Fix... "
if [ -f "$DOWNLOAD_DIR/page-firma-zeiterfassung-v7_3_67.tsx" ]; then
    cp "$DOWNLOAD_DIR/page-firma-zeiterfassung-v7_3_67.tsx" "src/app/v7/firma/zeiterfassung/page.tsx"
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}FEHLT${NC}"
fi

echo -n "2. TimesheetForm - AP-Spalte breiter... "
if [ -f "$DOWNLOAD_DIR/TimesheetForm-v7_3_68.tsx" ]; then
    cp "$DOWNLOAD_DIR/TimesheetForm-v7_3_68.tsx" "src/components/shared/TimesheetForm.tsx"
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}FEHLT${NC}"
fi

echo ""
echo "=========================================="
echo -e "${GREEN}Deployment abgeschlossen!${NC}"
echo "=========================================="
echo ""
echo -e "${YELLOW}Aenderungen v7.3.68:${NC}"
echo ""
echo "  - AP-Spalte im Zeiterfassungsformular breiter"
echo "  - AP-Code (AP1, AP2.1, etc.) jetzt vollstaendig sichtbar"
echo ""
echo "Naechste Schritte:"
echo "  npm run dev"
echo ""
