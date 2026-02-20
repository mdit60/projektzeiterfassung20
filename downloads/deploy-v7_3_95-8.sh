#!/bin/bash
# ============================================================
# DEPLOY v7.3.95-8 - Passwort-Reset wiederhergestellt
# 20. Februar 2026
# ============================================================

set -e

PROJECT_DIR="$HOME/Documents/Dev/PZE"
DOWNLOADS="$PROJECT_DIR/downloads"
cd "$PROJECT_DIR"

echo "=== DEPLOY v7.3.95-8: PW-Reset wiederhergestellt ==="
echo ""

# Branch pruefen
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "v7-dev" ]; then
  git checkout v7-dev
fi

# Datei kopieren
echo "=== Datei kopieren ==="
if [ -f "$DOWNLOADS/EmployeeManagement-v7_3_95-1.tsx" ]; then
  cp "$DOWNLOADS/EmployeeManagement-v7_3_95-1.tsx" src/components/shared/EmployeeManagement.tsx
  echo "  EmployeeManagement.tsx aktualisiert"
else
  echo "FEHLER: EmployeeManagement-v7_3_95-1.tsx nicht gefunden!"
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
git commit -m "v7.3.95-8: PW-Reset im EmployeeManagement wiederhergestellt
- Amber Schluessel-Icon bei MA mit Login (nur Berater-Portal)
- PW-Reset Modal mit API-Route /api/v7/reset-password
- War bei v7.3.95 Anlage-6.1-Bereinigung verloren gegangen"

git push origin v7-dev
echo ""

echo "=== DEPLOY KOMPLETT ==="
echo "Fuer prod: git checkout main && git merge v7-dev && git push origin main && git checkout v7-dev"
