# PFLICHTENHEFT - Projektzeiterfassung (PZE)

**Version:** 4.44
**SW-Release:** V7.4.4
**Datum:** 13. Maerz 2026
**Projekt:** Projektzeiterfassung fuer FuE-Foerdervorhaben
**Status:** V7.4.4-18 deployed auf v7-dev + main - ZA-Modul komplett: Status-Workflow, ZA-Ampel, Archiv-Tab

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
- Timesheet-Viewer: Firmen-/Projekt-/MA-uebergreifende Stundenuebersicht (v7.4)
- FZul-Analyse: Auswertung foerderrelevanter Stunden aus Timesheet-Daten (v7.4)

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
Beispiel: v7.3.91-2

| Teil | Bedeutung | Erhoehung bei |
|------|-----------|---------------|
| Release (7) | Major Release | Grosse Feature-Aenderungen |
| Version (3) | Feature-Set | Neue Hauptfunktionen |
| Build (91) | Pflichtenheft-Stand | Dokumentation im Pflichtenheft |
| Iteration (-2) | Datei-Aenderung | Jede einzelne Dateimodifikation |

### 2.2 Dateinamen-Konvention

[Komponente]-v[Release]_[Version]_[Build]-[Iteration].tsx
Beispiele: TimesheetForm-v7_3_91.tsx, mein-status-page-v7_3_91.tsx

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

### 3.5 Phase 5: Berater-Analysetools (Februar - Maerz 2026)

v7.4.4 (10. Maerz 2026):
- Berater-Portal Navigation komplett ueberarbeitet:
  - Dashboard v7.4.4-4: Projekte-Zahl in Tabelle klickbar -> Tab Projekte der Firma
  - Dashboard v7.4.4-4: Mitarbeiter-Zahl in Tabelle klickbar -> Tab Mitarbeiter der Firma
  - Dashboard v7.4.4-4: Schnellzugriff-Spalte reduziert auf Berichte + Zeiten (Projekte-Button entfernt)
  - Firma-Detail v7.4.4-2: PortalHeader zeigt jetzt Firmenname (Fix: firmaName -> companyName)
  - Berater-Berichte v7.4.4-3: Zurueck-Button -> Dashboard (statt Firmendaten-Tab)
  - Berater-ZE-Seite v7.4.0-2: Zurueck-Button Default -> Dashboard (statt Firmendaten-Tab)
  - Berater-ZE-Seite v7.4.0-2: PortalHeader zeigt Firmenname (Fix: companyName="PZE" hardcoded -> company.name)
  - returnUrl-Mechanismus bleibt erhalten: Wenn von Timesheet-Viewer -> kehrt dorthin zurueck
- Navigation-Prinzip (festgelegt): Alle Zurueck-Buttons im Berater-Portal ohne expliziten returnUrl
  -> fuehren immer zum Dashboard (/v7/berater/dashboard), nicht zur Zwischenebene Firmendaten

v7.4.3-12 (09. Maerz 2026):
- Berichte & Controlling Firmen-Portal v7.4.3-12: Stundennachweis-Matrix aktiviert
  - Kachel "Stundennachweis" jetzt aktiv (gruen, klickbar - war vorher disabled)
  - Kachel oeffnet/schliesst aufklappbare Matrix direkt darunter
  - Zeilen: alle dem Projekt zugeordneten MA (aus v7_work_package_assignments)
  - Spalten: alle Projektmonate aufsteigend, nach Jahr gruppiert
  - Jahres-Kopfzeile: "Jahr 1 (2026)", "Jahr 2 (2027)" etc.
  - Aktueller Monat in Monats-Kopfzeile gruen hervorgehoben
  - Ampelfarben pro Zelle: Gruen(vollstaendig), Orange(teilweise), Rot(fehlt), Grau(Zukunft)
  - Vollstaendig = alle Arbeitstage des Monats haben Eintraege
  - Tooltip bei Hover: "Monat Jahr: Stunden - Status"
  - Klick auf Zelle: navigiert direkt zur Zeiterfassung (?employee=&year=&month=&returnUrl=)
  - Zukuenftige Monate: nicht klickbar (grau)
  - Legende: Vollstaendig / Teilweise / Fehlt / Zukunft
  - Bei mehreren Projekten: Dropdown zur Projekt-Auswahl
  - MA-Name in linker Spalte sticky (bleibt beim horizontalen Scrollen sichtbar)
  - Hinweis-Zeile unter Matrix erklaert Klick-Funktion
- Berater-Berichte v7.4.3-12: Stundennachweis-Matrix gleichgezogen
  - Identische Matrix-Funktionalitaet wie Firmen-Portal
  - Kachel blau (Berater-Farbe) statt gruen
  - Aktueller Monat blau hervorgehoben
  - Navigations-Link: /v7/berater/foerderung/firma/[id]/zeiterfassung?...
  - returnUrl zeigt zurueck auf Berater-Berichte-Seite

v7.4.3 (03. Maerz 2026):
- TimesheetForm v7.4.3-4: AP-Pre-Population Timing-Fix (setTimeout statt sofort)
- WorkPackageTable v7.4.3-7: Arbeitsplan-Ampel Farblogik verfeinert:
  - Erfasst (h): Weiss = planmaessig, Orange HG = Warnung (>25 Pp Differenz Zeit vs. Erfassung)
  - Frei (h): Gruene Schrift = verfuegbar, Rote Schrift = Budget ueberschritten
  - Kein Rot-Hintergrund mehr in Erfasst-Spalte (war verwirrend)
- FAQ Zeiterfassung v1: PDF + DOCX mit Cubintec-Logo, Header/Footer, klickbares Inhaltsverzeichnis
  - 7 Kapitel: Grundlagen, AP-Zuordnung, offen-Spalte, Fehlzeiten, Speichern/Drucken, Arbeitsplan, FAQ
  - Farbcode-Tabelle fuer Arbeitsplan-Ampel in Kapitel 6
  - Ablage: public/manuals/PZE-FAQ-Zeiterfassung-v1.pdf
- Mein Status v7.3.95-5: FAQ-Download-Link (blauer Banner, alle Rollen)
- Berichte & Controlling v7.4.3-11: Komplett ueberarbeitet:
  - KRITISCH: is_active + is_billable Filter fuer korrekte PM-Berechnung
  - Datenquelle: v7_work_package_assignments statt v7_project_assignments
  - Zeiterfassungs-Status: Soll (h) / Erfasst (h) / Offen (h) pro MA (Gesamtprojekt)
  - Fortschrittsbalken pro MA mit Ampel-Farblogik (gruen/orange/rot)
  - Projekt-Uebersicht: Doppel-Fortschrittsbalken (Erfasst + Laufzeit)
  - Orange-Warnung: Wenn Zeitfortschritt > 25 Pp vor Erfassungsgrad
  - portalRole korrekt aus v7_employees.portal_role lesen
- Berater-Berichte v7.4.3-11: Gleichgezogen mit Firmen-Portal:
  - Alle Fixes uebertragen (is_active, is_billable, work_package_assignments)
  - Doppel-Fortschrittsbalken, Stunden-Status, Ampel-Farblogik
  - Berater-spezifisch: companyId aus URL, blauer Header, Zurueck-Link

v7.4.0 (23. Februar 2026):
- Timesheet-Viewer Berater-Portal (/v7/berater/timesheets):
  - Neue Seite fuer firmenuebergreifende Zeiterfassungs-Uebersicht
  - Globaler Jahres-Slider: Sliding Window mit 5 Jahren (2 zurueck, aktuell, 2 vor)
  - Pfeil-Navigation links/rechts verschiebt Fenster um 1 Jahr
  - "Heute"-Button erscheint bei verschobenem Fenster, springt zurueck
  - Aktuelles Jahr optisch hervorgehoben (blauer Punkt)
  - Ansicht A (Alle): Accordion pro Firma mit aufklappbaren Projekten
  - Ansicht B (Jahresfilter): Alle in diesem Jahr aktiven Projekte firmenuebergreifend
    Firmenzugehoerigkeit als blauer Header-Streifen ueber jedem Projekt
  - Projektbasierte Laufzeit: Jahres-Reiter nur innerhalb start_date..end_date
  - Monate ausserhalb Projektlaufzeit grau gesperrt (keine Eingabe moeglich)
  - Aktueller Monat in Matrix-Header blau hervorgehoben
  - Vollstaendigkeits-Badge pro Projekt/Jahr: gruen(erfasst)/orange(0h)/rot(fehlend)/gesamt
  - Direktlink zur Zeiterfassung bei Klick auf jede Zelle
  - Tooltip zeigt Stunden + Anzahl Tage bei Hover
  - FZul-Analyse-Tab vorbereitet (deaktiviert, Badge "bald")
  - DB-Schema korrekt: v7_timesheets = eine Zeile pro Tag (work_date, hours, day_type)
    Aggregation auf Monat erfolgt im Frontend
  - MA aus v7_project_assignments (alle zugeordneten MA, nicht nur mit Eintraegen)
  - URL-Parameter korrekt: ?employee=, ?year=, ?month=, ?returnUrl=
- Berater-ZE-Seite v7.4.0-2 (/v7/berater/foerderung/firma/[id]/zeiterfassung):
  - returnUrl-Parameter: Zurueck-Button kehrt zur Ausgangsseite zurueck
  - Default ohne returnUrl: Dashboard (/v7/berater/dashboard)
  - Header zeigt jetzt Firmenname (company.name statt hardcoded "PZE")
  - Rollen-Check: nur consultant + system_admin duerfen Seite oeffnen
- PortalNav v7.4.0: Neuer Nav-Punkt "Zeiterfassungen" fuer consultant + system_admin
  Route: /v7/berater/timesheets, Icon: Clock
- Git-Commit: "v7.4.0: Timesheet-Viewer + Direktnavigation fixes"
  Push: v7-dev (Vercel Preview) + main (Vercel Production)

v7.3.95 (18.-20. Februar 2026):
- Mein Status Seite v7.3.95-3: Ampel-Logik KORRIGIERT:
  - Gruen: Alle Arbeitstage haben Eintraege (vorher: 80%-Schwelle)
  - Orange: "In Bearbeitung" (vorher: "Teilweise erfasst")
  - Rot: Nicht erfasst (keine Eintraege vorhanden)
  - Grau: Zukuenftig
  - Legende, Kennzahlen-Kacheln und Tooltips entsprechend aktualisiert
- Mein Status: Rollenbasierter Manual-Download
  - Gruener Banner unter Seitentitel mit PDF-Download-Link
  - employee -> Kurzanleitung Mitarbeiter
  - project_leader -> Kurzanleitung Projektleiter
  - client_admin -> Schnellstart Firmen-Administrator
  - PDFs liegen in /public/manuals/
- PortalHeader v7.3.95-3: Passwort-Aendern WIEDERHERGESTELLT
  - War bei v7.3.95 Print-Fix verloren gegangen (basierte auf veralteter Version)
  - User-Dropdown: User-Info -> "Passwort aendern" (KeyRound) -> "Abmelden" (LogOut)
  - Modal mit Validierung (min. 6 Zeichen, Uebereinstimmung)
  - supabase.auth.updateUser() - kein SMTP erforderlich
- PortalNav v7.3.95-2: Import aus Berater-Navigation ENTFERNT
  - War bei v7.3.95 ebenfalls verloren gegangen
  - Berater-Nav: Kunden | Berichte | Administration (nur system_admin)
- EmployeeManagement v7.3.95: Anlage 6.1 Felder entfernt
- ProjectTeamManager v7.3.95: employee_number editierbar
- TimesheetForm v7.3.95-1: Print-Fix fuer leere Stundennachweise (1 Seite A4 Landscape)
- User Manuals erstellt (3 PDFs in /public/manuals/):
  - PZE_Kurzanleitung_Mitarbeiter.pdf (1 Seite)
  - PZE_Kurzanleitung_Projektleiter.pdf (1 Seite)
  - PZE_Schnellstart_Firmen-Administrator.pdf (2 Seiten)
  - Cubintec Logo in Kopfzeile, gruener Titelbalken nur Seite 1
  - Fehlzeiten-Beschreibung: U/K/S direkt im Tagesfeld, automatisch 8h in Fehlzeit-Zeile
  - Korrigierte Ampel-Beschreibungen (konsistent mit Code)
  - Monatsabschluss: Ausdruck + Unterschrift MA + PL
  - Subventionserheblich-Hinweis (Paragraph 264 StGB)
- ProjectTeamManager v7.3.95-1: Anlage 6.1 Felder (pWAZ, bWAZ, Teilzeitfaktor, Stundensatz)
  - Felder im "Bearbeiten"-Dialog unter Projekt-Team
  - Auto-Berechnung: bWAZ = pWAZ * Teilzeitfaktor, Stundensatz = Jahresbrutto / (bWAZ * 52)
  - Manuelle Ueberschreibung moeglich (Toggle-Checkbox)
  - Gespeichert in v7_work_package_assignments
- Arbeitsplan einfrieren (v7.3.95-6/7):
  - WorkPackageTable: "Einfrieren"-Button setzt workplan_locked = true in v7_projects
  - Badge "Bewilligt (gesperrt)" neben Arbeitsplan-Titel
  - Alle Bearbeiten-Buttons (Edit, Delete, PM-Aenderung) deaktiviert bei Lock
  - Legende: "Arbeitsplan gesperrt - Entsperren nur durch Systemadministrator"
  - Einfrieren-Bestaetigung: Dialog mit Checkbox "Ja, Arbeitsplan einfrieren"
  - Entsperren: Nur im Berater-Portal (consultant + system_admin), mit Kommentar-Pflicht
  - ProjectDetailPage: Buttons "Vorlage", "Import", "Neues AP" ausgeblendet bei Lock
  - Text: "Systemadministrator" statt "Berater" (Berater kann aber auch entsperren)
- PortalHeader v7.3.95-4: Rolle als Untertitel im Header
  - system_admin -> "Berater (Systemadmin)"
  - consultant -> "Berater"
  - client_admin -> "Administrator"
  - project_leader -> "Projektleiter"
  - employee -> "Mitarbeiter"
  - Rolle auch im User-Dropdown (blau, unter Name)
- EmployeeManagement v7.3.95-1: PW-Reset WIEDERHERGESTELLT
  - Amber Schluessel-Icon bei MA mit bestehendem Login (nur Berater-Portal)
  - Modal: Neues Passwort eingeben, API-Route /api/v7/reset-password
  - FIX: createUserProfile setzt role='client_user' statt 'employee'
  - War bei v7.3.95 Anlage-6.1-Bereinigung verloren gegangen
- Alle Firmen-Portal Seiten: display_name Fallback
  - Mein Status, Dashboard, Zeiterfassung, Berichte: Wenn v7_user_profiles.display_name
    NULL ist, wird display_name aus v7_employees geladen (Fallback)
  - Berichte-Seite: UTF-8 Fix (kaputte Sonderzeichen im Footer)
- Live-Test Vorbereitung:
  - Steuerkanzlei Robin Freund als erster Produktivkunde
  - 4 Mitarbeiter mit Login: Freund (Admin), Arndt (Projektleiter), Mueller, Schoebel
  - Email-Tippfehler korrigiert (steuzerkanzlei -> steuerkanzlei)
  - Doppelter v7_user_profiles Eintrag bereinigt (Schoebel)
  - Fehlende client_company_id in v7_user_profiles nachgetragen (Mueller)

v7.3.94 (17. Februar 2026):
- Berater-Verwaltung (Administration):
  - Neue Seite /v7/berater/admin (nur fuer system_admin sichtbar)
  - ConsultantManagement Shared Component: Liste, Anlegen, Bearbeiten, Deaktivieren
  - Neuen Berater anlegen: Auth-User + v7_user_profiles automatisch erstellt
  - Bestehenden User zum Berater befoerdern (kein duplicate key error)
    Prueft ob Email schon in v7_user_profiles existiert, macht dann UPDATE statt INSERT
  - Rolle waehlbar: consultant oder system_admin
  - Passwort-Reset per Email (resetPasswordForEmail)
  - PortalNav-Link "Administration" nur bei system_admin sichtbar
- PortalNav im Berater-Portal:
  - Foerderung-Seite: Alter Header durch PortalHeader + PortalNav ersetzt
  - Dashboard-Seite: PortalNav hinzugefuegt
  - Berater-Navigation: Kunden | Berichte | Administration (nur system_admin)
  - "Import" aus Navigation entfernt (ZIM-Import ueber Firmen-Detail erreichbar)
- Fix: PortalHeader Prop userName statt userDisplayName auf Admin + Foerderung Seite

v7.3.93 (17. Februar 2026):
- PDF-Export Stundennachweis komplett ueberarbeitet:
  - window.print() statt window.open() (kein neuer Tab mehr)
  - document.title temporaer auf Dateinamen gesetzt
  - setTimeout(100ms) vor print() fuer macOS Titel-Registrierung
  - afterprint Event stellt Original-Titel wieder her
  - AP-Dropdowns: Dual-Element (select print:hidden + span hidden print:block)
  - @media print CSS: Alle selects versteckt, alle spans sichtbar

v7.3.92 (16. Februar 2026):
- PortalNav komplett ueberarbeitet:
  - Kumulative Rollen: Hoehere Rolle erbt ALLE Items der niedrigeren
  - Employee: Mein Status + Meine Zeiterfassung
  - Project Leader: + Meine Projekte + Zeiterfassung (alle MA) + Berichte
  - Client Admin: + Mitarbeiter + Firmendaten
  - Berater: Kunden + Berichte + Administration (nur system_admin)
- Prod-DB live mit Steuerkanzlei Robin Freund als erster Produktivkunde
- Vercel Environment-Variablen pro Environment (Production vs Preview)
- firma-dashboard v7.3.92: Alle Rollen sehen Dashboard + PortalNav

v7.3.91 (15. Februar 2026):
- Mein Status Seite (/v7/firma/mein-status) KOMPLETT NEU:
  - Ersetzt den Platzhalter mit vollstaendiger Funktionalitaet
  - Zeigt dem MA alle zugeordneten Projekte mit Ampel-Status pro Monat
  - Ampel: Gruen (alle Arbeitstage erfasst), Orange (in Bearbeitung),
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

---

## 4. Aktueller Stand: v7.4.3-12

### 4.1 Shared Components (src/components/shared/)

| Datei | Version | Funktion |
|-------|---------|----------|
| ArbeitsplanImport.tsx | 7.3.87 | Excel Download/Upload Buttons und Dialog |
| CapacityBar.tsx | 7.3.42 | Kapazitaets-Fortschrittsbalken |
| CompanyDataView.tsx | 7.3.57 | Firmendaten-Anzeige (readonly) |
| ConsultantManagement.tsx | 7.3.94-1 | Berater-Verwaltung (system_admin): CRUD, Befoerderung |
| DataTable.tsx | 7.3.42 | Generische Tabellen-Komponente |
| EmployeeManagement.tsx | 7.3.95-1 | MA-Verwaltung mit CRUD, Login, PW-Reset (amber Key) |
| Modal.tsx | 7.3.42 | Generische Modal-Komponente |
| PortalHeader.tsx | 7.3.95-4 | Header mit Rolle als Untertitel, PW-Aendern, print:hidden |
| PortalNav.tsx | 7.4.0 | Portal-Navigation: Zeiterfassungen-Link fuer Berater hinzugefuegt |
| ProjectCreateForm.tsx | 7.3.57 | Projekt anlegen (beide Portale) |
| ProjectDetailPage.tsx | 7.3.95-1 | Projekt-Detailseite mit Tabs, Arbeitsplan-Lock Buttons |
| ProjectList.tsx | 7.3.90 | Projektliste, Link-Fix firma/projekte |
| ProjectTeamManager.tsx | 7.3.95-1 | Team-Verwaltung mit Anlage 6.1 Feldern (pWAZ, Stundensatz) |
| TimesheetForm.tsx | 7.4.3-4 | Zeiterfassung mit PDF-Export, T/NT, AP Pre-Population Fix |
| WorkPackageAssignmentModal.tsx | 7.3.62 | MA einem AP zuordnen |
| WorkPackageEditModal.tsx | 7.3.52 | AP bearbeiten (Name, Zeitraum, PM) |
| WorkPackageList.tsx | 7.3.54 | AP-Liste mit Sortierung |
| WorkPackageTable.tsx | 7.4.3-7 | Arbeitsplan mit Lock/Unlock, verfeinerte Ampel-Farblogik |

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
| /v7/berater/dashboard | 7.4.4-4 | Kundenuebersicht: Projekte/MA-Spalten klickbar, Schnellzugriff Berichte+Zeiten |
| /v7/berater/foerderung | 7.3.94 | Kundenfirmen-Verwaltung (PortalHeader + PortalNav) |
| /v7/berater/admin | 7.3.94 | System-Administration (nur system_admin) |
| /v7/berater/berichte | - | Berichte (geplant, noch nicht implementiert) |
| /v7/berater/foerderung/firma/[id] | 7.4.4-2 | Firmen-Detail (5 Tabs), Header zeigt Firmenname |
| /v7/berater/foerderung/firma/[id]/berichte | 7.4.4-3 | Berichte und Controlling, Zurueck -> Dashboard |
| /v7/berater/foerderung/firma/[id]/zeiterfassung | 7.4.0-2 | Zeiterfassung, Header Firmenname, Zurueck -> Dashboard |
| /v7/berater/foerderung/firma/[id]/projekt/neu | - | Neues Projekt anlegen |
| /v7/berater/foerderung/firma/[id]/projekt/[id] | - | Projekt-Detail (Wrapper) |
| /v7/berater/timesheets | 7.4.0-5 | Zeiterfassungs-Uebersicht: Jahres-Slider, Projekt-Matrix, Vollstaendigkeits-Badge, MA aus Zuordnungen |
| /v7/berater/fzul | 7.3.1 | FZul Firmenauswahl |
| /v7/berater/fzul/analyse | - | FZul Kapazitaetsanalyse |

### 4.4 Firmen-Portal Pages (src/app/v7/firma/)

| Route | Version | Funktion |
|-------|---------|----------|
| /v7/firma | 7.3.42 | Redirect auf Dashboard |
| /v7/firma/dashboard | 7.3.95-1 | Firmen-Dashboard mit Modul-Kacheln, display_name Fallback |
| /v7/firma/projekte | 7.3.90 | Projektliste mit Rollencheck |
| /v7/firma/projekte/[id] | 7.3.90 | Projekt-Detail (Shared ProjectDetailPage) |
| /v7/firma/projekte/neu | - | Neues Projekt |
| /v7/firma/zeiterfassung | 7.3.95-1 | Zeiterfassung mit returnUrl, display_name Fallback |
| /v7/firma/berichte | 7.4.3-12 | Berichte mit Stundennachweis-Matrix, Rollencheck |
| /v7/firma/meine-projekte | 7.3.90 | Redirect auf /v7/firma/projekte |
| /v7/firma/mein-status | 7.3.95-4 | Zeiterfassungs-Uebersicht mit Ampel, Manual-Download, display_name Fallback |
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
| /api/v7/reset-password | 7.3.91-1 | Passwort zuruecksetzen (Admin-gesichert) |
| /api/v7/create-user | 7.4.1 | Server-seitige User-Erstellung (Service Role Key) |
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

### 5.9 Timesheet-Viewer: DB-Schema-Mismatch (v7.4.0-1, 23.02.2026)

Problem: Timesheet-Viewer zeigte 0 Eintraege obwohl Daten in DB vorhanden.
Ursache: Code erwartete eine Zeile pro Monat (total_hours, is_locked etc.),
aber v7_timesheets hat eine Zeile pro Tag (work_date, hours, day_type).
Loesung: aggregateTimesheets() Funktion baut Monatssummen aus Tageseintraegen zusammen.
Alle DB-Queries auf reales Schema angepasst.

### 5.10 Timesheet-Viewer: Leere Projekte zeigen keine Mitarbeiter (v7.4.0-5, 23.02.2026)

Problem: Projekte ohne ZE-Eintraege zeigten gar keine MA in der Matrix.
Kein Klick auf Zelle moeglich, daher keine Moeglichkeit Stunden neu zu erfassen.
Ursache: MA-Filter basierte auf aggregated-Daten: nur MA mit mindestens 1 Eintrag
wurden angezeigt. Bei neuen/leeren Projekten war diese Liste leer.
Loesung: MA aus v7_project_assignments laden (Projektzuordnungen).
Alle dem Projekt zugeordneten MA erscheinen in der Matrix, auch ohne ZE-Eintraege.
Fallback: wenn keine Zuordnungen existieren, altes Verhalten (MA mit Eintraegen).
Fehlermeldung verbessert: "Keine Mitarbeiter zugeordnet. Bitte zuerst MA im Projekteam hinterlegen."

### 5.11 Timesheet-Viewer: Zurueck-Button landet bei Firmendaten (v7.4.0-1, 23.02.2026)

Problem: Klick auf ZE-Zelle im Viewer -> Stundennachweis -> Zurueck fuehrte zur
Firmen-Detail-Seite (Firmendaten-Tab), nicht zurueck zum Timesheet-Viewer.
Ursache 1: Viewer sendete ?employeeId= statt ?employee= (falsche Parameternamen).
Die Berater-ZE-Seite erwartet ?employee= (konsistent mit Berichte-Seite).
Ursache 2: Berater-ZE-Seite (v7.3.88-6) kannte returnUrl-Parameter nicht.
Sie navigierte immer hardcoded zur Firmen-Detail-Seite.
Loesung 1: Viewer korrigiert auf ?employee=, ?year=, ?month=, ?returnUrl=.
Loesung 2: Berater-ZE-Seite v7.4.0-1 neu erstellt mit returnUrl-Support.
handleBack() wertet urlReturnUrl aus; default bleibt Firmen-Detail Tab Zeiterfassung.

### 5.12 KRITISCH: Firmenanlage loggt Berater aus (v7.4.1, 26.02.2026)

Problem: "Neue Firma anlegen" mit Admin-Login im Berater-Portal loggte den
aktuellen Berater aus. Fehlermeldung "User not allowed" bei Firmenanlage
auf Vercel Production.
Ursache: Client-seitiges supabase.auth.signUp() aendert die aktive Session.
Der Berater wurde durch den neuen Auth-User ersetzt und musste sich neu einloggen.
Loesung: Neue Server-seitige API-Route /api/v7/create-user (v7.4.1) erstellt.
Nutzt Supabase Admin API mit Service Role Key (SUPABASE_SERVICE_ROLE_KEY).
Auth-User wird server-seitig erstellt ohne die Client-Session zu beeinflussen.
Foerderung-Seite ruft jetzt fetch('/api/v7/create-user') statt signUp() auf.

### 5.13 User-Profil Duplikat bei Firmenanlage (v7.4.1-1, 26.02.2026)

Problem: "Firma und Auth-User erstellt, aber Profil-Erstellung fehlgeschlagen:
duplicate key value violates unique constraint v7_user_profiles_pkey"
Ursache: Supabase hat einen Database-Trigger, der beim Erstellen eines Auth-Users
automatisch ein leeres v7_user_profiles-Profil anlegt. Der Code versuchte danach
ein zweites INSERT mit den vollstaendigen Daten -> Duplikat-Fehler.
Loesung: INSERT durch UPSERT ersetzt (.upsert({...}, { onConflict: 'id' })).
Das leere Trigger-Profil wird mit den korrekten Daten (Rolle, Firma, Name) aktualisiert.

### 5.14 Firmenanlage erzeugt Duplikate bei Fehler (v7.4.1, 26.02.2026)

Problem: Bei fehlgeschlagener User-Erstellung wurde die Firma trotzdem angelegt.
Jeder erneute Klick auf "Speichern" erzeugte eine weitere Firma-Duplikate.
Ursache: Firma wird in Schritt 1 erstellt, User-Erstellung in Schritt 2.
Bei Fehler in Schritt 2 kein Rollback der Firma.
Status: Bekannt, wird in zukuenftiger Version durch Transaktions-Logik behoben.
Workaround: Doppelte Firmen manuell in Supabase loeschen.

### 5.15 KRITISCH: Berichte-Seite zeigt falsche PM-Zahlen (v7.4.3-8, 03.03.2026)

Problem: Erfasste PM wurden mit 11,3 statt korrekt 2,1 angezeigt.
Ursachen:
- Timesheet-Query fehlte `is_active=true` Filter -> geloeschte Eintraege mitgezaehlt
- PM-Berechnung filterte auf `day_type='work'` statt `is_billable=true`
- Fehlzeiten (U/K/S) wurden faelschlich als Projektstunden gezaehlt
Fix: is_active + is_billable Filter in Timesheet-Query.

### 5.16 Berichte: Falsche Tabelle fuer Soll-Stunden (v7.4.3-10, 03.03.2026)

Problem: Zeiterfassungs-Status zeigte Soll=0 und 0% fuer alle Mitarbeiter.
Ursache: Query las aus v7_project_assignments (hat keine planned_person_months).
Fix: Umstellung auf v7_work_package_assignments mit planned_person_months.

### 5.17 Berichte: portalRole nicht korrekt ermittelt (v7.4.3-9, 03.03.2026)

Problem: Navigation zeigte nur MA-Menuepunkte, Rolle fehlte unter Name im Header.
Ursache: Berichte-Seite nutzte userProfile.role (='client_user') statt
v7_employees.portal_role (='project_leader').
Fix: portal_role aus v7_employees lesen + an PortalHeader uebergeben.

### 5.18 Berichte: wpData Scope-Fehler (v7.4.3-11, 03.03.2026)

Problem: "wpData is not defined" Runtime-Fehler.
Ursache: wpData Variable innerhalb if-Block deklariert, Assignment-Query ausserhalb.
Fix: Beide Queries in denselben Scope verschachtelt.

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

### 6.3 next.config.ts

- TypeScript Build-Errors ignoriert (ignoreBuildErrors: true)
- ESLint bei Builds ignoriert (ignoreDuringBuilds: true)
- Cache-Kontrolle: no-store fuer alle /v7/ Routen

### 6.4 Git-Workflow

IMMER vor Git-Befehlen pruefen:
1. rm -f .git/index.lock (Lock-Datei loeschen)
2. git branch --show-current (muss v7-dev zeigen!)
3. Falls falscher Branch: git checkout v7-dev

#### 6.4.1 Letzte Git-Commits (Auszug)

| Datum | Commit | Branch | Beschreibung |
|-------|--------|--------|--------------|
| 09.03.2026 | v7.4.3-12 | v7-dev + main | Stundennachweis-Matrix in Berichte (Firma + Berater) |
| 23.02.2026 | v7.4.0 | v7-dev + main | Timesheet-Viewer Berater-Portal, Jahres-Slider, Projekt-Matrix |
| 20.02.2026 | v7.3.95 | v7-dev + main | Ampel-Fix, Manual-Download, Arbeitsplan-Lock, Rollen-Header |
| 17.02.2026 | v7.3.92-94 | v7-dev + main | Berater-Verwaltung, PDF-Export, kumulative Rollen, Prod-DB |
| 08.02.2026 | v7.3.88 | v7-dev + main | Berichte-Modul, Null-Safety Fix, Branch-Synchronisation |

#### 6.4.2 Standard-Commit-Ablauf

```bash
cd ~/Documents/Dev/PZE
rm -f .git/index.lock
git branch --show-current          # muss: v7-dev
git add [geaenderte Dateien]
git commit -m "v[Version]: [Kurzbeschreibung]"
git push origin v7-dev             # -> Vercel Preview Auto-Deploy
git checkout main
git merge v7-dev
git push origin main               # -> Vercel Production Auto-Deploy
git checkout v7-dev
```

### 6.5 Email-Infrastruktur

Provider: Resend.com
Absender: cubintec.pze@itenion.com ("Cubintec PZE")
SMTP: smtp.resend.com:587
Domain: send.itenion.com
Status: DKIM verifiziert, MX verifiziert, SPF konfiguriert (Strato DNS)

### 6.6 Supabase

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

Firmen-Portal: Hoehere Rollen erben ALLE Nav-Items der niedrigeren:
- employee: Mein Status, Meine Zeiterfassung
- project_leader: + Meine Projekte, Zeiterfassung (alle MA), Berichte
- client_admin: + Mitarbeiter, Firmendaten

Berater-Portal:
- consultant: Kunden, Berichte
- system_admin: + Administration

### 7.13 PDF-Export Stundennachweis (v7.3.93)

Verwendet window.print() im aktuellen Tab (kein neuer Tab):
- document.title temporaer auf gewuenschten Dateinamen gesetzt
- setTimeout(100ms) vor print() noetig fuer macOS Titel-Registrierung
- afterprint Event stellt Original-Titel wieder her
- Fallback-Timeout (10s) falls afterprint nicht feuert
- AP-Dropdowns: select mit print:hidden + span mit hidden print:block

### 7.14 Berater-Verwaltung (v7.3.94)

Nur system_admin kann weitere Berater anlegen/verwalten.
Beim Anlegen wird geprueft ob Email in v7_user_profiles existiert:
- Ja: UPDATE (Rolle + consultant_company_id setzen) - User wird befoerdert
- Nein: Neuer Auth-User + v7_user_profiles INSERT
Rollen: consultant (Kunden betreuen) oder system_admin (Vollzugriff)

### 7.15 Ampel-System Mein Status (v7.3.95)

Vollstaendigkeitspruefung basiert auf Arbeitstagen (Werktage minus Feiertage):
- Gruen: Alle Arbeitstage des Monats haben Eintraege (Stunden, Fehlzeiten oder nicht foerderbar)
- Orange: In Bearbeitung (mindestens ein Eintrag vorhanden)
- Rot: Nicht erfasst (keine Eintraege)
- Grau: Zukuenftig (Monat liegt in der Zukunft)
- Weiss: Ausserhalb des Projektzeitraums

KEINE Prozent-Schwelle (80% etc.) - ein Monat ist nur vollstaendig wenn ALLE Arbeitstage belegt sind.

### 7.16 User Manuals (v7.3.95)

Drei PDF-Anleitungen fuer das Firmen-Portal in /public/manuals/:
- PZE_Kurzanleitung_Mitarbeiter.pdf (1 Seite)
- PZE_Kurzanleitung_Projektleiter.pdf (1 Seite)
- PZE_Schnellstart_Firmen-Administrator.pdf (2 Seiten)

Rollenbasierter Download-Link auf der "Mein Status"-Seite.
Jeder Benutzer sieht nur die fuer seine Rolle passende Anleitung.

### 7.17 PortalHeader User-Menu (v7.3.95)

User-Dropdown enthaelt in fester Reihenfolge:
1. User-Info (Name, Rolle, Email, Firma) - nur Anzeige
2. "Passwort aendern" (KeyRound Icon) - Modal mit Validierung
3. "Abmelden" (LogOut Icon) - Supabase signOut

Rolle als Untertitel im Header-Button (unter dem Namen):
- system_admin: "Berater (Systemadmin)"
- consultant: "Berater"
- client_admin: "Administrator"
- project_leader: "Projektleiter"
- employee: "Mitarbeiter"

Passwort-Aenderung: supabase.auth.updateUser({ password }) - kein SMTP noetig.
Passwort-Reset (vergessen): Nur durch Berater im Mitarbeiter-Management (amber Key-Icon).

### 7.18 Arbeitsplan einfrieren (v7.3.95)

workplan_locked Boolean in v7_projects steuert den Lock-Status:
- Einfrieren: Nur wenn Arbeitspakete existieren, Bestaetigung mit Checkbox
- Gesperrt: Alle AP-Buttons deaktiviert, Badge "Bewilligt (gesperrt)"
  ProjectDetailPage: Buttons "Vorlage", "Import", "Neues AP" ausgeblendet
- Entsperren: Nur im Berater-Portal (consultant + system_admin), Kommentar-Pflicht
- Legende: "Arbeitsplan gesperrt - Entsperren nur durch Systemadministrator"

### 7.19 display_name Fallback (v7.3.95-8)

Alle Firmen-Portal Seiten laden display_name aus v7_employees als Fallback,
wenn v7_user_profiles.display_name NULL ist. Betrifft:
- Mein Status, Dashboard, Zeiterfassung, Berichte
Employee-Query wird um display_name erweitert und vor setUserProfile angewendet.

### 7.20 createUserProfile Regel (v7.3.95-8)

Beim Erstellen eines Login fuer Firmen-Mitarbeiter (EmployeeManagement):
- role MUSS immer 'client_user' sein (NICHT 'employee' oder 'client_admin')
- Die Portal-Rolle (employee/project_leader/client_admin) steht in v7_employees.portal_role
- client_company_id MUSS gesetzt werden (Pflichtfeld fuer Firmen-Portal Routing)

### 7.21 Timesheet-Viewer Berater-Portal (v7.4.0)

(bestehender Inhalt)

### 7.25 Stundennachweis-Matrix Berichte (v7.4.3-12)

Aufklappbare Matrix in der Berichte-Seite beider Portale.

Ziel: Ein-Klick-Zugriff auf die Zeiterfassung eines beliebigen MA/Monats,
ohne durch Projekt -> Zeiterfassung -> MA navigieren zu muessen.

Aufbau:
- Kachel "Stundennachweis" klicken: Matrix klappt darunter auf/zu
- Firmen-Portal: Kachel gruen (Firmen-Farbe); Berater-Portal: Kachel blau
- Zeilen: alle dem Projekt zugeordneten MA (Quelle: v7_work_package_assignments)
- Spalten: alle Projektmonate (von project.start_date bis project.end_date)
  gruppiert nach Jahr mit "Jahr N (JJJJ)"-Kopfzeile
- MA-Name in linker Spalte sticky beim horizontalen Scrollen
- Bei mehreren Projekten: Dropdown-Auswahl (Standard: erstes Projekt)

Ampelfarben:
- Gruen (CheckCircle): Alle Arbeitstage des Monats haben Eintraege
- Orange (AlertTriangle): Mindestens ein Eintrag, aber nicht vollstaendig
- Rot (XCircle): Kein einziger Eintrag vorhanden (Monat vergangen)
- Grau (-): Monat liegt in der Zukunft -> nicht klickbar

Vollstaendigkeitspruefung: daysRecorded >= workingDays (Arbeitstage minus Feiertage).
Feiertage werden anhand federal_state der Firma berechnet (getGermanHolidays).

Klick-Navigation:
- Firmen-Portal: /v7/firma/zeiterfassung?employee=[id]&year=[y]&month=[m]&returnUrl=[encoded]
- Berater-Portal: /v7/berater/foerderung/firma/[companyId]/zeiterfassung?...&returnUrl=[encoded]
- returnUrl zeigt zurueck auf die Berichte-Seite (kein Navigationsverlust)
- Zukuenftige Monate und Status "outside" sind nicht klickbar

### 7.26 Personalkosten Excel-Export (v7.4.3-13 bis v7.4.3-19)

Kachel "Personalkosten" in der Berichte-Seite (Firmen-Portal) ist aktiv.
Klick oeffnet aufklappbares Inline-Panel (wie Stundennachweis-Matrix).

Panel-Inhalt:
- Projekt-Dropdown (nur wenn mehrere Projekte vorhanden)
- Von/Bis Datumsfelder (Default: Projektstart / heute)
- "Excel herunterladen"-Button (erst aktiv wenn beide Felder gefuellt)
- Anzeige des gewaehlten Abrechnungszeitraums als Textzeile

Export: Echtes XLSX (xlsx npm-Paket v0.18.5, bereits in package.json).
Dateiname: Personalkosten_[Projektname]_[VonDatum]-[BisDatum].xlsx

Sheet 1 "Personalkosten":
- Kopf: Projektname, FKZ, Abrechnungszeitraum, Projektlaufzeit, Erstelldatum
- Tabelle: Lfd.Nr | Name | Qualifikation | Jahresgehalt | pWAZ | Stundensatz |
           Geplante PM | Erfasste Stunden (im Zeitraum) | Erfasste PM |
           Personalkosten bisher | Geplante Gesamtkosten
- Summenzeile + Rechenhinweise

Sheet 2 "Jahresscheiben (Anlage 5)":
- Pro MA: Stundensatz + PM je Projektjahr (anteilig aus AP-Zeitraeumen)
- Jahresspalten: "Jahr 1 (2026)", "Jahr 2 (2027)", etc.
- Gesamt PM + Personalkosten gesamt
- Summenzeile + Hinweis (1 PM = 173,33 h)

Datenbasis:
- v7_project_assignments: hourly_rate, employee_number, role_in_project
- v7_employees: annual_salary, weekly_hours, qualification (JOIN)
- v7_work_package_assignments: planned_person_months
- v7_timesheets: gefiltert nach work_date >= Von AND work_date <= Bis AND is_billable=true
- v7_work_packages: start_date, end_date (fuer Jahresscheiben-Berechnung)

Rolle im ZA-Prozess: Internes Arbeitswerkzeug / Dokumentation.
Naechste Stufe: ZA-Modul (Kachel 4) mit ZIM-Formular-Aufbereitung.

### 7.27 ZA-Modul (v7.4.4 - deployed)

Zweck: Aufbereitung der Abrechnungsdaten fuer die ZIM-Zahlungsanforderung.
NICHT ein fertiges PDF - sondern strukturierte Datenaufstellung zum
manuellen Uebertragen ins Original-ZIM-Formular (VDI/VDE-IT ZIM-Foyer).

**Strategische Entscheidung (12.03.2026):**
Das offizielle ZIM-Formular (VDI/VDE-IT) kann nicht durch ein eigenes PDF
ersetzt werden (XML-Struktur, QR-Codes, Rechtsverbindlichkeit).
ZA-Modul ist reine Datenaufbereitung - kein PDF-Export, kein Wizard.

**Implementierter Funktionsumfang (v7.4.4-18, 13.03.2026):**

Zwei ZIM-Formulartypen (unterschiedliche Struktur):

Typ 1: ZIM FuE-Einzelprojekt (funding_format = 'ZIM')
- Seite 5 (Deckblatt): Personal (gesamt), Zuschlag ubrige Kosten (1 Satz %),
  Auftraege Dritte, FuE-Unterauftrag, Zeitw. Personalaufnahme,
  Foerdersatz (%), anteilige Zuwendung
- Seite 6 / Anlage 1a: Pro MA: Stunden je Monat + Summe (eine Spalte)
- Seite 7 / Anlage 1b: Pro MA: foerderbare Stunden, Stundensatz, Personalkosten

Typ 2: ZIM Durchfuehrbarkeitsstudie (funding_format = 'ZIM_DS')
- Seite 5 (Deckblatt): Personal technisch + Personal nichttechnisch getrennt,
  je eigener Zuschlag T% und NT%, Auftraege wiss.qual. Dritte T/NT getrennt
- Seite 6 / Anlage 1a: Pro MA: Stunden je Monat in zwei Spalten (T / NT)
- Seite 7 / Anlage 1b: Stunden T/NT + Stundensatz + Personalkosten T/NT getrennt

**ZAPanel Tabs (v7.4.4-18):**
1. Deckblatt (Seite 5): Kostenaufstellung, Foerdersatz, anteilige Zuwendung
2. Anlage 1a - Personenstunden: MA x Monat Tabelle
3. Anlage 1b - Personalkosten: MA, Stunden, Stundensatz, Kosten
4. Archiv: Uebersicht aller gespeicherten ZAs mit Status und Datumsangaben

**Status-Workflow (v7.4.4-17):**
- Entwurf (grau) -> Eingereicht (blau) -> Bewilligt (gruen)
- Statuswechsel per Button im Deckblatt-Tab
- Einreichdatum und Bewilligungsdatum werden automatisch gesetzt (TIMESTAMPTZ)
- Ruecksetzen auf Entwurf jederzeit moeglich (loescht Datumsfelder)

**ZA-Ampel in Mein-Status (v7.4.4-5):**
- Sektion "Naechste Zahlungsanforderung" fuer client_admin + project_leader
- Nur fuer ZIM-Projekte (funding_format beginnt mit 'ZIM')
- Faelligkeits-Prioritaet:
  1. zeitraum_bis der letzten ZA mit Status eingereicht/bewilligt + 3 Monate
  2. naechste_za_faellig aus v7_projects (manuell)
  3. start_date + 3 Monate (absoluter Fallback)
- Ampelfarben: GRUEN (>30 Tage + Stunden ok), GELB (<=30 Tage oder Stunden fehlen),
  ROT (<=14 Tage oder Stunden fehlen bei Frist <=30 Tage)
- Info-Zeile "Basis: ZA X (bewilligt)" zeigt Berechnungsgrundlage

**DB-Schema ZA:**
```sql
v7_zahlungsanforderungen:
  id, project_id, za_nummer, zeitraum_von, zeitraum_bis
  auftraege_dritte_t, auftraege_dritte_nt
  fue_unterauftrag, zeitw_personalaufnahme
  status TEXT DEFAULT 'entwurf'  -- entwurf/eingereicht/bewilligt
  notizen TEXT
  eingereicht_am TIMESTAMPTZ     -- gesetzt bei Statuswechsel zu 'eingereicht'
  bewilligt_am   TIMESTAMPTZ     -- gesetzt bei Statuswechsel zu 'bewilligt'
  created_at, updated_at
```

**Wichtiger Bug-Fix (v7.4.4-5):**
isAdminOrPL-Pruefung in mein-status-page nutzt userPortalRole (aus v7_employees.portal_role),
NICHT profile.role (das ist fuer alle Firmen-User immer 'client_user').
Ohne diesen Fix wurde die ZA-Abfrage nie ausgefuehrt.


### 7.28 ZAPanel Architektur - Shared Component (v7.4.4-20)

ZAPanel ist ein reiner Panel-Container ohne eigenen Button und ohne show/hide State.

**Datei:** `src/components/shared/ZAPanel.tsx`

**Designprinzip (analog showMatrix fuer Stundennachweis):**

```
Page (firma oder berater)
+-- 4er-Grid:
|   +-- Kachel 1: Personalkosten
|   +-- Kachel 2: Stundennachweis
|   +-- Kachel 3: Projekt-Fortschritt (disabled)
|   +-- Kachel 4: ZA-Button (normaler <button>, statische Tailwind-Klassen)
+-- {showZA && <ZAPanel portal="firma|berater" ... />}  <- volle Breite, ausserhalb Grid
```

**ZAPanel-Props:**
- portal: 'firma' | 'berater'
- projects, workPackages, wpAssignments, employees, timesheets, projectAssignments

**Warum kein Fragment-Ansatz:**
Fragment (`<>button + panel</>`) als Grid-Item funktioniert nicht - Button nimmt
volle Grid-Breite, da Fragment kein DOM-Element ist. Button muss direkt im Grid
sein, Panel ausserhalb.

**Warum inline style fuer Hover:**
Tailwind-Klassen in dynamischen Template-Strings (z.B. `hover:bg-green-50` via
Variable) werden beim Production-Build von Tailwind weggestrichen (Purging).
Loesung: `onMouseEnter/Leave` mit inline style (#eff6ff blue-50, #f0fdf4 green-50).

**Datenladung:**
ZAPanel laedt Daten automatisch via useEffect beim ersten Render.
Kein manuelles Triggern erforderlich.

**Farbregel:**
- portal="berater" -> Blau (#002451 Header, blue-* Akzente)
- portal="firma" -> Gruen (#65A655 Header, green-* Akzente)

---

### 7.22 Arbeitsplan Ampel-Farblogik (v7.4.3)

- "Erfasst (h)"-Spalte: Weisser oder oranger Hintergrund (KEIN Rot)
  - Weiss = planmaessig
  - Orange = Warnung: Zeitfortschritt - Erfassungsgrad > 25 Prozentpunkte
- "Frei (h)"-Spalte: Immer heller gruener Hintergrund
  - Gruene Schrift = Stunden verfuegbar
  - Rote Schrift = Budget ueberschritten
- Keine "AP abgelaufen"-Logik - APs koennen ueber geplanten Zeitraum hinaus laufen

### 7.23 Berichte & Controlling Firmen-Portal (v7.4.3)

- Timesheet-Query: IMMER `.eq('is_active', true)` und `is_billable` fuer PM-Berechnung
- Soll-Stunden: Aus `v7_work_package_assignments.planned_person_months` (NICHT project_assignments!)
- Projekt-Uebersicht: 2 Fortschrittsbalken uebereinander
  - Gruen/Orange/Rot = Erfassungsfortschritt (PM/Stunden)
  - Blau = Laufzeitfortschritt (Zeitablauf)
  - Warning wenn Erfassung > 25 Pp hinter Laufzeit
- Zeiterfassungs-Status: Stunden-basiert (Soll/Erfasst/Offen) mit Fortschrittsbalken
  - Bezug: Gesamtprojekt (kein Monats-Dropdown)
  - Offen-Spalte: Gruene Schrift = verfuegbar, Rote Schrift = ueberschritten
- portalRole korrekt aus v7_employees.portal_role lesen (nicht userProfile.role)

### 7.24 FAQ Zeiterfassung (v7.4.3)

- PDF und DOCX in public/manuals/PZE-FAQ-Zeiterfassung-v1.*
- Cubintec-Logo im Header, Copyright/Version im Footer
- Klickbares Inhaltsverzeichnis mit Anker-Links
- 7 Kapitel: Grundlagen, AP-Zuordnung, Offen-Spalte, Fehlzeiten, Speichern/Drucken, Arbeitsplan, Probleme
- Download-Link auf Mein Status-Seite fuer alle Rollen (blauer Hintergrund)

Neue Seite `/v7/berater/timesheets` fuer firmenuebergreifende Stundenuebersicht.

**Zweck:** Schneller Ueberblick welche Stundenerfassungen in der Datenbank vorliegen,
ohne durch einzelne Firmenseiten navigieren zu muessen.

**Struktur (2-Ebenen-Hierarchie):**

Ebene 1 - Firmentabelle (immer sichtbar):
- Spalten: Firma | Projekte | Jahre mit Daten | Eintraege gesamt
- Klick auf Zeile klappt Ebene 2 auf (Accordion)

Ebene 2 - Projekt/Jahres-Matrix (aufklappbar pro Firma):
- Filter: Jahr-Auswahl (Dropdown, Standard: aktuelles Jahr)
- Gruppen: je Projekt eine Matrix-Tabelle
- Matrix: Mitarbeiter (Zeilen) x Monate Jan-Dez (Spalten)
- Zellinhalt: Stunden (z.B. "42h") + Ampelfarbe
- Tooltip bei Hover: Gesamtstunden, T-Stunden, Anzahl Tage
- Jede ausgefuellte Zelle = direkter Link zur Zeiterfassung:
  `/v7/berater/foerderung/firma/[firmaId]/zeiterfassung?employeeId=[id]&year=[y]&month=[m]`
- Leere Zellen (kein Eintrag in DB): klickbar zum Anlegen

**Ampel-Logik (identisch Mein-Status):**
- Gruen: total_hours > 0 (vollstaendig)
- Orange: Eintrag vorhanden, total_hours = 0 oder unvollstaendig
- Rot: kein Eintrag in DB
- Grau: Monat liegt in der Zukunft

**FZul-Erweiterung (vorbereitet, Tab noch nicht aktiv):**
- Toggle: "Zeiterfassung" | "FZul-Analyse"
- FZul-Ansicht: T-Stunden / NT-Stunden / Fehlzeiten je Zelle
- Basis fuer paragraf 35a EStG Jahresauswertung

**Navigation Berater-Portal:**
- Neuer Nav-Punkt "Zeiterfassungen" in PortalNav
- Position: nach "Berichte", vor "Administration"

---

## 8. Testdaten

| Firma | ID (gekuerzt) | MA | Projekte |
|-------|---------------|-----|----------|
| Tippl GmbH | d83be07e... | 4 | DigiTrans (ZIM) |
| AS System GmbH | ba3afa6c... | 4 | ANOVIA (ZIM DS) |
| Steuerkanzlei Robin Freund | 105a0bcb... | 4 | ANOVIA (ZIM DS) |

Test-User:
| Name | Rolle | Portal |
|------|-------|--------|
| Martin Ditscherlein | system_admin | Berater |
| Katrin Kirchner | consultant | Berater |
| Robin Freund | client_admin | Firma (Steuerkanzlei Freund) |
| Annika Arndt | project_leader | Firma (Steuerkanzlei Freund) |
| Anett Mueller | employee | Firma (Steuerkanzlei Freund) |
| Carolin Schoebel | employee | Firma (Steuerkanzlei Freund) |

---

## 9. Geplante naechste Schritte

### 9.1 Kurzfristig (naechste Session)

- ~~Stundennachweis-Matrix in Berichte (Firma + Berater)~~ ERLEDIGT v7.4.3-12
- ~~Personalkosten Excel-Export mit Zeitraum-Filter~~ ERLEDIGT v7.4.3-19
- ~~ZAPanel Architektur-Redesign (Button im Grid, Panel extern)~~ ERLEDIGT v7.4.4-20
- ~~ZA-Kachel umbenannt + ZIM-Hinweiskasten~~ ERLEDIGT v7.4.4-16
- ~~ZA Status-Workflow (Entwurf/Eingereicht/Bewilligt)~~ ERLEDIGT v7.4.4-17
- ~~ZA-Ampel in Mein-Status (Faelligkeit aus eingereichten ZAs)~~ ERLEDIGT v7.4.4-5
- ~~ZA-Archiv Tab (Uebersicht aller ZAs mit Status + Daten)~~ ERLEDIGT v7.4.4-18
- Firma-Detailseite im Berater-Portal: Header noch gruen statt blau (TODO)
- Stundensatz-Diskrepanz pruefen: Annika Arndt (Claude: 20.19 EUR vs. Robin: 20.35 EUR)
- User Manual Berater-Portal erstellen

### 9.2 Mittelfristig (v7.4+)

- Projekt-Fortschritt Kachel: Grafische Auswertung (Zeitstrahl + Kostenkurve)
- ZIM PDF Import im Firmen-Portal aktivieren (nach Parser-Stabilisierung)
- Excel-Import fuer ZIM und BMBF Zeiterfassungsdaten
- Firmenlogo-Upload und -Anzeige
- Firmendaten-Bearbeitung im Berater-Portal
- Email-Einladungssystem fuer neue Benutzer

### 9.3 Langfristig (v7.4+)

- FZul-Integration: Migration der V6-Funktionen
- FZul Online-Editor mit Status-Workflow
- FZul Excel-Import und PDF-Archiv
- Modul-basierte Lizenzierung
- User Manual Berater-Portal

---

## 10. Aenderungshistorie Pflichtenheft

| Version | Datum | Aenderungen |
|---------|-------|-------------|
| v4.44 | 13.03.2026 | v7.4.4-17/18/5: ZA Status-Workflow, ZA-Ampel (automatisch aus ZA-Daten), Archiv-Tab, Bug-Fix isAdminOrPL |
| v4.43 | 12.03.2026 | v7.4.4-16: ZA-Kachel umbenannt, ZIM-Hinweiskasten, strategische Entscheidung ZA-Modul vereinfacht |
| v4.42 | 11.03.2026 | v7.4.4-20: ZAPanel Redesign (Button im Grid, Panel extern), Abschnitt 7.28, offene Punkte aktualisiert |
| v4.41 | 10.03.2026 | v7.4.4: Berater-Portal Navigation, ZA-Modul Kachel-Struktur, ZAPanel Shared Component |
| v4.39 | 09.03.2026 | v7.4.3-12: Stundennachweis-Matrix Berichte Firma + Berater, Abschnitt 7.25 |
| v4.38 | 03.03.2026 | v7.4.3: TimesheetForm Pre-Population Fix, Arbeitsplan Ampel-Farblogik, FAQ PDF, Berichte-Umbau |
| v4.37 | 26.02.2026 | v7.4.1: Server-seitige User-Erstellung, UPSERT Trigger-Fix, Bugs 5.12-5.14 |
| v4.36 | 23.02.2026 | v7.4.0 Fixes: MA aus Projektzuordnungen, URL-Parameter, Zurueck-Button, Bugs 5.9-5.11 |
| v4.35 | 23.02.2026 | v7.4.0 Git-Sicherung: Timesheet-Viewer deployed (v7-dev + main), Pflichtenheft aktualisiert |
| v4.34 | 23.02.2026 | v7.4.0 Start: Timesheet-Viewer Berater-Portal, Jahres-Slider, Projekt-Laufzeit, Vollstaendigkeits-Badge |
| v4.33 | 20.02.2026 | v7.3.95-8: Arbeitsplan-Lock, Rollen-Header, PW-Reset, display_name Fallback, Live-Test |
| v4.32 | 18.02.2026 | v7.3.95: Ampel-Fix (100% statt 80%), In Bearbeitung, Manual-Download, PW-Fix, User Manuals |
| v4.31 | 17.02.2026 | v7.3.92-94: Berater-Verwaltung, PortalNav Berater-Portal, PDF-Export Fix, kumulative Rollen, Prod-DB |
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

**Ende des Pflichtenhefts v4.44**
**Letzte Aktualisierung: 13. Maerz 2026**
