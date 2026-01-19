#!/bin/bash
# ============================================
# DEPLOYMENT SCRIPT v7.3.35
# Berater-Portal: Arbeitspakete-Tab + Statistik entfernt
# ============================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo "=========================================="
echo "  PZE v7.3.35 Deployment"
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

echo -n "1. Firmen-Detailseite (Berater-Portal)... "
if [ -f "$DOWNLOAD_DIR/v7-firma-detail-page-v7_3_35.tsx" ]; then
    cp "$DOWNLOAD_DIR/v7-firma-detail-page-v7_3_35.tsx" "src/app/v7/berater/foerderung/firma/[id]/page.tsx"
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}FEHLT${NC}"
fi

echo ""
echo "=========================================="
echo -e "${GREEN}Deployment abgeschlossen!${NC}"
echo "=========================================="
echo ""
echo -e "${YELLOW}Änderungen v7.3.35:${NC}"
echo "- Arbeitspakete-Tab aus Navigation entfernt"
echo "- Statistik-Karten (4 Boxen oben) entfernt"
echo "- Firmendaten mit Stift zum Bearbeiten"
echo "- Company Edit Modal hinzugefügt"
echo ""
echo -e "${YELLOW}WICHTIG - SQL Migration:${NC}"
echo "Falls noch nicht geschehen, SQL ausführen:"
echo "$DOWNLOAD_DIR/v7-migration-company-fields-v7_3_34.sql"
echo ""
echo "Dev-Server: npm run dev"
echo ""
