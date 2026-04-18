#!/bin/bash
# ============================================================================
# PZE Deploy Script - v7.3.91
# ============================================================================
# Datum: 15. Februar 2026
#
# 1. .env.local wiederherstellen (nach frischem Clone)
# 2. mein-status-page installieren
# ============================================================================

set -e

# Projektverzeichnis
PZE_DIR="$HOME/Documents/Dev/PZE"
DOWNLOADS="$PZE_DIR/downloads"

echo "============================================"
echo "PZE Deploy v7.3.91"
echo "============================================"
echo ""

# Pruefen ob Projektverzeichnis existiert
if [ ! -d "$PZE_DIR" ]; then
  echo "FEHLER: $PZE_DIR nicht gefunden!"
  exit 1
fi

cd "$PZE_DIR"

# ============================================
# 1. .env.local wiederherstellen
# ============================================
echo "--- 1. .env.local pruefen ---"

if [ -f "$PZE_DIR/.env.local" ]; then
  echo "  .env.local existiert bereits - ueberspringe"
else
  echo "  .env.local fehlt - erstelle neu..."
  cat > "$PZE_DIR/.env.local" << 'ENVEOF'
NEXT_PUBLIC_SUPABASE_URL=https://jaiyycmstgepxaqsvnjd.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImphaXl5Y21zdGdlcHhhcXN2bmpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0MDg5OTQsImV4cCI6MjA3ODk4NDk5NH0.auvuLDPOyvAprUwltV3Q7CFsaRo6VZneoj7sX2C-MPc
ENVEOF
  echo "  .env.local erstellt"
fi

echo ""

# ============================================
# 2. Mein Status Seite installieren
# ============================================
echo "--- 2. Mein Status Seite (v7.3.91) ---"

# Zielverzeichnis erstellen falls noetig
mkdir -p "$PZE_DIR/src/app/v7/firma/mein-status"

# Datei kopieren
if [ -f "$DOWNLOADS/mein-status-page-v7_3_91.tsx" ]; then
  cp "$DOWNLOADS/mein-status-page-v7_3_91.tsx" "$PZE_DIR/src/app/v7/firma/mein-status/page.tsx"
  echo "  mein-status-page-v7_3_91.tsx -> src/app/v7/firma/mein-status/page.tsx"
else
  echo "  WARNUNG: mein-status-page-v7_3_91.tsx nicht in downloads gefunden!"
fi

echo ""

# ============================================
# 3. Branch pruefen
# ============================================
echo "--- 3. Git Branch pruefen ---"
CURRENT_BRANCH=$(git branch --show-current)
echo "  Aktueller Branch: $CURRENT_BRANCH"

if [ "$CURRENT_BRANCH" != "v7-dev" ]; then
  echo "  WARNUNG: Nicht auf v7-dev! Wechsle..."
  git checkout v7-dev
fi

echo ""

# ============================================
# Fertig
# ============================================
echo "============================================"
echo "Deployment abgeschlossen!"
echo ""
echo "Naechste Schritte:"
echo "  1. pnpm dev        (Server starten)"
echo "  2. Testen: http://localhost:3000/v7/firma/mein-status"
echo "  3. git add -A && git commit -m 'v7.3.91: Mein Status Seite'"
echo "  4. git push origin v7-dev"
echo "============================================"
