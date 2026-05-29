# PFLICHTENHEFT - Projektzeiterfassung (PZE)

**Version:** 4.94
**SW-Release:** V7.4.9
**Datum:** 29. Mai 2026
**Projekt:** Projektzeiterfassung fuer FuE-Foerdervorhaben
**Status:** Session 46: Feiertags-Auto-Fill in S-Zeile, Supabase Max-Rows-Fix, Smoke-Test-Checkliste

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

**Auto-Fill Fehlzeiten (ab v7.4.6-19):** Beim Laden der Zeiteintraege werden
Werktags-Feiertage (Mo-Fr) automatisch in der S-Zeile (Sonstige bezahlte
Ausfallzeiten) mit Tagesstunden (standard_weekly_hours / 5) vorbelegt.
Bereits manuell erfasste S-Werte werden NICHT ueberschrieben. Die Vorbelegung
basiert auf company.federal_state und company.holiday_region.

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

**SystemConfigPanel v7.4.4-1 + PortalNav v7.4.4-12:**
- Toggle manuals_enabled in Berater-Admin
- Hilfe-Dropdown: employee bekommt nur FAQ, kein Handbuch-Link
- Stabile URLs (Dateiname ohne Versionsnummer)

**berater-admin-page v7.3.94-1:** SystemConfigPanel eingebunden

**PortalNav-Iterationen:**
- v7.4.4-9: manuals_enabled aus DB
- v7.4.4-10: stabile Dateinamen
- v7.4.4-11: employee ohne Anleitung
- v7.4.4-12: Schreibweise PZE_Anleitung_ (Unterstrich)

### 3.12 Session 38 (7. Mai 2026) - Fehlzeiten editierbar + Teilzeit + Cockpit-Konzept

**Fehlzeiten direkt editierbar (TimesheetForm v7.4.6-16/17):**
Keine Automatik mehr fuer U/K/S-Stunden. Anwender traegt selbst ein.
Tageszellen editierbar wie Excel, weiss, Tastaturnavigation (Pfeiltasten/Tab/Enter),
hasChanges-Fix. Haftungsrisiko durch Automatik eliminiert.

**Teilzeit Tage x Stunden (EmployeeManagement v7.3.95-15, v7-types v7.4.9-1):**
Eingabe: Tage/Woche x Stunden/Tag -> weekly_hours berechnet.
Anzeige: "3T x 8h = 24 h/Woche (TZ-Faktor: 60%)".
SQL-Migration PROD ausgefuehrt. 40h/38h automatisch befuellt.
Offene Teilzeit-Daten: Doan/Kirchner Lisa/Freund Marlene -> Katrin klaert.

**ZA-Sortierung (ZAPanel v7.4.4-33):**
Anlage 1a: MA sortiert nach employee_number (lfd. Nr. gemaess Antrag).

**PM-Summen-Fix (WorkPackageTable v7.4.3-12):**
sums nutzt assignmentMap (dedupliziert). Verhindert Doppelzaehlung bei
mehrfachen DB-Eintraegen fuer gleiche wp+employee Kombination.

**DB-Bereinigungen PROD:**
- Arndt, Annika + Mueller, Anett (Steuerkanzlei Freund): vollstaendig geloescht
- ANOVIA: Duplikate in v7_work_package_assignments fuer Freund, Marlene entfernt
- Teilzeit-Daten gesetzt: Fischbach 5Tx7,8h, Luebeck Yacht 5Tx7h, Schoebel 5Tx6h

**Konzept Firma-Cockpit als MIS (KONZEPT-FIRMA-COCKPIT-v1_0.md):**
Grundkonzept: Pro Firma ein Cockpit mit Firmenkopf, MA-Matrix, Projekte,
Finanzuebersicht (ZA + Zahlungseingang). Details in Konzept-Dokument.
Implementierung naechste Sessions.

### 3.10 Session 36 (6. Mai 2026) - Arbeitszeitgrenzen Phase 3 + Dashboard-Redesign

### 3.11 Session 37 (7. Mai 2026) - Navigation Firma-Portal finalisiert

**ProjectDetailPage v7.4.4-55:**
Zurueck-Button im Firmen-Portal zeigt "← Dashboard" und navigiert zu
/v7/firma/berichte. Berater-Portal unveraendert.

**page-firma-projekte Redirect (v7.3.90):**
/v7/firma/projekte leitet auf /v7/firma/berichte um. Die separate Projektliste
ist ins Dashboard integriert -- diese Seite wird nicht mehr benoetigt.
Gilt auch als Sicherheitsnetz falls backUrl-Prop den alten Pfad uebergibt.

**BerichtePage v7.4.6-10:**
Seiten-Titel geaendert: "Berichte & Controlling" -> "Dashboard"
(konsistent mit Nav-Label).

**Login PW-Toggle (v7.3.90-2):**
Augensymbol im Passwort-Feld. Klicken + Halten zeigt PW. Desktop + Mobile.

**Projektteam als Quelle fuer Matrix/ZA (statt Arbeitsplan):**
- StundennachweisMatrix v7.4.6-2: matrixEmployees aus projectAssignments statt wpAssignments.
- ZAPanel v7.4.4-32: assignedEmployeeIds aus projectAssignments statt wpAssignments.
- BerichtePage v7.4.6-6: Zeiterfassungs-Status nutzt projectAssignments als MA-Quelle.
- Grundsatz: Arbeitsplan = urspruengliche Antragstellung (unveraenderlich). Neue MA erscheinen
  allein durch Projektteam-Eintrag in Matrix und ZA ohne AP-Aenderung.

**Berater-Nav bereinigt (PortalNav v7.4.4-12):**
Nav-Punkt "Zeiterfassungen" aus Berater-Portal entfernt (fuehrte zu 404).

**ROLE_OPTIONS konsolidiert (ProjectTeamManager v7.4.4-17 + SQL-Migration):**
role_in_project in v7_project_assignments auf 3 Werte reduziert:
'Projektleiter' | 'Projektmitarbeiter' | 'Wissenschaftlicher Mitarbeiter'.
Alle anderen Altwerte -> 'Projektmitarbeiter' per SQL-MIGRATION-role_in_project-v1.sql.

**Arbeitszeitgrenzen Phase 3 (TimesheetForm v7.4.6-11 bis v7.4.6-14):**
Details siehe §7e.

**Dashboard-Redesign Firma-Portal:**
- PortalNav v7.4.4-13: Neue Nav-Struktur (Details §9.1 + §12d).
- BerichtePage v7.4.6-7: "Meine Projekte" integriert (ersetzt separate Nav-Seite).
- BerichtePage v7.4.6-9: roleLoaded-Fix (MA-Redirect erst nach bestaetigter Rolle).
- v7-firma-page-redirect v7.3.43: Redirect auf /v7/firma/berichte.

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

### 3.13 Session 39 (7. Mai 2026) - ZAPanel Archiv-Tab + Cockpit-Konzept

**ZAPanel v7.4.4-34 bis v7.4.4-40 (Archiv-Tab komplett neu):**
- Zahlungseingang-Felder inline editierbar (Datum, Betrag, Kommentar)
- Foerderbetrag live berechnet + in DB gespeichert (foerderbetrag_gesamt)
- Einreichdatum editierbar im Deckblatt-Formular
- ZA loeschbar mit Bestaetigungsdialog

**DB-Migration DEV (4 neue Felder auf v7_zahlungsanforderungen):**
- zahlungseingang_datum, zahlungseingang_betrag, zahlungseingang_kommentar, foerderbetrag_gesamt

**Konzept Firma-Cockpit als MIS (KONZEPT-FIRMA-COCKPIT-v1_1.md):**
- Entscheidungen A-D getroffen (Cockpit ersetzt Detail-Seite, auch im Firmen-Portal,
  nur aktive Projekte, Zahlungseingang separater Betrag)

### 3.14 Session 40 (8. Mai 2026) - Cockpit Grundgeruest

**FirmaCockpit v7.4.9-1 bis v7.4.9-5:**
- 3-Spalten-Layout: Firmendaten+MA | Projekte+KPIs | ZA-Tabelle
- KPI-Fortschrittsbalken (Laufzeit, PM, Kosten) pro Projekt
- ZA-Tabelle gruppiert nach Projekt mit Summen-Karten
- Spaltenverhaeltnis 2|6|4

**PortalHeader v7.3.95-4:** Home-Button (Haeuschen) im Header
**ProjectDetailPage v7.4.4-57:** Einheitliches returnTo fuer Zurueck-Navigation
**Wrapper-Seiten:** Fortschritt + Stundennachweis eigenstaendig via Cockpit

### 3.15 Session 41 (8. Mai 2026) - Cockpit als Berater-Zentrale

**projektfortschritt-utils-v7_4_9-1.ts (NEUE Datei: src/lib/):**
- Berechnungslogik aus ProjektFortschrittPanel extrahiert
- calculateProjectAnalysis()  --  alle Kennzahlen, Monatsverlauf, Prognose, Szenarien
- Exportierte Interfaces + Formatierungsfunktionen
- Ziel: Berechnungen einmal pflegen, ueberall nutzen

**FirmaCockpit v7.4.9-6 bis v7.4.9-10:**
- v7.4.9-6: Dropdown-Projektauswahl statt Kartenliste, Monatsverlauf-Chart (recharts
  ComposedChart), Prognose-Box mit Ampel, alle 3 Spalten synchron per Projektauswahl,
  Timesheets mit work_date fuer Monatsverlauf
- v7.4.9-7: Firma-Dropdown im Berater-Portal (Firmenwechsel ohne Dashboard),
  "Neue Firma"-Button
- v7.4.9-8: Inline-Navigationsleiste (Zwischenversion, ersetzt durch v7.4.9-9)
- v7.4.9-9: PortalNav (Shared Component) am Cockpit-Kopf  --  konsistente Navigation
  auf allen Berater-Seiten
- v7.4.9-10: Action-Buttons in allen Bereichen (Firmendaten bearbeiten, Neuer MA,
  Neues Projekt, Neue ZA)  --  Navigation zu Verwaltungsseiten mit returnTo

**PortalHeader v7.3.95-5:** Home-Icon (Haeuschen) entfernt  --  redundant mit PortalNav

**PortalNav v7.4.4-15 bis v7.4.4-17:**
- v7.4.4-15: Cockpit-Sichtbarkeit via v7_system_config Toggles
- v7.4.4-17: Cockpit-Klick laedt erste Kundenfirma async beim Klick

**SystemConfigPanel v7.4.4-2:**
- Neue Sektion "Cockpit-Freischaltung" mit zwei Toggles
- cockpit_berater_enabled + cockpit_firma_enabled
- system_admin sieht Cockpit immer (unabhaengig von Config)

**ZAPanel v7.4.4-41:**
- FIX: Sichern im Archiv-Tab speichert foerderbetrag_gesamt mit
- Behebt: Cockpit zeigte 0 EUR weil foerderbetrag_gesamt NULL war

**DB:** v7_system_config + cockpit_berater_enabled/cockpit_firma_enabled.
foerderbetrag_gesamt nachtraeglich befuellt (SQL).

**PROD-Deploy:** Alle Aenderungen live. Cockpit nur fuer system_admin sichtbar.

**Offene Punkte (Session 42):**
- ZA-Bearbeitung: Klick auf ZA-Nummer oeffnet direkt die ZA
- Action-Buttons: Zielnavigation verfeinern
- ProjektFortschrittPanel auf projektfortschritt-utils refactoren

### 3.16 Session 42 (8. Mai 2026) - ZA-Workflow + Cockpit-Feinschliff

**ZAPanel v7.4.4-41 bis -52:**
- v7.4.4-47: "Aktualisieren" -> "ZA speichern", hasChanges-Dialog, Status-Workflow
- v7.4.4-50: ZA-Bearbeitung direkt aus Cockpit (Klick auf ZA-Nummer)
- v7.4.4-51: "Als eingereicht markieren" Button entfernt (Datum genuegt)
- v7.4.4-52: Deckblatt Grid 50/50 Layout (links ZA Nr/von/bis, rechts Datum+Button)

**ZASeite v1.0.0 bis v1.0.7:** Neue eigenstaendige Seite fuer ZA-Bearbeitung.
**useBerichteData v1.0.0:** Shared Hook fuer Berichte-Datenladung.
**PortalFooter v7.4.9-1:** Neuer Footer-Bereich.

### 3.17 Session 43 (11. Mai 2026) - Neue App-Struktur (parallel)

**Architektur-Entscheidung: Parallele App-Struktur**
Statt bestehende Navigation zu patchen: komplett neue Routen unter `/v7/berater/app/`.
Alte Struktur bleibt unangetastet. Umschaltung nur fuer system_admin.

**Neue Dateien:**
- **AppNav v1.0.0** (src/components/shared/AppNav.tsx):
  Saubere Navigation: Cockpit | Netzwerk | Kapazitaetsplanung | Forschungszulage | Admin
- **berater-app-cockpit-page v1.0.0** (src/app/v7/berater/app/cockpit/page.tsx):
  4 Kacheln, Kundenfirmen-Kachel mit Firma-Dropdown, Stats
- **berater-app-firma-page v1.0.0** (src/app/v7/berater/app/firma/[id]/page.tsx):
  Wrapper fuer FirmaCockpit in neuer Routenstruktur
- **berater-projekt-neu-page v1.0.0** (src/app/v7/berater/foerderung/firma/[id]/projekt/neu/page.tsx):
  Projekt-Anlage mit returnTo-Support

**Aktualisierte Komponenten:**
- **PortalHeader v7.3.95-11:** Ansicht-Wechsler im User-Dropdown (nur system_admin).
  Klassische Ansicht <-> Neue App-Struktur via localStorage pze_mode.
- **PortalNav v7.4.4-19:** Cockpit-Button -> App-Cockpit; Kundenfirmen im App-Modus ausgeblendet;
  "< Dashboard"-Links per pze_mode gesteuert.
- **FirmaCockpit v7.4.9-23:** select-Modus (firmaId='select' -> Firmenliste);
  Inline MA-Modal (modalOnly); MA-Bug behoben (alle MAs laden unabhaengig von Projektanzahl);
  firmaIdLocal korrekt aus URL-Prop initialisiert.
- **EmployeeManagement v7.3.95-17:** modalOnly + onClose Props fuer Inline-Verwendung im Cockpit.
- **berater-firma-detail-page v7.4.4-6:** returnTo respektieren, "Zurueck zum Cockpit" Label,
  openNew + firmaName an EmployeeManagement.
- **ProjectList v7.3.88-7:** returnTo Prop an /projekt/neu weitergeben.
- **foerderung-page v7.4.1-7:** Suspense-Wrapper + ?openNew=true Modal-Auto-Open.
- **berater-multiprojekt-page v7.4.8-12:** Dashboard-Link im App-Modus ausgeblendet.
- **berater-netzwerk-page v7.4.5-3:** Dashboard-Link im App-Modus ausgeblendet.

**Neue Route-Basis:**
```
/v7/berater/app/cockpit          -> Berater-App-Cockpit (4 Kacheln)
/v7/berater/app/firma/[id]       -> Firmen-Cockpit
/v7/berater/app/firma/[id]/...   -> Sub-Pages (in Arbeit)
```

**Offene Punkte (Session 44):**
- Firmen-Cockpit Sub-Pages in App-Struktur: Projekte, ZA, Firmendaten (12-19 aus Navigationsliste)
- returnTo-URLs komplett auf /v7/berater/app/ umstellen
- Login-Redirect: system_admin + pze_mode='app' -> direkt zu /v7/berater/app/cockpit
- FZul-Seite: PortalHeader + PortalNav einbauen (wenn Modul ausgebaut wird)

### 3.18 Session 44 (12. Mai 2026) - Nav-Konsistenz + Projektbereinigung

**Navigation komplett ueberarbeitet:**
- **AppNav v1.0.1:** Home-Button nur Icon (Haeuschen 20px), kein Label "Cockpit"
- **PortalNav v7.4.4-22:** Home im App-Modus -> /v7/berater/app/cockpit (Startseite).
  Kundenfirmen -> Firmenliste (Buchstaben-Kacheln). Forschungszulage als Nav-Item ergaenzt.
  Aktive Items hervorgehoben statt versteckt. Konsistente Nav auf jeder Seite:
  Home | Kundenfirmen | Netzwerk | Kapazitaetsplanung | Forschungszulage | Administration
- **berater-multiprojekt-page v7.4.8-12:** Dashboard-Link im App-Modus ausgeblendet
- **ZASeite v1.0.8:** "Zurueck zum Cockpit" -> "Zurueck"
- **berater-firma-detail-page v7.4.4-7:** "Zurueck zum Cockpit" -> "Zurueck"
- **berater-cockpit-page v7.4.9-3:** userRole korrekt aus Profil, select-Modus abgefangen,
  keine doppelte PortalNav (FirmaCockpit bringt eigene mit)

**Projektverzeichnis bereinigt:**
- downloads/: 57 alte Versionen in archiv/ mit Unterordnern (komponenten, git-sicherung, pflichtenheft, konzepte, anleitungen, sonstige)
- Claude-Projektverzeichnis: 81 alte Versionen entfernt
- PZE-Root: alte PFLICHTENHEFT + GIT-SICHERUNG per git rm

**Neue Konvention:** Waehrend der Session nur Downloads, am Ende Upload-Checkliste fuer Claude-PV.

### 3.19 Session 46 (29. Mai 2026) - Feiertags-Fix + Supabase Max-Rows-Fix

**CRITICAL FIX: Feiertage als Fehlzeiten (TimesheetForm v7.4.6-19):**
Seit Session 38 (Fehlzeiten editierbar, v7.4.6-16) wurden gesetzliche Feiertage
nicht mehr automatisch in der S-Zeile (Sonstige bezahlte Ausfallzeiten) vorbelegt.
Betroffen: April 2026 (Karfreitag, Ostermontag), Mai 2026 (Tag der Arbeit, Christi
Himmelfahrt, Pfingstmontag) und alle folgenden Monate.
- Auto-Fill in loadTimeEntries: Werktags-Feiertage ohne bestehenden S-Eintrag
  werden mit Tagesstunden (standard_weekly_hours / 5) vorbelegt
- company-Felder (federal_state, holiday_region, standard_weekly_hours) in
  useEffect-Dependencies ergaenzt (Timing-Fix)
- Bereits manuell erfasste S-Werte werden NICHT ueberschrieben

**CRITICAL FIX: Supabase 1000-Zeilen-Limit:**
Supabase Default Max Rows = 1000. Bei AS System HEATS (4 MA x 13 Monate >1000 Eintraege)
wurden Timesheet-Daten stillschweigend abgeschnitten. Monatsverlauf-Chart zeigte
Mai 2026 nur 94h statt ~500h. Zeiterfassungs-Status-Tabelle zeigte zu wenig "Erfasst".
- Supabase Dashboard: Max Rows auf 10000 erhoeht (PROD + DEV)
- Code: .limit(10000) in allen 9 betroffenen v7_timesheets-Queries als Absicherung
- Betroffene Dateien: BerichtePage, FirmaCockpit, WorkPackageTable, useBerichteData,
  timesheet-viewer, mein-status-page, berater-multiprojekt-detail (2x), berater-multiprojekt-page

**Neue Prozess-Regeln (Abschnitt 12b, Regel 11-13):**
- Supabase Max Rows bei Projektsetup sofort auf 10000 setzen
- Vor Code-Aenderung: aktuellste Version aus Projektverzeichnis pruefen
- Smoke-Test-Checkliste nach jedem Deploy

**Offene Punkte Session 46:**
- Diagnose-Logging in BerichtePage entfernen (DIAGNOSE console.log)
- AP-Druck-Bug: AP-Nummer erscheint doppelt, AP-Name abgeschnitten im PDF/Druck

---

## 4. Komponenten-Uebersicht

### 4.1 Shared Components (src/components/shared/)

| Datei | Version | Funktion |
|-------|---------|----------|
| ArbeitsplanImport.tsx | 7.3.87 | Excel Download/Upload |
| ConsultantManagement.tsx | aktuell | Berater-Verwaltung |
| EmployeeManagement.tsx | **7.3.95-17** | MA + modalOnly + onClose fuer Inline-Cockpit |
| FirmendatenCard.tsx | 7.4.6-1 | Firmendaten + Feiertagsregion-Dropdown |
| NWMEigenanteilPanel.tsx | 7.4.5-11 | EA-Berechnung, Archiv, PDF |
| NWMEinstellungenPanel.tsx | 7.4.5-1 | NWM-Settings, Bankdaten, Rechnungskonfig |
| NWMPartnerPanel.tsx | 7.4.5-4 | Netzwerkpartner, Smart-Quoten |
| PortalHeader.tsx | **7.3.95-11** | Ansicht-Wechsler (system_admin: Klassisch/App) |
| PortalNav.tsx | **7.4.4-23** | App-Modus: Home->Startseite, Unternehmen->Firmenliste, FZul, aktive Items hervorgehoben |
| AppNav.tsx | **1.0.1** | Neue Navigation fuer App-Struktur, Home nur Icon |
| ProjectTeamManager.tsx | **7.4.4-17** | Team-Verwaltung, ROLE_OPTIONS auf 3 ZA-Werte reduziert |
| SystemConfigPanel.tsx | **7.4.4-2** | Config-Toggles: manuals_enabled + cockpit_berater/firma_enabled |
| TimesheetForm.tsx | **7.4.6-19** | Phase 3 Arbeitszeitgrenzen + Feiertags-Auto-Fill in S-Zeile |
| BerichtePage.tsx | **7.4.6-16** | Dashboard + .limit(10000) + Diagnose-Logging |
| FirmaCockpit.tsx | **7.4.9-29** | Inline MA-Modal, select-Modus, .limit(10000) |
| ProjektFortschrittPanel.tsx | 7.4.5-22 | Zielerreichungs-Prognose, PDF-Export |
| StundennachweisMatrix.tsx | **7.4.6-2** | Quelle: projectAssignments (Projektteam) |
| WorkPackageTable.tsx | **7.4.3-12** | Arbeitsplan, PM 3 Dezimalstellen |
| ZAPanel.tsx | **7.4.4-52** | ZA speichern oben, Grid 50/50, kein "Als eingereicht" Button |
| ProjectDetailPage.tsx | **7.4.4-57** | Projekt-Detail + NWM; returnTo-Navigation |
| ProjectList.tsx | **7.3.88-7** | returnTo Prop fuer /projekt/neu |
| lib/holidays/germanHolidays.ts | 7.4.6-1 | Zentrale Feiertags-Utility |
| lib/projektfortschritt-utils.ts | **7.4.9-1** | Shared Berechnungslogik: Monatsverlauf, Prognose, Szenarien |

### 4.2 API-Routen

| Datei | Version | Funktion |
|-------|---------|----------|
| src/app/login/page.tsx | **7.3.90-2** | Login-Seite (PW-Toggle Augensymbol) |
| src/app/v7/firma/page.tsx | **7.3.43** | Redirect auf /v7/firma/berichte (Dashboard) |
| src/app/v7/firma/projekte/page.tsx | **7.3.90** | Redirect auf /v7/firma/berichte (Dashboard) |
| src/app/api/v7/create-user/route.ts | **7.4.1-1** | Auth + Profil + Employee server-seitig |
| src/app/api/v7/create-employee-login/route.ts | 7.3.95-1 | Login fuer vorhandenen MA |

### 4.3 Wrapper-Seiten

| Pfad | Version | Funktion |
|------|---------|----------|
| src/app/v7/berater/foerderung/page.tsx | **7.4.1-7** | Kundenfirmen + ?openNew Modal + Suspense |
| src/app/v7/berater/admin/page.tsx | **7.3.94-1** | Berater-Admin + SystemConfigPanel |
| src/app/v7/berater/app/cockpit/page.tsx | **1.0.0** | NEU: Berater-App-Cockpit (4 Kacheln + Firma-Dropdown) |
| src/app/v7/berater/app/firma/[id]/page.tsx | **1.0.0** | NEU: Firmen-Cockpit Route (App-Struktur) |
| src/app/v7/berater/foerderung/firma/[id]/page.tsx | **7.4.4-6** | Firma-Detail: returnTo, openNew, firmaName |
| src/app/v7/berater/foerderung/firma/[id]/projekt/neu/page.tsx | **1.0.0** | NEU: Projekt-Anlage mit returnTo |
| src/app/v7/berater/multiprojekt/page.tsx | **7.4.8-13** | KPT: Dashboard-Link App-Modus, .limit(10000) |
| src/app/v7/berater/netzwerk/page.tsx | **7.4.5-3** | NWM: Dashboard-Link App-Modus ausgeblendet |
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
| 5.45 | Matrix zeigte nur MA mit AP-Eintrag (Nachfolge-MA unsichtbar) | Behoben | v7.4.6-2 |
| 5.46 | ZA zeigte nur MA mit AP-Eintrag (Nachfolge-MA fehlt in ZA) | Behoben | v7.4.4-32 |
| 5.47 | Berater-Nav: "Zeiterfassungen" fuehrte zu 404 | Behoben | v7.4.4-12 |
| 5.48 | TimesheetForm Runtime-Crash (findTagVerletzung Temporal Dead Zone) | Behoben | v7.4.6-14 |
| 5.49 | MA landete nach Login auf Dashboard statt Mein Status | Behoben | v7.4.6-9 (roleLoaded-Fix) |
| 5.50 | Admin/PL landete nach roleLoaded-Fix auf Mein Status (zu fruehes Redirect) | Behoben | v7.4.6-9 |
| 5.51 | ProjectDetail Zurueck-Button zeigte "Projekte" statt "Dashboard" | Behoben | v7.4.4-55 |
| 5.52 | /v7/firma/projekte zeigte alte Projektliste statt Dashboard | Behoben | v7.3.90 (Redirect) |
| 5.53 | Dashboard-Seite trug Titel "Berichte & Controlling" statt "Dashboard" | Behoben | v7.4.6-10 |
| 5.54 | Feiertage nicht automatisch in S-Zeile (Fehlzeiten) vorbelegt seit v7.4.6-16 | Behoben | v7.4.6-19 |
| 5.55 | Supabase Max Rows Default (1000) kappt Timesheet-Queries bei >1000 Eintraegen | Behoben | Supabase-Config + .limit(10000) |
| 5.56 | AP-Druck/PDF: AP-Nummer erscheint doppelt, AP-Name abgeschnitten | Offen | - |

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

## 7e. Arbeitszeitgrenzen (Phase 1 + 2 + 3 - vollstaendig implementiert)

Konzept: KONZEPT-ARBEITSZEITGRENZEN-v1_3.md

### Grenzen und Durchsetzung

| Grenze | Formel | Durchsetzung | Visualisierung |
|--------|--------|--------------|----------------|
| Monatsgrenze | 173,33 h x (weekly_hours / 40) | HART: Speichern + Drucken + PDF + Monat-abschliessen gesperrt | Monatssummenzelle rot; Hinweistext oben |
| GF-50%-Regel | Monatsgrenze x 0,5 (nur GF/GGF) | WEICH: Hinweistext rot, Speichern moeglich; im Druck neutral | Monatssummenzelle rot (Bildschirm), gruen (Druck) |
| Tagesgrenze | 9 h/Tag (Projektstunden + Sonstige) | HART: wie Monatsgrenze | Tagessummenzelle rot; Hinweistext oben |

**Wichtig:** Fehlzeiten (U/K/S) zaehlen NICHT zur Tagesgrenze.

**Floating-Point-Schutz:** Alle Grenzenvergleiche gerundet auf 2 Dezimalstellen
(Math.round(x*100)), da z.B. 173.33 x 0.3 = 51.999... statt exakt 52.00.

**weekly_hours:** Wird aus v7_employee_hours_history geladen (Teilzeit-Historie,
gueltig zum Ersten des jeweiligen Monats). Fallback: v7_employees.weekly_hours.

**position_title:** Wird per DB-Abfrage geladen wenn MA wechselt.
GF-Erkennung: exakter Match auf 'Geschaeftsfuehrer' oder 'Gesellschafter-Geschaeftsfuehrer'.

**Hinweistexte:** Erscheinen nur bei Verletzung. Bei Normalfall keine Anzeige.
Bei GF-Verletzung: "GF-Anteil X h > 50% Monatsarbeitszeit (Y h) -- Foerderrisiko, Speichern moeglich"

Phase 1 (Session 24): Datenbasis (v7_employee_hours_history, POSITION_OPTIONS, GF_POSITIONS)
Phase 2 (Session 25): Teilzeit-Historie-UI in EmployeeManagement
Phase 3 (Session 36): Live-Validierung in TimesheetForm (v7.4.6-11 bis v7.4.6-14)

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
| /v7/firma | Redirect -> /v7/firma/berichte (v7.3.43) |
| /v7/firma/projekte | Redirect -> /v7/firma/berichte (v7.3.90, Session 37) |
| /v7/firma/berichte | **STARTSEITE** Dashboard: Kacheln + Meine Projekte (Admin/PL) |
| /v7/firma/mein-status | Ampel, Rueckfragen, Downloads rollenabhaengig (MA-Startseite) |
| /v7/firma/projekte/[id] | Projekt-Detail + NWM (direkt aus Dashboard erreichbar) |
| /v7/firma/projekte/neu | Neues Projekt anlegen (nur Admin) |
| /v7/firma/zeiterfassung | Zeiterfassung (TimesheetForm v7.4.6-14) |
| /v7/firma/mitarbeiter | EmployeeManagement v7.3.95-14 (Admin/PL) |
| /v7/firma/firmendaten | FirmendatenCard (Admin/PL) |

**Nav-Struktur Firma-Portal (ab v7.4.4-13):**
- Admin: Dashboard | Mein Status | Mitarbeiter | Firmendaten
- PL: Dashboard | Mein Status
- MA: Mein Status (einziger Nav-Punkt)

"Meine Projekte" und "Meine Zeiterfassung" sind als separate Nav-Punkte entfernt.
Projektverwaltung erfolgt ueber die integrierte Projektliste im Dashboard.

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

### 11.2 PROD-Kundenliste (Stand Session 43, 11.05.2026 - 10 Firmen)
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
2. **Stundennachweis-Wording projekttyp-spezifisch**
   Bei ZIM_NETZWERK-Projekten muss "Management-Arbeiten" statt "foerderbare Projektarbeiten" stehen.
3. **AP-Quick-View Popup in TimesheetForm**
   Icon/Button neben dem Projekt-Dropdown oeffnet Popup mit AP-Liste (Laufzeiten + geplante PM).
4. **ZAPanel Rollback "Bewilligt -> Eingereicht"**
5. **NWM-Prognose im KPT** (gestufte Foerderquoten je Netzwerkjahr)
6. **FZul-Modul** (Konzept offen)
7. **De-minimis-Beihilfen-Datenbank** (Konzept offen)

**Erledigt in Session 36 (aus alter Prio-Liste gestrichen):**
- ~~Arbeitszeitgrenzen Phase 3: Live-Validierung~~ -> v7.4.6-14, vollstaendig implementiert

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
11. **SUPABASE MAX ROWS:** Bei jedem neuen Supabase-Projekt sofort unter Settings > API >
    Max Rows auf 10000 setzen. Default (1000) reicht bei Projekten mit >50 MA-Monaten nicht.
    Zusaetzlich .limit(10000) in allen grossen Queries als Code-seitige Absicherung.
12. **CODE-BASIS-PRUEFUNG:** Vor jeder Aenderung die aktuellste Version aus dem
    Projektverzeichnis pruefen (ls /mnt/project/ oder git show). NICHT aus Kontext-Speicher
    oder aelteren Sessions arbeiten. Im Zweifel nachfragen.
13. **SMOKE-TEST-CHECKLISTE nach Deploy:**
    - Zeiterfassung: Stunden eingeben + speichern, Summen korrekt?
    - Berichte: Zeiterfassungs-Status "Erfasst" identisch mit Arbeitsplan "davon erfasst"?
    - Monatsverlauf-Chart: Ist-Balken plausibel (nicht nur Teilmenge)?
    - Feiertage: S-Zeile korrekt vorbelegt an Feiertagen?
    - Stundennachweis-Matrix: Ampeln korrekt?
    - Druck/PDF: Formatierung korrekt?

## 12c. KRITISCHE Arbeitsregel: main-Merge nach jedem Deploy

```bash
git checkout main && git pull && git merge v7-dev --no-ff --no-edit && git push origin main && git checkout v7-dev
```

---

## 13. Aenderungshistorie Pflichtenheft

| Version | Datum | Aenderungen |
|---------|-------|-------------|
| v4.94 | 29.05.2026 | Session 46: CRITICAL FIX Feiertage automatisch in S-Zeile vorbelegen (TimesheetForm v7.4.6-19). CRITICAL FIX Supabase Max Rows 1000->10000 (PROD+DEV) + .limit(10000) in 9 Queries (BerichtePage v7.4.6-16, FirmaCockpit v7.4.9-29, WorkPackageTable v7.4.3-12, useBerichteData v1.0.1, timesheet-viewer v7.4.0-9, mein-status v7.4.4-16, multiprojekt-detail v7.4.8-13, multiprojekt-page v7.4.8-13). Smoke-Test-Checkliste + Prozess-Regeln (12b). |
| v4.93 | 12.05.2026 | Session 44 final: MitarbeiterModal v1.0.1 (Neu/Bearbeiten/PW, Gehaltsdaten Anlage 6.1). FirmaCockpit v7.4.9-28 (App-Mode-aware, PortalNav Select, Unternehmen). PortalNav v7.4.4-23 (konsistent, FZul). "Kundenfirmen"->"Unternehmen". "Projektkoordinator". Login-Redirect. DB-Migration Gehaltsdaten. |
| v4.92 | 12.05.2026 | Session 44: Nav-Konsistenz. AppNav v1.0.1 (Home nur Icon). PortalNav v7.4.4-22 (Home->Startseite, Kundenfirmen->Firmenliste, FZul ergaenzt, aktive Items hervorgehoben). ZASeite v1.0.8, berater-firma-detail v7.4.4-7 (kein "Cockpit" mehr). berater-cockpit-page v7.4.9-3 (keine doppelte Nav). berater-multiprojekt-page v7.4.8-12 (Dashboard-Link App-Modus). Projektverzeichnis-Bereinigung. Upload-Checkliste-Konvention. |
| v4.91 | 11.05.2026 | Session 43: Neue parallele App-Struktur (/v7/berater/app/). Ansicht-Wechsler (PortalHeader v7.3.95-11, nur system_admin). AppNav v1.0.0, berater-app-cockpit-page v1.0.0 (4 Kacheln + Firma-Dropdown), berater-app-firma-page v1.0.0. FirmaCockpit v7.4.9-23 (Inline MA-Modal, select-Modus, MA-Bug). EmployeeManagement v7.3.95-17 (modalOnly+onClose). PortalNav v7.4.4-19 (App-Modus). ZAPanel v7.4.4-52 (ZA speichern oben, Grid 50/50). Dashboard-Links in KPT+Netzwerk App-Modus ausgeblendet. |
| v4.90 | 08.05.2026 | Session 42 komplett: ZASeite v1.0.7, ZAPanel v7.4.4-50, PortalFooter v7.4.9-1, ZA-Workflow. |
| v4.87 | 08.05.2026 | Session 41: Cockpit als Berater-Zentrale -- Monatsverlauf-Chart, Prognose-Box, Firma-Dropdown, PortalNav, Action-Buttons). PortalHeader v7.3.95-5 (Home-Icon entfernt). Session 40: Cockpit Grundgeruest v7.4.9-1 bis -5. Session 39: ZAPanel Archiv-Tab v7.4.4-34 bis -40, DB-Migration, Cockpit-Konzept v1.1. |
| v4.85 | 07.05.2026 | Session 39: ZAPanel v7.4.4-34 bis -40 (Archiv-Tab komplett neu: Zahlungseingang-Felder inline, Foerderbetrag live berechnet+gespeichert, Einreichdatum editierbar im Formular, ZA loeschbar). DB-Migration DEV: zahlungseingang_datum/betrag/kommentar, foerderbetrag_gesamt. Cockpit-Konzept v1.1 (Entscheidungen A-D). Vercel DEV/PROD Env verifiziert. PH v4.84 Korrektur SystemConfigPanel. |
| v4.84 | 07.05.2026 | Korrektur: SystemConfigPanel korrekte Version 7.4.4-1 (war faelschlich 7.4.4-2 dokumentiert). |
| v4.83 | 07.05.2026 | Session 38: Fehlzeiten editierbar (v7.4.6-16/17), Teilzeit Tage/Stunden (v7.3.95-15, v7.4.9-1), ZA-Sortierung (v7.4.4-33), PM-Summen-Fix (v7.4.3-12), DB-Bereinigungen, Cockpit-Konzept. |
| v4.82 | 07.05.2026 | Session 37: ProjectDetailPage v7.4.4-55 (Zurueck=Dashboard). /v7/firma/projekte -> Redirect v7.3.90. BerichtePage v7.4.6-10 (Titel Dashboard). §3.11, §4.1/4.2, §5.51-5.53, §9.1 aktualisiert. |
| v4.81 | 06.05.2026 | Session 36 komplett. Arbeitszeitgrenzen Phase 3 (TimesheetForm v7.4.6-11 bis -14): harte Grenzen Monat+Tag, GF weich, Zellfaerbung, Druck-Sperre. Dashboard-Redesign Firma-Portal (PortalNav v7.4.4-13, BerichtePage v7.4.6-9, Redirect v7.3.43): integrierte Projektliste, neue Nav-Reihenfolge, MA-Redirect-Fix. Matrix+ZA: projectAssignments als Quelle. ROLE_OPTIONS auf 3 Werte. §7e vollstaendig. §9.1 aktualisiert. §12.1 Phase 3 gestrichen. §5 Fehler 5.45-5.50. |
| v4.80 | 06.05.2026 | Login PW-Toggle (v7.3.90-2). ProjectTeamManager v7.4.4-17. Neu §16 + §17. §12b Regeln 9+10. |
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

**Ende des Pflichtenhefts v4.81**
**Letzte Aktualisierung: 6. Mai 2026**

---

## 12d. Dashboard-Redesign Firma-Portal (Session 36)

### Konzept

Das Firmen-Portal wurde von einem fragmentierten Multi-Seiten-Ansatz auf ein
zentrales Dashboard-Konzept umgestellt.

**Vorher:** Berichte | Meine Projekte | Mein Status | Meine Zeiterfassung | Mitarbeiter | Firmendaten

**Nachher:**
- Admin/PL: Dashboard (= Berichte + integrierte Projektliste) | Mein Status | Mitarbeiter | Firmendaten
- MA: Mein Status (einziger Einstiegspunkt)

### Integrierte Projektliste im Dashboard (BerichtePage v7.4.6-7+)

Die bisherige statische "Projekt-Uebersicht"-Tabelle wurde ersetzt durch eine
interaktive "Meine Projekte"-Sektion:
- Alle Projekte mit Laufzeit, Plan-PM, Ist-PM, Fortschrittsbalken
- Klick auf Zeile oder "Oeffnen"-Button -> direkt zu /v7/firma/projekte/[id]
- "+ Neues Projekt"-Button nur fuer client_admin sichtbar
- Separate "Projekte"-Seite weiterhin erreichbar via URL, aber kein Nav-Punkt mehr

### MA-Redirect-Logik (roleLoaded-Flag)

BerichtePage startet mit portalRole='employee' als Default. Ohne roleLoaded-Flag
wuerde ein sofortiger Redirect alle Nutzer (auch Admin) zu Mein Status schicken.
roleLoaded wird erst nach DB-Abfrage auf true gesetzt -> Redirect feuert nur bei
bestaetigter employee-Rolle.

### Startseiten-Routing

- /v7/firma -> redirect zu /v7/firma/berichte (v7.3.43)
- Admin/PL: landen auf Dashboard (/v7/firma/berichte)
- MA: werden von BerichtePage sofort zu /v7/firma/mein-status weitergeleitet

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
| TS-2 | v7-dev Preview-Build | Push auf v7-dev loest ungenutzten Preview-Build aus. Deaktivierung per Vercel-Dashboard geplant. | Niedrig | Offen (§14) |
| TS-3 | Stundennachweis-Wording | "foerderbare Projektarbeiten" steht immer, bei ZIM_NETZWERK muss "Management-Arbeiten" stehen. | Mittel | Prio 2 (§12.1) |
| TS-4 | ZAPanel Rollback | Nur "Bewilligt -> Entwurf". Korrekt: "Bewilligt -> Eingereicht". | Niedrig | Prio 4 (§12.1) |
| TS-5 | Berater-Firma-Detail Header-Farbe | Firmen-Detailseite im Berater-Portal zeigt falsche Header-Farbe (soll Blau). | Niedrig | Offen |
| TS-6 | Datenbank-Query-Muster | Redundante/ineffiziente Queries moeglich. Kein Befund, ungeprueft. | Mittel | Audit ausstehend |
| TS-7 | Session-uebergreifende Konsistenz | Claude hat nie vollstaendigen Code-Ueberblick. | Mittel | Permanentes Monitoring |

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
