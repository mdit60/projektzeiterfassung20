#!/bin/bash
# ============================================================================
# PZE Deploy - Firmen-Projekte-Seite Fix v7.3.89
# ============================================================================
# Datum: 09. Februar 2026
# Aenderung: Alte 1200-Zeilen Seite (v7.3.5) durch neue schlanke Version
#            mit shared ProjectList-Komponente ersetzt
# ============================================================================

set -e

cd ~/Documents/Dev/PZE

echo "============================================"
echo "  PZE Deploy - Firmen-Projekte Fix v7.3.89"
echo "============================================"

# 1. Lock-Datei loeschen
rm -f .git/index.lock

# 2. Branch pruefen
BRANCH=$(git branch --show-current)
echo ""
echo "[1/5] Branch: $BRANCH"
if [ "$BRANCH" != "v7-dev" ]; then
  echo "FEHLER: Falscher Branch! Erwartet: v7-dev"
  exit 1
fi
echo "  -> OK"

# 3. Backup der alten Datei
echo ""
echo "[2/5] Backup der alten Projekte-Seite..."
if [ -f src/app/v7/firma/projekte/page.tsx ]; then
  cp src/app/v7/firma/projekte/page.tsx src/app/v7/firma/projekte/page.tsx.bak-v735
  echo "  -> Backup erstellt: page.tsx.bak-v735"
else
  echo "  -> Keine bestehende Datei gefunden (wird neu erstellt)"
fi

# 4. Neue Datei kopieren
echo ""
echo "[3/5] Neue Projekte-Seite installieren..."
cp ~/Documents/Dev/PZE/downloads/page-firma-projekte-v7_3_89.tsx \
   src/app/v7/firma/projekte/page.tsx
echo "  -> OK: page.tsx aktualisiert (216 Zeilen statt 1209)"

# 5. Git commit + push
echo ""
echo "[4/5] Git commit..."
git add src/app/v7/firma/projekte/page.tsx
git commit -m "v7.3.89: Firmen-Projekte-Seite neu mit shared ProjectList

- ERSETZT alte v7.3.5 Seite (1209 Zeilen) durch schlanke Version (216 Zeilen)
- Nutzt shared ProjectList-Komponente (laedt Projekte selbst)
- FIX: v7_project_budget Tabelle existiert nicht -> Ladefehler behoben
- Auth + Portal-Rolle korrekt ermittelt
- Null-Safety durchgaengig"

echo ""
echo "[5/5] Push zu v7-dev..."
git push origin v7-dev

echo ""
echo "============================================"
echo "  FERTIG! Vercel deployed automatisch."
echo "============================================"
echo ""
echo "Test: Firmen-Portal -> Projekte -> sollte Liste zeigen"
echo ""
