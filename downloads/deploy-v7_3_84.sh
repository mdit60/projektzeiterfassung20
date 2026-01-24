#!/bin/bash
# ============================================================================
# PZE v7.3.84 - Deployment Script
# ============================================================================
# Datum: 24. Januar 2026
#
# Aenderungen:
# - ProjectDetailPage: Zeiterfassungs-Tab mit Link zur Zeiterfassungsseite
# ============================================================================

# Farben fuer Ausgabe
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo ""
echo "=========================================="
echo "  PZE v7.3.84 - Deployment"
echo "=========================================="
echo ""

# Basis-Pfade
DOWNLOADS_DIR="$HOME/Documents/Dev/PZE/downloads"
PROJECT_DIR="$HOME/Documents/Dev/PZE/src"

# Pruefen ob Downloads-Verzeichnis existiert
if [ ! -d "$DOWNLOADS_DIR" ]; then
    echo -e "${RED}FEHLER: Downloads-Verzeichnis nicht gefunden: $DOWNLOADS_DIR${NC}"
    exit 1
fi

# Pruefen ob Projekt-Verzeichnis existiert
if [ ! -d "$PROJECT_DIR" ]; then
    echo -e "${RED}FEHLER: Projekt-Verzeichnis nicht gefunden: $PROJECT_DIR${NC}"
    exit 1
fi

# ============================================================================
# Dateien kopieren
# ============================================================================

echo "Kopiere Dateien..."
echo ""

# ProjectDetailPage
if [ -f "$DOWNLOADS_DIR/ProjectDetailPage-v7_3_84.tsx" ]; then
    cp "$DOWNLOADS_DIR/ProjectDetailPage-v7_3_84.tsx" "$PROJECT_DIR/components/shared/ProjectDetailPage.tsx"
    echo -e "${GREEN}✓${NC} ProjectDetailPage.tsx aktualisiert"
else
    echo -e "${YELLOW}⚠ ProjectDetailPage-v7_3_84.tsx nicht gefunden - uebersprungen${NC}"
fi

# Berater-Dashboard (page.tsx)
if [ -f "$DOWNLOADS_DIR/berater-page-v7_3_84-2.tsx" ]; then
    cp "$DOWNLOADS_DIR/berater-page-v7_3_84-2.tsx" "$PROJECT_DIR/app/v7/berater/page.tsx"
    echo -e "${GREEN}✓${NC} Berater-Dashboard (page.tsx) aktualisiert"
elif [ -f "$DOWNLOADS_DIR/berater-page-v7_3_84.tsx" ]; then
    cp "$DOWNLOADS_DIR/berater-page-v7_3_84.tsx" "$PROJECT_DIR/app/v7/berater/page.tsx"
    echo -e "${GREEN}✓${NC} Berater-Dashboard (page.tsx) aktualisiert"
else
    echo -e "${YELLOW}⚠ berater-page-v7_3_84*.tsx nicht gefunden - uebersprungen${NC}"
fi

# Foerderung-Seite (Firmenliste)
if [ -f "$DOWNLOADS_DIR/foerderung-page-v7_3_84-3.tsx" ]; then
    cp "$DOWNLOADS_DIR/foerderung-page-v7_3_84-3.tsx" "$PROJECT_DIR/app/v7/berater/foerderung/page.tsx"
    echo -e "${GREEN}✓${NC} Foerderung-Seite (Firmenliste) aktualisiert"
else
    echo -e "${YELLOW}⚠ foerderung-page-v7_3_84-3.tsx nicht gefunden - uebersprungen${NC}"
fi

echo ""
echo "=========================================="
echo -e "${GREEN}  Deployment abgeschlossen!${NC}"
echo "=========================================="
echo ""
echo "Naechste Schritte:"
echo "  1. Terminal: cd ~/Documents/Dev/PZE && npm run dev"
echo "  2. Browser: http://localhost:3000"
echo "  3. Testen:"
echo "     - Berater-Dashboard: Foerderprojekte-Zaehler"
echo "     - Projekt oeffnen -> Zeiterfassung Tab"
echo ""
