#!/bin/bash
cd "$HOME/Documents/Dev/PZE" || exit 1
DOWNLOADS="./downloads"
TARGET="./src/components/shared"
FILE="WorkPackageTable-v7_4_3-7.tsx"
[ ! -f "$DOWNLOADS/$FILE" ] && echo "FEHLER: $FILE nicht gefunden!" && exit 1
cp "$TARGET/WorkPackageTable.tsx" "$TARGET/WorkPackageTable.tsx.bak-$(date +%Y%m%d-%H%M%S)"
cp "$DOWNLOADS/$FILE" "$TARGET/WorkPackageTable.tsx"
git checkout v7-dev
git add "$TARGET/WorkPackageTable.tsx"
git commit -m "v7.4.3-7: Erfasst-Spalte nur orange BG, kein rot BG"
git push origin v7-dev
git checkout main && git merge v7-dev -m "merge v7.4.3-7" && git push origin main && git checkout v7-dev
echo "FERTIG!"
