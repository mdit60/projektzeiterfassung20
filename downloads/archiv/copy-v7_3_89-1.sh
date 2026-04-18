#!/bin/bash
# ============================================================================
# PZE v7.3.89-1 - TimesheetForm (Vercel-Version) + EmployeeManagement Login-Fix
# ============================================================================
# Datum: 12. Februar 2026
#
# TimesheetForm-v7_3_89.tsx:
#   - Die Version die bereits auf Vercel laeuft (T/NT Spalte korrekt)
#   - Wird lokal ins src/ kopiert um Gleichstand herzustellen
#
# EmployeeManagement-v7_3_89-1.tsx:
#   - FIX: Login-Verknuepfung dreht nicht mehr im Kreis
#   - Bei "already registered" IMMER link-Modus
#   - Funktioniert auch ohne v7_user_profiles (V6-Altdaten)
# ============================================================================

set -e
cd ~/Documents/Dev/PZE

echo "=== PZE v7.3.89-1 Integration ==="
echo ""

# Sicherheitskopien
echo "1. Sicherheitskopien erstellen..."
cp src/components/shared/TimesheetForm.tsx src/components/shared/TimesheetForm.tsx.bak-88-10
cp src/components/shared/EmployeeManagement.tsx src/components/shared/EmployeeManagement.tsx.bak-84

# TimesheetForm kopieren (Vercel-Version mit T/NT)
echo "2. TimesheetForm-v7_3_89.tsx installieren (Vercel-Version)..."
cp ~/Documents/Dev/PZE/Downloads/TimesheetForm-v7_3_89.tsx \
   src/components/shared/TimesheetForm.tsx

# EmployeeManagement kopieren
echo "3. EmployeeManagement-v7_3_89-1.tsx installieren..."
cp ~/Documents/Dev/PZE/Downloads/EmployeeManagement-v7_3_89-1.tsx \
   src/components/shared/EmployeeManagement.tsx

echo ""
echo "=== Installation abgeschlossen ==="
echo ""
echo "Naechste Schritte:"
echo "  1. npm run dev -- Lokal testen"
echo "  2. TimesheetForm: ANOVIA oeffnen -> T/NT Spalte muss T und NT zeigen"
echo "  3. EmployeeManagement: Login bei bereits registriertem MA testen"
echo "  4. Git commit:"
echo "     git add -A"
echo "     git commit -m 'v7.3.89-1: TimesheetForm lokal sync + EmployeeManagement Login-Fix'"
echo "     git push origin v7-dev"
echo ""
