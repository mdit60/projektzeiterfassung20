#!/bin/bash
# ============================================================================
# PZE V7.4.1 - Install Script
# ============================================================================
# Datum: 26. Februar 2026
#
# Aenderungen:
#   1. Neue API-Route /api/v7/create-user (Server-seitige User-Erstellung)
#   2. Foerderung-Seite nutzt jetzt API statt client-seitigem signUp()
#
# VORAUSSETZUNG: SUPABASE_SERVICE_ROLE_KEY muss gesetzt sein!
# ============================================================================

set -e

# Pfad zum Projektverzeichnis
PZE_DIR="$HOME/Documents/Dev/pze"
DOWNLOAD_DIR="$HOME/Documents/Dev/pze/downloads"

echo "================================================"
echo "PZE v7.4.1 Installation"
echo "================================================"
echo ""

# Pruefen ob Projektverzeichnis existiert
if [ ! -d "$PZE_DIR/src" ]; then
    echo "FEHLER: Projektverzeichnis $PZE_DIR/src nicht gefunden!"
    exit 1
fi

# 1. API-Route erstellen
echo "[1/3] API-Route /api/v7/create-user erstellen..."
mkdir -p "$PZE_DIR/src/app/api/v7/create-user"
cp "$DOWNLOAD_DIR/create-user-route-v7_4_1.ts" \
   "$PZE_DIR/src/app/api/v7/create-user/route.ts"
echo "      -> src/app/api/v7/create-user/route.ts"

# 2. Foerderung-Seite ersetzen
echo "[2/3] Foerderung-Seite aktualisieren..."
cp "$DOWNLOAD_DIR/foerderung-page-v7_4_1.tsx" \
   "$PZE_DIR/src/app/v7/berater/foerderung/page.tsx"
echo "      -> src/app/v7/berater/foerderung/page.tsx"

# 3. Service Role Key pruefen
echo "[3/3] Umgebungsvariablen pruefen..."
if [ -f "$PZE_DIR/.env.local" ]; then
    if grep -q "SUPABASE_SERVICE_ROLE_KEY" "$PZE_DIR/.env.local"; then
        echo "      -> SUPABASE_SERVICE_ROLE_KEY in .env.local gefunden"
    else
        echo ""
        echo "  WARNUNG: SUPABASE_SERVICE_ROLE_KEY fehlt in .env.local!"
        echo "  Bitte eintragen:"
        echo "    SUPABASE_SERVICE_ROLE_KEY=dein_service_role_key"
        echo ""
        echo "  Den Key findest du im Supabase Dashboard:"
        echo "    Settings > API > service_role (secret)"
        echo ""
    fi
else
    echo "  WARNUNG: .env.local nicht gefunden!"
fi

echo ""
echo "================================================"
echo "Installation abgeschlossen!"
echo "================================================"
echo ""
echo "WICHTIG - Noch zu tun:"
echo ""
echo "1. SUPABASE_SERVICE_ROLE_KEY pruefen in .env.local"
echo "   (Den Key findest du: Supabase Dashboard > Settings > API > service_role)"
echo ""
echo "2. SUPABASE_SERVICE_ROLE_KEY auch in Vercel setzen:"
echo "   Vercel > PZE Projekt > Settings > Environment Variables"
echo "   Name:  SUPABASE_SERVICE_ROLE_KEY"
echo "   Value: (gleicher Key wie in .env.local)"
echo ""
echo "3. Lokal testen: pnpm dev"
echo "   -> Berater-Portal > Neue Firma anlegen mit Admin"
echo "   -> Du solltest NICHT ausgeloggt werden!"
echo ""
echo "4. Git commit + push auf v7-dev"
echo ""
