#!/bin/bash
# ============================================================================
# PZE v7.4.2 - ZIM Parser DS-Support
# ============================================================================
# Datum: 26. Februar 2026
#
# Aenderungen:
#   1. Parser: DS-Erkennung, Dual-PM (pm + pm2), is_technical, Sub-APs
#   2. ProjectCreateForm: funding_format aus Parser, is_technical beim AP-Insert
# ============================================================================

set -e

PZE_DIR="$HOME/Documents/Dev/pze"
DOWNLOAD_DIR="$HOME/Documents/Dev/pze/downloads"

echo "================================================"
echo "PZE v7.4.2 - ZIM Parser DS-Support"
echo "================================================"
echo ""

if [ ! -d "$PZE_DIR/src" ]; then
    echo "FEHLER: Projektverzeichnis $PZE_DIR/src nicht gefunden!"
    exit 1
fi

# 1. Parser API-Route ersetzen
echo "[1/4] ZIM Parser aktualisieren..."
cp "$DOWNLOAD_DIR/parse-zim-route-v7_4_2.ts" \
   "$PZE_DIR/src/app/api/parse-zim/route.ts"
echo "      -> src/app/api/parse-zim/route.ts"

# 2. ProjectCreateForm ersetzen
echo "[2/4] ProjectCreateForm aktualisieren..."
cp "$DOWNLOAD_DIR/ProjectCreateForm-v7_4_2.tsx" \
   "$PZE_DIR/src/components/shared/ProjectCreateForm.tsx"
echo "      -> src/components/shared/ProjectCreateForm.tsx"

# 3. Git commit
echo "[3/4] Git commit..."
cd "$PZE_DIR"
git add -A
git commit -m "v7.4.2: ZIM Parser DS-Support (Dual-PM, is_technical, Sub-APs, funding_format)"

# 4. Git push (main + v7-dev)
echo "[4/4] Git push..."
git push origin v7-dev
git push origin main

echo ""
echo "================================================"
echo "Fertig! Warte auf Vercel Deployment."
echo "================================================"
echo ""
echo "Test: Berater-Portal > Neue Firma > Neues Projekt > PDF Import"
echo "   -> DS-PDF hochladen -> Pruefe:"
echo "      - Foerderformat = ZIM Durchfuehrbarkeitsstudie"
echo "      - AP1, AP2, AP7, AP8 = nicht-technisch (PM aus pm2)"
echo "      - AP3-AP6 = technisch (PM aus pm)"
echo "      - Sub-APs: AP2.1, AP2.2 korrekt"
echo ""
