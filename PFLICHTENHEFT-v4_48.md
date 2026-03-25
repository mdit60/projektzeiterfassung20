# PFLICHTENHEFT - Projektzeiterfassung (PZE)

**Version:** 4.48
**SW-Release:** V7.4.4
**Datum:** 24. Maerz 2026
**Projekt:** Projektzeiterfassung fuer FuE-Foerdervorhaben
**Status:** V7.4.4-32 + V7.4.3-10 deployed auf v7-dev + main

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

### 2.6 ArbeitsplanImport - Verhalten bei wiederholtem Import

- Neue APs werden angelegt
- Bestehende APs werden aktualisiert (Matching ueber AP-Nummer)
- APs werden NICHT automatisch geloescht
- Nach jedem Import manuell pruefen ob Arbeitsplan mit Foerderantrag uebereinstimmt
- ArbeitsplanImport nur fuer client_admin sichtbar (seit v7.4.4-32)

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

- TimesheetForm: parseHours() in allen Berechnungsfunktionen
- Feiertags-Summe korrekt eingerechnet, Mariae Himmelfahrt
- normalizeStateCode(), companyDailyHours aus standard_weekly_hours
- NEU: Monat-abschliessen-Button

### 3.6 Session 8 (24. Maerz 2026) - v7.4.3-10 / v7.4.4-32

**TimesheetForm (v7.4.3-10):**
- FIX: Monatsabschluss-Reset nur bei tatsaechlichen Aenderungen (hasChanges)

**ProjectDetailPage (v7.4.4-32):**
- ArbeitsplanImport + Kein-Team-Hinweis nur fuer adminUser (client_admin)
- Projektleiter sehen Arbeitsplan nur lesend

**mein-status-page (v7.4.4-7):**
- Links auf neue Anleitungen PL + FA aktualisiert

**Dokumentation:**
- PZE-Anleitung-Projektleiter-v2.0: Vollstaendige Neuerstellung
- PZE-Anleitung-Firmen-Administrator-v2.0: Vollstaendige Neuerstellung
- Alte Kurzanleitungen ersetzt

---

## 4. Komponenten-Uebersicht

### 4.1 Shared Components (/components/shared/)

| Komponente | Version | Beschreibung |
|-----------|---------|--------------|
| ProjectDetailPage.tsx | 7.4.4-32 | Projekt-Detail (beide Portale) |
| ZAPanel.tsx | 7.4.4-21 | Zahlungsanforderungs-Panel |
| ProjectTeamManager.tsx | 7.4.4-5 | Team-Verwaltung |
| TimesheetForm.tsx | 7.4.3-10 | Zeiterfassungs-Formular |
| WorkPackageTable.tsx | 7.4.3-7 | Arbeitsplan-Tabelle |
| PortalHeader.tsx | 7.3.95-3 | Header (beide Portale) |
| PortalNav.tsx | 7.4.4-1 | Navigation (beide Portale) |
| FirmendatenCard.tsx | 7.4.4-2 | Firmendaten-Anzeige |
| EmployeeManagement.tsx | 7.3.95-1 | Mitarbeiter-Verwaltung |
| ProjectList.tsx | 7.3.88-6 | Projektliste |
| ProjectCreateForm.tsx | 7.3.82-9 | Projekt-Anlage |
| WorkPackageEditModal.tsx | 7.3.85-2 | AP-Bearbeitung |

### 4.2 Firmen-Portal Pages

| Route | Komponente | Version |
|-------|-----------|---------|
| /v7/firma/mein-status | mein-status-page | 7.4.4-7 |
| /v7/firma/berichte | berichte-page | 7.4.4-17 |
| /v7/firma/zeiterfassung | zeiterfassung-page | 7.3.93 |
| /v7/firma/projekte | page-firma-projekte | 7.3.89 |
| /v7/firma/dashboard | firma-dashboard | 7.3.92 |

### 4.3 Berater-Portal Pages

| Route | Komponente | Version |
|-------|-----------|---------|
| /v7/berater/dashboard | berater-dashboard | 7.4.4-5 |
| /v7/berater/foerderung/firma/[id] | berater-firma-detail | 7.4.4-3 |
| /v7/berater/foerderung/firma/[id]/berichte | berater-berichte | 7.4.4-18 |

---

## 5. Kritische Bugs und Lessons Learned

### 5.1 Bekannte kritische Muster

- `isAdminOrPL` muss `userPortalRole` pruefen (aus `v7_employees.portal_role`),
  NICHT `profile.role` (immer 'client_user' fuer alle Firmen-User)
- `funding_format` ist enum-Typ: bei LIKE-Vergleichen `::TEXT` Cast erforderlich
- Komplexe JSX-Dateien komplett neu schreiben, nie mit str_replace patchen
- Next.js Production-Builds strenger als Dev: null-safety (`(arr || []).filter(...)`)
- `useSearchParams()` benoetigt Suspense-Wrapper in Next.js 15

### 5.2 Offene Bugs

| Bug | Beschreibung | Prioritaet |
|-----|-------------|------------|
| Bug 5.9 | Firmen-Detailseite Berater-Portal: Header gruen statt blau | Mittel |
| - | ZA-Rollback Bewilligt -> Eingereicht fehlt (nur -> Entwurf vorhanden) | Niedrig |
| - | Stundensatz Annika Arndt: 20.19 vs 20.35 EUR/h zu pruefen | Niedrig |

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

### 6.3 Status-Workflow

```
Entwurf --> Eingereicht --> Bewilligt
                |
                v
            Entwurf (Rollback via Dropdown)
```

Offener Punkt: Direkter Rollback Bewilligt -> Eingereicht fehlt noch.

### 6.4 ZA-Faelligkeit

- Berechnung: letztes `zeitraum_bis` eines eingereichten ZA + 3 Monate
- Anzeige als Ampel in Mein-Status (nur fuer client_admin + project_leader)
- Ampelfarben: Gruen > 30 Tage, Gelb <= 30 Tage, Rot <= 14 Tage / ueberfaellig

### 6.5 Gestaffelte Foerderquoten ZIM-Netzwerk (offen)

ZIM-Netzwerk: Foerderquote sinkt pro Phase (80% -> 60% -> 40%).
Geplant: JSONB-Feld `foerdersatz_stufen` in v7_projects.
Status: Naechste Session.

---

## 7. Monatsabschluss-Workflow (v7.4.3-10)

### 7.1 Ablauf

1. MA erfasst Stunden im TimesheetForm
2. MA klickt "Monat abschliessen" (gruener Button oben links)
3. System speichert Eintrag in `v7_timesheet_completions`
4. Matrix-Ampel zeigt Gruen fuer diesen Monat
5. Falls nachtraegliche Aenderungen gespeichert werden (hasChanges === true):
   Completion automatisch geloescht -> MA muss erneut abschliessen
6. Speichern OHNE Aenderungen: Completion bleibt erhalten (Fix v7.4.3-10)

### 7.2 Matrix-Ampel Logik

| Status | Bedingung |
|--------|-----------|
| Gruen | Completion-Flag gesetzt ODER alle Arbeitstage erfasst |
| Orange | Eintraege vorhanden, kein Completion-Flag |
| Rot | Keine Eintraege im Monat |
| Grau | Zukunft |

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
Beispiel: `TimesheetForm-v7_4_3-10.tsx` -> naechste Aenderung -> `TimesheetForm-v7_4_3-11.tsx`
Ablage: `~/Documents/Dev/PZE/downloads/`

---

## 10. Dokumentation (public/manuals/)

| Datei | Version | Zielgruppe | Stand |
|-------|---------|-----------|-------|
| PZE_Anleitung_Projektleiter.pdf | 2.0 | Projektleiter | 24.03.2026 |
| PZE_Anleitung_Firmen-Administrator.pdf | 2.0 | Firmen-Admin | 24.03.2026 |
| PZE_Kurzanleitung_Mitarbeiter.pdf | 1.0 | Mitarbeiter | Feb 2026 |
| PZE-FAQ-Zeiterfassung-v1.pdf | 1.0 | Alle | Maerz 2026 |

Hinweis: Alle Anleitungen enthalten Testbetrieb-Hinweis mit Ansprechpartner
Martin Ditscherlein (m.ditscherlein@cubintec.com).

---

## 11. Geplante naechste Schritte

### 11.1 Kurzfristig (naechste Session)

- Gestaffelte Foerderquoten ZIM-Netzwerk (JSONB foerdersatz_stufen)
- ZA-Rollback-Button: Bewilligt -> Eingereicht
- Firma-Detailseite Berater-Portal: Header gruen statt blau (Bug 5.9)

### 11.2 Mittelfristig

- ZA-Ampel Integration Berater-Dashboard
- Mitarbeiter-Anleitung v2.0 (Monatsabschluss-Button erwaehnen)
- Berater-Portal Anleitung (neu)
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
| v4.48 | 24.03.2026 | Session 8: Anleitungen v2.0, TimesheetForm-Reset-Fix, ArbeitsplanImport Admin-only |
| v4.47 | 22.03.2026 | Session 7: Monatsabschluss, Matrix-Ampel-Fix, ZIM_NETZWERK, Komma-Fix komplett |
| v4.46 | 22.03.2026 | Session 6: ProjectDetailPage-31 Neuaufbau, Props-Interfaces |
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
**Letzte Aktualisierung: 24. Maerz 2026**
