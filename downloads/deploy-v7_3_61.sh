#!/bin/bash
# ============================================================================
# PZE V7 - Deploy Script v7.3.61
# ============================================================================
# Datum: 21. Januar 2026
#
# FIX: Dashboard rollenbasierte Ansicht - keine Redundanz mehr
#
# Aenderungen:
# - Admin: Sieht alle Projekte, Firmendaten, Mitarbeiter
# - Projektleiter: Sieht "Meine Projekte" mit Zeiterfassungs-Button
#                  KEINE separate "Meine Zeiterfassung" Box mehr!
# - Mitarbeiter: Grosse Zeiterfassungs-Box + Projektliste zur Info
# ============================================================================

echo "=================================================="
echo "PZE V7 - Deploy v7.3.61"
echo "FIX: Dashboard Rollen-Ansicht"
echo "=================================================="
echo ""

# Zielverzeichnis
DEST="$HOME/Documents/Dev/PZE"

# Pruefen ob Zielverzeichnis existiert
if [ ! -d "$DEST" ]; then
    echo "FEHLER: Zielverzeichnis nicht gefunden: $DEST"
    exit 1
fi

echo "Zielverzeichnis: $DEST"
echo ""

# ============================================================================
# 1. DASHBOARD
# ============================================================================

echo "1. Firma-Dashboard aktualisieren..."

if [ -f "$HOME/Downloads/v7-firma-dashboard-v7_3_61.tsx" ]; then
    cp "$HOME/Downloads/v7-firma-dashboard-v7_3_61.tsx" \
       "$DEST/src/app/v7/firma/dashboard/page.tsx"
    echo "   ✓ Dashboard (v7.3.61)"
else
    echo "   ✗ v7-firma-dashboard-v7_3_61.tsx nicht gefunden!"
fi

echo ""

# ============================================================================
# ZUSAMMENFASSUNG
# ============================================================================

echo "=================================================="
echo "Deploy abgeschlossen!"
echo "=================================================="
echo ""
echo "Geaenderte Dateien:"
echo "  - src/app/v7/firma/dashboard/page.tsx"
echo ""
echo "Rollen-Ansichten:"
echo "  Admin:         Firmendaten | Projekte | Mitarbeiter"
echo "  Projektleiter: Projekte mit ZE-Button (KEINE redundante Box)"
echo "  Mitarbeiter:   Grosse ZE-Box + Projektliste"
echo ""
echo "Naechste Schritte:"
echo "  1. cd $DEST"
echo "  2. npm run dev"
echo "  3. Als PL und MA einloggen und testen"
echo "  4. git add . && git commit -m 'v7.3.61: Fix Dashboard Rollen-Ansicht'"
echo ""
