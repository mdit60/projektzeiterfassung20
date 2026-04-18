#!/bin/bash
# ============================================================
# PZE Deploy v7.3.91-1 - Passwort aendern / zuruecksetzen
# ============================================================
# Datum: 16. Februar 2026
#
# Neue Features:
# 1. Passwort aendern im User-Dropdown (alle Portale)
# 2. Passwort zuruecksetzen als Berater (EmployeeManagement)
# 3. API-Route /api/v7/reset-password (Admin-Zugriff)
# ============================================================

set -e

PROJECT_DIR="$HOME/Documents/Dev/PZE"
DOWNLOADS_DIR="$HOME/Documents/Dev/PZE/downloads"

echo "=== PZE Deploy v7.3.91-1 ==="
echo ""

# 1. PortalHeader
echo "1. PortalHeader-v7_3_91-1.tsx -> src/components/shared/PortalHeader.tsx"
cp "$DOWNLOADS_DIR/PortalHeader-v7_3_91-1.tsx" "$PROJECT_DIR/src/components/shared/PortalHeader.tsx"

# 2. EmployeeManagement
echo "2. EmployeeManagement-v7_3_91-1.tsx -> src/components/shared/EmployeeManagement.tsx"
cp "$DOWNLOADS_DIR/EmployeeManagement-v7_3_91-1.tsx" "$PROJECT_DIR/src/components/shared/EmployeeManagement.tsx"

# 3. API-Route - Verzeichnis erstellen falls noetig
echo "3. reset-password-route-v7_3_91-1.ts -> src/app/api/v7/reset-password/route.ts"
mkdir -p "$PROJECT_DIR/src/app/api/v7/reset-password"
cp "$DOWNLOADS_DIR/reset-password-route-v7_3_91-1.ts" "$PROJECT_DIR/src/app/api/v7/reset-password/route.ts"

echo ""
echo "=== Dateien kopiert ==="
echo ""

# Build testen
echo "4. Build testen..."
cd "$PROJECT_DIR"
pnpm build

echo ""
echo "=== Build erfolgreich ==="
echo ""

# Git
echo "5. Git commit & push..."
git add -A
git status
git commit -m "v7.3.91-1: Passwort aendern (User-Menue) + Passwort zuruecksetzen (Berater)"
git push origin v7-dev

echo ""
echo "=== Deploy v7.3.91-1 abgeschlossen ==="
echo ""
echo "Features:"
echo "  - Passwort aendern: User-Dropdown -> Schluessel-Icon"
echo "  - Passwort zuruecksetzen: Mitarbeiter-Liste -> Schluessel-Icon (Berater)"
echo "  - API-Route: /api/v7/reset-password (Admin-gesichert)"
