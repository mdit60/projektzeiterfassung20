#!/bin/bash
# ============================================
# PZE V7.3.55 Deploy Script
# ============================================
# Datum: 21. Januar 2026
#
# Aenderungen:
# - Berater-Seite nutzt jetzt Shared Components
# - WorkPackageList mit MA-Zuordnungen
# - WorkPackageEditModal
# - WorkPackageAssignmentModal
# - Einheitliches Design fuer beide Portale
# ============================================

set -e

DOWNLOADS_DIR="$HOME/Documents/dev/pze/downloads"
PROJECT_DIR="$HOME/Documents/Dev/PZE"

echo "============================================"
echo "PZE V7.3.55 - Berater-Portal Shared Components"
echo "============================================"
echo ""

# Pruefen ob Verzeichnisse existieren
if [ ! -d "$DOWNLOADS_DIR" ]; then
    echo "FEHLER: Downloads-Verzeichnis nicht gefunden: $DOWNLOADS_DIR"
    exit 1
fi

if [ ! -d "$PROJECT_DIR" ]; then
    echo "FEHLER: Projekt-Verzeichnis nicht gefunden: $PROJECT_DIR"
    exit 1
fi

echo "1. Berater-Portal Firmen-Detailseite aktualisieren..."
if [ -f "$DOWNLOADS_DIR/v7-firma-detail-page-v7_3_55.tsx" ]; then
    cp "$DOWNLOADS_DIR/v7-firma-detail-page-v7_3_55.tsx" "$PROJECT_DIR/src/app/v7/berater/foerderung/firma/[id]/page.tsx"
    echo "   OK: Berater-Seite aktualisiert"
else
    echo "   FEHLER: v7-firma-detail-page-v7_3_55.tsx nicht gefunden!"
    exit 1
fi

echo ""
echo "============================================"
echo "Deploy abgeschlossen!"
echo "============================================"
echo ""
echo "Naechste Schritte:"
echo "1. cd $PROJECT_DIR"
echo "2. npm run build"
echo "3. npm run dev"
echo "4. Browser: http://localhost:3000/v7/berater/foerderung"
echo ""
echo "Aenderungen:"
echo "- Berater-Portal nutzt jetzt WorkPackageList Shared Component"
echo "- Identisches AP-Design wie Firmen-Portal"
echo "- MA-Zuordnungen inline angezeigt"
echo "- Einheitliche Modals fuer AP-Bearbeitung und MA-Zuordnung"
echo ""
