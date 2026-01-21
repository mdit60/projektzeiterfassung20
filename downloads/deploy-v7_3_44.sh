#!/bin/bash
# ============================================================================
# PZE V7 Deploy Script - Version 7.3.44
# Dashboard Fix + Neues Projekt mit PDF-Import Option
# ============================================================================
# Datum: 21. Januar 2026
# ============================================================================

set -e

echo "============================================"
echo "PZE V7 Deploy - Version 7.3.44"
echo "============================================"
echo ""

# Verzeichnisse - KORRIGIERTER PFAD!
DOWNLOAD_DIR="$HOME/Documents/dev/pze/downloads"
PROJECT_DIR="$HOME/Documents/dev/pze"

# Pruefen ob Downloads vorhanden
MISSING=0
for FILE in "page-firma-projekt-neu-v7_3_44.tsx" "v7-firma-dashboard-v7_3_44.tsx"; do
    if [ ! -f "$DOWNLOAD_DIR/$FILE" ]; then
        echo "FEHLER: $FILE nicht gefunden!"
        MISSING=1
    fi
done

if [ $MISSING -eq 1 ]; then
    echo ""
    echo "Bitte zuerst alle Dateien herunterladen!"
    exit 1
fi

echo "1. Kopiere Dateien..."

# Dashboard (Firmen-Portal)
cp "$DOWNLOAD_DIR/v7-firma-dashboard-v7_3_44.tsx" \
   "$PROJECT_DIR/src/app/v7/firma/dashboard/page.tsx"
echo "   - v7-firma-dashboard-v7_3_44.tsx -> src/app/v7/firma/dashboard/page.tsx"

# Neues Projekt Seite (Firmen-Portal)
cp "$DOWNLOAD_DIR/page-firma-projekt-neu-v7_3_44.tsx" \
   "$PROJECT_DIR/src/app/v7/firma/projekte/neu/page.tsx"
echo "   - page-firma-projekt-neu-v7_3_44.tsx -> src/app/v7/firma/projekte/neu/page.tsx"

echo ""
echo "2. Deployment abgeschlossen!"
echo ""
echo "============================================"
echo "AENDERUNGEN v7.3.44:"
echo "============================================"
echo ""
echo "Dashboard (Firmen-Portal):"
echo "  - Neues Dashboard mit Bereichen-Kacheln"
echo "  - Statistik-Karten oben"
echo "  - Rollenbasierte Navigation"
echo ""
echo "Neues Projekt anlegen (Firmen-Portal):"
echo "  - Tab-Auswahl: 'Projektantrag hochladen' vs 'Manuell anlegen'"
echo "  - PDF-Upload mit ZIM-Parser-Service"
echo "  - Automatische Extraktion: Projekt, MA, APs"
echo "  - Vorschau der geparsten Daten vor Import"
echo ""
echo "============================================"
echo ""
echo "3. Naechste Schritte:"
echo "   cd $PROJECT_DIR"
echo "   npm run dev"
echo ""
echo "4. Testen unter:"
echo "   http://localhost:3000/v7/firma/dashboard"
echo "   http://localhost:3000/v7/firma/projekte/neu"
echo ""
