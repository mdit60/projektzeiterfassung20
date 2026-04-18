# PFLICHTENHEFT - Projektzeiterfassung (PZE)

**Version:** 4.46
**SW-Release:** V7.4.4
**Datum:** 22. Maerz 2026
**Projekt:** Projektzeiterfassung fuer FuE-Foerdervorhaben
**Status:** V7.4.4-31 deployed auf v7-dev + main - ProjectDetailPage Neuaufbau, AP-Import funktioniert

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
DIESELBEN Komponenten; portal-Parameter steuert Farbe. Niemals Code duplizieren.

Nokia/Apple-Prinzip: Alle Funktionen sofort verstaendlich, keine Hover-Versteckung.

---

## 2. Datenbankschema

### 2.1 Kern-Tabellen

| Tabelle | Beschreibung |
|---------|--------------|
| v7_user_profiles | Login-User (email, role, client_company_id) |
| v7_client_companies | Kundenfirmen |
| v7_employees | Mitarbeiter einer Firma (portal_role, email) |
| v7_projects | Projekte (funding_format, workplan_locked) |
| v7_work_packages | Arbeitspakete eines Projekts |
| v7_project_assignments | MA-Projekt-Zuordnung (hourly_rate, employee_number) |
| v7_work_package_assignments | MA-AP-Zuordnung (planned_person_months, is_active) |
| v7_timesheets | Zeiterfassungs-Eintraege (work_date, hours, day_type) |
| v7_zahlungsanforderungen | ZA pro Projekt (za_nummer, zeitraum, status) |

### 2.2 Wichtige Architektur-Regeln

- `v7_work_package_assignments` ist Single Source of Truth fuer MA-Projekt-Beziehungen
- Stundensaetze gehoeren in `v7_project_assignments` (projektspezifisch)
- Profil-Lookup IMMER via `.eq('email', user.email)` - NICHT via `.eq('id', user.id)`
- `portal_role` fuer Berechtigungen aus `v7_employees.portal_role` lesen
  (NICHT aus `v7_user_profiles.role` - der ist bei Firmen-Usern immer 'client_user')
- `funding_format` ist enum-Typ: bei LIKE-Vergleichen `::TEXT` Cast erforderlich
- Personenmonate: 173.33 h/PM (40h/Woche x 52/12)

### 2.3 Neue User anlegen - Checkliste

Bei jedem neuen Firmen-User pruefen:
1. auth.users Eintrag vorhanden? (Supabase Authentication)
2. v7_user_profiles Eintrag vorhanden? (role = 'client_user')
3. client_company_id in v7_user_profiles gesetzt?
4. v7_employees Eintrag vorhanden? (portal_role gesetzt)

Fehlt Punkt 3 -> User landet nach Login auf leerem Login-Bildschirm (kein Fehler-Hinweis)

---

## 3. Entwicklungshistorie

### 3.1 Phase 1-3 (Oktober - Dezember 2024)

V6 Grundlagen, FZul-Modul, ZIM-Import-Konzept, DB-Schema

### 3.2 Phase 4: V7 Kern (Januar - Februar 2026)

v7.3.42 - v7.3.86: Kompletter V7-Neuaufbau mit Dual-Portal-Architektur,
Shared Components, Rollen-System, ZIM-Import, Zeiterfassung, Berichte

### 3.3 Phase 4 Fortsetzung (Februar 2026)

v7.3.87 (03. Februar 2026):
- ArbeitsplanImport Shared Component: Excel Vorlage Download + Upload
- ProjectDetailPage: Team-Tab mit ProjectTeamManager
- Sortierung MA im Arbeitsplan nach employee_number

v7.3.88 - v7.3.95 (12.-20. Februar 2026):
- ProjectTeamManager: Anlage 6.1 Felder (pWAZ, Stundensatz, employee_number)
- Arbeitsplan einfrieren (workplan_locked), Entsperren nur Berater
- PortalHeader: Rolle als Untertitel, Passwort-Aendern
- EmployeeManagement: PW-Reset, Login-Verknuepfung Fix
- User Manuals (3 PDFs): Mitarbeiter, Projektleiter, Firmen-Administrator
- Mein Status: FAQ-Download, Ampel-Fix (100% statt 80%)
- Prod-DB live: Steuerkanzlei Robin Freund als erster Produktivkunde

### 3.4 Phase 5: Berater-Analysetools (Februar - Maerz 2026)

v7.4.0 (23. Februar 2026):
- Timesheet-Viewer Berater-Portal (/v7/berater/timesheets)
- Jahres-Slider, Vollstaendigkeits-Badge, Direktnavigation
- PortalNav: Zeiterfassungen-Link fuer Berater

v7.4.3 (03.-09. Maerz 2026):
- TimesheetForm: AP-Pre-Population Timing-Fix
- WorkPackageTable: Ampel-Farblogik verfeinert
- FAQ Zeiterfassung PDF erstellt
- Berichte & Controlling: Stundennachweis-Matrix (Firma + Berater)
- Plan/Ist-Vergleich, Doppel-Fortschrittsbalken, Ampel

v7.4.4 (10.-22. Maerz 2026):
- Berater-Portal Navigation ueberarbeitet
- ZA-Modul vollstaendig:
  - ZAPanel Shared Component (Deckblatt, Anlage 1a, Anlage 1b)
  - Status-Workflow: Entwurf -> Eingereicht -> Bewilligt
  - ZA-Archiv Tab in ProjectDetailPage
  - ZA-Ampel in Mein-Status (naechste_za_faellig aus eingereichten ZAs)
  - ZIM-Hinweiskasten auf allen Tabs
  - Entscheidung: kein eigenes PDF, Datenaufbereitung fuer ZIM-Formular
- FirmendatenCard Shared Component
- ProjectTeamManager v7.4.4-4: AddMemberDialog mit Anlage-6.1-Feldern
- Berater-Dashboard: Neue Firma Modal
- ProjectDetailPage v7.4.4-31: KOMPLETTER NEUAUFBAU (Session 6)
  - Profil-Query korrekt via email
  - WP-Assignments ohne !inner
  - Alle Shared-Component-Props typsicher
  - AP-Import und AP-Tabelle funktionieren

### 3.5 Bekannte Bugs und Loesungen

**Bug: isAdminOrPL prueft falsche Quelle**
- Problem: `profile.role` ist bei allen Firmen-Usern immer 'client_user'
- Loesung: `employee.portal_role` aus `v7_employees` verwenden

**Bug: Profil-Query schlaegt fehl**
- Problem: `.eq('id', user.id)` findet kein Ergebnis
- Loesung: `.eq('email', user.email)` verwenden

**Bug: wpAssignments bleibt leer**
- Problem: `!inner` in Supabase-Query wirft silent exception
- Loesung: Einfaches `.select().in().eq()` ohne !inner

**Bug: User landet nach Login auf leerem Login-Bildschirm**
- Problem: `client_company_id` in `v7_user_profiles` ist NULL
- Loesung: SQL UPDATE direkt in Supabase

**Bug: Komplexe JSX-Dateien nach str_replace korrupt**
- Loesung: Immer kompletten Neuaufbau statt Patching bei grossen Dateien

---

## 4. Komponenten-Uebersicht

### 4.1 Shared Components (src/components/shared/)

| Datei | Version | Funktion |
|-------|---------|----------|
| ArbeitsplanImport.tsx | 7.3.87 | Excel Download/Upload (hasTeam, teamCount, onImportComplete, portal) |
| CapacityBar.tsx | 7.3.42 | Kapazitaets-Fortschrittsbalken |
| CompanyDataView.tsx | 7.3.57 | Firmendaten-Anzeige (readonly) |
| ConsultantManagement.tsx | 7.3.94-1 | Berater-Verwaltung (system_admin) |
| DataTable.tsx | 7.3.42 | Generische Tabellen-Komponente |
| EmployeeManagement.tsx | 7.3.95-1 | MA-Verwaltung mit Login, PW-Reset |
| FirmendatenCard.tsx | 7.4.4-1 | Firmendaten-Karte (Shared) |
| Modal.tsx | 7.3.42 | Generische Modal-Komponente |
| PortalHeader.tsx | 7.3.95-4 | Header mit Rolle, PW-Aendern, print:hidden |
| PortalNav.tsx | 7.4.4-1 | Portal-Navigation |
| ProjectCreateForm.tsx | 7.3.57 | Projekt anlegen |
| ProjectDetailPage.tsx | 7.4.4-31 | Projekt-Detailseite - NEUAUFBAU Session 6 |
| ProjectList.tsx | 7.3.90 | Projektliste |
| ProjectTeamManager.tsx | 7.4.4-4 | Team-Verwaltung mit Anlage-6.1-Feldern |
| TimesheetForm.tsx | 7.4.3-4 | Zeiterfassung mit PDF-Export |
| WorkPackageAssignmentModal.tsx | 7.3.62 | MA einem AP zuordnen |
| WorkPackageEditModal.tsx | 7.3.52 | AP bearbeiten |
| WorkPackageList.tsx | 7.3.54 | AP-Liste mit Sortierung |
| WorkPackageTable.tsx | 7.4.3-7 | Arbeitsplan mit Lock/Unlock, Ampel |
| ZAPanel.tsx | 7.4.4-18 | ZA-Formular (Deckblatt, Anlage 1a/1b), Status-Workflow |

### 4.2 Konfigurations-Dateien

| Datei | Version | Funktion |
|-------|---------|----------|
| v7-module-config.ts | 7.3.90-4 | Modul-Konfiguration mit portalRoles |
| v7-types.ts | 7.4.0 | TypeScript-Typen fuer V7 |

### 4.3 Wichtige Props-Interfaces (Referenz)

**ArbeitsplanImport:**
```
projectId: string
hasTeam: boolean
teamCount: number
onImportComplete: () => void
portal: 'berater' | 'firma'
```

**WorkPackageTable:**
```
projectId: string
employees: { id, display_name, first_name, last_name, employee_number }[]
workPackages: { id, ap_code: string, ap_number, ap_sub_number, name,
                description, start_date, end_date, planned_pm, is_technical }[]
assignments: { id, work_package_id, employee_id, planned_pm: number }[]
projectTeam: { id, project_id, employee_id, employee_number,
               role_in_project, hourly_rate_override }[]
canEdit: boolean
onAssignmentChange: (wpId, empId, pm) => Promise<void>
onEditAP?: (wp) => void
onDeleteAP?: (wp) => void
portal?: 'berater' | 'firma'
fundingFormat?: string | null
```

**WorkPackageAssignmentModal Handler-Signaturen:**
```
onAddAssignment: (employeeId: string, pm: number | null) => Promise<void>
onUpdateAssignment: (employeeId: string, pm: number | null) => Promise<void>
onRemoveAssignment: (employeeId: string) => Promise<void>
```

---

## 5. Bekannte Fehler und Status

| Nr. | Fehler | Status | Version |
|-----|--------|--------|---------|
| 5.1 | ZE nicht gespeichert bei Tab-Wechsel | Behoben | v7.3.57 |
| 5.2 | Berichte zeigen falsche PM-Summen | Behoben | v7.4.3-11 |
| 5.3 | PortalHeader Navigation fehlt | Behoben | v7.3.95-3 |
| 5.4 | TimesheetForm springt auf aktuellen Monat | Behoben | v7.3.91 |
| 5.5 | ZIM-Import: MA ohne Stundensatz | Behoben | v7.3.87 |
| 5.6 | TeamMembers leer im AP-Tab | Behoben | v7.4.4-31 |
| 5.7 | isAdminOrPL prueft falsche Rolle | Behoben | v7.4.4-5 |
| 5.8 | Profil-Query via id statt email | Behoben | v7.4.4-31 |
| 5.9 | Firma-Detail Header gruen statt blau | Offen | - |
| 5.10 | Stundensatz Annika Arndt Diskrepanz | Offen | - |

---

## 6. ZA-Modul (Zahlungsanforderungen)

### 6.1 Konzept

Datenaufbereitung fuer ZIM-Mittelabruf. Kein eigenes PDF (XML-Struktur des
offiziellen ZIM-Formulars nicht replizierbar). Daten werden manuell in das
offizielle VDI/VDE-IT Formular uebertragen.

### 6.2 Datenbankfelder v7_zahlungsanforderungen

| Feld | Typ | Beschreibung |
|------|-----|--------------|
| za_nummer | integer | Laufende Nummer |
| zeitraum_von | date | Abrechnungszeitraum Beginn |
| zeitraum_bis | date | Abrechnungszeitraum Ende |
| status | text | entwurf / eingereicht / bewilligt |
| auftraege_dritte_t | numeric | Auftraege an Dritte (T) |
| auftraege_dritte_nt | numeric | Auftraege an Dritte (NT) |
| fue_unterauftrag | numeric | FuE-Unterauftraege |
| zeitw_personalaufnahme | numeric | Zeitwert Personalaufnahme |
| notizen | text | Interne Notizen |

### 6.3 ZA-Faelligkeit

- Feld `naechste_za_faellig DATE` in `v7_projects` (Migration ausgefuehrt)
- Berechnung: letztes `zeitraum_bis` eines eingereichten ZA + 3 Monate
- Status `eingereicht` genuegt fuer Faelligkeitsberechnung
- Anzeige als Ampel in Mein-Status

### 6.4 Status-Workflow

```
Entwurf --> Eingereicht --> Bewilligt
                |
                v
            Entwurf (Rollback via Dropdown)
```

Offener Punkt: Direkter Rollback Bewilligt -> Eingereicht fehlt noch.

---

## 7. Seiten-Uebersicht

### 7.1 Firmen-Portal (/v7/firma/...)

| Route | Komponente | Beschreibung |
|-------|-----------|--------------|
| /v7/firma | Redirect | -> /v7/firma/dashboard |
| /v7/firma/dashboard | firma-dashboard | Modul-Kacheln |
| /v7/firma/mein-status | mein-status-page | Ampel-Uebersicht MA |
| /v7/firma/projekte | page-firma-projekte | Projektliste |
| /v7/firma/projekte/[id] | ProjectDetailPage | Projekt-Detail (shared) |
| /v7/firma/zeiterfassung | zeiterfassung-page | Zeiterfassung |
| /v7/firma/berichte | berichte-page | Berichte + ZA-Kachel |
| /v7/firma/mitarbeiter | EmployeeManagement | MA-Verwaltung |

### 7.2 Berater-Portal (/v7/berater/...)

| Route | Komponente | Beschreibung |
|-------|-----------|--------------|
| /v7/berater | berater-dashboard-redirect | -> /v7/berater/dashboard |
| /v7/berater/dashboard | berater-dashboard | Kundenliste + Schnellzugriff |
| /v7/berater/timesheets | timesheet-viewer | Firmenuebergreifende ZE-Matrix |
| /v7/berater/foerderung/firma/[id] | berater-firma-detail | Firma-Detail + Tabs |
| /v7/berater/foerderung/firma/[id]/projekt/[pid] | ProjectDetailPage | Projekt-Detail (shared) |
| /v7/berater/foerderung/firma/[id]/zeiterfassung | berater-ze-seite | ZE fuer Firma |
| /v7/berater/foerderung/firma/[id]/berichte | berater-berichte | Berichte fuer Firma |
| /v7/berater/admin | ConsultantManagement | Berater-Verwaltung |

---

## 8. Deployment

### 8.1 Branches

| Branch | Zweck |
|--------|-------|
| v7-dev | Aktive Entwicklung, Vercel Preview |
| main | Produktion, pze.itenion.com |

Vercel deployed automatisch von v7-dev. main wird nach jedem erfolgreichen
Test manuell gemergt.

### 8.2 Standard Deploy-Ablauf

```bash
# Datei kopieren
cp ~/Documents/Dev/PZE/downloads/[Dateiname] src/[Zielpfad]

# Commit (einzeln, kein Block wegen zsh)
git add -A
git commit -m "v7.4.4-XX: Beschreibung"
git push origin v7-dev

# Nach Test: auf main mergen
git checkout main
git merge v7-dev --no-edit
git push origin main
git checkout v7-dev
```

### 8.3 Versionierungskonvention

Dateiname: `KomponentenName-vX_Y_Z-N.tsx`
Beispiel: `ProjectDetailPage-v7_4_4-31.tsx`
Regel: Jede Aenderung = neues Inkrement N. Niemals gleiche Datei ueberschreiben.
Ablage: `~/Documents/Dev/PZE/downloads/`

---

## 9. Geplante naechste Schritte

### 9.1 Kurzfristig (naechste Session)

- Firma-Detailseite im Berater-Portal: Header noch gruen statt blau (Bug 5.9)
- ZA-Rollback-Button: Bewilligt -> Eingereicht (fehlt noch)
- Stundensatz-Diskrepanz pruefen: Annika Arndt (20.19 vs. 20.35 EUR/h)
- ZA-Ampel Integration Berater-Dashboard (vereinbart, noch nicht gestartet)

### 9.2 Mittelfristig (v7.4+)

- User Manual Berater-Portal (PDF)
- Projekt-Fortschritt Kachel: Grafische Auswertung
- ZIM PDF Import im Firmen-Portal aktivieren (nach Parser-Stabilisierung)
- Email-Einladungssystem fuer neue Benutzer

### 9.3 Langfristig (v7.4+)

- FZul-Integration: Migration der V6-Funktionen
- FZul Online-Editor mit Status-Workflow
- Modul-basierte Lizenzierung

---

## 10. Test-User

| Name | Email | Rolle | Portal / Firma |
|------|-------|-------|----------------|
| Martin Ditscherlein | m.ditscherlein@cubintec.com | system_admin | Berater |
| Robin Freund | (Steuerkanzlei) | client_admin | Firma: Steuerkanzlei Freund |
| Annika Arndt | (Steuerkanzlei) | project_leader | Firma: Steuerkanzlei Freund |
| Anett Mueller | (Steuerkanzlei) | employee | Firma: Steuerkanzlei Freund |
| Carolin Schoebel | (Steuerkanzlei) | employee | Firma: Steuerkanzlei Freund |
| Thomas Duehrkop | t.duehrkop@gmm-yacht.de | client_user | Firma: Global Maritime Management |

Hinweis: Bei Thomas Duehrkop musste client_company_id manuell nachgetragen werden
(22.03.2026). Bei neuen Usern immer Checkliste in Abschnitt 2.3 beachten.

---

## 11. Aenderungshistorie Pflichtenheft

| Version | Datum | Aenderungen |
|---------|-------|-------------|
| v4.46 | 22.03.2026 | Session 6: ProjectDetailPage-31 Neuaufbau, Props-Interfaces dokumentiert, Bug-Checkliste neue User, Thomas Duehrkop Login-Fix |
| v4.45 | 13.03.2026 | Aktualisierung nach Session 5 (FirmendatenCard, ProjectTeamManager-4) |
| v4.44 | 13.03.2026 | v7.4.4-17/18/5: ZA Status-Workflow, ZA-Ampel, Archiv-Tab, Bug-Fix isAdminOrPL |
| v4.43 | 12.03.2026 | v7.4.4-16: ZA-Kachel, ZIM-Hinweiskasten, ZA-Modul vereinfacht |
| v4.42 | 11.03.2026 | v7.4.4-20: ZAPanel Redesign |
| v4.41 | 10.03.2026 | v7.4.4: Berater-Navigation, ZA-Modul, ZAPanel |
| v4.39 | 09.03.2026 | v7.4.3-12: Stundennachweis-Matrix |
| v4.38 | 03.03.2026 | v7.4.3: TimesheetForm, Ampel, FAQ PDF, Berichte |
| v4.37 | 26.02.2026 | v7.4.1: Server-seitige User-Erstellung |
| v4.36 | 23.02.2026 | v7.4.0 Fixes |
| v4.35 | 23.02.2026 | v7.4.0 Git-Sicherung |
| v4.34 | 23.02.2026 | v7.4.0: Timesheet-Viewer |
| v4.33 | 20.02.2026 | v7.3.95-8: Arbeitsplan-Lock, Rollen-Header |
| v4.32 | 18.02.2026 | v7.3.95: Ampel-Fix, Manual-Download |
| v4.31 | 17.02.2026 | v7.3.92-94: Berater-Verwaltung, PDF-Export |
| v4.29 | 15.02.2026 | v7.3.91: Mein Status |
| v4.28 | 12.02.2026 | v7.3.90: Rollenbasierte Zugriffskontrolle |
| Frueher | Okt-Dez 2024 | V6 Grundlagen |

---

**Ende des Pflichtenhefts v4.46**
**Letzte Aktualisierung: 22. Maerz 2026**
