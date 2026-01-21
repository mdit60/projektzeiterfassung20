#!/bin/bash
# ============================================================================
# PZE V7 - Deploy Script v7.3.62
# ============================================================================
# Datum: 21. Januar 2026
#
# FIX: MA-Zuordnung zu Arbeitspaketen - Henne-Ei-Problem geloest
#
# Aenderungen:
# - WorkPackageAssignmentModal: Zeigt ALLE Firmen-MA, nicht nur projekt-zugeordnete
# - ProjectDetailPage (Shared): Team-Tab Button entfernt, Hinweis hinzugefuegt
# - Suchfeld fuer MA-Auswahl bei vielen Mitarbeitern
# ============================================================================

echo "=================================================="
echo "PZE V7 - Deploy v7.3.62"
echo "FIX: MA-Zuordnung zu Arbeitspaketen"
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
# 1. SHARED COMPONENTS
# ============================================================================

echo "1. Shared Components..."

if [ -f "$HOME/Downloads/WorkPackageAssignmentModal-v7_3_62.tsx" ]; then
    cp "$HOME/Downloads/WorkPackageAssignmentModal-v7_3_62.tsx" \
       "$DEST/src/components/shared/WorkPackageAssignmentModal.tsx"
    echo "   ✓ WorkPackageAssignmentModal.tsx"
else
    echo "   ✗ WorkPackageAssignmentModal-v7_3_62.tsx nicht gefunden"
fi

if [ -f "$HOME/Downloads/ProjectDetailPage-v7_3_62.tsx" ]; then
    cp "$HOME/Downloads/ProjectDetailPage-v7_3_62.tsx" \
       "$DEST/src/components/shared/ProjectDetailPage.tsx"
    echo "   ✓ ProjectDetailPage.tsx"
else
    echo "   ✗ ProjectDetailPage-v7_3_62.tsx nicht gefunden"
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
echo "  - src/components/shared/WorkPackageAssignmentModal.tsx"
echo "  - src/components/shared/ProjectDetailPage.tsx"
echo ""
echo "WICHTIG: Die page.tsx Dateien bleiben unveraendert!"
echo "         Sie sind nur Wrapper fuer die Shared Components."
echo ""
echo "Naechste Schritte:"
echo "  1. cd $DEST"
echo "  2. npm run dev"
echo "  3. Neues Projekt anlegen und MA zu AP zuordnen testen"
echo "  4. git add . && git commit -m 'v7.3.62: Fix MA-Zuordnung zu Arbeitspaketen'"
echo "  5. git push origin v7-dev"
echo ""
