#!/bin/bash
# ============================================================================
# PZE v7.3.84 - Deployment Script
# ============================================================================
# Datum: 24. Januar 2026
#
# Aenderungen:
# - EmployeeManagement: Alle Anlage 6.1 Felder (Gehalt, Stundensatz, etc.)
# - WorkPackageTable: Neue Excel-Style Arbeitsplan-Tabelle mit Inline-Edit
# - v7_project_team: Projektspezifische Mitarbeiter-Nummern
# ============================================================================

# Farben fuer Ausgabe
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo ""
echo "=========================================="
echo "  PZE v7.3.84 - Deployment"
echo "=========================================="
echo ""

# Basis-Pfade
DOWNLOADS_DIR="$HOME/Documents/Dev/PZE/downloads"
PROJECT_DIR="$HOME/Documents/Dev/PZE/src"

# Pruefen ob Downloads-Verzeichnis existiert
if [ ! -d "$DOWNLOADS_DIR" ]; then
    echo -e "${RED}FEHLER: Downloads-Verzeichnis nicht gefunden: $DOWNLOADS_DIR${NC}"
    exit 1
fi

# Pruefen ob Projekt-Verzeichnis existiert
if [ ! -d "$PROJECT_DIR" ]; then
    echo -e "${RED}FEHLER: Projekt-Verzeichnis nicht gefunden: $PROJECT_DIR${NC}"
    exit 1
fi

# ============================================================================
# Dateien kopieren
# ============================================================================

echo "Kopiere Dateien..."
echo ""

# ProjectDetailPage
if [ -f "$DOWNLOADS_DIR/ProjectDetailPage-v7_3_84.tsx" ]; then
    cp "$DOWNLOADS_DIR/ProjectDetailPage-v7_3_84.tsx" "$PROJECT_DIR/components/shared/ProjectDetailPage.tsx"
    echo -e "${GREEN}✓${NC} ProjectDetailPage.tsx aktualisiert"
else
    echo -e "${YELLOW}⚠ ProjectDetailPage-v7_3_84.tsx nicht gefunden - uebersprungen${NC}"
fi

# Berater-Dashboard (page.tsx)
if [ -f "$DOWNLOADS_DIR/berater-page-v7_3_84-2.tsx" ]; then
    cp "$DOWNLOADS_DIR/berater-page-v7_3_84-2.tsx" "$PROJECT_DIR/app/v7/berater/page.tsx"
    echo -e "${GREEN}✓${NC} Berater-Dashboard (page.tsx) aktualisiert"
elif [ -f "$DOWNLOADS_DIR/berater-page-v7_3_84.tsx" ]; then
    cp "$DOWNLOADS_DIR/berater-page-v7_3_84.tsx" "$PROJECT_DIR/app/v7/berater/page.tsx"
    echo -e "${GREEN}✓${NC} Berater-Dashboard (page.tsx) aktualisiert"
else
    echo -e "${YELLOW}⚠ berater-page-v7_3_84*.tsx nicht gefunden - uebersprungen${NC}"
fi

# Foerderung-Seite (Firmenliste)
if [ -f "$DOWNLOADS_DIR/foerderung-page-v7_3_84-3.tsx" ]; then
    cp "$DOWNLOADS_DIR/foerderung-page-v7_3_84-3.tsx" "$PROJECT_DIR/app/v7/berater/foerderung/page.tsx"
    echo -e "${GREEN}✓${NC} Foerderung-Seite (Firmenliste) aktualisiert"
else
    echo -e "${YELLOW}⚠ foerderung-page-v7_3_84-3.tsx nicht gefunden - uebersprungen${NC}"
fi

# EmployeeManagement (Mitarbeiter-Modal mit Anlage 6.1)
if [ -f "$DOWNLOADS_DIR/EmployeeManagement-v7_3_84.tsx" ]; then
    cp "$DOWNLOADS_DIR/EmployeeManagement-v7_3_84.tsx" "$PROJECT_DIR/components/shared/EmployeeManagement.tsx"
    echo -e "${GREEN}✓${NC} EmployeeManagement (Anlage 6.1 Felder) aktualisiert"
else
    echo -e "${YELLOW}⚠ EmployeeManagement-v7_3_84.tsx nicht gefunden - uebersprungen${NC}"
fi

# Hinweis auf Migration
if [ -f "$DOWNLOADS_DIR/migration-v7_3_84-anlage61.sql" ]; then
    echo ""
    echo -e "${YELLOW}=========================================="
    echo "  WICHTIG: Datenbank-Migration erforderlich!"
    echo "==========================================${NC}"
    echo ""
    echo "Bitte fuehre folgende SQL-Migrationen in Supabase aus:"
    echo "  1. migration-v7_3_84-anlage61.sql (Anlage 6.1 Felder)"
    echo "  2. migration-v7_3_84-project-team.sql (Projektspez. MA-Nummern)"
    echo ""
fi

# WorkPackageTable (Arbeitsplan-Tabelle)
if [ -f "$DOWNLOADS_DIR/WorkPackageTable-v7_3_84.tsx" ]; then
    cp "$DOWNLOADS_DIR/WorkPackageTable-v7_3_84.tsx" "$PROJECT_DIR/components/shared/WorkPackageTable.tsx"
    echo -e "${GREEN}✓${NC} WorkPackageTable (Arbeitsplan Excel-Style) erstellt"
else
    echo -e "${YELLOW}⚠ WorkPackageTable-v7_3_84.tsx nicht gefunden - uebersprungen${NC}"
fi

echo ""
echo "=========================================="
echo -e "${GREEN}  Deployment abgeschlossen!${NC}"
echo "=========================================="
echo ""
echo "Naechste Schritte:"
echo "  1. SQL-Migrationen in Supabase ausfuehren (falls noch nicht geschehen):"
echo "     - migration-v7_3_84-anlage61.sql"
echo "     - migration-v7_3_84-project-team.sql"
echo "  2. Terminal: cd ~/Documents/Dev/PZE && npm run dev"
echo "  3. Browser: http://localhost:3000"
echo "  4. Testen:"
echo "     - Mitarbeiter bearbeiten -> Anlage 6.1 Felder"
echo "     - WorkPackageTable ist bereit (wird in naechster Version integriert)"
echo ""
