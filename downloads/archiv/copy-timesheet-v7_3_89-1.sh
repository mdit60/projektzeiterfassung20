#!/bin/bash
# ============================================================================
# PZE v7.3.89-1 - TimesheetForm T-Spalte Fix Integration
# ============================================================================
# Datum: 12. Februar 2026
#
# Aenderungen:
# - isTechnicalAP() Hilfsfunktion: Erkennt boolean, string, number aus DB
# - T-Spalte zeigt jetzt korrekt "X" fuer technische APs
# - Alle Null-Safety Fixes aus v7.3.88-10 beibehalten
# - UTF-8 bereinigt (keine Nicht-ASCII Zeichen)
# ============================================================================

set -e
cd ~/Documents/Dev/PZE

echo "=== PZE v7.3.89-1 Integration ==="
echo ""

# Sicherheitskopie
echo "1. Sicherheitskopie der aktuellen TimesheetForm..."
cp src/components/shared/TimesheetForm.tsx src/components/shared/TimesheetForm.tsx.bak-88-10

# TimesheetForm kopieren
echo "2. TimesheetForm-v7_3_89-1.tsx installieren..."
cp ~/Documents/Dev/PZE/Downloads/TimesheetForm-v7_3_89-1.tsx \
   src/components/shared/TimesheetForm.tsx

echo ""
echo "=== Installation abgeschlossen ==="
echo ""
echo "Naechste Schritte:"
echo "  1. npm run dev -- Lokal testen"
echo "  2. Projekt mit ZIM DS oeffnen (z.B. ANOVIA)"
echo "  3. Zeiterfassung pruefen: T-Spalte zeigt X fuer technische APs"
echo "  4. Git commit:"
echo "     git add -A"
echo "     git commit -m 'v7.3.89-1: TimesheetForm T-Spalte is_technical Fix'"
echo "     git push origin v7-dev"
echo ""
