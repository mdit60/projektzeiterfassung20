#!/bin/bash
# ============================================================================
# PZE V7.3.43 - Deployment Script (KOMPLETT)
# ============================================================================
# Datum: 21. Januar 2026
# 
# FIXES:
# 1. Dashboard: Doppelte Projektliste entfernt
# 2. Firmendaten: Neue Seite mit Bearbeiten
# 3. Projektliste: "Format" -> "Foerderprogramm"
# 4. Projekt-Detail: PM/Stunden korrigiert, Bearbeiten funktioniert
# 5. Mitarbeiter: Avatar-Buchstaben entfernt, Zurueck-Link korrigiert
# 6. Neues Projekt: Seite hinzugefuegt
# ============================================================================

echo "=========================================="
echo "PZE v7.3.43 Deployment (KOMPLETT)"
echo "=========================================="

TARGET_DIR="$(pwd)"

if [ ! -d "$TARGET_DIR/src/app" ]; then
    echo "FEHLER: Bitte Script aus dem PZE-Projektverzeichnis ausfuehren!"
    exit 1
fi

DOWNLOADS_DIR="$HOME/Documents/dev/pze/downloads"
echo "Arbeitsverzeichnis: $TARGET_DIR"
echo ""

# 1. Dashboard
echo "1. Dashboard..."
mkdir -p "$TARGET_DIR/src/app/v7/firma/dashboard"
if [ -f "$DOWNLOADS_DIR/v7-firma-dashboard-v7_3_43.tsx" ]; then
    cp "$DOWNLOADS_DIR/v7-firma-dashboard-v7_3_43.tsx" "$TARGET_DIR/src/app/v7/firma/dashboard/page.tsx"
    echo "   OK"
else
    echo "   FEHLT"
fi

# 2. Firmendaten
echo "2. Firmendaten..."
mkdir -p "$TARGET_DIR/src/app/v7/firma/firmendaten"
if [ -f "$DOWNLOADS_DIR/page-firma-firmendaten-v7_3_43.tsx" ]; then
    cp "$DOWNLOADS_DIR/page-firma-firmendaten-v7_3_43.tsx" "$TARGET_DIR/src/app/v7/firma/firmendaten/page.tsx"
    echo "   OK"
else
    echo "   FEHLT"
fi

# 3. Projekte Liste
echo "3. Projekte-Liste..."
mkdir -p "$TARGET_DIR/src/app/v7/firma/projekte"
if [ -f "$DOWNLOADS_DIR/page-firma-projekte-v7_3_43.tsx" ]; then
    cp "$DOWNLOADS_DIR/page-firma-projekte-v7_3_43.tsx" "$TARGET_DIR/src/app/v7/firma/projekte/page.tsx"
    echo "   OK"
else
    echo "   FEHLT"
fi

# 4. Projekt Detail
echo "4. Projekt-Detail..."
mkdir -p "$TARGET_DIR/src/app/v7/firma/projekte/[id]"
if [ -f "$DOWNLOADS_DIR/page-firma-projekt-detail-v7_3_43.tsx" ]; then
    cp "$DOWNLOADS_DIR/page-firma-projekt-detail-v7_3_43.tsx" "$TARGET_DIR/src/app/v7/firma/projekte/[id]/page.tsx"
    echo "   OK"
else
    echo "   FEHLT"
fi

# 5. Neues Projekt
echo "5. Neues Projekt..."
mkdir -p "$TARGET_DIR/src/app/v7/firma/projekte/neu"
if [ -f "$DOWNLOADS_DIR/page-firma-projekt-neu-v7_3_43.tsx" ]; then
    cp "$DOWNLOADS_DIR/page-firma-projekt-neu-v7_3_43.tsx" "$TARGET_DIR/src/app/v7/firma/projekte/neu/page.tsx"
    echo "   OK"
else
    echo "   FEHLT"
fi

# 6. Mitarbeiter
echo "6. Mitarbeiter..."
mkdir -p "$TARGET_DIR/src/app/v7/firma/mitarbeiter"
if [ -f "$DOWNLOADS_DIR/page-firma-mitarbeiter-v7_3_43.tsx" ]; then
    cp "$DOWNLOADS_DIR/page-firma-mitarbeiter-v7_3_43.tsx" "$TARGET_DIR/src/app/v7/firma/mitarbeiter/page.tsx"
    echo "   OK"
else
    echo "   FEHLT"
fi

echo ""
echo "=========================================="
echo "Deployment abgeschlossen!"
echo "=========================================="
echo ""
echo "Installierte Seiten:"
echo "  /v7/firma/dashboard"
echo "  /v7/firma/firmendaten"
echo "  /v7/firma/projekte"
echo "  /v7/firma/projekte/[id]"
echo "  /v7/firma/projekte/neu     <-- NEU"
echo "  /v7/firma/mitarbeiter"
echo ""
echo "npm run dev && testen!"
echo ""
echo "HINWEIS zur PM-Differenz (64 vs 62):"
echo "Das ist ein Datenproblem - in work_package_assignments"
echo "sind nicht alle PM den Mitarbeitern zugeordnet."
echo ""
