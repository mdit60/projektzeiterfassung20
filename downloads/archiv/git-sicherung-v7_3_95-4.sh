#!/bin/bash
# ============================================================
# GIT-SICHERUNG v7.3.95-4
# 18. Februar 2026 - Tagesabschluss
# ============================================================

set -e

PROJECT_DIR="$HOME/Documents/Dev/PZE"
cd "$PROJECT_DIR"

echo "=== GIT-SICHERUNG v7.3.95-4 ==="
echo ""

# Branch pruefen
CURRENT_BRANCH=$(git branch --show-current)
echo "Aktueller Branch: $CURRENT_BRANCH"
if [ "$CURRENT_BRANCH" != "v7-dev" ]; then
  echo "Wechsle auf v7-dev..."
  git checkout v7-dev
fi
echo ""

# Status anzeigen
echo "=== Git Status ==="
git status
echo ""

# Alles committen
echo "=== Commit auf v7-dev ==="
git add -A
git commit -m "v7.3.95-4 Tagesabschluss 18.02.2026:
- Mein Status: Ampel-Fix (alle Arbeitstage statt 80%), In Bearbeitung statt Teilweise
- Mein Status: Rollenbasierter Manual-Download (PDF je nach Rolle)
- PortalHeader v7.3.95-3: Passwort-Aendern wiederhergestellt
- PortalNav v7.3.95-2: Import aus Berater-Nav entfernt
- User Manuals: 3 PDFs in /public/manuals/ (MA, PL, Firmen-Admin)
  Fehlzeiten-Beschreibung (U/K/S direkt im Tagesfeld, auto 8h)
  Korrigierte Ampel-Beschreibungen
  Logo in Kopfzeile, gruener Balken nur S.1
- PH v4.32 aktualisiert" || echo "Nichts zu committen"

git push origin v7-dev
echo ""

# Merge auf main
echo "=== Merge auf main ==="
git checkout main
git merge v7-dev -m "Merge v7-dev: v7.3.95-4 Tagesabschluss 18.02.2026"
git push origin main
echo ""

# Zurueck auf v7-dev
git checkout v7-dev

echo ""
echo "========================================="
echo "  GIT-SICHERUNG KOMPLETT"
echo "========================================="
echo "  v7-dev: pushed"
echo "  main:   merged + pushed"
echo "  Branch: $(git branch --show-current)"
echo "========================================="
echo ""
echo "Feierabend! Gute Nacht."
