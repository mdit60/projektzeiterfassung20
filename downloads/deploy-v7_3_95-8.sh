#!/bin/bash
# ============================================================
# DEPLOY v7.3.95-8 - Name/Rolle im Header + PW-Reset
# 20. Februar 2026
# ============================================================
# Fixes:
# - PortalHeader: Rolle anzeigen, "Berater (Systemadmin)"
# - EmployeeManagement: PW-Reset-Button wiederhergestellt,
#   createUserProfile setzt role='client_user' statt 'employee'
# - Mein Status / Dashboard / Zeiterfassung / Berichte:
#   display_name Fallback auf v7_employees wenn in v7_user_profiles NULL
# ============================================================

set -e

PROJECT_DIR="$HOME/Documents/Dev/PZE"
DOWNLOADS="$PROJECT_DIR/downloads"
cd "$PROJECT_DIR"

echo "=== DEPLOY v7.3.95-8 ==="
echo ""

# Branch pruefen
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "v7-dev" ]; then
  echo "Wechsle auf v7-dev..."
  git checkout v7-dev
fi

echo "=== Dateien kopieren ==="

# 1. Shared Components
cp "$DOWNLOADS/PortalHeader-v7_3_95-4.tsx" src/components/shared/PortalHeader.tsx
echo "  PortalHeader.tsx"

cp "$DOWNLOADS/EmployeeManagement-v7_3_95-1.tsx" src/components/shared/EmployeeManagement.tsx
echo "  EmployeeManagement.tsx"

# 2. Firmen-Portal Pages
cp "$DOWNLOADS/mein-status-page-v7_3_95-4.tsx" src/app/v7/firma/mein-status/page.tsx
echo "  firma/mein-status/page.tsx"

cp "$DOWNLOADS/firma-dashboard-v7_3_95-1.tsx" src/app/v7/firma/dashboard/page.tsx
echo "  firma/dashboard/page.tsx"

cp "$DOWNLOADS/zeiterfassung-page-v7_3_95-1.tsx" src/app/v7/firma/zeiterfassung/page.tsx
echo "  firma/zeiterfassung/page.tsx"

cp "$DOWNLOADS/berichte-page-v7_3_95-1.tsx" src/app/v7/firma/berichte/page.tsx
echo "  firma/berichte/page.tsx"

echo ""

# Build
echo "=== Build ==="
rm -rf .next
pnpm build
echo ""

# Git
echo "=== Git ==="
git add -A
git commit -m "v7.3.95-8: Name/Rolle im Header, PW-Reset, display_name Fallback
- PortalHeader: Rolle als Untertitel (Berater (Systemadmin)/Administrator/etc.)
- EmployeeManagement: PW-Reset wiederhergestellt, role=client_user fix
- Alle Firmen-Portal Seiten: display_name Fallback auf v7_employees
- Berichte: UTF-8 Fix"

git push origin v7-dev
echo ""

echo "=== DEPLOY KOMPLETT ==="
echo ""
echo "Fuer prod:"
echo "  git checkout main && git merge v7-dev && git push origin main && git checkout v7-dev"
echo ""
echo "SQL fuer Prod-DB (einmalig):"
echo "  UPDATE v7_user_profiles up"
echo "  SET display_name = e.display_name,"
echo "      first_name = e.first_name,"
echo "      last_name = e.last_name,"
echo "      role = 'client_user'"
echo "  FROM v7_employees e"
echo "  WHERE e.user_id = up.id"
echo "    AND e.client_company_id = '105a0bcb-6cd3-4167-ad82-e35267b5872a';"
