#!/bin/bash
# ============================================================================
# PZE V7 Deploy Script - Version 7.3.48
# Team-Tab: Stundensatz-Spalte und Bearbeitung
# ============================================================================
# Datum: 21. Januar 2026
# ============================================================================
# 
# AENDERUNGEN:
# - Team-Tab: Stundensatz-Spalte (EUR/h)
# - Team-Tab: Stunden-Spalte (berechnet aus PM)
# - Team-Tab: Bearbeiten-Button pro Mitarbeiter
# - Team-Tab: Modal zum Bearbeiten (Rolle, Stundensatz, Projektleiter)
# - Team-Tab: Summenzeile mit Gesamt-PM und Gesamt-Stunden
# - Team-Daten: Aggregiert aus work_package_assignments
#
# BASIERT AUF: v7_3_43 (stabile Version mit PM/Team)
# ============================================================================

set -e

echo "============================================"
echo "PZE V7 Deploy - Version 7.3.48"
echo "============================================"
echo ""

# Verzeichnisse
DOWNLOAD_DIR="$HOME/Documents/dev/pze/downloads"
PROJECT_DIR="$HOME/Documents/dev/pze"

# Pruefen ob Download vorhanden
if [ ! -f "$DOWNLOAD_DIR/page-firma-projekt-detail-v7_3_48.tsx" ]; then
    echo "FEHLER: page-firma-projekt-detail-v7_3_48.tsx nicht gefunden!"
    exit 1
fi

echo "1. Kopiere Dateien..."

# Projekt-Detail Seite
cp "$DOWNLOAD_DIR/page-firma-projekt-detail-v7_3_48.tsx" \
   "$PROJECT_DIR/src/app/v7/firma/projekte/[id]/page.tsx"
echo "   - page-firma-projekt-detail-v7_3_48.tsx -> src/app/v7/firma/projekte/[id]/page.tsx"

echo ""
echo "2. Deployment abgeschlossen!"
echo ""
echo "============================================"
echo "AENDERUNGEN v7.3.48:"
echo "============================================"
echo ""
echo "Team-Tab (Projekt-Detail):"
echo "  - Neue Spalte: Stundensatz (EUR/h)"
echo "  - Neue Spalte: Stunden (aus PM berechnet)"
echo "  - Bearbeiten-Button pro Mitarbeiter"
echo "  - Modal: Rolle, Stundensatz, Projektleiter-Flag"
echo "  - Summenzeile: Gesamt-PM und Gesamt-Stunden"
echo "  - 'nicht gesetzt' Warnung wenn Stundensatz fehlt"
echo ""
echo "============================================"
echo ""
echo "Testen unter:"
echo "   http://localhost:3000/v7/firma/projekte/[id] -> Tab 'Team'"
echo ""
