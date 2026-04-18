#!/bin/bash
# ============================================================================
# PZE V7 Deploy Script - Version 7.3.49
# Team-Tab: Stundensatz + Bearbeitung + AP PM/Stunden Fix
# ============================================================================
# Datum: 21. Januar 2026
# ============================================================================
# 
# AENDERUNGEN v7.3.49 (basiert auf v7.3.48):
# - FIX: Arbeitspakete zeigen wieder PM und Stunden
# - FIX: Interface nutzt total_person_months statt planned_pm
# - FIX: Stunden werden berechnet (PM × 173.33)
# - Team-Tab: Stundensatz-Spalte (EUR/h)
# - Team-Tab: Bearbeiten-Button pro Mitarbeiter
# - Team-Tab: Modal zum Bearbeiten (Rolle, Stundensatz, Projektleiter)
#
# BASIERT AUF: v7_3_43 (stabile Version)
# ============================================================================

set -e

echo "============================================"
echo "PZE V7 Deploy - Version 7.3.49"
echo "============================================"
echo ""

# Verzeichnisse
DOWNLOAD_DIR="$HOME/Documents/dev/pze/downloads"
PROJECT_DIR="$HOME/Documents/dev/pze"

# Pruefen ob Download vorhanden
if [ ! -f "$DOWNLOAD_DIR/page-firma-projekt-detail-v7_3_49.tsx" ]; then
    echo "FEHLER: page-firma-projekt-detail-v7_3_49.tsx nicht gefunden!"
    exit 1
fi

echo "1. Kopiere Dateien..."

# Projekt-Detail Seite
cp "$DOWNLOAD_DIR/page-firma-projekt-detail-v7_3_49.tsx" \
   "$PROJECT_DIR/src/app/v7/firma/projekte/[id]/page.tsx"
echo "   - page-firma-projekt-detail-v7_3_49.tsx -> src/app/v7/firma/projekte/[id]/page.tsx"

echo ""
echo "2. Deployment abgeschlossen!"
echo ""
echo "============================================"
echo "AENDERUNGEN v7.3.49:"
echo "============================================"
echo ""
echo "Arbeitspakete-Tab:"
echo "  - FIX: PM und Stunden werden wieder angezeigt"
echo "  - Nutzt total_person_months aus DB"
echo "  - Stunden = PM × 173.33"
echo ""
echo "Team-Tab:"
echo "  - Stundensatz-Spalte (EUR/h)"
echo "  - Stunden-Spalte (aus PM)"
echo "  - Bearbeiten-Button pro MA"
echo "  - Modal: Rolle, Stundensatz, Projektleiter"
echo ""
echo "============================================"
echo ""
echo "Testen unter:"
echo "   http://localhost:3000/v7/firma/projekte/[id]"
echo ""
