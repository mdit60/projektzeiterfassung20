#!/bin/bash
# ============================================================================
# PZE V7 Deploy Script - Version 7.3.51
# Redundante Statistik-Kacheln entfernt
# ============================================================================
# Datum: 21. Januar 2026
# ============================================================================
# 
# AENDERUNGEN v7.3.51:
# - Quick Stats Kacheln entfernt (waren redundant)
#   Info steht bereits in: Tabs (AP-Anzahl, Team-Anzahl) + Projektdaten (PM)
#
# BASIERT AUF: v7_3_50 (Projekt-Bearbeiten-Modal)
# ============================================================================

set -e

echo "============================================"
echo "PZE V7 Deploy - Version 7.3.51"
echo "============================================"
echo ""

# Verzeichnisse
DOWNLOAD_DIR="$HOME/Documents/dev/pze/downloads"
PROJECT_DIR="$HOME/Documents/dev/pze"

# Pruefen ob Download vorhanden
if [ ! -f "$DOWNLOAD_DIR/page-firma-projekt-detail-v7_3_51.tsx" ]; then
    echo "FEHLER: page-firma-projekt-detail-v7_3_51.tsx nicht gefunden!"
    exit 1
fi

echo "1. Kopiere Dateien..."

cp "$DOWNLOAD_DIR/page-firma-projekt-detail-v7_3_51.tsx" \
   "$PROJECT_DIR/src/app/v7/firma/projekte/[id]/page.tsx"
echo "   - page-firma-projekt-detail-v7_3_51.tsx -> src/app/v7/firma/projekte/[id]/page.tsx"

echo ""
echo "2. Deployment abgeschlossen!"
echo ""
echo "============================================"
echo "AENDERUNG v7.3.51:"
echo "  - Redundante Statistik-Kacheln entfernt"
echo "============================================"
echo ""
