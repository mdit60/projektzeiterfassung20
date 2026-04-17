# GIT-SICHERUNG - Session 20
# Datum: 18. April 2026
# SW-Release: V7.4.5

## Commits dieser Session

### v7.4.5-20: Compliance Monats-Einschraenkung + Completion-Status Fix
- TimesheetForm-v7_4_3-20: Monatsauswahl eingeschraenkt auf gueltigen Zeitraum
  - employment_start/end aus v7_employees (Firmenzugehoerigkeit)
  - assignment_start/end aus v7_project_assignments (Projektzuordnung)
  - start_date/end_date aus v7_projects (Projektlaufzeit)
  - Ungueltige Monate erscheinen nicht im Dropdown
  - Pfeil-Navigation stoppt an Raendern des erlaubten Bereichs
  - loadCompletionStatus explizit aufgerufen (war nie aufgerufen - Bug-Fix)
- zeiterfassung-page-v7_3_94: Employee-Query + Project-Query erweitert
- berater-ze-seite-v7_4_0-5: Employee-Query + Project-Query erweitert

### v7.4.5-21: Timesheet-Notizen DB-Migration
- migration_timesheet_notes_v7_4_5.sql: Neue Tabelle v7_timesheet_notes
  - Unique Constraint: 1 Notiz pro MA/Projekt/Monat
  - Status: 'offen' / 'erledigt'
  - created_by, resolved_by, resolved_at fuer Nachvollziehbarkeit

### v7.4.5-22: Timesheet-Notizen in Matrix + Dashboard
- StundennachweisMatrix-v7_4_4-4: Oranger Punkt bei offenen Notizen + graue Zellen fuer MA ausserhalb employment/assignment
- BerichtePage-v7_4_4-4: Notes-Query + Employee employment_start/end + assignment_start/end
- berater-dashboard-v7_4_4-9: Offene Rueckfragen-Abschnitt mit Direktlinks zur ZE

### v7.4.5-23: Notiz-Modal ueberarbeitet
- TimesheetForm-v7_4_3-22: Kein Loeschen mehr, Erledigt-Checkbox, Ersteller/Erlediger-Name

### v7.4.5-24/25: Dashboard-Anzeigen + Mein-Status Einschraenkung
- mein-status-page-v7_4_4-10: Offene Rueckfragen oben nach Statistik-Kacheln
  - Monats-Kacheln grau wenn MA nicht im Unternehmen/Projekt
  - employment_start/end + assignment_start/end beruecksichtigt

### v7.4.5-26: Matrix Monats-Einschraenkung
- StundennachweisMatrix-v7_4_4-4: Graue Zellen pro MA basierend auf employment/assignment-Daten

### v7.4.5-27/28: Timesheet-Viewer Rueckfragen
- timesheet-viewer-v7_4_0-8: Oranger Badge "X Rueckfragen" pro Firma
  - 1 Notiz: Direktlink zur betroffenen ZE
  - Mehrere Notizen: Link zur Berichte-Seite (Matrix mit orangen Punkten)

## Dateien dieser Session

| Datei | Version | Ziel im Repo |
|-------|---------|-------------|
| TimesheetForm | v7.4.3-22 | src/components/shared/TimesheetForm.tsx |
| zeiterfassung-page | v7.3.94 | src/app/v7/firma/zeiterfassung/page.tsx |
| berater-ze-seite | v7.4.0-5 | src/app/v7/berater/foerderung/firma/[id]/zeiterfassung/page.tsx |
| StundennachweisMatrix | v7.4.4-4 | src/components/shared/StundennachweisMatrix.tsx |
| BerichtePage | v7.4.4-4 | src/components/shared/BerichtePage.tsx |
| berater-dashboard | v7.4.4-9 | src/app/v7/berater/dashboard/page.tsx |
| mein-status-page | v7.4.4-10 | src/app/v7/firma/mein-status/page.tsx |
| timesheet-viewer | v7.4.0-8 | src/app/v7/berater/timesheets/page.tsx |
| migration_timesheet_notes | v7.4.5 | SQL Migration (DEV + PROD) |

## DB-Aenderungen
- NEUE TABELLE: v7_timesheet_notes (DEV + PROD)
  - id, employee_id, project_id, year, month, note_text, status
  - created_by, created_at, resolved_by, resolved_at
  - Unique: (employee_id, project_id, year, month)
  - RLS deaktiviert (wie alle v7-Tabellen)

## Bekannte offene Punkte
- Berater-Dashboard zeigt "0 Firmen / 0 Projekte" (consultant_company_id nicht gesetzt)
- Zurueck-Button Bug in ProjectDetailPage (SWC-Compiler, vorbestehend)
