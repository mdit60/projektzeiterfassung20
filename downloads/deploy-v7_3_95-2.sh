#!/bin/bash
# ============================================================
# PZE Deploy v7.3.95-2
# ============================================================
# FIX: Passwort-aendern Funktion im PortalHeader wiederherstellen
# (War in v7.3.91-1, ging bei v7.3.95 Print-Fix verloren)
# ============================================================

set -e

PROJECT_DIR="$HOME/Documents/Dev/PZE"
DOWNLOADS_DIR="$HOME/Documents/Dev/PZE/downloads"

echo "=== PZE Deploy v7.3.95-2 ==="
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

# 1. Datei kopieren
echo "1. PortalHeader-v7_3_95-2.tsx -> src/components/shared/PortalHeader.tsx"
cp "$DOWNLOADS_DIR/PortalHeader-v7_3_95-2.tsx" "$PROJECT_DIR/src/components/shared/PortalHeader.tsx"

echo ""
echo "=== Datei kopiert ==="
echo ""

# 2. Build testen
echo "2. Build testen..."
pnpm build

echo ""
echo "=== Build erfolgreich ==="
echo ""

# 3. Git commit & push v7-dev
echo "3. Git commit & push v7-dev..."
git add -A
git status
git commit -m "v7.3.95-2: Passwort-aendern im User-Menue wiederhergestellt (war bei Print-Fix verloren gegangen)"
git push origin v7-dev

echo ""
echo "=== v7-dev deployed ==="
echo ""

# 4. Merge auf main und push (Production)
echo "4. Merge auf main fuer Production..."
git checkout main
git merge v7-dev -m "Merge v7-dev: v7.3.95-2 Passwort-aendern Fix"
git push origin main

echo ""
echo "=== main/Production deployed ==="
echo ""

# 5. Zurueck auf v7-dev
git checkout v7-dev

echo ""
echo "========================================="
echo "  Deploy v7.3.95-2 KOMPLETT"
echo "========================================="
echo ""
echo "FIX: User-Dropdown zeigt jetzt wieder:"
echo "  - Schluessel-Icon: Passwort aendern"
echo "  - Logout-Icon: Abmelden"
echo ""
echo "Deployed auf:"
echo "  - v7-dev (Vercel Preview)"
echo "  - main   (pze.itenion.com Production)"
echo ""
echo "Aktueller Branch: $(git branch --show-current)"
