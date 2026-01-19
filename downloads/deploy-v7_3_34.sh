#!/bin/bash
# ============================================
# DEPLOYMENT SCRIPT v7.3.34
# Firmen-Detailseite mit Bearbeitung
# ============================================

# Farben für Output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo ""
echo "=========================================="
echo "  PZE v7.3.34 Deployment"
echo "=========================================="
echo ""

# Prüfe ob wir im richtigen Verzeichnis sind
if [ ! -d "src/app/v7" ]; then
    echo -e "${RED}FEHLER: Bitte im Projekt-Root ausführen (dort wo src/ liegt)${NC}"
    exit 1
fi

# Download-Verzeichnis
DOWNLOAD_DIR="$HOME/Documents/dev/pze/downloads"

# Prüfe ob Download-Verzeichnis existiert
if [ ! -d "$DOWNLOAD_DIR" ]; then
    echo -e "${RED}FEHLER: Download-Verzeichnis nicht gefunden: $DOWNLOAD_DIR${NC}"
    exit 1
fi

echo -e "${YELLOW}Quelle:${NC} $DOWNLOAD_DIR"
echo ""

# 1. Firmen-Detailseite
echo -n "1. Firmen-Detailseite... "
if [ -f "$DOWNLOAD_DIR/v7-firma-detail-page-v7_3_34.tsx" ]; then
    cp "$DOWNLOAD_DIR/v7-firma-detail-page-v7_3_34.tsx" "src/app/v7/berater/foerderung/firma/[id]/page.tsx"
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}FEHLT${NC}"
fi

# 2. Förderung-Übersicht
echo -n "2. Förderung-Übersicht... "
if [ -f "$DOWNLOAD_DIR/v7-foerderung-page-v7_3_34.tsx" ]; then
    cp "$DOWNLOAD_DIR/v7-foerderung-page-v7_3_34.tsx" "src/app/v7/berater/foerderung/page.tsx"
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}FEHLT${NC}"
fi

echo ""
echo "=========================================="
echo -e "${GREEN}Deployment abgeschlossen!${NC}"
echo "=========================================="
echo ""
echo -e "${YELLOW}WICHTIG - Noch manuell ausführen:${NC}"
echo "1. SQL-Migration in Supabase ausführen:"
echo "   $DOWNLOAD_DIR/v7-migration-company-fields-v7_3_34.sql"
echo ""
echo "2. Dev-Server neu starten:"
echo "   npm run dev"
echo ""
