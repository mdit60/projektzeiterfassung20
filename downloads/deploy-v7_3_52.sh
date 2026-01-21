#!/bin/bash
# ============================================================================
# PZE V7 DEPLOYMENT SCRIPT
# ============================================================================
# Version: v7.3.52
# Datum: 21. Januar 2026
#
# Neue Shared Components:
# - WorkPackageList.tsx
# - WorkPackageAssignmentModal.tsx
# - WorkPackageEditModal.tsx
# ============================================================================

echo "=========================================="
echo "PZE V7.3.52 - Shared WorkPackage Components"
echo "=========================================="
echo ""

# Basis-Verzeichnisse
DOWNLOADS_DIR="$HOME/Documents/dev/pze/downloads"
PROJECT_DIR="$HOME/Documents/dev/pze/pze-v7"

# Pruefen ob Verzeichnisse existieren
if [ ! -d "$DOWNLOADS_DIR" ]; then
    echo "FEHLER: Download-Verzeichnis nicht gefunden: $DOWNLOADS_DIR"
    exit 1
fi

if [ ! -d "$PROJECT_DIR" ]; then
    echo "FEHLER: Projekt-Verzeichnis nicht gefunden: $PROJECT_DIR"
    exit 1
fi

# Zielverzeichnis fuer Shared Components
SHARED_DIR="$PROJECT_DIR/src/components/shared"

# Shared Components Verzeichnis erstellen falls nicht vorhanden
if [ ! -d "$SHARED_DIR" ]; then
    echo "Erstelle Shared Components Verzeichnis..."
    mkdir -p "$SHARED_DIR"
fi

echo "1. Kopiere Shared Components..."
echo ""

# WorkPackageList
if [ -f "$DOWNLOADS_DIR/WorkPackageList-v7_3_52.tsx" ]; then
    cp "$DOWNLOADS_DIR/WorkPackageList-v7_3_52.tsx" "$SHARED_DIR/WorkPackageList.tsx"
    echo "   ✓ WorkPackageList.tsx"
else
    echo "   ✗ WorkPackageList-v7_3_52.tsx nicht gefunden!"
fi

# WorkPackageAssignmentModal
if [ -f "$DOWNLOADS_DIR/WorkPackageAssignmentModal-v7_3_52.tsx" ]; then
    cp "$DOWNLOADS_DIR/WorkPackageAssignmentModal-v7_3_52.tsx" "$SHARED_DIR/WorkPackageAssignmentModal.tsx"
    echo "   ✓ WorkPackageAssignmentModal.tsx"
else
    echo "   ✗ WorkPackageAssignmentModal-v7_3_52.tsx nicht gefunden!"
fi

# WorkPackageEditModal
if [ -f "$DOWNLOADS_DIR/WorkPackageEditModal-v7_3_52.tsx" ]; then
    cp "$DOWNLOADS_DIR/WorkPackageEditModal-v7_3_52.tsx" "$SHARED_DIR/WorkPackageEditModal.tsx"
    echo "   ✓ WorkPackageEditModal.tsx"
else
    echo "   ✗ WorkPackageEditModal-v7_3_52.tsx nicht gefunden!"
fi

echo ""
echo "2. Uebersicht Shared Components..."
echo ""
echo "   Verzeichnis: $SHARED_DIR"
echo ""
ls -la "$SHARED_DIR"

echo ""
echo "=========================================="
echo "Deployment v7.3.52 abgeschlossen!"
echo "=========================================="
echo ""
echo "NAECHSTE SCHRITTE:"
echo ""
echo "1. Pruefen ob alle Dateien korrekt kopiert wurden:"
echo "   ls -la $SHARED_DIR"
echo ""
echo "2. Shared Components in Seiten einbinden:"
echo ""
echo "   // Import in page.tsx:"
echo "   import WorkPackageList from '@/components/shared/WorkPackageList';"
echo "   import WorkPackageAssignmentModal from '@/components/shared/WorkPackageAssignmentModal';"
echo "   import WorkPackageEditModal from '@/components/shared/WorkPackageEditModal';"
echo ""
echo "3. Build testen:"
echo "   cd $PROJECT_DIR"
echo "   npm run build"
echo ""
echo "4. Entwicklungsserver starten:"
echo "   npm run dev"
echo ""
echo "5. Git Commit:"
echo "   git add ."
echo "   git commit -m 'v7.3.52: Shared WorkPackage Components'"
echo ""
