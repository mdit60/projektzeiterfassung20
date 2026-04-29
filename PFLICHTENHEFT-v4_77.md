# PFLICHTENHEFT - Projektzeiterfassung (PZE)

**Version:** 4.77
**SW-Release:** V7.4.4 (Patch)
**Datum:** 29. April 2026
**Projekt:** Projektzeiterfassung fuer FuE-Foerdervorhaben
**Status:** Session 34 abgeschlossen: Anleitungen v2.x, System-Konfigurationstabelle, manuals_enabled Toggle.

---

## 1. Projektuebersicht

### 1.1 Zielsetzung

Webbasierte SaaS-Anwendung zur Erfassung und Verwaltung von Projektstunden fuer:
- Oeffentlich gefoerderte FuE-Projekte (ZIM, BMBF/KMU-innovativ)
- Forschungszulage (Paragraph 35a EStG)
- ZIM-Netzwerkmanagement (Eigenanteil-Abrechnung)

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
- NWM-Modul: Vollstaendige Verwaltung von ZIM-Netzwerkmanagement-Projekten (v7.4.5)

### 1.4 Technische Architektur

| Komponente | Technologie |
|------------|-------------|
| Frontend | Next.js 15.5, React 19, TypeScript, Tailwind CSS 4 |
| Backend/DB | Supabase (PostgreSQL, Auth, Storage, RLS) |
| Hosting | Vercel (Deployment Branch: main) |
| Auth | Supabase Auth |
| ZIM Parser | Python/FastAPI (lokal, pikepdf) + Next.js API-Route |
| Package Manager | pnpm (lokal und Vercel) |
| Node.js | v20.x (lokal und Vercel) |
| Versionskontrolle | Git/GitHub (Branch v7-dev -> main) |

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
| v7_client_companies | Kundenfirmen (inkl. standard_weekly_hours, holiday_region) |
| v7_employees | Mitarbeiter einer Firma (portal_role, email, weekly_hours) |
| v7_employee_hours_history | Teilzeit-Historie pro MA (weekly_hours, gueltig_ab) |
| v7_projects | Projekte (funding_format, workplan_locked, NWM-Felder) |
| v7_work_packages | Arbeitspakete eines Projekts (inkl. total_person_months, start_date, end_date) |
| v7_project_assignments | MA-Projekt-Zuordnung (hourly_rate, employee_number) |
| v7_work_package_assignments | MA-AP-Zuordnung (planned_person_months, is_active) |
| v7_timesheets | Zeiterfassungs-Eintraege (work_date, hours, day_type) |
| v7_zahlungsanforderungen | ZA pro Projekt (za_nummer, zeitraum, status) |
| v7_timesheet_completions | Monatsabschluss (employee_id, project_id, year, month) |
| v7_netzwerk_partner | NWM: Netzwerkpartner (Stammdaten, Quoten, USt-Satz) |
| v7_netzwerk_eigenanteile | NWM: EA-Berechnungs-Snapshots (Zahlungsstatus) |
| v7_timesheet_notes | Interne Rueckfragen pro MA/Projekt/Monat (Status offen/erledigt) |
| v7_nwm_foerderzeitraeume | NWM: Netzwerkjahre pro Projekt (Laufzeit, Foerderquote, Netzwerkjahr-Nr.) |
| v7_nwm_ap_planung | NWM: AP-Planung pro Foerderzeitraum und MA (planned_pm, start/ende) |
| v7_fzul_vorhaben | MPT: FZul-Vorhaben (title, wirtschaftsjahr, status) - eigenstaendige Tabelle, NICHT v7_projects! |
| v7_system_config | System-Konfiguration Key/Value (z.B. manuals_enabled) - NEU Session 34 |

### 2.2 Wichtige Architektur-Regeln

- `v7_work_package_assignments` ist Single Source of Truth fuer MA-Projekt-Beziehungen
- Stundensaetze gehoeren in `v7_project_assignments` (projektspezifisch)
- Profil-Lookup IMMER via `.eq('id', user.id)` (v7_user_profiles.id = auth.users.id)
- `portal_role` fuer Berechtigungen aus `v7_employees.portal_role` lesen
  (NICHT aus `v7_user_profiles.role` - der ist bei Firmen-Usern immer 'client_user')
- `funding_format` ist enum-Typ: bei LIKE-Vergleichen `::TEXT` Cast erforderlich
- Personenmonate: 173.33 h/PM (40h/Woche x 52/12)
- Tagesarbeitszeit: `company.standard_weekly_hours / 5` (38h -> 7,6h/Tag)
- RLS: Alle v7-Tabellen haben Row Level Security AKTIV (Stand Session 21)

### 2.3 Feiertagsberechnung (KRITISCH)

Die Feiertagsberechnung speist die Zeiterfassung (Feiertage werden automatisch
als nicht-buchbare Tage markiert) sowie alle Berichte, die Sollarbeitstage
berechnen. Falsche Feiertage = falsche Sollstunden = falsche ZA-Daten.

**Eingabeparameter:**
1. `v7_client_companies.federal_state` - Bundesland (Langname oder ISO-Code)
2. `v7_client_companies.holiday_region` - OPTIONAL Override fuer kommunale
   Sonderfaelle (siehe 2.7)

**Zentrale Utility (ab v7.4.6):** `src/lib/holidays/germanHolidays.ts`
Signatur:
```
getGermanHolidays(year: number, stateCode: string, holidayRegion?: string)
  -> Map<YYYY-MM-DD, LabelText>
```

**Bundesland-Normalisierung:** DB speichert Bundesland haeufig als Langname
("Bayern"). Intern wird auf ISO-Code ("DE-BY") normalisiert:
```
normalizeStateCode("Bayern") -> "DE-BY"
normalizeStateCode("DE-BY")  -> "DE-BY"  (bereits korrekt, durchgereicht)
```

**Betroffene Komponenten (alle nutzen die zentrale Utility):**
TimesheetForm, BerichtePage, StundennachweisMatrix.

**Arbeitsort-Prinzip:** Massgeblich ist der Firmenstandort (= Arbeitsort),
NICHT der Wohnort des Mitarbeiters. Grundlage: Entgeltfortzahlungsrecht
(z.B. Art. 1 BayFTG; vgl. DGB-Feiertagsuebersicht).
Daher Konfiguration auf Firmenebene, nicht pro Mitarbeiter.

### 2.4 ZIM-Foerderformate

Bekannte Werte in `v7_projects.funding_format`:
- `ZIM` - Standard Einzelprojekt FuE
- `ZIM_DS` - Durchfuehrbarkeitsstudie
- `ZIM_NETZWERK` - Netzwerkmanagement (NWM-Modul aktiv)

ZAPanel-Filter: `ff.startsWith('ZIM')` deckt alle Varianten ab.
NWM-Erkennung: `ff === 'ZIM_NETZWERK'` (exakter Vergleich)

### 2.5 NWM-Felder in v7_projects

| Feld | Typ | Beschreibung |
|------|-----|--------------|
| netzwerk_typ | text | 'national' oder 'international' |
| netzwerk_phase | text | 'phase1' oder 'phase2' |
| bewilligung_datum | date | Bewilligungsdatum Phase 1 |
| phase2_start_datum | date | Bewilligungsdatum Phase 2 |
| foerdersatz_stufen | jsonb | [{laufzeitjahr, satz_percent, gueltig_ab}] |
| nwm_bank_kontoinhaber | text | Fuer NP-Rechnungen |
| nwm_bank_iban | text | Fuer NP-Rechnungen |
| nwm_bank_bic | text | Fuer NP-Rechnungen |
| nwm_bank_name | text | Fuer NP-Rechnungen |
| nwm_ust_id | text | USt-ID fuer NP-Rechnungen |
| nwm_rechnung_prefix | text | Rechnungsnummer-Praefix |
| nwm_rechnung_naechste | integer | Naechste Rechnungsnummer |
| nwm_faelligkeitsfrist | integer | Zahlungsfrist in Tagen |

### 2.6 v7_system_config (NEU Session 34)

Key/Value-Tabelle fuer systembweite Konfigurationsparameter, steuerbar durch
system_admin ueber die Admin-Seite im Berater-Portal ohne Code-Deployment.

| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| key | TEXT PK | Eindeutiger Konfigurationsschluessel |
| value | TEXT | Wert als String |
| updated_at | TIMESTAMPTZ | Letztes Aenderungsdatum (auto) |
| updated_by | TEXT | E-Mail des Aendernden (optional) |

**RLS:**
- SELECT: alle authenticated User (PortalNav liest `manuals_enabled`)
- ALL (INSERT/UPDATE/DELETE): nur system_admin

**Aktuelle Eintraege:**

| key | Wert | Bedeutung |
|-----|------|-----------|
| manuals_enabled | 'true' / 'false' | Anleitungs-PDFs im Hilfe-Dropdown freigegeben |

**Zugriff im Code:**
```typescript
supabase.from('v7_system_config').select('value').eq('key','manuals_enabled').single()
```

### 2.7 Neue User anlegen - Checkliste

Bei jedem neuen Firmen-User pruefen:
1. auth.users Eintrag vorhanden? (Supabase Authentication)
2. v7_user_profiles Eintrag vorhanden? (role = 'client_user')
3. client_company_id in v7_user_profiles gesetzt?  <- haeufigste Fehlerquelle
4. display_name, first_name, last_name in v7_user_profiles gesetzt?
5. v7_employees Eintrag vorhanden? (portal_role gesetzt)
6. user_id in v7_employees auf auth.users.id gesetzt?

Fehlt Punkt 3 -> User landet nach Login auf leerem Bildschirm
Fehlt Punkt 4 -> Header zeigt nur Rolle, kein Name

### 2.8 Feiertagsregion - kommunale Sonderfaelle

Feld `v7_client_companies.holiday_region` (TEXT, nullable). Override fuer
Feiertagsberechnung bei kommunalen Sonderregelungen. NULL = Standard-Regel
gemaess federal_state.

**Hintergrund:** In Deutschland gibt es drei Feiertage mit kommunaler
Sonderregelung, die das Bundesland alleine nicht abbildet:

| Feiertag | Datum | Regel |
|----------|-------|-------|
| Mariae Himmelfahrt | 15.08. | In Bayern nur in ueberwiegend kath. Gemeinden (1.704 von 2.056). Muenchen/Augsburg/Wuerzburg/Regensburg/Ingolstadt JA, Nuernberg/Fuerth/Erlangen/Schwabach NEIN. Grundlage: Zensus 2022 (seit 15.08.2025). Im Saarland landesweit JA. |
| Augsburger Friedensfest | 08.08. | Nur Stadt Augsburg - bundesweit einziger rein staedtischer gesetzlicher Feiertag. |
| Fronleichnam | beweglich | Sachsen/Thueringen nur in bestimmten Gemeinden (Sachsen: 14 sorbische Gemeinden LK Bautzen; Thueringen: LK Eichsfeld + Teile Unstrut-Hainich/Wartburgkreis). |

**Erlaubte Werte:**

| Wert | Bedeutung |
|------|-----------|
| (NULL) | Standard-Bundeslandregel |
| BY_KATH | Bayern, ueberw. katholische Gemeinde |
| BY_EVAN | Bayern, ueberw. evangelische Gemeinde (KEIN Mariae Himmelfahrt) |
| BY_AUGSBURG | Stadt Augsburg (Mariae Himmelfahrt + Friedensfest 08.08.) |
| SN_SORB | Sachsen, sorbisches Siedlungsgebiet (Fronleichnam ja) |
| TH_EICHSFELD | Thueringen, LK Eichsfeld / Unstrut-Hainich / Wartburgkreis (Fronleichnam ja) |

**UI:** FirmendatenCard: Dropdown nur sichtbar wenn Bundesland Bayern/Sachsen/Thueringen.
Info-Banner bei Firmen-Anlage in diesen Laendern.

**Migration:** PROD: Androlite GmbH auf BY_EVAN gesetzt. DEV: Cubintec auf BY_KATH (Test).

---

## 3. Entwicklungshistorie

### 3.1 Phase 1-3 (Oktober - Dezember 2024)

V6 Grundlagen, FZul-Modul, ZIM-Import-Konzept, DB-Schema

### 3.2 Phase 4: V7 Kern (Januar - Februar 2026)

v7.3.42 - v7.3.86: Kompletter V7-Neuaufbau mit Dual-Portal-Architektur,
Shared Components, Rollen-System, ZIM-Import, Zeiterfassung, Berichte

### 3.3 Phase 4 Fortsetzung (Februar 2026)

v7.3.87 - v7.3.95: ArbeitsplanImport, TeamManager, PortalHeader, EmployeeManagement,
User Manuals, Monatsabschluss, Prod-DB live (Steuerkanzlei Robin Freund)

### 3.4 Phase 5: Berater-Analysetools + ZA-Modul (Februar - Maerz 2026)

v7.4.0 - v7.4.4: Timesheet-Viewer, ZA-Modul (Status-Workflow, Archiv, Ampel),
FirmendatenCard, ProjectDetailPage Neuaufbau, Stundennachweis-Matrix

### 3.5 Session 7 (22. Maerz 2026)

- TimesheetForm: parseHours() ueberall, Feiertage, Monatsabschluss-Button
- Matrix-Ampel: Completion-Flag aus v7_timesheet_completions
- ZAPanel: ZIM_NETZWERK-Erkennung
- FirmendatenCard: Regelarbeitszeit

### 3.6 Session 8 (26. Maerz 2026) - NWM-Modul + Fixes

**NWM-Modul komplett implementiert:**
- ZAPanel-22: NWM-Kostentabelle, Laufzeitjahr/Foerdersatz auto
- ProjectDetailPage-38: KISS Tab-Switch, Netzwerk-Sub-Tabs, nwmTab URL-Param
- NWMPartnerPanel-4: Smart-Quoten, Kundenauswahl, Gleichverteilung auto
- NWMEinstellungenPanel-1: Foerderparameter, Bankdaten, Rechnungskonfig
- NWMEigenanteilPanel-11: Berechnung, Archiv, Loeschen, intelligenter Periodenvorschlag
- SQL-Migration: v7_netzwerk_partner, v7_netzwerk_eigenanteile, v7_timesheet_completions

**NWM-Uebersichtsseite Berater-Portal:**
- berater-netzwerk-page-1: Alle ZIM_NETZWERK-Projekte, Live-Daten, Direktzugriff
- berater-dashboard-6: 4 Kacheln (Kunden, NWM, Multiprojekt, FZul)

**Fixes:**
- TimesheetForm-13: Schutz abgeschlossener Monate (readonly fuer MA)
- EmployeeManagement-95-2: Passwort zuruecksetzen fuer MA mit Login
- mein-status-page-8: Completion-Flag als primaerer Monatsstatus

### 3.7 Session 22 (20. April 2026) - Feiertagsregion

Neues Feld `v7_client_companies.holiday_region`, 5 Override-Werte, Dropdown in
FirmendatenCard, Info-Banner in Bayern/Sachsen/Thueringen. Details: §2.8.

### 3.8 Session 23 (20. April 2026) - Feiertags-Utility zentralisiert

Neue zentrale Utility `src/lib/holidays/germanHolidays.ts` (v7.4.6-1).
Konsolidierung aller drei doppelten Feiertagsimplementierungen (TimesheetForm,
BerichtePage, StundennachweisMatrix). 68/68 Unit-Tests gruen.

### 3.9 Session 24 (21. April 2026) - Phase 1 Arbeitszeitgrenzen

- Neue Tabelle `v7_employee_hours_history` mit RLS
- POSITION_OPTIONS, GF_POSITIONS, Konstanten in v7-types.ts
- EmployeeManagement: position_title als Dropdown, GF-Hinweis

### 3.10 Session 25 (21. April 2026) - Phase 2 Teilzeit-Historie-UI

EmployeeManagement (7.3.95-12): Aufklappbarer Historie-Block im Edit-Modal,
Sub-Modal fuer neuen Eintrag, Alt-Feld-Synchronisation. Details: §7e.

### 3.11 Session 26 (22. April 2026) - AP-Dropdown und Matrix-Vorbelegung gefiltert

TimesheetForm v7.4.6-4: AP-Dropdown in zwei Gruppen (Zugeordnete / Weitere),
Matrix-Vorbelegung nur nach Laufzeit-gefilterten APs, Sortierung nach ap_number.
Details: §7d.

### 3.12 Sessions 27-30 (23.-24. April 2026) - MPT/FZul, KPT, PROD-Migration, Nav

- Session 27: Multiprojekt-Tool Phase 1+2 (FZul-Jahreskalender)
- Session 28: KPT Kapazitaetsmatrix (3-Jahres-Ansicht, Ampelfarben, NWM-Integration)
- Session 29: NWM-Tabellen + Yacht Connect Daten in PROD, 60 Duplikate bereinigt
- Session 30: KPT Druck/PDF, PortalNav kontextsensitiv (usePathname in Shared Components)

### 3.13 Session 31 (24. April 2026) - ProjektFortschrittPanel + Berichte Redesign

- ProjektFortschrittPanel v7.4.5-11: Zielerreichungs-Prognose, Projektions-Linie,
  3-Spalten-Block, GF-Erkennung, Foerder-Konsequenzen
- BerichtePage v7.4.6-3: Accordion (nur ein Panel offen)
- PortalNav v7.4.4-4: Kundenfirmen-Link auf Unterseiten immer sichtbar

### 3.14 Sessions 32-33 (28. April 2026) - Mein-Status + Hilfe-Dropdown

- Mein-Status aufgeraeumt: Ampeln, Offene Rueckfragen, Downloads rollenabhaengig
- Hilfe-Dropdown in PortalNav (alle Seiten erreichbar)
- BerichtePage v7.4.6-5: Accordion-Layout stabil, Foerderbetrag-Fix
- PortalNav v7.4.4-8: Anleitungs-Downloads hardcoded gesperrt (Anlass: Überarbeitung)

### 3.15 Session 34 (29. April 2026) - Anleitungen + System-Konfiguration

**Benutzeranleitungen vollstaendig neu erstellt (DOCX + PDF):**
- PZE-Anleitung-Projektleiter v2.1: Gilt fuer v7.4.6. Neu: Hilfe-Dropdown,
  Offene Rueckfragen auf Mein-Status, Downloads mit Rollenbezug, AP-Dropdown-Filter
  (Zugeordnete/Weitere AP), korrektes Speichern-Verhalten, Notizen & Rueckfragen,
  Berichte als 4-Kacheln-Accordion, ProjektFortschrittPanel.
- PZE-Anleitung-Firmen-Administrator v2.2.0: Gilt fuer v7.4.6. Zusaetzlich:
  Hilfe-Dropdown, Feiertagsregion in Firmendaten, AP-Dropdown-Filter,
  System-Konfiguration-Abschnitt.
- Mitarbeiter-Anleitung: keine separate Anleitung vorgesehen; nur FAQ.
- PDF-Ablage: `/public/manuals/` mit STABILEN Dateinamen (ohne Versionsnummer):
  - `PZE_Anleitung_Firmen-Administrator.pdf`
  - `PZE_Anleitung_Projektleiter.pdf`
  - `PZE-FAQ-Zeiterfassung-v1.pdf` (immer verfuegbar, unabhaengig vom Toggle)

**System-Konfigurationstabelle `v7_system_config` eingefuehrt:**
- Key/Value-Tabelle fuer systembweite Schalter (Details: §2.6)
- Erster Eintrag: `manuals_enabled` - steuert Anleitungs-Downloads im Hilfe-Dropdown

**SystemConfigPanel (v7.4.4-1/2) in Berater-Admin eingebunden:**
- Toggle + Statusanzeige + Info-Box mit verknuepften Dateinamen
- Speichern schreibt sofort in DB, keine Deployment noetig
- Sichtbar nur fuer system_admin auf /v7/berater/admin

**PortalNav (v7.4.4-8 -> v7.4.4-12, 4 Iterationen):**
- v7.4.4-9: `manuals_enabled` aus v7_system_config (statt hardcoded false)
- v7.4.4-10: Stabile PDF-URLs ohne Versionsnummer
- v7.4.4-11: employee hat keine Anleitung (nur FAQ); Manual-Block entfaellt wenn keine Anleitung
- v7.4.4-12: Dateinamen-Schreibweise korrigiert (PZE_Anleitung_... mit Unterstrich)

**Berater-Admin-Seite (v7.3.94 -> v7.3.94-1):**
- SystemConfigPanel unter dem Berater-Team-Abschnitt eingebunden
- Abschnittsheader "System-Konfiguration"

**Lernpunkt:** Stabile Dateinamen fuer Assets, die sich regelmaessig aendern
(Anleitungen), eliminieren Code-Deployments. Neue PDF einfach hochladen + ueberschreiben.

---

## 4. Komponenten-Uebersicht

### 4.1 Shared Components (src/components/shared/)

| Datei | Version | Funktion |
|-------|---------|----------|
| ArbeitsplanImport.tsx | 7.3.87 | Excel Download/Upload |
| ConsultantManagement.tsx | (aktuell) | Berater-Verwaltung (Admin-Seite) |
| EmployeeManagement.tsx | 7.3.95-12 | MA-Verwaltung inkl. Teilzeit-Historie-UI, Position-Dropdown, GF-Hinweis |
| FirmendatenCard.tsx | 7.4.6-1 | Firmendaten inkl. Regelarbeitszeit + Feiertagsregion-Dropdown |
| NWMEigenanteilPanel.tsx | 7.4.5-11 | EA-Berechnung, Archiv, PDF |
| NWMEinstellungenPanel.tsx | 7.4.5-1 | NWM-Settings, Bankdaten, Rechnungskonfig |
| NWMPartnerPanel.tsx | 7.4.5-4 | Netzwerkpartner, Smart-Quoten |
| PortalHeader.tsx | 7.3.95-4 | Header mit Rolle, PW-Aendern |
| PortalNav.tsx | 7.4.4-12 | Navigation kontextsensitiv, Hilfe-Dropdown, manuals_enabled aus DB |
| ProjectCreateForm.tsx | 7.3.57 | Projekt anlegen |
| ProjectDetailPage.tsx | 7.4.4-54 | Projekt-Detail + NWM-Tab-Switch + Jahres-Navigation NWM |
| ProjectTeamManager.tsx | 7.4.4-16 | Team-Verwaltung, Dialog-Vereinheitlichung, Status+Zaehlung |
| SystemConfigPanel.tsx | 7.4.4-2 | System-Konfiguration Toggle (manuals_enabled) - NEU Session 34 |
| TimesheetForm.tsx | 7.4.6-4 | ZE + Monatsabschluss + AP-Dropdown-Filter + Matrix-Vorbelegung |
| BerichtePage.tsx | 7.4.6-5 | Berichte & Controlling + Accordion + Foerderbetrag-Fix |
| ProjektFortschrittPanel.tsx | 7.4.5-11 | Zielerreichungs-Prognose (Projektions-Linien, GF-Regel) |
| StundennachweisMatrix.tsx | 7.4.6-1 | Matrix-Ampel + Feiertagsregion |
| WorkPackageTable.tsx | 7.4.3-11 | Arbeitsplan, PM 3 Dezimalstellen |
| ZAPanel.tsx | 7.4.4-22 | ZA-Formular inkl. NWM-Kostentabelle |
| lib/holidays/germanHolidays.ts | 7.4.6-1 | Zentrale Feiertags-Utility |

### 4.2 Wrapper-Seiten

| Pfad | Version | Funktion |
|------|---------|----------|
| src/app/v7/berater/admin/page.tsx | 7.3.94-1 | Admin-Seite + SystemConfigPanel |
| src/app/v7/firma/zeiterfassung/page.tsx | 7.4.6-2 | ZE-Wrapper Firmen-Portal (WP-Query erweitert) |
| src/app/v7/berater/foerderung/firma/[id]/zeiterfassung/page.tsx | 7.4.6-2 | ZE-Wrapper Berater-Portal |

### 4.3 Konfigurations-Dateien

| Datei | Version | Funktion |
|-------|---------|----------|
| v7-module-config.ts | 7.3.90-6 | Modul-Config, NWM aktiv |
| v7-types.ts | 7.4.7-1 | TypeScript-Typen inkl. POSITION_OPTIONS, Arbeitszeitgrenzen-Helper |

### 4.4 Wichtige Props-Interfaces (NWM)

**NWMPartnerPanel:**
```
portal: 'berater' | 'firma'
projectId: string
consultantCompanyId?: string
```

**NWMEinstellungenPanel:**
```
portal: 'berater' | 'firma'
project: NWMProjektDaten  (inkl. alle nwm_* Felder)
onProjectUpdate: (updated: Partial<NWMProjektDaten>) => void
```

**NWMEigenanteilPanel:**
```
portal: 'berater' | 'firma'
project: NWMProjekt  (inkl. start_date, alle nwm_* Felder)
companyName: string
```

### 4.5 WorkPackage-Interface in TimesheetForm (ab v7.4.6-2)

```typescript
interface WorkPackage {
  id: string;
  project_id: string;
  ap_number: number;
  ap_sub_number?: number;
  ap_code: string | null;
  name: string;
  is_technical?: boolean | null;
  total_person_months: number | null;  // Ueberschriften-Filter (PM>0)
  start_date: string | null;           // Laufzeit-Filter
  end_date: string | null;             // Laufzeit-Filter
}
```

### 4.6 Hilfe-Dropdown (PortalNav, ab v7.4.4-7)

Immer sichtbar im Firmen-Portal (oben rechts, alle Seiten). Enthaelt:
- Benutzerhandbuch (rollenabhaengig): Admin oder PL, aus `/public/manuals/`
- FAQ Zeiterfassung: immer verfuegbar (unabhaengig von manuals_enabled)
- Kontakt & Support (E-Mail-Link)

**Steuerung ueber manuals_enabled:**
- `true`: Download-Link sichtbar
- `false`: "Wird aktualisiert"-Hinweis (Amber)
- employee: kein Handbuch-Link, nur FAQ

**Dateinamen (stabil, ohne Versionsnummer):**
- `PZE_Anleitung_Firmen-Administrator.pdf` (client_admin)
- `PZE_Anleitung_Projektleiter.pdf` (project_leader)
- `PZE-FAQ-Zeiterfassung-v1.pdf` (alle Rollen, immer)

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
| 5.9 | Firma-Detail Header gruen statt blau | Behoben | Session 21 |
| 5.10 | Stundensatz Annika Arndt Diskrepanz | Behoben | Session 21 |
| 5.11 | Matrix zeigte teilweise statt gruen | Behoben | v7.4.4-17 |
| 5.12 | ZAPanel ZIM_NETZWERK nicht erkannt | Behoben | v7.4.4-21 |
| 5.13 | Zeilensumme vor Speichern falsch (Komma) | Behoben | v7.4.3-9 |
| 5.14 | Feiertagssumme nicht berechnet | Behoben | v7.4.3-9 |
| 5.15 | Monate orange trotz Monatsabschluss | Behoben | v7.4.4-8 |
| 5.16 | v7_timesheet_completions fehlte in Prod | Behoben | Session 8 |
| 5.17 | Lisa Kirchner kein display_name | Behoben | Session 8 |
| 5.18 | NWM EA-Berechnung ZE-Query falsch | Behoben | v7.4.5-4 |
| 5.19 | v7_can_access_client fehlte client_admin | Behoben | Session 17 |
| 5.20 | ZAPanel: bewilligung_datum nicht angezeigt | Behoben | v7.4.4-29 |
| 5.21 | TimesheetForm: Completion-Status blieb bei Monatswechsel | Behoben | v7.4.3-15/16 |
| 5.22 | TimesheetForm: Abschliessen speichert nicht automatisch | Behoben | v7.4.3-16 |
| 5.23 | BerichtePage + Matrix: MA-Reihenfolge nicht nach MA-Nr. | Behoben | v7.4.4-2 |
| 5.24 | ZAPanel + TeamManager: kalkulatorischer statt bewilligter Stundensatz | Behoben | v7.4.4-30 |
| 5.25 | create-employee-login: duplicate key bei neuem MA-Login | Behoben | v7.3.95-2 |
| 5.26 | ProjectTeamManager: Status "Ausgeschieden" bei zukuenftigem Enddatum | Behoben | v7.4.4-9ff |
| 5.27 | ProjectTeamManager: Zaehlung aktive MA ignorierte zukuenftiges Enddatum | Behoben | v7.4.4-10ff |
| 5.28 | ProjectTeamManager: is_active=false beim Setzen von assignment_end | Behoben | v7.4.4-16 |
| 5.29 | EmployeeManagement: kein "Ausgeschieden"-Status bei employment_end | Behoben | v7.3.95-7 |
| 5.30 | WorkPackageTable: PM-Anzeige nur 2 Dezimalstellen | Behoben | v7.4.3-8 |
| 5.31 | TimesheetForm: MA-Dropdown alphabetisch statt nach Team-Nr. | Behoben | v7.4.3-18 |
| 5.32 | Dashboard-Fehler offeneNotizen is not defined | Behoben | Session 24 |
| 5.33 | TimesheetForm: AP-Ueberschriften im Dropdown waehlbar | Behoben | v7.4.6-2 |
| 5.34 | TimesheetForm: abgelaufene AP in neue Monate vorbelegt | Behoben | v7.4.6-3 |
| 5.35 | TimesheetForm: vorbelegte AP-Zeilen in zufaelliger Reihenfolge | Behoben | v7.4.6-4 |

---

## 6. ZA-Modul (Zahlungsanforderungen)

### 6.1 Konzept

Datenaufbereitung fuer ZIM-Mittelabruf. Kein eigenes PDF. Daten werden manuell
in das offizielle VDI/VDE-IT Formular uebertragen.

### 6.2 Unterstuetzte Foerderformate

| Format | Beschreibung | isDS | isNetzwerk |
|--------|-------------|------|------------|
| ZIM | Standard FuE-Einzelprojekt | false | false |
| ZIM_DS | Durchfuehrbarkeitsstudie | true | false |
| ZIM_NETZWERK | Netzwerkmanagement | false | true |

### 6.3 Status-Workflow

```
Entwurf --> Eingereicht --> Bewilligt
                |                |
                v                v
            Entwurf          Eingereicht (Rollback v7.4.4-27)
```

Rollback Bewilligt -> Eingereicht: Implementiert v7.4.4-27.
Bewilligung_datum + bewilligte_summe: Direkt aus DB geladen (v7.4.4-29).

### 6.4 Stundensatz-Logik

Prioritaet: `hourly_rate_approved` (bewilligter Satz lt. Bescheid) hat Vorrang.
Fallback: `hourly_rate` (kalkulatorischer Satz) wenn kein bewilligter hinterlegt.
Gilt fuer: ZAPanel (Anlage 1b), ProjectTeamManager (Team-Tabelle).

---

## 7. NWM-Modul (ZIM-Netzwerkmanagement)

### 7.1 Ueberblick

ZIM-Netzwerkmanagement-Modul fuer Cubintec als NWM-Einrichtung.
Aktuell produktiv: YachtConnect (FKZ 16KN124502, 8 Netzwerkpartner)

### 7.2 Tab-Architektur (KISS)

Haupttabs bei ZIM_NETZWERK-Projekten: + [Netzwerk]
Klick -> Tab-Strip wechselt auf NWM-Sub-Tabs:
  [<- Zurueck] [Einstellungen] [Netzwerkpartner] [Eigenanteile]
URL-Parameter: ?nwmTab=einstellungen|partner|eigenanteile (fuer Direktlinks)

### 7.3 Foerdersatz-Stufen (automatisch berechnet)

National:
- Phase 1: 90% (alle Laufzeitjahre)
- Phase 2: Jahr 1: 70%, Jahr 2: 50%, Jahr 3-4: 30%

International:
- Phase 1: 95% (alle Laufzeitjahre)
- Phase 2: Jahr 1: 80%, Jahr 2: 60%, Jahr 3-4: 40%

Laufzeitjahr berechnet aus: Bewilligungsdatum + ZA-Periodenende

### 7.4 Eigenanteil-Berechnung

Formel:
```
NWM-Kosten = PK (aus ZE) + Dritte (manuell) + Uebrige (= 100% PK, pauschal)
Foerderbetrag PT = NWM-Kosten x Foerdersatz%
EA gesamt = NWM-Kosten x (100% - Foerdersatz%)
EA je NP = EA gesamt x NP-Quote (cent-genau, Rundungsrest bei letztem NP)
```

ZE-Quelle: v7_timesheets (work_date/hours/is_billable, NICHT year/month!)

### 7.5 Perioden-Logik

Abrechnungsperioden: 3-Monats-Rhythmus ab Projektstart (NICHT Kalenderquartale)
Periodenvorschlag: "Naechste Periode" = letzte EA-Periode + 1 Tag + 3 Monate
Von/Bis: Immer frei waehlbar (fuer Sonderabrechnungen)
Archiv: Alle abgerechneten Perioden gespeichert, aufrufbar und loeschbar
Schutz: Bezahlte EA nicht loeschbar, nicht ueberschreibbar

### 7.6 Rechnungen (PDF)

Rechnung Cubintec -> NP: Vollstaendig mit Bankdaten, Rechtsgrundlage
PT-Nachweis: Eigenanteil-Eingang fuer Projekttraeger
Rechnungsnummer: Automatisch hochgezaehlt in v7_projects.nwm_rechnung_naechste

### 7.7 NWM-Uebersichtsseite

Route: /v7/berater/netzwerk
- Alle ZIM_NETZWERK-Projekte aller Kunden
- Live-Daten: Anzahl NP, offene EA
- Direktzugriff: Einstellungen / Partner / Eigenanteile je Netzwerk

---

## 7b. Timesheet-Notizen (Interne Rueckfragen)

### 7b.1 Konzept

Zentrale Tabelle `v7_timesheet_notes` fuer interne Rueckfragen zu Stundeneintraegen.
Pro MA/Projekt/Monat maximal eine Notiz. Nur sichtbar fuer PL, Admin und Berater.

### 7b.2 Funktionen

- Notiz erstellen/bearbeiten im TimesheetForm (Sprechblasen-Icon neben Monatsauswahl)
- Erledigt-Checkbox (kein Loeschen - Historie bleibt erhalten)
- Ersteller-Name + Datum angezeigt
- Textfeld unbegrenzt (Ergaenzungen unten, Konvention)
- Alles print:hidden (kein Abdruck im Stundennachweis)

### 7b.3 Anzeige offener Rueckfragen

| Stelle | Anzeige | Aktion |
|--------|---------|--------|
| TimesheetForm | Orange Sprechblasen-Icon | Klick oeffnet Notiz-Modal |
| StundennachweisMatrix | Oranger Punkt in Monats-Zelle | Hover zeigt Tooltip |
| Berater-Dashboard | Tabelle mit Direktlinks | |
| Mein-Status (Firma) | Tabelle nach Statistik-Kacheln | Direktlink zur ZE |
| Timesheet-Viewer | Orange Badge pro Firma | |

### 7b.4 Berechtigungen

| Rolle | Notiz sehen | Notiz erstellen | Erledigen |
|-------|------------|----------------|-----------|
| Berater/system_admin | Alle Kunden | Ja | Ja |
| client_admin | Eigene Firma | Ja | Ja |
| project_leader | Eigene Projekte | Ja | Ja |
| employee | Nein | Nein | Nein |

---

## 7c. Compliance: Monats-Einschraenkung

Zeiterfassung nur fuer Monate moeglich, in denen MA tatsaechlich im Unternehmen
und Projekt war. Erlaubter Zeitraum = Schnittmenge aus employment_start/end,
assignment_start/end, project start_date/end_date.

| Stelle | Verhalten |
|--------|-----------|
| TimesheetForm | Ungueltige Monate nicht im Dropdown |
| Mein-Status | Monats-Kacheln grau + nicht klickbar |
| StundennachweisMatrix | Zellen grau + nicht klickbar |

---

## 7d. AP-Auswahl und Matrix-Vorbelegung (ab v7.4.6-2)

### 7d.1 Grundregel

Ein AP ist nur waehlbar wenn: `total_person_months > 0`, `start_date` und
`end_date` gesetzt, `is_active = true`.

### 7d.2 Gruppe "Zugeordnete AP"

- AP in `assignedWPIds` des MA
- `planned - booked > 0`
- Laufzeit-Check: `end_date + 2 Monate >= Referenzdatum` (= letzter Tag des Monats)

### 7d.3 Gruppe "Weitere AP"

Alle uebrigen waehlbaren APs. Kein Laufzeit-Check (Vertretungsfaelle).

### 7d.4 Matrix-Vorbelegung

Nur APs aus "Zugeordnete AP". Sortiert nach ap_number / ap_sub_number aufsteigend.

### 7d.5 Helper-Funktionen (TimesheetForm.tsx)

`isSelectableAP(wp)`, `getReferenceDate()`, `isAPInAssignedGroup(wp)`, `isAPInWeitereGroup(wp)`

---

## 7e. Arbeitszeitgrenzen (Phase 1 + 2)

### 7e.1 Drei Compliance-Grenzen

- **Monatsgrenze** (weich): `173,33 * (wochenstunden / 40)`
- **50%-GF-Regel** (weich): Max 50% Projektstunden fuer Geschaeftsfuehrer
- **Tagesgrenze** (hart): 9h laut ZIM-Richtlinie

### 7e.2 Phase 1 - Datenbasis (Session 24)

Tabelle `v7_employee_hours_history`, POSITION_OPTIONS in v7-types.ts,
position_title-Dropdown in EmployeeManagement.

### 7e.3 Phase 2 - Historie-UI (Session 25)

Aufklappbarer Historie-Block im Edit-Modal, Sub-Modal fuer neuen Eintrag,
Alt-Feld-Synchronisation. Details: siehe §3.10.

### 7e.4 Phase 3 (geplant)

Live-Validierung Ampel-Trio in TimesheetForm + Matrix + BerichtePage.
Hook `useArbeitszeitGrenzen()`.

---

## 8. Monatsabschluss-Workflow

### 8.1 Ablauf

1. MA erfasst Stunden im TimesheetForm
2. MA klickt "Monat abschliessen"
3. System speichert in v7_timesheet_completions
4. Matrix-Ampel und Mein-Status zeigen Gruen
5. Bei nachtraeglicher Aenderung (Admin): Abschluss aufheben, aendern, neu abschliessen

### 8.2 Schutz abgeschlossener Monate

| Rolle | Abgeschlossener Monat |
|-------|-----------------------|
| employee | Readonly, kein Button |
| project_leader | Readonly, kein Button |
| client_admin / consultant / system_admin | Amber-Banner, Abschluss aufheben |

### 8.3 Speichern-Verhalten (ab v7.4.4-9ff)

Ein gesetzter Monatsabschluss wird nur dann zurueckgesetzt, wenn tatsaechlich
Aenderungen gespeichert wurden. Bei unveraenderten Daten bleibt der Abschluss
erhalten.

### 8.4 Matrix-Ampel Logik

| Status | Bedingung |
|--------|-----------|
| Gruen | Completion-Flag gesetzt ODER alle Arbeitstage erfasst |
| Orange | Eintraege vorhanden, kein Completion-Flag |
| Rot | Keine Eintraege im Monat |
| Grau | Zukunft |

---

## 9. Seiten-Uebersicht

### 9.1 Firmen-Portal (/v7/firma/...)

| Route | Komponente | Beschreibung |
|-------|-----------|--------------|
| /v7/firma/dashboard | firma-dashboard | Modul-Kacheln |
| /v7/firma/mein-status | mein-status-page | Ampel, Rueckfragen, Downloads rollenabhaengig |
| /v7/firma/projekte | page-firma-projekte | Projektliste |
| /v7/firma/projekte/[id] | ProjectDetailPage | Projekt-Detail + NWM |
| /v7/firma/zeiterfassung | zeiterfassung-page-v7_4_6-2 | Zeiterfassung |
| /v7/firma/berichte | berichte-page-firma-wrapper | Berichte + Accordion |
| /v7/firma/mitarbeiter | EmployeeManagement-v7_3_95-12 | MA + PW-Reset + Teilzeit-Historie |
| /v7/firma/firmendaten | FirmendatenCard | Firmendaten + Feiertagsregion |

### 9.2 Berater-Portal (/v7/berater/...)

| Route | Komponente | Beschreibung |
|-------|-----------|--------------|
| /v7/berater/dashboard | berater-dashboard-v7_4_4-13 | 4 Kacheln + Offene Rueckfragen |
| /v7/berater/netzwerk | berater-netzwerk-page | NWM-Uebersicht alle Netzwerke |
| /v7/berater/foerderung | foerderung-page-v7_4_1-3 | Kundenfirmen-Liste |
| /v7/berater/foerderung/firma/[id] | berater-firma-detail-v7_4_4-4 | Firma-Detail |
| /v7/berater/foerderung/firma/[id]/projekt/[pid] | ProjectDetailPage-v7_4_4-54 | Projekt + NWM |
| /v7/berater/foerderung/firma/[id]/zeiterfassung | berater-ze-seite-v7_4_6-2 | ZE der Firma |
| /v7/berater/foerderung/firma/[id]/berichte | berater-berichte-wrapper | Berichte |
| /v7/berater/timesheets | timesheet-viewer-v7_4_0-8 | ZE-Matrix + Rueckfragen-Badge |
| /v7/berater/multiprojekt | berater-multiprojekt-page-v7_4_8-11 | KPT 3-Jahres-Ansicht |
| /v7/berater/admin | berater-admin-page-v7_3_94-1 | Berater-Verwaltung + System-Konfiguration |

### 9.3 Navigations-Hierarchie Berater-Portal

```
Dashboard
  |-- Kundenfirmen-Liste
  |     '-- Firma-Detail
  |           |-- Projekt-Detail
  |           |-- Zeiterfassung
  |           '-- Berichte
  '-- Netzwerkmanagement
        '-- Netzwerk-Projekt-Detail
```

Zurueck-Button Regel: Jede tiefe Seite hat einen expliziten Zurueck-Button.
Header-Klick fuehrt immer zum Dashboard.

---

## 10. Deployment

### 10.1 Branches

| Branch | Zweck |
|--------|-------|
| v7-dev | Aktive Entwicklung, Vercel Preview |
| main | Produktion, pze.itenion.com |

### 10.2 Standard Deploy-Ablauf

```bash
cp ~/Documents/Dev/PZE/downloads/[Dateiname] src/[Zielpfad]
pnpm build         # lokaler Build-Test
pnpm dev           # lokal durchklicken (Pflicht seit Session 25)
git add -A
git commit -m "v7.X.Y-N: Beschreibung"
git push origin v7-dev

git checkout main
git pull
git merge v7-dev --no-ff --no-edit
git push origin main
git checkout v7-dev

# Nach PROD-Test-OK:
mv ~/Documents/Dev/PZE/downloads/[ALTE-DATEI] ~/Documents/Dev/PZE/downloads/archiv/
```

### 10.3 Versionierungskonvention

- KRITISCH: Jede Aenderung = neues Inkrement N. NIEMALS gleiche Datei ueberschreiben.
- KRITISCH: VOR jeder Dateiausgabe im Projektverzeichnis nach letzter Version suchen!
- Dateiname: `KomponentenName-vX_Y_Z-N.tsx`
- Ablage: `~/Documents/Dev/PZE/downloads/`

### 10.4 Git-Merge Regel

IMMER: `git merge v7-dev --no-ff --no-edit`

### 10.5 Stabile Asset-URLs

PDF-Anleitungen und oeffentliche Assets werden mit stabilen Dateinamen
(ohne Versionsnummer) abgelegt, damit Code-Aenderungen beim Aktualisieren
entfallen. Neue Version = Datei mit gleichem Namen ueberschreiben.

---

## 11. Test-User

| Name | Email | Rolle | Portal / Firma |
|------|-------|-------|----------------|
| Martin Ditscherlein | m.ditscherlein@cubintec.com | system_admin | Berater |
| Katrin Kirchner | k.kirchner@cubintec.com | consultant | Berater + Firma Cubintec |
| Lisa Kirchner | l.kirchner@cubintec.com | client_user | Firma: Cubintec GmbH |
| Robin Freund | (Steuerkanzlei) | client_admin | Firma: Steuerkanzlei Freund |
| Annika Arndt | (Steuerkanzlei) | project_leader | Firma: Steuerkanzlei Freund |
| Anett Mueller | (Steuerkanzlei) | employee | Firma: Steuerkanzlei Freund |
| Carolin Schoebel | (Steuerkanzlei) | employee | Firma: Steuerkanzlei Freund |
| Thomas Duehrkop | t.duehrkop@gmm-yacht.de | client_user | Firma: Global Maritime Management |

---

## 11b. PROD-Kundenliste (Stand Session 26, 8 Firmen)

1. Androlite GmbH (Schwabach, Bayern - holiday_region = BY_EVAN)
2. AS System (Trittau, Schleswig-Holstein)
3. Cubintec GmbH (Bad Neustadt, Bayern)
4. Fischbach Bauunternehmung Gerald Fischbach GmbH (Wangen i.A., Baden-Wuerttemberg)
5. Global Maritime Management GmbH (Trittau, Schleswig-Holstein)
6. Luebeck Yacht Trave Schiff GmbH (Luebeck, Schleswig-Holstein)
7. Steuerkanzlei Robin Freund (Buechen, Schleswig-Holstein)
8. STOMA GmbH Maschinen und Geraete fuer die graphische Industrie (Siegburg, NRW)

## 11c. DEV-Kundenliste (Stand Session 26, 4 Firmen)

1. AS System
2. Cubintec GmbH (holiday_region = BY_KATH als Testeintrag)
3. Luebeck Yacht Trave Schiff GmbH
4. Tippl GmbH (Kirchberg an der Murr, Baden-Wuerttemberg)

**WICHTIG:** DEV und PROD sind NICHT synchron. Beim Ausfuehren von SQL-Scripts
immer pruefen, ob die referenzierte Firma in der jeweiligen DB existiert.

---

## 12. Geplante naechste Schritte

### 12.1 Kurzfristig - Prio-Liste

**#1 - NWM-Prognose im ProjektFortschrittPanel**
ZIM_NETZWERK-Projekte: Soll-Berechnung aus v7_nwm_ap_planung, gestuften
Foerderquoten im Verlauf, Foerder-Konsequenzen je Netzwerkjahr.

**#2 - NWM Jahresabrechnung pruefen**
Laufzeitjahr-Erkennung im ZAPanel korrekt? Gestuften Foerdersatz pro Periode?

**#3 - Berater-Portal User Manual (fehlt noch)**
Fuer den Rollout an Kundenberater noch zu erstellen.

**#4 - Phase 3 Arbeitszeitgrenzen: Live-Validierung**
Ampel-Trio in TimesheetForm + StundennachweisMatrix + BerichtePage.

**#5 - Stundennachweis-Wording projekttyp-spezifisch**
"Foerderbare Projektarbeiten" (ZIM) vs. "Management-Arbeiten" (ZIM_NETZWERK).

**#6 - Unique Constraint v7_timesheets**
Verhindert kuenftige Duplikate. Constraint auf (employee_id, project_id, work_date, work_package_id).

**#7 - AP-Quick-View Popup in TimesheetForm**
Button/Icon neben Projekt-Dropdown: zeigt AP-Liste mit Laufzeiten + geplante PM,
schliesst ohne Zustand zu verlieren.

**#8 - ZAPanel Rollback "Bewilligt -> Eingereicht"**
Aktuell existiert nur "Bewilligt -> Entwurf" (geht zu weit zurueck).

**#9 - Multiprojekt-Tool, Forschungszulage, De-minimis**

**#10 - Nice-to-have: Vercel-Setup (§14)**

### 12.2 RLS-Status PROD: KOMPLETT (Session 21)

Alle v7-Tabellen haben RLS aktiv. v7_system_config ebenfalls mit RLS
(Session 34: SELECT alle authenticated, ALL nur system_admin).

### 12.3 SWC-Compiler-Bug: BEHOBEN (Session 21)

`bg-black/50` -> `bg-black bg-opacity-50`. Betrifft: ProjectDetailPage.
Lernpunkt: Immer von letzter STABILER Version ausgehen.

---

## 12a. KRITISCHE Architekturregeln (Zusammenfassung)

1. NIEMALS Code duplizieren (immer Shared Components)
2. Header-Farbe zeigt "Wer bin ICH", nicht was angezeigt wird
3. `v7_user_profiles` RLS-Policy: nur `id = auth.uid()` (kein Helper-Aufruf -> Zirkel)
4. `funding_format` enum: bei LIKE immer `::TEXT` Cast
5. Stundensaetze: immer aus `v7_project_assignments` (projektspezifisch)
6. Push auf v7-dev = nur Preview; main-Merge = PROD-Deploy (bewusster Schritt)
7. Lokaler Test (pnpm dev + durchklicken) vor JEDEM Push
8. VOR jeder Code-Ausgabe: aktuellste Version im Projektverzeichnis pruefen

---

## 12b. KRITISCHE Arbeitsregel: main-Merge nach v7-dev-Push

```bash
git checkout main && git pull && git merge v7-dev --no-ff --no-edit && git push origin main && git checkout v7-dev
```

NIEMALS direkt auf main arbeiten. NIEMALS Snapshot-Datei als Basis nehmen
ohne vorher `git show origin/main:<pfad> | head -15` zu pruefen.

---

## 12c. KRITISCHE Arbeitsregel: Lokaler Test vor Push

IMMER `pnpm dev` starten und geaenderte Feature-Pfade aktiv durchklicken
BEVOR `git push origin v7-dev`. Build-OK ist keine Garantie fuer Funktionsfaehigkeit.

---

## 13. Aenderungshistorie Pflichtenheft

| Version | Datum | Aenderungen |
|---------|-------|-------------|
| v4.77 | 29.04.2026 | Session 34: Anleitungen PL v2.1 + Admin v2.2 (vollstaendig neu). v7_system_config eingefuehrt. SystemConfigPanel v7.4.4-2 in berater-admin-page-v7_3_94-1. PortalNav v7.4.4-12 (manuals_enabled aus DB, stabile PDF-URLs, employee ohne Anleitung, Dateinamen-Schreibweise). Stabile Asset-URLs als Konvention dokumentiert (§10.5). Hilfe-Dropdown vollstaendig dokumentiert (§4.6). |
| v4.76 | 28.04.2026 | Session 33: Mein-Status aufgeraeumt (MA/PL/Admin), Hilfe-Dropdown in PortalNav, BerichtePage umstrukturiert, Foerderbetrag-Fix. |
| v4.75 | 28.04.2026 | Session 32: ProjektFortschrittPanel iteriert (v7.4.5-12 bis -22). BerichtePage v7.4.6-4/5 Accordion-Stabilisierung. |
| v4.74 | 24.04.2026 | Session 31: ProjektFortschrittPanel v7.4.5-11 (Zielerreichungs-Prognose, GF-Regel, Foerder-Konsequenzen). BerichtePage v7.4.6-3 (Accordion). PortalNav v7.4.4-4. |
| v4.73 | 24.04.2026 | Session 30: KPT 3-Jahres-Ansicht, Druck/PDF, kontextsensitive PortalNav. Session 29: NWM PROD, Duplikate bereinigt. |
| v4.72 | 24.04.2026 | Session 29: NWM-Tabellen in PROD, v7_fzul_vorhaben dokumentiert. |
| v4.71 | 22.04.2026 | Session 26: AP-Dropdown-Filter (Zugeordnete/Weitere AP), Matrix-Vorbelegung nach Laufzeit. PROD 8 Firmen, DEV 4 Firmen. |
| v4.70 | 21.04.2026 | Session 25: Teilzeit-Historie-UI in EmployeeManagement. |
| v4.69 | 21.04.2026 | Session 24: v7_employee_hours_history, POSITION_OPTIONS, Arbeitszeitgrenzen Phase 1. |
| v4.68 | 20.04.2026 | Session 23: Feiertags-Utility zentralisiert, kommunale Sonderfaelle. |
| v4.64 | 18.04.2026 | Session 20: Monats-Einschraenkung, Timesheet-Notizen komplett. |
| v4.63 | 17.04.2026 | Session 19: ProjectTeamManager, PM 3 Dezimalstellen. |
| v4.62 | 17.04.2026 | Session 18: create-employee-login upsert-Fix. |
| v4.61 | 16.04.2026 | Session 17b: hourly_rate_approved bevorzugt. |
| v4.60 | 16.04.2026 | Session 17: AS-System PROD-Migration. |
| v4.59 | 15.04.2026 | Session 16: ZA-Rollback, NWM EA USt-Anteil. |
| v4.58 | 15.04.2026 | Session 15: Navigation Berater-Portal, Zurueck-Buttons. |
| v4.57 | 02.04.2026 | Session 13: GIT-Sicherung, main-Merge-Pflicht. |
| Frueher | Okt 2024 - Maerz 2026 | V6 + V7 Aufbau bis Session 13 |

---

## 14. Nice-to-have: Vercel-Setup (OFFEN)

Push auf v7-dev loest Preview-Build aus; main-Push loest Production-Deploy aus.
Die "Race Condition" in Session 23/24 war kein Bug, sondern erwuenschtes Verhalten.
Optional: Preview-Builds auf v7-dev deaktivieren (spart Builds, kein funktionaler Gewinn).
Status: Nicht dringend.

---

## 15. Benutzeranleitungen (Stand Session 34)

| Dokument | Version | Gilt fuer | Ablage |
|----------|---------|-----------|--------|
| PZE-Anleitung-Projektleiter | v2.1 | PZE v7.4.6 | /public/manuals/PZE_Anleitung_Projektleiter.pdf |
| PZE-Anleitung-Firmen-Administrator | v2.2.0 | PZE v7.4.6 | /public/manuals/PZE_Anleitung_Firmen-Administrator.pdf |
| PZE-FAQ-Zeiterfassung | v1 | alle | /public/manuals/PZE-FAQ-Zeiterfassung-v1.pdf |
| Berater-Portal Anleitung | fehlt noch | - | - |
| Mitarbeiter-Anleitung | nicht vorgesehen | - | nur FAQ |

Steuerung der Download-Verfuegbarkeit: Toggle `manuals_enabled` in v7_system_config,
erreichbar unter /v7/berater/admin > System-Konfiguration. FAQ immer verfuegbar.

---

**Ende des Pflichtenhefts v4.77**
**Letzte Aktualisierung: 29. April 2026**
