# PFLICHTENHEFT - Projektzeiterfassung (PZE)

**Version:** 4.27
**SW-Release:** V7.3.89
**Datum:** 09. Februar 2026
**Projekt:** Projektzeiterfassung fuer FuE-Foerdervorhaben
**Status:** V7 Entwicklung - Header-Navigation bereinigt, Firmen-Projekte repariert

---

## 1. Projektuebersicht

### 1.1 Zielsetzung

Webbasierte SaaS-Anwendung zur Erfassung und Verwaltung von Projektstunden fuer:
- Oeffentlich gefoerderte FuE-Projekte (ZIM, BMBF/KMU-innovativ)
- Forschungszulage (Paragraph 35a EStG)

### 1.2 Zielgruppen

| Zielgruppe | Beschreibung | Portal |
|------------|--------------|--------|
| Beratungsunternehmen | Consultants, die mehrere Kundenfirmen betreuen | Berater-Portal (blau) |
| Kundenfirmen | Geschaeftsfuehrer, Projektleiter, Mitarbeiter | Firmen-Portal (gruen) |

### 1.3 Kernfunktionen

Fuer Firmen und Berater:
- Online-Anlage von Foerderprojekten (manuell oder per ZIM-PDF-Import)
- Verwaltung vollstaendiger Arbeitsplaene mit Arbeitspaketen
- Zuordnung von Mitarbeitern zu Projekten und Arbeitspaketen
- Zeiterfassung der Projektstunden pro Mitarbeiter/Monat
- Berichte und Controlling mit Plan/Ist-Vergleich

Zusaetzlich fuer Berater:
- Analyse der Zeiterfassungen gefoerderter Projekte
- Ermittlung verfuegbarer Projektstunden fuer Forschungszulage (FZul)

### 1.4 Technische Architektur

| Komponente | Technologie |
|------------|-------------|
| Frontend | Next.js 15.5, React 19, TypeScript, Tailwind CSS 4 |
| Backend/DB | Supabase (PostgreSQL, Auth, Storage, RLS) |
| Hosting | Vercel (Deployment Branch: v7-dev) |
| Auth | Supabase Auth |
| ZIM Parser | Python/FastAPI (Railway) + Next.js API-Route |
| Package Manager | pnpm (lokal und Vercel) |
| Node.js | v20.x (lokal und Vercel) |
| Versionskontrolle | Git/GitHub |

### 1.5 Multi-Mandanten-Konzept

DSGVO-konforme Mandantentrennung:
- Jede Firma sieht nur eigene Daten (Row-Level Security in Supabase)
- Berater sieht alle autorisierten Kundenfirmen
- Keine Vermischung von Kundendaten moeglich

Hierarchie: SaaS-Plattform > Beraterfirma > Kundenfirmen > Projekte > Mitarbeiter

### 1.6 Rollen-System

| Rolle | Beschreibung | Zugriff |
|-------|--------------|---------|
| system_admin | System-Administrator | Alles |
| consultant | Berater | Eigene Kundenfirmen |
| client_admin | Firmen-Admin (GF) | Eigene Firma komplett |
| project_leader | Projektleiter | Eigene Projekte + MA |
| employee | Mitarbeiter | Nur eigene Zeiterfassung |

### 1.7 UI-Konventionen

Header-Farbregel ("Wer bin ICH"):
- Berater-Portal: Blau (#002451) - IMMER, auch bei Ansicht von Firmendaten
- Firmen-Portal: Gruen (#65A655) - IMMER

Shared Components: Alle UI-Komponenten in /components/shared/. Beide Portale nutzen
DIESELBEN Komponenten, portal-Parameter steuert die Farbe. NIE Code duplizieren!

Wording Zeiterfassung:
- Standard-Projekte: "foerderbare Projektarbeiten"
- Netzwerk-Projekte: "Management-Arbeiten"

Design-Prinzip: Nokia/Apple - Nutzer muessen Funktionen sofort verstehen ohne Handbuch.

---

## 2. Versionierungsprinzip

### 2.1 Schema

V[Release].[Version].[Build]-[Iteration]
Beispiel: v7.3.88-11

| Teil | Bedeutung | Erhoehung bei |
|------|-----------|---------------|
| Release (7) | Major Release | Grosse Feature-Aenderungen |
| Version (3) | Feature-Set | Neue Hauptfunktionen |
| Build (88) | Pflichtenheft-Stand | Dokumentation im Pflichtenheft |
| Iteration (-11) | Datei-Aenderung | Jede einzelne Dateimodifikation |

### 2.2 Dateinamen-Konvention

[Komponente]-v[Release]_[Version]_[Build]-[Iteration].tsx
Beispiele: TimesheetForm-v7_3_88-10.tsx, ProjectDetailPage-v7_3_88-7.tsx

### 2.3 Branch-Strategie

| Branch | Zweck | Vercel |
|--------|-------|--------|
| v7-dev | Aktive Entwicklung | Deployed automatisch |
| main | Stabile Version fuer Kundentests | Nur auf Martins Anweisung |

KRITISCH: Entwicklung IMMER auf v7-dev! Vor jedem Git-Befehl Branch pruefen!

---

## 3. Projekthistorie

### 3.1 Phase 1: Grundlagen (Oktober - November 2024)

Projektstart mit V6-Architektur. Grundlegende Konzepte erarbeitet:
- Datenbank-Schema fuer Multi-Mandanten-System
- FZul-Berechnung und Vorhaben-Verwaltung
- Excel-basierte Zeiterfassungs-Analyse

Konzept Zeiterfassung (Phase 4, November 2024):
- Analyse des Excel-Musters fuer Stundennachweise
- Definition der Monatsansicht pro Mitarbeiter
- Kategorisierung: Foerderbare Arbeit, Urlaub, Krankheit, Sonstige

### 3.2 Phase 2: V6 Entwicklung (November - Dezember 2024)

Erste funktionsfaehige Version mit:
- FZul-Berechnungsmodul
- Excel-Import fuer ZIM und BMBF Zeiterfassungsdaten
- PDF-Export fuer Stundennachweise
- Grundlegende Firmenverwaltung

ZIM-Import-Konzept (Dezember 2024):
- Modularer Import mit Foerderart-Erkennung (ZIM vs. BMBF)
- Sheet-Struktur-Analyse: Nav-Sheet, MA-Sheets (Nachname J1/J2/J3)
- Automatische Jahreszuordnung aus Laufzeitbeginn

### 3.3 Phase 3: V7 Neustart (Dezember 2024 - Januar 2026)

Kompletter Neubau als V7 mit moderner Architektur:

Dezember 2024:
- V7 Datenbank-Schema (v7_projects, v7_employees, v7_work_packages, etc.)
- Work-Packages-Schema mit Zuordnungen
- Import-Seite v7.0.2 fuer ZIM-Projekte

Januar 2026 - Intensive Entwicklungsphase:
- v7.3.42: Shared Components (DataTable, Modal, CapacityBar, PortalHeader, PortalNav)
- v7.3.52-62: WorkPackage-Suite (List, EditModal, AssignmentModal, Table)
- v7.3.57: ProjectCreateForm, CompanyDataView, ProjectList
- v7.3.60: EmployeeManagement mit vollem CRUD
- v7.3.82: ZIM PDF Parser als Next.js API-Route (Python auf Railway)
- v7.3.84: Berater-Dashboard, rollenbasierte Navigation
- v7.3.85: WorkPackageTable mit Excel-Style Inline-Edit

### 3.4 Phase 4: Zeiterfassung und Berichte (Januar - Februar 2026)

v7.3.86 (25. Januar - 03. Februar 2026):
- TypeScript-Korrekturen (PortalHeader, ProjectDetailPage, TimesheetForm)
- Fehlzeiten-Bug behoben (DB-Constraint: work_package_id/absence_code gegenseitig)
- Header-Navigation bereinigt, Umlaute korrigiert
- Speichern-Button im Unsaved-Dialog, Debug-Logging
- Jahr-Auswahl 2020-2030 wiederhergestellt

v7.3.87 (03. - 05. Februar 2026):
- Team-Management (ProjectTeamManager): MA zum Projekt hinzufuegen mit Lfd. Nr.
- Excel-Arbeitsplan: Vorlage-Download und Import mit Vorschau
- ArbeitsplanImport-Komponente
- Architekturprinzip: v7_work_package_assignments als Single Source of Truth

v7.3.88 (05. - 08. Februar 2026):
- Berichte-Modul: Plan/Ist-Vergleich, Projekt-Statistiken, MA-Auslastung
- Rollenbasierte Navigation in beiden Portalen
- Separate Berichte- und Zeiterfassungs-Seiten pro Portal
- Firmen-Detail-Seite mit 5-Tab-Struktur
- canEdit-Flag fuer EmployeeManagement
- T-Spalte fuer technische Arbeitspakete (Durchfuehrbarkeitsstudien)
- KRITISCHER FIX: Null-Safety fuer alle Array-Operationen (Vercel Production)
- KRITISCHER FIX: Branch-Synchronisation v7-dev/main
- Package Manager vereinheitlicht auf pnpm

v7.3.89 (09. Februar 2026):
- TimesheetForm: T/NT-Spalte fuer technische/nicht-technische APs bei ZIM_DS
  - Getrennte Summenzeilen (Technisch/Nicht-Technisch/Gesamt) bei Durchfuehrbarkeitsstudien
  - Robuste Typ-Erkennung (boolean, string, number) fuer is_technical
- Firmen-Projekte-Seite KOMPLETT NEU: 1209 Zeilen (v7.3.5) ersetzt durch 225 Zeilen
  - FIX: v7_project_budget Tabelle existiert nicht -> Ladefehler behoben
  - Nutzt jetzt shared ProjectList-Komponente
  - PortalNav korrekt eingebunden
- PortalHeader BEREINIGT: Navigation komplett entfernt (177 statt 331 Zeilen)
  - Header zeigt nur noch Logo/Firmenname + User-Menu
  - Klick auf Logo/Firmenname fuehrt zum jeweiligen Dashboard
  - Navigation liegt ausschliesslich in PortalNav (zweite Zeile)
  - Supabase-Import auf @/lib/supabase/client umgestellt (auth-helpers-nextjs entfernt)
- Berater-Dashboard: Temporaerer Redirect auf /v7/berater/foerderung
  - Wird beim Modul-Dashboard-Umbau durch richtige Seite ersetzt

---

## 4. Aktueller Stand: v7.3.89

### 4.1 Shared Components (src/components/shared/)

| Datei | Version | Funktion |
|-------|---------|----------|
| ArbeitsplanImport.tsx | 7.3.87 | Excel Download/Upload Buttons und Dialog |
| CapacityBar.tsx | 7.3.42 | Kapazitaets-Fortschrittsbalken |
| CompanyDataView.tsx | 7.3.57 | Firmendaten-Anzeige (readonly) |
| DataTable.tsx | 7.3.42 | Generische Tabellen-Komponente |
| EmployeeManagement.tsx | 7.3.60 | Volle MA-Verwaltung mit CRUD |
| Modal.tsx | 7.3.42 | Generische Modal-Komponente |
| PortalHeader.tsx | 7.3.89 | Header mit Portal-Farben, Logo klickbar zum Dashboard |
| PortalNav.tsx | 7.3.42 | Portal-Navigation unterhalb Header (einzige Nav-Quelle) |
| ProjectCreateForm.tsx | 7.3.57 | Projekt anlegen (beide Portale) |
| ProjectDetailPage.tsx | 7.3.88-7 | Projekt-Detailseite mit Tabs |
| ProjectList.tsx | 7.3.88-6 | Projektliste (laedt Projekte selbst) |
| ProjectTeamManager.tsx | 7.3.87 | Team-Verwaltung mit Lfd. Nr. und Rollen |
| TimesheetForm.tsx | 7.3.89 | Zeiterfassung mit Excel-Navigation, T/NT-Spalte |
| WorkPackageAssignmentModal.tsx | 7.3.62 | MA einem AP zuordnen |
| WorkPackageEditModal.tsx | 7.3.52 | AP bearbeiten (Name, Zeitraum, PM) |
| WorkPackageList.tsx | 7.3.54 | AP-Liste mit Sortierung |
| WorkPackageTable.tsx | 7.3.85 | Arbeitsplan im Excel-Style |

### 4.2 Berater-Portal Pages (src/app/v7/berater/)

| Route | Version | Funktion |
|-------|---------|----------|
| /v7/berater | 7.3.86-2 | Redirect auf Dashboard |
| /v7/berater/dashboard | 7.3.89 | Dashboard (temporaer Redirect auf Foerderung) |
| /v7/berater/foerderung | 7.3.84-3 | Firmenliste (Tabelle) |
| /v7/berater/foerderung/import | 7.3.39 | ZIM PDF Import |
| /v7/berater/foerderung/firma/[id] | 7.3.88-9 | Firmen-Detail (5 Tabs) |
| /v7/berater/foerderung/firma/[id]/berichte | 7.3.88 | Berichte und Controlling |
| /v7/berater/foerderung/firma/[id]/zeiterfassung | 7.3.88-6 | Zeiterfassung |
| /v7/berater/foerderung/firma/[id]/projekt/neu | - | Neues Projekt anlegen |
| /v7/berater/foerderung/firma/[id]/projekt/[id] | - | Projekt-Detail (Wrapper) |
| /v7/berater/fzul | 7.3.1 | FZul Firmenauswahl |
| /v7/berater/fzul/analyse | - | FZul Kapazitaetsanalyse |

### 4.3 Firmen-Portal Pages (src/app/v7/firma/)

| Route | Version | Funktion |
|-------|---------|----------|
| /v7/firma | - | Redirect auf Dashboard |
| /v7/firma/dashboard | - | Firmen-Dashboard |
| /v7/firma/projekte | 7.3.89 | Projektliste (shared ProjectList) |
| /v7/firma/projekte/[id] | - | Projekt-Detail (Wrapper) |
| /v7/firma/projekte/neu | - | Neues Projekt |
| /v7/firma/mitarbeiter | - | Mitarbeiterliste |
| /v7/firma/firmendaten | - | Firmendaten bearbeiten |
| /v7/firma/zeiterfassung | 7.3.88-2 | Zeiterfassung |
| /v7/firma/berichte | 7.3.88-4 | Berichte und Controlling |

### 4.4 API-Routen (src/app/api/)

| Route | Version | Funktion |
|-------|---------|----------|
| /api/parse-zim | 7.3.82 | ZIM PDF Parser |
| /api/v7/arbeitsplan-import | 7.3.87 | Excel-Arbeitsplan Import |
| /api/v7/arbeitsplan-vorlage | 7.3.87 | Excel-Vorlage Generator |
| /api/auth/login | - | Login |
| /api/auth/logout | - | Logout |
| /api/fzul/pdf | v2.2 | FZul PDF-Export |
| /api/export/fzul | v2.3 | FZul Excel-Export |
| /api/reports/monthly-timesheet | - | ZIM Stundennachweis PDF |
| /api/reports/fzul-stundennachweis | - | BMF FZul Stundennachweis |
| /api/company/create | - | Firma anlegen |
| /api/employees/* | - | MA CRUD-Operationen |
| /api/payment-requests/* | - | Zahlungsanforderungen |
| /api/time-entries | - | Zeiterfassung API |
| /api/work-packages/import | - | AP-Import |

### 4.5 Datenbank-Tabellen (Supabase)

| Tabelle | Funktion |
|---------|----------|
| v7_user_profiles | Benutzerprofile mit Rollen |
| v7_consultant_companies | Beratungsfirmen |
| v7_client_companies | Kundenfirmen |
| v7_employees | Mitarbeiter der Kundenfirmen |
| v7_projects | Foerderprojekte |
| v7_work_packages | Arbeitspakete |
| v7_work_package_assignments | MA-AP-Zuordnungen (Single Source of Truth) |
| v7_project_assignments | Projekt-Team-Zuordnungen |
| v7_timesheets | Zeiterfassungs-Eintraege |

---

## 5. Behobene Probleme v7.3.88

### 5.1 KRITISCH: Vercel Production Crash (08.02.2026)

Problem: App funktionierte lokal einwandfrei, crashte aber auf Vercel mit
"Uncaught TypeError: can't access property filter, s is undefined"

Ursache 1 - Unsichere Array-Operationen:
Production-Build von Next.js ist strikter als Dev-Mode. Wenn Daten noch nicht
geladen sind (undefined), crasht .filter()/.map()/.find() sofort.

Loesung: Null-Safety fuer alle Array-Operationen:
- (projects || []).filter(...) statt projects.filter(...)
- (p.name || '').toLowerCase() statt p.name.toLowerCase()
- Optional Chaining: arr?.filter(...) wo moeglich

Betroffene Dateien:
- ProjectList.tsx (Zeile 108: p.name.toLowerCase)
- ProjectDetailPage.tsx (workPackages, teamMembers)
- TimesheetForm.tsx (employees, projects, workPackages Props)
- WorkPackageAssignmentModal.tsx (allEmployees)
- ProjectTeamManager.tsx (allEmployees, teamMembers)
- Diverse Page-Dateien (companies.filter, projects.map, etc.)

Ursache 2 - Branch-Desynchronisation:
Fixes wurden auf Branch "main" committed, aber Vercel deployed von "v7-dev".
Die Fixes waren daher nie auf Vercel sichtbar.

Loesung: Dateien manuell von main auf v7-dev kopiert mit:
git show main:[datei] > [datei]

Ursache 3 - Package Manager Mismatch:
Lokal wurde pnpm verwendet, Vercel hatte npm konfiguriert.
Unterschiedliche Dependency-Aufloesungen moeglich.

Loesung:
- package-lock.json geloescht (nur pnpm-lock.yaml behalten)
- Vercel Build Command: pnpm run build
- Vercel Install Command: pnpm install

### 5.2 Node.js Version

Problem: Vercel verwendete Node.js 24.x, lokal lief 20.x.
Loesung: In Vercel Settings auf Node.js 20.x umgestellt.

### 5.3 Fehlzeiten-Speicherung (v7.3.86-4)

Problem: Fehlzeiten (U/K/S) wurden nicht gespeichert.
Ursache: DB-Constraint v7_timesheets_entry_type_check erfordert:
- Arbeit: work_package_id gesetzt, absence_code NULL
- Fehlzeit: work_package_id NULL, absence_code gesetzt

### 5.4 Git Instabilitaet (08.02.2026)

Problem: Wiederkehrende "bus error" und ".git/index.lock" Fehler.
Workaround: rm -f .git/index.lock vor jedem Git-Befehl.
git merge funktioniert nicht - Dateien muessen manuell kopiert werden.

---

## 6. Deployment und Infrastruktur

### 6.1 Lokale Entwicklung

Rechner: MacBook Pro M4
Node.js: v20.19.5
Package Manager: pnpm
Server: next dev (Port 3000)
Projektverzeichnis: ~/Documents/Dev/PZE
Downloads von Claude: ~/Documents/Dev/PZE/downloads/

### 6.2 Vercel Konfiguration

Projekt: projektzeiterfassung20
Branch: v7-dev (automatisches Deployment bei Push)
Framework: Next.js
Build Command: pnpm run build (Override aktiv)
Install Command: pnpm install (Override aktiv)
Node.js: 20.x
URL: https://projektzeiterfassung20-git-v7-dev-martin-ds-projects-5cb70f89.vercel.app

### 6.3 next.config.ts

- TypeScript Build-Errors ignoriert (ignoreBuildErrors: true)
- ESLint bei Builds ignoriert (ignoreDuringBuilds: true)
- Cache-Kontrolle: no-store fuer alle /v7/ Routen

### 6.4 Git-Workflow

IMMER vor Git-Befehlen pruefen:
1. rm -f .git/index.lock (Lock-Datei loeschen)
2. git branch --show-current (muss v7-dev zeigen!)
3. Falls falscher Branch: git checkout v7-dev

Sicherungsskript: git-sicherung-v7_3_89.sh
- Prueft automatisch den Branch
- Erstellt Backup in backups/[timestamp]/
- Committed und pusht zu v7-dev

### 6.5 Supabase

Datenbank mit Row-Level Security (RLS)
Auth fuer Login/Registrierung
Storage fuer Firmen-Logos und Dokumente

---

## 7. Architektur-Regeln

### 7.1 Shared Components

Alle UI-Komponenten in /components/shared/. Beide Portale nutzen identische
Komponenten. Der portal-Parameter ('berater' | 'firma') steuert Farben.

### 7.2 Header-Farbregel

"Wer bin ICH" - nicht "welche Daten sehe ich":
- Berater sieht Firmendaten -> Header bleibt BLAU (#002451)
- Firma sieht eigene Daten -> Header ist GRUEN (#65A655)

### 7.3 DB-Constraint Timesheets

work_package_id und absence_code schliessen sich gegenseitig aus:
- Arbeit: work_package_id NOT NULL, absence_code NULL
- Fehlzeit: work_package_id NULL, absence_code NOT NULL (U/K/S/F)

### 7.4 Personenmonate-Berechnung

1 PM = 173,33 Stunden (40 Stunden/Woche x 52 Wochen / 12 Monate)

### 7.5 Single Source of Truth

v7_work_package_assignments ist die einzige Quelle fuer MA-Projekt-Zuordnungen.
Mitarbeiter werden Projekten ueber Arbeitspakete zugeordnet, nicht separat.

### 7.6 Null-Safety Regel (Production)

JEDE Array-Operation MUSS abgesichert sein:
- (array || []).filter(...) oder array?.filter(...)
- (string || '').toLowerCase()
- Optional: object?.property statt object.property

Grund: Vercel Production-Build ist strikter als Dev-Mode.

### 7.7 Header und Navigation (v7.3.89)

PortalHeader: NUR Logo/Firmenname (klickbar -> Dashboard) und User-Menu (Abmelden).
KEINE Navigation im Header! Navigation liegt ausschliesslich in PortalNav (zweite Zeile).
PortalNav wird von jeder Seite separat eingebunden.

### 7.8 Supabase Client Import

Immer @/lib/supabase/client verwenden (createClient).
NICHT @supabase/auth-helpers-nextjs - Paket ist nicht installiert!

---

## 8. Testdaten

| Firma | ID (gekuerzt) | MA | Projekte |
|-------|---------------|-----|----------|
| Tippl GmbH | d83be07e... | 4 | DigiTrans (ZIM) |
| AS System GmbH | ba3afa6c... | 3 | ANOVIA (ZIM DS) |

---

## 9. Geplante naechste Schritte

### 9.1 Kurzfristig (naechste Session)

- Modul-Dashboard-Umbau: Kachel-basierte Navigation statt aktueller Seitenstruktur
  - Berater-Dashboard mit Modulkacheln (Foerderung, FZul, Import, Berichte)
  - Firmen-Dashboard mit Modulkacheln (Projekte, Zeiterfassung, Berichte)
  - Aktive Module klickbar, geplante Module als "Demnaechst"
- Header-Klick zum Dashboard bereits implementiert (v7.3.89)

### 9.2 Mittelfristig (v7.3.90+)

- Export-Funktionen (Excel, PDF) fuer Berichte
- Excel-Import fuer ZIM und BMBF Zeiterfassungsdaten
- Firmenlogo-Upload und -Anzeige
- Firmendaten-Bearbeitung im Berater-Portal
- Stundennachweis-Wording: "foerderbare Projektarbeiten" (Standard) vs "Management-Arbeiten" (Netzwerk)

### 9.3 Langfristig (v7.4)

- FZul-Integration: Migration der V6-Funktionen
- FZul Online-Editor mit Status-Workflow
- FZul Excel-Import und PDF-Archiv
- Modul-basierte Lizenzierung
- User Manuals fuer beide Portale

---

## 10. Aenderungshistorie Pflichtenheft

| Version | Datum | Aenderungen |
|---------|-------|-------------|
| v4.27 | 09.02.2026 | v7.3.89: T/NT-Spalte TimesheetForm, Firmen-Projekte neu, Header bereinigt, Berater-Dashboard |
| v4.26 | 08.02.2026 | Vollstaendige Projekthistorie, Vercel-Fix dokumentiert, Branch-Strategie, Deployment-Doku |
| v4.25 | 05.02.2026 | Berichte-Modul, Rollenbasierte Navigation, v7.3.88 |
| v4.24 | 05.02.2026 | Team-Management, Excel-Arbeitsplan Import, v7.3.87 |
| v4.23 | 03.02.2026 | Fehlzeiten-Bug, Header-Navigation, Umlaute, v7.3.86-4 |
| v4.22 | 25.01.2026 | TypeScript-Korrekturen, Versionierungsprinzip, v7.3.86 |
| v4.21 | 25.01.2026 | is_technical Problem, WorkPackageTable T-Spalte |
| v4.20 | 23.01.2026 | MA-Extraktion Anlage 6.2, employee_number |
| v4.19 | 23.01.2026 | ZIM PDF Parser v4.8 dokumentiert |
| v4.18 | 22.01.2026 | Architektur-Visualisierung, Shared Components |
| Frueher | Okt-Dez 2024 | V6 Grundlagen, FZul, ZIM-Import-Konzept, DB-Schema |

---

**Ende des Pflichtenhefts v4.27**
**Letzte Aktualisierung: 09. Februar 2026, 20:15 Uhr**
