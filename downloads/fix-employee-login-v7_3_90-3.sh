#!/bin/bash
# ============================================================================
# PZE V7 - Quickfix: EmployeeManagement Login-Rolle
# Version: 7.3.90-3
# FIX: 'employee' -> 'client_user' in createUserProfile
# ============================================================================

cd ~/Documents/Dev/PZE

echo "=== EmployeeManagement Bugfix ==="
echo ""

SRC="$HOME/Documents/Dev/PZE/downloads/EmployeeManagement-v7_3_90-3.tsx"

if [ ! -f "$SRC" ]; then
    echo "FEHLT: $SRC"
    exit 1
fi

# Backup
cp src/components/shared/EmployeeManagement.tsx backup-v7_3_90-3/EmployeeManagement-OLD.tsx 2>/dev/null
echo "Backup: OK"

# Install
cp "$SRC" src/components/shared/EmployeeManagement.tsx
echo "Install: OK"

# Build
rm -rf .next
pnpm run build 2>&1 | tail -20

if [ $? -eq 0 ]; then
    echo ""
    echo "BUILD OK"
    git add -A
    git commit -m "v7.3.90-3: Fix Login-Rolle employee -> client_user

BUG: createUserProfile schrieb 'employee' in v7_user_profiles.role
     aber Enum v7_user_role erlaubt nur: system_admin, consultant,
     client_admin, client_user
FIX: portal_role employee/project_leader -> role client_user"
    echo ""
    read -p "Push? (j/n) " P
    [ "$P" = "j" ] && git push origin v7-dev
else
    echo "BUILD FEHLER"
fi
