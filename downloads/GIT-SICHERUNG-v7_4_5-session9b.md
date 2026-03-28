# GIT-Sicherung Session 9 (Teil 2) - 28. Maerz 2026

## Zusatz zu Session 9 - Supabase Security Cleanup

---

## Was in Session 9 Teil 2 erledigt wurde

### 1. V6-Cleanup DEV (projektzeiterfassung20)
**Datei:** migration_v6_cleanup_prod.sql
**Ausgefuehrt in:** DEV (projektzeiterfassung20)

Geloescht:
- 14 V6-Views (v_employee_salary_overview, project_funding_status etc.)
- 15 V6-Tabellen (companies, projects, time_entries, user_profiles etc.)
- Backup-Tabelle v7_work_packages_backup_20260120
- 7 fruehe V7-Views (v7_timesheet_daily, v7_projects_with_company etc.)

### 2. Supabase Security Analyse
- Security Advisor Export ausgewertet (59 Errors, 43 Warnings)
- Drei Kategorien identifiziert:
  1. Policy Exists RLS Disabled (8 V7-Tabellen)
  2. RLS Disabled in Public (alle V7-Tabellen)
  3. Security Definer Views (V6-Altlasten, jetzt geloescht)
- Excel-Uebersicht DEV vs PROD erstellt

### 3. Instanzen-Klarstellung
- projektzeiterfassung20 = DEV
- PZE-production = PROD (Kundendaten, Robin Freund)
- PROD hatte keine V6-Tabellen mehr -> kein Cleanup noetig

---

## Kritischer Befund

**v7_timesheets in PROD hat rowsecurity=FALSE!**
- In DEV korrekt: rowsecurity=TRUE
- In PROD: rowsecurity=FALSE -> Zeiterfassungsdaten aller Kunden ungeschuetzt
- Naechste Session: Sofort als erstes fixen!

---

## Dateien in Downloads (Session 9 Teil 2)

| Dateiname | Zweck | Status |
|-----------|-------|--------|
| migration_v6_cleanup_prod.sql | V6-Cleanup DEV | ausgefuehrt |
| PZE_Supabase_Tabellen_DEV_vs_PROD.xlsx | Uebersicht RLS-Status | erstellt |
| PFLICHTENHEFT-v4_51.md | Pflichtenheft | aktualisiert |
| GIT-SICHERUNG-v7_4_5-session9b.md | diese Datei | - |

---

## RLS-Aktionsplan (naechste Session)

### Schritt 1 (erledigt)
V6-Cleanup DEV ausgefuehrt

### Schritt 2 (offen)
DEV: Altlasten loeschen
- fzul_employee_settings, fzul_vorhaben_settings
- import_employees, imported_timesheets

### Schritt 3 (offen - PRIO)
RLS aktivieren fuer alle V7-Tabellen in DEV:
- v7_client_companies (Policy vorhanden)
- v7_consultant_companies (keine Policy -> neu erstellen)
- v7_employees (Policy vorhanden)
- v7_netzwerk_eigenanteile (keine Policy -> neu erstellen)
- v7_netzwerk_partner (keine Policy -> neu erstellen)
- v7_project_assignments (Policy vorhanden)
- v7_project_budget (keine Policy -> neu erstellen)
- v7_project_team (keine Policy -> neu erstellen)
- v7_projects (Policy vorhanden)
- v7_user_profiles (Policies vorhanden)
- v7_work_package_assignments (keine Policy -> neu erstellen)
- v7_work_packages (keine Policy -> neu erstellen)
- v7_zahlungsanforderungen (keine Policy -> neu erstellen)

### Schritt 4 (offen)
DEV testen: Alle Funktionen durchklicken nach RLS-Aktivierung

### Schritt 5 (offen)
RLS in PROD aktivieren - inkl. v7_timesheets (KRITISCH!)

---

## Pflichtenheft
**Version:** 4.51
**Datei:** PFLICHTENHEFT-v4_51.md
