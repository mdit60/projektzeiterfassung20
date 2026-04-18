#!/bin/bash
# ============================================================================
# PZE V7.3.87 - Git Status Check und Force Push
# ============================================================================

cd ~/Documents/Dev/PZE

echo "=== Git Status Check ==="
echo ""

# Prüfe ob es uncommitted changes gibt
echo "1. Uncommitted Changes:"
git status --short
echo ""

# Zeige letzten Commit
echo "2. Letzter Commit:"
git log -1 --oneline
echo ""

# Prüfe ob local ahead of remote
echo "3. Local vs Remote:"
git status -sb
echo ""

# Falls es Änderungen gibt, committen
if [[ -n $(git status --porcelain) ]]; then
    echo "Es gibt uncommitted changes - committe jetzt..."
    git add -A
    git commit -m "v7.3.87-1: Bugfixes Team-Management

- Lösch-Button für Team-Mitglieder
- loadProjectData -> loadData Fix
- colors.button -> colors.buttonBg Fix"
    echo ""
fi

# Force Push
echo "4. Push zu GitHub..."
git push origin v7-dev --force-with-lease
echo ""

echo "=== Fertig ==="
echo ""
echo "Vercel sollte jetzt automatisch neu deployen."
echo "Prüfe in Vercel Dashboard ob neues Deployment startet."
