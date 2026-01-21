#!/bin/bash
# ============================================
# PZE V7.3.54 Deploy Script
# ============================================
# Datum: 21. Januar 2026
#
# Aenderungen:
# - WorkPackageList: MA-Zuordnungen inline anzeigen
# - Projekt-Detail-Seite: assignments + employees Props
# ============================================

set -e

DOWNLOADS_DIR="$HOME/Documents/dev/pze/downloads"
PROJECT_DIR="$HOME/Documents/Dev/PZE"

echo "============================================"
echo "PZE V7.3.54 - MA-Zuordnungen in AP-Liste"
echo "============================================"
echo ""

# Pruefen ob Downloads-Verzeichnis existiert
if [ ! -d "$DOWNLOADS_DIR" ]; then
    echo "FEHLER: Downloads-Verzeichnis nicht gefunden: $DOWNLOADS_DIR"
    exit 1
fi

# Pruefen ob Projekt-Verzeichnis existiert
if [ ! -d "$PROJECT_DIR" ]; then
    echo "FEHLER: Projekt-Verzeichnis nicht gefunden: $PROJECT_DIR"
    exit 1
fi

echo "1. WorkPackageList Komponente aktualisieren..."
if [ -f "$DOWNLOADS_DIR/WorkPackageList-v7_3_54.tsx" ]; then
    cp "$DOWNLOADS_DIR/WorkPackageList-v7_3_54.tsx" "$PROJECT_DIR/src/components/shared/WorkPackageList.tsx"
    echo "   ✓ WorkPackageList.tsx aktualisiert"
else
    echo "   ✗ WorkPackageList-v7_3_54.tsx nicht gefunden!"
    exit 1
fi

echo ""
echo "2. Projekt-Detail-Seite aktualisieren..."
if [ -f "$DOWNLOADS_DIR/page-firma-projekt-detail-v7_3_54.tsx" ]; then
    cp "$DOWNLOADS_DIR/page-firma-projekt-detail-v7_3_54.tsx" "$PROJECT_DIR/src/app/v7/firma/projekte/[id]/page.tsx"
    echo "   ✓ page.tsx aktualisiert"
else
    echo "   ✗ page-firma-projekt-detail-v7_3_54.tsx nicht gefunden!"
    exit 1
fi

echo ""
echo "============================================"
echo "Deploy abgeschlossen!"
echo "============================================"
echo ""
echo "Naechste Schritte:"
echo "1. cd $PROJECT_DIR"
echo "2. npm run dev"
echo "3. Browser: http://localhost:3000/v7/firma/projekte/[id]"
echo ""
echo "Die Arbeitspakete-Liste zeigt jetzt:"
echo "- MA-Zuordnungen mit Namen und PM"
echo "- Verteilt/Gesamt PM pro AP"
echo "- Aktions-Buttons (Bearbeiten, MA zuordnen, Loeschen)"
echo ""
