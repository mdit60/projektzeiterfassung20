#!/bin/bash
# ============================================================================
# PZE V7 - Git Commit Script
# Version: 7.3.86-4
# Datum: 03. Februar 2026
# ============================================================================

cd ~/Documents/Dev/PZE

echo "=== PZE V7.3.86-4 Git Commit ==="
echo ""

# Status anzeigen
echo "Geänderte Dateien:"
git status --short
echo ""

# Alle Änderungen stagen
git add -A

# Commit mit detaillierter Nachricht
git commit -m "v7.3.86-4: Fehlzeiten-Bug, Header-Navigation, Umlaute

BUGFIX - Fehlzeiten (U/K/S) Speicherung:
- DB-Constraint erfordert: work_package_id und absence_code schließen sich aus
- Bei Fehlzeiten wird jetzt work_package_id: null gesetzt
- hours wird auf 8 gesetzt statt 0
- Lade-Logik erkennt Fehlzeiten-Einträge ohne work_package_id

UI-KORREKTUREN:
- PortalHeader: Navigation komplett entfernt (nur 'Wer bin ich')
- Navigation ist jetzt ausschließlich in PortalNav
- Keine doppelte Navigation mehr im Firmen-Portal

UTF-8 UMLAUTE KORRIGIERT:
- login-page: Passwort-Placeholder, Footer
- berater-page: Förderberatung, Öffnen, Förderprojekte
- PortalNav: Förderung statt Foerderung
- ProjectDetailPage: Übersicht, Zurück, für, etc.

Geänderte Dateien:
- src/app/login/page.tsx (v7.3.86-1)
- src/app/v7/berater/page.tsx (v7.3.86-2)
- src/components/shared/PortalHeader.tsx (v7.3.86-3)
- src/components/shared/PortalNav.tsx (v7.3.86-3)
- src/components/shared/ProjectDetailPage.tsx (v7.3.86-3)
- src/components/shared/TimesheetForm.tsx (v7.3.86-4)"

echo ""
echo "Commit erstellt. Push mit:"
echo "  git push origin v7-dev"
echo ""
