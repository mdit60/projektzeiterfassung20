#!/bin/bash
# =============================================================================
# PZE V7 - Deployment Script
# Version: 7.3.86
# Datum: 25. Januar 2026
# =============================================================================
#
# AENDERUNGEN v7.3.86:
# - TypeScript Typ-Fehler behoben
# - PortalHeader: userRole akzeptiert V7UserRole | V7EmployeePortalRole | string
# - PortalHeader: hideNavigation Property hinzugefuegt
# - ProjectDetailPage: Korrekte Typ-Mappings fuer Employee/WorkPackage
# - v7-types: employee_number zu V7Employee hinzugefuegt (optional)
#
# =============================================================================

set -e

echo "================================================"
echo "PZE V7.3.86 - TypeScript Typ-Korrekturen"
echo "================================================"

# Pruefen ob wir im richtigen Verzeichnis sind
if [ ! -d "src" ]; then
    echo "FEHLER: Bitte im PZE-Hauptverzeichnis ausfuehren!"
    exit 1
fi

DOWNLOAD_DIR="$HOME/Documents/Dev/PZE/downloads"

echo ""
echo "1. Sichere bestehende Dateien..."
mkdir -p backup-v7_3_86

if [ -f "src/components/shared/PortalHeader.tsx" ]; then
    cp src/components/shared/PortalHeader.tsx backup-v7_3_86/
fi
if [ -f "src/components/shared/ProjectDetailPage.tsx" ]; then
    cp src/components/shared/ProjectDetailPage.tsx backup-v7_3_86/
fi
if [ -f "src/types/v7-types.ts" ]; then
    cp src/types/v7-types.ts backup-v7_3_86/
fi

echo ""
echo "2. Kopiere neue Dateien..."

# PortalHeader
if [ -f "$DOWNLOAD_DIR/PortalHeader-v7_3_86.tsx" ]; then
    cp "$DOWNLOAD_DIR/PortalHeader-v7_3_86.tsx" src/components/shared/PortalHeader.tsx
    echo "   ✓ PortalHeader.tsx aktualisiert"
else
    echo "   ⚠ PortalHeader-v7_3_86.tsx nicht gefunden"
fi

# ProjectDetailPage
if [ -f "$DOWNLOAD_DIR/ProjectDetailPage-v7_3_86.tsx" ]; then
    cp "$DOWNLOAD_DIR/ProjectDetailPage-v7_3_86.tsx" src/components/shared/ProjectDetailPage.tsx
    echo "   ✓ ProjectDetailPage.tsx aktualisiert"
else
    echo "   ⚠ ProjectDetailPage-v7_3_86.tsx nicht gefunden"
fi

# v7-types
if [ -f "$DOWNLOAD_DIR/v7-types-v7_3_86.ts" ]; then
    cp "$DOWNLOAD_DIR/v7-types-v7_3_86.ts" src/types/v7-types.ts
    echo "   ✓ v7-types.ts aktualisiert"
else
    echo "   ⚠ v7-types-v7_3_86.ts nicht gefunden"
fi

echo ""
echo "3. TypeScript-Kompilierung testen..."
npm run build 2>&1 | head -50

if [ $? -eq 0 ]; then
    echo ""
    echo "================================================"
    echo "✓ Build erfolgreich!"
    echo "================================================"
    
    echo ""
    echo "4. Git-Commit..."
    git add -A
    git status
    
    echo ""
    read -p "Commit mit 'v7.3.86: TypeScript Typ-Korrekturen'? (j/n) " CONFIRM
    if [ "$CONFIRM" = "j" ]; then
        git commit -m "v7.3.86: TypeScript Typ-Korrekturen

- PortalHeader: userRole akzeptiert V7UserRole | V7EmployeePortalRole | string
- PortalHeader: hideNavigation Property hinzugefuegt
- ProjectDetailPage: Korrekte Typ-Mappings fuer Employee/WorkPackage
- v7-types: employee_number zu V7Employee hinzugefuegt (optional)"
        
        echo ""
        read -p "Auf v7-dev pushen? (j/n) " PUSH
        if [ "$PUSH" = "j" ]; then
            git push origin v7-dev
            echo "✓ Gepusht zu v7-dev"
        fi
    fi
else
    echo ""
    echo "================================================"
    echo "✗ Build fehlgeschlagen - bitte Fehler pruefen"
    echo "================================================"
    echo ""
    echo "Backup wiederherstellen mit:"
    echo "  cp backup-v7_3_86/* src/components/shared/"
    echo "  cp backup-v7_3_86/v7-types.ts src/types/"
fi

echo ""
echo "Fertig!"
