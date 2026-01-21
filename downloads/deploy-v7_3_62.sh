#!/bin/bash
# ============================================================================
# PZE V7 Deploy Script - Version 7.3.62
# ============================================================================
# Datum: 21. Januar 2026
#
# Diese Version aktualisiert:
# - ProjectDetailPage (Team-Tab Button entfernt, Hinweis MA-Zuordnung ueber APs)
#
# Voraussetzungen:
# - Die Dateien wurden nach ~/Documents/dev/pze/downloads heruntergeladen
# - Terminal im Projektverzeichnis: cd ~/Documents/Dev/PZE
# ============================================================================

echo "=============================================="
echo "PZE V7 Deploy - Version 7.3.62"
echo "=============================================="
echo ""

# Pruefe ob wir im richtigen Verzeichnis sind
if [ ! -f "package.json" ]; then
    echo "FEHLER: Bitte wechsle zuerst ins Projektverzeichnis:"
    echo "  cd ~/Documents/Dev/PZE"
    exit 1
fi

# Quellverzeichnis
DOWNLOADS=~/Documents/dev/pze/downloads

# Pruefe ob Quelldateien existieren
if [ ! -f "$DOWNLOADS/ProjectDetailPage-v7_3_62.tsx" ]; then
    echo "FEHLER: ProjectDetailPage-v7_3_62.tsx nicht gefunden in:"
    echo "  $DOWNLOADS"
    echo ""
    echo "Bitte lade die Datei zuerst herunter."
    exit 1
fi

echo "Starte Deployment..."
echo ""

# 1. Shared Component: ProjectDetailPage
echo "[1/1] Kopiere ProjectDetailPage..."
cp "$DOWNLOADS/ProjectDetailPage-v7_3_62.tsx" src/components/shared/ProjectDetailPage.tsx
if [ $? -eq 0 ]; then
    echo "      OK: ProjectDetailPage.tsx"
else
    echo "      FEHLER beim Kopieren!"
    exit 1
fi

echo ""
echo "=============================================="
echo "Deployment abgeschlossen!"
echo "=============================================="
echo ""
echo "Naechste Schritte:"
echo ""
echo "1. Server starten (falls nicht laeuft):"
echo "   npm run dev"
echo ""
echo "2. Im Browser testen:"
echo "   http://localhost:3000"
echo ""
echo "3. Bei Erfolg Git-Commit:"
echo "   git add ."
echo "   git commit -m \"v7.3.62: Team-Tab Button entfernt, MA-Zuordnung ueber APs\""
echo ""
echo "=============================================="
