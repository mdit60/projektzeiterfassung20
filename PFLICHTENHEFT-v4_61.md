# PFLICHTENHEFT - Projektzeiterfassung (PZE)

**Version:** 4.61
**SW-Release:** V7.4.5
**Datum:** 16. April 2026
**Projekt:** Projektzeiterfassung fuer FuE-Foerdervorhaben
**Status:** Session 17b: hourly_rate_approved in ZAPanel + ProjectTeamManager

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
| v7_projects | Projekte (funding_format, workplan_locked, NWM-Felder) |
| v7_work_packages | Arbeitspakete eines Projekts |
| v7_project_assignments | MA-Projekt-Zuordnung (hourly_rate, employee_number) |
| v7_work_package_assignments | MA-AP-Zuordnung (planned_person_months, is_active) |
| v7_timesheets | Zeiterfassungs-Eintraege (work_date, hours, day_type) |
| v7_zahlungsanforderungen | ZA pro Projekt (za_nummer, zeitraum, status) |
| v7_timesheet_completions | Monatsabschluss (employee_id, project_id, year, month) |
| v7_netzwerk_partner | NWM: Netzwerkpartner (Stammdaten, Quoten, USt-Satz) |
| v7_netzwerk_eigenanteile | NWM: EA-Berechnungs-Snapshots (Zahlungsstatus) |

### 2.2 Wichtige Architektur-Regeln

- `v7_work_package_assignments` ist Single Source of Truth fuer MA-Projekt-Beziehungen
- Stundensaetze gehoeren in `v7_project_assignments` (projektspezifisch)
- Profil-Lookup IMMER via `.eq('id', user.id)` (v7_user_profiles.id = auth.users.id)
- `portal_role` fuer Berechtigungen aus `v7_employees.portal_role` lesen
  (NICHT aus `v7_user_profiles.role` - der ist bei Firmen-Usern immer 'client_user')
- `funding_format` ist enum-Typ: bei LIKE-Vergleichen `::TEXT` Cast erforderlich
- Personenmonate: 173.33 h/PM (40h/Woche x 52/12)
- Tagesarbeitszeit: `company.standard_weekly_hours / 5` (38h -> 7,6h/Tag)
- Alle v7-Tabellen: DISABLE ROW LEVEL SECURITY

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
- `ZIM_NETZWERK` - Netzwerkmanagement (NWM-Modul aktiv)

ZAPanel-Filter: `ff.startsWith('ZIM')` deckt alle Varianten ab.
NWM-Erkennung: `ff === 'ZIM_NETZWERK'` (exakter Vergleich)

### 2.5 NWM-Felder in v7_projects (NEU v7.4.5)

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

### 2.6 Neue User anlegen - Checkliste

Bei jedem neuen Firmen-User pruefen:
1. auth.users Eintrag vorhanden? (Supabase Authentication)
2. v7_user_profiles Eintrag vorhanden? (role = 'client_user')
3. client_company_id in v7_user_profiles gesetzt?  <- haeufigste Fehlerquelle
4. display_name, first_name, last_name in v7_user_profiles gesetzt?
5. v7_employees Eintrag vorhanden? (portal_role gesetzt)
6. user_id in v7_employees auf auth.users.id gesetzt?

Fehlt Punkt 3 -> User landet nach Login auf leerem Bildschirm
Fehlt Punkt 4 -> Header zeigt nur Rolle, kein Name

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
- v7-module-config-6: NWM-Kachel aktiv

**Fixes:**
- TimesheetForm-13: Schutz abgeschlossener Monate (readonly fuer MA)
- EmployeeManagement-95-2: Passwort zuruecksetzen fuer MA mit Login
- mein-status-page-8: Completion-Flag als primaerer Monatsstatus
- v7_timesheet_completions Tabelle in Prod angelegt
- Lisa Kirchner v7_user_profiles repariert (display_name, client_company_id)

---

## 4. Komponenten-Uebersicht

### 4.1 Shared Components (src/components/shared/)

| Datei | Version | Funktion |
|-------|---------|----------|
| ArbeitsplanImport.tsx | 7.3.87 | Excel Download/Upload |
| EmployeeManagement.tsx | 7.3.95-2 | MA-Verwaltung, Login, PW-Reset |
| FirmendatenCard.tsx | 7.4.4-2 | Firmendaten inkl. Regelarbeitszeit |
| NWMEigenanteilPanel.tsx | 7.4.5-11 | EA-Berechnung, Archiv, PDF |
| NWMEinstellungenPanel.tsx | 7.4.5-1 | NWM-Settings, Bankdaten, Rechnungskonfig |
| NWMPartnerPanel.tsx | 7.4.5-4 | Netzwerkpartner, Smart-Quoten |
| PortalHeader.tsx | 7.3.95-4 | Header mit Rolle, PW-Aendern |
| PortalNav.tsx | 7.4.4-1 | Portal-Navigation |
| ProjectCreateForm.tsx | 7.3.57 | Projekt anlegen |
| ProjectDetailPage.tsx | 7.4.4-38 | Projekt-Detail + NWM-Tab-Switch |
| ProjectTeamManager.tsx | 7.4.4-5 | Team-Verwaltung |
| TimesheetForm.tsx | 7.4.3-13 | ZE + Monatsabschluss + Schutz |
| WorkPackageTable.tsx | 7.4.3-7 | Arbeitsplan |
| ZAPanel.tsx | 7.4.4-22 | ZA-Formular inkl. NWM-Kostentabelle |

### 4.2 Konfigurations-Dateien

| Datei | Version | Funktion |
|-------|---------|----------|
| v7-module-config.ts | 7.3.90-6 | Modul-Config, NWM aktiv |
| v7-types.ts | 7.4.0 | TypeScript-Typen |

### 4.3 Wichtige Props-Interfaces (NWM)

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
| 5.15 | Monate orange trotz Monatsabschluss | Behoben | v7.4.4-8 |
| 5.16 | v7_timesheet_completions fehlte in Prod | Behoben | Session 8 |
| 5.17 | Lisa Kirchner kein display_name | Behoben | Session 8 |
| 5.18 | NWM EA-Berechnung ZE-Query falsch | Behoben | v7.4.5-4 |
| 5.19 | v7_can_access_client fehlte client_admin | Behoben | Session 17 |
| 5.20 | ZAPanel: bewilligung_datum + bewilligte_summe nicht angezeigt | Behoben | v7.4.4-29 |
| 5.21 | TimesheetForm: Completion-Status blieb bei Monatswechsel | Behoben | v7.4.3-15/16 |
| 5.22 | TimesheetForm: Abschliessen speichert nicht automatisch | Behoben | v7.4.3-16 |
| 5.23 | BerichtePage + Matrix: MA-Reihenfolge nicht nach MA-Nr. | Behoben | v7.4.4-2 |
| 5.24 | ZAPanel + TeamManager: kalkulatorischer statt bewilligter Stundensatz | Behoben | v7.4.4-30/7 |

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
- Direktlink zum Gesamtprojekt

---

## 8. Monatsabschluss-Workflow

### 8.1 Ablauf

1. MA erfasst Stunden im TimesheetForm
2. MA klickt "Monat abschliessen"
3. System speichert in v7_timesheet_completions
4. Matrix-Ampel und Mein-Status zeigen Gruen
5. Bei nachtraeglicher Aenderung (Admin): Completion aufheben, Aenderung, neu abschliessen

### 8.2 Schutz abgeschlossener Monate (NEU v7.4.3-13)

| Rolle | Abgeschlossener Monat |
|-------|-----------------------|
| employee | Readonly, kein Speichern, kein Button |
| project_leader | Readonly, kein Speichern, kein Button |
| client_admin / consultant / system_admin | Amber-Banner, Abschluss aufheben moeglich |

### 8.3 Matrix-Ampel Logik

| Status | Bedingung |
|--------|-----------|
| Gruen | Completion-Flag gesetzt (primaer) ODER alle Arbeitstage erfasst |
| Orange | Eintraege vorhanden, kein Completion-Flag |
| Rot | Keine Eintraege im Monat |
| Grau | Zukunft |

---

## 9. Seiten-Uebersicht

### 9.1 Firmen-Portal (/v7/firma/...)

| Route | Komponente | Beschreibung |
|-------|-----------|--------------|
| /v7/firma/dashboard | firma-dashboard | Modul-Kacheln |
| /v7/firma/mein-status | mein-status-page-8 | Ampel, Completion-Flag primaer |
| /v7/firma/projekte | page-firma-projekte | Projektliste |
| /v7/firma/projekte/[id] | ProjectDetailPage-38 | Projekt-Detail + NWM |
| /v7/firma/zeiterfassung | zeiterfassung-page | Zeiterfassung |
| /v7/firma/berichte | berichte-page | Berichte + ZA-Kachel + Matrix |
| /v7/firma/mitarbeiter | EmployeeManagement-95-2 | MA + PW-Reset |

### 9.2 Berater-Portal (/v7/berater/...)

| Route | Komponente | Beschreibung |
|-------|-----------|--------------|
| /v7/berater/dashboard | berater-dashboard-6 | 4 Kacheln: Kunden/NWM/Multi/FZul |
| /v7/berater/netzwerk | berater-netzwerk-page-1 | NWM-Uebersicht alle Netzwerke |
| /v7/berater/foerderung | foerderung-page-v7_4_1-3 | Kundenfirmen-Liste |
| /v7/berater/foerderung/firma/[id] | berater-firma-detail-v7_4_4-4 | Firma-Detail |
| /v7/berater/foerderung/firma/[id]/projekt/[pid] | ProjectDetailPage-v7_4_4-40 | Projekt + NWM |
| /v7/berater/foerderung/firma/[id]/zeiterfassung | berater-ze-seite-v7_4_0-4 | ZE der Firma |
| /v7/berater/foerderung/firma/[id]/berichte | berater-berichte-wrapper-24 | Berichte der Firma |
| /v7/berater/timesheets | timesheet-viewer | ZE-Matrix uebergreifend |
| /v7/berater/admin | ConsultantManagement | Berater-Verwaltung |

### 9.3 Navigations-Hierarchie Berater-Portal

```
Dashboard
  ├── [Header-Klick] -> immer zurueck zum Dashboard (alle Seiten)
  ├── Kundenfirmen-Liste  [← Dashboard]
  │     └── Firma-Detail  [← Kundenfirmen]
  │           ├── Projekt-Detail  [← Firma]
  │           ├── Zeiterfassung  [← Firma]
  │           └── Berichte  [← Zurueck zur Firma]
  └── Netzwerkmanagement  [← Dashboard]
        └── Netzwerk-Projekt-Detail  [← Firma]
```

Zurueck-Button Regel: Jede tiefe Seite hat einen expliziten Zurueck-Button
zur naechsten Hierarchieebene. Header-Klick fuehrt immer zum Dashboard.

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
git add -A
git commit -m "v7.4.5-X: Beschreibung"
git push origin v7-dev
git checkout main
git merge v7-dev --no-ff --no-edit
git push origin main
git checkout v7-dev
```

### 10.3 Versionierungskonvention

KRITISCHE REGEL: Jede Aenderung = neues Inkrement N. NIEMALS gleiche Datei ueberschreiben.
KRITISCHE REGEL: VOR jeder Dateiausgabe im Projektverzeichnis nach letzter Version suchen!
Dateiname: `KomponentenName-vX_Y_Z-N.tsx`
Ablage: `~/Documents/Dev/PZE/downloads/`

### 10.4 Git-Merge Regel

IMMER: `git merge v7-dev --no-ff --no-edit` (funktioniert bei fast-forward UND divergierten Branches)

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

## 12. Geplante naechste Schritte

### 12.1 Kurzfristig (naechste Session)

#### RLS-THEMA: Sauber erledigen (PRIO 1 - eigene Session)

**Aktueller Stand PROD (PZE-production):**
- v7_user_profiles: RLS DEAKTIVIERT (bewusst - war selbst-blockierend)
- v7_timesheets: RLS DEAKTIVIERT (Rollback nach fehlgeschlagenem Versuch)
- Alle anderen v7-Tabellen: RLS aktiv + Policies vorhanden
- System laeuft stabil

**Was schiefgelaufen ist (Lernlektion):**
- v7_user_profiles Policy hat sich selbst blockiert:
  v7_can_access_client() liest aus v7_user_profiles,
  aber RLS auf v7_user_profiles blockiert genau diesen Lesezugriff.
- Enum v7_user_role in PROD fehlt 'client_admin' (nur in DEV vorhanden)
- Kein funktionierender lokaler DEV-Test moeglich (V6/V7 Mischung lokal)

**Richtiger Ansatz fuer naechste Session:**

Schritt 1: Enum in PROD pruefen und ggf. 'client_admin' erganzen
  ALTER TYPE v7_user_role ADD VALUE IF NOT EXISTS 'client_admin';

Schritt 2: v7_user_profiles Policy OHNE Zirkelschluss erstellen
  Die Policy darf NICHT v7_can_access_client() verwenden (wuerde
  v7_user_profiles selbst abfragen -> Deadlock).
  Stattdessen direkt auth.uid() verwenden:
  CREATE POLICY v7_user_profiles_select ON public.v7_user_profiles
    FOR SELECT USING (
      id = auth.uid()
      OR (SELECT role FROM v7_user_profiles WHERE id = auth.uid()) = 'system_admin'
    );
  ACHTUNG: Auch dieser Ansatz ist rekursiv! Korrekte Loesung:
  SECURITY DEFINER Funktion die auth.uid() direkt prueft OHNE RLS.

Schritt 3: Hilfsfunktionen als SECURITY DEFINER mit SET search_path
  sicherstellen dass sie RLS umgehen koennen (bereits so in Migration).

Schritt 4: Reihenfolge beim Aktivieren:
  1. Zuerst v7_user_profiles Policy korrekt erstellen
  2. Dann RLS auf v7_user_profiles aktivieren
  3. Sofort testen ob Login noch funktioniert
  4. Erst dann andere Tabellen

Schritt 5: Test-Checkliste nach jeder Aktivierung:
  - Login als Martin (Berater) -> Kundenfirmen sichtbar?
  - Login als Robin Freund -> Eigene Projekte/ZE sichtbar?
  - Login als Lisa Kirchner -> Eigene ZE sichtbar?

#### Weitere Kurzfristige Punkte

- DEV: Altlasten loeschen (fzul_employee_settings, fzul_vorhaben_settings,
  import_employees, imported_timesheets)
- Enum v7_user_role in PROD um 'client_admin' ergaenzen
- NWM: Erste echte ZA-Periode berechnen und einreichen (YachtConnect)
- NWM: USt-Behandlung Option B mit Katrin bestaetigen
- Berater-Portal User Manual (PDF)
- SWC-Bug ProjectDetailPage analysieren (verhindert Navigation-Fix NWM)
- create-employee-login API-Route: Fehlerbehandlung verbessern (duplicate key)


### 12.2 Mittelfristig

- ZIM PDF Import im Firmen-Portal aktivieren
- Firma-Detailseite Berater-Portal: Header gruen statt blau (Bug 5.9)
- Stundensatz-Diskrepanz pruefen: Annika Arndt (20.19 vs. 20.35 EUR/h)

### 12.3 Langfristig

- Multiprojekt-Tool: Konzept + Implementierung
- Forschungszulage-Kachel: Konzept + Implementierung
- FZul-Integration: Migration der V6-Funktionen
- Modul-basierte Lizenzierung

#### KONZEPT-MERKER: Selbstregistrierung / SaaS-Direktvertrieb

Langfristiges Ziel: Unternehmen sollen sich selbst registrieren und das Portal
gegen Zahlung nutzen koennen (ohne Berater als Vermittler).

Technische Grundlagen sind bereits in der Codebasis vorhanden (foerderung/page.tsx,
Git-History ab v7.4.1-1):
- Felder in v7_client_companies: invitation_token, invited_at, registered_at, status
- Felder in v7_user_profiles: invited_by, invited_at
- Konzept-Grundstruktur: Status invited -> registered -> active
- API-Route /api/v7/create-user (Server-seitige User-Erstellung mit Service Role Key)

Erforderliches "Rahmenprogramm" fuer produktive Selbstregistrierung:
- Bezahlsystem (Stripe o.ae.): Abo-Modell, monatlich/jaehrlich
- Registrierungsseite (/register?invite=TOKEN oder direkt /register)
- E-Mail-Verifizierung (Supabase Auth Magic Link oder SMTP)
- Onboarding-Flow: Firma anlegen -> erster Admin -> erstes Projekt
- DSGVO-Konformitaet: AGB, Datenschutzerklaerung, Einwilligungsmanagement
- Lizenzmanagement: welche Module fuer welches Abo?
- Kuendigungs- und Offboarding-Prozess (Datenloesch-Routine)
- Rechnungsstellung und Steuer (DE: USt-Ausweis, Kleinunternehmer etc.)
- Ggf. Berater-Affiliate-Modell: Berater wirbt Firma, bekommt Provision/Rabatt

Hinweis: Der bisherige Einladungslink-Button (v7.4.1-1) wurde in v7.4.1-2 aus der
UI entfernt, da er fuer den aktuellen manuellen Workflow keinen Nutzen hatte.
Der Code und die DB-Felder sind jedoch erhalten und bilden die Basis fuer
die spaeteren Selbstregistrierungs-Features.

---

## 12c. Korrekte Ablage-Pfade Berichte-Seiten

| Component | Pfad im Repo |
|-----------|-------------|
| StundennachweisMatrix | src/components/shared/StundennachweisMatrix.tsx |
| Firmen-Berichte | src/app/v7/firma/berichte/page.tsx |
| Berater-Berichte | src/app/v7/berater/foerderung/firma/[id]/berichte/page.tsx |
| ProjektFortschrittPanel | src/components/shared/ProjektFortschrittPanel.tsx |
| ZAPanel | src/components/shared/ZAPanel.tsx |

KRITISCH: Berater-Berichte liegt NICHT unter /v7/berater/berichte/ sondern
unter /v7/berater/foerderung/firma/[id]/berichte/page.tsx

---

## 13. Aenderungshistorie Pflichtenheft

| Version | Datum | Aenderungen |
|---------|-------|-------------|
| v4.61 | 16.04.2026 | Session 17b: hourly_rate_approved bevorzugt in ZAPanel-30 + ProjectTeamManager-7, Stundensatz-Logik dokumentiert |
| v4.60 | 16.04.2026 | Session 17: AS-System PROD-Migration, v7_can_access_client client_admin Fix, ZAPanel-29 bewilligung_datum+bewilligte_summe direkt aus DB, TimesheetForm-15/16 Completion-Reset+Auto-Speichern, BerichtePage-2+Matrix-2 MA-Sortierung nach MA-Nr., Versionierungsregel geschaerft |
| v4.59 | 15.04.2026 | Session 16: ZA-Rollback Bewilligt->Eingereicht, NWM EA USt-Anteil, Perioden-Dropdown entfernt, Stundennachweis Wording NWM |
| v4.58 | 15.04.2026 | Session 15: Navigation Berater-Portal, Zurueck-Buttons ergaenzt |
| v4.57 | 02.04.2026 | Session 13 Abschluss: GIT-Sicherung, Lernpunkt main-Merge-Pflicht dokumentiert |
| v4.56 | 02.04.2026 | Session 13: bewilligung_datum+bewilligte_summe in Projektdetails+ZA-Panel, Erfasste PM gruen, Berichte-Shared-Component als Tech-Debt dokumentiert |
| v4.55 | 02.04.2026 | Session 12: StundennachweisMatrix Shared Component, Projektname+FKZ+Format in allen Report-Panels einheitlich, Ablage-Pfade dokumentiert |
| v4.54 | 01.04.2026 | Session 11: RLS vollstaendig PROD, atomare Login-Route, Login-Bug Stoma behoben |
| v4.53 | 01.04.2026 | Session 11: Login-Bug behoben (client_company_id NULL + role falsch), Architekturprinzip atomarer Login-Prozess dokumentiert |
| v4.52 | 31.03.2026 | Session 10: RLS-Migration PROD teilweise, v7_user_profiles RLS deaktiviert (stabil), RLS-Aktionsplan dokumentiert |
| v4.51 | 28.03.2026 | Session 9 Teil 2: V6-Cleanup DEV, Supabase Security-Analyse, RLS-Aktionsplan |
| v4.50 | 28.03.2026 | Session 9: ProjektFortschritt-Bug gefixt, ComposedChart Soll/Ist, berater-berichte-page-19, Einladungslink entfernt, Konzept-Merker Selbstregistrierung |
| v4.49 | 26.03.2026 | Session 8: NWM-Modul komplett (Partner, Einstellungen, Eigenanteile), NWM-Uebersicht, Dashboard-Redesign, Monatsabschluss-Schutz, PW-Reset, mein-status Completion-Fix |
| v4.48 | 26.03.2026 | Session 8: TimesheetForm-12 PDF-Print-Fix, NWM-Konzept v1.2 |
| v4.47 | 22.03.2026 | Session 7: Monatsabschluss, Matrix-Ampel-Fix, ZIM_NETZWERK, Komma-Fix |
| v4.46 | 22.03.2026 | Session 6: ProjectDetailPage-31 Neuaufbau |
| v4.45 | 13.03.2026 | Session 5: FirmendatenCard, ProjectTeamManager-4 |
| v4.44 | 13.03.2026 | ZA Status-Workflow, ZA-Ampel, Archiv-Tab |
| v4.43 | 12.03.2026 | ZA-Kachel, ZIM-Hinweiskasten |
| v4.42 | 11.03.2026 | ZAPanel Redesign |
| v4.41 | 10.03.2026 | Berater-Navigation, ZA-Modul |
| v4.39 | 09.03.2026 | Stundennachweis-Matrix |
| v4.38 | 03.03.2026 | TimesheetForm, Ampel, FAQ PDF |
| Frueher | Okt 2024 - Feb 2026 | V6 + V7 Aufbau |

---

**Ende des Pflichtenhefts v4.61**
**Letzte Aktualisierung: 16. April 2026**

---

## 12d. Technische Schuld: Berichte-Seite als Shared Component (OFFEN)

### Problem
Die Berichte & Controlling-Seite existiert aktuell als zwei separate,
fast identische Dateien:
- src/app/v7/firma/berichte/page.tsx (Firmen-Portal, gruen)
- src/app/v7/berater/foerderung/firma/[id]/berichte/page.tsx (Berater-Portal, blau)

Das widerspricht dem zentralen Architektur-Prinzip: Gleiche Inhalte werden
als Shared Component implementiert, der portal-Parameter steuert nur
Farbe und Zugriffskontext. Doppelter Code = doppelter Wartungsaufwand.
Aenderungen MUESSEN bis zum Refactoring immer in BEIDEN Dateien gleichzeitig
durchgefuehrt werden.

### Geplante Loesung
Refactoring zu src/components/shared/BerichtePage.tsx analog zu
ProjectDetailPage, ZAPanel, StundennachweisMatrix:
- Firma:   <BerichtePage portal="firma" clientCompanyId={...} />
- Berater: <BerichtePage portal="berater" clientCompanyId={...} />
- Beide page.tsx werden zu duennen Wrappern (< 20 Zeilen)
- portal-Parameter steuert Farbe (blau/gruen) und Header-Kontext

### Prioritaet
Mittel. Betroffene Dateien aktuell:
- berichte-page-v7_4_4-26.tsx (Firma)
- berater-berichte-page-v7_4_4-23.tsx (Berater)

---

## 12e. KRITISCHE Arbeitsregel: main-Merge nach jedem Deploy (NEU)

Nach JEDEM `git push origin v7-dev` IMMER sofort auf main mergen:

```bash
git checkout main
git merge v7-dev --no-ff --no-edit
git push origin main
git checkout v7-dev
```

Begruendung: pze.itenion.com laeuft auf main. Aenderungen auf v7-dev
sind auf der Produktionsseite NICHT sichtbar bis main gemergt ist.
Preview-URLs (*.vercel.app) haben keine Produktionsdaten und sind
fuer Tests ungeeignet. Dieser Fehler hat in Session 13 viel Zeit gekostet.
