#!/bin/bash
# ============================================================================
# PZE v7.3.95-4 - Mein Status: is_active Filter Fix
# ============================================================================

cd "$HOME/Documents/Dev/PZE" || { echo "FEHLER: PZE-Verzeichnis nicht gefunden!"; exit 1; }

echo "=========================================="
echo "PZE v7.3.95-4 - Mein Status Fix"
echo "=========================================="

DOWNLOADS="./downloads"
TARGET="./src/app/v7/firma/mein-status"
FILE="mein-status-page-v7_3_95-4.tsx"

if [ ! -f "$DOWNLOADS/$FILE" ]; then
  echo "FEHLER: $DOWNLOADS/$FILE nicht gefunden!"
  exit 1
fi

echo ""
echo "1/4 Backup..."
if [ -f "$TARGET/page.tsx" ]; then
  cp "$TARGET/page.tsx" "$TARGET/page.tsx.bak-$(date +%Y%m%d-%H%M%S)"
  echo "     Backup erstellt."
fi

echo ""
echo "2/4 Neue Datei kopieren..."
cp "$DOWNLOADS/$FILE" "$TARGET/page.tsx"
echo "     page.tsx aktualisiert."

echo ""
echo "3/4 UTF-8 Check..."
if file "$TARGET/page.tsx" | grep -q "ASCII\|UTF-8"; then
  echo "     UTF-8 OK"
else
  echo "     WARNUNG: Encoding pruefen!"
fi

echo ""
echo "4/4 Git Deploy (v7-dev + main)..."
git checkout v7-dev
git add "$TARGET/page.tsx"
git commit -m "v7.3.95-4: Mein Status - is_active Filter fuer korrekte Monatsanzeige"
git push origin v7-dev

echo ""
echo "Merge auf main..."
git checkout main
git merge v7-dev -m "merge v7.3.95-4: Mein Status is_active Fix"
git push origin main
git checkout v7-dev

echo ""
echo "=========================================="
echo "FERTIG! Vercel baut jetzt automatisch."
echo "=========================================="
