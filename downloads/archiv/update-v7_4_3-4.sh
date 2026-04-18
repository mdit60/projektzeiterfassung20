#!/bin/bash
# ============================================================================
# PZE v7.4.3-4 - TimesheetForm FIX: Vorbelegung Timing
# ============================================================================

cd "$HOME/Documents/Dev/PZE" || { echo "FEHLER: PZE-Verzeichnis nicht gefunden!"; exit 1; }

echo "=========================================="
echo "PZE v7.4.3-4 - TimesheetForm Fix"
echo "=========================================="

DOWNLOADS="./downloads"
TARGET="./src/components/shared"
FILE="TimesheetForm-v7_4_3-4.tsx"

if [ ! -f "$DOWNLOADS/$FILE" ]; then
  echo "FEHLER: $DOWNLOADS/$FILE nicht gefunden!"
  exit 1
fi

echo ""
echo "1/4 Backup..."
if [ -f "$TARGET/TimesheetForm.tsx" ]; then
  cp "$TARGET/TimesheetForm.tsx" "$TARGET/TimesheetForm.tsx.bak-$(date +%Y%m%d-%H%M%S)"
  echo "     Backup erstellt."
fi

echo ""
echo "2/4 Neue Datei kopieren..."
cp "$DOWNLOADS/$FILE" "$TARGET/TimesheetForm.tsx"
echo "     TimesheetForm.tsx aktualisiert."

echo ""
echo "3/4 UTF-8 Check..."
if file "$TARGET/TimesheetForm.tsx" | grep -q "ASCII\|UTF-8"; then
  echo "     UTF-8 OK"
else
  echo "     WARNUNG: Encoding pruefen!"
fi

echo ""
echo "4/4 Git Deploy (v7-dev + main)..."
git checkout v7-dev
git add "$TARGET/TimesheetForm.tsx"
git commit -m "v7.4.3-4: TimesheetForm FIX - Vorbelegung wartet auf Arbeitsplan-Daten"
git push origin v7-dev

echo ""
echo "Merge auf main..."
git checkout main
git merge v7-dev -m "merge v7.4.3-4: Vorbelegung Timing Fix"
git push origin main
git checkout v7-dev

echo ""
echo "=========================================="
echo "FERTIG! Vercel baut jetzt automatisch."
echo "=========================================="
