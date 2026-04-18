#!/bin/bash
# ============================================================
# PZE Deploy v7.3.95-3
# ============================================================
# 1. PortalHeader-v7_3_95-3: Passwort-aendern wiederhergestellt
# 2. PortalNav-v7_3_95-2: "Import" aus Berater-Navigation entfernt
# ============================================================

set -e

PROJECT_DIR="$HOME/Documents/Dev/PZE"
DOWNLOADS_DIR="$HOME/Documents/Dev/PZE/downloads"

echo "=== PZE Deploy v7.3.95-3 ==="
echo ""

# 0. Branch pruefen
cd "$PROJECT_DIR"
CURRENT_BRANCH=$(git branch --show-current)
echo "Aktueller Branch: $CURRENT_BRANCH"
if [ "$CURRENT_BRANCH" != "v7-dev" ]; then
  echo "FEHLER: Nicht auf v7-dev! Wechsle..."
  git checkout v7-dev
fi
echo ""

# 1. Dateien kopieren
echo "1. PortalHeader-v7_3_95-3.tsx -> src/components/shared/PortalHeader.tsx"
cp "$DOWNLOADS_DIR/PortalHeader-v7_3_95-3.tsx" "$PROJECT_DIR/src/components/shared/PortalHeader.tsx"

echo "2. PortalNav-v7_3_95-2.tsx -> src/components/shared/PortalNav.tsx"
cp "$DOWNLOADS_DIR/PortalNav-v7_3_95-2.tsx" "$PROJECT_DIR/src/components/shared/PortalNav.tsx"

echo ""
echo "=== Dateien kopiert ==="
echo ""

# 2. Build testen
echo "3. Build testen..."
pnpm build

echo ""
echo "=== Build erfolgreich ==="
echo ""

# 3. Git commit & push v7-dev
echo "4. Git commit & push v7-dev..."
git add -A
git status
git commit -m "v7.3.95-3: Passwort-aendern wiederhergestellt + Import aus Berater-Nav entfernt"
git push origin v7-dev

echo ""
echo "=== v7-dev deployed ==="
echo ""

# 4. Merge auf main und push (Production)
echo "5. Merge auf main fuer Production..."
git checkout main
git merge v7-dev -m "Merge v7-dev: v7.3.95-3 PW-Fix + Nav-Fix"
git push origin main

echo ""
echo "=== main/Production deployed ==="
echo ""

# 5. Zurueck auf v7-dev
git checkout v7-dev

echo ""
echo "========================================="
echo "  Deploy v7.3.95-3 KOMPLETT"
echo "========================================="
echo ""
echo "Fixes:"
echo "  1. PortalHeader-v7_3_95-3: Passwort aendern im User-Dropdown"
echo "  2. PortalNav-v7_3_95-2: Import aus Berater-Nav entfernt"
echo ""
echo "Deployed auf: v7-dev + main (pze.itenion.com)"
echo "Aktueller Branch: $(git branch --show-current)"
