#!/bin/bash
# ============================================================================
# PZE V7 DEPLOYMENT SCRIPT
# ============================================================================
# Version: v7.3.53
# Datum: 21. Januar 2026
#
# Firmen-Portal Projekt-Detail-Seite mit Shared Components
# ============================================================================

echo "=========================================="
echo "PZE V7.3.53 - Firmen-Portal Projekt-Detail"
echo "=========================================="
echo ""

# Basis-Verzeichnisse
DOWNLOADS_DIR="$HOME/Documents/dev/pze/downloads"
PROJECT_DIR="$HOME/Documents/dev/pze/PZE"

# Ziel-Pfad
TARGET_FILE="$PROJECT_DIR/src/app/v7/firma/projekte/[id]/page.tsx"

echo "Kopiere Projekt-Detail-Seite..."
echo ""

if [ -f "$DOWNLOADS_DIR/page-firma-projekt-detail-v7_3_53.tsx" ]; then
    cp "$DOWNLOADS_DIR/page-firma-projekt-detail-v7_3_53.tsx" "$TARGET_FILE"
    echo "   OK: page.tsx aktualisiert"
else
    echo "   FEHLER: page-firma-projekt-detail-v7_3_53.tsx nicht gefunden!"
    exit 1
fi

echo ""
echo "=========================================="
echo "Deployment v7.3.53 abgeschlossen!"
echo "=========================================="
echo ""
echo "NAECHSTE SCHRITTE:"
echo ""
echo "1. Build testen:"
echo "   cd $PROJECT_DIR"
echo "   npm run build"
echo ""
echo "2. Dev-Server starten:"
echo "   npm run dev"
echo ""
echo "3. Testen:"
echo "   - Firmen-Portal oeffnen"
echo "   - Zu einem Projekt navigieren"
echo "   - Tab 'Arbeitspakete' testen:"
echo "     - AP anlegen"
echo "     - AP bearbeiten"
echo "     - MA zu AP zuordnen"
echo "     - AP loeschen"
echo ""
echo "4. Git Commit:"
echo "   git add ."
echo "   git commit -m 'v7.3.53: Firmen-Portal Projekt-Detail mit Shared WP Components'"
echo ""
