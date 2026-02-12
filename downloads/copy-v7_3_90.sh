#!/bin/bash
# ============================================================================
# PZE v7.3.90 - Rollenbasierte Zugriffskontrolle + fehlende Seiten
# ============================================================================
# Datum: 12. Februar 2026
#
# Aenderungen:
# 1. v7-module-config: project_leader sieht Projekte + Berichte
# 2. Projekte-Seite: Rollen-Check, employee -> Redirect
# 3. Berichte-Seite: Rollen-Erkennung statt hardcoded client_admin
# 4. NEU: /v7/firma/projekte/[id] - Projekt-Detail (Shared Component)
# 5. NEU: /v7/firma/meine-projekte - Redirect auf /v7/firma/projekte
# 6. NEU: /v7/firma/mein-status - Platzhalter-Seite
# ============================================================================

set -e
cd ~/Documents/Dev/PZE
DL=~/Documents/Dev/PZE/Downloads

echo "=== PZE v7.3.90 - Vollstaendige Integration ==="
echo ""

# Sicherheitskopien
echo "1. Sicherheitskopien erstellen..."
cp src/lib/v7-module-config.ts src/lib/v7-module-config.ts.bak-90-2
cp src/app/v7/firma/projekte/page.tsx src/app/v7/firma/projekte/page.tsx.bak-89
cp src/app/v7/firma/berichte/page.tsx src/app/v7/firma/berichte/page.tsx.bak-88-4

# Bestehende Dateien aktualisieren
echo "2. v7-module-config-v7_3_90-3.ts -> src/lib/v7-module-config.ts"
cp "$DL/v7-module-config-v7_3_90-3.ts" src/lib/v7-module-config.ts

echo "3. page-firma-projekte-v7_3_90.tsx -> src/app/v7/firma/projekte/page.tsx"
cp "$DL/page-firma-projekte-v7_3_90.tsx" src/app/v7/firma/projekte/page.tsx

echo "4. berichte-page-v7_3_90.tsx -> src/app/v7/firma/berichte/page.tsx"
cp "$DL/berichte-page-v7_3_90.tsx" src/app/v7/firma/berichte/page.tsx

# Neue Seiten erstellen
echo "5. Projekt-Detail: src/app/v7/firma/projekte/[id]/page.tsx"
mkdir -p "src/app/v7/firma/projekte/[id]"
cp "$DL/page-firma-projekt-detail-v7_3_90.tsx" "src/app/v7/firma/projekte/[id]/page.tsx"

echo "6. Meine Projekte: src/app/v7/firma/meine-projekte/page.tsx"
mkdir -p src/app/v7/firma/meine-projekte
cp "$DL/page-firma-meine-projekte-v7_3_90.tsx" src/app/v7/firma/meine-projekte/page.tsx

echo "7. Mein Status: src/app/v7/firma/mein-status/page.tsx"
mkdir -p src/app/v7/firma/mein-status
cp "$DL/page-firma-mein-status-v7_3_90.tsx" src/app/v7/firma/mein-status/page.tsx

echo ""
echo "=== Installation abgeschlossen ==="
echo ""
echo "Naechste Schritte:"
echo "  1. npm run dev"
echo "  2. Als Robin Freund testen:"
echo "     - Dashboard: 3 Kacheln (Projekte, Zeiterfassung, Berichte)"
echo "     - Projekte: ANOVIA sichtbar -> Klick oeffnet Projekt-Detail"
echo "     - Meine Projekte (Nav): Zeigt Projekte-Seite"
echo "     - Mein Status (Nav): Platzhalter-Seite"
echo "     - Berichte: Korrekte Navigation"
echo "  3. Git commit + push:"
echo "     git add -A"
echo "     git commit -m 'v7.3.90: Rollenbasierte Zugriffskontrolle + fehlende Firmen-Seiten'"
echo "     git push origin v7-dev"
echo ""
