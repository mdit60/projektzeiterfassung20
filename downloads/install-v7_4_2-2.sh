#!/bin/bash
# install-v7_4_2-2.sh
# Anlage 6.1 Felder im Hinzufuegen-Dialog + PDF-Import entfernt
# ================================================

echo "=== PZE v7.4.2-2 Installation ==="
echo "1) ProjectCreateForm: PDF-Import UI entfernt"
echo "2) ProjectTeamManager: Anlage 6.1 im Hinzufuegen-Dialog"
echo ""

cd ~/Documents/Dev/PZE || exit 1

# Sicherstellen dass wir auf v7-dev sind
BRANCH=$(git branch --show-current)
if [ "$BRANCH" != "v7-dev" ]; then
  echo "FEHLER: Nicht auf v7-dev! Aktuell: $BRANCH"
  exit 1
fi

echo "1/4 Kopiere ProjectCreateForm..."
cp ~/Documents/Dev/PZE/downloads/ProjectCreateForm-v7_4_2-1.tsx \
   src/components/shared/ProjectCreateForm.tsx

echo "2/4 Kopiere ProjectTeamManager..."
cp ~/Documents/Dev/PZE/downloads/ProjectTeamManager-v7_4_2-2.tsx \
   src/components/shared/ProjectTeamManager.tsx

echo "3/4 Build testen..."
npm run build 2>&1 | tail -5

echo "4/4 Git commit..."
git add -A
git commit -m "v7.4.2-2: Anlage 6.1 im Hinzufuegen-Dialog + PDF-Import entfernt

ProjectCreateForm (v7.4.2-1):
- Tab-Leiste (PDF importieren / Manuell anlegen) entfernt
- Nur noch manuelles Projektformular aktiv
- PDF-Parser-Code als Kommentar erhalten

ProjectTeamManager (v7.4.2-2):
- Anlage 6.1 Felder jetzt auch im Hinzufuegen-Dialog
- Jahresbruttolohn, pWAZ, bWAZ mit auto Stundensatzberechnung
- Vorhandene Employee-Daten werden beim MA-Auswahl vorbelegt
- handleAddMember speichert Gehaltsdaten in v7_employees
- Beide Dialoge (Add+Edit) nun identische Anlage 6.1 Felder
- Scrollbarer Dialog (max-h-[90vh]) fuer kleine Bildschirme"

git push origin v7-dev

echo ""
echo "=== FERTIG ==="
echo "Hinzufuegen-Dialog zeigt jetzt Anlage 6.1 Felder"
echo "Stundensatz wird automatisch berechnet"
