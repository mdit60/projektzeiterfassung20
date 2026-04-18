#!/bin/bash
# ============================================================================
# Deploy-Script fuer PZE v7.3.56
# ============================================================================
# Datum: 21. Januar 2026
#
# AENDERUNGEN:
# - Shared ProjectDetailPage Component
# - Berater-Portal Firmen-Detailseite mit Tab-Struktur
# - Neue Route: /v7/berater/foerderung/firma/[firmaId]/projekt/[projektId]
# - Projekte nicht mehr aufklappbar - eigene Detail-Seite
# ============================================================================

set -e

PROJECT_DIR="$HOME/Documents/Dev/PZE"
DOWNLOADS_DIR="$HOME/Documents/dev/pze/downloads"
SHARED_DIR="$PROJECT_DIR/src/components/shared"
BERATER_DIR="$PROJECT_DIR/src/app/v7/berater/foerderung/firma"
FIRMA_DIR="$PROJECT_DIR/src/app/v7/firma/projekte"

echo "=========================================="
echo "PZE v7.3.56 Deployment"
echo "=========================================="
echo ""

# 1. Shared Component
echo "1. Shared ProjectDetailPage Component..."
if [ -f "$DOWNLOADS_DIR/ProjectDetailPage-v7_3_56.tsx" ]; then
    cp "$DOWNLOADS_DIR/ProjectDetailPage-v7_3_56.tsx" "$SHARED_DIR/ProjectDetailPage.tsx"
    echo "   OK: ProjectDetailPage.tsx"
else
    echo "   FEHLER: ProjectDetailPage-v7_3_56.tsx nicht gefunden!"
    exit 1
fi

# 2. Firmen-Portal Projekt-Detail (Wrapper)
echo ""
echo "2. Firmen-Portal Projekt-Detail..."
if [ -f "$DOWNLOADS_DIR/page-firma-projekt-detail-v7_3_56.tsx" ]; then
    # Verzeichnis existiert bereits
    cp "$DOWNLOADS_DIR/page-firma-projekt-detail-v7_3_56.tsx" "$FIRMA_DIR/[id]/page.tsx"
    echo "   OK: /v7/firma/projekte/[id]/page.tsx"
else
    echo "   FEHLER: page-firma-projekt-detail-v7_3_56.tsx nicht gefunden!"
    exit 1
fi

# 3. Berater-Portal Firmen-Detailseite (neue Tab-Struktur)
echo ""
echo "3. Berater-Portal Firmen-Detailseite..."
if [ -f "$DOWNLOADS_DIR/v7-firma-detail-page-v7_3_56.tsx" ]; then
    cp "$DOWNLOADS_DIR/v7-firma-detail-page-v7_3_56.tsx" "$BERATER_DIR/[id]/page.tsx"
    echo "   OK: /v7/berater/foerderung/firma/[id]/page.tsx"
else
    echo "   FEHLER: v7-firma-detail-page-v7_3_56.tsx nicht gefunden!"
    exit 1
fi

# 4. Berater-Portal Projekt-Detail (NEUE ROUTE)
# WICHTIG: Muss unter [id] liegen, nicht [firmaId]!
echo ""
echo "4. Berater-Portal Projekt-Detail (neue Route)..."
PROJEKT_DIR="$BERATER_DIR/[id]/projekt/[projektId]"
if [ ! -d "$PROJEKT_DIR" ]; then
    mkdir -p "$PROJEKT_DIR"
    echo "   Verzeichnis erstellt: $PROJEKT_DIR"
fi
if [ -f "$DOWNLOADS_DIR/page-berater-projekt-detail-v7_3_56.tsx" ]; then
    cp "$DOWNLOADS_DIR/page-berater-projekt-detail-v7_3_56.tsx" "$PROJEKT_DIR/page.tsx"
    echo "   OK: /v7/berater/foerderung/firma/[id]/projekt/[projektId]/page.tsx"
else
    echo "   FEHLER: page-berater-projekt-detail-v7_3_56.tsx nicht gefunden!"
    exit 1
fi

echo ""
echo "=========================================="
echo "Deployment v7.3.56 abgeschlossen!"
echo "=========================================="
echo ""
echo "NEUE STRUKTUR:"
echo ""
echo "  Shared Components:"
echo "    /src/components/shared/ProjectDetailPage.tsx (NEU)"
echo ""
echo "  Berater-Portal:"
echo "    /v7/berater/foerderung/firma/[id]               -> Firmen-Detail mit Tabs"
echo "    /v7/berater/foerderung/firma/[id]/projekt/[projektId] (NEU)"
echo ""
echo "  Firmen-Portal:"
echo "    /v7/firma/projekte/[id]                    -> Nutzt Shared Component"
echo ""
echo "NAECHSTE SCHRITTE:"
echo ""
echo "  1. Build testen:"
echo "     cd $PROJECT_DIR"
echo "     npm run build"
echo ""
echo "  2. Entwicklungsserver starten:"
echo "     npm run dev"
echo ""
echo "  3. Testen:"
echo "     - Berater: Auf Firma klicken -> Tabs pruefen"
echo "     - Berater: Auf Projekt klicken -> Projekt-Detail pruefen"
echo "     - Firma: Auf Projekt klicken -> Projekt-Detail pruefen"
echo ""
echo "  4. Git Commit:"
echo "     git add ."
echo "     git commit -m 'v7.3.56: Shared ProjectDetailPage + Berater Tab-Struktur'"
echo "     git push origin v7-dev"
echo ""
