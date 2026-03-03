#!/bin/bash
# ============================================================================
# PZE v7.3.90-2 - WorkPackageTable Update
# Stunden + Erfasst + Verfuegbar pro AP in Arbeitsplan-Uebersicht
# ============================================================================

# IMMER zuerst ins richtige Verzeichnis wechseln
cd "$HOME/Documents/Dev/PZE" || { echo "FEHLER: PZE-Verzeichnis nicht gefunden!"; exit 1; }

echo "=========================================="
echo "PZE v7.3.90-2 - WorkPackageTable Update"
echo "Verzeichnis: $(pwd)"
echo "=========================================="

DOWNLOADS="./downloads"
TARGET="./src/components/shared"

if [ ! -f "$DOWNLOADS/WorkPackageTable-v7_3_90-2.tsx" ]; then
  echo "FEHLER: $DOWNLOADS/WorkPackageTable-v7_3_90-2.tsx nicht gefunden!"
  echo "Bitte zuerst die Datei von Claude herunterladen."
  exit 1
fi

echo ""
echo "1/3 Backup der alten Datei..."
if [ -f "$TARGET/WorkPackageTable.tsx" ]; then
  cp "$TARGET/WorkPackageTable.tsx" "$TARGET/WorkPackageTable.tsx.bak-$(date +%Y%m%d-%H%M%S)"
  echo "     Backup erstellt."
else
  echo "     Keine alte Datei vorhanden."
fi

echo ""
echo "2/3 Neue Datei kopieren..."
cp "$DOWNLOADS/WorkPackageTable-v7_3_90-2.tsx" "$TARGET/WorkPackageTable.tsx"
echo "     WorkPackageTable.tsx aktualisiert."

echo ""
echo "3/3 UTF-8 Validierung..."
if file "$TARGET/WorkPackageTable.tsx" | grep -q "ASCII\|UTF-8"; then
  echo "     UTF-8 OK"
else
  echo "     WARNUNG: Encoding pruefen!"
fi

echo ""
echo "=========================================="
echo "FERTIG!"
echo "  pnpm dev"
echo "  # Testen: Projekt mit ZE-Eintraegen -> Tab Arbeitspakete"
echo "=========================================="
