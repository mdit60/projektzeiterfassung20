#!/bin/bash
# ============================================================================
# PZE V7.3.87-final - Git Commit und Push
# Datum: 04. Februar 2026
# ============================================================================

cd ~/Documents/Dev/PZE

echo "=== PZE V7.3.87-final - Git Sicherung ==="
echo ""

# Zuerst die finale Import-Route kopieren
echo "1. Finale Import-Route installieren..."
cp ~/Documents/Dev/PZE/downloads/arbeitsplan-import-route-v7_3_87-final.ts src/app/api/v7/arbeitsplan-import/route.ts
echo "   ✓ Import-Route aktualisiert"
echo ""

# Build prüfen
echo "2. Build prüfen..."
npm run build
if [ $? -ne 0 ]; then
    echo "   ✗ Build fehlgeschlagen!"
    exit 1
fi
echo "   ✓ Build erfolgreich"
echo ""

# Status anzeigen
echo "3. Geänderte Dateien:"
echo "----------------------"
git status --short
echo ""

# Commit
echo "4. Git Commit..."
git add -A

git commit -m "v7.3.87-final: Excel-Import fertiggestellt

EXCEL-ARBEITSPLAN IMPORT:
- Vorlage-Download mit projektspezifischem Team-Header
- Import mit Vorschau (Neue/Updates/Unverändert)
- Korrekte DB-Feldnamen (total_person_months, planned_person_months)
- Hinweis-Zeilen der Vorlage werden ignoriert (keine Warnungen)
- Debug-Logs entfernt

TEAM-MANAGEMENT:
- MA aus Firmenstamm zum Projekt hinzufügen
- Lfd. Nr., Stundensatz, Rolle, Zeitraum verwalten
- MA entfernen (nur ohne Zeiterfassung)
- Intelligente Lösch-Prüfung

BUGFIXES:
- colors.button → colors.buttonBg (TypeScript)
- loadProjectData → loadData (ReferenceError)
- clientCompanyId Fallback für Berater-Portal
- parseAPNumber für Number-Werte aus Excel
- parseDate für Excel datetime-Format

GETESTET:
- Neuer Import: 7 APs erfolgreich angelegt
- Re-Import: 'Unverändert' korrekt erkannt
- Update-Import: Änderungen erkannt und angezeigt
- Neues AP hinzufügen via Import funktioniert"

echo ""
echo "   ✓ Commit erstellt"
echo ""

# Push
read -p "5. Push zu GitHub? (j/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Jj]$ ]]; then
    git push origin v7-dev
    echo ""
    echo "   ✓ Push erfolgreich - Vercel Deployment startet automatisch"
else
    echo "   Push übersprungen - später mit 'git push origin v7-dev'"
fi

echo ""
echo "=== Fertig ==="
