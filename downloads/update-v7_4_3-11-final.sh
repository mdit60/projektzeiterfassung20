#!/bin/bash
cd "$HOME/Documents/Dev/PZE" || exit 1

echo "=========================================="
echo "PZE v7.4.3-11 FINAL - Berater-Berichte + Doku"
echo "=========================================="

DOWNLOADS="./downloads"

# 1. Berater-Berichte-Seite
TARGET_B="./src/app/v7/berater/foerderung/firma/[id]/berichte"
FILE_B="berater-berichte-page-v7_4_3-11.tsx"

[ ! -f "$DOWNLOADS/$FILE_B" ] && echo "FEHLER: $FILE_B nicht gefunden!" && exit 1

echo "1/4 Berater-Berichte deployen..."
mkdir -p "$TARGET_B"
[ -f "$TARGET_B/page.tsx" ] && cp "$TARGET_B/page.tsx" "$TARGET_B/page.tsx.bak-$(date +%Y%m%d-%H%M%S)"
cp "$DOWNLOADS/$FILE_B" "$TARGET_B/page.tsx"
echo "     Berater-Berichte aktualisiert."

# 2. Pflichtenheft
echo "2/4 Pflichtenheft kopieren..."
cp "$DOWNLOADS/PFLICHTENHEFT-v4_38.md" "./Dokumente/PFLICHTENHEFT-v4_38.md" 2>/dev/null || echo "     Dokumente-Verzeichnis pruefen"

# 3. Git-Sicherung
echo "3/4 Git-Sicherung kopieren..."
cp "$DOWNLOADS/GIT-SICHERUNG-v7_4_3.md" "./Dokumente/GIT-SICHERUNG-v7_4_3.md" 2>/dev/null || echo "     Dokumente-Verzeichnis pruefen"

# 4. Git Deploy
echo "4/4 Git Deploy..."
git checkout v7-dev
git add "$TARGET_B/page.tsx"
git add Dokumente/ 2>/dev/null
git commit -m "v7.4.3-11 FINAL: Berater-Berichte gleichgezogen, PH v4.38, Git-Sicherung"
git push origin v7-dev

git checkout main
git merge v7-dev -m "merge v7.4.3-11 FINAL: Berater-Berichte + Doku"
git push origin main
git checkout v7-dev

echo ""
echo "=========================================="
echo "FERTIG! Session 03.03.2026 abgeschlossen."
echo "=========================================="
