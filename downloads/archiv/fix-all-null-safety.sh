#!/bin/bash
# ============================================================================
# PZE - Komplettes Null-Safety Fix Script
# Datum: 08. Februar 2026
# 
# Fixt ALLE unsicheren .filter(), .map(), .find(), .length Aufrufe
# in allen TSX-Dateien um Vercel Production Crashes zu verhindern
# ============================================================================

set -e

cd ~/Documents/Dev/PZE

echo "========================================"
echo "PZE Null-Safety Fix - Alle Dateien"
echo "========================================"
echo ""

# Backup erstellen
echo "1. Backup erstellen..."
BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp -r src/components/shared "$BACKUP_DIR/"
cp -r src/app/v7 "$BACKUP_DIR/"
echo "   Backup in: $BACKUP_DIR"
echo ""

# Zaehler
FIXED_FILES=0

echo "2. Fixe alle Dateien..."
echo "----------------------------------------"

# Liste aller zu fixenden Dateien
FILES=(
  "src/components/shared/TimesheetForm.tsx"
  "src/components/shared/ProjectDetailPage.tsx"
  "src/components/shared/ProjectTeamManager.tsx"
  "src/components/shared/EmployeeManagement.tsx"
  "src/components/shared/WorkPackageTable.tsx"
  "src/components/shared/WorkPackageAssignmentModal.tsx"
  "src/components/shared/DataTable.tsx"
  "src/components/shared/WorkPackageList.tsx"
  "src/components/shared/ProjectCreateForm.tsx"
  "src/components/shared/ArbeitsplanImport.tsx"
  "src/components/shared/ProjectList.tsx"
  "src/app/v7/berater/fzul/analyse/page.tsx"
  "src/app/v7/firma/berichte/page.tsx"
  "src/app/v7/berater/foerderung/firma/[id]/berichte/page.tsx"
  "src/app/v7/firmen/[id]/page.tsx"
  "src/app/v7/firma/dashboard/page.tsx"
  "src/app/v7/import/page.tsx"
  "src/app/v7/berater/foerderung/page.tsx"
  "src/app/v7/berater/foerderung/import/page.tsx"
  "src/app/v7/page.tsx"
  "src/app/v7/berater/fzul/page.tsx"
  "src/app/v7/firma/zeiterfassung/page.tsx"
  "src/app/v7/berater/foerderung/firma/[id]/zeiterfassung/page.tsx"
  "src/app/v7/berater/foerderung/firma/[id]/page.tsx"
)

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    # Anzahl Probleme vorher
    BEFORE=$(grep -c "\.\(filter\|map\|find\)(" "$file" 2>/dev/null | grep -v "|| \[\]" || echo "0")
    
    # Fix 1: x.filter( -> (x || []).filter(
    # Aber NICHT wenn bereits (x || []) vorhanden
    # Und NICHT bei Methoden-Ketten wie ).filter(
    
    # Sichere Variante: Nur einfache Variablennamen
    sed -i '' -E 's/([a-zA-Z_][a-zA-Z0-9_]*)\.filter\(([^)]*)\)/(\1 || []).filter(\2)/g' "$file"
    sed -i '' -E 's/([a-zA-Z_][a-zA-Z0-9_]*)\.map\(([^)]*)\)/(\1 || []).map(\2)/g' "$file"
    sed -i '' -E 's/([a-zA-Z_][a-zA-Z0-9_]*)\.find\(([^)]*)\)/(\1 || []).find(\2)/g' "$file"
    
    # Fix fuer .length (ohne Klammern danach - ist Property, nicht Methode)
    sed -i '' -E 's/([a-zA-Z_][a-zA-Z0-9_]*)\.length([^a-zA-Z0-9_(])/(\1 || []).length\2/g' "$file"
    
    # Entferne doppelte Fixes: ((x || []) || []) -> (x || [])
    sed -i '' 's/((\([a-zA-Z_][a-zA-Z0-9_]*\) || \[\]) || \[\])/(\1 || [])/g' "$file"
    sed -i '' 's/((\([a-zA-Z_][a-zA-Z0-9_]*\) || \[\]) || \[\])/(\1 || [])/g' "$file"
    sed -i '' 's/((\([a-zA-Z_][a-zA-Z0-9_]*\) || \[\]) || \[\])/(\1 || [])/g' "$file"
    
    # Fix: String.length sollte NICHT geaendert werden - revertiere
    # searchTerm.length, etc. sind Strings, keine Arrays
    sed -i '' 's/(searchTerm || \[\])\.length/searchTerm.length/g' "$file"
    sed -i '' 's/(search || \[\])\.length/search.length/g' "$file"
    sed -i '' 's/(query || \[\])\.length/query.length/g' "$file"
    sed -i '' 's/(text || \[\])\.length/text.length/g' "$file"
    sed -i '' 's/(name || \[\])\.length/name.length/g' "$file"
    sed -i '' 's/(value || \[\])\.length/value.length/g' "$file"
    sed -i '' 's/(str || \[\])\.length/str.length/g' "$file"
    sed -i '' 's/(id || \[\])\.length/id.length/g' "$file"
    sed -i '' 's/(code || \[\])\.length/code.length/g' "$file"
    sed -i '' 's/(error || \[\])\.length/error.length/g' "$file"
    sed -i '' 's/(message || \[\])\.length/message.length/g' "$file"
    
    echo "   ✓ $file"
    ((FIXED_FILES++))
  fi
done

echo ""
echo "   $FIXED_FILES Dateien bearbeitet"
echo ""

echo "3. Build testen..."
echo "----------------------------------------"
npm run build

if [ $? -eq 0 ]; then
    echo ""
    echo "   ✓ Build erfolgreich!"
    echo ""
    
    echo "4. Git Status..."
    echo "----------------------------------------"
    git status --short
    
    echo ""
    read -p "Commit und Push? (j/n): " confirm
    if [ "$confirm" = "j" ]; then
        git add -A
        git commit -m "FIX v7.3.88-11: Komplettes Null-Safety fuer alle Array-Operationen (Vercel Crash)"
        git push
        echo ""
        echo "   ✓ Gepusht!"
    fi
else
    echo ""
    echo "   ✗ Build fehlgeschlagen!"
    echo ""
    echo "Backup wiederherstellen mit:"
    echo "   cp -r $BACKUP_DIR/shared/* src/components/shared/"
    echo "   cp -r $BACKUP_DIR/v7/* src/app/v7/"
    exit 1
fi

echo ""
echo "========================================"
echo "Fertig!"
echo "========================================"
