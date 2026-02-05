# PFLICHTENHEFT - Projektzeiterfassung (PZE)

**Version:** 4.26  
**SW-Release:** V7.4.0  
**Datum:** 05. Februar 2026  
**Projekt:** Projektzeiterfassung fuer FuE-Foerdervorhaben  
**Status:** V7.4 Entwicklung - FZul-Integration gestartet

---

## 1. Projektuebersicht

### 1.1 Zielsetzung

Webbasierte SaaS-Anwendung zur Erfassung und Verwaltung von Projektstunden fuer:
- **Oeffentlich gefoerderte FuE-Projekte** (ZIM, BMBF/KMU-innovativ)
- **Forschungszulage** (§35a EStG)

### 1.2 Zielgruppen

| Zielgruppe | Beschreibung | Portal |
|------------|--------------|--------|
| **Beratungsunternehmen** | Consultants, die mehrere Kundenfirmen betreuen | Berater-Portal (blau) |
| **Kundenfirmen** | Geschaeftsfuehrer, Projektleiter, Mitarbeiter | Firmen-Portal (gruen) |

### 1.3 Kernfunktionen

**SaaS-Loesung fuer das Projektmanagement von Foerderprojekten:**

**Fuer Firmen und Berater:**
- Online-Anlage von Foerderprojekten (manuell oder per ZIM-PDF-Import)
- Verwaltung vollstaendiger Arbeitsplaene mit Arbeitspaketen
- Zuordnung von Mitarbeitern zu Projekten und Arbeitspaketen
- Zeiterfassung der Projektstunden pro Mitarbeiter/Monat
- Berichte und Controlling mit Plan/Ist-Vergleich

**Zusaetzlich fuer Berater (NEU V7.4):**
- Analyse der Zeiterfassungen gefoerderter Projekte
- Ermittlung verfuegbarer Projektstunden fuer die Beantragung der Forschungszulage (FZul nach §35a EStG)
- Import von Projektabrechnungen aus Excel
- FZul-Editor zur Bearbeitung freier Kapazitaeten
- PDF-Export nach BMF-Standard

### 1.4 Architektur

| Komponente | Technologie |
|------------|-------------|
| Frontend | Next.js 15, React, TypeScript, Tailwind CSS |
| Backend | Supabase (PostgreSQL, Auth, Storage) |
| Hosting | Vercel |
| Auth | Supabase Auth |
| ZIM Parser | Python/FastAPI (lokal oder Railway) |

### 1.5 Multi-Mandanten-Konzept

```
+------------------------------------------------------------------+
|                    SaaS-PLATTFORM                                |
|                                                                  |
|  +----------------------+    +----------------------+            |
|  | Beraterfirma A       |    | Beraterfirma B       |            |
|  | (z.B. MD Business)   |    | (z.B. andere)        |            |
|  |                      |    |                      |            |
|  |  +-----+ +----+      |    |  +-----+ +-----+     |            |
|  |  |Tippl| |AS  |      |    |  |Kunde| |Kunde|     |            |
|  |  |GmbH | |Sys | ...  |    |  | X   | | Y   | ... |            |
|  |  +-----+ +----+      |    |  +-----+ +-----+     |            |
|  +----------------------+    +----------------------+            |
+------------------------------------------------------------------+
```

DSGVO-konforme Mandantentrennung:
- Jede Firma sieht nur eigene Daten
- Berater sieht alle autorisierten Kundenfirmen
- Keine Vermischung von Kundendaten moeglich

### 1.6 Rollen-System

| Rolle | Beschreibung | Zugriff |
|-------|--------------|---------|
| `system_admin` | System-Administrator | Alles |
| `consultant` | Berater | Eigene Kundenfirmen |
| `client_admin` | Firmen-Admin (GF) | Eigene Firma komplett |
| `client_user` + `project_leader` | Projektleiter | Eigene Projekte + MA |
| `client_user` + `employee` | Mitarbeiter | Nur eigene Zeiterfassung |

---

## 2. Versionierungsprinzip

### 2.1 Schema

```
V[Release].[Version].[Build]-[Iteration]

Beispiel: v7.4.0
```

| Teil | Bedeutung | Erhoehung bei |
|------|-----------|---------------|
| **Release** (7) | Major Release | Grosse Architektur-Aenderungen |
| **Version** (4) | Feature-Set | Neue Hauptfunktionen (z.B. FZul) |
| **Build** (0) | Pflichtenheft-Stand | Dokumentation im Pflichtenheft |
| **Iteration** (-1) | Datei-Aenderung | Jede einzelne Dateimodifikation |

### 2.2 Regeln

1. **Iteration**: Zaehlt bei JEDER Dateimodifikation hoch (-1, -2, -3...)
2. **Build**: Erhoehung NUR bei Pflichtenheft-Update (z.B. 0 -> 1)
3. **Version**: Erhoehung bei neuem Feature-Set (z.B. 3 -> 4 fuer FZul)
4. **Release**: Erhoehung bei Major Changes (z.B. 7 -> 8)

### 2.3 Dateinamen-Konvention

```
[Komponente]-v[Release]_[Version]_[Build]-[Iteration].tsx

Beispiele:
- fzul-analyse-page-v7_4_0.tsx
- fzul-import-page-v7_4_1.tsx
- fzul-editor-page-v7_4_2.tsx
```

---

## 3. Release-Planung

### 3.1 Uebersicht

| Release | Status | Inhalt |
|---------|--------|--------|
| **V7.3** | Abgeschlossen | Berater-Portal + Firmen-Portal + Zeiterfassung + Berichte |
| **V7.4** | **Aktiv** | FZul-Integration im Berater-Portal |
| **V7.5** | Geplant | Export-Funktionen (Excel, PDF) |

### 3.2 V7.3 - Abgeschlossen

| Build | Status | Inhalt |
|-------|--------|--------|
| v7.3.86 | Abgeschlossen | Fehlzeiten-Bug, Header-Navigation, Umlaute |
| v7.3.87 | Abgeschlossen | Team-Management, Excel-Arbeitsplan Import |
| v7.3.88 | Abgeschlossen | Berichte-Modul, Rollenbasierte Navigation |

### 3.3 V7.4 - FZul-Integration (Aktiv)

| Build | Status | Inhalt |
|-------|--------|--------|
| **v7.4.0** | **In Arbeit** | FZul-Analyse-Seite |
| v7.4.1 | Geplant | Navigation + Routing |
| v7.4.2 | Geplant | Excel-Import fuer Projektabrechnungen |
| v7.4.3 | Geplant | FZul-Editor |
| v7.4.4 | Geplant | PDF-Export nach BMF-Standard |
| v7.4.5 | Geplant | FZul-Archiv |

---

## 4. V7.4.0 - FZul-Analyse-Seite (In Arbeit)

### 4.1 Zweck

Analyse der Zeiterfassungsdaten aller Kundenfirmen zur Ermittlung freier Kapazitaeten fuer die Forschungszulage (§35a EStG).

### 4.2 Route

`/v7/berater/fzul/analyse`

### 4.3 Datenquellen

| Quelle | Tabelle | Inhalt |
|--------|---------|--------|
| V7-Zeiterfassung | `v7_timesheets` | Gebuchte Projektstunden |
| MA-Stammdaten | `v7_employees` | weekly_hours, annual_leave_days |
| Firmendaten | `v7_client_companies` | federal_state (fuer Feiertage) |

### 4.4 Berechnungslogik

```
Verfuegbare Stunden = Arbeitstage × Tagesstunden - Urlaubstage × Tagesstunden
                    = (Werktage - Feiertage) × (Wochenstunden/5) - Urlaub × (Wochenstunden/5)

Gebuchte Stunden    = Summe aus v7_timesheets (nur Foerderprojekte, nicht FZUL)

Freie Stunden       = Verfuegbare Stunden - Gebuchte Stunden
(FZul-Potenzial)
```

### 4.5 Features

| Feature | Beschreibung |
|---------|--------------|
| Jahr-Filter | 2020-2030 waehlbar |
| Firmen-Filter | Einzelne Firma oder alle |
| Kennzahlen-Uebersicht | Firmen, MA, Verfuegbar, Gebucht, Frei |
| Firmen-Akkordeon | Aufklappbar mit MA-Liste |
| MA-Details | Projekt-Buchungen, Monatsuebersicht |
| Auslastungs-Anzeige | Prozentbalken pro MA |
| Bundesland-Feiertage | Automatische Berechnung |

### 4.6 UI-Struktur

```
+------------------------------------------------------------------+
| [Berater-Portal Header - BLAU]                                   |
+------------------------------------------------------------------+
| FZul-Kapazitaetsanalyse                    [Jahr: 2025 v] [Firma v] |
+------------------------------------------------------------------+
| Firmen | Mitarbeiter | Verfuegbar | In Projekten | Frei (FZul)   |
|   2    |      5      |  8.000 h   |   3.200 h    |    4.800 h    |
+------------------------------------------------------------------+
| v Tippl GmbH                      | 4.000 h | 1.600 h | 2.400 h  |
|   +-- Tippl, Mario                |   ...   |   ...   |   ...    |
|   |   > Projekte: BioInk (800h)                                   |
|   |   > Monatsuebersicht                                          |
|   +-- Socha, Pawel                |   ...   |   ...   |   ...    |
+------------------------------------------------------------------+
| v AS System GmbH                  | 4.000 h | 1.600 h | 2.400 h  |
|   +-- Duehrkop, Thomas            |   ...   |   ...   |   ...    |
|   +-- ...                                                         |
+------------------------------------------------------------------+
```

### 4.7 Dateien

| Datei | Version | Status |
|-------|---------|--------|
| fzul-analyse-page-v7_4_0.tsx | v7.4.0 | In Arbeit |

---

## 5. V7.4 Geplante Features

### 5.1 Excel-Import (v7.4.2)

Import von Projektabrechnungen im ZIM-Excel-Format.

**Excel-Struktur:**
- Sheet "Nav": Projektdaten (FKZ, Firma, Laufzeit)
- Sheets "[MA-Name] J[1-4]": Stundennachweise pro MA/Jahr
- Sheet "Auswertung J[x]": Aggregierte Jahresuebersicht

**Import-Ablauf:**
1. Excel hochladen
2. Format automatisch erkennen (ZIM, BMBF)
3. Vorschau der erkannten Daten
4. Import bestaetigen
5. Daten in v7_timesheets speichern

### 5.2 FZul-Editor (v7.4.3)

Online-Bearbeitung der freien Kapazitaeten fuer FZul-Antraege.

**Features:**
- Jahreskalender-Ansicht (12 Monate × 31 Tage)
- Farbcodierung (Arbeitstag, WE, Feiertag, Urlaub, Krank)
- Inline-Editing mit Excel-Navigation (Pfeiltasten, Tab, Enter)
- Projektstunden anzeigen (nicht editierbar)
- Freie Stunden editierbar
- Auto-Fill Funktion

### 5.3 PDF-Export (v7.4.4)

Export nach BMF-Standard fuer Forschungszulage.

**PDF-Inhalt:**
- Kopfbereich: Vorhaben-Titel, Vorhaben-ID, Wirtschaftsjahr, Bundesland
- MA-Zeile: Name, Vorname, Taetigkeit
- Stundenraster: 12 Monate × 31 Tage
- Feiertage mit Abkuerzungen (Neuj., Karfr., OS, OM, etc.)
- Monatssummen + Jahressumme
- Unterschriftsfelder

### 5.4 FZul-Archiv (v7.4.5)

Zentrale Archivierung erstellter FZul-Dokumente.

**Features:**
- Liste aller erstellten PDFs
- Filter nach MA, Jahr, Firma
- Download-Funktion
- Audit-Trail (wer hat wann erstellt)

---

## 6. Architektur

### 6.1 Shared Components Prinzip

Beide Portale nutzen DIESELBEN Komponenten aus `/components/shared/`:
- `portal`-Parameter steuert Farbe (berater=blau, firma=gruen)
- NIE Code duplizieren!

| Komponente | Verwendet von |
|------------|---------------|
| PortalHeader | Beide Portale |
| PortalNav | Beide Portale |
| TimesheetForm | Beide Portale |
| ProjectDetailPage | Beide Portale |
| EmployeeManagement | Beide Portale |

### 6.2 Datenbank-Schema V7

```
v7_client_companies     - Kundenfirmen
v7_employees            - Mitarbeiter (client_company_id)
v7_projects             - Projekte (client_company_id)
v7_work_packages        - Arbeitspakete (project_id)
v7_project_assignments  - MA-Projekt-Zuordnung
v7_work_package_assignments - MA-AP-Zuordnung mit PM
v7_timesheets           - Zeiterfassung (work_date, hours, day_type)
v7_fzul_timesheets      - FZul-spezifische Tagesdaten
v7_archive              - PDF/Excel-Archiv
v7_user_profiles        - User mit client_company_id + role
```

### 6.3 FZul-spezifische Tabellen

| Tabelle | Zweck |
|---------|-------|
| `v7_fzul_timesheets` | Bearbeitete FZul-Tagesdaten pro MA/Jahr |
| `v7_archive` | PDF/Excel-Archiv mit file_type='fzul_pdf' |

---

## 7. Deployment

### 7.1 Vercel

- Repository: GitHub
- Branch: main
- Auto-Deploy bei Push

### 7.2 Supabase

- Projekt: projektzeiterfassung
- Region: eu-central-1

---

## 8. Abhaengigkeiten V6 / V7

### 8.1 Parallelbetrieb

V6 und V7 koennen parallel betrieben werden:

| V6 Tabellen | V7 Tabellen | Konflikt |
|-------------|-------------|----------|
| `imported_timesheets` | `v7_timesheets` | Nein |
| `fzul_timesheets` | `v7_fzul_timesheets` | Nein |
| `companies` | `v7_client_companies` | Nein |

**Wichtig:** Daten sind NICHT synchronisiert. V6-Importe erscheinen nicht in V7 und umgekehrt.

### 8.2 Spaetere Migration

Nach Abschluss von V7.4 kann eine einmalige Migration erfolgen:
- V6-Daten nach V7 uebertragen
- V6 stilllegen

---

**Dokument aktualisiert:** 05. Februar 2026  
**Naechster Build:** v7.4.1 (Navigation + Routing)
