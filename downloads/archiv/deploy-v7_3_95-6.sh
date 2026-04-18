#!/bin/bash
# ============================================================
# DEPLOY v7.3.95-6 - Arbeitsplan einfrieren
# 19. Februar 2026
# ============================================================
# WICHTIG: Zuerst SQL ausfuehren!
# sql-workplan-locked-v7_3_95-1.sql in Supabase SQL Editor
# ============================================================

set -e

PROJECT_DIR="$HOME/Documents/Dev/PZE"
DOWNLOADS="$PROJECT_DIR/downloads"
cd "$PROJECT_DIR"

echo "=== DEPLOY v7.3.95-6: Arbeitsplan einfrieren ==="
echo ""

# Branch pruefen
CURRENT_BRANCH=$(git branch --show-current)
echo "Aktueller Branch: $CURRENT_BRANCH"
if [ "$CURRENT_BRANCH" != "v7-dev" ]; then
  echo "Wechsle auf v7-dev..."
  git checkout v7-dev
fi
echo ""

# Dateien kopieren
echo "=== Dateien kopieren ==="

if [ -f "$DOWNLOADS/WorkPackageTable-v7_3_95-1.tsx" ]; then
  cp "$DOWNLOADS/WorkPackageTable-v7_3_95-1.tsx" src/components/shared/WorkPackageTable.tsx
  echo "  WorkPackageTable.tsx aktualisiert"
else
  echo "FEHLER: WorkPackageTable-v7_3_95-1.tsx nicht in downloads/ gefunden!"
  exit 1
fi

# ProjectTeamManager auch kopieren falls noch nicht geschehen
if [ -f "$DOWNLOADS/ProjectTeamManager-v7_3_95-1.tsx" ]; then
  cp "$DOWNLOADS/ProjectTeamManager-v7_3_95-1.tsx" src/components/shared/ProjectTeamManager.tsx
  echo "  ProjectTeamManager.tsx aktualisiert"
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
git commit -m "v7.3.95-6: Arbeitsplan einfrieren/entsperren
- Neues DB-Feld: v7_projects.workplan_locked
- Button Einfrieren: Sperrt AP-Struktur und PM-Werte
- Badge Bewilligt (gesperrt) wenn aktiv
- Gesperrt: Alle Zellen readonly, kein AP anlegen/bearbeiten/loeschen
- Entsperren: NUR im Berater-Portal (bei Aenderungsantrag)
- Team-Zuordnungen + Zeiterfassung bleiben immer editierbar
- Bestaetigungs-Dialoge mit klarer Erklaerung"

git push origin v7-dev
echo ""

echo "========================================="
echo "  DEPLOY v7.3.95-6 KOMPLETT"
echo "========================================="
echo "  Branch: v7-dev (pushed)"
echo "  Vercel Preview deployed automatisch"
echo ""
echo "  NAECHSTE SCHRITTE:"
echo "  1. SQL ausfuehren (falls noch nicht geschehen)"
echo "  2. Testen auf Preview"
echo "  3. Fuer prod: git checkout main && git merge v7-dev && git push origin main"
echo "========================================="
