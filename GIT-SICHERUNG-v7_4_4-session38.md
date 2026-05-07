# GIT-Sicherung Session 38
**Datum:** 7. Mai 2026
**SW-Release:** V7.4.7
**Pflichtenheft:** v4.83

## Geaenderte Dateien (Code)

| Datei | Version | Aenderung |
|-------|---------|-----------|
| src/components/shared/TimesheetForm.tsx | **7.4.6-17** | Fehlzeiten editierbar, weiss, Tastatur, hasChanges |
| src/components/shared/EmployeeManagement.tsx | **7.3.95-15** | Teilzeit Tage/Woche x Stunden/Tag |
| src/components/shared/ZAPanel.tsx | **7.4.4-33** | Anlage 1a: MA nach employee_number sortiert |
| src/components/shared/WorkPackageTable.tsx | **7.4.3-12** | PM-Summen via assignmentMap dedupliziert |
| src/components/shared/BerichtePage.tsx | 7.4.6-10 | Titel Dashboard |
| src/components/shared/ProjectDetailPage.tsx | 7.4.4-55 | Zurueck = Dashboard |
| src/app/v7/firma/projekte/page.tsx | 7.3.90 | Redirect auf Dashboard |
| src/types/v7-types.ts | **7.4.9-1** | V7EmployeeHoursHistory + days_per_week/hours_per_day |
| PFLICHTENHEFT-v4_83.md | - | Session 38 dokumentiert |
| KONZEPT-FIRMA-COCKPIT-v1_0.md | - | Neues Konzept-Dokument |

## DB-Aenderungen PROD

| Aenderung | SQL |
|-----------|-----|
| v7_employees: days_per_week + hours_per_day | ALTER TABLE (ausgefuehrt) |
| v7_employee_hours_history: days_per_week + hours_per_day | ALTER TABLE (ausgefuehrt) |
| Teilzeit-Daten befuellt | 40h->5x8h, 38h->5x7,6h, 39h->5x7,8h, 35h->5x7h, 30h->5x6h |
| Arndt/Mueller geloescht | Steuerkanzlei Freund |
| ANOVIA Duplikate entfernt | v7_work_package_assignments |

## Offene Punkte

| Punkt | Status |
|-------|--------|
| Teilzeit-Daten Doan, Kirchner Lisa, Freund Marlene | Katrin klaert |
| Abwesenheits-Korrektur-UPDATE (alte 8h-Eintraege) | Warten auf Teilzeit-Daten |
| Anlegen-Modal EmployeeManagement: noch weekly_hours pur | Bewusst belassen |
| KONZEPT-FIRMA-COCKPIT: Implementierung | Naechste Sessions |
| Rollenbezeichnung PL-Portal vs. Projektfunktion | Konzeptell klaeren |

## Aktuelle Komponentenversionen

| Komponente | Version |
|-----------|---------|
| TimesheetForm.tsx | **7.4.6-17** |
| BerichtePage.tsx | 7.4.6-10 |
| PortalNav.tsx | 7.4.4-13 |
| ZAPanel.tsx | **7.4.4-33** |
| ProjectDetailPage.tsx | 7.4.4-55 |
| EmployeeManagement.tsx | **7.3.95-15** |
| StundennachweisMatrix.tsx | 7.4.6-2 |
| ProjectTeamManager.tsx | 7.4.4-17 |
| WorkPackageTable.tsx | **7.4.3-12** |
| v7-types.ts | **7.4.9-1** |
