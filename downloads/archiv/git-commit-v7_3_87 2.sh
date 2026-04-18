#!/bin/bash
# ============================================================================
# PZE V7.3.87 - Git Commit und Push
# Datum: 03. Februar 2026
# ============================================================================

cd ~/Documents/Dev/PZE

echo "=== PZE V7.3.87 - Git Sicherung ==="
echo ""

# Status anzeigen
echo "Geänderte Dateien:"
echo "------------------"
git status --short
echo ""

# Commit
git add -A

git commit -m "v7.3.87: Team-Management und Excel-Arbeitsplan Import

NEUE FEATURES:
- Projekt-Team Management im Tab 'Team'
  - MA aus Firmenstamm zum Projekt hinzufügen
  - Lfd. Nr. (Anlage 6.1), Stundensatz, Rolle vergeben
  - MA entfernen (nur wenn keine Zeiterfassung vorhanden)
  - MA bearbeiten (Stundensatz, Rolle, Zeitraum)
  
- Excel-Arbeitsplan Vorlage
  - Projektspezifische Vorlage mit Team-MA im Header
  - 3-zeiliger Header: MA-Nr / Name / PM
  - Beispielzeile, Summen-Formeln
  
- Excel-Import (UI vorbereitet, Backend fertig)
  - Vorschau vor Import
  - Neue/Geänderte/Unveränderte APs erkennen

NEUE KOMPONENTEN:
- ProjectTeamManager.tsx - Team-Verwaltung
- ArbeitsplanImport.tsx - Excel Download/Upload UI

NEUE API ROUTES:
- /api/v7/arbeitsplan-vorlage - Excel-Vorlage generieren
- /api/v7/arbeitsplan-import - Excel parsen und importieren

DB-MIGRATION:
- v7_project_assignments erweitert:
  - employee_number (lfd. Nr. gem. Anlage 6.1)
  - hourly_rate (projektspez. Stundensatz)

ABHÄNGIGKEITEN:
- exceljs

BUGFIXES:
- colors.button -> colors.buttonBg (TypeScript)
- loadProjectData -> loadData (ReferenceError)
- clientCompanyId Fallback für Berater-Portal"

echo ""
echo "✅ Commit erstellt"
echo ""

# Push
read -p "Push zu GitHub? (j/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Jj]$ ]]; then
    git push origin v7-dev
    echo ""
    echo "✅ Push erfolgreich - Vercel Deployment startet automatisch"
else
    echo "Push übersprungen - später mit 'git push origin v7-dev'"
fi

echo ""
echo "=== Fertig ==="
