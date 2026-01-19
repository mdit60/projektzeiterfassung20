#!/bin/bash
# ============================================
# DEPLOYMENT SCRIPT v7.3.38
# Arbeitspakete-Tabelle mit immer sichtbaren Buttons
# ============================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo "=========================================="
echo "  PZE v7.3.38 Deployment"
echo "=========================================="
echo ""

if [ ! -d "src/app/v7" ]; then
    echo -e "${RED}FEHLER: Bitte im Projekt-Root ausführen${NC}"
    exit 1
fi

DOWNLOAD_DIR="$HOME/Documents/dev/pze/downloads"

if [ ! -d "$DOWNLOAD_DIR" ]; then
    echo -e "${RED}FEHLER: Download-Verzeichnis nicht gefunden: $DOWNLOAD_DIR${NC}"
    exit 1
fi

echo -e "${YELLOW}Quelle:${NC} $DOWNLOAD_DIR"
echo ""

echo -n "1. Firmen-Detailseite... "
if [ -f "$DOWNLOAD_DIR/v7-firma-detail-page-v7_3_38.tsx" ]; then
    cp "$DOWNLOAD_DIR/v7-firma-detail-page-v7_3_38.tsx" "src/app/v7/berater/foerderung/firma/[id]/page.tsx"
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}FEHLT${NC}"
fi

echo ""
echo "=========================================="
echo -e "${GREEN}Deployment abgeschlossen!${NC}"
echo "=========================================="
echo ""
echo -e "${YELLOW}Änderung v7.3.38:${NC}"
echo ""
echo "Arbeitspakete-Liste:"
echo "  - Klare Tabellenstruktur: AP | Bezeichnung | PM | Aktionen"
echo "  - Aktions-Buttons IMMER sichtbar (nicht nur bei Hover)"
echo "  - Intuitiv bedienbar ohne Erklärung"
echo ""
echo "Dev-Server: npm run dev"
echo ""
