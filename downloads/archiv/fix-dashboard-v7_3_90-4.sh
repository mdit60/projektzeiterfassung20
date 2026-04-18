#!/bin/bash
# ============================================================================
# PZE V7 - Dashboard v4: portalRole-Filter + Namens-Fix
# Version: 7.3.90-4
# ============================================================================

set -e
cd ~/Documents/Dev/PZE

echo "=== PZE v7.3.90-4 - Dashboard Fixes ==="
echo ""

DL="$HOME/Documents/Dev/PZE/downloads"
F1="$DL/berater-dashboard-v7_3_90-4.tsx"
F2="$DL/firma-dashboard-v7_3_90-4.tsx"

MISSING=0
for F in "$F1" "$F2"; do
    if [ -f "$F" ]; then
        echo "OK: $(basename $F)"
    else
        echo "FEHLT: $(basename $F)"
        MISSING=1
    fi
done
[ $MISSING -eq 1 ] && exit 1
echo ""

# Backup
mkdir -p backup-v7_3_90-4
[ -f "src/app/v7/berater/dashboard/page.tsx" ] && cp "src/app/v7/berater/dashboard/page.tsx" "backup-v7_3_90-4/berater-dashboard.tsx"
[ -f "src/app/v7/firma/dashboard/page.tsx" ] && cp "src/app/v7/firma/dashboard/page.tsx" "backup-v7_3_90-4/firma-dashboard.tsx"

# Install
cp "$F1" "src/app/v7/berater/dashboard/page.tsx"
echo "-> Berater-Dashboard (Vorname-Fix)"
cp "$F2" "src/app/v7/firma/dashboard/page.tsx"
echo "-> Firma-Dashboard (portalRole-Filter + Vorname + client_company_id)"
echo ""

rm -rf .next
pnpm run build 2>&1 | tail -20

if [ $? -eq 0 ]; then
    echo ""
    echo "BUILD OK"
    git add -A
    git commit -m "v7.3.90-4: Dashboard portalRole-Filter + Namens-Fix

Firma-Dashboard:
- BUG: company_id -> client_company_id in v7_employees Queries
  (portalRole wurde nie korrekt geladen -> alles war sichtbar)
- BUG: Default portalRole 'client_admin' -> 'employee' (sicherer)
- employee sieht jetzt NUR Zeiterfassung

Beide Dashboards:
- Vorname korrekt: first_name bevorzugt, display_name 'Nachname, Vorname'
  wird aufgeloest statt kaputtem split(' ')[0]"

    git push origin v7-dev
    echo "Gepusht!"
else
    echo "BUILD FEHLER"
fi
