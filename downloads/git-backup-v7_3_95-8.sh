#!/bin/bash
# ============================================================
# GIT BACKUP v7.3.95-8 + Pflichtenheft v4.33
# 20. Februar 2026
# ============================================================

set -e

PROJECT_DIR="$HOME/Documents/Dev/PZE"
DOWNLOADS="$PROJECT_DIR/downloads"
cd "$PROJECT_DIR"

echo "=== GIT BACKUP v7.3.95-8 ==="
echo ""

# Branch pruefen
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "v7-dev" ]; then
  echo "Wechsle auf v7-dev..."
  git checkout v7-dev
fi

# Pflichtenheft kopieren
echo "=== Pflichtenheft aktualisieren ==="
cp "$DOWNLOADS/PFLICHTENHEFT-v4_33.md" docs/PFLICHTENHEFT-v4_33.md
echo "  docs/PFLICHTENHEFT-v4_33.md"
echo ""

# Git Backup
echo "=== Git Backup ==="
git add -A
git status
echo ""

git commit -m "v7.3.95-8: Pflichtenheft v4.33 - Arbeitsplan-Lock, Rollen-Header, PW-Reset, Live-Test

Zusammenfassung der Aenderungen seit v7.3.95-4:
- Arbeitsplan einfrieren/entsperren (workplan_locked)
- Rollen-Anzeige im Header (Berater (Systemadmin), etc.)
- PW-Reset Button wiederhergestellt (EmployeeManagement)
- display_name Fallback auf v7_employees in allen Firmen-Portal Seiten
- createUserProfile: role=client_user statt employee
- Live-Test mit Steuerkanzlei Robin Freund (4 MA)
- DB-Fixes: Email-Tippfehler, doppelte Profile, fehlende client_company_id
- Berichte-Seite: UTF-8 Fix"

git push origin v7-dev
echo ""

# Auch auf main
echo "=== Merge auf main ==="
git checkout main
git merge v7-dev
git push origin main
git checkout v7-dev
echo ""

echo "=== BACKUP KOMPLETT ==="
echo "v7-dev und main sind synchron."
echo "Pflichtenheft v4.33 committed."
