#!/bin/bash
cd "$HOME/Documents/Dev/PZE" || exit 1

echo "=========================================="
echo "PZE v7.4.3-8 - Berichte: Timesheet-Fix + Umbau"
echo "=========================================="

DOWNLOADS="./downloads"
TARGET="./src/app/v7/firma/berichte"
FILE="berichte-page-v7_4_3-8.tsx"

[ ! -f "$DOWNLOADS/$FILE" ] && echo "FEHLER: $FILE nicht gefunden!" && exit 1

echo "1/3 Backup..."
[ -f "$TARGET/page.tsx" ] && cp "$TARGET/page.tsx" "$TARGET/page.tsx.bak-$(date +%Y%m%d-%H%M%S)"

echo "2/3 Neue Datei kopieren..."
cp "$DOWNLOADS/$FILE" "$TARGET/page.tsx"
echo "     page.tsx aktualisiert."

echo "3/3 Git Deploy..."
git checkout v7-dev
git add "$TARGET/page.tsx"
git commit -m "v7.4.3-8: Berichte - is_active/is_billable Fix, Zeiterfassungs-Status mit Stunden+Fortschrittsbalken"
git push origin v7-dev

git checkout main
git merge v7-dev -m "merge v7.4.3-8: Berichte Umbau"
git push origin main
git checkout v7-dev

echo ""
echo "=========================================="
echo "FERTIG!"
echo "=========================================="
