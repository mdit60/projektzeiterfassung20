#!/bin/bash
# ============================================================================
# PZE v7.3.95 - Git Sicherung und Deployment
# ============================================================================
# Aenderungen:
# - ProjectTeamManager: Lfd. Nr. im Edit-Dialog jetzt aenderbar
# - EmployeeManagement: Anlage 6.1 Bereich entfernt (projektspezifisch)
# ============================================================================

set -e

cd ~/Documents/Dev/PZE

echo "============================================"
echo "PZE v7.3.95 - Git Sicherung & Deployment"
echo "============================================"
echo ""

# 1. Aktuellen Branch pruefen
BRANCH=$(git branch --show-current)
echo "Aktueller Branch: $BRANCH"

if [ "$BRANCH" != "v7-dev" ]; then
  echo "WARNUNG: Nicht auf v7-dev! Wechsle..."
  git checkout v7-dev
fi

echo ""

# 2. Status anzeigen
echo "--- Git Status ---"
git status --short
echo ""

# 3. Alle Aenderungen stagen
echo "--- Stage alle Aenderungen ---"
git add -A
echo ""

# 4. Commit auf v7-dev
echo "--- Commit auf v7-dev ---"
git commit -m "v7.3.95: ProjectTeamManager lfd. Nr. aenderbar, EmployeeManagement Anlage 6.1 entfernt

- ProjectTeamManager: Lfd. Nr. im Bearbeiten-Dialog jetzt aenderbar (nicht mehr disabled)
  Duplikat-Pruefung bei Nummernvergabe, employee_number wird beim Speichern mitgeschrieben
- EmployeeManagement: Gesamter Persoenliche Daten (Anlage 6.1) Bereich entfernt
  Grund: Lfd. Nr., Stundensatz, Jahresbrutto sind projektspezifisch
  Gehoeren in ProjectTeamManager (Projekt > Team > Bearbeiten)
- Beibehalten in MA-Verwaltung: Name, E-Mail, Portal-Rolle, Position, Qualifikation, pWAZ"

echo ""

# 5. Push v7-dev (Vercel Dev-Deployment)
echo "--- Push v7-dev ---"
git push origin v7-dev
echo ""

# 6. Merge in main (Produktion)
echo "--- Merge in main fuer Produktion ---"
git checkout main
git merge v7-dev -m "Merge v7.3.95: ProjectTeamManager + EmployeeManagement Korrekturen"
git push origin main
echo ""

# 7. Zurueck auf v7-dev
echo "--- Zurueck auf v7-dev ---"
git checkout v7-dev
echo ""

echo "============================================"
echo "FERTIG! Vercel deployt automatisch:"
echo "  - v7-dev -> Preview"
echo "  - main   -> Production (pze.itenion.com)"
echo "============================================"
