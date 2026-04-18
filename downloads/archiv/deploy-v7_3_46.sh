#!/bin/bash
# ============================================================================
# PZE V7 Deploy Script - Version 7.3.46
# FIX: Foerderprogramm Label in Projekt-Detail
# ============================================================================
# Datum: 21. Januar 2026
# ============================================================================
# 
# AENDERUNG:
# - Zeigt "ZIM Einzelprojekt" statt nur "ZIM" in der Projekt-Uebersicht
# - Konsistent mit dem Bearbeiten-Modal
#
# ============================================================================

set -e

echo "============================================"
echo "PZE V7 Deploy - Version 7.3.46"
echo "============================================"
echo ""

# Verzeichnisse
DOWNLOAD_DIR="$HOME/Documents/dev/pze/downloads"
PROJECT_DIR="$HOME/Documents/dev/pze"

# Pruefen ob Download vorhanden
if [ ! -f "$DOWNLOAD_DIR/page-firma-projekt-detail-v7_3_46.tsx" ]; then
    echo "FEHLER: page-firma-projekt-detail-v7_3_46.tsx nicht gefunden!"
    exit 1
fi

echo "1. Kopiere Dateien..."

# Projekt-Detail Seite
cp "$DOWNLOAD_DIR/page-firma-projekt-detail-v7_3_46.tsx" \
   "$PROJECT_DIR/src/app/v7/firma/projekte/[id]/page.tsx"
echo "   - page-firma-projekt-detail-v7_3_46.tsx -> src/app/v7/firma/projekte/[id]/page.tsx"

echo ""
echo "2. Deployment abgeschlossen!"
echo ""
echo "============================================"
echo "AENDERUNG v7.3.46:"
echo "============================================"
echo ""
echo "Projekt-Detail (Firmen-Portal):"
echo "  - Foerderprogramm zeigt jetzt volles Label"
echo "  - 'ZIM' -> 'ZIM Einzelprojekt'"
echo "  - 'ZIM_KOOP' -> 'ZIM Kooperationsprojekt'"
echo "  - 'BMBF' -> 'BMBF Foerderung'"
echo "  - etc."
echo ""
echo "============================================"
echo ""
echo "Testen unter:"
echo "   http://localhost:3000/v7/firma/projekte/[id]"
echo ""
