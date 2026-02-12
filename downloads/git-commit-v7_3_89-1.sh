#!/bin/bash
# ============================================================================
# PZE v7.3.89-1 - Git Commit und Deploy
# ============================================================================
# Datum: 12. Februar 2026
#
# Aenderungen:
# - TimesheetForm v7.3.89: T/NT Spalte (lokal sync mit Vercel)
# - EmployeeManagement v7.3.89-1: Login-Verknuepfung Fix
# ============================================================================

set -e
cd ~/Documents/Dev/PZE

echo "=== PZE v7.3.89-1 - Git Commit & Deploy ==="
echo ""

# Branch pruefen
BRANCH=$(git branch --show-current)
echo "Aktueller Branch: $BRANCH"

if [ "$BRANCH" != "v7-dev" ]; then
  echo "WARNUNG: Nicht auf v7-dev! Wechsle..."
  git checkout v7-dev
fi

echo ""
echo "Status:"
git status --short

echo ""
echo "Commit..."
git add -A
git commit -m "v7.3.89-1: TimesheetForm T/NT sync + EmployeeManagement Login-Verknuepfung Fix

- TimesheetForm: Lokaler Code auf Vercel-Stand synchronisiert (T/NT Spalte)
- EmployeeManagement: Login-Verknuepfung dreht nicht mehr im Kreis
  - Bei 'already registered' IMMER auf link-Modus
  - Funktioniert auch ohne v7_user_profiles (V6-Altdaten)
  - Erstellt Profil automatisch beim Verknuepfen"

echo ""
echo "Push auf v7-dev (Vercel auto-deploy)..."
git push origin v7-dev

echo ""
echo "=== Fertig! ==="
echo "Vercel deployed automatisch von v7-dev."
echo "Pruefe: https://projektzeiterfassung20-git-v7-dev-martin-ds-projects-5cb70f89.vercel.app"
echo ""
