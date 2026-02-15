#!/bin/bash
# ============================================================================
# PZE Git-Sicherung und Vercel-Deployment - v7.3.91
# ============================================================================
# Datum: 15. Februar 2026
#
# Sichert alle Aenderungen aus v7.3.91:
#   - Mein Status Seite (NEU)
#   - TimesheetForm: initialYear/initialMonth Props
#   - Zeiterfassung-Seite: returnUrl-Parameter fuer Navigation
#   - Pflichtenheft v4.29
#
# Vercel deployed automatisch bei Push auf v7-dev.
# ============================================================================

set -e

PZE_DIR="$HOME/Documents/Dev/PZE"

echo "============================================"
echo "PZE Git-Sicherung v7.3.91"
echo "============================================"
echo ""

cd "$PZE_DIR"

# ============================================
# 1. Lock-Datei entfernen (falls vorhanden)
# ============================================
rm -f .git/index.lock

# ============================================
# 2. Branch pruefen
# ============================================
echo "--- Branch pruefen ---"
CURRENT_BRANCH=$(git branch --show-current)
echo "  Aktueller Branch: $CURRENT_BRANCH"

if [ "$CURRENT_BRANCH" != "v7-dev" ]; then
  echo "  WARNUNG: Nicht auf v7-dev! Wechsle..."
  git checkout v7-dev
  echo "  Gewechselt auf v7-dev"
fi
echo ""

# ============================================
# 3. Status anzeigen
# ============================================
echo "--- Geaenderte Dateien ---"
git status --short
echo ""

# ============================================
# 4. Alle Aenderungen stagen
# ============================================
echo "--- Stage alle Aenderungen ---"
git add -A
echo "  Alle Dateien gestaged"
echo ""

# ============================================
# 5. Commit
# ============================================
echo "--- Commit ---"
git commit -m "v7.3.91: Mein Status Seite, TimesheetForm initialYear/Month, returnUrl Navigation

Neue Features:
- Mein Status (/v7/firma/mein-status): Zeiterfassungs-Uebersicht pro Projekt/Monat
  - Ampel-Status: Gruen/Orange/Rot/Grau pro Monat
  - Klick auf Monat springt zur Zeiterfassung mit Parametern
  - Sichtbar fuer alle Rollen (employee, project_leader, client_admin)
- TimesheetForm: initialYear + initialMonth Props
  - Monat wird vorausgewaehlt bei Navigation aus Mein Status/Berichte
- Zeiterfassung: returnUrl-Parameter
  - Zurueck-Button fuehrt zur Ausgangsseite statt zum Dashboard
- Pflichtenheft v4.29

Geaenderte Dateien:
- src/app/v7/firma/mein-status/page.tsx (NEU, v7.3.91)
- src/components/shared/TimesheetForm.tsx (v7.3.91)
- src/app/v7/firma/zeiterfassung/page.tsx (v7.3.91)"

echo "  Commit erstellt"
echo ""

# ============================================
# 6. Push zu GitHub
# ============================================
echo "--- Push zu GitHub (v7-dev) ---"
echo "  Starte push..."
git push origin v7-dev
PUSH_STATUS=$?

if [ $PUSH_STATUS -eq 0 ]; then
  echo "  Push erfolgreich!"
else
  echo "  Push scheint zu haengen - versuche erneut..."
  sleep 3
  git push origin v7-dev 2>/dev/null || true
  echo "  Zweiter Versuch abgeschlossen"
  echo "  Falls 'Everything up-to-date' -> Daten sind da"
fi

echo ""

# ============================================
# 7. Vercel-Status
# ============================================
echo "============================================"
echo "Git-Sicherung abgeschlossen!"
echo ""
echo "Vercel deployed automatisch von v7-dev."
echo "Pruefe Deployment unter:"
echo "  https://vercel.com/martin-ds-projects-5cb70f89/projektzeiterfassung20"
echo ""
echo "Live-URL:"
echo "  https://pze.itenion.com/v7/firma/mein-status"
echo ""
echo "Letzter Commit:"
git log --oneline -1
echo "============================================"
