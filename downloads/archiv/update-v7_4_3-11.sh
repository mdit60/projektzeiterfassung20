#!/bin/bash
cd "$HOME/Documents/Dev/PZE" || exit 1
DOWNLOADS="./downloads"
TARGET="./src/app/v7/firma/berichte"
FILE="berichte-page-v7_4_3-11.tsx"
[ ! -f "$DOWNLOADS/$FILE" ] && echo "FEHLER: $FILE nicht gefunden!" && exit 1
[ -f "$TARGET/page.tsx" ] && cp "$TARGET/page.tsx" "$TARGET/page.tsx.bak-$(date +%Y%m%d-%H%M%S)"
cp "$DOWNLOADS/$FILE" "$TARGET/page.tsx"
git checkout v7-dev
git add "$TARGET/page.tsx"
git commit -m "v7.4.3-11: Berichte - wpData scope fix"
git push origin v7-dev
git checkout main && git merge v7-dev -m "merge v7.4.3-11" && git push origin main && git checkout v7-dev
echo "FERTIG!"
