#!/bin/bash
# ============================================================================
# PZE V7 - Deploy Script v7.3.60
# ============================================================================
# Datum: 21. Januar 2026
#
# FIX: Employee Login-Status Erkennung und Verknuepfung
# - Login-Status wird jetzt korrekt ueber v7_user_profiles geprueft
# - Bereits registrierte Benutzer koennen verknuepft werden
# - Unterschiedliche Icons: Schluessel (neu) vs. Kette (verknuepfen)
# ============================================================================

echo "=================================================="
echo "PZE V7 - Deploy v7.3.60"
echo "FIX: Employee Login-Status & Verknuepfung"
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

echo "1. Shared Components aktualisieren..."

# EmployeeManagement (FIX: Login-Status)
if [ -f "$HOME/Downloads/EmployeeManagement-v7_3_60.tsx" ]; then
    cp "$HOME/Downloads/EmployeeManagement-v7_3_60.tsx" \
       "$DEST/src/components/shared/EmployeeManagement.tsx"
    echo "   ✓ EmployeeManagement.tsx (v7.3.60)"
else
    echo "   ✗ EmployeeManagement-v7_3_60.tsx nicht gefunden!"
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
echo "  - src/components/shared/EmployeeManagement.tsx"
echo ""
echo "Neue Features:"
echo "  - Login-Status wird korrekt angezeigt"
echo "  - Bereits registrierte E-Mails werden erkannt"
echo "  - Verknuepfungs-Option fuer existierende Logins"
echo "  - Unterschiedliche Icons: Schluessel/Kette"
echo ""
echo "Naechste Schritte:"
echo "  1. cd $DEST"
echo "  2. npm run dev"
echo "  3. Mitarbeiter-Seite testen"
echo "  4. git add . && git commit -m 'v7.3.60: Fix Employee Login-Status'"
echo ""
