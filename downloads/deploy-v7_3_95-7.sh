#!/bin/bash
# ============================================================
# DEPLOY v7.3.95-7 - Arbeitsplan-Sperre: Buttons ausblenden
# 19. Februar 2026
# ============================================================

set -e

PROJECT_DIR="$HOME/Documents/Dev/PZE"
DOWNLOADS="$PROJECT_DIR/downloads"
cd "$PROJECT_DIR"

echo "=== DEPLOY v7.3.95-7: AP-Buttons bei Lock ausblenden ==="
echo ""

# Branch pruefen
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "v7-dev" ]; then
  git checkout v7-dev
fi

# Datei kopieren
echo "=== Datei kopieren ==="
if [ -f "$DOWNLOADS/ProjectDetailPage-v7_3_95-1.tsx" ]; then
  cp "$DOWNLOADS/ProjectDetailPage-v7_3_95-1.tsx" src/components/shared/ProjectDetailPage.tsx
  echo "  ProjectDetailPage.tsx aktualisiert"
else
  echo "FEHLER: ProjectDetailPage-v7_3_95-1.tsx nicht gefunden!"
  exit 1
fi
echo ""

# Build
echo "=== Build ==="
rm -rf .next
pnpm build
echo ""

# Git
echo "=== Git ==="
git add -A
git commit -m "v7.3.95-7: Arbeitsplan-Sperre Buttons ausblenden
- Vorlage, Import, Neues AP bei gesperrtem Arbeitsplan ausgeblendet
- Leerzustand-Buttons ebenfalls gesperrt
- onAddAP/onEditAP/onDeleteAP Callbacks null bei Lock
- Project Interface um workplan_locked erweitert"

git push origin v7-dev
echo ""

echo "=== DEPLOY KOMPLETT ==="
echo "Preview deployed automatisch."
echo "Fuer prod: git checkout main && git merge v7-dev && git push origin main && git checkout v7-dev"
