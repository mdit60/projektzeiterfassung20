# PFLICHTENHEFT - Projektzeiterfassung (PZE)

**Version:** 4.30
**SW-Release:** V7.3.93
**Datum:** 17. Februar 2026
**Projekt:** Projektzeiterfassung fuer FuE-Foerdervorhaben
**Status:** V7 Entwicklung - Produktions-DB live, PDF-Export Fix, Go-Live Vorbereitung

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
- Mein Status: Persoenliche Uebersicht offener Zeiterfassungen

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
Beispiel: v7.3.93-2

| Teil | Bedeutung | Erhoehung bei |
|------|-----------|---------------|
| Release (7) | Major Release | Grosse Feature-Aenderungen |
| Version (3) | Feature-Set | Neue Hauptfunktionen |
| Build (93) | Pflichtenheft-Stand | Dokumentation im Pflichtenheft |
| Iteration (-2) | Datei-Aenderung | Jede einzelne Dateimodifikation |

### 2.2 Dateinamen-Konvention

[Komponente]-v[Release]_[Version]_[Build]-[Iteration].tsx
Beispiele: TimesheetForm-v7_3_93.tsx, mein-status-page-v7_3_91.tsx

### 2.3 Branch-Strategie

| Branch | Zweck | Vercel |
|--------|-------|--------|
| v7-dev | Aktive Entwicklung | Deployed automatisch |
| main | Stabile Version fuer Kundentests | Nur auf Martins Anweisung |

KRITISCH: Entwicklung IMMER auf v7-dev! Vor jedem Git-Befehl Branch pruefen!

### 2.4 Vercel Environment-Variablen (v7.3.92)

Jeder Branch hat eigene Supabase-Credentials:
- v7-dev (Pre-Production): Zeigt auf Dev-DB (projektzeiterfassung20)
- main (Production): Zeigt auf Prod-DB (PZE-production)

WICHTIG: Env-Vars in Vercel unter Settings > Environment Variables pro
Environment (Production / Preview) getrennt konfigurieren.
Verhindert, dass Dev-Branch auf Prod-DB zugreift und umgekehrt.

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
- EmployeeManagement: Fix fuer Endlosschleife beim Verknuepfen bestehender Logins
- Email-Infrastruktur: Resend.com SMTP konfiguriert, DKIM+MX verifiziert

v7.3.90 (12. Februar 2026):
- Rollenbasierte Zugriffskontrolle Firmen-Portal:
  - v7-module-config: portalRoles-Feld steuert Sichtbarkeit pro Rolle
  - project_leader sieht: Projekte, Zeiterfassung, Berichte
  - employee sieht: nur Zeiterfassung
  - client_admin sieht: alles (aktive Module)
  - coming_soon Module im Firmen-Portal ausgeblendet (nur Berater sieht geplante Module)
- Modul-Sortierung Dashboard: Projekte -> Zeiterfassung -> Berichte (Reihe 1)
  - ZA -> VN -> AGVO (Reihe 2), De-Minimis (Reihe 3)
- Berater-Dashboard komplett ueberarbeitet:
  - Kundenliste als Tabelle mit Suchfunktion (statt Kacheln)
  - Zaehler-Fix: client_company_id statt company_id fuer Projekt/MA-Counts
  - Labels: "Kundenuebersicht" statt "Meine Kunden", "Sonstiges" statt "Berater-Werkzeuge"
  - plannedRelease-Badges entfernt ("In Vorbereitung" statt "Q2/2026")
- Neue Firmen-Portal-Seiten:
  - /v7/firma/projekte/[id]: Projekt-Detail (Wrapper fuer shared ProjectDetailPage)
  - /v7/firma/meine-projekte: Redirect auf /v7/firma/projekte
  - /v7/firma/mein-status: Platzhalter-Seite fuer spaetere MA-Statistiken
- ProjectList: Link-Fix /firma/projekt -> /firma/projekte (Plural)
- WorkPackageTable: T/NT-Spalte konsistent mit TimesheetForm
  - Header: "T/NT" statt "T"
  - Werte: gruenes "T" und oranges "NT" statt "X" und "-"
- Robin Freund Login: v7_user_profiles Eintrag erstellt, role=client_user
- Git-Bereinigung: Frischer Clone, Merge v7-dev -> main, Branches synchron

v7.3.91 (15. Februar 2026):
- Mein Status Seite (/v7/firma/mein-status) KOMPLETT NEU:
  - Ersetzt den Platzhalter mit vollstaendiger Funktionalitaet
  - Zeigt dem MA alle zugeordneten Projekte mit Ampel-Status pro Monat
  - Ampel: Gruen (vollstaendig, >=80% Arbeitstage), Orange (teilweise),
    Rot (nicht erfasst), Grau (zukuenftig)
  - Monats-Zeitleiste gruppiert nach Jahr
  - Kennzahlen-Kacheln: Projekte, Vollstaendig, Teilweise, Nicht erfasst
  - Klick auf Monat navigiert zur Zeiterfassung mit employee/year/month Parametern
  - Feiertags-Berechnung nach Bundesland (wie berichte-page)
  - Sichtbar fuer alle Rollen (employee, project_leader, client_admin)
- TimesheetForm v7.3.91: initialYear + initialMonth Props
  - Monat wird bei Navigation aus Mein Status/Berichte vorausgewaehlt
  - Vorher wurde immer der aktuelle Monat angezeigt
- Zeiterfassung-Seite v7.3.91: returnUrl-Parameter
  - Zurueck-Button fuehrt zur Ausgangsseite (Mein Status, Berichte)
  - Vorher: immer zum Dashboard, Nutzer musste zuruecknavigieren
  - Default ohne returnUrl: Admin -> Berichte, andere -> Mein Status

### 3.5 Phase 5: Produktions-DB und Go-Live Vorbereitung (Februar 2026)

v7.3.92 (16. Februar 2026):
- Produktions-Datenbank "PZE-production" eingerichtet:
  - Separate Supabase-Instanz fuer Produktivbetrieb
  - Daten von Steuerkanzlei Robin Freund migriert
  - Erster Produktivkunde live
- Auth-Fixes:
  - profile.id = auth.id gesetzt (konsistente Verknuepfung)
  - client_company_id korrekt zugewiesen
- Passwort-Management:
  - Passwort aendern in PortalHeader integriert
  - Passwort zuruecksetzen ueber Berater-API
- Vercel Env-Vars pro Environment (Production vs Pre-Production):
  - v7-dev zeigt auf Dev-DB, main auf Prod-DB
  - Verhindert versehentlichen Zugriff auf falsche DB
- PortalNav v7.3.92: Kumulative Rollennavigation
  - Hoehere Rollen erben Navigationspunkte niedrigerer Rollen
  - Alle Rollen landen auf Mein Status (inkl. Admin)
  - Korrekte hrefs fuer alle Menuepunkte
- Dashboard v7.3.92: Intelligenter Redirect auf Mein Status
- Zeiterfassung v7.3.92: PortalNav fuer alle Rollen angezeigt (auch employee)
- display_name in Prod-DB korrigiert

v7.3.93 (17. Februar 2026):
- KRITISCHER FIX: PDF-Export Stundennachweis
  - Problem: PDF oeffnete in neuem Tab, Tab blieb offen, AP-Nummern fehlten
  - Loesung: PDF-Export nutzt window.print() direkt im aktuellen Fenster
  - document.title wird temporaer auf Dateinamen gesetzt (fuer PDF-Speichern-Dialog)
  - setTimeout(100ms) vor window.print() damit Browser neuen Titel registriert
  - afterprint-Event stellt Original-Titel wieder her
  - Kein neuer Tab mehr - nach Druck/Abbrechen sofort zurueck zur Zeiterfassung
- FIX: AP-Dropdowns in Stundennachweis-Vorschau read-only
  - AP-Spalte hat zwei Elemente: Select (print:hidden) + Span (hidden print:block)
  - Im Bildschirm: interaktives Select-Dropdown
  - Im Druck/PDF: reiner Text mit AP-Nummer
  - Neue Hilfsfunktion getAPDisplayNumber() eliminiert Code-Duplizierung
- Print-CSS verbessert:
  - select { display: none !important; } im @media print
  - input { border: none; background: transparent; } im @media print

---

## 4. Aktueller Stand: v7.3.93

### 4.1 Shared Components (src/components/shared/)

| Datei | Version | Funktion |
|-------|---------|----------|
| ArbeitsplanImport.tsx | 7.3.87 | Excel Download/Upload Buttons und Dialog |
| CapacityBar.tsx | 7.3.42 | Kapazitaets-Fortschrittsbalken |
| CompanyDataView.tsx | 7.3.57 | Firmendaten-Anzeige (readonly) |
| DataTable.tsx | 7.3.42 | Generische Tabellen-Komponente |
| EmployeeManagement.tsx | 7.3.89-1 | Volle MA-Verwaltung mit CRUD, Login-Verknuepfung |
| Modal.tsx | 7.3.42 | Generische Modal-Komponente |
| PortalHeader.tsx | 7.3.89 | Header mit Portal-Farben, Logo klickbar zum Dashboard |
| PortalNav.tsx | 7.3.92 | Kumulative Rollennavigation, alle Rollen auf Mein Status |
| ProjectCreateForm.tsx | 7.3.57 | Projekt anlegen (beide Portale) |
| ProjectDetailPage.tsx | 7.3.88-7 | Projekt-Detailseite mit Tabs |
| ProjectList.tsx | 7.3.90 | Projektliste, Link-Fix firma/projekte |
| ProjectTeamManager.tsx | 7.3.87 | Team-Verwaltung mit Lfd. Nr. und Rollen |
| TimesheetForm.tsx | 7.3.93 | Zeiterfassung mit PDF-Export Fix, read-only AP im Druck |
| WorkPackageAssignmentModal.tsx | 7.3.62 | MA einem AP zuordnen |
| WorkPackageEditModal.tsx | 7.3.52 | AP bearbeiten (Name, Zeitraum, PM) |
| WorkPackageList.tsx | 7.3.54 | AP-Liste mit Sortierung |
| WorkPackageTable.tsx | 7.3.90 | Arbeitsplan im Excel-Style, T/NT konsistent |

### 4.2 Konfigurationsdateien (src/lib/)

| Datei | Version | Funktion |
|-------|---------|----------|
| v7-module-config.ts | 7.3.90-5 | Modul-Definitionen mit portalRoles und Sortierung |
| v7-constants.ts | 7.3.42 | Portal-Farben und Konstanten |
| v7-types.ts | 7.3.86 | TypeScript-Typdefinitionen |

### 4.3 Berater-Portal Pages (src/app/v7/berater/)

| Route | Version | Funktion |
|-------|---------|----------|
| /v7/berater | 7.3.86-2 | Redirect auf Dashboard |
| /v7/berater/dashboard | 7.3.90-5 | Kundenuebersicht + Sonstiges (Berater-Werkzeuge) |
| /v7/berater/foerderung | 7.3.84-3 | Firmenliste (Tabelle) |
| /v7/berater/foerderung/import | 7.3.39 | ZIM PDF Import |
| /v7/berater/foerderung/firma/[id] | 7.3.88-9 | Firmen-Detail (5 Tabs) |
| /v7/berater/foerderung/firma/[id]/berichte | 7.3.88 | Berichte und Controlling |
| /v7/berater/foerderung/firma/[id]/zeiterfassung | 7.3.88-6 | Zeiterfassung |
| /v7/berater/foerderung/firma/[id]/projekt/neu | - | Neues Projekt anlegen |
| /v7/berater/foerderung/firma/[id]/projekt/[id] | - | Projekt-Detail (Wrapper) |
| /v7/berater/fzul | 7.3.1 | FZul Firmenauswahl |
| /v7/berater/fzul/analyse | - | FZul Kapazitaetsanalyse |

### 4.4 Firmen-Portal Pages (src/app/v7/firma/)

| Route | Version | Funktion |
|-------|---------|----------|
| /v7/firma | 7.3.42 | Redirect auf Dashboard |
| /v7/firma/dashboard | 7.3.92 | Firmen-Dashboard, Redirect auf Mein Status |
| /v7/firma/projekte | 7.3.90 | Projektliste mit Rollencheck |
| /v7/firma/projekte/[id] | 7.3.90 | Projekt-Detail (Shared ProjectDetailPage) |
| /v7/firma/projekte/neu | - | Neues Projekt |
| /v7/firma/zeiterfassung | 7.3.92 | Zeiterfassung, PortalNav fuer alle Rollen |
| /v7/firma/berichte | 7.3.90 | Berichte mit Rollencheck |
| /v7/firma/meine-projekte | 7.3.90 | Redirect auf /v7/firma/projekte |
| /v7/firma/mein-status | 7.3.91 | Zeiterfassungs-Uebersicht mit Ampel pro Monat |
| /v7/firma/mitarbeiter | - | Mitarbeiterliste |
| /v7/firma/firmendaten | - | Firmendaten bearbeiten |

### 4.5 Modul-System (v7-module-config.ts)

#### 4.5.1 Rollenbasierte Modul-Sichtbarkeit (Firmen-Portal)

| Modul | client_admin | project_leader | employee | Status |
|-------|:------------:|:--------------:|:--------:|--------|
| Projekte | Ja | Ja | Nein | Aktiv |
| Zeiterfassung | Ja | Ja | Ja | Aktiv |
| Berichte | Ja | Ja | Nein | Aktiv |
| Zahlungsanforderung | Ja | Nein | Nein | Geplant (ausgeblendet) |
| Verwendungsnachweis | Ja | Nein | Nein | Geplant (ausgeblendet) |
| AGVO / BWA | Ja | Nein | Nein | Geplant (ausgeblendet) |
| De-Minimis Beihilfen | Ja | Nein | Nein | Geplant (ausgeblendet) |

coming_soon Module sind im Firmen-Portal mit visible:false ausgeblendet.
Im Berater-Portal bleiben alle Module sichtbar (mit "In Vorbereitung" Badge).

#### 4.5.2 Dashboard-Sortierung

Reihe 1: Projekte (1), Zeiterfassung (2), Berichte (3)
Reihe 2: Zahlungsanforderung (4), Verwendungsnachweis (5), AGVO/BWA (6)
Reihe 3: De-Minimis (7)

#### 4.5.3 Berater-Werkzeuge

| Modul | sortOrder | Status |
|-------|-----------|--------|
| Netzwerkmanagement | 8 | In Vorbereitung |
| Multiprojekt-Tool | 9 | In Vorbereitung |
| Forschungszulage | 10 | In Vorbereitung |

### 4.6 API-Routen (src/app/api/)

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

### 4.7 Datenbank-Tabellen (Supabase)

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

### 4.8 Produktionsumgebung (v7.3.92)

| Komponente | Details |
|------------|---------|
| Prod-DB | Supabase "PZE-production" |
| Dev-DB | Supabase "projektzeiterfassung20" |
| Prod-URL | https://pze.itenion.com (main Branch) |
| Dev-URL | Vercel Preview (v7-dev Branch) |
| Erster Kunde | Steuerkanzlei Robin Freund |

Env-Vars werden pro Vercel-Environment getrennt konfiguriert.
Jeder Branch nutzt automatisch die korrekte Datenbank.

---

## 5. Behobene Probleme

### 5.1 KRITISCH: Vercel Production Crash (v7.3.88, 08.02.2026)

Problem: App funktionierte lokal einwandfrei, crashte aber auf Vercel mit
"Uncaught TypeError: can't access property filter, s is undefined"

Ursache 1 - Unsichere Array-Operationen:
Production-Build von Next.js ist strikter als Dev-Mode. Wenn Daten noch nicht
geladen sind (undefined), crasht .filter()/.map()/.find() sofort.

Loesung: Null-Safety fuer alle Array-Operationen:
- (projects || []).filter(...) statt projects.filter(...)
- (p.name || '').toLowerCase() statt p.name.toLowerCase()
- Optional Chaining: arr?.filter(...) wo moeglich

Ursache 2 - Branch-Desynchronisation:
Fixes wurden auf Branch "main" committed, aber Vercel deployed von "v7-dev".

Ursache 3 - Package Manager Mismatch:
Lokal pnpm, Vercel hatte npm konfiguriert.
Loesung: package-lock.json geloescht, nur pnpm-lock.yaml behalten.

### 5.2 Berater-Dashboard Zaehler (v7.3.90, 12.02.2026)

Problem: Projekte und Mitarbeiter pro Firma zeigten immer 0.
Ursache: .eq('company_id', ...) statt .eq('client_company_id', ...)
Loesung: Spaltenname korrigiert in Dashboard-Seite.

### 5.3 ProjectList Link-Bug (v7.3.90, 12.02.2026)

Problem: Klick auf Projekt im Firmen-Portal fuehrte zu 404.
Ursache: Router-Push auf /v7/firma/projekt/ (Singular) statt /v7/firma/projekte/ (Plural).
Loesung: Links in ProjectList.tsx korrigiert.

### 5.4 WorkPackageTable UTF-8 Korruption (v7.3.90, 12.02.2026)

Problem: Aggressive UTF-8-Bereinigung zerstoerte Nullish-Coalescing-Operatoren (??)
und erzeugte Syntax-Fehler ("Expected ';', got 'emp'").
Ursache: Python-Regex ersetzte alle Non-ASCII inkl. gueltige UTF-8-Multibyte-Sequenzen,
wobei auch ?-Zeichen entfernt wurden.
Loesung: Datei komplett neu erstellt (sauber ASCII, 0 Non-ASCII).

### 5.5 sed-Befehl erstellt Phantom-Dateien (v7.3.90, 12.02.2026)

Problem: macOS sed -i '' erzeugte Dateien "Kundenuebersicht" und "Sonstiges" im Projektroot.
Ursache: Quote-Parsing bei macOS sed kann bei Copy-Paste Ersetzungstext als Dateinamen interpretieren.
Loesung: Phantom-Dateien geloescht, kuenftig vollstaendige Dateien statt sed-Befehle verwenden.

### 5.6 Git Push haengt bei 81% (wiederkehrend)

Problem: git push origin v7-dev haengt bei "Zaehle Objekte: 81%", Ctrl+C noetig.
Erkenntnis: Daten werden trotzdem uebertragen, nur Bestaetigungsmeldung fehlt.
Workaround: In neuem Terminal erneut pushen, "Everything up-to-date" bestaetigt Erfolg.

### 5.7 TimesheetForm ignoriert URL-Parameter (v7.3.91, 15.02.2026)

Problem: Klick aus Mein-Status/Berichte auf Monat oeffnete Zeiterfassung,
aber immer mit aktuellem Monat statt dem gewaehlten.
Ursache: TimesheetForm hatte initialYear/initialMonth nicht in Props definiert.
Zeiterfassung-Seite uebergab die Werte, aber TimesheetForm ignorierte sie.
Loesung: Props-Interface und State-Init um initialYear/initialMonth erweitert.

### 5.8 Zurueck-Button fuehrt zum Dashboard (v7.3.91, 15.02.2026)

Problem: Nach Zeiterfassung aus Mein-Status musste man zurueck zum Dashboard
und dann erneut zu Mein-Status navigieren.
Ursache: onBack war hardcoded auf /v7/firma/berichte bzw. /v7/firma.
Loesung: returnUrl-Parameter in URL. Mein-Status uebergibt returnUrl=/v7/firma/mein-status.
Zeiterfassung nutzt returnUrl fuer den Zurueck-Button.

### 5.9 PDF-Export oeffnet in neuem Tab, AP-Nummern fehlen (v7.3.93, 17.02.2026)

Problem: PDF-Export oeffnete ein neues Browser-Tab. Dieses Tab blieb nach dem
Druck offen und zeigte die AP-Nummern nicht (geklonter DOM hatte selectedIndex=0).
Die Stundennachweis-Vorschau hatte editierbare Dropdowns statt read-only Text.

Ursache: window.open('', '_blank') mit geklontem HTML verlor die Select-Werte.
Der Clone kopierte die DOM-Elemente, aber nicht den interaktiven State (selectedIndex).

Loesung: PDF-Export nutzt jetzt window.print() direkt im aktuellen Fenster.
document.title wird temporaer auf den gewuenschten Dateinamen gesetzt.
setTimeout(100ms) vor window.print() gibt dem Browser Zeit, den neuen Titel
zu registrieren (macOS liest sonst noch den alten Titel).
afterprint-Event stellt den Original-Titel wieder her.
AP-Dropdowns: Zwei Elemente pro Zelle - Select (print:hidden) fuer Screen,
Span (hidden print:block) fuer Druck. @media print blendet Selects aus.

---

## 6. Deployment und Infrastruktur

### 6.1 Lokale Entwicklung

Rechner: MacBook Pro M4
Node.js: v20.19.5
Package Manager: pnpm
Server: next dev (Port 3000)
Projektverzeichnis: ~/Documents/Dev/PZE
Downloads von Claude: ~/Documents/Dev/PZE/downloads/

WICHTIG: Nach frischem Git-Clone muss .env.local manuell erstellt werden
(wird von .gitignore ausgeschlossen). Inhalt:
NEXT_PUBLIC_SUPABASE_URL und NEXT_PUBLIC_SUPABASE_ANON_KEY

### 6.2 Vercel Konfiguration

Projekt: projektzeiterfassung20
Branch: v7-dev (automatisches Deployment bei Push)
Framework: Next.js
Build Command: pnpm run build (Override aktiv)
Install Command: pnpm install (Override aktiv)
Node.js: 20.x
Production-URL: https://pze.itenion.com
Preview-URL: https://projektzeiterfassung20-git-v7-dev-martin-ds-projects-5cb70f89.vercel.app

Environment-Variablen pro Vercel-Environment:
- Production (main): NEXT_PUBLIC_SUPABASE_URL + ANON_KEY -> PZE-production DB
- Preview (v7-dev): NEXT_PUBLIC_SUPABASE_URL + ANON_KEY -> projektzeiterfassung20 DB

### 6.3 next.config.ts

- TypeScript Build-Errors ignoriert (ignoreBuildErrors: true)
- ESLint bei Builds ignoriert (ignoreDuringBuilds: true)
- Cache-Kontrolle: no-store fuer alle /v7/ Routen

### 6.4 Git-Workflow

IMMER vor Git-Befehlen pruefen:
1. rm -f .git/index.lock (Lock-Datei loeschen)
2. git branch --show-current (muss v7-dev zeigen!)
3. Falls falscher Branch: git checkout v7-dev

### 6.5 Email-Infrastruktur

Provider: Resend.com
Absender: cubintec.pze@itenion.com ("Cubintec PZE")
SMTP: smtp.resend.com:587
Domain: send.itenion.com
Status: DKIM verifiziert, MX verifiziert, SPF konfiguriert (Strato DNS)
Offene Punkte: SPF-Record bei Strato noch nicht final verifiziert.

### 6.6 Supabase

Datenbank mit Row-Level Security (RLS)
Auth fuer Login/Registrierung
Storage fuer Firmen-Logos und Dokumente

Zwei Instanzen:
- Dev: projektzeiterfassung20 (Testdaten)
- Prod: PZE-production (Kundendaten, Steuerkanzlei Robin Freund)

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

### 7.9 UTF-8 Regel (v7.3.90)

ALLE Dateien muessen vor Auslieferung auf Non-ASCII-Zeichen geprueft werden.
Umlaute in Kommentaren und Strings als ae/oe/ue/ss schreiben.
KEINE aggressiven Regex-Ersetzungen auf Quellcode anwenden.
Bei Bedarf: Datei komplett neu erstellen statt inkrementell bereinigen.

### 7.10 Modul-Sichtbarkeit (v7.3.90)

Firmen-Portal: Nur aktive Module anzeigen (coming_soon mit visible:false ausblenden).
Berater-Portal: Alle Module anzeigen (aktive + geplante mit "In Vorbereitung").
Steuerung ueber portalRoles-Array in v7-module-config.ts.

### 7.11 returnUrl-Navigation (v7.3.91)

Seiten, die zur Zeiterfassung navigieren, uebergeben returnUrl als URL-Parameter.
Die Zeiterfassung nutzt returnUrl fuer den Zurueck-Button.
Falls kein returnUrl: Admin -> /v7/firma/berichte, andere -> /v7/firma/mein-status.

### 7.12 Kumulative Rollennavigation (v7.3.92)

Hoehere Rollen erben die Navigationspunkte niedrigerer Rollen:
- employee: Mein Status, Zeiterfassung
- project_leader: + Projekte, Berichte
- client_admin: + Mitarbeiter, Firmendaten
Alle Rollen landen auf Mein Status als Startseite.

### 7.13 PDF-Export Stundennachweis (v7.3.93)

PDF-Export nutzt window.print() im aktuellen Fenster (kein neuer Tab).
document.title wird temporaer auf Dateinamen gesetzt.
setTimeout(100ms) vor print() noetig, damit macOS den neuen Titel erkennt.
AP-Dropdowns: Select (print:hidden) + Span (hidden print:block) fuer read-only Druck.

---

## 8. Testdaten

| Firma | ID (gekuerzt) | MA | Projekte |
|-------|---------------|-----|----------|
| Tippl GmbH | d83be07e... | 4 | DigiTrans (ZIM) |
| AS System GmbH | ba3afa6c... | 4 | ANOVIA (ZIM DS) |
| Steuerkanzlei Robin Freund | ba3afa6c... | 1 | ANOVIA (ZIM DS, via Zuordnung) |

Test-User:
| Name | Rolle | Portal |
|------|-------|--------|
| Martin Ditscherlein | system_admin + consultant | Berater |
| Thomas Duehrkop | client_admin | Firma (AS System) |
| Robin Freund | project_leader | Firma (Steuerkanzlei Freund) |

---

## 9. Geplante naechste Schritte

### 9.1 Kurzfristig (Go-Live)

- Go-Live Vorbereitung fuer Robin Freunds Team
- User Manuals erstellen: Firmen-Portal (gruen) + Berater-Portal (blau)
- ANOVIA Projekt: Terminverschiebung der Arbeitspakete (nach Klaerung mit Katrin)
- Duplikat-Firma "Steuerkanzlei Freund" (d90c5d2e...) bereinigen
- main-Branch mit aktuellem v7-dev synchronisieren

### 9.2 Mittelfristig (v7.3.94+)

- ZIM PDF Import im Firmen-Portal aktivieren (nach Parser-Stabilisierung)
- Export-Funktionen (Excel, PDF) fuer Berichte
- Excel-Import fuer ZIM und BMBF Zeiterfassungsdaten
- Firmenlogo-Upload und -Anzeige
- Firmendaten-Bearbeitung im Berater-Portal
- Email-Einladungssystem fuer neue Benutzer (SPF bei Strato finalisieren)

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
| v4.30 | 17.02.2026 | v7.3.92+93: Prod-DB live, Env-Vars, kumulative Nav, PDF-Export Fix, read-only Dropdowns |
| v4.29 | 15.02.2026 | v7.3.91: Mein Status Seite, TimesheetForm initialYear/Month, returnUrl Navigation |
| v4.28 | 12.02.2026 | v7.3.90: Rollenbasierte Zugriffskontrolle, Dashboard-Optimierung, T/NT WorkPackageTable, neue Seiten |
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

**Ende des Pflichtenhefts v4.30**
**Letzte Aktualisierung: 17. Februar 2026**
