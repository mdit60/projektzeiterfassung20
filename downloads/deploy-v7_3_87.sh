#!/bin/bash
# ============================================================================
# PZE V7.3.87 - VOLLSTÄNDIGES DEPLOYMENT SCRIPT
# Arbeitsplan Excel Import Feature
# Datum: 03. Februar 2026
# ============================================================================
#
# NEUE FEATURES:
# - Team zuerst zusammenstellen (MA aus Firma + lfd. Nr. vergeben)
# - Excel-Vorlage projektspezifisch herunterladen
# - Arbeitsplan aus Excel importieren
#
# ============================================================================

set -e  # Bei Fehler abbrechen

echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║           PZE V7.3.87 - DEPLOYMENT                              ║"
echo "║           Arbeitsplan Excel Import Feature                       ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""

cd ~/Documents/Dev/PZE

# ============================================================================
# SCHRITT 1: ExcelJS installieren
# ============================================================================
echo "┌──────────────────────────────────────────────────────────────────┐"
echo "│ SCHRITT 1: ExcelJS installieren                                  │"
echo "└──────────────────────────────────────────────────────────────────┘"
echo ""
npm install exceljs
echo ""
echo "✅ ExcelJS installiert"
echo ""

# ============================================================================
# SCHRITT 2: Komponenten kopieren
# ============================================================================
echo "┌──────────────────────────────────────────────────────────────────┐"
echo "│ SCHRITT 2: Komponenten kopieren                                  │"
echo "└──────────────────────────────────────────────────────────────────┘"
echo ""

# Team-Manager
echo "→ ProjectTeamManager.tsx"
cp ~/Documents/Dev/PZE/downloads/ProjectTeamManager-v7_3_87.tsx src/components/shared/ProjectTeamManager.tsx

# Import-Komponente
echo "→ ArbeitsplanImport.tsx"
cp ~/Documents/Dev/PZE/downloads/ArbeitsplanImport-v7_3_87.tsx src/components/shared/ArbeitsplanImport.tsx

# ProjectDetailPage (aktualisiert)
echo "→ ProjectDetailPage.tsx"
cp ~/Documents/Dev/PZE/downloads/ProjectDetailPage-v7_3_87.tsx src/components/shared/ProjectDetailPage.tsx

echo ""
echo "✅ Komponenten kopiert"
echo ""

# ============================================================================
# SCHRITT 3: API Routes anlegen
# ============================================================================
echo "┌──────────────────────────────────────────────────────────────────┐"
echo "│ SCHRITT 3: API Routes anlegen                                    │"
echo "└──────────────────────────────────────────────────────────────────┘"
echo ""

# Verzeichnisse erstellen
mkdir -p src/app/api/v7/arbeitsplan-vorlage
mkdir -p src/app/api/v7/arbeitsplan-import

# Routes kopieren
echo "→ arbeitsplan-vorlage/route.ts"
cp ~/Documents/Dev/PZE/downloads/arbeitsplan-vorlage-route-v7_3_87.ts src/app/api/v7/arbeitsplan-vorlage/route.ts

echo "→ arbeitsplan-import/route.ts"
cp ~/Documents/Dev/PZE/downloads/arbeitsplan-import-route-v7_3_87.ts src/app/api/v7/arbeitsplan-import/route.ts

echo ""
echo "✅ API Routes angelegt"
echo ""

# ============================================================================
# SCHRITT 4: Build testen
# ============================================================================
echo "┌──────────────────────────────────────────────────────────────────┐"
echo "│ SCHRITT 4: Build testen                                          │"
echo "└──────────────────────────────────────────────────────────────────┘"
echo ""

npm run build

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Build erfolgreich!"
    echo ""
else
    echo ""
    echo "❌ Build fehlgeschlagen - bitte Fehler prüfen"
    echo ""
    exit 1
fi

# ============================================================================
# SCHRITT 5: Git Commit
# ============================================================================
echo "┌──────────────────────────────────────────────────────────────────┐"
echo "│ SCHRITT 5: Git Commit                                            │"
echo "└──────────────────────────────────────────────────────────────────┘"
echo ""

git add -A
git status

echo ""
read -p "Commit erstellen? (j/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Jj]$ ]]; then
    git commit -m "v7.3.87: Arbeitsplan Excel Import Feature

NEUE FEATURES:
- Projekt-Team Management: MA aus Firma auswählen + lfd. Nr. vergeben
- Excel-Vorlage Download: Projektspezifisch mit MA-Namen und Nummern
- Excel-Import: Arbeitspakete aus Excel importieren mit Vorschau

NEUE KOMPONENTEN:
- ProjectTeamManager.tsx: Team-Tab im Projekt (ersetzt alte Team-Tabelle)
- ArbeitsplanImport.tsx: Download/Upload Buttons + Import-Dialog

AKTUALISIERTE KOMPONENTEN:
- ProjectDetailPage.tsx: Integriert Team-Manager und Import-Buttons

NEUE API ROUTES:
- /api/v7/arbeitsplan-vorlage: Generiert projektspezifische Excel-Vorlage
- /api/v7/arbeitsplan-import: Parst Excel und importiert APs

ABHÄNGIGKEITEN:
- exceljs (npm install exceljs)

WICHTIG: Nach Deployment DB-Migration ausführen!"

    echo ""
    echo "✅ Commit erstellt"
    echo ""
    
    # Push
    read -p "Push zu GitHub? (j/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Jj]$ ]]; then
        git push origin v7-dev
        echo ""
        echo "✅ Push erfolgreich"
    fi
else
    echo "Commit übersprungen"
fi

echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║                    DEPLOYMENT ABGESCHLOSSEN                       ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""
echo "┌──────────────────────────────────────────────────────────────────┐"
echo "│ ⚠️  WICHTIG: DATENBANK-MIGRATION NICHT VERGESSEN!                │"
echo "│                                                                  │"
echo "│ 1. Öffne Supabase Dashboard → SQL Editor                        │"
echo "│ 2. Kopiere Inhalt von: V7-MIGRATION-PROJECT-TEAM-v7_3_87.sql    │"
echo "│ 3. Ausführen (Run)                                               │"
echo "│                                                                  │"
echo "│ Das fügt zu v7_project_assignments hinzu:                        │"
echo "│ - employee_number (lfd. Nr. gem. Anlage 6.1)                    │"
echo "│ - hourly_rate (projektspezifischer Stundensatz)                 │"
echo "└──────────────────────────────────────────────────────────────────┘"
echo ""
echo "Nach erfolgreicher DB-Migration kannst du testen:"
echo ""
echo "1. Projekt öffnen → Tab 'Team' → 'Mitarbeiter hinzufügen'"
echo "2. MA aus Firmenstamm auswählen, lfd. Nr. vergeben"
echo "3. Tab 'Arbeitspakete' → 'Vorlage' Button → Excel herunterladen"
echo "4. Excel ausfüllen → 'Import' Button → Vorschau prüfen → Importieren"
echo ""
