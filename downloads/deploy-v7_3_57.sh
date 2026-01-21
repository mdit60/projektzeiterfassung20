#!/bin/bash
# ============================================================================
# Deploy-Script fuer PZE v7.3.57
# ============================================================================
# Datum: 21. Januar 2026
#
# AENDERUNGEN:
# - Neue Shared Components: ProjectList, CompanyDataView, EmployeeList
# - BEIDE Portale nutzen jetzt Shared Components
# - Identische Darstellung in beiden Portalen
#
# HINWEIS: Mitarbeiter-Seite im Firmen-Portal bleibt unveraendert
#          (hat volle CRUD-Funktionalitaet, nicht nur Anzeige)
# ============================================================================

set -e

PROJECT_DIR="$HOME/Documents/Dev/PZE"
DOWNLOADS_DIR="$HOME/Documents/dev/pze/downloads"
SHARED_DIR="$PROJECT_DIR/src/components/shared"
BERATER_DIR="$PROJECT_DIR/src/app/v7/berater/foerderung/firma"
FIRMA_DIR="$PROJECT_DIR/src/app/v7/firma"

echo "=========================================="
echo "PZE v7.3.57 Deployment"
echo "=========================================="
echo ""

# 1. Shared Components
echo "1. Shared Components installieren..."

if [ -f "$DOWNLOADS_DIR/ProjectList-v7_3_57.tsx" ]; then
    cp "$DOWNLOADS_DIR/ProjectList-v7_3_57.tsx" "$SHARED_DIR/ProjectList.tsx"
    echo "   OK: ProjectList.tsx"
else
    echo "   FEHLER: ProjectList-v7_3_57.tsx nicht gefunden!"
    exit 1
fi

if [ -f "$DOWNLOADS_DIR/CompanyDataView-v7_3_57.tsx" ]; then
    cp "$DOWNLOADS_DIR/CompanyDataView-v7_3_57.tsx" "$SHARED_DIR/CompanyDataView.tsx"
    echo "   OK: CompanyDataView.tsx"
else
    echo "   FEHLER: CompanyDataView-v7_3_57.tsx nicht gefunden!"
    exit 1
fi

if [ -f "$DOWNLOADS_DIR/EmployeeManagement-v7_3_57.tsx" ]; then
    cp "$DOWNLOADS_DIR/EmployeeManagement-v7_3_57.tsx" "$SHARED_DIR/EmployeeManagement.tsx"
    echo "   OK: EmployeeManagement.tsx"
else
    echo "   FEHLER: EmployeeManagement-v7_3_57.tsx nicht gefunden!"
    exit 1
fi

if [ -f "$DOWNLOADS_DIR/ProjectCreateForm-v7_3_57.tsx" ]; then
    cp "$DOWNLOADS_DIR/ProjectCreateForm-v7_3_57.tsx" "$SHARED_DIR/ProjectCreateForm.tsx"
    echo "   OK: ProjectCreateForm.tsx"
else
    echo "   FEHLER: ProjectCreateForm-v7_3_57.tsx nicht gefunden!"
    exit 1
fi

# 2. Berater-Portal Seiten
echo ""
echo "2. Berater-Portal Seiten..."

if [ -f "$DOWNLOADS_DIR/v7-firma-detail-page-v7_3_57.tsx" ]; then
    cp "$DOWNLOADS_DIR/v7-firma-detail-page-v7_3_57.tsx" "$BERATER_DIR/[id]/page.tsx"
    echo "   OK: /v7/berater/foerderung/firma/[id]/page.tsx"
else
    echo "   FEHLER: v7-firma-detail-page-v7_3_57.tsx nicht gefunden!"
    exit 1
fi

# Neues Projekt Seite fuer Berater
BERATER_PROJEKT_NEU_DIR="$BERATER_DIR/[id]/projekt/neu"
mkdir -p "$BERATER_PROJEKT_NEU_DIR"

if [ -f "$DOWNLOADS_DIR/page-berater-projekt-neu-v7_3_57.tsx" ]; then
    cp "$DOWNLOADS_DIR/page-berater-projekt-neu-v7_3_57.tsx" "$BERATER_PROJEKT_NEU_DIR/page.tsx"
    echo "   OK: /v7/berater/foerderung/firma/[id]/projekt/neu/page.tsx"
else
    echo "   FEHLER: page-berater-projekt-neu-v7_3_57.tsx nicht gefunden!"
    exit 1
fi

# ProjectDetailPage (Shared Component mit Fix)
if [ -f "$DOWNLOADS_DIR/ProjectDetailPage-v7_3_57.tsx" ]; then
    cp "$DOWNLOADS_DIR/ProjectDetailPage-v7_3_57.tsx" "$SHARED_DIR/ProjectDetailPage.tsx"
    echo "   OK: ProjectDetailPage.tsx (Foerderformat-Label Fix)"
else
    echo "   WARNUNG: ProjectDetailPage-v7_3_57.tsx nicht gefunden - ueberspringe"
fi

# 3. Firmen-Portal Seiten
echo ""
echo "3. Firmen-Portal Seiten..."

if [ -f "$DOWNLOADS_DIR/page-firma-projekte-v7_3_57.tsx" ]; then
    cp "$DOWNLOADS_DIR/page-firma-projekte-v7_3_57.tsx" "$FIRMA_DIR/projekte/page.tsx"
    echo "   OK: /v7/firma/projekte/page.tsx"
else
    echo "   FEHLER: page-firma-projekte-v7_3_57.tsx nicht gefunden!"
    exit 1
fi

if [ -f "$DOWNLOADS_DIR/page-firma-firmendaten-v7_3_57.tsx" ]; then
    cp "$DOWNLOADS_DIR/page-firma-firmendaten-v7_3_57.tsx" "$FIRMA_DIR/firmendaten/page.tsx"
    echo "   OK: /v7/firma/firmendaten/page.tsx"
else
    echo "   FEHLER: page-firma-firmendaten-v7_3_57.tsx nicht gefunden!"
    exit 1
fi

if [ -f "$DOWNLOADS_DIR/page-firma-mitarbeiter-v7_3_57.tsx" ]; then
    cp "$DOWNLOADS_DIR/page-firma-mitarbeiter-v7_3_57.tsx" "$FIRMA_DIR/mitarbeiter/page.tsx"
    echo "   OK: /v7/firma/mitarbeiter/page.tsx"
else
    echo "   FEHLER: page-firma-mitarbeiter-v7_3_57.tsx nicht gefunden!"
    exit 1
fi

# Neues Projekt Seite fuer Firmen-Portal
FIRMA_PROJEKT_NEU_DIR="$FIRMA_DIR/projekte/neu"
mkdir -p "$FIRMA_PROJEKT_NEU_DIR"

if [ -f "$DOWNLOADS_DIR/page-firma-projekt-neu-v7_3_57.tsx" ]; then
    cp "$DOWNLOADS_DIR/page-firma-projekt-neu-v7_3_57.tsx" "$FIRMA_PROJEKT_NEU_DIR/page.tsx"
    echo "   OK: /v7/firma/projekte/neu/page.tsx"
else
    echo "   FEHLER: page-firma-projekt-neu-v7_3_57.tsx nicht gefunden!"
    exit 1
fi

echo ""
echo "=========================================="
echo "Deployment v7.3.57 abgeschlossen!"
echo "=========================================="
echo ""
echo "SHARED COMPONENTS:"
echo ""
echo "  /src/components/shared/"
echo "    - ProjectList.tsx          (Projektliste)"
echo "    - CompanyDataView.tsx      (Firmendaten)"
echo "    - EmployeeManagement.tsx   (Mitarbeiter mit CRUD)"
echo "    - ProjectCreateForm.tsx    (Projekt anlegen mit PDF-Import)"
echo "    - ProjectDetailPage.tsx    (Foerderformat-Label Fix)"
echo ""
echo "AKTUALISIERTE SEITEN:"
echo ""
echo "  Berater-Portal:"
echo "    - /v7/berater/foerderung/firma/[id]/page.tsx"
echo "    - /v7/berater/foerderung/firma/[id]/projekt/neu/page.tsx"
echo ""
echo "  Firmen-Portal:"
echo "    - /v7/firma/projekte/page.tsx"
echo "    - /v7/firma/projekte/neu/page.tsx"
echo "    - /v7/firma/firmendaten/page.tsx"
echo "    - /v7/firma/mitarbeiter/page.tsx"
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
echo "  3. Testen (WICHTIG - beide Portale vergleichen!):"
echo "     Firmen-Portal:"
echo "       - /v7/firma/projekte"
echo "       - /v7/firma/firmendaten"
echo "       - /v7/firma/mitarbeiter"
echo "     Berater-Portal:"
echo "       - /v7/berater/foerderung -> Firma oeffnen"
echo "       - Tab Projekte, Firmendaten, Mitarbeiter vergleichen"
echo "       - Mitarbeiter anlegen/bearbeiten testen!"
echo ""
echo "  4. Git Commit:"
echo "     git add ."
echo "     git commit -m 'v7.3.57: Shared Components - beide Portale vereinheitlicht'"
echo "     git push origin v7-dev"
echo ""
