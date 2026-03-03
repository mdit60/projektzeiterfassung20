#!/bin/bash
# ============================================================================
# PZE v7.4.2-4 - WorkPackageTable: Stunden/Verfuegbar + Kontrollsummen
# ============================================================================

cd "$HOME/Documents/Dev/PZE" || { echo "FEHLER: PZE-Verzeichnis nicht gefunden!"; exit 1; }

echo "=========================================="
echo "PZE v7.4.2-4 - WorkPackageTable Update"
echo "Verzeichnis: $(pwd)"
echo "=========================================="

DOWNLOADS="./downloads"
TARGET="./src/components/shared"
FILE="WorkPackageTable-v7_4_2-4.tsx"

if [ ! -f "$DOWNLOADS/$FILE" ]; then
  echo "FEHLER: $DOWNLOADS/$FILE nicht gefunden!"
  echo "Bitte zuerst die Datei von Claude herunterladen."
  exit 1
fi

echo ""
echo "1/4 Backup der alten Datei..."
if [ -f "$TARGET/WorkPackageTable.tsx" ]; then
  cp "$TARGET/WorkPackageTable.tsx" "$TARGET/WorkPackageTable.tsx.bak-$(date +%Y%m%d-%H%M%S)"
  echo "     Backup erstellt."
fi

echo ""
echo "2/4 Neue Datei kopieren..."
cp "$DOWNLOADS/$FILE" "$TARGET/WorkPackageTable.tsx"
echo "     WorkPackageTable.tsx aktualisiert."

echo ""
echo "3/4 UTF-8 Validierung..."
if file "$TARGET/WorkPackageTable.tsx" | grep -q "ASCII\|UTF-8"; then
  echo "     UTF-8 OK"
else
  echo "     WARNUNG: Encoding pruefen!"
fi

echo ""
echo "4/4 Git Commit + Push (v7-dev + main)..."
git checkout v7-dev
git add "$TARGET/WorkPackageTable.tsx"
git commit -m "v7.4.2-4: WorkPackageTable - Stunden/Verfuegbar pro AP + Kontrollsummen Anlage 5"
git push origin v7-dev

echo ""
echo "Merge auf main fuer Production..."
git checkout main
git merge v7-dev -m "merge v7.4.2-4: WorkPackageTable Stunden + Kontrollsummen"
git push origin main
git checkout v7-dev

echo ""
echo "=========================================="
echo "FERTIG! Deployed auf v7-dev UND main."
echo "Vercel baut jetzt automatisch."
echo "=========================================="
