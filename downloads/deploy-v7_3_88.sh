#!/bin/bash
# ============================================================================
# PZE V7 - Git Commit & Deploy Script
# Version: 7.3.88
# Datum: 05. Februar 2026
# ============================================================================

cd ~/Documents/Dev/PZE

echo "=============================================="
echo "  PZE V7.3.88 - Git Commit & Deploy"
echo "  Berichte-Modul implementiert"
echo "=============================================="
echo ""

# 1. Status anzeigen
echo "1. Geaenderte Dateien:"
echo "----------------------------------------------"
git status --short
echo ""

# 2. Build testen
echo "2. TypeScript Build testen..."
echo "----------------------------------------------"
npm run build 2>&1 | head -50

if [ $? -eq 0 ]; then
    echo ""
    echo "=============================================="
    echo "  BUILD ERFOLGREICH"
    echo "=============================================="
    echo ""
    
    # 3. Alle Aenderungen stagen
    echo "3. Aenderungen stagen..."
    git add -A
    echo ""
    
    # 4. Status nach Stage
    echo "4. Staged Files:"
    echo "----------------------------------------------"
    git status --short
    echo ""
    
    # 5. Commit
    echo "5. Git Commit..."
    read -p "Commit durchfuehren? (j/n) " CONFIRM
    if [ "$CONFIRM" = "j" ]; then
        git commit -m "v7.3.88: Berichte-Modul implementiert

NEUE FEATURES:
- Berichte-Seite fuer Firmen-Portal (/v7/firma/berichte)
- Berichte-Seite fuer Berater-Portal (/v7/berater/foerderung/firma/[id]/berichte)
- Kennzahlen-Leiste: Foerderprojekte, MA, Plan-PM, Ist-PM
- Projekt-Uebersicht mit Fortschrittsbalken und Ampel-Status
- Zeiterfassungs-Status pro MA mit Vollstaendig/Offen/Fehlt
- URL-Parameter fuer Zeiterfassung (employee, year, month)

ROLLENBASIERTE NAVIGATION:
- client_admin: Volle Navigation
- project_leader: Navigation + Zeiterfassung
- employee: Nur Header + Zeiterfassung (kein Navi-Menu)
- Sicherheit: Normale MA sehen nur eigene ID

BERATER-PORTAL:
- Firmenansicht: Neue Tabs Zeiterfassung + Berichte
- Blauer Header beibehalten

DATEIEN:
- src/app/v7/firma/berichte/page.tsx (NEU)
- src/app/v7/berater/foerderung/firma/[id]/berichte/page.tsx (NEU)
- src/app/v7/firma/zeiterfassung/page.tsx (aktualisiert)
- src/app/v7/berater/foerderung/firma/[id]/page.tsx (aktualisiert)
- src/components/shared/TimesheetForm.tsx (aktualisiert)
- docs/PFLICHTENHEFT.md (v4.25)"

        echo ""
        echo "Commit erstellt."
        echo ""
        
        # 6. Push
        echo "6. Push zu v7-dev..."
        read -p "Push durchfuehren? (j/n) " PUSH
        if [ "$PUSH" = "j" ]; then
            git push origin v7-dev
            echo ""
            echo "=============================================="
            echo "  PUSH ERFOLGREICH"
            echo "=============================================="
            echo ""
            
            # 7. Vercel Deployment Info
            echo "7. Vercel Deployment"
            echo "----------------------------------------------"
            echo "Auto-Deploy aktiv bei Push zu main."
            echo ""
            read -p "Merge zu main und Deploy? (j/n) " DEPLOY
            if [ "$DEPLOY" = "j" ]; then
                git checkout main
                git merge v7-dev
                git push origin main
                echo ""
                echo "=============================================="
                echo "  DEPLOYED!"
                echo "=============================================="
                echo ""
                echo "Vercel Dashboard: https://vercel.com/dashboard"
                echo "Live URL wird in ca. 1-2 Minuten aktualisiert"
                echo ""
                git checkout v7-dev
            fi
        fi
    fi
else
    echo ""
    echo "=============================================="
    echo "  BUILD FEHLGESCHLAGEN"
    echo "=============================================="
    echo ""
    echo "Bitte Fehler oben pruefen!"
    echo ""
fi

echo ""
echo "Fertig!"
echo ""
