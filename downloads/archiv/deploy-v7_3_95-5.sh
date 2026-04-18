#!/bin/bash
# ============================================================
# DEPLOY v7.3.95-5 - ProjectTeamManager Anlage 6.1
# 19. Februar 2026
# ============================================================

set -e

PROJECT_DIR="$HOME/Documents/Dev/PZE"
DOWNLOADS="$PROJECT_DIR/downloads"
cd "$PROJECT_DIR"

echo "=== DEPLOY v7.3.95-5: ProjectTeamManager Anlage 6.1 ==="
echo ""

# Branch pruefen
CURRENT_BRANCH=$(git branch --show-current)
echo "Aktueller Branch: $CURRENT_BRANCH"
if [ "$CURRENT_BRANCH" != "v7-dev" ]; then
  echo "FEHLER: Nicht auf v7-dev! Wechsle..."
  git checkout v7-dev
fi
echo ""

# Datei kopieren
echo "=== Dateien kopieren ==="
if [ -f "$DOWNLOADS/ProjectTeamManager-v7_3_95-1.tsx" ]; then
  cp "$DOWNLOADS/ProjectTeamManager-v7_3_95-1.tsx" src/components/shared/ProjectTeamManager.tsx
  echo "  ProjectTeamManager.tsx aktualisiert"
else
  echo "FEHLER: ProjectTeamManager-v7_3_95-1.tsx nicht in downloads/ gefunden!"
  exit 1
fi
echo ""

# Build testen
echo "=== Build testen ==="
rm -rf .next
pnpm build
echo ""

# Git commit + push
echo "=== Git commit + push ==="
git add -A
git commit -m "v7.3.95-5: ProjectTeamManager Anlage 6.1 Felder
- Bearbeiten-Dialog: Jahresbruttolohn, pWAZ, bWAZ gemaess Anlage 6.1
- pWAZ = Wochenarbeitszeit MA lt. Arbeitsvertrag (Teilzeit moeglich)
- bWAZ = betriebsuebliche Wochenarbeitszeit Vollzeit (i.d.R. 40h)
- Teilzeitfaktor = pWAZ / bWAZ (3 Nachkommastellen)
- Stundensatz automatisch: Jahresbrutto / (pWAZ x 52) = Spalte 3
- Stundensatz manuell ueberschreibbar (gelbe Hervorhebung)
- Neu berechnen Button bei manueller Eingabe
- Anlage 6.1 Daten im Employee-Stamm mitgespeichert"

git push origin v7-dev
echo ""

echo "========================================="
echo "  DEPLOY v7.3.95-5 KOMPLETT"
echo "========================================="
echo "  Branch: v7-dev (pushed)"
echo "  Vercel Preview deployed automatisch"
echo ""
echo "  Zum Testen: Preview-URL oeffnen"
echo "  Fuer main: git checkout main && git merge v7-dev && git push origin main"
echo "========================================="
