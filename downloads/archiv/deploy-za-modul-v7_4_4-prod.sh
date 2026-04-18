#!/bin/bash
# ============================================================================
# PZE Deployment Script - ZA-Modul v7.4.4 auf PROD (main)
# Datum: 03. Maerz 2026
# ============================================================================
#
# VORAUSSETZUNGEN:
# 1. PROD-SQL-Migration bereits in Supabase PROD-DB ausgefuehrt
# 2. Du bist im Projektverzeichnis: cd ~/Documents/Dev/PZE
#
# ANLEITUNG:
# 1. Dateien aus ~/Documents/Dev/PZE/downloads/ holen (wie immer)
# 2. Dieses Script ausfuehren: bash deploy-za-modul-v7_4_4-prod.sh
# ============================================================================

set -e

echo "============================================"
echo "PZE ZA-Modul v7.4.4 - Deployment auf PROD"
echo "============================================"
echo ""

# Pruefen ob wir im richtigen Verzeichnis sind
if [ ! -f "package.json" ]; then
  echo "FEHLER: Bitte zuerst in das PZE-Projektverzeichnis wechseln!"
  echo "  cd ~/Documents/Dev/PZE"
  exit 1
fi

# Aktuellen Branch pruefen
CURRENT_BRANCH=$(git branch --show-current)
echo "Aktueller Branch: $CURRENT_BRANCH"
echo ""

# SICHERHEITSABFRAGE
echo "ACHTUNG: Dieses Script deployt auf den MAIN Branch (PROD)!"
echo "Hast du die SQL-Migration in der PROD-DB bereits ausgefuehrt? (j/n)"
read -r CONFIRM
if [ "$CONFIRM" != "j" ]; then
  echo "Abgebrochen. Bitte zuerst SQL-Migration ausfuehren."
  exit 1
fi

echo ""
echo "--- Schritt 1: Zu main wechseln ---"
git checkout main
git pull origin main

echo ""
echo "--- Schritt 2: Dateien aus Downloads kopieren ---"

DOWNLOADS="$HOME/Documents/Dev/PZE/downloads"

# ProjectDetailPage
if [ -f "$DOWNLOADS/ProjectDetailPage-v7_4_4-1.tsx" ]; then
  cp "$DOWNLOADS/ProjectDetailPage-v7_4_4-1.tsx" src/components/shared/ProjectDetailPage.tsx
  echo "  ProjectDetailPage.tsx aktualisiert"
else
  echo "  WARNUNG: ProjectDetailPage-v7_4_4-1.tsx nicht gefunden in downloads!"
fi

# ProjectTeamManager
if [ -f "$DOWNLOADS/ProjectTeamManager-v7_4_4-1.tsx" ]; then
  cp "$DOWNLOADS/ProjectTeamManager-v7_4_4-1.tsx" src/components/shared/ProjectTeamManager.tsx
  echo "  ProjectTeamManager.tsx aktualisiert"
else
  echo "  WARNUNG: ProjectTeamManager-v7_4_4-1.tsx nicht gefunden in downloads!"
fi

echo ""
echo "--- Schritt 3: Git Commit und Push ---"
git add -A
git status
echo ""
echo "Aenderungen committen und pushen? (j/n)"
read -r CONFIRM2
if [ "$CONFIRM2" != "j" ]; then
  echo "Abgebrochen."
  exit 1
fi

git commit -m "v7.4.4: ZA-Modul - ProjectDetailPage + ProjectTeamManager (Anlage 6.1 projektbezogen, T/NT Zuschlag, bewilligte Kosten)"
git push origin main

echo ""
echo "--- Schritt 4: Zurueck zu v7-dev ---"
git checkout v7-dev
git pull origin v7-dev

# Aenderungen auch in v7-dev uebernehmen
git merge main --no-edit
git push origin v7-dev

echo ""
echo "============================================"
echo "FERTIG! Vercel deployt jetzt automatisch."
echo "============================================"
echo ""
echo "Pruefe auf https://pze.itenion.com:"
echo "  1. Projekt oeffnen -> Bearbeiten -> ZA-Felder sichtbar?"
echo "  2. Team-Tab -> MA bearbeiten -> Monatsgehalt + Anlage 6.1?"
echo "  3. Stundensatz wird korrekt berechnet?"
echo ""
