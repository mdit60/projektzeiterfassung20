#!/bin/bash
# ============================================================================
# PZE V7 Deploy Script - Version 7.3.47
# Mitarbeiter-Seite: Konsistenter Header mit Sub-Navigation
# ============================================================================
# Datum: 21. Januar 2026
# ============================================================================
# 
# AENDERUNG:
# - PortalHeader statt eigener gruener Header
# - Sub-Navigation (Firmendaten | Projekte | Mitarbeiter)
# - "Mitarbeiter" in Navigation aktiv markiert
# - UTF-8 Fehler bereinigt
#
# ============================================================================

set -e

echo "============================================"
echo "PZE V7 Deploy - Version 7.3.47"
echo "============================================"
echo ""

# Verzeichnisse
DOWNLOAD_DIR="$HOME/Documents/dev/pze/downloads"
PROJECT_DIR="$HOME/Documents/dev/pze"

# Pruefen ob Download vorhanden
if [ ! -f "$DOWNLOAD_DIR/page-firma-mitarbeiter-v7_3_47.tsx" ]; then
    echo "FEHLER: page-firma-mitarbeiter-v7_3_47.tsx nicht gefunden!"
    exit 1
fi

echo "1. Kopiere Dateien..."

# Mitarbeiter-Seite
cp "$DOWNLOAD_DIR/page-firma-mitarbeiter-v7_3_47.tsx" \
   "$PROJECT_DIR/src/app/v7/firma/mitarbeiter/page.tsx"
echo "   - page-firma-mitarbeiter-v7_3_47.tsx -> src/app/v7/firma/mitarbeiter/page.tsx"

echo ""
echo "2. Deployment abgeschlossen!"
echo ""
echo "============================================"
echo "AENDERUNG v7.3.47:"
echo "============================================"
echo ""
echo "Mitarbeiter-Seite (Firmen-Portal):"
echo "  - Konsistenter Header mit PortalHeader"
echo "  - Sub-Navigation: Firmendaten | Projekte | Mitarbeiter"
echo "  - Mitarbeiter-Link aktiv markiert (gruen)"
echo "  - UTF-8 Fehler bereinigt"
echo ""
echo "============================================"
echo ""
echo "Testen unter:"
echo "   http://localhost:3000/v7/firma/mitarbeiter"
echo ""
