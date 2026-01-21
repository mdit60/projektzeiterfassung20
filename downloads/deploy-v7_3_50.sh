#!/bin/bash
# ============================================================================
# PZE V7 Deploy Script - Version 7.3.50
# Projekt-Bearbeiten-Modal funktioniert
# ============================================================================
# Datum: 21. Januar 2026
# ============================================================================
# 
# AENDERUNGEN v7.3.50:
# - Bearbeiten-Button oben rechts oeffnet jetzt Modal
# - Projekt-Stammdaten direkt bearbeitbar:
#   - Projektname, Kurzbezeichnung
#   - Foerderprogramm (Dropdown)
#   - Foerderkennzeichen (FKZ)
#   - Start-/Enddatum
#   - Notizen
# - Foerderprogramm-Labels korrekt angezeigt
#
# BASIERT AUF: v7_3_49 (Team mit Wochenstunden)
# ============================================================================

set -e

echo "============================================"
echo "PZE V7 Deploy - Version 7.3.50"
echo "============================================"
echo ""

# Verzeichnisse
DOWNLOAD_DIR="$HOME/Documents/dev/pze/downloads"
PROJECT_DIR="$HOME/Documents/dev/pze"

# Pruefen ob Download vorhanden
if [ ! -f "$DOWNLOAD_DIR/page-firma-projekt-detail-v7_3_50.tsx" ]; then
    echo "FEHLER: page-firma-projekt-detail-v7_3_50.tsx nicht gefunden!"
    exit 1
fi

echo "1. Kopiere Dateien..."

# Projekt-Detail Seite
cp "$DOWNLOAD_DIR/page-firma-projekt-detail-v7_3_50.tsx" \
   "$PROJECT_DIR/src/app/v7/firma/projekte/[id]/page.tsx"
echo "   - page-firma-projekt-detail-v7_3_50.tsx -> src/app/v7/firma/projekte/[id]/page.tsx"

echo ""
echo "2. Deployment abgeschlossen!"
echo ""
echo "============================================"
echo "AENDERUNGEN v7.3.50:"
echo "============================================"
echo ""
echo "Projekt-Bearbeiten (Button oben rechts):"
echo "  - Oeffnet Modal zum Bearbeiten der Stammdaten"
echo "  - Projektname, Kurzbezeichnung"
echo "  - Foerderprogramm (ZIM/BMBF Dropdown)"
echo "  - Foerderkennzeichen (FKZ)"
echo "  - Laufzeit (Start/Ende)"
echo "  - Notizen"
echo ""
echo "============================================"
echo ""
echo "Testen unter:"
echo "   http://localhost:3000/v7/firma/projekte/[id]"
echo "   -> Button 'Bearbeiten' oben rechts klicken"
echo ""
