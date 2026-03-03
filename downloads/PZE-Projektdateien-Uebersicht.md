# PZE Projektdateien - Uebersicht und Aufraeum-Empfehlung

**Stand:** 03. Maerz 2026 | **SW-Release:** V7.4.3-11 | **Pflichtenheft:** v4.38

---

## AKTUELL - Diese Dateien sind die aktiven Versionen

| Datei | Groesse | Verwendung |
|-------|---------|------------|
| **Code-Dateien (aktuelle Versionen)** | | |
| TimesheetForm-v7_4_3-4.tsx | 76K | Zeiterfassungs-Formular (AP Pre-Population Fix) |
| WorkPackageTable-v7_4_3-7.tsx | 45K | Arbeitspaket-Tabelle (Ampel-Farblogik) |
| berichte-page-v7_4_3-11.tsx | 38K | Berichte Firmen-Portal (komplett ueberarbeitet) |
| berater-berichte-page-v7_4_3-11.tsx | 37K | Berichte Berater-Portal (gleichgezogen) |
| mein-status-page-v7_3_95-5.tsx | 39K | Mein Status mit FAQ-Download |
| EmployeeManagement-v7_3_95.tsx | 51K | Mitarbeiterverwaltung |
| ProjectTeamManager-v7_3_95-1.tsx | 46K | Projektteam-Zuordnung |
| PortalHeader-v7_3_95-3.tsx | 13K | Portal-Header (PW-Fix, Manual-Download) |
| PortalNav-v7_4_0.tsx | 6.5K | Portal-Navigation |
| timesheet-viewer-v7_4_0-5.tsx | 41K | Timesheet-Viewer (Berater) |
| v7-types-v7_4_0.ts | 27K | TypeScript-Typdefinitionen |
| v7-module-config-v7_3_90-4.ts | 11K | Modul-Konfiguration |
| ProjectDetailPage-v7_3_88-7.tsx | 65K | Projektdetail-Seite |
| ProjectList-v7_3_88-6.tsx | 12K | Projektliste |
| ProjectCreateForm-v7_3_82-9.tsx | 33K | Projekt-Anlageformular |
| v7-firma-detail-page-v7_3_88-9.tsx | 14K | Firmen-Detailseite |
| firma-dashboard-v7_3_92.tsx | 9.5K | Firmen-Dashboard |
| zeiterfassung-page-v7_3_92.tsx | 11K | Zeiterfassungs-Seite |
| page-firma-projekte-v7_3_89.tsx | 7.5K | Firmen-Projekte-Seite |
| berater-dashboard-redirect-v7_3_89.tsx | 1.0K | Berater-Dashboard Redirect |
| WorkPackageEditModal-v7_3_85-1.tsx | 17K | AP-Bearbeitungs-Modal |
| arbeitsplan-import-route-v7_3_87-final.ts | 19K | Arbeitsplan-Import API-Route |
| parse-zim-pdf-v4_9.py | 37K | ZIM-PDF-Parser (Railway) |
| v7-firma-page-redirect-v7_3_42.tsx | 1.0K | Firma-Seite Redirect |
| login-page.tsx | 5.5K | Login-Seite |
| v7-layout.tsx | 512B | Layout-Datei |
| route-v7_0_4.ts | 17K | API-Route |
| next_config.ts | 1.0K | Next.js Konfiguration |
| requirements-updated.txt | 512B | Python Requirements |
| **Dokumentation (aktuell)** | | |
| PFLICHTENHEFT-v4_38.md | 51K | Aktuelle Spezifikation |
| GIT-SICHERUNG-v7_4_3.md | 2.0K | Aktuelle Git-Dokumentation |
| PZE-PROJEKT-DOSSIER-FUER-CLAUDE.md | 22K | Projekt-Kontext fuer Claude |
| **Konzepte (Referenz)** | | |
| KONZEPT-FIRMEN-HIERARCHIE-v7_1.md | 23K | Firmen-Hierarchie-Konzept |
| KONZEPT-FZUL-ONLINE-EDITOR.md | 40K | FZul-Editor Konzept |
| KONZEPT-MITARBEITER-VERFUEGBARKEIT-v1.md | 45K | Mitarbeiter-Verfuegbarkeit |
| KONZEPT-ZIM-IMPORT.md | 34K | ZIM-Import Konzept |
| KONZEPT-ZIM-ZAHLUNGSANFORDERUNG-v1_0.md | 16K | ZIM-Zahlungsanforderung |
| PHASE-4-ZEITERFASSUNG-KONZEPT_1_.md | 52K | Phase-4 Zeiterfassungs-Konzept |
| TODO-Produktiv-DB-Einrichtung.md | 7.5K | Produktiv-DB Setup Anleitung |
| **Referenzdaten** | | |
| Supabase_Snippet_V7_Tables_and_Column_Details.csv | 6.0K | DB-Schema Uebersicht |
| V7-DB-SCHEMA.sql | 15K | Datenbank-Schema |
| V7-WORK-PACKAGES-SCHEMA.sql | 9.5K | Arbeitspakete-Schema |
| PZEV7PROJEKTPLANv1_5_1.xlsx | 10K | Projektplan |
| PZEFAQZeiterfassungv1.pdf | 12K | FAQ Zeiterfassung |

---

## KANN GELOESCHT WERDEN - Alte Versionen (durch neuere ersetzt)

| Datei | Groesse | Ersetzt durch |
|-------|---------|---------------|
| **Alte Code-Versionen** | | |
| EmployeeManagement-v7_3_84.tsx | 54K | EmployeeManagement-v7_3_95.tsx |
| EmployeeManagement-v7_3_89-1.tsx | 58K | EmployeeManagement-v7_3_95.tsx |
| ProjectTeamManager-v7_3_87-3.tsx | 36K | ProjectTeamManager-v7_3_95-1.tsx |
| ProjectTeamManager-v7_3_95.tsx | 37K | ProjectTeamManager-v7_3_95-1.tsx |
| PortalHeader-v7_3_89.tsx | 6.5K | PortalHeader-v7_3_95-3.tsx |
| TimesheetForm-v7_3_91.tsx | 65K | TimesheetForm-v7_4_3-4.tsx |
| WorkPackageTable-v7_3_90.tsx | 24K | WorkPackageTable-v7_4_3-7.tsx |
| berichte-page-v7_3_88-4.tsx | 35K | berichte-page-v7_4_3-11.tsx |
| berater-berichte-page-v7_3_88.tsx | 33K | berater-berichte-page-v7_4_3-11.tsx |
| mein-status-page-v7_3_95-3.tsx | 38K | mein-status-page-v7_3_95-5.tsx |
| v7-types-v7_3_86.ts | 27K | v7-types-v7_4_0.ts |
| v7-constants-v7_3_42.ts | 12K | Pruefen ob noch referenziert* |
| DataTable-v7_3_42.tsx | 18K | Pruefen ob noch referenziert* |
| Modal-v7_3_42.tsx | 12K | Pruefen ob noch referenziert* |
| CapacityBar-v7_3_42.tsx | 12K | Pruefen ob noch referenziert* |
| **Alte Pflichtenheft-Versionen** | | |
| PFLICHTENHEFT-v4_32.md | 33K | PFLICHTENHEFT-v4_38.md |
| PFLICHTENHEFT-v4_33.md | 37K | PFLICHTENHEFT-v4_38.md |
| PFLICHTENHEFT-v4_36.md | 44K | PFLICHTENHEFT-v4_38.md |
| PFLICHTENHEFT-v4_37.md | 46K | PFLICHTENHEFT-v4_38.md |

---

## Hinweise

**\* v7_3_42-Dateien pruefen:** Die vier Dateien mit Version v7_3_42 (DataTable, Modal, CapacityBar, v7-constants) sind relativ alt. Es sollte geprueft werden, ob sie noch aktiv im Code importiert werden. Falls ja, sind sie aktuell; falls nein, koennen sie ebenfalls geloescht werden.

**Speicherersparnis bei Loeschung:** Die alten Versionen belegen zusammen ca. **560 KB** - kein riesiger Gewinn, aber die Uebersichtlichkeit im Projektverzeichnis verbessert sich deutlich.

**Empfehlung:** Die alten Pflichtenheft-Versionen (v4.32 bis v4.37) koenntest du in ein Archiv-Unterverzeichnis verschieben statt loeschen, falls du den Versionsverlauf spaeter nochmal brauchen solltest.
