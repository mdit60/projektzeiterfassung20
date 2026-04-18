#!/bin/bash
# ============================================================================
# PZE Git-Sicherung v7.3.89
# ============================================================================
# Datum: 09. Februar 2026
# Sichert aktuellen Stand und dokumentiert Aenderungen
# ============================================================================

set -e
cd ~/Documents/Dev/PZE

echo "============================================"
echo "  PZE Git-Sicherung v7.3.89"
echo "============================================"

# 1. Lock-Datei loeschen
rm -f .git/index.lock

# 2. Branch pruefen
BRANCH=$(git branch --show-current)
echo ""
echo "[1/5] Branch: $BRANCH"
if [ "$BRANCH" != "v7-dev" ]; then
  echo "FEHLER: Falscher Branch! Erwartet: v7-dev"
  exit 1
fi
echo "  -> OK"

# 3. Pflichtenheft kopieren
echo ""
echo "[2/5] Pflichtenheft aktualisieren..."
cp ~/Documents/Dev/PZE/downloads/PFLICHTENHEFT-v4_27.md docs/PFLICHTENHEFT.md
echo "  -> OK"

# 4. Backup erstellen
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="backups/${TIMESTAMP}"
echo ""
echo "[3/5] Backup erstellen: ${BACKUP_DIR}/"
mkdir -p "${BACKUP_DIR}"
cp -r src/components/shared/ "${BACKUP_DIR}/shared-components/"
cp -r src/app/v7/ "${BACKUP_DIR}/v7-pages/"
cp docs/PFLICHTENHEFT.md "${BACKUP_DIR}/"
echo "  -> OK"

# 5. Git commit
echo ""
echo "[4/5] Git commit..."
git add -A
git commit -m "SICHERUNG v7.3.89 (09.02.2026)

Aenderungen v7.3.89:
- TimesheetForm: T/NT-Spalte fuer ZIM_DS (technisch/nicht-technisch)
- Firmen-Projekte-Seite NEU: shared ProjectList statt alte 1200-Zeilen-Seite
- PortalHeader BEREINIGT: Keine Nav mehr, nur Logo (klickbar->Dashboard) + User
- Berater-Dashboard: Temporaerer Redirect (wird bei Modul-Umbau ersetzt)
- Supabase Import Fix: createClient statt createClientComponentClient
- Pflichtenheft v4.27

Naechster Schritt: Modul-Dashboard-Umbau"

# 6. Push
echo ""
echo "[5/5] Push zu v7-dev..."
git push origin v7-dev

echo ""
echo "============================================"
echo "  SICHERUNG ABGESCHLOSSEN!"
echo "============================================"
echo ""
echo "  Branch:       v7-dev"
echo "  Backup:       ${BACKUP_DIR}/"
echo "  Pflichtenheft: v4.27"
echo "  SW-Release:   v7.3.89"
echo ""
