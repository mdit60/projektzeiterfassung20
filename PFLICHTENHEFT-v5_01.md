# PFLICHTENHEFT - Projektzeiterfassung (PZE)

**Version:** 5.01
**SW-Release:** V7.4.9
**Datum:** 05. Juni 2026
**Projekt:** Projektzeiterfassung fuer FuE-Foerdervorhaben
**Status:** Session 51: A-020 erledigt (Firmen-Deaktivierung im App-Paradigma, FirmaCockpit v7.4.9-31: Trash2 in Firmendaten-Karte, Bestaetigungsdialog, Soft-Delete is_active=false/status=inactive, Rueck-Navigation ins App-Cockpit). A-023 NEU+erledigt (Gegenstueck: Firmen-Reaktivierung im App-Cockpit, berater-app-cockpit-page v1.0.7: aufklappbarer "Inaktive Firmen"-Bereich + Wiederherstellen). A-024 NEU+erledigt (Schutz gegen E-Mail-Tippfehler bei MA-Neuanlage: zweites Bestaetigungsfeld in MitarbeiterModal v1.0.2 UND EmployeeManagement v7.3.95-18). PROD-Incident geloest: Kunde Luebeck Yacht (t.schulze-hagenest) kam nicht in seinen Zugang - Ursache: E-Mail beim Anlegen mit Doppel-N (hagennest) statt Ein-N getippt; Auth-Lookup fand den Account nicht (invalid_credentials). Korrektur via Auth-Admin-API (E-Mail im auth.users auf Ein-N gezogen, email_confirm) + v7_user_profiles/v7_employees nachgezogen; A-024 ist die praeventive Konsequenz. A-013 hochgestuft (kein 5-Min-Win, Legacy-Cluster). NACHTRAG 05.06.: A-025 NEU+erledigt (PortalNav v7.4.4-24 - "Unternehmen"-Tab im App-Modus ausgeblendet, fuehrte auf alte Firmenliste statt App-Cockpit; Zugang nur noch ueber Home-Icon). A-006 TEIL-erledigt (Header-Vereinheitlichung der fzul-Seite: berater-fzul-page v7.4.9-2, PortalHeader+PortalNav, Berater-Blau #002451, Umlaute intakt; FZul-Modul-Ausbau bleibt offen). DEPLOY-KORREKTUR: PROD haengt am Remote cubintec (kkcub/pze-cubintec), NICHT origin - Push beim PROD-Deploy IMMER auf BEIDE Remotes (origin + cubintec).

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

### 3.20 Session 46b (29. Mai 2026, Abend) - AP-Druck-Fix + DEV-Datensync

**FIX: AP-Name im Druck/PDF (TimesheetForm v7.4.6-20):**
- line-clamp-2 und maxWidth im Print aufgehoben (print-no-clamp, print-ap-name CSS)
- Select im Print als statischer Text statt display:none (appearance:none, kein Pfeil)
- AP-Name jetzt vollstaendig sichtbar im Druck

**Diagnose-Logging entfernt (BerichtePage v7.4.6-17):**
- Temporaere DIAGNOSE console.logs aus Session 46a entfernt
- .limit(10000) bleibt als Absicherung

**DEV-Datensynchronisation eingerichtet:**
- Script: scripts/sync-prod-to-dev-v2.mjs (Node.js, direkte PostgreSQL-Verbindung)
- Liest PROD per Supabase REST-API, schreibt DEV per direktem PostgreSQL
- FK-Checks waehrend Sync deaktiviert (session_replication_role = replica)
- DEV-Schema angepasst: v7_timesheet_completions angelegt, fehlende Spalten ergaenzt
- 3 Extra-Unique-Indexes in DEV entfernt (existierten nicht in PROD):
  v7_timesheets_unique_wp_entry, v7_timesheets_unique_absence_entry,
  v7_timesheets_unique_nonbillable_entry
- Nach Sync: v7_user_profiles + v7_consultant_access manuell wiederherstellen
  (werden nicht synchronisiert wegen Auth-Bindung)
- DEV und PROD jetzt 100% identische Daten (5129 Timesheets, 9 Projekte, 39 MA)

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
| PortalHeader.tsx | **7.3.95-13** | Cockpit-Sync, portal_role fuer Firmen-Portal |
| PortalNav.tsx | **7.4.4-23** | App-Modus: Home->Startseite, Unternehmen->Firmenliste, FZul, aktive Items hervorgehoben |
| AppNav.tsx | **1.0.1** | Neue Navigation fuer App-Struktur, Home nur Icon |
| ProjectTeamManager.tsx | **7.4.4-17** | Team-Verwaltung, ROLE_OPTIONS auf 3 ZA-Werte reduziert |
| SystemConfigPanel.tsx | **7.4.4-2** | Config-Toggles: manuals_enabled + cockpit_berater/firma_enabled |
| TimesheetForm.tsx | **7.4.6-22** | A-021: NWM-Tagessperren + Cross-Projekt 9h-Grenze, A-002/A-003 |
| BerichtePage.tsx | **7.4.6-17** | Dashboard + .limit(10000) |
| FirmaCockpit.tsx | **7.4.9-30** | Deep-Link ?editMA+?returnTo, Inline MA-Modal |
| ProjektFortschrittPanel.tsx | **7.4.5-23** | Zielerreichungs-Prognose, PDF-Export; Berechnung via projektfortschritt-utils (A-011, eine Rechenquelle) |
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
| src/app/login/page.tsx | **7.3.90-7** | Login-Redirect Cockpit-Modus aus DB-Config |
| src/app/v7/firma/page.tsx | **7.3.43** | Redirect auf /v7/firma/berichte (Dashboard) |
| src/app/v7/firma/projekte/page.tsx | **7.3.90** | Redirect auf /v7/firma/berichte (Dashboard) |
| src/app/api/v7/create-user/route.ts | **7.4.1-1** | Auth + Profil + Employee server-seitig |
| src/app/api/v7/create-employee-login/route.ts | 7.3.95-1 | Login fuer vorhandenen MA |

### 4.3 Wrapper-Seiten

| Pfad | Version | Funktion |
|------|---------|----------|
| src/app/v7/berater/foerderung/page.tsx | **7.4.1-10** | Kundenfirmen + ?openNew Modal + Suspense + modus-bewusster Zurueck-Button (A-015) |
| src/app/v7/berater/admin/page.tsx | **7.3.94-1** | Berater-Admin + SystemConfigPanel |
| src/app/v7/berater/app/cockpit/page.tsx | **1.0.6** | Berater-App-Cockpit (4 Kacheln + Firma-Dropdown); "Neues Unternehmen anlegen"-Button (A-014); voller Name in Begruessung+Header (A-016); inerter refreshed-Listener entfernt (A-018) |
| src/app/v7/berater/app/firma/[id]/page.tsx | **1.0.0** | NEU: Firmen-Cockpit Route (App-Struktur) |
| src/app/v7/berater/foerderung/firma/[id]/page.tsx | **7.4.4-6** | Firma-Detail: returnTo, openNew, firmaName |
| src/app/v7/berater/foerderung/firma/[id]/projekt/neu/page.tsx | **1.0.0** | NEU: Projekt-Anlage mit returnTo |
| src/app/v7/berater/multiprojekt/page.tsx | **7.4.8-17** | A-022: Echte Arbeitstage, MA-Deep-Link mit Ruecksprung |
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
| 5.56 | AP-Druck/PDF: AP-Name abgeschnitten (line-clamp + maxWidth im Print) | Behoben | v7.4.6-20 |

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

### 12.1 Anforderungsliste (verbindliche Offen-Liste)

**Dies ist die einzige verbindliche Quelle fuer offene Punkte (vgl. Paragraph 12b
Regel 14).** TODO-Listen beim Session-Start und Memory-Notizen sind nur abgeleitete
Sichten und werden gegen diese Tabelle abgeglichen, nicht umgekehrt.

**Format (nach Siemens-Mobile-Anforderungsmanagement):** Jede Zeile hat eine ID, die
Anforderung, wer sie angefragt hat, wann angefragt, den Status, das Datum der
Erledigung (Pflichtfeld bei Status erledigt) und die Referenz (Datei/Version/Paragraph).
Status-Werte: Offen / In Arbeit / Erledigt / Hinfaellig.

| ID | Anforderung | Angefragt von | Angefragt am | Status | Erledigt am | Referenz |
|----|-------------|---------------|--------------|--------|-------------|----------|
| A-001 | Berater-Portal Benutzerhandbuch | Martin | Session <=42 | In Arbeit | - | Inhalt vorhanden (PZE-Berater-Portal-Anleitung-v1_0). Offen: echtes docx/pdf-Format, Wording "Kundenfirmen"->"Unternehmen", Verlinkung im Portal. Re-verifiziert Session 47. |
| A-002 | Stundennachweis-Wording projekttyp-spezifisch: bei ZIM_NETZWERK "Management-Arbeiten" statt "foerderbare Projektarbeiten" | Martin | Session <=42 | Erledigt | 01.06.2026 | TimesheetForm v7.4.6-21: isNetzwerk-Zweig, Abschnitts-Ueberschrift typ-gesteuert. Offizielles ZIM-NWM-Template als Vorlage. |
| A-003 | AP-Quick-View Popup in TimesheetForm: Icon/Button neben Projekt-Dropdown oeffnet Popup mit AP-Liste (Laufzeiten + geplante PM), schliesst ohne State-Verlust | Martin | Session <=42 | Erledigt | 01.06.2026 | TimesheetForm v7.4.6-21: Info-Icon neben Projekt-Dropdown, eigener showAPModal-State, Tabelle mit AP-Code/Name/Laufzeit/PM + Gesamtsumme. Sichtbar fuer alle Nutzer. |
| A-004 | ZAPanel Status-Rollback "Bewilligt -> Eingereicht" | Martin | Session <=42 | Hinfaellig | 29.05.2026 | Durch Status-Automatik (calcStatus, ZAPanel v7.4.4-51/52) gegenstandslos: Status datengetrieben ueber Datumsfelder, keine manuellen Buttons mehr. Siehe TS-4. |
| A-005 | NWM gestaffelte Foerderquoten je Netzwerkjahr (foerdersatz_stufen Runtime + UI) | Martin | Session <=42 | Erledigt | 29.05.2026 | Runtime: NWMEigenanteilPanel v7.4.5-12 (getFoerdersatz/calcLaufzeitjahr). UI: NWMEinstellungenPanel v7.4.5-3 (editierbare Stufen-Tabelle + berechneStufen 70/50/30). Verifiziert Session 47. |
| A-006 | FZul-Modul ausbauen (PortalHeader + PortalNav, Multiprojekt-Zuordnung) | Martin | Session <=42 | Teil-erledigt | 05.06.2026 (Header) | TEIL-ERLEDIGT 05.06.2026 (Header): berater-fzul-page v7.4.9-2 (Versionsnummer bewusst auf v7.4.9-2 gezogen - ersetzt die in Session 49 verworfene, in downloads/ verbliebene v7.4.9-1, die ASCII-Regressionen + redundante companyName-Query enthielt) - handgebaute Kopfzeile (Ozeanblau #0369a1, "Zurueck", eigenes Logout, keine Navi-Zeile) ersetzt durch PortalHeader (hideNavigation) + PortalNav. Korrektes Berater-Blau #002451, Navi-Zeile vorhanden, Rueckkehr ins Cockpit ueber Home-Icon. companyName-Prop NICHT uebergeben (PortalHeader laedt eigene Firma selbst), Umlaute in sichtbaren Texten intakt, COLORS+handleLogout entfernt. VERBLEIBT OFFEN: FZul-Modul-Ausbau (Analyse/Multiprojekt-Zuordnung), "Analyse starten" -> 404 (Modul in Vorbereitung). // Konzept KONZEPT-MULTIPROJEKT-FZUL. URSPR. HINWEIS (Session 49): Header-Vereinheitlichung der fzul-Seite hier mit erledigen - aktuell noch handgebauter Header im falschen Blau #0369a1; umstellen auf PortalHeader + PortalNav mit korrektem Berater-Blau #002451 und Loader2. WICHTIG: companyName-Prop im Berater-Portal NICHT uebergeben (PortalHeader laedt die eigene Firma selbst), und UI-Text-Strings (Bundeslaender, Hinweise) mit echten Umlauten lassen - kein ae/oe/ue auf sichtbarem Text. Eine in Session 49 verworfene uncommittete fzul-Arbeitskopie hatte beide Fehler gemacht (Diff dokumentiert in Session-49-Verlauf). |
| A-007 | De-minimis-Beihilfen-Datenbank-Modul | Martin | Session <=42 | Offen | - | Konzept offen. |
| A-008 | ZA-Bearbeitung im Cockpit: Klick auf ZA-Nummer oeffnet ZA direkt | Martin | Session <=42 | Erledigt | Session <=46 | FirmaCockpit handleZAClick (deep-link mit zaId/projektId/returnTo). Verifiziert Session 47. |
| A-009 | Verhaltensvertrag kritischer Komponenten als Paragraph 12e | Martin | Session 46 | Erledigt | 29.05.2026 | PH Paragraph 12e (Session 47). VERHALTENSVERTRAG v1.1 angenommen. |
| A-010 | Prozess gegen Doku-Drift: eine Offen-Liste, Erledigt-Regel, Session-Start-Abgleich | Martin | Session 47 | Erledigt | 29.05.2026 | PH Paragraph 12b Regeln 14-16. Diese Tabelle ist das Ergebnis. |
| A-011 | ProjektFortschrittPanel Refactor zu projektfortschritt-utils | Martin | Session <=42 | Erledigt | 31.05.2026 | ProjektFortschrittPanel v7.4.5-23: Inline-useMemo durch calculateProjectAnalysis aus projektfortschritt-utils ersetzt (eine Rechenquelle, auch FirmaCockpit). Ergebnisse anweisungsweise als identisch verifiziert; PF-02/03/04 unveraendert. Commit 97bc3bd. |
| A-012 | Standalone StundennachweisSeite und ProjektfortschrittSeite (analog ZASeite) | Martin | Session <=42 | Offen | - | - |
| A-013 | Legacy-Cluster aufraeumen: v7/firmen/[id]/page.tsx (v7.0.3) + v7/page.tsx (v7.0.0) + v7/import/page.tsx + v7/import/"page 2.tsx" | Claude (Audit) | Session 47 | Offen | - | HOCHGESTUFT Session 51 (vorher als 5-Min-Win eingeschaetzt - FALSCH): firmen/[id] wird von v7/page.tsx referenziert; v7/page.tsx ist selbst tot (Wurzel-Landing leitet auf /v7/berater, nicht /v7), aber die AKTIVE Seite v7/berater/foerderung/import/page.tsx pusht noch 2x auf /v7. Ausserdem Duplikat "page 2.tsx" (Leerzeichen im Namen) im import-Verzeichnis. Nicht loeschbar ohne Navigationsentscheidung: wohin sollen die router.push('/v7') der aktiven Import-Seite zeigen (vermutlich /v7/berater/foerderung)? + welche der 3 Import-Dateien ist aktiv? Eigene fokussierte Aufraeum-Session mit pnpm-build-Gegencheck. Siehe TS-8. |
| A-014 | "Neues Unternehmen anlegen"-Button im App-Cockpit + Auto-Open Anlage-Modal auf Foerderseite | Martin | Session 48 | Erledigt | 31.05.2026 | Lag uncommittet seit Session 44 (Werkbank-Fund). cockpit/page.tsx v1.0.4 (Button -> /v7/berater/foerderung?openNew=true) + foerderung/page.tsx v7.4.1-9 (openNew-Modal + Redirect zum App-Cockpit nach Speichern). Kein pg-Import (App nutzt Supabase). Commit bd21e9d. |
| A-015 | Foerderseite: Zurueck-Button modus-bewusst (App-Modus -> App-Cockpit, Classic -> altes Dashboard) | Martin | Session 48 | Erledigt | 31.05.2026 | foerderung/page.tsx v7.4.1-10: liest pze_mode aus localStorage, Label vereinheitlicht zu "Zurueck". Commit a1e3118. |
| A-016 | App-Cockpit: Begruessung + Header zeigen vollen Namen (Vorname Nachname) statt nur Nachname | Martin | Session 48 | Erledigt | 31.05.2026 | berater-app-cockpit-page v1.0.5: Name aus first_name+last_name (v7_user_profiles), Fallback display_name->E-Mail. Wirkt in Begruessung UND PortalHeader. |
| A-017 | Werkbank-Bereinigung: lokale Arbeitskopie driftete seit Session 44 von deployed | Claude (Audit) | Session 48 | Erledigt | 01.06.2026 | Session 49: (a) verirrte src/app/v7/berater/foerderung/foerderung-page.tsx (Upload-Kopie, 13.05., nie geroutet) geloescht; (b) leere 0-Byte-Stray-Datei "Vercel" geloescht; (c) alte PZE-Upload-Checkliste-Session44 nach docs/archiv/ verschoben; (d) uncommittete fzul/page.tsx-Aenderung verworfen (git restore) - war kein Platzhalter, sondern halbfertiger Header-Umbau mit 7 UI-Text-ASCII-Regressionen + redundanter companyName-Query; Header-Vereinheitlichung an A-006 verwiesen; (e) Sync-Tooling konsolidiert: V2 (scripts/sync-prod-to-dev-v2.mjs, direkte pg-Verbindung, fragt Keys interaktiv ab - commit-sicher) behalten und committet, V1 + Wurzel-Duplikat geloescht, pg als Abhaengigkeit getrackt (Weg 2: Dev-Tooling versioniert). Commit 9bc238e. docs/Supabase MDBS.docx bleibt als lebende Notiz-Datei. |
| A-018 | refreshed-Lose-Ende im App-Cockpit | Claude (Audit) | Session 48 | Erledigt | 01.06.2026 | Session 49: inerter useEffect-Listener (setzte bei ?refreshed=true nur loading=true, ohne Reload und ohne loading je zurueckzusetzen -> latente Spinner-Falle; Foerderseite sendet den Parameter ohnehin nicht; Cockpit laedt beim Remount via router.push frisch) ersatzlos entfernt. useSearchParams + searchParams damit ungenutzt -> entfernt. Suspense-Huelle bewusst belassen (keine Strukturaenderung). berater-app-cockpit-page v1.0.6, Commit d1dcd1b. |
| A-019 | Namens-Vereinheitlichung: ProjektFortschrittPanel (deutsch, K) vs. Project*-Dateien (englisch, C). Umbenennung beruehrt alle Importe | Claude (Audit) | Session 48 | Offen | - | Niedrige Prio. Session 49 bewusst nicht ausgefuehrt: hohes Bruchrisiko (alle Importe) fuer rein kosmetischen Gewinn; wenn, dann als eigenes fokussiertes Inkrement mit pnpm-build-Gegencheck. |
| A-020 | Firmen-Deaktivierung fehlt im App-Paradigma. Muelleimer (is_active=false) existiert nur auf klassischer Foerderung-Seite. App-Pfad hat keine Firmen-Deaktivierung. | Martin | Session 49 | Erledigt | 03.06.2026 | FirmaCockpit v7.4.9-31: Trash2-Icon in Firmendaten-Karte neben dem Stift, NUR Berater-Portal (alle Berater). Bestaetigungsdialog (Wording analog klassisch). DB-Update wie klassische handleDelete: is_active=false, status=inactive, updated_at. Nach Erfolg Rueck-Navigation ins App-Cockpit (bzw. /v7/berater/foerderung im Classic-Mode). Soft-Delete, ueber A-023 wiederherstellbar. |
| A-021 | NWM-Tagessperren + Cross-Projekt-Validierung: Admin/PL kann bei ZIM_NETZWERK-Projekten Tage fuer MA sperren. Projektuebergreifende 9h-Tagesgrenze. | Martin | Session 50 | Erledigt | 01.06.2026 | TimesheetForm v7.4.6-22: NWM-Sperren aus v7_nwm_blocked_periods (neue Tabelle), rosa Zellen + Tooltip. Cross-Projekt: Stunden anderer Projekte geladen, calcCrossProjectTagSumme fuer 9h-Grenze. Sperren-Modal mit MA-Mehrfachauswahl, Validierung gegen bestehende Buchungen. SQL-MIGRATION-nwm-blocked-periods-v1.sql ausgefuehrt auf DEV+PROD. |
| A-022 | Kapazitaetsplanung: Monatskapazitaet auf echte Arbeitstage umstellen + MA-Deep-Link | Martin | Session 50 | Erledigt | 01.06.2026 | berater-multiprojekt-page v7.4.8-17: monatsKap-Formel ersetzt durch countWorkdaysInMonth()*WAZ/5. v7_employee_hours_history fuer unterjaerige WAZ-Aenderungen. MA-Name klickbar -> Deep-Link ?editMA+?returnTo -> FirmaCockpit v7.4.9-30 oeffnet MA-Modal direkt, Ruecksprung zur KP (useRef). |
| A-023 | Firmen-Reaktivierung im App-Cockpit (Gegenstueck zu A-020). Deaktivierte Firmen waren im App-Paradigma nirgends sichtbar/wiederherstellbar - nur ueber klassische Seite (im Cockpit nicht erreichbar). | Martin | Session 51 | Erledigt | 03.06.2026 | berater-app-cockpit-page v1.0.7: zweite Query auf status=inactive (load() unangetastet). Aufklappbarer Bereich "Inaktive Firmen (N)" unter "Neues Unternehmen anlegen", nur sichtbar wenn inaktive Firmen existieren. Pro Firma RotateCcw-Wiederherstellen-Button + Bestaetigungsdialog. DB-Update analog klassisch: is_active=true, status=active, updated_at. Nach Erfolg reiner Client-State-Update (Firma wandert zurueck in Dropdown, kein Reload). |
| A-024 | Schutz gegen E-Mail-Tippfehler bei MA-Neuanlage (Konsequenz aus PROD-Incident Luebeck Yacht). | Martin | Session 51 | Erledigt | 03.06.2026 | Zweites Bestaetigungsfeld "E-Mail bestaetigen" NUR im Anlage-Modus, in BEIDEN Anlage-Formularen: MitarbeiterModal v1.0.2 (App-Paradigma) und EmployeeManagement v7.3.95-18 (klassisch). Live-Abgleich kleingeschrieben+getrimmt, roter Hinweis + Anlegen-Button gesperrt bei Abweichung, harte Pruefung in handleSave. Paste im Bestaetigungsfeld gesperrt (onPaste preventDefault), damit ein vertippter Wert nicht in beide Felder kopiert werden kann. Login-Email wird beim Anlegen genau hier in v7_employees.email gesetzt; create-employee-login uebernimmt sie von dort (kein erneutes Tippen) - daher ist das Anlage-Formular die einzige noetige Schutzstelle. |
| A-025 | App-Modus-Navigation: "Unternehmen"-Tab fuehrte auf die alte Firmenliste statt ins App-Cockpit (Sackgasse ohne Rueckweg). | Martin | Session 51 | Erledigt | 05.06.2026 | PortalNav v7.4.4-24: "Unternehmen"-Tab im App-Modus (pze_mode='app') ausgeblendet (return null statt Button-Render auf die alte /foerderung/firma/select/cockpit-Route). Zugang zur Firmenauswahl nur noch ueber das Home-Icon -> /v7/berater/app/cockpit. App-Nav damit auf allen Seiten identisch zur Cockpit-Nav (AppNav). Classic-Modus unveraendert. |

**Hinweis zu "Angefragt am Session <=42":** Diese Punkte wurden aus aelteren Sessions
mitgeschleppt; das exakte Anfragedatum ist nicht mehr rekonstruierbar. Ab Session 47
wird das Anfragedatum bei Neuaufnahme stets eingetragen.

**Frueher erledigt (historisch):**
- Arbeitszeitgrenzen Phase 3 Live-Validierung -> v7.4.6-14 (Session 36).

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
13. **SMOKE-TEST nach Deploy:** Die verbindliche Smoke-Test-Checkliste je Komponente
    ist im Verhaltensvertrag (Paragraph 12e) geregelt. Eine Quelle der Wahrheit --
    keine parallele Liste an dieser Stelle.
14. **EINE OFFEN-LISTE (Single Source of Truth):** Offene Punkte werden ausschliesslich
    in der Anforderungsliste (Paragraph 12.1) gefuehrt. TODO-Listen beim Session-Start und
    Memory-Notizen sind nur abgeleitete Sichten. Bei Widerspruch gilt Paragraph 12.1.
    Keine parallelen Offen-Listen an anderer Stelle.
15. **ERLEDIGT-REGEL (Definition of Done):** Eine Anforderung gilt erst als fertig, wenn
    ihr Eintrag in Paragraph 12.1 im SELBEN PH-Inkrement geschlossen wird (Status + Erledigt-
    Datum + Referenz), in dem das Feature deployt wird. Kein Deploy ohne Listen-Schliessung.
    Damit kann ein erledigter Punkt nicht als "offen" ueberleben.
16. **SESSION-START-ABGLEICH:** Erste Handlung jeder Session: die mitgeschleppte TODO gegen
    den realen Code (aktuelle Datei-Version, nicht Kontext-Speicher) und gegen Paragraph 12.1
    abgleichen. Bereits erledigte Punkte sofort schliessen, Diskrepanzen dem Nutzer vorlegen.
    Im Zweifel die jeweils aktuelle Datei vom Nutzer anfordern, nicht raten (vgl. Regel 12).

## 12c. KRITISCHE Arbeitsregel: main-Merge nach jedem Deploy

```bash
git checkout main && git pull && git merge v7-dev --no-ff --no-edit && git push origin main && git checkout v7-dev
```

---

## 13. Aenderungshistorie Pflichtenheft

| Version | Datum | Aenderungen |
|---------|-------|-------------|
| v5.01 | 05.06.2026 | Session 51 (Nachtrag): App-Modus-Navigation + FZul-Header + Deploy-Korrektur. A-025 NEU+erledigt (PortalNav v7.4.4-24: "Unternehmen"-Tab im App-Modus ausgeblendet - fuehrte vom Cockpit ueber Netzwerk/Kapazitaetsplanung zurueck auf die alte Firmenliste statt ins App-Cockpit; Zugang zur Firmenauswahl jetzt nur ueber Home-Icon, App-Nav damit ueberall identisch zur Cockpit-Nav, Classic-Modus unveraendert). A-006 TEIL-erledigt (Header-Vereinheitlichung der fzul-Seite: berater-fzul-page v7.4.9-2, handgebaute Ozeanblau-Kopfzeile #0369a1 ersetzt durch PortalHeader hideNavigation + PortalNav, korrektes Berater-Blau #002451, companyName nicht uebergeben, Umlaute in sichtbaren Texten intakt, COLORS+handleLogout entfernt; Navi-Zeile nun vorhanden -> Rueckkehr ins Cockpit. FZul-Modul-Ausbau bleibt offen, "Analyse starten" -> 404). DEPLOY-KORREKTUR (Prozess, kein Code-Item): PROD haengt am Remote cubintec (kkcub/pze-cubintec), NICHT origin (mdit60/projektzeiterfassung20 = Dev-Repo) - ein Push nur auf origin/main deployt NICHTS auf pze.itenion.com. Heute aufgefallen: PortalNav-Fix lag auf origin/main, Production blieb leer; nach git push cubintec main (Fast-Forward 0e7b862..ac90647) lief der Deploy. Korrigiertes Ritual: PROD-Deploy IMMER mit git push origin main && git push cubintec main. KEINE DB-Migration. Komponentenversionen: PortalNav v7.4.4-24, berater-fzul-page v7.4.9-2 (Renumber: ersetzt eine in downloads/ verbliebene verworfene v7.4.9-1 aus Session 49 - daher Sprung von live-v7.3.1 direkt auf v7.4.9-2, eine ueber der hoechsten vorhandenen Nummer). |
| v5.00 | 03.06.2026 | Session 51: Firmen-Lebenszyklus im App-Paradigma vervollstaendigt + Tippfehler-Schutz. A-020 erledigt (Firmen-Deaktivierung, FirmaCockpit v7.4.9-31: Trash2 in Firmendaten-Karte, Bestaetigungsdialog, Soft-Delete is_active=false/status=inactive, Rueck-Navigation ins App-Cockpit). A-023 NEU+erledigt (Gegenstueck Firmen-Reaktivierung, berater-app-cockpit-page v1.0.7: zweite Query status=inactive, aufklappbarer "Inaktive Firmen"-Bereich nur bei Bedarf sichtbar, RotateCcw-Wiederherstellen + Dialog, DB-Update is_active=true/status=active, danach reiner Client-State-Update ohne Reload). A-024 NEU+erledigt (E-Mail-Bestaetigungsfeld bei MA-Neuanlage in BEIDEN Anlage-Formularen: MitarbeiterModal v1.0.2 + EmployeeManagement v7.3.95-18; Live-Abgleich, Anlegen gesperrt bei Abweichung, harte Pruefung, Paste gesperrt). KEINE DB-Migration (bestehende Spalten is_active/status, Rest Frontend). PROD-Incident geloest (kein Code-Item): Kunde Luebeck Yacht t.schulze-hagenest kam nicht in seinen Zugang. Diagnose Schritt fuer Schritt: Browser ausgeschlossen (Kunde scheiterte auch in Firefox), Network-Tab zeigte invalid_credentials gegen Live-Projekt cnnuyioklhlrfygwticf, auth.users-Query "no rows" -> Ursache E-Mail beim Anlegen mit Doppel-N (hagennest) statt Ein-N (hagenest) getippt, Auth-Lookup fand Account nicht. Passwort-Resets griffen daher nie. Korrektur: Auth-Admin-API PUT /admin/users/{id} mit email=Ein-N + email_confirm; v7_user_profiles + v7_employees per UPDATE nachgezogen (User-ID 0b0114ac...). Login danach OK. Interne Restkopie in auth.identities/user_metadata bewusst belassen (fuer Passwort-Login irrelevant, von erfolgreichem Login bewiesen; geschuetztes auth-Schema per SQL-Editor nicht schreibbar, Korrektur nur mit Risiko fuer Live-Account). A-013 HOCHGESTUFT von 5-Min-Win auf Legacy-Cluster (firmen/[id] + v7/page.tsx + 2x import-Seiten inkl. Duplikat "page 2.tsx"; aktive foerderung/import-Seite pusht noch auf /v7 - Navigationsentscheidung noetig). Komponentenversionen: FirmaCockpit v7.4.9-31, berater-app-cockpit-page v1.0.7, MitarbeiterModal v1.0.2, EmployeeManagement v7.3.95-18. |
| v4.99 | 01.06.2026 | Session 50: Feature-Session. A-002 erledigt (NWM-Wording "foerderbare Management-Arbeiten" bei ZIM_NETZWERK, offizielles Template). A-003 erledigt (AP-Quick-View Popup mit Tabelle, Info-Icon neben Projekt-Dropdown). Beide seit Session <=42 offen - endlich umgesetzt in TimesheetForm v7.4.6-21. A-021 NEU+erledigt (NWM-Tagessperren + Cross-Projekt 9h-Grenze): Admin kann bei NWM-Projekten Tage fuer MA sperren (neue DB-Tabelle v7_nwm_blocked_periods), gesperrte Zellen rosa/disabled mit Tooltip; projektuebergreifende Tagessumme in calcCrossProjectTagSumme, Fehlermeldung mit Cross-Projekt-Aufschluesselung. TimesheetForm v7.4.6-22. A-022 NEU+erledigt (Kapazitaetsplanung): Monatskapazitaet von pauschaler 173,33h auf echte Arbeitstage x (WAZ/5) umgestellt - nutzt countWorkdaysInMonth mit Feiertagen + v7_employee_hours_history fuer unterjaerige WAZ-Aenderungen; MA-Name klickbar mit Deep-Link ?editMA+?returnTo (berater-multiprojekt-page v7.4.8-17, FirmaCockpit v7.4.9-30). Bug-Fixes: Cockpit-Freischaltung fuer Berater (PortalHeader v7.3.95-12/13 + Login v7.3.90-7 - Config-Query korrigiert, localStorage-Sync, portal_role aus v7_employees fuer Firmen-Portal), Header-Rollenanzeige client_user -> echte portal_role. A-020 als offen aufgenommen (Firmen-Deaktivierung im App-Paradigma). Komponentenversionen: TimesheetForm v7.4.6-22, PortalHeader v7.3.95-13, login-page v7.3.90-7, berater-multiprojekt-page v7.4.8-17, FirmaCockpit v7.4.9-30. |
| v4.98 | 01.06.2026 | Session 49: Werkbank-Aufraeumen (A-017 erledigt). Lokaler Drift seit Session 44 systematisch bereinigt - verirrte foerderung-page.tsx (nie geroutete Upload-Kopie) und leere 0-Byte-Datei "Vercel" geloescht, alte Upload-Checkliste nach docs/archiv/ verschoben. Uncommittete fzul/page.tsx verworfen (git restore): entpuppte sich nicht als Platzhalter, sondern als halbfertiger Header-Umbau mit 7 UI-Text-ASCII-Regressionen (Bundeslaender-Namen + Hinweistexte faelschlich ae/oe/ue) und einer redundanten companyName-DB-Query (PortalHeader laedt die Berater-Firma selbst und ignoriert die Prop) - Header-Vereinheitlichung + korrektes Blau #002451 an A-006 verwiesen, kompletter Diff im Session-49-Verlauf dokumentiert. Sync-Tooling konsolidiert (Weg 2: als Dev-Werkzeug versioniert): V2 (direkte pg-Verbindung fuer DEV, Keys interaktiv per readline - commit-sicher, kein Hardcoding) behalten + committet, V1 und Wurzel-Duplikat geloescht, pg in dependencies getrackt. Sicherheits-Check vor Commit: V2 enthaelt keine Klartext-Secrets (nur PROD-URL, Rest Variablen/Prompts). Commit 9bc238e. A-018 erledigt: inerter refreshed-Listener im App-Cockpit (latente Spinner-Falle, da setLoading(true) ohne Reload/Reset; Parameter wurde ohnehin nie gesendet) ersatzlos entfernt, useSearchParams/searchParams ungenutzt -> raus, Suspense belassen; berater-app-cockpit-page v1.0.6, Commit d1dcd1b. A-019 (Namens-Vereinheitlichung K/C) bewusst nicht ausgefuehrt - hohes Import-Bruchrisiko fuer kosmetischen Gewinn, bleibt offen. |
| v4.97 | 31.05.2026 | Session 48: A-011 erledigt - ProjektFortschrittPanel v7.4.5-23 rechnet jetzt ueber die gemeinsame projektfortschritt-utils (calculateProjectAnalysis) statt eigener Inline-useMemo-Logik; Ergebnisse anweisungsweise als identisch verifiziert, eine Rechenquelle mit FirmaCockpit (Commit 97bc3bd). Drei seit Session 44 uncommittet auf der Werkbank liegende Funde geprueft und ausgeliefert: A-014 "Neues Unternehmen anlegen"-Button im App-Cockpit (cockpit v1.0.4) + openNew-Auto-Modal auf Foerderseite (v7.4.1-9), Commit bd21e9d; A-015 modus-bewusster Zurueck-Button auf Foerderseite (v7.4.1-10, pze_mode aus localStorage), Commit a1e3118; A-016 voller Name (Vorname Nachname) in App-Cockpit-Begruessung + Header (cockpit v1.0.5, first_name+last_name). Deploys jeweils chirurgisch (nur betroffene Dateien gestaged), Rest der Werkbank (package.json/pg, fzul, sync-Skripte, docx) bewusst NICHT ausgeliefert. Neue offene Punkte A-017 (Werkbank-Bereinigung/Drift), A-018 (refreshed-Lose-Ende), A-019 (Namens-Vereinheitlichung K/C) aufgenommen. |
| v4.96 | 29.05.2026 | Session 47: Verhaltensvertrag kritischer Komponenten als Paragraph 12e aufgenommen (TimesheetForm TF-01..14, BerichtePage BP-01..08, FirmaCockpit FC-01..07, ProjektFortschrittPanel PF-01..07, ZAPanel ZA-01..11, Infrastruktur IF-01..07, Eskalationsregeln 12e.7). Versionsnummern bewusst nicht eingebacken (versionsunabhaengige Checklisten). Paragraph 12b Regel 13 (Smoke-Test) auf Verweis -> Paragraph 12e gekuerzt (eine Quelle der Wahrheit). VERHALTENSVERTRAG-Dokument auf v1.1 (angenommen). Audit Paragraph 12.1: Anforderungsliste auf Siemens-Stil-Tracking-Tabelle umgestellt (ID/Anforderung/angefragt von/angefragt am/Status/erledigt am/Referenz). Re-Verifikation am echten Code: A-004/TS-4 hinfaellig (Status-Automatik), A-005 erledigt (NWM-Stufen Runtime+UI), A-008 erledigt (ZA-Cockpit-Deeplink), TS-5 erledigt (FirmaCockpit blau); A-002/A-003 echt offen bestaetigt; A-013/TS-8 neu (verwaiste firmen/[id]-Page). Anti-Drift-Prozess als Paragraph 12b Regeln 14-16 (eine Offen-Liste, Erledigt-Regel, Session-Start-Abgleich). |
| v4.95 | 29.05.2026 | Session 46 komplett: Feiertags-Auto-Fill (TimesheetForm v7.4.6-19/20). Supabase Max Rows 10000 (PROD+DEV) + .limit(10000) in 9 Queries. AP-Druck-Fix (v7.4.6-20: line-clamp/maxWidth im Print aufgehoben). BerichtePage v7.4.6-17 (Diagnose entfernt). DEV-Datensync eingerichtet (sync-prod-to-dev-v2.mjs). DEV-Schema bereinigt (3 Extra-Unique-Indexes entfernt, timesheet_completions angelegt). Smoke-Test-Checkliste + Prozess-Regeln (12b Regel 11-13). |
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

## 12e. Verhaltensvertrag kritischer Komponenten (Session 47)

### Grundprinzip

Jede kritische Komponente hat einen Verhaltensvertrag: eine Liste von Funktionen,
die IMMER korrekt arbeiten muessen. Vor jeder Aenderung wird diese Liste durchgegangen.
Nach der Aenderung wird sie als Smoke-Test abgearbeitet. Dies ist die verbindliche
Smoke-Test-Quelle (vgl. Paragraph 12b Regel 13, der hierauf verweist).

**Versionshinweis:** Versionsnummern der Komponenten sind hier bewusst NICHT eingebacken.
Die Funktions-Checklisten sind versionsunabhaengig. Stand der Erstaufnahme: Session 46/47.
Die jeweils aktuelle Datei-Version ist immer dem Projektverzeichnis zu entnehmen
(Paragraph 12b Regel 8/12).

**Ablauf bei jeder Code-Aenderung:**

1. Martin beschreibt Anforderung/Problem.
2. Claude identifiziert betroffene Datei(en).
3. Claude prueft den Verhaltensvertrag der betroffenen Komponente(n).
4. Claude praesentiert Plan + explizite Liste: "Diese Verhaltensweisen bleiben intakt: [Liste]".
5. Martin gibt GO.
6. Claude implementiert chirurgisch (nur betroffene Zeilen).
7. Smoke-Test auf DEV (localhost:3000) gegen den Verhaltensvertrag.
8. Erst nach erfolgreichem DEV-Test: Deploy auf PROD.

### 12e.1 TimesheetForm

**Datei:** src/components/shared/TimesheetForm.tsx
**Genutzt in:** Berater-Portal + Firma-Portal (Zeiterfassung)

| Nr | Funktion | Pruefung |
|----|----------|----------|
| TF-01 | AP-Auswahl per Dropdown | Zugeordnete + Weitere AP sichtbar, sortiert nach ap_code |
| TF-02 | Stundeneingabe in Tageszellen | Wert eingeben, Tab/Enter/Pfeiltasten navigieren |
| TF-03 | Speichern + Laden | Speichern, Seite neu laden, Werte identisch |
| TF-04 | Feiertage in S-Zeile | Werktags-Feiertage automatisch mit Tagesstunden vorbelegt |
| TF-05 | Fehlzeiten U/K/S editierbar | Tageszellen frei editierbar, Summen korrekt |
| TF-06 | Wochenende/Feiertag Hintergrund | Sa/So grau, Feiertage orange |
| TF-07 | Summenberechnung | Zeilensumme (S), Tagessumme, Gesamtsumme korrekt |
| TF-08 | Monatsabschluss | Button setzt/entfernt Completion-Flag |
| TF-09 | Arbeitszeitgrenzen | Tagesgrenze 9h (hart), Monatsgrenze (weich), Zellfaerbung |
| TF-10 | Kumulierte Stunden (Arbeitsplan) | offen-Spalte zeigt verbleibende Stunden pro AP |
| TF-11 | Druck/PDF | AP-Name vollstaendig, AP-Nummer sichtbar, Layout A4 Querformat |
| TF-12 | Nicht-zuschussfaehige Arbeiten | Sonstige-Zeile editierbar, nicht in Summe (2) |
| TF-13 | Durchfuehrbarkeitsstudie (DS) | T/NT-Spalte bei ZIM_DS-Projekten |
| TF-14 | Mehrere AP-Zeilen | Dynamisches Hinzufuegen, max. 4 initial |

**Besonders fragile Bereiche:**
- loadTimeEntries-Funktion: Laedt AP-Eintraege, Fehlzeiten, Feiertage, sonstige Arbeiten.
  Aenderungen hier koennen TF-01 bis TF-06 gleichzeitig brechen.
- Print-Styles (@media print): Aenderungen an Screen-CSS koennen Print-Layout zerstoeren.
  IMMER Druckvorschau pruefen nach CSS-Aenderungen.
- useEffect-Dependencies: Fehlende Dependencies = veraltete Daten. Zu viele = Endlos-Loop.

### 12e.2 BerichtePage

**Datei:** src/components/shared/BerichtePage.tsx
**Genutzt in:** Berater-Portal + Firma-Portal (Dashboard/Berichte)

| Nr | Funktion | Pruefung |
|----|----------|----------|
| BP-01 | Zeiterfassungs-Status Tabelle | Erfasst(h) pro MA identisch mit Arbeitsplan "davon erfasst" |
| BP-02 | ProjektFortschrittPanel | Monatsverlauf-Chart: alle Monate vollstaendig, Ist-Balken plausibel |
| BP-03 | Stundennachweis-Matrix | Ampeln korrekt (gruen=vollstaendig, orange=teilweise, grau=leer) |
| BP-04 | Timesheet-Daten vollstaendig | Alle Eintraege geladen (.limit(10000), keine Abschneidung) |
| BP-05 | Projekt-Auswahl | Dropdown filtert korrekt auf ausgewaehltes Projekt |
| BP-06 | MA-Stundensaetze | Korrekte Berechnung aus Gehaltsdaten (Anlage 6.1) |
| BP-07 | Excel-Export | Vollstaendige Daten, korrekte Formatierung |
| BP-08 | Meine Projekte (Firma) | Klickbare Projektliste im Dashboard |

**Besonders fragile Bereiche:**
- Timesheet-Query: Muss .limit(10000) haben UND Supabase Max Rows >= 10000.
  BEIDE Bedingungen muessen erfuellt sein.
- timesheets State: Wird an ProjektFortschrittPanel, ZE-Status und Matrix weitergereicht.
  Aenderung an der Query betrifft ALLE drei Panels gleichzeitig.

### 12e.3 FirmaCockpit

**Datei:** src/components/shared/FirmaCockpit.tsx
**Genutzt in:** Berater-Portal (Firmenansicht im App-Modus)

| Nr | Funktion | Pruefung |
|----|----------|----------|
| FC-01 | Firmendaten-Anzeige | Name, Kontakt, Bundesland korrekt |
| FC-02 | Projektliste | Alle aktiven Projekte mit Laufzeit, PM%, Kosten% |
| FC-03 | Monatsverlauf-Chart | Identisch mit BerichtePage (gleiche Datenquelle) |
| FC-04 | Zahlungsanforderungen | ZA-Liste mit Betraegen, Einreichdatum |
| FC-05 | Mitarbeiter-Modal | Neuer MA, MA bearbeiten, PW-Reset |
| FC-06 | Navigation | PortalNav korrekt, returnTo funktioniert |
| FC-07 | Timesheet-Daten vollstaendig | .limit(10000), keine Abschneidung |

### 12e.4 ProjektFortschrittPanel

**Datei:** src/components/shared/ProjektFortschrittPanel.tsx
**Genutzt in:** BerichtePage + FirmaCockpit

| Nr | Funktion | Pruefung |
|----|----------|----------|
| PF-01 | Laufzeit/PM/Kosten KPIs | Prozent und Absolutwerte korrekt |
| PF-02 | Monatsverlauf-Chart | Ist vs. Soll pro Monat, kumulierte Linien |
| PF-03 | Prognose | Gestrichelte Linie basierend auf letzten 3 Monaten |
| PF-04 | Zielerreichungs-Prognose | Erreichbar/Gefaehrdet/Kritisch korrekt berechnet |
| PF-05 | PM je Mitarbeiter (Plan vs. Ist) | Balkendiagramm pro MA |
| PF-06 | Personalkosten je MA | Balkendiagramm basierend auf Stundensaetzen |
| PF-07 | Drucken/PDF | Chart + KPIs auf einer A4-Seite |

**Hinweis (Refactor projektfortschritt-utils, Session 47 Punkt 3):**
Beim Auslagern der Berechnungslogik nach projektfortschritt-utils muessen PF-02, PF-03
und PF-04 rechnerisch bit-genau identische Ergebnisse liefern wie vor dem Refactor.
Vergleichswerte vor dem Refactor festhalten und nach dem Refactor gegenpruefen.

### 12e.5 ZAPanel (Zahlungsanforderung)

**Datei:** src/components/shared/ZAPanel.tsx
**Genutzt in:** ZASeite (Berater + Firma), aufgerufen aus FirmaCockpit / Cockpit ZA-Liste

| Nr | Funktion | Pruefung |
|----|----------|----------|
| ZA-01 | Status-Automatik | Status wird per calcStatus aus Datumsfeldern abgeleitet: kein eingereicht_am=Entwurf; eingereicht_am ohne Zahlung=Eingereicht; Zahlung >= erwartet=volle_zahlung; sonst gekuerzte_zahlung. Keine manuellen Status-Buttons. |
| ZA-02 | Einreichdatum editierbar | eingereicht_am im Formular editierbar; Setzen schaltet Status auf Eingereicht |
| ZA-03 | Tabs | Deckblatt / Anlage 1a / Anlage 1b / Archiv jeweils korrekt befuellt |
| ZA-04 | Archiv-Tab Zahlungseingang | Datum, Betrag, Anmerkung speicherbar; Validierung: Datum erfordert Betrag > 0 |
| ZA-05 | Foerderbetrag-Persistenz | foerderbetrag_gesamt beim Sichern neu berechnet UND gespeichert (Cockpit liest gespeicherten Wert, sonst 0 EUR) |
| ZA-06 | Historische Werte | Archiv-Tab zeigt gespeicherten Foerderbetrag, keine Neuberechnung bestehender Eintraege |
| ZA-07 | ZA loeschen | Nur im Archiv-Tab, mit Bestaetigung |
| ZA-08 | Status-Rollback | "Zurueck zu Eingereicht" (primaer) und "Zurueck zu Entwurf" (sekundaer) verfuegbar |
| ZA-09 | Netzwerk-Modus | isNetzwerk bei ZIM_NETZWERK; NWM-Kostenfelder (Personal, Dritte, uebrige, gesamt); Laufzeitjahr aus bewilligung_datum |
| ZA-10 | DB-Felder ohne Props (Option B) | bewilligung_datum, bewilligte_summe direkt aus DB im Panel laden (ProjectDetailPage frozen, TS-1) |
| ZA-11 | Status-Badge-Farben | grau=Entwurf, blau=Eingereicht, gruen=Bewilligt/Zahlung |

**Besonders fragile Bereiche:**
- calcStatus(): Eine Aenderung kann ZA-01 und ZA-08 gleichzeitig brechen.
- foerderbetrag_gesamt-Persistenz: Wird beim Sichern nicht mitgespeichert -> Cockpit zeigt 0 EUR
  (war Bug, behoben in v7.4.4-41). Beim Archiv-Speichern immer neu berechnen + persistieren.
- Option-B-DB-Load: ProjectDetailPage darf NICHT geaendert werden (TS-1 frozen).
- Deep-Link aus dem Cockpit (Session 47 Punkt 2): Klick auf ZA-Nummer oeffnet ZA direkt.
  Der direkte Einsprung muss ZA-01 bis ZA-11 unveraendert erhalten.

### 12e.6 Infrastruktur-Checkliste

Zusaetzlich zu den Komponenten-Vertraegen:

| Nr | Pruefpunkt | Wann pruefen |
|----|------------|--------------|
| IF-01 | Supabase Max Rows >= 10000 | Bei jedem neuen Supabase-Projekt |
| IF-02 | DEV-Schema identisch mit PROD | Nach jeder DB-Migration |
| IF-03 | .limit(10000) in neuen Queries | Bei jeder neuen v7_timesheets-Query |
| IF-04 | UTF-8/ASCII sauber | Vor jeder Datei-Auslieferung |
| IF-05 | Aktuelle Datei-Version als Basis | Vor jeder Code-Aenderung (Projektverzeichnis pruefen) |
| IF-06 | DEV-Test vor PROD-Deploy | Nach jeder Code-Aenderung |
| IF-07 | Print-Vorschau nach CSS-Aenderung | Bei jeder Aenderung an Komponenten mit Print |

### 12e.7 Eskalationsregeln

- Wenn unklar ob eine Funktion betroffen ist: FRAGEN, nicht raten.
- Wenn eine Aenderung mehr als 20 Zeilen betrifft: Plan vorlegen, GO abwarten.
- Wenn eine Aenderung mehrere Komponenten betrifft: Alle betroffenen Vertraege pruefen.
- Wenn ein Smoke-Test fehlschlaegt: SOFORT stoppen, nicht "schnell noch fixen".
  Zurueck zur letzten funktionierenden Version, dann sauber neu ansetzen.

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
| TS-3 | Stundennachweis-Wording | "foerderbare Projektarbeiten" steht immer, bei ZIM_NETZWERK muss "Management-Arbeiten" stehen. | Mittel | Erledigt -> A-002 (Session 50) |
| TS-4 | ZAPanel Rollback | HINFAELLIG: Status-Automatik (calcStatus, v7.4.4-51/52) ersetzt manuelle Buttons. Rollback datengetrieben ueber Datumsfelder. | - | Hinfaellig (29.05.2026, A-004) |
| TS-5 | Berater-Firma-Detail Header-Farbe | ERLEDIGT: Aktive Firmenansicht ist FirmaCockpit (/v7/berater/app/firma/[id]) mit blauem Header (#002451). Am Bildschirm verifiziert. | - | Erledigt (29.05.2026) |
| TS-6 | Datenbank-Query-Muster | Redundante/ineffiziente Queries moeglich. Kein Befund, ungeprueft. | Mittel | Audit ausstehend |
| TS-7 | Session-uebergreifende Konsistenz | Claude hat nie vollstaendigen Code-Ueberblick. Gegenmassnahme: Paragraph 12b Regeln 14-16 (eine Offen-Liste, Erledigt-Regel, Session-Start-Abgleich). | Mittel | Laufendes Monitoring + Prozess (Session 47) |
| TS-8 | Verwaiste Seite v7/firmen/[id]/page.tsx | Alter Code v7.0.3, kein PortalHeader, Nicht-ASCII. Nicht mehr angesteuert (Firmenansicht = FirmaCockpit). Cleanup-Kandidat. | Niedrig | Offen -> A-013 (Session 47 entdeckt) |

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
