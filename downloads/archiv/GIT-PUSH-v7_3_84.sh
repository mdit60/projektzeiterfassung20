#!/bin/bash
# ============================================================================
# PZE v7.3.84 - Git Sicherung und Vercel Push
# ============================================================================
# Datum: 24. Januar 2026
#
# Aenderungen in v7.3.84:
# - Zeiterfassungs-Tab in Projekt-Detailseite (Link statt Platzhalter)
# - Dashboard-Bug gefixt (Foerderprojekte-Zaehlung)
# - Header-Farbe Berater-Portal: Ozeanblau (#0369a1)
# - Firmenliste statt Kacheln (skalierbar fuer 50+ Firmen)
# - Alphabetische Sortierung der Firmen
#
# Datenbank-Fixes (manuell ausgefuehrt):
# - AP-Nummerierung korrigiert (100->1, 201->2.1, etc.)
# - Deaktivierte Geister-Mitarbeiter geloescht
# ============================================================================

# Farben
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo "=========================================="
echo "  PZE v7.3.84 - Git Sicherung"
echo "=========================================="
echo ""

# Ins Projektverzeichnis wechseln
cd ~/Documents/Dev/PZE || { echo -e "${RED}Projektverzeichnis nicht gefunden!${NC}"; exit 1; }

# Aktuellen Branch pruefen
CURRENT_BRANCH=$(git branch --show-current)
echo "Aktueller Branch: $CURRENT_BRANCH"

# Auf v7-dev wechseln falls nicht schon dort
if [ "$CURRENT_BRANCH" != "v7-dev" ]; then
    echo "Wechsle zu v7-dev..."
    git checkout v7-dev || { echo -e "${RED}Branch-Wechsel fehlgeschlagen!${NC}"; exit 1; }
fi

# Status anzeigen
echo ""
echo "Geaenderte Dateien:"
git status --short

# Alle Aenderungen stagen
echo ""
echo "Stage alle Aenderungen..."
git add -A

# Commit
echo ""
echo "Erstelle Commit..."
git commit -m "v7.3.84: Zeiterfassung-Link, Dashboard-Fix, Firmenliste

- ProjectDetailPage: Zeiterfassungs-Tab mit Link statt Platzhalter
- Berater-Dashboard: Foerderprojekte-Zaehlung gefixt (Enum-Werte korrigiert)
- Berater-Dashboard: Header-Farbe auf Ozeanblau (#0369a1)
- Foerderung-Seite: Kacheln durch Tabellen-Liste ersetzt
- Firmenliste alphabetisch sortiert (skalierbar fuer 50+ Firmen)
- DB-Fixes: AP-Nummerierung, Geister-Mitarbeiter bereinigt"

# Push zu GitHub
echo ""
echo "Push zu GitHub (v7-dev)..."
git push origin v7-dev

# Ergebnis
if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}=========================================="
    echo "  Git Push erfolgreich!"
    echo "==========================================${NC}"
    echo ""
    echo "Vercel wird automatisch deployen."
    echo "Dashboard: https://vercel.com/martin-ds-projects-5cb70f89/projektzeiterfassung20"
    echo ""
    echo "Live-URL nach Deploy:"
    echo "https://projektzeiterfassung20-git-v7-dev-martin-ds-projects-5cb70f89.vercel.app"
    echo ""
else
    echo ""
    echo -e "${RED}=========================================="
    echo "  Git Push fehlgeschlagen!"
    echo "==========================================${NC}"
    echo ""
    echo "Bitte manuell pruefen:"
    echo "  cd ~/Documents/Dev/PZE"
    echo "  git status"
    echo "  git push origin v7-dev"
    echo ""
fi
