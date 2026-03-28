# PFLICHTENHEFT - Projektzeiterfassung (PZE)

**Version:** 4.48
**SW-Release:** V7.4.4
**Datum:** 26. Maerz 2026
**Projekt:** Projektzeiterfassung fuer FuE-Foerdervorhaben
**Status:** V7.4.4-21 + V7.4.3-12 deployed auf v7-dev + main

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
- Monatsabschluss: MA markiert Monat als vollstaendig erfasst
- Berichte und Controlling mit Plan/Ist-Vergleich und Stundennachweis-Matrix
- Mein Status: Persoenliche Uebersicht offener Zeiterfassungen

Zusaetzlich fuer Berater:
- Analyse der Zeiterfassungen gefoerderter Projekte
- Ermittlung verfuegbarer Projektstunden fuer Forschungszulage (FZul)
- Timesheet-Viewer: Firmen-/Projekt-/MA-uebergreifende Stundenuebersicht (v7.4)
- FZul-Analyse: Auswertung foerderrelevanter Stunden aus Timesheet-Daten (v7.4)
- Daten fuer Zahlungsanforderung: ZIM-Formular Datenaufbereitung

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
| v7_client_companies | Kundenfirmen (inkl. standard_weekly_hours) |
| v7_employees | Mitarbeiter einer Firma (portal_role, email, weekly_hours) |
| v7_projects | Projekte (funding_format, workplan_locked) |
| v7_work_packages | Arbeitspakete eines Projekts |
| v7_project_assignments | MA-Projekt-Zuordnung (hourly_rate, employee_number) |
| v7_work_package_assignments | MA-AP-Zuordnung (planned_person_months, is_active) |
| v7_timesheets | Zeiterfassungs-Eintraege (work_date, hours, day_type) |
| v7_zahlungsanforderungen | ZA pro Projekt (za_nummer, zeitraum, status) |
| v7_timesheet_completions | Monatsabschluss (employee_id, project_id, year, month) |

### 2.2 Wichtige Architektur-Regeln

- `v7_work_package_assignments` ist Single Source of Truth fuer MA-Projekt-Beziehungen
- Stundensaetze gehoeren in `v7_project_assignments` (projektspezifisch)
- Profil-Lookup IMMER via `.eq('email', user.email)` - NICHT via `.eq('id', user.id)`
- `portal_role` fuer Berechtigungen aus `v7_employees.portal_role` lesen
  (NICHT aus `v7_user_profiles.role` - der ist bei Firmen-Usern immer 'client_user')
- `funding_format` ist enum-Typ: bei LIKE-Vergleichen `::TEXT` Cast erforderlich
- Personenmonate: 173.33 h/PM (40h/Woche x 52/12)
- Tagesarbeitszeit: `company.standard_weekly_hours / 5` (38h -> 7,6h/Tag)

### 2.3 Bundesland-Normalisierung (KRITISCH)

DB speichert Bundesland als Langname ("Bayern"). Code braucht ISO-Code ("DE-BY").
`normalizeStateCode()` MUSS in allen Komponenten verwendet werden, die Feiertage berechnen:
```
normalizeStateCode("Bayern") -> "DE-BY"
normalizeStateCode("DE-BY")  -> "DE-BY"  (bereits korrekt, wird durchgereicht)
```
Betroffene Komponenten: TimesheetForm, berichte-page, berater-berichte-page

### 2.4 ZIM-Foerderformate

Bekannte Werte in `v7_projects.funding_format`:
- `ZIM` - Standard Einzelprojekt FuE
- `ZIM_DS` - Durchfuehrbarkeitsstudie
- `ZIM_NETZWERK` - Netzwerkmanagement (z.B. YachtConnect Cubintec)

ZAPanel-Filter: `ff.startsWith('ZIM')` deckt alle Varianten ab.
Hinweis: `isDS` gilt nur fuer `ZIM_DS` - Netzwerk wird wie Standard-ZIM behandelt.

### 2.5 Neue User anlegen - Checkliste

Bei jedem neuen Firmen-User pruefen:
1. auth.users Eintrag vorhanden? (Supabase Authentication)
2. v7_user_profiles Eintrag vorhanden? (role = 'client_user')
3. client_company_id in v7_user_profiles gesetzt?  <- haeufigste Fehlerquelle
4. v7_employees Eintrag vorhanden? (portal_role gesetzt)

Fehlt Punkt 3 -> User landet nach Login auf leerem Login-Bildschirm (kein Fehler)

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
- ZA-Modul vollstaendig (ZAPanel, Status-Workflow, Archiv, ZA-Ampel)
- FirmendatenCard Shared Component
- ProjectTeamManager v7.4.4-4: AddMemberDialog
- ProjectDetailPage v7.4.4-31: KOMPLETTER NEUAUFBAU (Session 6)

### 3.5 Session 7 (22. Maerz 2026) - v7.4.3-9 / v7.4.4-21

**TimesheetForm (v7.4.3-9):**
- parseHours() jetzt in ALLEN Berechnungsfunktionen (calculateRowSum,
  calculateDaySum, calculateTechnicalDaySum, calculateNonBillableSum)
- Feiertags-Summe korrekt in "Sonstige bezahlte Ausfallzeiten" eingerechnet
- Mariae Himmelfahrt (15.8.) fuer Bayern (DE-BY) + Saarland (DE-SL)
- normalizeStateCode(): "Bayern" -> "DE-BY" Konvertierung
- companyDailyHours aus standard_weekly_hours (38h/Woche -> 7,6h/Tag)
- NEU: "Monat abschliessen"-Button (ganz links im Header)
  * Grau = offen / Gruen = abgeschlossen
  * Speichert in v7_timesheet_completions
  * Automatisch zurueckgesetzt nach Speichern von Aenderungen
- Button-Reihenfolge: Monat abschliessen | Speichern | PDF Export | Drucken

**FirmendatenCard (v7.4.4-2):**
- Feld "Regelarbeitszeit" in Anzeige und Bearbeiten-Modal
- JSX-Struktur-Bug behoben

**berichte-page (v7.4.4-17) + berater-berichte-page (v7.4.4-18):**
- Stundennachweis-Matrix: Completion-Flag aus v7_timesheet_completions
  * Gruen wenn MA "Monat abschliessen" geklickt hat
  * Gruen wenn alle Arbeitstage erfasst (Fallback)
  * Orange wenn Eintraege aber kein Abschluss
  * Rot wenn keine Eintraege
- normalizeStateCode() fuer Feiertags-Berechnung
- Feiertage zaehlen als "erfasste Tage"
- Mariae Himmelfahrt fuer DE-BY ergaenzt

**ZAPanel (v7.4.4-21):**
- ZIM_NETZWERK als gueltiges Foerderformat
- Filter: ff.startsWith('ZIM') statt nur ZIM/ZIM_DS
- Robuster Vergleich gegen Postgres ENUM-Typ

**SQL-Migration (Prod ausgefuehrt):**
- Neue Tabelle v7_timesheet_completions (Monatsabschluss)
- standard_weekly_hours in v7_client_companies (Regelarbeitszeit)

### 3.6 Bekannte Bugs und Loesungen

**Bug: isAdminOrPL prueft falsche Quelle**
- Problem: `profile.role` ist bei allen Firmen-Usern immer 'client_user'
- Loesung: `employee.portal_role` aus `v7_employees` verwenden

**Bug: Profil-Query schlaegt fehl**
- Problem: `.eq('id', user.id)` findet kein Ergebnis
- Loesung: `.eq('email', user.email)` verwenden

**Bug: User landet nach Login auf leerem Login-Bildschirm**
- Problem: `client_company_id` in `v7_user_profiles` ist NULL
- Loesung: SQL UPDATE direkt in Supabase

**Bug: Komplexe JSX-Dateien nach str_replace korrupt**
- Loesung: Immer kompletten Neuaufbau statt Patching bei grossen Dateien

**Bug: Python-UTF-8-Bereinigung zerstoert Code**
- Problem: Kompletter ASCII-Filter kaputt macht Template-Strings und "as"-Casts
- Loesung: Von Original starten, nur gezielte String-Ersetzungen

**Bug: Zeilensumme vor Speichern falsch bei Komma-Dezimalwerten**
- Problem: calculateRowSum nutzte parseFloat statt parseHours
- Loesung: parseHours() in ALLEN Berechnungsfunktionen

**Bug: Matrix zeigt "teilweise" fuer vollstaendig erfasste Monate**
- Ursache 1: normalizeStateCode fehlte -> Feiertage nicht erkannt
- Ursache 2: Feiertage erzeugen keine DB-Eintraege -> zaehlen nicht
- Ursache 3: Teilzeit-MA hat nicht jeden Tag Eintraege (korrekt so)
- Loesung: Monatsabschluss-Button + Feiertage als erfasste Tage zaehlen

---

## 4. Komponenten-Uebersicht

### 4.1 Shared Components (src/components/shared/)

| Datei | Version | Funktion |
|-------|---------|----------|
| ArbeitsplanImport.tsx | 7.3.87 | Excel Download/Upload |
| CapacityBar.tsx | 7.3.42 | Kapazitaets-Fortschrittsbalken |
| CompanyDataView.tsx | 7.3.57 | Firmendaten-Anzeige (readonly) |
| ConsultantManagement.tsx | 7.3.94-1 | Berater-Verwaltung (system_admin) |
| DataTable.tsx | 7.3.42 | Generische Tabellen-Komponente |
| EmployeeManagement.tsx | 7.3.95-1 | MA-Verwaltung mit Login, PW-Reset |
| FirmendatenCard.tsx | 7.4.4-2 | Firmendaten-Karte inkl. Regelarbeitszeit |
| Modal.tsx | 7.3.42 | Generische Modal-Komponente |
| PortalHeader.tsx | 7.3.95-4 | Header mit Rolle, PW-Aendern |
| PortalNav.tsx | 7.4.4-1 | Portal-Navigation |
| ProjectCreateForm.tsx | 7.3.57 | Projekt anlegen |
| ProjectDetailPage.tsx | 7.4.4-31 | Projekt-Detailseite (Neuaufbau Session 6) |
| ProjectList.tsx | 7.3.90 | Projektliste |
| ProjectTeamManager.tsx | 7.4.4-5 | Team-Verwaltung mit Anlage-6.1-Feldern |
| TimesheetForm.tsx | 7.4.3-9 | Zeiterfassung + Monatsabschluss-Button |
| WorkPackageAssignmentModal.tsx | 7.3.62 | MA einem AP zuordnen |
| WorkPackageEditModal.tsx | 7.3.85-2 | AP bearbeiten |
| WorkPackageList.tsx | 7.3.54 | AP-Liste mit Sortierung |
| WorkPackageTable.tsx | 7.4.3-7 | Arbeitsplan mit Lock/Unlock, Ampel |
| ZAPanel.tsx | 7.4.4-21 | ZA-Formular (alle ZIM-Formate inkl. NETZWERK) |

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
| 5.11 | Matrix zeigte teilweise statt gruen | Behoben | v7.4.4-17 |
| 5.12 | ZAPanel ZIM_NETZWERK nicht erkannt | Behoben | v7.4.4-21 |
| 5.13 | Zeilensumme vor Speichern falsch (Komma) | Behoben | v7.4.3-9 |
| 5.14 | Feiertagssumme nicht berechnet | Behoben | v7.4.3-9 |

---

## 6. ZA-Modul (Zahlungsanforderungen)

### 6.1 Konzept

Datenaufbereitung fuer ZIM-Mittelabruf. Kein eigenes PDF (XML-Struktur des
offiziellen ZIM-Formulars nicht replizierbar). Daten werden manuell in das
offizielle VDI/VDE-IT Formular uebertragen.

### 6.2 Unterstuetzte Foerderformate

| Format | Beschreibung | isDS |
|--------|-------------|------|
| ZIM | Standard FuE-Einzelprojekt | false |
| ZIM_DS | Durchfuehrbarkeitsstudie | true |
| ZIM_NETZWERK | Netzwerkmanagement | false |

Filter im ZAPanel: `String(funding_format).toUpperCase().startsWith('ZIM')`

### 6.3 Datenbankfelder v7_zahlungsanforderungen

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

### 6.4 ZA-Faelligkeit

- Feld `naechste_za_faellig DATE` in `v7_projects` (Migration ausgefuehrt)
- Berechnung: letztes `zeitraum_bis` eines eingereichten ZA + 3 Monate
- Status `eingereicht` genuegt fuer Faelligkeitsberechnung
- Anzeige als Ampel in Mein-Status

### 6.5 Status-Workflow

```
Entwurf --> Eingereicht --> Bewilligt
                |
                v
            Entwurf (Rollback via Dropdown)
```

Offener Punkt: Direkter Rollback Bewilligt -> Eingereicht fehlt noch.

### 6.6 Gestaffelte Foerderquoten ZIM-Netzwerk (Konzept fertig, Impl. offen)

Konzept in KONZEPT-ZIM-NETZWERKMANAGEMENT-v1_2.md vollstaendig dokumentiert.
Foerdersaetze laut ZIM-Richtlinie 2024 (analysiert Session 8):

National: Phase 1: 90% | Phase 2: Jahr 1: 70%, Jahr 2: 50%, Jahr 3-4: 30%
International: Phase 1: 95% | Phase 2: Jahr 1: 80%, Jahr 2: 60%, Jahr 3-4: 40%

Geplante DB-Erweiterung v7_projects:
  netzwerk_typ TEXT ('national'|'international')
  netzwerk_phase TEXT ('phase1'|'phase2')
  bewilligung_datum DATE
  phase2_start_datum DATE
  foerdersatz_stufen JSONB

Status: Konzept fertig. Implementierung nach Klaerung offener Punkte.
Offene Punkte: USt-Behandlung (Abstimmung Katrin), Rechnungsnummernkreis, Bankdaten.

### 6.7 NWM-Eigenanteil-Modul (Konzept fertig, Impl. offen)

Cubintec als NWM muss quartalsweise Eigenanteile von NP einfordern.
Eigenanteil = NWM-Gesamtkosten x (100% - Foerdersatz) x NP-Quote.
NP-Quoten: Gleichverteilung als Standard, individuelle Anpassung mit Smart-Anpassung.
USt: Option B (auf Gesamtleistung anteilig) - zur Bestaetigung mit Katrin.
NWM-Kosten: Aus PZE-Zeiterfassung (foerderfaehige Stunden x hourly_rate_approved).

Neue Tabellen geplant:
  v7_netzwerk_partner (NP-Stammdaten, Quoten, USt-Satz)
  v7_netzwerk_eigenanteile (Berechnungs-Snapshot, Zahlungsstatus)

Ausgabe-Dokumente:
  Rechnung Cubintec -> NP (PDF, quartalsweise)
  PT-Nachweis Eigenanteil-Eingang (PDF, Pflicht fuer ZA)

---

## 7. Monatsabschluss-Workflow (NEU v7.4.3-9)

### 7.1 Ablauf

1. MA erfasst Stunden im TimesheetForm
2. MA prueft Monat und klickt "Monat abschliessen" (gruener Button oben links)
3. System speichert Eintrag in `v7_timesheet_completions`
4. Matrix-Ampel zeigt Gruen fuer diesen Monat
5. Falls nachtraegliche Aenderung gespeichert wird: Completion automatisch geloescht
6. MA muss erneut "Monat abschliessen" klicken

### 7.2 Matrix-Ampel Logik

| Status | Bedingung |
|--------|-----------|
| Gruen | Completion-Flag gesetzt ODER alle Arbeitstage erfasst |
| Orange | Eintraege vorhanden, kein Completion-Flag |
| Rot | Keine Eintraege im Monat |
| Grau | Zukunft |

### 7.3 Datenbank

```sql
v7_timesheet_completions:
  employee_id, project_id, year, month (UNIQUE)
  completed_at, completed_by
```

---

## 8. Seiten-Uebersicht

### 8.1 Firmen-Portal (/v7/firma/...)

| Route | Komponente | Beschreibung |
|-------|-----------|--------------|
| /v7/firma | Redirect | -> /v7/firma/dashboard |
| /v7/firma/dashboard | firma-dashboard | Modul-Kacheln |
| /v7/firma/mein-status | mein-status-page | Ampel-Uebersicht MA |
| /v7/firma/projekte | page-firma-projekte | Projektliste |
| /v7/firma/projekte/[id] | ProjectDetailPage | Projekt-Detail (shared) |
| /v7/firma/zeiterfassung | zeiterfassung-page | Zeiterfassung |
| /v7/firma/berichte | berichte-page | Berichte + ZA-Kachel + Matrix |
| /v7/firma/mitarbeiter | EmployeeManagement | MA-Verwaltung |

### 8.2 Berater-Portal (/v7/berater/...)

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

## 9. Deployment

### 9.1 Branches

| Branch | Zweck |
|--------|-------|
| v7-dev | Aktive Entwicklung, Vercel Preview |
| main | Produktion, pze.itenion.com |

### 9.2 Standard Deploy-Ablauf

```bash
cp ~/Documents/Dev/PZE/downloads/[Dateiname] src/[Zielpfad]
git add -A
git commit -m "v7.4.4-XX: Beschreibung"
git push origin v7-dev
git checkout main && git merge v7-dev --no-edit && git push origin main && git checkout v7-dev
```

### 9.3 Versionierungskonvention

KRITISCHE REGEL: Jede Aenderung = neues Inkrement N. NIEMALS gleiche Datei ueberschreiben.
Dateiname: `KomponentenName-vX_Y_Z-N.tsx`
Beispiel: `TimesheetForm-v7_4_3-9.tsx` -> naechste Aenderung -> `TimesheetForm-v7_4_3-10.tsx`
Ablage: `~/Documents/Dev/PZE/downloads/`

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
| Kirchner, Katrin | (Cubintec) | client_admin | Firma: Cubintec GmbH |
| Kirchner, Lisa | (Cubintec) | employee | Firma: Cubintec GmbH |

---

## 11. Geplante naechste Schritte

### 11.1 Kurzfristig (naechste Session)

- NWM-Modul: Abstimmung USt mit Katrin, dann SQL-Migration + Implementierung
- ZA-Rollback-Button: Bewilligt -> Eingereicht (fehlt noch)
- Firma-Detailseite Berater-Portal: Header gruen statt blau (Bug 5.9)
- Stundensatz-Diskrepanz pruefen: Annika Arndt (20.19 vs. 20.35 EUR/h)

### 11.2 Mittelfristig

- ZA-Ampel Integration Berater-Dashboard
- User Manual Berater-Portal (PDF)
- Projekt-Fortschritt Kachel: Grafische Auswertung
- ZIM PDF Import im Firmen-Portal aktivieren

### 11.3 Langfristig

- FZul-Integration: Migration der V6-Funktionen
- FZul Online-Editor mit Status-Workflow
- Modul-basierte Lizenzierung

---

## 12. Aenderungshistorie Pflichtenheft

| Version | Datum | Aenderungen |
|---------|-------|-------------|
| v4.48 | 26.03.2026 | Session 8: TimesheetForm-12 PDF-Print-Fix, NWM-Konzept v1.2 (ZIM-Richtlinie analysiert, Eigenanteil-Modul) |
| v4.47 | 22.03.2026 | Session 7: Monatsabschluss, Matrix-Ampel-Fix, ZIM_NETZWERK, Komma-Fix komplett, Regelarbeitszeit, normalizeStateCode |
| v4.46 | 22.03.2026 | Session 6: ProjectDetailPage-31 Neuaufbau, Props-Interfaces, Bug-Checkliste neue User |
| v4.45 | 13.03.2026 | Session 5: FirmendatenCard, ProjectTeamManager-4 |
| v4.44 | 13.03.2026 | v7.4.4-17/18/5: ZA Status-Workflow, ZA-Ampel, Archiv-Tab |
| v4.43 | 12.03.2026 | v7.4.4-16: ZA-Kachel, ZIM-Hinweiskasten |
| v4.42 | 11.03.2026 | v7.4.4-20: ZAPanel Redesign |
| v4.41 | 10.03.2026 | v7.4.4: Berater-Navigation, ZA-Modul |
| v4.39 | 09.03.2026 | v7.4.3-12: Stundennachweis-Matrix |
| v4.38 | 03.03.2026 | v7.4.3: TimesheetForm, Ampel, FAQ PDF |
| Frueher | Okt 2024 - Feb 2026 | V6 + V7 Aufbau |

---

**Ende des Pflichtenhefts v4.48**
**Letzte Aktualisierung: 26. Maerz 2026**
