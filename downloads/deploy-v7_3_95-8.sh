#!/bin/bash
# ============================================================
# DEPLOY v7.3.95-8 - PW-Reset + Rollen-Anzeige Header
# 20. Februar 2026
# ============================================================

set -e

PROJECT_DIR="$HOME/Documents/Dev/PZE"
DOWNLOADS="$PROJECT_DIR/downloads"
cd "$PROJECT_DIR"

echo "=== DEPLOY v7.3.95-8: PW-Reset + Rollen-Anzeige ==="
echo ""

# Branch pruefen
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "v7-dev" ]; then
  git checkout v7-dev
fi

# Dateien kopieren
echo "=== Dateien kopieren ==="

if [ -f "$DOWNLOADS/EmployeeManagement-v7_3_95-1.tsx" ]; then
  cp "$DOWNLOADS/EmployeeManagement-v7_3_95-1.tsx" src/components/shared/EmployeeManagement.tsx
  echo "  EmployeeManagement.tsx aktualisiert"
else
  echo "FEHLER: EmployeeManagement-v7_3_95-1.tsx nicht gefunden!"
  exit 1
fi

if [ -f "$DOWNLOADS/PortalHeader-v7_3_95-4.tsx" ]; then
  cp "$DOWNLOADS/PortalHeader-v7_3_95-4.tsx" src/components/shared/PortalHeader.tsx
  echo "  PortalHeader.tsx aktualisiert"
else
  echo "FEHLER: PortalHeader-v7_3_95-4.tsx nicht gefunden!"
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
git commit -m "v7.3.95-8: PW-Reset wiederhergestellt + Rolle im Header
- EmployeeManagement: Amber Schluessel-Icon fuer PW-Reset (Berater-Portal)
- PortalHeader: Rolle als Untertitel unter Username
  Systemadministrator/Berater/Administrator/Projektleiter/Mitarbeiter
- Rolle auch im User-Dropdown angezeigt"

git push origin v7-dev
echo ""

echo "=== DEPLOY KOMPLETT ==="
echo "Fuer prod: git checkout main && git merge v7-dev && git push origin main && git checkout v7-dev"
