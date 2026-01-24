#!/bin/bash
# ============================================================================
# PZE v7.3.85 - Deployment Script
# ============================================================================
# Datum: 24. Januar 2026
#
# Aenderungen:
# - WorkPackageTable: Excel-Style Arbeitsplan mit Inline-Edit
# - ProjectDetailPage: Integriert WorkPackageTable im Arbeitspakete-Tab
# - EmployeeManagement: Alle Anlage 6.1 Felder
# - v7_project_team: Projektspezifische Mitarbeiter-Nummern
# ============================================================================

# Farben fuer Ausgabe
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo ""
echo "=========================================="
echo "  PZE v7.3.85 - Deployment"
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

# WorkPackageTable (NEU - Excel-Style Arbeitsplan)
if [ -f "$DOWNLOADS_DIR/WorkPackageTable-v7_3_85.tsx" ]; then
    cp "$DOWNLOADS_DIR/WorkPackageTable-v7_3_85.tsx" "$PROJECT_DIR/components/shared/WorkPackageTable.tsx"
    echo -e "${GREEN}✓${NC} WorkPackageTable.tsx aktualisiert (Sticky Spalten, Sortierung, MA-Namen)"
elif [ -f "$DOWNLOADS_DIR/WorkPackageTable-v7_3_84.tsx" ]; then
    cp "$DOWNLOADS_DIR/WorkPackageTable-v7_3_84.tsx" "$PROJECT_DIR/components/shared/WorkPackageTable.tsx"
    echo -e "${GREEN}✓${NC} WorkPackageTable.tsx erstellt (Excel-Style mit Inline-Edit)"
else
    echo -e "${RED}✗ FEHLER: WorkPackageTable nicht gefunden!${NC}"
fi

# ProjectDetailPage (mit WorkPackageTable Integration)
if [ -f "$DOWNLOADS_DIR/ProjectDetailPage-v7_3_85.tsx" ]; then
    cp "$DOWNLOADS_DIR/ProjectDetailPage-v7_3_85.tsx" "$PROJECT_DIR/components/shared/ProjectDetailPage.tsx"
    echo -e "${GREEN}✓${NC} ProjectDetailPage.tsx aktualisiert (WorkPackageTable integriert)"
else
    echo -e "${YELLOW}⚠ ProjectDetailPage-v7_3_85.tsx nicht gefunden - uebersprungen${NC}"
fi

# EmployeeManagement (Mitarbeiterverwaltung)
if [ -f "$DOWNLOADS_DIR/EmployeeManagement-v7_3_85.tsx" ]; then
    cp "$DOWNLOADS_DIR/EmployeeManagement-v7_3_85.tsx" "$PROJECT_DIR/components/shared/EmployeeManagement.tsx"
    echo -e "${GREEN}✓${NC} EmployeeManagement.tsx aktualisiert (v7.3.85 - Verknuepfen-Button Fix)"
elif [ -f "$DOWNLOADS_DIR/EmployeeManagement-v7_3_84.tsx" ]; then
    cp "$DOWNLOADS_DIR/EmployeeManagement-v7_3_84.tsx" "$PROJECT_DIR/components/shared/EmployeeManagement.tsx"
    echo -e "${GREEN}✓${NC} EmployeeManagement.tsx aktualisiert (Anlage 6.1 Felder)"
else
    echo -e "${YELLOW}⚠ EmployeeManagement nicht gefunden - uebersprungen${NC}"
fi

# Login-Page (Auto-Profil-Erstellung beim ersten Login)
if [ -f "$DOWNLOADS_DIR/login-page-v7_3_85.tsx" ]; then
    cp "$DOWNLOADS_DIR/login-page-v7_3_85.tsx" "$PROJECT_DIR/app/login/page.tsx"
    echo -e "${GREEN}✓${NC} Login-Page aktualisiert (Auto-Profil bei erstem Login)"
else
    echo -e "${YELLOW}⚠ Login-Page nicht gefunden - uebersprungen${NC}"
fi

# PortalHeader (Navigation-Fix)
if [ -f "$DOWNLOADS_DIR/PortalHeader-v7_3_85.tsx" ]; then
    cp "$DOWNLOADS_DIR/PortalHeader-v7_3_85.tsx" "$PROJECT_DIR/components/shared/PortalHeader.tsx"
    echo -e "${GREEN}✓${NC} PortalHeader.tsx aktualisiert (hideNavigation Option)"
else
    echo -e "${YELLOW}⚠ PortalHeader nicht gefunden - uebersprungen${NC}"
fi

# Firmen-Detailseite (Navigation ausgeblendet)
if [ -f "$DOWNLOADS_DIR/v7-firma-detail-page-v7_3_85.tsx" ]; then
    cp "$DOWNLOADS_DIR/v7-firma-detail-page-v7_3_85.tsx" "$PROJECT_DIR/app/v7/berater/foerderung/firma/[id]/page.tsx"
    echo -e "${GREEN}✓${NC} Firmen-Detailseite aktualisiert (Navigation im Header ausgeblendet)"
else
    echo -e "${YELLOW}⚠ Firmen-Detailseite nicht gefunden - uebersprungen${NC}"
fi

# Firma-Dashboard (Redirect-Fix)
if [ -f "$DOWNLOADS_DIR/v7-firma-dashboard-v7_3_85.tsx" ]; then
    cp "$DOWNLOADS_DIR/v7-firma-dashboard-v7_3_85.tsx" "$PROJECT_DIR/app/v7/firma/dashboard/page.tsx"
    echo -e "${GREEN}✓${NC} Firma-Dashboard aktualisiert (Berater-Redirect gefixt)"
else
    echo -e "${YELLOW}⚠ Firma-Dashboard nicht gefunden - uebersprungen${NC}"
fi

# Berater-Startseite (ZIM-Varianten Zählung)
if [ -f "$DOWNLOADS_DIR/berater-page-v7_3_85.tsx" ]; then
    cp "$DOWNLOADS_DIR/berater-page-v7_3_85.tsx" "$PROJECT_DIR/app/v7/berater/page.tsx"
    echo -e "${GREEN}✓${NC} Berater-Startseite aktualisiert (ZIM-Varianten in Zählung)"
else
    echo -e "${YELLOW}⚠ Berater-Startseite nicht gefunden - uebersprungen${NC}"
fi

echo ""

# ============================================================================
# Hinweis auf Migrationen
# ============================================================================

echo -e "${YELLOW}=========================================="
echo "  WICHTIG: Datenbank-Migrationen"
echo "==========================================${NC}"
echo ""

if [ -f "$DOWNLOADS_DIR/migration-v7_3_84-anlage61.sql" ]; then
    echo "1. migration-v7_3_84-anlage61.sql"
    echo "   → Anlage 6.1 Felder fuer v7_employees"
    echo ""
fi

if [ -f "$DOWNLOADS_DIR/migration-v7_3_84-project-team.sql" ]; then
    echo "2. migration-v7_3_84-project-team.sql"
    echo "   → Neue Tabelle v7_project_team"
    echo ""
fi

if [ -f "$DOWNLOADS_DIR/migration-v7_3_85-employee-number.sql" ]; then
    echo "3. migration-v7_3_85-employee-number.sql"
    echo "   → employee_number in v7_project_assignments"
    echo "   → Ermoeglicht projektspezifische MA-Nummern"
    echo ""
fi

echo "Bitte in Supabase SQL Editor ausfuehren!"
echo ""

# ============================================================================
# Abschluss
# ============================================================================

echo "=========================================="
echo -e "${GREEN}  Deployment abgeschlossen!${NC}"
echo "=========================================="
echo ""
echo "Naechste Schritte:"
echo "  1. SQL-Migrationen in Supabase ausfuehren (falls noch nicht geschehen)"
echo "  2. Terminal: cd ~/Documents/Dev/PZE && npm run dev"
echo "  3. Browser: http://localhost:3000"
echo "  4. Testen:"
echo "     - Projekt oeffnen -> Tab 'Arbeitspakete'"
echo "     - Neue Tabelle mit Spalten pro Mitarbeiter"
echo "     - Klicken Sie in eine Zelle zum Inline-Edit"
echo "     - Summen pro Zeile und Spalte pruefen"
echo ""
