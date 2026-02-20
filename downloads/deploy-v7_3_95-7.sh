#!/bin/bash
# ============================================================
# DEPLOY v7.3.95-7 - Arbeitsplan-Sperre komplett
# 19. Februar 2026
# ============================================================

set -e

PROJECT_DIR="$HOME/Documents/Dev/PZE"
DOWNLOADS="$PROJECT_DIR/downloads"
cd "$PROJECT_DIR"

echo "=== DEPLOY v7.3.95-7: Arbeitsplan-Sperre komplett ==="
echo ""

# Branch pruefen
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "v7-dev" ]; then
  git checkout v7-dev
fi

# Dateien kopieren
echo "=== Dateien kopieren ==="

if [ -f "$DOWNLOADS/ProjectDetailPage-v7_3_95-1.tsx" ]; then
  cp "$DOWNLOADS/ProjectDetailPage-v7_3_95-1.tsx" src/components/shared/ProjectDetailPage.tsx
  echo "  ProjectDetailPage.tsx aktualisiert"
else
  echo "FEHLER: ProjectDetailPage-v7_3_95-1.tsx nicht gefunden!"
  exit 1
fi

if [ -f "$DOWNLOADS/WorkPackageTable-v7_3_95-1.tsx" ]; then
  cp "$DOWNLOADS/WorkPackageTable-v7_3_95-1.tsx" src/components/shared/WorkPackageTable.tsx
  echo "  WorkPackageTable.tsx aktualisiert"
else
  echo "FEHLER: WorkPackageTable-v7_3_95-1.tsx nicht gefunden!"
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
git commit -m "v7.3.95-7: Arbeitsplan-Sperre komplett
- ProjectDetailPage: Vorlage/Import/Neues AP bei Lock ausgeblendet
- WorkPackageTable: Text Systemadministrator statt Berater
- onAddAP/onEditAP/onDeleteAP null bei gesperrtem Arbeitsplan"

git push origin v7-dev
echo ""

echo "=== DEPLOY KOMPLETT ==="
echo "Preview deployed automatisch."
echo "Fuer prod: git checkout main && git merge v7-dev && git push origin main && git checkout v7-dev"
