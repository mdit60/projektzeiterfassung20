#!/bin/zsh
# ============================================================================
# PZE Downloads Cleanup v3 - Whitelist-Ansatz
# Behaelt NUR die aktuell relevanten Dateien (laut Pflichtenheft v4.64)
# Alles andere -> archiv/
# ============================================================================

DOWNLOADS_DIR="$HOME/Documents/Dev/PZE/downloads"
ARCHIV_DIR="$DOWNLOADS_DIR/archiv"

cd "$DOWNLOADS_DIR" || exit 1
mkdir -p "$ARCHIV_DIR"

echo "=== PZE Downloads Cleanup v3 ==="
echo ""

# -------------------------------------------------------
# WHITELIST: Nur diese Dateien werden BEHALTEN
# -------------------------------------------------------
KEEP_FILES=(
    "ProjectDetailPage-v7_4_4-49.tsx"
    "TimesheetForm-v7_4_3-22.tsx"
    "ZAPanel-v7_4_4-30.tsx"
    "BerichtePage-v7_4_4-4.tsx"
    "StundennachweisMatrix-v7_4_4-4.tsx"
    "ProjectTeamManager-v7_4_4-16.tsx"
    "WorkPackageTable-v7_4_3-8.tsx"
    "WorkPackageEditModal-v7_3_85-2.tsx"
    "EmployeeManagement-v7_3_95-7.tsx"
    "FirmendatenCard-v7_4_4-2.tsx"
    "PortalHeader-v7_3_95-4.tsx"
    "PortalNav-v7_4_4-1.tsx"
    "ProjectCreateForm-v7_3_82-9.tsx"
    "ProjectList-v7_3_88-6.tsx"
    "ProjektFortschrittPanel-v7_4_5-4.tsx"
    "NWMPartnerPanel-v7_4_5-4.tsx"
    "NWMEinstellungenPanel-v7_4_5-3.tsx"
    "NWMEigenanteilPanel-v7_4_5-12.tsx"
    "ArbeitsplanImport-v7_3_87-1.tsx"
    "berater-dashboard-v7_4_4-9.tsx"
    "berater-firma-detail-page-v7_4_4-4.tsx"
    "berater-netzwerk-page-v7_4_5-1.tsx"
    "berater-ze-seite-v7_4_0-5.tsx"
    "berater-berichte-page-wrapper-v7_4_4-24.tsx"
    "berichte-page-firma-wrapper-v7_4_4-27.tsx"
    "foerderung-page-v7_4_1-3.tsx"
    "mein-status-page-v7_4_4-10.tsx"
    "firma-dashboard-v7_3_92.tsx"
    "v7-firma-detail-page-v7_4_4-2.tsx"
    "v7-firma-page-redirect-v7_3_42.tsx"
    "page-firma-projekte-v7_3_89.tsx"
    "zeiterfassung-page-v7_3_94.tsx"
    "timesheet-viewer-v7_4_0-8.tsx"
    "login-page-v7_3_90-1.tsx"
    "v7-module-config-v7_3_90-6.ts"
    "v7-types-v7_4_0.ts"
    "arbeitsplan-import-route-v7_3_87-final.ts"
    "create-employee-login-route-v7_3_95-2.ts"
    "parse-zim-pdf-v4_9.py"
    "migration_bescheid_v7_4_5.sql"
    "migration_nwm_dev_setup_v7_4_5.sql"
    "migration_nwm_modul_v7_4_5.sql"
    "migration_timesheet_notes_v7_4_5.sql"
    "migration_za_faellig_v7_4_4.sql"
    "migration_za_modul_v7_4_4.sql"
    "PFLICHTENHEFT-v4_64.md"
    "GIT-SICHERUNG-v7_4_5-session20.md"
    "KONZEPT-ZIM-NETZWERKMANAGEMENT-v1_2.md"
    "KONZEPT-NWM-DATENMODELL-KORREKTUR-v1_1.md"
    "README.md"
    "PZE-Anleitung-Projektleiter-v2_0.docx"
    "PZE_Kurzanleitung_Mitarbeiter_v3.docx"
    "PZE_Schnellstart_Firmen-Administrator_v2.docx"
    "PZE-FAQ-Zeiterfassung-v1.pdf"
    "PZE-FAQ-Zeiterfassung-v1.docx"
    "PZEV7PROJEKTPLANv1_5_1.xlsx"
    "PZE_Supabase_Tabellen_DEV_vs_PROD.xlsx"
    "next.config.ts"
    "tailwind.config.ts"
    "requirements.txt"
    "Procfile"
    "railway.toml"
    "cleanup-downloads.sh"
)

# -------------------------------------------------------
# VERSCHIEBE alles was NICHT in der Whitelist ist
# -------------------------------------------------------
moved=0
kept=0

for f in *(.,@N); do
    [ -e "$f" ] || continue
    [ -d "$f" ] && continue
    
    is_kept=false
    for keep in "${KEEP_FILES[@]}"; do
        if [ "$f" = "$keep" ]; then
            is_kept=true
            break
        fi
    done
    
    if $is_kept; then
        kept=$((kept + 1))
    else
        mv "$f" "$ARCHIV_DIR/" 2>/dev/null
        moved=$((moved + 1))
    fi
done

# Alte Ordner auch verschieben
for d in *(N/); do
    [ "$d" = "archiv" ] && continue
    mv "$d" "$ARCHIV_DIR/" 2>/dev/null
    moved=$((moved + 1))
done

echo ""
echo "=============================="
echo "ERGEBNIS:"
echo "  Behalten:    $kept Dateien"
echo "  Archiviert:  $moved Objekte"
echo "=============================="
echo ""
echo "Behaltene Dateien:"
echo "---"
ls -1 *(.,@N) 2>/dev/null | grep -v archiv | sort
echo "---"
echo ""
echo "Archiv loeschen mit:  rm -rf $ARCHIV_DIR"
