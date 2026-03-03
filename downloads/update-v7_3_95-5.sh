#!/bin/bash
# ============================================================================
# PZE v7.3.95-5 - Mein Status + FAQ PDF Download
# ============================================================================

cd "$HOME/Documents/Dev/PZE" || { echo "FEHLER: PZE-Verzeichnis nicht gefunden!"; exit 1; }

echo "=========================================="
echo "PZE v7.3.95-5 - FAQ Download"
echo "=========================================="

DOWNLOADS="./downloads"
STATUS_TARGET="./src/app/v7/firma/mein-status"
MANUALS_TARGET="./public/manuals"

# 1. Mein-Status Page aktualisieren
FILE="mein-status-page-v7_3_95-5.tsx"
if [ ! -f "$DOWNLOADS/$FILE" ]; then
  echo "FEHLER: $DOWNLOADS/$FILE nicht gefunden!"
  exit 1
fi

echo ""
echo "1/5 Backup Status-Page..."
if [ -f "$STATUS_TARGET/page.tsx" ]; then
  cp "$STATUS_TARGET/page.tsx" "$STATUS_TARGET/page.tsx.bak-$(date +%Y%m%d-%H%M%S)"
fi
cp "$DOWNLOADS/$FILE" "$STATUS_TARGET/page.tsx"
echo "     page.tsx aktualisiert."

# 2. FAQ PDF in public/manuals kopieren
echo ""
echo "2/5 FAQ PDF kopieren..."
mkdir -p "$MANUALS_TARGET"
FAQ_PDF="PZE-FAQ-Zeiterfassung-v1.pdf"
if [ -f "$DOWNLOADS/$FAQ_PDF" ]; then
  cp "$DOWNLOADS/$FAQ_PDF" "$MANUALS_TARGET/$FAQ_PDF"
  echo "     $FAQ_PDF nach public/manuals kopiert."
else
  echo "     WARNUNG: $FAQ_PDF nicht in downloads gefunden!"
  echo "     Bitte manuell nach public/manuals kopieren."
fi

# 3. UTF-8 Check
echo ""
echo "3/5 UTF-8 Check..."
if file "$STATUS_TARGET/page.tsx" | grep -q "ASCII\|UTF-8"; then
  echo "     UTF-8 OK"
fi

# 4. Git Deploy
echo ""
echo "4/5 Git Deploy (v7-dev)..."
git checkout v7-dev
git add "$STATUS_TARGET/page.tsx"
git add "$MANUALS_TARGET/$FAQ_PDF" 2>/dev/null
git commit -m "v7.3.95-5: Mein Status - FAQ Zeiterfassung PDF Download"
git push origin v7-dev

# 5. Merge auf main
echo ""
echo "5/5 Merge auf main..."
git checkout main
git merge v7-dev -m "merge v7.3.95-5: FAQ PDF Download"
git push origin main
git checkout v7-dev

echo ""
echo "=========================================="
echo "FERTIG!"
echo ""
echo "WICHTIG: Falls die FAQ-PDF nicht automatisch"
echo "kopiert wurde, bitte manuell kopieren:"
echo "  cp downloads/$FAQ_PDF public/manuals/"
echo "=========================================="
