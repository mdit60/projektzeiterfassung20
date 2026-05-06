# PFLICHTENHEFT - Projektzeiterfassung (PZE)

**Version:** 4.80
**SW-Release:** V7.4.7
**Datum:** 6. Mai 2026
**Projekt:** Projektzeiterfassung fuer FuE-Foerdervorhaben
**Status:** Session 36: Login PW-Toggle. Neu: §16 Codequalitaet/Technische Schulden, §17 Dokumentationsstandard externer Entwickler.

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
| v7_fzul_vorhaben | KPT: FZul-Vorhaben (title, wirtschaftsjahr, status) - NICHT v7_projects! |
| v7_system_config | System-Konfiguration Key/Value (z.B. manuals_enabled) - NEU Session 34 |

### 2.2 Wichtige Architektur-Regeln

- `v7_work_package_assignments` ist Single Source of Truth fuer MA-Projekt-Beziehungen
- Stundensaetze gehoeren in `v7_project_assignments` (projektspezifisch)
- Profil-Lookup IMMER via `.eq('id', user.id)` (v7_user_profiles.id = auth.users.id)
- `portal_role` fuer Berechtigungen aus `v7_employees.portal_role` lesen
  (NICHT aus `v7_user_profiles.role` - der ist bei Firmen-Usern immer 'client_user')
- `funding_format` ist enum-Typ: bei LIKE-Vergleichen `::TEXT` Cast erforderlich
- Personenmonate: 173.33 h/PM (40h/Woche x 52/12); 1 PM = ca. 21,67 AT (bei 8h/Tag)
- Tagesarbeitszeit: `company.standard_weekly_hours / 5` (38h -> 7,6h/Tag)
- RLS: Alle v7-Tabellen haben Row Level Security AKTIV (Stand Session 21)
- `role_in_project` (v7_project_assignments): ab Session 36 nur noch 3 zulaessige Werte:
  'Projektleiter' | 'Projektmitarbeiter' | 'Wissenschaftlicher Mitarbeiter'
  (Migration per SQL-MIGRATION-role_in_project-v1.sql erledigt)

### 2.3 Feiertagsberechnung (KRITISCH)

**Zentrale Utility (ab v7.4.6):** `src/lib/holidays/germanHolidays.ts`

**Arbeitsort-Prinzip:** Massgeblich ist der Firmenstandort (= Arbeitsort),
NICHT der Wohnort des Mitarbeiters.

**Betroffene Komponenten:** TimesheetForm, BerichtePage, StundennachweisMatrix.

**Wichtige Regel:** Faellt ein Feiertag auf ein Wochenende, wird er weder als
Fehlstunden-Tag angezeigt noch in die Summenspalte eingerechnet. Nur die
Summenspalte hat diesen Check seit laengerer Zeit korrekt; die Tages-Zelle
hatte ihn erst ab v7.4.6-10.

### 2.4 ZIM-Foerderformate

Bekannte Werte in `v7_projects.funding_format`:
- `ZIM` - Standard Einzelprojekt FuE
- `ZIM_DS` - Durchfuehrbarkeitsstudie
- `ZIM_NETZWERK` - Netzwerkmanagement (NWM-Modul aktiv)

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

Key/Value-Tabelle fuer systemweite Konfigurationsparameter.

| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| key | TEXT PK | Eindeutiger Schluessel |
| value | TEXT | Wert als String |
| updated_at | TIMESTAMPTZ | Letztes Aenderungsdatum (auto) |
| updated_by | TEXT | E-Mail des Aendernden (optional) |

RLS: SELECT alle authenticated; ALL nur system_admin.

Aktuelle Eintraege:

| key | Wert | Bedeutung |
|-----|------|-----------|
| manuals_enabled | 'true' / 'false' | Anleitungs-PDFs im Hilfe-Dropdown freigegeben |

Steuerung per Toggle in Berater-Admin (/v7/berater/admin -> System-Konfiguration).
Aenderung sofort aktiv, kein Deploy noetig.

### 2.7 Feiertagsregion - kommunale Sonderfaelle

Feld `v7_client_companies.holiday_region` (TEXT, nullable).

| Wert | Bedeutung |
|------|-----------|
| (NULL) | Standard-Bundeslandregel |
| BY_KATH | Bayern, ueberw. katholische Gemeinde |
| BY_EVAN | Bayern, ueberw. evangelische Gemeinde |
| BY_AUGSBURG | Stadt Augsburg (Mariae Himmelfahrt + Friedensfest 08.08.) |
| SN_SORB | Sachsen, sorbisches Siedlungsgebiet (Fronleichnam ja) |
| TH_EICHSFELD | Thueringen, LK Eichsfeld etc. (Fronleichnam ja) |

### 2.8 Firmen-Anlage Prozess (ab v7.4.1-6)

Bei Neuanlage einer Firma im Berater-Portal sind Admin-Felder verpflichtend
(Checkbox entfernt). Die API-Route `/api/v7/create-user` erledigt alle 3 Schritte
server-seitig mit Service-Role-Key (umgeht RLS):

1. Auth-User anlegen (Supabase Admin API)
2. v7_user_profiles anlegen (role: client_user, client_company_id gesetzt)
3. v7_employees anlegen (portal_role: client_admin)

Rollback: Bei Fehler in Schritt 2 oder 3 wird der Auth-User automatisch geloescht.
Modal schliesst sofort nach erfolgreichem Create (saved-Flag verhindert Doppel-Submit).

### 2.9 Neue User anlegen - Checkliste

Bei jedem neuen Firmen-User pruefen:
1. auth.users Eintrag vorhanden?
2. v7_user_profiles Eintrag vorhanden? (role = 'client_user')
3. client_company_id in v7_user_profiles gesetzt? <- haeufigste Fehlerquelle
4. display_name, first_name, last_name in v7_user_profiles gesetzt?
5. v7_employees Eintrag vorhanden? (portal_role gesetzt)
6. user_id in v7_employees auf auth.users.id gesetzt?

SQL-Sofortreset Passwort (ohne E-Mail):
```sql
UPDATE auth.users
SET encrypted_password = crypt('NeuesPasswort', gen_salt('bf'))
WHERE email = 'user@firma.de';
```

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
v7.4.0 - v7.4.4: Timesheet-Viewer, ZA-Modul, FirmendatenCard, ProjectDetailPage, Matrix

### 3.5 Session 7-8 (Maerz 2026)
TimesheetForm Feiertage + Monatsabschluss, NWM-Modul komplett,
NWM-Uebersichtsseite, Dashboard-Redesign

### 3.6 Sessions 22-26 (20.-22. April 2026)
Feiertagsregion, Feiertags-Utility zentralisiert, Arbeitszeitgrenzen Phase 1+2,
AP-Dropdown-Filter, PROD-Migration auf 8 Firmen

### 3.7 Sessions 27-31 (23.-24. April 2026)
KPT/FZul 3-Jahres-Ansicht, PROD-Migration NWM, ProjektFortschrittPanel,
BerichtePage Accordion, PortalNav kontextsensitiv

### 3.8 Sessions 32-33 (28. April 2026)
Mein-Status aufgeraeumt, Hilfe-Dropdown in PortalNav, BerichtePage stabilisiert

### 3.9 Session 34 (29. April 2026) - Anleitungen + System-Konfiguration

**Benutzeranleitungen vollstaendig neu erstellt:**
- PZE-Anleitung-Projektleiter v2.1 (gilt fuer v7.4.6)
- PZE-Anleitung-Firmen-Administrator v2.2.0 (gilt fuer v7.4.6)
- Mitarbeiter: keine separate Anleitung; nur FAQ
- PDF-Ablage mit STABILEN Dateinamen (keine Versionsnummer im Pfad):
  `/public/manuals/PZE_Anleitung_Projektleiter.pdf`
  `/public/manuals/PZE_Anleitung_Firmen-Administrator.pdf`
  `/public/manuals/PZE-FAQ-Zeiterfassung-v1.pdf`

**v7_system_config eingefuehrt (Details: §2.6)**

**SystemConfigPanel v7.4.4-2 + PortalNav v7.4.4-12:**
- Toggle manuals_enabled in Berater-Admin
- Hilfe-Dropdown: employee bekommt nur FAQ, kein Handbuch-Link
- Stabile URLs (Dateiname ohne Versionsnummer)

**berater-admin-page v7.3.94-1:** SystemConfigPanel eingebunden

**PortalNav-Iterationen:**
- v7.4.4-9: manuals_enabled aus DB
- v7.4.4-10: stabile Dateinamen
- v7.4.4-11: employee ohne Anleitung
- v7.4.4-12: Schreibweise PZE_Anleitung_ (Unterstrich)

### 3.10 Session 35 (1. Mai 2026) - TimesheetForm-Bugfixes + Firmenanlage-Fix

**TimesheetForm (v7.4.6-4 -> v7.4.6-10, 6 Iterationen):**

| Build | Bugfix |
|-------|--------|
| v7.4.6-5 | AP-Spalte 30->55px; Summe-Monat + offen je 50->25px; Druck +-0px (neutral) |
| v7.4.6-6 | `compareApCode` Versions-Sort: 3.1.1 < 3.1.2 < 3.4 (an 3 Stellen: Vorbelegung + beide Dropdown-Gruppen) |
| v7.4.6-7 | U/K/S in `nonBillableEntries` (sonstige Arbeiten) fehlte in `getAbsencesForDay` + `calculateAbsenceSums` |
| v7.4.6-8 | ArrowDown: leere AP-Zeilen werden uebersprungen, nonbillable-Zeile immer erreichbar |
| v7.4.6-9 | `offen`-Spalte zeigt negative Stunden wenn MA kein Arbeitsplan-Eintrag hat (Vertretungsfall) |
| v7.4.6-10 | Feiertag auf Wochenende: Fehlzeiten-Tageszelle bleibt leer (Summe war bereits korrekt) |

**Firmen-Anlage (3 Iterationen):**
- v7.4.1-4: Admin-Felder immer sichtbar (Checkbox entfernt), E-Mail Pflichtfeld
- v7.4.1-5: saved-Flag: Doppel-Submit verhindert, Modal schliesst sofort
- v7.4.1-6: RLS-Fix: Profil+Employee-Insert clientseitig -> server-seitig

**create-user-route v7.4.1-1:** Alle 3 Schritte (Auth + Profil + Employee)
server-seitig mit Service-Role-Key. Vollstaendiger Rollback bei Fehler.

**EmployeeManagement v7.3.95-14:** Verwaiste Login-User (v7_user_profiles vorhanden,
v7_employees fehlt) in Mitarbeiterliste mit gelbem Hinweis-Badge sichtbar und
direkt bearbeitbar.

**Nicht-Code-Arbeiten:**
- VETIS Arbeitsplan: +11 Tage Verschiebung (Bewilligung 03.03. vs. Antrag 20.02.),
  Tippfehler-Korrektur AP1-Enddatum, Neuterminierung ab AP3.3.1 ins Kalender-Raster,
  AP5.2 auf bewilligtes Ende 02.03.2027 verlaengert. PM-Werte unveraendert.
- GF ohne Mitarbeiter-Eintrag: SQL-Sofortloesungen dokumentiert (PW-Reset,
  client_company_id, v7_employees-Insert mit display_name NOT NULL beachten)
- ALACsystems GmbH & Co. KG erfolgreich als neue PROD-Firma angelegt (9. Firma)

---

## 4. Komponenten-Uebersicht

### 4.1 Shared Components (src/components/shared/)

| Datei | Version | Funktion |
|-------|---------|----------|
| ArbeitsplanImport.tsx | 7.3.87 | Excel Download/Upload |
| ConsultantManagement.tsx | aktuell | Berater-Verwaltung |
| EmployeeManagement.tsx | **7.3.95-14** | MA + Teilzeit-Historie + Orphan-Erkennung |
| FirmendatenCard.tsx | 7.4.6-1 | Firmendaten + Feiertagsregion-Dropdown |
| NWMEigenanteilPanel.tsx | 7.4.5-11 | EA-Berechnung, Archiv, PDF |
| NWMEinstellungenPanel.tsx | 7.4.5-1 | NWM-Settings, Bankdaten, Rechnungskonfig |
| NWMPartnerPanel.tsx | 7.4.5-4 | Netzwerkpartner, Smart-Quoten |
| PortalHeader.tsx | 7.3.95-4 | Header mit Rolle, PW-Aendern |
| PortalNav.tsx | **7.4.4-12** | Navigation + Hilfe-Dropdown + manuals_enabled aus DB |
| ProjectCreateForm.tsx | 7.3.57 | Projekt anlegen |
| ProjectDetailPage.tsx | 7.4.4-54 | Projekt-Detail + NWM-Tab-Switch |
| ProjectTeamManager.tsx | **7.4.4-17** | Team-Verwaltung, ROLE_OPTIONS auf 3 ZA-Werte reduziert |
| SystemConfigPanel.tsx | **7.4.4-2** | Toggle Anleitungs-Downloads (manuals_enabled) |
| TimesheetForm.tsx | **7.4.6-10** | ZE + Monatsabschluss + AP-Filter + 6 Bugfixes |
| BerichtePage.tsx | 7.4.6-5 | Berichte & Controlling + Accordion |
| ProjektFortschrittPanel.tsx | 7.4.5-11 | Zielerreichungs-Prognose |
| StundennachweisMatrix.tsx | 7.4.6-1 | Matrix-Ampel + Feiertagsregion |
| WorkPackageTable.tsx | 7.4.3-11 | Arbeitsplan, PM 3 Dezimalstellen |
| ZAPanel.tsx | 7.4.4-22 | ZA-Formular inkl. NWM-Kostentabelle |
| lib/holidays/germanHolidays.ts | 7.4.6-1 | Zentrale Feiertags-Utility |

### 4.2 API-Routen

| Datei | Version | Funktion |
|-------|---------|----------|
| src/app/login/page.tsx | **7.3.90-2** | Login-Seite (PW-Toggle Augensymbol) |
| src/app/api/v7/create-user/route.ts | **7.4.1-1** | Auth + Profil + Employee server-seitig |
| src/app/api/v7/create-employee-login/route.ts | 7.3.95-1 | Login fuer vorhandenen MA |

### 4.3 Wrapper-Seiten

| Pfad | Version | Funktion |
|------|---------|----------|
| src/app/v7/berater/foerderung/page.tsx | **7.4.1-6** | Kundenfirmen + Firmenanlage (Admin Pflichtfeld) |
| src/app/v7/berater/admin/page.tsx | **7.3.94-1** | Berater-Admin + SystemConfigPanel |
| src/app/v7/firma/zeiterfassung/page.tsx | 7.4.6-2 | ZE-Wrapper Firmen-Portal |
| src/app/v7/berater/foerderung/firma/[id]/zeiterfassung/page.tsx | 7.4.6-2 | ZE-Wrapper Berater-Portal |

### 4.4 Hilfe-Dropdown (PortalNav, ab v7.4.4-7)

Immer sichtbar im Firmen-Portal (alle Seiten, oben rechts):
- client_admin: `PZE_Anleitung_Firmen-Administrator.pdf` (wenn manuals_enabled)
- project_leader: `PZE_Anleitung_Projektleiter.pdf` (wenn manuals_enabled)
- employee: kein Handbuch (nur FAQ)
- Alle Rollen: `PZE-FAQ-Zeiterfassung-v1.pdf` (immer, unabhaengig von manuals_enabled)
- Wenn manuals_enabled=false: Amber-Hinweis "Wird aktualisiert"

### 4.5 AP-Sortierung (compareApCode, ab v7.4.6-6)

Versions-Sort-Funktion in TimesheetForm zerlegt ap_code punktweise in Zahlen
und vergleicht numerisch je Ebene. Korrekt fuer beliebige Tiefe:
`3 < 3.1 < 3.1.1 < 3.2 < 3.4 < 4 < 5.1`

Angewendet an 3 Stellen: Matrix-Vorbelegung, Dropdown "Zugeordnete AP",
Dropdown "Weitere AP".

### 4.6 Vertretungsfall in TimesheetForm (ab v7.4.6-9)

Wenn ein MA Stunden in einem AP bucht, fuer den er keinen Arbeitsplan-Eintrag
hat (kein planned_pm): `offen`-Spalte zeigt negative Stunden in Rot statt "-".
Gesamtstunden werden korrekt mitgezaehlt (war schon immer so).

---

## 5. Bekannte Fehler und Status

| Nr. | Fehler | Status | Version |
|-----|--------|--------|---------|
| 5.1-5.32 | (Aeltere Fehler) | Behoben | s. PH v4.76 |
| 5.33 | AP-Ueberschriften im Dropdown waehlbar | Behoben | v7.4.6-2 |
| 5.34 | Abgelaufene AP in neue Monate vorbelegt | Behoben | v7.4.6-3 |
| 5.35 | Vorbelegte AP-Zeilen in zufaelliger Reihenfolge | Behoben | v7.4.6-4 |
| 5.36 | AP-Spalte zu schmal fuer dreistellige AP-Nummern | Behoben | v7.4.6-5 |
| 5.37 | AP-Sortierung 3.4 vor 3.1.1 (falsche Reihenfolge) | Behoben | v7.4.6-6 |
| 5.38 | U/K/S in sonstige Arbeiten fehlte in Fehlzeiten | Behoben | v7.4.6-7 |
| 5.39 | ArrowDown aus AP-Zeile erreichte sonstige Arbeiten nicht | Behoben | v7.4.6-8 |
| 5.40 | offen-Spalte zeigte "-" statt neg. Zahl im Vertretungsfall | Behoben | v7.4.6-9 |
| 5.41 | Feiertag auf Wochenende zeigte 8h in Fehlzeiten-Tageszelle | Behoben | v7.4.6-10 |
| 5.42 | Firmenanlage: RLS-Fehler bei Profil-Insert | Behoben | v7.4.1-6 |
| 5.43 | Firmenanlage: Doppel-Submit moeglich (Modal blieb offen) | Behoben | v7.4.1-5 |
| 5.44 | GF ohne v7_employees-Eintrag nicht verwaltbar | Behoben | v7.3.95-14 + Prozess |

---

## 6. ZA-Modul (Zahlungsanforderungen)

### 6.1 Konzept
Datenaufbereitung fuer ZIM-Mittelabruf. Kein eigenes PDF. Daten werden manuell
in das offizielle VDI/VDE-IT Formular uebertragen.

### 6.2 Unterstuetzte Foerderformate
| Format | isDS | isNetzwerk |
|--------|------|------------|
| ZIM | false | false |
| ZIM_DS | true | false |
| ZIM_NETZWERK | false | true |

### 6.3 Status-Workflow
```
Entwurf --> Eingereicht --> Bewilligt
                |                |
                v                v
            Entwurf          Eingereicht (Rollback v7.4.4-27)
```

### 6.4 Stundensatz-Logik
`hourly_rate_approved` hat Vorrang vor `hourly_rate`.

---

## 7. NWM-Modul (ZIM-Netzwerkmanagement)

### 7.1 Ueberblick
Aktuell produktiv: YachtConnect (FKZ 16KN124502, 8 Netzwerkpartner)

### 7.2 Tab-Architektur
Haupttabs + [Netzwerk] -> Sub-Tabs:
[<- Zurueck] [Einstellungen] [Netzwerkpartner] [Eigenanteile]
URL-Parameter: ?nwmTab=einstellungen|partner|eigenanteile

### 7.3 Foerdersatz-Stufen
National: Phase 1: 90%; Phase 2: J1:70%, J2:50%, J3-4:30%
International: Phase 1: 95%; Phase 2: J1:80%, J2:60%, J3-4:40%

### 7.4 Eigenanteil-Berechnung
```
NWM-Kosten = PK + Dritte + Uebrige (= 100% PK, pauschal)
Foerderbetrag = NWM-Kosten x Foerdersatz%
EA = NWM-Kosten x (100% - Foerdersatz%)
EA je NP = EA x NP-Quote (cent-genau)
```

### 7.5 Perioden-Logik
3-Monats-Rhythmus ab Projektstart (NICHT Kalenderquartale).
Von/Bis frei waehlbar. Bezahlte EA nicht loeschbar.

---

## 7b. Timesheet-Notizen (Interne Rueckfragen)

Pro MA/Projekt/Monat eine Notiz. Nur PL, Admin und Berater sehen Notizen.
Kein Loeschen (Historie). Anzeige in: TimesheetForm, Matrix, Dashboard, Mein-Status.

---

## 7c. Compliance: Monats-Einschraenkung

Erlaubter Zeitraum = Schnittmenge aus employment_start/end + assignment_start/end
+ project start_date/end_date. Ungueltige Monate nicht im Dropdown, grau + nicht
klickbar in Matrix und Mein-Status.

---

## 7d. AP-Auswahl und Matrix-Vorbelegung (ab v7.4.6-2)

AP waehlbar wenn: total_person_months > 0, start_date + end_date gesetzt, is_active.

"Zugeordnete AP": planned_pm > 0, Laufzeit-Check (end_date + 2 Monate >= Monatsende).
"Weitere AP": alle uebrigen, kein Laufzeit-Check (Vertretungsfaelle).
Matrix-Vorbelegung: nur Zugeordnete AP, sortiert nach compareApCode (ab v7.4.6-6).

---

## 7e. Arbeitszeitgrenzen (Phase 1 + 2)

- Monatsgrenze (weich): 173.33 * (wochenstunden / 40)
- 50%-GF-Regel (weich): Max 50% Projektstunden fuer Geschaeftsfuehrer
- Tagesgrenze (hart): 9h

Phase 1 (Session 24): Datenbasis (v7_employee_hours_history, POSITION_OPTIONS)
Phase 2 (Session 25): Teilzeit-Historie-UI in EmployeeManagement
Phase 3 (geplant): Live-Validierung Ampel-Trio

---

## 8. Monatsabschluss-Workflow

MA schliesst Monat ab -> v7_timesheet_completions. Matrix + Mein-Status gruen.
Admin kann Abschluss aufheben. Speichern-Verhalten: Abschluss wird nur
zurueckgesetzt wenn tatsaechlich Aenderungen gespeichert wurden.

---

## 9. Seiten-Uebersicht

### 9.1 Firmen-Portal (/v7/firma/...)

| Route | Beschreibung |
|-------|--------------|
| /v7/firma/dashboard | Modul-Kacheln |
| /v7/firma/mein-status | Ampel, Rueckfragen, Downloads rollenabhaengig |
| /v7/firma/projekte | Projektliste |
| /v7/firma/projekte/[id] | Projekt-Detail + NWM |
| /v7/firma/zeiterfassung | Zeiterfassung (TimesheetForm v7.4.6-10) |
| /v7/firma/berichte | Berichte & Controlling (Accordion) |
| /v7/firma/mitarbeiter | EmployeeManagement v7.3.95-14 |
| /v7/firma/firmendaten | FirmendatenCard |

### 9.2 Berater-Portal (/v7/berater/...)

| Route | Beschreibung |
|-------|--------------|
| /v7/berater/dashboard | 4 Kacheln + Offene Rueckfragen |
| /v7/berater/netzwerk | NWM-Uebersicht alle Netzwerke |
| /v7/berater/foerderung | Kundenfirmen (foerderung-page v7.4.1-6) |
| /v7/berater/foerderung/firma/[id] | Firma-Detail |
| /v7/berater/foerderung/firma/[id]/projekt/[pid] | Projekt + NWM |
| /v7/berater/foerderung/firma/[id]/zeiterfassung | ZE der Firma |
| /v7/berater/foerderung/firma/[id]/berichte | Berichte der Firma |
| /v7/berater/timesheets | Timesheet-Viewer |
| /v7/berater/multiprojekt | KPT 3-Jahres-Ansicht |
| /v7/berater/admin | Berater-Verwaltung + System-Konfiguration |

---

## 10. Deployment

### 10.1 Standard Deploy-Ablauf
```bash
cp ~/Documents/Dev/PZE/downloads/[Dateiname] src/[Zielpfad]
pnpm dev   # lokal durchklicken (Pflicht!)
git add -A && git commit -m "beschreibung"
git push origin v7-dev
git checkout main && git pull
git merge v7-dev --no-ff --no-edit
git push origin main
git checkout v7-dev
```

### 10.2 Versionierungskonvention
KRITISCH: Jede Aenderung = neues Inkrement N im Dateinamen. Niemals ueberschreiben.
KRITISCH: VOR jeder Dateiausgabe im Projektverzeichnis nach letzter Version suchen.

### 10.3 Stabile Asset-URLs (ab Session 34)
PDFs und oeffentliche Assets ohne Versionsnummer im Dateinamen -> neue Version
einfach ueberschreiben, kein Code-Deploy noetig.

---

## 11. Test-User + Kundenlisten

### 11.1 Test-User
| Name | Rolle | Portal / Firma |
|------|-------|----------------|
| Martin Ditscherlein | system_admin | Berater |
| Katrin Kirchner | consultant | Berater + Cubintec |
| Lisa Kirchner | client_user | Cubintec GmbH |
| Robin Freund | client_admin | Steuerkanzlei Freund |
| Annika Arndt | project_leader | Steuerkanzlei Freund |
| Thomas Duehrkop | client_user | Global Maritime Management |

### 11.2 PROD-Kundenliste (Stand Session 35, 01.05.2026 - 9 Firmen)
1. ALACsystems GmbH & Co. KG (Kirchhundem, NRW) - NEU Session 35
2. Androlite GmbH (Schwabach, Bayern - BY_EVAN)
3. AS System (Trittau, Schleswig-Holstein)
4. Automotive Synergies GmbH & Co. KG (Schwabach, Bayern - VETIS-Projekt)
5. Cubintec GmbH (Bad Neustadt, Bayern)
6. Fischbach Bauunternehmung (Wangen i.A., Baden-Wuerttemberg)
7. Global Maritime Management GmbH (Trittau, Schleswig-Holstein)
8. Luebeck Yacht Trave Schiff GmbH (Luebeck, Schleswig-Holstein)
9. Steuerkanzlei Robin Freund (Buechen, Schleswig-Holstein)
10. STOMA GmbH (Siegburg, NRW)

### 11.3 DEV-Kundenliste (4 Firmen, nicht synchron mit PROD)
AS System, Cubintec GmbH, Luebeck Yacht Trave Schiff GmbH, Tippl GmbH

---

## 12. Naechste Schritte

### 12.1 Prio-Liste

1. **Berater-Portal User Manual** (fehlt noch)
2. **Arbeitszeitgrenzen Phase 3: Live-Validierung Ampel-Trio**
   Drei farbige Warnampeln in TimesheetForm (+ Matrix + BerichtePage):
   - Monatsgrenze: max. 173,33h * (pWAZ/40) pro Monat
   - 50%-GF-Regel: Geschaeftsfuehrer max. 50% der Arbeitszeit im Projekt
   - Tagesgrenze: max. 9h/Tag (ZIM-Richtlinie, hart)
   Phase 1 (Datenbasis) und Phase 2 (Historie-UI) sind erledigt.
3. **Stundennachweis-Wording projekttyp-spezifisch**
   Aktuell steht immer "1. foerderbare Projektarbeiten" im Timesheet.
   Bei ZIM_NETZWERK-Projekten muss es "Management-Arbeiten" heissen
   (laut ZIM-Richtlinie fuer Netzwerkmanagement). Noch nicht umgesetzt.
4. **AP-Quick-View Popup in TimesheetForm**
   Icon/Button neben dem Projekt-Dropdown oeffnet ein Popup mit der AP-Liste
   (Laufzeiten + geplante PM) ohne die Zeiterfassung zu verlassen.
5. **ZAPanel Rollback "Bewilligt -> Eingereicht"**
   Aktuell nur "Bewilligt -> Entwurf" vorhanden (geht zu weit zurueck).
   "Bewilligt -> Eingereicht" als Zwischenstufe noch fehlend.
6. **NWM-Prognose im KPT (Kapazitaetsplanungstool)**
   Gestufte Foerderquoten je Netzwerkjahr im ProjektFortschrittPanel.
7. **NWM Jahresabrechnung Foerdersatz-Stufung pruefen**
8. **FZul-Modul** (Konzept offen)
9. **De-minimis-Beihilfen-Datenbank** (Konzept offen)

### 12.2 RLS-Status PROD: KOMPLETT (Session 21)
Alle v7-Tabellen haben RLS aktiv. v7_system_config ebenfalls mit RLS (Session 34).

---

## 12b. KRITISCHE Architekturregeln

1. Niemals Code duplizieren (immer Shared Components)
2. Header-Farbe zeigt "Wer bin ICH"
3. v7_user_profiles RLS: nur `id = auth.uid()` (kein Helper-Aufruf -> Zirkel)
4. funding_format enum: bei LIKE immer `::TEXT` Cast
5. Stundensaetze aus v7_project_assignments (projektspezifisch)
6. Push auf v7-dev = nur Preview; main-Merge = PROD-Deploy
7. IMMER pnpm dev + durchklicken vor Push
8. VOR Code-Ausgabe: aktuellste Version im Projektverzeichnis pruefen
9. **EXTERN-ENTWICKLER-PRINZIP (Prioritaet hoch):** Jede Komponente, jede Architekturentscheidung
   und jede bekannte Einschraenkung muss so dokumentiert sein, dass ein externer menschlicher
   Entwickler ohne Rueckfragen einsteigen, verstehen und weiterentwickeln kann.
   Dies gilt als permanente Querschnittsanforderung an alle Code-Aenderungen und PH-Updates.
10. **CHIRURGISCHES AENDERN:** Funktionierender Code wird nie restrukturiert oder "verbessert".
    Korrekturen betreffen immer nur die betroffenen Zeilen. Gilt besonders fuer CSS, Druckstile,
    Layout-Logik.

## 12c. KRITISCHE Arbeitsregel: main-Merge nach jedem Deploy

```bash
git checkout main && git pull && git merge v7-dev --no-ff --no-edit && git push origin main && git checkout v7-dev
```

---

## 13. Aenderungshistorie Pflichtenheft

| Version | Datum | Aenderungen |
|---------|-------|-------------|
| v4.80 | 06.05.2026 | Session 36: Login PW-Toggle (v7.3.90-2). ProjectTeamManager v7.4.4-17: ROLE_OPTIONS auf 3 ZA-relevante Werte + SQL-Migration. Neu §16 Codequalitaet + Technische Schulden. Neu §17 Dokumentationsstandard externer Entwickler. §12b Regeln 9+10. §2 role_in_project-Werte dokumentiert. |
| v4.79 | 01.05.2026 | Backlog bereinigt: KPT-Umbenennung (MPT->KPT), Vercel-Preview-Entscheidung, Prio-Liste praezisiert
| v4.78 | 01.05.2026 | Session 35: TimesheetForm v7.4.6-5 bis -10 (6 Bugfixes: AP-Spalte, compareApCode, Fehlzeiten nonBillable, ArrowDown, offen negativ, Feiertag Wochenende). Firmenanlage v7.4.1-4/5/6 (Pflichtfeld, Doppel-Submit, RLS-Fix). create-user-route v7.4.1-1. EmployeeManagement v7.3.95-14 (Orphan-Badge). VETIS Arbeitsplan korrigiert. ALACsystems als 9. PROD-Firma angelegt. Session 34 (erstmals im Repo): Anleitungen v2.1/v2.2, v7_system_config, SystemConfigPanel, PortalNav v7.4.4-12, stabile Asset-URLs. |
| v4.76 | 28.04.2026 | Session 33: Mein-Status, Hilfe-Dropdown, BerichtePage, Foerderbetrag-Fix |
| v4.75 | 28.04.2026 | Session 32: ProjektFortschrittPanel iteriert |
| v4.74 | 24.04.2026 | Session 31: ProjektFortschrittPanel, BerichtePage Accordion, PortalNav |
| v4.73 | 24.04.2026 | Session 30: KPT, PortalNav kontextsensitiv, NWM PROD |
| v4.71 | 22.04.2026 | Session 26: AP-Dropdown-Filter, Matrix-Vorbelegung, PROD 8 Firmen |
| v4.70 | 21.04.2026 | Session 25: Teilzeit-Historie-UI |
| v4.69 | 21.04.2026 | Session 24: Arbeitszeitgrenzen Phase 1 |
| v4.68 | 20.04.2026 | Session 23: Feiertags-Utility zentralisiert |
| Aelter | bis 28.04.2026 | s. PH v4.76 |

---

## 14. Vercel-Setup - Entscheidung (Session 35)

Push auf `v7-dev` loest einen Vercel Preview-Build aus, der nie genutzt wird
(Tests laufen entweder auf localhost oder direkt auf pze.itenion.com).
Push auf `main` loest den Production-Deploy aus.

**Entscheidung:** Preview-Build fuer v7-dev wird deaktiviert (spart Build-Minuten,
kein funktionaler Verlust). Der manuelle main-Merge bleibt der bewusste PROD-Deploy-Schritt.

**Umsetzung:** Vercel Dashboard -> Projekt -> Settings -> Git -> "Ignored Build Step"
auf Branch `v7-dev` setzen, oder Branch-Filter fuer Production Only konfigurieren.

Status: Zu erledigen wenn Zeit ist, kein Prio-Backlog-Eintrag mehr.

---

## 15. Benutzeranleitungen (Stand Session 34)

| Dokument | Version | PDF-Pfad |
|----------|---------|----------|
| PZE-Anleitung-Projektleiter | v2.1 | /public/manuals/PZE_Anleitung_Projektleiter.pdf |
| PZE-Anleitung-Firmen-Administrator | v2.2.0 | /public/manuals/PZE_Anleitung_Firmen-Administrator.pdf |
| PZE-FAQ-Zeiterfassung | v1 | /public/manuals/PZE-FAQ-Zeiterfassung-v1.pdf |
| Berater-Portal Anleitung | fehlt | - |
| Mitarbeiter-Anleitung | nicht vorgesehen | nur FAQ |

Steuerung ueber manuals_enabled-Toggle in /v7/berater/admin.

---

**Ende des Pflichtenhefts v4.80**
**Letzte Aktualisierung: 6. Mai 2026**

---

## 16. Codequalitaet und Technische Schulden

### 16.1 Hintergrund

PZE wurde vom Projektstart (Oktober 2024) an konsequent mit KI-Unterstuetzung entwickelt.
Das birgt ein strukturelles Risiko: Korrekturen koennen lokal funktionieren, aber global
das Systemdesign fragmentieren. Durch konsequentes Projektmanagement (Pflichtenheft,
Versionierung, GIT-Sicherungen, Shared-Component-Architektur, chirurgisches Aendern) wurde
dieses Risiko erheblich reduziert -- aber nicht eliminiert.

Dieses Kapitel dokumentiert bekannte technische Schulden, Risikobereiche und den Plan zu
deren sukzessiver Beseitigung.

### 16.2 Bekannte Technische Schulden

| Nr. | Komponente | Beschreibung | Risiko | Status |
|-----|-----------|--------------|--------|--------|
| TS-1 | ProjectDetailPage v7.4.4-54 | Frozen wegen Vercel SWC-Compiler-Bug. Fuer Felder ohne Props: Option B (direkt aus DB laden im Panel). Keine Aenderungen bis Bug geloest. | Hoch | Offen |
| TS-2 | v7-dev Preview-Build | Push auf v7-dev loest ungenutzten Preview-Build aus (Build-Minuten-Verschwendung). Deaktivierung per Vercel-Dashboard geplant. | Niedrig | Offen (§14) |
| TS-3 | Stundennachweis-Wording | "foerderbare Projektarbeiten" steht immer, bei ZIM_NETZWERK muss "Management-Arbeiten" stehen. Nicht umgesetzt. | Mittel | Prio 3 (§12.1) |
| TS-4 | ZAPanel Rollback | Nur "Bewilligt -> Entwurf" vorhanden. Korrekt waere "Bewilligt -> Eingereicht". | Niedrig | Prio 5 (§12.1) |
| TS-5 | Berater-Firma-Detail Header-Farbe | Firmen-Detailseite im Berater-Portal zeigt aktuell falsche Header-Farbe (soll immer Blau sein). | Niedrig | Offen |
| TS-6 | Datenbank-Query-Muster | Ueber 35 Sessions koennen sich redundante oder ineffiziente Query-Muster eingeschlichen haben. Kein konkreter Befund, aber ungeprueft. | Mittel | Audit ausstehend |
| TS-7 | Session-uebergreifende Konsistenz | Claude hat nie vollstaendigen Code-Ueberblick. Implizite Abhaengigkeiten koennen unentdeckt bleiben. | Mittel | Permanentes Monitoring |

### 16.3 Massnahmen und Prinzipien

**Kurzfristig (laufend in jeder Session):**
- Chirurgisches Aendern: Niemals Umstrukturierung funktionierenden Codes.
- Bei jedem neuen Feature: Pruefen ob bestehende Shared Components genutzt oder erweitert
  werden koennen, bevor Neues gebaut wird.
- Bekannte technische Schulden aus dieser Tabelle ansprechen wenn thematisch passend.

**Mittelfristig (dedizierte Sessions):**
- TS-1 (ProjectDetailPage): Neu bauen sobald Vercel SWC-Bug behoben oder Workaround verfuegbar.
- TS-3 (Stundennachweis-Wording): Mit Arbeitszeitgrenzen Phase 3 zusammen angehen (thematisch nah).
- TS-6 (Query-Audit): Einmalige Pruefung der haeufig genutzten Supabase-Abfragen auf
  Redundanz und Performance. Kein vollstaendiger Rewrite, nur gezielte Korrekturen.

**Dauerhaft:**
- Pflichtenheft ist die Single Source of Truth. Jede Architekturentscheidung wird hier
  dokumentiert -- auch wenn sie ein Kompromiss oder eine bekannte Schwaeche ist.
- Neue Sessions starten immer mit Lesen der aktuellen Dateiversion aus dem Projekt-Vault.

### 16.4 Qualitaetssicherungs-Checkliste (vor jedem Deploy)

```
[ ] pnpm build lokal sauber (keine TypeScript-Fehler)
[ ] pnpm dev: betroffene Feature-Pfade aktiv durchgeklickt
[ ] UTF-8-Check: keine Sonderzeichen im Code (Python-Skript)
[ ] Versionsnummer im Dateinamen und im internen Kommentar korrekt inkrementiert
[ ] Kein bestehender funktionierender Code umstrukturiert
[ ] Neue Datenbankabfragen: RLS-Kompatibilitaet geprueft
[ ] Deploy-Script erstellt und getestet
[ ] Nach erfolgreichem Prod-Test: alte Dateiversion archiviert
```

---

## 17. Dokumentationsstandard fuer externe Entwickler

### 17.1 Grundsatz

PZE soll jederzeit so dokumentiert sein, dass ein externer qualifizierter Entwickler
ohne direkte Rueckfragen:
- Die Systemarchitektur versteht (Portale, Rollen, DB-Schema, RLS)
- Jede Komponente lokalisieren und ihren Zweck verstehen kann
- Bekannte Einschraenkungen und Frozen-Bereiche kennt (z.B. ProjectDetailPage)
- Den Deploy-Workflow selbststaendig ausfuehren kann
- An bestehenden Strukturen weiterentwickeln kann ohne versehentlich Architekturprinzipien
  zu verletzen

Dies ist eine **permanente Querschnittsanforderung**, keine einmalige Aufgabe.

### 17.2 Was wo dokumentiert wird

| Dokumenttyp | Ablageort | Inhalt |
|-------------|-----------|--------|
| Systemarchitektur, Anforderungen, Konventionen | Dieses Pflichtenheft | Single Source of Truth |
| Komponentenspezifische Logik | Inline-Kommentare im Code | Entscheidungsgruende, nicht nur "was" sondern "warum" |
| Bekannte Bugs und Einschraenkungen | §5 (Bekannte Fehler) + §16.2 (Technische Schulden) | Mit Status und Risikobewertung |
| Deployment und Git-Workflow | §10 + deploy-*.sh Skripte | Vollstaendig ausfuehrbar ohne Erklaerung |
| Datenbankschema | §2 | Alle Tabellen, Felder, Beziehungen, RLS-Regeln |
| Benutzeranleitungen | /public/manuals/ + §15 | Fuer Endnutzer, nicht Entwickler |

### 17.3 Code-Kommentierungsstandard

Jede Komponente enthaelt am Kopf:
```
// Dateiname-vX_Y_Z-N.tsx
// VERSION: vX.Y.Z-N - Kurzbeschreibung der letzten Aenderung
// DATUM: TT. Monat JJJJ
// ZWECK: Was macht diese Komponente (1-2 Saetze)
// PORTALE: Firmen-Portal / Berater-Portal / beide
// ABHAENGIGKEITEN: Welche DB-Tabellen, welche anderen Komponenten
// BEKANNTE EINSCHRAENKUNGEN: (wenn vorhanden)
```

Innerhalb des Codes:
- Komplexe Berechnungen (Feiertage, PM-Umrechnung, ZA-Logik) mit Erklaerungskommentar
- Nicht-offensichtliche Architekturentscheidungen begruenden ("warum so und nicht anders")
- Frozen-Bereiche mit deutlichem Kommentar kennzeichnen: `// FROZEN: Nicht aendern - [Grund]`

### 17.4 Pflichtenheft-Pflegestandard

- Nach jeder Session: PH wird aktualisiert (neue Version, neue Eintraege in §3, §4, §5)
- Neue Architekturentscheidungen: sofort in §12b oder eigenem Abschnitt
- Neue DB-Felder: sofort in §2
- Neue Routen: sofort in §9
- Keine Session endet ohne aktualisiertes Pflichtenheft im Repo (GIT-Sicherung)

### 17.5 Einstiegspfad fuer externen Entwickler

Empfohlene Lesereihenfolge fuer schnellen Einstieg:
1. §1 Projektuebersicht (Architektur, Rollen, UI-Konventionen)
2. §2 Datenbankschema (Tabellen, RLS, wichtige Regeln)
3. §4 Komponenten-Uebersicht (aktuellste Versionsnummern)
4. §9 Seiten-Uebersicht (Routing)
5. §10 Deployment (Deploy-Workflow)
6. §12b Kritische Architekturregeln
7. §16 Technische Schulden (bekannte Risiken)
8. §5 Bekannte Fehler (offene und behobene Issues)
