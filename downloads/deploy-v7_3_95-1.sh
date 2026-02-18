#!/bin/bash
# ============================================================================
# PZE v7.3.95-1 - Git Sicherung und Deployment
# ============================================================================
# Aenderungen:
# - PortalHeader: print:hidden (Header beim Drucken ausblenden)
# - PortalNav: print:hidden (Navigation beim Drucken ausblenden)
# - TimesheetForm: Unterschrift-Abstand print:mb-4 (Reserve)
# - ProjectTeamManager: Lfd. Nr. im Edit-Dialog aenderbar
# - EmployeeManagement: Anlage 6.1 Bereich entfernt (projektspezifisch)
# ============================================================================

set -e

cd ~/Documents/Dev/PZE

echo "============================================"
echo "PZE v7.3.95-1 - Git Sicherung & Deployment"
echo "============================================"
echo ""

# 1. Branch pruefen
BRANCH=$(git branch --show-current)
echo "Aktueller Branch: $BRANCH"

if [ "$BRANCH" != "v7-dev" ]; then
  echo "WARNUNG: Nicht auf v7-dev! Wechsle..."
  git checkout v7-dev
fi

echo ""

# 2. Dateien aus Downloads kopieren
echo "--- Kopiere Dateien aus Downloads ---"
DOWNLOADS=~/Documents/Dev/PZE/downloads
SHARED=src/components/shared

cp "$DOWNLOADS/PortalHeader-v7_3_95.tsx"      "$SHARED/PortalHeader.tsx"
echo "  PortalHeader.tsx aktualisiert"

cp "$DOWNLOADS/PortalNav-v7_3_95.tsx"          "$SHARED/PortalNav.tsx"
echo "  PortalNav.tsx aktualisiert"

cp "$DOWNLOADS/TimesheetForm-v7_3_95-1.tsx"    "$SHARED/TimesheetForm.tsx"
echo "  TimesheetForm.tsx aktualisiert"

# Falls noch nicht geschehen aus vorherigem Schritt:
# cp "$DOWNLOADS/ProjectTeamManager-v7_3_95.tsx" "$SHARED/ProjectTeamManager.tsx"
# cp "$DOWNLOADS/EmployeeManagement-v7_3_95.tsx" "$SHARED/EmployeeManagement.tsx"

echo ""

# 3. Status
echo "--- Git Status ---"
git status --short
echo ""

# 4. Stage + Commit
echo "--- Commit auf v7-dev ---"
git add -A
git commit -m "v7.3.95-1: Print-Fix - PortalHeader/PortalNav print:hidden, TimesheetForm Unterschrift kompakter

- PortalHeader: print:hidden auf header-Tag (wurde beim Drucken mitgerendert)
- PortalNav: print:hidden auf nav-Tag (wurde beim Drucken mitgerendert)
- TimesheetForm: Unterschrift-Abstand print:mb-6 -> print:mb-4 als Reserve
- Ursache 2-Seiten-Druck: Header+Nav frassen ~100px vertikalen Platz auf A4"

echo ""

# 5. Push v7-dev
echo "--- Push v7-dev ---"
git push origin v7-dev
echo ""

# 6. Merge in main (Produktion)
echo "--- Merge in main fuer Produktion ---"
git checkout main
git merge v7-dev -m "Merge v7.3.95-1: Print-Fix Stundennachweis + Team-Editor + MA-Verwaltung"
git push origin main
echo ""

# 7. Zurueck auf v7-dev
echo "--- Zurueck auf v7-dev ---"
git checkout v7-dev
echo ""

echo "============================================"
echo "FERTIG! Vercel deployt automatisch:"
echo "  - v7-dev -> Preview"
echo "  - main   -> Production (pze.itenion.com)"
echo "============================================"
