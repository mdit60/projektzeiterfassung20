#!/bin/bash
# ============================================================================
# PZE Deployment Script v7.3.88-10
# Datum: 06. Februar 2026
# 
# CRITICAL FIX: Null-Safety fuer Array-Props in TimesheetForm
# Behebt Vercel Production "filter is undefined" Fehler
# ============================================================================

set -e  # Bei Fehler abbrechen

echo "========================================"
echo "PZE Deployment v7.3.88-10"
echo "========================================"
echo ""

# Verzeichnisse
DOWNLOADS_DIR="$HOME/Documents/Dev/PZE/downloads"
PROJECT_DIR="$HOME/Documents/Dev/PZE"

# Pruefen ob Downloads-Verzeichnis existiert
if [ ! -d "$DOWNLOADS_DIR" ]; then
    echo "FEHLER: Downloads-Verzeichnis nicht gefunden: $DOWNLOADS_DIR"
    exit 1
fi

# Pruefen ob Projektverzeichnis existiert
if [ ! -d "$PROJECT_DIR" ]; then
    echo "FEHLER: Projekt-Verzeichnis nicht gefunden: $PROJECT_DIR"
    exit 1
fi

cd "$PROJECT_DIR"

echo "1. Kopiere fixierte Dateien..."
echo "----------------------------------------"

# TimesheetForm
if [ -f "$DOWNLOADS_DIR/TimesheetForm-v7_3_88-10.tsx" ]; then
    cp "$DOWNLOADS_DIR/TimesheetForm-v7_3_88-10.tsx" src/components/shared/TimesheetForm.tsx
    echo "   ✓ TimesheetForm.tsx aktualisiert"
else
    echo "   ⚠ TimesheetForm-v7_3_88-10.tsx nicht gefunden in downloads/"
fi

echo ""
echo "2. Build testen..."
echo "----------------------------------------"
npm run build

if [ $? -eq 0 ]; then
    echo ""
    echo "   ✓ Build erfolgreich!"
else
    echo ""
    echo "   ✗ Build fehlgeschlagen!"
    exit 1
fi

echo ""
echo "3. Git Commit und Push..."
echo "----------------------------------------"
git add -A
git status

echo ""
read -p "Commit und Push durchfuehren? (j/n): " confirm
if [ "$confirm" = "j" ]; then
    git commit -m "FIX v7.3.88-10: Null-Safety fuer Props in TimesheetForm (Vercel Crash)"
    git push
    echo ""
    echo "   ✓ Gepusht! Vercel Deployment startet automatisch."
else
    echo "   Abgebrochen."
fi

echo ""
echo "========================================"
echo "Fertig!"
echo ""
echo "Naechste Schritte:"
echo "1. Warte 2-3 Min bis Vercel fertig ist"
echo "2. Teste: /v7/berater/foerderung/firma/[id]?tab=projekte"
echo "3. Pruefe Browser-Konsole auf Fehler"
echo "========================================"
