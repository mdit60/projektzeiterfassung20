#!/bin/bash
# ============================================================================
# PZE V7 Deployment Script - v7.3.65
# ============================================================================
# Datum: 23. Januar 2026
#
# FIXES:
# - Login-Button in Mitarbeiter-Liste wieder sichtbar
# - EmployeeManagement v7.3.60 mit korrekter Login-Erkennung
# ============================================================================

set -e

# Farben
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo "=========================================="
echo "PZE V7 Deployment - v7.3.65"
echo "=========================================="
echo ""

# Prüfe ob im richtigen Verzeichnis
if [ ! -d "src/app/v7" ]; then
    echo -e "${RED}FEHLER: Bitte im Projekt-Root ausführen (~/Documents/Dev/PZE)${NC}"
    exit 1
fi

DOWNLOAD_DIR="$HOME/Documents/Dev/PZE/downloads"

if [ ! -d "$DOWNLOAD_DIR" ]; then
    echo -e "${RED}FEHLER: Download-Verzeichnis nicht gefunden: $DOWNLOAD_DIR${NC}"
    exit 1
fi

echo -e "${YELLOW}Quelle:${NC} $DOWNLOAD_DIR"
echo ""

# EmployeeManagement Komponente
echo -n "1. EmployeeManagement (Login-Button Fix)... "
if [ -f "$DOWNLOAD_DIR/EmployeeManagement-v7_3_65.tsx" ]; then
    cp "$DOWNLOAD_DIR/EmployeeManagement-v7_3_65.tsx" "src/components/shared/EmployeeManagement.tsx"
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}FEHLT${NC}"
fi

echo ""
echo "=========================================="
echo -e "${GREEN}Deployment abgeschlossen!${NC}"
echo "=========================================="
echo ""
echo -e "${YELLOW}Änderungen v7.3.65:${NC}"
echo ""
echo "  - Login-Button (Schlüssel-Icon) wieder sichtbar"
echo "  - Login verknüpfen (Ketten-Icon) für bereits registrierte User"
echo "  - Korrekte Login-Status-Erkennung"
echo ""
echo "Nächste Schritte:"
echo "  1. npm run dev (Server neu starten)"
echo "  2. Git commit und push"
echo ""
