#!/bin/bash
# ============================================================================
# PZE Deploy Script - TimesheetForm v7.3.89
# ============================================================================
# Datum: 09. Februar 2026
# Aenderungen:
#   - TimesheetForm: T/NT Anzeige statt X/-, getrennte Summen T/NT bei ZIM_DS
#   - isTechnicalAP() robuste Hilfsfunktion
#   - UTF-8 Fix (korrupter Kommentar repariert)
# ============================================================================

set -e

cd ~/Documents/Dev/PZE

echo "============================================"
echo "  PZE Deploy - TimesheetForm v7.3.89"
echo "============================================"

# 1. Lock-Datei loeschen (Sicherheit)
rm -f .git/index.lock

# 2. Branch pruefen
BRANCH=$(git branch --show-current)
echo ""
echo "[1/6] Aktueller Branch: $BRANCH"
if [ "$BRANCH" != "v7-dev" ]; then
  echo "FEHLER: Falscher Branch! Erwartet: v7-dev, Aktuell: $BRANCH"
  echo "Bitte zuerst: git checkout v7-dev"
  exit 1
fi
echo "  -> OK: v7-dev"

# 3. TimesheetForm kopieren
echo ""
echo "[2/6] TimesheetForm v7.3.89 integrieren..."
cp ~/Documents/Dev/PZE/downloads/TimesheetForm-v7_3_89.tsx \
   src/components/shared/TimesheetForm.tsx
echo "  -> OK: TimesheetForm.tsx aktualisiert"

# 4. Pruefen ob Datei korrekt kopiert wurde
echo ""
echo "[3/6] Version verifizieren..."
HEAD=$(head -5 src/components/shared/TimesheetForm.tsx | grep "Version:")
echo "  -> $HEAD"

# 5. Git add + commit
echo ""
echo "[4/6] Git add..."
git add src/components/shared/TimesheetForm.tsx

echo ""
echo "[5/6] Git commit..."
git commit -m "v7.3.89: TimesheetForm T/NT Anzeige + getrennte Summen bei ZIM_DS

- T-Spalte zeigt T (technisch) / NT (nicht-technisch) statt X/-
- Getrennte Summenzeilen bei Durchfuehrbarkeitsstudien (ZIM_DS):
  Summe technisch (T), Summe nicht-technisch (NT), Gesamtsumme
- Neue Hilfsfunktion isTechnicalAP() fuer robuste DB-Typ-Erkennung
- UTF-8 Fix: korrupter Kommentar in Zeile 261 repariert
- Basiert auf v7.3.88-10 (alle Null-Safety Fixes erhalten)"

# 6. Push zu v7-dev (Vercel deployed automatisch)
echo ""
echo "[6/6] Push zu v7-dev (Vercel Auto-Deploy)..."
git push origin v7-dev

echo ""
echo "============================================"
echo "  FERTIG! Vercel deployed automatisch."
echo "  Pruefe: https://projektzeiterfassung20-git-v7-dev-martin-ds-projects-5cb70f89.vercel.app"
echo "============================================"
echo ""
echo "Test-Checkliste:"
echo "  1. ZIM_DS Projekt oeffnen (z.B. ANOVIA bei AS System)"
echo "  2. Zeiterfassung -> T-Spalte zeigt T oder NT"
echo "  3. Summenbereich: 3 Zeilen (T / NT / Gesamt)"
echo "  4. Normales Projekt pruefen -> nur 1 Summenzeile"
echo ""
